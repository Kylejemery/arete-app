-- ----------------------------------------------------------------
-- Activation run B, Part B2: duplicate conversations and their origin.
--
-- Cause. Until 2026-09-04 the mobile app looked for a solo Cabinet row
-- created *today* and inserted a new one otherwise, and the web client kept
-- that per-day lookup until 2026-09-15; each new row carried a copy of the
-- whole thread so far. So one thread became a chain of daily snapshots with
-- the same first message (one user had 25). The 2026-09-15 trigger
-- cabinet_conversations_one_row_per_thread stops new forks at the table (no
-- duplicate has been created since 2026-09-14); this cleans up what is left.
--
-- Merge rule (admin and internal accounts excluded, as for every backfill):
--   rows of the same user, the same thread (counselor_slugs, session_type)
--   and the same first user message, created within 24 hours of the first
--   row of their group, where one row's messages contain every message of
--   the other (a snapshot, not a divergent conversation), are merged into
--   the earliest row: the union of messages in time order, each identical
--   message once (role, content, timestamp). Rows that share a first message
--   but diverge are left and counted. A row more than 24 hours after its
--   group's first row is kept and starts a new group.
-- Everything touched is first copied to cabinet_conversations_dupes_backup_
-- 20260925 with the action taken. References to a merged-away row
-- (session_participants, session_messages, cabinet_offers,
-- user_profile_facts evidence) are moved to the kept row first, so the
-- ON DELETE CASCADE on the session tables never fires. conversation_memory
-- is keyed by (user_id, counselor_slug), not by row, so it is unaffected.
--
-- origin: user | check_in | daily_question | escalation, set from the first
-- message when a row first gets messages, and backfilled. Metrics about
-- conversation starts count origin = 'user' only.
-- ----------------------------------------------------------------

-- 1. origin
ALTER TABLE cabinet_conversations ADD COLUMN IF NOT EXISTS origin text
  CHECK (origin IS NULL OR origin IN ('user', 'check_in', 'daily_question', 'escalation'));
COMMENT ON COLUMN cabinet_conversations.origin IS
  'How the thread began, from its first message: user, check_in ([Morning/Evening check-in] or the check-in chip), escalation ([Escalated from private ...]), daily_question (a counselor spoke first: the daily question or another counselor-opened line). Conversation-start metrics count origin = user only.';

CREATE OR REPLACE FUNCTION public.cabinet_message_origin(m jsonb)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN m IS NULL THEN NULL
    WHEN m->>'role' = 'assistant' THEN 'daily_question'
    WHEN m->>'kind' = 'checkin' OR coalesce(m->>'content', '') ~* '^\s*\[(morning|evening) check-in\]' THEN 'check_in'
    WHEN coalesce(m->>'content', '') ~* '^\s*\[escalated from private' THEN 'escalation'
    ELSE 'user'
  END
$$;

CREATE OR REPLACE FUNCTION public.cabinet_conversations_set_origin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.origin IS NULL AND jsonb_typeof(NEW.messages) = 'array' AND jsonb_array_length(NEW.messages) > 0 THEN
    NEW.origin := public.cabinet_message_origin(NEW.messages -> 0);
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS cabinet_conversations_set_origin ON cabinet_conversations;
CREATE TRIGGER cabinet_conversations_set_origin
  BEFORE INSERT OR UPDATE OF messages ON cabinet_conversations
  FOR EACH ROW EXECUTE FUNCTION public.cabinet_conversations_set_origin();

-- 2. Backup of every row in a duplicate group.
CREATE TABLE IF NOT EXISTS cabinet_conversations_dupes_backup_20260925 AS
  SELECT c.*, NULL::text AS merge_action, NULL::uuid AS merged_into
    FROM cabinet_conversations c
   WHERE false;
ALTER TABLE cabinet_conversations_dupes_backup_20260925 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE cabinet_conversations_dupes_backup_20260925 IS
  'Every cabinet_conversations row in a duplicate group (same user, thread and first user message) as it stood before the 2026-09-25 merge, with merge_action (kept, kept_new_window, merged, left_diverged) and merged_into. Service role only.';

DO $$
DECLARE
  grp record;
  r record;
  keeper record;
  keeper_msgs jsonb;
  merged jsonb;
  missing_a integer;
  missing_b integer;
