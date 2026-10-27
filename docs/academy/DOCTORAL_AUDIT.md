# Arete Academy: Doctoral Audit

2026-10-27. An audit of every course and program feature on `main` against what a real PhD in ancient philosophy requires. Written for Kyle, who wants a doctoral-level Stoic education, not a doctoral label. Read-only: nothing in the courses was changed.

Method: five passes, each scoring against one rubric (reading load, level of the objectives, scholarly debate, assessment, writing, languages, accuracy), plus a survey of real programs. Page counts are estimates (a Loeb-size page of about 300 words). Spot checks of the sharpest findings are marked **confirmed**; claims about published texts that still need checking against an edition are marked **verify**.

## Verdict

The Academy is a serious formation program at roughly advanced-undergraduate level, with one course (PHIL 801) that argues at doctoral level in its best sessions. It is not a doctoral education, and the gap is not mainly in the prose of the lessons. It is in four things:

1. **Reading volume.** Courses assign about 7 to 25 pages of primary text a week, in English, with secondary reading that is mostly one introductory book "as assigned". A doctoral seminar reads 100 to 250 pages a week, including journal articles and primary texts in Greek or Latin.
2. **Writing.** No course requires anything longer than a paragraph to pass. Papers are never graded. A PhD is judged on written work above all.
3. **Program structure.** Nothing gates anything above the session level: no prerequisites, no qualifying exams, no language requirement, and a dissertation that can be completed with four chapters of 500 characters.
4. **Judgement.** Every assessor is the same family of model, grading against model answers the student can see and retake against, with verdicts written from the browser. No specialist ever reads anything.

The good news: the strongest parts (701 S13, the 706 argument, 801's derivations and source notes, the Evaluator's evidence rules, the doctoral grading appendix) show the shape a doctoral version would take. Most of what is missing is volume, gating and examination, not invention.

## The standard

Real programs surveyed: Princeton (Classical Philosophy), Toronto (CPAMP), Berkeley and Texas (Joint Programs in Ancient Philosophy), Cambridge (Classics Caucus B), Oxford (DPhil). The common core:

- **Languages.** Greek by unseen sight-translation exam, Latin as well in most programs, by year 2 or 3; one modern research language (German, French or Italian), e.g. Berkeley's 300 words in 90 minutes with a dictionary. Pittsburgh's comprehensive list requires 500 pages of Greek and 500 of Latin read in the original.
- **Coursework.** About 6 to 8 graduate seminars at A- or better (more in some programs), each ending in a long research paper, including seminars outside ancient philosophy and a logic sequence.
- **Qualifying stage**, by year 3 or 4: written exams plus an oral, or a portfolio of papers defended orally (Berkeley: three 1,500 to 3,000 word topic essays and a 3-hour oral before four faculty).
- **Prospectus** of about 3 to 15 pages, defended.
- **Dissertation** judged as an original, substantial contribution: 75,000 to 80,000 words at Oxford and Cambridge, defended orally with at least one external examiner.
- **Time:** about 5 to 6 years in North America, 3 to 4 in the UK (where the languages are assumed on entry).
- **Weekly load in a Stoicism seminar** (Houston, Oxford, Berkeley syllabi): one or two Long and Sedley chapters plus one main article or monograph chapter of up to about 60 pages, with further recommended items, and a student report.

Sources: gradschool.princeton.edu (Classical Philosophy); sgs.calendar.utoronto.ca (Ancient and Medieval Philosophy); philosophy.berkeley.edu/graduate/ancient; liberalarts.utexas.edu (Joint Program in Ancient Philosophy); classics.cam.ac.uk/prospective/postgraduate/phd; ox.ac.uk (DPhil in Philosophy); classics.pitt.edu/graduate/reading-lists; uh.edu/~cfreelan/courses/Stoics. Princeton and Oxford pages were read only through search extracts.

## Course scorecard

