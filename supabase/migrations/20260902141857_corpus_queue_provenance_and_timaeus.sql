-- Queue provenance and the Timaeus significance row (physics remediation, task 3).
--
-- The nightly corpus agent wrote every queued source as text_type 'primary'
-- with no translator, and had no way to cut a translator's front matter: the
-- Republic and the Apology in rag_corpus open with Jowett's own Introduction
-- and Analysis, attributed to Plato. The queue now carries the provenance the
-- agent needs, and both agent twins (academy/corpus-ingestion/corpus-agent.js,
-- server/corpus-agent.js) pass it through.

alter table public.corpus_ingestion_queue
  add column if not exists translator text,
  add column if not exists text_type text not null default 'primary',
  add column if not exists body_start_marker text,
  add column if not exists body_end_marker text;

comment on column public.corpus_ingestion_queue.translator is
  'Written to rag_corpus.translator on every chunk of this source.';
comment on column public.corpus_ingestion_queue.text_type is
  'Written to rag_corpus.text_type on every chunk. Default primary; see docs/corpus/MODERN_LAYER_PROPOSAL.md for the value set.';
comment on column public.corpus_ingestion_queue.body_start_marker is
  'Optional. After Gutenberg boilerplate is stripped, the body starts at the LAST occurrence of this exact string (last, because a contents list often repeats the heading that opens the body). Not found: the whole text is ingested and the row notes say so.';
comment on column public.corpus_ingestion_queue.body_end_marker is
  'Optional. The body ends at the first occurrence of this exact string after the start. Not found: the text runs to the end and the row notes say so.';

-- Plato provenance. The chunk_index 0 text of each Jowett dialogue names its
-- translator; record it only where the text itself says so.
update public.rag_corpus r
   set translator = 'Benjamin Jowett'
 where r.author = 'Plato'
   and r.translator is null
   and exists (
     select 1 from public.rag_corpus s
      where s.author = r.author and s.work = r.work and s.program_id = r.program_id
        and s.chunk_index = 0
        and s.chunk_text ilike '%Translated by Benjamin Jowett%'
   );

-- Coverage Gap Agent: track Timaeus as Tier 1. The Republic is thresholded at
-- 150 chunks; Timaeus is roughly a quarter of its length.
insert into public.corpus_significance_map
  (author, work, tier, chunk_threshold, source_type, notes, recommended_url, active)
values (
  'Plato', 'Timaeus', 1, 40, 'public_domain',
  'The cosmos constructed as a living creature endowed with soul and intelligence (30b): the direct antecedent of the Stoic cosmic animal at Diogenes Laertius 7.142 to 7.143. Jowett translation (Gutenberg 1572); the queue row carries a body_start_marker so Jowett''s Introduction and Analysis is cut.',
  'https://www.gutenberg.org/cache/epub/1572/pg1572.txt', true
)
on conflict (author, work) do update
  set tier = excluded.tier,
      chunk_threshold = excluded.chunk_threshold,
      notes = excluded.notes,
      recommended_url = excluded.recommended_url,
      active = true;
