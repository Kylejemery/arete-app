-- Two apparatus chunks the Cabinet retrieval probe surfaced
-- (server/scripts/probe-retrieval.js), handled without deleting anything.
--
-- 1. Plutarch's Morals chunk 327 is a run of the translator's footnotes
--    ("[699] Homer, Iliad xix. 138 …") with no essay text: apparatus, not
--    corpus. Deprecate it; retrieval filters on the flag.

update public.rag_corpus
set deprecated = true
where author = 'Plutarch'
  and work = 'Plutarch''s Morals'
  and program_id = 'stoicism-phd'
  and chunk_index = 327
  and deprecated = false
  and chunk_text like 'Sophocles, "Antigone," 563, 564. [699] Homer%';

-- 2. Seneca, Letters, chunk 0 opens with the Wikisource title block
--    ("MORAL LETTERS TO LUCILIUS By Lucius Annaeus Seneca Translated by …
--    Source: English Wikisource (public domain)") before Letter 1 begins, so
--    the boilerplate was embedded and retrievable, and it reached the
--    counselors as if it were Seneca. The library reader orders a work by
--    chunk_index, so the row keeps its index and id and loses only the
--    prefix; the original text is archived, deprecated, as a new row at the
--    end of the work so the change stays auditable and reversible. The
--    row's embedding still describes the old text until
--    academy/corpus-ingestion/reembed-chunk.js is run on it
--    (--author Seneca --work Letters --chunk-index 0); the prefix is 22 of
--    400 words, so retrieval is not materially affected meanwhile.

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
where r.author = 'Seneca'
  and r.work = 'Letters'
  and r.program_id = 'stoicism-phd'
  and r.chunk_index = 0
  and r.chunk_text like 'MORAL LETTERS TO LUCILIUS%';

update public.rag_corpus
set chunk_text = trim(regexp_replace(chunk_text,
      '^MORAL LETTERS TO LUCILIUS.*?Source: English Wikisource \(public domain\)\s*', '')),
    word_count = array_length(regexp_split_to_array(trim(regexp_replace(chunk_text,
      '^MORAL LETTERS TO LUCILIUS.*?Source: English Wikisource \(public domain\)\s*', '')), '\s+'), 1)
where author = 'Seneca'
  and work = 'Letters'
  and program_id = 'stoicism-phd'
  and chunk_index = 0
  and chunk_text like 'MORAL LETTERS TO LUCILIUS%';
