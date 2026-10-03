# Admission: Plutarch, *Life of Cato the Younger*, Perrin 1919, 2026-10-03

Kyle asked for Plutarch's *Cato the Younger* (Cato Minor) in Bernadotte
Perrin's Loeb translation (*Plutarch's Lives*, vol. VIII, 1919) to be **staged
only**. It is not promoted: nothing is written to `rag_corpus` or to
`corpus_question_registrations` until Kyle approves it. Source slug
`plutarch-cato-minor-perrin-1919`, batch `plutarch-cato-minor-2026-10`
(`pd-ingest/sources.js`, parser `pd-ingest/parsers/perseus-tei.js`). The review
report is `docs/corpus/staging/plutarch-cato-minor-2026-10.md`.

| Step | State |
| --- | --- |
| Text read and parsed | Done: 73 chapters, 318 sections, 25,457 words. Every word of the TEI body is in the staged chunks, in order (checked word by word) |
| Staged | `corpus_staging_sources` status `staged`, 103 body chunks and 77 note chunks in `corpus_staging_chunks`. The database rows match the local build (fingerprint `58e45708…`) |
| Promoted into `rag_corpus` | **No.** Kyle decides at review |

## The source, and why it is not LacusCurtius or perseus.tufts.edu

The brief named LacusCurtius (penelope.uchicago.edu) or Perseus
(perseus.tufts.edu). The session's egress proxy refused both hosts
(`connect_rejected`), and also scaife.perseus.org. GitHub could be reached,
so the text comes from the Perseus Digital Library's own source repository,
**PerseusDL/canonical-greekLit**:

- file `data/tlg0007/tlg050/tlg0007.tlg050.perseus-eng2.xml`
  (`urn:cts:greekLit:tlg0007.tlg050.perseus-eng2`)
- pinned at commit `bcc5df0602f3b3fe6fefe1e1d575602a25ab1db6` (2026-09-22)
- sha256 `92f47222c81ca8ce751477240c600d4375248768b213c20483ddd453ec4b8231`,
  205,794 bytes, committed under `data/raw/plutarch-cato-minor-perrin-1919/`
  with a manifest

The perseus.tufts.edu and Scaife readers render this same TEI. Its header names
the source: Plutarch, *Plutarch's Lives*, tr. Bernadotte Perrin, vol. 8,
Loeb Classical Library, Harvard University Press / William Heinemann, 1919
(archive.org `plutarchslives08plut`). The chapter and section numbers are
Perrin's. **It is not LacusCurtius, and the user should confirm it is
acceptable as "Perseus".** The Dryden/Clough translation was not used.

`source_url` is the pinned GitHub file URL. All the chunks come from that one
file, so every chunk's exact source is that URL. The staging table holds
`source_url` once, on the source row, and promotion copies it to every row.

`fetch.js` was not used, because its allowlist has no GitHub host. The file
reaches the pipeline through `localFiles`, as the extracted PDFs of the
scholarship batch do. `raw_sha256` is the sha256 of the raw file, as for every
other source.

## License

Perrin's translation was published in 1919, before 1931, so it is public domain
in the United States: `license_status = 'public_domain_us'`, and
`quotable_on_air = true`, the convention for public-domain primary texts
(Hicks's DL VII is the same). The TEI header licenses Perseus's encoding under
CC BY-SA 4.0. That license cannot restrict a public-domain text, but the
`license_evidence` says so and credits Perseus.

## Extraction

The parser keeps one section per `<div subtype="section">`, cited
`<chapter>.<section>`, with the chapter as the parent that no chunk crosses.

- **Notes.** Perrin's footnotes sit inline as `<note>` in the TEI. They are
  taken out of the body and staged as 77 `note` chunks, each linked to its
  passage (`annotates_locator`), as the pipeline does for LacusCurtius notes.
  On promotion they become author `Bernadotte Perrin`, work
  `Notes to Life of Cato the Younger`, `scholarship`, and never quotable.
- **One artifact removed.** At 58.7 the TEI reads "camps,72" followed by an
  empty `<note/>`. The "72" is not Perrin's wording. It is the remnant of a
  footnote call whose text the digitisation lost. The "72" and the empty note
  are dropped. This is listed in `parse.fixes`, which refuses the source if
  the fix stops matching. It has **not** been checked against the printed
  page: archive.org could not be reached either.
- **Quotation marks.** The TEI holds quotations as `<q>` markup and drops the
  printed marks. They are put back from the markup: “…” for a quotation, and
  ‘…’ for one inside another. Where a speech runs on into the next section
  (`rend="merge"`, seven places), the earlier part is left open, as printed
  speech is across a paragraph break. This is the only place where the staged
  text has characters the TEI does not, and it follows the TEI's own markup
  rather than guessing.
- **Verse** (73.2, the lampoons) is joined line to line with " / ". Block
  quotations stay inline in their paragraph.
- No page numbers are in the TEI, so `printed_pages` is null.

## Chunking

The pipeline's chunker is used as it stands (`chunk.js`: whole sections up to
about 350 words, never across a chapter, and a tail under 60 words joins the
chunk before it). The result:

- A chapter that fits is one chunk, cited `Plut. Cat. Min. 5`, with
  `section_label` `Chapter 5`. There are 43 of these.
- A longer chapter is split at section boundaries, cited `Plut. Cat. Min. 9.1–3`,
  with `section_label` `Chapter 9, sections 1–3`. These are the other 60
  chunks, two each from 30 chapters.
- Chunks run from 62 to 400 words. Chapter 52 (400 words) and chapter 17
  (372) stay whole because the tail rule joins their short final sections.

