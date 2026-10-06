-- Retention plan R16: backfill profiles.know_thyself_complete for users who
-- completed Know Thyself through the form but whose flag is still false.
--
-- NOT APPLIED. Kyle applies this after review, and after
-- 20261006140000_kt_completion_short_step.sql (decision D7), so the code,
-- the trigger and this backfill agree.
--
-- The rule (decision D8, 2026-10-06): the R3 rule as the ticket asks, which
-- is kt_goals filled plus at least two of kt_background, kt_identity,
-- kt_strengths, kt_weaknesses, kt_patterns, kt_major_events and
-- future_self_description. On top of that, users without BOTH of the other
-- two short step fields (kt_weaknesses and kt_patterns) are excluded. What
-- remains meets the D7 completion rule, the three short step fields. When it
-- was written that left 6 of the 19 users the R3 rule matches; the PR lists
-- the 13 excluded by user id.
--
-- It repeats supabase/backfills/2026-09-21_know_thyself_complete.sql, which
-- was never run.
--
-- No Scroll is written here (that needs a model call). The Scrolls page on
-- both platforms starts the first Scroll when it sees the flag set and no
-- Scroll (startFirstScrollIfMissing), so these users get one on their next
-- visit.
--
-- Idempotent: a second run touches nothing. Reads only whether fields are
-- empty, never their text.

begin;

with eligible as (
  select p.id as user_id
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
    ) >= 2
    -- D8: both other short step fields, so the flag means what D7 says.
    and nullif(btrim(s.kt_weaknesses), '') is not null
    and nullif(btrim(s.kt_patterns), '') is not null
),
flagged as (
  update profiles p
  set know_thyself_complete = true, updated_at = now()
  from eligible e
  where p.id = e.user_id
  returning p.id
)
-- First completion only: stamp kt_completed_at with the settings row's last
-- update, the best available completion time.
update user_settings s
set kt_completed_at = coalesce(s.updated_at, now())
from flagged f
where s.user_id = f.id
  and s.kt_completed_at is null;

commit;
