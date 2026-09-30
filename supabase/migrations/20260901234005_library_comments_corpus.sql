-- ============================================================
-- Marginalia: the corpus may weigh in on a passage as a note of its own.
-- A corpus note has no user_id; it records who asked for it and the
-- passages it drew on. Written only by the backend (service role); readers
-- keep writing their own notes through RLS as before.
-- ============================================================

ALTER TABLE library_comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE library_comments
  ADD COLUMN is_corpus    boolean NOT NULL DEFAULT false,
  ADD COLUMN requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN sources      jsonb;

ALTER TABLE library_comments
  ADD CONSTRAINT library_comments_author_present
  CHECK (is_corpus OR user_id IS NOT NULL);

DROP POLICY "Signed-in readers write their own notes" ON library_comments;
CREATE POLICY "Signed-in readers write their own notes"
  ON library_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_corpus = false);

DROP POLICY "Readers delete their own notes" ON library_comments;
CREATE POLICY "Readers delete their own notes"
  ON library_comments FOR DELETE
  USING (auth.uid() = user_id OR (is_corpus AND auth.uid() = requested_by));
