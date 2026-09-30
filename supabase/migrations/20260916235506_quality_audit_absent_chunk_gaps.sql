-- quality_audit_corpus_stats: tell a deprecation apart from a failed ingest.
--
-- The first cut measured a work's chunk_index gaps against live rows only, so
-- Augustine's City of God read as "635 chunks missing" when most of that range
-- is apparatus deliberately deprecated by 20260915164611_deprecate_apparatus_
-- chunks. A gap whose index still has a row is an editorial decision; a gap
-- with no row at any deprecation state is an ingest that silently stopped
-- short. Only the second is a finding, so report both and let the agent rank
-- on `absent`.

create or replace function public.quality_audit_corpus_stats(standards_since date default '2026-09-02')
returns jsonb
language sql
stable
as $$
with live as (
  select * from rag_corpus where deprecated = false
),
recent as (
  select * from live where created_at >= standards_since
),
works as (
  select author, work, count(*) as chunks,
         min(chunk_index) as min_idx, max(chunk_index) as max_idx,
         count(distinct chunk_index) as distinct_idx,
         max(created_at) as last_ingest
  from live group by author, work
),
gaps as (
  select w.author, w.work, w.chunks, w.min_idx, w.max_idx,
         (w.max_idx - w.min_idx + 1) - w.distinct_idx as not_live,
         (select count(*) from generate_series(w.min_idx, w.max_idx) g
           where not exists (
             select 1 from rag_corpus r
             where r.author = w.author and r.work = w.work and r.chunk_index = g
           )) as absent
  from works w
  where (w.max_idx - w.min_idx + 1) > w.distinct_idx
)
select jsonb_build_object(
  'live_chunks',        (select count(*) from live),
  'deprecated_chunks',  (select count(*) from rag_corpus where deprecated),
  'live_works',         (select count(*) from works),
  'live_authors',       (select count(distinct author) from live),
  'standards_since',    standards_since,
  'recent_chunks',      (select count(*) from recent),

  -- Part 5 metadata, split legacy vs. post-standard.
  'missing_translator',        (select count(*) from live   where translator is null or translator = ''),
  'missing_translator_recent', (select count(*) from recent where translator is null or translator = ''),
  'missing_source_url',        (select count(*) from live   where source_url is null or source_url = ''),
  'missing_source_url_recent', (select count(*) from recent where source_url is null or source_url = ''),
  'missing_edition_year',        (select count(*) from live   where edition_year is null),
  'missing_edition_year_recent', (select count(*) from recent where edition_year is null),
  'missing_locator_recent',      (select count(*) from recent where locator is null),

  -- Which works the post-standard gaps belong to, so the finding is actionable.
  'metadata_offenders', coalesce((
    select jsonb_agg(x) from (
      select author, work, count(*) as chunks,
             count(*) filter (where translator is null or translator = '')   as no_translator,
             count(*) filter (where source_url is null or source_url = '')   as no_source_url,
             count(*) filter (where edition_year is null)                    as no_edition_year,
             max(created_at)::date as last_ingest
      from recent
      group by author, work
      having count(*) filter (
        where translator is null or translator = ''
           or source_url is null or source_url = ''
           or edition_year is null
      ) > 0
      order by 3 desc
      limit 25
    ) x), '[]'::jsonb),

  -- Copyright fence: verbatim layers must be public domain. A translation
  -- published after 1930 stored verbatim is the failure the standing rule
  -- exists to prevent.
  'verbatim_post_1930', coalesce((
    select jsonb_agg(x) from (
      select author, work, translator, edition_year, text_type, count(*) as chunks
      from live
      where text_type in ('primary', 'scholarship', 'modern_primary')
        and edition_year is not null and edition_year > 1930
      group by 1,2,3,4,5 order by 6 desc limit 25
    ) x), '[]'::jsonb),

  -- text_type is the only fence. The caller compares this against the list in
  -- server/lib/corpus-fence.js; a value here that the fence does not know is a
  -- layer that every surface is currently free to retrieve.
  'text_type_counts', coalesce((
    select jsonb_agg(x) from (
      select text_type, count(*) as chunks, count(distinct author || ' / ' || work) as works
      from live group by 1 order by 2 desc
    ) x), '[]'::jsonb),

  -- The filename-parser failure mode: one work living under two identities.
  'identity_collisions', coalesce((
    select jsonb_agg(x) from (
      select lower(regexp_replace(work, '[^a-z0-9]', '', 'gi')) as work_key,
             jsonb_agg(distinct author) as authors,
             jsonb_agg(distinct work) as works
      from (select distinct author, work from live) w
      group by 1 having count(distinct author) > 1
      limit 25
    ) x), '[]'::jsonb),

  -- Two chunks with identical text are one wasted embedding and one duplicated
  -- passage in every retrieval that hits them.
  'duplicate_text', (
    select jsonb_build_object(
      'groups', coalesce(count(*), 0),
      'redundant_rows', coalesce(sum(n) - count(*), 0))
    from (select md5(chunk_text) h, count(*) n from live group by 1 having count(*) > 1) d),

  -- `absent` is the real finding: an index in the work's range with no row at
  -- all. `not_live` includes rows that exist but are deprecated on purpose.
  'sequence_gaps', coalesce((
    select jsonb_agg(x) from (
      select author, work, chunks, min_idx, max_idx, not_live, absent
      from gaps order by absent desc, not_live desc limit 25
    ) x), '[]'::jsonb),

  'sequence_gaps_absent_total', (select coalesce(sum(absent), 0) from gaps),

  'embedding_missing', (select count(*) from live where embedding is null),

  -- Part 5 rule 4: every work is registered against the question map.
  'unregistered_works', coalesce((
    select jsonb_agg(x) from (
      select w.author, w.work, w.chunks, w.last_ingest::date as last_ingest
      from works w
      left join corpus_question_registrations r
        on r.author = w.author and r.work = w.work
      where r.id is null
        and w.last_ingest >= standards_since
      order by w.chunks desc limit 25
    ) x), '[]'::jsonb),

  'unregistered_works_total', (
    select count(*) from works w
    left join corpus_question_registrations r on r.author = w.author and r.work = w.work
    where r.id is null),

  -- The write-target drift that once cost months of ingests: the pipeline
  -- writing to source_text_chunks while retrieval read rag_corpus.
  'newest_rag_corpus_row',       (select max(created_at) from rag_corpus),
  'newest_source_text_chunk_row', (select max(created_at) from source_text_chunks)
)
$$;
