-- Fuller citations from retrieval: match_rag_corpus now also returns
-- section_label (venue/year/pages), text_type, and source_url, so the Oracle
-- can cite where and when a source spoke — not just who and what — and the
-- UI can link a paper summary back to the actual PDF. Additive for every
-- caller (all JS; new keys simply appear on each row). Postgres cannot change
-- a function's OUT columns via CREATE OR REPLACE, hence the drop.

DROP FUNCTION IF EXISTS public.match_rag_corpus(vector, integer, text, text);

CREATE FUNCTION public.match_rag_corpus(
  query_embedding vector,
  match_count integer DEFAULT 5,
  filter_author text DEFAULT NULL::text,
  filter_language text DEFAULT 'english'::text
)
RETURNS TABLE(
  chunk_text text,
  author text,
  work text,
  language text,
  course_relevance text,
  section_label text,
  text_type text,
  source_url text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $function$
  select
    chunk_text,
    author,
    work,
    language,
    course_relevance,
    section_label,
    text_type,
    source_url,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    (filter_author is null or rag_corpus.author = filter_author)
    and (rag_corpus.language = filter_language)
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$function$;
