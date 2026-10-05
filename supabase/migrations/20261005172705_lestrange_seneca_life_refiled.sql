-- Seneca, Morals: L'Estrange's preface and life of Seneca were filed as Seneca.
--
-- The work is Project Gutenberg #56075, "Seneca's Morals of a Happy Life,
-- Benefits, Anger and Clemency. Translated by SIR ROGER L'ESTRANGE. New
-- Edition. Chicago: Belford, Clarke & Co., 1882" (chunk 0 carries the title
-- page). Its first sixteen rows are not Seneca:
--
--   0        the Gutenberg header and title page (about 240 words), then the
--            start of L'Estrange's preface "TO THE READER"
--   1-9      the preface: why he made an abstract of Seneca rather than a
--            translation, and Augustine's charge, quoting Seneca's lost On
--            Superstition, that Seneca "worshipped what he reproved"
--   10       the last 117 words of the preface, then "SENECA'S LIFE AND
--            DEATH" (283 words): the life by majority
--   11-15    the life, much of it L'Estrange's English of Tacitus, Annals
--            15.60-64, on Seneca's fall and death
--   16       the life's last 182 words, then "SENECA OF BENEFITS. CHAPTER I"
--            (218 words): stays with Seneca by majority, the Cicero split's
--            rule
--
-- So all sixteen rows retrieved as Seneca's own words: the counselor
-- post-filter keeps an author's primary rows, and these were exactly that.
--
-- The September precedent (20260903165348) deprecated translators' prefaces
-- and notes rather than re-label them as scholarship under the philosopher's
-- name, and said such material belongs under its own author through the
-- admission tests. Both halves were put through those tests, recorded in
-- docs/corpus/ADMISSIONS_2026-10-05_LESTRANGE_SENECA_LIFE.md:
--
--   * The life is admitted: L'Estrange's own work, scholarship, renumbered
--     0-5 under author Roger L'Estrange, work Seneca's Life and Death, with
--     the provenance Part 5 requires, and registered against Q13
--     (complicates) and Q14 (states). The corpus holds no Tacitus; this is
--     its only account of Seneca's death.
--   * The preface is not: its method note is apparatus about the edition,
--     and its one argument is Augustine's, which the corpus holds in
--     Augustine (City of God 6.10). It is filed under L'Estrange too, so
--     even the deprecated rows stop crediting Seneca, and deprecated.
--
-- Row ids, chunk_text and embeddings are untouched; embeddings are of raw
-- chunk_text, so nothing needs re-embedding. The three Stoic QCA evidence
-- excerpts in the life (rows 11-13) keep their ids and stay live.
-- Dependents checked on 2026-10-05: concept_passage_map, library_comments,
-- library_overrides and corpus_question_registrations hold nothing on these
-- rows. Seneca's Morals keeps chunk_index 16-331 as it was; nothing else in
-- the work changes, including its absent translator, which is a separate
-- question (L'Estrange calls the work an abstract, not a translation).

begin;

-- Guard: abort unless the rows are exactly as found.
do $$
declare
  n_live int; n_dep int; n_lestrange int;
  h_reader boolean; h_life boolean; h_benefits boolean;
begin
  select count(*) filter (where not deprecated and chunk_index between 0 and 322),
         count(*) filter (where deprecated and chunk_index between 323 and 331)
    into n_live, n_dep
  from rag_corpus where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd';
  select count(*) into n_lestrange from rag_corpus where author = 'Roger L''Estrange';
  select chunk_text like '%Translated by SIR ROGER L’ESTRANGE%TO THE READER%' into h_reader
    from rag_corpus where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd' and chunk_index = 0;
  select chunk_text like '%SENECA’S LIFE AND DEATH%' into h_life
    from rag_corpus where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd' and chunk_index = 10;
  select chunk_text like '%SENECA OF BENEFITS. CHAPTER I.%' into h_benefits
    from rag_corpus where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd' and chunk_index = 16;
  if n_live <> 323 or n_dep <> 9 or n_lestrange <> 0
     or h_reader is not true or h_life is not true or h_benefits is not true then
    raise exception 'unexpected pre-state: live=% deprecated=% lestrange=% reader=% life=% benefits=% (expected 323/9/0/t/t/t)',
      n_live, n_dep, n_lestrange, h_reader, h_life, h_benefits;
  end if;
end $$;

-- 1. The life, admitted as L'Estrange's scholarship.
update rag_corpus
   set author           = 'Roger L''Estrange',
       work             = 'Seneca''s Life and Death',
       chunk_index      = chunk_index - 10,
       text_type        = 'scholarship',
       section_label    = 'Seneca''s Life and Death',
       translator       = 'original',
       edition_year     = 1882,
       edition          = 'Seneca''s Morals of a Happy Life, Benefits, Anger and Clemency, tr. Sir Roger L''Estrange. New Edition. Chicago: Belford, Clarke & Co.',
       source_url       = 'https://www.gutenberg.org/ebooks/56075',
       license_status   = 'public_domain_us',
       license_evidence = 'Sir Roger L''Estrange (1616-1704), Seneca''s Morals by Way of Abstract, first published 1678; this text is the Belford, Clarke & Co. 1882 printing, Project Gutenberg ebook #56075. Public domain in the United States.',
       quotable_on_air  = false
 where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd'
   and chunk_index between 10 and 15 and not deprecated;

-- 2. The preface, under its author and deprecated: not admitted.
update rag_corpus
   set author           = 'Roger L''Estrange',
       work             = 'To the Reader (preface to Seneca''s Morals)',
       text_type        = 'scholarship',
       section_label    = case when chunk_index = 0 then 'Project Gutenberg header; To the Reader' else 'To the Reader' end,
       translator       = 'original',
       edition_year     = 1882,
       edition          = 'Seneca''s Morals of a Happy Life, Benefits, Anger and Clemency, tr. Sir Roger L''Estrange. New Edition. Chicago: Belford, Clarke & Co.',
       source_url       = 'https://www.gutenberg.org/ebooks/56075',
       license_status   = 'public_domain_us',
       license_evidence = 'Sir Roger L''Estrange (1616-1704), Seneca''s Morals by Way of Abstract, first published 1678; this text is the Belford, Clarke & Co. 1882 printing, Project Gutenberg ebook #56075. Public domain in the United States.',
       quotable_on_air  = false,
       deprecated       = true
 where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd'
   and chunk_index between 0 and 9 and not deprecated;

-- 3. The question map (Part 5 rule 4).
insert into corpus_question_registrations (question_id, author, work, position, role, note, source) values
  ('Q13', 'Roger L''Estrange', 'Seneca''s Life and Death',
   'Seneca as a man who lived his doctrine, set beside what tells against it: the nightly self-examination, the offer to hand his fortune back to Nero, and the death from Tacitus (Annals 15.60-64), where he leaves his friends "the image of his life" and asks where their premeditated resolutions against Fortune have gone; against that, a fortune of "incredible sums", the greater part "the bounty of his prince", which "drew an envy upon him", and Dio''s report of money lent at interest in Britain.',
   'complicates',
   'Registered when the life was refiled from Seneca''s Morals, 2026-10-05 (ADMISSIONS_2026-10-05_LESTRANGE_SENECA_LIFE.md).',
   'manual'),
  ('Q14', 'Roger L''Estrange', 'Seneca''s Life and Death',
   'Philosophy shown as conduct rather than doctrine: Seneca''s nightly review of the day''s words and acts, his simple diet and retirement once out of favour, and a death in which he exhorts his friends "to a firmness of mind" and asks them where all their philosophy is now.',
   'states',
   'Registered when the life was refiled from Seneca''s Morals, 2026-10-05 (ADMISSIONS_2026-10-05_LESTRANGE_SENECA_LIFE.md).',
   'manual');

-- Guard: abort unless it landed exactly as intended.
do $$
declare
  n_life int; n_life_live int; n_pref int; n_pref_dep int; n_morals_live int; min_morals int; n_reg int;
begin
  select count(*), count(*) filter (where not deprecated and text_type = 'scholarship' and chunk_index between 0 and 5)
    into n_life, n_life_live
    from rag_corpus where author = 'Roger L''Estrange' and work = 'Seneca''s Life and Death';
  select count(*), count(*) filter (where deprecated)
    into n_pref, n_pref_dep
    from rag_corpus where author = 'Roger L''Estrange' and work = 'To the Reader (preface to Seneca''s Morals)';
  select count(*) filter (where not deprecated), min(chunk_index) filter (where not deprecated)
    into n_morals_live, min_morals
    from rag_corpus where author = 'Seneca' and work = 'Morals' and program_id = 'stoicism-phd';
  select count(*) into n_reg from corpus_question_registrations where author = 'Roger L''Estrange';
  if n_life <> 6 or n_life_live <> 6 or n_pref <> 10 or n_pref_dep <> 10
     or n_morals_live <> 307 or min_morals <> 16 or n_reg <> 2 then
    raise exception 'unexpected post-state: life=%/% preface=%/% morals_live=% from=% registrations=%',
      n_life, n_life_live, n_pref, n_pref_dep, n_morals_live, min_morals, n_reg;
  end if;
end $$;

commit;

-- The Morals shelf card and its passage count were drawn partly from these
-- rows; the life now has a card of its own.
select public.refresh_library_excerpts();
