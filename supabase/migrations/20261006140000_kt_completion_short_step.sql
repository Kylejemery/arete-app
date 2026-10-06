-- Decision D7 (2026-10-06): "Know Thyself complete" now means the three short
-- step fields are filled: top_goal (kt_goals), main_obstacle (kt_weaknesses)
-- and hard_times_pattern (kt_patterns). It replaces the top five rule from
-- 20260925160005_user_profile_facts.sql. The registry marks the same three
-- fields with `completion` (lib/profileFields.ts, web/src/lib/profileFields.ts,
-- server/lib/profile-fields.js), and markKnowThyselfComplete applies it on
-- the clients.
--
-- Only the completion check changes. The facts -> user_settings mirroring
-- below is copied unchanged. The flag is still never unset, so users already
-- flagged under the top five rule keep it.
--
-- NOT APPLIED by the session that wrote it. Kyle applies it after review,
-- before the R16 backfill, so the code, the trigger and the backfill agree.

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
         AND f.field_key IN ('top_goal', 'main_obstacle', 'hard_times_pattern')) = 3 THEN
    UPDATE profiles SET know_thyself_complete = true, updated_at = now()
     WHERE id = NEW.user_id AND know_thyself_complete IS NOT TRUE;
  END IF;
  RETURN NEW;
END
$$;
