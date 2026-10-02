-- Synthesis drafts as versioned Markdown (Synthesis Agent, part 1 of the
-- Stoic Life build).
--
-- The Synthesis Agent runs on Railway and cannot commit to the repo, so a
-- draft lives here as the full text of a <doc_key>.v<N>.md file in the format
-- academy/corpus-ingestion/ingest-synthesis.js loads. Kyle reviews it at
-- /admin/synthesis/stoic-life; once approved,
-- academy/corpus-ingestion/export-synthesis-drafts.js writes the file into
-- academy/corpus-ingestion/synthesis/, a PR commits it, and the nightly corpus
-- agent's synthesis sync loads it. Nothing here is retrievable: rag_corpus is
-- only ever written by that sync, from a committed file.
--
-- Distinct from synthesis_documents, the journal-demand mode's older queue,
-- which keeps working unchanged.
--
-- Also adds corpus_synthesis_documents.review_by: the date an interpretive
-- application to the present should be checked again
-- (docs/corpus/ACQUISITION_PLAN.md, test 8). Existing documents leave it null.

begin;

create table if not exists public.synthesis_drafts (
  id               uuid primary key default gen_random_uuid(),
  mode             text not null check (mode in ('stoic_life', 'journal_demand')),
  topic_id         uuid,                          -- synthesis_topics, for stoic_life (FK added with that table)
  concept          text,                          -- journal_demand: the concept the run chose
  doc_key          text not null check (doc_key ~ '^[a-z0-9-]+$'),
  version          integer not null default 1 check (version between 1 and 999),
  title            text not null,
  markdown         text not null,                 -- the whole .vN.md file
  word_count       integer,
  status           text not null default 'pending_review'
                     check (status in ('pending_review', 'edited', 'approved', 'rejected', 'exported', 'ingested')),
  -- What the agent's own checks found: per-section citation results, the
  -- political-content check, and any section downgraded to unverified.
  checks           jsonb not null default '{}'::jsonb,
  -- Follow-on topics the draft proposed. Not part of the document; the topic
  -- proposer reads them from approved drafts.
  follow_ons       jsonb not null default '[]'::jsonb,
  source_chunk_ids uuid[] not null default '{}',
  world_observation_id uuid references public.world_observations (id),
  generation_model text,
  prompt_tokens    integer,
  completion_tokens integer,
  review_notes     text,
  reviewed_at      timestamptz,
  exported_at      timestamptz,
  export_file_path text,
  export_sha256    text,
  ingested_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (doc_key, version)
);

create index if not exists synthesis_drafts_status_idx on public.synthesis_drafts (status);

comment on table public.synthesis_drafts is
  'Synthesis Agent drafts as versioned Markdown, awaiting Kyle''s review. Approved drafts are exported to academy/corpus-ingestion/synthesis/ and loaded by the nightly sync; nothing here is retrievable.';

alter table public.synthesis_drafts enable row level security;
revoke all on public.synthesis_drafts from anon, authenticated;

alter table public.corpus_synthesis_documents
  add column if not exists review_by date;

comment on column public.corpus_synthesis_documents.review_by is
  'When the document''s interpretive sections (application to the present) should be checked again. Null for documents with no such date.';

commit;
