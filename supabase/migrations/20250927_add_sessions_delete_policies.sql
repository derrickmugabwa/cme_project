-- Add DELETE policies for sessions table
-- This migration adds the missing DELETE policies that were preventing session deletion

-- Allow faculty to delete their own sessions
CREATE POLICY "Faculty can delete their own sessions"
  ON sessions
  FOR DELETE
  USING (created_by = auth.uid() AND get_user_role(auth.uid()) = 'faculty');

-- Allow admins to delete all sessions
CREATE POLICY "Admins can delete all sessions"
  ON sessions
  FOR DELETE
  USING (get_user_role(auth.uid()) = 'admin');