BEGIN
  FOR grp IN
    WITH firsts AS (
      SELECT c.id, c.user_id, c.counselor_slugs, c.session_type, c.created_at,
             (SELECT m->>'content'
                FROM jsonb_array_elements(c.messages) WITH ORDINALITY e(m, i)
               WHERE m->>'role' = 'user'
               ORDER BY i LIMIT 1) AS first_user
        FROM cabinet_conversations c
        JOIN profiles p ON p.id = c.user_id
       WHERE p.is_admin IS NOT TRUE AND p.is_internal IS NOT TRUE
    )
    SELECT user_id, counselor_slugs, session_type, first_user, array_agg(id ORDER BY created_at, id) AS ids
      FROM firsts
     WHERE first_user IS NOT NULL
     GROUP BY user_id, counselor_slugs, session_type, first_user
    HAVING count(*) > 1
  LOOP
    INSERT INTO cabinet_conversations_dupes_backup_20260925
      SELECT c.*, NULL, NULL FROM cabinet_conversations c WHERE c.id = ANY (grp.ids);

    keeper := NULL;
    FOR r IN SELECT * FROM cabinet_conversations WHERE id = ANY (grp.ids) ORDER BY created_at, id LOOP
      IF keeper IS NULL THEN
        keeper := r;
        keeper_msgs := coalesce(r.messages, '[]'::jsonb);
        UPDATE cabinet_conversations_dupes_backup_20260925 SET merge_action = 'kept' WHERE id = r.id;
        CONTINUE;
      END IF;

      IF r.created_at - keeper.created_at > interval '24 hours' THEN
        -- Outside the 24 hour window of the current keeper: this row is kept
        -- and starts a new group of its own.
        UPDATE cabinet_conversations_dupes_backup_20260925 SET merge_action = 'kept_new_window' WHERE id = r.id;
        keeper := r;
        keeper_msgs := coalesce(r.messages, '[]'::jsonb);
        CONTINUE;
      END IF;

      -- Snapshot test: one side contains every (role, content) of the other.
      SELECT count(*) INTO missing_a
        FROM jsonb_array_elements(keeper_msgs) a
       WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(r.messages, '[]'::jsonb)) b
                          WHERE b->>'role' IS NOT DISTINCT FROM a->>'role' AND b->>'content' IS NOT DISTINCT FROM a->>'content');
      SELECT count(*) INTO missing_b
        FROM jsonb_array_elements(coalesce(r.messages, '[]'::jsonb)) b
       WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(keeper_msgs) a
                          WHERE b->>'role' IS NOT DISTINCT FROM a->>'role' AND b->>'content' IS NOT DISTINCT FROM a->>'content');
      IF missing_a > 0 AND missing_b > 0 THEN
        UPDATE cabinet_conversations_dupes_backup_20260925 SET merge_action = 'left_diverged' WHERE id = r.id;
        CONTINUE;
      END IF;

      -- Union, each identical message once, in time order.
      SELECT coalesce(jsonb_agg(m ORDER BY ts NULLS LAST, ord), '[]'::jsonb) INTO merged
        FROM (
          SELECT DISTINCT ON (m->>'role', m->>'content', public.cabinet_message_ts(m)) m,
                 public.cabinet_message_ts(m) AS ts, ord
            FROM (
              SELECT m, i AS ord FROM jsonb_array_elements(keeper_msgs) WITH ORDINALITY e(m, i)
              UNION ALL
              SELECT m, 100000 + i FROM jsonb_array_elements(coalesce(r.messages, '[]'::jsonb)) WITH ORDINALITY e(m, i)
            ) u
           ORDER BY m->>'role', m->>'content', public.cabinet_message_ts(m), ord
        ) d;
      keeper_msgs := merged;

      -- Move references to the kept row, then drop the merged-away row.
      DELETE FROM session_participants sp
       WHERE sp.session_id = r.id
         AND EXISTS (SELECT 1 FROM session_participants k WHERE k.session_id = keeper.id AND k.user_id = sp.user_id);
      UPDATE session_participants SET session_id = keeper.id WHERE session_id = r.id;
      UPDATE session_messages SET session_id = keeper.id WHERE session_id = r.id;
      UPDATE cabinet_offers SET conversation_id = keeper.id WHERE conversation_id = r.id;
      UPDATE user_profile_facts SET evidence_conversation_id = keeper.id WHERE evidence_conversation_id = r.id;

      UPDATE cabinet_conversations
         SET messages = keeper_msgs,
             updated_at = greatest(cabinet_conversations.updated_at, r.updated_at),
             cycle_processed_through = greatest(cabinet_conversations.cycle_processed_through, r.cycle_processed_through)
       WHERE id = keeper.id;
      DELETE FROM cabinet_conversations WHERE id = r.id;
      UPDATE cabinet_conversations_dupes_backup_20260925 SET merge_action = 'merged', merged_into = keeper.id WHERE id = r.id;
    END LOOP;
  END LOOP;
END
$$;

-- 3. Backfill origin from each row's first message.
UPDATE cabinet_conversations
   SET origin = public.cabinet_message_origin(messages -> 0)
 WHERE origin IS NULL
   AND jsonb_typeof(messages) = 'array'
   AND jsonb_array_length(messages) > 0;
