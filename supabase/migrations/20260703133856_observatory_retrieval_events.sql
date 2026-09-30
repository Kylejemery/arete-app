-- Observatory Living Sky — Part 1: retrieval event log + state aggregates
--
-- retrieval_events: a lightweight, append-only log of real corpus retrievals.
-- One row per (retrieval, concept) — capped at 3 concepts per retrieval by the
-- server — so the Observatory can breathe at the rate the corpus is actually
-- being asked. Written fire-and-forget from the server's retrieval paths;
-- a logging failure never blocks retrieval.
create table if not exists retrieval_events (
  id uuid primary key default gen_random_uuid(),
  concept text,
  author text,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists retrieval_events_created_at_idx
  on retrieval_events (created_at desc);

-- Service-role only (the server writes and aggregates; nothing client-side
-- touches this table directly).
alter table retrieval_events enable row level security;

-- rag_corpus is ~11k rows — far past the PostgREST 1000-row cap — so corpus
-- totals are aggregated in SQL and returned as one JSON document.
create or replace function observatory_corpus_stats()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'totalChunks', (select count(*) from rag_corpus),
    'authorCount', (select count(distinct author) from rag_corpus where author is not null),
    'byAuthor', (
      select coalesce(jsonb_object_agg(author, cnt), '{}'::jsonb)
      from (select author, count(*) as cnt from rag_corpus where author is not null group by author) a
    ),
    'byConcept', (
      select coalesce(jsonb_object_agg(concept, cnt), '{}'::jsonb)
      from (select concept, count(*) as cnt from concept_passage_map where concept is not null group by concept) c
    ),
    'births', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'author', author, 'work', work, 'firstChunkAt', first_at
      ) order by first_at desc), '[]'::jsonb)
      from (
        select author, work, min(created_at) as first_at
        from rag_corpus
        group by author, work
        having min(created_at) > now() - interval '48 hours'
      ) b
    )
  );
$$;

-- Retrieval counts per concept over the last 24h and 7d — drives breathing
-- rate. Aggregated in SQL for the same row-cap reason.
create or replace function observatory_retrieval_counts()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'day', (
      select coalesce(jsonb_object_agg(concept, cnt), '{}'::jsonb)
      from (
        select concept, count(*) as cnt from retrieval_events
        where created_at > now() - interval '24 hours' and concept is not null
        group by concept
      ) d
    ),
    'week', (
      select coalesce(jsonb_object_agg(concept, cnt), '{}'::jsonb)
      from (
        select concept, count(*) as cnt from retrieval_events
        where created_at > now() - interval '7 days' and concept is not null
        group by concept
      ) w
    ),
    'weekByAuthor', (
      select coalesce(jsonb_object_agg(author, cnt), '{}'::jsonb)
      from (
        select author, count(*) as cnt from retrieval_events
        where created_at > now() - interval '7 days' and author is not null
        group by author
      ) wa
    )
  );
$$;
