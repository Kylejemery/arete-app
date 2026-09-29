-- match_rag_corpus_cited gains exclude_text_types, so the citation surfaces
-- can run on the research profile (server/lib/corpus-fence.js,
-- academy/web/src/lib/corpus-fence.ts): the Scribe (chat, book drafting, and
-- the claim pipeline), composer grounding, and the stoic drafter pass
-- ['synthesis'], and Arete's own AI-written synthesis documents never come
-- back to them as a source.
--
-- Same shape as match_rag_corpus_ids (20260902160000): the parameter defaults
-- to excluding nothing, so a caller that does not pass it sees exactly what it
-- saw before, and the return columns are unchanged. Signature change, hence
-- drop and create. Apply before the code that passes the parameter deploys;
-- PostgREST rejects an argument the function does not have.
--
-- Measured before writing: with the exclusion passed as a parameter the
-- HNSW scan reads the same 2,738 buffers and returns in about 6ms, the same as
-- the unfiltered call (median of six, warm).

begin;

drop function if exists public.match_rag_corpus_cited(vector, integer, text);

create function public.match_rag_corpus_cited(
  query_embedding vector,
  match_count integer default 8,
  filter_language text default 'english',
  exclude_text_types text[] default '{}'
)
returns table(
  id uuid, chunk_text text, author text, work text, section_label text,
  translator text, text_type text, source_url text, similarity double precision
)
language sql
stable
as $$
  select
    rag_corpus.id,
    chunk_text,
    author,
    work,
    section_label,
    translator,
    text_type,
    source_url,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    rag_corpus.language = filter_language
    and embedding is not null
    and deprecated = false
    and not (rag_corpus.text_type = any (coalesce(exclude_text_types, '{}'::text[])))
  order by embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.match_rag_corpus_cited(vector, integer, text, text[]) is
  'Citation retrieval with provenance. exclude_text_types defaults to nothing; the Scribe, composer grounding, and the stoic drafter pass [''synthesis''] (the research profile, server/lib/corpus-fence.js).';

notify pgrst, 'reload schema';

commit;
