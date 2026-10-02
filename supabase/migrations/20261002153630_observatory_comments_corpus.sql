-- ============================================================
-- The corpus answers reader comments on Observatory pieces.
--
-- A corpus reply has no user_id: it records who prompted it (requested_by)
-- and the passages it drew on (sources), as corpus notes do in
-- library_comments. Only the backend writes one (service role); readers keep
-- writing their own comments through RLS, and can no longer insert a row
-- that claims to be the corpus.
--
-- Corpus replies are part of the conversation but not of its size: the
-- journal's comment counts are readers only.
-- ============================================================

ALTER TABLE observatory_comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE observatory_comments
  ADD COLUMN is_corpus    boolean NOT NULL DEFAULT false,
  ADD COLUMN requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN sources      jsonb;

ALTER TABLE observatory_comments
  ADD CONSTRAINT observatory_comments_author_present
  CHECK (is_corpus OR user_id IS NOT NULL);

-- One corpus reply per comment.
CREATE UNIQUE INDEX observatory_comments_one_corpus_reply
  ON observatory_comments (parent_id) WHERE is_corpus;

ALTER POLICY "Signed-in readers comment on published pieces"
  ON observatory_comments
  WITH CHECK (
    auth.uid() = user_id
    AND is_corpus = false
    AND public.observatory_piece_is_public(piece_kind, piece_id)
  );

-- The guard, as before, plus the corpus: a corpus row is written only by the
-- backend (no reader uid), always as a reply, and keeps the handle it is
-- given. Every reader row still takes its handle from the writer's profile.
CREATE OR REPLACE FUNCTION public.observatory_comments_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h text;
  parent observatory_comments%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_corpus THEN
      IF auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'Only the backend writes as the corpus';
      END IF;
      IF NEW.parent_id IS NULL THEN
        RAISE EXCEPTION 'The corpus only replies';
      END IF;
      NEW.user_id := NULL;
      IF NEW.handle IS NULL OR trim(NEW.handle) = '' THEN
        NEW.handle := 'The Corpus';
      END IF;
    ELSE
      SELECT handle INTO h FROM profiles WHERE id = NEW.user_id;
      IF h IS NULL OR trim(h) = '' THEN
        RAISE EXCEPTION 'Choose a handle before commenting';
      END IF;
      NEW.handle := h;
      NEW.requested_by := NULL;
      NEW.sources := NULL;
    END IF;
    NEW.removed_at := NULL;
    NEW.hidden := false;
    NEW.created_at := now();
    NEW.updated_at := now();
    IF NEW.parent_id IS NOT NULL THEN
      SELECT * INTO parent FROM observatory_comments WHERE id = NEW.parent_id;
      IF NOT FOUND OR parent.piece_kind <> NEW.piece_kind OR parent.piece_id <> NEW.piece_id THEN
        RAISE EXCEPTION 'A reply must be on the same piece as the comment it answers';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE. Moderation (the service role or the SQL editor, neither of which
  -- carries a reader's uid) may change hidden; a reader may only set
  -- removed_at on their own comment, which clears the body.
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF NEW.removed_at IS NULL OR OLD.removed_at IS NOT NULL THEN
    RAISE EXCEPTION 'A comment can only be removed, not edited';
  END IF;
  NEW.id := OLD.id;
  NEW.piece_kind := OLD.piece_kind;
  NEW.piece_id := OLD.piece_id;
  NEW.parent_id := OLD.parent_id;
  NEW.user_id := OLD.user_id;
  NEW.handle := OLD.handle;
  NEW.hidden := OLD.hidden;
  NEW.is_corpus := OLD.is_corpus;
  NEW.requested_by := OLD.requested_by;
  NEW.sources := OLD.sources;
  NEW.created_at := OLD.created_at;
  NEW.removed_at := now();
  NEW.body := '';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Readers only in the journal's counts.
CREATE OR REPLACE FUNCTION public.observatory_comment_counts()
RETURNS TABLE (piece_kind text, piece_id uuid, comments bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT piece_kind, piece_id, count(*)
  FROM observatory_comments
  WHERE NOT hidden AND removed_at IS NULL AND NOT is_corpus
  GROUP BY piece_kind, piece_id;
$$;
