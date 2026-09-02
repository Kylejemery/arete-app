# CLAUDE.md

Guidance for Claude Code working in this repository.

> This file is a starting point. It currently covers the corpus only, because
> that is what it was created for. Build commands, test commands, and
> architecture notes should be added as they are established.

## Repository shape

Monorepo. The parts that matter most often:

- `academy/web/` — Next.js academy site (Vercel, academy.pursuearete.com)
- `academy/corpus-ingestion/` — the RAG corpus pipeline: chunker, embedder, uploader, `corpus-agent.js` nightly job, queue helpers
- `server/` — Railway API server, retrieval endpoints, agent jobs
- `supabase/migrations/` — all schema changes
- `moltbook-agent/` — the autonomous Arete interlocutor worker
- `app/`, `components/`, `hooks/` — the Expo mobile app
- `docs/` — specs and policy

## The corpus

The RAG corpus is not just product infrastructure. It is a philosophical
project in its own right, and it is the thing that compounds. Treat changes to
it with more care than changes to application code, because a bad ingest is
hard to notice and affects every agent downstream.

**Before adding, removing, or re-labelling anything in `rag_corpus`, read
`docs/corpus/ACQUISITION_PLAN.md`.**

- Part 2 is the question map: the philosophical questions the corpus is meant
  to hold positions on. Every new work is registered against it.
- Part 4 is the admission standard: eight tests for judging a candidate text.
  Run them and record the result, including for rejections.
- Part 5 is the metadata every ingest must carry. `translator`, `source_url`,
  and `edition_year` are required at the write path. Empirical claims carry a
  `review_by` date.

Two standing rules that predate this file and still hold:

1. **Copyright.** Verbatim ingestion only for public domain texts, meaning a
   translation published 1930 or earlier, or an open license that has been
   confirmed rather than assumed. Everything modern enters as a Mode 2
   summary through the admin corpus page: the agent reads and rewrites in its
   own words, the original is never stored.
2. **Deprecate, never delete.** Superseded ingests get `deprecated = true` so
   retrieval changes stay reversible and auditable. Retrieval must filter on
   it.

### Things that have gone wrong before

- The filename parser (`Author_Title_Section_Language.txt`) splits multi-word
  titles, which has produced malformed author and work values and duplicate
  ingests under two identities. Prefer explicit metadata over filename
  derivation for anything that is not a plain single-word title.
- The pipeline once wrote to `source_text_chunks` while retrieval read from
  `rag_corpus`, so months of ingests were never retrievable. Verify the write
  target against the read target before ingesting.
- Ancient technical vocabulary is invisible to vector search because the older
  translations render it in English. See the concordances in
  `academy/corpus-ingestion/concordance/` (one numbered entry, one chunk;
  synced into `rag_corpus` by the nightly agent; format in the README there).
- `text_type` is the layer field and the only fence: primary, scholarship,
  paper_summary, synthesis, concordance, modern_primary, modern_summary
  (locked by a check constraint). The counselor, modern, and research fences
  live in `server/lib/corpus-fence.js`; a new layer is a migration plus a
  fence entry, never an ad hoc value.

## Conventions

- Migrations go in `supabase/migrations/` with a timestamp prefix, and are
  applied to the remote project through the Supabase migration tool (which
  records them in the migration history) in the same session, with the
  result verified by query. Keep the file and the applied SQL identical;
  never apply SQL that is not also committed.
- Ask before deleting rows from any table. Deprecation is almost always the
  right move instead.
