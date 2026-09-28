-- French as a corpus language, for Bréhier's Chrysippe (Paris: Alcan, 1910),
-- staged in the stoic-scholarship-2026-09 batch.
--
-- Retrieval support is the same as for German: every match_rag_corpus*
-- function filters on filter_language (default 'english'), so French rows
-- answer only a caller that asks for 'french' and never enter English
-- retrieval. promote.js's retrievability probe queries with the row's own
-- language, which is how a promoted French source is checked.

alter table public.rag_corpus drop constraint rag_corpus_language_normalized_check;
alter table public.rag_corpus add constraint rag_corpus_language_normalized_check
  check (language in ('english', 'ancient_greek', 'latin', 'german', 'french'));

alter table public.corpus_staging_sources drop constraint corpus_staging_sources_language_check;
alter table public.corpus_staging_sources add constraint corpus_staging_sources_language_check
  check (language in ('english', 'ancient_greek', 'latin', 'german', 'french'));
