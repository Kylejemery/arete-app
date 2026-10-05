-- Seneca: the two consolations carried each other's names.
--
-- Stewart's 1889 Minor Dialogues (Bohn) numbers the dialogues as books, and
-- the corpus text heads them itself: chunk 322 closes On the Shortness of Life
-- with "THE ELEVENTH BOOK OF THE DIALOGUES OF L. ANNAEUS SENECA, ADDRESSED TO
-- HIS MOTHER, HELVIA", and chunk 355 closes that dialogue with "THE TWELFTH BOOK
-- ... ADDRESSED TO POLYBIUS". The ingest named them the other way round, from
-- a book table with XI and XII transposed (DIALOGUE_ESSAYS in
-- academy/web/src/scripts/label-passages.ts, corrected in the same PR). So:
--
--   323-355  labelled Consolation to Polybius, text is To Helvia ("I have often
--            felt eager to console you", the step-mother and uncle she lost,
--            Zeno with no slave at 12.4)
--   356-382  labelled Consolation to Helvia, text is To Polybius (Fortune's blow
--            "while Caesar lives", Latin among barbarians at 18)
--   383      labelled Consolation to Helvia, text is 31 words of the
--            translator's endnotes and then the title and opening of On
--            Clemency, which continues at 384
--
-- The chapter numbers in section_label are right (Helvia has 20, Polybius 18);
-- only the work names are crossed, so section_label swaps the two names and
-- keeps its numbers. Seam chunks follow the Cicero split's rule, majority of
-- the text: 355 (220 words of Helvia and its notes, 180 of Polybius) stays
-- with Helvia, 382 (381 words of Polybius before the Clemency title) stays
-- with Polybius, 383 goes to Clemency. Chunk 322's seam label names the next
-- dialogue and is corrected too.
--
-- Row ids, chunk_text, chunk_index and embeddings are untouched. Embeddings
-- are of raw chunk_text with no metadata prefix, so nothing needs re-embedding.
-- No (author, work, program_id, chunk_index) collision is possible: the two
-- blocks occupy different chunk_index ranges, and Clemency has no row at 383.
--
-- Dependents checked on 2026-10-05: library_comments, library_overrides and
-- corpus_question_registrations hold no rows for either consolation, so no
-- annotation or registration is re-pointed. library_excerpts caches one shelf
-- excerpt per work and is refreshed below. concept_passage_map carries a
-- copied work label beside chunk_id; for rows on the chunks relabelled here
-- it is set from the chunk. Its other inconsistencies predate this and are
-- left alone.

begin;

-- Guard: abort unless the rows are exactly as found.
do $$
declare
  n_pol int; n_hel int; n_clem int; n_other int;
  h11 boolean; h12 boolean;
begin
  select count(*) filter (where work = 'Consolation to Polybius' and chunk_index between 323 and 355 and not deprecated),
         count(*) filter (where work = 'Consolation to Helvia'   and chunk_index between 356 and 383 and not deprecated),
         count(*) filter (where work = 'Clemency'                and chunk_index between 384 and 430 and not deprecated),
         count(*) filter (where work in ('Consolation to Polybius', 'Consolation to Helvia')
                            and not (chunk_index between 323 and 383 and not deprecated))
    into n_pol, n_hel, n_clem, n_other
  from rag_corpus where author = 'Seneca' and program_id = 'stoicism-phd';
  select chunk_text like '%ELEVENTH BOOK OF THE DIALOGUES OF L. ANNAEUS SENECA, ADDRESSED TO HIS MOTHER, HELVIA%'
    into h11 from rag_corpus where author = 'Seneca' and program_id = 'stoicism-phd' and chunk_index = 322 and work = 'On the Shortness of Life';
  select chunk_text like '%TWELFTH BOOK OF THE DIALOGUES OF L. ANNAEUS SENECA, ADDRESSED TO POLYBIUS%'
    into h12 from rag_corpus where author = 'Seneca' and program_id = 'stoicism-phd' and chunk_index = 355 and work = 'Consolation to Polybius';
  if n_pol <> 33 or n_hel <> 28 or n_clem <> 47 or n_other <> 0 or h11 is not true or h12 is not true then
    raise exception 'unexpected pre-state: polybius=% helvia=% clemency=% other=% xi_heading=% xii_heading=% (expected 33/28/47/0/t/t)',
      n_pol, n_hel, n_clem, n_other, h11, h12;
  end if;
