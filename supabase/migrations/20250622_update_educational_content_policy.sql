-- Update the RLS policy for educational_content to allow admins to upload content
DROP POLICY IF EXISTS "Faculty can upload their own content" ON public.educational_content;

CREATE POLICY "Faculty and admins can upload content"
  ON public.educational_content FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.get_user_role(auth.uid()) = 'faculty' AND auth.uid() = faculty_id) OR
    (public.get_user_role(auth.uid()) = 'admin')
  );
