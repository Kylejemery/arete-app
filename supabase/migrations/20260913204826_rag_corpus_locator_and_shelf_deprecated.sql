-- Two things the Reading Room re-ingest of the Meditations needs.
--
-- 1. rag_corpus gains the two metadata columns docs/corpus/ACQUISITION_PLAN.md
--    Part 5 requires at the write path but which the table never had:
--      edition_year  the year of the translation/edition (public-domain
--                    status and translator divergence both hang on it)
--      locator       the canonical division a passage is citable by
--                    ("2.1" for Meditations Book 2 section 1, a letter
--                    number, a Stephanus page), null where a text has none
--
-- 2. library_shelf() stops counting deprecated rows. Retrieval already
--    filters deprecated = false (match_rag_corpus); the shelf did not, so a
--    superseded ingest kept inflating a work's passage count and could
--    supply its excerpt.

alter table rag_corpus add column if not exists edition_year integer;
alter table rag_corpus add column if not exists locator text;

create index if not exists idx_rag_corpus_locator on rag_corpus(author, work, locator);

create or replace function library_shelf()
returns table (
  author text,
  work text,
  text_type text,
  chunk_count bigint,
  translator text,
  language text,
  source_url text,
  excerpt text
)
language sql
stable
as $$
  select
    g.author, g.work, g.text_type, g.chunk_count,
    g.translator, g.language, g.source_url, e.chunk_text as excerpt
  from (
    select author, work, text_type,
           count(*)        as chunk_count,
           min(translator) as translator,
           min(language)   as language,
           min(source_url) as source_url
    from rag_corpus
    where deprecated = false
    group by author, work, text_type
  ) g
  left join lateral (
    select r.chunk_text
    from rag_corpus r
    where r.author = g.author and r.work = g.work and r.text_type = g.text_type
      and r.deprecated = false
      and r.chunk_text not ilike '%project gutenberg%'
      and length(r.chunk_text) > 200
    order by r.chunk_index asc
    offset greatest(0, (g.chunk_count / 8)::int)
    limit 1
  ) e on true
  order by g.text_type, g.author, g.work;
$$;
