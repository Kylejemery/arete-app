-- rag_corpus: HNSW in place of ivfflat, and the retrieval functions made
-- inlinable so the index is actually used.
--
-- Why. match_rag_corpus (and _ids, _cited) carry SET ivfflat.probes = 10
-- from 20260831000002, which fixed the under-return of that month but also
-- stops Postgres inlining the SQL function, and a non-inlined body has run as
-- an exact scan of every live vector ever since: 183k shared buffers and
-- 294ms warm at 13.7k chunks, 7.7s cold on 2026-09-20 against PostgREST's 8s
-- statement_timeout, and on 2026-09-18 the cold call crossed it and a
-- counselor got nothing. The nightly auditor's corpus.retrieval_latency probe
-- measured all of this; this is the migration its finding names.
--
-- What.
--   1. An HNSW index (m = 16, ef_construction = 64). Measured on an isolated
--      copy with the canonical-concept embeddings as out-of-corpus queries:
--      ef_search = 100 gives 99.7% mean recall@20 against the exact scan,
--      worst query 19/20, ~900 buffers a call.
--   2. The ivfflat index is dropped. With both present the planner keeps
--      choosing ivfflat, and ivfflat at lists = 100 is what under-returned.
--   3. The three rag_corpus retrieval functions lose their SET so they inline
--      and the outer ORDER BY ... LIMIT reaches the index.
--   4. hnsw.ef_search = 100 and hnsw.iterative_scan = strict_order, on the
--      database and on the roles PostgREST impersonates. The setting cannot
--      live on the functions (that is the trap in 1); PostgREST applies role
--      settings per transaction with SET LOCAL and re-reads them on NOTIFY.
--      Iterative scan is what keeps filter_author honest: an HNSW scan yields
--      ef_search candidates and the filters thin them, so a small author could
--      otherwise come back with fewer than match_count rows — August's
--      under-return by another route. strict_order keeps the rows exactly
--      ordered by distance. match_academy_chunks is on another table and is
--      left alone.
--
-- Rollback, no data touched:
--   create index rag_corpus_embedding_idx on public.rag_corpus
--     using ivfflat (embedding vector_cosine_ops) with (lists = 100);
--   drop index public.rag_corpus_embedding_hnsw_idx;
--   alter function public.match_rag_corpus(vector, integer, text, text, text[]) set ivfflat.probes = 10;
--   alter function public.match_rag_corpus_ids(vector, integer, text, text[]) set ivfflat.probes = 10;
--   alter function public.match_rag_corpus_cited(vector, integer, text) set ivfflat.probes = 10;
--   alter database postgres reset hnsw.ef_search; alter database postgres reset hnsw.iterative_scan;
--   (the same reset on authenticator, anon, authenticated, service_role); notify pgrst, 'reload config';

-- The hnsw.* GUCs are only known once pgvector is loaded in the session, and
-- setting an unknown parameter on a role fails with permission denied.
select '[1]'::vector <=> '[1]'::vector;

-- The graph is ~90 MB at 13.7k rows x 1536 dims; the default 64 MB
-- maintenance_work_mem would spill the build to the slow path.
set maintenance_work_mem = '256MB';

create index if not exists rag_corpus_embedding_hnsw_idx
  on public.rag_corpus using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

drop index if exists public.rag_corpus_embedding_idx;

alter function public.match_rag_corpus(vector, integer, text, text, text[]) reset ivfflat.probes;
alter function public.match_rag_corpus_ids(vector, integer, text, text[]) reset ivfflat.probes;
alter function public.match_rag_corpus_cited(vector, integer, text) reset ivfflat.probes;

alter database postgres set hnsw.ef_search = 100;
alter database postgres set hnsw.iterative_scan = strict_order;
alter role authenticator set hnsw.ef_search = 100;
alter role authenticator set hnsw.iterative_scan = strict_order;
alter role anon set hnsw.ef_search = 100;
alter role anon set hnsw.iterative_scan = strict_order;
alter role authenticated set hnsw.ef_search = 100;
alter role authenticated set hnsw.iterative_scan = strict_order;
alter role service_role set hnsw.ef_search = 100;
alter role service_role set hnsw.iterative_scan = strict_order;

notify pgrst, 'reload config';
