# pd-ingest: public domain sources through staging

The path for verbatim public domain texts that carry licensing metadata and
must be reviewed before they reach the corpus. Built for the Long 2002, ch. 2
batch (`docs/corpus/PUBLIC_DOMAIN_INGESTION_PROPOSAL.md`). It writes to
`corpus_staging_sources` / `corpus_staging_chunks` and only `promote.js`
writes `rag_corpus`, one approved source at a time. It does not replace the
nightly agent, which stays the path for queued Gutenberg texts that need no
review gate.

```
fetch (once, cached)  →  parse  →  structure check  →  chunk by citation  →  staging
                                                                               │
                              review report  ←─────────────────────────────────┘
                                   │  Kyle sets status = 'approved'
                                   ▼
                     promote: embed → rag_corpus → pair → deprecate superseded
                              → question map → retrievability probe
```

## Commands

Run from `academy/corpus-ingestion/`, with `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and (for promotion) `OPENAI_API_KEY` in `.env`.

```
node pd-ingest/stage.js --inspect <slug>   # fetch and print the page's markers
node pd-ingest/stage.js --dry-run          # fetch, parse and chunk; write nothing
node pd-ingest/stage.js [--slug <slug>]    # stage (never writes rag_corpus)
node pd-ingest/stage.js --slug <slug> --sql <file>  # the same staging rows as SQL, to run
                                           # through the Supabase connector (no key)
node pd-ingest/report.js                   # docs/corpus/staging/long2002-ch2.md
node pd-ingest/promote.js --slug <slug>    # approved → rag_corpus
node pd-ingest/acceptance.js               # the spec's two retrieval tests
node --test pd-ingest/test/*.test.js       # offline tests
```

## Rules it enforces

- **Fetch once.** `data/raw/<slug>/` holds every fetched file and a
  `manifest.json` of url, time and sha256; a re-run reads the cache and
  checks the hash. HTML and text are committed so a fresh container does not
  refetch; PDFs are gitignored and kept by hash only.
- **Politeness.** Host allowlist (LacusCurtius, archive.org, Wikisource,
  Perseus, Gutenberg, The Latin Library; nothing behind a login), robots.txt
  obeyed, a descriptive user agent, four seconds between LacusCurtius
  requests.
- **Structure before rows.** A parse that recognises no citations, leaves
  more than 5% of the words before the first citation, repeats or disorders
  citations, averages too many words per citation, or does not name the
  expected translator is refused with its reasons and the page's markers.
  The fix is the parser configuration in `sources.js`, never an ingest to
  deprecate later.
- **Citation chunks.** Whole sections grouped to about 350 words, never split,
  never across a discourse, essay, chapter or life. Tier 2 is chunked by
  printed page with `locator` null.
- **Notes.** A translator's note leaves the body and is staged as its own
  chunk linked to the passage that calls it; promoted as author = translator,
  work "Notes to …", `scholarship`, never quotable, `parent_chunks` = passage.
- **Parallels.** An original is chunked to its translation's ranges and
  paired through `paired_chunk_id`. Originals carry a "(Latin)" / "(Greek)"
  work suffix because the unique key is (author, work, program, chunk_index).
- **Supersession.** The superseded rows are deprecated after the new rows are
  in, never before, and never deleted.
- **Poor OCR stays out.** A source with `ocr_quality = 'poor'` cannot be
  promoted until it is reviewed and its quality re-recorded.

## State of the batch (2026-09-28)

Nothing has been fetched: the session that wrote this had no route to any
source host. The parsers are therefore untested against real markup, and
their fixtures are synthetic. `stage.js` reports each source as one of:
ready (Plutarch ×2, DL Book VI), a citation pattern to read off the page with
`--inspect` first (Gellius), not located yet (the archive.org scans), or a
parser still to write (Oldfather's facing-page Loeb, the Academica
chapter-to-section aligner).

## Stoic scholarship batch (2026-09-28)

`stoic-scholarship-2026-09`: Jackson 1881, Hicks 1910, Davidson 1907 and
Bréhier 1910 (French), all Tier 2 scholarship from PDFs Kyle uploaded. This
container cannot reach archive.org, so `extract-pdf.py` wrote each PDF's
text layer to `data/raw/<slug>/`, which is committed; the PDF is kept by
hash in the manifest, and sources read it through `localFiles` rather than
`urls`. The scans open each page with a running head, so the ia-ocr parser
strips it (`stripRunningHeads`), takes the printed page from the leaf
number (`pageOffset`, checked against every legible head), and keeps chunks
inside a chapter (`chapterBreak`). Admission tests:
`docs/corpus/ADMISSIONS_2026-09-28_STOIC_SCHOLARSHIP.md`.

```
python3 pd-ingest/extract-pdf.py <slug> <pdf> <archive.org url>   # once per scan (pypdf)
node pd-ingest/stage.js --batch stoic-scholarship-2026-09
node pd-ingest/report.js --batch stoic-scholarship-2026-09
```

## Musonius Rufus, Lutz 1947 (2026-09-29)

`musonius-lectures-lutz-1947`: Lutz's English Lectures I–XXI from the
archive.org OCR of *Yale Classical Studies* 10, which prints Greek and English
on facing pages with no leaf breaks. `parsers/facing-ocr.js` keeps the English
pages (by running head, or by lecture heading on an opening page), drops
Lutz's notes, stray Greek lines and margin numbers, and cuts long paragraphs at
sentence ends. Every note continuation, gap in the scan and OCR fix it relies
on is listed in the source entry, and one that stops matching refuses the
source. A gap can carry a `fill`: words the OCR lost, read off the scan's page
image (`from` names it), which take the gap's place instead of "[…]". Since
2026-09-30 every Lutz gap is filled. A chunk over lines left unfilled carries
its own `ocr_quality` (`corpus_staging_chunks.ocr_quality`, which promotion
prefers to the source's). The license is `public_domain_no_renewal` (a 1947 US
publication; the renewal search of the 1974–76 catalogs found none), and it is
never quotable on air. Admission record:
`docs/corpus/ADMISSIONS_2026-09-29_MUSONIUS_LUTZ.md`.
