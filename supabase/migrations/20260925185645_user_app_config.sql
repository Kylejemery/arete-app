-- Personalization run C, Part C1: which practice modules a person has on,
-- and their settings. The module definitions live in
-- server/lib/module-registry.js; module_key is text so a new module needs no
-- migration, and the server refuses any key the registry does not list.
--
--   enabled_by  'user'    the person turned it on themselves
--               'cabinet' the person said yes to a Cabinet proposal
--   pinned      shown in "Your practices" on Home
--
-- Every write goes through the server (service role), which validates the
-- settings against the registry and applies the free-tier limit. The owner
-- can read their rows. No insert, update or delete policy exists, so nothing
-- but the backend can write a row, and only the backend can set
-- enabled_by = 'cabinet'.
CREATE TABLE IF NOT EXISTS user_app_config (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key  text        NOT NULL CHECK (module_key ~ '^[a-z][a-z_]{0,39}$'),
  enabled     boolean     NOT NULL DEFAULT true,
  pinned      boolean     NOT NULL DEFAULT true,
  settings    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  enabled_by  text        NOT NULL CHECK (enabled_by IN ('user', 'cabinet')),
  proposal_id uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);
ALTER TABLE user_app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own app config" ON user_app_config;
CREATE POLICY "Users read own app config" ON user_app_config
  FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON user_app_config FROM anon, authenticated;
COMMENT ON TABLE user_app_config IS
  'Practice modules a person has on (run C). Written only by the server, which validates settings against server/lib/module-registry.js; the owner can read.';

-- The habit tracker's daily ticks. The person ticks and unticks their own
-- day from the Home card; a tick holds no text.
CREATE TABLE IF NOT EXISTS module_checkins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key  text        NOT NULL CHECK (module_key ~ '^[a-z][a-z_]{0,39}$'),
  day         date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key, day)
);
ALTER TABLE module_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own module checkins" ON module_checkins;
CREATE POLICY "Users read own module checkins" ON module_checkins
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users add own module checkins" ON module_checkins;
CREATE POLICY "Users add own module checkins" ON module_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users remove own module checkins" ON module_checkins;
CREATE POLICY "Users remove own module checkins" ON module_checkins
  FOR DELETE USING (auth.uid() = user_id);
COMMENT ON TABLE module_checkins IS
  'Daily ticks for the habit tracker practice (run C). Owner reads, adds and removes their own.';
