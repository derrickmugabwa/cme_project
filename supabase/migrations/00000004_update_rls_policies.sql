-- Update RLS policy for educational_content to allow students to see all published content
DROP POLICY IF EXISTS "Faculty can view their own content" ON educational_content;

CREATE POLICY "Users can view appropriate content"
  ON educational_content FOR SELECT
  TO authenticated
  USING (
    -- Faculty can see their own content
    auth.uid() = faculty_id OR
    -- Admins can see all content
    public.get_user_role(auth.uid()) = 'admin' OR
    -- Students can see all published content without enrollment requirement
    (
      public.get_user_role(auth.uid()) = 'student' AND
      is_published = true
    )
  );

-- Comment explaining the change
-- Previously, students could only see content if they were enrolled in the associated course
-- Now, students can see all published content regardless of enrollment

-- Create a service role bypass policy for seeding content
CREATE POLICY "Service role can manage all content"
  ON educational_content FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
