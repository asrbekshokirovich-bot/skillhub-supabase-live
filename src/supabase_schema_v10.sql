-- ============================================================
-- v10: Proper user self-delete
-- The frontend was deleting only from public.users, orphaning
-- the auth.users record. This function deletes auth.users (which
-- cascades to public.users) and only works for the calling user.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- This cascades to public.users via FK constraint.
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Optional: a CEO-only function to delete other users by id
CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_ceo() THEN
    RAISE EXCEPTION 'Only the CEO may delete other users';
  END IF;
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Use delete_my_account() to delete your own account';
  END IF;
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO authenticated;

-- Done.