`build.js` now passes the parsed sections to a source's `locatorOf` and to a
new `sectionLabelOf` hook, so that a chunk holding a whole chapter can be told
apart from one holding part of it.

**Locator form: a decision for Kyle.** The brief asked for `Plut. Cat. Min. 5.3`.
Every other locator in `rag_corpus` is bare (`7.3–7.5`, `1–4`,
`VIII, p. 65`), with author and work in their own columns. The staged rows
follow the brief. Making them bare (`5`, `9.1–3`) is a one-line change to
`catoLocator` in `sources.js` followed by a restage, and it would have to be
done before promotion.

## The episodes the brief named

The brief placed three episodes in chapters 5, 9 and 56. In Perrin's numbering:

- **Training in heat and cold** is at **5.3**, in chunk `Plut. Cat. Min. 5`:
  "accustoming himself to endure both heat and snow with uncovered head".
- **Walking while his friends rode** is told **twice**. The first time is
  **5.3**, in the same sentence group: "Those of his friends who went abroad
  with him used horses, and Cato would often join each of them in turn and
  converse with him, although he walked and they rode". The second is
  **9.3**, on the Macedonian tribunate: "These rode on horses, while he
  himself always went a-foot". Chapter 9 is split, and this is in
  `Plut. Cat. Min. 9.1–3`.
- **The desert march** is at **56.3–4**, in chunk `Plut. Cat. Min. 56`:
  "Though the march lasted for seven days consecutively, Cato led at the head
  of his force, without using either horse or beast of burden."

## The eight tests (Part 4)

1. **Provenance.** Passes. Plutarch, tr. Bernadotte Perrin, Loeb Classical
   Library, Harvard / Heinemann, 1919. The standard English of the period,
   with canonical chapter and section numbers.
2. **Argues.** Passes, as a primary source. A Life is narrative, not a
   treatise, but Plutarch judges as he narrates. He weighs Cato's refusal of
   Pompey's marriage alliance and finds it "wholly wrong" by its results
   (30.6). He answers the critics of Cato's grief (11.3). He sets Cicero's
   objection to Cato's refusal to court the people against Cato's reply
   (50.2–3). On his last night Cato argues the Stoic paradox against a
   Peripatetic (67.1–2). The text raises objections to its subject and does
   something with them.
3. **Cell.** Q10 *complicates*: the Stoic in politics, and the cost of his
   inflexibility (30.6, 49–50). Q13 *complicates*: Rome's candidate for the
   sage, shown with his excess (11.2). Q14 *states*: philosophy as a way of
   life in public office (4.1, 5.3, 9.3, 10, 67–68). Q05 *complicates*: the
   grief for Caepio, defended as tenderness rather than passion (11.2–3). The
   full position texts are in `sources.js` and are written to
   `corpus_question_registrations` only at promotion (Part 5, rule 4).
4. **Need.** Passes. The corpus holds no Plutarch *Lives* at all. Its Plutarch
   is Moralia, much of it the Goodwin essays with no translator or locator.
   Cato is the Stoics' own exemplar. Seneca returns to him again and again,
   and 97 live Seneca chunks mention Cato, with no primary account of the
   life it praises. The Life also fills *complicates* roles on Q10 and Q13,
   which the map's Part 2 table shows as thinly held.
5. **Chunks.** Good. The Life is episodic and each chapter is mostly one
   scene, so a chapter or half-chapter stands alone. The political chapters
   (26–35, 41–54) are thick with names and need context, which lowers their
   counselor value but not their accuracy.
6. **Legal form.** Public domain, a 1919 translation, verbatim.
   `public_domain_us`.
7. **Leak.** Two commitments need a fence decision before promotion. (a)
   **Suicide.** Chapters 66–70 narrate Cato's suicide admiringly and in
   detail: the sword, the reading of the *Phaedo*, the wound torn open (70).
   The Life holds this as noble Roman and Stoic exit. A counselor or Dispatch
   that retrieves these chunks must not voice them as guidance. They are
   quotable on air under the current convention. Kyle should decide whether
   chapters 66–70 stay `quotable_on_air = true`. (b) **Roman aristocratic
   republicanism**: liberty means the senate's liberty, and slaves are
   property, freed or kept at their owners' word (60–62). Hold this as Cato's frame, not as agreement.
8. **Ten years.** Not empirical. No `review_by`.

## Rows written

- `corpus_staging_sources`: one row, `plutarch-cato-minor-perrin-1919`,
  status `staged`.
- `corpus_staging_chunks`: 180 rows, chunk_index 0–102 for the body and
  103–179 for the notes, all created 2026-10-03 13:59:45 UTC.
- Nothing else. `rag_corpus` was 17,939 rows before and after. No existing
  staging row was touched (1,113 chunks and 6 sources before, 1,293 and 7
  after).

## To promote (after review)

```
-- after reading this record and the review report:
update corpus_staging_sources set status = 'approved', reviewed_at = now() where slug = 'plutarch-cato-minor-perrin-1919';
```
```
cd academy/corpus-ingestion
node pd-ingest/promote.js --slug plutarch-cato-minor-perrin-1919
```

`promote.js` reads exactly these two staging tables (`corpus_staging_sources`
by slug, then `corpus_staging_chunks` by `source_slug`). It embeds with
`text-embedding-3-small` through `embedder.js` and writes `rag_corpus`, which
is the table `match_rag_corpus` reads. It writes the four question-map rows
and probes retrievability. The run needs `OPENAI_API_KEY`.

## Log

- 2026-10-03: Staged from the Perseus TEI (LacusCurtius and perseus.tufts.edu
  unreachable). 103 body chunks and 77 notes. Not promoted.
