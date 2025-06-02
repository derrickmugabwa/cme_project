-- Add disabled column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS profiles_disabled_idx ON profiles(disabled);
