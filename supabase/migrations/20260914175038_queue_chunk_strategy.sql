-- The ingestion queue learns three things a Part 5 ingest needs and the
-- nightly agent could not carry: which chunker strategy to cut the text
-- with (so BOOK / CHAPTER works get a locator on every row instead of a
-- 400-word window), the translation's edition year, and whether the row is
-- a further volume of a work already in the corpus (City of God ships as
-- two Gutenberg files; without the flag the second would overwrite the
-- first under the author/work/program_id/chunk_index key).
--
-- Strategies are the names chunker.js dispatches on
-- (QUEUE_STRATEGIES); the check keeps a typo from silently falling back to
-- paragraph windows.

alter table public.corpus_ingestion_queue
  add column if not exists chunk_strategy text not null default 'paragraph',
  add column if not exists edition_year integer,
  add column if not exists append_to_existing boolean not null default false;

alter table public.corpus_ingestion_queue
  drop constraint if exists corpus_ingestion_queue_chunk_strategy_check;
alter table public.corpus_ingestion_queue
  add constraint corpus_ingestion_queue_chunk_strategy_check
  check (chunk_strategy in ('paragraph', 'headed', 'meditations-long', 'discourses', 'enchiridion', 'seneca-letters'));
