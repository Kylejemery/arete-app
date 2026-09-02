# Modern metaphysics layer: proposal

Date: 2026-09-02. Scoped during the corpus physics remediation (task 5) and
**implemented the same day on Kyle's approval**, on branch
`claude/corpus-physics-remediation-u8ahjz`. Sections 1 to 3 below are now the
record of what was built; the decisions marked "decide" in section 3 were
resolved as follows: the Journal agent, the Academy seminar retrievals, and the
Socratic Proctor carry the modern fence (apparatus allowed, modern layer
excluded); the Observatory passage draw does not, because its chronology axis
was designed to show modern scholarship as nearer stars. The acceptance test
in section 4 exists as `scripts/eval/modern-fence-check.js`. No modern
material has been ingested; the layer is empty and fenced.

## The plan being fenced

A layer of contemporary philosophy of mind: Russell, *The Analysis of Matter*
(1927); Eddington, *The Nature of the Physical World* (1928); James on the
mind-stuff theory in *Principles of Psychology* (1890), all public domain and
verbatim-ingestible; then hand-fed Mode 2 summaries of Chalmers, Strawson,
Goff, Shani, Tononi, and Hoffman.

This material must not reach the counselors or the Daily Dispatch. It is for
Synthesis, Tension, Inquiry, and the Scribe.

## Why the fence is built on `text_type`

- `author_chronology` does not exist (`EPISTEMIC_BOUNDARY_STATUS.md`), so
  there is no birth-year filter to lean on.
- `rag_corpus.source_type` is NULL on every row. The layered corpus
  architecture was specced and never populated, so it cannot fence anything.
- `text_type` is the only field every retrieval function returns and every
  ingestion path sets, and `match_rag_corpus` now takes an
  `exclude_text_types text[]` parameter that the counselor call sites pass
  through `server/lib/corpus-fence.js`. Adding a value to that one list
  fences every counselor path at once.

## 1. Normalising `text_type`

### Current state (live, after the identity remediation)

| value | live rows | deprecated rows | what it actually holds |
| --- | --- | --- | --- |
| `primary` | 11,372 | 621 | Ancient and early-modern texts (10,764 live) **and** public-domain secondary scholarship (608 live: E. Vernon Arnold 438, John C. Joy 87, St. George Stock 51, Eduard Zeller 21, Henry Steel Olcott 11; 621 deprecated: the malformed Arnold and Stock copies). |
| `paper_summary` | 261 | 0 | Mode 2 summaries of copyrighted scholarship (Bobzien, Mates, Inwood, Holiday, Postman …). |
| `synthesis` | 99 | 0 | Arete Synthesis documents, ingested after admin review. |
| `public_domain` | 55 | 0 | Plato, *Alcibiades*, written by the admin ingest route (`academy/web/src/app/api/corpus-ingest/ingest/route.ts:109`), which stamps every non-summary ingest `public_domain`. Before the remediation this value also held Vernon Arnold's 438 rows; it never tracked a real distinction. |
| `summary` | 1 | 0 | One stray John Sellars chunk from the same route's summary mode (the route accepts `'summary'` or `'paper_summary'` and defaults to `'summary'`). |
| `concordance` | 0 (13 on the next nightly run) | 0 | Editorial retrieval bridges (`academy/corpus-ingestion/concordance/`). |

`primary` vs `public_domain` splits the same kind of text by which script
ingested it. `primary` also hides 1911 scholarship among ancient sources, so
a counselor cannot tell Arnold from Epictetus and the three-per-author cap in
Synthesis treats a secondary source as a voice.

### Proposed value set

