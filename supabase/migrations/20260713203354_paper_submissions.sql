-- Paper Agent — scholarly papers enter the corpus as SUMMARIES, never verbatim.
-- Kyle queues an open-access philosophy paper (by URL or PDF upload); the
-- agent reads the PDF and writes a structured scholarly summary; Kyle reviews
-- it in the admin dashboard; approval ingests ONLY the summary into rag_corpus
-- (text_type 'paper_summary'). The paper's own text never enters the corpus:
-- most open-access papers are still copyrighted, and the corpus voice stays
-- consistent when modern scholarship arrives pre-digested. Same review
-- posture as syntheses: nothing reaches retrieval without a human yes.

CREATE TABLE IF NOT EXISTS paper_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Citation metadata. author/work are what rag_corpus rows will carry;
  -- Kyle supplies them at queue time and can correct them against what the
  -- agent detects in the PDF before approving.
  author TEXT NOT NULL,               -- paper author(s), e.g. "Nussbaum, Martha"
  work TEXT NOT NULL,                 -- paper title
  year TEXT,
  venue TEXT,                         -- journal / repository, optional

  -- Where the PDF lives. Exactly one of these is set: source_url for papers
  -- queued by link, storage_path (bucket 'papers') for direct uploads.
  source_url TEXT,
  storage_path TEXT,

  -- What the agent produced. detected_* let Kyle spot metadata mismatches
  -- (wrong paper at the URL, misattributed authorship) during review.
  summary_text TEXT,                  -- the ONLY text that will be ingested
  detected_title TEXT,
  detected_authors TEXT,
  key_concepts TEXT[],                -- agent-suggested concepts, review aid only
  page_count INTEGER,
  model_used TEXT,

  -- queued → summarizing → pending_review → (approved) → ingested | rejected
  -- 'failed' rows keep error_message and can be re-queued from the dashboard.
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'summarizing', 'pending_review', 'ingested', 'rejected', 'failed'
  )),
  error_message TEXT,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Chunks the summary produced in rag_corpus, for clean de-ingest.
  rag_chunk_ids UUID[],
  ingested_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_submissions_status ON paper_submissions(status);

-- RLS on with NO policies — service role only (Railway agent writes, admin
-- API reads/writes via the service-role client behind ADMIN_EMAIL-gated
-- routes). The anon key can never read a paper or its summary.
ALTER TABLE paper_submissions ENABLE ROW LEVEL SECURITY;

-- Private bucket for uploaded PDFs. No storage policies: anon/authenticated
-- clients cannot read or write it; uploads go through short-lived signed
-- upload URLs minted by the admin API, and the agent downloads with the
-- service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('papers', 'papers', false)
ON CONFLICT (id) DO NOTHING;

-- Agent config row — dashboard-tunable without a redeploy, like the others.
INSERT INTO agent_config (agent_name, config) VALUES (
  'paper-agent',
  '{
    "enabled": true,
    "model": "claude-sonnet-4-6",
    "summary_min_words": 500,
    "summary_max_words": 900,
    "max_pdf_mb": 20,
    "batch_size": 2
  }'
) ON CONFLICT (agent_name) DO NOTHING;
