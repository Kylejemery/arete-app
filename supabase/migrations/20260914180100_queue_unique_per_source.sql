-- A work that ships as several files (City of God: Gutenberg #45304 and
-- #45305) needs one queue row per file under the same author and work, so
-- the rows land in rag_corpus as one work (append_to_existing). The old
-- unique key on (author, work) forbade that. The new key adds the source
-- URL: the same file still cannot be queued twice, and rows with no URL
-- (agent suggestions awaiting a source) keep the old one-per-work rule via
-- coalesce.

alter table public.corpus_ingestion_queue
  drop constraint if exists uq_corpus_queue_author_work;

create unique index if not exists uq_corpus_queue_author_work_source
  on public.corpus_ingestion_queue (author, work, coalesce(source_url, ''));