| value | meaning | quotable by the Scribe | counselors | Dispatch |
| --- | --- | --- | --- | --- |
| `primary` | The philosophers' own texts and their ancient doxographers, in translation or original language. Early-modern primary texts (Montaigne, Adam Smith) stay here: they are the author speaking. | yes | yes | yes |
| `scholarship` | Public-domain secondary scholarship, verbatim (Arnold 1911, Stock 1908, Zeller 1880, Joy, Olcott). | yes | yes | yes |
| `paper_summary` | Mode 2 summaries of copyrighted scholarship. | paraphrase only | yes (today's behaviour) | yes |
| `synthesis` | Arete Synthesis documents. | paraphrase only | yes (today's behaviour) | yes |
| `concordance` | Editorial retrieval bridges. | paraphrase only | **no** | yes |
| `modern_primary` | Verbatim public-domain modern philosophy of mind (Russell, Eddington, James). | yes | **no** | **no** |
| `modern_summary` | Mode 2 summaries of copyrighted modern philosophy of mind (Chalmers, Strawson, Goff, Shani, Tononi, Hoffman). | paraphrase only | **no** | **no** |

### Migration that would effect it (not applied)

```sql
-- supabase/migrations/<ts>_text_type_normalisation.sql

-- Secondary scholarship out of 'primary'. Deprecated duplicates follow so
-- the value is coherent even in the dead rows.                       -- 1,229 rows
update public.rag_corpus set text_type = 'scholarship'
 where text_type = 'primary' and (author, work) in (
   ('E. Vernon Arnold', 'Roman Stoicism'),                   -- 438 live
   ('Arnold', 'Roman'),                                      -- 561 deprecated
   ('St. George William Joseph Stock', 'A Guide to Stoicism'), -- 51 live
   ('Stock', 'Guide'),                                       -- 60 deprecated
   ('Eduard Zeller', 'The Stoics, Epicureans and Sceptics'), -- 21
   ('John C. Joy', 'The Emperor Marcus Aurelius - A study in ideals'), -- 87
   ('Henry Steel Olcott', 'The Life of Buddha and Its Lessons') -- 11
 );

update public.rag_corpus set text_type = 'primary'
 where text_type = 'public_domain';                          -- 55 rows

update public.rag_corpus set text_type = 'paper_summary'
 where text_type = 'summary';                                -- 1 row

-- The queue and the admin source-of-record table carry the same vocabulary.
alter table public.corpus_sources alter column text_type set default 'paper_summary';
update public.corpus_sources set text_type = 'paper_summary' where text_type = 'summary';
update public.corpus_sources set text_type = 'primary' where text_type = 'public_domain';

-- Lock the set so a fourth spelling fails at insert instead of vanishing
-- from every filter (same posture as rag_corpus_language_normalized_check).
alter table public.rag_corpus
  add constraint rag_corpus_text_type_check
  check (text_type in ('primary','scholarship','paper_summary','synthesis',
                       'concordance','modern_primary','modern_summary'));
alter table public.corpus_ingestion_queue
  add constraint corpus_ingestion_queue_text_type_check
  check (text_type in ('primary','scholarship','paper_summary','synthesis',
                       'concordance','modern_primary','modern_summary'));
```

Rows affected per value: `primary` loses 1,229 and gains 55 (net 10,819
live); `scholarship` gains 1,229 (608 live); `paper_summary` gains 1 (262);
`synthesis` unchanged (99); `public_domain` and `summary` end at 0.

Code that must change in the same commit, or the values drift back:

| file | line | change |
| --- | --- | --- |
| `academy/web/src/app/api/corpus-ingest/ingest/route.ts` | 93 to 95, 109 | Accept `primary`, `scholarship`, `paper_summary`, `modern_primary`, `modern_summary`; stop emitting `public_domain` and `summary`. |
| `academy/web/src/lib/corpus/ingest.ts` | 72 | `IngestMeta.text_type` comment and type. |
| `academy/web/src/lib/scribe/chat.ts` | 24 | `QUOTABLE_TYPES` = `primary`, `scholarship`, `modern_primary`. |
| `academy/web/src/lib/scribe/references.ts` | 57, 79 | Treat `modern_summary` like `paper_summary` (modern reference), `modern_primary` as a modern work with a real author and year, `scholarship` as classical-with-translator-null. |
| `server/library.js` | 25 | `tradition()` gains a `scholarship` shelf, or `scholarship` folds into `wider`. |
| `server/index.js` | 4344 | Shelf filter: `paper_summary`, `concordance`, `modern_summary` off the shelf; `modern_primary` is a readable public-domain work and may stay on a "modern" shelf, hidden by default via `library_overrides` until the reading rooms are ready for it. |
| `academy/web/src/app/library/page.tsx` | 31, 570 | `textType` union and the "Primary source" label. |
| `server/agents/consolidation-agent.js` | 316 | Synthesis cap counts by `source_type`; unaffected, but the per-author cap should exclude `scholarship` from counting as a voice. |
| `server/lib/corpus-fence.js` | 15 | Add `modern_primary`, `modern_summary` to `COUNSELOR_EXCLUDED_TEXT_TYPES`; add `DISPATCH_EXCLUDED_TEXT_TYPES = ['modern_primary','modern_summary']` and `dispatchRetrievalParams()`. |

## 2. One value or two for the modern layer

**Two: `modern_primary` and `modern_summary`.** One value cannot carry the
distinction the Scribe already depends on (`QUOTABLE_TYPES`: a verbatim
public-domain text may be quoted, a Mode 2 summary may only be paraphrased),
and the reference builder needs to know whether it is citing Russell 1927 or
a summary of Chalmers 1995. Reusing `paper_summary` for the summaries is not
an option: `paper_summary` reaches counselors today (Bobzien is quoted by the
Oracle) and the modern summaries must not. The fence lists both values; the
Scribe and the references treat them differently.

## 3. Every retrieval call site, with the required action

Counselor and Dispatch paths carry the exclusion. Research paths do not.
Line numbers are on branch `claude/corpus-physics-remediation-u8ahjz`.

### Fenced today via `server/lib/corpus-fence.js` (adding the values fences them)

| file | line | surface |
| --- | --- | --- |
| `server/index.js` | 1168 | Parallel Cabinet: one retrieval shared by every counselor. |
| `server/index.js` | 1293 | Single counselor: library passages. |
| `server/index.js` | 3536 | `getStoicContext`: the Oracle (`/oracle`), `/ask`, `/v1/chat/completions`, library "related texts" (4640), the library debate (4715), the reader margin note (4833). |
| `server/index.js` | 393 | Counselor source catalog (what a counselor may claim to hold). |
| `server/index.js` | 4344 | Reader shelf filter (not retrieval, but the same list of values). |

### Must gain the exclusion when the layer lands

| file | line | surface | how |
| --- | --- | --- | --- |
| `server/dispatch-generation-agent.js` | 153 | Daily Dispatch grounding passages via `match_rag_corpus_ids`. | `match_rag_corpus_ids` has no `text_type` parameter and returns no `text_type`. Either add `exclude_text_types text[] default '{}'` to `match_rag_corpus_ids` (same drop-and-create pattern as `20260902150200`) and pass `dispatchRetrievalParams()`, or switch Dispatch to `match_rag_corpus` with the exclusion. The RPC change is the durable one: every `_ids` caller gets the option. |
| `server/world-agent.js` | 213 | World Agent pairs weekly observations with passages; Dispatch section 3c-ii includes them. | Same as above. |
| `server/journal-analysis-agent.js` | 213 | Journal analysis grounding passages, shown to the user as citations. Not a counselor and not Dispatch, but it is a user-facing therapeutic surface. | Recommend the counselor exclusion; decide. |
| `server/index.js` | 2450, 2662 | Academy seminar retrieval (`retrieveAcademyChunks`, `retrieveCorpusChunks`): the professor persona in PHIL 701 to 707. | Recommend exclusion by default with a per-course allowlist later; a Stoicism seminar should not have Russell surface unasked. Decide. |
| `server/retrieval.js` | 56 | Socratic Proctor (`/api/examine/proctor`) via `match_academy_chunks`. | The five-argument `match_academy_chunks` returns no `text_type`, so the existing `filters.text_type` post-filter would drop every row if used. Add `exclude_text_types` to both overloads, or migrate the proctor to `match_rag_corpus` as `server/index.js:2645` already suggests. |
| `server/routes/observatory.js` | 572 | Public "touch a star" passage. Attributes author and work honestly. | Include modern material only if the Observatory is meant to show the modern layer as stars (its chronology axis was designed for exactly that). Decide. |

### Research surfaces: no exclusion, by design

| file | line | surface |
| --- | --- | --- |
| `server/synthesis-agent.js` | 237 | Synthesis. |
| `server/agents/tension-agent.js` | 154 | Tension. |
| `server/agents/inquiry-agent.js` | 343 | Inquiry. |
| `server/agents/dreaming-agent.js` | 216 | Dreaming. |
| `server/agents/convergence-agent.js` | 522 | Convergence. |
| `server/coverage-gap-agent.js` | 180 | Coverage Gap. |
| `academy/web/src/app/api/admin/gap-agent/run/route.ts` | 120 | Coverage Gap (admin run). |
| `academy/web/src/lib/scribe/pipeline/retrieve.ts` | 81 | Scribe claim support. |
| `academy/web/src/lib/scribe/chat.ts` | 166 | Scribe corpus search. |
| `server/agents/stoic-drafter.js` | 91 | Stoic reply drafter. Already restricted to a Stoic author allowlist, so modern material is excluded by author, not by type. Keep the allowlist. |
| `server/routes/corpus-mcp.js` | 82 | Corpus MCP tools for external clients. |
| `scripts/eval/pool-candidates.js` | 82 | Eval harness pooling. |
| `academy/corpus-ingestion/ingest-concordance.js` | 281 | Concordance probes (runs both views on purpose). |
| `academy/corpus-ingestion/retrieval.js` | 57 | Legacy local test script over `match_academy_chunks`. |

Direct `.from('rag_corpus')` reads (reader rooms, de-ingest routes, label
scripts, graph-boost expansion at `server/lib/graph-boost.js:76`) are keyed
by id or by author and work and do not search; the counselor call sites
already post-filter graph-boost expansion with `isCounselorVisible`.

## 4. Acceptance test

Named query: **"Is consciousness a fundamental feature of matter, or does it
emerge from physical organisation?"**

After Russell, Eddington, and James are ingested as `modern_primary` and at
least one Mode 2 summary as `modern_summary`:

1. Counselor path. Embed the query and call exactly what the Oracle calls:
   `match_rag_corpus(embedding, 7, null, 'english', COUNSELOR_EXCLUDED_TEXT_TYPES)`,
   then `expandCandidates(...).rows.filter(isCounselorVisible)`. Assert zero
   rows with `text_type in ('modern_primary','modern_summary','concordance')`.
   Repeat through the parallel Cabinet retrieval (`server/index.js:1168`)
   and through Dispatch's grounding call. All three must return zero modern
   rows.
2. Synthesis path. Call `match_rag_corpus_ids(embedding, 8, 'english')` with
   no exclusion and join `text_type` by id. Assert at least three rows with
   `text_type in ('modern_primary','modern_summary')`. The query's vocabulary
   is theirs; if fewer than three come back the layer is not embedded or not
   labelled.
3. Regression guard for the bridge. The concordance probe
   "does the Stoic cosmos have a mind" must still return at least one
   `concordance` row and at least one ancient passage on the Synthesis path
   (`node ingest-concordance.js --probes`), so the modern layer has not
   crowded the Stoic physics out of the top five.

Sketch, to live at `scripts/eval/modern-fence-check.js` and reuse
`verifyQuery` from `academy/corpus-ingestion/ingest-concordance.js`:

```js
const MODERN = new Set(['modern_primary', 'modern_summary']);
const { agent, counselor } = await verifyQuery(QUERY);          // k = 5 each
assert.equal(counselor.filter(r => MODERN.has(r.text_type)).length, 0);
const { data: ids } = await supabase.rpc('match_rag_corpus_ids', { query_embedding, match_count: 8 });
const types = await typesById(ids.map(r => r.id));
assert.ok(types.filter(t => MODERN.has(t)).length >= 3);
```

## Out of scope here, for the record

- No Chalmers, Goff, Hoffman, Strawson, Shani, or Tononi material is ingested.
- `source_type` stays NULL. If it is ever populated it should mean provenance
  (gutenberg, archive, admin_paste, consolidation_synthesis), never layer.
- Plutarch rows are untouched. Plutarch is 2,705 chunks (22 percent of the
  live corpus) and hostile to the Stoics on physics; the concordance's
  ekpyrosis entry says so. That is a weighting question for another day.
