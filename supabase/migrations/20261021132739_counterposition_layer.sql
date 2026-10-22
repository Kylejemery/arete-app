-- The counterposition layer: Mode 2 summaries of works the corpus holds as
-- opponents rather than as agreement.
--
-- docs/corpus/ACQUISITION_PLAN.md, admission test 7: "A text held as an
-- opponent is valuable; a text silently absorbed as agreement is a defect."
-- Robert Greene's The 48 Laws of Power, The Art of Seduction and The 50th Law
-- were ingested on 2026-10-20 as paper_summary, which the counselor and modern
-- fences let through, so a counselor could serve "conceal your intentions" as
-- advice. They treat power, reputation, desire and victory over others as goods;
-- the Stoic position is that these are indifferent and that pursuing them as
-- goods is a false judgment. They belong in the corpus as positions to examine.
--
-- How it lands, following the synthesis layer (20260929133029):
--   * a new text_type value, counterposition_summary, not a second column:
--     text_type is the one fence field (CLAUDE.md, corpus-fence.js).
--   * server/lib/corpus-fence.js excludes it from the counselor and modern
--     fences, so the Cabinet, the Oracle, the Proctor, the Journal agent and
--     the Daily Dispatch never retrieve it. Research surfaces (Tension,
--     Inquiry, Synthesis, the Scribe, the gap finder) see it, and the corpus
--     MCP server serves it only to a caller that asks for the
--     'counterposition' layer.
--   * every chunk opens with a [COUNTERPOSITION: ...] label, as synthesis
--     chunks open with [ARETE SYNTHESIS: ...], so any surface that sees the
--     chunk also sees how to read it. The embedding is untouched: it was
--     computed from the summary alone.
--
-- Greene's Mastery stays paper_summary. Its subject (apprenticeship, long
-- practice, the work before the self) is close to askesis, not opposed to it.
--
-- Idempotent: the label is added only where it is missing.

alter table rag_corpus drop constraint rag_corpus_text_type_check;
alter table rag_corpus add constraint rag_corpus_text_type_check check (text_type = any (array[
  'primary', 'scholarship', 'paper_summary', 'synthesis', 'concordance',
  'modern_primary', 'modern_summary', 'counterposition_summary'
]));

alter table corpus_sources drop constraint corpus_sources_text_type_check;
alter table corpus_sources add constraint corpus_sources_text_type_check check (text_type = any (array[
  'primary', 'scholarship', 'paper_summary', 'synthesis', 'concordance',
  'modern_primary', 'modern_summary', 'counterposition_summary'
]));

alter table corpus_ingestion_queue drop constraint corpus_ingestion_queue_text_type_check;
alter table corpus_ingestion_queue add constraint corpus_ingestion_queue_text_type_check check (text_type = any (array[
  'primary', 'scholarship', 'paper_summary', 'synthesis', 'concordance',
  'modern_primary', 'modern_summary', 'counterposition_summary'
]));

with labels(work, stance) as (values
  ('The 48 Laws of Power',
   'A modern manual that treats power, reputation and advantage over others as goods worth any means. The Stoic corpus holds these indifferent and the pursuit of them a false judgment about the good.'),
  ('The Art of Seduction',
   'A modern manual for managing other people''s impressions and desires in order to gain control over them. The Stoic corpus treats this as working on another''s phantasiai to make them assent falsely.'),
  ('The 50th Law',
   'A modern argument for fearlessness as the means to winning. Its account of fear as a product of judgment runs close to Epictetus, but it treats victory and status as the goal, which the Stoic corpus holds indifferent.')
)
update rag_corpus r
set text_type = 'counterposition_summary',
    chunk_text = format('[COUNTERPOSITION: Robert Greene, %s. %s Read as a position to examine or argue against, never as advice.]', l.work, l.stance)
                 || E'\n\n' || r.chunk_text
from labels l
where r.author = 'Robert Greene'
  and r.work = l.work
  and r.chunk_text not like '[COUNTERPOSITION:%';

update corpus_sources
set text_type = 'counterposition_summary'
where author = 'Robert Greene'
  and work in ('The 48 Laws of Power', 'The Art of Seduction', 'The 50th Law');
