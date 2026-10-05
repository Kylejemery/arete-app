# Synthesis documents

AI-assisted summaries written for teaching: what the corpus says on a subject,
gathered and checked by Arete, reviewed by Kyle. They go into `rag_corpus` as
the synthesis layer so the teaching surfaces can use them, and they are kept
out of evidence so nothing downstream mistakes them for a source.

A synthesis document is never a primary text and never published scholarship.
Everything below follows from that.

## Where the fields live

The synthesis layer already existed (`text_type = 'synthesis'`, used by the
Synthesis agent's own documents). These documents use it rather than adding a
second layer field, because `text_type` is the one field every fence keys on
(`docs/corpus/PUBLIC_DOMAIN_INGESTION_PROPOSAL.md` §2).

| Field | Where it lives |
| --- | --- |
| `layer` | `rag_corpus.text_type = 'synthesis'` |
| `source_type` | `rag_corpus.source_type = 'synthesis'` |
| `author` | `Arete (AI-assisted)`, on each chunk and on the document row |
| `title` | `rag_corpus.work`, and the document row |
| `version`, `created_at`, `generated_with`, `reviewed_by`, `sources_used`, `regenerate_when`, `active` | `corpus_synthesis_documents`, one row per version |
| section heading | `rag_corpus.section_label`, as a path: `Courage > Modern examples to strive for` |
| `verification_status` | `rag_corpus.verification_status` (`text[]`; a section can be both `interpretive` and `unverified`) |

`translator` is `original`, `source_url` points at the committed file, and
`edition_year` is the year written, so the Part 5 write-path fields are all
filled.

## Verification status

Every chunk carries its section's status:

- `corpus_verified`: written from and checked against corpus passages.
- `via_summary`: checked against the corpus, but the corpus source is itself a
  summary of a book or paper, not the text.
- `unverified`: written from general knowledge, not checked against a corpus text.
- `interpretive`: application or guidance, such as modern verdicts, not a
  report of what sources say.

## Retrieval

Two profiles, enforced in the query, not in prompts
(`server/lib/corpus-fence.js`):

| Profile | Synthesis | Used by |
| --- | --- | --- |
| research | excluded (`researchRetrievalParams()`; `RESEARCH_EXCLUDED_TEXT_TYPES` in the academy) | Themata ledger and harness, the gap finder, the Scribe and composer grounding and the stoic drafter (`match_rag_corpus_cited`), the agents that write new derived material (Synthesis, Inquiry, Tension, Dreaming, Convergence), any evidence or citation work |
| teaching | included, labelled | Socratic Proctor, Cabinet counselors, Scrolls, the Moltbook agent |

The label is part of the chunk. Every chunk's `chunk_text` opens with a header
naming the layer, the document and version, the section, and its
verification status, with an instruction to cite the source the passage names
rather than the summary. `unverified` and `interpretive` chunks also say they
must not be presented as what an ancient author said. So any surface that
shows a model the chunk shows it the label. The embedding is computed from the
section alone.

The corpus MCP server (`server/routes/corpus-mcp.js`) takes a `layers`
parameter, `canon`, `scholarship`, `apparatus`, `synthesis`, that defaults to
canon only. A caller opts in to synthesis per call or per connection
(`?layers=canon,scholarship,apparatus,synthesis`, which is what the Moltbook
agent sets). SQL work on the ledger reads with `text_type <> 'synthesis'`.

## File format

One file per version: `<doc_key>.v<N>.md`.

```
---
doc_key: stoic-logic-summary               kebab-case; the same across versions
title: Stoic Logic: A Summary
version: 1
created_at: 2026-09-29                     the date written
generated_with: Claude, Claude Docs (claude.ai)
reviewed_by:                               Kyle, once he has signed off
default_status: corpus_verified            for any section not listed below
section_status:
  - The conditional debate => via_summary
  - Feats to aim for > Feats of the body => interpretive, unverified
sources_used:                              Author | Work, as rag_corpus names them
  - Diogenes Laërtius | Lives of Eminent Philosophers, Book VII
regenerate_when:
  - Sextus Empiricus
---

# Title

Introduction ...

## Section
### Subsection
```

A status set on a heading applies to everything under it unless a deeper
heading sets its own. The text before the first `##` is the `Introduction`.
Each heading becomes one chunk; a section over 450 words is split at paragraph
or table-row boundaries into parts with the same heading. A `section_status`
line that names a heading the document does not have is an error.

### review_by

An optional `review_by: YYYY-MM-DD` in the front matter is stored on the
document row (`corpus_synthesis_documents.review_by`), and every
`interpretive` chunk's header gains a line telling the model that the
application to the present may be out of date after that date. Documents
without it are unchanged.

## Documents the Synthesis Agent drafts

The agent's Stoic Life mode (`server/SYNTHESIS_AGENT.md`) writes drafts in
this format into `synthesis_drafts`, where Kyle reviews them at
`/admin/synthesis/stoic-life`. Approved drafts come into this directory
through the export, with `reviewed_by: Kyle` set:

```
node export-synthesis-drafts.js --dry-run    what would be written
node export-synthesis-drafts.js              mark loaded drafts ingested, then write
                                             approved drafts here and add their rows below
```

Commit the files and this README, open a PR, and the nightly sync loads them
after merge. The export parses each file with the same parser the sync uses
and refuses a doc_key and version that is already loaded.

## Versions

A loaded version is a record and is not edited. To change a document, add
`<doc_key>.v<N+1>.md`; the sync registers it, makes it active, and
deprecates the previous version's chunks in one transaction
(`activate_synthesis_version`). Nothing is deleted, and inactive versions are
outside both profiles because every `match_rag_corpus*` function filters
`deprecated = false`. The sync refuses a file whose content changed after its
version was loaded.

When a work in `regenerate_when` enters the corpus, the document is due for a
new version.

## Running it

```
node ingest-synthesis.js --dry-run           chunks and statuses, touches nothing
node ingest-synthesis.js                     register, activate, embed
node ingest-synthesis.js --verify "phrase"   research vs teaching results
node ingest-synthesis.js --emit-sql          the same writes as SQL, without embeddings
```

The nightly corpus agent runs the sync after the concordance sync, so a new
file lands the night after it is merged, and chunks written without an
embedding (as the first three were, by migration) are embedded then. A chunk
with no embedding cannot be retrieved by any `match_rag_corpus*` function.

## Documents

| File | Chunks | Status |
| --- | --- | --- |
| `stoic-logic-summary.v1.md` | 23 | 15 corpus_verified, 8 via_summary |
| `fate-providence-up-to-us.v1.md` | 15 | 11 corpus_verified, 4 via_summary |
| `virtues-of-socrates.v4.md` (live) | 71 | 43 corpus_verified, 22 interpretive, 5 unverified, 1 interpretive + unverified |
| `virtues-of-socrates.v3.md` (inactive, kept for history) | 71 | 43 corpus_verified, 22 interpretive, 5 unverified, 1 interpretive + unverified |
| `virtues-of-socrates.v2.md` (inactive, kept for history) | 71 | 43 corpus_verified, 22 interpretive, 5 unverified, 1 interpretive + unverified |
| `virtues-of-socrates.v1.md` (inactive, kept for history) | 66 | 40 corpus_verified, 20 interpretive, 5 unverified, 1 interpretive + unverified |
| `stoic-life-practical-wisdom-telling-the-good-from-the-indifferent.v2.md` (live) | 8 | 5 corpus_verified, 3 interpretive |
| `stoic-life-practical-wisdom-telling-the-good-from-the-indifferent.v1.md` (inactive, kept for history) | 8 | 5 corpus_verified, 3 interpretive |

Converted from Kyle's Claude Docs exports (PDF) on 2026-09-29; the Virtues
document is the updated export of that afternoon, with Diet, Small habits, and
Rules for living. Running headers, page footers, and the byline were dropped;
tables split across pages were rejoined; bullets lost at page breaks and rows
that landed under the wrong heading were restored against the PDF layout. A
word-level comparison with each PDF shows nothing else missing.

Virtues version 2 is Kyle's final export of the same day. It adds a "How to
read this document" section (corpus_verified) and Seneca's On a Happy Life and
Diogenes Laërtius Book VII to `sources_used`, and it revises text throughout.
It was converted and checked the same way. Loading it made version 2 active
and deprecated version 1's 66 chunks, which stay in `rag_corpus` for history.

Virtues version 3 (2026-09-30) checks the Musonius Rufus rules against Cora
Lutz's translation, which is now in the corpus (85 chunks, cited by lecture).
Every citation matched its lecture; five sentences were corrected to what
Lutz says: farming and flocks (XI), the wife's-standard test, which Lutz
applies to a master and his slave (XII), sandals rather than shoes (XIX),
furnishings rather than every possession (XX), and the meat passage, which
falls in gaps in our copy of Lutz rather than on a missing page. Loaded
through the pipeline's own sync (`node ingest-synthesis.js --file
virtues-of-socrates.v3.md`), which registered it, activated it, and embedded
its chunks.

Virtues version 4 (2026-09-30) corrects one sentence of version 3. The lines
of Lutz's Lecture XVIIIA that our OCR had lost were filled from the scan's
page images (`docs/corpus/ADMISSIONS_2026-09-29_MUSONIUS_LUTZ.md`), and they
hold the meat passage, so "his remarks on meat fall in gaps in our copy" was
no longer true. The Eating animals row now says what Lutz prints: meat a less
civilized food, fitter for wild animals, heavy and an obstacle to thinking.
The same claim check found every other Musonius rule citing VIII, XI, XVI or
XVIIIA still true of the filled text.

## Tests

- `node --test ingest-synthesis.test.js`: parsing, chunking, and the statuses above.
- `cd ../../server && node --test tests/corpus-layers.test.js`: the profiles and the MCP `layers` parameter.
- `retrieval-fence.test.sql`: the same exclusion lists run against the live
  `match_rag_corpus`, with a version 2 activated, all inside a transaction that
  rolls itself back. Run it with any SQL client; it reports by raising.
