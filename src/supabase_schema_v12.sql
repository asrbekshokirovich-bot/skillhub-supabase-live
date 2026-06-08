-- ============================================================
-- v12: Voice Standup reports (AI daily standup)
-- ============================================================
-- Adds public.voice_reports. Flow:
--   worker records a voice standup -> Gemini transcribes + structures it into
--   Yesterday / Blockers / Today -> worker reviews/edits and APPROVES ->
--   CEO reads the brief, plays the audio, and asks follow-up questions
--   (stored in "managerNotes").
--
-- RLS mirrors the existing pattern (see v7): a worker can only see/manage their
-- OWN rows; the CEO has full access via public.is_ceo(). Idempotent — safe to
-- re-run. Audio files live in the existing public 'skillhub-bucket' under
-- voice-reports/{workerId}/{uuid}.webm (covered by existing storage policies).
--
-- Depends on: public.users, public.projects, public.is_ceo()  (all from v1-v7).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.voice_reports (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "workerId"            UUID REFERENCES public.users(id)    ON DELETE CASCADE,
  "projectId"           UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  "audioUrl"            TEXT,                            -- Supabase Storage public URL (playback)
  "durationSec"         INT,
  "transcript"          TEXT,                            -- raw STT output (worker-editable)
  "yesterday"           TEXT,
  "blockers"            TEXT,
  "today"               TEXT,
  "clarifyingQuestions" JSONB NOT NULL DEFAULT '[]'::jsonb, -- AI follow-ups to the worker
  "status"              TEXT  NOT NULL DEFAULT 'draft',      -- 'draft' | 'approved'
  "managerNotes"        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ q, a, at }] in-app Q&A
  "reportDate"          DATE  DEFAULT CURRENT_DATE,
  "createdAt"           TIMESTAMPTZ DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_reports_worker_idx      ON public.voice_reports ("workerId");
CREATE INDEX IF NOT EXISTS voice_reports_status_date_idx ON public.voice_reports ("status", "reportDate" DESC);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.voice_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows, or any row if CEO.
DROP POLICY IF EXISTS "voice_reports_select" ON public.voice_reports;
CREATE POLICY "voice_reports_select" ON public.voice_reports
  FOR SELECT TO authenticated
  USING ("workerId" = auth.uid() OR public.is_ceo());

-- INSERT: a worker may only create rows for themselves (CEO unrestricted).
DROP POLICY IF EXISTS "voice_reports_insert" ON public.voice_reports;
CREATE POLICY "voice_reports_insert" ON public.voice_reports
  FOR INSERT TO authenticated
  WITH CHECK ("workerId" = auth.uid() OR public.is_ceo());

-- UPDATE: worker edits/approves own rows; CEO may update any (to append Q&A).
DROP POLICY IF EXISTS "voice_reports_update" ON public.voice_reports;
CREATE POLICY "voice_reports_update" ON public.voice_reports
  FOR UPDATE TO authenticated
  USING ("workerId" = auth.uid() OR public.is_ceo())
  WITH CHECK ("workerId" = auth.uid() OR public.is_ceo());

-- DELETE: own rows or CEO.
DROP POLICY IF EXISTS "voice_reports_delete" ON public.voice_reports;
CREATE POLICY "voice_reports_delete" ON public.voice_reports
  FOR DELETE TO authenticated
  USING ("workerId" = auth.uid() OR public.is_ceo());

-- Done.
