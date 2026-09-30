-- Xenophon, Memorabilia: strip the Gutenberg furniture, record the provenance
-- the text states, and label every live chunk by book and chapter.
-- The same treatment the Jowett dialogues had in 20260930123730.
--
-- Before this migration all 202 live chunks (0 to 201) had a blank
-- section_label and a null locator, and every row had null translator,
-- source_url and edition_year, the three fields ACQUISITION_PLAN.md Part 5
-- requires at the write path.
--
-- 1. FURNITURE. Chunk 0's first 1,941 characters are the Project Gutenberg
--    header and the preparer's note; Book I begins at "BOOK I I I have often
--    wondered". Chunk 201 ends Book IV's footnotes at character 486, then runs
--    into "*** END OF THE PROJECT GUTENBERG EBOOK" and the licence. Chunks 202
--    to 209, the rest of the licence, were already deprecated. Chunk 0 is
--    trimmed to the book heading and chunk 201 cut before the end marker; each
--    untrimmed text is kept as a deprecated row at the end of the work, as in
--    20260915164611, and both are re-embedded after this migration.
--
-- 2. PROVENANCE, from chunk 0's own text, checked by the guard:
--      "Translated by H. G. Dakyns"        -> translator 'H. G. Dakyns'
--      "First Published 1897 by Macmillan" -> edition_year 1897
--      "[eBook #1177]", gutenberg.org      -> source_url
--                                             https://www.gutenberg.org/ebooks/1177
--    The URL is the canonical form of the eBook number the text names; the
--    page itself could not be fetched from this environment.
--
-- 3. BOOK AND CHAPTER. The text prints "BOOK I" to "BOOK IV" and a Roman
--    chapter number standing alone between sentences at each chapter. The
--    chapter is numbered by its order within the book, not by the numeral,
--    because the source prints Book III, chapter 13 as "XII" a second time
--    (chunk 137, "XII Once when some one was in a fury of indignation"). A
--    heading repeated at the start of the next chunk by the chunk overlap is
--    counted once. That gives 7, 10, 14 and 8 chapters, the work's own. Label
--    "Book I, chapter 2", locator "1.2"; a chunk that crosses a chapter
--    carries both ("1.1–1.2").
--
-- NOT CHANGED. Dakyns's footnotes ("(7) Reading {os nomizoien}...") sit
-- inline after the passages they annotate throughout the text. They are the
-- translator's, not Xenophon's, but they are interleaved with his words
-- rather than in separable chunks, so removing them is a re-chunking job, not
-- a label fix.

-- 2 first, while chunk 0 still holds the title page the guard reads.
update public.rag_corpus
   set translator   = coalesce(translator, 'H. G. Dakyns'),
       edition_year = coalesce(edition_year, 1897),
       source_url   = coalesce(source_url, 'https://www.gutenberg.org/ebooks/1177')
 where author = 'Xenophon' and work = 'Memorabilia' and program_id = 'stoicism-phd'
   and exists (select 1 from public.rag_corpus c0
                where c0.author = 'Xenophon' and c0.work = 'Memorabilia' and c0.program_id = 'stoicism-phd'
                  and c0.chunk_index = 0
                  and c0.chunk_text like '%[eBook #1177]%'
                  and c0.chunk_text like '%Translated by H. G. Dakyns%'
                  and c0.chunk_text like '%First Published 1897 by Macmillan%');

-- 1. Keep each untrimmed text, deprecated, at the end of the work...
insert into public.rag_corpus (
  program_id, author, work, section_label, chunk_index, chunk_text, word_count,
  translator, source_url, text_type, embedding, course_relevance, difficulty,
  source_chunk_index, language, paired_chunk_id, source_type, parent_chunks,
  deprecated, edition_year, locator
)
select
  r.program_id, r.author, r.work, r.section_label,
  (select max(r2.chunk_index) from public.rag_corpus r2
    where r2.author = r.author and r2.work = r.work and r2.program_id = r.program_id)
    + row_number() over (order by r.chunk_index),
  r.chunk_text, r.word_count,
  r.translator, r.source_url, r.text_type, r.embedding, r.course_relevance, r.difficulty,
  r.source_chunk_index, r.language, r.paired_chunk_id, r.source_type, r.parent_chunks,
  true, r.edition_year, r.locator
from public.rag_corpus r
where r.author = 'Xenophon' and r.work = 'Memorabilia' and r.program_id = 'stoicism-phd'
  and r.deprecated = false
  and ((r.chunk_index = 0   and strpos(r.chunk_text, 'BOOK I I I have often wondered') > 1)
    or (r.chunk_index = 201 and strpos(r.chunk_text, '*** END OF THE PROJECT GUTENBERG') > 1));

