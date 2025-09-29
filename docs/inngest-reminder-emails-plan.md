# Session Reminder Emails with Inngest Implementation Plan

## Why Inngest Over Traditional Cron Jobs?

### **Advantages of Inngest**
- **Built-in Reliability**: Automatic retries, failure handling, and observability
- **No Infrastructure Management**: No need to manage cron servers or scheduling infrastructure
- **Serverless-First**: Perfect for Next.js and Vercel deployments
- **Visual Dashboard**: Monitor function runs, logs, and failures in real-time
- **Event-Driven**: Can trigger reminders based on events (enrollment) + schedules
- **Step Functions**: Built-in workflow orchestration with reliable step execution
- **Zero Configuration**: Works out of the box with Next.js API routes

### **Traditional Cron Limitations**
- Platform-specific implementation (Vercel Cron, server cron, etc.)
- Manual retry logic and error handling
- Limited observability and debugging
- Requires separate infrastructure management
- No built-in failure recovery

## Updated Implementation Architecture

### **Phase 1: Inngest Setup & Configuration**

#### 1.1 Install Inngest
```bash
npm install inngest
```

#### 1.2 Inngest Client Setup
Create `lib/inngest.ts`:
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "cme-platform",
  name: "CME Platform Reminders",
});
```

#### 1.3 Inngest API Route
Create `app/api/inngest/route.ts`:
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { 
  processReminderEmails,
  sendSessionReminder,
  scheduleSessionReminders 
} from "@/lib/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processReminderEmails,
    sendSessionReminder,
    scheduleSessionReminders,
  ],
});
```

### **Phase 2: Database Schema (Same as Before)**

#### 2.1 Reminder Tracking Table
```sql
CREATE TABLE session_reminder_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status VARCHAR(20) DEFAULT 'sent',
  resend_email_id TEXT,
  inngest_event_id TEXT, -- Store Inngest event ID for tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(session_id, user_id, reminder_type)
);
```

#### 2.2 Reminder Configuration Table
```sql
CREATE TABLE reminder_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_type VARCHAR(20) NOT NULL UNIQUE,
  minutes_before INTEGER NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  email_subject_template TEXT NOT NULL,
  display_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default configurations
INSERT INTO reminder_configurations (reminder_type, minutes_before, display_name, email_subject_template, sort_order, is_enabled) VALUES
('24h', 1440, '24 Hours Before', 'Reminder: {session_title} starts tomorrow', 1, true),
('2h', 120, '2 Hours Before', 'Starting Soon: {session_title} in 2 hours', 2, true),
('1h', 60, '1 Hour Before', 'Starting Soon: {session_title} in 1 hour', 3, false),
('30min', 30, '30 Minutes Before', 'Starting Now: {session_title} begins in 30 minutes', 4, true);
```

### **Phase 3: Rate Limiting & Batching Strategy**

#### 3.1 Resend Rate Limits
- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Pro Tier**: 50,000 emails/month, rate limited to prevent abuse
- **Recommended**: Batch emails and implement exponential backoff

#### 3.2 Batching Configuration
```typescript
// Rate limiting configuration
export const EMAIL_BATCH_CONFIG = {
  BATCH_SIZE: 10, // Send 10 emails per batch
  BATCH_DELAY: 2000, // 2 seconds between batches
  MAX_RETRIES: 3,
  INITIAL_BACKOFF: 1000, // 1 second initial backoff
  MAX_BACKOFF: 30000, // 30 seconds max backoff
  BACKOFF_MULTIPLIER: 2,
};
```

### **Phase 4: Inngest Functions with Rate Limiting**

#### 4.1 Main Reminder Processing Function
Create `lib/inngest-functions.ts`:

