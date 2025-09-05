-- Fix: Grant necessary permissions for auth admin to insert into profiles
-- Date: 2025-09-05
-- Description: Fix the permission denied error for supabase_auth_admin user

-- Grant INSERT permission on profiles table to supabase_auth_admin
GRANT INSERT ON public.profiles TO supabase_auth_admin;

-- Grant USAGE on the user_role type to supabase_auth_admin
GRANT USAGE ON TYPE public.user_role TO supabase_auth_admin;

-- Grant USAGE on sequences if any (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
