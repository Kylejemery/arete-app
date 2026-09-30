-- text_type normalisation and the modern layer fence (physics remediation,
-- task 5, implemented after review of docs/corpus/MODERN_LAYER_PROPOSAL.md).
--
-- Before: 'primary' held ancient texts and 1911 scholarship alike;
-- 'public_domain' and 'summary' were artefacts of which script ingested a
-- row. After: one coherent set, locked by check constraints on every table
-- that carries the column, and two new values for the contemporary
-- philosophy of mind layer that no counselor and no Dispatch may retrieve.
--
--   primary         the philosophers' own texts and their ancient doxographers
--   scholarship     public-domain secondary scholarship, verbatim
--   paper_summary   Mode 2 summaries of copyrighted scholarship
--   synthesis       Arete Synthesis documents
--   concordance     editorial retrieval bridges
--   modern_primary  verbatim public-domain modern philosophy of mind
--   modern_summary  Mode 2 summaries of copyrighted modern philosophy of mind

-- ---------------------------------------------------------------------------
-- 1. rag_corpus relabels. Deprecated duplicates follow so the value is
--    coherent in the dead rows too.
-- ---------------------------------------------------------------------------
update public.rag_corpus set text_type = 'scholarship'
 where text_type = 'primary' and (author, work) in (
   ('E. Vernon Arnold', 'Roman Stoicism'),
   ('Arnold', 'Roman'),
   ('St. George William Joseph Stock', 'A Guide to Stoicism'),
   ('Stock', 'Guide'),
   ('Eduard Zeller', 'The Stoics, Epicureans and Sceptics'),
   ('John C. Joy', 'The Emperor Marcus Aurelius - A study in ideals'),
   ('Henry Steel Olcott', 'The Life of Buddha and Its Lessons')
 );

update public.rag_corpus set text_type = 'primary'
 where text_type = 'public_domain';

update public.rag_corpus set text_type = 'paper_summary'
 where text_type = 'summary';

-- ---------------------------------------------------------------------------
-- 2. Source-of-record and queue tables speak the same vocabulary.
-- ---------------------------------------------------------------------------
alter table public.corpus_sources drop constraint if exists corpus_sources_text_type_check;
update public.corpus_sources set text_type = 'paper_summary' where text_type = 'summary';
update public.corpus_sources set text_type = 'primary' where text_type = 'public_domain';
alter table public.corpus_sources alter column text_type set default 'paper_summary';
alter table public.corpus_sources
  add constraint corpus_sources_text_type_check
  check (text_type in ('primary', 'scholarship', 'paper_summary', 'synthesis',
                       'concordance', 'modern_primary', 'modern_summary'));

alter table public.corpus_ingestion_queue
  add constraint corpus_ingestion_queue_text_type_check
  check (text_type in ('primary', 'scholarship', 'paper_summary', 'synthesis',
                       'concordance', 'modern_primary', 'modern_summary'));

-- ---------------------------------------------------------------------------
-- 3. Lock the set on rag_corpus. A new value is a migration, alongside the
--    retrieval and fence support for it (same posture as the language check).
-- ---------------------------------------------------------------------------
alter table public.rag_corpus
  add constraint rag_corpus_text_type_check
  check (text_type in ('primary', 'scholarship', 'paper_summary', 'synthesis',
                       'concordance', 'modern_primary', 'modern_summary'));

comment on constraint rag_corpus_text_type_check on public.rag_corpus is
  'Layer vocabulary. primary | scholarship | paper_summary | synthesis | concordance | modern_primary | modern_summary. The counselor and Dispatch fences (server/lib/corpus-fence.js) key on these values; extend deliberately.';

-- ---------------------------------------------------------------------------
-- 4. match_rag_corpus_ids gains exclude_text_types, so the Daily Dispatch and
--    the World Agent (whose passages Dispatch includes) can fence the modern
--    layer without switching RPCs. Research agents keep passing nothing.
--    Signature change, hence drop and create; callers passing two named
--    arguments still resolve.
-- ---------------------------------------------------------------------------
drop function if exists public.match_rag_corpus_ids(vector, integer, text);

select '[1]'::vector <=> '[1]'::vector;

create function public.match_rag_corpus_ids(
  query_embedding vector,
  match_count integer default 8,
  filter_language text default 'english',
  exclude_text_types text[] default '{}'
)
returns table(id uuid, chunk_text text, author text, work text, similarity double precision)
language sql
stable
set ivfflat.probes = 10
as $$
  select
    rag_corpus.id,
    chunk_text,
    author,
    work,
    1 - (embedding <=> query_embedding) as similarity
  from rag_corpus
  where
    rag_corpus.language = filter_language
    and embedding is not null
    and deprecated = false
    and not (rag_corpus.text_type = any (coalesce(exclude_text_types, '{}'::text[])))
  order by embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.match_rag_corpus_ids(vector, integer, text, text[]) is
  'Agent retrieval. exclude_text_types defaults to nothing (research agents see all); Dispatch and World pass the modern fence (server/lib/corpus-fence.js).';

notify pgrst, 'reload schema';

-- Verification:
--   select text_type, count(*) filter (where not deprecated) live, count(*) filter (where deprecated) dead
--     from rag_corpus group by 1 order by 2 desc;
--   expect primary 10,819 live; scholarship 608 live / 621 dead; paper_summary 268; synthesis 99;
--   no public_domain, no summary.
