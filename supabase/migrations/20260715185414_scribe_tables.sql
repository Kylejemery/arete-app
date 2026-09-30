-- Scribe — the Arete writing agent. Schema for projects, notes, sources,
-- private full-text source chunks, drafts, and style profiles.
--
-- Design decisions (see docs/scribe-discovery.md):
--  * Papers enter through the EXISTING paper_submissions flow; scribe_sources
--    is a thin bibliographic overlay (citation_key for APA/Chicago rendering),
--    linked by paper_submission_id when the source came through that flow.
--  * scribe_source_chunks holds PRIVATE full-text chunks (opt-in per source,
--    "quotable") so verbatim quotes can be verified. Never ingested into
--    rag_corpus, never published beyond fair-use quotes in drafts.
--  * Same embedding model/dim as rag_corpus: text-embedding-3-small, 1536.
--  * All tables are backend-only: RLS enabled with no policies, so only the
--    service role (which bypasses RLS) can read or write them — the same
--    convention as the agent tables.

CREATE TABLE IF NOT EXISTS scribe_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'published', 'archived')),
  format TEXT NOT NULL DEFAULT 'substack'
    CHECK (format IN ('article', 'paper', 'substack', 'social')),
  -- Stage A output (editable brief): { thesis, key_claims: [], audience, gaps: [] }
  brief JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw thoughts; append-only per project, reorderable via position.
CREATE TABLE IF NOT EXISTS scribe_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES scribe_projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scribe_notes_project
  ON scribe_notes(project_id, position);

-- Bibliographic layer for citable modern sources. When the PDF came through
-- the papers flow, paper_submission_id links back to it (storage_path lives
-- there); file_path covers sources added outside that flow.
CREATE TABLE IF NOT EXISTS scribe_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'paper'
    CHECK (kind IN ('paper', 'book', 'web')),
  title TEXT NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]',      -- [{ family, given }]
  year TEXT,
  venue TEXT,
  doi TEXT,
  url TEXT,
  citation_key TEXT NOT NULL UNIQUE,        -- e.g. 'hadot1995'
  paper_submission_id UUID REFERENCES paper_submissions(id) ON DELETE SET NULL,
  file_path TEXT,                           -- storage path when not via papers flow
  quotable BOOLEAN NOT NULL DEFAULT FALSE,  -- full text ingested into scribe_source_chunks
  ingested_at TIMESTAMPTZ,                  -- when full-text chunks were created
  ingest_report JSONB,                      -- { pages_parsed, chunks_created, failed_pages: [] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Private full-text chunks for grounding and verbatim-quote verification.
-- Mirrors rag_corpus conventions: 400-word chunks, 50 overlap,
-- text-embedding-3-small (1536 dims).
CREATE TABLE IF NOT EXISTS scribe_source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES scribe_sources(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  page_hint INT,                            -- 1-based page the chunk starts on
  section_hint TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_scribe_source_chunks_source
  ON scribe_source_chunks(source_id);

-- Each generation is a new version row; drafts are immutable once written.
-- citations: [{ marker, chunk_table: 'rag_corpus'|'scribe_source_chunks',
--               chunk_id, locator, quote: bool }]
-- verification: { checked_at, results: [{ marker, chunk_resolves, quote_match,
--                 locator: 'verified'|'unverified'|'mismatch',
--                 support: 'supported'|'partial'|'not'|null, note }] }
CREATE TABLE IF NOT EXISTS scribe_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES scribe_projects(id) ON DELETE CASCADE,
  version INT NOT NULL,
  format TEXT NOT NULL
    CHECK (format IN ('article', 'paper', 'substack', 'social')),
  content TEXT NOT NULL,                    -- markdown
  citations JSONB NOT NULL DEFAULT '[]',
  verification JSONB,
  model_notes TEXT,
  token_usage JSONB,                        -- { stage: { input, output, model } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_scribe_drafts_project
  ON scribe_drafts(project_id, version DESC);

-- Style exemplars (past Substack posts) + freeform guidance. Prompt material,
-- not RAG — exemplar_refs holds the exemplar texts inline: [{ title, text }].
CREATE TABLE IF NOT EXISTS scribe_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  exemplar_refs JSONB NOT NULL DEFAULT '[]',
  guidance TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: backend-only. No policies — service role bypasses RLS.
ALTER TABLE scribe_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe_source_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe_style_profiles ENABLE ROW LEVEL SECURITY;

-- Semantic search over the private source chunks. Optional source filter
-- restricts to one source (used when the user pins a source to a claim).
CREATE OR REPLACE FUNCTION public.match_scribe_source_chunks(
  query_embedding vector,
  match_count integer DEFAULT 8,
  filter_source_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  source_id uuid,
  content text,
  page_hint int,
  section_hint text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $function$
  select
    c.id,
    c.source_id,
    c.content,
    c.page_hint,
    c.section_hint,
    1 - (c.embedding <=> query_embedding) as similarity
  from scribe_source_chunks c
  where
    c.embedding is not null
    and (filter_source_id is null or c.source_id = filter_source_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$function$;

-- Citation-grade retrieval over rag_corpus: id (for citation integrity) plus
-- the full metadata Scribe needs to render and verify citations. The existing
-- match_rag_corpus (no id) and match_rag_corpus_ids (no citation fields) stay
-- untouched.
CREATE OR REPLACE FUNCTION public.match_rag_corpus_cited(
  query_embedding vector,
  match_count integer DEFAULT 8,
  filter_language text DEFAULT 'english'
)
RETURNS TABLE(
  id uuid,
  chunk_text text,
  author text,
  work text,
  section_label text,
  translator text,
  text_type text,
  source_url text,
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
    section_label,
    translator,
    text_type,
    source_url,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    rag_corpus.language = filter_language
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$function$;
