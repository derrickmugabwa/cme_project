-- Add duration_minutes column to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Update existing sessions to calculate duration_minutes from start_time and end_time
UPDATE public.sessions 
SET duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60
WHERE duration_minutes IS NULL AND start_time IS NOT NULL AND end_time IS NOT NULL;

-- Create a function to automatically calculate duration_minutes when start_time or end_time changes
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update duration_minutes
DROP TRIGGER IF EXISTS trg_calculate_session_duration ON public.sessions;
CREATE TRIGGER trg_calculate_session_duration
BEFORE INSERT OR UPDATE OF start_time, end_time ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_session_duration();

COMMENT ON COLUMN public.sessions.duration_minutes IS 'Duration of the session in minutes, calculated from start_time and end_time';
