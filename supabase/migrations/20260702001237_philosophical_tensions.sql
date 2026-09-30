-- Tension Agent — hunts unresolved philosophical contradictions across the
-- corpus: places where two or more thinkers, read together, produce a genuine
-- philosophical problem that neither resolves.
--
-- The Synthesis Agent carries the guardrail "never resolve genuine
-- philosophical tensions — surface them." This agent inverts that guardrail
-- into a primary function: it seeks tension deliberately, names it precisely,
-- and holds it open. A corpus that only agrees with itself is a doctrine; a
-- corpus that holds live contradictions is a tradition.
--
-- Every tension is stored as `pending_review`. Kyle approves / rejects /
-- merges in the admin dashboard. Approved + observatory_visible tensions
-- surface publicly in the Observatory. Genuine tensions are NEVER resolved.

CREATE TABLE IF NOT EXISTS philosophical_tensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tension_week DATE NOT NULL,

  -- The tension itself
  title TEXT NOT NULL,              -- evocative name, e.g. "The Mirror We Refuse"
  tension_statement TEXT NOT NULL,  -- one precise paragraph stating the contradiction
  position_a JSONB,                 -- { author, work, position_summary, key_passages: [chunk_ids] }
  position_b JSONB,                 -- { author, work, position_summary, key_passages: [chunk_ids] }
  additional_positions JSONB,       -- optional third+ voices, same shape

  -- Why it matters
  lived_stakes TEXT,                -- what this tension means for how a person actually lives (150-250 words)
  user_theme_connections TEXT[],    -- journal_analysis themes this tension connects to, if any

  -- Honest classification
  tension_type TEXT CHECK (tension_type IN (
    'genuine_contradiction',        -- the positions cannot both be true
    'contextual_divergence',        -- positions differ because circumstances differ
    'terminological',               -- apparent conflict dissolves under careful definition
    'developmental'                 -- same thinker or tradition at different stages
  )),
  is_resolvable TEXT CHECK (is_resolvable IN ('no', 'possibly', 'apparent_only')),
  resolution_note TEXT,             -- if apparent_only or terminological: why; otherwise null

  -- Source grounding
  source_chunk_ids UUID[],
  source_authors TEXT[],

  -- Status
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'merged')),
  merged_into UUID REFERENCES philosophical_tensions(id),  -- if duplicate of existing tension
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Observatory
  observatory_visible BOOLEAN DEFAULT false,

  -- Meta
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_philosophical_tensions_week ON philosophical_tensions(tension_week);
CREATE INDEX IF NOT EXISTS idx_philosophical_tensions_status ON philosophical_tensions(status);

-- RLS — no policies; service role only (Railway agent writes, admin API reads
-- via the service-role admin client behind ADMIN_EMAIL-gated routes). The
-- public Observatory endpoint reads with the service role too, filtered to
-- approved + observatory_visible.
ALTER TABLE philosophical_tensions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Agent config row — lets the admin dashboard tune the agent without a redeploy.
-- ---------------------------------------------------------------------------
INSERT INTO agent_config (agent_name, config) VALUES (
  'tension-agent',
  '{
    "enabled": true,
    "run_hour_utc": 5,
    "run_minute_utc": 30,
    "run_day": "monday",
    "model": "claude-sonnet-4-6",
    "candidate_pairings_per_run": 4,
    "passages_per_candidate": 8,
    "lived_stakes_max_words": 250,
    "user_theme_lookback_days": 30
  }'
) ON CONFLICT (agent_name) DO NOTHING;
