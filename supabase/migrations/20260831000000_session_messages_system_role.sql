-- Shared sessions: join/leave notices render inline in the shared thread as
-- role 'system' rows ("Aundrea joined the session"). Widen the role check.
ALTER TABLE session_messages DROP CONSTRAINT session_messages_role_check;
ALTER TABLE session_messages ADD CONSTRAINT session_messages_role_check
  CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text]));
