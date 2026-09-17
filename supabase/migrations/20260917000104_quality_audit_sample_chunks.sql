-- A random sample of live corpus chunks, for the Quality Audit Agent's
-- judgment pass.
--
-- The deterministic probes can tell whether a chunk has a translator and an
-- edition year. They cannot tell whether it is a passage of philosophy or a
-- publisher's front matter that the chunker swallowed, whether the translation
-- is legible or OCR wreckage, or whether the section_label names what the text
-- actually says. That needs reading, which means a model, which means a bounded
-- sample rather than 14,000 chunks a night.
--
-- Biased toward recent ingests: a defect in something added last week is worth
-- more than a rediscovery of the same legacy row every night, and recent rows
-- are the ones whose ingest path can still be fixed.

create or replace function public.quality_audit_sample_chunks(
  sample_size integer default 40,
  recent_since date default '2026-09-02',
  recent_share numeric default 0.7
)
returns table (
  id uuid,
  author text,
  work text,
  section_label text,
  locator text,
  text_type text,
  translator text,
  edition_year integer,
  chunk_index integer,
  word_count integer,
  created_at timestamptz,
  chunk_text text
)
language sql
stable
as $$
  with recent_n as (
    select greatest(0, least(sample_size, ceil(sample_size * recent_share)::int)) as n
  ),
  recent_pick as (
    select r.* from rag_corpus r, recent_n
    where r.deprecated = false and r.created_at >= recent_since
    order by random()
    limit (select n from recent_n)
  ),
  rest_pick as (
    select r.* from rag_corpus r
    where r.deprecated = false
      and r.id not in (select id from recent_pick)
    order by random()
    limit sample_size - (select count(*) from recent_pick)
  )
  select id, author, work, section_label, locator, text_type, translator,
         edition_year, chunk_index, word_count, created_at, chunk_text
  from (select * from recent_pick union all select * from rest_pick) s
$$;

comment on function public.quality_audit_sample_chunks(integer, date, numeric) is
  'Random live rag_corpus sample, weighted to recent ingests, for the nightly Quality Audit Agent.';