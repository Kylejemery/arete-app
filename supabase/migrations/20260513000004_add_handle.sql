-- ============================================================
-- Add handle column to profiles for Courtyard display names
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique_idx ON profiles(handle);
