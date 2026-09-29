# Admission: Musonius Rufus, Lutz's English lectures, 2026-09-29

Kyle asked for Cora E. Lutz's English translation of Musonius's lectures to be
added to the corpus, and for the Greek Musonius already held to be labelled as
Greek. Source slug `musonius-lectures-lutz-1947`, batch `musonius-lutz-2026-09`
(`pd-ingest/sources.js`, parser `pd-ingest/parsers/facing-ocr.js`).

| Step | State |
| --- | --- |
| 1. Greek rows relabelled `ancient_greek` | Done: 55 rows. Migration `20260929154606_musonius_eulogikon_greek_language.sql`, applied and verified |
| 2. English lectures extracted and chunked | Done: 85 chunks, 20,916 words, 23 lectures. Offline checks in `pd-ingest/test/facing-ocr.test.js` |
| 2. Staged | `corpus_staging_sources` status `staged`: waiting for Kyle's review |
| 2. Embedded into `rag_corpus` | **Not done.** No `OPENAI_API_KEY` in the session that did this, so nothing was embedded, and no rows went into `rag_corpus` without embeddings |

## Step 1: the Greek Musonius

`rag_corpus` held three Musonius works from eulogikon.org (Hense's Greek),
all with `language = 'english'` and no translator. Every one of the 56 rows
was read:

- 52 are Greek from start to finish.
- The first row of each work opens with eulogikon's English front matter (YAML,
  title and a one-paragraph summary) and then continues in Greek. These are
  relabelled with the others.
- Minor Fragments chunk 4 is not Greek. It holds only eulogikon's "License and
  provenance" note, with no Musonius text. It stays `english` and, at
  Kyle's request, is deprecated (migration
  `20260929160223_deprecate_musonius_license_note.sql`). Lectures chunk 45,
  Minor Fragments chunk 3 and Spurious Letters chunk 4 end with the same note
  after their Greek; they stay, since they carry Greek text.

`language` is set to `ancient_greek`, not `greek`, because
`rag_corpus_language_normalized_check` allows only `ancient_greek`. The
migration updates only rows that are Musonius, from eulogikon, still `english`,
and hold Greek letters, and it aborts unless exactly 55 rows match. Text,
chunking and embeddings are unchanged. Result: Lectures 46, Minor Fragments 4,
Spurious Letters 5 are `ancient_greek`, and one Minor Fragments row is `english`
(now deprecated).

## The license

Lutz, "Musonius Rufus: The Roman Socrates," *Yale Classical Studies* 10
(Yale University Press, 1947). A US work of 1947 is public domain only if its
copyright was not renewed in its 28th year, which for 1947 means 1974 or 1975.

I searched the Copyright Office's own printed record, the *Catalog of
Copyright Entries*, Third Series, using archive.org's OCR of the volumes.
Covered: Part 1, Books and Pamphlets, January–June and July–December 1974 and
1975, both the index and the registration sections; and Part 2, Periodicals,
1974 and 1975. Search terms: "Lutz", "Musonius", "Roman Socrates", "Socrates"
and "Yale Classical". **No renewal was found.** The only Cora Lutz entry in
those volumes is a new 1975 registration, for *Essays on Manuscripts and Rare
Books* (A652121, 30 June 1975). One secondary web source says the same thing
(no renewal; the only 1975 Lutz registration is the *Essays*), but I could not
open its page to check its method.

It is recorded as **`license_status = 'unverified'`**, with `quotable_on_air`
false, not as public domain, for two reasons. First, a search of OCR text can
miss an entry. Second, the Stanford renewal database and the Copyright
Office's own search could not be reached from this session. The full evidence
is in `license_evidence`. `rag_corpus` had no `unverified` value, so
migration `20260929154637_license_unverified_and_chunk_ocr_quality.sql`
adds it. The constraint that only `public_domain_us` primary texts are
quotable is unchanged.

**A decision for Kyle before promotion.** The standing copyright rule
(CLAUDE.md; `ACQUISITION_PLAN.md` Part 4, test 6) allows verbatim ingestion
only for public domain texts or a confirmed open license, and sends
everything else to a Mode 2 summary. That rule defines public domain as
"a translation published 1930 or earlier". The brief asks for verbatim
English under `unverified`, which that rule does not allow. So approving this
source means either accepting a non-renewed 1931–1963 US work as public
domain, or making a one-off exception. It is staged verbatim so that the
decision is made at approval, not here.

## The eight tests (Part 4)

1. **Provenance.** Passes. Cora E. Lutz, Yale Classical Studies 10, Yale
   University Press. This is the standard English edition of Musonius, with
   Hense's Greek facing the English.
