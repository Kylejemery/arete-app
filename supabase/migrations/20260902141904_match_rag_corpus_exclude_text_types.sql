-- match_rag_corpus gains exclude_text_types (physics remediation, task 4).
--
-- The concordance (text_type = 'concordance') is editorial apparatus written
-- in 2026. No counselor may quote or attribute it. Chronology filtering is
-- not deployed (docs/corpus/EPISTEMIC_BOUNDARY_STATUS.md), so the fence is a
-- text_type exclusion passed by the counselor call sites
-- (server/lib/corpus-fence.js). Research surfaces pass nothing and see all.
--
-- Postgres cannot add a parameter with CREATE OR REPLACE, hence the drop. The
-- body is the live definition (id column, deprecated filter, probes) plus the
-- exclusion. Existing callers that pass four named arguments still resolve:
-- PostgREST fills the default for the fifth.

drop function if exists public.match_rag_corpus(vector, integer, text, text);

-- Load pgvector so ivfflat.probes is a known GUC at function creation.
select '[1]'::vector <=> '[1]'::vector;

create function public.match_rag_corpus(
  query_embedding vector,
  match_count integer default 5,
  filter_author text default null,
  filter_language text default 'english',
  exclude_text_types text[] default '{}'
)
returns table(
  id uuid,
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
language sql
stable
set ivfflat.probes = 10
as $$
  select
    id,
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
    and deprecated = false
    and not (rag_corpus.text_type = any (coalesce(exclude_text_types, '{}'::text[])))
  order by embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.match_rag_corpus(vector, integer, text, text, text[]) is
  'Corpus retrieval. exclude_text_types is the counselor fence: pass ''{concordance}'' (server/lib/corpus-fence.js) on any path that speaks as a person or as the tradition; research agents pass nothing.';

notify pgrst, 'reload schema';
