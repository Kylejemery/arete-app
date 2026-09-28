-- Staging may hold an English summary written in the repo (text_type
-- 'paper_summary'), so it passes the same review gate, provenance columns and
-- promote.js path as verbatim sources. First use: an English summary of
-- Bréhier's Chrysippe (1910), whose French text answers French retrieval only
-- (see 20260928185806_corpus_language_french). The summary is our own words,
-- so it is never quotable on air; corpus_staging_sources_check1 already limits
-- quotable to Tier 1 primary.

alter table public.corpus_staging_sources drop constraint corpus_staging_sources_text_type_check;
alter table public.corpus_staging_sources add constraint corpus_staging_sources_text_type_check
  check (text_type in ('primary', 'scholarship', 'paper_summary'));
