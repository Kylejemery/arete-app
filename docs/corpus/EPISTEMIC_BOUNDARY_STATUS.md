# Epistemic boundary status: `author_chronology`

Date: 2026-09-02. Written during the corpus physics remediation (task 2).

## Finding, stated plainly

The epistemic boundary specced in the v40 session is **not built**. There is
no `author_chronology` table in the Supabase project `zhaarabzemhantyxxckq`,
no migration for it anywhere in the repository or on any branch, and no
`epistemic_cutoff_year` or `epistemic_overrides` in code. Counselor retrieval
is not filtered by author chronology in any environment this repository
describes.

## What the spec asked for

From the v40 session: an `author_chronology` table with birth years; an
`epistemic_cutoff_year` per counselor; a strict retrieval rule of
`author.birth_year < counselor cutoff`; and a per-counselor
`epistemic_overrides` allowlist for the Plato exception.

## What exists in code

Two guarded, optional consumers, present on `main` and on every feature
branch. Both were written to light up when the table appears and to do
nothing until then.

| File | Lines | What it does |
| --- | --- | --- |
| `server/routes/observatory.js` | 262 to 265 | Reads `author_chronology` inside `guarded(...)`, so a missing table yields `null` and the Observatory payload carries no chronology. |
| `academy/web/src/app/library/page.tsx` | 1034 to 1060, 1789 to 1791 | Builds an era depth axis from whatever columns the table ships with (`epistemic_cutoff_year`, `cutoff_year`, `death_year`, `floruit_year`, `era_year`, `year`). Returns `null` and keeps the flat layout when the table is absent. |

Both files call the missing table "the Epistemic Boundaries build". Nothing
else in the repository references `author_chronology`, `epistemic_cutoff`, or
`epistemic_overrides`. The only `birth_year` references are in
`Arete_Custom_Cabinet_Spec.md`, which describes a custom counselor profile
field, not a retrieval fence.

Search performed: `grep` over `*.js`, `*.ts`, `*.tsx`, `*.sql`, `*.md`,
`*.json` on the working tree, then `git grep` on the head of `main` and of
every `claude/*` and `feat/*` branch (46 branches, fetched at depth 1). No
branch carries a migration or any code beyond the two consumers above.

## What exists in the database

- `information_schema.tables` for schema `public` lists 105 tables.
  `author_chronology` is not one of them.
- `supabase_migrations.schema_migrations` lists 75 applied migrations. None
  names chronology, epistemic, or boundary.
- Counselor retrieval today runs through `match_rag_corpus(query_embedding,
  match_count, filter_author, filter_language, exclude_text_types)` with
  `filter_author = null` on the Cabinet and Oracle paths. The only fences on
  those paths are `language = 'english'`, `deprecated = false`, and the
  `text_type` exclusion added in this remediation.

## The gap

1. **No table, no migration.** The build was specced and never written, in
   this repository or elsewhere that the repository can see.
2. **No cutoff data.** Even the counselor profiles carry no
   `epistemic_cutoff_year`; the counselor prompts assert their tradition in
   prose (Marcus "is educated in the full Greek and Roman literary tradition")
   and nothing enforces it at retrieval.
3. **No override mechanism.** The Plato exception has nowhere to live.
4. **Consequence for sequencing.** The modern metaphysics fence cannot lean
   on chronology. It is built on `text_type` instead
   (`server/lib/corpus-fence.js`), and the modern layer proposal in
   `docs/corpus/MODERN_LAYER_PROPOSAL.md` assumes that.

## What would close it (not built here)

A migration creating `author_chronology(author text primary key, birth_year
int, death_year int, floruit_year int, epistemic_cutoff_year int, notes text)`
seeded for the 46 live authors; an `epistemic_cutoff_year` and
`epistemic_overrides text[]` on the counselor definition; and a
`filter_max_birth_year int default null` plus `allow_authors text[]` on
`match_rag_corpus`, applied on the counselor paths listed in
`MODERN_LAYER_PROPOSAL.md`. The `text_type` fence stays as the second line,
because chronology cannot distinguish a 1911 secondary source from a 2026
editorial entry once both are older than the counselor's own future.
