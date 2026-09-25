# Scribe book draft: audit and design

Date: 2026-09-24. Status: proposed, awaiting Kyle's approval before any code.

Kyle is going to type a whole book of essays into the Scribe over many sessions.
The Scribe has to hold the whole draft without losing earlier chapters as the
chat grows, turn each raw first draft into structured prose in his voice as
edits he reviews, point out gaps in the argument within and across essays, and
flag where he is factually wrong about Stoic figures, texts, dates and ideas
with the corpus passage that contradicts him. This note audits what the Scribe
does today, says exactly where it breaks at book length, and proposes the
design. Nothing here touches `rag_corpus`; the corpus is read, never written.

## 1. How drafts and chat turns are stored now

The Scribe has two modes. The pipeline (`scribe_projects`, `scribe_notes`,
`scribe_drafts`) is not the one Kyle writes in and is out of scope. Chat mode
is the one that matters, and it is built on three tables that were applied to
the project on 2026-07-18 with no committed migration file (the SQL is
recorded in `docs/scribe-chat.md`, and `scribe_log_items` is in the same
position):

| table | what it holds |
|---|---|
| `scribe_entries` | one conversation: `title`, `raw_text` (the fragment, verbatim, never altered), `gaps_mode` |
| `scribe_messages` | every turn, `role` user or scribe, `content`, `sources_used`, and since 2026-09-15 `draft_text`: the full working draft after the turn, null when the turn changed nothing |
| `scribe_entry_drafts` | named snapshots (`middle`, `full`, `final`) with the outside read |

The working draft is not a column on the entry. It is the `draft_text` of the
latest message that has one, found by walking the thread backwards
(`turn/route.ts:62`). Older rows carry the draft inside `content` between
`<draft>` tags, and Kyle's hand revisions from the changes view are stored as
user turns whose `content` contains the whole draft again, with a
`<kyle-edit summary=.../>` marker (`revise/route.ts`). Consecutive hand
revisions overwrite each other; a hand revision followed by a Scribe turn stays
in the thread forever.

A turn (`POST /api/admin/scribe/entries/[id]/turn`) does this:

