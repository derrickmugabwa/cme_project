-- Add new columns to session_settings table
ALTER TABLE session_settings 
ADD COLUMN IF NOT EXISTS use_percentage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attendance_percentage INTEGER DEFAULT 50;

-- Update the recalculate_attendance_eligibility function to support percentage-based eligibility
CREATE OR REPLACE FUNCTION recalculate_attendance_eligibility(
  session_id_param UUID,
  min_minutes_param INTEGER,
  use_percentage_param BOOLEAN,
  attendance_percentage_param INTEGER
) RETURNS VOID AS $$
DECLARE
  session_duration_minutes INTEGER;
  required_minutes INTEGER;
BEGIN
  -- Get session duration in minutes
  SELECT 
    EXTRACT(EPOCH FROM (end_time - start_time))/60 INTO session_duration_minutes
  FROM 
    sessions
  WHERE 
    id = session_id_param;
  
  -- Calculate required minutes based on settings
  IF use_percentage_param = TRUE AND session_duration_minutes IS NOT NULL THEN
    required_minutes := GREATEST(1, FLOOR(session_duration_minutes * attendance_percentage_param / 100));
  ELSE
    required_minutes := min_minutes_param;
  END IF;
  
  -- Update the is_eligible field for all attendance records for this session
  UPDATE session_attendance
  SET 
    is_eligible = (duration_minutes >= required_minutes),
    updated_at = NOW()
  WHERE 
    session_id = session_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update the check_attendance_eligibility function trigger to support percentage-based eligibility
CREATE OR REPLACE FUNCTION check_attendance_eligibility() RETURNS TRIGGER AS $$
DECLARE
  min_minutes INTEGER;
  use_percentage BOOLEAN;
  attendance_percentage INTEGER;
  session_duration_minutes INTEGER;
  required_minutes INTEGER;
BEGIN
  -- Get session settings
  SELECT 
    ss.min_attendance_minutes, 
    ss.use_percentage, 
    ss.attendance_percentage
  INTO 
    min_minutes, 
    use_percentage, 
    attendance_percentage
  FROM 
    session_settings ss
  WHERE 
    ss.session_id = NEW.session_id;
  
  -- If no settings found, use defaults
  IF min_minutes IS NULL THEN
    min_minutes := 30;
    use_percentage := FALSE;
    attendance_percentage := 50;
  END IF;
  
  -- If using percentage, calculate required minutes based on session duration
  IF use_percentage = TRUE THEN
    -- Get session duration
    SELECT 
      EXTRACT(EPOCH FROM (end_time - start_time))/60 INTO session_duration_minutes
    FROM 
      sessions
    WHERE 
      id = NEW.session_id;
    
    -- Calculate required minutes (minimum 1 minute)
    IF session_duration_minutes IS NOT NULL THEN
      required_minutes := GREATEST(1, FLOOR(session_duration_minutes * attendance_percentage / 100));
    ELSE
      -- If session duration not available, fall back to fixed minutes
      required_minutes := min_minutes;
    END IF;
  ELSE
    -- Use fixed minutes
    required_minutes := min_minutes;
  END IF;
  
  -- Set eligibility based on attendance duration
  NEW.is_eligible := (NEW.duration_minutes >= required_minutes);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
