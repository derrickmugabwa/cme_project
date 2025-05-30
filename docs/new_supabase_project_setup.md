# Setting Up a New Supabase Project with User Role

This guide outlines the steps to create a new Supabase project with the correct user role structure and migrate your data from the existing project.

## 1. Create a New Supabase Project

1. Go to the [Supabase Dashboard](https://app.supabase.io/)
2. Click "New Project"
3. Enter a name for your project (e.g., "CME Project - New")
4. Choose your organization and region
5. Set a secure database password
6. Wait for the project to be created

## 2. Apply the Consolidated Migration

1. Navigate to the SQL Editor in your new Supabase project
2. Open the consolidated migration script from `supabase/migrations/consolidated_migration_with_user_role.sql`
3. Run the script to create all tables, types, functions, and policies
4. Verify that the schema was created correctly by checking the tables in the Table Editor

## 3. Export Data from the Existing Project

### Option 1: Using the Supabase Dashboard

1. In your existing project, go to Project Settings > Database
2. Click "Database Backups"
3. Click "Create a new backup"
4. Once the backup is created, download it

### Option 2: Using pg_dump (For Developers)

```bash
pg_dump -h db.wcvxnlqbgbzlngvybyqo.supabase.co -U postgres -d postgres -f cme_backup.sql --data-only --inserts
```

## 4. Transform the Data

Before importing the data into the new project, you need to transform any 'student' roles to 'user' roles. You can do this by:

1. Open the exported SQL file in a text editor
2. Find all instances of `'student'::user_role` and replace with `'user'::user_role`
3. Save the modified file

## 5. Import Data to the New Project

### Option 1: Using the Supabase Dashboard

If you're using a backup file:

1. In your new project, go to Project Settings > Database
2. Click "Database Backups"
3. Click "Restore from backup"
4. Upload your modified backup file

### Option 2: Using psql (For Developers)

```bash
psql -h db.[YOUR_NEW_PROJECT_ID].supabase.co -U postgres -d postgres -f modified_cme_backup.sql
```

## 6. Update Environment Variables

Update your project's environment variables to point to the new Supabase project:

1. Go to Project Settings > API in your new Supabase project
2. Copy the Project URL and anon key
3. Update your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_NEW_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_NEW_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_NEW_SERVICE_ROLE_KEY]
```

## 7. Test the Application

1. Start your application with the new environment variables
2. Test user registration and login
3. Verify that new users are assigned the 'user' role
4. Test all functionality that depends on user roles

## 8. Migrate Storage Buckets

If you have files stored in Supabase Storage:

1. Create the same buckets in your new project
2. Download files from your old project
3. Upload files to your new project with the same paths

## 9. Migrate Authentication

For existing users, you have two options:

1. **Ask users to reset their passwords**: This is the simplest approach
2. **Migrate auth users**: This is more complex and requires using the Supabase Admin API

## 10. Switch to Production

Once you've verified that everything works correctly:

1. Update your production environment variables to point to the new project
2. Deploy your application
3. Monitor for any issues

## Troubleshooting

### Common Issues

1. **Missing RLS Policies**: If you encounter permission errors, check that all RLS policies were created correctly
2. **Data Import Errors**: If you encounter errors during data import, check for any data type mismatches
3. **Auth Issues**: If users can't log in, check that the auth configuration is correct

### Getting Help

If you encounter issues, you can:

1. Check the Supabase documentation: https://supabase.com/docs
2. Ask for help in the Supabase Discord: https://discord.supabase.com
3. Open an issue on GitHub: https://github.com/supabase/supabase/issues
