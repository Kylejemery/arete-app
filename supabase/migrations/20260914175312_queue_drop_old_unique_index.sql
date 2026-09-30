-- 20260914180100 replaced the queue's (author, work) key with
-- (author, work, source_url), but the old key was a unique INDEX, not a
-- constraint, so its "drop constraint if exists" was a no-op and the old
-- rule still fired on the second City of God volume. Drop the index.

drop index if exists public.uq_corpus_queue_author_work;
