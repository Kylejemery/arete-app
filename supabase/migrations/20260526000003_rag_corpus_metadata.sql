-- ============================================================
-- Extend rag_corpus with course/difficulty metadata
-- and a chunk-position column for idempotent upserts.
-- Apply manually via Supabase SQL editor.
-- ============================================================

ALTER TABLE rag_corpus
  ADD COLUMN IF NOT EXISTS course_relevance   text,
  ADD COLUMN IF NOT EXISTS difficulty         text,
  ADD COLUMN IF NOT EXISTS source_chunk_index integer;

-- Filtering indexes
CREATE INDEX IF NOT EXISTS idx_rag_corpus_course_relevance
  ON rag_corpus(course_relevance);

CREATE INDEX IF NOT EXISTS idx_rag_corpus_program_id
  ON rag_corpus(program_id);

-- Unique constraint that drives upsert idempotency:
-- one chunk-position per (author, work, program).
-- The partial WHERE avoids conflicts on legacy rows that pre-date this column.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_corpus_upsert_key
  ON rag_corpus(author, work, program_id, source_chunk_index)
  WHERE source_chunk_index IS NOT NULL;

-- ============================================================
-- Replace match_academy_chunks to expose the new columns
-- and accept an optional course filter.
-- ============================================================

CREATE OR REPLACE FUNCTION match_academy_chunks(
  query_embedding   vector(1536),
  match_threshold   float,
  match_count       int,
  filter_author     text DEFAULT NULL,
  filter_program    text DEFAULT 'stoicism-phd',
  filter_course     text DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  author           text,
  work             text,
  section_label    text,
  chunk_text       text,
  translator       text,
  course_relevance text,
  difficulty       text,
  similarity       float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.author,
    rc.work,
    rc.section_label,
    rc.chunk_text,
    rc.translator,
    rc.course_relevance,
    rc.difficulty,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM rag_corpus rc
  WHERE
    (filter_author IS NULL OR rc.author = filter_author)
    AND rc.program_id = filter_program
    AND (filter_course IS NULL OR rc.course_relevance = filter_course)
    AND 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
