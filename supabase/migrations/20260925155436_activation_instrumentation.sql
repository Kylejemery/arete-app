-- Activation plan, Part 2: instrumentation.
--
-- 1. Who spoke in a Cabinet conversation. counselor_slugs is the thread's
--    identity (null = the solo group Cabinet thread, [slug] = a 1:1 thread),
--    and the one-row-per-thread trigger and every client look threads up by
--    it, so it cannot also hold "who spoke" without forking every group
--    thread. The speakers go in a new column, speaker_slugs, which a trigger
--    recomputes from messages on every save, whichever client wrote it: each
--    assistant message's counselorId (normalised to the app's short thread
--    ids), else its counselorName matched against counselors.name, else, for
--    a 1:1 thread with no speaker fields, the thread's own counselor. Null
--    when no speaker can be determined.
-- 2. check_ins.type. The table was one row per check-in (morning / evening)
--    until 20260526000001 merged rows to one per day and set type to null.
--    It now says which halves of that day are done: morning, evening, both,
--    or null when neither. A trigger sets it on every save.
-- 3. cabinet_conversations.cycle_processed_through: the timestamp (Unix ms,
--    matching messages[].timestamp) of the last message the hourly
--    conversation cycle has processed, so each message is looked at once.
-- The backfills below exclude nothing: they only derive columns from each
-- row's own data. Counts in the activation report exclude the admin account.

ALTER TABLE cabinet_conversations ADD COLUMN IF NOT EXISTS speaker_slugs text[];
ALTER TABLE cabinet_conversations ADD COLUMN IF NOT EXISTS cycle_processed_through numeric;
COMMENT ON COLUMN cabinet_conversations.speaker_slugs IS
  'Counselors who actually spoke in this thread (short ids: marcus, goggins, roosevelt, futureSelf, ...). Maintained by trigger from messages. counselor_slugs remains the thread identity.';
COMMENT ON COLUMN cabinet_conversations.cycle_processed_through IS
  'Unix ms timestamp of the last message processed by the hourly conversation cycle (one-exchange event, profile extraction).';

-- The app's canonical short ids (services/threadService.ts normalizeCounselorId).
CREATE OR REPLACE FUNCTION public.normalize_counselor_slug(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p
    WHEN 'marcus-aurelius' THEN 'marcus'
    WHEN 'david-goggins' THEN 'goggins'
    WHEN 'theodore-roosevelt' THEN 'roosevelt'
    WHEN 'future-self' THEN 'futureSelf'
    ELSE nullif(btrim(p), '')
  END
$$;

CREATE OR REPLACE FUNCTION public.cabinet_speaker_slug(p_id text, p_name text)
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN nullif(btrim(p_id), '') IS NOT NULL THEN public.normalize_counselor_slug(p_id)
    WHEN nullif(btrim(p_name), '') IS NULL THEN NULL
    WHEN p_name ILIKE 'future %' OR p_name ILIKE 'your future self' THEN 'futureSelf'
    ELSE (SELECT public.normalize_counselor_slug(c.slug)
            FROM counselors c
           WHERE lower(c.name) = lower(btrim(p_name))
           LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.cabinet_speaker_slugs(p_messages jsonb, p_counselor_slugs text[])
RETURNS text[]
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  v text[];
BEGIN
  IF p_messages IS NOT NULL AND jsonb_typeof(p_messages) = 'array' THEN
    SELECT array_agg(DISTINCT s ORDER BY s) INTO v
      FROM (
        SELECT public.cabinet_speaker_slug(m->>'counselorId', m->>'counselorName') AS s
          FROM jsonb_array_elements(p_messages) m
         WHERE m->>'role' = 'assistant'
      ) x
     WHERE s IS NOT NULL;
  END IF;

  IF v IS NULL AND p_counselor_slugs IS NOT NULL AND array_length(p_counselor_slugs, 1) > 0
     AND p_messages IS NOT NULL AND jsonb_typeof(p_messages) = 'array'
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(p_messages) m WHERE m->>'role' = 'assistant') THEN
    SELECT array_agg(DISTINCT public.normalize_counselor_slug(s) ORDER BY public.normalize_counselor_slug(s)) INTO v
      FROM unnest(p_counselor_slugs) s;
  END IF;

  RETURN v;
END
$$;

CREATE OR REPLACE FUNCTION public.cabinet_conversations_set_speakers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.speaker_slugs := public.cabinet_speaker_slugs(NEW.messages, NEW.counselor_slugs);
  RETURN NEW;
END
$$;

-- Named to sort after cabinet_conversations_one_row_per_thread, so on an
-- insert that the merge trigger lets through it sees the final messages; a
-- merged (dropped) insert updates the existing row, which fires this too.
DROP TRIGGER IF EXISTS cabinet_conversations_set_speakers ON cabinet_conversations;
CREATE TRIGGER cabinet_conversations_set_speakers
  BEFORE INSERT OR UPDATE OF messages, counselor_slugs ON cabinet_conversations
  FOR EACH ROW EXECUTE FUNCTION public.cabinet_conversations_set_speakers();

UPDATE cabinet_conversations
   SET speaker_slugs = public.cabinet_speaker_slugs(messages, counselor_slugs);

-- check_ins.type
CREATE OR REPLACE FUNCTION public.check_in_type(p_morning boolean, p_evening boolean)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN coalesce(p_morning, false) AND coalesce(p_evening, false) THEN 'both'
    WHEN coalesce(p_morning, false) THEN 'morning'
    WHEN coalesce(p_evening, false) THEN 'evening'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.check_ins_set_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.type := public.check_in_type(NEW.morning_done, NEW.evening_done);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS check_ins_set_type ON check_ins;
CREATE TRIGGER check_ins_set_type
  BEFORE INSERT OR UPDATE ON check_ins
  FOR EACH ROW EXECUTE FUNCTION public.check_ins_set_type();

UPDATE check_ins
   SET type = public.check_in_type(morning_done, evening_done)
 WHERE type IS DISTINCT FROM public.check_in_type(morning_done, evening_done);

COMMENT ON COLUMN check_ins.type IS
  'Which halves of the day are done: morning, evening, both, or null. Set by trigger from morning_done / evening_done.';
COMMENT ON COLUMN check_ins.reflection_answer IS
  'Dead since the evening screen started writing stoic_answer; no UI writes it and no code reads it (2026-09-25). Kept, not dropped.';
