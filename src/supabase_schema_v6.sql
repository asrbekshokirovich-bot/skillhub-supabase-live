-- Supabase PostgreSQL Schema Update (v6)
-- Adds a 'dueDate' column to the projects table to support project deadlines.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
