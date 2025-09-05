-- Fix: Update handle_new_user function to use schema-qualified user_role type
-- Date: 2025-09-05
-- Description: Fix the schema qualification issue causing "type user_role does not exist" error

-- Replace the handle_new_user function with schema-qualified type references
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the incoming user data for debugging
  RAISE LOG 'handle_new_user called for user: %', NEW.id;
  RAISE LOG 'User email: %', NEW.email;
  RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
  
  -- Try the insert with error handling
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      role,
      full_name,
      first_name,
      middle_name,
      surname,
      title,
      id_number,
      country,
      phone_number,
      professional_cadre,
      registration_number,
      professional_board,
      institution,
      accepted_terms
    )
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'user'::public.user_role),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'middle_name',
      NEW.raw_user_meta_data->>'surname',
      NEW.raw_user_meta_data->>'title',
      NEW.raw_user_meta_data->>'id_number',
      NEW.raw_user_meta_data->>'country',
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'professional_cadre',
      NEW.raw_user_meta_data->>'registration_number',
      NEW.raw_user_meta_data->>'professional_board',
      NEW.raw_user_meta_data->>'institution',
      COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, false)
    );
    
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
    RAISE;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
