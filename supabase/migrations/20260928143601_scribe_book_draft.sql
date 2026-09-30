-- Scribe book draft: a book of essays as chapters, each chapter owning one
-- existing chat entry (scribe_entries), plus the book's own retrieval index,
-- findings from the three review jobs, and thread windowing for long
-- conversations. Design: docs/scribe/BOOK_DRAFT_DESIGN.md.
--
-- Nothing here touches rag_corpus. scribe_book_chunks is the book's own
-- index, read only by the Scribe. All tables follow the scribe_* convention:
-- RLS enabled with no policies, so only the service role behind requireAdmin()
-- can read or write them.
--
-- NOT applied by the branch that adds it. Kyle applies it through the
-- Supabase migration tool and verifies by query.

create table if not exists public.scribe_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'drafting'
    check (status in ('drafting', 'revising', 'settled', 'archived')),
  -- Rolling summary of the whole book, rebuilt from the chapter summaries
  -- rather than from the chapter texts, so it costs O(chapters) to refresh.
  summary text,
  summary_updated_at timestamptz,
  -- { thesis, through_line, open_questions: [] }: the book level argument card.
  argument jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scribe_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.scribe_books(id) on delete cascade,
  -- The chapter's conversation and working draft live in the entry, so every
  -- chat feature keeps working for the chapter alone.
  entry_id uuid not null unique references public.scribe_entries(id) on delete cascade,
  position int not null,
  title text not null,
  status text not null default 'raw'
    check (status in ('raw', 'working', 'settled', 'archived')),
  -- One paragraph: what this chapter argues. Kept current by the summariser
  -- after the draft changes; summary_by_hand marks a summary Kyle edited,
  -- which is left alone until the chapter changes again.
  summary text,
  summary_by_hand boolean not null default false,
  -- { thesis, claims: [], depends_on: [], open_questions: [] }
  argument jsonb,
  word_count int not null default 0,
  -- Hash of the draft the chunks and summary describe. Differs from the
  -- current draft's hash when they are stale.
  indexed_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position) deferrable initially deferred
);

create index if not exists scribe_chapters_book_idx
  on public.scribe_chapters(book_id, position);

-- The book's own retrieval index: the same 400 word, 50 overlap chunking and
-- the same embedding space as rag_corpus (text-embedding-3-small, 1536), in a
-- separate table nothing else reads. Chunks are keyed by content hash so a one
-- paragraph edit re-embeds two or three chunks, not the chapter.
create table if not exists public.scribe_book_chunks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.scribe_books(id) on delete cascade,
  chapter_id uuid not null references public.scribe_chapters(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  content_hash text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (chapter_id, chunk_index)
);

create index if not exists scribe_book_chunks_book_idx
  on public.scribe_book_chunks(book_id);

-- Findings from the review jobs: gap analysis (gap, cross_gap) and the Stoic
-- fact check (fact). A finding belongs to an entry (the chapter's or a
-- standalone essay's conversation) or to a book as a whole.
create table if not exists public.scribe_findings (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.scribe_entries(id) on delete cascade,
  book_id uuid references public.scribe_books(id) on delete cascade,
  chapter_id uuid references public.scribe_chapters(id) on delete cascade,
  kind text not null check (kind in ('gap', 'cross_gap', 'fact')),
  -- superseded: a later run of the same job replaced it (never deleted).
  status text not null default 'open'
    check (status in ('open', 'fixed', 'dismissed', 'superseded')),
  -- The line quoted from the draft, so the UI can find and paint it.
  passage text not null,
  note text not null,
  -- fact only: supported | contradicted | unverifiable
  verdict text check (verdict is null or verdict in ('supported', 'contradicted', 'unverifiable')),
  -- fact only: the claim as extracted, and what kind of claim it is.
  claim text,
  claim_kind text,
  -- [{ chunk_table, chunk_id, author, work, section_label, translator,
  --    text_type, mode, excerpt }]. A supported or contradicted verdict
  -- carries exactly the passage it rests on, machine checked.
  evidence jsonb not null default '[]',
  message_id uuid references public.scribe_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (entry_id is not null or book_id is not null)
);

create index if not exists scribe_findings_entry_idx
  on public.scribe_findings(entry_id, status);
create index if not exists scribe_findings_book_idx
  on public.scribe_findings(book_id, status);

-- Thread windowing. When a conversation's verbatim turns outgrow the budget,
-- the oldest are folded into thread_summary and the marker advances; turns
-- after the marker are sent verbatim. Storage never changes: every message
-- stays in scribe_messages, this only governs what the model is sent.
alter table public.scribe_entries
  add column if not exists thread_summary text,
  add column if not exists thread_summary_through uuid references public.scribe_messages(id) on delete set null;

alter table public.scribe_books enable row level security;
alter table public.scribe_chapters enable row level security;
alter table public.scribe_book_chunks enable row level security;
alter table public.scribe_findings enable row level security;

-- Semantic search over one book's chunks. exclude_chapter_id leaves out the
-- chapter being worked on, which is what a cross chapter question wants.
create or replace function public.match_scribe_book_chunks(
  query_embedding vector,
  p_book_id uuid,
  match_count integer default 8,
  exclude_chapter_id uuid default null
)
returns table (
  id uuid,
  chapter_id uuid,
  chunk_index int,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.chapter_id,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.scribe_book_chunks c
  where c.book_id = p_book_id
    and c.embedding is not null
    and (exclude_chapter_id is null or c.chapter_id <> exclude_chapter_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

comment on function public.match_scribe_book_chunks(vector, uuid, integer, uuid) is
  'Scribe book mode: retrieval over a book''s own draft chunks. Never reads rag_corpus.';

notify pgrst, 'reload schema';
