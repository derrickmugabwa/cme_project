-- Add missing columns to landing_cta table
DO $$
BEGIN
  -- Add button_primary_text if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'landing_cta' 
    AND column_name = 'button_primary_text'
  ) THEN
    ALTER TABLE landing_cta ADD COLUMN button_primary_text TEXT;
    
    -- Copy data from primary_button_text if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'primary_button_text'
    ) THEN
      UPDATE landing_cta SET button_primary_text = primary_button_text;
    END IF;
  END IF;
  
  -- Add button_secondary_text if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'landing_cta' 
    AND column_name = 'button_secondary_text'
  ) THEN
    ALTER TABLE landing_cta ADD COLUMN button_secondary_text TEXT;
    
    -- Copy data from secondary_button_text if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'secondary_button_text'
    ) THEN
      UPDATE landing_cta SET button_secondary_text = secondary_button_text;
    END IF;
  END IF;
END
$$;
