-- Widen corpus_sources.text_type to accept 'paper_summary'.
--
-- 'paper_summary' was introduced for journal papers (see 20260713000000_paper_
-- submissions.sql) and is the one text_type the Reading Room shelf filters out
-- while the counselor source catalog still lists it — retrievable and honestly
-- attributable, but not a readable work. That is exactly the posture needed for
-- in-copyright BOOKS ingested as section summaries, so the label is reused
-- rather than duplicated: a second value with identical filter behavior would
-- mean maintaining the same rule at two sites in server/index.js.
--
-- Note the widened meaning: 'paper_summary' now reads as "summary of a modern
-- in-copyright work", not strictly "summary of a paper".
--
-- rag_corpus already stores 'paper_summary' rows, so only corpus_sources — whose
-- CHECK was written before books were a case — needs widening.

ALTER TABLE corpus_sources
  DROP CONSTRAINT IF EXISTS corpus_sources_text_type_check;

ALTER TABLE corpus_sources
  ADD CONSTRAINT corpus_sources_text_type_check
  CHECK (text_type IN ('summary', 'public_domain', 'paper_summary'));
