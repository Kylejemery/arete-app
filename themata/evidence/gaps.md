# Phase 1 gaps

What we expected to find in the Arete corpus for the evidence ledger and could
not, plus the corpus defects that turned up along the way. Searched
2026-09-27 over non-deprecated `rag_corpus` rows (method in `../NOTES.md`).

The short version: the corpus holds **one** primary witness to Stoic
syllogistic, Diogenes Laertius VII (Hicks). The other ancient evidence is
Cicero (on the conditional, the Liar and the Sorites) and Greek fragments
quoted in Zeller's footnotes. Every source the brief named for the themata
themselves is absent: Sextus, Galen, Alexander, Origen. The ledger can support
the five indemonstrables, the connective definitions, and a handful of accepted
and rejected forms. It cannot yet support a test suite that tells rival
reconstructions of the themata apart. For that the corpus needs Sextus.

## 1. Sources absent from the corpus

| Source the brief names | In corpus? | What we lose |
| --- | --- | --- |
| Sextus Empiricus, *Outlines of Pyrrhonism* II | No | The fullest account of the indemonstrables and of analysis; the single-premise dispute; the duplicated arguments; the conditional debate in the source's own words. |
| Sextus Empiricus, *Against the Logicians* (M VII–VIII) | No | The four kinds of invalid argument with examples (redundant, incoherent, invalid schema, deficient). The dialectical theorem. Worked analyses of composite arguments. |
| Diogenes Laertius VII | **Yes** (Hicks 1925, 87 rows) | Our only primary text for the indemonstrables. Abridged at 7.82 (see §3). |
| Galen, *Institutio Logica* | No | The later list of indemonstrables, the relational syllogisms, and Galen's criticism of the third indemonstrable. |
| Galen, *De placitis Hippocratis et Platonis* II.3 | No | The passage naming a first to fourth thema. Only Zeller's citation survives (rules T02). |
| Alexander, *in Analytica Priora* | No | The synthetic theorem as stated, and the Stoic derivation of themata 2–4 from it. Only the Greek quoted in Zeller survives (rules T04). |
| Alexander, *in Topica* | No | Single-premise arguments (cited in Zeller n.245). |
| Origen, *Contra Celsum* | No | The argument "through two conditionals" with its example. |
| Simplicius, *in De Caelo* | No | The third thema. Only one Greek sentence survives, in Zeller (rules T03). |
| Cicero, *Topica* | No | The sixth and seventh modes. Reported by Zeller n.237 and by Mates's summary, form not given. |
| Aulus Gellius XVI.8 | No (only XIX.1) | The Latin handbook account of propositions and exclusive disjunction that Mates relies on. |
| Apuleius, *Peri hermeneias*; Ps.-Galen; Martianus Capella; Boethius; Philoponus; Ammonius | No | Secondary witnesses to the indemonstrables and the single-premise examples, cited throughout Zeller n.230–245. |
| Frede, *Die stoische Logik*; Mignucci; Barnes | No | Rival reconstructions of the themata that Bobzien's summary names. Phase 3 cannot build these modules. |
| Bobzien, *Stoic Syllogistic* (1996) and Cambridge Companion ch. | Mode 2 summaries only | Neither summary states the content of any thema. One contains a factual error (rules R02). One reports "monotonicity", which conflicts with the redundancy rule (rules R03). A Bobzien module cannot be encoded from these. |
| Mates, *Stoic Logic* (1953) | Mode 2 summary, 60 rows | Usable for the themata Mates says are attested (1 and 3) and for his report of Sextus. Paraphrase, not quotation. |

`docs/corpus/ACQUISITION_PLAN.md` already notes that the only complete
English *Outlines* is Bury 1933, still in copyright, and that Patrick 1899
translates Book I only. Book I does not contain the logic. Before Phase 2
starts, the most useful single acquisition is a public-domain or
confirmed-open-licence English (or Greek) text of Sextus, *PH* II and *M*
VIII. Failing that, a Mode 2 summary of the relevant sections would at least
give the redundancy doctrine a better witness than a summary of Mates.
Acquisition is Kyle's call and was not attempted here.

