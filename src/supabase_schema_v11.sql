-- ============================================================
-- v11: Drop legacy project columns + harden handle_new_user
-- ============================================================
-- (a) The `description` and `coverUrl` columns on `projects` are no longer
--     used by the application — `client` and `assignee` columns replaced them
--     in v9. Drop them.
-- (b) Recreate the `handle_new_user` trigger with explicit error handling so
--     a missing profile row never permanently locks a user out of the app.
-- (c) Add a one-time backfill that creates profile rows for any orphan auth
--     users that exist today (asrbek, barxayot, owner — created before v2).
-- ============================================================

-- ── (a) Drop legacy columns ────────────────────────────────
-- Guard with COLUMN IF EXISTS so re-runs are safe.
ALTER TABLE public.projects DROP COLUMN IF EXISTS description;
ALTER TABLE public.projects DROP COLUMN IF EXISTS "coverUrl";


-- ── (b) Robust handle_new_user trigger ─────────────────────
-- Original failure mode: a unique constraint or NOT NULL violation inside the
-- trigger would silently fail and leave an auth.users row with no public.users
-- counterpart. The user could sign in but the app would treat them as 'client'
-- forever. New version logs the failure and never propagates an exception.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  derived_name TEXT;
BEGIN
  -- Derive a display name from the email's local-part as a fallback.
  derived_name := split_part(NEW.email, '@', 1);

  BEGIN
    INSERT INTO public.users (id, email, name, role, "createdAt")
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', derived_name, 'New user'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Don't block auth signup if profile creation fails — let the app handle it.
    RAISE WARNING 'handle_new_user: failed to create profile for %: % (%)',
      NEW.email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (idempotent).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── (c) Backfill orphan auth users ─────────────────────────
-- Some auth users were created before the trigger existed (asrbek, owner, etc).
-- Create profile rows for them so the app sees them properly.
INSERT INTO public.users (id, email, name, role, "createdAt")
SELECT
  au.id,
  au.email,
  COALESCE(split_part(au.email, '@', 1), 'User'),
  'worker',
  COALESCE(au.created_at, now())
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;


-- ── (d) Helper RPC for safe self-heal of missing profile ───
-- If the app sees auth.user without public.user (shouldn't happen after this
-- migration, but just in case), it can call this to recover.
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID;
  result public.users;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO result FROM public.users WHERE id = uid;
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email, name, role, "createdAt")
    SELECT au.id, au.email, split_part(au.email, '@', 1), 'worker', now()
    FROM auth.users au WHERE au.id = uid
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- Done.
