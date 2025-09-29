import { createAdminClient } from '@/lib/server';
import { sendSessionReminder } from '@/services/email';
import { EMAIL_BATCH_CONFIG } from './batch-config';
import {
  ReminderConfiguration,
  PendingReminder,
  BatchResult,
  BatchProcessingResult,
  FailedReminder,
  SessionReminderDetails,
  ReminderProcessingResult
} from './types/reminder-types';

export class ReminderService {
  /**
   * Get all enabled reminder configurations
   */
  static async getEnabledReminderConfigurations(): Promise<ReminderConfiguration[]> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('reminder_configurations')
      .select('*')
      .eq('is_enabled', true)
      .order('sort_order');
    
    if (error) {
      console.error('Error fetching reminder configurations:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get pending reminders for a specific configuration
   */
  static async getPendingReminders(config: ReminderConfiguration): Promise<PendingReminder[]> {
    const supabase = await createAdminClient();
    
    // Calculate the time window for sessions that should trigger this reminder
    const now = new Date();
    
    // For a 30-minute reminder, we want sessions that start in 28-32 minutes from now
    // This accounts for cron timing variations (runs every 15 minutes)
    const minMinutesUntilStart = config.minutes_before - 2; // e.g., 28 minutes for 30-min reminder
    const maxMinutesUntilStart = config.minutes_before + 2; // e.g., 32 minutes for 30-min reminder
    
    const windowStart = new Date(now.getTime() + (minMinutesUntilStart * 60 * 1000));
    const windowEnd = new Date(now.getTime() + (maxMinutesUntilStart * 60 * 1000));
    
    console.log(`Looking for ${config.reminder_type} reminders:`, {
      now: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      minMinutes: minMinutesUntilStart,
      maxMinutes: maxMinutesUntilStart
    });
    
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id, 
        title, 
        description,
        start_time,
        end_time,
        location,
        is_online,
        session_enrollments!inner (
          user_id,
          profiles!inner (
            id, 
            full_name, 
            email, 
            email_preferences
          )
        )
      `)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString()) as { data: any[] | null; error: any };
    
    if (error) {
      console.error('Error fetching sessions for reminders:', error);
      return [];
    }
    
    if (!sessions) return [];
    
    // Filter and format the results
    const pendingReminders: PendingReminder[] = [];
    
    for (const sessionData of sessions) {
      // Type assertion to handle Supabase nested object structure
      const session = sessionData as any;
      
      for (const enrollmentData of session.session_enrollments) {
        const enrollment = enrollmentData as any;
        const profile = enrollment.profiles;
        
        // Check if user has email and wants reminders
        if (!profile?.email || !profile?.email_preferences?.session_reminders) {
          continue;
        }
        
        // Check if user wants this specific reminder type
        // Map reminder types to email preference keys
        let reminderPrefKey: string;
        switch (config.reminder_type) {
          case '1h': // This is actually 1 minute reminder (misconfigured)
            reminderPrefKey = 'reminder_1h'; // User has this preference
            break;
          case '5 minutes':
            reminderPrefKey = 'reminder_5min'; // Fallback, user might not have this
            break;
          case '30min':
            reminderPrefKey = 'reminder_30min';
            break;
          case '2h':
            reminderPrefKey = 'reminder_2h';
            break;
          case '24h':
            reminderPrefKey = 'reminder_24h';
            break;
          default:
            reminderPrefKey = `reminder_${config.reminder_type}`;
        }
        
        // Check if user has this preference enabled, or skip gracefully for missing preferences
        if (!profile?.email_preferences[reminderPrefKey]) {
          console.log(`User ${profile.email} doesn't have ${reminderPrefKey} preference enabled, skipping`);
          continue;
        }
        
        // Check if reminder was already sent
        const alreadySent = await this.isReminderAlreadySent(
          session.id,
          profile.id,
          config.reminder_type
        );
        
        if (alreadySent) {
          continue;
        }
        
        pendingReminders.push({
          sessionId: session.id,
          userId: profile.id,
          userEmail: profile.email,
          userName: profile.full_name || 'Participant',
          sessionDetails: {
            id: session.id,
            title: session.title,
            description: session.description,
            start_time: session.start_time,
            end_time: session.end_time,
            location: session.location,
            is_online: session.is_online,
            speakerName: 'Session Speaker' // TODO: Add speaker info to sessions table
          }
        });
      }
    }
    
