// LATN 201 — Reading Seneca
// Year 2 · Guided readings: the Epistulae Morales and essays in the original.
// Prerequisite: LATN 101 (the grammar is assumed; sessions review it in use).
// Each session is one short passage read completely: text, parse, doctrine.

import type { LatinSession } from './latn101';

export const LATN_201_SESSIONS: LatinSession[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Epistula 3 — Judge, Then Trust',
    subtitle: 'post amicitiam credendum est, ante amicitiam iudicandum — friendship’s two gerundives',
    objectives: [
      'Read the core of Epistula 3 with full control',
      'Parse the paired impersonal gerundives credendum est / iudicandum (est)',
      'Handle cum + indicative vs the imperatives delibera and admitte',
      'Connect the letter to PHIL 704 Session 1 (judged friendship)',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, Epistula 3 (core):\n\nTu vero omnia cum amico delibera, sed de ipso prius: post amicitiam credendum est, ante amicitiam iudicandum. … Diu cogita an tibi in amicitiam aliquis recipiendus sit. Cum placuerit fieri, toto illum pectore admitte; tam audaciter cum illo loquere quam tecum.\n\nTranslation: “Do you, truly, deliberate everything with your friend — but about the man himself, first: after friendship one must trust; before friendship, one must judge. … Think long whether someone should be received into your friendship. When it has pleased you that it happen, admit him with your whole heart; speak as boldly with him as with yourself.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'The epigram runs on two impersonal passive periphrastics (LATN 101, Session 18): credendum est — “there must be trusting” — and iudicandum (est, gapped) — “there must be judging.” No agent named: the obligations hang impersonally on the two time-phrases post amicitiam / ante amicitiam. Latin can weigh two duties against each other with nothing but gerundives and prepositions — the sentence is a balance scale.\n\nDiu cogita an … recipiendus sit — indirect question with an (“whether”) + subjunctive; recipiendus sit is the gerundive again, now personal: “whether someone is to-be-received.” Cum placuerit — cum + future perfect subjunctive-flavored placuerit (impersonal placet, Session 28): “when it has pleased (you).” Then the imperatives arrive with their adverbs: toto pectore admitte — “admit with your WHOLE heart,” ablative of manner — and the comparative correlatives tam audaciter … quam tecum: “as boldly as with yourself.”',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'You met this rule in PHIL 704 Session 1: most people invert it — instant intimacy, permanent reserve. Now watch Latin state the correction. The gerundive mood of obligation does the ethics; the prepositions do the timing. Before the threshold (ante), judgment is the standing duty; after it (post), trust is — and the two duties never overlap, which is exactly what dissolves the anxious middle state of half-trusted friends.\n\ntam … quam tecum is the letter’s hidden radicalism: the friend is defined as a second self — the standard of frankness is how you speak in your own head. Judge slowly precisely because what you are admitting someone into is your interior monologue. The whole Stoic account of friendship (Ep. 9, Session 3 of this course) is priced into that comparative.',
      },
    ],
    exercises: [
      {
        number: '1.1',
        prompt: 'Parse: 1. credendum est  2. recipiendus sit  3. placuerit  4. admitte',
        answer: '1. Impersonal passive periphrastic (gerundive of credo + est) — “one must trust.” 2. Personal gerundive of recipio + subjunctive in an indirect question — “whether he is to-be-received.” 3. Perfect subjunctive (or future-perfect-in-force) of impersonal placet in the cum-clause — “when it has pleased.” 4. Present imperative of admitto — “admit!”',
      },
      {
        number: '1.2',
        prompt: 'How does the sentence weigh the two duties without ever naming an agent?',
        answer: 'Two impersonal gerundives (credendum / iudicandum) hang on two time-prepositions (post / ante amicitiam). Obligation is stated impersonally — as the situation’s demand — and the timing alone distributes the duties. The grammar is a balance scale: same construction both pans, opposite times.',
      },
      {
        number: '1.3',
        prompt: 'Translate tam audaciter cum illo loquere quam tecum and unpack the correlatives.',
        answer: '“Speak as boldly with him as with yourself.” tam … quam — correlative “as … as”; loquere is the deponent imperative of loquor (Session 16 form!). The friend’s standard of frankness is the interior monologue — the friend as second self.',
      },
      {
        number: '1.4',
        prompt: 'Doctrine: what “anxious middle state” does the ante/post rule dissolve, and how?',
        answer: 'The half-trusted friend — intimacy extended while reserve is retained, which is the common inversion (instant closeness, permanent suspicion). By making judgment the exclusive duty BEFORE the threshold and trust the exclusive duty AFTER, the rule leaves no state in which both are owed at once: deliberation ends at admission, and trust after admission is total (toto pectore).',
      },
    ],
    quiz: [
      { question: 'credendum est is:', options: ['A future indicative', 'An impersonal passive periphrastic — “one must trust”', 'A perfect passive', 'An infinitive'], correct: 1 },
      { question: 'The two duties are distributed by:', options: ['Agent nouns', 'The time-prepositions ante and post with amicitiam', 'Verb tense alone', 'Word order alone'], correct: 1 },
      { question: 'an … recipiendus sit is:', options: ['A purpose clause', 'An indirect question with the gerundive — “whether he should be received”', 'A result clause', 'A condition'], correct: 1 },
      { question: 'loquere (in tam audaciter … loquere) is:', options: ['An infinitive', 'The deponent imperative of loquor — “speak!”', 'A future', 'A participle'], correct: 1 },
      { question: 'toto pectore is:', options: ['Genitive of quality', 'Ablative of manner — “with your whole heart”', 'Dative of interest', 'Accusative of respect'], correct: 1 },
      { question: 'tam … quam expresses:', options: ['“So great … that”', '“As … as” — correlative comparison', '“Both … and”', '“Not only … but also”'], correct: 1 },
      { question: 'The friend’s standard of frankness is:', options: ['Public speech', 'How you speak with yourself — the friend as second self', 'Court oratory', 'Silence'], correct: 1 },
      { question: 'The common inversion the letter corrects:', options: ['Trusting before judging — instant intimacy with permanent reserve', 'Judging after trusting', 'Having no friends', 'Writing letters instead of visiting'], correct: 0 },
    ],
    vocabulary: [
      { latin: 'deliberare', pronunciation: 'de-li-be-RA-re', english: 'to deliberate, weigh (1st conj.)' },
      { latin: 'credere', pronunciation: 'KRE-de-re', english: 'to trust, believe (3rd conj., + dat.)' },
      { latin: 'iudicare', pronunciation: 'yu-di-KA-re', english: 'to judge (1st conj.)' },
      { latin: 'amicitia, amicitiae', pronunciation: 'a-mi-KI-ti-a', english: 'friendship (f.)' },
      { latin: 'pectus, pectoris', pronunciation: 'PEK-tus', english: 'breast, heart (n.)' },
      { latin: 'audaciter', pronunciation: 'ow-DA-ki-ter', english: 'boldly (adverb)' },
    ],
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'Epistula 7 — The Crowd',
    subtitle: 'recede in te ipse quantum potes — contagion, teaching, and the two exceptions',
    objectives: [
      'Read the counsel of Epistula 7 in the original',
      'Parse dum + present indicative (“while” of simultaneous process)',
      'Handle quantum potes and the reflexive command recede in te ipse',
      'Read the closing chiasm: homines dum docent discunt',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, Epistula 7 (selections):\n\nQuid tibi vitandum praecipue existimes quaeris? turbam. … Unum exemplum luxuriae aut avaritiae multum mali facit. … Recede in te ipse quantum potes; cum his versare qui te meliorem facturi sunt, illos admitte quos tu potes facere meliores. Mutuo ista fiunt, et homines dum docent discunt.\n\nTranslation: “You ask what you should reckon most to be avoided? A crowd. … A single example of luxury or greed does much harm. … Retreat into yourself as much as you can; associate with those who will make you better; admit those whom you can make better. These things happen mutually — and men, while they teach, learn.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Quid tibi vitandum … existimes — the gerundive again (vitandum, “to-be-avoided”) inside an indirect question after quaeris. The answer is one accusative, delivered like a verdict: turbam. Unum exemplum … multum mali facit — multum + partitive genitive mali: “much OF harm” — the accounting idiom for contagion’s price.\n\nRecede in te ipse — imperative + the intensive ipse agreeing with the SUBJECT (“you yourself retreat into yourself”): Latin marks that both the retreater and the destination are you. quantum potes — “as much as you can”: the calibration clause — Seneca’s withdrawal is always measured, never absolute (De Tranquillitate, PHIL 704 Session 7). cum his versare qui … facturi sunt — versare is the deponent imperative of versor (“associate with”); facturi sunt is the ACTIVE periphrastic (future participle + sum): “who are GOING TO make you better” — selection by trajectory, not by present state.\n\nThe close: mutuo ista fiunt — “these things happen mutually” — and the chiasm homines dum docent discunt: dum + present indicative, “while,” with the two verbs docent/discunt differing by two letters. Teaching and learning share a root-rhyme in Latin; the aphorism is untranslatably tight.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'Ep. 7 is the contagion doctrine of PHIL 704 Session 2 (the gladiator games — “I return more cruel”), and its grammar encodes the two-way traffic of character. The company rule has two clauses with mirrored structures: those who WILL make you better (active periphrastic — their effect on you lies in the future), those whom you CAN make better (potes — your present capacity toward them). Formation is inevitable; the only choice is the roster.\n\nAnd dum docent discunt seals the mutuality: the teacher is inside the lesson. This line is the Academy’s own license — every Proctor session, every seminar, every explanation you give of Stoicism to a friend is covered by it. quantum potes, meanwhile, is the mercy in the counsel: total retreat is not demanded, only as-much-as-you-can — the same calibrated engagement Seneca will prescribe to Serenus. The Stoics never ask for the desert; they ask for curated company.',
      },
    ],
    exercises: [
      {
        number: '2.1',
        prompt: 'Parse: 1. vitandum (in quid tibi vitandum)  2. versare  3. facturi sunt  4. discunt',
        answer: '1. Gerundive of vito with (tibi) — “to-be-avoided (by you)” in an indirect question. 2. Deponent imperative of versor — “associate (with)!” 3. Active periphrastic (future active participle + sum) — “are going to make.” 4. Present indicative 3rd pl. of disco — “they learn,” with dum: “while they teach.”',
      },
      {
        number: '2.2',
        prompt: 'What does multum mali illustrate grammatically, and what is the doctrine inside the idiom?',
        answer: 'multum + partitive genitive — “much OF harm.” The idiom quantifies contagion: a single exemplum of vice is priced in harm-quantity. Character exposure is an accounting matter — the same financial register as the time-audit letters.',
      },
      {
        number: '2.3',
        prompt: 'Explain the mirrored company rule: qui te meliorem facturi sunt / quos tu potes facere meliores.',
        answer: 'Clause one selects by their future effect on you (active periphrastic — trajectory); clause two by your present capacity toward them (potes + infinitive). Choose companions who will improve you and admit those you can improve — formation flows both directions, so the roster is chosen on both axes.',
      },
      {
        number: '2.4',
        prompt: 'Doctrine: why is quantum potes essential to the command recede in te ipse?',
        answer: 'It calibrates the withdrawal: “as much as you can” — not the desert, not misanthropy, but measured retreat while character sets (wet concrete, PHIL 704 S2). The same clause reappears as De Tranquillitate’s calibrated engagement: usefulness at your actual strength. Stoic solitude is a dosage, not an absolute.',
      },
    ],
    quiz: [
      { question: 'What should be avoided most, per Ep. 7?', options: ['Poverty', 'The crowd (turbam)', 'Travel', 'Books'], correct: 1 },
      { question: 'multum mali is:', options: ['Two accusatives', 'multum + partitive genitive — “much of harm”', 'An ablative absolute', 'A vocative'], correct: 1 },
      { question: 'dum + present indicative means:', options: ['“Until”', '“While” — simultaneous process', '“Because”', '“Although”'], correct: 1 },
      { question: 'facturi sunt is:', options: ['Perfect passive', 'Active periphrastic — “are going to make”', 'Gerundive of obligation', 'Imperfect'], correct: 1 },
      { question: 'versare here is:', options: ['An infinitive', 'The deponent imperative of versor — “associate with”', 'A noun', 'A supine'], correct: 1 },
      { question: 'quantum potes calibrates:', options: ['Reading speed', 'The withdrawal — as much as you can, never absolute', 'Wealth', 'Prayer'], correct: 1 },
      { question: 'homines dum docent discunt claims:', options: ['Teachers know everything', 'Teaching and learning are mutual — the teacher is inside the lesson', 'Learning requires crowds', 'Students should not teach'], correct: 1 },
      { question: 'The company rule selects companions on:', options: ['Wealth and rank', 'Both axes: their future effect on you, and your present capacity toward them', 'Age', 'Nationality'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'turba, turbae', pronunciation: 'TUR-ba', english: 'crowd, mob (f.)' },
      { latin: 'vitare', pronunciation: 'wi-TA-re', english: 'to avoid (1st conj.)' },
      { latin: 'exemplum, exempli', pronunciation: 'ek-SEM-plum', english: 'example (n.)' },
      { latin: 'versari', pronunciation: 'wer-SA-ri', english: 'to associate with, be engaged among (deponent)' },
      { latin: 'docere', pronunciation: 'do-KE-re', english: 'to teach (2nd conj.)' },
      { latin: 'discere', pronunciation: 'DIS-ke-re', english: 'to learn (3rd conj.)' },
    ],
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Epistula 9 — Si Vis Amari, Ama',
    subtitle: 'the sage, the friend, and the shortest recipe in Latin',
    objectives: [
      'Read the core of Epistula 9',
      'Parse the passive infinitive amari against the bare imperative ama',
      'Handle etiamsi (concessive) and the sapiens/friendship paradox',
      'State what the sage wants friends FOR (ut habeat cui…)',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, Epistula 9 (selections):\n\nHecaton ait: ‘ego tibi monstrabo amatorium sine medicamento, sine herba, sine ullius veneficae carmine: si vis amari, ama.’ … Sapiens etiam si contentus est se, tamen habere amicum vult, si nihil aliud, ut exerceat amicitiam, ne tam magna virtus iaceat …\n\nTranslation: “Hecato says: ‘I will show you a love-charm without drug, without herb, without any witch’s incantation: if you wish to be loved, love.’ … The wise man, even if he is content with himself, nevertheless wants to have a friend — if for nothing else, to exercise friendship, that so great a virtue not lie idle …”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'The charm: si vis amari, ama — simple present condition (LATN 101, Session 27), four words. vis — irregular 2nd sg. of volo; amari — PRESENT PASSIVE INFINITIVE, “to be loved”; ama — bare present imperative. The voices carry the teaching: you want the passive (to be loved, something done to you); the recipe is the active (love, something you do). The passive is purchased only in the active voice.\n\nThe paradox: Sapiens etiam si contentus est se — etiam si (“even if”) + indicative, a concessive condition granting the self-sufficiency for argument’s sake; contentus + ablative se — “content WITH himself.” tamen — “nevertheless,” the concessive’s answering particle. habere amicum vult — “wants to have a friend.” The purpose: ut exerceat amicitiam — ut + subjunctive of purpose — “in order to EXERCISE friendship” — and the negative purpose ne … iaceat: “lest so great a virtue LIE IDLE” (iaceo, to lie flat, unused).',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'PHIL 704 Session 2 gave you the doctrine: the sage needs no friend but wants friends, as virtue’s field of exercise. The Latin shows the machinery. etiam si … tamen is the concessive frame that grants the objector everything — yes, self-sufficient — and still derives friendship, because the want is grounded not in lack (need) but in function (exercise). ut exerceat: friendship is a virtue with a workout requirement; unexercised, it iaceat — lies flat, like unused muscle.\n\nAnd Hecato’s charm is the whole ethics of relation in one condition. All the technologies of being loved — drugs, herbs, incantations, and their modern successors — are rejected in three sine-phrases; what remains is voice-conversion: stop seeking the passive, perform the active. Every anxious question about whether one is loved is answered by the imperative’s grammar: the only mood that was ever in your power.',
      },
    ],
    exercises: [
      {
        number: '3.1',
        prompt: 'Parse: 1. vis  2. amari  3. exerceat  4. iaceat',
        answer: '1. Irregular present 2nd sg. of volo — “you wish.” 2. Present passive infinitive of amo — “to be loved.” 3. Present subjunctive of exerceo in an ut-purpose clause — “that he may exercise.” 4. Present subjunctive of iaceo in a ne-purpose clause — “lest it lie idle.”',
      },
      {
        number: '3.2',
        prompt: 'How do the voices of amari and ama carry the teaching of Hecato’s charm?',
        answer: 'The wish is passive (amari — to be loved: something done to you, not in your power); the recipe is active (ama — love: fully in your power). The charm converts an uncontrollable passive desire into a controllable active practice — the dichotomy of control performed in two verb forms.',
      },
      {
        number: '3.3',
        prompt: 'Explain the concessive frame etiam si … tamen and what it concedes.',
        answer: 'etiam si + indicative concedes the objection as fact — “even if the sage IS content with himself” — and tamen answers it: he still wants friends. The concession isolates the true ground of Stoic friendship: not lack (which self-sufficiency removes) but function (which it does not).',
      },
      {
        number: '3.4',
        prompt: 'Doctrine: what does ne tam magna virtus iaceat claim about friendship?',
        answer: 'Friendship is a virtue that requires a field of exercise; without a friend it “lies idle” like unused capacity. The sage wants friends the way an athlete wants a track — not to fill a deficit but to perform an excellence. Want without need: love made reliable because it leans on nothing (PHIL 704 S2).',
      },
    ],
    quiz: [
      { question: 'si vis amari, ama is what type of condition?', options: ['Future less vivid', 'Simple present — stated as plain fact', 'Contrary-to-fact', 'General temporal'], correct: 1 },
      { question: 'amari is:', options: ['Present active infinitive', 'Present passive infinitive — “to be loved”', 'Imperative', 'Deponent'], correct: 1 },
      { question: 'The three sine-phrases reject:', options: ['Friendship itself', 'The technologies of being loved — drug, herb, incantation', 'Marriage', 'The gods'], correct: 1 },
      { question: 'etiam si + indicative is:', options: ['A purpose clause', 'A concessive condition — “even if (granting it as fact)”', 'An indirect question', 'A result clause'], correct: 1 },
      { question: 'contentus takes which case?', options: ['Genitive', 'Ablative — contentus se, “content with himself”', 'Dative', 'Accusative'], correct: 1 },
      { question: 'ut exerceat amicitiam is:', options: ['Result', 'Purpose — “in order to exercise friendship”', 'Indirect command', 'Fear clause'], correct: 1 },
      { question: 'iaceat (of virtue) means:', options: ['“It attacks”', '“It lies idle/flat” — unexercised capacity', '“It rejoices”', '“It is thrown”'], correct: 1 },
      { question: 'The sage wants friends because:', options: ['He is secretly needy', 'Friendship is an excellence requiring a field of exercise — want without need', 'The law requires it', 'Solitude is forbidden'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'monstrare', pronunciation: 'mon-STRA-re', english: 'to show, point out (1st conj.)' },
      { latin: 'amatorium, -i', pronunciation: 'a-ma-TO-ri-um', english: 'love-charm (n.)' },
      { latin: 'contentus, -a, -um', pronunciation: 'kon-TEN-tus', english: 'content (with, + abl.)' },
      { latin: 'exercere', pronunciation: 'ek-ser-KE-re', english: 'to exercise, train (2nd conj.)' },
      { latin: 'iacere', pronunciation: 'ya-KE-re', english: 'to lie (flat), lie idle (2nd conj.)' },
      { latin: 'etiamsi', pronunciation: 'e-ti-am-SEE', english: 'even if (concessive)' },
    ],
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Epistula 12 — The Complete Day',
    subtitle: 'unus dies par omni est — old age, Pacuvius, and Vergil’s vixi',
    objectives: [
      'Read the close of Epistula 12',
      'Parse par + dative and the gradus aetatis (steps of life) image',
      'Handle the quoted Vergil line: vixi et quem dederat cursum fortuna peregi',
      'Read the daily “I have lived” as the perfect tense made practice',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, Epistula 12 (close):\n\nIta dico: unus dies par omni est. … Ideo sic ordinandus est dies omnis tamquam cogat agmen et consummet atque expleat vitam. … Qui cotidie dicit ‘vixi’, cum somno surgit ad lucrum. Vergilius noster: ‘Vixi et quem dederat cursum fortuna peregi.’\n\nTranslation: “I say this: one day is equal to every day. … Therefore every day must be ordered as if it closed the column — as if it completed and filled up a life. … He who says daily ‘I have lived’ rises with the next sleep to profit. Our Vergil: ‘I have lived, and the course fortune gave I have completed.’”\n\n(Note: Seneca is quoting Dido’s last words, Aeneid IV.653, and converting a death-speech into a nightly practice.)',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'unus dies par omni est — par (“equal”) governs the DATIVE: “equal to every (day)” — with the 5th declension dies you drilled in LATN 101 Session 21. ordinandus est — the gerundive of obligation, personal: “every day must be ordered.” tamquam cogat agmen — tamquam (“as if”) + subjunctive: the military image — the day as the rearguard that “closes the column” (cogere agmen, the technical phrase for bringing up the rear). consummet atque expleat — two more subjunctives under tamquam: “as if it completed and filled up” a life.\n\nQui cotidie dicit ‘vixi’ — the generalizing relative (LATN 101, Session 25): “whoever daily says ‘I have lived.’” vixi — perfect of vivo, one word, the whole doctrine. cum somno surgit ad lucrum — “rises with sleep to PROFIT”: tomorrow reclassified as lucrum, windfall — the financial register once more.\n\nThe Vergil: Vixi et quem dederat cursum fortuna peregi. Note the relative clause with its antecedent drawn IN: quem dederat cursum fortuna = cursum quem fortuna dederat — “the course which fortune had given” (dederat, pluperfect); peregi — perfect of perago, “I have completed.” Two perfects and one pluperfect: gift (completed earlier), run (completed now), nothing left owed.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'This is the completeness doctrine — Ep. 77’s vita non est imperfecta si honesta est, XII.36’s ἐπολιτεύσω — at the scale of a single day. The gerundive ordinandus makes the day’s completeness a duty, not a mood; the tamquam-subjunctives supply the rehearsal frame (as if it were the last — the meditatio without morbidity); and vixi is the practice itself: one perfect-tense verb, said nightly, that converts the day from an installment into a whole.\n\nSeneca’s theft from Vergil is the boldest move in the letter. Dido speaks the line as she dies, and it is tragedy; said nightly by the practitioner, the same Latin is victory. Nothing changes but the frequency. The pluperfect dederat concedes that the course was assigned, not chosen — fortune gave it — and peregi claims the only thing that was ever yours: the running. Assigned course, completed running, daily settlement: the whole Stoic account of a life, quoted from an epic about everything going wrong.',
      },
    ],
    exercises: [
      {
        number: '4.1',
        prompt: 'Parse: 1. par omni  2. ordinandus est  3. cogat  4. peregi',
        answer: '1. par + dative omni (die) — “equal to every (day).” 2. Personal gerundive of ordino + est — “must be ordered.” 3. Present subjunctive of cogo under tamquam — “as if it closed (the column).” 4. Perfect of perago — “I have completed.”',
      },
      {
        number: '4.2',
        prompt: 'Untangle quem dederat cursum fortuna and restate it in standard order.',
        answer: 'cursum quem fortuna dederat — “the course which fortune had given.” The antecedent cursum is drawn inside the relative clause (a common poetic order). dederat is pluperfect: the giving was completed before the running now completed by peregi.',
      },
      {
        number: '4.3',
        prompt: 'What does tamquam + subjunctive contribute, and how does it guard against morbidity?',
        answer: '“AS IF it closed the column / completed a life” — the subjunctives mark rehearsal, not assertion: the day is ordered as-if-last without claiming it is last. The frame delivers the meditatio’s benefits (urgency, completeness) while remaining a daily discipline rather than a prediction.',
      },
      {
        number: '4.4',
        prompt: 'Doctrine: why does the same line be tragedy in Dido’s mouth and victory in the practitioner’s?',
        answer: 'Dido says vixi once, at death — completeness arrives only at the end, as loss. The practitioner says it nightly — completeness is manufactured daily, and each tomorrow becomes lucrum, unowed profit. Nothing changes but the frequency: the perfect tense, repeated, converts a death-speech into the engine of the complete day.',
      },
    ],
    quiz: [
      { question: 'par governs which case?', options: ['Genitive', 'Dative — par omni, “equal to every”', 'Accusative', 'Ablative'], correct: 1 },
      { question: 'ordinandus est is:', options: ['Perfect passive', 'Personal gerundive of obligation — “must be ordered”', 'Future active', 'Deponent'], correct: 1 },
      { question: 'cogere agmen means:', options: ['“To gather crops”', '“To close the column” — bring up the rear (military)', '“To force a friend”', '“To think deeply”'], correct: 1 },
      { question: 'tamquam + subjunctive expresses:', options: ['Fact', '“As if” — rehearsal/comparison, not assertion', 'Purpose', 'Fear'], correct: 1 },
      { question: 'vixi is:', options: ['Present of vivo', 'Perfect of vivo — “I have lived”', 'Future', 'Imperative'], correct: 1 },
      { question: 'Tomorrow, for the man who says vixi, is:', options: ['A debt', 'lucrum — profit, unowed windfall', 'A punishment', 'An illusion'], correct: 1 },
      { question: 'The Vergil line is originally spoken by:', options: ['Aeneas at Troy', 'Dido at her death (Aeneid IV.653)', 'Anchises in the underworld', 'Turnus'], correct: 1 },
      { question: 'dederat … peregi together claim:', options: ['Fortune owes more', 'The course was assigned (pluperfect), the running completed (perfect) — nothing left owed', 'Life is unfinished', 'The gods must decide'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'par (+ dat.)', pronunciation: 'PAR', english: 'equal (to)' },
      { latin: 'ordinare', pronunciation: 'or-di-NA-re', english: 'to order, arrange (1st conj.)' },
      { latin: 'consummare', pronunciation: 'kon-sum-MA-re', english: 'to complete, sum up (1st conj.)' },
      { latin: 'lucrum, lucri', pronunciation: 'LU-krum', english: 'profit, gain (n.)' },
      { latin: 'cursus, cursus', pronunciation: 'KUR-sus', english: 'course, running (m., 4th decl.)' },
      { latin: 'peragere', pronunciation: 'per-A-ge-re', english: 'to complete, carry through (3rd conj.)' },
    ],
  },

  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Milestone I — De Providentia: The Athlete of God',
    subtitle: 'marcet sine adversario virtus — adversity’s grammar, read whole',
    isMilestone: true,
    objectives: [
      'Read the core sentences of De Providentia 2 with full control',
      'Parse marcet sine adversario and the gold/fire sentence',
      'Handle calamitas virtutis occasio est as a definition by genitive',
      'Recite ignis aurum probat, miseria fortes viros from memory',
    ],
    parts: [
      {
        heading: 'Part 1 — The Texts',
        body: 'Seneca, De Providentia (selections from ch. 2–4):\n\nMarcet sine adversario virtus: tunc apparet quanta sit quantumque polleat, cum quid possit patientia ostendit.\n\n“Virtue withers without an adversary: then it appears how great it is and how much it avails, when it shows by endurance what it can do.”\n\nIgnis aurum probat, miseria fortes viros.\n\n“Fire tests gold; misery, brave men.”\n\nCalamitas virtutis occasio est.\n\n“Calamity is virtue’s opportunity.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Marcet sine adversario virtus — marceo, “to wither, droop” (of plants and unused muscles); sine + ablative; subject held to the end: VIRTUS withers. Then the indirect questions: quanta sit quantumque polleat — “how great it is and how much it avails” — subjunctives after apparet (LATN 101, Session 28); and cum … ostendit with the indirect question quid possit — “when it shows what it CAN do” — patientia as ablative of means: BY endurance.\n\nIgnis aurum probat, miseria fortes viros — the most compressed sentence in the course. Full first clause: subject, object, verb. Second clause: subject and object only — probat is gapped (LATN 101 met gapping in non refert quam multos…). The ellipsis forces the parallel: as fire is to gold, misery is to brave men — the test, not the destroyer.\n\nCalamitas virtutis occasio est — a definition by genitive: calamity IS virtue’s occasio — its opportunity, its opening. Three nominatives-and-a-genitive; no verb but est; a complete theodicy in four words.',
      },
      {
        heading: 'Part 3 — Why This Is the Milestone',
        body: 'You studied De Providentia in translation in PHIL 704 Session 8; these are its load-bearing sentences in the original, and each is built to be carried. Note the shared architecture: all three are gnomic presents — the tense of standing truths — and all three run on the vocabulary of testing (probat, patientia, occasio) rather than punishment. The Latin never says suffering is good; it says suffering is diagnostic and vocational: the fire that proves, the adversary that keeps virtue from withering, the calamity that is an opening.\n\nmarcet deserves special attention: it is a botanical verb. Untested virtue doesn’t fail — it wilts, like a plant without weather. The Stoic case for adversity is not machismo; it is horticulture. Memorize all three sentences; they are the pocket liturgy for bad days, and they pair with the Greek you memorized in GREK 201 (Ench §5, §53) as the two-language kit the Academy has been building toward.',
      },
    ],
    exercises: [
      {
        number: '5.1',
        prompt: 'Unaided translation — translate all three texts without notes.',
        answer: 'See Part 1: “Virtue withers without an adversary: then it appears how great it is and how much it avails, when it shows by endurance what it can do.” / “Fire tests gold; misery, brave men.” / “Calamity is virtue’s opportunity.”',
      },
      {
        number: '5.2',
        prompt: 'Parse: 1. marcet  2. quanta sit  3. polleat  4. probat (and its gapping)',
        answer: '1. Present of marceo — “withers” (botanical: wilts). 2. Indirect question after apparet, subjunctive — “how great it is.” 3. Present subjunctive of polleo in the same indirect question — “how much it avails.” 4. Present of probo — “tests”; gapped in the second clause (miseria fortes viros [probat]), forcing the fire:gold :: misery:brave-men parallel.',
      },
      {
        number: '5.3',
        prompt: 'Explain the genitive in calamitas virtutis occasio est.',
        answer: 'virtutis is possessive/objective genitive with occasio: calamity is “virtue’s opportunity” — the opening THAT BELONGS TO virtue, the occasion FOR its exercise. A four-word definition converting disaster from obstacle to venue — De Providentia’s whole answer in one genitive.',
      },
      {
        number: '5.4',
        prompt: 'Milestone: why does Seneca use a botanical verb (marcet) rather than a martial one for untested virtue?',
        answer: 'Untested virtue does not lose a battle — it wilts, like a plant deprived of weather. marceo makes adversity nourishment rather than enemy: the case for hardship is horticultural, not macho. The adversary is to virtue what wind is to root systems — the resistance that occasions strength. This reframing is the essay’s deepest move, and the verb carries it alone.',
      },
    ],
    quiz: [
      { question: 'marcet means:', options: ['“Fights”', '“Withers, droops” — a botanical verb', '“Marches”', '“Grows”'], correct: 1 },
      { question: 'sine adversario is:', options: ['Genitive of quality', 'sine + ablative — “without an adversary”', 'Dative of interest', 'Accusative of respect'], correct: 1 },
      { question: 'quanta sit quantumque polleat are:', options: ['Result clauses', 'Indirect questions with the subjunctive after apparet', 'Purpose clauses', 'Conditions'], correct: 1 },
      { question: 'patientia in cum quid possit patientia ostendit is:', options: ['Nominative subject', 'Ablative of means — “BY endurance”', 'Vocative', 'Genitive'], correct: 1 },
      { question: 'What is gapped in miseria fortes viros?', options: ['The subject', 'The verb probat — forcing the fire:gold parallel', 'The object', 'Nothing'], correct: 1 },
      { question: 'calamitas virtutis occasio est defines calamity as:', options: ['Virtue’s punishment', 'Virtue’s opportunity — the occasion for its exercise', 'Virtue’s enemy', 'Virtue’s reward'], correct: 1 },
      { question: 'All three sentences share which tense, and why?', options: ['Perfect — completed events', 'Gnomic present — the tense of standing truths', 'Future — predictions', 'Imperfect — stories'], correct: 1 },
      { question: 'The essay’s vocabulary frames suffering as:', options: ['Punishment for sin', 'Diagnostic and vocational — testing, endurance, opportunity', 'Meaningless chance', 'Divine cruelty'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'marcere', pronunciation: 'mar-KE-re', english: 'to wither, droop (2nd conj.)' },
      { latin: 'adversarius, -i', pronunciation: 'ad-wer-SA-ri-us', english: 'adversary, opponent (m.)' },
      { latin: 'pollere', pronunciation: 'pol-LE-re', english: 'to be strong, avail (2nd conj.)' },
      { latin: 'probare', pronunciation: 'pro-BA-re', english: 'to test, prove (1st conj.)' },
      { latin: 'miseria, -ae', pronunciation: 'mi-SE-ri-a', english: 'misery, hardship (f.)' },
      { latin: 'occasio, occasionis', pronunciation: 'ok-KA-si-o', english: 'opportunity, occasion (f.)' },
    ],
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'De Vita Beata 17 — Non Sum Sapiens',
    subtitle: 'the hypocrite’s defense, in the defendant’s own Latin',
    objectives: [
      'Read the pivot of De Vita Beata 17 in the original',
      'Parse ut + subjunctive of purpose in ut malivolentiam tuam pascam',
      'Handle exigite … ut with the jussive subjunctive sequence',
      'Read satis est with the accusative-infinitive of daily progress',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, De Vita Beata 17 (the defense’s pivot):\n\nNon sum sapiens et, ut malivolentiam tuam pascam, nec ero. Exige itaque a me, non ut optimis par sim, sed ut malis melior: hoc mihi satis est, cotidie aliquid ex vitiis meis demere et errores meos obiurgare.\n\nTranslation: “I am not a wise man and — to feed your malevolence — I never shall be. Demand of me, then, not that I be equal to the best, but that I be better than the bad: this is enough for me — daily to subtract something from my vices and to rebuke my errors.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Non sum sapiens — the flattest possible Latin: negative, copula, predicate. Then the parenthesis: ut malivolentiam tuam pascam — ut + subjunctive of purpose, mid-sentence, with pasco (“to feed, pasture”): “in order to feed your malevolence.” The sarcasm is grammatical — a purpose clause whose stated purpose is nourishing the critic’s spite. nec ero — “nor shall I be”: future of sum, closing the concession with a door-slam.\n\nExige … a me, non ut … sim, sed ut … melior (sim) — exigo + ut + subjunctive: “demand of me that…” — the indirect command (LATN 101, Session 13), doubled with non … sed: not par optimis (equal to the best — par + dative again, Session 4), but malis melior — “better than the bad,” ablative of comparison (Session 23). The whole standard-setting is done by two cases: dative for the impossible peer group, ablative for the possible one.\n\nhoc mihi satis est — “this is enough for me,” with the epexegetic infinitives spelling out hoc: demere — “to subtract” — cotidie aliquid ex vitiis meis (the daily audit again, now of vices), and obiurgare — “to rebuke” — errores meos. Progress as arithmetic: daily subtraction, plus supervision of oneself.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'PHIL 704 Session 9 examined this defense at essay length; here is its hinge in the original. Everything the prosecution demands is in the subjunctive (ut … sim — that I BE equal to the best): the mood of the unreal standard. Everything Seneca offers is in the infinitive (demere, obiurgare): the mood of actual, performable acts. The defense is a mood-shift — from being (a state he disclaims) to doing (a practice he documents).\n\nnec ero is the shocker, and it must not be softened in translation: not “I may never be” but “I never SHALL be” — the future indicative, certain. Seneca forecloses sagehood on purpose: a teacher who claims the summit invites the audit; one who claims only the daily subtraction can be audited and pass. And note that the standard he accepts — malis melior — is comparative, not superlative: the whole program of the prokoptōn (PHIL 701) is grammatically a comparative adjective. Progress has a case and a degree; perfection has neither.',
      },
    ],
    exercises: [
      {
        number: '6.1',
        prompt: 'Parse: 1. pascam  2. nec ero  3. sim (in ut … sim)  4. demere',
        answer: '1. Present subjunctive of pasco in a purpose clause — “that I may feed (your malevolence).” 2. Future of sum, negated by nec — “nor shall I be.” 3. Present subjunctive of sum in an indirect command after exige … ut. 4. Present infinitive of demo, epexegetic with hoc satis est — “to subtract.”',
      },
      {
        number: '6.2',
        prompt: 'Contrast the two standards grammatically: par optimis vs malis melior.',
        answer: 'par optimis — “equal TO the best”: par + dative, the impossible peer group. malis melior — “better THAN the bad”: comparative + ablative of comparison, the possible one. The rejected standard is equality with a superlative class; the accepted one is a comparative over a low baseline — the prokoptōn’s program in two case constructions.',
      },
      {
        number: '6.3',
        prompt: 'What is sarcastic about ut malivolentiam tuam pascam, grammatically?',
        answer: 'It is a formally correct purpose clause — “in order to feed your malevolence” — whose declared purpose is nourishing the critic’s spite. Seneca gifts the prosecution its verdict inside the machinery of intention: the concession (nec ero) is framed as a favor to the ill-willed. The grammar is polite; the content is a slap.',
      },
      {
        number: '6.4',
        prompt: 'Doctrine: why does the defense shift from subjunctive (being) to infinitive (doing)?',
        answer: 'The demanded standard — ut optimis par sim — lives in the subjunctive, the mood of the unrealized. Seneca’s counter-offer — demere, obiurgare — lives in the infinitive, naming performable daily acts. He disclaims a state and documents a practice: teaching authority grounded not in achieved wisdom but in auditable daily subtraction from vice (the ‘patient who has read the chart’, PHIL 704 S9).',
      },
    ],
    quiz: [
      { question: 'nec ero means:', options: ['“Nor was I”', '“Nor shall I be” — future indicative, certain', '“Nor would I be”', '“Nor am I”'], correct: 1 },
      { question: 'ut malivolentiam tuam pascam is:', options: ['A result clause', 'A purpose clause — sarcastically “feeding” the critic’s spite', 'An indirect question', 'A fear clause'], correct: 1 },
      { question: 'par optimis uses which case?', options: ['Ablative', 'Dative — “equal TO the best”', 'Genitive', 'Accusative'], correct: 1 },
      { question: 'malis in malis melior is:', options: ['Dative', 'Ablative of comparison — “better THAN the bad”', 'Genitive plural', 'Vocative'], correct: 1 },
      { question: 'exige … ut … sim is:', options: ['A condition', 'An indirect command — “demand that I be…”', 'A relative clause', 'A gerundive'], correct: 1 },
      { question: 'The infinitives demere and obiurgare spell out:', options: ['The critic’s demands', 'hoc — what “is enough”: daily subtraction from vice and rebuke of errors', 'Fortune’s gifts', 'The sage’s perfection'], correct: 1 },
      { question: 'Why does Seneca foreclose sagehood with nec ero?', options: ['False modesty', 'A teacher claiming only auditable daily practice can be audited and pass; the summit-claimer invites ruin', 'He was retiring', 'The grammar requires it'], correct: 1 },
      { question: 'The prokoptōn’s program appears grammatically as:', options: ['A superlative', 'A comparative (melior) over a low baseline — progress has a degree', 'An imperative', 'A pluperfect'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'malivolentia, -ae', pronunciation: 'ma-li-wo-LEN-ti-a', english: 'malevolence, ill-will (f.)' },
      { latin: 'pascere', pronunciation: 'PAS-ke-re', english: 'to feed, pasture (3rd conj.)' },
      { latin: 'exigere', pronunciation: 'ek-SI-ge-re', english: 'to demand, exact (3rd conj.)' },
      { latin: 'demere', pronunciation: 'DE-me-re', english: 'to subtract, take away (3rd conj.)' },
      { latin: 'obiurgare', pronunciation: 'ob-yur-GA-re', english: 'to rebuke, chide (1st conj.)' },
      { latin: 'vitium, vitii', pronunciation: 'WI-ti-um', english: 'vice, fault (n.)' },
    ],
  },

  // ── SESSION 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'De Brevitate 2 — Life vs Time',
    subtitle: 'exigua pars est vitae qua vivimus — the distinction that runs the essay',
    objectives: [
      'Read the central distinction of De Brevitate Vitae 2',
      'Parse the relative qua (ablative of time/means) in qua vivimus',
      'Handle the predicate structure non vita sed tempus',
      'Deploy the vivere/esse distinction across the letters already read',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, De Brevitate Vitae 2 (core):\n\nExigua pars est vitae qua vivimus. Ceterum quidem omne spatium non vita sed tempus est.\n\nTranslation: “Small is the part of life in which we actually live. All the rest of its extent is not life, but time.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Exigua pars est vitae — predicate-first order: “SMALL is the part of life” — with the partitive genitive vitae (LATN 101, Session 6): the part OF life. qua vivimus — the relative in the ablative: “in/by which we live” — ablative of time-within-which or means; the antecedent is pars. Note the cognate tightness: the part of LIFE in which we LIVE (vitae … vivimus) — Latin lets the noun and verb of the same root frame the clause.\n\nCeterum quidem omne spatium — “as for all the remaining extent” — spatium, the spatial word for a stretch, applied to duration. non vita sed tempus est — the predicate contrast with non … sed: “is not LIFE but TIME.” Two nominative predicates after est; the sentence performs a taxonomy: everything you have lived through divides into vita (the lived) and tempus (the merely elapsed).',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'This is the essay’s scalpel, and you have been using its cut all course. The vixi of Ep. 12 banks vita; the occupati of De Brevitate accumulate tempus. The three leaks of Ep. 1 (eripiuntur, subducuntur, effluunt) are the mechanisms by which vita drains into tempus. Even the drill you run daily in this Academy — the banked hour of the LATN 101 finale — is an instrument for converting tempus into vita.\n\nGrammatically, the distinction lives in a single relative clause: life is not the container (the years) but the qua — the within-which of actual living. Most of what a biography records is spatium: extent, elapsed, countable. What the evening review audits is vita: the small part that was lived on purpose. Seneca’s claim, and the course’s: the ratio is movable. exigua pars is a report on the unexamined life, not a law about all lives.',
      },
    ],
    exercises: [
      {
        number: '7.1',
        prompt: 'Parse: 1. vitae (in exigua pars vitae)  2. qua  3. est … non vita sed tempus',
        answer: '1. Partitive genitive — “the part OF life.” 2. Relative pronoun, ablative singular feminine (antecedent pars) — “in which we live” (time-within-which/means). 3. Copula with contrasted nominative predicates via non … sed — “is not life but time.”',
      },
      {
        number: '7.2',
        prompt: 'Explain the cognate framing vitae … vivimus and its rhetorical effect.',
        answer: 'The noun (vitae) and verb (vivimus) of the same root bracket the clause: “the part of LIFE in which we LIVE.” The etymological echo makes the scandal audible — most of a life fails to contain any living; the word happens twice while the thing happens rarely.',
      },
      {
        number: '7.3',
        prompt: 'Map the vita/tempus distinction onto Ep. 1’s three leaks and Ep. 12’s vixi.',
        answer: 'The leaks (snatched, stolen, seeped) are the mechanisms converting would-be vita into mere tempus. vixi — the nightly perfect — is the counter-mechanism: a day completed on purpose is banked as vita. The essay’s taxonomy is the ledger the letters’ practices are designed to move.',
      },
      {
        number: '7.4',
        prompt: 'Doctrine: why is exigua pars a report, not a law?',
        answer: 'It describes the unexamined default: without the disciplines, most extent elapses as tempus. But the ratio is movable — deliberate days, the audit, the banked hour convert extent into life. Seneca’s indictment doubles as the course’s promise: vita, si uti scias, longa est.',
      },
    ],
    quiz: [
      { question: 'vitae in exigua pars est vitae is:', options: ['Dative', 'Partitive genitive — “part OF life”', 'Nominative plural', 'Vocative'], correct: 1 },
      { question: 'qua is:', options: ['An adverb meaning “where”', 'The relative in the ablative — “in which (we live)”', 'A conjunction', 'An interjection'], correct: 1 },
      { question: 'spatium here means:', options: ['Outer space', 'Extent, stretch (of duration)', 'A racetrack only', 'A pause'], correct: 1 },
      { question: 'The taxonomy of the sentence divides existence into:', options: ['Body and soul', 'vita (the lived) and tempus (the merely elapsed)', 'Past and future', 'Work and leisure'], correct: 1 },
      { question: 'The cognate pair framing the first clause is:', options: ['pars/partior', 'vitae/vivimus', 'tempus/tempero', 'exigua/exigo'], correct: 1 },
      { question: 'Which practice converts tempus into vita?', options: ['Sleeping more', 'The deliberate day — vixi nightly, the banked hour, the audit', 'Traveling', 'Reading many authors at once'], correct: 1 },
      { question: 'Ep. 1’s three leaks relate to this sentence as:', options: ['Unrelated images', 'The mechanisms by which vita drains into tempus', 'Its refutation', 'Poetry only'], correct: 1 },
      { question: 'Why predicate-first order (Exigua pars est…)?', options: ['Random variation', 'The verdict lands first — SMALL is the lived part — before the subject arrives', 'Meter requires it', 'It is a question'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'exiguus, -a, -um', pronunciation: 'ek-SI-gu-us', english: 'small, scant' },
      { latin: 'pars, partis', pronunciation: 'PARS', english: 'part (f.)' },
      { latin: 'spatium, spatii', pronunciation: 'SPA-ti-um', english: 'extent, stretch, span (n.)' },
      { latin: 'ceterum', pronunciation: 'KE-te-rum', english: 'for the rest, otherwise' },
      { latin: 'quidem', pronunciation: 'KWI-dem', english: 'indeed, at any rate' },
    ],
  },

  // ── SESSION 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Epistula 101 — Hurry to Live',
    subtitle: 'singulos dies singulas vitas puta — the day as a life, commanded',
    objectives: [
      'Read the counsel of Epistula 101',
      'Parse propera + infinitive and the distributive singuli',
      'Handle puta + double accusative (“count X as Y”)',
      'Read the summa manus image: the finishing hand laid on each day',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, Epistula 101 (core):\n\nIdeo propera, Lucili mi, vivere, et singulos dies singulas vitas puta. Qui hoc modo se aptavit, cui vita sua cotidie fuit tota, securus est.\n\nTranslation: “Therefore hurry, my Lucilius, to live — and count each single day a single life. Whoever has fitted himself in this way, for whom his life has daily been whole, is free of care.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'propera … vivere — imperative of propero + complementary infinitive: “hurry TO LIVE.” The object of the haste is not a task but living itself — the essay-long answer to the occupati, who hurry at everything else. Lucili mi — vocative with the possessive: “my Lucilius,” the correspondence’s intimacy in two words.\n\nsingulos dies singulas vitas puta — puto with the DOUBLE ACCUSATIVE: “count [object] as [predicate]” — each-single days as each-single lives. singuli is the distributive adjective: one-each, day-by-day. The doubled distributive (singulos … singulas) forces the one-to-one mapping: not “days are like a life” but each day = one complete life, pair by pair.\n\nThe relative portrait: Qui … se aptavit — “whoever has fitted himself” (aorist-like perfect of apto: the adjustment is done); cui vita sua cotidie fuit tota — dative of possession (cui … fuit): “for whom his life has daily been WHOLE” — tota in predicate position. securus est — se + cura: without care. The etymology is the payoff: security is care-lessness about tomorrow, purchased by daily wholeness.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'Ep. 101 is Ep. 12 turned from description to command. There, one day is equal to every day (par omni); here, count each one a whole life (singulas vitas puta) — the completeness doctrine issued as a daily accounting instruction, with puta the bookkeeping verb: enter each day in the ledger as a life.\n\nThe letter’s occasion, which the course’s translation sessions covered, is brutal: Cornelius Senecio, a vigorous man, dead by morning after a routine day. Against that backdrop the double accusative is not poetry but risk management — the only hedge against fortune’s overnight settlements is a ledger with no open positions: every day closed whole (tota), every night’s vixi banked. securus — the alpha-privative of care in Latin dress — is the compounding interest. The grammar of the letters has been building one instrument: the day, held complete, needing nothing from tomorrow. Here Seneca signs it and hands it to you by name — Lucili mi — which, as PHIL 704 taught, always means the reader.',
      },
    ],
    exercises: [
      {
        number: '8.1',
        prompt: 'Parse: 1. propera vivere  2. singulos dies singulas vitas puta  3. cui … fuit  4. securus',
        answer: '1. Imperative + complementary infinitive — “hurry to live.” 2. puto + double accusative with distributives — “count each-single days [as] each-single lives.” 3. Dative of possession — “for whom (his) life … has been.” 4. Predicate adjective from se + cura — “free of care.”',
      },
      {
        number: '8.2',
        prompt: 'What does the doubled distributive singulos … singulas force that a plain plural would not?',
        answer: 'A one-to-one mapping: each single day paired with a single complete life — not “days resemble lives” in general but a per-item equation, entered day by day. The distributive is the ledger’s row-by-row discipline.',
      },
      {
        number: '8.3',
        prompt: 'Unpack the etymology of securus and its earned place in the sentence.',
        answer: 'se- (without) + cura (care): “care-free.” It is earned by the preceding clauses: whoever has fitted himself (se aptavit) so that his life is daily whole (cotidie tota) has no open positions for fortune to call — care about tomorrow has nothing to attach to. Security is a bookkeeping result, not a mood.',
      },
      {
        number: '8.4',
        prompt: 'Doctrine: how does Ep. 101 convert Ep. 12’s description into an instruction?',
        answer: 'Ep. 12 stated the equality (unus dies par omni est); Ep. 101 commands the accounting (singulas vitas puta) — count, enter, close each day as a life. With Senecio dead overnight as the letter’s occasion, the completeness doctrine becomes risk management: the only hedge against fortune’s sudden settlement is a ledger with every day closed whole.',
      },
    ],
    quiz: [
      { question: 'propera vivere means:', options: ['“Live slowly”', '“Hurry to live” — imperative + complementary infinitive', '“Prepare to die”', '“Live properly”'], correct: 1 },
      { question: 'singuli is:', options: ['A superlative', 'The distributive adjective — “one each”', 'A pronoun', 'An adverb'], correct: 1 },
      { question: 'puta with two accusatives means:', options: ['“Think about both”', '“Count X as Y” — the predicative double accusative', '“Prune the vine”', '“Ask twice”'], correct: 1 },
      { question: 'cui vita sua … fuit is:', options: ['Ablative absolute', 'Dative of possession — “for whom his life has been…”', 'Genitive of quality', 'Indirect statement'], correct: 1 },
      { question: 'tota in cotidie fuit tota is:', options: ['An adverb', 'Predicate adjective — the life daily WHOLE', 'A noun', 'Part of a gerundive'], correct: 1 },
      { question: 'securus derives from:', options: ['securis (axe)', 'se + cura — “without care”', 'sequor (follow)', 'seco (cut)'], correct: 1 },
      { question: 'The letter’s occasion is:', options: ['A shipwreck', 'Cornelius Senecio’s sudden overnight death after a routine day', 'A military defeat', 'Nero’s accession'], correct: 1 },
      { question: 'The “hedge against fortune” is:', options: ['Wealth in reserve', 'A ledger with no open positions — every day closed whole, vixi banked nightly', 'Powerful friends', 'Long-term plans'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'properare', pronunciation: 'pro-pe-RA-re', english: 'to hurry, hasten (1st conj.)' },
      { latin: 'singuli, -ae, -a', pronunciation: 'SIN-gu-li', english: 'one each, single (distributive)' },
      { latin: 'putare', pronunciation: 'pu-TA-re', english: 'to count, reckon, think (1st conj.)' },
      { latin: 'aptare', pronunciation: 'ap-TA-re', english: 'to fit, adapt (1st conj.)' },
      { latin: 'securus, -a, -um', pronunciation: 'se-KU-rus', english: 'free of care (se + cura)' },
      { latin: 'totus, -a, -um', pronunciation: 'TO-tus', english: 'whole, entire' },
    ],
  },

  // ── SESSION 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'Epistula 107 — Cleanthes in Latin',
    subtitle: 'ducunt volentem fata, nolentem trahunt — Seneca translates the school’s prayer',
    objectives: [
      'Read Seneca’s Latin rendering of Cleanthes’ prayer (Ep. 107.11)',
      'Parse the paired participles volentem / nolentem as the line’s whole argument',
      'Handle the jussive subjunctives of the prayer’s opening',
      'Set the Latin against the Greek original (GREK 201, Session 9)',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Seneca, Epistula 107.11 — his verse rendering of Cleanthes:\n\nDuc, o parens celsique dominator poli,\nquocumque placuit: nulla parendi mora est;\nadsum inpiger. Fac nolle, comitabor gemens\nmalusque patiar facere quod licuit bono.\nDucunt volentem fata, nolentem trahunt.\n\nTranslation: “Lead, O father and ruler of the lofty sky, wherever you have pleased: there is no delay in my obeying; I am here, unwearied. Suppose I refuse — I shall accompany you groaning, and, bad, shall suffer what I might have done good. The fates lead the willing; the unwilling, they drag.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Duc — the bare imperative of duco (one of the four clipped imperatives: dic, duc, fac, fer). o parens celsique dominator poli — vocatives, with the genitive celsi poli (“of the lofty sky”) hung between them. quocumque placuit — “whithersoever it has pleased (you)”: the -cumque generalizer + impersonal placet. nulla parendi mora est — the gerund in the genitive (LATN 101, Session 18): “no delay OF OBEYING” — obedience so immediate that even the noun-phrase hurries.\n\nFac nolle — “suppose (me) to refuse”: fac + infinitive as a thought-experiment imperative. comitabor gemens — future deponent + present participle: “I shall accompany, groaning.” malusque patiar — “and, bad, I shall suffer/undergo” (patior, the deponent from Session 16) — facere quod licuit bono: “to do what was permitted to (me as) good” — the dative bono closing the line: the same act, done willingly, was the good man’s privilege.\n\nThe famous last line: Ducunt volentem fata, nolentem trahunt. Two verbs (lead/drag), two participles (willing/unwilling), one subject (the fates). The participles are accusative objects — fate acts on YOU in both cases; your will only selects the verb. Word order mirrors the doctrine: volentem next to ducunt, nolentem next to trahunt — each disposition seated beside its consequence.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'Set this against the Greek you memorized in GREK 201 Session 9: ἕψομαι ἄοκνος … κακὸς γενόμενος οὐδὲν ἧττον ἕψομαι. Seneca compresses Cleanthes’ two-clause concession into one pentameter with the participle-pair doing all the work. Where the Greek located freedom in an adverb (ἄοκνος), the Latin locates it in the choice between two participles — volens or nolens — while the indicative verbs (ducunt, trahunt) stay fixed. Fate’s conduct is not negotiable; your grammatical case is: you will be the object either way, but you pick which verb governs you.\n\nThis line became the Stoic motto of Europe — quoted by Augustine, inscribed by early moderns, compressed to ducunt volentem fata. It is the last text to memorize in this course, completing your two-language liturgy: Greek for the judgment (Ench §5), Greek for the defiance (Anytus and Meletus), Latin for the following. Say all three and you carry the school.',
      },
    ],
    exercises: [
      {
        number: '9.1',
        prompt: 'Parse: 1. duc  2. parendi  3. comitabor  4. volentem / nolentem',
        answer: '1. Clipped imperative of duco — “lead!” (dic, duc, fac, fer). 2. Gerund of pareo in the genitive with mora — “no delay of obeying.” 3. Future of the deponent comitor — “I shall accompany.” 4. Present participles of volo/nolo in the accusative — “the willing (one)” / “the unwilling (one),” objects of ducunt/trahunt.',
      },
      {
        number: '9.2',
        prompt: 'Explain fac nolle and the concession it opens.',
        answer: 'fac + infinitive = “suppose (that I) refuse” — an imperative used to pose a thought-experiment. The concession: even refusing, comitabor — I shall accompany — but gemens (groaning) and malus (as a bad man), suffering what compliance would have let me do as bono. Refusal changes the manner and the moral verdict, never the route.',
      },
      {
        number: '9.3',
        prompt: 'Why are volentem and nolentem accusative, and what does that assert?',
        answer: 'They are the objects of ducunt and trahunt: fate acts upon the person in both cases — no nominative escape exists. The will chooses only which verb one is object of: led or dragged. Freedom is real but intra-accusative — the manner of being moved, not exemption from motion.',
      },
      {
        number: '9.4',
        prompt: 'Set the Latin line against the Greek (ἢν δέ γε μὴ θέλω … οὐδὲν ἧττον ἕψομαι) and state what each language’s compression achieves.',
        answer: 'The Greek spends a conditional clause on the refusal and locates freedom in the adverb ἄοκνος and the participle κακὸς γενόμενος. Seneca compresses the whole theology into one line with a participle-pair seated beside its verbs — volentem/ducunt, nolentem/trahunt — making word order itself the doctrine. Same teaching, two grammars: Greek argues it; Latin engraves it.',
      },
    ],
    quiz: [
      { question: 'duc belongs to which set of imperatives?', options: ['Regular 1st conjugation', 'The clipped four: dic, duc, fac, fer', 'Deponent imperatives', 'Future imperatives'], correct: 1 },
      { question: 'parendi in nulla parendi mora est is:', options: ['A gerundive of obligation', 'The gerund in the genitive — “delay OF OBEYING”', 'A perfect participle', 'An infinitive'], correct: 1 },
      { question: 'fac nolle means:', options: ['“Do nothing”', '“Suppose (me) to refuse” — a thought-experiment imperative', '“Make him leave”', '“Refuse to act”'], correct: 1 },
      { question: 'volentem and nolentem are:', options: ['Nominative subjects', 'Accusative present participles — objects of ducunt/trahunt', 'Ablatives absolute', 'Vocatives'], correct: 1 },
      { question: 'The fates’ two verbs are:', options: ['amant / oderunt', 'ducunt (lead) / trahunt (drag)', 'dant / auferunt', 'vocant / mittunt'], correct: 1 },
      { question: 'What does refusal change, per the line?', options: ['The destination', 'Only the manner — led vs dragged — and the moral verdict on the traveler', 'Fate’s existence', 'Nothing whatsoever, including manner'], correct: 1 },
      { question: 'The Greek original is by:', options: ['Epictetus himself', 'Cleanthes — quoted in Enchiridion §53', 'Homer', 'Chrysippus'], correct: 1 },
      { question: 'The word order volentem-ducunt / nolentem-trahunt achieves:', options: ['Nothing — Latin order is free', 'Each disposition seated beside its consequence — the doctrine engraved in the line’s architecture', 'Rhyme', 'Alphabetical order'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'ducere', pronunciation: 'DU-ke-re', english: 'to lead (3rd conj.)' },
      { latin: 'trahere', pronunciation: 'TRA-he-re', english: 'to drag (3rd conj.)' },
      { latin: 'volens, volentis', pronunciation: 'WO-lens', english: 'willing (participle of volo)' },
      { latin: 'nolens, nolentis', pronunciation: 'NO-lens', english: 'unwilling (participle of nolo)' },
      { latin: 'parere', pronunciation: 'pa-RE-re', english: 'to obey (2nd conj., + dat.)' },
      { latin: 'comitari', pronunciation: 'ko-mi-TA-ri', english: 'to accompany (deponent)' },
    ],
  },

  // ── SESSION 10 ─────────────────────────────────────────────────────────────
  {
    id: 10,
    title: 'FINAL — Sight Reading & the Reader’s Commission',
    subtitle: 'Epistula 61 at sight · bene autem mori est libenter mori',
    isMilestone: true,
    objectives: [
      'Translate an unseen passage of Seneca (Epistula 61) at sight',
      'Parse any construction from Sessions 1–9 on demand',
      'Recite the carried Latin texts from memory',
      'Leave with a program for reading Seneca entire',
    ],
    parts: [
      {
        heading: 'Part 1 — The Sight Passage',
        body: 'Read at sight, then check. Seneca, Epistula 61 (core):\n\nAnte senectutem curavi ut bene viverem, in senectute ut bene moriar; bene autem mori est libenter mori. … Paratus exire sum, et ideo fruar vita quia quam diu futurum hoc sit non nimis pendeo.\n\nTranslation: “Before old age I took care to live well; in old age, to die well — and to die well is to die willingly. … I am ready to depart, and for that very reason I shall enjoy life: because I do not hang too anxiously on how long this shall last.”\n\nConstructions at sight: curavi ut + subjunctive (indirect command/purpose after a verb of effort); the mirrored time-phrases ante senectutem / in senectute; the definition by infinitives bene mori est libenter mori; paratus + infinitive; fruar — future of the deponent fruor (+ ablative vita, Session 16’s case rule!); the indirect question quam diu … sit after pendeo.',
      },
      {
        heading: 'Part 2 — The Course, Synthesized',
        body: 'Ten sessions, one skill: Seneca in his own Latin, at reading pace. Your parsing toolkit from this course: paired gerundives as a balance scale (credendum/iudicandum); dum + indicative and the chiasm of teaching; concessives with etiam si … tamen; the double accusative of accounting (singulas vitas puta); tamquam + subjunctive as rehearsal; indirect questions and impersonals in the wild; gapping (ignis aurum probat, miseria fortes viros); the gerund in the genitive (parendi mora); participle-pairs as compressed theology (volentem/nolentem); and everywhere the perfect tense as the instrument of the completed day (vixi, peregi, curavi).',
        callout: {
          label: 'The reading program',
          text: 'Stage 1: Epistulae 1–12 entire, now at sight — you hold 1, 2, 3, 5, 7, 9, 12. Stage 2: De Brevitate Vitae complete. Stage 3: Epistulae 61, 77, 101, 107 in full, then De Providentia. Stage 4: De Tranquillitate Animi — the dialogue’s conversational Latin. Method: unum aliquid in dies — one thing a day, digested.',
        },
      },
      {
        heading: 'Part 3 — The Examination and the Commission',
        body: 'The exercises below are the final: sight translation, parse battery, recitation, and synthesis. Work them closed-book.\n\nEp. 61’s logic is the right place to end, because it is the course’s own: paratus exire sum — readiness to leave — is given as the REASON (ideo … quia) for enjoyment of life. The open door (PHIL 703, PHIL 704) turns out to be what makes the house habitable; the man not hanging on duration (non nimis pendeo) is the one free to live. You now hold that argument in the original, beside its Greek twin (Meditations II.14, GREK 201). Two languages, one school, no intermediary. posterorum negotium egit — he did the business of later generations. The delivery is complete; the reading is yours.',
      },
    ],
    exercises: [
      {
        number: '10.1',
        prompt: 'FINAL, Part A — Sight translation: translate the Ep. 61 passage without notes, then explain ideo … quia.',
        answer: 'See Part 1. ideo … quia — “for this reason … because”: readiness to depart is given as the CAUSE of enjoyment. Not despite mortality but because of settled readiness: the man with no anxiety about duration (non nimis pendeo + indirect question quam diu … sit) is the one free to enjoy (fruar vita, deponent + ablative).',
      },
      {
        number: '10.2',
        prompt: 'FINAL, Part B — Parse battery: 1. credendum est  2. facturi sunt  3. amari  4. peregi  5. marcet  6. pascam  7. qua (Brev. 2)  8. nolentem',
        answer: '1. Impersonal gerundive — “one must trust” (S1). 2. Active periphrastic — “are going to make” (S2). 3. Present passive infinitive — “to be loved” (S3). 4. Perfect of perago — “I have completed” (S4). 5. Present of marceo — “withers” (S5). 6. Present subjunctive of pasco, purpose clause (S6). 7. Relative in the ablative — “in which (we live)” (S7). 8. Accusative present participle of nolo — “the unwilling one” (S9).',
      },
      {
        number: '10.3',
        prompt: 'FINAL, Part C — Recitation: write from memory (a) Hecato’s charm, (b) the fire/gold sentence, (c) the fates line.',
        answer: '(a) si vis amari, ama. (b) Ignis aurum probat, miseria fortes viros. (c) Ducunt volentem fata, nolentem trahunt.',
      },
      {
        number: '10.4',
        prompt: 'FINAL, Part D — Synthesis: connect bene autem mori est libenter mori to Ep. 101’s ledger and Ep. 107’s participles, in one paragraph.',
        answer: 'Ep. 61 defines dying well as dying WILLINGLY (libenter) — the adverb version of Ep. 107’s volentem: the same event, transformed entirely by the disposition brought to it (led, not dragged). Ep. 101 supplies the practice that makes willingness possible: a ledger with every day closed whole (singulas vitas puta; vixi banked nightly) leaves no open positions for reluctance to attach to. Willing death is not heroism at the end but bookkeeping all along: whoever owes tomorrow nothing can follow the fates as the volens — and, by Ep. 61’s logic, is thereby the one who most enjoys today.',
      },
    ],
    quiz: [
      { question: 'curavi ut bene viverem is:', options: ['A result clause', 'ut + subjunctive after a verb of effort — “I took care to live well”', 'A relative clause', 'A condition'], correct: 1 },
      { question: 'bene mori est libenter mori is:', options: ['A prayer', 'A definition by infinitives — dying well IS dying willingly', 'A question', 'A gerundive'], correct: 1 },
      { question: 'fruar takes which case?', options: ['Accusative', 'The ablative — fruor vita (deponent case rule)', 'Genitive', 'Dative'], correct: 1 },
      { question: 'quam diu futurum hoc sit is:', options: ['A purpose clause', 'An indirect question after pendeo — “how long this shall last”', 'A fear clause', 'A wish'], correct: 1 },
      { question: 'ideo … quia links:', options: ['Contrast', 'Cause: readiness to depart is the REASON for enjoying life', 'Time', 'Concession'], correct: 1 },
      { question: 'Stage 1 of the reading program:', options: ['The Aeneid', 'Epistulae 1–12 entire — seven already held from the two courses', 'Cicero’s letters', 'Livy'], correct: 1 },
      { question: 'libenter is the adverb twin of which participle?', options: ['nolentem', 'volentem — the willing one, whom the fates lead', 'gemens', 'paratus'], correct: 1 },
      { question: 'What makes this session a milestone?', options: ['New grammar', 'Unseen Seneca at sight + recitation — the reading skill demonstrated whole, closing the Latin track', 'Its length', 'A Greek passage'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'senectus, senectutis', pronunciation: 'se-NEK-tus', english: 'old age (f.)' },
      { latin: 'libenter', pronunciation: 'li-BEN-ter', english: 'willingly, gladly (adverb)' },
      { latin: 'paratus, -a, -um', pronunciation: 'pa-RA-tus', english: 'ready, prepared' },
      { latin: 'frui', pronunciation: 'FRU-i', english: 'to enjoy (deponent, + abl.)' },
      { latin: 'pendere', pronunciation: 'pen-DE-re', english: 'to hang (upon), be in suspense (2nd conj.)' },
      { latin: 'exire', pronunciation: 'ek-SI-re', english: 'to go out, depart (irregular)' },
    ],
  },
];

