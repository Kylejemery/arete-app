-- Plato, Apology: lower the significance map threshold from 50 to 33.
--
-- The coverage gap agent reported 33 chunks against a threshold of 50, down
-- from 46 the week before. Nothing was lost. 20260929203346 deprecated chunks
-- 0 to 12, which were the Gutenberg header and Jowett's Introduction filed as
-- Plato, and kept the untrimmed chunk 13 as a deprecated row. The 33 live
-- chunks (13 to 45, Jowett 1871, Gutenberg 1656, 12,983 words) run from "How
-- you, O Athenians" to "Which is better God only knows": the whole speech.
--
-- 50 was set against the count that included Jowett's commentary. The speech
-- itself makes 33 chunks at the current chunk size, so 50 could only be met by
-- restoring the Introduction or ingesting the same text twice. The threshold
-- now matches the work. server/data/significance-map.json carries the same
-- value so a re-seed does not put 50 back.

update public.corpus_significance_map
set chunk_threshold = 33
where author = 'Plato'
  and work = 'Apology'
  and chunk_threshold = 50;
