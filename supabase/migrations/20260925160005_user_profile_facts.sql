-- ----------------------------------------------------------------
-- Activation plan, Part 3: Know Thyself, filled by the Cabinet over time.
--
-- user_profile_facts holds one row per (user, Know Thyself field). Field keys
-- come from the registry in server/lib/profile-fields.js (mirrored in
-- lib/profileFields.ts and web/src/lib/profileFields.ts).
--
--   source   form              the user wrote it (Know Thyself form, signup card)
--            cabinet_asked     the user answered a counselor's direct question
--            user_confirmed    the user confirmed or edited an inferred value
--            cabinet_inferred  extracted from what the user said (tentative)
--   status   active | rejected (the user removed an inferred value; never
--            written again)
--
-- user_settings stays the readable, backward compatible store of what the
-- user authored, because installed app builds read and write it directly:
--   * user_settings -> facts: when a mapped kt column changes (any client),
--     the fact becomes source = form. Equal values are a no-op, so a value
--     the user confirmed keeps its source.
--   * facts -> user_settings: a user-authored fact (user_confirmed,
--     cabinet_asked) is mirrored into its column so every older reader sees
--     it. Inferred values are never mirrored: they stay tentative here.
-- pg_trigger_depth() stops the two triggers from bouncing.
--
-- profiles.know_thyself_complete is set once the five highest priority
-- fields (feedback_style, arete_reason, top_goal, main_obstacle,
-- life_situation) have an active value from any source. It is never unset.
--
-- RLS: the owner can select, update and delete their rows; only the service
-- role (and the security definer sync trigger) inserts.
-- ----------------------------------------------------------------

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kt_off_limits text;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS kt_facts_seen_at timestamptz;
COMMENT ON COLUMN user_settings.kt_off_limits IS
  'Topics the user asked the Cabinet never to bring up (signup card, Know Thyself). Injected into every counselor prompt as a hard constraint.';
COMMENT ON COLUMN user_settings.kt_facts_seen_at IS
  'When the user last opened Know Thyself; a newer cabinet_inferred fact shows a dot on the entry point.';

CREATE TABLE IF NOT EXISTS user_profile_facts (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key                text        NOT NULL,
  value                    text,
  source                   text        NOT NULL
                           CHECK (source IN ('form', 'cabinet_inferred', 'cabinet_asked', 'user_confirmed')),
  confidence               numeric     CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  evidence_conversation_id uuid,
  evidence_check_in_id     uuid,
  status                   text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rejected')),
  asked_at                 timestamptz,
  ask_declined_at          timestamptz,
  confirmed_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profile_facts_user_field_key UNIQUE (user_id, field_key)
);
CREATE INDEX IF NOT EXISTS user_profile_facts_user_idx ON user_profile_facts (user_id);

ALTER TABLE user_profile_facts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own profile facts" ON user_profile_facts;
CREATE POLICY "Users read own profile facts" ON user_profile_facts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own profile facts" ON user_profile_facts;
CREATE POLICY "Users update own profile facts" ON user_profile_facts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own profile facts" ON user_profile_facts;
CREATE POLICY "Users delete own profile facts" ON user_profile_facts
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE user_profile_facts IS
  'Know Thyself, one row per user per registry field (server/lib/profile-fields.js). source says who authored it; cabinet_inferred is tentative. Owner selects/updates/deletes; service role inserts.';

-- field_key <-> user_settings column. Keep in step with the registry.
CREATE OR REPLACE FUNCTION public.profile_field_columns()
RETURNS TABLE (field_key text, column_name text)
LANGUAGE sql IMMUTABLE
AS $$
  VALUES
    ('feedback_style',     'feedback_preference'),
    ('arete_reason',       'app_usage_intent'),
    ('top_goal',           'kt_goals'),
    ('main_obstacle',      'kt_weaknesses'),
    ('life_situation',     'kt_life_situation'),
    ('background',         'kt_background'),
    ('hard_times_pattern', 'kt_patterns'),
    ('identity',           'kt_identity'),
    ('strengths',          'kt_strengths'),
    ('future_self',        'future_self_description'),
    ('major_events',       'kt_major_events'),
    ('off_limits',         'kt_off_limits')
$$;

