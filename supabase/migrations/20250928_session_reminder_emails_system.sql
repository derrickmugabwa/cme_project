-- Migration: Session Reminder Emails System
-- Created: 2025-09-28
-- Description: Creates tables and policies for automated session reminder emails

-- Create session_reminder_emails table to track sent reminders
CREATE TABLE session_reminder_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL, -- '24h', '2h', '1h', '30min', 'custom'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced', 'retrying'
  resend_email_id TEXT, -- Store Resend's email ID for tracking
  inngest_event_id TEXT, -- Store Inngest event ID for tracking
  retry_count INTEGER DEFAULT 0, -- Number of retry attempts
  last_error TEXT, -- Store last error message for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure we don't send duplicate reminders
  UNIQUE(session_id, user_id, reminder_type)
);

-- Create reminder_configurations table to manage reminder types and settings
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

-- Insert default reminder configurations
INSERT INTO reminder_configurations (reminder_type, minutes_before, display_name, email_subject_template, sort_order, is_enabled) VALUES
('24h', 1440, '24 Hours Before', 'Reminder: {session_title} starts tomorrow', 1, true),
('2h', 120, '2 Hours Before', 'Starting Soon: {session_title} in 2 hours', 2, true),
('1h', 60, '1 Hour Before', 'Starting Soon: {session_title} in 1 hour', 3, false), -- Disabled by default
('30min', 30, '30 Minutes Before', 'Starting Now: {session_title} begins in 30 minutes', 4, true);

-- Create indexes for performance
CREATE INDEX idx_session_reminder_emails_session_id ON session_reminder_emails(session_id);
CREATE INDEX idx_session_reminder_emails_user_id ON session_reminder_emails(user_id);
CREATE INDEX idx_session_reminder_emails_reminder_type ON session_reminder_emails(reminder_type);
CREATE INDEX idx_session_reminder_emails_sent_at ON session_reminder_emails(sent_at);
CREATE INDEX idx_session_reminder_emails_email_status ON session_reminder_emails(email_status);

CREATE INDEX idx_reminder_configurations_is_enabled ON reminder_configurations(is_enabled);
CREATE INDEX idx_reminder_configurations_sort_order ON reminder_configurations(sort_order);

-- Enable Row Level Security
ALTER TABLE session_reminder_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_reminder_emails
-- Users can view their own reminder email records
CREATE POLICY "Users can view own reminder emails" ON session_reminder_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all reminder emails (for cron jobs and system operations)
CREATE POLICY "Service role can manage reminder emails" ON session_reminder_emails
  FOR ALL USING (auth.role() = 'service_role');

-- Admins and faculty can view all reminder emails for monitoring
CREATE POLICY "Admins can view all reminder emails" ON session_reminder_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- RLS Policies for reminder_configurations
-- All authenticated users can read reminder configurations
CREATE POLICY "Users can read reminder configurations" ON reminder_configurations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins and faculty can modify reminder configurations
CREATE POLICY "Admins can manage reminder configurations" ON reminder_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'faculty')
    )
  );

-- Service role can manage all reminder configurations (for system operations)
CREATE POLICY "Service role can manage reminder configurations" ON reminder_configurations
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_session_reminder_emails_updated_at 
  BEFORE UPDATE ON session_reminder_emails 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_configurations_updated_at 
  BEFORE UPDATE ON reminder_configurations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add email preferences to profiles table if not exists
-- This allows users to control their reminder preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_preferences JSONB DEFAULT '{
      "session_reminders": true,
      "reminder_24h": true,
      "reminder_2h": true,
      "reminder_1h": true,
      "reminder_30min": true
    }'::jsonb;
  END IF;
END $$;

-- Create index on email preferences for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_email_preferences ON profiles USING GIN (email_preferences);

-- Create a view for easy querying of reminder eligibility
CREATE OR REPLACE VIEW reminder_eligible_enrollments AS
SELECT 
  se.session_id,
  se.user_id,
  s.title as session_title,
  s.description as session_description,
  s.start_time,
  s.end_time,
  s.location,
  s.is_online,
  p.full_name,
  p.email,
  p.email_preferences,
  se.created_at as enrolled_at
FROM session_enrollments se
JOIN sessions s ON se.session_id = s.id
JOIN profiles p ON se.user_id = p.id
WHERE 
  se.status = 'active'
  AND s.start_time > NOW()
  AND p.email IS NOT NULL
  AND (p.email_preferences->>'session_reminders')::boolean = true;

-- Grant necessary permissions
GRANT SELECT ON reminder_eligible_enrollments TO authenticated;
GRANT SELECT ON reminder_eligible_enrollments TO service_role;

-- Create function to get pending reminders for a specific configuration
CREATE OR REPLACE FUNCTION get_pending_reminders(config_id UUID)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  session_title TEXT,
  session_description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  is_online BOOLEAN,
  user_name TEXT,
  user_email TEXT,
  reminder_type VARCHAR(20),
  minutes_before INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_record reminder_configurations%ROWTYPE;
  target_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the configuration
  SELECT * INTO config_record 
  FROM reminder_configurations 
  WHERE id = config_id AND is_enabled = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate target time window
  target_time := NOW() + (config_record.minutes_before || ' minutes')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    ree.session_id,
    ree.user_id,
    ree.session_title,
    ree.session_description,
    ree.start_time,
    ree.end_time,
    ree.location,
    ree.is_online,
    ree.full_name,
    ree.email,
    config_record.reminder_type,
    config_record.minutes_before
  FROM reminder_eligible_enrollments ree
  WHERE 
    ree.start_time <= target_time
    AND ree.start_time > NOW()
    AND (ree.email_preferences->>('reminder_' || config_record.reminder_type))::boolean = true
    AND NOT EXISTS (
      SELECT 1 FROM session_reminder_emails sre
      WHERE sre.session_id = ree.session_id
        AND sre.user_id = ree.user_id
        AND sre.reminder_type = config_record.reminder_type
    );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_pending_reminders(UUID) TO service_role;

-- Add comments for documentation
COMMENT ON TABLE session_reminder_emails IS 'Tracks all reminder emails sent to users for sessions';
COMMENT ON TABLE reminder_configurations IS 'Configurable reminder types and their settings';
COMMENT ON VIEW reminder_eligible_enrollments IS 'View of users eligible to receive reminder emails';
COMMENT ON FUNCTION get_pending_reminders(UUID) IS 'Returns pending reminders for a specific reminder configuration';

-- Migration completed successfully
