# Themata Project: handoff for a new session

Read this whole file before doing anything. Then name the current milestone and work on that milestone only.

## What this project is

Chrysippean logic reduces every valid argument to the five indemonstrables using four meta rules, the themata. The sources preserve some of these rules clearly. The others have been reconstructed by modern scholars.

The research question:

**Which sets of rules, under which readings of the Stoic connectives, derive exactly the arguments the ancient sources call valid, and none of the ones they reject?**

Every outcome is worth reporting. One reconstruction may fit uniquely, several may fit (the evidence underdetermines the answer), or none may fit (the evidence, our reading of the connectives, or both need rethinking).

## Background the encoding must respect

The five indemonstrables, schematically:

1. If p, q; p; therefore q.
2. If p, q; not q; therefore not p.
3. Not (p and q); p; therefore not q.
4. Either p or q; p; therefore not q.
5. Either p or q; not p; therefore q.

Constraints that make Stoic logic unlike Lean's built in classical logic, which is why it is encoded as its own object language:

* **Disjunction is exclusive.** "Either p or q" means exactly one.
* **Redundant premises invalidate an argument.** The system is not monotonic. Weakening is never available as a rule.
* **The conditional is contested.** Philonian (material) and Chrysippean (connexion) readings are a parameter, not a decision.
* **Single premise arguments.** Chrysippus rejected them and Antipater accepted them. Also a parameter.
* **Redundancy has two readings** (the S011 and S016 conflict). This is a parameter too, not something to resolve.

## Where things stand

**Done**

* Evidence ledger, `evidence/suite.yaml`, as draft PR #281, with 38 cited passages verified as exact substrings of live corpus chunks.
* Stoic logic encoded in Lean 4, with candidate reconstructions and an evaluation harness.
* First results, all relative to the current encoding:
  * the rules are sound in a relevance semantics, where a repeated premise can count once but premises cannot be added freely
  * Origen's two conditionals argument forces the first thema, relative to the current candidates
  * the Sorites requires "not not p = p"

**Rulings already made in Phase 1**

* Read only SELECTs against the Supabase `rag_corpus` table meet the intent of the retrieved sources guardrail.
* The suite schema has a fourth verdict value, `valid_nonsyllogistic`.
* Keep the Sorites chain form. Remove the Nobody argument.
* S017 is dropped from the formal suite but kept in the ledger.
* Corpus fixes go in separate migration PRs. Never edit canon text.
* No Bobzien module until her 1996 paper is actually ingested.

**Known weaknesses**

* Only 18 formal items. Several rest on nineteenth century secondary quotation (Zeller) or on AI written summaries (Mates, Bobzien). These cannot count as evidence. Treat any result touching them as provisional until milestone 4.
* The corpus has only one primary source for Stoic logic (Diogenes Laertius VII), so it cannot yet tell rival reconstructions apart.
* Bobzien's reconstruction, the standard reference point, has not been engaged.
* No ledger entry is signed off. All are `verified_by_kyle: false`.

**Open items waiting on Kyle**

* Bobzien, "Stoic Syllogistic" (1996). Kyle is getting it.
* The Alexander passage for the T04 ruling.
* Sign off on every ledger entry.

## Milestones, in order

Work on the current milestone only. Do not start the next one until Kyle marks the current one done.

