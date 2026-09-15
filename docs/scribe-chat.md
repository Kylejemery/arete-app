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

## The Cabinet (added 2026-09-15, migration `cabinet_history_search`)

Kyle's Cabinet conversations from the mobile app (the `cabinet_conversations`
threads with Marcus, Epictetus, Roosevelt, Goggins, Montaigne and the rest) are
a third search tool in chat mode, `search_cabinet`, beside `search_corpus` and
`search_journal`. Much of his thinking happens there first, in his own words,
before it reaches the journal.

- `cabinet_history_search(p_user_id, p_query, p_limit, p_since)` flattens a
  user's rows, dedupes each message on (thread, timestamp, role, content)
  (the mobile client has saved many snapshot rows of the same thread, so one
  message can sit in dozens of them), labels the speaker, full-text searches
  the content (`websearch_to_tsquery`, English), and returns each hit with the
  message before and after it. Service role only; it never writes. Around
  150 ms for Kyle's history.
- `academy/web/src/lib/cabinet-history.ts` wraps it: `cabinetSearchQuery`
  turns a passage or a model's query into an OR query over its content words,
  `searchCabinetHistory` over-fetches and re-ranks so Kyle's own lines come
  first, app check-in prompts (`[Morning check-in] ...`) are dropped, and
  `formatCabinetHits` renders exchanges for a prompt.
- Kyle's own lines are spine material, quotable, recorded in `sources_used`
  with `text_type` `cabinet` and mode `quote`. A counselor's reply is context
  only (mode `paraphrase`, never anchored in the draft): the counselors are
  model-voiced, so Scribe is told never to quote, cite, or attribute their
  words to the historical person; if the Cabinet's Marcus said something worth
  having, it finds the real Marcus in the corpus.
- The pipeline's Stage C draft gets the same material without a tool: the
  project draft route searches with the brief's thesis, claims, and notes and
  passes Kyle's matching lines to `draft()` as a non-citable block.

The prose rules in both modes now come from one list, `docs/machine-tells.md`.

## Edits in place, the wide draft, and Word export (added 2026-09-15)

**Edits instead of rewrites.** A turn no longer has to re-emit the whole
essay. The current working draft rides at the end of Kyle's latest message
inside `<working_draft>` tags (added at call time, never persisted), and
Scribe answers with either a complete `<draft>` (the opening middle draft,
the full draft, the final, or a restructure that touches most paragraphs) or
one or more edit blocks:

```
<edit>
<find>a passage copied verbatim from the working draft</find>
<replace>the new text; empty to cut the passage</replace>
</edit>
```

The turn route applies them (`src/lib/scribe/edits.ts`: exact match first,
then tolerant of whitespace, curly quotes, and dashes, mapped back to the
draft's own characters), stores the result in the new
`scribe_messages.draft_text` column (migration `scribe_messages_draft_text`),
and streams a `draft` event so the pane updates when the turn lands. An edit
whose passage does not match is dropped and named in a note appended to the
stored turn, which Kyle reads in the conversation and Scribe sees next turn.
Scoped revisions are now one edit block by construction. The changes view
diffs consecutive draft states, so an edits turn shows exactly what moved.
Older rows carry the draft inside `content`; readers fall back to that.
Checks: `npx tsx src/scripts/scribe-edits-smoke.ts`.

**The wide draft.** The chat page takes the full viewport: entries | conversation
| draft | sources, with draggable dividers, widths remembered in the browser,
and the entries and sources panes collapsible to a rail. The draft column
takes whatever is left and reads at essay size once it is wide enough.

**Editing and formatting.** Each block still opens in place; *Edit draft*
opens the whole essay in one editor. Both carry a formatting toolbar (bold,
italic, three heading levels, block quote, bulleted and numbered lists, plain
paragraph, section rule, a YOUR TURN gap; ⌘B and ⌘I) that writes markdown, so
the formatting is structural: Scribe reads and edits the same text, the
changes view diffs it, and the export renders it. `src/lib/scribe/format.ts`.

**Word export.** *Word* in the draft pane downloads a `.docx` built from the
same parsed blocks (`src/lib/scribe/docx-export.ts`, the `docx` package,
loaded on demand): title, headings, paragraphs, italic block quotes, real
bulleted and numbered lists, rules, highlighted YOUR TURN gaps, and the
standing "Developed with Arete" note. *Copy* is the markdown clipboard export
as before. Nothing publishes; the hand-retype gate stands.
