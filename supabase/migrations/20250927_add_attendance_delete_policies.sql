-- Add DELETE policies for session-related tables
-- This migration adds the missing DELETE policies that were preventing cascade deletion

-- DELETE policies for session_attendance table
-- Allow users to delete their own attendance records
CREATE POLICY "Users can delete their own attendance records"
  ON session_attendance
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins and faculty to delete all attendance records
CREATE POLICY "Admins and faculty can delete all attendance records"
  ON session_attendance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- DELETE policies for session_enrollments table
-- Allow users to delete their own enrollment records
CREATE POLICY "Users can delete their own enrollments"
  ON session_enrollments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins and faculty to delete all enrollment records
CREATE POLICY "Admins and faculty can delete all enrollments"
  ON session_enrollments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );

-- DELETE policies for session_media table (if it exists and has RLS)
-- Allow admins and faculty to delete session media
CREATE POLICY "Admins and faculty can delete session media"
  ON session_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'faculty')
    )
  );
