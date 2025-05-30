# User Role Migration Plan: Student to User

## Overview

This document outlines a comprehensive plan to migrate the user_role enum type in the database from 'student' to 'user'. This migration is complex due to the dependencies on the user_role enum type in various database objects, including policies, functions, and tables.

## Current State

- The user_role enum type currently contains values: 'student', 'faculty', 'admin'
- The profiles table uses this enum type for the role column
- Multiple RLS policies and functions depend on this enum type
- UI components and business logic have been updated to use 'user' instead of 'student'

## Migration Steps

### Step 1: Backup the Database

Before proceeding with any changes, create a full backup of the database to ensure data can be restored if needed.

```sql
-- This would typically be done using pg_dump or the Supabase dashboard
```

### Step 2: Create Compatibility Views and Functions

Create views and functions that will provide backward compatibility during and after the migration.

```sql
-- Create a function to map 'student' to 'user' and vice versa
CREATE OR REPLACE FUNCTION public.map_role(role_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN role_text = 'student' THEN 'user'
    WHEN role_text = 'user' THEN 'student'
    ELSE role_text
  END;
$$;
```

### Step 3: Update RLS Policies

Update all RLS policies that reference the 'student' role to use a more flexible condition that works with both 'student' and 'user'.

```sql
-- Example: Update educational_content policy
DROP POLICY IF EXISTS "Users can view appropriate content" ON public.educational_content;
CREATE POLICY "Users can view appropriate content"
  ON public.educational_content
  FOR SELECT
  USING (
    (get_user_role(auth.uid()) IN ('student', 'faculty', 'admin')) AND
    (is_published OR faculty_id = auth.uid() OR get_user_role(auth.uid()) = 'admin')
  );
```

### Step 4: Create a New Enum Type

```sql
-- Create a new enum type with 'user' instead of 'student'
CREATE TYPE user_role_new AS ENUM ('user', 'faculty', 'admin');
```

### Step 5: Create a Temporary Profiles Table

```sql
-- Create a temporary profiles table with the new enum type
CREATE TABLE profiles_temp (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role user_role_new DEFAULT 'user'::user_role_new,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 6: Migrate Data to the Temporary Table

```sql
-- Copy data from the old table to the temporary one, converting 'student' to 'user'
INSERT INTO profiles_temp (id, updated_at, username, full_name, avatar_url, role, email, created_at)
SELECT 
  id, 
  updated_at, 
  username, 
  full_name, 
  avatar_url, 
  CASE 
    WHEN role::text = 'student' THEN 'user'::user_role_new 
    WHEN role::text = 'faculty' THEN 'faculty'::user_role_new 
    WHEN role::text = 'admin' THEN 'admin'::user_role_new 
  END, 
  email, 
  created_at
FROM profiles;
```

### Step 7: Create a View for Backward Compatibility

```sql
-- Create a view that maps 'user' back to 'student' for backward compatibility
CREATE VIEW profiles_compat AS
SELECT 
  id, 
  updated_at, 
  username, 
  full_name, 
  avatar_url, 
  CASE 
    WHEN role::text = 'user' THEN 'student' 
    ELSE role::text 
  END as role, 
  email, 
  created_at
FROM profiles_temp;
```

### Step 8: Update the get_user_role Function

```sql
-- Create a new version of the get_user_role function that works with both tables
CREATE OR REPLACE FUNCTION public.get_user_role_new(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT map_role(role::text) FROM profiles_temp WHERE id = user_id;
$$;
```

### Step 9: Update the handle_new_user Function

```sql
-- Update the handle_new_user function to insert into the temporary table
CREATE OR REPLACE FUNCTION public.handle_new_user_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles_temp (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::user_role_new);
  RETURN NEW;
END;
$$;
```

### Step 10: Switch Tables and Functions

This is the critical step where we switch from the old table to the new one. This should be done during a maintenance window when the application is not in use.

```sql
-- Rename the old table and functions
ALTER TABLE profiles RENAME TO profiles_old;
ALTER FUNCTION get_user_role RENAME TO get_user_role_old;
ALTER FUNCTION handle_new_user RENAME TO handle_new_user_old;

-- Rename the new table and functions
ALTER TABLE profiles_temp RENAME TO profiles;
ALTER FUNCTION get_user_role_new RENAME TO get_user_role;
ALTER FUNCTION handle_new_user_new RENAME TO handle_new_user;

-- Drop the old enum type
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;
```

### Step 11: Recreate Triggers and Policies

```sql
-- Recreate the trigger on the new table
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION moddatetime (updated_at);

-- Recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate RLS policies for the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can view basic profile information
CREATE POLICY "Users can view basic profile information"
  ON profiles
  FOR SELECT
  USING (true);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');
```

### Step 12: Clean Up

After verifying that everything is working correctly, clean up the temporary objects.

```sql
-- Drop the old table and functions
DROP TABLE profiles_old;
DROP FUNCTION get_user_role_old;
DROP FUNCTION handle_new_user_old;
DROP VIEW profiles_compat;
```

## Testing Plan

1. **Pre-Migration Testing**
   - Test the application with the current changes to ensure it works correctly
   - Create test cases for all functionality that depends on user roles

2. **Migration Testing**
   - Test each step of the migration in a staging environment
   - Verify that data is correctly migrated to the new table
   - Test that policies and functions work correctly with the new enum type

3. **Post-Migration Testing**
   - Test the application with the new enum type
   - Verify that new users are assigned the 'user' role
   - Check that existing functionality works with the updated role names

## Rollback Plan

If issues are encountered during the migration, the following rollback steps should be taken:

1. Restore the database from the backup created in Step 1
2. Revert any code changes that depend on the new role name
3. Test the application to ensure it works correctly with the old role names

## Conclusion

This migration plan provides a comprehensive approach to updating the user_role enum type from 'student' to 'user' while minimizing disruption to the application. By following these steps carefully and testing thoroughly at each stage, the migration can be completed successfully.

**Note**: This migration should be performed during a maintenance window when the application is not in use to minimize the risk of data inconsistency or service disruption.
