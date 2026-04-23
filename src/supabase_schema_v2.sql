-- Skillhub Schema Upgrades (Run this in the Supabase SQL Editor)

-- 1. Automated Profile Creation for New Signups
-- This function securely bypasses RLS to create the public user profile immediately after they sign up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'worker')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Add Soft Delete functionality (Zero Data Loss Guarantee)
-- This adds an isArchived column so we can hide records without destroying them.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;

-- 3. Restrict Hard Deletes
-- Remove any existing delete permissions
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON public.tasks;

-- Add strict DENY policies so the client cannot accidentally wipe data
CREATE POLICY "Deny delete for projects" ON public.projects FOR DELETE USING (false);
CREATE POLICY "Deny delete for tasks" ON public.tasks FOR DELETE USING (false);

-- 4. Add Missing Columns to Tasks Table
-- These columns are required by the NewTaskModal and TaskDetailModal
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'Task';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "author" TEXT DEFAULT 'Unknown User';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "subtasks" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "timeTracked" NUMERIC DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "watchers" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "checklists" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "comments" JSONB DEFAULT '[]'::jsonb;
