# Role Change: Student to User

This document outlines the necessary changes to convert the 'student' role to 'user' throughout the CME platform. This change affects database schema, TypeScript types, UI components, and business logic.

## 1. Database Schema Changes

### Database Migration Script

```sql
-- Migration to change 'student' role to 'user'

-- Step 1: Create a new enum type with 'user' instead of 'student'
CREATE TYPE user_role_new AS ENUM ('user', 'faculty', 'admin');

-- Step 2: Update functions that use the role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT role::text FROM public.profiles WHERE id = user_id;
$function$;

-- Step 3: Update existing data - convert 'student' to 'user'
ALTER TABLE public.profiles
ALTER COLUMN role TYPE text;

UPDATE public.profiles
SET role = 'user'
WHERE role = 'student';

-- Step 4: Drop the old enum and rename the new one
ALTER TABLE public.profiles
ALTER COLUMN role DROP DEFAULT;

DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Step 5: Set the column back to the enum type with new default
ALTER TABLE public.profiles
ALTER COLUMN role TYPE user_role USING role::user_role;

ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'user';

-- Step 6: Update RLS policies that reference 'student' role
-- First, let's drop and recreate policies that reference the student role

-- Update educational_content policies
DROP POLICY IF EXISTS "Users can see published content" ON public.educational_content;
CREATE POLICY "Users can see published content"
  ON public.educational_content
  FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'user' AND
    status = 'published'
  );

-- Update any other policies as needed

-- Update triggers if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;
```

### RLS Policies to Update

The following RLS policies need to be updated to replace 'student' with 'user':

1. Educational content access policies
2. Enrollment policies
3. Attendance policies
4. Profile viewing policies

## 2. TypeScript Type Definitions

### Update database.types.ts

```typescript
// Before
role: 'student' | 'faculty' | 'admin'

// After
role: 'user' | 'faculty' | 'admin'
```

All instances of this type definition need to be updated throughout the file.

## 3. UI Component Changes

### Sign-Up Form

```tsx
// Before
const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student')

// After
const [role, setRole] = useState<'user' | 'faculty' | 'admin'>('user')

// Update SelectItem
// Before
<SelectItem value="student">Student</SelectItem>

// After
<SelectItem value="user">User</SelectItem>
```

### Profile Form

```tsx
// Before
const [role, setRole] = useState<string>(profile.role || 'student')

// After
const [role, setRole] = useState<string>(profile.role || 'user')

// Update display text
// Before
value={role === 'student' ? 'Student' : role === 'faculty' ? 'Faculty' : 'Administrator'}

// After
value={role === 'user' ? 'User' : role === 'faculty' ? 'Faculty' : 'Administrator'}
```

### Profile Sidebar

Update role arrays in navigation items:

```tsx
// Before
roles: ['student', 'faculty', 'admin']

// After
roles: ['user', 'faculty', 'admin']
```

### Dashboard Components

```tsx
// Before
{profile?.role === 'student' && <StudentDashboard profile={profile} user={user} />}

// After
{profile?.role === 'user' && <UserDashboard profile={profile} user={user} />}
```

Rename `StudentDashboard` component to `UserDashboard`.

## 4. Component Renaming

The following components should be renamed:

1. `StudentDashboard.tsx` → `UserDashboard.tsx`
2. Any other components with 'student' in their name

## 5. Business Logic Changes

Update any conditional logic that checks for the 'student' role:

```tsx
// Before
if (userRole === 'student') {
  // Student-specific logic
}

// After
if (userRole === 'user') {
  // User-specific logic
}
```

## 6. Testing Plan

1. **Database Migration Testing**:
   - Verify that all 'student' roles are converted to 'user'
   - Confirm that RLS policies work correctly with the new role

2. **UI Testing**:
   - Test sign-up flow with the new role options
   - Verify that user dashboards load correctly
   - Check that permissions work as expected

3. **Regression Testing**:
   - Ensure that existing functionality continues to work
   - Verify that faculty and admin roles are unaffected

## 7. Implementation Approach

1. Create and test the database migration script
2. Update TypeScript types and UI components
3. Test in a development environment
4. Deploy the changes in the following order:
   - Database migration
   - Application code updates

## 8. Rollback Plan

In case of issues, prepare a rollback migration that converts 'user' back to 'student' and restores the original enum type and policies.

```sql
-- Rollback migration
CREATE TYPE user_role_old AS ENUM ('student', 'faculty', 'admin');

ALTER TABLE public.profiles
ALTER COLUMN role TYPE text;

UPDATE public.profiles
SET role = 'student'
WHERE role = 'user';

ALTER TABLE public.profiles
ALTER COLUMN role DROP DEFAULT;

DROP TYPE user_role;
ALTER TYPE user_role_old RENAME TO user_role;

ALTER TABLE public.profiles
ALTER COLUMN role TYPE user_role USING role::user_role;

ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'student';
```
