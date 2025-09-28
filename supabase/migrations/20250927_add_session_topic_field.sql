-- Add mandatory topic field to sessions table
-- This field will categorize sessions by medical topic/specialty

-- Add topic column to sessions table
ALTER TABLE sessions 
ADD COLUMN topic TEXT NOT NULL DEFAULT 'General Medicine';

-- Create index for better performance when filtering by topic
CREATE INDEX idx_sessions_topic ON sessions(topic);

-- Update existing sessions to have a default topic
UPDATE sessions 
SET topic = 'General Medicine' 
WHERE topic IS NULL OR topic = '';

-- Remove the default constraint after updating existing records
-- This ensures new sessions must specify a topic
ALTER TABLE sessions 
ALTER COLUMN topic DROP DEFAULT;
