-- ============================================================
-- The Agora: counselor answers become a pipeline.
--
-- An editor invites a counselor to answer a published essay. The Railway
-- server (server/routes/agora.js) screens the essay through the stoic
-- safety gate, retrieves grounding passages from rag_corpus on the
-- counselor fence, writes the answer in the counselor's voice, and stores
-- it here with the service role. These columns record which counselor,
-- which passages, which model, and when, so an answer is auditable and
-- can be regenerated or removed.
--
-- counselor_name and counselor_answer already exist (20260913000000).
-- The guard trigger is re-issued so the new columns are protected the
-- same way: a non-editor can never set or change them.
-- ============================================================

ALTER TABLE agora_essays
  ADD COLUMN IF NOT EXISTS counselor_slug text,
  ADD COLUMN IF NOT EXISTS counselor_sources jsonb,
  ADD COLUMN IF NOT EXISTS counselor_model text,
  ADD COLUMN IF NOT EXISTS counselor_answered_at timestamptz;

COMMENT ON COLUMN agora_essays.counselor_slug IS 'counselors.slug of the counselor invited to answer.';
COMMENT ON COLUMN agora_essays.counselor_sources IS 'Passages the answer was grounded in: [{author, work, title}].';
COMMENT ON COLUMN agora_essays.counselor_model IS 'Model that wrote the answer.';
COMMENT ON COLUMN agora_essays.counselor_answered_at IS 'When the answer was written.';

CREATE OR REPLACE FUNCTION public.agora_essays_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editor boolean := public.agora_is_editor();
BEGIN
  -- An update that originates inside another trigger is our own
  -- comment_count sync (see agora_comment_count_sync). Let it through.
  IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  NEW.updated_at := now();

  IF NEW.tags IS NULL THEN NEW.tags := '{}'; END IF;
  IF cardinality(NEW.tags) > 6 THEN
    RAISE EXCEPTION 'An essay carries at most six topics';
  END IF;

  IF NEW.excerpt IS NULL OR trim(NEW.excerpt) = '' THEN
    NEW.excerpt := left(regexp_replace(trim(NEW.body), '\s+', ' ', 'g'), 220);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT editor THEN
      NEW.author_id := auth.uid();
      NEW.author_name := public.agora_display_name(auth.uid());
      NEW.is_editorial := false;
      NEW.editor_note := NULL;
      NEW.counselor_name := NULL;
      NEW.counselor_answer := NULL;
      NEW.counselor_slug := NULL;
      NEW.counselor_sources := NULL;
      NEW.counselor_model := NULL;
      NEW.counselor_answered_at := NULL;
      NEW.published_at := NULL;
      NEW.comment_count := 0;
      IF NEW.status NOT IN ('draft', 'in_review') THEN
        RAISE EXCEPTION 'An essay enters the Agora as a draft or in review';
      END IF;
    ELSE
      IF NEW.author_name IS NULL OR trim(NEW.author_name) = '' THEN
        NEW.author_name := public.agora_display_name(NEW.author_id);
      END IF;
      NEW.comment_count := 0;
    END IF;
  ELSE
    IF NOT editor THEN
      NEW.author_id := OLD.author_id;
      NEW.author_name := OLD.author_name;
      NEW.is_editorial := OLD.is_editorial;
      NEW.editor_note := OLD.editor_note;
      NEW.counselor_name := OLD.counselor_name;
      NEW.counselor_answer := OLD.counselor_answer;
      NEW.counselor_slug := OLD.counselor_slug;
      NEW.counselor_sources := OLD.counselor_sources;
      NEW.counselor_model := OLD.counselor_model;
      NEW.counselor_answered_at := OLD.counselor_answered_at;
      NEW.published_at := OLD.published_at;
      NEW.comment_count := OLD.comment_count;
      NEW.created_at := OLD.created_at;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
          (OLD.status = 'draft'     AND NEW.status = 'in_review') OR
          (OLD.status = 'returned'  AND NEW.status = 'in_review') OR
          (OLD.status = 'returned'  AND NEW.status = 'draft')     OR
          (OLD.status = 'in_review' AND NEW.status = 'draft')
        ) THEN
          RAISE EXCEPTION 'Only the editor can move an essay from % to %', OLD.status, NEW.status;
        END IF;
      ELSIF OLD.status = 'published' THEN
        RAISE EXCEPTION 'A published essay is edited by the editor';
      END IF;
    END IF;
  END IF;

  IF NEW.status = 'in_review' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'in_review') THEN
    NEW.submitted_at := now();
  END IF;
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  -- A note belongs to a return. Clear it once the author moves the essay on.
  IF TG_OP = 'UPDATE' AND OLD.status = 'returned' AND NEW.status IN ('in_review', 'draft') THEN
    NEW.editor_note := NULL;
  END IF;

  RETURN NEW;
END;
$$;
