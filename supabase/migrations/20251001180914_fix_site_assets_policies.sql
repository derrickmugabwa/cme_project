-- Fix site-assets storage bucket policies
-- Drop existing policies and recreate with proper permissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;

-- Recreate policies with authenticated user access
CREATE POLICY "Anyone can view site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Authenticated users can upload site assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'site-assets' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update site assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'site-assets'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete site assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'site-assets'
    AND auth.role() = 'authenticated'
);
