-- Create content types enum
CREATE TYPE content_type AS ENUM ('pdf', 'ppt', 'doc', 'audio', 'video', 'image', 'other');

-- Create departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Create educational content table
CREATE TABLE educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type content_type NOT NULL,
  faculty_id UUID REFERENCES profiles(id) NOT NULL,
  course_id UUID REFERENCES courses(id),
  department_id UUID REFERENCES departments(id),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  download_count INTEGER NOT NULL DEFAULT 0
);

-- Create content access records table
CREATE TABLE content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  content_id UUID REFERENCES educational_content(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download')),
  UNIQUE(content_id, user_id, access_type)
);

-- Enable RLS on new tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_access ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Anyone can view departments"
  ON departments FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Create policies for educational_content
CREATE POLICY "Faculty can upload their own content"
  ON educational_content FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.get_user_role(auth.uid()) IN ('faculty', 'admin')) AND
    (auth.uid() = faculty_id)
  );

CREATE POLICY "Faculty can update their own content"
  ON educational_content FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = faculty_id OR
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Faculty can view their own content"
  ON educational_content FOR SELECT
  TO authenticated
  USING (
    auth.uid() = faculty_id OR
    public.get_user_role(auth.uid()) = 'admin' OR
    (
      public.get_user_role(auth.uid()) = 'student' AND
      is_published = true AND
      EXISTS (
        SELECT 1 FROM enrollments
        WHERE enrollments.student_id = auth.uid()
        AND enrollments.course_id = educational_content.course_id
      )
    )
  );

CREATE POLICY "Faculty can delete their own content"
  ON educational_content FOR DELETE
  TO authenticated
  USING (
    auth.uid() = faculty_id OR
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Create policies for content_access
CREATE POLICY "Users can view their own access records"
  ON content_access FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "System can create access records"
  ON content_access FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Create function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_type = 'download' THEN
    UPDATE educational_content
    SET download_count = download_count + 1
    WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to increment download count
CREATE TRIGGER on_content_access
  AFTER INSERT ON content_access
  FOR EACH ROW EXECUTE FUNCTION public.increment_download_count();

-- Insert some default departments
INSERT INTO departments (name, description)
VALUES
  ('Medicine', 'Department of Medicine'),
  ('Surgery', 'Department of Surgery'),
  ('Pediatrics', 'Department of Pediatrics'),
  ('Obstetrics & Gynecology', 'Department of Obstetrics and Gynecology'),
  ('Psychiatry', 'Department of Psychiatry');
