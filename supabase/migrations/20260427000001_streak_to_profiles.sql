-- ----------------------------------------------------------------
-- 20260427000001_streak_to_profiles.sql
-- Move streak tracking to profiles for persistent storage.
-- The check_ins.streak column stored streak per-day, causing it to
-- appear as 0 at the start of each new day. By storing on profiles,
-- the streak persists across midnight and new days correctly.
-- ----------------------------------------------------------------

-- Add persistent streak columns to profiles
alter table profiles
  add column if not exists streak integer not null default 0,
  add column if not exists streak_last_incremented_date date;

-- streak starts at 0 for all users; they will rebuild naturally
-- as they complete morning + evening routines going forward.