## 2. Forms and statements expected but not sourced

Each item below is something the ledger should contain and does not, because
no retrieved passage states it.

**Themata**
- The first thema in any ancient author's words. It appears only in Mates's summary (rules T06).
- The second and fourth themata in any form. The corpus's only evidence is that they existed (T02) and that the Stoics derived them from the synthetic theorem (T04).
- The third thema as a general rule. Simplicius names it and describes one application (T03). The general statement is Zeller's gloss.
- The synthetic theorem stated as a rule. Alexander's remark (T04) is about its history, not its content.
- The dialectical theorem in Sextus's words (T05 is Mates's summary).

**Argument forms**
- Any ancient example of a **redundant** argument. S016 is a generic schema, sourced to a summary of Mates reporting Sextus. This is the brief's non-monotonicity constraint, and the corpus cannot currently document it from a primary text.
- Ancient examples of the other three kinds of invalidity (incoherent, invalid schema, deficient). S006 and S007 are DL examples that fit two of the classes, but DL does not use the classification.
- **Derived syllogisms with their analyses**: the corpus has two schemata (S012, S013), both through Mates's summary. Nothing primary.
- Arguments **through two / three conditionals** (διὰ δύο / τριῶν τροπικῶν). Name only (Zeller n.244, Mates summary). No form.
- The **fifth indemonstrable with more than two disjuncts** (πέμπτος ἀναπόδεικτος διὰ πλειόνων, Zeller n.238). Name only.
- **Subtypes** of the indemonstrables (affirmative/negative variants). Mentioned in Bobzien's summary only.
- Cicero's **sixth and seventh modes** (*Topica*). Reported, form not given.
- **Chrysippus's rejection of single-premise arguments** in a primary text. The corpus has Antipater's side via Zeller and Chrysippus's side only via Mates's summary.
- Any statement on whether **premise order** matters. The brief asks Phase 2 to represent order and multiplicity and test them, and no corpus passage bears on order. Multiplicity comes up once, in S012 ("p" used twice).
- **Negation scope**: the Stoic rule that a negation must govern the whole proposition. Nothing in the corpus beyond DL 7.69 (rules C06). Syntax.lean will need it.

## 3. Corpus defects found during the search

These are reported, not fixed. Phase 1 is read-only, and CLAUDE.md requires
care with the corpus. Items 1 (the θέμα tag at DL 7.78), 2 to 4 (as
annotations; canon text untouched) and 5 (Zeller relabel) are written as an
unapplied migration in #283, per Kyle's ruling of 2026-09-27.

