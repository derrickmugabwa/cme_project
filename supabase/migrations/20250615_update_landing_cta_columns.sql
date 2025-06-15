-- Update landing_cta table columns to match component expectations
DO $$
BEGIN
  -- Rename existing columns to match component expectations
  BEGIN
    -- Check if button_primary_text exists and primary_button_text doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'button_primary_text'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'primary_button_text'
    ) THEN
      ALTER TABLE landing_cta RENAME COLUMN button_primary_text TO primary_button_text;
    END IF;

    -- Check if button_secondary_text exists and secondary_button_text doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'button_secondary_text'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'secondary_button_text'
    ) THEN
      ALTER TABLE landing_cta RENAME COLUMN button_secondary_text TO secondary_button_text;
    END IF;

    -- Check if description exists and primary_button_url doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'description'
    ) THEN
      -- If we're renaming description, first add primary_button_url if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_cta' 
        AND column_name = 'primary_button_url'
      ) THEN
        ALTER TABLE landing_cta ADD COLUMN primary_button_url TEXT DEFAULT '/register';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue even if there's an error with column renaming
  END;

  -- Add missing columns
  BEGIN
    -- Add primary_button_url if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'primary_button_url'
    ) THEN
      ALTER TABLE landing_cta ADD COLUMN primary_button_url TEXT DEFAULT '/register';
    END IF;

    -- Add secondary_button_url if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_cta' 
      AND column_name = 'secondary_button_url'
    ) THEN
      ALTER TABLE landing_cta ADD COLUMN secondary_button_url TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Continue even if there's an error with adding columns
  END;
END
$$;
