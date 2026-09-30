-- Corpus identity remediation (physics remediation, task 1).
--
-- The filename parser (Author_Title_Section_Language.txt) split multi-word
-- titles on an early ingestion pass and produced malformed author / work
-- labels. Later re-ingests of the same books under correct names created a
-- second copy of the content under a second identity, with different chunk
-- boundaries, so no text-level dedup can catch them. Measured on the live
-- database before this migration:
--
--   Arnold / Roman                                   561 chunks   (malformed)
--   Vernon Arnold / Roman Stoicism                   438 chunks   (kept)
--   Stock / Guide                                     60 chunks   (malformed)
--   St. George William Joseph Stock / A Guide to Stoicism
--                                                     51 chunks   (kept, has source_url)
--   Cicero / Definibus                               622 chunks   (label only)
--
-- Policy: deprecate, never delete. rag_corpus.deprecated already exists and
-- the retrieval functions are made to honour it below, which is the step
-- that makes deprecation mean anything.

-- ---------------------------------------------------------------------------
-- 1. Deprecate the malformed-label duplicates.
-- ---------------------------------------------------------------------------
update public.rag_corpus
   set deprecated = true
 where author = 'Arnold' and work = 'Roman' and deprecated = false;

update public.rag_corpus
   set deprecated = true
 where author = 'Stock' and work = 'Guide' and deprecated = false;

-- ---------------------------------------------------------------------------
-- 2. Normalise the kept identities.
--    Roman Stoicism is an English original (Cambridge University Press, 1911),
--    so translator is null by design. text_type moves to 'primary' to match
--    the other secondary-scholarship rows (Stock, Zeller) until the text_type
--    normalisation in docs/corpus/MODERN_LAYER_PROPOSAL.md is agreed.
-- ---------------------------------------------------------------------------
update public.rag_corpus
   set author = 'E. Vernon Arnold',
       text_type = 'primary',
       translator = null
 where author = 'Vernon Arnold' and work = 'Roman Stoicism';

-- ---------------------------------------------------------------------------
-- 3. Cicero label fix. Pure relabel, no deprecation. Verified beforehand that
--    no 'De Finibus' rows exist, so the (author, work, program_id, chunk_index)
--    unique key cannot collide.
-- ---------------------------------------------------------------------------
update public.rag_corpus
   set work = 'De Finibus'
 where author = 'Cicero' and work = 'Definibus';

-- ---------------------------------------------------------------------------
-- 4. Every table that keys on (author, work) must follow the live identity,
--    otherwise the Coverage Gap Agent keeps scoring the deprecated copy as
--    "already in corpus" and the reader shelf keeps a hidden override pointed
--    at a name that no longer exists.
-- ---------------------------------------------------------------------------
update public.corpus_significance_map
   set author = 'E. Vernon Arnold',
       work = 'Roman Stoicism',
       notes = 'E. Vernon Arnold, Roman Stoicism (Cambridge University Press, 1911). Public-domain scholarship. Live identity since the 2026-09 identity remediation; the malformed Arnold / Roman copy is deprecated in rag_corpus.'
 where author = 'Arnold' and work = 'Roman'
   and not exists (select 1 from public.corpus_significance_map
                    where author = 'E. Vernon Arnold' and work = 'Roman Stoicism');

update public.corpus_significance_map
   set author = 'St. George William Joseph Stock',
       work = 'A Guide to Stoicism',
       notes = 'St. George Stock, A Guide to Stoicism (1908). Public-domain introductory guide. Live identity since the 2026-09 identity remediation; the malformed Stock / Guide copy is deprecated in rag_corpus.'
 where author = 'Stock' and work = 'Guide'
   and not exists (select 1 from public.corpus_significance_map
                    where author = 'St. George William Joseph Stock' and work = 'A Guide to Stoicism');

update public.corpus_significance_map
   set work = 'De Finibus',
       notes = 'De Finibus Bonorum et Malorum. Major source on Stoic vs Epicurean ethics. Relabelled from the malformed Definibus in the 2026-09 identity remediation.'
 where author = 'Cicero' and work = 'Definibus'
   and not exists (select 1 from public.corpus_significance_map
                    where author = 'Cicero' and work = 'De Finibus');

-- The reader-shelf override that hid "Vernon Arnold / Roman Stoicism" was
-- hiding the duplicate. With the malformed copy deprecated there is one live
-- copy again, so it is renamed to the new identity and made visible.
update public.library_overrides
   set author = 'E. Vernon Arnold',
       hidden = false,
       updated_at = now()
 where author = 'Vernon Arnold' and work = 'Roman Stoicism';

-- ---------------------------------------------------------------------------
-- 5. Retrieval honours deprecated everywhere.
--    match_rag_corpus and the five-argument match_academy_chunks already
--    filtered on it; match_rag_corpus_ids (Synthesis, Inquiry, Tension,
--    Dreaming, Dispatch, World, Convergence, Coverage Gap), match_rag_corpus_cited
--    (Scribe, Stoic reply drafter) and the six-argument match_academy_chunks
--    did not. Definitions below are the live ones plus the filter.
-- ---------------------------------------------------------------------------

-- The ivfflat.probes GUC only exists once pgvector is loaded in the session;
-- any vector operation loads it (same trick as 20260831000002_ivfflat_probes).
select '[1]'::vector <=> '[1]'::vector;

