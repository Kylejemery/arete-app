-- Retention plan R6: "What your Cabinet now sees".
--
-- After Know Thyself is saved, POST /api/kt-reflection asks the chair of the
-- user's Cabinet for a three or four sentence reflection and stores it here
-- so the Know Thyself page can show it again. Written by the server with the
-- service role; read by the client through the existing user_settings
-- select (own row).
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kt_reflection text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kt_reflection_at timestamptz;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kt_reflection_counselor text;
