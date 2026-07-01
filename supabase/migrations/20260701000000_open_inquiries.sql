-- Inquiry Agent — Layer above the Synthesis Agent in the Arete philosophical
-- stack. Where synthesis maps what the corpus SAYS, inquiry generates the
-- questions the corpus RAISES but does not answer, pursues them across the full
-- body of texts, and is honest about where the corpus runs out.
--
-- Each inquiry is stored as `pending_review`. Kyle approves / rejects / queues
-- for corpus in the admin dashboard. Approved + observatory_visible inquiries
-- surface publicly in the Observatory. The pursuit text is conjecture — it is
-- NEVER ingested into rag_corpus as source material.

CREATE TABLE IF NOT EXISTS open_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_week DATE NOT NULL,

  -- The question
  question TEXT NOT NULL,           -- the philosophical question the corpus raises
  question_origin TEXT,             -- which passages / authors prompted this question
  source_chunk_ids UUID[],          -- chunk IDs from rag_corpus that seeded the inquiry
  source_authors TEXT[],            -- authors represented in the seed passages

  -- The pursuit
  pursuit_passages JSONB,           -- passages retrieved during the inquiry attempt
  pursuit_text TEXT,                -- the agent's attempt to follow the question
  pursuit_word_count INTEGER,

  -- Honest accounting
  confidence TEXT CHECK (confidence IN ('speculative', 'grounded', 'unresolved')),
  where_corpus_runs_out TEXT,       -- explicit statement of where the corpus cannot go further
  suggested_reading JSONB,          -- authors / works that might help answer this — for corpus queue

  -- Status
  status TEXT DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'queued_for_corpus')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- If approved — surface in Observatory
  observatory_visible BOOLEAN DEFAULT false,

  -- Meta
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_open_inquiries_week ON open_inquiries(inquiry_week);
CREATE INDEX IF NOT EXISTS idx_open_inquiries_status ON open_inquiries(status);

-- RLS — no policies; service role only (Railway agent writes, admin API reads
-- via the service-role admin client behind ADMIN_EMAIL-gated routes). The
-- public Observatory endpoint reads with the service role too, filtered to
-- approved + observatory_visible.
ALTER TABLE open_inquiries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Seed-passage sampler for Pass 1 (question generation).
--
-- Returns a randomized pool of PRIMARY passages the agent then partitions into
-- philosophically diverse inquiry seeds (>=2 authors, >=2 traditions) in JS.
-- Deliberately excludes:
--   * the corpus's own syntheses (text_type='synthesis' / author 'Arete
--     Synthesis') — inquiry seeds on primary texts, never on conjecture
--   * passages already connected as sources in an APPROVED synthesis document —
--     so inquiry explores ground synthesis has not already worked over
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION inquiry_seed_pool(pool_size INT DEFAULT 240)
RETURNS TABLE (id UUID, chunk_text TEXT, author TEXT, work TEXT, text_type TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT rc.id, rc.chunk_text, rc.author, rc.work, rc.text_type
  FROM rag_corpus rc
  WHERE COALESCE(rc.text_type, 'primary') <> 'synthesis'
    AND rc.author IS NOT NULL
    AND rc.author <> 'Arete Synthesis'
    AND rc.chunk_text IS NOT NULL
    AND rc.id NOT IN (
      SELECT x
      FROM (
        SELECT UNNEST(source_chunk_ids) AS x
        FROM synthesis_documents
        WHERE status = 'approved' AND source_chunk_ids IS NOT NULL
      ) s
      WHERE x IS NOT NULL
    )
  ORDER BY RANDOM()
  LIMIT pool_size;
$$;

GRANT EXECUTE ON FUNCTION inquiry_seed_pool(INT) TO service_role;

-- ---------------------------------------------------------------------------
-- Agent config row — lets the admin dashboard tune the agent without a redeploy.
-- ---------------------------------------------------------------------------
INSERT INTO agent_config (agent_name, config) VALUES (
  'inquiry-agent',
  '{
    "enabled": true,
    "run_hour_utc": 6,
    "run_minute_utc": 30,
    "run_day": "monday",
    "model": "claude-sonnet-4-6",
    "inquiries_per_run": 3,
    "seed_passages_per_inquiry": 5,
    "pursuit_retrieval_count": 12,
    "pursuit_min_authors": 3,
    "pursuit_max_words": 600
  }'
) ON CONFLICT (agent_name) DO NOTHING;
