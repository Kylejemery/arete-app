-- Shared Cabinet sessions: session_type on cabinet_conversations + session_participants table.
-- The cabinet sessions table in this project is `cabinet_conversations`.

ALTER TABLE cabinet_conversations
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'solo'
  CHECK (session_type IN ('solo', 'shared'));

CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES cabinet_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_participants_session_id
  ON session_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_session_participants_user_id
  ON session_participants(user_id);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Membership lookup wrapped in a SECURITY DEFINER helper so the SELECT policy
-- does not reference session_participants recursively in its own evaluation
-- (Postgres rejects self-referential subqueries in RLS as infinite recursion).
CREATE OR REPLACE FUNCTION public.is_session_participant(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_participants
    WHERE session_id = p_session_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Users can view participants in their sessions" ON session_participants;
CREATE POLICY "Users can view participants in their sessions"
  ON session_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_session_participant(session_id)
  );

DROP POLICY IF EXISTS "Users can join sessions" ON session_participants;
CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());