| Course | Sessions | Primary reading | Secondary reading | Highest level demanded | Writing to pass | Greek/Latin | Level |
|---|---|---|---|---|---|---|---|
| PHIL 701 Foundations | 14 | ~105 pp (~7/wk; S13 carries a third) | Sellars *Stoicism* "as assigned" ×10; Nussbaum ch. 10 | Evaluate, in S13 only | ~1,600 to 2,300 words, short answers; the 1,200 to 2,000 word S12 paper is never collected | None (one Latin line) | Strong undergraduate; S13 graduate |
| PHIL 702 Marcus | 11 | ~150 pp (the whole *Meditations*) | Hadot, *Inner Citadel* and Sellars, all "as assigned" | Analyse | ~2,100 to 3,000 words, short answers | None | Undergraduate; therapeutic objectives |
| PHIL 703 Epictetus | 11 | ~260 pp | Long, *Epictetus* chs. 1 to 9, no pages; 2 Hadot chapters | Analyse (capstone: evaluate) | ~2,600 to 3,700 words | None | Strong undergraduate |
| PHIL 704 Seneca | 11 | ~240 pp | Sellars ×6 "as assigned"; 3 Hadot chapters; Long ch. 7 | Evaluate (hypocrisy, Nero) | ~3,500 words | None | Strong undergraduate; no Seneca scholarship at all |
| PHIL 705 Logic | 20 | ~95 pp, mostly Long and Sedley in English | None assigned | Analyse (ungraded seminars aside) | **0 words**: every session passes on multiple choice; the final exam is never administered | None | Introductory survey |
| PHIL 706 Anger | 7 | ~108 pp | Nussbaum 2016 chs. 1 to 2 (one item) | Evaluate | ~2,300 words + ungated practicum log | None | Upper undergraduate, good argumentative arc |
| PHIL 707 Digital age | 9 | ~122 pp, largely repeated loci | None named ("attention-economy criticism, as assigned") | Create (personal protocol) | ~2,800 words + the fast (gated) | None | Applied workshop |
| PHIL 801 Syllogistic | 14 | ~95 pp, of which ~25 pp are in the corpus | ~300 pp: Bobzien 1996 nearly whole, CHHP chapter, Bobzien 2002, Williamson; Frede "via Bobzien's notes" | Create (proofs, models, open problems) | ~15,000 to 20,000 words of graded answers; the 4,000 word paper is never read | Greek shown every session, tested in ~5 of 92 items, never unseen | Doctoral in its best sessions; not as a course |
| GREK 101 / 201 | 30 + 10 | ~500 words of real Greek in total | | | Multiple choice only | | About one semester; does not finish first-year grammar |
| LATN 101 / 201 | 30 + 10 | ~700 words of real Latin | | | Multiple choice only | | About one year; simple Seneca, slowly |

Against the calibration, the reading load per week is one tenth to one quarter of a doctoral seminar in every course, the secondary reading is introductory and unpaginated everywhere except 801, and only 801 asks for writing at length.

## Program-level gaps

These matter more than any single course.

1. **Nothing is required to complete anything above a session.** Session N opens when session N-1's quiz passes (`courses/[courseId]/page.tsx:1481-1498`). No course gates another: entry is by subscription tier only (`dashboard/courses/page.tsx:185-189`); "Prerequisites: PHIL 705 and GREK 101" for 801 is description text. The Evaluator, the vivas, the papers and the language results gate nothing. There is no program completion rule.
2. **Writing is not examined.** Papers saves text and marks it "submitted"; nothing ever grades it, and it lists only PHIL 701 to 704 (**confirmed**, `dashboard/papers/page.tsx:11-16`). 801's research paper has nowhere to go, and its viva Examiner, told it "has read the paper", never receives it (`viva/[courseId]/page.tsx:70-90`; `phil801_sessions_12_14.ts:238`). Practice assignments (801's source notes and derivation sets, 704 and 706's one-page pieces) are logged, not read.
3. **No qualifying stage.** No comprehensive exam, no reading list for one, no prospectus defence. The "Qualifying Examination" in 801 is its end-of-course viva.
4. **No language requirement.** GREK and LATN are optional, ungated and multiple choice (`page.tsx:1264`). Their finals are printed with the answer in the session and sat "in conversation" with no grade (`grek101.ts:3280ff`).
5. **The dissertation fails the calibration on every axis.** Four chapters of 500 characters complete it (**confirmed**, `api/academy/dissertation/route.ts:71`); there is no length target; the defence Examiner sees only the title, abstract and chapter titles, never the text; the defence uses the weaker non-doctoral verdict rules; retakes are unlimited. The supervisor persona names only Hadot, Long and Sellars as the scholarship.
6. **Grading cannot carry a doctoral claim.** Open answers are graded on whether they "capture the essential claim(s) of the reference answer" (`grade/route.ts:24-28`); the doctoral appendix (loci required, scholars represented fairly, derivations checked) applies to 8xx only. Reference answers are shown after submission and ship in the client bundle; retakes are unlimited; an open answer is accepted at 10 characters. Multiple-choice keys are guessable: all 11 PHIL 707 keys are option 2 (**confirmed**), 18 of 22 in 704 and 706 likewise, and options are never shuffled.
7. **Every verdict is self-asserted.** Quiz results, viva verdicts, chapter approvals and dissertation completion are written from the browser with the student's own session (`StudentQuiz.tsx:247`; viva page `:185`, `:200`; `dissertation/page.tsx:183`). Fine for a single self-directed student; it means a "passed" record is not evidence that an examiner judged the work.
8. **No outside reader.** Every judge is one model family. No part of the program can meet the "specialists, at least one external" standard on its own.

## The corpus

