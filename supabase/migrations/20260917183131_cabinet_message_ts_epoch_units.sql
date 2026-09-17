-- Cabinet thread merge: read seconds and milliseconds as the same instant, and
-- dedupe seeded counselor lines the way the app does.
--
-- Two paths seed a notification's line into the Cabinet thread (the tray
-- notification and the recorded crossing or schedule it came from), and they
-- disagreed about units: expo-notifications reports a delivered
-- notification's date in SECONDS on iOS (a bridged Foundation Date, so often
-- fractional), while every other caller uses Date.now() milliseconds. The
-- client fix normalizes at the seeding path, but this trigger is the last
-- place a duplicate can still be collapsed, and it could not see one:
--
--   1. cabinet_message_ts read a bare seconds value as milliseconds, so the
--      line sorted to January 1970 instead of its real place in the thread.
--   2. The dedupe key hashed the raw timestamp TEXT, so '1788537600' and
--      '1788537600000' -- the same moment, two units -- hashed differently and
--      both copies survived the merge.
--
-- Fixing (1) is not enough for (2): the two encodings of one instant can
-- differ by a millisecond or so (1788540330194 vs 1788540330.195653), so no
-- exact comparison of the normalized value collapses them either.
--
-- So counselor lines are deduped here on the same rule the app uses in
-- services/threadService.ts (sameCounselorLine): an assistant message
-- carrying a counselorName is the same line when the words and the calendar
-- day match, whichever counselor signed them and whatever unit its timestamp
-- arrived in. The day is taken in UTC here against the client's local day, so
-- a pair straddling UTC midnight still gets through; the client is the first
-- defence and this is the backstop. Every other message keeps the exact
-- (timestamp, role, content) key, so a user who sends the same short message
-- twice in one day still has both.
--
-- This changes the merge path only. Nothing already stored is rewritten.

create or replace function public.cabinet_message_ts(m jsonb)
returns numeric
language plpgsql
immutable
as $$
declare
  t text := m->>'timestamp';
  n numeric;
begin
  if t is null then
    return null;
  end if;
  -- Unix milliseconds (the app) or an ISO string (the web structured API).
  if t ~ '^\d+(\.\d+)?$' then
    n := t::numeric;
    -- Seconds since the epoch is ~1.8e9 today, milliseconds ~1.8e12: a value
    -- below the threshold is seconds, including the fractional iOS form.
    if n > 0 and n < 1e11 then
      return n * 1000;
    end if;
    return n;
  end if;
  begin
    return extract(epoch from t::timestamptz) * 1000;
  exception when others then
    return null;
  end;
end;
$$;

-- The merge key for one message. Mirrors sameCounselorLine for seeded
-- counselor lines; exact for everything else.
create or replace function public.cabinet_message_key(m jsonb)
returns text
language sql
immutable
as $$
  select case
    when coalesce(m->>'role', '') = 'assistant'
     and coalesce(m->>'counselorName', '') <> ''
    then 'line|'
         || coalesce(m->>'content', '')
         || '|'
         || coalesce(
              to_char(to_timestamp(public.cabinet_message_ts(m) / 1000.0), 'YYYY-MM-DD'),
              'no-date'
            )
    else 'msg|'
         || coalesce(m->>'timestamp', '')
         || '|'
         || coalesce(m->>'role', '')
         || '|'
         || coalesce(m->>'content', '')
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
    where public.cabinet_message_key(n.m) = public.cabinet_message_key(e.m)
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
          public.cabinet_message_key(x.m) as key,
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
