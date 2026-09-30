-- Fix: 704 corpus chunks were invisible to retrieval.
--
-- The queue based ingestion agents map language codes to full names via
-- corpusLanguage (en to english, grc to ancient_greek, lat to latin), but the
-- direct admin ingest route (/api/corpus-ingest/ingest) passed the raw UI
-- code straight through, so its rows landed with language = 'en' while every
-- retrieval function filters language = 'english'. Those chunks were
-- embedded, not deprecated, and unreachable.
--
-- The route is fixed in the same commit to apply the mapping. This migration
-- repairs the existing rows and adds a check constraint so a third spelling
-- fails loudly at insert instead of silently vanishing from retrieval. If a
-- genuinely new language is ever ingested, extend the constraint in a
-- migration alongside the retrieval support for it.

update public.rag_corpus set language = 'english' where language = 'en';

-- Same normalization for the admin source of record table, which received
-- its language value from the same route.
update public.corpus_sources set language = 'english' where language = 'en';

alter table public.rag_corpus
  add constraint rag_corpus_language_normalized_check
  check (language in ('english', 'ancient_greek', 'latin'));

comment on constraint rag_corpus_language_normalized_check on public.rag_corpus is
  'Language must be a full name matching what retrieval filters on, never an ISO style code. Extend deliberately when new languages gain retrieval support.';
