-- ============================================================
-- The Agora: essays by the editor and by readers, open to argument.
--
-- Two tables. agora_essays holds every essay and its place in the
-- editorial queue; agora_comments is the flat list of comments under a
-- published essay. Reading is free. Submitting an essay and commenting
-- are subscriber affordances; publishing is the editor's.
--
-- Lifecycle of an essay (status):
--   draft      only the author sees it; nothing has been sent
--   in_review  submitted; the editor reads every essay before it appears
--   published  live in the Agora; comments are open
--   returned   sent back with an editor_note; the author edits and resubmits
--
-- Who may do what:
--   editor        profiles.is_admin. Reads everything, publishes, returns,
--                 writes essays under any name, marks a comment as a
--                 counselor's answer.
--   subscriber    profiles.is_premium or a paid tier. Submits essays,
--                 comments on published essays.
--   anyone signed in  reads published essays and their comments.
--
-- Authorship is a name only: the system has no avatars. The name is
-- snapshotted onto the row by a trigger (profiles.handle, else the name
-- from user_settings, else "A reader") so a client cannot post under
-- someone else's name. The editor may set author_name freely, which is
-- how an essay appears as "From the editor".
--
-- Trust boundary: every column a reader must not touch (status
-- transitions, is_editorial, editor_note, counselor fields, published_at,
-- comment_count, is_counselor) is guarded by a BEFORE trigger rather than
-- by column grants, because the editor is also an authenticated user and
-- column grants cannot tell the two apart.
-- ============================================================

-- ------------------------------------------------------------
-- Helpers. SECURITY DEFINER so they can read profiles regardless of the
-- caller's own RLS view, pinned to public to avoid search_path games.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agora_is_editor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.agora_can_write()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (
        is_admin = true
        OR is_premium = true
        OR tier IN ('premium', 'pro', 'arete', 'scholar')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.agora_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim((SELECT handle FROM profiles WHERE id = p_user_id)), ''),
    NULLIF(trim((SELECT user_name FROM user_settings WHERE user_id = p_user_id)), ''),
    'A reader'
  );
$$;

REVOKE ALL ON FUNCTION public.agora_is_editor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agora_can_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agora_display_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agora_is_editor() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agora_can_write() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agora_display_name(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Essays
-- ------------------------------------------------------------

CREATE TABLE agora_essays (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name      text NOT NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 60000),
  excerpt          text CHECK (excerpt IS NULL OR char_length(excerpt) <= 400),
  tags             text[] NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'in_review', 'published', 'returned')),
  editor_note      text,                         -- shown to the author when returned
  is_editorial     boolean NOT NULL DEFAULT false, -- "From the editor"
  counselor_name   text,                         -- a counselor invited to answer
  counselor_answer text,
  comment_count    integer NOT NULL DEFAULT 0,
  submitted_at     timestamptz,
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agora_essays IS
  'The Agora: essays by the editor and by readers. Status is the editorial queue; see the migration header.';

CREATE INDEX agora_essays_published_idx
  ON agora_essays (published_at DESC) WHERE status = 'published';
CREATE INDEX agora_essays_status_idx ON agora_essays (status, submitted_at);
CREATE INDEX agora_essays_author_idx ON agora_essays (author_id, updated_at DESC);
CREATE INDEX agora_essays_tags_idx ON agora_essays USING gin (tags);

-- Guard: what a non-editor may set, and the legal status transitions.
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

CREATE TRIGGER agora_essays_guard
  BEFORE INSERT OR UPDATE ON agora_essays
  FOR EACH ROW EXECUTE FUNCTION public.agora_essays_guard();

ALTER TABLE agora_essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published essays are readable, own and editor see all"
  ON agora_essays FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.agora_is_editor()
  );

CREATE POLICY "Subscribers submit their own essays"
  ON agora_essays FOR INSERT
  WITH CHECK (
    public.agora_is_editor()
    OR (author_id = auth.uid() AND public.agora_can_write())
  );

CREATE POLICY "Authors edit unpublished essays, editor edits all"
  ON agora_essays FOR UPDATE
  USING (
    public.agora_is_editor()
    OR (author_id = auth.uid() AND status IN ('draft', 'in_review', 'returned'))
  )
  WITH CHECK (
    public.agora_is_editor()
    OR author_id = auth.uid()
  );

CREATE POLICY "Authors delete their unsent essays, editor deletes any"
  ON agora_essays FOR DELETE
  USING (
    public.agora_is_editor()
    OR (author_id = auth.uid() AND status IN ('draft', 'returned'))
  );

-- ------------------------------------------------------------
-- Comments
-- ------------------------------------------------------------

CREATE TABLE agora_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id      uuid NOT NULL REFERENCES agora_essays(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_name   text NOT NULL,
  body          text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  is_counselor  boolean NOT NULL DEFAULT false,  -- a counselor's answer, set by the editor
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agora_comments IS
  'Flat comments under a published Agora essay. Subscribers write; is_counselor marks an answer in a counselor''s voice.';

CREATE INDEX agora_comments_essay_idx ON agora_comments (essay_id, created_at);
CREATE INDEX agora_comments_user_idx ON agora_comments (user_id);

CREATE OR REPLACE FUNCTION public.agora_comments_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editor boolean := public.agora_is_editor();
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF NOT editor THEN
      NEW.user_id := auth.uid();
      NEW.author_name := public.agora_display_name(auth.uid());
      NEW.is_counselor := false;
    ELSIF NEW.author_name IS NULL OR trim(NEW.author_name) = '' THEN
      NEW.author_name := public.agora_display_name(NEW.user_id);
    END IF;
  ELSE
    NEW.essay_id := OLD.essay_id;
    NEW.created_at := OLD.created_at;
    IF NOT editor THEN
      NEW.user_id := OLD.user_id;
      NEW.author_name := OLD.author_name;
      NEW.is_counselor := OLD.is_counselor;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agora_comments_guard
  BEFORE INSERT OR UPDATE ON agora_comments
  FOR EACH ROW EXECUTE FUNCTION public.agora_comments_guard();

-- Keep agora_essays.comment_count in step. SECURITY DEFINER because a
-- commenter has no UPDATE right on someone else's essay.
CREATE OR REPLACE FUNCTION public.agora_comment_count_sync()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE agora_essays SET comment_count = comment_count + 1 WHERE id = NEW.essay_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE agora_essays SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.essay_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER agora_comment_count_sync
  AFTER INSERT OR DELETE ON agora_comments
  FOR EACH ROW EXECUTE FUNCTION public.agora_comment_count_sync();

ALTER TABLE agora_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments on published essays are readable"
  ON agora_comments FOR SELECT
  USING (
    public.agora_is_editor()
    OR EXISTS (
      SELECT 1 FROM agora_essays e
      WHERE e.id = agora_comments.essay_id AND e.status = 'published'
    )
  );

CREATE POLICY "Subscribers comment on published essays"
  ON agora_comments FOR INSERT
  WITH CHECK (
    public.agora_can_write()
    AND (public.agora_is_editor() OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM agora_essays e
      WHERE e.id = agora_comments.essay_id AND e.status = 'published'
    )
  );

CREATE POLICY "Readers edit their own comments, editor edits any"
  ON agora_comments FOR UPDATE
  USING (public.agora_is_editor() OR user_id = auth.uid())
  WITH CHECK (public.agora_is_editor() OR user_id = auth.uid());

CREATE POLICY "Readers delete their own comments, editor deletes any"
  ON agora_comments FOR DELETE
  USING (public.agora_is_editor() OR user_id = auth.uid());
