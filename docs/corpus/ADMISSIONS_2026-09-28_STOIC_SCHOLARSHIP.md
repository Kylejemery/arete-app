# Admissions: Stoic scholarship PDFs, 2026-09-28

Eight candidates Kyle sent on 2026-09-28: one JSTOR page uploaded in chat, and
seven archive.org and Google Books scans pushed to the `corpus-pdfs` branch
(`academy/corpus-ingestion/source_texts/`). Each has been run against the
eight tests of `ACQUISITION_PLAN.md` Part 4. This record includes the
rejections, per Part 5, rule 8.

Four are admitted and staged as batch `stoic-scholarship-2026-09`
(`pd-ingest/sources.js`). This container cannot reach archive.org, so
`pd-ingest/extract-pdf.py` read each PDF's own text layer into
`data/raw/<slug>/`, with the PDF's sha256 in the manifest.

| Candidate | Verdict |
| --- | --- |
| Jackson, *Seneca and Kant* (1881) | Admitted, verbatim, Tier 2 scholarship |
| Hicks, *Stoic and Epicurean* (1910) | Admitted, verbatim, Tier 2 scholarship |
| Davidson, *The Stoic Creed* (1907) | Admitted, verbatim, Tier 2 scholarship |
| Bréhier, *Chrysippe* (1910) | Admitted, verbatim, Tier 2 scholarship, French |
| Pearson, *Fragments of Zeno and Cleanthes* (1891) | Already held (321 rows); not re-ingested |
| *The Daughter of a Stoic* (Google scan) | Rejected |
| *The Stoic, or Memoirs of Eurysthenes* (Google scan) | Rejected |
| *Journal of Speculative Philosophy*, p. 106 (JSTOR) | Rejected |

## Admitted

### W.T. Jackson, *Seneca and Kant* (Dayton: United Brethren, 1881)

`jackson-seneca-and-kant-1881`, from https://archive.org/details/cu31924031229622 (Cornell).

1. **Provenance.** Passes. A Michigan PhD thesis extended into a book. Jackson was a professor at Indiana University.
2. **Argues.** Passes. Chapter IV compares the two systems and argues a verdict. The verdict rests partly on a theological premise (see test 7), but it is a case that could fail.
3. **Cell.** Q04 *attacks*: the sage's self-sufficiency read as pride, and suicide as the system's own admission that virtue does not master every circumstance. Q06 *complicates*: Seneca grounds duty in nature, Kant in the autonomous will.
4. **Need.** Passes. Q06 had no text pressing it. Kant's refusal to ground the ought in nature is the opposition the map asks for, even at second hand.
5. **Chunks.** Adequate. It is expository, one short book (about 16,000 words), and page-sized passages carry their point.
6. **Legal form.** US 1881, public domain. Cornell's scan states "no known copyright restrictions in the United States".
7. **Leak.** Yes. The conclusion (pp. 101–103) calls Stoicism "in its inmost essence a system of selfishness" and "far below" the Gospel. It is held as a critic, and this is recorded in the staging cleaning notes.
8. **Ten years.** Not empirical; no `review_by`.

### R.D. Hicks, *Stoic and Epicurean* (New York: Scribner's, 1910)

`hicks-stoic-and-epicurean-1910`, from https://archive.org/details/stoicandepicurea002438mbp.

1. **Provenance.** Passes. Hicks is the Loeb translator of Diogenes Laërtius, whose Book VII the corpus already holds. The book appeared in Hibben's *Epochs of Philosophy*.
2. **Argues.** Passes. It is interpretive history that takes positions, for example on the relation of Stoic ethics to physics and on the force of the sceptical attack.
3. **Cell.** Q01 *states*: Stoic providence against Epicurean chance. Q03 *complicates*: the apprehensive presentation against the Academic and Pyrrhonist attacks (chapters VIII–X).
4. **Need.** Passes. Q03's opposition was Cicero's *Academica* only, and that only partially.
5. **Chunks.** Good. The prose is clear and the chapters are topical.
6. **Legal form.** Published in the US in 1910, so public domain.
7. **Leak.** None beyond the period's scholarship.
8. **Ten years.** Not empirical.

### W.L. Davidson, *The Stoic Creed* (Edinburgh: T. & T. Clark, 1907)

`davidson-stoic-creed-1907`, from https://archive.org/details/thestoiccreed00daviuoft.

1. **Provenance.** Passes. Davidson was Professor of Logic and Metaphysics at Aberdeen.
2. **Argues.** Passes. It gives an exposition, then "Ethics: Defects" (chapter X) and "Present-day value" (chapter XII) argue both for and against.
3. **Cell.** Q04 *states*. Q01 *states*.
4. **Need.** Marginal on Q04, which is well held. Admitted for chapter X, a critical treatment of Stoic ethics that sits beside Cicero's *De Finibus*, and for its sustained treatment of Stoic theology on Q01. If retrieval mass on Q04 becomes a problem, this is the first source to reconsider.
5. **Chunks.** Good.
6. **Legal form.** Published 1907, so public domain in the US.
7. **Leak.** Mild. It appeared in a religious series, and the theology chapter reads the Stoics with an eye to Christian theism. This is recorded in the cleaning notes.
8. **Ten years.** Not empirical.

The appendix on pragmatism and humanism (pp. 255–266) is left out: it occupies no cell (test 3).

### Émile Bréhier, *Chrysippe* (Paris: Alcan, 1910)

`brehier-chrysippe-1910`, from https://archive.org/details/chrysippe00br.

1. **Provenance.** Passes. Bréhier is a standard authority on the Old Stoa, and the book appeared in the *Grands Philosophes* series.
2. **Argues.** Passes. It takes explicit positions against named readings, for example that the comprehensive impression is passive, against Brochard.
3. **Cell.** Q03, Q05 and Q07, all *states*.
4. **Need.** Passes. Q07 had no held opposition and no monograph treatment. This is the only book-length study of Chrysippus in the corpus.
5. **Chunks.** Good for the doctrine chapters. The source notes are dense with Greek, which the OCR garbles (see test 6).
6. **Legal form.** Published abroad before 1931, so public domain in the US.
7. **Leak.** None.
8. **Ten years.** Not empirical.

**French.** It is untranslated, so it needed `french` added as a corpus language (migration `20260928185806_corpus_language_french`). It answers French-language retrieval only. A later English Mode 2 summary would bring its positions into English retrieval.

## Not re-ingested

**A.C. Pearson, *The Fragments of Zeno and Cleanthes* (1891).** This is already in `rag_corpus` as 321 live rows (author "A.C. Pearson", `text_type` primary, `edition_year` null). A second ingest would duplicate it.

Two corrections are proposed but not made here:
- set `edition_year = 1891`;
- decide whether Pearson's introduction and notes should be `scholarship` rather than `primary`.

## Rejected

**The Daughter of a Stoic** and **The Stoic, or Memoirs of Eurysthenes the Athenian** (Google Books scans). They fail at test 5 before anything else: the PDFs have no text layer, just 496 words of Google boilerplate across 200 and 129 pages. Both appear to be nineteenth-century novels about Stoics, which would also fail test 2 (fiction does not argue a case that could fail) and test 3. Revisit only if one proves to be something other than fiction.

**Journal of Speculative Philosophy, p. 106** (JSTOR Early Journal Content, c. 1882). This is one page: the tail of a previous article, two short poems by J. Albee ("The Stoic", "Anti-Stoic"), and the start of a book notice of Jackson's *Seneca and Kant* that breaks off mid-sentence. It fails test 2 (no argument on the page) and test 5 (a fragment). Its subject, Jackson's book, is admitted above in full.
