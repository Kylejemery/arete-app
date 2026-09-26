# Public domain ingestion (Long 2002, ch. 2 further reading): proposal

Date: 2026-09-26. Branch `claude/arete-public-domain-ingestion-dixemk`.

**Status: stopped for approval. Nothing is applied, fetched, or ingested.**

The spec says that if the schema has no fields for its required metadata, the
migration is proposed and work stops until Kyle approves it. The schema has no
such fields, so this document is that proposal. It follows the pattern of
`MODERN_LAYER_PROPOSAL.md`: the SQL below is not in `supabase/migrations/`
yet, because a committed file with no applied migration beside it is exactly
the drift that `repo.migration_drift` reports. On approval, the SQL is copied
into a timestamped migration, applied with the migration tool, and checked by
query, all in one session.

Section 7 lists the decisions I need from you.

---

## 1. What is there now

Checked against the live project (`zhaarabzemhantyxxckq`) and the repo on
2026-09-26.

**Write path.** Everything goes into `rag_corpus` through
`academy/corpus-ingestion/ingest-sources.js` (it embeds with
`text-embedding-3-small` and upserts on `author,work,program_id,chunk_index`)
or through the nightly `corpus-agent.js`, which drains `corpus_ingestion_queue`
**straight into `rag_corpus`**. Nothing is staged. `source_text_chunks` is the
dead table, so nothing gets written there.

**Read path.** The corpus MCP server is `server/routes/corpus-mcp.js`
(`search_corpus` and `list_authors`). It calls `match_rag_corpus` with
`filter_language: 'english'` and prints author, work, `section_label`, and
the chunk text. It shows no translator, no locator, and no licensing.

**`rag_corpus` columns that already cover the spec's metadata:**

| Spec field | Existing column | Notes |
| --- | --- | --- |
| `layer` | `text_type` | The layer field, locked by `rag_corpus_text_type_check`. CLAUDE.md says a new layer is a migration plus a fence entry, never an ad hoc value. |
| `author`, `work` | `author`, `work` | |
| `citation` | `locator` (+ `section_label`) | `locator` is the canonical division (ACQUISITION_PLAN Part 5, rule 3). The spoken form is generated from it in code (§5). |
| `language` | `language` | Check constraint allows only `english`, `ancient_greek`, `latin`. |
| `translator` | `translator` | `original` for untranslated text (Part 5, rule 1). |
| `publication_year` | `edition_year` | Same meaning. The rule and the audit probes already use this column. |
| `source_url` | `source_url` | |
| Parallel English and original | `paired_chunk_id` | FK to `rag_corpus(id)`, commented "for bilingual pairs". Never used yet (0 rows). |
| Note linked to a passage | `parent_chunks uuid[]` | Currently used only by syntheses. |
| Superseded | `deprecated` | |

**Missing:** `license_status`, `license_evidence`, `quotable_on_air`, an
edition *name* (as opposed to the year), `retrieved_at`, `raw_sha256`,
`ocr_quality`, printed page, `cited_by`, a `german` language value, a staging
area, and any table for citation records with no text.

**What the corpus already holds from this reading list:**

| Spec item | Already in `rag_corpus` | Consequence |
| --- | --- | --- |
| Epictetus, *Discourses* | George Long, 1877. 339 live rows with locators (`1.1` … `4.9–4.10`), `source_url` null. | Long counts as acceptable under the spec, so no review flag is needed. Oldfather is added alongside it. |
| DL, *Lives* Book 7 (Hicks 1925) | **Already ingested.** 87 live rows from Wikisource, locators `7.x–7.y`. 7.121 is in the chunk `7.121–7.123`. | Do not re-ingest. Backfill the new licensing columns on these rows instead (§6). |
| DL, *Lives* Book 6 | Yonge 1853 only, with the false `book.life` locators. | Hicks Book 6 is new. Should Yonge Book 6 then be deprecated, as Yonge Book 7 was? (§7) |
| Cicero, *Academica* (Yonge) | **Already ingested.** 109 live rows from Gutenberg #29247, `edition_year` 1875 (that volume is the 1875 printing of Yonge's 1853 translation). No locators. | Same translation, so no second copy. What it needs is locators, which means re-chunking and deprecating the current rows (§7). |
| Gellius, *Attic Nights* | 4 rows, 19.1 only. The text says Rolfe 1927, but `translator` and `source_url` are null. | Rolfe goes in whole. The 4 rows are superseded and deprecated once the full work is promoted. |
| Plutarch, *De auditu*, *De liberis educandis* | Only the Goodwin-era Morals volumes, with no translator recorded. | Babbitt is a new translation alongside them. |
| Bonhöffer, Halbauer, Schenkl | Nothing. | New. |

