-- Teams Integration Migration

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES profiles(id) NOT NULL
);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sessions
CREATE POLICY "Anyone can view sessions" 
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Faculty and admins can create sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('faculty', 'admin')
  );

CREATE POLICY "Faculty can update their own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'faculty'
  );

CREATE POLICY "Admins can update all sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Teams-related columns in sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teams_meeting_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teams_join_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teams_calendar_event_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teams_recording_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teams_error TEXT;

-- Update attendance table for Teams integration
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS teams_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS teams_join_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS teams_leave_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS teams_duration_minutes INTEGER;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_method TEXT CHECK (verification_method IN ('code', 'teams', 'both', 'manual'));

-- Create Microsoft Graph Tokens Table
CREATE TABLE IF NOT EXISTS ms_graph_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- RLS policy for token security
ALTER TABLE ms_graph_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_graph_tokens_policy" ON ms_graph_tokens
  FOR ALL
  USING (profile_id = auth.uid() OR 
         auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
