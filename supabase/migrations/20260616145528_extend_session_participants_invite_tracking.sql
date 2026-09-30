-- Invite tracking on session_participants. status defaults to 'active' so the
-- previous build's join inserts remain active; invite rows are created 'pending'.
ALTER TABLE session_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'declined')),
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_email TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_session_participants_invite_token
  ON session_participants(invite_token)
  WHERE invite_token IS NOT NULL;
