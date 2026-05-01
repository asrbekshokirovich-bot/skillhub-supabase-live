-- Supabase PostgreSQL Schema Update (v5)
-- Adds a dedicated 'notes' column to the projects table to store the rich-text Phased Plans / Description.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS "notes" TEXT;
