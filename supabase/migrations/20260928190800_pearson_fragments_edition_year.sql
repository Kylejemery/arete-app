-- ============================================================
-- Corpus metadata: record edition_year on Pearson's Fragments of Zeno and
-- Cleanthes.
--
-- The 321 live rows (author 'A.C. Pearson', work 'Fragments of Zeno and
-- Cleanthes') carry no edition_year, which ACQUISITION_PLAN Part 5 requires.
-- The year is 1891: the title page of the Cambridge University Press
-- edition (London: C. J. Clay and Sons), the Hare Prize essay of 1889, read
-- from archive.org scan thefragmentsofze00zenouoft on 2026-09-28. There is
-- no other edition before the 1973 reprint, which reproduces it.
--
-- Found while assessing the scan as a candidate for re-ingest; see
-- docs/corpus/ADMISSIONS_2026-09-28_STOIC_SCHOLARSHIP.md. That record also
-- raises, and leaves open, whether Pearson's introduction and notes belong
-- under text_type 'scholarship' rather than 'primary', and the missing
-- source_url. This migration changes the year only.
--
-- Guarded by `edition_year is null`, so it is idempotent.
-- ============================================================

update public.rag_corpus
set edition_year = 1891
where author = 'A.C. Pearson'
  and work = 'Fragments of Zeno and Cleanthes'
  and edition_year is null;
