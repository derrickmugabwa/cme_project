-- Migration: Update profiles table for enhanced registration form
-- Date: 2025-09-04
-- Description: Add new fields for detailed user registration including separate name fields,
--              ID number, professional information, and other registration details

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS surname TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS professional_cadre TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS professional_board TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN profiles.first_name IS 'User''s first name';
COMMENT ON COLUMN profiles.middle_name IS 'User''s middle name (optional)';
COMMENT ON COLUMN profiles.surname IS 'User''s surname/last name';
COMMENT ON COLUMN profiles.id_number IS 'National ID number or equivalent identification';
COMMENT ON COLUMN profiles.title IS 'Professional title (Dr., Mr., Ms., etc.)';
COMMENT ON COLUMN profiles.country IS 'Country of residence';
COMMENT ON COLUMN profiles.phone_number IS 'Contact phone number';
COMMENT ON COLUMN profiles.professional_cadre IS 'Professional category (e.g., Medical Doctor, Nurse)';
COMMENT ON COLUMN profiles.registration_number IS 'Professional registration number';
COMMENT ON COLUMN profiles.professional_board IS 'Professional regulatory board';
COMMENT ON COLUMN profiles.institution IS 'Institution of work/employment';
COMMENT ON COLUMN profiles.accepted_terms IS 'Whether user has accepted terms and conditions';

-- Create a function to construct full_name from separate name fields
CREATE OR REPLACE FUNCTION construct_full_name(first_name TEXT, middle_name TEXT, surname TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(CONCAT(
    COALESCE(first_name, ''),
    CASE WHEN middle_name IS NOT NULL AND middle_name != '' THEN ' ' || middle_name ELSE '' END,
    CASE WHEN surname IS NOT NULL AND surname != '' THEN ' ' || surname ELSE '' END
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a trigger function to automatically update full_name when name fields change
CREATE OR REPLACE FUNCTION update_full_name_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update full_name if any of the name fields have changed
  IF (OLD.first_name IS DISTINCT FROM NEW.first_name) OR 
     (OLD.middle_name IS DISTINCT FROM NEW.middle_name) OR 
     (OLD.surname IS DISTINCT FROM NEW.surname) THEN
    
    NEW.full_name := construct_full_name(NEW.first_name, NEW.middle_name, NEW.surname);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update full_name
DROP TRIGGER IF EXISTS trigger_update_full_name ON profiles;
CREATE TRIGGER trigger_update_full_name
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_full_name_trigger();

-- Update existing records to construct first_name and surname from existing full_name
-- This is a one-time update for existing records that might have full_name but not separate fields
UPDATE profiles 
SET 
  first_name = COALESCE(first_name, SPLIT_PART(full_name, ' ', 1)),
  surname = COALESCE(surname, 
    CASE 
      WHEN array_length(string_to_array(full_name, ' '), 1) > 1 
      THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
      ELSE NULL 
    END
  ),
  accepted_terms = COALESCE(accepted_terms, FALSE)
WHERE full_name IS NOT NULL 
  AND (first_name IS NULL OR surname IS NULL OR accepted_terms IS NULL);

-- Ensure all existing users have accepted_terms set to FALSE (for those without full_name)
UPDATE profiles 
SET accepted_terms = FALSE 
WHERE accepted_terms IS NULL;

-- Update the handle_new_user function to work with new registration fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    role,
    full_name,
    first_name,
    middle_name,
    surname,
    title,
    id_number,
    country,
    phone_number,
    professional_cadre,
    registration_number,
    professional_board,
    institution,
    accepted_terms
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'middle_name',
    NEW.raw_user_meta_data->>'surname',
    NEW.raw_user_meta_data->>'title',
    NEW.raw_user_meta_data->>'id_number',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'professional_cadre',
    NEW.raw_user_meta_data->>'registration_number',
    NEW.raw_user_meta_data->>'professional_board',
    NEW.raw_user_meta_data->>'institution',
    COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better query performance on commonly searched fields
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_professional_cadre ON profiles(professional_cadre);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution);
CREATE INDEX IF NOT EXISTS idx_profiles_registration_number ON profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_profiles_id_number ON profiles(id_number);

-- Add unique constraint on id_number if it should be unique (uncomment if needed)
-- ALTER TABLE profiles ADD CONSTRAINT unique_id_number UNIQUE (id_number);

-- Add check constraints for data validation
ALTER TABLE profiles 
ADD CONSTRAINT check_accepted_terms CHECK (accepted_terms IS NOT NULL),
ADD CONSTRAINT check_title_values CHECK (
  title IS NULL OR title IN ('Dr', 'Prof', 'Mr', 'Mrs', 'Ms', 'Dr.', 'Prof.')
);

-- Update RLS policies to include new fields in select policies
-- Users can view their own extended profile information
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own extended profile information  
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION construct_full_name(TEXT, TEXT, TEXT) TO authenticated;
