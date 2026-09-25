-- Personalization run C, Part C2: practices the Cabinet proposed, and the
-- person's answer. The closing voice may suggest one practice from the
-- module registry; nothing changes until the person says yes on the card,
-- and the server checks every rule again at that moment.
--
--   status       offered | accepted | declined | undone | withdrawn
--                (withdrawn: no longer allowed when the person answered)
--   source       cabinet (a conversation) | feature_shipped (Part C4)
--   settings     the settings the proposal would apply
--   prior_state  on accept, [{module_key, row}] for every user_app_config
--                row the acceptance touched, row null when there was none.
--                Undo writes exactly this back.
--
-- Limits (server/lib/proposals.js): one per conversation, two per week,
-- never in the first two turns, a declined or undone module not again for
-- 30 days, registry exclusions (teen, distress in the last 14 days).
-- Written by the server; the owner can read.
CREATE TABLE IF NOT EXISTS adjustment_proposals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key      text        NOT NULL CHECK (module_key ~ '^[a-z][a-z_]{0,39}$'),
  tier            text        NOT NULL CHECK (tier IN ('surface_existing', 'enable_module')),
  source          text        NOT NULL DEFAULT 'cabinet' CHECK (source IN ('cabinet', 'feature_shipped')),
  conversation_id uuid,
  counselor_id    text,
  settings        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status          text        NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'declined', 'undone', 'withdrawn')),
  prior_state     jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  undone_at       timestamptz
);
CREATE INDEX IF NOT EXISTS adjustment_proposals_user_created_idx ON adjustment_proposals (user_id, created_at DESC);
ALTER TABLE adjustment_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own adjustment proposals" ON adjustment_proposals;
CREATE POLICY "Users read own adjustment proposals" ON adjustment_proposals
  FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON adjustment_proposals FROM anon, authenticated;
COMMENT ON TABLE adjustment_proposals IS
  'Practices the Cabinet proposed (run C) and the answer; prior_state lets Undo restore user_app_config exactly. Written by the server; the owner can read.';

ALTER TABLE user_app_config
  ADD CONSTRAINT user_app_config_proposal_fk
  FOREIGN KEY (proposal_id) REFERENCES adjustment_proposals(id) ON DELETE SET NULL;
