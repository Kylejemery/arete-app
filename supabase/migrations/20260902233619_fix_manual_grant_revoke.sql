-- Fix: revoking an unexpired manual Premium grant left the profile on
-- premium with no subscriptions row behind it.
--
-- expire_manual_grants deleted the grant and downgraded the profile in one
-- statement via data-modifying CTEs. Every part of a single statement sees
-- the same snapshot, so the "is anything else still entitling this user"
-- check still saw the grant row it had just deleted (period end in the
-- future) and skipped the downgrade. The scheduled sweep was unaffected
-- because expired rows fail that check anyway; only an early admin revoke
-- hit it. The user then showed as Premium with no source, the Grant button
-- was withheld, and grant_manual_premium refused them as already entitled.
--
-- Run the delete and the downgrade as separate plpgsql statements so the
-- second sees the first.

begin;

create or replace function public.expire_manual_grants(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_users uuid[];
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
  )
  select coalesce(array_agg(distinct user_id), '{}') into v_users from expired;

  if cardinality(v_users) = 0 then
    return 0;
  end if;

  -- Separate statement: the delete above is now visible here.
  with downgraded as (
    update public.profiles p
    set tier = 'free', is_premium = false, updated_at = now()
    where p.id = any(v_users)
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

revoke execute on function public.expire_manual_grants(uuid) from public, anon, authenticated;
grant execute on function public.expire_manual_grants(uuid) to service_role;

commit;
