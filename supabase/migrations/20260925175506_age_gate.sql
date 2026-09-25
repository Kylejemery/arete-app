-- Activation run B, Part B5: age gate and teen safeguards.
--
-- profiles.age_band holds only the band (under_13, 13_15, 16_17, 18_plus),
-- never a birthdate. Clients cannot update profiles directly (2026-08-25
-- lockdown grants UPDATE on named columns only), so the band is set through
-- set_my_age_band(band), which writes the caller's own row, once: an answered
-- band is not changed from the client.
--
-- Under 13: new signups never reach account creation (the clients stop
-- before signUp). An existing account that answers under_13 is locked
-- (profiles.locked_at / locked_reason) and queued in account_deletion_queue
-- for deletion after 30 days, status pending_review. Nothing here deletes
-- anything: the queue is for Kyle to review first.
--
-- is_teen(uuid) is the one teen check (13_15 or 16_17) for server code and
-- SQL: teen prompts, no marketing email, no Agora, no paywall.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_band text
  CHECK (age_band IS NULL OR age_band IN ('under_13', '13_15', '16_17', '18_plus'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_band_set_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_reason text;
COMMENT ON COLUMN public.profiles.age_band IS
  'Self-reported age band (under_13, 13_15, 16_17, 18_plus). Never a birthdate. Set once through set_my_age_band.';
COMMENT ON COLUMN public.profiles.locked_at IS
  'Account locked (currently only for under_13); the apps show a locked screen and the server refuses Cabinet requests.';

CREATE TABLE IF NOT EXISTS public.account_deletion_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       text        NOT NULL,
  queued_at    timestamptz NOT NULL DEFAULT now(),
  delete_after timestamptz NOT NULL,
  status       text        NOT NULL DEFAULT 'pending_review'
               CHECK (status IN ('pending_review', 'approved', 'cancelled', 'deleted'))
);
ALTER TABLE public.account_deletion_queue ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_deletion_queue IS
  'Accounts queued for deletion (under_13 age band), for Kyle to review before anything runs. Nothing deletes automatically. Service role only.';

CREATE OR REPLACE FUNCTION public.set_my_age_band(p_band text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF p_band IS NULL OR p_band NOT IN ('under_13', '13_15', '16_17', '18_plus') THEN
    RAISE EXCEPTION 'invalid age band';
  END IF;
  SELECT age_band INTO v_current FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_current IS NOT NULL THEN
    RETURN v_current;
  END IF;
  UPDATE profiles
     SET age_band = p_band,
         age_band_set_at = now(),
         locked_at = CASE WHEN p_band = 'under_13' THEN now() ELSE locked_at END,
         locked_reason = CASE WHEN p_band = 'under_13' THEN 'under_13' ELSE locked_reason END
   WHERE id = v_uid;
  IF p_band = 'under_13' THEN
    INSERT INTO account_deletion_queue (user_id, reason, delete_after)
    VALUES (v_uid, 'under_13', now() + interval '30 days')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN p_band;
END
$$;
REVOKE ALL ON FUNCTION public.set_my_age_band(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_age_band(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_teen(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND age_band IN ('13_15', '16_17'))
$$;
REVOKE ALL ON FUNCTION public.is_teen(uuid) FROM PUBLIC, anon, authenticated;

-- Teens are kept out of the Agora (reading and writing) until there is a
-- moderation plan. Restrictive policies sit on top of the existing ones, so
-- nothing changes for anyone else; anonymous readers are unaffected.
CREATE OR REPLACE FUNCTION public.current_user_is_teen()
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND public.is_teen(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.current_user_is_teen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_teen() TO anon, authenticated;

DROP POLICY IF EXISTS "No Agora for teens" ON agora_essays;
CREATE POLICY "No Agora for teens" ON agora_essays AS RESTRICTIVE
  FOR ALL USING (NOT public.current_user_is_teen()) WITH CHECK (NOT public.current_user_is_teen());
DROP POLICY IF EXISTS "No Agora for teens" ON agora_comments;
CREATE POLICY "No Agora for teens" ON agora_comments AS RESTRICTIVE
  FOR ALL USING (NOT public.current_user_is_teen()) WITH CHECK (NOT public.current_user_is_teen());
