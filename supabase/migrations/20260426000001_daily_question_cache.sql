-- ============================================================
-- Daily question response cache — 2026-04-26
--
-- Adds two columns to check_ins so the Today's Question response
-- can be generated once per user per day at first app open and
-- reused on every subsequent load without hitting the API again.
--
--   daily_question_counselor  — normalized counselor ID ('marcus',
--                               'epictetus', 'goggins', 'roosevelt',
--                               'futureSelf') so we can verify the
--                               cached response belongs to today's
--                               assigned counselor before serving it.
--
--   daily_question_response   — the pre-generated counselor response,
--                               stored as plain text.
--
-- Both columns are keyed by the existing check_in_date unique
-- constraint (user_id, check_in_date), so they reset automatically
-- at local midnight when the next day's row is created.
-- ============================================================

ALTER TABLE check_ins
  ADD COLUMN IF NOT EXISTS daily_question_counselor text,
  ADD COLUMN IF NOT EXISTS daily_question_response  text;