1. Inserts Kyle's message, then selects the entire thread (`role, content,
   draft_text`, ascending). This is a plain PostgREST select, so it is capped
   at 1,000 rows.
2. Sends every message verbatim as history to `claude-opus-4-6`
   (`runScribeTurn`, `chat.ts`), with the working draft appended to the last
   user message inside `<working_draft>` tags at call time, never persisted.
3. Runs up to 6 tool rounds (`search_corpus`, `search_journal`,
   `search_cabinet`, 6 hits each, floor 0.25). Each round re-sends the whole
   prompt.
4. Applies the reply: a complete `<draft>` replaces the working draft; `<edit>`
   blocks are located by exact then folded substring match, first occurrence
   wins (`edits.ts`); a find that does not match is dropped and reported.
5. Stores the reply with `draft_text`, and snapshots on a `<snapshot>` marker.

No prompt caching, no summarisation, no windowing. `max_tokens` is 8,000.
`maxDuration` on Vercel is 300 seconds.

## 2. The actual token budget per turn

Measured from the source (characters divided by four; the Opus 4.6 tokenizer
runs close to that on English prose, and `messages.countTokens` can re-baseline
any of these in one call):

| component | tokens | note |
|---|---|---|
| `SYSTEM_PROMPT` | ~3,200 | fixed |
| `MACHINE_TELLS_BLOCK` | ~2,100 | fixed, inside the system prompt |
| `GAPS_APPENDIX` | ~430 | when gaps mode is on |
| voice exemplars | unbounded | every exemplar in the active style profile, whole |
| three tool definitions | ~600 | fixed |
| working draft | ~1.35 per word | appended every turn |
| thread history | everything | every turn since the entry was created |
| tool results | ~450 per hit | up to 6 rounds, several calls a round |
| output | ≤ 8,000 | about 6,000 words |

Two worked cases, per API call, before tool rounds multiply it:

**A single 1,500 word essay, 20 turns in.** System and tools ~6,000, a style
profile with three exemplars ~4,000, the working draft ~2,000, twenty turns of
commentary and edit blocks ~14,000, two corpus searches ~5,400. About 31,000
input tokens. A turn with two tool rounds is billed three times over, so
roughly 90,000 input tokens a turn, about $0.45 at Opus 4.6 rates. Fine.

**A 50,000 word book in one entry.** The working draft alone is ~67,000
tokens on every call. Each hand revision left in the thread is another
~67,000, each old style `<draft>` turn another. Thirty turns with three hand
revisions and two full re-emissions is well over 400,000 tokens a call, more
than a million billed per turn with tool rounds, around $5 to $7 a turn, and
none of it cached. The model is reading the whole book to change one
paragraph.

## 3. What breaks at 50,000 words and above

In order of how soon Kyle would hit it:

1. **A full draft can never be emitted again.** `max_tokens` is 8,000, about
   6,000 words. Any turn where Scribe answers with a complete `<draft>` (a
   restructure, "develop the full draft", the final handoff) is cut off
   mid-essay. `extractFullDraft` needs a closing tag, finds none, falls through
   to edits, finds none, and the turn resolves as "changed nothing". The pane
   showed the partial draft streaming and then snaps back. The work is lost
   silently. This is already true today for any essay over ~6,000 words.
2. **The thread stops loading at 1,000 messages.** The select is not paged, so
   past that point the newest rows are dropped, the "thread must end with a
   user message" check fails, and every turn returns 400.
3. **Cost and attention.** Every turn re-reads the whole book plus every
   retained copy of it (section 2). Beyond the money, a 400,000 token prompt
   is where the model starts missing things in the middle, which is exactly
   the "losing earlier material" Kyle is worried about, just with a different
   cause.
4. **Edit finds collide.** A find is matched by first occurrence in the whole
   text. Across twenty essays the same sentence fragment recurs; an edit meant
   for chapter twelve lands in chapter three. The prompt asks for finds
   "unique in the essay", a guarantee that weakens with length.
5. **The changes view goes block level.** `diff.ts` caps the line LCS at two
   million cells. A 50,000 word draft is 1,500 to 2,500 paragraphs; the
   prefix and suffix trim saves a single edit, but a hand revision near the
   top plus a Scribe edit near the bottom leaves a middle of ~2,000 lines a
   side, over the cap, and the whole thing renders as one removed block and
   one added block. Nothing to review.
6. **Client work scales with the book.** The quotation check posts the whole
   draft on every settle, provenance attributes every sentence against every
   draft state in the thread, the voice meter and prose parser run over the
   whole text on each render. Sluggish before it is broken.
7. **300 seconds.** A turn on a 400,000 token prompt with six tool rounds is
   at real risk of the Vercel ceiling, which drops the stream after the
   message may already have been saved.
8. **No view across essays.** Nothing retrieves over the draft. A gap between
   essay four and essay eleven is invisible unless both are in the prompt,
   which is the thing we cannot afford.
9. **Nothing ever forgets on purpose.** History is neither summarised nor
   windowed, so the only limit on the thread is the 1M context window and
   Kyle's budget.

Two smaller ones: saving a long draft to the Log embeds only the first ~6,000
words (`embedChunk` trims to fit the embedding model and says nothing), and
the style profile has no size cap.

## 4. Design

### 4.1 Shape

A book is a row; a chapter is a row that owns one existing chat entry. The
entry keeps doing everything it does today (turns, edits, changes view,
snapshots, quotes, outside read, Composer handoff) for that chapter alone. The
book adds what a chapter cannot see: the other chapters, a rolling summary, and
findings that span essays. Nothing about single essays changes except two
prompt hygiene fixes that help them too (4.4).

```
scribe_books 1 ── n scribe_chapters 1 ── 1 scribe_entries (unchanged)
                     │
                     ├── n scribe_book_chunks     (retrieval over the draft)
                     └── n scribe_book_findings   (gaps and fact checks)
