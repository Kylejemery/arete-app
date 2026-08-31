-- eval.bm25_search fix: plainto_tsquery ANDs every lexeme, so any full
-- sentence query matched nothing. For candidate pooling the retriever should
-- match any lexeme and let ts_rank reward chunks that match several, which is
-- the role bm25 plays in this harness. The AND query is rewritten to OR.

create or replace function eval.bm25_search(query_text text, match_count int default 20)
returns table(chunk_id uuid, score double precision)
language sql
stable
as $$
  with parsed as (
    select plainto_tsquery('english', query_text) as andq
  ),
  orq as (
    select to_tsquery('english', replace(andq::text, ' & ', ' | ')) as tsq
    from parsed
    where andq <> ''::tsquery
  )
  select
    id,
    ts_rank(to_tsvector('english', chunk_text), orq.tsq)::double precision as score
  from public.rag_corpus, orq
  where deprecated = false
    and to_tsvector('english', chunk_text) @@ orq.tsq
  order by score desc, id
  limit match_count;
$$;