---

## 2. Layer mapping

The spec's three layers map onto the existing `text_type` vocabulary. **No new
`text_type` value and no `layer` column.** A second layer field alongside
`text_type` would let the two disagree, and the fences key on `text_type`.

| Spec layer | Material | `text_type` | `language` | `quotable_on_air` |
| --- | --- | --- | --- | --- |
| canon | Tier 1 English translations | `primary` | `english` | **true** |
| canon | Tier 1 Greek/Latin originals (Loeb facing pages, LacusCurtius Latin) | `primary` | `ancient_greek` / `latin` | **true** |
| canon | Translators' notes (Babbitt, Oldfather, Rolfe, Hicks) | `scholarship` | `english` | false |
| reference | Bonhöffer 1890 | `scholarship` | `german` (new) | false |
| reference | Halbauer 1911 | `scholarship` | `latin` | false |
| reference | Schenkl 1916, Latin introduction and apparatus | `scholarship` | `latin` | false |
| reference → canon? | Schenkl 1916, Greek text | `primary` | `ancient_greek` | false (the spec limits true to Tier 1). See §7. |
| bibliography | Tier 3 citation records | not in `rag_corpus` | n/a | n/a |

Fence consequences, checked against `server/lib/corpus-fence.js`:

- `primary` and `scholarship` are visible on every fence, which is correct for
  Tier 1.
- The Tier 2 German and Latin rows are also `scholarship`, but every retrieval
  call defaults to `filter_language: 'english'`, so no counselor, Dispatch, or
  MCP path can reach them. They are reachable only by an explicit language
  filter, which is the right place for Kyle's translation work. **No fence
  change is needed.**
- Tier 3 records have no text and no embedding, so they cannot be retrieved at
  all.

The *Scribe* treats `primary` and `scholarship` as quotable already
(`QUOTABLE_TYPES` in `academy/web/src/lib/scribe/chat.ts`). `quotable_on_air`
is a separate and narrower gate for the Examiner. The Scribe's rule is left
unchanged.

---

## 3. Proposed migration (not applied)

