-- Learning System Phase A — outcome logging.
--
-- retrieval_log: one row per (agent request, retrieved chunk), with rank and
-- raw similarity, so downstream learning (Hebbian edges, reranker training)
-- can join retrievals to what happened next. Named retrieval_log — NOT
-- retrieval_events, which already exists with per-concept Observatory rows.
--
-- response_outcomes: the outcome of each agent response, keyed by the same
-- request_id. Written by the Evaluator fan-out (academy web) and, later, by
-- heuristic sources.
--
-- Both tables are service-role only: the Railway server and the academy
-- admin client write them; nothing client-side touches them.

create table if not exists retrieval_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,            -- one per agent response
  agent text not null,                 -- 'socratic-proctor' | 'examine-proctor' | 'language-drills' | ...
  student_id uuid,
  session_id int,                      -- academy session number (joins evaluator outcomes)
  course_id text,
  query_text text not null,
  -- No FK: rag_corpus rows can be de-ingested, and the fallback path retrieves
  -- from source_chunks. corpus says which table the id points into.
  -- chunk_id: uuid join key into rag_corpus (null for other corpora).
  -- chunk_key: the raw id as text for ANY corpus (source_chunks uses ints).
  chunk_id uuid,
  chunk_key text not null,
  corpus text not null default 'rag_corpus',
  rank int not null,                   -- position in retrieved list (1-based)
  similarity float,                    -- raw cosine score where the RPC returns one
  used_in_response boolean default null, -- set post-hoc by Haiku attribution
  retrieval_mode text not null default 'vector', -- 'vector' now; 'graph_boost' in Phase B
  created_at timestamptz not null default now()
);

create index if not exists retrieval_log_request_idx on retrieval_log (request_id);
create index if not exists retrieval_log_chunk_idx on retrieval_log (chunk_id);
create index if not exists retrieval_log_student_session_idx
  on retrieval_log (student_id, course_id, session_id, created_at desc);

alter table retrieval_log enable row level security;

create table if not exists response_outcomes (
  request_id uuid primary key,
  agent text not null,
  student_id uuid,
  session_id int,
  course_id text,
  outcome text not null check (outcome in
    ('objective_demonstrated','objective_partial','objective_failed',
     'student_positive','student_negative','student_neutral',
     'evaluator_pass','evaluator_fail','unknown')),
  outcome_source text not null,        -- 'evaluator' | 'thumbs' | 'heuristic'
  score float,                         -- normalized 0..1 where derivable
  created_at timestamptz not null default now()
);

create index if not exists response_outcomes_student_idx
  on response_outcomes (student_id, course_id, created_at desc);

alter table response_outcomes enable row level security;

-- match_rag_corpus now also returns the chunk id so retrieval logging can
-- record which rag_corpus rows served each request. Additive for every JS
-- caller (new key simply appears on each row). Postgres cannot change a
-- function's OUT columns via CREATE OR REPLACE, hence the drop.

DROP FUNCTION IF EXISTS public.match_rag_corpus(vector, integer, text, text);

CREATE FUNCTION public.match_rag_corpus(
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
  order by embedding <=> query_embedding
  limit match_count;
$function$;
