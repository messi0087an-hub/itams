-- ============================================================
-- ITAMS Migration 007: Auth email sync
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- RPC: returns real emails from auth.users (bypasses stale user_profiles.email)
CREATE OR REPLACE FUNCTION public.get_auth_users()
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN QUERY SELECT users.id, users.email FROM auth.users;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_users() TO authenticated;

-- Trigger: auto-sync email from auth.users → user_profiles when auth email changes
CREATE OR REPLACE FUNCTION public.sync_user_email_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email_on_change();

-- One-time sync: update user_profiles.email to match current auth.users.email
UPDATE public.user_profiles p
SET email = a.email
FROM auth.users a
WHERE p.id = a.id
  AND p.email IS DISTINCT FROM a.email;
