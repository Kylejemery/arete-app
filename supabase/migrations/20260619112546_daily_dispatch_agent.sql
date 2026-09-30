-- Daily Dispatch Agent — the fifth autonomous agent in the Arete AI Agent System.
-- Generation (one document/day, stored here) and delivery (per-user push) are
-- decoupled. This migration adds dispatch prefs + the Expo push token to
-- user_settings, the dispatch tables, and seeds the agent config.
--
-- Note: profiles.expo_push_token predates this and was never written by runtime
-- code. Registration now writes the token to user_settings so all dispatch
-- preferences (token, timezone, hour, enabled) live on one row.

-- Dispatch prefs + push token on user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dispatch_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dispatch_hour INT DEFAULT 7
  CHECK (dispatch_hour >= 0 AND dispatch_hour <= 23);
-- dispatch_hour: the hour in the user's local timezone to receive the dispatch.
-- Default 7 = 7 AM. Future feature: user-configurable.

-- Daily dispatch documents (one per day, community-level)
CREATE TABLE IF NOT EXISTS daily_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,           -- full 150-200 word dispatch
  teaser TEXT NOT NULL,         -- first sentence only, for the push notification
  practice TEXT NOT NULL,       -- the closing daily practice (1-2 sentences)
  community_themes JSONB DEFAULT '[]',   -- [{ theme, frequency }]
  corpus_context JSONB DEFAULT '{}',     -- { latestSynthesisTitle, ..., recentNewAuthors }
  generation_model TEXT DEFAULT 'claude-haiku-4-5-20251001',
  prompt_tokens INT,
  completion_tokens INT,
  total_recipients INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  delivery_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_dispatches_date ON daily_dispatches(dispatch_date DESC);

-- Per-user delivery log
CREATE TABLE IF NOT EXISTS dispatch_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES daily_dispatches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'dismissed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(dispatch_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_dispatch_deliveries_dispatch ON dispatch_deliveries(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_deliveries_user ON dispatch_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_deliveries_pending ON dispatch_deliveries(status) WHERE status = 'pending';

-- RLS
ALTER TABLE daily_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read dispatches" ON daily_dispatches;
CREATE POLICY "Users can read dispatches"
  ON daily_dispatches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can read own deliveries" ON dispatch_deliveries;
CREATE POLICY "Users can read own deliveries"
  ON dispatch_deliveries FOR SELECT USING (user_id = auth.uid());

-- Seed dispatch agent config
INSERT INTO agent_config (agent_name, config)
VALUES (
  'dispatch_agent',
  '{
    "enabled": true,
    "generation_hour_utc": 10,
    "delivery_hour_local": 7,
    "max_community_themes": 5,
    "target_word_count": 175,
    "model": "claude-haiku-4-5-20251001"
  }'
)
ON CONFLICT (agent_name) DO NOTHING;
