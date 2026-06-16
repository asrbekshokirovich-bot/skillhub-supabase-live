-- ============================================================
-- v15: LEADS / CRM MODULE
-- ============================================================
-- Adds the `leads` + `lead_activities` tables that power the new
-- Leads page (Pipeline / Table / AI Focus / Demand).
--
-- Conventions:
--   * camelCase, quoted column names to match projects/tasks/invoices.
--   * Telegram-only contact — there is NO email column anywhere.
--   * RLS mirrors tasks/invoices: CEO full access; workers see only
--     the leads they own.
-- Apply order: run after v7 (which defines public.is_ceo()).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  company     text NOT NULL,
  contact     text,
  telegram    text,                                   -- @username; NO email anywhere
  source      text,                                   -- 'Website'|'Referral'|'Instagram'|'Event'|'Cold outreach'
  stage       text NOT NULL DEFAULT 'new'
                CHECK (stage IN ('new','contacted','inprocess','proposal','won','lost')),
  intent      text CHECK (intent IN ('build','subscribe')),  -- null = not yet marked
  field       text,                                   -- industry
  value       numeric DEFAULT 0,                      -- estimated deal value (USD)
  score       int DEFAULT 0,                          -- AI score 0-100
  "followUp"  date,                                   -- next follow-up date (nullable)
  owner       uuid REFERENCES public.users(id),       -- assigned rep (nullable)
  summary     text,                                   -- AI summary
  "nextStep"  text,                                   -- AI suggested next action
  signals     jsonb DEFAULT '[0,0,0,0]'::jsonb        -- [intent, engagement, budget, timeline]
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "leadId"    uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author      uuid REFERENCES public.users(id),
  body        text NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_stage_idx          ON public.leads (stage);
CREATE INDEX IF NOT EXISTS leads_owner_idx          ON public.leads (owner);
CREATE INDEX IF NOT EXISTS lead_activities_lead_idx ON public.lead_activities ("leadId");

ALTER TABLE public.leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- ── leads policies ──
DROP POLICY IF EXISTS "CEO full access on leads"   ON public.leads;
DROP POLICY IF EXISTS "Workers read their leads"   ON public.leads;
DROP POLICY IF EXISTS "Workers insert their leads" ON public.leads;
DROP POLICY IF EXISTS "Workers update their leads" ON public.leads;

CREATE POLICY "CEO full access on leads" ON public.leads
  FOR ALL USING (public.is_ceo()) WITH CHECK (public.is_ceo());

CREATE POLICY "Workers read their leads" ON public.leads
  FOR SELECT USING (NOT public.is_ceo() AND owner = auth.uid());

CREATE POLICY "Workers insert their leads" ON public.leads
  FOR INSERT WITH CHECK (NOT public.is_ceo() AND owner = auth.uid());

CREATE POLICY "Workers update their leads" ON public.leads
  FOR UPDATE USING (NOT public.is_ceo() AND owner = auth.uid())
              WITH CHECK (NOT public.is_ceo() AND owner = auth.uid());

-- ── lead_activities policies ──
DROP POLICY IF EXISTS "CEO full access on lead_activities"       ON public.lead_activities;
DROP POLICY IF EXISTS "Workers read activities on their leads"   ON public.lead_activities;
DROP POLICY IF EXISTS "Workers insert activities on their leads" ON public.lead_activities;

CREATE POLICY "CEO full access on lead_activities" ON public.lead_activities
  FOR ALL USING (public.is_ceo()) WITH CHECK (public.is_ceo());

CREATE POLICY "Workers read activities on their leads" ON public.lead_activities
  FOR SELECT USING (
    NOT public.is_ceo() AND
    "leadId" IN (SELECT id FROM public.leads WHERE owner = auth.uid())
  );

CREATE POLICY "Workers insert activities on their leads" ON public.lead_activities
  FOR INSERT WITH CHECK (
    NOT public.is_ceo() AND author = auth.uid() AND
    "leadId" IN (SELECT id FROM public.leads WHERE owner = auth.uid())
  );

-- Done. v15 applied.
