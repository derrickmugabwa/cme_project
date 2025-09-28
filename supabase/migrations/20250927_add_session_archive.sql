-- Add archive functionality to sessions table
-- This allows "soft delete" instead of permanently deleting sessions and all related data

-- Add archived column to sessions table
ALTER TABLE sessions 
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN archive_reason TEXT DEFAULT NULL;

-- Create index for better performance when filtering archived sessions
CREATE INDEX idx_sessions_archived_at ON sessions(archived_at);

-- Update RLS policies to exclude archived sessions by default
DROP POLICY IF EXISTS "Anyone can view sessions" ON sessions;
CREATE POLICY "Anyone can view non-archived sessions"
  ON sessions
  FOR SELECT
  USING (archived_at IS NULL);

-- Allow admins and faculty to view archived sessions
CREATE POLICY "Admins and faculty can view all sessions including archived"
  ON sessions
  FOR SELECT
  USING (
    archived_at IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- Add archive function for better consistency
CREATE OR REPLACE FUNCTION archive_session(
  session_id UUID,
  reason TEXT DEFAULT 'Archived by admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to archive
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'faculty')
  ) AND NOT EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_id
    AND sessions.created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to archive session';
  END IF;

  -- Archive the session
  UPDATE sessions 
  SET 
    archived_at = now(),
    archived_by = auth.uid(),
    archive_reason = reason,
    updated_at = now()
  WHERE id = session_id
  AND archived_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Add unarchive function
CREATE OR REPLACE FUNCTION unarchive_session(session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to unarchive
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'faculty')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to unarchive session';
  END IF;

  -- Unarchive the session
  UPDATE sessions 
  SET 
    archived_at = NULL,
    archived_by = NULL,
    archive_reason = NULL,
    updated_at = now()
  WHERE id = session_id
  AND archived_at IS NOT NULL;

  RETURN FOUND;
END;
$$;
