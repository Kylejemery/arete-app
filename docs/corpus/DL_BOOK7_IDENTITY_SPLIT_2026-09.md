# Diogenes Laertius Book VII identity split, run record

Date: 2026-09-17. Branch `claude/arete-garden-exhibit-system-9zyr9t`.
Supabase project `zhaarabzemhantyxxckq`.
Migration `supabase/migrations/20260917175536_dl_book7_identity_split.sql`.

**Status: applied through the Supabase migration tool and verified by query.**

## What was wrong

The corpus held Diogenes Laertius under two work strings:

| work | translator | chunks | ingested |
| --- | --- | --- | --- |
| `Lives Book7` | R.D. Hicks, 1925 | 87 | 2026-07-17 |
| `Lives of Eminent Philosophers` | C.D. Yonge, 1853 | 544 live + 16 deprecated | 2026-09-15 |

Both are `Diogenes Laërtius`, so this was never an author collision and
`corpus.identity_collisions` could not have found it. It is the other half of
the same failure: `Lives Book7` is a filename fragment wearing a work name.

Underneath the naming sat the substantive problem. Yonge's 544 chunks are the
complete *Lives*, all ten books — so **Book VII is in the corpus twice**, in
two translations.

### The decision had already been made, and was undone by accident

`academy/web/src/scripts/ingest-dl7.ts`, which performed the Hicks ingest,
says so in its own header:

> Replace the Yonge Diogenes Laertius Book VII rows with the Hicks
> translation (Loeb 1925, public domain, via Wikisource), which carries the
> canonical section numbering — so citations like "DL 7.87" machine-verify.
>
> Background: the previous text (Yonge, Gutenberg) has no section numbers
> (its [N] brackets are footnote markers), so DL locators could never be
> adjudicated.

That was July. On 2026-09-15 the complete Yonge went in for Books 1–6 and
8–10 — the Cynics and Epicurus, the highest-value ingest on the acquisition
list — and Book VII came along with it, silently restoring what July had
removed.

`ACQUISITION_PLAN.md` Part 3 had anticipated precisely this:

> Note that it is Yonge's translation and you already hold Hicks for Book 7,
> so decide deliberately whether to hold both renderings of Book 7 or to
> exclude Yonge's Book 7 at ingest. Holding both is defensible and arguably
> useful, since translator divergence on technical terms is itself
> philosophically informative, **but it must be a decision rather than an
> accident.**

It was an accident. The plan named the trap and the ingest walked into it.

### Yonge's Book VII locators are false, not merely absent

This is what settles the choice. Yonge's Book VII carries `7.x` locators that
look canonical and are not. They are `book.life` ordinals:

| locator | what it actually denotes | chunks |
| --- | --- | --- |
| `7.1` | Life of Zeno, the whole of it | 77 |
| `7.2` | Life of Ariston | 2 |
| `7.3` | Life of Herillus | 1 |
| `7.4` | Life of Dionysius | 1 |
| `7.5` | Life of Cleanthes | 6 |
| `7.6` | Life of Chrysippus | 10 |

So every doctrinal passage Hicks numbers 7.39 through 7.160 — the definition
of the impression, the criterion of truth, the five indemonstrables, the
division of goods — sits in a chunk claiming to be **DL 7.1**, which is the
sentence about Zeno's parentage.

A missing locator makes a passage uncitable. A wrong one makes it *falsely*
citable, and nothing downstream can tell the difference. Part 5 rule 3 asks
for a locator that lets a passage be cited without going back to the source;
these actively defeat it. That is why this is a correction rather than a
preference between two good translations.

## What the migration does

1. **Renames** `Lives Book7` to `Lives of Eminent Philosophers, Book VII` — a
   sibling of the complete work rather than a stray identity beside it. The
   two cannot share one work string: `(author, work, program_id, chunk_index)`
   is unique and both ingests number from 0.
2. **Deprecates** Yonge's Book VII, chunks 281–377, 97 rows. Per CLAUDE.md
   they are deprecated and not deleted, and they keep their work, their
   chunk_index and their own accurate provenance.
