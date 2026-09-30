-- The Library of Arete — shelf inventory.
-- Groups rag_corpus into one row per (author, work, text_type) with a chunk
-- count and a representative excerpt that skips Project Gutenberg front matter.
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
    group by author, work, text_type
  ) g
  left join lateral (
    select r.chunk_text
    from rag_corpus r
    where r.author = g.author and r.work = g.work and r.text_type = g.text_type
      and r.chunk_text not ilike '%project gutenberg%'
      and length(r.chunk_text) > 200
    order by r.chunk_index asc
    offset greatest(0, (g.chunk_count / 8)::int)
    limit 1
  ) e on true
  order by g.text_type, g.author, g.work;
$$;
