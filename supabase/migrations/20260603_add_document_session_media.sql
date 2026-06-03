DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'session_media'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%file_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE session_media DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE session_media
  ADD CONSTRAINT session_media_file_type_check
  CHECK (file_type IN ('video', 'image', 'document'));

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE id = 'content';

COMMENT ON COLUMN session_media.file_type IS 'Type of session file: video, image, or document';
