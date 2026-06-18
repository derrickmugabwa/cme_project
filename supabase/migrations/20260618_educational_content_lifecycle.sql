-- Add lifecycle controls for educational content: scheduling, archive, restore, and safer deletion.

ALTER TABLE public.educational_content
ADD COLUMN IF NOT EXISTS publish_start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS publish_end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_educational_content_publish_window
  ON public.educational_content(is_published, publish_start_at, publish_end_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_educational_content_archived_at
  ON public.educational_content(archived_at);

ALTER TABLE public.educational_content
DROP CONSTRAINT IF EXISTS educational_content_publish_window_check;

ALTER TABLE public.educational_content
ADD CONSTRAINT educational_content_publish_window_check
CHECK (
  publish_start_at IS NULL
  OR publish_end_at IS NULL
  OR publish_end_at > publish_start_at
);

ALTER TABLE public.content_access
DROP CONSTRAINT IF EXISTS content_access_content_id_fkey;

ALTER TABLE public.content_access
ADD CONSTRAINT content_access_content_id_fkey
FOREIGN KEY (content_id)
REFERENCES public.educational_content(id)
ON DELETE CASCADE;

DROP POLICY IF EXISTS "Content visibility policy" ON public.educational_content;
DROP POLICY IF EXISTS "Users can see published content" ON public.educational_content;
DROP POLICY IF EXISTS "Faculty can view their own content" ON public.educational_content;

CREATE POLICY "Content visibility policy"
  ON public.educational_content FOR SELECT
  TO authenticated
  USING (
    auth.uid() = faculty_id
    OR public.get_user_role(auth.uid()) = 'admin'
    OR (
      archived_at IS NULL
      AND is_published = true
      AND (publish_start_at IS NULL OR publish_start_at <= NOW())
      AND (publish_end_at IS NULL OR publish_end_at > NOW())
      AND (
        organisation_id IS NULL
        OR organisation_id = (
          SELECT profiles.organisation_id
          FROM public.profiles
          WHERE profiles.id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can download content they have access to" ON storage.objects;

CREATE POLICY "Users can download content they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content'
    AND (
      public.get_user_role(auth.uid()) = 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.educational_content ec
        WHERE ec.file_path = name
          AND (
            ec.faculty_id = auth.uid()
            OR (
              ec.archived_at IS NULL
              AND ec.is_published = true
              AND (ec.publish_start_at IS NULL OR ec.publish_start_at <= NOW())
              AND (ec.publish_end_at IS NULL OR ec.publish_end_at > NOW())
              AND (
                ec.organisation_id IS NULL
                OR ec.organisation_id = (
                  SELECT profiles.organisation_id
                  FROM public.profiles
                  WHERE profiles.id = auth.uid()
                )
              )
            )
          )
      )
    )
  );