```

### 4.2 Migration (not applied; Kyle applies)

`supabase/migrations/20260924120000_scribe_book_draft.sql`, all tables RLS
enabled with no policies, service role only, the standing `scribe_*`
convention.

```sql
create table scribe_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'drafting'
    check (status in ('drafting', 'revising', 'settled', 'archived')),
  -- Rolling summary of the whole book, rebuilt from chapter summaries.
  summary text,
  summary_updated_at timestamptz,
  -- { thesis, through_line, open_questions: [] }, the book level argument card.
  argument jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table scribe_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references scribe_books(id) on delete cascade,
  -- The chapter's conversation and working draft live in the entry.
  entry_id uuid not null unique references scribe_entries(id) on delete cascade,
  position int not null,
  title text not null,
  status text not null default 'raw'
    check (status in ('raw', 'working', 'settled')),
  -- One paragraph, what this chapter argues, kept current by the summariser.
  summary text,
  -- { thesis, claims: [], depends_on: [chapter ids], open_questions: [] }
  argument jsonb,
  word_count int not null default 0,
  -- Hash of the draft the summary and chunks describe; stale when it differs.
  indexed_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position) deferrable initially deferred
);

create table scribe_book_chunks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references scribe_books(id) on delete cascade,
  chapter_id uuid not null references scribe_chapters(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  content_hash text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (chapter_id, chunk_index)
);
create index scribe_book_chunks_book_idx on scribe_book_chunks(book_id);

create table scribe_book_findings (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references scribe_books(id) on delete cascade,
  chapter_id uuid references scribe_chapters(id) on delete cascade,
  kind text not null check (kind in ('gap', 'cross_gap', 'fact')),
  status text not null default 'open'
    check (status in ('open', 'fixed', 'dismissed')),
  -- The line quoted from the draft, so the UI can find and paint it.
  passage text not null,
  note text not null,
  -- fact only: 'supported' | 'contradicted' | 'unverifiable'
  verdict text,
  -- [{ chunk_id, author, work, section_label, translator, text_type, excerpt }]
  evidence jsonb not null default '[]',
  message_id uuid references scribe_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index scribe_book_findings_book_idx on scribe_book_findings(book_id, status);

-- Thread windowing for long conversations (section 4.4). Older turns are
-- folded into this summary; turns after the marker are sent verbatim.
alter table scribe_entries
  add column if not exists thread_summary text,
  add column if not exists thread_summary_through uuid references scribe_messages(id) on delete set null;

create or replace function public.match_scribe_book_chunks(
  query_embedding vector,
  p_book_id uuid,
  match_count integer default 8,
  exclude_chapter_id uuid default null
) returns table (
  id uuid, chapter_id uuid, chunk_index int, content text, similarity double precision
) language sql stable as $$
  select c.id, c.chapter_id, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding)
  from scribe_book_chunks c
  where c.book_id = p_book_id
    and c.embedding is not null
    and (exclude_chapter_id is null or c.chapter_id <> exclude_chapter_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

Deprecate, never delete, applies: a chapter Kyle removes is set to
`archived` on the book, not dropped, and its entry stays. Book rows are
small; a whole book is at most a few hundred kilobytes of text.

### 4.3 The per chapter working set

What a book mode turn sends, in this order, with a hard ceiling of **60,000
input tokens** estimated before the call (characters over four) and a
degradation order when it is over:

| block | budget | source |
|---|---|---|
| system prompt + `BOOK_APPENDIX` | ~6,500 | fixed; first cache breakpoint |
| voice exemplars | ≤ 4,000 | style profile, exemplars truncated to fit, newest first |
| book brief: title, argument card, rolling summary | ≤ 2,500 | `scribe_books` |
| outline: every chapter's position, title, status, word count, one line | ≤ 60 per chapter | derived from `scribe_chapters`; second cache breakpoint |
| this chapter's argument card and the summaries of its neighbours | ≤ 800 | `scribe_chapters` |
| thread summary | ≤ 1,500 | `scribe_entries.thread_summary` |
| recent turns, verbatim, draft bodies stripped | ≤ 12,000 | last turns after the marker |
| working draft of this chapter only | whatever it is | `draft_text` |
| tool results | ≤ 20,000 | trimmed per hit when over |

Degradation, oldest first: drop recent turns from the front into the summary,
then shorten tool results, then exemplars, then neighbour summaries. The
working draft and the outline are never cut. A 6,000 word chapter is ~8,000
tokens, so a typical turn lands at 30,000 to 40,000 tokens with the first
6,500 served from cache. The estimate and each block's size are logged on the
message so the number is visible, not assumed.

The outline is a derived view, not a stored document: one line per chapter
built from `title`, `status`, `word_count` and the first sentence of
`summary`. At sixty lines a chapter, a forty chapter book is 2,400 tokens, so
it always fits and never needs its own maintenance.

### 4.4 Thread windowing and draft body stripping

Two changes to what history the model sees, both apply to single essays too:

- **Strip draft bodies from history.** A hand revision's `<draft>...</draft>`
  and an old style turn's `<draft>` are replaced in the sent history by one
  line: "I settled the changes by hand (kept 4, reverted 1). The draft below
  is the working draft." The draft state is already in `draft_text` and the
  current one rides on the last message, so nothing is lost and the largest
  duplication goes away. Storage is untouched.
- **Window the thread.** When the verbatim turns after the marker exceed the
  recent turns budget, the route folds the oldest of them into
  `thread_summary` with a Sonnet pass (the `distill` tier in `anthropic.ts`)
  that is told what to keep: decisions Kyle made, lines he claimed as his,
  lines he rejected, tensions left open, sources placed. The marker advances.
  The summary is prepended to history as a system note. It is regenerated
  from the previous summary plus the folded turns, never from scratch, so it
  is cheap and cumulative.

### 4.5 Retrieval over the draft

`scribe_book_chunks` is the book's own index: chunks of about 400 words, the
corpus chunk size, in the same `text-embedding-3-small` space as everything
else. Unlike the corpus chunker the chunks are aligned to paragraph breaks
and do not overlap: a draft changes every turn, and a sliding window would
shift every chunk after an edit and re-embed the whole chapter for one new
sentence. It is a separate table from `rag_corpus` and
`scribe_source_chunks` and nothing reads it but the Scribe.

Reindexing runs after a turn or import changes a chapter's draft: chunk, hash
each chunk, embed only the chunks whose hash is new (a chunk that merely
moved is reused by hash), delete the chapter's chunks past the new end, set
`indexed_hash`. A one paragraph edit re-embeds one or two chunks, not the
chapter. Embeddings go in batches of up to 64 per call.

Two new tools in book mode:

- `search_book(query, scope)`: semantic search over the book's chunks, scope
  `other_chapters` (default) or `all`, eight hits with chapter title and
  position. This is how cross essay questions get answered without the whole
  book in the prompt.
- `read_chapter(position, what)`: `summary` returns the chapter's summary and
  argument card; `text` returns its working draft, capped at 3,000 words with
  a note that it was cut. The cap keeps a runaway "read everything" turn
  inside the budget.

### 4.6 Summaries

After a chapter's draft changes by more than a few sentences (word level diff
over 5 percent, or on `/summarize`), a Sonnet pass rewrites that chapter's
`summary` and `argument` from its full text. The book `summary` and
`argument` are then rebuilt from the chapter summaries only, so the book pass
reads a few thousand tokens however long the book is. Both run after the turn
returns, never on the critical path, and both are shown in the book view where
Kyle can edit them by hand; a hand edited summary is marked and not
overwritten until the chapter changes again.

