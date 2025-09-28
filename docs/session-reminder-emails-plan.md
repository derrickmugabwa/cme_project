# Session Reminder Emails Implementation Plan

## Overview
This document outlines the implementation plan for automated reminder emails that will be sent to users who have enrolled in upcoming sessions. The system will send multiple reminders at different intervals before each session starts.

## Current State Analysis

### Existing Email Infrastructure
- **Email Service**: Resend API (v4.5.1) configured and working
- **Current Email Type**: Enrollment confirmation emails only
- **Email Templates**: HTML-based with inline CSS styling
- **Integration**: Connected to session enrollment API
- **Environment Handling**: Development/production email routing configured

### Database Schema (Relevant Tables)
- `sessions`: Contains session details, start_time, end_time
- `session_enrollments`: Links users to sessions they've enrolled in
- `profiles`: User information including email addresses

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Email Tracking Table
Create a new table to track sent reminder emails and prevent duplicates:

```sql
CREATE TABLE session_reminder_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL, -- '24h', '2h', '1h', '30min', 'custom'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  resend_email_id TEXT, -- Store Resend's email ID for tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure we don't send duplicate reminders
  UNIQUE(session_id, user_id, reminder_type)
);
```

#### 1.2 Reminder Configuration Table
Create a table to manage reminder types and their settings:

```sql
CREATE TABLE reminder_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_type VARCHAR(20) NOT NULL UNIQUE, -- '24h', '2h', '1h', '30min'
  minutes_before INTEGER NOT NULL, -- Minutes before session start
  is_enabled BOOLEAN DEFAULT true,
  email_subject_template TEXT NOT NULL,
  display_name TEXT NOT NULL, -- Human-readable name
  sort_order INTEGER DEFAULT 0, -- For ordering in UI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO reminder_configurations (reminder_type, minutes_before, display_name, email_subject_template, sort_order, is_enabled) VALUES
('24h', 1440, '24 Hours Before', 'Reminder: {session_title} starts tomorrow', 1, true),
('2h', 120, '2 Hours Before', 'Starting Soon: {session_title} in 2 hours', 2, true),
('1h', 60, '1 Hour Before', 'Starting Soon: {session_title} in 1 hour', 3, false), -- Disabled by default
('30min', 30, '30 Minutes Before', 'Starting Now: {session_title} begins in 30 minutes', 4, true);
```

#### 1.3 RLS Policies
```sql
-- Enable RLS on reminder emails table
ALTER TABLE session_reminder_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminder email records
CREATE POLICY "Users can view own reminder emails" ON session_reminder_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all reminder emails
CREATE POLICY "Service role can manage reminder emails" ON session_reminder_emails
  FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on reminder configurations table
ALTER TABLE reminder_configurations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read reminder configurations
CREATE POLICY "Users can read reminder configurations" ON reminder_configurations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify reminder configurations
CREATE POLICY "Admins can manage reminder configurations" ON reminder_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- Service role can manage all reminder configurations
CREATE POLICY "Service role can manage reminder configurations" ON reminder_configurations
  FOR ALL USING (auth.role() = 'service_role');
```

### Phase 2: Email Service Enhancements

#### 2.1 New Email Functions
Extend `services/email.ts` with reminder email functionality:

```typescript
// New interface for reminder email data
export interface SessionReminderDetails extends WebinarDetails {
  reminderType: string; // Dynamic reminder type from configuration
  reminderConfig: ReminderConfiguration;
  joinUrl?: string;
  preparationNotes?: string;
}

// Interface for reminder configuration
export interface ReminderConfiguration {
  id: string;
  reminder_type: string;
  minutes_before: number;
  is_enabled: boolean;
  email_subject_template: string;
  display_name: string;
  sort_order: number;
}

// New reminder email function
export async function sendSessionReminder(
  userEmail: string,
  userName: string,
  sessionDetails: SessionReminderDetails
): Promise<{ success: boolean; data?: any; error?: any }>

// New HTML template generator
function generateReminderEmailHtml(
  userName: string, 
  sessionDetails: SessionReminderDetails
): string
```

#### 2.2 Email Templates by Reminder Type

