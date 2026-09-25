-- Personalization run C, Part C6: the free-tier limit on active practices.
--
-- The limit is configuration, never code: agent_config row 'personalization',
-- key free_active_module_limit (server/config/personalization.json holds the
-- same default for when the row cannot be read). A free account at the limit
-- that says yes to another practice is offered a swap, or Premium (never to
-- teens).
--
-- grandfathered marks practices that were on before the limit existed: they
-- stay on and do not count toward it. Every row present when this migration
-- runs is grandfathered; nothing already on is ever turned off by the limit.
ALTER TABLE user_app_config
  ADD COLUMN IF NOT EXISTS grandfathered boolean NOT NULL DEFAULT false;
UPDATE user_app_config SET grandfathered = true WHERE enabled;
COMMENT ON COLUMN user_app_config.grandfathered IS
  'On before the free-tier practice limit existed (run C, Part C6): stays on and does not count toward the limit.';

INSERT INTO agent_config (agent_name, config)
VALUES ('personalization', '{"free_active_module_limit": 1}'::jsonb)
ON CONFLICT (agent_name) DO NOTHING;