-- user_settings -> facts
CREATE OR REPLACE FUNCTION public.user_settings_sync_profile_facts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  v_new text;
  v_old text;
  j_new jsonb := to_jsonb(NEW);
  j_old jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  FOR m IN SELECT * FROM public.profile_field_columns() LOOP
    v_new := nullif(btrim(j_new ->> m.column_name), '');
    v_old := nullif(btrim(j_old ->> m.column_name), '');
    CONTINUE WHEN v_new IS NOT DISTINCT FROM v_old;
    IF v_new IS NOT NULL THEN
      INSERT INTO user_profile_facts (user_id, field_key, value, source, status)
      VALUES (NEW.user_id, m.field_key, v_new, 'form', 'active')
      ON CONFLICT (user_id, field_key) DO UPDATE
        SET value = EXCLUDED.value,
            source = 'form',
            status = 'active',
            confidence = NULL,
            updated_at = now()
        WHERE user_profile_facts.value IS DISTINCT FROM EXCLUDED.value
           OR user_profile_facts.status <> 'active';
    ELSE
      -- The user cleared a field they had written: forget the authored value.
      -- Rejections of inferred values are kept, so they are never re-inferred.
      DELETE FROM user_profile_facts
       WHERE user_id = NEW.user_id
         AND field_key = m.field_key
         AND source IN ('form', 'cabinet_asked', 'user_confirmed');
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS user_settings_sync_profile_facts ON user_settings;
CREATE TRIGGER user_settings_sync_profile_facts
  AFTER INSERT OR UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION public.user_settings_sync_profile_facts();

-- facts -> user_settings (user-authored values only), and completeness.
CREATE OR REPLACE FUNCTION public.user_profile_facts_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col text;
  v_value text;
BEGIN
  IF pg_trigger_depth() = 1
     AND NEW.status = 'active'
     AND NEW.value IS NOT NULL
     AND NEW.source IN ('user_confirmed', 'cabinet_asked') THEN
    SELECT column_name INTO v_col FROM public.profile_field_columns() WHERE field_key = NEW.field_key;
    v_value := NEW.value;
    -- feedback_preference is read as an enum (firm / compassionate / both);
    -- a free text answer stays in the fact only.
    IF v_col = 'feedback_preference' AND lower(v_value) NOT IN ('firm', 'compassionate', 'both') THEN
      v_col := NULL;
    END IF;
    IF v_col IS NOT NULL THEN
      EXECUTE format(
        'UPDATE user_settings SET %1$I = $1, updated_at = now() WHERE user_id = $2 AND %1$I IS DISTINCT FROM $1',
        v_col
      ) USING v_value, NEW.user_id;
      IF v_col = 'kt_goals' THEN
        UPDATE user_settings SET user_goals = v_value
         WHERE user_id = NEW.user_id AND user_goals IS DISTINCT FROM v_value;
      END IF;
    END IF;
  END IF;

  IF (SELECT count(*) FROM user_profile_facts f
       WHERE f.user_id = NEW.user_id
         AND f.status = 'active'
         AND nullif(btrim(f.value), '') IS NOT NULL
         AND f.field_key IN ('feedback_style', 'arete_reason', 'top_goal', 'main_obstacle', 'life_situation')) = 5 THEN
    UPDATE profiles SET know_thyself_complete = true, updated_at = now()
     WHERE id = NEW.user_id AND know_thyself_complete IS NOT TRUE;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS user_profile_facts_after_write ON user_profile_facts;
CREATE TRIGGER user_profile_facts_after_write
  AFTER INSERT OR UPDATE ON user_profile_facts
  FOR EACH ROW EXECUTE FUNCTION public.user_profile_facts_after_write();

CREATE OR REPLACE FUNCTION public.user_profile_facts_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS user_profile_facts_touch ON user_profile_facts;
CREATE TRIGGER user_profile_facts_touch
  BEFORE UPDATE ON user_profile_facts
  FOR EACH ROW EXECUTE FUNCTION public.user_profile_facts_touch();

-- Backfill: every existing form answer becomes a source = form fact.
-- The admin account is excluded (its values stay readable from
-- user_settings, which the prompt builder falls back to, and sync on its
-- next edit).
INSERT INTO user_profile_facts (user_id, field_key, value, source, status, created_at)
SELECT s.user_id, m.field_key, nullif(btrim(to_jsonb(s) ->> m.column_name), ''), 'form', 'active',
       coalesce(s.updated_at, s.created_at, now())
  FROM user_settings s
  JOIN profiles p ON p.id = s.user_id
 CROSS JOIN public.profile_field_columns() m
 WHERE p.is_admin IS NOT TRUE
   AND nullif(btrim(to_jsonb(s) ->> m.column_name), '') IS NOT NULL
ON CONFLICT (user_id, field_key) DO NOTHING;