**24-Hour Reminder:**
- Subject: "Reminder: [Session Title] starts tomorrow"
- Content: Session details, preparation instructions, what to expect
- CTA: "Add to Calendar" button

**2-Hour Reminder:**
- Subject: "Starting Soon: [Session Title] in 2 hours"
- Content: Final details, join instructions, technical requirements
- CTA: "Join Session" button (if available)

**30-Minute Reminder:**
- Subject: "Starting Now: [Session Title] begins in 30 minutes"
- Content: Direct join link, last-minute reminders
- CTA: Prominent "Join Now" button

### Phase 3: Reminder Scheduling System

#### 3.1 Cron Job Implementation
Create API endpoints for scheduled reminder processing:

```
/api/cron/send-reminders
```

#### 3.2 Reminder Logic Service
Create `lib/reminder-service.ts`:

```typescript
export class ReminderService {
  // Get all enabled reminder configurations
  static async getEnabledReminderConfigurations(): Promise<ReminderConfiguration[]>
  
  // Find sessions that need reminders sent for a specific configuration
  static async findSessionsNeedingReminders(
    reminderConfig: ReminderConfiguration
  ): Promise<SessionWithEnrollments[]>
  
  // Process and send reminders for all enabled types
  static async processAllReminders(): Promise<ReminderProcessingResult[]>
  
  // Process and send reminders for a specific type
  static async processReminders(
    reminderConfig: ReminderConfiguration
  ): Promise<ReminderProcessingResult>
  
  // Send individual reminder
  static async sendReminderToUser(
    sessionId: string,
    userId: string,
    reminderConfig: ReminderConfiguration
  ): Promise<boolean>
  
  // Admin functions for managing reminder configurations
  static async enableReminderType(reminderType: string): Promise<boolean>
  static async disableReminderType(reminderType: string): Promise<boolean>
  static async createCustomReminderType(
    reminderType: string,
    minutesBefore: number,
    displayName: string,
    subjectTemplate: string
  ): Promise<ReminderConfiguration>
  static async updateReminderConfiguration(
    id: string,
    updates: Partial<ReminderConfiguration>
  ): Promise<ReminderConfiguration>
}
```

#### 3.3 Scheduling Configuration
Set up cron jobs to run at appropriate intervals:

- **24-hour reminders**: Daily at 9:00 AM
- **2-hour reminders**: Every 2 hours
- **30-minute reminders**: Every 30 minutes

### Phase 4: API Endpoints

#### 4.1 Cron Endpoint (`/api/cron/send-reminders`)
```typescript
// GET /api/cron/send-reminders?type=24h|2h|30min
export async function GET(request: Request) {
  // Verify cron authorization
  // Process reminders for specified type
  // Return processing summary
}
```

#### 4.2 Manual Reminder Endpoint (`/api/admin/send-reminder`)
```typescript
// POST /api/admin/send-reminder
// For admin to manually trigger reminders for specific sessions
export async function POST(request: Request) {
  // Verify admin permissions
  // Send reminder for specific session/user combination
}
```

### Phase 5: Admin Interface

#### 5.1 Reminder Management Dashboard
Create admin interface at `/dashboard/admin/reminders`:

- **Reminder Configuration Panel**:
  - Enable/disable specific reminder types (24h, 2h, 1h, 30min)
  - Create custom reminder intervals (e.g., 4h, 15min, 1 week)
  - Edit email subject templates for each reminder type
  - Reorder reminder types by priority
  
- **Session Monitoring**:
  - View upcoming sessions and their reminder status
  - See which reminder types are scheduled for each session
  - Manually trigger reminders for specific sessions
  
- **Analytics & Reporting**:
  - View reminder email statistics and delivery status
  - Track effectiveness of different reminder intervals
  - Monitor user engagement with reminder emails

#### 5.2 Reminder Configuration Interface
Create dedicated configuration page at `/dashboard/admin/reminders/config`:

```typescript
// Example configuration interface
interface ReminderConfigForm {
  reminderType: string;
  minutesBefore: number;
  displayName: string;
  emailSubjectTemplate: string;
  isEnabled: boolean;
  sortOrder: number;
}

// Admin actions available:
- Toggle reminder types on/off globally
- Create new reminder intervals (e.g., "1hr", "4hr", "1week")
- Customize email subject templates with variables
- Set default reminder preferences for new users
- Bulk enable/disable reminders for specific session types
```