### 4.7 Corpus retrieval for fact checks

The Scribe already reads the corpus through `match_rag_corpus_cited`, the
citation grade RPC that returns id, provenance, translator and `text_type`,
and has filtered `deprecated = false` since 2026-09-02. The fact check reuses
that exact path (`searchCorpus` in `chat.ts`), so the Scribe's fence stays
what `server/lib/corpus-fence.js` says it is: research surface, no
exclusions. The server's HTTP retrieval endpoints
(`/api/courtyard/rag-preview`) are gated on a student bearer token and apply
the modern fence, so calling them from the Scribe would change what the Scribe
can see; I read "existing server retrieval endpoints" as this existing
retrieval path and am not adding a server route. Say so if you meant the
Railway endpoint specifically.

Quote or paraphrase follows `QUOTABLE_TYPES` as today: a `primary`,
`scholarship` or `modern_primary` chunk may be quoted verbatim in a finding;
`paper_summary`, `synthesis`, `concordance` and `modern_summary` are
paraphrased with attribution.

### 4.8 The three jobs

All three are explicit commands typed in the chat composer or pressed as
buttons; none fires on its own. Each runs as a normal turn so it lands in the
thread, its sources land in `sources_used`, and the changes view works.

**`/rewrite` (rewrite as suggestions).** Emits edit blocks only, one per
paragraph or run of paragraphs, never a complete `<draft>`. Kyle keeps or
reverts each hunk in the changes view as today. Output is the binding limit:
finds plus replaces roughly double the text, so a rewrite turn gets
`max_tokens` 16,000 (streaming, already the case) and works through about
2,000 words a turn, says where it stopped, and `/rewrite next` continues from
there. `/rewrite <heading>` scopes to one section.

