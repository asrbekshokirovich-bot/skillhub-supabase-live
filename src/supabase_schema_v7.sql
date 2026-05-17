-- ============================================================
-- v7: SECURITY HARDENING
-- ============================================================
-- Fixes:
--  1. Replaces blanket "auth.role() = 'authenticated'" policies with
--     role-aware policies (CEO sees all; worker sees only their projects/tasks)
--  2. Locks vault credentials to CEO-only access (was: any authenticated user)
--  3. Adds helper SQL functions for role checks
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS
-- ============================================================
-- SECURITY DEFINER lets the function read users.role without triggering its own RLS.

CREATE OR REPLACE FUNCTION public.is_ceo()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ceo'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_ceo() TO authenticated;


CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;


-- ============================================================
-- 2. USERS TABLE — tighten policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.users;
DROP POLICY IF EXISTS "Users update own profile or CEO updates any" ON public.users;
DROP POLICY IF EXISTS "CEO deletes users" ON public.users;

CREATE POLICY "Authenticated read profiles" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users update own profile or CEO updates any" ON public.users
  FOR UPDATE
  USING (auth.uid() = id OR public.is_ceo());

CREATE POLICY "CEO deletes users" ON public.users
  FOR DELETE
  USING (public.is_ceo());


-- ============================================================
-- 3. PROJECTS TABLE — drop permissive policies, add role-aware ones
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON public.projects;
DROP POLICY IF EXISTS "Deny delete on projects" ON public.projects;
DROP POLICY IF EXISTS "CEO full access on projects" ON public.projects;
DROP POLICY IF EXISTS "Workers read their projects" ON public.projects;

-- CEO: full access
CREATE POLICY "CEO full access on projects" ON public.projects
  FOR ALL
  USING (public.is_ceo())
  WITH CHECK (public.is_ceo());

-- Workers: SELECT only projects where they are member, assignee, or creator
-- Note: createdBy is uuid; assignee is text (stores uuid as string)
CREATE POLICY "Workers read their projects" ON public.projects
  FOR SELECT
  USING (
    NOT public.is_ceo() AND (
      auth.uid() = ANY(members)
      OR assignee = auth.uid()::text
      OR "createdBy" = auth.uid()
    )
  );


-- ============================================================
-- 4. TASKS TABLE — drop permissive policies, add role-aware ones
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated users to read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Deny delete on tasks" ON public.tasks;
DROP POLICY IF EXISTS "CEO full access on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workers read tasks in their projects" ON public.tasks;
DROP POLICY IF EXISTS "Workers update their assigned tasks" ON public.tasks;

-- CEO: full access
CREATE POLICY "CEO full access on tasks" ON public.tasks
  FOR ALL
  USING (public.is_ceo())
  WITH CHECK (public.is_ceo());

-- Workers: SELECT tasks in projects they belong to
CREATE POLICY "Workers read tasks in their projects" ON public.tasks
  FOR SELECT
  USING (
    NOT public.is_ceo() AND
    "projectId" IN (
      SELECT id FROM public.projects
      WHERE auth.uid() = ANY(members)
         OR assignee = auth.uid()::text
         OR "createdBy" = auth.uid()
    )
  );

-- Workers: UPDATE tasks where they are the assignee (status changes, comments, etc.)
-- WITH CHECK prevents reassigning a task to someone else
CREATE POLICY "Workers update their assigned tasks" ON public.tasks
  FOR UPDATE
  USING (
    NOT public.is_ceo() AND assignee = auth.uid()::text
  )
  WITH CHECK (
    NOT public.is_ceo() AND assignee = auth.uid()::text
  );


-- ============================================================
-- 5. CREDENTIALS TABLE — enable RLS, lock to CEO
-- ============================================================
-- Table already exists; just secure it.
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read credentials" ON public.credentials;
DROP POLICY IF EXISTS "Allow authenticated users to insert credentials" ON public.credentials;
DROP POLICY IF EXISTS "Allow authenticated users to update credentials" ON public.credentials;
DROP POLICY IF EXISTS "Allow authenticated users to delete credentials" ON public.credentials;
DROP POLICY IF EXISTS "CEO only on credentials" ON public.credentials;

CREATE POLICY "CEO only on credentials" ON public.credentials
  FOR ALL
  USING (public.is_ceo())
  WITH CHECK (public.is_ceo());


-- Done. v7 applied.
