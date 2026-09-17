-- Nightly Quality Audit Agent (server/quality-audit-agent.js).
--
-- The fleet already has agents that grow the system (Corpus, Paper), agents
-- that measure what it is missing (Coverage Gap), and one that narrates how
-- the week went (Weekly Self-Reflection). None of them checks whether what is
-- already in there is *correct*: whether an ingest carries the metadata Part 5
-- of the acquisition plan requires, whether a text_type has appeared that no
-- fence in server/lib/corpus-fence.js knows about, whether a migration was
-- applied to this project without a committed file beside it.
--
-- This agent runs those checks nightly and writes one report.
--
--   quality_audit_reports  one row per run: the findings, the diff against the
--                          previous run (new / ongoing / resolved), a brief.
--   quality_audit_mutes    fingerprints Kyle has accepted as known debt, so a
--                          nightly report shows what changed rather than the
--                          same legacy backlog every morning. An expired mute
--                          stops applying and the finding returns.
--
-- quality_audit_corpus_stats() does the rag_corpus integrity aggregates in one
-- round trip. Deliberately an RPC: a client-side select() on a 14k-row table is
-- capped at 1000 by PostgREST, which is exactly how the Coverage Gap Agent once
-- produced phantom "absent" works.

create table if not exists public.quality_audit_reports (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  domains text[] not null default '{}',          -- domains this run covered
  probes_run integer not null default 0,
  probes_skipped integer not null default 0,
  probes_errored integer not null default 0,
  counts jsonb not null default '{}'::jsonb,     -- {critical, warning, info, new, resolved}
  findings jsonb not null default '[]'::jsonb,   -- the findings themselves
  resolved jsonb not null default '[]'::jsonb,   -- fingerprints that cleared since last run
  brief text,                                    -- prose brief for the founder
  error text,
  created_at timestamptz not null default now()
);

create index if not exists quality_audit_reports_run_date_idx
  on public.quality_audit_reports (run_date desc);

create table if not exists public.quality_audit_mutes (
  fingerprint text primary key,                  -- finding fingerprint, stable across runs
  reason text not null,                          -- why this is accepted, not fixed
  expires_at timestamptz,                        -- null = indefinite
  created_at timestamptz not null default now()
);

alter table public.quality_audit_reports enable row level security;
alter table public.quality_audit_mutes enable row level security;
-- No policies: service role only, like corpus_gap_reports and system_reflections.

-- Corpus integrity aggregates. `standards_since` is the date Part 5 of the
-- acquisition plan took effect (2026-09-02); rows older than it are legacy and
-- counted separately so the nightly report does not re-litigate the backfill
-- the plan explicitly puts out of scope.
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

  -- A gap in chunk_index means part of a work never made it in.
  'sequence_gaps', coalesce((
    select jsonb_agg(x) from (
      select author, work, chunks, min_idx, max_idx,
             (max_idx - min_idx + 1) - distinct_idx as missing
      from works
      where (max_idx - min_idx + 1) > distinct_idx
      order by 6 desc limit 25
    ) x), '[]'::jsonb),

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

comment on function public.quality_audit_corpus_stats(date) is
  'One-shot rag_corpus integrity aggregates for the nightly Quality Audit Agent.';

insert into public.agent_config (agent_name, config)
values ('quality-audit-agent', jsonb_build_object(
  'enabled', true,
  'model', 'claude-sonnet-4-6',
  'run_hour_utc', 9,
  'standards_since', '2026-09-02',
  'domains', jsonb_build_array('corpus', 'library', 'repo', 'material'),
  'material_sample_size', 40,
  'queue_stale_days', 7,
  'brief_max_words', 400
))
on conflict (agent_name) do nothing;