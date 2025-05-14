-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a function to safely check user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create new policies that use the function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Also fix other policies that might have the same issue
ALTER POLICY "Faculty can manage their own courses" ON courses
  USING (
    public.get_user_role(auth.uid()) = 'faculty'
    AND faculty_id = auth.uid()
  );

ALTER POLICY "Admins can manage all courses" ON courses
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

ALTER POLICY "Faculty can view enrollments for their courses" ON enrollments
  USING (
    public.get_user_role(auth.uid()) = 'faculty'
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = enrollments.course_id
      AND courses.faculty_id = auth.uid()
    )
  );

ALTER POLICY "Admins can manage all enrollments" ON enrollments
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

ALTER POLICY "Faculty can manage attendance for their courses" ON attendance
  USING (
    public.get_user_role(auth.uid()) = 'faculty'
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = attendance.course_id
      AND courses.faculty_id = auth.uid()
    )
  );

ALTER POLICY "Admins can manage all attendance records" ON attendance
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );
