-- Fix: Add RLS policy to allow supabase_auth_admin to insert new profiles
-- Date: 2025-09-05
-- Description: Fix the RLS policy violation by allowing auth admin to create new user profiles

-- Create a policy that allows supabase_auth_admin to insert new profiles
-- This is needed for the handle_new_user trigger function to work
CREATE POLICY "Auth admin can insert new profiles" ON public.profiles
  FOR INSERT 
  TO supabase_auth_admin
  WITH CHECK (true);

-- Also create a general INSERT policy for new users to create their own profiles
-- This allows users to insert their own profile during registration
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT 
  TO public
  WITH CHECK (auth.uid() = id);
