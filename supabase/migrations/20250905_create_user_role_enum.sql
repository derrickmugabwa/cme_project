-- Fix: Create missing user_role enum type
-- Date: 2025-09-05
-- Description: Create the user_role enum type that is required by the profiles table

-- Create the user_role enum type
CREATE TYPE user_role AS ENUM ('user', 'faculty', 'admin');

-- Update the profiles table to use the enum type for the role column
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