```sql
-- supabase/migrations/<ts>_public_domain_provenance_and_staging.sql
--
-- Licensing and provenance on rag_corpus, a staging area in front of it, and
-- a citation-only bibliography. Existing rows are untouched except that they
-- read quotable_on_air = false until a later, reviewed backfill says
-- otherwise: a passage is quotable on air only when someone has shown it may
-- be.

-- 1. rag_corpus: provenance and licensing -------------------------------

alter table public.rag_corpus
  add column if not exists license_status   text,
  add column if not exists license_evidence text,
  add column if not exists quotable_on_air  boolean not null default false,
  add column if not exists edition          text,          -- e.g. 'Loeb Classical Library 197 (Moralia I)'
  add column if not exists retrieved_at     timestamptz,
  add column if not exists raw_sha256       text,
  add column if not exists ocr_quality      text,
  add column if not exists printed_pages    text,          -- e.g. '201' or '201–203'; never in chunk_text
  add column if not exists cited_by         text[];

comment on column public.rag_corpus.license_status is
  'public_domain_us: first published in the US in 1930 or earlier, or anywhere before 1931 (translation, not composition). open_license: confirmed, not assumed. NULL: legacy row, status not recorded.';
comment on column public.rag_corpus.license_evidence is
  'The source''s own public domain or license statement, verbatim, where it has one; otherwise the reasoning (edition and year).';
comment on column public.rag_corpus.quotable_on_air is
  'The Examiner may quote this passage verbatim on air. True only for public-domain primary texts (translations and originals).';

alter table public.rag_corpus
  add constraint rag_corpus_license_status_check
    check (license_status is null or license_status in ('public_domain_us', 'open_license')),
  add constraint rag_corpus_ocr_quality_check
    check (ocr_quality is null or ocr_quality in ('good', 'fair', 'poor')),
  add constraint rag_corpus_quotable_requires_pd_primary_check
    check (not quotable_on_air
           or (license_status = 'public_domain_us' and text_type = 'primary'));

alter table public.rag_corpus drop constraint rag_corpus_language_normalized_check;
alter table public.rag_corpus add constraint rag_corpus_language_normalized_check
  check (language in ('english', 'ancient_greek', 'latin', 'german'));

-- 2. Staging: one row per source, then one row per chunk ------------------
-- The source row is also the skip log: a source whose status cannot be
-- confirmed is recorded with status 'skipped' and the reason, never fetched
-- further.

create table public.corpus_staging_sources (
  slug              text primary key,        -- 'plutarch-de-auditu-babbitt-1927'; matches data/raw/<slug>/
  batch             text not null,           -- 'long2002-ch2'
  tier              smallint not null check (tier in (1, 2)),
  author            text not null,
  work              text not null,
  language          text not null check (language in ('english','ancient_greek','latin','german')),
  translator        text not null,           -- 'original' for untranslated text
  edition           text,
  edition_year      integer not null,
  text_type         text not null check (text_type in ('primary','scholarship')),
  license_status    text not null,           -- 'public_domain_us', or the reason it was excluded
  license_evidence  text,
  quotable_on_air   boolean not null default false,
  source_url        text not null,
  retrieved_at      timestamptz,
  raw_sha256        text,
  ocr_quality       text check (ocr_quality is null or ocr_quality in ('good','fair','poor')),
  ocr_garble_rate   numeric(5,4),            -- share of sampled words garbled
  cited_by          text[] not null default array['Long 2002, ch. 2 further reading'],
  status            text not null default 'staged'
                      check (status in ('skipped','staged','approved','rejected','promoted')),
  skip_reason       text,
  cleaning_notes    text,
  review_notes      text,
  reviewed_at       timestamptz,
  promoted_at       timestamptz,
  created_at        timestamptz not null default now(),
  check (status <> 'skipped' or skip_reason is not null),
  check (not quotable_on_air or (license_status = 'public_domain_us' and text_type = 'primary' and tier = 1))
);

create table public.corpus_staging_chunks (
  id                uuid primary key default gen_random_uuid(),
  source_slug       text not null references public.corpus_staging_sources(slug),
  chunk_index       integer not null,
  locator           text,                    -- '3.22.1–3.22.8', '37C–38A', '1.26.1–1.26.4'
  section_label     text,
  chunk_text        text not null,           -- NFC, no page markers, no footnote markers
  word_count        integer not null,
  printed_pages     text,
  kind              text not null default 'body' check (kind in ('body','note')),
  parallel_locator  text,                    -- links English and original; resolved to paired_chunk_id at promotion
  annotates_locator text,                    -- a note's passage; resolved to parent_chunks at promotion
  promoted_rag_corpus_id uuid references public.rag_corpus(id),
  created_at        timestamptz not null default now(),
  unique (source_slug, chunk_index)
);

alter table public.corpus_staging_sources enable row level security;
alter table public.corpus_staging_chunks  enable row level security;
-- No policies: service role only, like corpus_ingestion_queue.

-- 3. Bibliography: citation records with no text --------------------------

create table public.corpus_bibliography (
  id            uuid primary key default gen_random_uuid(),
  author        text not null,               -- 'Brunt, P. A.'
  year          text not null,               -- text: '1948–1965', '1982a'
  title         text,                        -- blank rather than guessed
  container     text,                        -- publisher, or journal with volume
  pages_cited   text,                        -- pages Long cites
  why_cited     text,                        -- one line
  cited_by      text not null,               -- 'Long 2002, ch. 2 further reading'
  staging_slug  text references public.corpus_staging_sources(slug), -- Tier 2 overlap (Bonhöffer, Halbauer, Schenkl)
  notes         text,
  created_at    timestamptz not null default now(),
  unique (author, year, cited_by)
);
alter table public.corpus_bibliography enable row level security;
```

Why these choices:

