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

## Quotes, provenance, gaps mode, and the Composer handoff (added 2026-09-16)

**Every quotation is checked.** The pipeline has always machine-checked quotes
against their source chunk; chat mode had only the prompt asking Scribe not to
fabricate, which is not a check. `POST /api/admin/scribe/entries/[id]/quotes`
gathers every chunk the session retrieved (from each turn's `sources_used`),
fetches the text from `rag_corpus` and `scribe_log_items`, adds the entry's own
fragment, and matches each quoted passage in the draft against them. The draft
pane runs it a second after the draft settles and shows a **Quotes** tab:

| verdict | meaning |
|---|---|
| verbatim | the words appear in a chunk that may be quoted |
| summary, not quotable | the words appear in a Mode-2 summary of modern scholarship, whose original was never stored; paraphrase with attribution instead |
| no source found | nothing retrieved contains these words; not proof of fabrication, but check it before publishing |

Anything other than verbatim gets a **Fix this** button that sends a scoped
turn. Matching logic is shared with the pipeline
(`src/lib/scribe/quote-check.ts`; `verify.ts` imports it, so there is one
normalization). The extractor pairs quotation marks by walking them rather
than by regex, because a regex pairs greedily across a short quote and
swallows the real quotation after it. Checks:
`npx tsx src/scripts/scribe-quality-smoke.ts`.

**Provenance: whose sentences are these.** Every draft state in the thread is
attributable, so for any sentence there is a first state it appeared in and a
role that produced it. `src/lib/scribe/provenance.ts` walks the trail and the
journal fragment and reports the share of the draft the writer actually wrote.
The **yours** chip in the voice meter shows the percentage and paints Scribe's
sentences in the draft. No model call, no authorship guess.

**Gaps mode, optional and per entry.** `scribe_entries.gaps_mode`, off by
default, toggled from the draft pane footer. When on, Scribe writes the
structure, the sources with provenance, the tensions, the weakest claim and
the questions, and leaves every paragraph as a `[YOUR TURN: ...]` gap with its
material underneath as a blockquote. It may not write finished prose, not even
an example, not even when asked inside the mode. The writer's own sentences,
copied verbatim from the fragment, the log or the Cabinet, are the exception.
Prompt appendix: `GAPS_APPENDIX` in `src/lib/scribe/chat.ts`.

**To Composer.** `POST /api/admin/scribe/entries/[id]/to-composer` creates a
`writing_pieces` row at the polish stage with the draft as the working copy and
as `piece_drafts` version one, written through the writer's own session so RLS
owns it normally. The draft pane's **To Composer** button opens
`/dashboard/composer?piece=<id>` in a new tab, where the retype callout turns
the prose into theirs sentence by sentence. This is the half of the workflow
that was missing: Scribe drafts, the Composer makes it the writer's.

**Outside read on demand.** `POST /api/admin/scribe/entries/[id]/review` runs
the same cold pass mid-draft, from the **Outside read now** button. Not
persisted, because the draft moves; the read stored on a snapshot still comes
from finalizing. The default reviewer model is now `gpt-5.1`, the model the
counselor router already calls, and the request omits `temperature` for gpt-5.x.

**Layout.** The four columns now fit the window. `fitLayout` keeps the draft at
460px minimum, collapses the side pane the writer did not most recently open
when there is no room, gives the conversation's width up before the draft's,
and stacks the panes below 900px.

## Book mode (added 2026-09-25)

Chat mode now scales to a book. A book (`scribe_books`) is a run of chapters
(`scribe_chapters`), each owning one ordinary entry, so every chat feature
keeps working per chapter. Design, budget numbers and the exact prompts:
`docs/scribe/BOOK_DRAFT_DESIGN.md`. Migration
`20260924120000_scribe_book_draft.sql` (applied by hand, never by the branch).

- **Import and shaping.** `/admin/scribe/book/[id]` takes a pasted draft and
  previews the split before storing: Scribe shapes a stream of consciousness
  into parts (paragraphs regrouped and reordered, never rewritten), or the
  paste is split at headings, chapter markers, or size. Every paragraph lands
  in exactly one chapter.
- **The working set.** A chapter turn sends the system prompt plus a book
  appendix, the book brief (argument card, rolling summary, one line per
  chapter, this chapter's card and its neighbours' summaries) as a cached
  system block, the entry's running thread summary, the recent turns with
  draft bodies stripped, and only this chapter's draft. Older turns are
  folded into `scribe_entries.thread_summary` when they outgrow the budget.
  Two new tools, `search_book` and `read_chapter`, reach the other chapters.
- **Retrieval over the draft.** `scribe_book_chunks` is the book's own index:
  paragraph aligned chunks of about 400 words, re-embedded by content hash
  after each change. Nothing else reads it; `rag_corpus` is untouched.
- **Three commands** in the chat composer, also buttons: `/rewrite` (edit
  blocks only, about 2,000 words a turn, `/rewrite next` continues), `/gaps`
  (findings, no edits; `/gaps book` from the book view), `/factcheck`
  (extract claims, retrieve from the corpus and the paper chunks, judge
  against the retrieved passages only; a verdict whose excerpt is not in the
  cited chunk is downgraded). Findings live in `scribe_findings` and the
  Findings tab; a fresh run supersedes the last, never deletes.
- **Model.** The chat and the judge run on `claude-opus-5-5` at high effort;
  summaries on the distill tier. The system prompt carries a cache
  breakpoint. Checks: `npx tsx src/scripts/scribe-book-smoke.ts` (offline,
  synthetic 60,000 word draft).
