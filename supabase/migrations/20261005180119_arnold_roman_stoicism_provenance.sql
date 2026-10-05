-- E. Vernon Arnold, Roman Stoicism: record the source and translator.
--
-- The 2026-07-21 ingest stored no source_url, and the 2026-09-02 identity
-- remediation set translator to null for an English original, before Part 5
-- of docs/corpus/ACQUISITION_PLAN.md made both required (rule 1: an original
-- English work records translator = 'original').
--
-- The source was identified while restoring chunk 3
-- (20261005174507_arnold_roman_stoicism_restore_chunk_3.sql): of the eight
-- archive.org scans of the 1911 Cambridge edition, only isbn_9781112022630
-- carries this text's OCR errors ("progranfme", "justic of their form",
-- "Gymmnosophists"). Checked on 2026-10-05 against every row: 438 of 439
-- chunks occur verbatim in that scan once whitespace is ignored. The 439th,
-- chunk 395, differs by one letter inside OCR noise from a running page
-- header ("Ae hide" against "Ae hides SIN AND WEAKNESS 337"), where two
-- derivatives of the same scan garbled the margin differently. No migration
-- has edited Arnold's chunk_text.
--
-- Chunk 3 already carries both values. Only rows with neither set are
-- touched; text, numbering and embeddings are unchanged (neither column is in
-- any index, and embeddings are of chunk_text alone). edition_year is left as
-- it is: Part 5 requires it for translations, and this is not one.

begin;

do $$
declare n int; n_empty int; n_set int;
begin
  select count(*),
         count(*) filter (where source_url is null and translator is null),
         count(*) filter (where source_url = 'https://archive.org/details/isbn_9781112022630' and translator = 'original')
    into n, n_empty, n_set
  from rag_corpus where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd';
  if n <> 439 or n_empty <> 438 or n_set <> 1 then
    raise exception 'unexpected pre-state: rows=% empty=% set=% (expected 439/438/1)', n, n_empty, n_set;
  end if;
end $$;

update rag_corpus
   set source_url = 'https://archive.org/details/isbn_9781112022630',
       translator = 'original'
 where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd'
   and source_url is null and translator is null;

do $$
declare n int; n_set int;
begin
  select count(*),
         count(*) filter (where source_url = 'https://archive.org/details/isbn_9781112022630' and translator = 'original')
    into n, n_set
  from rag_corpus where author = 'E. Vernon Arnold' and work = 'Roman Stoicism' and program_id = 'stoicism-phd';
  if n <> 439 or n_set <> 439 then
    raise exception 'unexpected post-state: rows=% set=% (expected 439/439)', n, n_set;
  end if;
end $$;

commit;
