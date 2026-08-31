-- Fix: vector retrieval silently under-returns, sometimes to zero.
--
-- Both ivfflat indexes (rag_corpus_embedding_idx, source_text_chunks
-- _embedding_idx) are built with lists = 100, and every retrieval function
-- ran at the default ivfflat.probes = 1: each query scanned a single cluster
-- of roughly one percent of the table, and the language, deprecated, author,
-- and counselor_slug filters then thinned that below the requested limit.
-- The eval harness measured it: 19 of 60 queries got fewer than the 20
-- requested rows from match_rag_corpus, and 2 queries got zero.
--
-- probes = 10 follows the usual square root of lists heuristic. The setting
-- rides on the functions themselves so callers need no changes. A function
-- level SET also prevents SQL function inlining, which is required here:
-- an inlined body would run with the session's probes value, not this one.

-- The ivfflat.probes GUC only exists once the pgvector library is loaded in
-- the session, and altering a function to set an unknown parameter fails with
-- permission denied. Any vector operation loads the library.
select '[1]'::vector <=> '[1]'::vector;

alter function public.match_rag_corpus(vector, integer, text, text)
  set ivfflat.probes = 10;

alter function public.match_rag_corpus_cited(vector, integer, text)
  set ivfflat.probes = 10;

alter function public.match_rag_corpus_ids(vector, integer, text)
  set ivfflat.probes = 10;

alter function public.match_academy_chunks(vector, double precision, integer, text, text)
  set ivfflat.probes = 10;

alter function public.match_academy_chunks(vector, double precision, integer, text, text, text)
  set ivfflat.probes = 10;

alter function public.match_source_chunks(vector, text, integer)
  set ivfflat.probes = 10;
