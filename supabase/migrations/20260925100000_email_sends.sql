-- ----------------------------------------------------------------
-- 20260925100000_email_sends.sql
-- Lifecycle email ledger (retention plan R9).
--
-- One row per (user, kind) for the three first-week emails the
-- lifecycle-email-agent sends through Resend: welcome, day_two, and
-- day_five_insight. A row is written when the email is sent, or with
-- status = 'skipped' when the window for that email closed without a
-- send (the member checked in again before the day two email was due,
-- or a week passed with no insight). Either way the agent never
-- evaluates that (user, kind) again, so nobody receives the same email
-- twice and old members are never emailed retroactively.
--
-- Opting out lives on profiles.email_opt_out (added 2026-09-15 for the
-- admin Email tab); the agent and the unsubscribe endpoint both use it,
-- so one flag covers every kind of Arete email.
--
-- Service role only: RLS is enabled with no policies, the same as
-- product_events.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_sends (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text        NOT NULL CHECK (kind IN ('welcome', 'day_two', 'day_five_insight')),
  status      text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'skipped')),
  reason      text,
  resend_id   text,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_sends_user_kind_unique UNIQUE (user_id, kind)
);

CREATE INDEX IF NOT EXISTS email_sends_user_idx ON email_sends (user_id);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE email_sends IS
  'Lifecycle email ledger (retention plan R9): one row per member per email kind, sent or skipped. Written only by the lifecycle-email-agent with the service role.';
COMMENT ON COLUMN email_sends.status IS
  'sent when Resend accepted the email; skipped when the window closed without a send (see reason).';
COMMENT ON COLUMN email_sends.reason IS
  'Why a skipped row was skipped: checked_in (day_two not needed) or window_passed.';
