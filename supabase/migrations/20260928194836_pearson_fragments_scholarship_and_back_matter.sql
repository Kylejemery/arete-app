-- ============================================================
-- Pearson's Fragments of Zeno and Cleanthes (1891): relabel as
-- scholarship, and deprecate the index and the publisher's catalogue.
--
-- The 321 rows (author 'A.C. Pearson', work 'Fragments of Zeno and
-- Cleanthes') came from a flat 400-word window over the whole archive.org
-- text, so they follow the book's layout rather than its content types:
--
--   0-55     title page, preface, Pearson's Introduction
--   56-291   the fragments of Zeno and Cleanthes, each in Greek (or Latin)
--            followed by Pearson's English notes, interleaved in the same
--            chunks; 287-291 the apophthegmata
--   292-306  the index
--   307-320  Cambridge University Press's catalogue of its other books
--
-- 1. text_type 'scholarship' on all 321 rows (Kyle, 2026-09-28). The
--    Introduction is Pearson's own essay. In 56-291 the notes cannot be
--    separated from the fragments without re-chunking, and the English
--    that retrieval matches there is almost entirely Pearson's commentary:
--    the Greek is untranslated. Labelled primary, a counselor would present
--    an 1891 editor's words as the Stoic tradition speaking. The fences in
--    server/lib/corpus-fence.js treat primary and scholarship alike, so no
--    surface gains or loses these rows.
--
-- 2. deprecated = true on 292-320 (Kyle, 2026-09-28): index references and
--    book advertisements, which retrieve as noise. Chunk 291 is kept, since
--    it opens with the last apophthegms. Deprecated, never deleted.
--
-- Guarded so it is idempotent.
-- ============================================================

update public.rag_corpus
set text_type = 'scholarship'
where author = 'A.C. Pearson'
  and work = 'Fragments of Zeno and Cleanthes'
  and text_type = 'primary';

update public.rag_corpus
set deprecated = true
where author = 'A.C. Pearson'
  and work = 'Fragments of Zeno and Cleanthes'
  and chunk_index between 292 and 320
  and deprecated = false;
