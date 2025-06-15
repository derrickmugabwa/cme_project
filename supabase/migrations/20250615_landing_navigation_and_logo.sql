-- Migration for landing navigation and logo management
-- This migration creates tables for storing navigation items and logo for the landing page

-- Table for navigation items
CREATE TABLE IF NOT EXISTS landing_navigation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  is_external BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for logo
CREATE TABLE IF NOT EXISTS landing_logo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up RLS policies
ALTER TABLE landing_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_logo ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY admin_landing_navigation ON landing_navigation 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY admin_landing_logo ON landing_logo 
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create policies for public read access
CREATE POLICY public_read_landing_navigation ON landing_navigation 
  FOR SELECT USING (true);

CREATE POLICY public_read_landing_logo ON landing_logo 
  FOR SELECT USING (true);

-- Insert initial data for navigation
INSERT INTO landing_navigation (label, url, is_external, order_index)
VALUES 
  ('Home', '/', false, 0),
  ('Features', '/#features', false, 1),
  ('Testimonials', '/#testimonials', false, 2),
  ('Pricing', '/#pricing', false, 3),
  ('Contact', '/#contact', false, 4),
  ('Login', '/auth/login', false, 5);

-- Insert initial data for logo (placeholder)
INSERT INTO landing_logo (url, alt_text)
VALUES (
  'https://placehold.co/200x50/0099ff/ffffff?text=CME+Platform',
  'CME Platform Logo'
);

-- Add storage policies for site assets in the content bucket
-- Allow admins to upload site assets
CREATE POLICY "Admins can upload site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content' AND
    (storage.foldername(name))[1] = 'site-assets' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Allow admins to update site assets
CREATE POLICY "Admins can update site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  WITH CHECK (
    bucket_id = 'content' AND
    (storage.foldername(name))[1] = 'site-assets' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Allow admins to delete site assets
CREATE POLICY "Admins can delete site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'content' AND
    (storage.foldername(name))[1] = 'site-assets' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Allow public read access to site assets
CREATE POLICY "Public can view site assets"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'content' AND
    (storage.foldername(name))[1] = 'site-assets'
  );
