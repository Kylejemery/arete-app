-- Retention plan R3: backfill profiles.know_thyself_complete for existing
-- users whose saved answers already meet the one completion rule:
--   kt_goals filled, plus at least two of kt_background, kt_identity,
--   kt_strengths, kt_weaknesses, kt_patterns, kt_major_events,
--   future_self_description.
-- The same rule lives in isKnowThyselfProfileComplete (lib/db.ts and
-- web/src/lib/db.ts). Not a migration and NOT executed by the pipeline:
-- Kyle runs it by hand after review. Step 1 is a dry run.

-- 1. Dry run: how many profiles would flip.
select count(*) as would_flip
from profiles p
join user_settings s on s.user_id = p.id
where coalesce(p.know_thyself_complete, false) = false
  and nullif(btrim(s.kt_goals), '') is not null
  and (
    (nullif(btrim(s.kt_background), '') is not null)::int
    + (nullif(btrim(s.kt_identity), '') is not null)::int
    + (nullif(btrim(s.kt_strengths), '') is not null)::int
    + (nullif(btrim(s.kt_weaknesses), '') is not null)::int
    + (nullif(btrim(s.kt_patterns), '') is not null)::int
    + (nullif(btrim(s.kt_major_events), '') is not null)::int
    + (nullif(btrim(s.future_self_description), '') is not null)::int
  ) >= 2;

-- 2. Apply. Also stamps kt_completed_at where it is still null, using the
--    settings row's updated_at as the best available completion time.
-- begin;
-- with eligible as (
--   select p.id as user_id, s.updated_at
--   from profiles p
--   join user_settings s on s.user_id = p.id
--   where coalesce(p.know_thyself_complete, false) = false
--     and nullif(btrim(s.kt_goals), '') is not null
--     and (
--       (nullif(btrim(s.kt_background), '') is not null)::int
--       + (nullif(btrim(s.kt_identity), '') is not null)::int
--       + (nullif(btrim(s.kt_strengths), '') is not null)::int
--       + (nullif(btrim(s.kt_weaknesses), '') is not null)::int
--       + (nullif(btrim(s.kt_patterns), '') is not null)::int
--       + (nullif(btrim(s.kt_major_events), '') is not null)::int
--       + (nullif(btrim(s.future_self_description), '') is not null)::int
--     ) >= 2
-- ),
-- flagged as (
--   update profiles p
--   set know_thyself_complete = true, updated_at = now()
--   from eligible e
--   where p.id = e.user_id
--   returning p.id
-- )
-- update user_settings s
-- set kt_completed_at = coalesce(s.updated_at, now())
-- from flagged f
-- where s.user_id = f.id and s.kt_completed_at is null;
-- commit;

-- Users flipped here get no first Scroll from this script (that needs a
-- model call). They see the Scrolls page's request form instead.
