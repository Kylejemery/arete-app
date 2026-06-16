-- Nightly RAG Corpus Agent: source queue + run log. Backend-only tables
-- (Railway service role); RLS enabled with no policies so the anon key
-- cannot touch them while the service role bypasses RLS.

-- Queue of sources to ingest
CREATE TABLE IF NOT EXISTS corpus_ingestion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT,                    -- URL to fetch (Gutenberg, PerseusDL raw, etc.)
  author TEXT NOT NULL,
  work TEXT NOT NULL,                 -- title of the work
  language TEXT DEFAULT 'en',         -- 'en', 'grc' (ancient Greek), 'lat' (Latin)
  course_relevance TEXT,              -- e.g. 'PHIL 701', nullable
  difficulty TEXT,                    -- e.g. 'Introductory', nullable
  source_type TEXT NOT NULL DEFAULT 'public_domain'
    CHECK (source_type IN ('public_domain', 'original_language', 'summary')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed', 'skipped')),
  priority INT NOT NULL DEFAULT 100,  -- lower = higher priority
  notes TEXT,
  error_message TEXT,
  chunks_ingested INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_corpus_queue_status_priority
  ON corpus_ingestion_queue(status, priority);

-- Natural key so seeding / queue-add can upsert without duplicating a work.
CREATE UNIQUE INDEX IF NOT EXISTS uq_corpus_queue_author_work
  ON corpus_ingestion_queue(author, work);

-- Log of each nightly run for the coverage report
CREATE TABLE IF NOT EXISTS corpus_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_completed_at TIMESTAMPTZ,
  sources_processed INT DEFAULT 0,
  sources_succeeded INT DEFAULT 0,
  sources_failed INT DEFAULT 0,
  total_chunks_added INT DEFAULT 0,
  coverage_report JSONB,              -- author -> chunk count snapshot
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed'))
);

ALTER TABLE corpus_ingestion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_ingestion_runs ENABLE ROW LEVEL SECURITY;
