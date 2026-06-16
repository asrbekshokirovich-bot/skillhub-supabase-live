-- ============================================================
-- v16: MARKETING TEAM ROLE
-- ============================================================
-- Introduces a 'marketing' role. Marketing team members are scoped to the
-- Leads / CRM module in the UI (sidebar + mobile nav), and are granted full
-- access to leads + lead_activities at the database level (the CEO and
-- workers keep their existing policies — these are additive).
--
-- public.current_user_role() is defined in v7.
-- The users.role column has no CHECK constraint, so no enum change is needed;
-- accounts are created with role='marketing' via the handle_new_user trigger.
-- ============================================================

DROP POLICY IF EXISTS "Marketing full access on leads" ON public.leads;
CREATE POLICY "Marketing full access on leads" ON public.leads
  FOR ALL
  USING (public.current_user_role() = 'marketing')
  WITH CHECK (public.current_user_role() = 'marketing');

DROP POLICY IF EXISTS "Marketing full access on lead_activities" ON public.lead_activities;
CREATE POLICY "Marketing full access on lead_activities" ON public.lead_activities
  FOR ALL
  USING (public.current_user_role() = 'marketing')
  WITH CHECK (public.current_user_role() = 'marketing');

-- Done. v16 applied.