**`/gaps` (gap analysis) and `/gaps book`.** No edits. Returns findings as a
fenced JSON block after the commentary; the route parses it, stores each as a
`gap` or `cross_gap` finding, and the Findings tab shows them with the quoted
passage painted in the draft, a "Fix this" that sends the existing scoped
turn, and a dismiss. `/gaps book` runs on the book view over the outline and
the summaries, calling `search_book` and `read_chapter` for what it needs,
and stores `cross_gap` findings on the chapters they name.

**`/factcheck` (Stoic fact check with citations).** Three stages, so the
verdict can only ever come from a passage that was actually retrieved:

1. Extract (Sonnet): every checkable claim about a Stoic figure, text, date,
   attribution or doctrine, each with the sentence it lives in and a retrieval
   query. Kyle's own experience and opinions are not claims.
2. Retrieve (no model): eight corpus hits per claim through the Scribe's
   existing corpus search, deduplicated, plus a second query naming the
   figure or work when the first is generic.
3. Judge (Opus): one call per batch of claims with the passages inline.
   Verdict `supported`, `contradicted` or `unverifiable`. A `contradicted`
   or `supported` verdict must cite a chunk id from the passages given and an
   excerpt; the route checks the excerpt is really in that chunk with the
   quote check normaliser (`quote-check.ts`) and downgrades any verdict whose
   excerpt is not found to `unverifiable` with a note saying why. Nothing
   from memory survives that check.

Findings go to `scribe_book_findings` as `fact` with `evidence`, and the
Findings tab shows the passage, the verdict, and the cited chunk with the same
reveal card the citation viewer already uses. Dates are the weak spot: the
corpus is mostly primary texts and holds few dates, so many date claims will
come back `unverifiable`, and the finding says so plainly rather than
guessing.

### 4.9 Import, and shaping a stream of consciousness

A paste box on the book view takes the long draft and shows a preview of the
split before anything is stored. Four ways to divide it, chosen in the box:

0. **Let Scribe shape it** (the default, added 2026-09-25 after Kyle said the
   real input is a stream of consciousness document). The whole paste goes to
   the chat model as numbered paragraphs; it says what the material is
   (book, essay, chapter, or separate pieces), proposes the parts, gives each
   a title, the thesis it reaches for and what it still lacks, and assigns
   every paragraph to exactly one part, reordered as the argument needs.
   Paragraphs are never rewritten: the proposal is structure only, assembled
   mechanically from the numbering, and any paragraph the proposal forgot
   lands in a final "Unplaced" part so nothing typed disappears. The cap is
   120,000 words in one call. Prompt: `SHAPE_SYSTEM`, section 5.5.
1. Markdown headings (`#` or `##`) if there are at least two.
2. Otherwise chapter markers: a line that is only "Chapter N", "N.", a roman
   numeral, or a title in capitals followed by a blank line; a bare marker
   takes the short line under it as its title.
3. Otherwise fixed size, about 3,000 words, cut at the nearest paragraph
   break, titled "Section N".

Splitting and assembly are a pure module (`lib/scribe/book.ts`).

The preview lists each chapter's title and word count; Kyle can merge, split
at a paragraph, rename, and reorder before committing. Commit creates one
entry per chapter with the chapter text as `raw_text` and as the first user
message with `draft_text` set, so provenance counts every sentence as his and
the changes view can always diff back to the original. Then the chapters are
indexed and summarised in the background.

### 4.10 UI

