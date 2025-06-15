-- Check if landing_cta table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'landing_cta') THEN
    -- Create landing_cta table if it doesn't exist
    CREATE TABLE landing_cta (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      primary_button_text TEXT NOT NULL,
      primary_button_url TEXT NOT NULL,
      secondary_button_text TEXT,
      secondary_button_url TEXT,
      background_image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Add missing columns if the table already exists
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'landing_cta' AND column_name = 'background_image_url') THEN
        ALTER TABLE landing_cta ADD COLUMN background_image_url TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'landing_cta' AND column_name = 'subtitle') THEN
        ALTER TABLE landing_cta ADD COLUMN subtitle TEXT NOT NULL DEFAULT 'Join our platform today and access high-quality CME courses';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Continue even if there's an error
    END;
  END IF;
END
$$;

-- Add RLS policies for landing_cta
ALTER TABLE landing_cta ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to landing_cta"
  ON landing_cta FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admin write access
CREATE POLICY "Allow admin write access to landing_cta"
  ON landing_cta FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Allow admin update access to landing_cta"
  ON landing_cta FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Allow admin delete access to landing_cta"
  ON landing_cta FOR DELETE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Insert initial data if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM landing_cta LIMIT 1) THEN
    INSERT INTO landing_cta (title, primary_button_text, primary_button_url)
    VALUES (
      'Ready to transform your medical education?',
      'Get Started',
      '/register'
    );
    
    -- Update subtitle separately to handle the case where it might be a new column
    UPDATE landing_cta 
    SET subtitle = 'Join our platform today and access high-quality CME courses designed by leading medical professionals.'
    WHERE title = 'Ready to transform your medical education?';
  END IF;
END
$$;
