-- corpus.apparatus: catch the source site's own page furniture.
--
-- Seneca's On Anger carried "SophiaOmni <page> www. sophiaomni.org" inside 58
-- of its 113 live chunks — a running footer from the PDF it was transcribed
-- from, sitting mid-sentence in the reading text, never cut before chunking.
-- It reached the library page and could be handed to a counselor as Seneca
-- speaking. Nothing caught it: it was found by eye, which is the definition of
-- a rule that belongs in this agent.
--
-- The existing signals miss this shape by construction. 'gutenberg' matches
-- Gutenberg's own boilerplate only. 'producer_note' is anchored at ^, so it
-- catches a transcriber's note that OPENS a chunk and not a footer that
-- repeats through the middle of one — which is exactly why Plato's Alcibiades
-- has gone on carrying "<page> / 53 Full Text Archive https://www.fulltext
-- archive.com" in 46 live chunks without ever being reported.
--
-- The signal is a web address in a verbatim layer. Ancient texts do not cite
-- URLs; a domain inside primary, scholarship or modern_primary is the digital
-- edition talking over the author. This also picks up ingest metadata that
-- leaked into the text (the eulogikon.org "eul_wid / eul_aid / canonical"
-- headers on the Musonius, Antipater and Zeno fragments).
--
-- It gets its own confidence bucket rather than joining 'high'. The 'high'
-- finding's action is "deprecate them", which is right for a chunk that is
-- wholly boilerplate and wrong here: these chunks are the author's text with
-- someone else's footer threaded through it, so the remedy is to strip the
-- furniture and re-embed, not to throw the passage away.

create or replace function public.quality_audit_apparatus_candidates()
returns table(id uuid, author text, work text, chunk_index integer, text_type text, signal text, confidence text, opening text)
language sql
stable
as $function$
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
        -- The source site's running furniture: a web address inside a verbatim
        -- layer. \s* after www. and before the TLD because OCR splits them
        -- ("www. sophiaomni.org").
        when m.chunk_text ~* '(https?://|www\.\s*)[a-z0-9][a-z0-9.-]*\.\s*(org|com|net|edu)\M'
          then 'source_site_furniture'
        when m.marks >= 15 and m.marks::numeric / greatest(m.len, 1) > 0.015 and m.head_marks >= 2
          then 'footnote_run'
        when m.marks >= 10 and m.marks::numeric / greatest(m.len, 1) > 0.008 and m.head_marks >= 1
          then 'footnote_candidate'
        else null
      end as signal
    from marked m
  )
  select id, author, work, chunk_index, text_type, signal,
         case
           when signal = 'footnote_candidate' then 'candidate'
           when signal = 'source_site_furniture' then 'furniture'
           else 'high'
         end as confidence,
         regexp_replace(left(chunk_text, 140), '\s+', ' ', 'g') as opening
  from flagged
  where signal is not null
  order by confidence, signal, author, work, chunk_index
$function$;
