-- Activation run B, Part B1: internal accounts.
--
-- profiles.is_internal flags Kyle's own non-admin accounts, family, and test
-- logins so measurement can leave them out. It is separate from is_admin
-- (which unlocks admin powers) and changes no product behaviour. Clients
-- cannot write it: the 2026-08-25 lockdown grants authenticated UPDATE on
-- named columns only, and this one is not among them.
--
-- measured_profiles is what every metric, dashboard and backfill should read
-- instead of profiles: it drops admin and internal accounts. Service role
-- only.
--
-- set_internal_accounts(emails) is how config/internal-accounts.ts reaches
-- the database (scripts/sync-internal-accounts.mjs). It only ever marks.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.is_internal IS
  'Internal account (Kyle, family, testers). Excluded from analytics, metrics, dashboards and backfills alongside is_admin. Product behaviour is unchanged. Source list: config/internal-accounts.ts.';

CREATE OR REPLACE FUNCTION public.set_internal_accounts(p_emails text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.profiles
     SET is_internal = true
   WHERE is_internal IS NOT TRUE
     AND lower(email) = ANY (SELECT lower(e) FROM unnest(p_emails) e WHERE e LIKE '%@%');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;
REVOKE ALL ON FUNCTION public.set_internal_accounts(text[]) FROM PUBLIC, anon, authenticated;

-- Seed: the admin, and every profile whose email, handle or display name
-- contains "test" (config/internal-accounts.ts INTERNAL_NAME_PATTERNS).
UPDATE public.profiles p
   SET is_internal = true
 WHERE p.is_internal IS NOT TRUE
   AND (
     p.is_admin IS TRUE
     OR p.email ILIKE '%test%'
     OR p.handle ILIKE '%test%'
     OR EXISTS (SELECT 1 FROM public.user_settings s WHERE s.user_id = p.id AND s.user_name ILIKE '%test%')
   );

CREATE OR REPLACE VIEW public.measured_profiles
WITH (security_invoker = true) AS
SELECT * FROM public.profiles
 WHERE is_admin IS NOT TRUE
   AND is_internal IS NOT TRUE;
REVOKE ALL ON public.measured_profiles FROM anon, authenticated;
COMMENT ON VIEW public.measured_profiles IS
  'Profiles that count in measurement: not admin, not internal. Read this, not profiles, in metrics, dashboards and backfills. Service role only.';
