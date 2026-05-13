-- ============================================================
-- The Courtyard — threads table
-- ============================================================

CREATE TABLE courtyard_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  handle text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  stoa_reply text,
  stoa_chunks jsonb,
  reply_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courtyard_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read threads"
  ON courtyard_threads FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own threads"
  ON courtyard_threads FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own threads"
  ON courtyard_threads FOR UPDATE USING (auth.uid() = author_id);

CREATE INDEX courtyard_threads_updated_at_idx ON courtyard_threads(updated_at DESC);
CREATE INDEX courtyard_threads_author_id_idx  ON courtyard_threads(author_id);
