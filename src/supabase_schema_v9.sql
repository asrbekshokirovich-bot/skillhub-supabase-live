-- ============================================================
-- v9: Fix project field mappings
-- The schema already has proper `client` and `assignee` columns,
-- but the code was using `description` and `coverUrl` for them.
-- This copies data into the correct columns where empty.
-- ============================================================

-- Copy description → client where client is null/empty.
UPDATE public.projects
SET client = description
WHERE (client IS NULL OR client = '') AND description IS NOT NULL AND description <> '';

-- Copy coverUrl → assignee where assignee is null/empty.
UPDATE public.projects
SET assignee = "coverUrl"
WHERE (assignee IS NULL OR assignee = '') AND "coverUrl" IS NOT NULL AND "coverUrl" <> '';

-- Done.
