-- Seneca, On Anger: strip the source site's page furniture, record the
-- edition year, retire a duplicate tail chunk.
--
-- WHAT WAS WRONG, AND WHAT TURNED OUT NOT TO BE
--
-- The rows carry translator = 'Aubrey Stewart'. The text file they were
-- ingested from ends with a citation line that says otherwise:
--
--   Lucius Annaeus Seneca. "On Anger." Moral Essays. Vol. 1. Trans. John W.
--   Basore. London: W. Heinemann, 1928. (c) SophiaOmni, 2005. The specific
--   electronic form of this text is copyright.
--
-- That citation was read first as evidence the ingest was mislabelled. It is
-- not. Tested against the eleven Stewart dialogues already in the corpus, the
-- prose is Stewart's:
--
--   "says our adversary" / "says our opponent", Stewart's rendering of the
--   objector, appears in 9 of the 113 chunks. It appears in On a Happy Life
--   and On Constancy, both known Stewart. Basore renders the same formula
--   "but, you say".
--
--   "reflexion" appears 3 times and "reflection" never. Stewart's other
--   dialogues use "reflexion" 7 times against "reflection" once; Gummere's
--   Letters, the corpus's other large Seneca ingest, never use it.
--
-- So SophiaOmni misattributed their own transcription: they host Stewart's
-- Bohn translation and cite Basore's Loeb. The corpus had the translator
-- right. translator is therefore NOT changed here.
--
-- Stewart's Bohn Minor Dialogues is 1889 — the edition_year already carried by
-- this work's ten siblings (On Providence, On Constancy, Consolation to
-- Marcia, On a Happy Life, On Leisure, On Peace of Mind, On the Shortness of
-- Life, Consolation to Polybius, Consolation to Helvia, Clemency). 1889 is
-- comfortably inside the "1930 or earlier" rule, so verbatim holding is in
-- order and the Basore citation, had it been true, would have been too (1928).
--
-- The real defects are the ones below.
--
-- 1. THE SOURCE SITE'S FURNITURE IS IN THE READING TEXT. The running footer
--    "SophiaOmni <page> www. sophiaomni.org" sits inside 58 of the 113 live
--    chunks, mid-sentence, because it was never cut before chunking:
--
--      "...by applying pain to the body or mind SophiaOmni 3 www.
--       sophiaomni.org we correct dispositions which have been rendered
--       crooked by vice."
--
--    The header "SOPHIA PROJECT PHILOSOPHY ARCHIVES" opens chunk 0 and the
--    citation-and-copyright block closes chunks 111 and 112. server/library.js
--    scrubArtifacts does not remove any of it, so a reader sees it on the page
--    and a counselor can be handed it as Seneca speaking.
--
--    Chunk 91 begins part-way through a footer ("sophiaomni.org them along
--    that road...") because the 50-word overlap window split one, which is why
--    the patterns below match a fragment at either edge as well as a whole
--    footer in the middle.
--
-- 2. edition_year IS NULL. Left null by 20260921133439 on purpose, because at
--    that point the translator was believed wrong and writing a year would
--    have ratified it. That reason is now gone.
--
-- 3. CHUNK 112 IS EMPTY OF SENECA. Once the copyright block is removed it is
--    102 characters, every one of them already present at the end of chunk
--    111. Deprecated, not deleted.
--
-- NOT CHANGED, AND WHY
--
-- source_url still reads archive.org/download/seneca_anger/seneca_anger_djvu
-- .txt while the text plainly came from a SophiaOmni PDF. archive.org may well
-- mirror that PDF, and this sandbox has no egress to check (the proxy answers
-- 403 to CONNECT for both archive.org and gutenberg.org). Per the precedent
-- set for Arnold in CORPUS_REMEDIATION_2026-09.md, a guessed URL is worse than
-- the one already recorded, so it stands, flagged rather than rewritten.
--
-- The embeddings were computed over the text WITH the furniture in it, so
-- after this migration the stored text and its vector drift slightly apart:
-- roughly six tokens out of a ~400-word chunk, in 58 of 113 chunks. Re-embedding
-- needs an OpenAI key and egress, neither available here. The stored text is
-- what gets handed to a reader and to a counselor, so fixing it now is the
-- larger win; the vectors are a follow-up, not a blocker.

-- 1. Strip the furniture. Ordered: trailing citation block first (it contains
--    a footer), then whole footers, then a footer fragment at either edge,
--    then the archive header. Guarded so a re-run is a no-op.
update public.rag_corpus
   set chunk_text = btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         chunk_text,
         '\s*Lucius Annaeus Seneca\.\s*“On Anger\.”.*$', '', 'g'),
         '\s*SophiaOmni\s*[0-9]*\s*www\.\s*sophiaomni\.org\s*', ' ', 'g'),
         '^\s*(SophiaOmni\s*[0-9]*\s*)?(www\.\s*)?sophiaomni\.org\s*', '', 'g'),
         '\s*SophiaOmni\s*[0-9]*\s*(www\.?\s*(sophiaomni\.?(org)?)?)?\s*$', '', 'g'),
         '^\s*SOPHIA PROJECT PHILOSOPHY ARCHIVES\s*', '', 'g'))
 where author = 'Seneca'
   and work = 'On Anger'
   and chunk_text ~ '(SophiaOmni|SOPHIA PROJECT|sophiaomni\.org)';

-- 2. Stewart's Bohn Minor Dialogues, 1889 — as its ten siblings already carry.
update public.rag_corpus
   set edition_year = 1889
 where author = 'Seneca'
   and work = 'On Anger'
   and translator = 'Aubrey Stewart'
   and edition_year is null;

-- 3. The tail chunk holds nothing chunk 111 does not. Deprecate, never delete.
update public.rag_corpus
   set deprecated = true
 where author = 'Seneca'
   and work = 'On Anger'
   and chunk_index = 112
   and deprecated = false;
