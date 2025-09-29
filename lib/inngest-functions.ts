import { inngest } from "./inngest";
import { ReminderService } from "./reminder-service";
import { EMAIL_BATCH_CONFIG } from "./batch-config";

// Main scheduled function - runs every 15 minutes to check for reminders
export const processReminderEmails = inngest.createFunction(
  { id: "process-reminder-emails" },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    // Get all enabled reminder configurations
    const configs = await step.run("get-reminder-configs", async () => {
      return await ReminderService.getEnabledReminderConfigurations();
    });

    const results = [];

    // Process each reminder type with batching
    for (const config of configs) {
      const pendingReminders = await step.run(
        `get-${config.reminder_type}-pending`,
        async () => {
          return await ReminderService.getPendingReminders(config);
        }
      );

      // Process reminders in batches to respect rate limits
      if (pendingReminders.length > 0) {
        const batchResult = await step.run(
          `batch-process-${config.reminder_type}`,
          async () => {
            return await ReminderService.processBatchedReminders(
              pendingReminders,
              config
            );
          }
        );
        results.push({
          reminderType: config.reminder_type,
          ...batchResult
        });
      }
    }

    return {
      processed: results.length,
      totalReminders: results.reduce((sum, r) => sum + (r.sent || 0), 0),
      totalFailed: results.reduce((sum, r) => sum + (r.failed || 0), 0),
      results
    };
  }
);

// Event-driven function for scheduling reminders when users enroll
export const scheduleSessionReminders = inngest.createFunction(
  { id: "schedule-session-reminders" },
  { event: "session/user.enrolled" },
  async ({ event, step }) => {
    const { sessionId, userId, sessionStartTime } = event.data;

    console.log('=== SCHEDULE SESSION REMINDERS DEBUG ===');
    console.log('Event data:', { sessionId, userId, sessionStartTime });
    console.log('Current time:', new Date().toISOString());

    // Get session details
    const session = await step.run("get-session-details", async () => {
      return await ReminderService.getSessionDetails(sessionId);
    });

    if (!session) {
      console.log('Session not found:', sessionId);
      return { error: "Session not found", sessionId };
    }

    console.log('Session found:', session);

    // Get enabled reminder configurations
    const configs = await step.run("get-reminder-configs", async () => {
      return await ReminderService.getEnabledReminderConfigurations();
    });

    console.log('Enabled configs:', configs);

    // Schedule individual reminders for this user
    const scheduledReminders = [];
    
    for (const config of configs) {
      console.log(`\n--- Processing ${config.reminder_type} reminder ---`);
      
      const reminderTime = new Date(sessionStartTime);
      console.log('Session start time:', sessionStartTime);
      console.log('Reminder time before adjustment:', reminderTime.toISOString());
      
      reminderTime.setMinutes(reminderTime.getMinutes() - config.minutes_before);
      console.log('Reminder time after adjustment:', reminderTime.toISOString());
      console.log('Minutes before:', config.minutes_before);
      
      const currentTime = new Date();
      console.log('Current time for comparison:', currentTime.toISOString());
      console.log('Is reminder time in future?', reminderTime > currentTime);

      // Only schedule if reminder time is in the future
      if (reminderTime > new Date()) {
        console.log('Scheduling reminder event...');
        
        const eventId = await step.sendEvent("schedule-individual-reminder", {
          name: "reminder/send.individual",
          data: {
            sessionId,
            userId,
            reminderType: config.reminder_type,
          },
          ts: reminderTime.getTime(),
        });
        
        console.log('Event scheduled with ID:', eventId);
        
        scheduledReminders.push({
          reminderType: config.reminder_type,
          scheduledFor: reminderTime,
          eventId
        });
      } else {
        console.log('Reminder time is in the past, skipping');
      }
    }

    return {
      sessionId,
      userId,
      scheduledReminders: scheduledReminders.length,
      reminders: scheduledReminders
    };
  }
);

// Individual reminder sender
export const sendSessionReminder = inngest.createFunction(
  { id: "send-session-reminder" },
  { event: "reminder/send.individual" },
  async ({ event, step }) => {
    const { sessionId, userId, reminderType } = event.data;

    // Check if reminder was already sent
    const alreadySent = await step.run("check-if-sent", async () => {
      return await ReminderService.isReminderAlreadySent(sessionId, userId, reminderType);
    });

    if (alreadySent) {
      return { skipped: true, reason: "Already sent" };
    }

    // Get reminder configuration
    const configs = await step.run("get-reminder-configs", async () => {
      return await ReminderService.getEnabledReminderConfigurations();
    });

    const config = configs.find(c => c.reminder_type === reminderType);
    if (!config) {
      return { error: "Reminder configuration not found", reminderType };
    }

    // Send the reminder
    const result = await step.run("send-reminder-email", async () => {
      return await ReminderService.sendReminderToUser(sessionId, userId, config);
    });

    return result;
  }
);

// Manual trigger function for admin use
export const triggerManualReminders = inngest.createFunction(
  { id: "trigger-manual-reminders" },
  { event: "admin/trigger.reminders" },
  async ({ event, step }) => {
    const { sessionId, reminderTypes, triggeredBy } = event.data;

    console.log(`Manual reminder trigger by ${triggeredBy} for session ${sessionId}`);

    // Get session enrollments
    const enrollments = await step.run("get-session-enrollments", async () => {
      return await ReminderService.getSessionEnrollments(sessionId);
    });

    if (!enrollments || enrollments.length === 0) {
      return { error: "No enrollments found for session", sessionId };
    }

    // Get reminder configurations
    const allConfigs = await step.run("get-reminder-configs", async () => {
      return await ReminderService.getEnabledReminderConfigurations();
    });

    const configs = reminderTypes 
      ? allConfigs.filter(c => reminderTypes.includes(c.reminder_type))
      : allConfigs;

    const results = [];

    // Process each reminder type
    for (const config of configs) {
      const result = await step.run(
        `manual-${config.reminder_type}-reminders`,
        async () => {
          // Create pending reminders for this session and reminder type
          const pendingReminders = enrollments.map(enrollment => ({
            sessionId: enrollment.session_id,
            userId: enrollment.user_id,
            userEmail: enrollment.profiles.email,
            userName: enrollment.profiles.full_name || 'Participant',
            sessionDetails: enrollment.sessions
          }));

          return await ReminderService.processBatchedReminders(pendingReminders, config);
        }
      );

      results.push({
        reminderType: config.reminder_type,
        ...result
      });
    }

    return {
      sessionId,
      triggeredBy,
      processed: results.length,
      totalSent: results.reduce((sum, r) => sum + r.sent, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      results
    };
  }
);
