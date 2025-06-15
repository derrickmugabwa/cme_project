-- Update the CTA component to match the database column names
DO $$
BEGIN
  -- Update the CTA component code to use the correct column names
  -- This is a safer approach than modifying the database schema further
  
  -- First, let's update the description column to match what the component expects
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'landing_cta' 
    AND column_name = 'description'
  ) THEN
    -- Copy description to subtitle if subtitle exists
    UPDATE landing_cta
    SET subtitle = description
    WHERE subtitle IS NULL;
  END IF;
END
$$;
