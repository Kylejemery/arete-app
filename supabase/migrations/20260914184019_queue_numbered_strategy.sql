-- chunker.js gains a 'numbered' strategy (one row per numbered paragraph,
-- the number as locator: Nietzsche's aphorisms), so the queue's strategy
-- check learns the name.

alter table public.corpus_ingestion_queue
  drop constraint if exists corpus_ingestion_queue_chunk_strategy_check;
alter table public.corpus_ingestion_queue
  add constraint corpus_ingestion_queue_chunk_strategy_check
  check (chunk_strategy in ('paragraph', 'headed', 'numbered', 'meditations-long', 'discourses', 'enchiridion', 'seneca-letters'));
