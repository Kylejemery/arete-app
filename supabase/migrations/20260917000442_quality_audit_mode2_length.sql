-- quality_audit_corpus_stats: add per-work chunk counts for the Mode 2 layers.
--
-- The copyright rule admits modern copyrighted material only as a Mode 2
-- summary: the agent reads and rewrites in its own words, and the original is
-- never stored. The Paper Agent's own budget is 500-900 words, which is two or
-- three 400-word chunks.
--
-- A paper_summary or modern_summary running to sixty chunks is not a summary.
-- It is either a verbatim ingest wearing the summary layer's label — which is
-- the copyright failure the rule exists to prevent, and which no text_type
-- check constraint can catch — or a summariser that has stopped summarising.
-- Nothing in the schema distinguishes the two, so surface the lengths and let
-- the agent flag the outliers against a configured threshold.

create or replace function public.quality_audit_mode2_lengths()
returns table (author text, work text, text_type text, chunks bigint, total_words bigint, first_ingest date)
language sql
stable
as $$
  select author, work, text_type, count(*) as chunks,
         coalesce(sum(word_count), 0) as total_words,
         min(created_at)::date as first_ingest
  from rag_corpus
  where deprecated = false
    and text_type in ('paper_summary', 'modern_summary')
  group by author, work, text_type
  order by count(*) desc
$$;

comment on function public.quality_audit_mode2_lengths() is
  'Per-work size of the Mode 2 summary layers, for the Quality Audit Agent''s summary-length check.';