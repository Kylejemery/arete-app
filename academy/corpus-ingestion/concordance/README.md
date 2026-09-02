# Concordances

Editorial apparatus that builds a lexical bridge between a technical term and
the English words that carry it in the translations held in `rag_corpus`.
The pre-1928 translations render *pneuma* as "spirit" or "vital breath" and
*phantasia kataleptike* as "the perceptive presentation", so vector search
cannot reach the doctrine by its own name. A concordance entry names the term,
states the doctrine, lists the renderings, and points at the primary passages.
Once embedded, a query about pneuma lands on the entry, and the entry's
vocabulary is what the ancient passages actually say.

Every `*.md` file in this directory is synced into `rag_corpus` by
`ingest-concordance.js`, which the nightly corpus agent runs at the start of
each pass. Edit a file, commit, and the next run re-embeds only the entries
whose text changed. Nothing here goes through the filename parser or the
400-word chunker.

## File format

```
---
author: Arete Concordance                        (default; may be omitted)
work: Stoic Physics and Epistemology Concordance (required; the rag_corpus work label)
difficulty: Advanced                             (default)
probe: does the Stoic cosmos have a mind         (repeatable; see below)
---

# Title shown to humans

Introductory prose. Not ingested.

## 1. Term

Entry body. One numbered `##` heading becomes exactly one chunk, embedded
whole, with `section_label` = the heading text without its number and
`chunk_index` = the number. Keep an entry under about 400 words; the sync
warns above 600 because a single embedding input should stay well inside the
model's window and a concordance entry that long is two entries.

## Note on anything

An unnumbered `##` section is apparatus for humans and is NOT ingested.
```

Rules that keep the sync safe to re-run:

- The entry number is the identity. Renumbering an entry re-embeds it under a
  new `chunk_index` and deprecates the old row, so append new entries with new
  numbers rather than renumbering.
- Removing an entry deprecates its row (`deprecated = true`); rows are never
  deleted. Restoring the entry un-deprecates it.
- Editing an entry's text re-embeds it. Editing only the heading (same number,
  same body) updates `section_label` without an embedding call.
- Every row carries `text_type = 'concordance'`. That value is what the
  counselor fence keys on (`server/lib/corpus-fence.js`): no counselor voice,
  Oracle, Cabinet, or reader margin note retrieves it. Synthesis, Inquiry,
  Tension, Dreaming, Dispatch, the Scribe, and the corpus MCP tools do.

## Probes

Each `probe:` line is a retrieval check the sync runs after embedding and
prints to the run log. A probe passes when the top five results for that
query contain at least one concordance entry and at least one non-concordance
passage; that is the whole point of the bridge, and the log says so plainly
when only one side comes back. Run them by hand with:

```
node ingest-concordance.js --probes
node ingest-concordance.js --verify "does the Stoic cosmos have a mind"
```

## Adding a concordance

Copy the front matter, choose a distinct `work` label, number the entries from
1, commit. The Coverage Gap Agent does not track concordances, and they never
appear on the reader shelf; they exist for retrieval only.
