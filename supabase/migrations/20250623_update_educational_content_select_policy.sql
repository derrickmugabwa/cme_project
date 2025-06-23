-- Update the RLS policy for educational_content to fix visibility issues
DROP POLICY IF EXISTS "Faculty can view their own content" ON public.educational_content;

CREATE POLICY "Content visibility policy"
  ON public.educational_content FOR SELECT
  TO authenticated
  USING (
    -- Faculty can see their own content
    auth.uid() = faculty_id OR
    -- Admins can see all content
    public.get_user_role(auth.uid()) = 'admin' OR
    -- Regular users can see all published content
    (public.get_user_role(auth.uid()) = 'user' AND is_published = true)
  );
