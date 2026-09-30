-- Grouped chunk counts per (author, work) for the Coverage Gap Agent.
--
-- The agent and its admin routes previously counted by fetching
-- rag_corpus.select('author, work') and tallying in JS — but PostgREST caps a
-- plain select at db-max-rows (1000), and rag_corpus has ~7,000 rows, so works
-- outside that first page falsely read as 0 chunks (false "absent" gaps). This
-- function does the aggregation in the database, returning ~one row per work.
CREATE OR REPLACE FUNCTION public.corpus_work_counts()
RETURNS TABLE(author text, work text, cnt bigint)
LANGUAGE sql
STABLE
AS $function$
  SELECT author, work, count(*) AS cnt
  FROM rag_corpus
  GROUP BY author, work
$function$;
