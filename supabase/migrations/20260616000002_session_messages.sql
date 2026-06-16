-- Per-message rows for shared Cabinet sessions, so realtime can broadcast each
-- INSERT to both participants. Scaffolding: the send pipeline is NOT yet routed
-- through this table (solo sessions still use cabinet_conversations.messages
-- jsonb); the mobile client subscribes here in advance.
CREATE TABLE IF NOT EXISTS session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES cabinet_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  counselor_id TEXT,
  counselor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id
  ON session_messages(session_id);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- Participants of the session can read its messages. Reuses the SECURITY
-- DEFINER helper added with session_participants to avoid RLS recursion.
DROP POLICY IF EXISTS "Participants can view session messages" ON session_messages;
CREATE POLICY "Participants can view session messages"
  ON session_messages FOR SELECT
  USING (public.is_session_participant(session_id));

-- A participant can insert their own messages into a session they belong to.
DROP POLICY IF EXISTS "Participants can insert session messages" ON session_messages;
CREATE POLICY "Participants can insert session messages"
  ON session_messages FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_session_participant(session_id));

-- Broadcast inserts over Supabase realtime. Guard against re-adding on reruns.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
  END IF;
END $$;
