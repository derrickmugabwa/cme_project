-- Rollback migration for site_favicon table
-- This undoes the changes from 20251001163748_add_site_favicon.sql

-- Drop the table (this will automatically drop all policies and triggers)
DROP TABLE IF EXISTS public.site_favicon CASCADE;
