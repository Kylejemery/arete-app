# Corpus physics remediation, run record

Date: 2026-09-02. Branch `claude/corpus-physics-remediation-u8ahjz`.
Supabase project `zhaarabzemhantyxxckq`. Companion documents:
`EPISTEMIC_BOUNDARY_STATUS.md` (task 2), `MODERN_LAYER_PROPOSAL.md` (task 5).

The remediation sandbox had no OpenAI key and could not reach
`gutenberg.org` or `api.openai.com` (egress policy). Everything that needs
an embedding or the live Gutenberg file is therefore set up to happen on the
nightly Railway run, and is listed under "Not verified" below rather than
assumed.

## Task 1: identities and labels (verified)

Migration `20260902150000_corpus_identity_remediation.sql`, applied live.

```
select author, work, count(*) filter (where not deprecated) live, count(*) filter (where deprecated) dead
from rag_corpus where author ilike '%arnold%' or author ilike '%stock%' or work ilike '%inibus%'
group by 1,2 order by 1;
```

| author | work | live | dead |
| --- | --- | --- | --- |
| Arnold | Roman | 0 | 561 |
| Cicero | De Finibus | 622 | 0 |
| E. Vernon Arnold | Roman Stoicism | 438 | 0 |
| St. George William Joseph Stock | A Guide to Stoicism | 51 | 0 |
| Stock | Guide | 0 | 60 |

Retrieval respects `deprecated` everywhere now. `match_rag_corpus` and the
five-argument `match_academy_chunks` already filtered on it; the migration
added the filter to `match_rag_corpus_ids`, `match_rag_corpus_cited`, and the
six-argument `match_academy_chunks`, and to the four functions that count or
shelve the corpus (`corpus_work_counts`, `library_shelf`,
`observatory_corpus_stats`, `system_reflection_corpus_stats`), so a deprecated
duplicate no longer inflates coverage or sits on the reader shelf. Confirmed
by reading every function's live definition after the migration.

Also moved to the live identity: the `corpus_significance_map` rows for
Arnold, Stock, and Cicero (the Coverage Gap Agent matches on exact author and
work), the `library_overrides` row that had hidden "Vernon Arnold" (renamed to
E. Vernon Arnold and made visible, since it was hiding the duplicate), and the
`STOIC_AUTHORS`, `SPINES`, `WORK_TITLES`, `ERAS` keys in `server/library.js`.

Arnold's `source_url` is left null. The book is on archive.org, but the
identifier could not be checked from the sandbox and a guessed URL is worse
than none. The edition (Cambridge University Press, 1911) is recorded in the
significance-map note.

Bobzien: untouched, as instructed. The fifteen chunk texts are printed by the
migration (`raise notice`) and were read. Decision material:

| identity | work | what the summary describes |
| --- | --- | --- |
| Bobzien | Logic Part 1 | A handbook chapter on Stoic logic: assertibles, connectives, modality, argument theory. |
| Bobzien | Logic Part 2 | The same chapter, pages 126 to 157: syllogistic, indemonstrables, themata, sophisms. |
| Susanne Bobzien | Stoic Syllogistic | *Oxford Studies in Ancient Philosophy* XIV (1996). |
| Susanne Bobzien | Stoic Logic and Multiple Generality | Bobzien and Shogry, on variable-free multiple generality. |
| Susanne Bobzien | Chrysippus and the Epistemic Theory of Vagueness | *Proceedings of the Aristotelian Society* 102 (2002). |

These are five distinct works, not duplicates. "Logic Part 1/2" is the
two-part summary of one chapter (almost certainly "Stoic Logic" in *The
Cambridge Companion to Stoic Philosophy*, 2003, given the section order and
the page range). The only defect is the author label `Bobzien`. A relabel to
`Susanne Bobzien` with work `Stoic Logic (Cambridge Companion), part 1`
and `... part 2` would merge the identity without merging the papers. Kyle
decides.

## Task 2: `author_chronology`

Not built anywhere. See `EPISTEMIC_BOUNDARY_STATUS.md`.

## Task 3: Timaeus (queued; ingestion happens on the next nightly run)

- Migration `20260902150100_corpus_queue_provenance_and_timaeus.sql`, applied
  live: the queue gains `translator`, `text_type`, `body_start_marker`,
  `body_end_marker`; both corpus-agent twins pass them through.
- Queue row `5750801c-81ba-442c-a766-62466dcd705d`: Plato / Timaeus,
  Gutenberg 1572, priority 1 (the only other pending row, Zeller, is 50, so
  Timaeus runs first), translator Benjamin Jowett, text_type primary,
  `body_start_marker = 'PERSONS OF THE DIALOGUE'`. Inserted by SQL with the
  same fields `queue-add.js` would write, because the sandbox has no service
  key. The equivalent command is in `CORPUS_AGENT.md`.
- Significance map: Plato / Timaeus, tier 1, threshold 40, with the Gutenberg
  URL as `recommended_url`.
