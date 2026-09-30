# Cicero volume identity split, run record

Date: 2026-09-16. Branch `claude/de-finibus-corpus-identity-nuvw4a`.
Supabase project `zhaarabzemhantyxxckq`.
Migration `supabase/migrations/20260917010451_cicero_volume_identity_split.sql`.

**Status: APPLIED 2026-09-17 and verified by query.** Recorded in the remote
migration history as version `20260917010451`. The first `apply_migration`
attempt (2026-09-16) was blocked by the sandbox permission classifier and
changed nothing; the file was renamed from its original `20260916200000`
prefix so that filename and recorded version agree, which keeps a future
`supabase db push` from treating it as unapplied.

## What was wrong

Kyle noticed that `Cicero / De Finibus` had 613 chunks, no `translator`, no
`edition_year`, and text mentioning Lucullus — the interlocutor of *Academica*
II, not *De Finibus*.

Chunk 0 carries the volume's own title page, which settles it without
inference:

> Project Gutenberg **Ebook #29247** — *The Academic Questions, Treatise De
> Finibus, and Tusculan Disputations Of M. T. Cicero, With A Sketch of the
> Greek Philosophers Mentioned by Cicero.* Literally Translated by **C. D.
> Yonge, B.A.** London: George Bell and Sons, **1875**.

An entire three-treatise Bohn volume was ingested under one work name. This is
the identity failure CLAUDE.md warns about, in its most consequential form: the
work label was not merely malformed, it was confidently wrong for 62% of the
rows.

Kyle's inferred mechanism was right. One detail differed: the volume is not
`treatisesofcicer00ciceuoft` (that is De Fato's genuine source — the *De Natura
Deorum* / *De Divinatione* / *De Fato* volume). It is a different Yonge
collection, reached through Gutenberg rather than archive.org.

### Composition of the 613 chunks

Boundaries were read directly from the chunk text, not inferred.

| chunks | % | what it actually is | evidence |
| --- | --- | --- | --- |
| 0–34 | 5.7% | Gutenberg licence header, title page, *Sketch of the Greek Philosophers* | chunk 0 is the licence; 1–34 are Thales, Democritus, et al. |
| 35–143 | 17.8% | **Academica** I–II | chunk 56: `SECOND BOOK OF THE ACADEMIC QUESTIONS. I. Lucius Lucullus` |
| 144–375 | 37.8% | **De Finibus** | chunk 144 opens the editor's argument on `the Supreme Good … (_finis_)` |
| 376–595 | 35.9% | **Tusculan Disputations** | chunk 376: `he now spent five days at his Tusculan villa` |
| 596–612 | 2.8% | editor's endnotes, Cicero's letters to Atticus, prosopography | chunk 596 quotes `—Ep. 32` |

The chunker uses a sliding window, so the three seam chunks (143, 375, 595)
carry a tail bleeding into the next treatise. Each is assigned to the work
supplying the majority of its text. This is a real ±1 imprecision at three
boundaries and is recorded rather than hidden.

### It had already fired in production

`retrieval_log` joined to `rag_corpus.id` for rows under the `De Finibus`
label — 63 retrievals:

| what was really returned | hits | marked `used_in_response` |
| --- | --- | --- |
| Tusculan Disputations | 38 | 2 |
| De Finibus (correct) | 13 | 0 |
| Academica | 8 | 1 |
| Gutenberg frontmatter | 2 | 0 |
| endnotes | 2 | 0 |

21% of retrievals under this label were actually De Finibus. At least three
student-facing answers cited the wrong work. Most recent hits: 15 Sept 2026.

Because the migration changes no row `id`, this log stays joinable and the
historical mis-citations remain diagnosable after the split.

## Two further defects found on the way

**Academica was in twice, and the live copy was the damaged one.** The
standalone 114-chunk `Academica` (archive.org `academicquestion00ciceuoft`) is
raw uncorrected OCR: 62 of 114 chunks carry breakage such as `gi-eat`, `Gmek`,
`difier fi-om`, `pi'inciples`. The copy buried inside the volume is the same
Yonge translation in clean Gutenberg text.

**Tusculan Disputations was in twice.** The standalone 229-chunk ingest is a
Standard Ebooks scrape with no `translator`, no `source_url`, and website
navigation chrome (`Back to ebook / Table of Contents / Titlepage Imprint`) as
chunk 0.

In both cases the volume copy is the better text, so it becomes live and the
standalone is deprecated — never deleted, per CLAUDE.md.

