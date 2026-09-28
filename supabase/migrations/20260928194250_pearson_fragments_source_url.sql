-- ============================================================
-- Corpus metadata: record source_url on Pearson's Fragments of Zeno and
-- Cleanthes.
--
-- The 321 live rows (author 'A.C. Pearson', work 'Fragments of Zeno and
-- Cleanthes') carry no source_url, which ACQUISITION_PLAN Part 5 requires.
-- Set, by Kyle's decision of 2026-09-28, to the archive.org scan of the
-- 1891 Cambridge edition that he uploaded for review that day
-- (thefragmentsofze00zenouoft; edition_year set by
-- 20260928190800_pearson_fragments_edition_year).
--
-- The rows themselves do not record which copy they were ingested from, so
-- this names the scan that carries the edition rather than a proven origin
-- of the chunk text. It is the only public domain edition, so the text is
-- the same.
--
-- Guarded by `source_url is null`, so it is idempotent.
-- ============================================================

update public.rag_corpus
set source_url = 'https://archive.org/details/thefragmentsofze00zenouoft'
where author = 'A.C. Pearson'
  and work = 'Fragments of Zeno and Cleanthes'
  and source_url is null;
