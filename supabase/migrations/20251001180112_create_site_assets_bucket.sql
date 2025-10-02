-- Create site-assets storage bucket for favicon and other site assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'site-assets',
    'site-assets',
    true,
    52428800, -- 50MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for site-assets bucket (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Anyone can view site assets'
    ) THEN
        CREATE POLICY "Anyone can view site assets"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'site-assets');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can upload site assets'
    ) THEN
        CREATE POLICY "Admins can upload site assets"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'site-assets' 
            AND (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'faculty')
                )
                OR auth.role() = 'authenticated'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can update site assets'
    ) THEN
        CREATE POLICY "Admins can update site assets"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'site-assets'
            AND (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'faculty')
                )
                OR auth.role() = 'authenticated'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can delete site assets'
    ) THEN
        CREATE POLICY "Admins can delete site assets"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'site-assets'
            AND (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role IN ('admin', 'faculty')
                )
                OR auth.role() = 'authenticated'
            )
        );
    END IF;
END $$;
