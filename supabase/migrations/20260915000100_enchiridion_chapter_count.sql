-- ============================================================
-- enchiridion_documents.chapter_count — 2026-09-15
--
-- The admin roster lists every manuscript with its chapter count. Reading
-- the chapters jsonb for every row just to count it pulls whole books over
-- the wire; a stored generated column keeps the roster query light.
-- ============================================================

ALTER TABLE public.enchiridion_documents
  ADD COLUMN IF NOT EXISTS chapter_count integer
  GENERATED ALWAYS AS (jsonb_array_length(chapters)) STORED;
