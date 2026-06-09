-- ============================================================
-- v14: Activity log — auto-record every action on tasks & projects
-- ============================================================
-- A DB trigger writes one row per INSERT/UPDATE/DELETE on tasks & projects,
-- capturing who did it (auth.uid -> users), what (created/updated/archived/
-- deleted), the entity, and when. Trigger is SECURITY DEFINER so it can write
-- the log regardless of the actor's RLS. CEO reads everything; a worker reads
-- only their own actions. Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "actorId"    uuid,
  "actorName"  text,
  "actorRole"  text,
  action       text NOT NULL,          -- created | updated | archived | deleted
  "entityType" text NOT NULL,          -- tasks | projects
  "entityId"   uuid,
  "entityTitle" text,
  "projectId"  uuid,
  "createdAt"  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS activity_log_actor_idx   ON public.activity_log ("actorId");

-- ── logging function ──
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uname text;
  urole text;
  rec record;
  act text;
  proj_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN rec := OLD; act := 'deleted';
  ELSIF TG_OP = 'INSERT' THEN rec := NEW; act := 'created';
  ELSE rec := NEW; act := 'updated';
  END IF;

  IF TG_TABLE_NAME = 'tasks' THEN proj_id := rec."projectId"; ELSE proj_id := rec.id; END IF;

  -- soft-delete (isArchived flipped true) reads as "archived"
  IF TG_OP = 'UPDATE' THEN
    IF NEW."isArchived" IS DISTINCT FROM OLD."isArchived" AND NEW."isArchived" = true THEN
      act := 'archived';
    END IF;
  END IF;

  SELECT name, role INTO uname, urole FROM public.users WHERE id = uid;

  INSERT INTO public.activity_log
    ("actorId","actorName","actorRole",action,"entityType","entityId","entityTitle","projectId")
  VALUES
    (uid, COALESCE(uname,'System'), urole, act, TG_TABLE_NAME, rec.id, rec.title, proj_id);

  RETURN NULL;
END;
$$;

-- ── attach triggers ──
DROP TRIGGER IF EXISTS trg_log_tasks ON public.tasks;
CREATE TRIGGER trg_log_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

DROP TRIGGER IF EXISTS trg_log_projects ON public.projects;
CREATE TRIGGER trg_log_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- ── RLS: CEO reads all; worker reads own. No user INSERT (only the trigger). ──
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log ceo read" ON public.activity_log;
CREATE POLICY "activity_log ceo read" ON public.activity_log
  FOR SELECT TO public USING (is_ceo());
DROP POLICY IF EXISTS "activity_log own read" ON public.activity_log;
CREATE POLICY "activity_log own read" ON public.activity_log
  FOR SELECT TO public USING ("actorId" = auth.uid());