3. **Repairs the question map.** All four Yonge registrations claimed Book 7
   material Yonge no longer supplies; each now describes only what Yonge still
   holds, and the Book 7 claim moves to Hicks. The Hicks ingest had *no*
   registrations at all, which Part 5 rule 4 requires of every work — it now
   has five, including **Q03**, where the corpus has almost nothing from a
   primary text and Book VII is the fullest ancient statement of the Stoic
   criterion.

### Boundaries

Read from the chunk text. The seams are clean; no chunk needed adjudicating by
majority, which the Cicero split did need.

| chunk | text |
| --- | --- |
| 280 | closes Book VI: "…and now we must pass on to the Stoics, of which sect the founder was Zeno, who had been a disciple of Crates." |
| 281 | opens Book VII: "Zeno was the son of Mnaseas, or Demeas…" |
| 377 | ends Book VII, inside the Chrysippus catalogue |
| 378 | opens Book VIII: "Since we have now gone through the Ionian philosophy, which was derived from Thales…" |

### Safety properties

- **Nothing referenced the deprecated rows.** 0 rows in `concept_passage_map`,
  0 in `retrieval_log`. The Hicks rows that supersede them carry 2 concept
  references and 3 logged retrievals.
- **No sequence gap opens.** Deprecated rows keep indices 281–377, so
  `corpus.sequence_gaps` — which looks for an index with no row at any
  deprecation state — sees an unbroken range.
- **No re-embedding.** Embeddings are of raw `chunk_text` with no metadata
  prefix (`academy/corpus-ingestion/embedder.js`), so a work rename invalidates
  no vector.
- **Row ids untouched**, so `retrieval_log` history still resolves.
- **Guarded both ends.** The migration aborts unless the pre-state is exactly
  87/97/0/0 and the post-state exactly 87/0/447/113, with five Book VII
  registrations, live Book VII provenance intact, and no live row anywhere
  still carrying a `7.N` book.life locator.

### Verified post-state

```
Lives of Eminent Philosophers            Yonge 1853  447 live, 113 deprecated
Lives of Eminent Philosophers, Book VII  Hicks 1925   87 live
Lives Book7                                            0 rows
```

## Code that keyed on the old identity

A rename orphans anything holding the old string. Three places did, all
updated in the same commit:

- `server/library.js` — the `WORK_TITLES` display override and the `ERAS` key
  `Diogenes Laërtius|Lives Book7`. Left alone, the shelf would have lost both
  its title and its era.
- `server/data/significance-map.json` — the tier-2 entry, whose own note says
  "Author/work names aligned to corpus".
- `academy/web/src/scripts/ingest-dl7.ts` — the `WORK` constant, so a re-run
  cannot recreate the identity this migration removed.

`library_overrides` holds no row for either work, so there is no shelf orphan.

## Copyright

Both translations are public domain under the standing rule: Hicks 1925 and
Yonge 1853 are each well before 1931. Nothing here turns on copyright; the
deprecated rows stay in the table.

## Not done, deliberately

**Yonge's other nine books have the same false locators.** The `book.life`
scheme is not confined to Book VII — it runs through the whole ingest, and
Book 10 is the worst case in the corpus:

| book | chunks | distinct locators |
| --- | --- | --- |
| 3 (Plato) | 31 | 1 |
| 10 (Epicurus) | 71 | 1 |

All 71 chunks of Book 10 — the Letter to Menoeceus and the Principal
Doctrines among them — cite as `DL 10.1`. That is the same defect as Book
VII's and it is not fixed here, because the remedy is different: there is no
second translation to prefer, and Yonge is the corpus's only holding for
those books. It wants a parser over Yonge's own divisions, the same
outstanding work the Cicero record notes for the Bohn volume. Fixing it by
deprecation would remove the Epicurean position from the corpus entirely,
which is the opposite of what the acquisition plan is for.

**Yonge's Book VII rendering is still available where it is curated.** The
Impression exhibit quotes it deliberately as a second voice on the definition
of the impression, and that text lives in the exhibit's content file, not in
retrieval. Deprecation removes it from search, not from the Garden.
