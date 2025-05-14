-- Update RLS policy for profiles to allow students to view faculty profiles
-- This is needed for the "Uploaded by" field in the content list

-- Create a policy that allows all authenticated users to view basic profile information
CREATE POLICY "Users can view basic profile information"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Comment explaining the change
-- Previously, users could only see their own profile or all profiles if they were an admin
-- Now, all authenticated users can see basic profile information like full_name
-- This is needed for the educational content list to show who uploaded the content