- Plato provenance: `translator = 'Benjamin Jowett'` on all 952 existing
  Plato chunks, set only where the work's own chunk 0 says "Translated by
  Benjamin Jowett" (all seven works do).

Why "last occurrence": the Republic's file has a contents list that names
"PERSONS OF THE DIALOGUE" before the introduction and again where the
dialogue starts (two occurrences in the corpus copy, first in chunk 0). The
cut takes the last one. Tested end to end against a synthetic Gutenberg file
served locally: `verify-queue.js` reports both occurrences and the body
starts at the second.

The Republic and the Apology already in the corpus contain Jowett's
Introduction and Analysis under Plato's name (chunk 0 of each opens with it).
Recommended follow-up: deprecate the seven Plato works and requeue them with
`body_start_marker` set, once the Timaeus run has proved the mechanism.

## Task 4: concordance (script and fence in place; embedding pending)

- `academy/corpus-ingestion/concordance/stoic_physics_concordance.md`: the
  thirteen entries, verbatim, with front matter (`work`, `difficulty`, three
  `probe:` queries). `concordance/README.md` documents the format and the
  rules that keep the sync re-runnable as the file grows.
- `academy/corpus-ingestion/ingest-concordance.js`: parses `## N. Term`
  headings into one chunk each (the "Note on verification" section is
  unnumbered and skipped), embeds with `embedChunks` from `embedder.js`
  (`text-embedding-3-small`, confirmed), upserts with explicit metadata, and
  re-embeds only changed or unembedded entries. Dry run output: 13 entries,
  76 to 277 words each.
- `corpus-agent.js` calls the sync at the start of every nightly run and
  prints the probes when anything was embedded.
- Migration `20260902150200_match_rag_corpus_exclude_text_types.sql`, applied
  live: `match_rag_corpus` gains `exclude_text_types text[] default '{}'`.
- `server/lib/corpus-fence.js` holds the list (`concordance`);
  `server/index.js` passes it on the three counselor retrievals and filters
  graph-boost expansion, the counselor source catalog, and the reader shelf.

```
select count(*) from rag_corpus where text_type = 'concordance';   -- 0
```

Zero, not thirteen. The rows are created and embedded by the sync on the
next nightly run (08:00 UTC), or by `node ingest-concordance.js` from any
machine with the keys. The row shape was validated against the live
constraints by inserting entry 10 inside a transaction that was then rolled
back (accepted). Unembedded rows were deliberately not seeded: they would
satisfy the count while being invisible to retrieval.

Live retrieval check, as far as it could be run: using an existing Diogenes
Laertius chunk's embedding as the query vector (no OpenAI call needed),
`match_rag_corpus` with `exclude_text_types = '{}'` and with
`'{concordance}'` both return Diogenes Laertius, Stock, E. Vernon Arnold,
Cicero *De Finibus*, and Arnold again; `match_rag_corpus_ids` returns the
same set. The deprecated Arnold / Roman copy no longer appears. This proves
the RPCs and the parameter, not the bridge.

## Files where a retrieval filter was added or changed

| file | change |
| --- | --- |
| `supabase/migrations/20260902150000_corpus_identity_remediation.sql` | `deprecated = false` on `match_rag_corpus_ids`, `match_rag_corpus_cited`, six-argument `match_academy_chunks`, `corpus_work_counts`, `library_shelf`, `observatory_corpus_stats`, `system_reflection_corpus_stats`. |
| `supabase/migrations/20260902150200_match_rag_corpus_exclude_text_types.sql` | `exclude_text_types` on `match_rag_corpus`. |
| `server/lib/corpus-fence.js` | New. The counselor exclusion list and helpers. |
| `server/index.js` | Lines 19, 393, 1168 to 1177, 1293 to 1302, 3536 to 3548, 4344: fence on the parallel Cabinet, the single counselor, `getStoicContext`, the counselor catalog, the reader shelf. |
| `server/library.js` | Identity keys only (no retrieval logic). |

Not fenced, on purpose: Synthesis, Inquiry, Tension, Dreaming, Dispatch,
World, Convergence, Coverage Gap, the Scribe, the corpus MCP tools, the eval
harness, the Journal agent, the Academy seminar retrievals, and the
Observatory passage draw. The last three are discussed in
`MODERN_LAYER_PROPOSAL.md` section 3.

## Not verified

- The Timaeus cut point against the real Gutenberg file. Run
  `node verify-queue.js --url https://www.gutenberg.org/cache/epub/1572/pg1572.txt --start-marker "PERSONS OF THE DIALOGUE"`
  from a machine with egress. If the marker is absent the agent ingests the
  whole text and writes a dated note on the queue row.
- The concordance rows and their embeddings (count is 0 until the sync runs).
- The bridge itself: "does the Stoic cosmos have a mind" returning both
  concordance entries and the ancient passages. `node ingest-concordance.js
  --verify "does the Stoic cosmos have a mind"` prints the top five in both
  views; the nightly log prints the three probes after the first sync.
