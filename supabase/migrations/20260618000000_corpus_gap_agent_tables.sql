-- Coverage Gap Agent — schema for the third autonomous agent in the Arete
-- AI Agent System. Adds the philosophical significance reference map, the
-- weekly gap reports, and the concept→passage approval (learning) layer.
--
-- All three tables are backend-only: RLS is enabled with no policies, so only
-- the service role (which bypasses RLS) can read or write them.

-- Philosophical significance reference map
-- Seeded from server/data/significance-map.json, read by the agent each run.
CREATE TABLE IF NOT EXISTS corpus_significance_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author TEXT NOT NULL,
  work TEXT NOT NULL,
  tier INT NOT NULL CHECK (tier IN (1, 2, 3)),
  chunk_threshold INT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'public_domain'
    CHECK (source_type IN ('public_domain', 'summary_only', 'original_language')),
  notes TEXT,
  recommended_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(author, work)
);

-- Weekly gap reports
CREATE TABLE IF NOT EXISTS corpus_gap_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_week DATE NOT NULL UNIQUE,
  structural_gaps JSONB NOT NULL DEFAULT '[]',
  demand_gaps JSONB NOT NULL DEFAULT '[]',
  recommended_additions JSONB NOT NULL DEFAULT '[]',
  -- Each addition: { author, work, url, priority, reason,
  --                  source_type, approved: null|true|false, queued: false }
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'reviewed', 'queued')),
  run_duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Concept-passage approval map (the learning layer)
CREATE TABLE IF NOT EXISTS concept_passage_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept TEXT NOT NULL,
  chunk_id UUID REFERENCES rag_corpus(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  work TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  approved BOOLEAN,           -- null=unreviewed, true=approved, false=rejected
  approved_by TEXT DEFAULT 'kyle',
  approved_at TIMESTAMPTZ,
  similarity_score FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(concept, chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_passage_concept
  ON concept_passage_map(concept);

CREATE INDEX IF NOT EXISTS idx_concept_passage_approved
  ON concept_passage_map(approved)
  WHERE approved IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gap_reports_week
  ON corpus_gap_reports(report_week DESC);

-- RLS: all three tables are backend-only. No policies — service role bypasses RLS.
ALTER TABLE corpus_significance_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_passage_map ENABLE ROW LEVEL SECURITY;

-- Semantic search variant that also returns the rag_corpus row id, which the
-- gap agent needs to populate concept_passage_map.chunk_id (the existing
-- match_rag_corpus RPC intentionally omits id). Same distance metric and
-- language default (all corpus rows are 'english').
CREATE OR REPLACE FUNCTION public.match_rag_corpus_ids(
  query_embedding vector,
  match_count integer DEFAULT 8,
  filter_language text DEFAULT 'english'
)
RETURNS TABLE(
  id uuid,
  chunk_text text,
  author text,
  work text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $function$
  select
    rag_corpus.id,
    chunk_text,
    author,
    work,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    rag_corpus.language = filter_language
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$function$;
