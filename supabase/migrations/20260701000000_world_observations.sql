-- World Agent — the first outward-facing agent in the Arete AI Agent System.
-- Every other agent reads inward (corpus, users, itself). The World Agent reads
-- the outside world weekly (web search over a curated set of philosophically
-- relevant categories), selects the single most relevant signal, and asks what
-- the corpus has to say about it right now. Its digest feeds the Daily Dispatch,
-- the Observatory, and eventually the Dreaming Agent.
--
-- Runs Mondays 03:30 UTC — before the other agents and the 10:00 UTC dispatch.
-- One observation per week (UNIQUE observation_week); the agent upserts.

CREATE TABLE IF NOT EXISTS world_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_week DATE NOT NULL,

  -- What the agent noticed
  world_signals JSONB,              -- array of { signal, source_category, philosophical_relevance }
  dominant_signal TEXT,             -- the single most philosophically relevant thing this week

  -- Philosophical response
  corpus_response TEXT,             -- what the corpus has to say about the dominant signal (400-600 words)
  relevant_passages JSONB,          -- passages from rag_corpus that ground the response
  relevant_authors TEXT[],          -- authors whose work is most relevant this week

  -- Tensions surfaced
  world_corpus_tension TEXT,        -- where the world contradicts or challenges what the corpus teaches

  -- Dispatch injection
  dispatch_context TEXT,            -- 100-150 word digest for Daily Dispatch generation

  -- Status
  status TEXT DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'auto_approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,

  -- Observatory
  observatory_visible BOOLEAN DEFAULT false,

  -- Meta
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER,

  UNIQUE(observation_week)
);

CREATE INDEX IF NOT EXISTS idx_world_observations_week ON world_observations(observation_week);
CREATE INDEX IF NOT EXISTS idx_world_observations_status ON world_observations(status);

-- RLS: the server reads/writes with the service-role key (bypasses RLS). The
-- only direct-from-client path is the Observatory, which the server also serves
-- with the service role — but enable RLS and allow anon SELECT of only the
-- approved, observatory-visible rows so nothing sensitive leaks if queried directly.
ALTER TABLE world_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible observations" ON world_observations;
CREATE POLICY "Public can read visible observations"
  ON world_observations FOR SELECT
  USING (observatory_visible = true AND status IN ('approved', 'auto_approved'));

-- Seed the world-agent config (part 6 of the spec).
INSERT INTO agent_config (agent_name, config) VALUES (
  'world-agent',
  '{
    "enabled": true,
    "run_hour_utc": 3,
    "run_minute_utc": 30,
    "run_day": "monday",
    "model": "claude-sonnet-4-6",
    "signals_per_category": 2,
    "corpus_retrieval_count": 10,
    "corpus_response_max_words": 600,
    "dispatch_context_max_words": 150,
    "auto_approve_scientific_signals": true
  }'
) ON CONFLICT (agent_name) DO NOTHING;
