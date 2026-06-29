-- Corpus passage source-of-record. One row per manually-ingested passage,
-- holding the ORIGINAL pasted text (often copyrighted secondary material), the
-- summary that was actually ingested, and the rag_corpus chunk ids it produced.
-- Backend/admin-only: RLS enabled with NO policies, so the anon key cannot read
-- it while the service-role admin client bypasses RLS. The public Reading Room
-- only reads rag_corpus, so source_text can never surface there.

CREATE TABLE IF NOT EXISTS corpus_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author TEXT NOT NULL,
  work TEXT NOT NULL,
  section_label TEXT,                 -- e.g. "Chapter 3, pp. 81–84"
  language TEXT DEFAULT 'en',         -- 'en', 'grc', 'lat'
  course_relevance TEXT,
  difficulty TEXT,
  mode TEXT NOT NULL DEFAULT 'summary'
    CHECK (mode IN ('summary', 'verbatim')),
  text_type TEXT NOT NULL DEFAULT 'summary'
    CHECK (text_type IN ('summary', 'public_domain')),  -- mirrors rag_corpus.text_type
  source_text TEXT,                   -- original pasted passage (admin-only)
  summary_text TEXT,                  -- what was ingested into rag_corpus
  rag_chunk_ids UUID[],               -- chunks produced, for clean delete/replace
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corpus_sources_author_work
  ON corpus_sources(author, work);

ALTER TABLE corpus_sources ENABLE ROW LEVEL SECURITY;