- PostgREST resolution of the new five-argument `match_rag_corpus` from
  supabase-js callers that pass four named arguments. There is only one
  function of that name now, so no overload ambiguity exists, but the path
  was exercised in SQL, not through PostgREST.
- Arnold's archive.org `source_url`.

## Deploy sequencing

The nightly cron deploys `academy/corpus-ingestion` from the repository. If
the 08:00 UTC run fires before this branch is merged and deployed, the old
agent ingests Timaeus whole (no marker support, no translator, text_type
primary) and does not sync the concordance. Merge and deploy first, or set
the Timaeus queue row to `status = 'skipped'` until then.

---

## Addendum, same day: Bobzien relabel and task 5 implemented

Kyle approved the Bobzien relabel and asked for task 5 to be built.

### Bobzien (verified)

Migration `20260902155000_bobzien_identity.sql`, applied live. `rag_corpus`,
`corpus_sources`, and `paper_submissions` now carry one author string:

| author | work | chunks |
| --- | --- | --- |
| Susanne Bobzien | Stoic Logic (Cambridge Companion), part 1 | 3 |
| Susanne Bobzien | Stoic Logic (Cambridge Companion), part 2 | 3 |
| Susanne Bobzien | Stoic Logic and Multiple Generality | 3 |
| Susanne Bobzien | Stoic Syllogistic | 3 |
| Susanne Bobzien | XII*-CHRYSIPPUS AND THE EPISTEMIC THEORY OF VAGUENESS | 3 |

The chapter attribution ("Cambridge Companion") is inferred from the section
order and page range of the summary; if the source was a different handbook,
relabel the work again, never the author.

### text_type normalisation (verified)

Migration `20260902160000_text_type_normalisation.sql`, applied live.

| text_type | live | deprecated |
| --- | --- | --- |
| primary | 10,819 | 0 |
| scholarship | 608 | 621 |
| paper_summary | 268 | 0 |
| synthesis | 99 | 0 |
| public_domain | 0 | 0 |
| summary | 0 | 0 |

Exactly the counts the proposal predicted (paper_summary is 268 rather than
262 because six rows were ingested upstream between the proposal and the
build). Check constraints now lock the seven-value set on `rag_corpus`,
`corpus_ingestion_queue`, and `corpus_sources`; `corpus_sources` defaults to
`paper_summary`. `match_rag_corpus_ids` gained `exclude_text_types`, exercised
in SQL with the modern fence against an existing embedding: same results as
the unfenced call, as expected while the layer is empty.

### Fences (code)

`server/lib/corpus-fence.js` now has three layers: counselor (concordance and
modern), modern (Dispatch, World, Journal, Academy seminar, Socratic
Proctor), none (research). Call sites changed in this addendum:

| file | surface | fence |
| --- | --- | --- |
| `server/index.js` (`retrieveAcademyChunks`, `retrieveCorpusChunks`) | Academy seminar | modern |
| `server/retrieval.js` | Socratic Proctor, Courtyard, exam proctor. Moved from the deprecated `match_academy_chunks` to `match_rag_corpus`, similarity floor applied after the call. | modern |
| `server/journal-analysis-agent.js` | Journal grounding passages | modern |
| `server/dispatch-generation-agent.js` | Daily Dispatch grounding | modern |
| `server/world-agent.js` | World observations (reach Dispatch) | modern |
| `server/index.js` reader shelf | `modern_summary` off the shelf; `modern_primary` stays as a readable work | n/a |

Web: the admin ingest route accepts `primary`, `scholarship`,
`modern_primary` (verbatim) and `paper_summary`, `modern_summary` (summary),
and no longer emits `public_domain` or `summary`; the Scribe quotes
`primary`, `scholarship`, `modern_primary` and paraphrases the rest;
references format `modern_summary` like a paper summary and `modern_primary`
as a modern work (year parsed from `section_label` when present); the
library labels scholarship and modern works. `tsc --noEmit` passes.

Acceptance test: `scripts/eval/modern-fence-check.js` (needs the three env
keys). Checks 1, 2 and 4 are enforceable today; check 3 reports "layer not
present" until modern rows exist.

### Deployment caveat

The `rag_corpus_text_type_check` constraint is live now. Until this branch
deploys, the currently deployed admin ingest route still writes
`public_domain` for verbatim ingests and `summary` for default summaries, and
those inserts will fail loudly with a constraint error. Deploy before the
next admin ingest, or expect that error.

### Housekeeping

`academy/corpus-ingestion/stoic_physics_concordance.md` (added to `main`
today, byte-identical to the synced copy) was removed in favour of
`academy/corpus-ingestion/concordance/stoic_physics_concordance.md`, the
file the nightly sync reads. `CLAUDE.md` points there now.
