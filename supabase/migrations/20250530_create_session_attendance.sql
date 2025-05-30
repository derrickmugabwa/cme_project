-- Create session attendance table for tracking webinar attendance
CREATE TABLE session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending_approval',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id, session_id)
);

-- Add RLS policies
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own attendance records
CREATE POLICY "Users can view their own attendance records"
  ON session_attendance
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own attendance records
CREATE POLICY "Users can insert their own attendance records"
  ON session_attendance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins/faculty to view all attendance records
CREATE POLICY "Admins and faculty can view all attendance records"
  ON session_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- Policy for admins/faculty to update attendance records
CREATE POLICY "Admins and faculty can update attendance records"
  ON session_attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );
