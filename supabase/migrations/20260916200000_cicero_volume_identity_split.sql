-- Cicero volume identity split.
--
-- The rows labelled `Cicero / De Finibus` (613 live chunks) are not De Finibus.
-- They are the whole of Project Gutenberg ebook #29247: C. D. Yonge's Bohn
-- translation of "The Academic Questions, Treatise De Finibus, and Tusculan
-- Disputations of M. T. Cicero, With A Sketch of the Greek Philosophers
-- Mentioned by Cicero" (George Bell and Sons, London, 1875). A multi-treatise
-- volume was ingested under one work name -- the identity failure CLAUDE.md
-- warns about. Only 232 of the 613 rows are De Finibus; 38 of 63 logged
-- retrievals under this label actually returned Tusculan Disputations.
--
-- Segment boundaries were read directly from the chunk text:
--   0-34    Gutenberg licence header, title page, "Sketch of the Greek
--           Philosophers" -- volume apparatus, not Cicero
--   35-143  Academic Questions I-II (chunk 56 opens "SECOND BOOK OF THE
--           ACADEMIC QUESTIONS. I. Lucius Lucullus")
--   144-375 De Finibus
--   376-595 Tusculan Disputations
--   596-612 editor's endnotes, Cicero's letters to Atticus, prosopography
--
-- The chunker uses a sliding window, so the three seam chunks (143, 375, 595)
-- carry a tail that bleeds into the following treatise. Each is assigned to
-- the work that supplies the majority of its text.
--
-- This migration also supersedes two standalone ingests that the volume copy
-- beats on text quality:
--   * Academica (114 chunks, archive.org academicquestion00ciceuoft) -- raw
--     uncorrected OCR; 62 of 114 chunks carry breakage ("gi-eat", "Gmek",
--     "difier fi-om", "pi'inciples").
--   * Tusculan Disputations (230 chunks, Standard Ebooks) -- no translator,
--     no source_url, and chunk 0 is website navigation chrome.
-- Per CLAUDE.md these are deprecated, never deleted, and keep their own
-- (accurate) provenance. Row ids are untouched throughout, so retrieval_log
-- history still resolves and past mis-citations stay diagnosable.
--
-- Embeddings are of raw chunk_text with no metadata prefix
-- (academy/corpus-ingestion/embedder.js), so relabelling does not invalidate
-- any vector and nothing needs re-embedding.
--
-- Numbering: (author, work, program_id, chunk_index) is unique, so rows are
-- parked in high bands before being renumbered. Superseded rows end up at
-- 900000+ (standalone ingests) and 910000+ (volume apparatus); live rows are
-- renumbered contiguously from 0.

begin;

-- Guard: abort unless the corpus is in the exact shape this migration expects.
do $$
declare
  n_acad int; n_tusc int; n_blob int; n_parked int;
begin
  select count(*) filter (where work = 'Academica'),
         count(*) filter (where work = 'Tusculan Disputations'),
         count(*) filter (where work = 'De Finibus' and chunk_index between 0 and 612),
         count(*) filter (where chunk_index >= 800000)
    into n_acad, n_tusc, n_blob, n_parked
  from rag_corpus where author = 'Cicero' and program_id = 'stoicism-phd';

  if n_acad <> 114 or n_tusc <> 230 or n_blob <> 613 or n_parked <> 0 then
    raise exception 'unexpected pre-state: academica=% tusculan=% blob=% parked=% (expected 114/230/613/0)',
      n_acad, n_tusc, n_blob, n_parked;
  end if;
end $$;

-- 1. Park and deprecate the two superseded standalone ingests.
update rag_corpus
   set chunk_index = chunk_index + 900000, deprecated = true
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'Academica' and chunk_index < 900000;

update rag_corpus
   set chunk_index = chunk_index + 900000, deprecated = true
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'Tusculan Disputations' and chunk_index < 900000;

-- 2. Park the volume so its rows can be renumbered without key collisions.
--    Excludes the 9 already-deprecated De Finibus rows at 613-621.
update rag_corpus
   set chunk_index = chunk_index + 800000
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 0 and 612;

-- 3. Carry the volume's real provenance onto every one of its rows, and fill
--    word_count, which was null across all 613.
update rag_corpus
   set translator   = 'C.D. Yonge',
       edition_year = 1875,
       source_url   = 'https://www.gutenberg.org/ebooks/29247',
       word_count   = array_length(regexp_split_to_array(btrim(chunk_text), '\s+'), 1)
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 800000 and 800612;

-- 4. Split the volume into its three real identities.
update rag_corpus
   set work = 'Academica', chunk_index = chunk_index - 800035
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 800035 and 800143;

update rag_corpus
   set work = 'Tusculan Disputations', chunk_index = chunk_index - 800376
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 800376 and 800595;

update rag_corpus
   set chunk_index = chunk_index - 800144
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 800144 and 800375;

-- 5. Deprecate the volume apparatus. Gutenberg licence boilerplate and an
--    editor's endnotes are not primary Cicero and should never be retrievable.
update rag_corpus
   set deprecated = true,
       chunk_index = chunk_index - 800000 + 910000,
       section_label = 'volume apparatus (Gutenberg #29247 front matter) - superseded'
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 800000 and 800034;

update rag_corpus
   set deprecated = true,
       chunk_index = chunk_index - 800000 + 910000,
       section_label = 'volume apparatus (Gutenberg #29247 endnotes) - superseded'
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work = 'De Finibus' and chunk_index between 800596 and 800612;

-- Guard: abort unless the split landed exactly as intended.
do $$
declare
  n_df int; n_acad int; n_tusc int; n_stranded int; n_dep int;
begin
  select count(*) filter (where work = 'De Finibus' and not deprecated),
         count(*) filter (where work = 'Academica' and not deprecated),
         count(*) filter (where work = 'Tusculan Disputations' and not deprecated),
         count(*) filter (where chunk_index between 800000 and 899999),
         count(*) filter (where deprecated)
    into n_df, n_acad, n_tusc, n_stranded, n_dep
  from rag_corpus
 where author = 'Cicero' and program_id = 'stoicism-phd'
   and work in ('De Finibus', 'Academica', 'Tusculan Disputations');

  if n_df <> 232 or n_acad <> 109 or n_tusc <> 220 or n_stranded <> 0 then
    raise exception 'unexpected post-state: definibus=% academica=% tusculan=% stranded=% (expected 232/109/220/0)',
      n_df, n_acad, n_tusc, n_stranded;
  end if;

  -- 114 standalone Academica + 230 standalone Tusculan + 9 prior De Finibus
  -- + 1 prior Tusculan (already counted in the 230) + 52 volume apparatus
  if n_dep <> 405 then
    raise exception 'unexpected deprecated count: % (expected 405)', n_dep;
  end if;

  if exists (
    select 1 from rag_corpus
     where author = 'Cicero' and program_id = 'stoicism-phd' and not deprecated
       and work in ('De Finibus', 'Academica', 'Tusculan Disputations')
       and (translator is distinct from 'C.D. Yonge'
         or edition_year is distinct from 1875
         or source_url is distinct from 'https://www.gutenberg.org/ebooks/29247')
  ) then
    raise exception 'live volume rows are missing provenance';
  end if;
end $$;

commit;