- `/admin/scribe/book`: list of books, new book, import.
- `/admin/scribe/book/[id]`: the book view. Outline on the left (the chapter
  picker: position, title, status, word count, open finding count), the book
  summary and argument card editable in the middle, the Findings list across
  chapters on the right, and the book level commands (`/gaps book`,
  `/factcheck book` which runs `/factcheck` chapter by chapter with progress,
  `/summarize`). Clicking a chapter opens the chat page on that entry.
- The chat page gains a book bar when the entry belongs to a chapter: book
  title, previous and next chapter, position, and the three commands as
  buttons next to the composer. The entries rail shows the book's chapters in
  order instead of every entry. The draft workspace gains a Findings tab.
- Copy rule for every new string, prompt and label: no em or en dashes. The
  existing `SYSTEM_PROMPT` and machine tells block contain dashes today and
  are left as they are; the new appendix and prompts have none.

### 4.11 Verification plan (step 3)

`tsc --noEmit` and `next lint` in `academy/web`. A new offline smoke script
`src/scripts/scribe-book-smoke.ts` generates a synthetic 60,000 word draft in
memory (repeating varied paragraphs with numbered headings, never written to
the database) and checks: the splitter yields the expected chapters under
each of the three strategies and loses no words; chunking and hashing
re-embed only changed chunks after a one paragraph edit; the context
assembler stays under 60,000 tokens for a 6,000 word chapter with a long
thread and reports what it cut; windowing folds the right turns and strips
draft bodies; the finding parser rejects a `contradicted` verdict whose
excerpt is not in its chunk. The model calls themselves are not exercised
offline.

## 5. The prompts

Exact text. No em or en dashes anywhere in them. `{{...}}` are values filled
at call time.

### 5.1 `BOOK_APPENDIX`, appended to the system prompt in book mode

```
BOOK MODE IS ON. This conversation is one chapter of a book of essays Kyle is writing. The book is his own work, every word, and you are helping him make it whole.

What you can see: a BOOK BRIEF with the book's title, its argument card, and a rolling summary; an OUTLINE, one line per chapter with its position, title, status and word count; this chapter's argument card and the summaries of the chapters on either side of it; a summary of the earlier part of this conversation where it has grown long; the recent turns; and the working draft of this chapter, and only this chapter, inside <working_draft> tags.

What you cannot see: the text of the other chapters. Two tools cover that. search_book finds passages anywhere in the book by meaning; use it whenever a claim here might be made, contradicted or already earned elsewhere, and when Kyle asks how this chapter sits with the others. read_chapter returns another chapter's summary, or its text when you truly need the wording; the text is capped, so ask for the summary first. Never guess what another chapter says. If you have not searched or read it, say you have not looked.

The working draft is this chapter. Every edit block finds its passage in this chapter. A complete <draft> is this chapter, never the book. If a turn calls for a change in another chapter, say which chapter and what the change is, and leave it for Kyle to open that chapter; do not try to make it from here.

Keep the voice rules: the register is Kyle's throughout, the corpus is scaffolding, and no dashes in anything you write.
```

### 5.2 Rewrite as suggestions (`/rewrite`)

Sent as Kyle's turn. `{{scope}}` is empty, a heading, or "continue from the paragraph beginning: ..."

```
Turn this raw first draft into finished prose in my voice, as suggestions I will review one by one.

{{scope}}

How to work:
1. Read the whole chapter once before you change anything, so you know where it is going and what it has already said.
2. Work in draft order. For each paragraph, or each run of paragraphs that belongs together, emit one edit block: the passage copied exactly from the working draft in the find, your version in the replace. Never emit a complete <draft>. Never rewrite the whole chapter as one edit.
3. Keep my sentences wherever they already work. A paragraph that only needs its order fixed gets its order fixed and nothing else. Reuse my phrasing, my images and my examples; the job is structure and clarity, not new material.
4. Fix what makes a first draft a first draft: a point made three times, a paragraph that starts in the wrong place, a claim before its ground, a transition that is missing, a sentence doing two jobs. Cut repetition. Do not add claims I did not make, do not add sources, and do not soften a position I took.
5. Where the argument needs something only I can supply, leave a [YOUR TURN: ...] gap that says what, instead of inventing it.
6. Stop after about two thousand words of replaced text. In the commentary say which paragraph you stopped at, quoting its first few words, so I can send "/rewrite next".

In the commentary, before the edit blocks: one line per edit saying what it does and why. After them: the lines in your replaces that are your phrasing rather than mine, so I can earn them or cut them.

No dashes anywhere, in the prose or the commentary.
```