1. **The word "thema" is invisible in the English primary text.** Hicks renders DL 7.78's κατά τι τῶν θεμάτων ἢ τινά as "in respect of one or more of the premisses" (rules T01). A vector search for "themata" cannot reach the one primary passage that names them. This is the problem the concordances in `academy/corpus-ingestion/concordance/` were built for, and θέμα / θέματα, ἀναπόδεικτος, παρέλκων, μονολήμματος, and συνθετικὸν θεώρημα are candidates for a logic concordance.
2. **DL 7.82 is abridged.** Chunk `e624f24d-…` contains " … " at three points: in the list of insoluble arguments, in the Sorites, and before the Nobody argument. The Veiled argument's description is missing.
3. **Hicks translation problems** that affect the ledger: the second indemonstrable's example has "it is night" where the definition requires the contradictory of "it is light" (S002), and the third indemonstrable is described as "a conjunction of negative propositions" while the example is a negated conjunction (S003). Both need checking against the Greek.
4. **Yonge, *De Fato* ch. 8** renders Chrysippus's negated conjunction as a negated conditional (rules C03). The OCR also has spacing faults ("excel lent", "OX FATE. Z6y").
5. **Zeller is labelled `text_type = primary`**, with `translator` and `edition_year` null. It is 19th-century scholarship (Reichel's translation) and should be `scholarship`, with translator and edition recorded. This mislabel matters for the counselor fence. CLAUDE.md says the layer field is the only fence.
6. **Mode 2 summary errors.** Bobzien, Cambridge Companion part 2 (chunk `a94845be-…`) misnumbers the indemonstrables. Mates (chunk `fcdf4b9c-…`) applies "adiaphorōs perainontes" to the transitivity arguments Zeller calls ἀμεθόδως περαίνοντες. Bobzien, *Stoic Syllogistic* (chunk `76b4b6e1-…`) reports "monotonicity". This may be right, but it should be checked against the paper, because it bears directly on the project's premise.
7. **Cicero, *Academica*** rows have no `locator`, so citations fall back to Yonge's chapter numerals quoted in the text.
8. **Plutarch** gives two different figures for Hipparchus's count of affirmative conjunctions from ten propositions: 103,049 in *On Stoic Self-Contradictions* (chunk `b5f26d84-…`) and 101,049 in *Essays and Miscellanies* vol. 3 (chunk `284435a5-…`). This is not in the ledger, but one of the two is a transcription or translation error.
9. **The read-only MCP server cannot satisfy guardrail 1 as built.** `search_corpus` in `server/routes/corpus-mcp.js` prints author, work, section and similarity but not the chunk `id`, so a ledger built through it cannot record `corpus_ref`. Fixed in #282, which adds the chunk id to the output.

## 4. Found, but out of scope for a propositional ledger

Recorded so their absence from `suite.yaml` is a decision, not an oversight.

- **Modal arguments.** The Master Argument (Epictetus, *Discourses* 2.19, chunk `e13b19db-e922-4d7e-a664-eb59f009979d`) and the transfer of necessity through a conditional that Chrysippus denied (Cicero, *De Fato* ch. 7, chunk `dfd1d864-021a-4b4a-b9b6-71223d8d16fb`). Both belong to a modal extension.
- **Arguments with changing premises** (μεταπίπτοντες). Epictetus, *Discourses* 1.7 (chunks `9284eb0a-c323-4b0d-8c3c-fbd5d1c04159`, `9cd234b8-a6ac-43ad-9f6b-620d1ab02c06`) and Zeller n.221 on conditionals that become false in time. These need time-indexed truth.
- **Categorical and unmethodically concluding arguments.** Zeno's categorical syllogisms (Arnold, *Roman Stoicism* §83, chunk `f595350a-4842-4688-a065-bb762d4d8b1b`). The ἀμεθόδως περαίνοντες "A = B, B = C, ∴ A = C" (Zeller n.232, chunk `8075662c-a785-469e-8d7b-31e8a2d1dad2`), which the Stoics held to be valid but not syllogistic. The latter has the same test-suite role as S008 (valid, must not be derivable) but needs predicate structure.
- **Sophisms with quantifier or term structure**: the Nobody (kept as S019 with a warning), the Veiled and Horned arguments, and the arguments at DL 7.186–187 (chunk `d105f03c-736e-4b41-9996-e66565c01686`).

## Found by the Phase 4 harness (2026-09-28)

- **No item needs the first thema.** `Attested` (third thema only) and
  `Mates` (first and third) give identical results on every item under every
  setting. The ledger holds no attested argument whose analysis requires
  contraposition, so the suite cannot test the first thema. Sextus M VIII and
  Alexander's worked analyses are the likely sources.
- **Lead for the first thema (recall, not a source).** The "two
  conditionals" argument, "if p, q; if p, not q; therefore not p", is
  reported, as far as we recall, in Sextus Empiricus (M VIII, PH II) and
  Origen, *Against Celsus* VII.15. The Phase 4 probes show that it separates
  the candidates (`results/matrix.md`, Probes). Store one of those texts in
  `research_sources` and it can become a ledger entry.
