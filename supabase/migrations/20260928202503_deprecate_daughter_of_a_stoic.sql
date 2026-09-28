-- Deprecate "The Daughter Of A Stoic" (Cornelia Atwood Pratt), Kyle's
-- decision of 2026-09-28.
--
-- Two rows, ingested 2026-09-28 18:24 UTC by a local run over
-- academy/corpus-ingestion/source_texts/ (the Google Books scan
-- daughterastoic00comegoog). The scan has no text layer, so both chunks are
-- Google's usage-guidelines boilerplate, not the book. The book itself is a
-- nineteenth-century novel and fails admission tests 2 and 3
-- (docs/corpus/ADMISSIONS_2026-09-28_STOIC_SCHOLARSHIP.md, Rejected).
-- It carried text_type primary with no translator, source_url or
-- edition_year, and no question-map registrations.
--
-- Deprecated, never deleted. Guarded, so it is idempotent.

update public.rag_corpus
set deprecated = true
where author = 'Cornelia Atwood Pratt'
  and work = 'The Daughter Of A Stoic'
  and deprecated = false;
