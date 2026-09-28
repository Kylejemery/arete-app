-- Public domain provenance, staging, and bibliography (Long 2002, ch. 2 batch).
-- Proposed in docs/corpus/PUBLIC_DOMAIN_INGESTION_PROPOSAL.md, approved 2026-09-26.
--
-- Licensing and provenance on rag_corpus, a staging area in front of it, and
-- a citation-only bibliography. Existing rows are untouched except that they
-- read quotable_on_air = false until a later, reviewed backfill says
-- otherwise: a passage is quotable on air only when someone has shown it may
-- be.

-- 1. rag_corpus: provenance and licensing -------------------------------

alter table public.rag_corpus
  add column if not exists license_status   text,
  add column if not exists license_evidence text,
  add column if not exists quotable_on_air  boolean not null default false,
  add column if not exists edition          text,          -- e.g. 'Loeb Classical Library 197 (Moralia I)'
  add column if not exists retrieved_at     timestamptz,
  add column if not exists raw_sha256       text,
  add column if not exists ocr_quality      text,
  add column if not exists printed_pages    text,          -- e.g. '201' or '201–203'; never in chunk_text
  add column if not exists cited_by         text[];

comment on column public.rag_corpus.license_status is
  'public_domain_us: first published in the US in 1930 or earlier, or anywhere before 1931 (translation, not composition). open_license: confirmed, not assumed. NULL: legacy row, status not recorded.';
comment on column public.rag_corpus.license_evidence is
  'The source''s own public domain or license statement, verbatim, where it has one; otherwise the reasoning (edition and year).';
comment on column public.rag_corpus.quotable_on_air is
  'The Examiner may quote this passage verbatim on air. True only for public-domain primary texts (translations and originals).';

alter table public.rag_corpus
  add constraint rag_corpus_license_status_check
    check (license_status is null or license_status in ('public_domain_us', 'open_license')),
  add constraint rag_corpus_ocr_quality_check
    check (ocr_quality is null or ocr_quality in ('good', 'fair', 'poor')),
  add constraint rag_corpus_quotable_requires_pd_primary_check
    check (not quotable_on_air
           or (license_status = 'public_domain_us' and text_type = 'primary'));

alter table public.rag_corpus drop constraint rag_corpus_language_normalized_check;
alter table public.rag_corpus add constraint rag_corpus_language_normalized_check
  check (language in ('english', 'ancient_greek', 'latin', 'german'));

-- 2. Staging: one row per source, then one row per chunk ------------------
-- The source row is also the skip log: a source whose status cannot be
-- confirmed is recorded with status 'skipped' and the reason, never fetched
-- further.

create table public.corpus_staging_sources (
  slug              text primary key,        -- 'plutarch-de-auditu-babbitt-1927'; matches data/raw/<slug>/
  batch             text not null,           -- 'long2002-ch2'
  tier              smallint not null check (tier in (1, 2)),
  author            text not null,
  work              text not null,
  language          text not null check (language in ('english','ancient_greek','latin','german')),
  translator        text not null,           -- 'original' for untranslated text
  edition           text,
  edition_year      integer not null,
  text_type         text not null check (text_type in ('primary','scholarship')),
  license_status    text not null,           -- 'public_domain_us', or the reason it was excluded
  license_evidence  text,
  quotable_on_air   boolean not null default false,
  source_url        text not null,
  retrieved_at      timestamptz,
  raw_sha256        text,
  ocr_quality       text check (ocr_quality is null or ocr_quality in ('good','fair','poor')),
  ocr_garble_rate   numeric(5,4),            -- share of sampled words garbled
  cited_by          text[] not null default array['Long 2002, ch. 2 further reading'],
  status            text not null default 'staged'
                      check (status in ('skipped','staged','approved','rejected','promoted')),
  skip_reason       text,
  cleaning_notes    text,
  review_notes      text,
  reviewed_at       timestamptz,
  promoted_at       timestamptz,
  created_at        timestamptz not null default now(),
  check (status <> 'skipped' or skip_reason is not null),
  check (not quotable_on_air or (license_status = 'public_domain_us' and text_type = 'primary' and tier = 1))
);

create table public.corpus_staging_chunks (
  id                uuid primary key default gen_random_uuid(),
  source_slug       text not null references public.corpus_staging_sources(slug),
  chunk_index       integer not null,
  locator           text,                    -- '3.22.1–3.22.8', '37C–38A', '1.26.1–1.26.4'
  section_label     text,
  chunk_text        text not null,           -- NFC, no page markers, no footnote markers
  word_count        integer not null,
  printed_pages     text,
  kind              text not null default 'body' check (kind in ('body','note')),
  parallel_locator  text,                    -- links English and original; resolved to paired_chunk_id at promotion
  annotates_locator text,                    -- a note's passage; resolved to parent_chunks at promotion
  promoted_rag_corpus_id uuid references public.rag_corpus(id),
  created_at        timestamptz not null default now(),
  unique (source_slug, chunk_index)
);

alter table public.corpus_staging_sources enable row level security;
alter table public.corpus_staging_chunks  enable row level security;
-- No policies: service role only, like corpus_ingestion_queue.

-- 3. Bibliography: citation records with no text --------------------------

create table public.corpus_bibliography (
  id            uuid primary key default gen_random_uuid(),
  author        text not null,               -- 'Brunt, P. A.'
  year          text not null,               -- text: '1948–1965', '1982a'
  title         text,                        -- blank rather than guessed
  container     text,                        -- publisher, or journal with volume
  pages_cited   text,                        -- pages Long cites
  why_cited     text,                        -- one line
  cited_by      text not null,               -- 'Long 2002, ch. 2 further reading'
  staging_slug  text references public.corpus_staging_sources(slug), -- Tier 2 overlap (Bonhöffer, Halbauer, Schenkl)
  notes         text,
  created_at    timestamptz not null default now(),
  unique (author, year, cited_by)
);
alter table public.corpus_bibliography enable row level security;
