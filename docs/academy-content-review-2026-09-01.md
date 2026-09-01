# Arete Academy — Content Review (2026-09-01)

Agent-conducted accuracy and depth review of the student-facing Academy
materials (courses phil-701 through 707, language tracks, dashboard modules).
Full findings preserved for the correction pass.

## Headline

PHIL 703, 704, 705, 706, 707 and the four language courses are of genuinely
high scholarly quality. The accuracy problems concentrate in **PHIL 701,
PHIL 702, and the app-chrome surfaces** (morning module, library murmurs,
examQuestions, Session 1 landing cards) — exactly what a new student sees
first. Most fixes are data edits; the app's own better-sourced courses supply
the correct text in almost every case.

## Critical accuracy findings (fabricated/misattributed, some quiz-tested)

1. "You have power over your mind — not outside events" is NOT in the
   Meditations (internet paraphrase). Appears in SIX places incl. the PHIL 702
   Session 1 epigraph (cited Med. IV.3) and a seminar prompt built on it.
   Replace with Med. 8.47 or 12.22.
2. "Omnia aliena sunt, virtus propria" (phil701) is a corruption of Ep. 1.3
   ("tempus tantum nostrum est" — TIME, not virtue, is ours); quiz asks
   students to translate the fake sentence. App quotes the real line correctly
   elsewhere.
3. "Ranks of the insane" (phil702, cited Med. V.26) — apocryphal; lesson
   invents doctrine from it and quiz Q5 tests it.
4. "Every new beginning comes from some other beginning's end — Seneca"
   (library murmurs) — modern song lyric, not Seneca.
5. "Your role determines the action. But you yourself determine what role you
   play" (phil701) — INVERTS Ench. 17 ("to select the part belongs to
   another").
6. "The universe is a teacher" (phil702, cited Med. X.21) — not in Marcus;
   doctrine built on it is a modern trope; quiz-tested.
7. "arge nu logoi" (4 occurrences incl. PHIL 702 qualifying exam Q9) — not
   Greek, not a real phrase. Replace with Med. 10.16 + Disc. III.23.30.
8. ~15 wrong Meditations loci in phil702 alone (IX.42→II.1, VIII.7/IV.39→
   VIII.36, VI.2→XI.18.8, III.16→IV.3.4, VI.13→8.33, IV.7→VII.29 [contradicts
   GREK 201], X.12→XII.17, IX.30→7.49), several propagated into quizzes.
9. Ench. §8 miscited as §2, §11 as §1, Ench. 17 as Disc. 2.10, Enchiridion
   opening attributed to the Discourses (phil701) — each correct elsewhere in
   the codebase.
10. "Ethiopian phoenix" attributed to Epictetus 5x — it's Seneca Ep. 42.1 /
    later commentary tradition.
11. Stoic archer attributed to Epictetus (phil702) — it's Cicero De Fin. 3.22;
    Epictetus's image is the ball-player (Disc. II.5, correct in phil703).
12. "antistrophē" presented as Hadot's technical term — invented; quiz-tested.
13. Greek errors: "ekklinsis" misspelling + wrong pairing (hormē pairs with
    aphormē; orexis with ekklisis); "heimarmenē = providence" (it's fate;
    pronoia is providence — lexicon has it right); "amor fati" listed under
    greekTerms (it's Latin and Nietzsche's coinage); "epilogos" for conclusion
    (should be epiphora); Cleanthes' Hymn called "complete — 14 lines" (~39).
14. Doctrinal: "hēgemonikon performs seven functions" conflates eight-part
    soul with the four activities; exercise key misclassifies death/reputation
    as bare indifferents (they're apoproēgmena/proēgmena per DL VII.102-106);
    lupē defined as aversion (it's contraction of soul); prohairesis equated
    with hēgemonikon in a memorization passage; SEP Epictetus entry attributed
    to Seddon (it's Graver).

## Depth opportunities (ranked themes)

- Stoic logic as the formal spine of the discipline of assent (PHIL 705 has
  the apparatus; it's quarantined in the parallel track — bridge it into 701).
- Stoic physics unit: pneuma, tonos, tension scale, sympatheia, ekpyrōsis +
  eternal recurrence (feeds the amor fati/Nietzsche discussion honestly).
- Determinism at full strength: Lazy Argument, co-fated events, cause taxonomy.
- Oikeiōsis: name Hierocles, teach the circles + synagōgē contraction
  instruction, add the developmental argument (Cic. De Fin. 3.16-22, Ep. 121).
- Unity of the virtues + the Aristotelian contrast (PHIL 706 attacks
  metriopatheia that 701 never teaches).
- Apatheia/eupatheiai properly defined (apatheia has no lexicon entry!);
  surface the Zeno-Chrysippus dispute the lexicon currently reproduces as an
  unmarked contradiction.
- Roman vs early Greek Stoa; mark the three-discipline framework as Hadot's
  reconstruction consistently (701 hedges it, 702 asserts it).
- Stoic epistemology thread (katalēpsis, Zeno's hand, Academic objections).

## Structural gaps

- Daily Examination hardcoded to phil-701 only (examine/page.tsx COURSE_ID).
- Lexicon: 22 entries, PHIL 701-scoped, 4 dangling relatedTerms render as dead
  chips ('sophia', 'katalepsis', 'pneuma', 'episteme'); no usage
  examples/citations; authored pronunciation field never rendered.
- Drill deck: 541 language cards, zero philosophy terms (SRS is generic).
- Exercises: 40 in 701, 76 in 705, zero in 702/703/704/706/707.
- Morning module serves affirmations + "Eat Breakfast" checklist — the genre
  the courses explicitly teach against; rebuild as Med. II.1-style
  praemeditatio; add locus fields to quote arrays (would have caught the
  fabrications).
- Library module: 8/10 items are PHIL 705 logic scholarship; reading lists
  (Sellars, Hadot, Graver) disconnected from it.
- Three incompatible quiz schemas; two session-1 content sources per course
  (COURSE_CONTENT vs data files) which is how the fake Marcus quote survived
  twice; no translation named for hundreds of quotations.

## Top 10 recommendations (from the review, ranked)

1. Remove all six "You have power over your mind" instances → Med. 8.47.
2. Audit every Meditations citation in phil702 + fix dependent quiz items.
3. Delete the four fabricated doctrine-bearing quotes + their quiz questions.
4. Replace "arge nu logoi" everywhere → Med. 10.16 + Disc. III.23.30.
5. Fix Enchiridion section numbers in phil701.
6. Add missing lexicon entries, repair dangling relatedTerms, add one attested
   Greek quotation + locus per entry.
7. Extend Daily Examination beyond phil-701.
8. Add Physics and Fate unit to PHIL 701 Session 8, cross-linked to PHIL 705.
9. One-pass standardization: citation format, transliteration, translation
   attribution; fix heimarmenē gloss; move amor fati out of greekTerms.
10. Rebuild Morning module as praemeditatio; locus field on all quote arrays.
