// GREK 201 — Reading the Stoics in Greek
// Year 2 · Guided readings: Marcus Aurelius and Epictetus in the original.
// Prerequisite: GREK 101 (the grammar is assumed; sessions review it in use).
// Each session is one short passage read completely: text, parse, doctrine.

import type { LanguageSession } from './grek101';

export const GREK_201_SESSIONS: LanguageSession[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Meditations II.1 — The Morning Premeditation',
    subtitle: 'Marcus’s most famous exercise, read in his own Greek',
    objectives: [
      'Read Meditations II.1 (opening) with full grammatical control',
      'Parse the future indicative συντεύξομαι and the string of datives',
      'Recognize μηδέ + infinitive constructions of resolve',
      'Connect the premeditation of adversity (PHIL 702) to its actual grammar',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Marcus Aurelius, Meditations II.1 (opening):\n\nἝωθεν προλέγειν ἑαυτῷ· συντεύξομαι περιέργῳ, ἀχαρίστῳ, ὑβριστῇ, δολερῷ, βασκάνῳ, ἀκοινωνήτῳ· πάντα ταῦτα συμβέβηκεν ἐκείνοις παρὰ τὴν ἄγνοιαν τῶν ἀγαθῶν καὶ κακῶν.\n\nTranslation: “At dawn, say to yourself in advance: I shall meet the meddling, the ungrateful, the insolent, the treacherous, the envious, the unsociable. All these things have befallen them through ignorance of goods and evils.”',
        callout: {
          label: 'Why this text first',
          text: 'You performed this exercise in PHIL 702 in English. Now you can watch Marcus build it: an infinitive of self-command, a future of sober prediction, six datives of the people you will actually meet, and a perfect tense that files their faults under ignorance, closed and explained.',
        },
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Ἕωθεν — adverb, “at dawn.” προλέγειν ἑαυτῷ — present infinitive used imperativally (“[one is] to say beforehand to oneself”) with the reflexive dative: the entire genre of the Meditations in two words — instructions issued to oneself.\n\nσυντεύξομαι — future middle of συντυγχάνω, “I shall meet with” (+ dative). The six datives that follow (περιέργῳ, ἀχαρίστῳ, ὑβριστῇ, δολερῷ, βασκάνῳ, ἀκοινωνήτῳ) are its objects — masculine datives of the types of person. Note the asyndeton: no καί between them; the list lands like blows.\n\nσυμβέβηκεν — perfect of συμβαίνω: “has come about, is the settled case.” The perfect tense (GREK 101, Session 25) marks a present state resulting from past action: their faults are an accomplished condition. παρὰ τὴν ἄγνοιαν — “because of ignorance” (παρά + accusative of cause) — τῶν ἀγαθῶν καὶ κακῶν, objective genitive: ignorance OF goods and evils. The Socratic diagnosis (nobody errs willingly) sits inside a prepositional phrase.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'The exercise’s power is temporal, and Greek tense carries it. The future (συντεύξομαι) rehearses; the perfect (συμβέβηκεν) explains; and between them the day’s encounters are disarmed before they occur. English translations flatten “I shall meet” into mere prediction — but the middle voice of συντεύξομαι colors it: I shall fall in with, encounter in the course of my own path. The difficult people are not targets; they are terrain.\n\nNotice also what the datives do to your morning. Each type-word is generic (a meddler, an ingrate) — no names. The premeditation trains the category, not the grudge: when the particular colleague appears at noon, he arrives pre-filed under περίεργος, already expected, already explained by ἄγνοια. The impression “I have been wronged” finds the gate (PHIL 702, Session 5) already manned.',
      },
    ],
    exercises: [
      {
        number: '1.1',
        prompt: 'Parse: 1. προλέγειν  2. συντεύξομαι  3. συμβέβηκεν',
        answer: '1. Present active infinitive of προλέγω, used imperativally with ἑαυτῷ — “to say beforehand to oneself.” 2. Future middle indicative 1st sg. of συντυγχάνω (+ dat.) — “I shall meet with.” 3. Perfect active indicative 3rd sg. of συμβαίνω — “has befallen / is the settled result” (neuter plural subject πάντα ταῦτα takes singular verb).',
      },
      {
        number: '1.2',
        prompt: 'Identify the case and function of περιέργῳ … ἀκοινωνήτῳ, and explain the asyndeton.',
        answer: 'All six are masculine dative singular, objects of συντεύξομαι (which governs the dative). The asyndeton — no connective καί — makes the list percussive: the types arrive one after another as they will in the day itself.',
      },
      {
        number: '1.3',
        prompt: 'Translate παρὰ τὴν ἄγνοιαν τῶν ἀγαθῶν καὶ κακῶν and name the constructions.',
        answer: '“Because of (their) ignorance of goods and evils.” παρά + accusative expressing cause; τῶν ἀγαθῶν καὶ κακῶν is objective genitive dependent on ἄγνοιαν — the ignorance is OF goods and evils. The whole Socratic-Stoic diagnosis of wrongdoing in one prepositional phrase.',
      },
      {
        number: '1.4',
        prompt: 'Doctrine: why does Marcus use the future for the people and the perfect for their faults?',
        answer: 'The future (συντεύξομαι) rehearses what has not yet happened — the premeditation proper. The perfect (συμβέβηκεν) states their condition as an accomplished, explained fact: ignorance already befell them. Rehearsed encounter + settled explanation = the impression of injury arrives at a gate already manned; the day is disarmed at dawn.',
      },
    ],
    quiz: [
      { question: 'What does Ἕωθεν mean?', options: ['At night', 'At dawn', 'Every hour', 'Yesterday'], correct: 1 },
      { question: 'How is προλέγειν used in II.1?', options: ['As a finite verb', 'As an infinitive of self-command — “[one is] to say beforehand to oneself”', 'As a participle', 'As a noun'], correct: 1 },
      { question: 'Parse συντεύξομαι.', options: ['Present of συντυγχάνω', 'Future middle 1st sg. of συντυγχάνω — “I shall meet with” (+ dative)', 'Aorist passive', 'Perfect active'], correct: 1 },
      { question: 'What case do the six type-words (περιέργῳ etc.) stand in, and why?', options: ['Accusative, direct objects', 'Dative — συντυγχάνω governs the dative', 'Genitive of description', 'Nominative in apposition'], correct: 1 },
      { question: 'What does the perfect συμβέβηκεν convey?', options: ['A future possibility', 'A present state resulting from past action — their faults are the settled case', 'A wish', 'A command'], correct: 1 },
      { question: 'παρὰ τὴν ἄγνοιαν expresses:', options: ['Place — beside the ignorance', 'Cause — because of ignorance', 'Time — during ignorance', 'Comparison'], correct: 1 },
      { question: 'Why are the six datives generic types rather than names?', options: ['Marcus forgot the names', 'The premeditation trains the category, not the grudge — particulars arrive pre-filed', 'Roman law forbade naming', 'Greek lacks proper names'], correct: 1 },
      { question: 'What is the neuter-plural-subject rule illustrated by πάντα ταῦτα συμβέβηκεν?', options: ['Neuter plural subjects take a singular verb', 'All verbs are singular in Greek', 'ταῦτα is actually singular', 'It is an error in the text'], correct: 0 },
    ],
    vocabulary: [
      { greek: 'προλέγω', transliteration: 'prolegō', english: 'to say beforehand, forewarn' },
      { greek: 'συντυγχάνω', transliteration: 'syntynchanō', english: 'to meet with, encounter (+ dat.)' },
      { greek: 'περίεργος', transliteration: 'periergos', english: 'meddling, officious' },
      { greek: 'ἀχάριστος', transliteration: 'acharistos', english: 'ungrateful' },
      { greek: 'ὑβριστής', transliteration: 'hybristēs', english: 'insolent, violent man' },
      { greek: 'ἄγνοια', transliteration: 'agnoia', english: 'ignorance' },
      { greek: 'συμβαίνω', transliteration: 'symbainō', english: 'to happen, befall' },
    ],
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'Meditations IV.3 — The Retreat Into Oneself',
    subtitle: 'ἀναχωρεῖν εἰς ἑαυτόν — the inner retreat, in the original',
    objectives: [
      'Read the opening of Meditations IV.3 with full control',
      'Parse ἔξεστι + dative + infinitive (impersonal possibility)',
      'Handle the relative clause with ἄν + subjunctive (general condition)',
      'Contrast the sought retreats (accusatives) with the true one (reflexive)',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Marcus Aurelius, Meditations IV.3 (opening):\n\nἈναχωρήσεις αὑτοῖς ζητοῦσιν ἀγροικίας καὶ αἰγιαλοὺς καὶ ὄρη … ὅλον δὲ τοῦτο ἰδιωτικώτατόν ἐστιν, ἐξόν, ἧς ἂν ὥρας ἐθελήσῃς, εἰς ἑαυτὸν ἀναχωρεῖν. οὐδαμοῦ γὰρ οὔτε ἡσυχιώτερον οὔτε ἀπραγμονέστερον ἄνθρωπος ἀναχωρεῖ ἢ εἰς τὴν ἑαυτοῦ ψυχήν.\n\nTranslation: “They seek retreats for themselves — countrysides, seashores, mountains … but all this is utterly unphilosophic, when it is possible, at whatever hour you wish, to retreat into yourself. For nowhere does a person retreat with more quiet or more freedom from business than into his own soul.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Ἀναχωρήσεις … ζητοῦσιν — “they seek retreats”: the noun ἀναχώρησις (retreat) in the accusative plural, with the dative of interest αὑτοῖς (“for themselves”). The objects of longing follow in apposition: ἀγροικίας, αἰγιαλούς, ὄρη — countrysides, beaches, mountains: the vacation list, twenty centuries old.\n\nἐξόν — accusative absolute of the impersonal ἔξεστι: “it being possible” — the construction used for impersonal verbs where a genitive absolute would use a participle. ἧς ἂν ὥρας ἐθελήσῃς — “at whatever hour you wish”: genitive of time within which (ἧς ὥρας), with ἄν + aorist subjunctive (ἐθελήσῃς) making the relative clause general — any hour, every time. εἰς ἑαυτὸν ἀναχωρεῖν — the true retreat, an infinitive with the reflexive: into yourself.\n\nThe comparatives ἡσυχιώτερον and ἀπραγμονέστερον (“more quietly, with less business”) are adverbial neuter comparatives; ἤ — “than” — introduces the standard: εἰς τὴν ἑαυτοῦ ψυχήν, into one’s own soul.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'The sentence’s architecture is its argument. The sought retreats are accusatives — objects out there, to be obtained, traveled to, paid for. The true retreat is a reflexive prepositional phrase — εἰς ἑαυτόν — no object at all, only a direction that is always available because you carry it. The general relative (ἧς ἂν ὥρας ἐθελήσῃς) makes availability grammatical: the subjunctive of indefinite frequency IS the doctrine that the door is always open.\n\nἰδιωτικώτατον deserves a note: the superlative of ἰδιώτης — the private person, the layman, the amateur (whence “idiot”). Wanting geographic retreats is the mark of the philosophical amateur — someone who has not yet learned where quiet lives. Seneca’s version (Ep. 2, LATN course): travel fails because you take yourself along. Marcus’s inversion: retreat succeeds because you take yourself along.',
      },
    ],
    exercises: [
      {
        number: '2.1',
        prompt: 'Parse: 1. ζητοῦσιν  2. ἐξόν  3. ἐθελήσῃς  4. ἀναχωρεῖν',
        answer: '1. Present active indicative 3rd pl. of ζητέω — “they seek.” 2. Accusative absolute of the impersonal ἔξεστι — “it being possible.” 3. Aorist subjunctive 2nd sg. of ἐθέλω, with ἄν in a general relative clause — “(whenever) you wish.” 4. Present active infinitive of ἀναχωρέω — “to retreat,” complement of ἐξόν.',
      },
      {
        number: '2.2',
        prompt: 'Explain ἧς ἂν ὥρας ἐθελήσῃς: what construction, and what does the ἄν + subjunctive contribute?',
        answer: 'A general (indefinite) relative clause: relative pronoun + ἄν + subjunctive = “at whatEVER hour you wish,” with ἧς ὥρας as genitive of time within which. The ἄν + subjunctive generalizes over every occasion — grammatically encoding that the inner retreat is available at all times.',
      },
      {
        number: '2.3',
        prompt: 'What is ἰδιωτικώτατον, morphologically and philosophically?',
        answer: 'Superlative neuter of ἰδιωτικός (from ἰδιώτης, the private person/layman): “most amateurish, utterly unphilosophic.” Seeking geographic retreats marks the philosophical amateur — one who has not learned that quiet lives in the ruling faculty, not in landscape.',
      },
      {
        number: '2.4',
        prompt: 'Doctrine: contrast the grammar of the false retreats and the true one.',
        answer: 'False retreats are accusative objects (ἀγροικίας, αἰγιαλούς, ὄρη) — external things to be obtained. The true retreat is a reflexive direction (εἰς ἑαυτόν) with no object to obtain, plus a general subjunctive of availability (ἧς ἂν ὥρας ἐθελήσῃς). What must be sought is contingent; what is reflexive is always in your possession — the sentence performs the dichotomy of control.',
      },
    ],
    quiz: [
      { question: 'What are ἀγροικίας, αἰγιαλούς, ὄρη?', options: ['Datives of interest', 'The sought retreats — countrysides, seashores, mountains, in the accusative', 'Vocatives', 'Genitives of time'], correct: 1 },
      { question: 'What is ἐξόν?', options: ['A noun meaning “exit”', 'Accusative absolute of impersonal ἔξεστι — “it being possible”', 'An imperative', 'A conjunction'], correct: 1 },
      { question: 'ἧς ἂν ὥρας ἐθελήσῃς means:', options: ['“If you once wished”', '“At whatever hour you wish” — general relative with ἄν + subjunctive', '“Until the hour you wish”', '“Because you wish the hour”'], correct: 1 },
      { question: 'What case is ἧς ὥρας and why?', options: ['Genitive of time within which', 'Dative of means', 'Accusative of extent', 'Nominative'], correct: 0 },
      { question: 'What does ἰδιωτικώτατον literally derive from?', options: ['ἰδέα — “form”', 'ἰδιώτης — the private person, layman (whence “idiot”)', 'εἶδον — “I saw”', 'ἴδιος has no derivatives'], correct: 1 },
      { question: 'ἡσυχιώτερον and ἀπραγμονέστερον are:', options: ['Superlative adjectives', 'Adverbial neuter comparatives — “more quietly, with less business”', 'Aorist participles', 'Datives of manner'], correct: 1 },
      { question: 'What introduces the standard of comparison?', options: ['καί', 'ἤ — “than (into one’s own soul)”', 'γάρ', 'ὡς'], correct: 1 },
      { question: 'The philosophical point of εἰς ἑαυτόν vs the accusative retreats:', options: ['Greek prefers reflexives', 'External retreats must be obtained; the reflexive retreat is always carried — availability is grammatical', 'Marcus disliked beaches', 'The soul is a place in Greece'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἀναχώρησις', transliteration: 'anachōrēsis', english: 'retreat, withdrawal' },
      { greek: 'ἀναχωρέω', transliteration: 'anachōreō', english: 'to withdraw, retreat' },
      { greek: 'ζητέω', transliteration: 'zēteō', english: 'to seek' },
      { greek: 'ἔξεστι', transliteration: 'exesti', english: 'it is possible, it is permitted' },
      { greek: 'ἡσυχία', transliteration: 'hēsychia', english: 'quiet, stillness' },
      { greek: 'ἰδιώτης', transliteration: 'idiōtēs', english: 'private person, layman, amateur' },
    ],
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Meditations V.1 — Reluctance at Dawn',
    subtitle: 'ὄρθρου ὅταν δυσόκνως ἐξεγείρῃ — getting out of bed, philosophically',
    objectives: [
      'Read the opening of Meditations V.1 with full control',
      'Parse ὅταν + subjunctive (general temporal clause)',
      'Handle the third-person imperative ἔστω and πρόχειρον as predicate',
      'Read ἐπὶ + accusative of purpose: what a human being gets up FOR',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Marcus Aurelius, Meditations V.1 (opening):\n\nὌρθρου ὅταν δυσόκνως ἐξεγείρῃ, πρόχειρον ἔστω ὅτι ἐπὶ ἀνθρώπου ἔργον ἐγείρομαι· ἔτι οὖν δυσκολαίνω, εἰ πορεύομαι ἐπὶ τὸ ποιεῖν ὧν ἕνεκεν γέγονα καὶ ὧν χάριν προῆγμαι εἰς τὸν κόσμον;\n\nTranslation: “At daybreak, when you wake reluctantly, let this be at hand: I am rising for a human being’s work. Am I still grumbling, if I am going to do the things for the sake of which I came to be, and for whose sake I was brought into the world?”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Ὄρθρου — genitive of time within which: “at daybreak” (like ἧς ὥρας last session). ὅταν … ἐξεγείρῃ — ὅταν (= ὅτε + ἄν) with present subjunctive: a general temporal clause, “whenever you wake” — every morning, not one. δυσόκνως — adverb, “with bad reluctance,” Marcus’s honest word for how it feels.\n\nπρόχειρον ἔστω — “let [this] be at hand”: πρόχειρος (πρό + χείρ, before the hand — ready, handy: the same root family as the Enchiridion!) as predicate, with ἔστω, the third-person imperative of εἰμί. The ὅτι-clause supplies what is to be at hand: ἐπὶ ἀνθρώπου ἔργον ἐγείρομαι — “I am rising FOR a human being’s work,” ἐπί + accusative of purpose/goal.\n\nThe self-interrogation follows: ἔτι οὖν δυσκολαίνω; — “am I still grumbling then?” with the εἰ-clause of circumstance. ὧν ἕνεκεν γέγονα — “(the things) for the sake of which I have come to be”: perfect of γίγνομαι; ἕνεκεν postpositive with the genitive relative. προῆγμαι — perfect passive of προάγω: “I have been brought forth” into the cosmos. Two perfects of settled purpose against one present of grumbling.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'This is role ethics (PHIL 703, Session 5) at the alarm clock. The argument is a function argument compressed into cases: ἀνθρώπου ἔργον — a HUMAN BEING’s work, possessive genitive — is what the waking is ἐπί, aimed at. The two perfect tenses (γέγονα, προῆγμαι) put your purpose in the same tense Marcus used for the meddlers’ ignorance in II.1: settled, accomplished, on file. You did not choose the ἔργον this morning; you came already commissioned.\n\nAnd note πρόχειρον. The Stoics’ word for a maxim held ready — procheiron, at hand — is the word Arrian built into Ἐγχειρίδιον, the handbook “in the hand.” The entire technology of the compressed maxim (Ench., the daily gift of Seneca’s letters, your own carried sentence from PHIL 704) descends from this adjective. What you rehearse at night must be πρόχειρον at dawn, because δυσόκνως is not an argument — it is a weather condition, and the trained mind carries its answer pre-packed.',
      },
    ],
    exercises: [
      {
        number: '3.1',
        prompt: 'Parse: 1. ἐξεγείρῃ  2. ἔστω  3. γέγονα  4. προῆγμαι',
        answer: '1. Present middle/passive subjunctive 2nd sg. of ἐξεγείρω after ὅταν — “whenever you wake.” 2. Third-person singular imperative of εἰμί — “let it be.” 3. Perfect of γίγνομαι — “I have come to be.” 4. Perfect middle/passive of προάγω — “I have been brought forth.”',
      },
      {
        number: '3.2',
        prompt: 'Explain ὅταν + subjunctive here, and contrast with ὅτε + indicative.',
        answer: 'ὅταν (ὅτε + ἄν) with the subjunctive is a general temporal clause: “whenEVER you wake reluctantly” — recurring, every morning. ὅτε + indicative would report one specific occasion. The mood makes the maxim a standing prescription, not a memory of a bad Tuesday.',
      },
      {
        number: '3.3',
        prompt: 'What is πρόχειρον morphologically, and what famous title shares its root?',
        answer: 'πρό + χείρ — “before the hand,” ready, at hand — predicate adjective with ἔστω: “let it be at hand.” The Ἐγχειρίδιον (Enchiridion, “the thing in the hand”) shares the χείρ root: the whole Stoic technology of the carried maxim lives in this word family.',
      },
      {
        number: '3.4',
        prompt: 'Doctrine: why does Marcus put his purpose in the perfect tense and his grumbling in the present?',
        answer: 'γέγονα and προῆγμαι (perfects) state the commission as settled fact — he came into being already for the human ἔργον; that file is closed. δυσκολαίνω (present) is the live, optional act. The tense contrast is the argument: a present grumble has no standing against a perfect purpose. Getting up is not a decision each dawn; it was decided when he was born a rational animal.',
      },
    ],
    quiz: [
      { question: 'Ὄρθρου is:', options: ['Accusative of extent', 'Genitive of time within which — “at daybreak”', 'Dative of respect', 'Vocative'], correct: 1 },
      { question: 'ὅταν takes which mood here?', options: ['Indicative', 'Subjunctive — general temporal clause, “whenever”', 'Optative', 'Imperative'], correct: 1 },
      { question: 'ἔστω is:', options: ['2nd sg. imperative of εἰμί', '3rd sg. imperative of εἰμί — “let it be”', 'Future of εἰμί', 'Subjunctive of εἰμί'], correct: 1 },
      { question: 'πρόχειρον literally means:', options: ['“Written down”', '“Before the hand” — ready, at hand', '“In the morning”', '“Difficult”'], correct: 1 },
      { question: 'ἐπὶ ἀνθρώπου ἔργον expresses:', options: ['Place where', 'Purpose/goal — rising FOR a human being’s work', 'Time when', 'Agent'], correct: 1 },
      { question: 'ἀνθρώπου in that phrase is:', options: ['Objective genitive', 'Possessive genitive — a human being’s work', 'Genitive absolute', 'Partitive'], correct: 1 },
      { question: 'γέγονα and προῆγμαι are both:', options: ['Presents', 'Perfects — the commission is settled fact', 'Futures', 'Aorists'], correct: 1 },
      { question: 'Which book title descends from the πρόχειρος family?', options: ['The Meditations', 'The Enchiridion — the handbook “in the hand”', 'The Discourses', 'The Republic'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ὄρθρος', transliteration: 'orthros', english: 'daybreak, dawn' },
      { greek: 'ἐξεγείρω', transliteration: 'exegeirō', english: 'to wake up, rouse' },
      { greek: 'πρόχειρος', transliteration: 'procheiros', english: 'at hand, ready' },
      { greek: 'ἔργον', transliteration: 'ergon', english: 'work, function, deed' },
      { greek: 'δυσκολαίνω', transliteration: 'dyskolainō', english: 'to be peevish, grumble' },
      { greek: 'ἕνεκεν', transliteration: 'heneken', english: 'for the sake of (+ gen., postpositive)' },
    ],
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Meditations IV.7 & VII.29 — The Maxims',
    subtitle: 'ἄφελε τὴν ὑπόληψιν — the aorist imperative as spiritual surgery',
    objectives: [
      'Read Marcus’s two most compressed maxims in the original',
      'Master the aorist imperative (ἄφελε, σβέσον, στῆσον) and its force',
      'Parse the perfect passives ἦρται and βέβλαμμαι as states',
      'Explain why the maxim genre lives in the aorist, not the present',
    ],
    parts: [
      {
        heading: 'Part 1 — The Texts',
        body: 'Meditations IV.7:\n\nἌφελε τὴν ὑπόληψιν· ἦρται τὸ «βέβλαμμαι». ἄφελε τὸ «βέβλαμμαι»· ἦρται ἡ βλάβη.\n\n“Remove the judgment — and ‘I have been harmed’ is removed. Remove the ‘I have been harmed’ — and the harm is removed.”\n\nMeditations VII.29 (opening commands):\n\nΣβέσον τὴν φαντασίαν. στῆσον τὴν νευροσπαστίαν.\n\n“Wipe out the impression. Stop the string-pulling.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Every command here is an AORIST imperative: ἄφελε (ἀφαιρέω, “take away”), σβέσον (σβέννυμι, “extinguish”), στῆσον (ἵστημι, “halt”). GREK 101 taught the aspect distinction: the present imperative commands ongoing or repeated action (“keep doing”); the aorist imperative commands a single, complete act (“do it — once, now, wholly”). Marcus’s spiritual surgery is aoristic: not “work gradually on your judgments” but “excise this one, now.”\n\nIV.7’s engine is the perfect: ἦρται — perfect passive of αἴρω, “has been lifted/removed, is gone” — and βέβλαμμαι — perfect passive of βλάπτω, “I have been harmed,” quoted as a judgment (note the article τό turning the whole verb into a noun: the “I-have-been-harmed”). The argument is a chain of removals: take away the ὑπόληψις (the assent-judgment, PHIL 701 Session 3) and the quoted complaint is gone (ἦρται); take away the complaint and the βλάβη itself is gone. Harm exists at exactly the depth of the judgment — no deeper.\n\nνευροσπαστία in VII.29 — “string-pulling,” from νεῦρον (sinew/string) + σπάω (pull): the image is a marionette. Impressions pull; the untrained person dances. στῆσον: halt it — one act.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'IV.7 is the discipline of assent stated as an algebra of subtraction, and its whole proof is grammatical. τὸ «βέβλαμμαι» — the article + quoted verb — makes a judgment into a thing that can be removed. Greek can hold a proposition in its hand this way; English needs clumsy quotation marks. The sentence then simply cancels terms: judgment gone → complaint gone → harm gone. If the harm survived the removal of the judgment, Stoicism would be false; Marcus’s Greek asserts that it does not by making βλάβη the last term of a chain that begins in ὑπόληψις.\n\nAnd the aorist aspect answers the practical question every student asks: “how long will this take?” For the habit — years (that is the present-tense work of II.18’s fire-starving, PHIL 703). But for THIS impression, now, at the gate — one act. σβέσον. The maxim genre exists because the moment of assent is punctual, and its grammar had to be too.',
      },
    ],
    exercises: [
      {
        number: '4.1',
        prompt: 'Parse: 1. ἄφελε  2. ἦρται  3. βέβλαμμαι  4. σβέσον  5. στῆσον',
        answer: '1. Aorist active imperative 2nd sg. of ἀφαιρέω — “remove!” 2. Perfect passive 3rd sg. of αἴρω — “has been removed, is gone.” 3. Perfect passive 1st sg. of βλάπτω — “I have been harmed” (quoted as a judgment). 4. Aorist active imperative of σβέννυμι — “extinguish!” 5. Aorist active imperative of ἵστημι — “halt!”',
      },
      {
        number: '4.2',
        prompt: 'What does τό do in τὸ «βέβλαμμαι», and why does it matter philosophically?',
        answer: 'The neuter article substantivizes the quoted verb: “the ‘I-have-been-harmed’” — a judgment turned into a manipulable object. This is precisely the Stoic move: the proposition inside an impression can be held, examined, and removed. The grammar performs the discipline of assent.',
      },
      {
        number: '4.3',
        prompt: 'Present vs aorist imperative: why is Marcus’s surgery aoristic?',
        answer: 'The present imperative commands ongoing/repeated action; the aorist commands one complete act. Habit-training is present-tense work over years, but the moment of assent is punctual — THIS impression, at the gate, now. ἄφελε/σβέσον command a single excision, matching the psychology of the instant.',
      },
      {
        number: '4.4',
        prompt: 'Translate IV.7 and lay out its argument as a chain.',
        answer: '“Remove the judgment — the ‘I have been harmed’ is removed. Remove the ‘I have been harmed’ — the harm is removed.” Chain: ὑπόληψις → quoted complaint → βλάβη. Each removal cancels the next term: harm exists only at the depth of the judgment. If harm survived the judgment’s removal, the chain would break — Stoicism’s central claim in two subtractions.',
      },
    ],
    quiz: [
      { question: 'ἄφελε is what form?', options: ['Present imperative', 'Aorist active imperative 2nd sg. of ἀφαιρέω — “remove!”', 'Future indicative', 'Aorist infinitive'], correct: 1 },
      { question: 'ἦρται means:', options: ['“He lifts”', '“Has been removed, is gone” — perfect passive of αἴρω', '“Will be lifted”', '“Lift it!”'], correct: 1 },
      { question: 'βέβλαμμαι is:', options: ['Perfect passive 1st sg. of βλάπτω — “I have been harmed”', 'Present middle of βάλλω', 'Aorist of βλέπω', 'A noun'], correct: 0 },
      { question: 'What does τό before «βέβλαμμαι» accomplish?', options: ['Nothing — it is ornamental', 'It substantivizes the quoted judgment — a proposition made into a removable object', 'It marks a question', 'It negates the verb'], correct: 1 },
      { question: 'The aorist imperative commands:', options: ['Ongoing, habitual action', 'A single, complete act — “do it once, now, wholly”', 'A polite request', 'A future plan'], correct: 1 },
      { question: 'νευροσπαστία means:', options: ['Nervousness', '“String-pulling” — the marionette image for impressions jerking the untrained', 'Muscle pain', 'A musical instrument'], correct: 1 },
      { question: 'σβέσον comes from:', options: ['σβέννυμι — to extinguish, quench', 'σέβομαι — to revere', 'σῴζω — to save', 'σπάω — to pull'], correct: 0 },
      { question: 'IV.7’s philosophical claim is that harm exists:', options: ['In the body only', 'At exactly the depth of the judgment — remove the ὑπόληψις and the βλάβη is gone', 'In fate', 'In other people'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἀφαιρέω', transliteration: 'aphaireō', english: 'to take away, remove' },
      { greek: 'ὑπόληψις', transliteration: 'hypolēpsis', english: 'judgment, assumption' },
      { greek: 'βλάβη', transliteration: 'blabē', english: 'harm, damage' },
      { greek: 'βλάπτω', transliteration: 'blaptō', english: 'to harm' },
      { greek: 'σβέννυμι', transliteration: 'sbennymi', english: 'to extinguish, quench' },
      { greek: 'φαντασία', transliteration: 'phantasia', english: 'impression, appearance' },
    ],
  },

  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Milestone I — Enchiridion §5 Complete',
    subtitle: 'ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα — the school’s central sentence',
    isMilestone: true,
    objectives: [
      'Read Enchiridion §5 in full with complete grammatical control',
      'Parse the article + prepositional phrase as attributive (τὰ περὶ τῶν πραγμάτων δόγματα)',
      'Handle ἐπεί + imperfect (counterfactual reasoning) and the ἐφαίνετο argument about Socrates',
      'Recite the sentence from memory in Greek',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Epictetus, Enchiridion §5 (first movement):\n\nΤαράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα· οἷον ὁ θάνατος οὐδὲν δεινόν, ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο, ἀλλὰ τὸ δόγμα τὸ περὶ τοῦ θανάτου, διότι δεινόν, ἐκεῖνο τὸ δεινόν ἐστιν.\n\nTranslation: “It is not things that disturb human beings, but their judgments about things. For example: death is nothing terrible — otherwise it would have appeared so even to Socrates — but the judgment about death, that it is terrible: THAT is the terrible thing.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Ταράσσει … οὐ τὰ πράγματα, ἀλλὰ τὰ … δόγματα — subject contrast with οὐ … ἀλλά: not things but judgments (both neuter plurals with singular verb, the rule from Session 1). The famous phrase τὰ περὶ τῶν πραγμάτων δόγματα shows the attributive sandwich: article + prepositional phrase + noun — “the about-things judgments.” Greek can tuck a whole phrase between article and noun; when you see τά followed by a preposition, wait for the noun.\n\nThe Socrates argument: ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο — “since [otherwise] it would have appeared [terrible] even to Socrates”: ἄν + imperfect indicative = counterfactual (it did NOT so appear). One dative (Σωκράτει), one particle (ἄν), and the entire empirical proof: the same external produced no terror in a rightly-ordered judge; therefore the terror was never in the external. \n\nThe close: τὸ δόγμα τὸ περὶ τοῦ θανάτου — attributive position again, repeated article — διότι δεινόν (“namely that it is terrible” — the judgment’s content), then the emphatic demonstrative: ἐκεῖνο τὸ δεινόν ἐστιν — THAT is the terrible thing. Greek word order saves the punch for last.',
      },
      {
        heading: 'Part 3 — Why This Sentence Is the Milestone',
        body: 'You have met this sentence in every course of the Academy: as Ench §5 in PHIL 701, as Marcus’s “life is opinion” in PHIL 702, as the father’s cross-examination in PHIL 703, as Seneca’s de opinione in the Letters. Now you possess it in the original, and you can see what the translations argue about. δόγματα — not “opinions” (too weak) nor “beliefs” (too doxastic) but judgments-assented-to, the products of synkatathesis. ταράσσει — churns, stirs up — the same verb family as the ἀταραξία the school promises: the goal is the alpha-privative of this exact verb.\n\nMemorize the first clause in Greek: Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα. Say it at the gate when an impression arrives. This is what the whole GREK track was for — the maxim πρόχειρον in its own tongue, with no translator standing between you and the school.',
      },
    ],
    exercises: [
      {
        number: '5.1',
        prompt: 'Unaided translation — translate the full passage without notes.',
        answer: 'See Part 1. Key movements: the οὐ … ἀλλά subject contrast; the attributive sandwich τὰ περὶ τῶν πραγμάτων δόγματα; the counterfactual ἂν ἐφαίνετο proving death’s indifference from Socrates’s case; the emphatic close ἐκεῖνο τὸ δεινόν ἐστιν.',
      },
      {
        number: '5.2',
        prompt: 'Explain the attributive sandwich in τὰ περὶ τῶν πραγμάτων δόγματα.',
        answer: 'Article (τά) + prepositional phrase (περὶ τῶν πραγμάτων) + noun (δόγματα): the phrase is tucked into attributive position, functioning as an adjective — “the about-things judgments.” When τά is followed by a preposition, the noun is still coming; the whole unit is one noun phrase.',
      },
      {
        number: '5.3',
        prompt: 'Parse ἂν ἐφαίνετο and state exactly what the counterfactual proves.',
        answer: 'ἄν + imperfect indicative of φαίνομαι — past counterfactual: “it WOULD have appeared (terrible)” — implying it did not. With Σωκράτει (dative of the perceiver): if terror were IN death, it would have appeared to every judge including the best one; it did not appear to Socrates; therefore the terror is contributed by the judgment, not the thing.',
      },
      {
        number: '5.4',
        prompt: 'Milestone: write the first clause from memory in Greek, and give the etymological link between ταράσσει and the school’s goal.',
        answer: 'Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα. The verb ταράσσω (disturb, churn) is the root under ἀταραξία (un-disturbedness) — the school’s promised state is the alpha-privative of the very disturbance this sentence locates in judgments. Master the judgment and the verb loses its object.',
      },
    ],
    quiz: [
      { question: 'What disturbs human beings, per Ench §5?', options: ['Things (τὰ πράγματα)', 'Judgments about things (τὰ περὶ τῶν πραγμάτων δόγματα)', 'The gods', 'Fate'], correct: 1 },
      { question: 'τὰ περὶ τῶν πραγμάτων δόγματα is an example of:', options: ['A genitive absolute', 'The attributive sandwich — article + prepositional phrase + noun', 'Indirect statement', 'A conditional'], correct: 1 },
      { question: 'ἂν ἐφαίνετο expresses:', options: ['A future possibility', 'A past counterfactual — “would have appeared (but did not)”', 'A command', 'A general truth'], correct: 1 },
      { question: 'Why Socrates, in the argument?', options: ['He wrote the Enchiridion', 'The best judge felt no terror at death — so the terror is not in death but in judgment', 'He feared death most', 'He was Epictetus’s student'], correct: 1 },
      { question: 'Σωκράτει is:', options: ['Genitive', 'Dative — the perceiver to whom it would have appeared', 'Vocative', 'Accusative'], correct: 1 },
      { question: 'ἐκεῖνο τὸ δεινόν ἐστιν does what rhetorically?', options: ['Opens the sentence', 'Saves the punch for last — THAT (the judgment) is the terrible thing', 'Quotes Socrates', 'Negates the argument'], correct: 1 },
      { question: 'ταράσσω is etymologically linked to:', options: ['ἀταραξία — the un-disturbedness the school promises', 'φαντασία', 'προαίρεσις', 'εὐδαιμονία'], correct: 0 },
      { question: 'δόγματα here is best rendered:', options: ['“Dogmas” in the modern sense', 'Judgments assented to — products of synkatathesis', 'Laws', 'Feelings'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ταράσσω', transliteration: 'tarassō', english: 'to disturb, stir up' },
      { greek: 'πρᾶγμα', transliteration: 'pragma', english: 'thing, affair, matter' },
      { greek: 'δόγμα', transliteration: 'dogma', english: 'judgment, doctrine' },
      { greek: 'δεινός', transliteration: 'deinos', english: 'terrible, fearsome' },
      { greek: 'φαίνομαι', transliteration: 'phainomai', english: 'to appear, seem' },
      { greek: 'ἀταραξία', transliteration: 'ataraxia', english: 'un-disturbedness, tranquility' },
    ],
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'Enchiridion §8 — Wish Things As They Happen',
    subtitle: 'θέλε τὰ γινόμενα ὡς γίνεται — the discipline of desire in one sentence',
    objectives: [
      'Read Enchiridion §8 in full',
      'Parse μή + present imperative (prohibition of ongoing behavior)',
      'Handle the substantival participle τὰ γινόμενα (the-things-that-happen)',
      'Contrast ζήτει and θέλε as the two possible postures toward events',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Epictetus, Enchiridion §8:\n\nΜὴ ζήτει τὰ γινόμενα γίνεσθαι ὡς θέλεις, ἀλλὰ θέλε τὰ γινόμενα ὡς γίνεται, καὶ εὐροήσεις.\n\nTranslation: “Do not seek that the things which happen should happen as you wish; but wish the things which happen to be as they happen — and your life will flow well.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Μὴ ζήτει — μή + PRESENT imperative: the prohibition of a continuing practice — “stop seeking / don’t go on seeking” (contrast the aorist prohibitions μὴ + subjunctive for “don’t start”). What is prohibited is a standing policy toward the world.\n\nτὰ γινόμενα — article + present middle participle of γίγνομαι: “the things that happen,” the participle made a noun (as τὸ βέβλαμμαι in Session 4). It appears twice, pivoting the sentence: first as the accusative subject of the infinitive γίνεσθαι in the prohibited wish (“that the happenings happen as you wish”), then as the object of the commanded wish. ὡς θέλεις / ὡς γίνεται — “as you wish” / “as they happen”: two ὡς-clauses, one indexed to you, one to reality.\n\nεὐροήσεις — future of εὐροέω, “to flow well”: εὖ + ῥέω. This is a terminus technicus: εὔροια βίου, “the good flow of life,” is Zeno’s own definition of happiness. The promise is not pleasure but unobstructed flow — the will running on reality’s rails (PHIL 703, Session 9).',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'The sentence is a chiasm of control. Both halves contain the same three elements — happenings, wishing, manner — and differ only in which is bent to which. Prohibited: bend τὰ γινόμενα to ὡς θέλεις (reality to will). Commanded: bend θέλε to ὡς γίνεται (will to reality). Greek can say this with almost no vocabulary change, which is the point: the difference between misery and εὔροια is not a different world; it is the same words with the dependency reversed.\n\nNote what is NOT commanded: not θέλε πάντα (want everything indiscriminately), and not the extinction of θέλειν. The will remains fully active — it is commanded, in the imperative — but re-aimed. This is the answer, in the original, to every critic who reads Stoic acceptance as passivity: θέλε is the most active verb in the sentence.',
      },
    ],
    exercises: [
      {
        number: '6.1',
        prompt: 'Parse: 1. ζήτει (with μή)  2. τὰ γινόμενα  3. εὐροήσεις',
        answer: '1. Present active imperative 2nd sg. of ζητέω with μή — prohibition of ongoing practice: “do not go on seeking.” 2. Article + present middle participle of γίγνομαι, substantival: “the things that happen.” 3. Future active indicative 2nd sg. of εὐροέω — “you will flow well.”',
      },
      {
        number: '6.2',
        prompt: 'Explain the two ὡς-clauses and what each is indexed to.',
        answer: 'ὡς θέλεις — “as you wish”: manner indexed to the self’s will. ὡς γίνεται — “as they happen”: manner indexed to reality. The prohibited posture bends happenings to your wish; the commanded posture bends your wish to happenings. Same elements, reversed dependency.',
      },
      {
        number: '6.3',
        prompt: 'What is εὔροια βίου, and whose definition of happiness is it?',
        answer: 'The “good flow of life” (εὖ + ῥέω) — Zeno’s own definition of eudaimonia. εὐροήσεις promises unobstructed flow: a will that wants what happens cannot be dammed by what happens.',
      },
      {
        number: '6.4',
        prompt: 'Doctrine: why does the imperative θέλε refute the charge that Stoic acceptance is passivity?',
        answer: 'θέλε is an active imperative — willing is commanded, not extinguished. The Stoic does not stop wanting; he re-aims wanting at what reality delivers. The sentence keeps the full machinery of desire running and changes only its target — activity of will, passivity of demand.',
      },
    ],
    quiz: [
      { question: 'μή + present imperative prohibits:', options: ['A single future act', 'An ongoing practice — “stop / don’t go on doing”', 'A past act', 'Nothing — it is emphatic'], correct: 1 },
      { question: 'τὰ γινόμενα is:', options: ['A finite verb', 'A substantival participle — “the things that happen”', 'An infinitive', 'An adverb'], correct: 1 },
      { question: 'ὡς θέλεις vs ὡς γίνεται index manner to:', options: ['Past vs future', 'Your will vs reality', 'Gods vs mortals', 'Speech vs writing'], correct: 1 },
      { question: 'εὐροήσεις derives from:', options: ['εὖ + ῥέω — “to flow well”', 'εὑρίσκω — “to find”', 'ἔρως — “love”', 'ῥώννυμι — “to strengthen”'], correct: 0 },
      { question: 'εὔροια βίου is whose definition of happiness?', options: ['Aristotle’s', 'Zeno’s', 'Plato’s', 'Epicurus’s'], correct: 1 },
      { question: 'What is grammatically identical between the two halves?', options: ['Nothing', 'The three elements (happenings, wishing, manner) — only the dependency is reversed', 'The verbs', 'The cases'], correct: 1 },
      { question: 'What is NOT commanded by §8?', options: ['Wishing', 'The extinction of the will — θέλε keeps desire fully active, re-aimed', 'Attention to events', 'Following nature'], correct: 1 },
      { question: 'The infinitive γίνεσθαι functions as:', options: ['A command', 'The infinitive in the prohibited wish — “that the happenings HAPPEN as you wish”', 'A noun subject', 'A participle'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'θέλω', transliteration: 'thelō', english: 'to wish, will' },
      { greek: 'γίγνομαι', transliteration: 'gignomai', english: 'to happen, become' },
      { greek: 'εὐροέω', transliteration: 'euroeō', english: 'to flow well (εὔροια — good flow)' },
      { greek: 'ὡς', transliteration: 'hōs', english: 'as, how' },
      { greek: 'ζητέω', transliteration: 'zēteō', english: 'to seek, demand' },
    ],
  },

  // ── SESSION 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'Discourses I.16 — The Hymn of the Lame Old Man',
    subtitle: 'τί γὰρ ἄλλο δύναμαι γέρων χωλός — the vocation of praise',
    objectives: [
      'Read the closing of Discourses I.16',
      'Parse the rhetorical question with εἰ μή and δύναμαι + infinitive',
      'Handle the conditional imperatives (εἰ … ἤμην … ἐποίουν) and the hortatory close',
      'Connect the hymn to PHIL 703 Session 7 (the nightingale passage)',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Epictetus, Discourses I.16 (close):\n\nεἰ γοῦν ἀηδὼν ἤμην, ἐποίουν τὰ τῆς ἀηδόνος, εἰ κύκνος, τὰ τοῦ κύκνου. νῦν δὲ λογικός εἰμι· ὑμνεῖν με δεῖ τὸν θεόν. τοῦτό μου τὸ ἔργον ἐστίν, ποιῶ αὐτὸ … τί γὰρ ἄλλο δύναμαι γέρων χωλὸς εἰ μὴ ὑμνεῖν τὸν θεόν;\n\nTranslation: “If I were a nightingale, I would do what belongs to a nightingale; if a swan, what belongs to a swan. But as it is, I am a rational creature: I must hymn God. This is my work, and I do it … For what else can I do, a lame old man, except hymn God?”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'εἰ … ἤμην, ἐποίουν — present contrary-to-fact condition: εἰ + imperfect (ἤμην, “if I were”) with imperfect in the apodosis (ἐποίουν, “I would be doing”). He is NOT a nightingale; the mood says so. τὰ τῆς ἀηδόνος — the article + genitive idiom: “the things of the nightingale,” its proper work — the same genitive-of-role you met in ἀνθρώπου ἔργον (Session 3).\n\nνῦν δέ — “but as it is”: the standard pivot out of a counterfactual into fact. λογικός εἰμι — “I am rational”: the predicate that decides everything. ὑμνεῖν με δεῖ — impersonal δεῖ + accusative + infinitive: “it is necessary for me to hymn” — obligation stated impersonally, read off the nature of things (compare Latin oportet, LATN 101 Session 28).\n\nThe famous close: τί γὰρ ἄλλο δύναμαι γέρων χωλὸς εἰ μὴ ὑμνεῖν τὸν θεόν; — “what else CAN I do…?” δύναμαι + infinitive; γέρων χωλός in apposition to the subject (“I, a lame old man”); εἰ μή — “except.” The rhetorical question does the work of an argument: every capacity but one has been subtracted by age and lameness; what remains is the ἔργον no external can subtract.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'You read this passage in translation in PHIL 703 (Session 7); now watch the Greek argue. The contrary-to-fact conditions dispose of the alternative vocations — nightingale, swan — in the mood of unreality; the indicative εἰμι then states the actual commission. Function follows nature; nature is stated in a predicate adjective; and the obligation (δεῖ) drops out impersonally, the way gravity does.\n\nγέρων χωλός is Epictetus’s entire biography in two nominatives — old, lame — placed WITHOUT self-pity in apposition to a verb of capacity (δύναμαι). The subtraction sentence is the deepest Stoic move in the passage: externals reduced his powers to one, and that one is sufficient, because it was always the one that counted. The hymn is not what is left over after loss; it is what loss reveals to have been the vocation all along.',
      },
    ],
    exercises: [
      {
        number: '7.1',
        prompt: 'Parse: 1. ἤμην … ἐποίουν  2. δεῖ  3. δύναμαι',
        answer: '1. Imperfects in a present contrary-to-fact condition: “if I WERE (a nightingale) … I WOULD BE DOING…” — he is not. 2. Impersonal “it is necessary,” + accusative (με) + infinitive (ὑμνεῖν). 3. Present deponent 1st sg., “I am able,” + infinitive.',
      },
      {
        number: '7.2',
        prompt: 'Explain τὰ τῆς ἀηδόνος and give the parallel from Session 3.',
        answer: 'Article + genitive: “the things of the nightingale” — its proper work, the role-genitive. Parallel: ἀνθρώπου ἔργον (Med. V.1) — “a human being’s work.” In both, a genitive names a nature and the nature yields the job.',
      },
      {
        number: '7.3',
        prompt: 'What does εἰ μή mean in the final question, and how does the question argue?',
        answer: '“Except.” “What else can I do … EXCEPT hymn God?” The rhetorical question subtracts: age and lameness have removed every other capacity; the remaining one — rational praise — is precisely the human ἔργον no external can remove. The question is an inventory that ends at the essential.',
      },
      {
        number: '7.4',
        prompt: 'Doctrine: why does the passage state obligation with impersonal δεῖ rather than a command from God?',
        answer: 'δεῖ reads the obligation off the nature of things: BEING rational entails the vocation of praise, the way being a nightingale entails song. No commander issues it; the predicate λογικός εἰμι generates it. This is the Stoic structure of duty — discovered in one’s nature, not imposed from outside (cf. Latin oportet).',
      },
    ],
    quiz: [
      { question: 'εἰ ἤμην … ἐποίουν is what condition?', options: ['Future more vivid', 'Present contrary-to-fact — imperfects in both clauses', 'Simple present', 'General temporal'], correct: 1 },
      { question: 'τὰ τῆς ἀηδόνος means:', options: ['“The nightingale herself”', '“The things (proper work) of the nightingale”', '“To the nightingale”', '“Against the nightingale”'], correct: 1 },
      { question: 'νῦν δέ pivots from:', options: ['Past to future', 'Counterfactual to fact — “but as it is”', 'Question to answer', 'Greek to Latin'], correct: 1 },
      { question: 'ὑμνεῖν με δεῖ is:', options: ['A wish', 'Impersonal δεῖ + acc. + infinitive — “it is necessary for me to hymn”', 'A relative clause', 'Indirect statement'], correct: 1 },
      { question: 'γέρων χωλός functions as:', options: ['The object', 'Apposition to the subject — “I, a lame old man”', 'A vocative', 'A genitive absolute'], correct: 1 },
      { question: 'εἰ μή in the final question means:', options: ['“If not” beginning a condition', '“Except”', '“Unless ever”', '“Whether”'], correct: 1 },
      { question: 'The rhetorical question argues by:', options: ['Authority', 'Subtraction — every capacity removed but the one that was always the vocation', 'Analogy with swans only', 'Etymology'], correct: 1 },
      { question: 'Which PHIL session does this passage anchor?', options: ['PHIL 701 Session 2', 'PHIL 703 Session 7 — God, Providence, and the Fields of Training', 'PHIL 704 Session 10', 'PHIL 702 Session 1'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἀηδών', transliteration: 'aēdōn', english: 'nightingale' },
      { greek: 'κύκνος', transliteration: 'kyknos', english: 'swan' },
      { greek: 'λογικός', transliteration: 'logikos', english: 'rational' },
      { greek: 'ὑμνέω', transliteration: 'hymneō', english: 'to hymn, sing praise' },
      { greek: 'δεῖ', transliteration: 'dei', english: 'it is necessary (impersonal)' },
      { greek: 'χωλός', transliteration: 'chōlos', english: 'lame' },
    ],
  },

  // ── SESSION 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Meditations XII.36 — The Exit Speech',
    subtitle: 'ἄνθρωπε, ἐπολιτεύσω ἐν τῇ μεγάλῃ ταύτῃ πόλει — the last page of the Meditations',
    objectives: [
      'Read the opening of Meditations XII.36 — the book’s closing chapter',
      'Parse the aorist middle ἐπολιτεύσω and the vocative ἄνθρωπε',
      'Handle τί οὖν δεινόν and the rhetorical machinery of consolation',
      'Read the cosmopolis (ἡ μεγάλη πόλις) as the frame of a complete life',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Marcus Aurelius, Meditations XII.36 (opening):\n\nἌνθρωπε, ἐπολιτεύσω ἐν τῇ μεγάλῃ ταύτῃ πόλει· τί σοι διαφέρει, εἰ πέντε ἔτεσιν ἢ τρισίν; τὸ γὰρ κατὰ τοὺς νόμους ἴσον ἑκάστῳ. τί οὖν δεινόν, εἰ τῆς πόλεως ἀποπέμπει σε οὐ τύραννος οὐδὲ δικαστὴς ἄδικος, ἀλλ᾽ ἡ φύσις ἡ εἰσαγαγοῦσα;\n\nTranslation: “Man, you have been a citizen in this great city. What difference does it make to you, whether for five years or three? What accords with the laws is equal for each. What then is terrible, if it is not a tyrant nor an unjust judge who sends you out of the city, but nature, who brought you in?”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Ἄνθρωπε — vocative: “Man!” Marcus addresses himself by species, not by name or title — the emperor demoted to human being at the door of death, which is precisely the consolation. ἐπολιτεύσω — aorist middle 2nd sg. of πολιτεύομαι: “you have lived as a citizen.” The aorist views the whole civic life as one completed act (contrast the imperfect, which would leave it ongoing). ἐν τῇ μεγάλῃ ταύτῃ πόλει — the great city: the cosmos, the Stoic cosmopolis (PHIL 701, oikeiōsis; PHIL 703, II.10’s citizen of the world).\n\nτί σοι διαφέρει — impersonal: “what does it matter TO YOU” (dative). πέντε ἔτεσιν ἢ τρισίν — dative of measure/time: “by five years or three.” τὸ κατὰ τοὺς νόμους ἴσον ἑκάστῳ — “what accords with the laws is equal for each”: article + prepositional phrase again (Session 5’s sandwich) as subject.\n\nThe closing question: ἀποπέμπει σε — “sends you out” — with the subject withheld until the contrast lands: οὐ τύραννος οὐδὲ δικαστὴς ἄδικος, ἀλλ᾽ ἡ φύσις ἡ εἰσαγαγοῦσα — “not a tyrant, nor an unjust judge, but nature — the one who brought you in.” ἡ εἰσαγαγοῦσα: article + aorist participle of εἰσάγω, attributive: nature characterized by her original act. The evicting landlord is the same power that signed the lease.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'This is the completeness doctrine of Ep. 77 (PHIL 704, Session 4) in Marcus’s Greek, argued through civic law. Citizenship is not measured in tenure: τὸ κατὰ τοὺς νόμους — the lawful — is ἴσον, equal, for every citizen regardless of years served. The aorist ἐπολιτεύσω seals the life as a completed act of citizenship; completed acts do not have lengths that matter, only forms.\n\nAnd the last consolation is a participle. Death personified as tyrant or corrupt judge would be an injustice to resent; ἡ φύσις ἡ εἰσαγαγοῦσα — nature-who-brought-you-in — makes the exit the same jurisdiction as the entrance. You did not resent being ushered in; the usher is the same. The Meditations’ final chapter closes the book, the life, and the argument with one attributive participle. When you can feel why εἰσαγαγοῦσα is the most comforting word in the sentence, you are reading Greek as Marcus wrote it.',
      },
    ],
    exercises: [
      {
        number: '8.1',
        prompt: 'Parse: 1. ἐπολιτεύσω  2. διαφέρει  3. ἡ εἰσαγαγοῦσα',
        answer: '1. Aorist middle indicative 2nd sg. of πολιτεύομαι — “you have lived as a citizen” (the life viewed as one completed act). 2. Impersonal, “it makes a difference” + dative σοι. 3. Article + aorist active participle (feminine nominative) of εἰσάγω, attributive with ἡ φύσις — “nature, THE ONE WHO BROUGHT (you) IN.”',
      },
      {
        number: '8.2',
        prompt: 'Why the vocative ἄνθρωπε, addressed by an emperor to himself?',
        answer: 'Marcus addresses himself by species — “Man!” — not by rank. At the door of death the civic titles fall away, and the consolation that follows applies to the human as such: the citizenship being appraised is in the great city (the cosmos), where emperor and mule-driver hold the same passport (cf. VI.24).',
      },
      {
        number: '8.3',
        prompt: 'Explain πέντε ἔτεσιν ἢ τρισίν and the argument it serves.',
        answer: 'Dative of measure of difference: “(does it matter) BY five years or three?” The argument: lawful citizenship is equal for each regardless of tenure — length does not enter the measure of a completed civic life. Seneca’s quality-over-quantity doctrine (Ep. 77) in the grammar of Roman law.',
      },
      {
        number: '8.4',
        prompt: 'Doctrine: why is ἡ εἰσαγαγοῦσα the most consoling word in the passage?',
        answer: 'The attributive aorist participle identifies the evicting power as the same one that performed the original admission: nature-who-brought-you-in now sends you out. No tyrant, no unjust judge — the same jurisdiction at both doors. Resentment at the exit would indict the entrance you never resented. The participle closes the circle of the life, and the book.',
      },
    ],
    quiz: [
      { question: 'Ἄνθρωπε is:', options: ['Nominative subject', 'Vocative — Marcus addresses himself as “Man”', 'Accusative object', 'Genitive'], correct: 1 },
      { question: 'ἐπολιτεύσω is:', options: ['Present middle', 'Aorist middle 2nd sg. — the civic life viewed as one completed act', 'Future', 'Perfect'], correct: 1 },
      { question: 'ἡ μεγάλη πόλις refers to:', options: ['Rome', 'Athens', 'The cosmos — the Stoic cosmopolis', 'The afterlife'], correct: 2 },
      { question: 'πέντε ἔτεσιν ἢ τρισίν is:', options: ['Accusative of duration', 'Dative of measure of difference — “by five years or three”', 'Genitive of time', 'Nominative'], correct: 1 },
      { question: 'Who does NOT send you out of the city?', options: ['Nature', 'A tyrant or an unjust judge', 'The laws', 'The logos'], correct: 1 },
      { question: 'ἡ εἰσαγαγοῦσα is:', options: ['A finite verb', 'Article + aorist participle, attributive — “the one who brought (you) in”', 'An infinitive', 'A noun'], correct: 1 },
      { question: 'The completeness argument runs:', options: ['Longer lives are better lives', 'Lawful citizenship is equal for each — completed acts have forms, not lengths that matter', 'Only emperors live complete lives', 'Nature is unjust but strong'], correct: 1 },
      { question: 'This chapter’s place in the Meditations:', options: ['The opening', 'XII.36 — the final chapter: the book, life, and argument close together', 'The middle of Book VI', 'It is spurious'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'πολιτεύομαι', transliteration: 'politeuomai', english: 'to live as a citizen' },
      { greek: 'πόλις', transliteration: 'polis', english: 'city' },
      { greek: 'διαφέρει', transliteration: 'diapherei', english: 'it makes a difference (impersonal)' },
      { greek: 'τύραννος', transliteration: 'tyrannos', english: 'tyrant' },
      { greek: 'δικαστής', transliteration: 'dikastēs', english: 'judge' },
      { greek: 'εἰσάγω', transliteration: 'eisagō', english: 'to bring in, introduce' },
    ],
  },

  // ── SESSION 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'Enchiridion §53 — The Verses to Carry',
    subtitle: 'ἄγου δέ μ᾽, ὦ Ζεῦ — Cleanthes, Socrates, and the handbook’s last words',
    objectives: [
      'Read the prayer of Cleanthes and the Socrates quotations that close the Enchiridion',
      'Parse the present middle imperative ἄγου and the perfect διατεταγμένος',
      'Handle μέν … δέ with δύνανται in the Anytus-and-Meletus line',
      'Assemble the three quotations into the school’s final teaching',
    ],
    parts: [
      {
        heading: 'Part 1 — The Texts',
        body: 'Epictetus, Enchiridion §53 (selections):\n\n(Cleanthes) Ἄγου δέ μ᾽, ὦ Ζεῦ, καὶ σύ γ᾽ ἡ Πεπρωμένη, ὅποι ποθ᾽ ὑμῖν εἰμι διατεταγμένος· ὡς ἕψομαί γ᾽ ἄοκνος· ἢν δέ γε μὴ θέλω, κακὸς γενόμενος, οὐδὲν ἧττον ἕψομαι.\n\n“Lead me, O Zeus, and you, Destiny, wherever I have been appointed by you; for I shall follow without hesitation. And if, grown bad, I be unwilling — I shall follow no less.”\n\n(Socrates) ὦ Κρίτων, εἰ ταύτῃ τοῖς θεοῖς φίλον, ταύτῃ γινέσθω. — “Crito, if it so pleases the gods, so let it be.”\n\nἐμὲ δὲ Ἄνυτος καὶ Μέλητος ἀποκτεῖναι μὲν δύνανται, βλάψαι δὲ οὔ. — “Anytus and Meletus can kill me — but harm me, they cannot.”',
      },
      {
        heading: 'Part 2 — The Parse',
        body: 'Ἄγου — present MIDDLE/PASSIVE imperative of ἄγω: “lead me” — literally “be leading (with respect to) me,” the continuous aspect of a lifelong following. ὦ Ζεῦ — vocative with ὦ; ἡ Πεπρωμένη — “the Destined One,” perfect participle of πόρω-stem, personified Destiny. ὅποι ποθ᾽ … εἰμι διατεταγμένος — “wherever I stand appointed”: perfect passive periphrastic (εἰμι + perfect participle of διατάσσω) — the posting is a standing military assignment. ἕψομαι — future of ἕπομαι, “I shall follow.” ἢν … μὴ θέλω — “but if I be unwilling” (ἢν = ἐάν + subjunctive): the option of refusal is named — κακὸς γενόμενος, “having become bad,” an aorist participle carrying the whole moral verdict — and then cancelled: οὐδὲν ἧττον ἕψομαι, “I shall follow NO LESS.” Fate is not optional; only the manner of going is.\n\nSocrates to Crito: ταύτῃ … ταύτῃ — “in this way … in this way”: dative of manner, echoed; γινέσθω — 3rd person present imperative of γίγνομαι, “let it come about.” And the courtroom line: ἀποκτεῖναι μὲν δύνανται, βλάψαι δὲ οὔ — two aorist infinitives with δύνανται, split by μέν … δέ: “to KILL, they are able; to HARM — no.” The οὔ standing alone at the end is the most defiant monosyllable in Greek literature.',
      },
      {
        heading: 'Part 3 — The Doctrine in the Grammar',
        body: 'Arrian ended the Enchiridion with quotations — the handbook’s last teaching is that the tradition speaks through you when your own words fail. Cleanthes gives the cosmology: the follower follows willingly or unwillingly, but follows; freedom is located entirely in the adverb ἄοκνος (unhesitating) and the participle κακὸς γενόμενος — WHAT you are while following. Marcus’s ducunt volentem fata, nolentem trahunt (you will read Seneca’s Latin rendering in LATN 201) is this Greek, translated.\n\nThe Socrates lines split the world with μέν … δέ: killing μέν — within their power; harming δέ — not. That distinction is the entire Academy — PHIL 701’s dichotomy, 703’s IV.1, 704’s open door — held in two infinitives and a negative. Memorize all three quotations. Epictetus’s instruction for §53 is exactly that: these are the verses to have πρόχειρον — at hand — for the moments when philosophy must arrive faster than reasoning. This is the last session before your final reading; the school’s parting gift is a pocket liturgy.',
      },
    ],
    exercises: [
      {
        number: '9.1',
        prompt: 'Parse: 1. ἄγου  2. διατεταγμένος εἰμι (as a unit)  3. γινέσθω  4. δύνανται',
        answer: '1. Present middle/passive imperative 2nd sg. of ἄγω — “lead (me)” with continuous aspect. 2. Perfect passive periphrastic of διατάσσω — “I stand appointed/posted.” 3. Present imperative 3rd sg. of γίγνομαι — “let it come about.” 4. Present deponent 3rd pl. of δύναμαι + aorist infinitives — “they are able (to kill / to harm).”',
      },
      {
        number: '9.2',
        prompt: 'Where exactly does Cleanthes locate freedom, given that following is not optional?',
        answer: 'In the manner of following: ἄοκνος (“without hesitation”) if willing, or κακὸς γενόμενος (“having become bad”) if resisting — but ἕψομαι either way. Fate determines the route; the follower determines only whether he walks or is dragged, and what that makes of him. Freedom is an adverb, not an exemption.',
      },
      {
        number: '9.3',
        prompt: 'Explain the μέν … δέ structure of the Anytus-and-Meletus line and its doctrinal weight.',
        answer: 'ἀποκτεῖναι μέν δύνανται — “to kill, on the one hand, they are able” — βλάψαι δὲ οὔ — “to harm, on the other, no.” The particles split the accusers’ power exactly along the dichotomy of control: the body (killable) vs the prohairesis (unharmable). The bare final οὔ carries the whole Stoic defiance.',
      },
      {
        number: '9.4',
        prompt: 'Why does the Enchiridion END in quotations, and what practice does §53 prescribe?',
        answer: 'Because the handbook’s last lesson is the pocket liturgy: verses held πρόχειρον for moments when philosophy must arrive faster than reasoning — grief, threat, the summons. When your own sentences fail, the tradition speaks through memorized ones. §53 prescribes carrying these exact lines; the genre of the carried maxim (Sessions 3–4) here becomes explicit instruction.',
      },
    ],
    quiz: [
      { question: 'ἄγου is what form?', options: ['Aorist active imperative', 'Present middle/passive imperative — “lead (me),” continuous', 'Future indicative', 'Infinitive'], correct: 1 },
      { question: 'ἡ Πεπρωμένη is:', options: ['A city', 'Personified Destiny — “the Destined One” (perfect participle)', 'A muse', 'The soul'], correct: 1 },
      { question: 'εἰμι διατεταγμένος is:', options: ['A future', 'Perfect passive periphrastic — “I stand appointed” (a standing posting)', 'An aorist middle', 'A wish'], correct: 1 },
      { question: 'If unwilling, the follower:', options: ['Escapes fate', 'Follows no less — οὐδὲν ἧττον ἕψομαι — but as one “grown bad”', 'Is forgiven', 'Becomes a swan'], correct: 1 },
      { question: 'γινέσθω means:', options: ['“It happened”', '“Let it come about” — 3rd person imperative', '“It will happen”', '“May it not happen”'], correct: 1 },
      { question: 'ἀποκτεῖναι μὲν δύνανται, βλάψαι δὲ οὔ splits:', options: ['Past from future', 'Killing (in their power) from harming (not) — the dichotomy of control in two infinitives', 'Gods from men', 'Anytus from Meletus'], correct: 1 },
      { question: 'The Latin rendering you will meet in LATN 201 is:', options: ['vindica te tibi', 'ducunt volentem fata, nolentem trahunt', 'memento mori', 'amor fati'], correct: 1 },
      { question: '§53’s prescribed practice is:', options: ['Daily fasting', 'Carrying these verses πρόχειρον — a pocket liturgy for moments faster than reasoning', 'Silent meditation', 'Public recitation'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἄγω', transliteration: 'agō', english: 'to lead' },
      { greek: 'ἕπομαι', transliteration: 'hepomai', english: 'to follow (+ dat.)' },
      { greek: 'διατάσσω', transliteration: 'diatassō', english: 'to appoint, station' },
      { greek: 'ἄοκνος', transliteration: 'aoknos', english: 'unhesitating' },
      { greek: 'ἀποκτείνω', transliteration: 'apokteinō', english: 'to kill' },
      { greek: 'ἧττον', transliteration: 'hētton', english: 'less (οὐδὲν ἧττον — no less)' },
    ],
  },

  // ── SESSION 10 ─────────────────────────────────────────────────────────────
  {
    id: 10,
    title: 'FINAL — Sight Reading & the Reader’s Commission',
    subtitle: 'Meditations II.14 at sight · the course synthesized · reading Greek for life',
    isMilestone: true,
    objectives: [
      'Translate an unseen passage of Marcus (Meditations II.14) at sight',
      'Parse any construction from Sessions 1–9 on demand',
      'Recite the three carried texts (Ench §5, §8, and the §53 verses) from memory',
      'Leave with a program for reading the Meditations entire in Greek',
    ],
    parts: [
      {
        heading: 'Part 1 — The Sight Passage',
        body: 'Read at sight, then check. Marcus Aurelius, Meditations II.14 (core):\n\nὅτι οὐδεὶς ἄλλον βίον ἀπολλύει ἢ τοῦτον ὃν ζῇ, οὐδὲ ἄλλον ζῇ ἢ ὃν ἀπολλύει … τὸ γὰρ παρὸν μόνον ἀποστερεῖσθαι δύναταί τις, εἴπερ τοῦτο μόνον ἔχει.\n\nTranslation: “…that no one loses any other life than the one he is living, nor lives any other than the one he is losing … For a person can be deprived only of the present, since this alone is what he has.”\n\nConstructions at sight: ἄλλον … ἤ — “other than”; the relative ὃν ζῇ (“which he lives”) with its antecedent attracted forward; the mirrored chiasm (loses-what-he-lives / lives-what-he-loses); τὸ παρόν — substantival participle, “the present” (Session 6’s pattern); ἀποστερεῖσθαι δύναται — passive infinitive with δύναμαι; εἴπερ — “if indeed, since.”',
      },
      {
        heading: 'Part 2 — The Course, Synthesized',
        body: 'Ten sessions, one skill: you now read the two central authors of Roman Stoicism in their own Greek. The constructions you can parse on sight: general clauses with ἄν + subjunctive (ὅταν, ἧς ἂν ὥρας); contrary-to-fact conditions (Socrates’ ἂν ἐφαίνετο; the nightingale’s ἤμην/ἐποίουν); aorist vs present imperatives and the surgery of the maxims; perfect tenses as settled states (συμβέβηκεν, ἦρται, γέγονα, διατεταγμένος); substantival participles (τὰ γινόμενα, τὸ παρόν, ἡ εἰσαγαγοῦσα); the attributive sandwich (τὰ περὶ τῶν πραγμάτων δόγματα); impersonals (δεῖ, ἔξεστι, διαφέρει); and the particle architecture of μέν … δέ, οὐ … ἀλλά.',
        callout: {
          label: 'The reading program',
          text: 'Stage 1: Meditations Book II entire (short, and you hold II.1 and II.14). Stage 2: the Enchiridion complete in Greek — you hold §§1, 5, 8, 53. Stage 3: Meditations IV and V. Stage 4: Discourses I.1 and IV.1 with a facing translation. Method unchanged: a little daily, digested — ὀλίγον ἀλλὰ καθ᾽ ἡμέραν.',
        },
      },
      {
        heading: 'Part 3 — The Examination and the Commission',
        body: 'The exercises below are the final: sight translation, parse battery, and recitation. Work them closed-book.\n\nAnd take the commission. Marcus wrote his Greek for no reader; Epictetus spoke his for a room that vanished; Arrian and the copyists carried the words twenty centuries to reach you. The Academy’s Greek track ends where PHIL 704 ended — posterorum negotium ago, “I do the business of later generations” — except now you can hear it in both tongues, and the business is done. τὰ ἐν χερσί: what is in your hands. Read a little every day, and the great dead are at home to every caller.',
      },
    ],
    exercises: [
      {
        number: '10.1',
        prompt: 'FINAL, Part A — Sight translation: translate the II.14 passage without notes, then identify the chiasm.',
        answer: 'See Part 1. The chiasm: οὐδεὶς ἄλλον βίον ἀπολλύει ἢ τοῦτον ὃν ζῇ (loses only what he lives) mirrored by οὐδὲ ἄλλον ζῇ ἢ ὃν ἀπολλύει (lives only what he loses) — the two verbs swap positions, locking present-life and present-loss into identity. Only the present can be taken, εἴπερ τοῦτο μόνον ἔχει — since it alone is possessed.',
      },
      {
        number: '10.2',
        prompt: 'FINAL, Part B — Parse battery: 1. συντεύξομαι  2. ἐξόν  3. ἔστω  4. ἄφελε  5. ἂν ἐφαίνετο  6. εὐροήσεις  7. ἐπολιτεύσω  8. διατεταγμένος',
        answer: '1. Future middle of συντυγχάνω (S1). 2. Accusative absolute of ἔξεστι (S2). 3. 3rd sg. imperative of εἰμί (S3). 4. Aorist imperative of ἀφαιρέω (S4). 5. ἄν + imperfect — past counterfactual (S5). 6. Future of εὐροέω (S6). 7. Aorist middle 2nd sg. of πολιτεύομαι (S8). 8. Perfect passive participle of διατάσσω, in periphrastic with εἰμι (S9).',
      },
      {
        number: '10.3',
        prompt: 'FINAL, Part C — Recitation: write from memory the Greek of (a) Ench §5’s first clause, (b) Ench §8, (c) the Anytus-and-Meletus line.',
        answer: '(a) Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα. (b) Μὴ ζήτει τὰ γινόμενα γίνεσθαι ὡς θέλεις, ἀλλὰ θέλε τὰ γινόμενα ὡς γίνεται, καὶ εὐροήσεις. (c) ἐμὲ δὲ Ἄνυτος καὶ Μέλητος ἀποκτεῖναι μὲν δύνανται, βλάψαι δὲ οὔ.',
      },
      {
        number: '10.4',
        prompt: 'FINAL, Part D — Synthesis: II.14 claims only the present can be lost. Connect this to Ench §8 and XII.36 in one paragraph, citing the Greek.',
        answer: 'II.14’s chiasm identifies life with the present (τὸ παρόν): what you live and what you can lose are one moment. Ench §8 prescribes the posture toward that moment — θέλε τὰ γινόμενα ὡς γίνεται — willing the present as it arrives, which makes it unlosable in the only sense that matters. XII.36 then closes the account: the completed civic life (ἐπολιτεύσω, aorist) has a form, not a length, and ἡ φύσις ἡ εἰσαγαγοῦσα collects only what she lent — the present, returned. Three passages, one doctrine: possession, consent, and surrender of the same single moment.',
      },
    ],
    quiz: [
      { question: 'τὸ παρόν is:', options: ['An adverb', 'A substantival participle — “the present”', 'A finite verb', 'A preposition'], correct: 1 },
      { question: 'II.14’s central claim:', options: ['The past is what we lose at death', 'Only the present can be lost, because only the present is possessed', 'The future belongs to the brave', 'Life is longer than it seems'], correct: 1 },
      { question: 'ἄλλον … ἤ means:', options: ['“Either … or”', '“Other … than”', '“Both … and”', '“Neither … nor”'], correct: 1 },
      { question: 'εἴπερ means:', options: ['“Unless”', '“If indeed, since”', '“Whenever”', '“Although”'], correct: 1 },
      { question: 'Which is NOT in your parsing toolkit after ten sessions?', options: ['The attributive sandwich', 'General relatives with ἄν + subjunctive', 'The aorist optative in wishes', 'Perfect passive periphrastics'], correct: 2 },
      { question: 'Stage 1 of the reading program:', options: ['The Iliad', 'Meditations Book II entire', 'Plato’s Republic', 'The Septuagint'], correct: 1 },
      { question: 'ὀλίγον ἀλλὰ καθ᾽ ἡμέραν renders which method?', options: ['Cramming before exams', '“A little, but every day” — Seneca’s unum aliquid in Greek dress', 'Reading only translations', 'Memorizing whole books'], correct: 1 },
      { question: 'What makes this session a milestone?', options: ['New grammar is introduced', 'Unseen Greek read at sight + recitation from memory — the course’s skill demonstrated whole', 'It is the longest session', 'It contains no Greek'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἀπόλλυμι', transliteration: 'apollymi', english: 'to lose, destroy' },
      { greek: 'βίος', transliteration: 'bios', english: 'life' },
      { greek: 'τὸ παρόν', transliteration: 'to paron', english: 'the present (moment)' },
      { greek: 'ἀποστερέω', transliteration: 'apostereō', english: 'to deprive, rob' },
      { greek: 'εἴπερ', transliteration: 'eiper', english: 'if indeed, since' },
      { greek: 'ζάω', transliteration: 'zaō', english: 'to live' },
    ],
  },
];

