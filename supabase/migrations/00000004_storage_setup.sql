-- Create a storage bucket for educational content
INSERT INTO storage.buckets (id, name, public)
VALUES ('content', 'content', false);

-- Set up RLS policies for the content bucket
CREATE POLICY "Faculty and admins can upload content"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content' AND
    (
      auth.uid()::text = (storage.foldername(name))[1] AND
      (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can download content they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content' AND
    (
      -- Faculty can access their own content
      (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('faculty', 'admin')
        ) AND
        auth.uid()::text = (storage.foldername(name))[1]
      ) OR
      -- Admin can access all content
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) OR
      -- Students can access content for courses they're enrolled in
      EXISTS (
        SELECT 1 FROM educational_content ec
        JOIN enrollments e ON e.course_id = ec.course_id
        WHERE ec.file_path = name AND e.student_id = auth.uid()
      )
    )
  );

-- Create function to handle content deletion
CREATE OR REPLACE FUNCTION public.handle_content_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the file from storage when the content record is deleted
  DELETE FROM storage.objects
  WHERE bucket_id = 'content' AND name = OLD.file_path;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle content deletion
CREATE TRIGGER on_content_deleted
  AFTER DELETE ON educational_content
  FOR EACH ROW EXECUTE FUNCTION public.handle_content_deletion();

-- Update the database schema to include the Supabase storage extension
CREATE EXTENSION IF NOT EXISTS "pg_net";
