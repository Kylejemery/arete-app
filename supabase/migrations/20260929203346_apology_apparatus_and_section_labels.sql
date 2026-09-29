-- Plato, Apology: retire Jowett's Introduction, give the speech back its own
-- opening, and label every live chunk with the part of the speech it holds.
--
-- All 46 chunks were live and all 46 had a blank section_label, so a
-- retrieved passage said only "Plato, Apology". Labelling them is not enough
-- on its own, because the first fourteen chunks are not Plato:
--
-- 1. CHUNKS 0 TO 12 ARE JOWETT. Chunk 0 opens "Produced by Sue Asscher, and
--    David Widger Apology by Plato Translated by Benjamin Jowett Contents
--    INTRODUCTION APOLOGY INTRODUCTION. In what relation the 'Apology'...",
--    and 1 to 12 run on through Jowett's Introduction, which paraphrases the
--    speech in quotation marks. A counselor retrieving that gets Jowett's
--    summary attributed to Socrates. docs/corpus/CORPUS_REMEDIATION_2026-09.md
--    found this in September and recommended deprecating it; it was not done
--    for the Apology. Same defect and same treatment as Alcibiades in
--    20260921152557. Deprecated, never deleted.
--
-- 2. CHUNK 13 STRADDLES THE JOIN. Its first 961 characters are the end of the
--    Introduction; the rest is the speech's opening, "APOLOGY How you, O
--    Athenians, have been affected by my accusers...". Chunk 14 starts well
--    into the speech, so retiring 13 would take the opening with it. It is
--    trimmed to start at "How you, O Athenians". The untrimmed text is kept as
--    a deprecated row at the end of the work, as Seneca's Letters chunk 0 was
--    in 20260915164611, so the change stays auditable and reversible. Its
--    embedding is recomputed from the trimmed text after this migration.
--
-- 3. SECTION LABELS. The speech has three parts, and the text marks each
--    turn in its own words:
--      the defence            "How you, O Athenians, have been affected..."
--      after the verdict      "There are many reasons why I am not grieved,
--                              O men of Athens, at the vote of condemnation"
--                              (chunk 38)
--      after the sentence     "Not much time will be gained, O Athenians"
--                              (chunk 41)
--    Chunks 38 and 41 hold the end of one part and the start of the next, so
--    they carry both labels.
--
-- WHAT IS NOT CHANGED
--
-- locator stays null. docs/corpus/ACQUISITION_PLAN.md Part 5 asks for a
-- locator where the text itself gives canonical divisions, and this Jowett
-- text gives no Stephanus numbers. Writing ranges from memory would give a
-- citation no one can check against this text. Where there is no locator,
-- the plan puts the structural heading in section_label, which is what
-- this migration does.

-- 1. Jowett's Introduction: deprecate, never delete.
update public.rag_corpus
   set deprecated = true
 where author = 'Plato'
   and work = 'Apology'
   and program_id = 'stoicism-phd'
   and chunk_index between 0 and 12
   and deprecated = false
   and exists (select 1 from public.rag_corpus c0
                where c0.author = 'Plato' and c0.work = 'Apology' and c0.program_id = 'stoicism-phd'
                  and c0.chunk_index = 0 and c0.chunk_text like 'Produced by Sue Asscher%Translated by Benjamin Jowett%INTRODUCTION%');

-- 2. Keep the untrimmed chunk 13, deprecated, at the end of the work...
insert into public.rag_corpus (
  program_id, author, work, section_label, chunk_index, chunk_text, word_count,
  translator, source_url, text_type, embedding, course_relevance, difficulty,
  source_chunk_index, language, paired_chunk_id, source_type, parent_chunks,
  deprecated, edition_year, locator
)
select
  r.program_id, r.author, r.work, r.section_label,
  (select max(r2.chunk_index) + 1 from public.rag_corpus r2
    where r2.author = r.author and r2.work = r.work and r2.program_id = r.program_id),
  r.chunk_text, r.word_count,
  r.translator, r.source_url, r.text_type, r.embedding, r.course_relevance, r.difficulty,
  r.source_chunk_index, r.language, r.paired_chunk_id, r.source_type, r.parent_chunks,
  true, r.edition_year, r.locator
from public.rag_corpus r
where r.author = 'Plato'
  and r.work = 'Apology'
  and r.program_id = 'stoicism-phd'
  and r.chunk_index = 13
  and strpos(r.chunk_text, 'How you, O Athenians') > 1;

-- ...then trim the live row to the speech. Guarded: strpos > 1 means there is
-- still a prefix, so a second run changes nothing.
update public.rag_corpus
   set chunk_text = btrim(substring(chunk_text from strpos(chunk_text, 'How you, O Athenians')))
 where author = 'Plato'
   and work = 'Apology'
   and program_id = 'stoicism-phd'
   and chunk_index = 13
   and strpos(chunk_text, 'How you, O Athenians') > 1;

-- 3. Label the speech by its three parts.
update public.rag_corpus
   set section_label = case
         when chunk_index between 13 and 37 then 'The defence'
         when chunk_index = 38 then 'The defence / After the verdict: proposing a penalty'
         when chunk_index between 39 and 40 then 'After the verdict: proposing a penalty'
         when chunk_index = 41 then 'After the verdict: proposing a penalty / After the sentence: to the jury'
         when chunk_index between 42 and 45 then 'After the sentence: to the jury'
       end
 where author = 'Plato'
   and work = 'Apology'
   and program_id = 'stoicism-phd'
   and chunk_index between 13 and 45
   and deprecated = false
   and coalesce(section_label, '') = '';
