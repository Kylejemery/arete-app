# The Composer

`academy/web`, at `/dashboard/composer`. One document, full height, with the Interlocutor's marks living in it. This note covers the retype callout, the voice and grounding passes, and autosave, added September 2026 on top of the Interlocutor Studio (marked-up feedback, accept/reject rewrites, stage flow, works list, voice meter).

## Retyping

The problem the callout answers: prose that arrived from somewhere else (the Interlocutor's rewrite, a draft's first pass) does not sound like the writer, and editing it in a margin card then accepting it whole never makes it theirs. Retyping does.

- **Open it.** Put the caret in a sentence and press `Ctrl+Enter`, click **Retype** in the toolbar, select a passage and press **Retype** on the floating bar, or press **Retype it** on a comment card that carries a rewrite. A caret opens the sentence around it; a selection opens exactly itself.
- **Type over.** The box sits under the sentence's last line, inside the page's scroller so it moves with the text. Every keystroke in the box replaces the sentence on the page. The range on the page is highlighted in gold.
- **Keys.** `Enter` keeps. `Esc` restores the original. `Tab` keeps and opens the next sentence; `Shift+Tab` the previous one. `Ctrl+Enter` inside the box also walks forward. `Shift+Enter` is a newline in the box.
- **Chips.** *Original* reloads the sentence. *Interlocutor's rewrite* appears when an open mark with a suggestion lies inside the range; loading it and keeping a changed sentence marks that annotation accepted. *In my voice* and *Ground in corpus* call the routes below. *Cut* deletes the sentence and mends the seam. *Restore* and *Keep* mirror `Esc` and `Enter`.
- **Undo.** Opening a retype takes a snapshot; the status bar offers *Undo retype* after it is kept.

Sentence boundaries come from `src/lib/sentences.ts`: line breaks always end a sentence, markdown prefixes are not part of it, and the tradition's abbreviations are handled (`Ep. 12`, `Disc. 1.24`, `Med. 5.1`, `Ench. §5` stay joined; `He said no. Then` and `etc. The` split). Checks: `npx tsx src/scripts/sentences-smoke.ts`.

## In my voice

`POST /api/composer/voice` returns three variants of one sentence, each with a one-line note, judged from the writer's own prose: the latest draft of each of their three most recent pieces (own rows under RLS), plus the Scribe voice card (`scribe_style_profiles`, via the admin client) when the writer is an admin who keeps one. Variants: plainest, most concrete, closest to the writer's cadence. No dashes, no thesaurus diction, no signposting, no added claims. Model `claude-opus-5`, adaptive thinking, effort medium, JSON schema output. Prompt in `src/lib/composer.ts` (`VOICE_SYSTEM`).

Variants load into the box, never onto the page directly. The writer's keystrokes are still what changes the draft. Stage gating (thesis and outline withhold rewrites) does not apply here: the writer asked.

## Ground in corpus

`POST /api/composer/ground` embeds the sentence (`embedChunk`, OpenAI) and searches `rag_corpus` through `match_rag_corpus_cited` (admin client, top 6, similarity floor 0.25), the same retrieval Scribe chat uses. Each passage returns with author, work, section label, translator, and a mode: **quotable** for `primary`/`public_domain` text types, **paraphrase only** for summaries and syntheses. With `assess: true`, a second short pass (`claude-opus-5`, effort low) judges fidelity only: supported, partly, contradicted, or corpus silent, in at most three sentences naming the passage.

In the panel, *Quote opening line* appends the passage's first sentence as a quotation with citation; select words inside a passage and the button becomes *Quote selection*. *Cite* appends only `(Author, *Work* section)`. Both land in the box for the writer to shape.

Requires `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; without them the route returns 503 and the panel shows the message.

## Autosave

Migration `academy/supabase/migrations/012_composer_working_copy.sql` adds `working_copy` and `working_copy_saved_at` to `writing_pieces` (applied to project `zhaarabzemhantyxxckq` 2026-09-02). The composer writes the working copy 1.5 s after the last change. A scratch draft with no piece yet gets a row once it reaches 200 characters, so a long draft is in the database well before its first markup. The browser keeps a per-piece copy with a timestamp; on open, the newer of the two wins. The status bar shows `saved 3:12 PM`, `unsaved`, `saving…`, `not saved`, or `scratch`.

`piece_drafts` is unchanged: immutable snapshots, one per submission, that annotations anchor to.

## Files

- `src/app/dashboard/composer/page.tsx`: the page; retype state, autosave, wiring.
- `src/components/DraftEditor.tsx`: textarea plus backdrop layers; the retype layer and callout placement; `Ctrl+Enter`.
- `src/components/RetypeCallout.tsx`: the box, chips, voice and ground panels.
- `src/components/PassageBar.tsx`, `src/components/MarkedUpDraft.tsx`: *Retype* and *Retype it* entry points.
- `src/lib/sentences.ts`, `src/lib/composer.ts`: sentence model; prompts, types, citation formatting.
- `src/app/api/composer/voice/route.ts`, `src/app/api/composer/ground/route.ts`.
