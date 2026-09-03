-- Temporary Pro grants (admin Email tab)
--
-- The 2026-09-02 manual_premium_grants migration could only hand out Premium:
-- the tier was hard-coded in the function body. The admin also needs to be
-- able to hand someone Pro (a reviewer, a founding member, a refund make-good)
-- without touching Stripe.
--
-- grant_manual_tier(user, days, tier) generalises grant_manual_premium over
-- the two paid tiers. Everything else is unchanged: the grant is still a
-- subscriptions row with billing_source='manual' and a current_period_end,
-- expire_manual_grants still sweeps it, and the entitlement rule is still
-- "free users only" — a user already carrying a subscription or a live grant
-- has to be revoked before a different tier can be granted.
--
-- grant_manual_premium stays as a thin wrapper so a web deploy that lands
-- after this migration (or before the route is updated) keeps working.

create or replace function public.grant_manual_tier(
  p_user_id uuid,
  p_days integer,
  p_tier text default 'premium'
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_expires timestamptz;
begin
  if p_tier is null or p_tier not in ('premium', 'pro') then
    raise exception 'tier must be premium or pro';
  end if;

  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'days must be between 1 and 365';
  end if;

  select tier into v_tier from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  -- Refuse when anything already entitles the user: a live Stripe/Apple
  -- subscription, a permanent manual row, or an unexpired grant. Switching a
  -- live grant from one tier to the other is revoke-then-grant, so there is
  -- never more than one manual row in play.
  if exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user_id
      and (
        (s.billing_source in ('stripe', 'apple') and s.status in ('active', 'trialing', 'past_due'))
        or (s.billing_source = 'manual' and (s.current_period_end is null or s.current_period_end > now()))
      )
  ) or coalesce(v_tier, 'free') <> 'free' then
    raise exception 'user is already entitled to a paid tier';
  end if;

  v_expires := now() + make_interval(days => p_days);

  insert into public.subscriptions (user_id, billing_source, tier, status, current_period_end)
  values (p_user_id, 'manual', p_tier, 'active', v_expires);

  -- is_premium is the mobile client's gate and is true for every paid tier
  -- (see the 2026-08-25 tier consolidation); profiles.tier is what separates
  -- Premium from Pro.
  update public.profiles
  set tier = p_tier, is_premium = true, updated_at = now()
  where id = p_user_id;

  return v_expires;
end;
$$;

-- Superseded by grant_manual_tier; kept so nothing that still calls it breaks.
create or replace function public.grant_manual_premium(p_user_id uuid, p_days integer)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select public.grant_manual_tier(p_user_id, p_days, 'premium');
$$;

comment on function public.grant_manual_premium(uuid, integer) is
  'DEPRECATED 2026-09-03 — wrapper over grant_manual_tier(user, days, ''premium'').';

-- Service role only, same as the function it generalises. security definer
-- means the execute grant is the whole gate.
revoke execute on function public.grant_manual_tier(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.grant_manual_tier(uuid, integer, text) to service_role;