1. **Machine data export** [DONE 2026-09-29, marked by Kyle]. Delivered in PRs #307, #309 and #310. See the brief below.
2. **Machine page** [DONE 2026-09-29, marked by Kyle; delivered in #314] built and published. Kyle asked for it in this repo after all: the source is `themata/machine.html`, and it runs at `/playground/themata-machine` on the academy site, visible to the owner only until the specialist review (guardrail 5). A private copy is also on claude.ai. `node scripts/themata/sync-machine-page.mjs` carries the page and the export into `academy/web/`; rerun it after any new export.
3. **Sextus and Bobzien 1996 ingested** [CURRENT] into the corpus. Sextus means *Outlines of Pyrrhonism* II and *Against the Logicians*.
4. **Ledger rebuilt on primary texts.** Remove secondary summaries as evidence. Kyle signs off every entry.
5. **Bobzien's reconstruction encoded as a candidate.** Rerun the harness and report results against the existing candidates.
6. **Review package for a Stoic logic specialist.** Ledger, encoding choices, results, and open questions.

## Milestone 1 brief: machine data export (done)

Produce a static export of harness results so a public explorer page can display them. The page does no logic of its own. Every verdict it shows must come from a Lean run.

**Scope**

1. Run every formal item under every combination of the existing parameters. Use the parameter names and values exactly as they appear in the code.
2. For each argument found valid under a setting, also generate and run a variant with one redundant premise added, so the page can show validity being lost.
3. Record the result of each run. Never write a verdict by hand.

**Per run, record**

* item id, schematic form, and the natural language example from the ledger passage where one exists
* parameter settings
* verdict, using the harness's own categories, keeping "not found within depth N" (with N) strictly separate from "proven underivable"
* for derivable results, the reduction as ordered steps: premises, each thema or indemonstrable applied, each intermediate conclusion, final conclusion
* the ancient verdict from the ledger and whether the result matches it
* provenance: source, passage, `verified_by_kyle` status, and a flag on any item resting on a secondary summary

**Also include** the commit hash and encoding version, and a list of runs that errored or timed out.

**Deliverables**, on a new branch and separate draft PR: the export script, `data/machine/verdicts.json`, a JSON schema for it, and a short README on regenerating it and what each field means. Do not modify the encoding, the ledger, or the suite.

**Report back** the parameter axes and values, total runs, counts by verdict, every mismatch with the ancient verdict, flagged provenance items, and failed runs.

**As delivered** (PR #307 and its follow-up, 2026-09-29):

* **Location.** The export lives in `themata/results/explorer/`, not `data/machine/verdicts.json`. It is split into `index.json`, `harness.json`, `items.json`, `searches.json`, one `runs/cNN.json` per candidate, and `schema.json`. The README there explains how to regenerate it and what every field means.
* **Counts are distinct searches**, meaning candidate × proof setting (`single`, `contra`, `view`) × item: 14,256 in all. `runs/` keeps eight identical records per search, one for each conditional and redundancy reading. That invariance is checked on every build and recorded in the README.
* **Accepted exceptions to "do not modify the encoding or the suite":**
  * `Stoic/Harness/Search.lean`: `search` now records how it reached each argument (`searchTrace`). Outcomes are unchanged, and `matrix.md` and `matrix.csv` regenerate byte-identical.
  * `Stoic/Harness/Suite.lean`: `Item` gained a `note` field carrying the encoding notes for S014, S015 and S018. No argument changed.
* **Redundant variants:** both are in the export: a fresh atom (`redundant_variant`) and a duplicated last premise (`duplicate_variant`, added in a later PR stacked on #309). `Stoic/Harness/Export.lean` is the export's own code, not the encoding.

## Out of scope

Do not work on, propose, or analyze any of these unless Kyle asks in the current session:

* the Stoic fate consistency audit, fragment map, translation map, or Master Argument
* publication venues, paper strategy, or publishability
* new candidate reconstructions beyond Bobzien's
* refactoring the encoding unless the current milestone requires it

## Tangents

If you notice something interesting outside the current milestone, add one short entry to `PARKING.md` (what it is, why it might matter, which file) and return to the milestone. Do not investigate it.

## Every session

**Start:** read this file and name the current milestone.

**End:** stop at the milestone's deliverable, report what was done and what failed, and add a dated line to the log.

## Guardrails

1. Every ledger entry cites a passage actually retrieved from the Arete corpus. No citations from model recall.
2. Every encoded reconstruction comes from a retrieved text, with its source recorded.
3. Kyle signs off every ledger entry before it enters the suite.
4. "Not found within depth N" is never reported as "proven underivable."
5. No public claims before a Stoic logic specialist reviews the ledger and the formalization.

## Tool notes

The corpus MCP server's `search_corpus` tool does not return chunk ids, so it cannot fill the `corpus_ref` field. For any citation work, use read only SELECTs against the `rag_corpus` Supabase table.

## First task for this session

1. Add this file to the repo root as `SCOPE.md`.
2. Add a line to `CLAUDE.md` telling every session to read `SCOPE.md` first.
3. Create an empty `PARKING.md`.
4. Commit those three changes on their own, separate from any other work.
5. Check whether the milestone 1 export already exists on a branch. If it does, report its status. If not, begin milestone 1.

## Log


* 2026-09-29: Setup done (SCOPE.md, PARKING.md, CLAUDE.md pointer). Milestone 1: no export found on any branch or PR; the export is being produced outside this session, so none was built here.
* 2026-09-29 (later): Milestone 1. The export arrived as PR #307 in `themata/results/explorer/`. Reviewed it and reproduced it byte for byte with Lean 4.22.0. Follow-up PR: commit hash and encoding version, an explicit empty failed-runs list, a JSON schema for every file, a `non_primary` flag (adds S011 and S014), `searches.json` with 14,256 distinct searches and the invariance check, and counts reported as distinct searches. Not done: the duplicated-premise variant.
* 2026-09-29 (later still): Milestone 1. Added the duplicated-premise variant (a copy of the last premise, placed last) beside the fresh atom, in a new PR stacked on #309. Of 8,384 derived searches, the duplicate variant stays derived under `set` in 3,038 of 3,038. Under `list` and `multiset` it stays derived in 28 each (S012 under a merging cut) and is lost elsewhere, but only 32 of those losses per view are proven (the no-themata control). The rest are not found within depth 8. Earlier results are unchanged.
* 2026-09-29: Kyle marked milestone 1 done. Milestone 2, the machine page, is now current. It happens outside the repo.
* 2026-09-29: Milestone 2. Built the Themata Machine page from the export and put it on the academy site at `/playground/themata-machine`, left out of `RELEASED_PLAYGROUND` so everyone but the owner gets a 404, data files included. The sync script copies the export's verdict files byte for byte and keeps only the reductions from `runs/` (5.4 MB instead of 45 MB). Not marked done: that is Kyle's call.
* 2026-09-29: Kyle marked milestone 2 done. Milestone 3 (Sextus and Bobzien 1996 into the corpus) is now current.
* 2026-09-29: Outside the milestone, at Kyle's request: Musonius Rufus in the corpus. The eulogikon Greek is relabelled `ancient_greek` (55 rows). Lutz's English Lectures I–XXI are staged, not promoted: no OpenAI key in the session, and the 1947 license is unverified. See `docs/corpus/ADMISSIONS_2026-09-29_MUSONIUS_LUTZ.md`. Milestone 3 is unchanged.
* 2026-09-29: Milestone 3. Two texts stored in `research_sources` (private, not in `rag_corpus`, not in git). Bobzien 1996, "Stoic Syllogistic": `licensed_copy`, hash and passage check verified, uncertain readings recorded in the notes. Mates' translation of *Outlines of Pyrrhonism* I–III: cleaned by script from a course-site PDF with no page images, change list in the text header, only PH II.134–204 proofread; held as `unconfirmed` until checked against a copy Kyle owns. The Bobzien corpus summary got `source_url` and `edition_year` (PR #320). Not done: *Against the Logicians*. Bury's 1935 Loeb scan is on Drive, but it is over the connector's 10 MB limit and the proxy blocks direct downloads. Nothing is in `rag_corpus` yet. Not marked done: that is Kyle's call.
* 2026-09-29 (later): Milestone 3. Bury's *Against the Logicians* (M VII–VIII, Loeb 1935) stored in `research_sources` as `unconfirmed`, by Kyle's decision. Source is the Digital Library of India scan on archive.org. English pages only, from the scan's OCR, cleaned by script with a logged change list. 15 key pages of M VIII were proofread against the page images: 221–239, 278–287, 331a–337a, 430–433, 439–443 and 463–467. The scan lost 12 English pages, 7 of them in M VIII, including 468–471; the header lists them. Not in `rag_corpus`, not in git. Not marked done: that is Kyle's call.
* 2026-09-30: Outside the milestone, at Kyle's request. Lutz's Musonius *Lectures* promoted to `rag_corpus` (85 rows, retrievable). `test-retrieval.js` now calls `match_rag_corpus` (#324). The parallel Cabinet now reserves up to two primary passages for an author the question names, because commentary that names an author outranks the author's own text in an unfiltered search. Four tangents parked. Milestone 3 is unchanged.
