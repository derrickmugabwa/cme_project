-- Session Media Upload Feature Migration
-- This migration adds support for uploading videos and images to webinar sessions

-- Create session media files table
CREATE TABLE session_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'image')),
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Format: session-media/{user_id}/{session_id}/{filename}
    public_url TEXT,
    thumbnail_url TEXT, -- For videos and large images
    upload_status TEXT DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    metadata JSONB, -- Duration, dimensions, etc.
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_session_media_session_id ON session_media(session_id);
CREATE INDEX idx_session_media_type ON session_media(file_type);
CREATE INDEX idx_session_media_status ON session_media(upload_status);
CREATE INDEX idx_session_media_display_order ON session_media(session_id, display_order);

-- Enable RLS
ALTER TABLE session_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_media table
-- Users can view media for sessions they have access to
CREATE POLICY "Users can view session media" ON session_media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_media.session_id
            AND (
                -- Session is public (anyone can view)
                TRUE
                -- Future: Add more granular access control if needed
            )
        )
    );

-- Only session creators and admins can insert/update/delete media
CREATE POLICY "Session creators and admins can manage media" ON session_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN profiles p ON p.id = auth.uid()
            WHERE s.id = session_media.session_id
            AND (
                s.created_by = auth.uid()
                OR p.role = 'admin'
            )
        )
    );

-- Update existing content bucket with file size and type restrictions
UPDATE storage.buckets 
SET 
    file_size_limit = 524288000, -- 500MB limit
    allowed_mime_types = ARRAY[
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ]
WHERE id = 'content';

-- Add storage policies for session media (using existing content bucket)
CREATE POLICY "Users can view session media files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'content' 
        AND (storage.foldername(name))[1] = 'session-media'
    );

CREATE POLICY "Faculty and admins can upload session media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'content'
        AND (storage.foldername(name))[1] = 'session-media'
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'faculty')
        )
    );

CREATE POLICY "Users can update their own session media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'content'
        AND (storage.foldername(name))[1] = 'session-media'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

CREATE POLICY "Users can delete their own session media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'content'
        AND (storage.foldername(name))[1] = 'session-media'
        AND auth.uid()::text = (storage.foldername(name))[2]
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_media_updated_at
    BEFORE UPDATE ON session_media
    FOR EACH ROW
    EXECUTE FUNCTION update_session_media_updated_at();

-- Add comment to table
COMMENT ON TABLE session_media IS 'Stores media files (videos and images) associated with webinar sessions';
COMMENT ON COLUMN session_media.file_type IS 'Type of media file: video or image';
COMMENT ON COLUMN session_media.storage_path IS 'Path in storage bucket: session-media/{user_id}/{session_id}/{filename}';
COMMENT ON COLUMN session_media.metadata IS 'JSON metadata like video duration, image dimensions, etc.';
COMMENT ON COLUMN session_media.display_order IS 'Order for displaying media in UI (0 = first)';
