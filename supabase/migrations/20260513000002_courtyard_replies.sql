-- ============================================================
-- The Courtyard — replies table + reply_count trigger
-- ============================================================

CREATE TABLE courtyard_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES courtyard_threads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  handle text NOT NULL,
  body text NOT NULL,
  is_stoa boolean DEFAULT false,
  stoa_chunks jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courtyard_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read replies"
  ON courtyard_replies FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own replies"
  ON courtyard_replies FOR INSERT WITH CHECK (auth.uid() = author_id OR is_stoa = true);

CREATE INDEX courtyard_replies_thread_id_idx ON courtyard_replies(thread_id, created_at ASC);

-- Trigger: increment reply_count on parent thread when a reply is inserted
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courtyard_threads
  SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reply_insert
  AFTER INSERT ON courtyard_replies
  FOR EACH ROW EXECUTE FUNCTION increment_reply_count();
