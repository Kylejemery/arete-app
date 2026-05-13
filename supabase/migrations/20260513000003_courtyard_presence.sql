-- ============================================================
-- The Courtyard — presence table (5-minute TTL by query)
-- ============================================================

CREATE TABLE courtyard_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  handle text NOT NULL,
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE courtyard_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read presence"
  ON courtyard_presence FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upsert own presence"
  ON courtyard_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON courtyard_presence FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX courtyard_presence_last_seen_idx ON courtyard_presence(last_seen DESC);
