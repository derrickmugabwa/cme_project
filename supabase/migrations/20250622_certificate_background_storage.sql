-- Migration: Certificate Background Storage Configuration
-- Description: Sets up storage policies for certificate background images in the content bucket
-- Dependency: This migration requires 20250622_payment_dashboard_functions.sql to be applied first
--             as it uses the check_is_admin() function defined there

-- Note: In Supabase storage, folders are virtual and created implicitly when files are uploaded
-- We don't need to explicitly create the folder, but we do need to set up appropriate policies

-- Create policy to allow admin users to upload certificate background images
CREATE POLICY "Allow admin users to upload certificate backgrounds" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'content' AND
    (storage.foldername(name))[1] = 'background-image' AND
    auth.role() = 'authenticated' AND
    check_is_admin()
  );

-- Create policy to allow admins to update certificate backgrounds
CREATE POLICY "Allow admins to update certificate backgrounds" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'content' AND 
    (storage.foldername(name))[1] = 'certificates' AND (storage.foldername(name))[2] = 'background-image' AND
    auth.role() = 'authenticated' AND
    check_is_admin()
  );

-- Create policy to allow admins to delete certificate backgrounds
CREATE POLICY "Allow admins to delete certificate backgrounds" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'content' AND 
    (storage.foldername(name))[1] = 'certificates' AND (storage.foldername(name))[2] = 'background-image' AND
    auth.role() = 'authenticated' AND
    check_is_admin()
  );

-- Create policy to allow public read access to certificate backgrounds
-- This is necessary for the certificate PDF generator to access the background image
CREATE POLICY "Allow public to view certificate backgrounds" ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'content' AND 
    (storage.foldername(name))[1] = 'certificates' AND (storage.foldername(name))[2] = 'background-image'
  );

-- Create system_settings table if it doesn't exist to track migrations
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert a placeholder record to track that this migration has been applied
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'migration_20250622_certificate_background_storage', 
  'applied', 
  'Certificate background storage configuration has been applied'
)
ON CONFLICT (key) DO UPDATE
SET value = 'applied',
    updated_at = now();
