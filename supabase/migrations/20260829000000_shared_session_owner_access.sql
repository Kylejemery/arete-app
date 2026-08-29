-- Shared sessions: the inviter could not read session_messages after their
-- partner accepted. The invite flow creates the session_participants row with
-- the inviter's id as a placeholder, and /api/sessions/accept overwrites that
-- row's user_id with the partner's — leaving the inviter with no participant
-- row at all. is_session_participant() then fails for the inviter, RLS blocks
-- their SELECT, and realtime silently delivers nothing.
--
-- The session id is a cabinet_conversations row owned by the inviter, so
-- ownership of the conversation is participation. Fold that into the helper —
-- every policy built on it (session_participants, session_messages) inherits
-- the fix.
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
  ) OR EXISTS (
    SELECT 1 FROM cabinet_conversations
    WHERE id = p_session_id AND user_id = auth.uid()
  );
$$;

-- Ending a shared session: either side may remove participant rows for a
-- session they belong to — the partner (their own row) or the conversation
-- owner (any row on their session). Without this the client had no way to
-- end a shared session server-side, so restored state resurrected it.
DROP POLICY IF EXISTS "Participants can leave sessions" ON session_participants;
CREATE POLICY "Participants can leave sessions"
  ON session_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cabinet_conversations
      WHERE id = session_id AND user_id = auth.uid()
    )
  );