#### 5.3 Session Management Integration
Enhance existing session management to show:
- Reminder email status for each session
- Number of enrolled users who will receive reminders
- Option to disable reminders for specific sessions

### Phase 6: User Preferences

#### 6.1 Database Schema for Preferences
```sql
ALTER TABLE profiles ADD COLUMN email_preferences JSONB DEFAULT '{
  "session_reminders": true,
  "reminder_24h": true,
  "reminder_2h": true,
  "reminder_30min": true
}'::jsonb;
```

#### 6.2 User Settings Interface
Add email preferences to user dashboard:
- Toggle reminder emails on/off
- Choose which reminder intervals to receive
- Set preferred reminder times

### Phase 7: Enhanced Features (Future)

#### 7.1 Smart Scheduling
- Consider user timezone for optimal reminder timing
- Avoid sending reminders during user's sleeping hours
- Batch reminders for users with multiple sessions

#### 7.2 Advanced Templates
- Personalized content based on user's previous sessions
- Dynamic content based on session type
- Integration with calendar systems (Google Calendar, Outlook)

#### 7.3 Analytics and Reporting
- Track email open rates and click-through rates
- Monitor reminder effectiveness on attendance rates
- A/B testing for different reminder content

## Implementation Timeline

### Week 1: Foundation
- [ ] Create database migration for reminder tracking
- [ ] Extend email service with reminder functions
- [ ] Create basic HTML templates for each reminder type

### Week 2: Core Logic
- [ ] Implement ReminderService class
- [ ] Create cron API endpoint
- [ ] Set up basic scheduling logic

### Week 3: Integration
- [ ] Integrate with existing session management
- [ ] Create admin interface for reminder management
- [ ] Add user preference settings

### Week 4: Testing & Deployment
- [ ] Comprehensive testing of reminder system
- [ ] Set up production cron jobs
- [ ] Monitor and optimize performance

## Technical Considerations

### Performance
- Use database indexes on `session_enrollments.session_id` and `sessions.start_time`
- Batch email sending to avoid rate limits
- Implement retry logic for failed email sends

### Error Handling
- Graceful handling of invalid email addresses
- Retry mechanism for temporary email service failures
- Logging and monitoring for debugging

### Security
- Validate cron job authorization tokens
- Ensure RLS policies protect user data
- Rate limiting on manual reminder endpoints

### Scalability
- Consider queue system for high-volume email sending
- Database connection pooling for cron jobs
- Monitoring for email service quotas and limits

## Dependencies

### New Dependencies (if needed)
- `node-cron`: For local cron job scheduling (if not using external cron)
- `@types/node-cron`: TypeScript definitions

### External Services
- **Vercel Cron Jobs**: For production scheduling (recommended)
- **Resend API**: Continue using existing email service
- **Supabase Edge Functions**: Alternative for cron job execution

## Success Metrics

### Technical Metrics
- Email delivery rate > 98%
- Processing time < 30 seconds per batch
- Zero duplicate reminder emails sent

### Business Metrics
- Increased session attendance rates
- Reduced no-show rates
- Improved user engagement with email notifications

## Risk Mitigation

### Email Deliverability
- Monitor bounce rates and spam complaints
- Implement proper email authentication (SPF, DKIM)
- Provide easy unsubscribe options

### System Reliability
- Implement health checks for cron jobs
- Set up alerting for failed reminder batches
- Create manual backup processes for critical sessions

### User Experience
- Ensure reminders are helpful, not annoying
- Provide clear opt-out mechanisms
- Test email rendering across different clients

---

## Next Steps

1. **Review and Approve Plan**: Stakeholder review of this implementation plan
2. **Create Database Migration**: Start with Phase 1 database schema updates
3. **Extend Email Service**: Implement new reminder email functions
4. **Set Up Cron Infrastructure**: Configure scheduling system
5. **Iterative Development**: Build and test each phase incrementally

This plan provides a comprehensive approach to implementing session reminder emails while building on the existing email infrastructure and maintaining system reliability.
