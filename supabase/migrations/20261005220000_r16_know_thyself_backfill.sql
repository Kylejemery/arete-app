-- Retention plan R16: backfill profiles.know_thyself_complete for users who
-- completed Know Thyself through the form under the R3 rule but whose flag
-- is still false.
--
-- NOT APPLIED. Kyle applies this after review.
--
-- The rule is the R3 rule, as the ticket asks, which Kyle confirmed on
-- 2026-10-05: kt_goals filled, plus at least two of kt_background,
-- kt_identity, kt_strengths, kt_weaknesses, kt_patterns, kt_major_events,
-- future_self_description. It is the same rule as
-- supabase/backfills/2026-09-21_know_thyself_complete.sql, which was never
-- run. Since 2026-09-25 the live definition is "the top five registry
-- fields are filled" (activation plan, Part 3), so users flagged here will
-- have a flag that does not mean "top five filled". The flag is never unset.
--
-- No Scroll is written here (that needs a model call). The Scrolls page on
-- both platforms now starts the first Scroll when it sees the flag set and
-- no Scroll (startFirstScrollIfMissing), so these users get one on their
-- next visit.
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
