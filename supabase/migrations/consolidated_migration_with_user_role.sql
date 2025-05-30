-- Consolidated migration script for new Supabase project
-- This script includes all tables, types, functions, and triggers with 'user' instead of 'student'

-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE content_type AS ENUM ('pdf', 'ppt', 'doc', 'audio', 'video', 'image', 'other');
CREATE TYPE user_role AS ENUM ('user', 'faculty', 'admin'); -- Changed 'student' to 'user'

-- Create the departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- Create the profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user'::user_role NOT NULL, -- Changed default from 'student' to 'user'
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create the courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  faculty_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create the enrollments table
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  student_id UUID NOT NULL, -- Note: Column name remains 'student_id' for compatibility
  course_id UUID NOT NULL,
  status TEXT DEFAULT 'enrolled'::text NOT NULL,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Create the sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  teams_meeting_id TEXT,
  teams_join_url TEXT,
  teams_calendar_event_id TEXT,
  teams_recording_url TEXT,
  teams_error TEXT,
  online_provider TEXT
);

-- Create the attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  student_id UUID NOT NULL, -- Note: Column name remains 'student_id' for compatibility
  course_id UUID NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present'::text NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  teams_verified BOOLEAN DEFAULT false,
  teams_join_time TIMESTAMPTZ,
  teams_leave_time TIMESTAMPTZ,
  teams_duration_minutes INTEGER,
  verification_method TEXT,
  FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Create the educational_content table
CREATE TABLE educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type content_type NOT NULL,
  faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT true NOT NULL,
  download_count INTEGER DEFAULT 0 NOT NULL
);

-- Create the content_access table
CREATE TABLE content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  content_id UUID NOT NULL REFERENCES educational_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL
);

-- Create the ms_graph_tokens table
CREATE TABLE ms_graph_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create functions

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role::text FROM profiles WHERE id = user_id;
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::user_role); -- Changed from 'student' to 'user'
  RETURN NEW;
END;
$$;

-- Function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.access_type = 'download' THEN
    UPDATE educational_content
    SET download_count = download_count + 1
    WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to handle content deletion
CREATE OR REPLACE FUNCTION public.handle_content_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the file from storage when the content record is deleted
  DELETE FROM storage.objects
  WHERE bucket_id = 'content' AND name = OLD.file_path;
  
  RETURN OLD;
END;
$$;

-- Create triggers

-- Trigger for updated_at on profiles
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION moddatetime (updated_at);

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Trigger for download count increment
CREATE TRIGGER on_content_access
AFTER INSERT ON content_access
FOR EACH ROW
EXECUTE FUNCTION public.increment_download_count();

-- Trigger for content deletion
CREATE TRIGGER on_content_deletion
BEFORE DELETE ON educational_content
FOR EACH ROW
EXECUTE FUNCTION public.handle_content_deletion();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ms_graph_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view basic profile information"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

-- Courses policies
CREATE POLICY "Anyone can view active courses"
  ON courses
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Faculty can manage their own courses"
  ON courses
  FOR ALL
  USING (faculty_id = auth.uid() AND get_user_role(auth.uid()) = 'faculty');

CREATE POLICY "Admins can manage all courses"
  ON courses
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments"
  ON enrollments
  FOR SELECT
  USING (student_id = auth.uid()); -- Changed policy name from "Students can view..." to "Users can view..."

CREATE POLICY "Faculty can view enrollments for their courses"
  ON enrollments
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE faculty_id = auth.uid()
    ) AND get_user_role(auth.uid()) = 'faculty'
  );

CREATE POLICY "Admins can manage all enrollments"
  ON enrollments
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Sessions policies
CREATE POLICY "Anyone can view sessions"
  ON sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Faculty and admins can create sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('faculty', 'admin'));

CREATE POLICY "Faculty can update their own sessions"
  ON sessions
  FOR UPDATE
  USING (created_by = auth.uid() AND get_user_role(auth.uid()) = 'faculty');

CREATE POLICY "Admins can update all sessions"
  ON sessions
  FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

-- Attendance policies
CREATE POLICY "Users can view their own attendance"
  ON attendance
  FOR SELECT
  USING (student_id = auth.uid()); -- Changed policy name from "Students can view..." to "Users can view..."

CREATE POLICY "Faculty can manage attendance for their courses"
  ON attendance
  FOR ALL
  USING (
    course_id IN (
      SELECT id FROM courses WHERE faculty_id = auth.uid()
    ) AND get_user_role(auth.uid()) = 'faculty'
  );

CREATE POLICY "Admins can manage all attendance records"
  ON attendance
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Educational content policies
CREATE POLICY "Users can see published content"
  ON educational_content
  FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'user' AND -- Changed from 'student' to 'user'
    is_published = true
  );

CREATE POLICY "Faculty can upload their own content"
  ON educational_content
  FOR INSERT
  WITH CHECK (faculty_id = auth.uid() AND get_user_role(auth.uid()) = 'faculty');

CREATE POLICY "Faculty can update their own content"
  ON educational_content
  FOR UPDATE
  USING (faculty_id = auth.uid() AND get_user_role(auth.uid()) = 'faculty');

CREATE POLICY "Faculty can delete their own content"
  ON educational_content
  FOR DELETE
  USING (faculty_id = auth.uid() AND get_user_role(auth.uid()) = 'faculty');

CREATE POLICY "Service role can manage all content"
  ON educational_content
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Content access policies
CREATE POLICY "Users can view their own access records"
  ON content_access
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create access records"
  ON content_access
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR get_user_role(auth.uid()) IN ('faculty', 'admin'));

-- Departments policies
CREATE POLICY "Anyone can view departments"
  ON departments
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON departments
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- MS Graph tokens policies
CREATE POLICY "ms_graph_tokens_policy"
  ON ms_graph_tokens
  FOR ALL
  USING (profile_id = auth.uid());

-- Storage policies for content bucket
CREATE POLICY "Faculty and admins can upload content"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'content' AND (get_user_role(auth.uid()) IN ('faculty', 'admin')));

CREATE POLICY "Users can download content they have access to"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'content' AND (
    get_user_role(auth.uid()) IN ('faculty', 'admin') OR
    EXISTS (
      SELECT 1 FROM educational_content ec
      WHERE ec.file_path = name AND ec.is_published = true
    )
  ));
