# Scribe Chat — Conversational Essay Development

Date: 2026-07-18. Scribe's second mode, built **alongside** the existing pipeline
(Distill → Retrieve → Draft → Verify at `/admin/scribe`), not replacing it. Chat
mode develops handwritten Stoic journal entries into Substack essays through a
persistent editorial conversation: Kyle pastes a fragment, Scribe develops it
against the corpus, Kyle redirects in plain language, turn by turn. The
back-and-forth is the product; middle draft and full draft are conversational
states, not buttons.

## Schema (applied to Supabase 2026-07-18, migration `scribe_chat_entries_messages_drafts`)

```sql
create table scribe_entries (
  id uuid primary key default gen_random_uuid(),
  title text,
  raw_text text not null, -- Kyle's journal fragment, verbatim, never altered
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scribe_messages (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references scribe_entries(id) on delete cascade,
  role text not null check (role in ('user','scribe')),
  content text not null,
  -- for scribe turns: [{author, work, chunk_id, section_label, translator, mode: 'quote'|'paraphrase'}]
  sources_used jsonb,
  created_at timestamptz not null default now()
);
create index scribe_messages_entry_idx on scribe_messages(entry_id, created_at);

-- Snapshots of the working essay ("scribe_drafts" is taken by the pipeline).
create table scribe_entry_drafts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references scribe_entries(id) on delete cascade,
  stage text not null check (stage in ('middle','full')),
  draft_text text not null,
  sources_used jsonb,
  created_at timestamptz not null default now()
);
create index scribe_entry_drafts_entry_idx on scribe_entry_drafts(entry_id, created_at);

alter table scribe_entries enable row level security;
alter table scribe_messages enable row level security;
alter table scribe_entry_drafts enable row level security;
```

RLS is enabled with **no policies** — same deny-all pattern as the other
`scribe_*` tables. All access flows through the service-role client behind
`requireAdmin()`.

## Decisions (settled with Kyle, 2026-07-18)

- **Alongside, not instead**: the pipeline keeps `/admin/scribe`; chat mode is a
  sibling surface. Shared machinery (`match_rag_corpus_cited`, `embedChunk`,
  `admin-auth`) is reused, not altered.
- **Quotable discriminator is `rag_corpus.text_type`** — no new `ingestion_mode`
  column. Verbatim-quotable: `text_type IN ('primary','public_domain')`
  (public-domain sources). Paraphrase-only: `('summary','paper_summary','synthesis')`
  (Mode-2 modern scholarship — the original text was never stored, so there is
  nothing to quote).
- **`scribe_entry_drafts`, not `scribe_drafts`** — the prompt's name was taken
  by the pipeline's per-project draft table.
- **RAG on every turn**: retrieval is driven by the current conversational need,
  not a one-time seed. The chat model requests corpus searches itself (tool use)
  and every retrieved chunk lands in that turn's `sources_used` for audit.
- **Hand-retype gate**: no publish path of any kind. Export (copy/markdown with
  the "Developed with Arete" note) terminates in the clipboard; Kyle retypes by
  hand before publishing.
- **Scribe never writes to `rag_corpus`** — it reads the corpus; its output
  never enters it.

## The Log (added 2026-07-19, migration `scribe_log_items`)

Kyle's running commonplace book at `/admin/scribe/log`: journal entries,
thoughts, generated essays, clippings (`kind` check constraint). Every item is
embedded on save (`text-embedding-3-small`, 1536 dims — same space as the
corpus) so related items surface via `match_scribe_log_items(query_embedding,
match_count, exclude_id)`. Scribe chat gets a `search_journal` tool alongside
`search_corpus`: the log is a participant in the conversation the same way the
corpus is, and teasing out connections across entries over time is part of
Scribe's job. Kyle's own words are always quotable (recorded in `sources_used`
as mode `quote`, `text_type` `journal`). The log never feeds `rag_corpus`.
