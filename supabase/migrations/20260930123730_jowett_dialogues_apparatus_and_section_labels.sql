-- The other Jowett dialogues: retire Jowett's apparatus, trim the chunks that
-- straddle a join, and label every live chunk with the part of the dialogue
-- it holds. The same treatment the Apology had in 20260929203346.
--
-- Before this migration, of the seven works below (988 live chunks):
--   * The Republic's chunks 0 to 278 were Jowett's Introduction and Analysis,
--     45 percent of the work, filed as Plato. Book I begins in chunk 279 at
--     character 1919. Euthyphro's chunks 0 to 5 were Jowett's Introduction;
--     the dialogue begins in chunk 6 at character 2004. Found by
--     docs/corpus/CORPUS_REMEDIATION_2026-09.md in September, not yet retired.
--   * Gorgias, Meno and Protagoras open chunk 0 with an ingest note ("GORGIAS
--     by Plato Translated by Benjamin Jowett. Public domain (Project
--     Gutenberg). Introduction omitted; dialogue text only.") before the
--     dialogue.
--   * Every live chunk of Euthyphro, The Republic, Timaeus and Alcibiades had
--     a blank section_label; Gorgias, Meno and Protagoras carried the
--     translator's name, "Jowett", as a label on every chunk.
-- Timaeus and Alcibiades open cleanly (Alcibiades' apparatus went in
-- 20260921152557). No work carries a Gutenberg trailer at the end.
--
-- 1. APPARATUS. Deprecated, never deleted, each guarded on the text of its
--    chunk 0. The Republic's chunk 279 is retired whole: its 264 characters of
--    dialogue ("BOOK I. I went down yesterday to the Piraeus...") are repeated
--    at the start of chunk 280 by the chunk overlap, which the guard checks.
--
-- 2. TRIMS. Euthyphro 6 is trimmed to "PERSONS OF THE DIALOGUE" (chunk 7 does
--    not repeat the list of persons, so the chunk is kept); Gorgias, Meno and
--    Protagoras 0 lose the ingest note the same way; The Republic 280 loses
--    "Timaeus. ", the last word of Jowett's Analysis. Each untrimmed text is
--    kept as a deprecated row at the end of its work, as in 20260915164611.
--    The five trimmed chunks are re-embedded after this migration.
--
-- 3. SECTION LABELS, from divisions the text marks itself:
--    The Republic  its own BOOK I to BOOK X headings. The book also goes in
--                  locator ("1", or "6–7" where a chunk crosses a heading):
--                  books are a canonical division this text prints, so
--                  ACQUISITION_PLAN.md Part 5 asks for it.
--    Gorgias       the speaker tags: Socrates talks with Gorgias, then with
--                  Polus ("POLUS: And do even you, Socrates...", chunk 17),
--                  then with Callicles ("CALLICLES: Tell me, Chaerephon, is
--                  Socrates in earnest...", chunk 42).
--    Meno          the speaker tags: Meno; the slave (first "BOY:" in 14,
--                  last in 18); Meno; Anytus (first "ANYTUS:" in 24, last
--                  in 30); Meno.
--    Timaeus       the prologue; Critias's story ("CRITIAS: Then listen,
--                  Socrates, to a tale...", chunk 4); Timaeus's discourse in
--                  its own three parts: from "TIMAEUS: All men, Socrates"
--                  (12); "the works of intelligence have been set forth; and
--                  now ... the things which come into being through
--                  necessity" (35); "let us revert in a few words to the
--                  point at which we began" (63).
--    Protagoras    narrated, so no speaker tags after the frame: the frame
--                  with the companion; "Last night ... Hippocrates" (1); the
--                  door-keeper at Callias's house (7); "I think that the myth
--                  will be more interesting" (14); "Protagoras ended" (24);
--                  "skill in poetry is the principal part of education" (36);
--                  "I would rather have done with poems and odes" (47).
--    Euthyphro, Alcibiades  one conversation throughout, labelled by it.
--    A chunk that crosses a turn carries both labels.
--
-- Stephanus numbers stay out of locator: no Jowett text here prints them.

-- 1. Apparatus: deprecate, never delete.
update public.rag_corpus
   set deprecated = true
 where author = 'Plato' and work = 'Euthyphro' and program_id = 'stoicism-phd'
   and chunk_index between 0 and 5 and deprecated = false
   and exists (select 1 from public.rag_corpus c0
                where c0.author = 'Plato' and c0.work = 'Euthyphro' and c0.program_id = 'stoicism-phd'
                  and c0.chunk_index = 0 and c0.chunk_text like 'Produced by Sue Asscher EUTHYPHRO%Translated by Benjamin Jowett INTRODUCTION%');

update public.rag_corpus
   set deprecated = true
 where author = 'Plato' and work = 'The Republic' and program_id = 'stoicism-phd'
   and chunk_index between 0 and 278 and deprecated = false
   and exists (select 1 from public.rag_corpus c0
                where c0.author = 'Plato' and c0.work = 'The Republic' and c0.program_id = 'stoicism-phd'
                  and c0.chunk_index = 0 and c0.chunk_text like 'THE REPUBLIC By Plato Translated by Benjamin Jowett%INTRODUCTION AND ANALYSIS%');

update public.rag_corpus r279
   set deprecated = true
  from public.rag_corpus r280
 where r279.author = 'Plato' and r279.work = 'The Republic' and r279.program_id = 'stoicism-phd'
   and r279.chunk_index = 279 and r279.deprecated = false
   and r280.author = r279.author and r280.work = r279.work and r280.program_id = r279.program_id
   and r280.chunk_index = 280
   and strpos(r279.chunk_text, 'BOOK I. I went down yesterday') > 1
   and strpos(r280.chunk_text,
              substring(r279.chunk_text from strpos(r279.chunk_text, 'BOOK I. I went down yesterday'))) > 0;

-- 2. Trims. Keep each untrimmed text, deprecated, at the end of its work...
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
join (values
  ('Euthyphro',     6, 'PERSONS OF THE DIALOGUE'),
  ('Gorgias',       0, 'PERSONS OF THE DIALOGUE'),
  ('Meno',          0, 'PERSONS OF THE DIALOGUE'),
  ('Protagoras',    0, 'PERSONS OF THE DIALOGUE'),
  ('The Republic', 280, 'BOOK I. I went down yesterday')
) as t(work, chunk_index, marker)
  on t.work = r.work and t.chunk_index = r.chunk_index
where r.author = 'Plato' and r.program_id = 'stoicism-phd' and r.deprecated = false
  and strpos(r.chunk_text, t.marker) > 1;

-- ...then trim the live rows. Guarded: strpos > 1 means there is still a
-- prefix, so a second run changes nothing.
update public.rag_corpus r
   set chunk_text = btrim(substring(r.chunk_text from strpos(r.chunk_text, t.marker))),
       word_count = case when r.word_count is null then null else array_length(regexp_split_to_array(
                      btrim(substring(r.chunk_text from strpos(r.chunk_text, t.marker))), '\s+'), 1) end
  from (values
         ('Euthyphro',     6, 'PERSONS OF THE DIALOGUE'),
         ('Gorgias',       0, 'PERSONS OF THE DIALOGUE'),
         ('Meno',          0, 'PERSONS OF THE DIALOGUE'),
         ('Protagoras',    0, 'PERSONS OF THE DIALOGUE'),
         ('The Republic', 280, 'BOOK I. I went down yesterday')
       ) as t(work, chunk_index, marker)
 where r.author = 'Plato' and r.program_id = 'stoicism-phd' and r.deprecated = false
   and r.work = t.work and r.chunk_index = t.chunk_index
   and strpos(r.chunk_text, t.marker) > 1;

-- 3a. Labels for the dialogues divided by conversation.
update public.rag_corpus r
   set section_label = l.label
  from (values
  ('Euthyphro',   6,  26, 'Socrates and Euthyphro'),
  ('Alcibiades', 11,  54, 'Socrates and Alcibiades'),

  ('Gorgias',     0,  16, 'Socrates and Gorgias'),
  ('Gorgias',    17,  17, 'Socrates and Gorgias / Socrates and Polus'),
  ('Gorgias',    18,  41, 'Socrates and Polus'),
  ('Gorgias',    42,  42, 'Socrates and Polus / Socrates and Callicles'),
  ('Gorgias',    43, 102, 'Socrates and Callicles'),

  ('Meno',        0,  13, 'Socrates and Meno'),
  ('Meno',       14,  14, 'Socrates and Meno / Socrates and Meno''s slave'),
  ('Meno',       15,  17, 'Socrates and Meno''s slave'),
  ('Meno',       18,  18, 'Socrates and Meno''s slave / Socrates and Meno'),
  ('Meno',       19,  23, 'Socrates and Meno'),
  ('Meno',       24,  24, 'Socrates and Meno / Socrates and Anytus'),
  ('Meno',       25,  29, 'Socrates and Anytus'),
  ('Meno',       30,  30, 'Socrates and Anytus / Socrates and Meno'),
  ('Meno',       31,  36, 'Socrates and Meno'),

  ('Timaeus',     0,   3, 'Prologue'),
  ('Timaeus',     4,   4, 'Prologue / Critias: the story of Atlantis'),
  ('Timaeus',     5,  11, 'Critias: the story of Atlantis'),
  ('Timaeus',    12,  12, 'Critias: the story of Atlantis / Timaeus: the works of reason'),
  ('Timaeus',    13,  34, 'Timaeus: the works of reason'),
  ('Timaeus',    35,  35, 'Timaeus: the works of reason / Timaeus: what comes about through necessity'),
  ('Timaeus',    36,  62, 'Timaeus: what comes about through necessity'),
  ('Timaeus',    63,  63, 'Timaeus: what comes about through necessity / Timaeus: reason and necessity together'),
  ('Timaeus',    64,  92, 'Timaeus: reason and necessity together'),

  ('Protagoras',  0,   0, 'Frame: Socrates and a companion'),
  ('Protagoras',  1,   1, 'Frame: Socrates and a companion / Socrates and Hippocrates'),
  ('Protagoras',  2,   6, 'Socrates and Hippocrates'),
  ('Protagoras',  7,   7, 'Socrates and Hippocrates / At the house of Callias'),
  ('Protagoras',  8,  13, 'At the house of Callias'),
  ('Protagoras', 14,  14, 'At the house of Callias / Protagoras''s great speech'),
  ('Protagoras', 15,  23, 'Protagoras''s great speech'),
  ('Protagoras', 24,  24, 'Protagoras''s great speech / Socrates and Protagoras: is virtue one?'),
  ('Protagoras', 25,  35, 'Socrates and Protagoras: is virtue one?'),
  ('Protagoras', 36,  36, 'Socrates and Protagoras: is virtue one? / The poem of Simonides'),
  ('Protagoras', 37,  46, 'The poem of Simonides'),
  ('Protagoras', 47,  47, 'The poem of Simonides / Socrates and Protagoras: pleasure, knowledge and courage'),
  ('Protagoras', 48,  65, 'Socrates and Protagoras: pleasure, knowledge and courage')
       ) as l(work, first_ci, last_ci, label)
 where r.author = 'Plato' and r.program_id = 'stoicism-phd' and r.deprecated = false
   and r.work = l.work and r.chunk_index between l.first_ci and l.last_ci
   and coalesce(r.section_label, '') in ('', 'Jowett');

-- 3b. The Republic, by its own book headings. A heading in the first 50
-- characters only repeats the previous chunk's tail (the overlap), so the
-- chunk starts in that book; a heading further in means the chunk crosses it.
with heads as (
  select r.chunk_index,
         strpos(r.chunk_text, 'BOOK ' || m[1] || '.') as pos,
         array_position(array['I','II','III','IV','V','VI','VII','VIII','IX','X'], m[1]) as book
    from public.rag_corpus r,
         regexp_matches(r.chunk_text, 'BOOK ([IVX]+)\.', 'g') as m
   where r.author = 'Plato' and r.work = 'The Republic' and r.program_id = 'stoicism-phd'
     and r.deprecated = false and r.chunk_index >= 280
),
books as (
  select r.id,
         (select max(h.book) from heads h
           where h.chunk_index < r.chunk_index or (h.chunk_index = r.chunk_index and h.pos <= 50)) as start_book,
         (select max(h.book) from heads h
           where h.chunk_index = r.chunk_index and h.pos > 50) as crossed_book
    from public.rag_corpus r
   where r.author = 'Plato' and r.work = 'The Republic' and r.program_id = 'stoicism-phd'
     and r.deprecated = false and r.chunk_index >= 280
),
roman(n, numeral) as (
  select n, (array['I','II','III','IV','V','VI','VII','VIII','IX','X'])[n] from generate_series(1, 10) n
)
update public.rag_corpus r
   set section_label = 'Book ' || s.numeral || coalesce(' / Book ' || c.numeral, ''),
       locator = b.start_book::text || coalesce('–' || b.crossed_book::text, '')
  from books b
  join roman s on s.n = b.start_book
  left join roman c on c.n = b.crossed_book
 where r.id = b.id
   and coalesce(r.section_label, '') = ''
   and r.locator is null;