2. **Argues.** Passes. The lectures argue: each takes a thesis and defends it
   against an objection, for example that women who study philosophy grow
   presumptuous (III), that marriage hinders philosophy (XIV), or that a
   philosopher should go to law over an insult (X).
3. **Cell.** Q14 *defends*: practice outweighs theory and virtue is trained
   (V, VI, XI). Q09 *defends*: exile takes nothing truly good (IX). Q10
   *states*: the king must be a philosopher (VIII).
4. **Need.** Passes. The corpus had no English Musonius at all: its three
   works were Greek labelled as English, so English retrieval reached them
   only by accident. Musonius is Epictetus's teacher, and the practical
   Roman Stoicism of Q14 lacked his voice.
5. **Chunks.** Good. Short diatribes, each on one question, argued in
   passages that stand alone. Chunks never cross a lecture.
6. **Legal form.** Unsettled; see above. Verbatim, `unverified`, never
   quotable. Kyle decides at approval.
7. **Leak.** The views on sex (XII: intercourse only within marriage and for
   children; relations between men "contrary to nature") and on marriage and
   children (XIII–XV) are first-century positions. They should be held as
   Musonius's view, not voiced as the counselor's own.
8. **Ten years.** Not empirical. No `review_by`.

## Extraction

The OCR interleaves Greek pages (running head "NN CORA E. LUTZ"), English
pages ("MUSONIUS RUFUS NN"), Lutz's notes and apparatus, and margin line
numbers. A lecture's opening pair of pages has no running heads. The parser
keeps English pages only. It counts printed pages two at a time from p. 33:
46 of 47 legible running heads agree, and the 47th is the OCR reading "87" for
37. It drops notes from their first line to the page foot, including nine
note continuations that begin without a number, all listed in `sources.js`.
It rejoins hyphenated words, keeping the hyphen only for "self-" and "ill-".
It cuts paragraphs longer than 300 words at sentence ends. Chunks are 70–350
words, cited as `XVIIIA, pp. 113–115`, with `section_label` set to Lutz's
lecture number.

**Gaps in the scan, marked "[…]" and not reconstructed.**

- XVIIIA, p. 113: four places. The text breaks after "can nourish man well,",
  after "are not unsuitable, and are all", after "clitus when he said," (the
  quotation of Heraclitus is lost), and after "much worse than the un-". Most
  of the page is lost, including the passage on meat and uncooked food. This
  chunk (`XVIIIA, pp. 113–115`) has `ocr_quality = 'poor'`.
- VIII, pp. 65–67: five places. After "you may understand", "helpful, and",
  "No one,", "skilled in horse-" and "grateful for what he". This chunk
  (`VIII, pp. 65–67`) is `poor`.
- XVI, p. 107: the right margin is clipped. Words that can be read from
  context are restored (listed below). The four that can't are "[…]". These
  two chunks are `fair`.

Every other chunk has the source's quality: `good` (a garble estimate of
0.0%).

