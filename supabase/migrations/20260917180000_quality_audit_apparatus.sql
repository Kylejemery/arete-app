-- Find editorial apparatus in the verbatim layers without asking a model.
--
-- The first real run of the read pass flagged two of forty sampled chunks as
-- apparatus filed under the author's name: J. A. Smith's introduction sitting
-- at Nicomachean Ethics #0, and a run of the translator's footnotes at
-- Plutarch's Morals #227. Both are the same shape as defects already repaired
-- by hand (20260915164611_deprecate_apparatus_chunks), which means the class
-- recurs and a forty-chunk sample only finds it by luck.
--
-- Most of this class is not a judgement call. A Project Gutenberg header, a
-- transcriber's note, a YAML front-matter block and a run of numbered
-- citations are all recognisable by shape, so they should be found by query
-- every night rather than by a model on the chunks it happens to draw.
--
-- Thresholds were calibrated against the live corpus rather than guessed:
--
--   * "Produced by" unanchored matched 173 chunks, almost all ordinary prose
--     ("the impression produced by the object"), so producer notes are matched
--     only at the head of a chunk.
--   * Footnote density alone does not separate a footnote run from annotated
--     body text — Zeller's prose carries inline citations as densely as
--     Plutarch's endnote pages. What separates them is whether the markers
--     start immediately, so `head_marks` counts markers in the first 120
--     characters.
--   * At >= 15 markers, density > 0.015 and >= 2 head markers, all 10 matches
--     are pure citation runs. The looser band (>= 10, > 0.008, >= 1) adds 24
--     more, including the chunk the model found, at lower precision — so it is
--     returned as 'candidate' and the agent reports it as info, not warning.
--
-- Scoped to the layers that claim to be the author's own words. A Mode 2
-- summary legitimately discusses its author and is not apparatus.

create or replace function public.quality_audit_apparatus_candidates()
returns table (
  id uuid,
  author text,
  work text,
  chunk_index integer,
  text_type text,
  signal text,
  confidence text,
  opening text
)
language sql
stable
as $$
  with live as (
    select * from rag_corpus
    where deprecated = false
      and text_type in ('primary', 'scholarship', 'modern_primary')
  ),
  marked as (
    select l.*,
      length(l.chunk_text) as len,
      (select count(*) from regexp_matches(l.chunk_text, '\[[0-9]{1,4}\]', 'g')) as marks,
      (select count(*) from regexp_matches(left(l.chunk_text, 120), '\[[0-9]{1,4}\]', 'g')) as head_marks
    from live l
  ),
  flagged as (
    select m.id, m.author, m.work, m.chunk_index, m.text_type, m.chunk_text, m.marks, m.head_marks, m.len,
      case
        -- Unambiguous digital-edition boilerplate, wherever it appears.
        when m.chunk_text ~ '(\*\*\*\s*(START|END) OF|The Project Gutenberg eBook of|Online Distributed Proofreading|Project Gutenberg Literary Archive)'
          then 'gutenberg'
        -- Producer and transcriber notes, anchored: unanchored matching is all
        -- false positives on ordinary prose.
        when m.chunk_text ~ '^\s*(Produced by |Transcriber|TRANSCRIBER|This etext was prepared by|A note from the digitizer|Full Text Archive)'
          then 'producer_note'
        -- Machine-readable front matter that was ingested as if it were text.
        when m.chunk_text ~ '^\s*---[\s\S]{0,8}title:'
          then 'yaml_front_matter'
        -- A table of contents: the word Contents plus a run of headings.
        when m.chunk_text ~ 'Contents'
          and (select count(*) from regexp_matches(m.chunk_text, '\m(BOOK|CHAPTER)\M', 'g')) >= 5
          then 'table_of_contents'
        when m.marks >= 15 and m.marks::numeric / greatest(m.len, 1) > 0.015 and m.head_marks >= 2
          then 'footnote_run'
        when m.marks >= 10 and m.marks::numeric / greatest(m.len, 1) > 0.008 and m.head_marks >= 1
          then 'footnote_candidate'
        else null
      end as signal
    from marked m
  )
  select id, author, work, chunk_index, text_type, signal,
         case when signal = 'footnote_candidate' then 'candidate' else 'high' end as confidence,
         regexp_replace(left(chunk_text, 140), '\s+', ' ', 'g') as opening
  from flagged
  where signal is not null
  order by confidence, signal, author, work, chunk_index
$$;

comment on function public.quality_audit_apparatus_candidates() is
  'Editorial apparatus and front matter in the verbatim layers, found by shape rather than by a model. For the Quality Audit Agent.';
