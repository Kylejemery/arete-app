-- Retrieval evaluation harness: a dedicated eval schema holding seed queries,
-- pooled candidates from multiple retrievers, and human relevance judgments.
-- Nothing in this schema is user facing. Scripts access it with the service
-- role key via PostgREST, so the schema is added to the exposed schema list
-- at the bottom of this migration.

create schema if not exists eval;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table eval.eval_queries (
  id uuid primary key default gen_random_uuid(),
  query_text text not null,
  doctrine text check (doctrine in (
    'dichotomy_of_control', 'judgment_not_events', 'premeditatio',
    'memento_mori', 'anger', 'envy', 'reputation', 'duty', 'grief',
    'akrasia', 'other')),
  register text not null check (register in ('user', 'scholarly')),
  notes text,
  created_at timestamptz default now()
);

-- chunk_id is uuid to match public.rag_corpus.id. It is deliberately not a
-- foreign key to rag_corpus: judgments and pools should survive corpus
-- re-ingestion, and a dangling chunk id is a signal worth seeing, not hiding.
create table eval.eval_candidates (
  id uuid primary key default gen_random_uuid(),
  query_id uuid references eval.eval_queries(id) on delete cascade,
  chunk_id uuid not null,
  retriever text not null check (retriever in ('vector', 'bm25', 'keyword')),
  rank int not null,
  score float,
  unique (query_id, chunk_id)
);

create table eval.eval_judgments (
  id uuid primary key default gen_random_uuid(),
  query_id uuid references eval.eval_queries(id) on delete cascade,
  chunk_id uuid not null,
  relevance int not null check (relevance between 0 and 2),
  judged_at timestamptz default now(),
  unique (query_id, chunk_id)
);

comment on column eval.eval_judgments.relevance is
  '2 = a counselor could quote or paraphrase this passage and it would directly address the query. 1 = related and would enrich an answer but is not the passage you would reach for. 0 = not useful here.';

-- Internal tooling only: no anon or authenticated access. RLS is enabled with
-- no policies; the service role bypasses RLS.
alter table eval.eval_queries enable row level security;
alter table eval.eval_candidates enable row level security;
alter table eval.eval_judgments enable row level security;

-- ---------------------------------------------------------------------------
-- Full text search support for the bm25 pooling retriever
-- ---------------------------------------------------------------------------

create index if not exists rag_corpus_chunk_text_fts_idx
  on public.rag_corpus using gin (to_tsvector('english', chunk_text));

-- Full text search over the corpus, ranked by ts_rank. Labelled bm25 in the
-- harness because it plays the lexical retriever role in candidate pooling.
-- No language filter on purpose: pooling should be able to surface chunks the
-- production vector path cannot return, so the pool is not biased toward the
-- system under test.
create or replace function eval.bm25_search(query_text text, match_count int default 20)
returns table(chunk_id uuid, score double precision)
language sql
stable
as $$
  select
    id,
    ts_rank(to_tsvector('english', chunk_text),
            plainto_tsquery('english', query_text))::double precision as score
  from public.rag_corpus
  where deprecated = false
    and to_tsvector('english', chunk_text) @@ plainto_tsquery('english', query_text)
  order by score desc, id
  limit match_count;
$$;

-- Simple ILIKE retriever over a handful of distinctive content words chosen
-- by the pooling script. Score is the number of words that matched.
create or replace function eval.keyword_search(words text[], match_count int default 20)
returns table(chunk_id uuid, score double precision)
language sql
stable
as $$
  select
    id,
    (select count(*) from unnest(words) w
      where rag_corpus.chunk_text ilike '%' || w || '%')::double precision as score
  from public.rag_corpus
  where deprecated = false
    and exists (select 1 from unnest(words) w
                 where rag_corpus.chunk_text ilike '%' || w || '%')
  order by score desc, id
  limit match_count;
$$;

-- Corpus document frequency per word, so the pooling script can pick the most
-- distinctive content words in a query instead of guessing.
create or replace function eval.word_doc_counts(words text[])
returns table(word text, doc_count bigint)
language sql
stable
as $$
  select w, count(rag_corpus.id)
  from unnest(words) w
  left join public.rag_corpus
    on rag_corpus.deprecated = false
   and rag_corpus.chunk_text ilike '%' || w || '%'
  group by w;
$$;

-- ---------------------------------------------------------------------------
-- Grants and PostgREST exposure
-- ---------------------------------------------------------------------------

grant usage on schema eval to anon, authenticated, service_role;
grant all on all tables in schema eval to service_role;
grant execute on all functions in schema eval to service_role;
alter default privileges in schema eval grant all on tables to service_role;

-- Expose the eval schema over PostgREST so supabase-js can reach it with
-- .schema('eval'). The list restates the platform defaults plus eval.
alter role authenticator set pgrst.db_schemas = 'public, storage, graphql_public, eval';
notify pgrst, 'reload config';