- **`quotable_on_air` is `not null default false`.** Adding the column to
  15,847 rows is metadata-only on Postgres 17 and takes no rewrite. Legacy
  rows (for example Long's *Discourses*, which is public domain) read false
  until a reviewed backfill sets them, so a missing record can never make a
  passage quotable. The constraint makes it impossible to mark a summary,
  synthesis, or unlicensed row quotable.
- **Excluded sources never enter `rag_corpus`.** That is why the
  `rag_corpus.license_status` check allows only the two admissible values. The
  exclusion reason lives on the staging source row, and the staging source
  table is the "skipped and why" log the spec asks for.
- **A separate staging table instead of reusing `corpus_ingestion_queue`.**
  The nightly agent turns any `pending` queue row into live `rag_corpus` rows
  with embeddings. The canon is meant to be written only after approval, so
  staging is kept where no scheduled job reads it.
- **`corpus_bibliography` instead of `scribe_sources`.** `scribe_sources` is
  the Scribe's uploaded-paper store (with `file_path` and `ingest_report`).
  Adding reading-list stubs there would put phantom papers in the Scribe's
  source list. The Coverage Gap Agent reads the new table.
- **No change to `match_rag_corpus`.** Its return columns are tuned for the
  HNSW routing of 2026-09-20/21, and changing them means `DROP` plus `CREATE`
  and a new round of `EXPLAIN (ANALYZE, BUFFERS)`. The MCP server fetches
  the extra fields in a second query by id instead (§5).

---

## 4. Pipeline (built after approval)

New folder `academy/corpus-ingestion/pd-ingest/`. It reuses `embedder.js`
and nothing parallel to it.

1. **`fetch.js`.** Fetches each URL once into `data/raw/<slug>/`, with a
   `manifest.json` of url, retrieved_at, and sha256. A re-run reads the cache
   and never hits the source again. It sets a descriptive user agent, reads and
   obeys `robots.txt` first, waits at least 4 seconds between requests to
   penelope.uchicago.edu, and keeps an allowlist of hosts (LacusCurtius,
   archive.org, Wikisource, Perseus, Gutenberg), so JSTOR and publisher hosts
   cannot be reached by mistake.
2. **Parsers, one per site.**
   - `lacuscurtius.js`: strips Thayer's navigation, reads the page markers
     (`p201`) into `printed_pages`, reads section anchors into `locator`, moves
     footnotes into `kind = 'note'` rows with `annotates_locator`, and copies
     the page's own public domain statement verbatim into `license_evidence`.
   - `wikisource.js`: DL Book 6.
   - `ia-ocr.js`: Internet Archive `_djvu.txt` for the Tier 2 books. It
     samples 500 words per document to estimate the garble rate, and above 5%
     sets `ocr_quality = 'poor'`.
3. **`chunk-citation.js`.** Chunks by citation, never across a section:
   Epictetus by section, grouped to about 150 to 450 words at argument
   boundaries. Plutarch by Moralia page and letter. Gellius by book and chapter,
   split by paragraph when long. DL and Cicero by book and section. Tier 2 by
   printed page. All text is NFC-normalized.
4. **`stage.js`.** Writes `corpus_staging_sources` and `corpus_staging_chunks`,
   and nothing else.
5. **`report.js`.** Writes `docs/corpus/staging/long2002-ch2.md`. For each
   source: word count, chunk count, three random chunks in full, cleaning
   problems, license evidence, OCR estimate, and the admission-test record.
6. **`promote.js --slug <slug>`.** Refuses anything not in `approved` status.
   It checks that the write target is `rag_corpus` (the same table
   `match_rag_corpus` reads), inserts the rows, embeds them with `embedder.js`,
   resolves `paired_chunk_id` and `parent_chunks`, deprecates what the source
   supersedes, registers the work against the question map, and marks the
   source `promoted`.

`data/raw/` raw HTML and text are committed, because the container is ephemeral
and "never hit the source again" otherwise fails on the next session. PDFs are
gitignored and only their sha256 is kept in the manifest.

---

## 5. MCP exposure (the only retrieval change)

In `server/routes/corpus-mcp.js`, after `match_rag_corpus` returns, one query
`select id, locator, translator, edition_year, quotable_on_air from rag_corpus
where id in (...)` adds the new fields to each result. Each result then
prints:

```
[1] Diogenes Laërtius — Lives of Eminent Philosophers, Book VII, 7.121–7.123 (tr. R.D. Hicks, 1925)
    quotable_on_air: true
    spoken: "Diogenes Laertius, Lives of the Eminent Philosophers, book seven, section one hundred twenty one"
```

The spoken citation comes from a small `server/lib/spoken-citation.js`
(author + work + locator, with numbers written out in words and Moralia pages
read as "page thirty seven, letter C"). It is generated, not stored, so a
locator fix corrects it everywhere.

---

## 6. Per-source plan and admission tests

Admission tests (ACQUISITION_PLAN Part 4): 1 provenance, 2 argues,
3 question-map cell, 4 needed, 5 chunks well, 6 legal form, 7 leaks,
8 durable. All of these pass tests 1, 6 (pre-1931 translation, verbatim) and
8 (philosophy). The table records the rest.

| Source | Where | Questions (role) | Tests 2–5, 7 | Plan |
| --- | --- | --- | --- | --- |
| Plutarch, *De auditu* (Babbitt 1927, Moralia I, 37C–48D) | LacusCurtius | Q14 (defends: philosophy as formation of the hearer) | Argues; fills an empty *defends* cell for Q14 beyond Hadot summaries; chunks well by page and letter | Stage English. Also stage Greek if LacusCurtius carries it (to be checked when fetched). |
| [Plutarch], *De liberis educandis* (Babbitt 1927, 1A–14C) | LacusCurtius | Q14 (states) | Asserts more than argues; test 4 is weak | Stage. Its authenticity is doubted, Babbitt's own introduction says so, so the author label needs a decision (§7). |
| Epictetus, *Discourses* (Oldfather 1925 vols. 1–2, 1928) | Loeb scans on archive.org. No clean Oldfather transcription is known to me; checked when fetched | Q04, Q07, Q14, Q15 (defends) | Test 4: the corpus already holds Long's full *Discourses*, so this adds a second rendering, which is useful for technical vocabulary but doubles Epictetus retrieval mass | Priority chapters first (3.22, 3.23, 3.21, 2.26, 1.1), then the rest. The Greek comes from the facing pages if the OCR is usable; otherwise use Schenkl (below) as the original. |
| Gellius, *Attic Nights* (Rolfe 1927, 3 vols.) | LacusCurtius (Latin + English) | 1.26: Q05 (states: Taurus on anger); 19.1: Q05 (states: propatheiai) | Doxographical and anecdotal; chunks well by chapter | Whole work if clean, otherwise 1.26 plus the Stoic chapters. Deprecate the 4 existing 19.1 rows when the full work is promoted. |
| DL, *Lives* Book 6 (Hicks 1925, vol. 2) | Wikisource | Q14 (states: the Cynic life), Q09 (defends: no externals) | The corpus has nothing on the Cynics with section numbers | Stage. Book 7 is not re-ingested. Its 87 rows get the licensing backfill instead: license `public_domain_us`, `quotable_on_air` true, `cited_by`. |
| Cicero, *Academica* (Yonge 1853) | Gutenberg #29247 (already the source of the live rows) | Q03 (states both sides) | Already held | Re-chunk with `book.section` locators, then deprecate the current 109 rows, if you agree. The Latin comes from The Latin Library or Perseus. Rackham 1933 is excluded. |
| Bonhöffer, *Epictet und die Stoa* (1890) | archive.org | Q04, Q07, Q15 (states) | Test 5 is poor (argument spans chapters); German is invisible to English retrieval | Stage with `ocr_quality`. Promotion is your call. Test one page first to see whether it is Fraktur. |
| Halbauer, *De diatribis Epicteti* (1911) | archive.org (not yet confirmed a scan exists) | Q14 (states: diatribe form) | Same | Stage if a scan exists; otherwise log it as skipped. |
| Schenkl, *Epicteti Dissertationes* (Teubner 1916, editio maior) | archive.org scan. Perseus's Greek Epictetus is, I believe, Schenkl's text, to be verified when fetched, and would be clean Unicode instead of OCR | Canon source for translation | Greek chunked by section, Latin introduction by page | Greek and Latin kept separate. |

Tier 3: one `corpus_bibliography` row per listed work (30 entries, with
Halbauer, Bonhöffer, and Schenkl linked to their staging rows). I will fill
author, year, and container only where I can confirm them, and leave title,
pages cited, and the one-line note blank for you to supply from the book.
Long's page references are not something I can reconstruct without the text.

---

## 7. Decisions needed from you

1. **Approve the migration in §3** as written, or with changes.
2. **Work labels for a second translation.** The unique key is
   `(author, work, program_id, chunk_index)`, so Oldfather cannot share
   `work = 'Discourses'` with Long, and the Greek cannot share it with either.
   I propose following the DL Book VII precedent: `Discourses (tr. Oldfather)`
   and `Discourses (Greek, Schenkl 1916)`. The alternative is to widen the key
   to include `translator` and `language`, which also changes three upsert
   call sites.
3. **Schenkl's Greek:** `primary` and `quotable_on_air` false (my reading of
   the spec), or quotable, since the Greek is a primary text?
4. ***De liberis educandis* author:** `Plutarch` with a spuriousness note, or
   `Pseudo-Plutarch`?
5. **Cicero *Academica*:** re-chunk the existing Yonge text with locators and
   deprecate the current rows, or leave it as is?
6. **DL Book 6:** deprecate Yonge's Book 6 once Hicks is promoted, as was done
   for Book 7?
7. **Backfill** `license_status` / `quotable_on_air` / `cited_by` on the
   existing Hicks Book 7 rows, which the "short cut to virtue" acceptance test
   depends on.

## 8. Blocker unrelated to approval

This session's network policy denies all six hosts the plan uses:
`penelope.uchicago.edu`, `archive.org`, `en.wikisource.org`,
`www.perseus.tufts.edu`, `www.gutenberg.org` and `www.thelatinlibrary.com`
(the proxy refuses the CONNECT). Fetching cannot start from this
environment until they are allowed.
