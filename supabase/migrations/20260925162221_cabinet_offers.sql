-- Activation plan, Parts 6 and 9: offers the Cabinet makes at the end of a
-- reply, which the user accepts or declines on a card.
--
--   goal    the counselor offers to save a concrete intention the user
--           stated as a goal (at most one offer per conversation). Accepting
--           creates the goal with source = 'cabinet'. Nothing is created
--           without acceptance.
--   scroll  "Would you like a scroll on this?" after a conversation of at
--           least six messages (at most one offer per user per 72 hours).
--           Accepting writes a scroll through the existing pipeline,
--           attributed to the counselor who spoke most.
--
-- payload holds the offered goal (title, category, target_date) or the
-- scroll's counselor. result_id is the goal or scroll that acceptance
-- created. The owner can read their rows; the server writes them.
CREATE TABLE IF NOT EXISTS cabinet_offers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            text        NOT NULL CHECK (kind IN ('goal', 'scroll')),
  conversation_id uuid,
  counselor_id    text,
  payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status          text        NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'declined')),
  result_id       uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz
);
CREATE INDEX IF NOT EXISTS cabinet_offers_user_kind_created_idx ON cabinet_offers (user_id, kind, created_at DESC);
ALTER TABLE cabinet_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own cabinet offers" ON cabinet_offers;
CREATE POLICY "Users read own cabinet offers" ON cabinet_offers
  FOR SELECT USING (auth.uid() = user_id);
COMMENT ON TABLE cabinet_offers IS
  'Goal and scroll offers the Cabinet made at the end of a reply, and the user''s answer. Written by the server (service role); the owner can read.';