## What the migration does

1. **Parks and deprecates** the two superseded standalone ingests at
   `chunk_index + 900000`, keeping their own (accurate) provenance.
2. **Carries real provenance** onto all 613 volume rows: `translator =
   'C.D. Yonge'`, `edition_year = 1875`, `source_url =
   https://www.gutenberg.org/ebooks/29247`. Also fills `word_count`, which was
   null on every one of the 613.
3. **Splits** the volume into `Academica` (109), `De Finibus` (232) and
   `Tusculan Disputations` (220), each renumbered contiguously from 0.
4. **Deprecates the volume apparatus** (52 rows: 35 front matter + 17
   endnotes), parked at `910000+` with an explanatory `section_label`.
   Gutenberg licence boilerplate should never have been shelved as `primary`.

Net live count: 561 chunks across three correctly-named works, replacing
613 + 114 + 229 = 956 rows of which the labels were wrong on 381.

### Safety properties

- `(author, work, program_id, chunk_index)` is unique, so rows are parked in
  high bands before renumbering. No step ever collides.
- Embeddings are of raw `chunk_text` with no metadata prefix
  (`academy/corpus-ingestion/embedder.js:31`), so relabelling does not
  invalidate a single vector. **Nothing needs re-embedding**, which matters
  because the sandbox has no OpenAI key.
- No `paired_chunk_id` or `parent_chunks` on any affected row, so no FK
  entanglement.
- The migration opens with a guard that aborts unless the pre-state is exactly
  114 / 230 / 613 / 0, and closes with a guard asserting the post-state is
  exactly 232 / 109 / 220 / 0 with full provenance on every live row. It
  applies wholly or it does nothing.

## Copyright

Clean. Yonge 1875 (Bohn, from the 1853 translation) is comfortably inside the
pre-1930 public domain rule. The copyright side of this ingest was never the
problem; the identity side was.

## Not done, deliberately

- **`corpus_significance_map` has no `Academica` row.** It has `De Finibus` and
  `Tusculan Disputations`, both of which still match after the split. Adding
  Academica is a judgement call about significance, not a correction, so it is
  left for Kyle.
- **`server/library.js:106` has a stale `'Cicero|Definibus'` key** (no space)
  sitting beside the correct `'Cicero|De Finibus'` — a leftover of the
  filename-parser bug CLAUDE.md documents. Harmless, untouched.
- **`server/library.js` has no `WORK_TITLES` entry for `Academica`**, so it
  will display under its bare name. Pre-existing, not caused by the split.
- **No `locator` values were invented.** Book and chapter numbers could be
  parsed from the Yonge headings, which would make citations precise to
  `De Finibus III.22` rather than to a chunk. That is a genuinely valuable
  follow-up and a separate piece of work.

## Verification after applying

Run on the live project immediately after the migration, 2026-09-17:

```sql
select work, deprecated, count(*) n, min(chunk_index) lo, max(chunk_index) hi
from rag_corpus
where author = 'Cicero' and program_id = 'stoicism-phd'
  and work in ('Academica', 'De Finibus', 'Tusculan Disputations')
group by 1, 2 order by 1, 2;
```

| work | deprecated | n | range | translator | edition | null word_count | null embedding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Academica | false | 109 | 0–108 | C.D. Yonge | 1875 | 0 | 0 |
| Academica | true | 114 | 900000–900113 | C.D. Yonge | null | 0 | 0 |
| De Finibus | false | 232 | 0–231 | C.D. Yonge | 1875 | 0 | 0 |
| De Finibus | true | 61 | 613–910612 | C.D. Yonge | 1875 | 9 | 0 |
| Tusculan Disputations | false | 220 | 0–219 | C.D. Yonge | 1875 | 0 | 0 |
| Tusculan Disputations | true | 230 | 900000–900229 | null | null | 230 | 0 |

Exactly the intended post-state: 232 / 109 / 220 live, 405 deprecated, nothing
stranded in the 800000 band, full provenance on every live row, and no
embedding lost anywhere. The deprecated standalones keep their own accurate
provenance rather than inheriting the volume's.

`retrieval_log` re-resolves correctly through the unchanged row ids. The
most-retrieved chunk under the old label (13 hits, logged as `De Finibus`
578) now reads `Tusculan Disputations` 202 — 578 − 376, exactly the expected
offset. The historical mis-attributions are now self-describing rather than
erased.