end $$;

-- The relabel. Names swap through a placeholder so neither replace sees the
-- other's output.
update rag_corpus
   set work = case
                when chunk_index between 323 and 355 then 'Consolation to Helvia'
                when chunk_index between 356 and 382 then 'Consolation to Polybius'
                when chunk_index = 383               then 'Clemency'
                else work
              end,
       section_label = replace(replace(replace(section_label,
                         'Consolation to Polybius', '#XII#'),
                         'Consolation to Helvia',   'Consolation to Polybius'),
                         '#XII#',                   'Consolation to Helvia')
 where author = 'Seneca' and program_id = 'stoicism-phd'
   and chunk_index between 322 and 383
   and (work in ('Consolation to Polybius', 'Consolation to Helvia')
        or (chunk_index = 322 and work = 'On the Shortness of Life'));

-- The copied label in concept_passage_map follows the chunk it points at.
update concept_passage_map m
   set work = r.work
  from rag_corpus r
 where m.chunk_id = r.id
   and r.author = 'Seneca' and r.program_id = 'stoicism-phd'
   and r.chunk_index between 323 and 383
   and r.work in ('Consolation to Helvia', 'Consolation to Polybius', 'Clemency')
   and m.work is distinct from r.work;

-- Guard: abort unless the relabel landed exactly as intended.
do $$
declare
  n_hel int; n_pol int; n_clem int; n_crossed int;
  first_hel text; first_pol text; label_322 text;
begin
  select count(*) filter (where work = 'Consolation to Helvia'   and chunk_index between 323 and 355 and not deprecated),
         count(*) filter (where work = 'Consolation to Polybius' and chunk_index between 356 and 382 and not deprecated),
         count(*) filter (where work = 'Clemency'                and chunk_index between 383 and 430 and not deprecated),
         count(*) filter (where (work = 'Consolation to Helvia'   and section_label like 'Consolation to Polybius%')
                             or (work = 'Consolation to Polybius' and section_label like 'Consolation to Helvia%'))
    into n_hel, n_pol, n_clem, n_crossed
  from rag_corpus where author = 'Seneca' and program_id = 'stoicism-phd';
  select section_label into first_hel from rag_corpus
   where author = 'Seneca' and program_id = 'stoicism-phd' and chunk_index = 323 and work = 'Consolation to Helvia';
  select section_label into first_pol from rag_corpus
   where author = 'Seneca' and program_id = 'stoicism-phd' and chunk_index = 357 and work = 'Consolation to Polybius';
  select section_label into label_322 from rag_corpus
   where author = 'Seneca' and program_id = 'stoicism-phd' and chunk_index = 322 and work = 'On the Shortness of Life';
  if n_hel <> 33 or n_pol <> 27 or n_clem <> 48 or n_crossed <> 0
     or first_hel <> 'Consolation to Helvia 1' or first_pol <> 'Consolation to Polybius 2'
     or label_322 <> 'On the Shortness of Life 20–Consolation to Helvia 1' then
    raise exception 'unexpected post-state: helvia=% polybius=% clemency=% crossed=% 323=% 357=% 322=%',
      n_hel, n_pol, n_clem, n_crossed, first_hel, first_pol, label_322;
  end if;
end $$;

commit;

-- The shelf cards carry one cached excerpt and a chunk count per work; both
-- were the other consolation's until now.
select public.refresh_library_excerpts();