The Proctor and the courses can only draw on what is in `rag_corpus`. Against a canonical doctoral list for Stoicism (built from the Houston, Oxford, Berkeley, Florida and St Mary's syllabi):

| Work | In the corpus |
|---|---|
| Long and Sedley, *The Hellenistic Philosophers* (1987) | No |
| *Cambridge History of Hellenistic Philosophy* (1999) | Bobzien's logic chapter only (summary, plus private full text) |
| Inwood (ed.), *Cambridge Companion to the Stoics* (2003) | No |
| Inwood, *Ethics and Human Action in Early Stoicism* (1985) | No |
| Bobzien, *Determinism and Freedom in Stoic Philosophy* (1998) | No |
| Long, *Stoic Studies* (1996) | Summary |
| Long, *Hellenistic Philosophy* (1974) | No |
| Frede, *Essays in Ancient Philosophy* (1987); *Die stoische Logik* (1974) | No |
| Striker, *Essays on Hellenistic Epistemology and Ethics* (1996) | No |
| Annas, *Hellenistic Philosophy of Mind*; *The Morality of Happiness* | No |
| Schofield, *The Stoic Idea of the City* (1991) | No |
| Cooper, *Reason and Emotion* (1999) | No |
| Nussbaum, *The Therapy of Desire* (1994) | No |
| Brennan, *The Stoic Life* (2005) | No |
| Graver, *Stoicism and Emotion* (2007) | No |
| Sorabji, *Emotion and Peace of Mind* (2000) | No |
| Mates, *Stoic Logic* (1953) | Summary |
| Rist, *Stoic Philosophy* (1969) | No |

Primary texts are better covered: Diogenes Laertius VII, Epictetus, Marcus, Seneca, Cicero, Plutarch, Musonius and Gellius are in the Library in public-domain translations. Sextus, Origen and two Alexander commentaries are held only as private texts for Themata. Galen, Simplicius, Apuleius and Boethius are absent, and there is no Greek or Latin original of anything. The corpus also carries a good deal that a doctoral student would not read (Greene, Holiday, panpsychism papers), which is fine for the app but worth fencing from the Academy.

Copyright limits what can be fixed here: modern scholarship can enter only as summaries, so the student reads it from their own copy. The corpus can carry the map; the shelf of books is the student's.

## Errors found

Not an exhaustive hunt. **Confirmed** were checked in this pass; the rest are the auditors' readings and should be checked against an edition before changing anything.

| Where | Problem | Status |
|---|---|---|
| `grek101.ts:33` | Enchiridion 1, the course's anchor sentence on every session, reads "καὶ ἁπλῶς … σῶμα, κτῆσις, δόξα, ἀρχή"; the standard text (Schenkl, Boter) reads "καὶ ἑνὶ λόγῳ … τὸ σῶμα, ἡ κτῆσις, δόξαι, ἀρχαί" | Text **confirmed**; correct reading **verify** |
| `phil801_sessions_1_4.ts:36` | Simplicius called a Peripatetic; he was a Neoplatonist | **Confirmed** |
| `phil705.ts:2107` (and 2130) | Sextus M 8.231 called the "synthetic theorem"; it is the dialectical theorem (the synthetic theorem is Peripatetic). Contradicts PHIL 801 S1 | Text **confirmed** |
| `phil705.ts:1761, 3685` | Master Argument said to conclude "only the actual is possible"; Diodorus: the possible is what is or will be true | verify |
| `phil705.ts:1985, 2147` | Quantified chains treated as two first indemonstrables joined by the third thema; 801 S11 says no thema supplies the indefinite step | verify |
| `phil705.ts:2121` | "A step not justified by an indemonstrable makes the argument invalid" contradicts the course's own point that some valid arguments are not syllogisms | verify |
| `phil705.ts:2154, 2165` | S12 Part 4 pasted from elsewhere ("Session 12 established…" inside Session 12) | verify |
| `phil701.ts:788` | Ench. 11 presented as the procedure for testing impressions; that is Ench. 1.5 | verify |
| `phil701.ts:1407, 1432, 1542` | "Individual nature (roles, talents)" as the third nature in the telos formula: that is Panaetius' personae (Off. 1.107ff), not DL VII.87-89 | verify |
| `phil701.ts:1488` | "A preferred action": preferred and dispreferred classify indifferents, not actions | verify |
| `phil701.ts:481` | Reserve clause attributed to Marcus and Seneca, omitting Epictetus (Ench. 2, the session's own reading); "hupexhairesis" for hupexairesis | verify |
| `seminars.ts:18`, `phil701.ts:770` | "PhWoL Ch. 11, Spiritual Exercises": it is ch. 3 (ch. 11 is "Philosophy as a Way of Life"); session 4's "PhWoL Ch. 10" is "The Sage and the World" | **Confirmed** (Wiley contents) |
| `phil702_reading.ts:59-107` | Inner Citadel chapter mapping (desire ch. 4, action ch. 5, assent ch. 6, a ch. 11): assent, desire and action are chs. 6, 7, 8, and the book's chapters run to 10 | **Confirmed** (BMCR review contents) |
| `phil703.ts:29` | "Freed after Nero's death" stated as fact; no ancient source dates the manumission | verify |
| `phil706.ts:252-254` | De Ira 2.1-4 as a "two-movements doctrine"; Seneca gives three at 2.4.1. Propatheiai identification stated as settled (Sorabji vs Graver dispute it) | verify |
| `phil706.ts` | The Protagoras argument taught with no mention of its hedonist premise | verify |
| `phil707.ts:658` | "Monotropia" as the Greek for philosophical solitude: unsourced; the locus is Disc. 3.13 (erēmia), not assigned | verify |
| `phil704_reading.ts:94, 104` | Hadot PhWoL ch. 4 annotated as Meditations-focused but assigned to De Tranquillitate; Long's *Epictetus* ch. 7 assigned for De Providentia | verify |
| `grek101.ts:1506, 1574` | λόγος presented as a 3rd-declension type; it is 2nd declension | verify |
| `phil801_sessions_1_4.ts:159, 207` vs `_9_11.ts:261` | DL 7.70 middle-assertible examples inconsistent between S2 and S11 (already in PARKING) | verify |
| `docs/academy/PHIL_801_SYLLABUS.md:3, 19` | Says nothing is built and the doctoral rubric does not exist; both are now false | stale |

The 2026-10-21 PARKING items on PHIL 705 (indemonstrable numbering, Ex 12.3, modus tollens, answer-key skew) are fixed; the themata synthetic/dialectical mix-up above remains.

## What is already doctoral-grade

- **701 S13**: De Finibus III against IV, De Fato, Plutarch on common conceptions, with dilemma and objection-and-reply questions.
- **706's argumentative architecture**: thesis, an objection held open from S1, a fair treatment of Nussbaum's payback analysis.
- **801 S4, S8, S12**: formalising the three modal definitions; reducing the constructive dilemma and proving an irreducibility with Bobzien's T1 to T4; Bobzien 2002 against Williamson with her models to construct. The parelkōn open problem and Themata as a live laboratory.
- **The 801 source-note format**: "what the passage can and cannot establish."
- **The Evaluator's rules**: verbatim evidence required, recitation earns at most partial, misconceptions downgrade.
- **The doctoral grading appendix** (`lib/doctoral.ts`, `grade/route.ts`): loci required, misrepresented scholars marked wrong, derivations checked step by step. It exists; it is switched on only for 8xx.
- **The practicum** (706's anger log, 707's gated fast): a longitudinal first-person record no PhD has. It is formation, not research, but it is real.

## What a doctoral version would take

Ordered by how much each closes the gap. Each is a decision for Kyle, not a plan of work.

1. **Read like a doctoral student.** For each course, a real reading list: Long and Sedley chapters plus one article or monograph chapter a week, with page ranges, drawn from the canonical list above. The student reads them from their own copies; the corpus holds summaries so the Proctor can argue with them. This is the largest gap and needs no new software.
2. **Write and be examined on it.** One research paper per course, 6,000 to 9,000 words, submitted to a grader that reads it in full under the doctoral appendix, and handed to the viva Examiner. Make the paper and viva the course gate, not the quiz.
3. **Apply the doctoral grading everywhere**, retire multiple choice from the PHIL courses, hide reference answers until a pass, and stop retakes from becoming answer-matching.
4. **A language requirement.** Finish first-year Greek (μι-verbs, aorist passive, third declension), then graded reading of real text in volume (Epictetus, then Plato, then Diogenes Laertius VII), and an unseen sight-translation exam graded by something other than self-check. Latin to Cicero. A modern research language (German, for Frede and Pohlenz) eventually.
5. **A qualifying stage.** A Stoicism reading list (the canonical list plus primary texts), and written comprehensive exams or a portfolio of topic essays with an oral, after 701 to 707.
6. **A dissertation that means something.** A defended prospectus, a length target, chapters read in full, and a defence where the Examiner has read the text.
7. **An outside reader.** The one thing software cannot supply. A Stoic specialist reading the qualifying essays and the dissertation, even informally, is what turns a rigorous self-education into one measured against the field. SCOPE milestone 6 (a review package for a Stoic logic specialist) is already the first instance.
8. **Fix the errors above**, after checking each against an edition.

A realistic shape, if Kyle wants it: treat 701 to 707 as the coursework they are (strong undergraduate to MA), rebuild them one at a time to the 801 standard with real reading lists and papers, run the Greek in parallel, and add the qualifying stage once the courses are rebuilt. On the calibration above that is years of work for the student, which is what a PhD is.
