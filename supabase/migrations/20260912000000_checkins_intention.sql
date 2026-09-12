-- ============================================================
-- check_ins.intention — 2026-09-12
--
-- "Today's intention" (the one sentence the Cabinet holds the member to)
-- lived only in the web app's localStorage under a fixed key, so it never
-- rolled over with the day and never reached iOS. It now lives on the
-- day's check_ins row, alongside the morning task state, so both apps
-- read and write the same sentence and it resets naturally each day.
-- ============================================================

ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS intention text;