```typescript
import { inngest } from "./inngest";
import { ReminderService } from "./reminder-service";
import { sendSessionReminder } from "@/services/email";
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
        results.push(batchResult);
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
    const { sessionId, userId } = event.data;

    // Get session details
    const session = await step.run("get-session-details", async () => {
      return await ReminderService.getSessionDetails(sessionId);
    });

    // Get enabled reminder configurations
    const configs = await step.run("get-reminder-configs", async () => {
      return await ReminderService.getEnabledReminderConfigurations();
    });

    // Schedule individual reminders for this user
    const scheduledReminders = [];
    
    for (const config of configs) {
      const reminderTime = new Date(session.start_time);
      reminderTime.setMinutes(reminderTime.getMinutes() - config.minutes_before);

      // Only schedule if reminder time is in the future
      if (reminderTime > new Date()) {
        const eventId = await step.sendEvent("schedule-individual-reminder", {
          name: "reminder/send.individual",
          data: {
            sessionId,
            userId,
            reminderType: config.reminder_type,
          },
          ts: reminderTime.getTime(),
        });
        
        scheduledReminders.push({
          reminderType: config.reminder_type,
          scheduledFor: reminderTime,
          eventId
        });
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

    // Send the reminder
    const result = await step.run("send-reminder-email", async () => {
      return await ReminderService.sendReminderToUser(sessionId, userId, reminderType);
    });

    return result;
  }
);
```

### **Phase 4: Enhanced Email Service**

#### 4.1 Updated Email Service
Extend `services/email.ts`:

```typescript
// Add to existing email.ts
export interface SessionReminderDetails extends WebinarDetails {
  reminderType: string;
  reminderConfig: ReminderConfiguration;
  joinUrl?: string;
  preparationNotes?: string;
}

export async function sendSessionReminder(
  userEmail: string,
  userName: string,
  sessionDetails: SessionReminderDetails
): Promise<{ success: boolean; data?: any; error?: any; shouldRetry?: boolean }> {
  console.log(`Sending ${sessionDetails.reminderType} reminder to ${userEmail} for session: ${sessionDetails.title}`);
  
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured', shouldRetry: false };
    }
    
    const recipientEmail = process.env.NODE_ENV === 'production' ? userEmail : VERIFIED_TEST_EMAIL;
    const subjectPrefix = recipientEmail !== userEmail ? `[Originally for: ${userEmail}] ` : '';
    
    // Use template from configuration
    const subject = sessionDetails.reminderConfig.email_subject_template
      .replace('{session_title}', sessionDetails.title);
    
    const { data, error } = await resend.emails.send({
      from: 'CME Webinars <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `${subjectPrefix}${subject}`,
      html: generateReminderEmailHtml(userName, sessionDetails),
    });

    if (error) {
      // Check if it's a rate limit error
      const isRateLimit = error.message?.includes('rate limit') || 
                         error.message?.includes('too many requests') ||
                         error.status === 429;
      
      return { 
        success: false, 
        error, 
        shouldRetry: isRateLimit // Retry rate limit errors, not other errors
      };
    }

    return { success: true, data };
  } catch (error) {
    // Network errors should be retried
    const shouldRetry = error.code === 'ECONNRESET' || 
                       error.code === 'ETIMEDOUT' ||
                       error.message?.includes('network');
    
    return { success: false, error, shouldRetry };
  }
}

function generateReminderEmailHtml(userName: string, sessionDetails: SessionReminderDetails): string {
  // Different templates based on reminder type
  const timeUntilSession = getTimeUntilSession(sessionDetails.reminderConfig.minutes_before);
  const urgencyLevel = getUrgencyLevel(sessionDetails.reminderConfig.minutes_before);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Session Reminder</title>
      <style>
        ${getEmailStyles(urgencyLevel)}
      </style>
    </head>
    <body>
      <div class="header ${urgencyLevel}">
        <h1>${getHeaderText(sessionDetails.reminderConfig.minutes_before)}</h1>
      </div>
      <div class="content">
        <p>Hello ${userName},</p>
        <p>${getReminderMessage(sessionDetails.reminderConfig.minutes_before, sessionDetails.title)}</p>
        
        <div class="session-details">
          <h2>${sessionDetails.title}</h2>
          <p><strong>Date:</strong> ${formatDate(sessionDetails.date)}</p>
          <p><strong>Time:</strong> ${getTimeDisplay(sessionDetails)}</p>
          <p><strong>Speaker:</strong> ${sessionDetails.speakerName}</p>
          ${sessionDetails.location ? `<p><strong>Location:</strong> ${sessionDetails.location}</p>` : ''}
        </div>
        
        ${getCallToAction(sessionDetails.reminderConfig.minutes_before, sessionDetails.joinUrl)}
        
        <p>Best regards,<br>CME Webinars Team</p>
      </div>
    </body>
    </html>
  `;
}
```

### **Phase 5: Event-Driven Integration**

#### 5.1 Trigger Reminders on Enrollment
Update enrollment API to trigger Inngest event:

```typescript
// In app/api/sessions/[id]/enroll/route.ts
import { inngest } from "@/lib/inngest";