-- ...then trim the live rows. Guarded, so a second run changes nothing.
update public.rag_corpus
   set chunk_text = btrim(substring(chunk_text from strpos(chunk_text, 'BOOK I I I have often wondered')))
 where author = 'Xenophon' and work = 'Memorabilia' and program_id = 'stoicism-phd'
   and chunk_index = 0 and deprecated = false
   and strpos(chunk_text, 'BOOK I I I have often wondered') > 1;

update public.rag_corpus
   set chunk_text = btrim(left(chunk_text, strpos(chunk_text, '*** END OF THE PROJECT GUTENBERG') - 1))
 where author = 'Xenophon' and work = 'Memorabilia' and program_id = 'stoicism-phd'
   and chunk_index = 201 and deprecated = false
   and strpos(chunk_text, '*** END OF THE PROJECT GUTENBERG') > 1;

-- 3. Book and chapter.
with src as (
  select chunk_index, chunk_text
    from public.rag_corpus
   where author = 'Xenophon' and work = 'Memorabilia' and program_id = 'stoicism-phd'
     and deprecated = false
),
raw as (
  select s.chunk_index, 'book' as kind,
         regexp_instr(s.chunk_text, 'BOOK [IVX]+ I [A-Z]', 1, n) as pos
    from src s, generate_series(1, regexp_count(s.chunk_text, 'BOOK [IVX]+ I [A-Z]')) n
  union all
  select s.chunk_index, 'chapter',
         regexp_instr(s.chunk_text, '(?:[.!?"”’)\]]|\})\s+[IVXL]+\s+[A-Z]', 1, n)
    from src s, generate_series(1, regexp_count(s.chunk_text, '(?:[.!?"”’)\]]|\})\s+[IVXL]+\s+[A-Z]')) n
),
ev as (
  select r.chunk_index, r.kind, r.pos, substr(s.chunk_text, r.pos, 80) as sig
    from raw r join src s using (chunk_index)
),
-- A heading that the previous chunk already holds is the overlap repeating
-- it. The earlier copy can be cut short by its chunk's end, so compare only
-- as much as both hold.
kept as (
  select e.* from ev e
   where not exists (
     select 1 from ev p
      where p.chunk_index = e.chunk_index - 1 and p.kind = e.kind
        and least(length(p.sig), length(e.sig)) >= 20
        and left(p.sig, least(length(p.sig), length(e.sig))) = left(e.sig, least(length(p.sig), length(e.sig))))
),
numbered as (
  select k.*, sum(case when k.kind = 'book' then 1 else 0 end) over (order by k.chunk_index, k.pos) as book_no
    from kept k
),
chapters as (
  select n.chunk_index, n.pos, n.book_no,
         row_number() over (partition by n.book_no order by n.chunk_index, n.pos) as chapter_no
    from numbered n
),
spans as (
  select c.chunk_index,
         (select h.book_no || '.' || h.chapter_no from chapters h
           where h.chunk_index < c.chunk_index order by h.chunk_index desc, h.pos desc limit 1) as start_key,
         (select h.book_no || '.' || h.chapter_no from chapters h
           where h.chunk_index = c.chunk_index order by h.pos limit 1) as first_crossed,
         (select h.book_no || '.' || h.chapter_no from chapters h
           where h.chunk_index = c.chunk_index order by h.pos desc limit 1) as last_crossed
    from src c
),
ends as (
  select chunk_index,
         coalesce(start_key, first_crossed) as first_key,
         coalesce(last_crossed, start_key) as last_key
    from spans
),
labels as (
  select e.chunk_index, e.first_key, e.last_key,
         'Book ' || (array['I','II','III','IV'])[split_part(e.first_key, '.', 1)::int]
           || ', chapter ' || split_part(e.first_key, '.', 2) as first_label,
         'Book ' || (array['I','II','III','IV'])[split_part(e.last_key, '.', 1)::int]
           || ', chapter ' || split_part(e.last_key, '.', 2) as last_label
    from ends e
)
update public.rag_corpus r
   set section_label = case when l.first_key = l.last_key then l.first_label
                            else l.first_label || ' / ' || l.last_label end,
       locator       = case when l.first_key = l.last_key then l.first_key
                            else l.first_key || '–' || l.last_key end
  from labels l
 where r.author = 'Xenophon' and r.work = 'Memorabilia' and r.program_id = 'stoicism-phd'
   and r.deprecated = false and r.chunk_index = l.chunk_index
   and coalesce(r.section_label, '') = '' and r.locator is null;
