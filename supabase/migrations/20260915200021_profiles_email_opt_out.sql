-- ----------------------------------------------------------------
-- 20260915120000_profiles_email_opt_out.sql
-- Sticky "do not email" flag for the admin Email tab.
--
-- When a member replies asking to be taken off the list, the admin marks
-- them once here and forgets about it: the roster greys them out, the
-- quick picks and select-all skip them, and the send route refuses to
-- mail them even if their id is submitted. Setting the flag back to
-- false re-enables them; nothing is deleted.
-- ----------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_opt_out_at timestamptz;

COMMENT ON COLUMN profiles.email_opt_out IS
  'True when the member asked not to receive admin broadcast email. The admin Email tab and its send route both honour it.';
COMMENT ON COLUMN profiles.email_opt_out_at IS
  'When email_opt_out was last set to true; null once cleared.';
