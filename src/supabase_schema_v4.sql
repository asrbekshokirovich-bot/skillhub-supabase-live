-- Supabase PostgreSQL Schema Update (v4)
-- Adds task approval logic and project scheduling capabilities.

-- 1. Add isApproved to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN DEFAULT false;

-- 2. Add startDate to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "startDate" TEXT;

-- (Optional) Update existing projects that are 'Active' to 'In Progress' for continuity
UPDATE public.projects SET status = 'In Progress' WHERE status = 'Active';