Headings damaged by OCR ("THAT EXILE [8 NOT AN EVIL", "WHAT 15 THE CHIEF END
OF MARRIAGE?") are matched as they stand and never enter the chunk text.
Lecture II's heading is Lutz's own supplement, "<THAT MAN IS BORN WITH AN
INCLINATION TOWARD VIRTUE". The file ends at Lecture XXI, so the minor
fragments that follow in Lutz are not here.

**Pairing.** The Greek rows are 400-word windows that run across lecture
boundaries, so no English chunk lines up with one. `paired_chunk_id` stays
null throughout.

**Identity.** The English goes in under the same author and work as the Greek
(`Musonius Rufus`, `Lectures`), as asked, and is told apart by `language` and
`translator`. Its `chunk_index` values continue after the Greek (from 46).
The pd-ingest convention would give the original a "(Greek)" work suffix.
That rename is left for Kyle to decide.

## OCR fixes

Each fix is a listed pattern that must match or the source is refused. The
counts are occurrences.

- "that.there" → "that there" (I) (1×)
- "not‘an evil" → "not an evil" (I) (1×)
- "traming", "traiming" → "training" (I, IV) (2×)
- stray "|" (I) (1×)
- "Just measure" → "just measure" (I) (1×)
- "15 inborn" → "is inborn" (II) (1×)
- "Τῇ this is true" → "If this is true" (III) (1×)
- "im expense" → "in expense" (III) (1×)
- "1 am", "1 tell", "1 used" → "I …" (IV, IX, XVII) (4×)
- "In no respect" → "in no respect" (IV) (1×)
- "It.would" → "It would" (IV) (1×)
- "Jeading" → "leading" (V) (1×)
- stray "-" (VI) (1×)
- "οὗ" → "of" (VI) (1×)
- "seck" → "seek" (VII) (1×)
- stray "-" (VII) (1×)
- "αὖ trains one" → "it trains one", parallel to "it teaches one" before it (VIII) (1×)
- stray "‘" (VIII) (1×)
- "ἃ man" → "a man" (VIII) (1×)
- "manpr" → "man?" (VIII) (1×)
- "N Ο one" → "No one" (VIII) (1×)
- "hame" → "name" (VIII) (1×)
- "who. masters" → "who masters" (VIII) (1×)
- stray "‘" (IX) (1×)
- verse break printed as "|" → "/" (IX) (1×)
- "he Says" → "he says" (IX, XI) (2×)
- "and. justice" → "and justice" (IX) (1×)
- stray "_" (IX) (1×)
- "may he sure" → "may be sure" (XI) (1×)
- stray "‘" (XI) (1×)
- "bis" → "his" (XI) (1×)
- "5011" → "soil" (XI) (1×)
- stray "‘" (XII) (1×)
- "cither" → "either" (XIIIB) (1×)
- stray "_" (XIIIB) (1×)
- stray "." (XIV) (1×)
- "Kros" → "Eros" (XIV; Eros is named two sentences before) (1×)
- "15 fitting" → "is fitting" (XIV, XVI) (2×)
- "It 1s" → "it is" (XV) (1×)
- "SO" → "so" (XV) (1×)
- "Iam" → "I am" (XV) (1×)
- "J have" → "I have" (XV) (1×)
- "arid" → "and" (XV) (1×)
- "than‘a" → "than a" (XV) (1×)
- "im the strongest" → "in the strongest" (XVI) (1×)
- "philosopher 5. life" → "philosopher’s life" (XVI, p. 107, clipped right margin) (1×)
- "les" → "lies" (XVI, p. 107) (1×)
- "will . strain" → "will […]strain": the start of the word is lost at the margin (XVI, p. 107) (1×)
- "study o" → "study of" (XVI, p. 107) (1×)
- "we " a study" → "we […] study": words lost at the margin (XVI, p. 107) (1×)
- "part o : e body" → "part of the body" (XVI, p. 107) (1×)
- "using τ" → "using […]": a word lost at the margin (XVI, p. 107) (1×)
- "good an" → "good and" (XVI, p. 107) (1×)
- "again-from" → "again from" (XVI, p. 107) (1×)
- "nor in τ from" → "nor in […] from": words lost at the margin (XVI, p. 107) (1×)
- "suc!" → "such" (XVI, p. 107) (1×)
- "= losophy" → "philosophy" (XVI, p. 107) (1×)
- "wha" → "what" (XVI, p. 107) (1×)
- "1s" → "is" (XVII) (1×)
- "thmgs" → "things" (XVII) (1×)
- "tothe" → "to the" (XVII) (1×)
- "smal]" → "small" (XVIIIA) (1×)
- "~onsequences" → "consequences" (XVIIIA) (1×)
- "self-control]" → "self-control" (XVIIIA) (1×)
- "Ags" → "As" (XVIIIA) (1×)
- "US" → "us" (XVIIIA) (1×)
- "People" → "people" (XVIIIA) (1×)
- stray "-" (XVIIIB) (2×)
- stray "P" (XVIIIB) (1×)
- "by. close" → "by close" (XIX) (1×)
- stray "‘" (XIX) (1×)
- "wie" → "wine" (XX) (1×)

## To finish (needs `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`)

```
-- after reading this record and the staged chunks:
update corpus_staging_sources set status = 'approved', reviewed_at = now() where slug = 'musonius-lectures-lutz-1947';
```
```
cd academy/corpus-ingestion
node pd-ingest/promote.js --slug musonius-lectures-lutz-1947
```

`promote.js` embeds with `text-embedding-3-small` through `embedder.js`, the
same model and path as every other row. It inserts from `chunk_index` 46, uses
each chunk's own `ocr_quality`, writes the three question-map registrations,
and checks that a promoted row comes back from `match_rag_corpus`. After that,
run the two retrieval checks that could not be run here:

- A query for "Musonius on food and self-control", filtered to `english`,
  should return XVIIIA/XVIIIB chunks near the top.
- Retrieval for other authors should be unchanged. The only rows touched so
  far are Musonius rows; the relabel moves the 55 Greek rows out of
  `english`-filtered results, which is its purpose.

## Log

- 2026-09-29: Musonius. Greek relabelled (55 rows `ancient_greek`, one
  English license row left as it was). Lutz's English Lectures I–XXI
  extracted and staged as 85 chunks; license unverified (no renewal found in
  the CCE 1974–75). Not embedded: no OpenAI key in the session.
