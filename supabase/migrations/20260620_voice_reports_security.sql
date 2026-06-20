-- ============================================================
-- Voice Reports — security hardening (audit PR 5, issue #11 + advisors)
-- ============================================================
-- Addresses Supabase advisor findings around the Voice Reports feature.
-- Reviewed to be NON-BREAKING for existing features:
--   • ProjectFiles still lists via storage `.list()` (now requires sign-in).
--   • Public object URLs (voice playback, project files) keep working —
--     public buckets serve objects without consulting these SELECT policies.
--
-- ⚠️ Apply deliberately (it changes a shared, live project). Run with the
--    Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- ============================================================

-- 1) Storage: stop ANONYMOUS enumeration of all files in skillhub-bucket.
--    Advisor `public_bucket_allows_listing`: the broad SELECT policy was granted
--    to `public` (anon + authenticated), letting anyone list every object.
--    Scope listing to signed-in users; object downloads via public URL are
--    unaffected (the bucket is public).
DROP POLICY IF EXISTS "Allow public read access to skillhub-bucket" ON storage.objects;
CREATE POLICY "Allow authenticated read access to skillhub-bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'skillhub-bucket');

-- 2) Destructive RPCs should never be reachable by the anonymous role.
--    These are granted to PUBLIC (which anon inherits), so revoke from PUBLIC
--    and keep an explicit grant to `authenticated` (matches v10) so the app's
--    CEO / self-delete flows keep working.
REVOKE EXECUTE ON FUNCTION public.delete_my_account()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_by_id(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_my_account()     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_user_by_id(uuid) TO authenticated;

-- ── NOT done here (need a product decision — left for a follow-up) ──
--  a) True privacy for voice recordings: make `skillhub-bucket` PRIVATE and
--     switch reads to short-lived SIGNED URLs. This is a BREAKING change — it
--     invalidates the existing public `audioUrl`s on the 21 current rows and
--     the getPublicUrl() calls in ProjectFiles, so it needs a data migration
--     + client changes (store object path, sign on read). Recommended, but
--     intentionally out of this non-breaking patch.
--  b) Enable Auth "Leaked password protection" (advisor auth_leaked_password_protection)
--     in Dashboard → Authentication → Policies (a project setting, not SQL).
--  c) Review the remaining SECURITY DEFINER helpers (is_ceo, current_user_role,
--     log_activity, …). Do NOT blanket-revoke from `authenticated`: RLS policies
--     call is_ceo()/current_user_role(), so revoking EXECUTE there would break
--     row access. Prefer setting a hardened `search_path` and confirming each is
--     intended to be API-exposed.
-- ============================================================
