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
- `.claude/skills/arete-design/` — the Arete design system as a Claude skill
  (`/arete-design`): tokens, guideline cards, React components, and mobile and
  academy UI kits. Read its `readme.md` before designing or restyling any
  screen.

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
- Retrieval runs on an HNSW index (`rag_corpus_embedding_hnsw_idx`, since
  2026-09-20) with `hnsw.ef_search = 200` and relaxed order set on the database
  and on the PostgREST roles, never on the function. `match_rag_corpus` routes
  by author size: no author goes to the index, an author with up to 1,200 rows
  is read through the author btree and sorted exactly (the index crawls for a
  rare author), a more common author is left to the planner. The planner
  abandoned the index at `ef_search` 250 in testing, so any change to the
  setting or the index is measured with `EXPLAIN (ANALYZE, BUFFERS)` on
  `match_rag_corpus` first, and the nightly `corpus.retrieval_latency` probe
  is the guard. The two migrations of 2026-09-20/21 carry the numbers.
- `text_type` is the layer field and the only fence: primary, scholarship,
  paper_summary, synthesis, concordance, modern_primary, modern_summary
  (locked by a check constraint). The counselor, modern, and research fences
  live in `server/lib/corpus-fence.js`; a new layer is a migration plus a
  fence entry, never an ad hoc value.

## The nightly auditor

`server/quality-audit-agent.js` checks whether what is already in the system is
correct — the corpus against the standing rules, the library and the Garden
against what they promise a reader, the repo against its own conventions, and a
read sample of live chunks against what the metadata claims they are. It reads
and reports; it changes nothing.

Read `server/QUALITY_AUDIT_AGENT.md` before adding a probe. Two things matter
most: a finding's fingerprint must be stable across runs (no counts, no dates)
because the night-to-night diff and the mute list are keyed on it, and a probe
whose prerequisites are missing must skip and say so rather than pass silently.

It is also the place to put a rule you find yourself checking by hand. A
convention nothing enforces drifts — the agent was written because three
migrations had been applied to the project with no committed file beside them.

Run the repo probes against a current checkout. They compare what the project
has to what the branch has, so a branch that is behind reports the base's work
as drift: the first run of the drift probe claimed five, and three of those were
migrations that had landed on main while the branch was being written. Acting on
that reading put duplicate migration files on main. `repo.checkout_stale` now
enforces this — while the checkout is behind, the drift probe will not call
anything critical — but the habit is still worth having.

## Conventions

- Migrations go in `supabase/migrations/` with a timestamp prefix, and are
  applied to the remote project through the Supabase migration tool (which
  records them in the migration history) in the same session, with the
  result verified by query. Keep the file and the applied SQL identical;
  never apply SQL that is not also committed.
- Ask before deleting rows from any table. Deprecation is almost always the
  right move instead.
