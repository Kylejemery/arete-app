CREATE OR REPLACE FUNCTION match_academy_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_author text DEFAULT NULL,
  filter_program text DEFAULT 'stoicism-phd'
)
RETURNS TABLE (
  id uuid,
  author text,
  work text,
  section_label text,
  chunk_text text,
  translator text,
  similarity float
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
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM rag_corpus rc
  WHERE
    (filter_author IS NULL OR rc.author = filter_author)
    AND rc.program_id = filter_program
    AND 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