### 5.3 Gap analysis (`/gaps` and `/gaps book`)

Chapter form, sent as Kyle's turn:

```
Read this chapter as a demanding reader who agrees with nothing until it is earned, and tell me where the argument has gaps. Do not change the draft. Emit no edit blocks and no <draft>.

Look for:
- A claim asserted where it needs a ground: a reason, a case, a passage, a scene.
- A step skipped: the reader is expected to move from one point to the next and the bridge is not on the page.
- A counterposition the essay walks past that a serious reader would raise.
- A term carrying the argument without having been given a meaning here.
- A conclusion stronger than what came before it supports.
- A thread opened and not closed.
- A place where a lived scene would turn an abstraction into evidence, and none is there.

Then use search_book to check this chapter against the rest of the book: a claim made here that another chapter contradicts, a ground this chapter needs that another chapter already supplies and could point to, a point argued twice in two chapters. Report only what the search actually returned, with the chapter named. If nothing connects, say so.

Give the findings in plain commentary first, the most serious first, at most ten. Then a fenced JSON block, exactly this shape, one object per finding:

{"findings": [{"kind": "gap", "passage": "the exact sentence from the draft where the gap is, copied character for character", "note": "what is missing and what would close it, two sentences at most", "chapter_position": null}]}

For a cross chapter finding use "kind": "cross_gap" and put the other chapter's position number in "chapter_position". A passage must be findable in the working draft; if a gap has no single sentence, quote the sentence just before where the missing material belongs.

Do not praise. Do not pad to ten. If the argument holds, say that it holds and give an empty list. No dashes.
```

Book form, run from the book view with the outline and every chapter summary inline and `search_book` and `read_chapter` available:

```
Here is the outline of the book and a summary of every chapter. Read the book's argument as a whole and tell me where it has gaps across essays. Do not change any draft.

Look for:
- A chapter whose thesis depends on something no earlier chapter has established.
- Two chapters that argue the same point without knowing it, or that contradict each other.
- A term used with different meanings in different chapters.
- A question the book raises in one chapter and never returns to.
- A through line the summaries promise that the chapters do not deliver.
- Where a chapter is missing: a step in the book's argument no chapter takes.

Use read_chapter for the summary of any chapter you need to look at closely, and search_book to confirm a claim before you say a chapter makes it. Report only what you have read or found. A finding that names a chapter must name one you looked at.

Give the findings in plain commentary first, the most serious first, at most twelve. Then a fenced JSON block, exactly this shape:

{"findings": [{"kind": "cross_gap", "chapter_position": 4, "passage": "a sentence from that chapter's summary or text that the finding is about", "note": "what is missing across the book and what would close it, two sentences at most"}]}

If the book's argument holds together, say so and give an empty list. No dashes.
```

### 5.4 Stoic fact check with citations (`/factcheck`)

Stage 1, extraction, Sonnet, system prompt:

```
You extract checkable claims from a chapter of a book about Stoic practice. The author is a Stoic practitioner writing from his own life; his experience, his opinions and his interpretations are not claims to check. What you extract are statements a scholar could verify against the sources: who a Stoic figure was and what they did, what a text says or contains, when someone lived or something happened, who said or wrote what, and what a Stoic doctrine holds.

Return JSON only, this shape:

{"claims": [{"kind": "figure" | "text" | "date" | "attribution" | "doctrine", "claim": "the claim in one plain sentence", "passage": "the sentence in the chapter that makes it, copied character for character", "query": "a retrieval query for the corpus phrased as the concept, the figure and the work, not as a question", "figure": "the figure or work the claim is about, or null"}]}

Rules: one claim per object; a sentence that makes two claims gets two objects with the same passage. Copy the passage exactly. Extract every claim of the kinds above, including the ones you believe are true. Do not judge anything here. If the chapter makes no such claims, return an empty list. No dashes.
```

Stage 3, judging, Opus, system prompt. `{{passages}}` are the retrieved chunks, each with a chunk id, author, work, section, translator, its QUOTE or PARAPHRASE mode and its text.