// After successful enrollment
if (enrollment) {
  // Trigger Inngest event to schedule reminders
  await inngest.send({
    name: "session/user.enrolled",
    data: {
      sessionId: sessionId,
      userId: user.id,
      enrollmentId: enrollment.id,
      sessionStartTime: sessionDetails.start_time
    }
  });
}
```

### **Phase 6: Admin Interface with Inngest Integration**

#### 6.1 Inngest Dashboard Integration
- **Native Monitoring**: Use Inngest's built-in dashboard for function monitoring
- **Custom Admin Panel**: Create admin interface that integrates with Inngest API

```typescript
// Admin functions to interact with Inngest
export class InngestAdminService {
  // Get function run history
  static async getFunctionRuns(functionId: string) {
    // Use Inngest API to get run history
  }
  
  // Manually trigger reminder processing
  static async triggerReminderProcessing() {
    return await inngest.send({
      name: "admin/process.reminders",
      data: { triggeredBy: "admin", timestamp: new Date().toISOString() }
    });
  }
  
  // Cancel scheduled reminders for a session
  static async cancelSessionReminders(sessionId: string) {
    // Implementation to cancel scheduled events
  }
}
```

### **Phase 7: Configuration & Deployment**

#### 7.1 Environment Variables
```env
# Add to .env.local
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

#### 7.2 Deployment Steps
1. **Deploy to Vercel/Netlify**: Standard Next.js deployment
2. **Register with Inngest**: Inngest automatically discovers functions
3. **Configure Webhooks**: Inngest will call your `/api/inngest` endpoint

## **Benefits of This Approach**

### **Reliability**
- **Automatic Retries**: Failed reminders are automatically retried
- **Dead Letter Queues**: Failed events are preserved for debugging
- **Observability**: Full visibility into function execution

### **Scalability**
- **Serverless**: Scales automatically with your user base
- **Event-Driven**: Reminders are scheduled when users enroll (not batch processed)
- **Efficient**: Only processes reminders that need to be sent

### **Developer Experience**
- **Local Development**: Test functions locally with Inngest dev server
- **Visual Debugging**: See function execution flow in Inngest dashboard
- **Type Safety**: Full TypeScript support

### **Flexibility**
- **Dynamic Scheduling**: Easy to add/remove reminder types
- **Event Integration**: Can trigger reminders from any event (enrollment, session updates, etc.)
- **Step Functions**: Complex workflows with reliable execution

## **Migration from Traditional Cron**

If you already have cron jobs, migration is straightforward:
1. **Keep existing database schema**
2. **Replace cron endpoints with Inngest functions**
3. **Add event triggers for real-time scheduling**
4. **Gradually migrate to event-driven approach**

## **Cost Considerations**

- **Inngest Free Tier**: 50,000 function runs per month
- **Pricing**: $0.01 per 1,000 function runs after free tier
- **Cost Efficiency**: Only pay for actual reminder processing, not idle time

## **Next Steps**

1. **Install Inngest**: Add to your project dependencies
2. **Create Inngest Functions**: Implement reminder processing logic
3. **Set up Event Integration**: Trigger reminders on enrollment
4. **Deploy and Test**: Deploy to staging environment
5. **Monitor and Optimize**: Use Inngest dashboard to monitor performance

This approach provides a much more robust, scalable, and maintainable solution for reminder emails compared to traditional cron jobs, while being perfectly suited for your Next.js and Vercel deployment stack.
