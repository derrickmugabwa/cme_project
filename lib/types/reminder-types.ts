// Type definitions for reminder email system

export interface ReminderConfiguration {
  id: string;
  reminder_type: string;
  minutes_before: number;
  is_enabled: boolean;
  email_subject_template: string;
  display_name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SessionReminderDetails {
  id: string;
  title: string;
  description?: string;
  date: Date | string;
  startTime?: string;
  endTime?: string;
  speakerName: string;
  duration: number;
  location?: string;
  imageUrl?: string;
  reminderType: string;
  reminderConfig: ReminderConfiguration;
  joinUrl?: string;
  preparationNotes?: string;
  is_online?: boolean;
}

export interface PendingReminder {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  sessionDetails: {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    location?: string;
    is_online: boolean;
    speakerName?: string;
  };
}

export interface BatchResult {
  sent: number;
  failed: number;
  failedReminders: FailedReminder[];
}

export interface BatchProcessingResult extends BatchResult {
  totalBatches: number;
}

export interface FailedReminder extends PendingReminder {
  error: string;
  retryCount?: number;
}

export interface EmailSendResult {
  success: boolean;
  data?: any;
  error?: any;
  shouldRetry?: boolean;
}

export interface ReminderProcessingResult {
  reminderType: string;
  sent: number;
  failed: number;
  totalProcessed: number;
  errors: string[];
}

// Database types
export interface SessionReminderEmail {
  id: string;
  session_id: string;
  user_id: string;
  reminder_type: string;
  sent_at: string;
  email_status: 'sent' | 'failed' | 'bounced' | 'retrying';
  resend_email_id?: string;
  inngest_event_id?: string;
  retry_count: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface UserEmailPreferences {
  session_reminders: boolean;
  reminder_24h: boolean;
  reminder_2h: boolean;
  reminder_1h: boolean;
  reminder_30min: boolean;
  [key: string]: boolean; // Allow for custom reminder types
}
