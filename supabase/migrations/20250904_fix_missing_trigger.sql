-- Fix: Add missing trigger for new user registration
-- Date: 2025-09-04
-- Description: Add the missing trigger that calls handle_new_user() when new users sign up

-- Create the trigger to call handle_new_user when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
