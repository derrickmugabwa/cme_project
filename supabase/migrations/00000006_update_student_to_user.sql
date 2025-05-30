-- Migration to change 'student' role to 'user'

-- Step 1: Create a new enum type with 'user' instead of 'student'
CREATE TYPE user_role_new AS ENUM ('user', 'faculty', 'admin');

-- Step 2: Update functions that use the role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT role::text FROM public.profiles WHERE id = user_id;
$function$;

-- Step 3: Update existing data - convert 'student' to 'user'
ALTER TABLE public.profiles
ALTER COLUMN role TYPE text;

UPDATE public.profiles
SET role = 'user'
WHERE role = 'student';

-- Step 4: Drop the old enum and rename the new one
ALTER TABLE public.profiles
ALTER COLUMN role DROP DEFAULT;

DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Step 5: Set the column back to the enum type with new default
ALTER TABLE public.profiles
ALTER COLUMN role TYPE user_role USING role::user_role;

ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'user';

-- Step 6: Update RLS policies that reference 'student' role
-- First, let's drop and recreate policies that reference the student role

-- Update educational_content policies
DROP POLICY IF EXISTS "Users can see published content" ON public.educational_content;
CREATE POLICY "Users can see published content"
  ON public.educational_content
  FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'user' AND
    status = 'published'
  );

-- Update enrollment policies
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.enrollments;
CREATE POLICY "Users can view their own enrollments"
  ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Update attendance policies
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance;
CREATE POLICY "Users can view their own attendance"
  ON public.attendance
  FOR SELECT
  USING (student_id = auth.uid());

-- Update triggers if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;
