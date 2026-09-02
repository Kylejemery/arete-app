-- Temporary Premium grants (admin Email tab)
--
-- The admin can hand a free user N days of Premium ("reply and ask for a
-- free week"). A grant is a subscriptions row with billing_source='manual'
-- and a current_period_end; the grandfathered rows from the 2026-08-25 tier
-- consolidation have no current_period_end and are never touched here.
--
-- Both halves live in the database so the flip is atomic and there is one
-- source of truth:
--   grant_manual_premium(user, days)  → insert grant row, profile → premium
--   expire_manual_grants([user])      → delete due (or the named) grant rows,
--                                       profile → free unless something else
--                                       still entitles the user
-- pg_cron sweeps expiries every 30 minutes; the admin recipients route also
-- calls the sweep on load as a safety net.

begin;

-- ---------------------------------------------------------------------------
-- 1. Grant
-- ---------------------------------------------------------------------------
create or replace function public.grant_manual_premium(p_user_id uuid, p_days integer)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_expires timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'days must be between 1 and 365';
  end if;

  select tier into v_tier from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  -- Refuse when anything already entitles the user: a live Stripe/Apple
  -- subscription, a permanent manual row, or an unexpired grant.
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
  values (p_user_id, 'manual', 'premium', 'active', v_expires);

  update public.profiles
  set tier = 'premium', is_premium = true, updated_at = now()
  where id = p_user_id;

  return v_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Expire / revoke
-- ---------------------------------------------------------------------------
-- With no argument: every grant whose period has ended. With a user id: that
-- user's grant(s) regardless of date (admin revoke). Returns the number of
-- users whose profile was downgraded.
create or replace function public.expire_manual_grants(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_downgraded integer := 0;
begin
  with expired as (
    delete from public.subscriptions s
    where s.billing_source = 'manual'
      and s.current_period_end is not null
      and (
        (p_user_id is null and s.current_period_end <= now())
        or s.user_id = p_user_id
      )
    returning s.user_id
  ),
  downgraded as (
    update public.profiles p
    set tier = 'free', is_premium = false, updated_at = now()
    from (select distinct user_id from expired) e
    where p.id = e.user_id
      and not exists (
        select 1 from public.subscriptions o
        where o.user_id = p.id
          and (
            (o.billing_source in ('stripe', 'apple') and o.status in ('active', 'trialing', 'past_due'))
            or (o.billing_source = 'manual' and (o.current_period_end is null or o.current_period_end > now()))
          )
      )
    returning p.id
  )
  select count(*) into v_downgraded from downgraded;

  return v_downgraded;
end;
$$;

-- Service role only. security definer means the functions run as their
-- owner regardless of caller, so the execute grant is the whole gate.
revoke execute on function public.grant_manual_premium(uuid, integer) from public, anon, authenticated;
revoke execute on function public.expire_manual_grants(uuid) from public, anon, authenticated;
grant execute on function public.grant_manual_premium(uuid, integer) to service_role;
grant execute on function public.expire_manual_grants(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Scheduled sweep
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

-- cron.schedule with an existing job name replaces that job, so this is
-- safe to re-run.
select cron.schedule(
  'expire-manual-premium-grants',
  '*/30 * * * *',
  $$select public.expire_manual_grants()$$
);

commit;
