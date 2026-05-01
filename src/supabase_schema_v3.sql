-- Skillhub Schema Upgrade v3 (Run this in the Supabase SQL Editor)
-- This fixes the mismatch between the React frontend code and the Postgres schema for Projects.

-- 1. Rename 'title' to 'name' to match the frontend expectations
ALTER TABLE public.projects RENAME COLUMN title TO name;

-- 2. Add missing columns used by the frontend
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tasks INTEGER DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assignee TEXT DEFAULT 'Unassigned';

-- 3. Modify 'createdBy' to accept TEXT instead of UUID
-- The frontend passes a user's name string (e.g. "Asrbek"), not a UUID.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_createdBy_fkey;
ALTER TABLE public.projects ALTER COLUMN "createdBy" TYPE TEXT USING "createdBy"::TEXT;
