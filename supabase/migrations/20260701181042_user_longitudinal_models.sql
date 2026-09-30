-- Longitudinal User Model — Layer 5 (Memory) of the Arete AI Agent System.
--
-- A living, evolving philosophical portrait per user, rebuilt weekly from the
-- accumulated journal_analysis history. user_longitudinal_models holds the
-- current model (one row per user, a living document); longitudinal_model_history
-- preserves prior states so we can see how a user's portrait changed over time.

CREATE TABLE IF NOT EXISTS user_longitudinal_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core philosophical portrait (theme classifications, computed programmatically)
  persistent_themes JSONB,         -- themes that have appeared in 3+ weeks of analysis
  emerging_themes JSONB,           -- themes appearing for first time or second time
  fading_themes JSONB,             -- themes that were persistent but absent last 3 weeks

  -- Growth edges (Claude-generated: where the user is stuck / returning unresolved)
  growth_edges JSONB,

  -- Practice patterns
  journal_consistency_score NUMERIC(5,2),  -- 0-100, rolling 8-week average
  cabinet_engagement_score NUMERIC(5,2),   -- 0-100, rolling 8-week average
  preferred_entry_types JSONB,             -- which journal entry types they use most
  counselor_affinity JSONB,                -- which counselors appear most in their Cabinet threads

  -- Philosophical baseline (Claude-inferred)
  dominant_philosophical_orientation TEXT, -- stoic, contemplative, pragmatic, etc
  emotional_tone_baseline TEXT,            -- general register of their writing over time
  self_disclosure_depth TEXT,              -- surface / moderate / deep

  -- Longitudinal narrative
  philosophical_portrait TEXT,     -- 300-500 word prose portrait of the user's journey
  portrait_updated_at TIMESTAMPTZ,

  -- Week-over-week delta
  delta_summary TEXT,              -- what changed meaningfully this week vs the prior model
  weeks_analyzed INTEGER DEFAULT 0,
  first_analyzed_at TIMESTAMPTZ,
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Meta
  model_used TEXT,
  generation_duration_ms INTEGER,

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_longitudinal_models_user_id
  ON user_longitudinal_models(user_id);

-- Prior model states, snapshotted before each weekly overwrite.
CREATE TABLE IF NOT EXISTS longitudinal_model_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  model_snapshot JSONB NOT NULL,  -- full serialized model at this point in time
  delta_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_history_user_id
  ON longitudinal_model_history(user_id);

-- Both tables are service-role only (written by the cron agent, read by the
-- counselor route and the admin aggregate endpoint — both service-role). Enable
-- RLS with no policies so anon/authenticated clients cannot read another user's
-- portrait directly. When the user-facing mobile view lands, add a
-- "user_id = auth.uid()" SELECT policy then.
ALTER TABLE user_longitudinal_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE longitudinal_model_history ENABLE ROW LEVEL SECURITY;

-- Agent configuration row (idempotent).
INSERT INTO agent_config (agent_name, config) VALUES (
  'longitudinal-user-model',
  '{
    "enabled": true,
    "run_hour_utc": 4,
    "run_minute_utc": 30,
    "run_day": "monday",
    "model": "claude-sonnet-4-6",
    "min_weeks_required": 4,
    "portrait_max_words": 500,
    "theme_persistence_threshold": 3,
    "theme_persistence_window_weeks": 8
  }'
) ON CONFLICT (agent_name) DO NOTHING;
