# PHIL 801: Chrysippus' Syllogistic. Reconstruction, Evidence, Proof

Draft for Kyle's review, 2026-10-21. Nothing is built yet.

## What this course is

A doctoral research seminar. PHIL 705 taught what the Stoic logic says. PHIL 801 asks how we know: the logic survives only in fragments, hostile reports and emended manuscripts, and every modern account of it is a reconstruction. The student learns to read the evidence, to judge rival reconstructions, and to test one against the sources with formal proof. The Themata project is the course's working laboratory.

**Prerequisites:** PHIL 705 (as corrected in PR #424) and GREK 101. Short Greek passages are construed in most sessions.

**Spine:** Bobzien, "Stoic Syllogistic" (OSAP 14, 1996), held in full in research_sources. Supporting: Bobzien, "Logic" (CHHP 1999, OCR); Bobzien, "Chrysippus and the Epistemic Theory of Vagueness" (2002, full text); Bobzien, "Chrysippus' Modal Logic" and Bobzien and Shogry, "Stoic Logic and Multiple Generality" (summaries only, see Gaps). Opponents read through her notes: Frede 1974, Mates 1953, Kneale, Mueller, Mignucci, Williamson 1994.

## How it is harder than 701 to 707

- **No multiple choice.** Every session is assessed by three written pieces:
  1. a derivation set, graded for correctness step by step;
  2. a source note (300 to 500 words) on one passage, with the Greek, its manuscript or translation problems, and what it can and cannot establish;
  3. one objection and reply against a named scholar's position.
- **Graded against the texts, not a model answer.** This needs a doctoral rubric in the grader, which does not exist yet. A claim without a locus is marked down. A misrepresented scholar is marked down. An invalid step fails the derivation. Hedges are expected where the evidence is thin.
- **The final assessment is research:** a 4,000-word paper plus a viva with an examiner who has read Bobzien 1996.
- **Open problems are real.** Several sessions end on questions nobody has settled, including ones the Themata project raised.

## Sessions

1. **The evidence problem.**
   - Sources: DL VII.76 to 83, Sextus PH II and M VIII, Galen PHP and Inst. Log., Alexander and Simplicius, Apuleius, Cicero, Origen. Who reports, why, and with what bias.
   - Exercise: run the eight admission tests (ACQUISITION_PLAN Part 4) on two Themata ledger items, one strong (S001) and one weak (S018, the abridged Sorites passage).

2. **Assertibles.**
   - Truth at a time, definite, indefinite and middle assertibles, prefixed negation and hyper-negation, "Dion is dead / this one is dead".
   - Loci: DL VII.65 to 70; M 8.89 to 103; Alexander in APr. 177 to 178.
   - Greek: DL VII.69 on double negation, which the Sorites result turns on.

3. **The conditional and the other connectives.**
   - Philonian, Diodorean, Chrysippean (sunartēsis, conflict) and emphasis conditionals; exclusive disjunction.
   - Loci: PH II.110 to 112; Cicero Acad. 2.143 and Fat. 12 to 15; Gellius 16.8.
   - Debate: does using one notion of consequence for both the conditional and validity compromise the logic? (Bobzien 1999)

4. **Modal logic and the Master Argument.**
   - Philo, Diodorus and Chrysippus on the possible. Chrysippus' minimal change to Diodorus. Determinism.
   - Loci: Epictetus 2.19; DL VII.75; Boethius in Int. 234 to 235; Plutarch Stoic. Rep. 1055d to f.
   - Exercise: formalise the three definitions of possibility over a discrete time line and check which inclusions hold.

5. **Validity, invalidity, redundancy.**
   - The four ways an argument fails (disconnection, redundancy, bad form, deficiency). One-premise arguments: Chrysippus against Antipater.
   - Loci: PH 2.146 to 150, 167; M 8.429 to 434, 443.
   - Open problem: what did parelkōn mean? Themata finding F1 shows the ledger's redundancy verdicts conflict under the strict reading (S011 and S016).

6. **The indemonstrables.**
   - Accounts, modes, types; (A1) to (A5) and their 32 subtypes. Why the connectives were enough to fix these five. Why the fifth with several disjuncts does not reduce.
   - Reading: Bobzien 1996, first half.

7. **The themata: the texts.**
   - First thema: Apuleius Int. 209.
   - Third thema: Alexander in APr. 278 against Simplicius in Cael. 237.
   - Galen PHP 2.3.18 to 19 on the grouping of the themata; the synthetic theorem (Alexander in APr. 284); the dialectical theorem (M 8.231).
   - Greek: Alexander and Simplicius side by side.
   - Debate: is Bobzien's preference for Simplicius decisive?

8. **The themata: reconstructions.**
   - Frede 1974 (forward, with a contraction-type second thema); Mates and Kneale (Alexander-based); Bobzien 1996 (T1 to T4, a backward decision procedure).
   - Exercises from Bobzien 1996:
     - reduce the simple constructive dilemma;
     - analyse the two four-premise arguments in her n. 54;
     - show that "if not (p and q), r; not p; therefore r" is irreducible.

9. **Structure: relevance and connexive logic.**
   - Reflexivity and monotonicity fail. Contraction. The irreducible forms and McCall's connexive logic. Barnes' conjecture that Chrysippus anticipated relevance logic.
   - Reading: Bobzien 2019 on sequent logic, already used in PHIL 705.
   - Themata results: every fitting candidate needs contraction, none has weakening, and S016 has a Sugihara countermodel.

10. **Testing reconstructions against the evidence (the Themata laboratory).**
    - The parameter space: conditional reading, single-premise policy, contradictory, premise view, redundancy.
    - Results:
      - Origen's two conditionals (S020) forces the first thema.
      - The Sorites needs "not not p = p".
      - Asserted falsity is not negation (S008).
    - Exercises:
      - derive S020 by hand under Mates with the set view and say where contraction is used;
      - find the item that defeats the Attested candidate;
      - check the Sugihara countermodel to S016;
      - read and paraphrase the Lean statement `S020_needs_first_thema`.

11. **Beyond the syllogistic.**
    - Subsyllogistic and unmethodically concluding arguments; Barbara regimented as a Stoic argument; multiple generality and the Scope Principle; the Nobody paradox.
    - Loci: Alexander in APr. 84, 345, 373; Galen Inst. Log. 17 to 19; DL VII.70, 75, 187.

12. **Vagueness and Chrysippus' silence.**
    - Bobzien 2002 against Williamson: no epistemicism, propositions missing rather than unknowable, silence as a dialectical move, models of higher-order obscurity.
    - Loci: Cicero Acad. 2.92 to 95; M 7.416 to 421.
    - Exercise: build her models 2 and 4.

13. **Research workshop.**
    - Each student brings a paper proposal. One track is to propose a new Themata candidate (for example a T04-based family, or Bobzien's T1 to T4) and predict its row in the fit matrix before it is run.

14. **Qualifying examination (viva).**
    - The paper defended under questioning.

## What must happen before building

1. **Fix three corpus summaries.** The Bobzien reader found that:
   - The *Stoic Syllogistic* summary reverses her result: it says reflexivity and monotonicity hold and antilogism fails, but the paper says the opposite.
   - The "Cambridge Companion" rows are really CHHP 1999.
   - The CHHP part 2 summary has the 3rd to 5th indemonstrables wrong.

   The fix is to deprecate and replace these rows (Mode 2), with your go-ahead.
2. **Check Themata rule R03.** It rests on that inverted summary. The reported clash between the Themata results (contraction needed) and "Bobzien's monotonic profile" may be an artefact of the bad summary, not a real disagreement. This belongs to the Themata project, not the course; it is flagged here only.
3. **A doctoral grading rubric.** The grader and viva need a level setting, or a separate prompt for 8xx courses.
4. **The Themata material is unreviewed** (THEMATA_PROJECT.md, guardrail 5: no public claims before a specialist review). The course presents it as provisional research in progress, and the student exercises use it as such.
5. **Copyright.** Course text summarises the modern papers in our own words with short quotes only. Students read the papers themselves. The course cannot reproduce *Stoic Syllogistic*, even though we hold it.

## Gaps

- **Modal logic and multiple generality** exist only as summaries, so close reading is not possible. BOBCML.1.pdf, probably the modal logic paper, is password-protected and could not be read. An unlocked copy or a text file would fix session 4.
- **The Master Argument pages** of CHHP (pp. 86 to 92) are missing from the OCR.
- **Galen** is absent from the corpus, which matters for sessions 1 and 7.
