-- ============================================================
-- v13: Let workers create tasks/subtasks and create/manage their projects
-- ============================================================
-- Bug: workers had SELECT (+ UPDATE on own assigned tasks) but NO INSERT
-- policy, so creating a task failed with:
--   "new row violates row-level security policy for table tasks"
-- This adds worker INSERT on tasks (within their projects) + broadens worker
-- UPDATE to any task in their projects (so subtasks/archive work), and lets
-- workers create + manage their own projects. CEO policies are unchanged.
-- Idempotent. Mirrors the existing "their projects" subquery used by SELECT.
-- ============================================================

-- ── TASKS: workers INSERT tasks into projects they belong to ──
DROP POLICY IF EXISTS "Workers insert tasks in their projects" ON public.tasks;
CREATE POLICY "Workers insert tasks in their projects" ON public.tasks
  FOR INSERT TO public
  WITH CHECK (
    (NOT is_ceo()) AND "projectId" IN (
      SELECT projects.id FROM public.projects
      WHERE (auth.uid() = ANY (projects.members)
             OR projects.assignee = (auth.uid())::text
             OR projects."createdBy" = auth.uid())
    )
  );

-- ── TASKS: broaden UPDATE from "assigned to me" to "any task in my projects"
--    (enables adding subtasks / archiving / collaborating) ──
DROP POLICY IF EXISTS "Workers update their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workers update tasks in their projects" ON public.tasks;
CREATE POLICY "Workers update tasks in their projects" ON public.tasks
  FOR UPDATE TO public
  USING (
    (NOT is_ceo()) AND "projectId" IN (
      SELECT projects.id FROM public.projects
      WHERE (auth.uid() = ANY (projects.members)
             OR projects.assignee = (auth.uid())::text
             OR projects."createdBy" = auth.uid())
    )
  )
  WITH CHECK (
    (NOT is_ceo()) AND "projectId" IN (
      SELECT projects.id FROM public.projects
      WHERE (auth.uid() = ANY (projects.members)
             OR projects.assignee = (auth.uid())::text
             OR projects."createdBy" = auth.uid())
    )
  );

-- ── PROJECTS: workers can create a project (they become the creator) ──
DROP POLICY IF EXISTS "Workers insert projects" ON public.projects;
CREATE POLICY "Workers insert projects" ON public.projects
  FOR INSERT TO public
  WITH CHECK ((NOT is_ceo()) AND "createdBy" = auth.uid());

-- ── PROJECTS: workers can update projects they created / belong to ──
DROP POLICY IF EXISTS "Workers update their projects" ON public.projects;
CREATE POLICY "Workers update their projects" ON public.projects
  FOR UPDATE TO public
  USING (
    (NOT is_ceo()) AND (auth.uid() = ANY (members)
                        OR assignee = (auth.uid())::text
                        OR "createdBy" = auth.uid())
  )
  WITH CHECK (
    (NOT is_ceo()) AND (auth.uid() = ANY (members)
                        OR assignee = (auth.uid())::text
                        OR "createdBy" = auth.uid())
  );
