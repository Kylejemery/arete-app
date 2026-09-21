-- rag_corpus retrieval: route by author size, widen the search, relaxed order.
--
-- Measured after 20260920153919 (the HNSW swap) against the exact scan on a
-- fixed set of 30 canonical-concept queries — out-of-corpus, like a user's
-- question — with recall@20 as mean / worst query:
--
--   open corpus, ef 100 strict          99.2% / 95%      2,165 buffers
--   open corpus, ef 200 relaxed         99.7% / 95%      2,620 buffers
--   Plutarch (2,704 chunks), ef 100     92.1% / 70%      3,701 buffers
--   Marcus Aurelius (488), ef 100       95.0% / 90%     11,967 buffers
--   Musonius Rufus (56), ef 100         100%            27,677 buffers
--   Laozi (31), ef 100                  95.2% / 85%     35,088 buffers
--
-- Two problems in those rows. Academy course chat retrieves with
-- filter_author = the course's author, and on the vector index a filtered
-- scan has to crawl the graph until it has found twenty of that author's
-- rows: for a rare author that is tens of thousands of buffers (seconds on a
-- cold cache — the timeout class the index was meant to remove) and still
-- misses some. Reading a rare author's rows through the author btree and
-- sorting them exactly costs 205–669 buffers and 1–5ms with recall 100%.
-- For a common author the mirror holds: the exact sort of Seneca's 1,586
-- rows is 12k buffers, so the vector index is the better tool there.
--
-- So match_rag_corpus becomes a router. No author: the vector index. An
-- author with up to 1,200 rows (every course author but Seneca): the exact
-- path, with `+ 0.0` on the ORDER BY so the planner cannot pick the vector
-- index. A more common author: the plain predicate, where the planner chooses
-- between the filtered vector scan and an exact sort — measured at 12–20k
-- buffers and 20–35ms warm with recall 100%, or 3.7k buffers at 96–99%,
-- either acceptable. Routed results on every course author, Plutarch and the
-- two smallest authors: recall 100%, all rows returned.
--
-- The open-corpus search widens to ef_search = 200 with pgvector's relaxed
-- order: 99.7% recall, no ordering inversions in the returned top 20 across
-- the set, 2,620 buffers. Not higher: the planner's estimate for the vector
-- scan grows with ef_search and at 250 it abandons the index for the exact
-- scan on the open corpus (147k buffers, 9.1s cold — worse than before the
-- index). The cliff rises with the table, since seq-scan cost grows with
-- pages and the index cost does not, so 200 gets safer as the corpus grows;
-- any raise must be re-measured with EXPLAIN (ANALYZE, BUFFERS) first, and
-- the nightly corpus.retrieval_latency probe is the guard if the planner
-- ever flips.
--
-- The count that picks the branch runs on the author btree; the function
-- stays STABLE and keeps its signature, comment and PostgREST exposure.
--
-- Rollback, no data touched: the previous definition is in
-- 20260902141904_match_rag_corpus_exclude_text_types.sql (minus its SET,
-- per 20260920153919), and the settings go back to 100 / strict_order.

select '[1]'::vector <=> '[1]'::vector;

create or replace function public.match_rag_corpus(
  query_embedding vector,
  match_count integer default 5,
  filter_author text default null,
  filter_language text default 'english',
  exclude_text_types text[] default '{}'
)
returns table(
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
language plpgsql
stable
as $$
declare
  author_rows bigint;
begin
  -- No author: the vector index answers directly.
  if filter_author is null then
    return query
      select r.id, r.chunk_text, r.author, r.work, r.language, r.course_relevance,
             r.section_label, r.text_type, r.source_url,
             1 - (r.embedding <=> query_embedding)
      from public.rag_corpus r
      where r.language = filter_language
        and r.embedding is not null
        and r.deprecated = false
        and not (r.text_type = any (coalesce(exclude_text_types, '{}'::text[])))
      order by r.embedding <=> query_embedding
      limit match_count;
    return;
  end if;

  select count(*) into author_rows from public.rag_corpus r where r.author = filter_author;

  if author_rows <= 1200 then
    -- A rare author: their rows through the author btree, sorted exactly.
    -- The + 0.0 keeps the planner off the vector index, which for a rare
    -- author crawls thousands of graph nodes to find twenty of theirs.
    return query
      select r.id, r.chunk_text, r.author, r.work, r.language, r.course_relevance,
             r.section_label, r.text_type, r.source_url,
             1 - (r.embedding <=> query_embedding)
      from public.rag_corpus r
      where r.author = filter_author
        and r.language = filter_language
        and r.embedding is not null
        and r.deprecated = false
        and not (r.text_type = any (coalesce(exclude_text_types, '{}'::text[])))
      order by (r.embedding <=> query_embedding) + 0.0
      limit match_count;
  else
    -- A common author: the planner chooses between the filtered vector scan
    -- and an exact sort of the author's rows. Both are cheap here.
    return query
      select r.id, r.chunk_text, r.author, r.work, r.language, r.course_relevance,
             r.section_label, r.text_type, r.source_url,
             1 - (r.embedding <=> query_embedding)
      from public.rag_corpus r
      where r.author = filter_author
        and r.language = filter_language
        and r.embedding is not null
        and r.deprecated = false
        and not (r.text_type = any (coalesce(exclude_text_types, '{}'::text[])))
      order by r.embedding <=> query_embedding
      limit match_count;
  end if;
end;
$$;

alter database postgres set hnsw.ef_search = 200;
alter database postgres set hnsw.iterative_scan = relaxed_order;
alter role authenticator set hnsw.ef_search = 200;
alter role authenticator set hnsw.iterative_scan = relaxed_order;
alter role anon set hnsw.ef_search = 200;
alter role anon set hnsw.iterative_scan = relaxed_order;
alter role authenticated set hnsw.ef_search = 200;
alter role authenticated set hnsw.iterative_scan = relaxed_order;
alter role service_role set hnsw.ef_search = 200;
alter role service_role set hnsw.iterative_scan = relaxed_order;

notify pgrst, 'reload config';
