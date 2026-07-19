-- Learning System Phase C — synthesis passes for the Consolidation Agent.
--
-- corpus_syntheses: the review queue. When the Hebbian graph shows a cluster
-- of passages that keep proving useful together in teaching, the agent writes
-- a synthesis note articulating the connection — scholarly commentary on an
-- OBSERVED fact, not conjecture (that's the Dreaming Agent's charter, and it
-- stays untouched). Nothing enters rag_corpus without Kyle's approval: a
-- synthesis lands here as pending_review, and the admin approve action embeds
-- + ingests it. After approval, outcome-based selection pressure still runs:
-- a synthesis that doesn't teach well is deprecated (excluded from retrieval,
-- kept for audit). Human judgment gates entry; empirical performance gates
-- survival.
--
-- rag_corpus gains source_type / parent_chunks / deprecated so ingested
-- syntheses carry their provenance and can be excluded without deletion.
-- Syntheses NEVER overwrite primary-source chunks — they are new rows only.

alter table rag_corpus add column if not exists source_type text;
alter table rag_corpus add column if not exists parent_chunks uuid[];
alter table rag_corpus add column if not exists deprecated boolean not null default false;

create table if not exists corpus_syntheses (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,               -- the note itself, or the model's REJECT reason
  cluster_chunks uuid[] not null,      -- the rag_corpus passages that fired together
  citations jsonb,                     -- [{author, work, section_label}] of the cluster
  cluster_stats jsonb,                 -- mean edge weight, edge count, etc.
  status text not null default 'pending_review' check (status in (
    'pending_review',                  -- awaiting Kyle
    'approved',                        -- ingested into rag_corpus (rag_corpus_id set)
    'rejected',                        -- Kyle said no
    'model_rejected',                  -- the model judged the connection spurious; kept for calibration
    'deprecated'                       -- approved once, then outperformed by selection pressure
  )),
  review_notes text,
  reviewed_at timestamptz,
  rag_corpus_id uuid,                  -- set on approval
  model_used text,
  generated_at timestamptz not null default now()
);
create index if not exists corpus_syntheses_status_idx on corpus_syntheses (status);

alter table corpus_syntheses enable row level security;

create table if not exists consolidation_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  content text not null,               -- the morning digest
  stats jsonb,
  created_at timestamptz not null default now()
);
create index if not exists consolidation_reports_date_idx on consolidation_reports (report_date desc);

alter table consolidation_reports enable row level security;

-- Deprecated rows leave retrieval everywhere rag_corpus is searched.
-- Same signatures and OUT columns — CREATE OR REPLACE suffices.

CREATE OR REPLACE FUNCTION public.match_rag_corpus(
  query_embedding vector,
  match_count integer DEFAULT 5,
  filter_author text DEFAULT NULL::text,
  filter_language text DEFAULT 'english'::text
)
RETURNS TABLE(
  id uuid,
  chunk_text text,
  author text,
  work text,
  language text,
  course_relevance text,
  section_label text,
  text_type text,
  source_url text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $function$
  select
    id,
    chunk_text,
    author,
    work,
    language,
    course_relevance,
    section_label,
    text_type,
    source_url,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    (filter_author is null or rag_corpus.author = filter_author)
    and (rag_corpus.language = filter_language)
    and embedding is not null
    and deprecated = false
  order by embedding <=> query_embedding
  limit match_count;
$function$;

CREATE OR REPLACE FUNCTION match_academy_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_author text DEFAULT NULL,
  filter_program text DEFAULT 'stoicism-phd'
)
RETURNS TABLE (
  id uuid,
  author text,
  work text,
  section_label text,
  chunk_text text,
  translator text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.author,
    rc.work,
    rc.section_label,
    rc.chunk_text,
    rc.translator,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM rag_corpus rc
  WHERE
    (filter_author IS NULL OR rc.author = filter_author)
    AND rc.program_id = filter_program
    AND rc.deprecated = false
    AND 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Synthesis settings join the Consolidation Agent's config.
update agent_config
set config = config || '{
  "synthesis_enabled": true,
  "synthesis_model": "claude-opus-4-8",
  "synthesis_edge_threshold": 0.5,
  "max_syntheses_per_night": 3,
  "max_cluster_chunks": 6,
  "synthesis_max_corpus_pct": 15,
  "deprecate_below": 0.4,
  "deprecate_min_retrievals": 10,
  "deprecate_window_days": 30
}'::jsonb
where agent_name = 'consolidation-agent';
