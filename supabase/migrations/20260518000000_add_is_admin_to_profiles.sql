-- ----------------------------------------------------------------
-- 20260518000000_add_is_admin_to_profiles.sql
-- is_admin = true bypasses all course locks and session prerequisites.
-- Development use only until role system is built.
--
-- NOTE: Kyle runs the UPDATE below manually with his own user UUID
-- (from auth.users) after this migration is applied. Do not hardcode
-- any user ID in the codebase.
-- ----------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

UPDATE profiles SET is_admin = false WHERE is_admin IS NULL;

-- Set Kyle's account as admin (run manually with the actual user UUID):
-- UPDATE profiles SET is_admin = true WHERE id = '<kyle-user-uuid>';
