-- Activation run B, Part B4.
--
-- 1. user_settings.pronouns: optional, set in Settings. System-generated text
--    about the person (check-in prompts, counselor context) uses they/them/
--    their unless this is he/him or she/her.
-- 2. cabinet_offers gains kind 'task': in a person's first week, the closing
--    counselor may offer once to add one check-in task tied to their stated
--    goal. It is added to routine_templates only on acceptance.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS pronouns text
  CHECK (pronouns IS NULL OR pronouns IN ('he/him', 'she/her', 'they/them', 'prefer_not_to_say'));
COMMENT ON COLUMN user_settings.pronouns IS
  'Optional (Settings). he/him, she/her, they/them or prefer_not_to_say; system text defaults to they/them/their unless he/him or she/her.';

ALTER TABLE cabinet_offers DROP CONSTRAINT IF EXISTS cabinet_offers_kind_check;
ALTER TABLE cabinet_offers ADD CONSTRAINT cabinet_offers_kind_check CHECK (kind IN ('goal', 'scroll', 'task'));