    return pendingReminders;
  }

  /**
   * Process reminders in batches with exponential backoff
   */
  static async processBatchedReminders(
    reminders: PendingReminder[],
    config: ReminderConfiguration
  ): Promise<BatchProcessingResult> {
    const batches = this.createBatches(reminders, EMAIL_BATCH_CONFIG.BATCH_SIZE);
    let totalSent = 0;
    let totalFailed = 0;
    const failedReminders: FailedReminder[] = [];

    console.log(`Processing ${reminders.length} reminders in ${batches.length} batches for ${config.reminder_type}`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} reminders`);
        
        const batchResult = await this.processBatch(batch, config);
        totalSent += batchResult.sent;
        totalFailed += batchResult.failed;
        failedReminders.push(...batchResult.failedReminders);
        
        // Add delay between batches (except for the last batch)
        if (i < batches.length - 1) {
          console.log(`Waiting ${EMAIL_BATCH_CONFIG.BATCH_DELAY}ms before next batch...`);
          await this.sleep(EMAIL_BATCH_CONFIG.BATCH_DELAY);
        }
      } catch (error) {
        console.error(`Batch ${i + 1} failed completely:`, error);
        totalFailed += batch.length;
        failedReminders.push(...batch.map(r => ({ 
          ...r, 
          error: error instanceof Error ? error.message : String(error)
        })));
      }
    }

    console.log(`Batch processing complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      sent: totalSent,
      failed: totalFailed,
      totalBatches: batches.length,
      failedReminders
    };
  }

  /**
   * Process a single batch with retry logic
   */
  private static async processBatch(
    batch: PendingReminder[],
    config: ReminderConfiguration,
    retryCount = 0
  ): Promise<BatchResult> {
    try {
      const results = await Promise.allSettled(
        batch.map(reminder => this.sendSingleReminder(reminder, config))
      );

      const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - sent;
      const failedReminders: FailedReminder[] = results
        .map((r, i) => ({ reminder: batch[i], result: r }))
        .filter(({ result }) => result.status === 'rejected' || !result.value?.success)
        .map(({ reminder, result }) => ({
          ...reminder,
          error: result.status === 'rejected' ? 
            (result.reason instanceof Error ? result.reason.message : String(result.reason)) :
            (result.value?.error ? String(result.value.error) : 'Unknown error')
        }));

      return { sent, failed, failedReminders };
    } catch (error) {
      // If entire batch fails, implement exponential backoff
      if (retryCount < EMAIL_BATCH_CONFIG.MAX_RETRIES) {
        const backoffTime = Math.min(
          EMAIL_BATCH_CONFIG.INITIAL_BACKOFF * Math.pow(EMAIL_BATCH_CONFIG.BACKOFF_MULTIPLIER, retryCount),
          EMAIL_BATCH_CONFIG.MAX_BACKOFF
        );
        
        console.log(`Batch failed, retrying in ${backoffTime}ms (attempt ${retryCount + 1})`);
        await this.sleep(backoffTime);
        
        return this.processBatch(batch, config, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Send individual reminder with rate limit handling
   */
  private static async sendSingleReminder(
    reminder: PendingReminder,
    config: ReminderConfiguration
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // Double-check if already sent (race condition protection)
      const alreadySent = await this.isReminderAlreadySent(
        reminder.sessionId,
        reminder.userId,
        config.reminder_type
      );
      
      if (alreadySent) {
        return { success: true }; // Skip, but don't count as failure
      }

      // Prepare session details for email
      const sessionDetails: SessionReminderDetails = {
        id: reminder.sessionDetails.id,
        title: reminder.sessionDetails.title,
        description: reminder.sessionDetails.description,
        date: reminder.sessionDetails.start_time,
        startTime: reminder.sessionDetails.start_time ? 
          new Date(reminder.sessionDetails.start_time).toLocaleTimeString() : undefined,
        endTime: reminder.sessionDetails.end_time ? 
          new Date(reminder.sessionDetails.end_time).toLocaleTimeString() : undefined,
        speakerName: reminder.sessionDetails.speakerName || 'Session Speaker',
        duration: reminder.sessionDetails.end_time && reminder.sessionDetails.start_time ? 
          Math.round((new Date(reminder.sessionDetails.end_time).getTime() - 
                     new Date(reminder.sessionDetails.start_time).getTime()) / (1000 * 60)) : 60,
        location: reminder.sessionDetails.is_online ? 'Online' : 
                 (reminder.sessionDetails.location || 'TBD'),
        reminderType: config.reminder_type,
        reminderConfig: config,
        is_online: reminder.sessionDetails.is_online
      };

      // Send the email
      const emailResult = await sendSessionReminder(
        reminder.userEmail,
        reminder.userName,
        sessionDetails
      );

      if (emailResult.success) {
        // Record successful send
        await this.recordReminderSent(
          reminder.sessionId,
          reminder.userId,
          config.reminder_type,
          emailResult.data?.id
        );
        return { success: true };
      } else {
        return { success: false, error: emailResult.error };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Check if reminder was already sent
   */
  static async isReminderAlreadySent(
    sessionId: string,
    userId: string,
    reminderType: string
  ): Promise<boolean> {
    const supabase = await createAdminClient();
    
    const { data } = await supabase
      .from('session_reminder_emails')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('reminder_type', reminderType)
      .single();
    
    return !!data;
  }

  /**
   * Record successful reminder send
   */
  private static async recordReminderSent(
    sessionId: string,
    userId: string,
    reminderType: string,
    resendEmailId?: string
  ): Promise<void> {
    const supabase = await createAdminClient();
    
    try {
      await supabase
        .from('session_reminder_emails')
        .insert({
          session_id: sessionId,
          user_id: userId,
          reminder_type: reminderType,
          email_status: 'sent',
          resend_email_id: resendEmailId
        });
    } catch (error) {
      console.error('Error recording reminder send:', error);
      // Don't throw - we don't want to fail the email send because of logging issues
    }
  }

  /**
   * Process reminders for a specific configuration
   */
  static async processReminders(config: ReminderConfiguration): Promise<ReminderProcessingResult> {
    try {
      const pendingReminders = await this.getPendingReminders(config);
      
      if (pendingReminders.length === 0) {
        return {
          reminderType: config.reminder_type,
          sent: 0,
          failed: 0,
          totalProcessed: 0,
          errors: []
        };
      }

      const result = await this.processBatchedReminders(pendingReminders, config);
      
      return {
        reminderType: config.reminder_type,
        sent: result.sent,
        failed: result.failed,
        totalProcessed: pendingReminders.length,
        errors: result.failedReminders.map(f => f.error)
      };
    } catch (error) {
      console.error(`Error processing ${config.reminder_type} reminders:`, error);
      return {
        reminderType: config.reminder_type,
        sent: 0,
        failed: 0,
        totalProcessed: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // Utility functions
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Admin functions for managing reminder configurations
  static async enableReminderType(reminderType: string): Promise<boolean> {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from('reminder_configurations')
      .update({ is_enabled: true })
      .eq('reminder_type', reminderType);
    
    return !error;
  }

  static async disableReminderType(reminderType: string): Promise<boolean> {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from('reminder_configurations')
      .update({ is_enabled: false })
      .eq('reminder_type', reminderType);
    
    return !error;
  }

  static async createCustomReminderType(
    reminderType: string,
    minutesBefore: number,
    displayName: string,
    subjectTemplate: string
  ): Promise<ReminderConfiguration | null> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('reminder_configurations')
      .insert({
        reminder_type: reminderType,
        minutes_before: minutesBefore,
        display_name: displayName,
        email_subject_template: subjectTemplate,
        is_enabled: true,
        sort_order: 999 // Put custom reminders at the end
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating custom reminder type:', error);
      return null;
    }
    
    return data;
  }

  static async updateReminderConfiguration(
    id: string,
    updates: Partial<ReminderConfiguration>
  ): Promise<ReminderConfiguration | null> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('reminder_configurations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating reminder configuration:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Get session details for reminder scheduling
   */
  static async getSessionDetails(sessionId: string): Promise<any> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      console.error('Error fetching session details:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Get session enrollments for manual reminder triggers
   */
  static async getSessionEnrollments(sessionId: string): Promise<any[]> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('session_enrollments')
      .select(`
        session_id,
        user_id,
        profiles!inner (
          id,
          full_name,
          email,
          email_preferences
        ),
        sessions!inner (
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          is_online
        )
      `)
      .eq('session_id', sessionId)
      .eq('status', 'active');
    
    if (error) {
      console.error('Error fetching session enrollments:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Send reminder to a specific user (used by Inngest individual reminder function)
   */
  static async sendReminderToUser(
    sessionId: string,
    userId: string,
    config: ReminderConfiguration
  ): Promise<{ success: boolean; error?: any }> {
    const supabase = await createAdminClient();
    
    // Get user and session details
    const { data: enrollment, error } = await supabase
      .from('session_enrollments')
      .select(`
        profiles!inner (
          id,
          full_name,
          email,
          email_preferences
        ),
        sessions!inner (
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          is_online
        )
      `)
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (error || !enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    // Type assertion to handle Supabase nested object structure
    const enrollmentData = enrollment as any;
    const profile = enrollmentData.profiles;
    const session = enrollmentData.sessions;
    
    // Check if user wants this reminder type
    // Map reminder types to email preference keys (same logic as getPendingReminders)
    let reminderPrefKey: string;
    switch (config.reminder_type) {
      case '1h': // This is actually 1 minute reminder (misconfigured)
        reminderPrefKey = 'reminder_1h';
        break;
      case '5 minutes':
        reminderPrefKey = 'reminder_5min';
        break;
      case '30min':
        reminderPrefKey = 'reminder_30min';
        break;
      case '2h':
        reminderPrefKey = 'reminder_2h';
        break;
      case '24h':
        reminderPrefKey = 'reminder_24h';
        break;
      default:
        reminderPrefKey = `reminder_${config.reminder_type}`;
    }
    
    if (!profile?.email_preferences?.session_reminders || 
        !profile?.email_preferences[reminderPrefKey]) {
      console.log(`User ${profile.email} doesn't have ${reminderPrefKey} preference enabled, skipping reminder`);
      return { success: true }; // Skip but don't fail
    }
    
    // Create pending reminder object
    const pendingReminder: PendingReminder = {
      sessionId: session.id,
      userId: profile.id,
      userEmail: profile.email,
      userName: profile.full_name || 'Participant',
      sessionDetails: {
        id: session.id,
        title: session.title,
        description: session.description,
        start_time: session.start_time,
        end_time: session.end_time,
        location: session.location,
        is_online: session.is_online,
        speakerName: 'Session Speaker'
      }
    };
    
    // Send the reminder
    return await this.sendSingleReminder(pendingReminder, config);
  }
}
