-- ============================================================
-- Corpus metadata: record source_url and edition_year on the Mode 2
-- summary of Bobzien, "Stoic Syllogistic".
--
-- The 3 live rows (author 'Susanne Bobzien', work 'Stoic Syllogistic',
-- text_type 'paper_summary', ingested 2026-07-20) carry neither field,
-- which ACQUISITION_PLAN Part 5 requires. Their own text names the paper:
-- Oxford Studies in Ancient Philosophy XIV (1996), pp. 133-192.
--
-- source_url is the author's deposit on PhilPapers, the copy the full text
-- in research_sources was transcribed from on 2026-09-29 (Themata
-- milestone 3). The rows do not record which copy the summary was written
-- from, so this names the published paper's public copy rather than a
-- proven origin of the summary text. It is the same paper.
--
-- Metadata only: the summary text is unchanged. translator is left null,
-- as for the other paper summaries.
--
-- Guarded by `is null` on each field, so it is idempotent.
-- ============================================================

update public.rag_corpus
set source_url = 'https://philpapers.org/archive/BOBSS.pdf'
where author = 'Susanne Bobzien'
  and work = 'Stoic Syllogistic'
  and text_type = 'paper_summary'
  and source_url is null;

update public.rag_corpus
set edition_year = 1996
where author = 'Susanne Bobzien'
  and work = 'Stoic Syllogistic'
  and text_type = 'paper_summary'
  and edition_year is null;
