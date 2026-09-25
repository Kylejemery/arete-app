-- Activation plan, Part 8: subscriptions vs profiles.
--
-- Entitlement is read from profiles.tier + is_premium (server, mobile, web).
-- subscriptions is the record of what a user is paying for or was granted.
-- The two had drifted: 19 active manual Premium rows (the 2026-08-25
-- grandfather grants, current_period_end null) sat on profiles that read
-- free, because nothing re-derives a profile from its subscription after the
-- fact. The Stripe webhook and the manual grant functions write both sides
-- when they run; any other writer (or a later profile reset) was never
-- reconciled.
--
-- 1. v_tier_reconciliation lists every mismatch, IDs only (no emails). It
--    runs with the caller's rights and is revoked from anon/authenticated,
--    so it is readable only by the service role and SQL.
-- 2. Upgrades are fixed now: an active entitlement on a profile that reads
--    free becomes the subscription's tier with is_premium = true. Nothing is
--    ever downgraded automatically; the view reports those cases.
-- 3. A trigger on subscriptions keeps it that way going forward: whenever a
--    row becomes an active entitlement, a free profile is upgraded to its
--    tier. It never downgrades (expiry and cancellation stay with
--    expire_manual_grants and the Stripe webhook).

CREATE OR REPLACE FUNCTION public.subscription_is_entitling(
  p_billing_source text, p_status text, p_period_end timestamptz
)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN p_billing_source IN ('stripe', 'apple') THEN p_status IN ('active', 'trialing', 'past_due')
    WHEN p_billing_source = 'manual' THEN coalesce(p_status, 'active') = 'active'
                                          AND (p_period_end IS NULL OR p_period_end > now())
    ELSE false
  END
$$;

CREATE OR REPLACE VIEW public.v_tier_reconciliation
WITH (security_invoker = true) AS
WITH ent AS (
  SELECT s.id AS subscription_id, s.user_id, s.billing_source, s.status,
         coalesce(s.tier, 'premium') AS sub_tier, s.current_period_end
    FROM public.subscriptions s
   WHERE public.subscription_is_entitling(s.billing_source, s.status, s.current_period_end)
)
SELECT e.user_id, e.subscription_id, e.billing_source, e.status AS sub_status, e.sub_tier,
       p.tier AS profile_tier, p.is_premium,
       CASE
         WHEN p.id IS NULL THEN 'subscription_without_profile'
         WHEN coalesce(p.tier, 'free') = 'free' OR p.is_premium IS NOT TRUE THEN 'profile_free_with_active_subscription'
         ELSE 'tier_differs'
       END AS mismatch
  FROM ent e
  LEFT JOIN public.profiles p ON p.id = e.user_id
 WHERE p.id IS NULL
    OR coalesce(p.tier, 'free') = 'free'
    OR p.is_premium IS NOT TRUE
    OR (p.tier IS DISTINCT FROM e.sub_tier AND NOT (e.sub_tier = 'premium' AND p.tier = 'pro'))
UNION ALL
SELECT p.id AS user_id, NULL, NULL, NULL, NULL, p.tier, p.is_premium,
       'profile_paid_without_active_subscription'
  FROM public.profiles p
 WHERE (coalesce(p.tier, 'free') <> 'free' OR p.is_premium IS TRUE)
   AND NOT EXISTS (
     SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.id
        AND public.subscription_is_entitling(s.billing_source, s.status, s.current_period_end)
   );

REVOKE ALL ON public.v_tier_reconciliation FROM anon, authenticated;
COMMENT ON VIEW public.v_tier_reconciliation IS
  'Every mismatch between an active subscription (entitlement) and profiles.tier / is_premium, IDs only. Service role / SQL only. Upgrades are auto-fixed by trigger; downgrades are reported, never applied.';

-- 2. Fix upgrades now (admin excluded; it has no subscription rows anyway).
WITH best AS (
  SELECT DISTINCT ON (s.user_id) s.user_id, coalesce(s.tier, 'premium') AS tier
    FROM public.subscriptions s
   WHERE public.subscription_is_entitling(s.billing_source, s.status, s.current_period_end)
   ORDER BY s.user_id, (coalesce(s.tier, 'premium') = 'pro') DESC
)
UPDATE public.profiles p
   SET tier = b.tier, is_premium = true, updated_at = now()
  FROM best b
 WHERE p.id = b.user_id
   AND p.is_admin IS NOT TRUE
   AND (coalesce(p.tier, 'free') = 'free' OR p.is_premium IS NOT TRUE);

-- 3. Keep it that way: upgrade-only sync from subscriptions.
CREATE OR REPLACE FUNCTION public.subscriptions_sync_profile_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.subscription_is_entitling(NEW.billing_source, NEW.status, NEW.current_period_end) THEN
    UPDATE public.profiles p
       SET tier = CASE WHEN coalesce(p.tier, 'free') = 'free' THEN coalesce(NEW.tier, 'premium') ELSE p.tier END,
           is_premium = true,
           updated_at = now()
     WHERE p.id = NEW.user_id
       AND (coalesce(p.tier, 'free') = 'free' OR p.is_premium IS NOT TRUE);
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS subscriptions_sync_profile_upgrade ON public.subscriptions;
CREATE TRIGGER subscriptions_sync_profile_upgrade
  AFTER INSERT OR UPDATE OF status, tier, current_period_end, billing_source ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_sync_profile_upgrade();