create or replace function public.match_rag_corpus_ids(
  query_embedding vector,
  match_count integer default 8,
  filter_language text default 'english'
)
returns table(id uuid, chunk_text text, author text, work text, similarity double precision)
language sql
stable
set ivfflat.probes = 10
as $$
  select
    rag_corpus.id,
    chunk_text,
    author,
    work,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    rag_corpus.language = filter_language
    and embedding is not null
    and deprecated = false
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_rag_corpus_cited(
  query_embedding vector,
  match_count integer default 8,
  filter_language text default 'english'
)
returns table(
  id uuid, chunk_text text, author text, work text, section_label text,
  translator text, text_type text, source_url text, similarity double precision
)
language sql
stable
set ivfflat.probes = 10
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
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_academy_chunks(
  query_embedding vector,
  match_threshold double precision,
  match_count integer,
  filter_author text default null,
  filter_program text default 'stoicism-phd',
  filter_course text default null
)
returns table(
  id uuid, author text, work text, section_label text, chunk_text text,
  translator text, course_relevance text, difficulty text, similarity double precision
)
language plpgsql
set ivfflat.probes = 10
as $$
begin
  return query
  select
    rc.id,
    rc.author,
    rc.work,
    rc.section_label,
    rc.chunk_text,
    rc.translator,
    rc.course_relevance,
    rc.difficulty,
    1 - (rc.embedding <=> query_embedding) as similarity
  from rag_corpus rc
  where
    (filter_author is null or rc.author = filter_author)
    and rc.program_id = filter_program
    and (filter_course is null or rc.course_relevance = filter_course)
    and rc.deprecated = false
    and 1 - (rc.embedding <=> query_embedding) > match_threshold
  order by rc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Corpus statistics and the reader shelf describe the live corpus only.
--    corpus_work_counts feeds the Coverage Gap Agent and the significance-map
--    admin view; library_shelf is the reader shelf and the counselors' source
--    catalog; the two stats functions feed the Observatory and the weekly
--    self-reflection. Without this, a deprecated duplicate still counts.
-- ---------------------------------------------------------------------------
create or replace function public.corpus_work_counts()
returns table(author text, work text, cnt bigint)
language sql
stable
as $$
  select author, work, count(*) as cnt
  from rag_corpus
  where deprecated = false
  group by author, work
$$;

create or replace function public.library_shelf()
returns table(
  author text, work text, text_type text, chunk_count bigint,
  translator text, language text, source_url text, excerpt text
)
language sql
stable
as $$
  select
    g.author, g.work, g.text_type, g.chunk_count,
    g.translator, g.language, g.source_url, e.chunk_text as excerpt
  from (
    select author, work, text_type,
           count(*)        as chunk_count,
           min(translator) as translator,
           min(language)   as language,
           min(source_url) as source_url
    from rag_corpus
    where deprecated = false
    group by author, work, text_type
  ) g
  left join lateral (
    select r.chunk_text
    from rag_corpus r
    where r.author = g.author and r.work = g.work and r.text_type = g.text_type
      and r.deprecated = false
      and r.chunk_text not ilike '%project gutenberg%'
      and length(r.chunk_text) > 200
    order by r.chunk_index asc
    offset greatest(0, (g.chunk_count / 8)::int)
    limit 1
  ) e on true
  order by g.text_type, g.author, g.work;
$$;

create or replace function public.system_reflection_corpus_stats(since timestamp with time zone)
returns table(total_chunks bigint, chunks_added bigint, authors_covered bigint)
language sql
stable
as $$
  select
    count(*)                                    as total_chunks,
    count(*) filter (where created_at >= since) as chunks_added,
    count(distinct author)                      as authors_covered
  from rag_corpus
  where deprecated = false;
$$;

create or replace function public.observatory_corpus_stats()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'totalChunks', (select count(*) from rag_corpus where deprecated = false),
    'authorCount', (select count(distinct author) from rag_corpus where author is not null and deprecated = false),
    'byAuthor', (
      select coalesce(jsonb_object_agg(author, cnt), '{}'::jsonb)
      from (select author, count(*) as cnt from rag_corpus
             where author is not null and deprecated = false group by author) a
    ),
    'byConcept', (
      select coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
      from (
        select cc.name, count(*) as cnt
        from concept_passage_map cpm
        join concept_aliases ca on ca.raw_label = cpm.concept
        join canonical_concepts cc on cc.id = ca.canonical_id
        group by cc.name
      ) c
    ),
    'births', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'author', author, 'work', work, 'firstChunkAt', first_at
      ) order by first_at desc), '[]'::jsonb)
      from (
        select author, work, min(created_at) as first_at
        from rag_corpus
        where deprecated = false
        group by author, work
        having min(created_at) > now() - interval '48 hours'
      ) b
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. Bobzien is left alone. "Bobzien / Logic Part 1|2" and the three
--    "Susanne Bobzien" works may be genuinely different papers. The fifteen
--    chunk texts are printed here so the merge decision can be made by eye.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select author, work, chunk_index, chunk_text
      from public.rag_corpus
     where author in ('Bobzien', 'Susanne Bobzien')
     order by author, work, chunk_index
  loop
    raise notice E'\n=== % / % [chunk %] ===\n%', r.author, r.work, r.chunk_index, r.chunk_text;
  end loop;
end $$;

-- Verification (expected: E. Vernon Arnold live 438 / dead 0, Arnold dead 561,
-- Stock dead 60, St. George William Joseph Stock live 51, Cicero De Finibus 622):
--   select author, work,
--          count(*) filter (where not deprecated) live,
--          count(*) filter (where deprecated) dead
--     from rag_corpus
--    where author ilike '%arnold%' or author ilike '%stock%' or work ilike '%inibus%'
--    group by 1,2 order by 1;
