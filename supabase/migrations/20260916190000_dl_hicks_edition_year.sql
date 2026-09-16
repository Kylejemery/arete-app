-- ============================================================
-- Corpus metadata: record edition_year on the Hicks Diogenes Laertius.
--
-- ACQUISITION_PLAN Part 5 requires translator, source_url and edition_year
-- at the write path. The 'Lives Book7' ingest (87 chunks, 2026-07-17,
-- tr. R.D. Hicks) carries translator and source_url but no edition_year,
-- which matters more since the Garden index now quotes it: FIELD_PASSAGE in
-- lib/exhibits.ts shows the fertile-field simile at 7.40 on a public page,
-- so a passage readers can see has an unrecorded edition.
--
-- The year is 1925, on two grounds:
--
--   1. R. D. Hicks's translation for the Loeb Classical Library was first
--      published in 1925, in two volumes; Book VII is in volume II.
--   2. The row's source_url is Wikisource, which can only host the
--      public-domain printing. That is the 1925 first edition, not the
--      later revised reprints, which are still in copyright. So the year
--      is the first edition rather than a reprint year.
--
-- 1925 is also what puts this text inside the standing copyright rule
-- (verbatim ingestion only for translations published 1930 or earlier),
-- which it was already relying on without recording.
--
-- NOT independently verified against the source URL: en.wikisource.org is
-- blocked by this environment's network egress policy, so the year rests on
-- the bibliography above rather than on a fetch of the page. If the ingest
-- actually came from a different printing, correct it here.
--
-- Scoped by translator and work, and guarded by `edition_year is null`, so
-- it is idempotent and cannot touch the Yonge 1853 ingest of the same
-- author. Deliberately narrow: it does not merge the two Diogenes Laertius
-- identities ('Lives Book7' and 'Lives of Eminent Philosophers'), which is
-- a separate and larger decision. See docs/garden/discovery.md.
-- ============================================================

update public.rag_corpus
set edition_year = 1925
where work = 'Lives Book7'
  and translator = 'R.D. Hicks'
  and edition_year is null;