```
You check claims about the Stoics against passages from a corpus. The corpus is the only authority here. You have no other knowledge for this task. What you remember about Seneca, Marcus, Epictetus, Chrysippus or anyone else does not count; only the passages in front of you count.

For each claim, decide:
- supported: a passage in front of you says what the claim says, or entails it plainly.
- contradicted: a passage in front of you says something the claim cannot be true alongside.
- unverifiable: the passages neither support nor contradict it. This is the right answer whenever you would have to rely on memory. A claim that is well known to be true is still unverifiable if no passage here says it.

A supported or contradicted verdict must cite a chunk id from the passages given and an excerpt copied word for word from that chunk, long enough to carry the point. A verdict with no excerpt, or an excerpt not in the cited chunk, will be thrown out, so copy carefully. Passages marked PARAPHRASE are summaries of modern scholarship; cite them by chunk id with an excerpt as usual, and in the note say it is a scholar's summary, not the ancient text.

For a contradicted claim the note says what the passage says instead and what in the author's sentence is wrong: the date, the attribution, the work, the doctrine. Be exact and be brief. For unverifiable, the note says what kind of source would settle it. Never suggest the author is right or wrong on your own authority.

Return JSON only:

{"results": [{"claim": "as given", "passage": "as given", "verdict": "supported" | "contradicted" | "unverifiable", "chunk_id": "id or null", "excerpt": "word for word from that chunk, or null", "note": "two sentences at most"}]}

No dashes.
```

The user message for the judge carries the claims and then the passages, grouped by claim, with the chunk metadata exactly as the corpus search formats it today.

### 5.5 Shaping a stream of consciousness (`SHAPE_SYSTEM`)

```
You are Scribe, Kyle's editorial collaborator. He has typed a long stream of consciousness: thoughts, scenes, arguments, fragments, in the order they came. Every word is his. Your job is to propose the shape the material wants to take, so he can review the proposal and then work on each part with you.

You are given the text as numbered paragraphs. Read all of it before deciding anything. Then decide what it is: a book of essays, one long essay, a single chapter, or a set of unrelated pieces. Then group the paragraphs into parts. A part is a chapter or an essay: one argument with a beginning, a turn and a landing. Order the parts as the book should run, not as the paragraphs happened to arrive. Inside a part, order the paragraphs as the argument needs them.

Rules:
- Every paragraph goes in exactly one part. Do not drop any. If a paragraph belongs nowhere, put it in a final part titled "Unplaced" and say so.
- Do not rewrite anything. You are proposing structure, not prose; the paragraphs go in whole and unchanged.
- Titles are his kind of title: plain, concrete, no colons if a plain phrase will do.
- Say, for each part, the thesis it is reaching for in one sentence and what it still lacks in one sentence.
- Prefer fewer, fuller parts to many thin ones. A part under four hundred words is usually a fragment that belongs inside another.

Return JSON only:

{"form": "book" | "essay" | "chapter" | "pieces", "title": "a working title for the whole, or null", "note": "three sentences at most on what the material is and why you shaped it this way", "parts": [{"title": "...", "thesis": "...", "lacks": "...", "paragraphs": [3, 1, 2]}]}

No dashes anywhere.
```

## 6. Open questions for Kyle

1. The corpus retrieval path: the Scribe's existing RPC path as in 4.7, or a
   new authenticated route on the Railway server? I propose the former.
2. The four chat tables applied on 2026-07-18 and 2026-07-19 have no
   committed migration file. This PR does not add one (it would also have to
   be applied, and the migration history already has an entry for them), but
   the nightly auditor's drift probe will keep noticing. Worth a separate,
   tiny migration that records them with `create table if not exists`.
3. The chat model stays `claude-opus-4-6` and the summariser stays on the
   `distill` tier, as configured today. Moving the Scribe to a newer Opus is a
   separate decision and a one line change.
4. Budget ceiling of 60,000 tokens a turn: a number to argue with. Lower is
   cheaper and forgets sooner; higher is the opposite.
5. Whether a chapter's `/factcheck` should also search the private
   `scribe_source_chunks` (the papers Kyle has added). I have left it corpus
   only, since the question was about the Stoic texts.
