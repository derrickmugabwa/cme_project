-- Add RLS policy to prevent disabled users from accessing data

-- First, create a function to check if a user is disabled
CREATE OR REPLACE FUNCTION public.is_user_disabled()
RETURNS BOOLEAN AS $$
DECLARE
  is_disabled BOOLEAN;
BEGIN
  SELECT disabled INTO is_disabled FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(is_disabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy to all tables that should be protected
-- This is a general policy that can be applied to any table

-- Example for profiles table
CREATE POLICY "Disabled users cannot access profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (NOT public.is_user_disabled());

-- Example for sessions table (if it exists)
-- Uncomment and modify as needed for your schema
-- CREATE POLICY "Disabled users cannot access sessions"
--   ON public.sessions
--   FOR ALL
--   TO authenticated
--   USING (NOT public.is_user_disabled());

-- Add similar policies to other tables as needed
