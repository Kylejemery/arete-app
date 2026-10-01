-- ============================================================
-- The Observatory as a journal: readers comment on published pieces.
-- Public to read; sign in, with a handle, to write. One level of replies
-- (a reply to a reply files under the same root, as in library_comments).
--
-- A comment can only be written on a piece that is public, by the same rules
-- the feeds use (server/lib/observatory-journal.js). The handle is always the
-- writer's own, set from profiles by the trigger, never by the client.
--
-- Nothing here is deleted by readers: removing your own comment sets
-- removed_at and clears the body, so replies keep their place. Kyle hides a
-- comment by setting hidden = true; hidden rows are never readable.
-- ============================================================

-- Is this Observatory piece published? Mirrors the feeds' visibility rules.
-- SECURITY DEFINER so the comment policy can ask about tables a reader
-- cannot read directly.
CREATE OR REPLACE FUNCTION public.observatory_piece_is_public(p_kind text, p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_kind
    WHEN 'tension' THEN EXISTS (SELECT 1 FROM philosophical_tensions
      WHERE id = p_id AND status = 'approved' AND observatory_visible)
    WHEN 'inquiry' THEN EXISTS (SELECT 1 FROM open_inquiries
      WHERE id = p_id AND status = 'approved' AND observatory_visible)
    WHEN 'dream' THEN EXISTS (SELECT 1 FROM corpus_dreams
      WHERE id = p_id AND status IN ('approved', 'starred') AND observatory_visible)
    WHEN 'convergence' THEN EXISTS (SELECT 1 FROM convergences
      WHERE id = p_id AND status IN ('approved', 'starred'))
    WHEN 'world' THEN EXISTS (SELECT 1 FROM world_observations
      WHERE id = p_id AND status IN ('approved', 'auto_approved') AND observatory_visible)
    ELSE false
  END;
$$;

CREATE TABLE observatory_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_kind  text NOT NULL CHECK (piece_kind IN ('tension', 'inquiry', 'dream', 'convergence', 'world')),
  piece_id    uuid NOT NULL,
  parent_id   uuid REFERENCES observatory_comments(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  handle      text NOT NULL,
  body        text NOT NULL,
  removed_at  timestamptz,
  hidden      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT observatory_comments_body_check
    CHECK (removed_at IS NOT NULL OR char_length(body) BETWEEN 1 AND 4000)
);

COMMENT ON TABLE observatory_comments IS
  'Reader comments on published Observatory pieces. Readers remove their own (removed_at); Kyle hides (hidden). Never deleted by readers.';

CREATE INDEX observatory_comments_piece_idx ON observatory_comments (piece_kind, piece_id, created_at);
CREATE INDEX observatory_comments_parent_idx ON observatory_comments (parent_id);
CREATE INDEX observatory_comments_user_idx ON observatory_comments (user_id);

-- Inserts: the handle comes from the writer's profile, a reply must sit on the
-- same piece as its parent, and nothing arrives already removed or hidden.
-- Updates by a reader can only remove their own comment.
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
    SELECT handle INTO h FROM profiles WHERE id = NEW.user_id;
    IF h IS NULL OR trim(h) = '' THEN
      RAISE EXCEPTION 'Choose a handle before commenting';
    END IF;
    NEW.handle := h;
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
  NEW.created_at := OLD.created_at;
  NEW.removed_at := now();
  NEW.body := '';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER observatory_comments_guard
  BEFORE INSERT OR UPDATE ON observatory_comments
  FOR EACH ROW EXECUTE FUNCTION public.observatory_comments_guard();

ALTER TABLE observatory_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible Observatory comments"
  ON observatory_comments FOR SELECT
  USING (NOT hidden);

CREATE POLICY "Signed-in readers comment on published pieces"
  ON observatory_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.observatory_piece_is_public(piece_kind, piece_id));

CREATE POLICY "Readers remove their own comments"
  ON observatory_comments FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: readers never delete.

-- Comment counts for the journal index, one row per piece with any live
-- comment. Removed and hidden comments do not count.
CREATE OR REPLACE FUNCTION public.observatory_comment_counts()
RETURNS TABLE (piece_kind text, piece_id uuid, comments bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT piece_kind, piece_id, count(*)
  FROM observatory_comments
  WHERE NOT hidden AND removed_at IS NULL
  GROUP BY piece_kind, piece_id;
$$;

GRANT EXECUTE ON FUNCTION public.observatory_comment_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.observatory_piece_is_public(text, uuid) TO anon, authenticated;
