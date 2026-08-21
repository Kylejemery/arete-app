-- Playground: remember the corpus passages a reflection was grounded in.
--
-- When a soul is awakened or counselled, the Oracle grounds its answer in real
-- passages retrieved from the Stoic corpus and returns them as `sources`. We
-- keep them alongside the reflection so the annals can show what each saying
-- rests on — the corpus made visible in the world it shapes.

alter table public.kosmopolis_lives
  add column if not exists sources jsonb;
