-- ============================================================
-- The Library of Arete — marginalia. Readers leave notes on a passage of a
-- primary text and reply to one another. Anchored to (text, folio, paragraph)
-- with the paragraph's opening words kept so a note can be re-seated if the
-- reader pipeline re-paragraphs a page. Public to read (the Library is
-- public); sign in to write.
-- ============================================================

CREATE TABLE library_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_author   text NOT NULL,                 -- rag_corpus.author of the text
  text_work     text NOT NULL,                 -- rag_corpus.work of the text
  page          integer NOT NULL CHECK (page >= 0),
  para_index    integer NOT NULL CHECK (para_index >= 0),
  anchor_text   text NOT NULL DEFAULT '',      -- opening words of the paragraph
  quote         text,                          -- the passage the reader selected
  parent_id     uuid REFERENCES library_comments(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  handle        text NOT NULL,
  body          text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE library_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read library notes"
  ON library_comments FOR SELECT USING (true);

CREATE POLICY "Signed-in readers write their own notes"
  ON library_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Readers edit their own notes"
  ON library_comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Readers delete their own notes"
  ON library_comments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX library_comments_text_page_idx
  ON library_comments (text_author, text_work, page, para_index, created_at);
CREATE INDEX library_comments_parent_idx ON library_comments (parent_id);
CREATE INDEX library_comments_user_idx ON library_comments (user_id);
