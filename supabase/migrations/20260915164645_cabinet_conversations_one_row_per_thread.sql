-- One cabinet_conversations row per (user, thread), enforced at the table.
--
-- The mobile client used to look for a solo Cabinet row created today and
-- insert otherwise, so each day opened a fresh row carrying a copy of the whole
-- thread. That was fixed in the app on 2026-09-04 (one row per user, updated in
-- place), but rows kept arriving daily: the web client still carried the
-- per-day lookup and its structured conversation page inserted a row on every
-- open, and installed builds of the old app cannot be recalled. Fixing every
-- client is necessary and not sufficient, so this trigger makes the table
-- itself refuse to fork a thread.
--
-- On INSERT, when a row already exists for the same user and the same
-- counselor_slugs (null for the solo group thread), the incoming messages are
-- merged into that row and the insert is dropped. When the incoming thread
-- already contains every message the row holds (the usual case: a client
-- saving its full copy plus the new turn), the incoming array is stored as is,
-- so the client's own ordering is kept. Otherwise the two arrays are unioned,
-- deduped on (timestamp, role, content), and ordered by timestamp. The row id
-- never changes, which is what session_participants.session_id depends on.
--
-- A client that does insert-then-select on the dropped row gets "no rows"
-- back from PostgREST and logs it; the messages are saved either way.

create or replace function public.cabinet_message_ts(m jsonb)
returns numeric
language plpgsql
immutable
as $$
declare
  t text := m->>'timestamp';
begin
  if t is null then
    return null;
  end if;
  -- Unix milliseconds (the app) or an ISO string (the web structured API).
  if t ~ '^\d+(\.\d+)?$' then
    return t::numeric;
  end if;
  begin
    return extract(epoch from t::timestamptz) * 1000;
  exception when others then
    return null;
  end;
end;
$$;

create or replace function public.cabinet_conversations_merge_duplicate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_id uuid;
  existing_messages jsonb;
  missing_from_new integer;
  merged jsonb;
begin
  -- Serialise inserts for the same thread so two first saves cannot both
  -- get past the lookup.
  perform pg_advisory_xact_lock(
    hashtext(new.user_id::text || '|' || coalesce(array_to_string(new.counselor_slugs, ','), ''))
  );

  select id, coalesce(messages, '[]'::jsonb)
    into existing_id, existing_messages
  from cabinet_conversations
  where user_id = new.user_id
    and counselor_slugs is not distinct from new.counselor_slugs
  order by updated_at desc
  limit 1
  for update;

  if existing_id is null then
    return new;
  end if;

  new.messages := coalesce(new.messages, '[]'::jsonb);
  if jsonb_typeof(new.messages) <> 'array' or jsonb_typeof(existing_messages) <> 'array' then
    return new;
  end if;

  -- Messages the existing row holds that the incoming array does not.
  select count(*) into missing_from_new
  from jsonb_array_elements(existing_messages) e(m)
  where not exists (
    select 1 from jsonb_array_elements(new.messages) n(m)
    where coalesce(n.m->>'timestamp', '') = coalesce(e.m->>'timestamp', '')
      and coalesce(n.m->>'role', '') = coalesce(e.m->>'role', '')
      and coalesce(n.m->>'content', '') = coalesce(e.m->>'content', '')
  );

  if missing_from_new = 0 then
    merged := new.messages;
  else
    select coalesce(jsonb_agg(m order by ts nulls last, src, ord), '[]'::jsonb)
      into merged
    from (
      select distinct on (key) m, ts, src, ord
      from (
        select
          x.m, x.ord, x.src,
          md5(coalesce(x.m->>'timestamp', '') || '|' || coalesce(x.m->>'role', '') || '|' || coalesce(x.m->>'content', '')) as key,
          public.cabinet_message_ts(x.m) as ts
        from (
          select e.m, e.ord, 0 as src
          from jsonb_array_elements(existing_messages) with ordinality e(m, ord)
          union all
          select n.m, n.ord, 1 as src
          from jsonb_array_elements(new.messages) with ordinality n(m, ord)
        ) x
      ) y
      order by key, src, ord
    ) z;
  end if;

  update cabinet_conversations
  set messages = merged,
      updated_at = greatest(coalesce(new.updated_at, now()), updated_at)
  where id = existing_id;

  return null;
end;
$$;

drop trigger if exists cabinet_conversations_one_row_per_thread on public.cabinet_conversations;
create trigger cabinet_conversations_one_row_per_thread
  before insert on public.cabinet_conversations
  for each row
  execute function public.cabinet_conversations_merge_duplicate();
