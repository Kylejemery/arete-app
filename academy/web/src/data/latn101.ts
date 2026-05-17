// LATN 101 — Latin for Philosophers
// Sessions 1-10 · Unit I: The Grammar Foundation
// Target text: Seneca, Epistulae Morales I.1

import type { LanguageSession } from './grek101';

// LATN reuses the GREK LanguageSession shape, but vocabulary items use
// `latin` (not `greek`) and add an explicit `pronunciation` guide.
export type LatinVocab = { latin: string; pronunciation: string; english: string };
export type LatinSession = Omit<LanguageSession, 'vocabulary'> & {
  vocabulary: LatinVocab[];
};

const SENECA_I_1 =
  'Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc auferebatur aut diripiebatur aut excidebat, collide et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit. Et si volueris attendere, magna pars vitae elabitur male agentibus, maxima nihil agentibus, tota vita aliud agentibus.';

export const LATN_101_SESSIONS: LatinSession[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'The Latin Alphabet & Pronunciation',
    subtitle: 'Alphabet · long/short vowels · syllable stress · the five core philosophical terms',
    targetText: SENECA_I_1,
    objectives: [
      'Pronounce classical Latin accurately using restored pronunciation',
      'Distinguish long and short vowels and understand syllable stress',
      'Read and translate the five foundational Latin terms for Stoic philosophy',
      'Encounter Seneca’s first letter for the first time',
    ],
    parts: [
      {
        heading: 'Part 1 — Why Seneca?',
        body: '"Ita fac, mi Lucili: vindica te tibi." Do this, my Lucilius: claim yourself for yourself. Seneca wrote this line roughly 65 AD, weeks or months before Nero forced him to commit suicide. It is one of the most concentrated sentences in philosophical history — four words that contain an entire theory of life. The verb vindicare means to claim, to defend, to liberate. The object is te — yourself. And tibi — for yourself, to yourself. The sentence is in the second person, addressed directly to you. Seneca writes the entire Letters to Lucilius in this mode: the philosopher speaking to the specific person in front of him, demanding something.',
        callout: {
          label: 'The end goal',
          text: 'By Session 10 you will read and parse Seneca’s opening letter — Epistulae Morales I.1 — without a translation. Everything before that is in service of that moment.',
        },
      },
      {
        heading: 'Part 2 — The Latin Alphabet',
        body: 'The Latin alphabet is the ancestor of our own. With two exceptions (no J or W in classical Latin; V served double duty as vowel and consonant), it is the same 23 letters. The key difference is pronunciation — classical Latin sounds quite different from the church Latin many people first encounter.',
        paradigms: [
          {
            title: 'Classical Latin Pronunciation',
            headers: ['Letter', 'Classical Sound', 'Note', 'Example'],
            rows: [
              ['A', 'a as in father', 'Always open — never as in "cat"', 'animus (soul, mind)'],
              ['B', 'b', 'Standard', 'bonus (good)'],
              ['C', 'k always', 'Never soft c — Caesar = KAI-sar', 'Cicero = KI-ke-ro'],
              ['D', 'd', 'Standard', 'dico (I say)'],
              ['E', 'e as in pet (short)', 'Long ē as in "they"', 'esse (to be)'],
              ['F', 'f', 'Standard', 'facio (I do/make)'],
              ['G', 'g hard always', 'Never soft — regina = re-GI-na', 'genus (kind/race)'],
              ['H', 'h (light aspirate)', 'Barely voiced, sometimes silent', 'homo (human being)'],
              ['I', 'i as in machine', 'Long ī; as consonant = y in "yes"', 'ira (anger)'],
              ['K', 'k', 'Rare — mostly in Kalends', '(rare)'],
              ['L', 'l (clear, never dark)', 'Always clear — never as in "full"', 'liber (free/book)'],
              ['M', 'm', 'Standard; final m often light', 'mens (mind)'],
              ['N', 'n', 'Standard', 'natura (nature)'],
              ['O', 'o as in more (short)', 'Long ō as in "tone"', 'otium (leisure)'],
              ['P', 'p', 'Aspirated slightly', 'pax (peace)'],
              ['Q', 'qu = kw', 'Always followed by u', 'qui (who)'],
              ['R', 'r (trilled)', 'Always trilled — no English r', 'ratio (reason)'],
              ['S', 's always', 'Never z sound — rosa = RO-sa', 'sapientia (wisdom)'],
              ['T', 't always', 'Never sh — ratio = RA-ti-o', 'tempus (time)'],
              ['V', 'w or u', 'As consonant: w. As vowel: u.', 'virtus = WIR-tus'],
              ['X', 'ks', 'Standard', 'exemplum (example)'],
              ['Y', 'ü (French u)', 'Only in Greek loanwords', 'tyrannus (tyrant)'],
              ['Z', 'z (or dz)', 'Only in Greek loanwords', 'zona (zone)'],
            ],
          },
        ],
        callout: {
          label: 'Restored vs. church Latin',
          text: 'Academic Latin uses the restored classical pronunciation — how educated Romans of Cicero’s era actually spoke. Church (Ecclesiastical) Latin differs sharply: C softens before e/i, V becomes v, ae becomes e. For reading Seneca, restored classical is the standard.',
        },
      },
      {
        heading: 'Part 3 — The Five Core Terms',
        body: 'These five terms form the backbone of Stoic Latin vocabulary. You will encounter every one of them in the first letter of Seneca.',
        paradigms: [
          {
            title: 'The Five Core Terms',
            headers: ['Latin', 'Pronunciation', 'Core Meaning', 'Stoic Usage'],
            rows: [
              ['virtus', 'WIR-tus', 'virtue, excellence, strength', 'The only genuine good; corresponds to Greek aretē; the full exercise of reason directed at the good'],
              ['ratio', 'RA-ti-o', 'reason, account, plan', 'The faculty of reason; the logos translated into Latin; what distinguishes humans from animals'],
              ['natura', 'na-TU-ra', 'nature', 'The rational order of the universe; to live secundum naturam — according to nature — is the Stoic telos'],
              ['animus', 'A-ni-mus', 'soul, mind, spirit, courage', 'The rational soul in the human being; the seat of impressions, assent, and impulse'],
              ['sapientia', 'sa-pi-EN-ti-a', 'wisdom', 'The knowledge proper to the Sage; what Seneca is writing toward in every letter to Lucilius'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '1.1',
        prompt: 'Pronounce and transliterate these Latin words. Write out how you would say each one using the pronunciation guide, then give the English meaning from the Core Terms table: virtus · ratio · natura · animus · sapientia · bonus · vita · mens',
        answer: 'virtus (WIR-tus, virtue) · ratio (RA-ti-o, reason) · natura (na-TU-ra, nature) · animus (A-ni-mus, soul/mind) · sapientia (sa-pi-EN-ti-a, wisdom) · bonus (BO-nus, good) · vita (WI-ta, life) · mens (mens, mind)',
      },
      {
        number: '1.2',
        prompt: 'Caesar’s name is often mispronounced by English speakers. Using the pronunciation rules from Part 2: a) How is "Caesar" correctly pronounced in classical Latin? b) How is "Cicero" correctly pronounced? c) Why does "ratio" NOT sound like the English word "ratio"?',
        answer: 'a) KAI-sar (C is always k; ae = ai diphthong) · b) KI-ke-ro (C always k; second syllable stress) · c) Latin t is always t, never sh — ratio = RA-ti-o, not RAY-shee-oh',
      },
      {
        number: '1.3',
        prompt: 'Matching — connect each Latin term to its closest philosophical concept: 1. virtus  2. ratio  3. natura  4. animus  5. sapientia / A. The rational order of the cosmos, which the Sage aligns with  B. The soul — site of impressions, assent, and impulse  C. Excellence in the full exercise of reason — the only real good  D. Wisdom proper to the Sage — goal of philosophical formation  E. The distinctively human faculty — what logos becomes in Latin',
        answer: '1-C (virtus = excellence/only good) · 2-E (ratio = logos in Latin) · 3-A (natura = cosmic rational order) · 4-B (animus = the soul/seat of assent) · 5-D (sapientia = Sage’s wisdom)',
      },
      {
        number: '1.4',
        prompt: 'First Encounter — Read Seneca’s opening sentence: "Ita fac, mi Lucili: vindica te tibi." You cannot fully parse this yet. But try: a) Identify every letter and mark any that surprised you. b) The word "tibi" — what case might a word ending in -i be? (You will learn this in Session 7.) c) What does this sentence feel like — who is speaking to whom, and what is the emotional register?',
        answer: 'a) All classical Latin letters — V pronounced w. b) The -ī ending is dative singular (taught fully in Session 7): "to/for yourself." c) Seneca is speaking directly to Lucilius — and by extension to the reader. The tone is urgent, intimate, demanding. This is philosophy as direct address, not abstract lecture.',
      },
    ],
    quiz: [
      { question: 'In classical Latin pronunciation, the letter C is always:', options: ['Soft, like s before e/i', 'Hard, like k always', 'Silent before vowels', 'Like ch in "church"'], correct: 1 },
      { question: 'The Latin word "virtus" most closely corresponds to which Greek term?', options: ['sophia', 'logos', 'aretē', 'psychē'], correct: 2 },
      { question: 'How is "ratio" correctly pronounced in classical Latin?', options: ['RAY-shee-oh', 'RAH-tsee-oh', 'RA-ti-o', 'RAY-tio'], correct: 2 },
      { question: 'The letter V in classical Latin serves as:', options: ['Only a consonant (v sound)', 'Only a vowel (u sound)', 'Both consonant (w) and vowel (u) depending on position', 'Never pronounced — always silent'], correct: 2 },
      { question: 'Seneca’s "vindica te tibi" contains which philosophical core term obliquely?', options: ['ratio', 'natura', 'The concept of animus (the self to be claimed)', 'sapientia'], correct: 2 },
      { question: 'Latin S is always:', options: ['An s sound — never like z', 'A z sound before voiced consonants', 'Silent after vowels', 'Like sh before i'], correct: 0 },
      { question: 'The Latin "natura" in Stoic philosophy refers primarily to:', options: ['The natural world — plants and animals', 'The rational order of the cosmos that the Sage aligns with', 'Human instinct and appetite', 'Agricultural and biological processes'], correct: 1 },
      { question: 'Which Latin letter does NOT exist in the classical alphabet?', options: ['K', 'Y', 'J', 'Z'], correct: 2 },
      { question: '"Sapientia" in Seneca’s usage means:', options: ['Basic competence in philosophy', 'The wisdom of the ideal Sage — the goal of philosophical formation', 'Book learning and rhetorical skill', 'Practical wisdom in everyday affairs'], correct: 1 },
      { question: 'Final "m" in Latin words like "animum" is:', options: ['Always fully pronounced', 'Often light or almost silent — especially in poetry', 'Never pronounced', 'Pronounced as ng'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'virtus, virtutis', pronunciation: 'WIR-tus', english: 'virtue, excellence, strength' },
      { latin: 'ratio, rationis', pronunciation: 'RA-ti-o', english: 'reason, account, plan' },
      { latin: 'natura, naturae', pronunciation: 'na-TU-ra', english: 'nature' },
      { latin: 'animus, animi', pronunciation: 'A-ni-mus', english: 'soul, mind, spirit, courage' },
      { latin: 'sapientia, sapientiae', pronunciation: 'sa-pi-EN-ti-a', english: 'wisdom' },
      { latin: 'vindicare', pronunciation: 'win-DI-ka-re', english: 'to claim, defend, liberate' },
    ],
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'First & Second Declension Nouns',
    subtitle: 'The -a and -us/-um stems · vita, animus, verbum · the six cases of Latin',
    targetText: SENECA_I_1,
    objectives: [
      'Name and understand the function of all six Latin cases',
      'Decline first declension nouns (vita, -ae) in full — singular and plural',
      'Decline second declension masculine (animus, -i) and neuter (verbum, -i) nouns in full',
      'Identify noun forms by their endings without a dictionary',
    ],
    parts: [
      {
        heading: 'Part 1 — Latin Has Six Cases',
        body: 'Latin has six cases. Greek has five. The extra case is the ablative — which absorbs functions that Greek splits between the genitive and dative. Mastering the ablative is the key to reading Latin prose fluently, because Seneca uses it constantly.',
        paradigms: [
          {
            title: 'The Six Latin Cases',
            headers: ['Case', 'Primary Function', 'English Signal', 'Seneca Example'],
            rows: [
              ['Nominative', 'Subject of the sentence', '"X does..."', 'vita brevis est — life is short'],
              ['Genitive', 'Possession, "of"', '"of X"', 'tempus vitae — the time of life'],
              ['Dative', 'Indirect object, "to/for"', '"to/for X"', 'mihi — for me / to me'],
              ['Accusative', 'Direct object; motion toward', '"X" (object)', 'vindica te — claim yourself'],
              ['Ablative', 'Separation, means, manner, agent', '"by/with/from X"', 'animo libero — with a free mind'],
              ['Vocative', 'Direct address', '"O X!"', 'mi Lucili — my Lucilius'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — First Declension: vita, vitae (life)',
        body: 'First declension nouns almost always end in -a in the nominative singular and are feminine. They follow the vita pattern exactly. Key Stoic first declension nouns: vita (life), natura (nature), gloria (glory/reputation), forma (form/appearance), fortuna (fortune).',
        paradigms: [
          {
            title: 'First Declension — vita, vitae (f.) — life',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'vita', '-a', 'vitae', '-ae'],
              ['Genitive', 'vitae', '-ae', 'vitarum', '-arum'],
              ['Dative', 'vitae', '-ae', 'vitis', '-is'],
              ['Accusative', 'vitam', '-am', 'vitas', '-as'],
              ['Ablative', 'vita', '-a', 'vitis', '-is'],
              ['Vocative', 'vita', '-a', 'vitae', '-ae'],
            ],
          },
        ],
        callout: {
          label: 'Watch out',
          text: 'Nominative and ablative singular are identical (-a). Genitive, dative, and vocative plural are identical (-ae). Context and word order resolve the ambiguity — Latin relies on you to read carefully.',
        },
      },
      {
        heading: 'Part 3 — Second Declension: animus and verbum',
        body: 'Second declension contains two genders: masculine (-us nominative) and neuter (-um nominative). The same endings serve both, with one critical difference — neuter nominative, accusative, and vocative are always identical.',
        paradigms: [
          {
            title: 'Second Declension Masculine — animus, -i (m.) — soul/mind',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'animus', '-us', 'animi', '-i'],
              ['Genitive', 'animi', '-i', 'animorum', '-orum'],
              ['Dative', 'animo', '-o', 'animis', '-is'],
              ['Accusative', 'animum', '-um', 'animos', '-os'],
              ['Ablative', 'animo', '-o', 'animis', '-is'],
              ['Vocative', 'anime', '-e', 'animi', '-i'],
            ],
          },
          {
            title: 'Second Declension Neuter — verbum, -i (n.) — word',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'verbum', '-um', 'verba', '-a'],
              ['Genitive', 'verbi', '-i', 'verborum', '-orum'],
              ['Dative', 'verbo', '-o', 'verbis', '-is'],
              ['Accusative', 'verbum', '-um', 'verba', '-a'],
              ['Ablative', 'verbo', '-o', 'verbis', '-is'],
              ['Vocative', 'verbum', '-um', 'verba', '-a'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Core Vocabulary',
        body: 'Memorize the nominative + genitive pair for each — that pair is the dictionary entry for any Latin noun and tells you the declension.',
        paradigms: [
          {
            title: '1st & 2nd Declension Philosophical Nouns',
            headers: ['Latin', 'Gen.', 'Gender', 'English', 'Stoic Note'],
            rows: [
              ['vita', 'vitae', 'f.', 'life', 'vita beata — the happy life; Stoic goal expressed via Latin'],
              ['natura', 'naturae', 'f.', 'nature', 'secundum naturam vivere — to live according to nature'],
              ['gloria', 'gloriae', 'f.', 'glory, reputation', 'gloria = doxa — external, not up to us'],
              ['fortuna', 'fortunae', 'f.', 'fortune, chance', 'Seneca: fortune gives nothing it cannot take back'],
              ['animus', 'animi', 'm.', 'soul, mind, spirit', 'seat of ratio and virtus; the inner person'],
              ['anima', 'animae', 'f.', 'breath, life-force', 'biological life — contrast with animus (rational soul)'],
              ['dominus', 'domini', 'm.', 'lord, master', 'Epictetus’s dominus — but animus is never enslaved'],
              ['verbum', 'verbi', 'n.', 'word', 'ratio and verbum — reason and word, logos in Latin dress'],
              ['otium', 'otii', 'n.', 'leisure, rest', 'Seneca’s otium: philosophical leisure — vindicated withdrawal'],
              ['officium', 'officii', 'n.', 'duty, function', 'Stoic role ethics: your officium follows your nature'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '2.1',
        prompt: 'Decline natura, naturae (f.) in full — all six cases, singular and plural. Follow the vita model.',
        answer: 'Nom: natura/naturae · Gen: naturae/naturarum · Dat: naturae/naturis · Acc: naturam/naturas · Abl: natura/naturis · Voc: natura/naturae',
      },
      {
        number: '2.2',
        prompt: 'Parse each form — give case, number, gender, and dictionary entry: a) animi (two possible answers)  b) animum  c) vitas  d) verbo (two possible)  e) vitae (three possible)',
        answer: 'a) gen. sg. masc. OR nom. pl. masc. — animus · b) acc. sg. masc. — animus · c) acc. pl. fem. — vita · d) dat. sg. OR abl. sg. masc./neut. — verbum · e) gen. sg. OR dat. sg. OR nom. pl. fem. — vita',
      },
      {
        number: '2.3',
        prompt: 'Translate into Latin: a) of the mind (genitive sg.)  b) with a free soul (ablative — use liber, -a, -um for "free")  c) for life (dative sg.)  d) O Lucilius! (vocative of Lucilius, -i)',
        answer: 'a) animi · b) animo libero · c) vitae · d) Lucili',
      },
      {
        number: '2.4',
        prompt: 'Seneca Preview — Seneca opens Letter I: "Ita fac, mi Lucili: vindica te tibi." The word "tibi" is dative singular of "tu" (you). Compare to the dative endings you have learned. Then look at "vitae" and "animis" — which declension does each belong to, and what case(s) could each be?',
        answer: 'tibi — dative/ablative of personal pronoun tu (irregular, not 1st/2nd decl.) · vitae — 1st decl.: could be gen. sg., dat. sg., or nom. pl. · animis — 2nd decl.: could be dat. pl. or abl. pl. Context determines which.',
      },
    ],
    quiz: [
      { question: 'Which Latin case is absent from Greek?', options: ['Dative', 'Genitive', 'Ablative', 'Vocative'], correct: 2 },
      { question: 'The genitive singular of vita is:', options: ['vitam', 'vitas', 'vitae', 'vita'], correct: 2 },
      { question: 'The neuter rule in Latin states that:', options: ['Neuter nouns have no plural', 'Neuter nominative, accusative, and vocative are always identical', 'Neuter nouns use first declension endings', 'Neuter nouns take the masculine article'], correct: 1 },
      { question: 'The ablative singular of animus is:', options: ['animi', 'animum', 'animis', 'animo'], correct: 3 },
      { question: 'Seneca’s concept of otium (philosophical leisure) is best understood as:', options: ['Laziness and avoidance of work', 'Withdrawal into philosophical life — the space to pursue wisdom', 'Sleep and physical rest', 'Political inactivity from cowardice'], correct: 1 },
      { question: 'Which form is ambiguous between dative and ablative plural?', options: ['vitam', 'natura', 'animis', 'verbi'], correct: 2 },
      { question: 'The Latin animus corresponds most closely to which Greek Stoic term?', options: ['logos', 'psyche', 'phantasia', 'telos'], correct: 1 },
      { question: 'The vocative singular of animus is:', options: ['animus', 'animi', 'anime', 'animum'], correct: 2 },
      { question: 'Fortuna in Stoic thought is significant because:', options: ['It is the highest good', 'It represents externals — what fortune gives, fortune can take; not genuinely good or bad', 'It is identified with natura', 'Seneca believed fortune controlled all things'], correct: 1 },
      { question: 'The accusative plural of verbum is:', options: ['verbi', 'verborum', 'verbis', 'verba'], correct: 3 },
    ],
    vocabulary: [
      { latin: 'vita, vitae', pronunciation: 'WI-ta', english: 'life (f.)' },
      { latin: 'natura, naturae', pronunciation: 'na-TU-ra', english: 'nature (f.)' },
      { latin: 'gloria, gloriae', pronunciation: 'GLO-ri-a', english: 'glory, reputation (f.)' },
      { latin: 'fortuna, fortunae', pronunciation: 'for-TU-na', english: 'fortune, chance (f.)' },
      { latin: 'animus, animi', pronunciation: 'A-ni-mus', english: 'soul, mind, spirit (m.)' },
      { latin: 'anima, animae', pronunciation: 'A-ni-ma', english: 'breath, life-force (f.)' },
      { latin: 'dominus, domini', pronunciation: 'DO-mi-nus', english: 'lord, master (m.)' },
      { latin: 'verbum, verbi', pronunciation: 'WER-bum', english: 'word (n.)' },
      { latin: 'otium, otii', pronunciation: 'O-ti-um', english: 'leisure, rest (n.)' },
      { latin: 'officium, officii', pronunciation: 'of-FI-ki-um', english: 'duty, function (n.)' },
    ],
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Third Declension Nouns',
    subtitle: 'Consonant stems · ratio, virtus, corpus · the most important declension for Stoic Latin',
    targetText: SENECA_I_1,
    objectives: [
      'Recognize third declension nouns by their genitive singular form',
      'Decline ratio (rationis) and virtus (virtutis) as consonant-stem paradigms',
      'Decline corpus (corporis) as a neuter third declension noun',
      'Identify the ablative singular as the key diagnostic form of the third declension',
    ],
    parts: [
      {
        heading: 'Part 1 — Why the Third Declension Matters',
        body: 'The third declension contains the most philosophically important Latin nouns. Ratio (reason), virtus (virtue), corpus (body), mens (mind), pars (part), mos (custom/morality) — every one of these is third declension. Unlike the first and second declension, third declension nouns cannot be predicted from the nominative alone. You must always learn the genitive too. The rule: the third declension stem is found by removing -is from the genitive singular. All other endings attach to that stem. The ablative singular ends in -e (not -o or -a as in 1st/2nd declension) — this is the key diagnostic.',
        paradigms: [
          {
            title: 'Third Declension — ratio, rationis (f.) — reason',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'ratio', '(varies)', 'rationes', '-es'],
              ['Genitive', 'rationis', '-is', 'rationum', '-um'],
              ['Dative', 'rationi', '-i', 'rationibus', '-ibus'],
              ['Accusative', 'rationem', '-em', 'rationes', '-es'],
              ['Ablative', 'ratione', '-e', 'rationibus', '-ibus'],
              ['Vocative', 'ratio', '(= nom.)', 'rationes', '-es'],
            ],
          },
          {
            title: 'Third Declension — virtus, virtutis (f.) — virtue/excellence',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'virtus', '(varies)', 'virtutes', '-es'],
              ['Genitive', 'virtutis', '-is', 'virtutum', '-um'],
              ['Dative', 'virtuti', '-i', 'virtutibus', '-ibus'],
              ['Accusative', 'virtutem', '-em', 'virtutes', '-es'],
              ['Ablative', 'virtute', '-e', 'virtutibus', '-ibus'],
              ['Vocative', 'virtus', '(= nom.)', 'virtutes', '-es'],
            ],
          },
          {
            title: 'Third Declension Neuter — corpus, corporis (n.) — body',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'corpus', '(varies)', 'corpora', '-a'],
              ['Genitive', 'corporis', '-is', 'corporum', '-um'],
              ['Dative', 'corpori', '-i', 'corporibus', '-ibus'],
              ['Accusative', 'corpus', '(= nom.)', 'corpora', '-a'],
              ['Ablative', 'corpore', '-e', 'corporibus', '-ibus'],
              ['Vocative', 'corpus', '(= nom.)', 'corpora', '-a'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Core Third Declension Vocabulary',
        body: 'Always learn these as nominative + genitive pairs — the nominative alone will not tell you the stem.',
        paradigms: [
          {
            title: 'Key Third Declension Nouns',
            headers: ['Latin', 'Genitive', 'Gender', 'English', 'Stoic Note'],
            rows: [
              ['ratio', 'rationis', 'f.', 'reason, account, plan', 'logos in Latin — the faculty that makes us human'],
              ['virtus', 'virtutis', 'f.', 'virtue, excellence', 'arete in Latin — the only genuine good'],
              ['corpus', 'corporis', 'n.', 'body', 'not up to us (ouk eph’ hēmin) — listed by Epictetus'],
              ['mens', 'mentis', 'f.', 'mind, intention', 'the rational mind; Seneca: mens bona = good mind'],
              ['mos', 'moris', 'm.', 'custom, habit; (pl.) character', 'mores = character; whence "moral"'],
              ['pars', 'partis', 'f.', 'part, role', 'Stoic role ethics: play your part well'],
              ['tempus', 'temporis', 'n.', 'time', 'Seneca’s Letter I: reclaim your time — vindica tempus'],
              ['nomen', 'nominis', 'n.', 'name', 'nomen and res — the name vs the thing itself'],
              ['homo', 'hominis', 'm.', 'human being', 'what distinguishes homo is ratio — not status or wealth'],
              ['amor', 'amoris', 'm.', 'love', 'amor fati — love of fate; Stoic acceptance of providence'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '3.1',
        prompt: 'Decline mens, mentis (f.) in full — all six cases, singular and plural. Find the stem first (remove -is from mentis → ment-), then add endings.',
        answer: 'Nom: mens/mentes · Gen: mentis/mentium · Dat: menti/mentibus · Acc: mentem/mentes · Abl: mente/mentibus · Voc: mens/mentes',
      },
      {
        number: '3.2',
        prompt: 'Parse each form — give case(s), number, gender, dictionary entry: a) rationem  b) virtute  c) corpora  d) tempori  e) hominis',
        answer: 'a) acc. sg. fem. — ratio · b) abl. sg. fem. — virtus · c) nom./acc./voc. pl. neut. — corpus · d) dat. sg. neut. — tempus · e) gen. sg. masc. — homo',
      },
      {
        number: '3.3',
        prompt: 'Translate into Latin: a) of virtue (gen.)  b) with reason (abl. of means)  c) the bodies (nom. pl.)  d) for the human being (dat. sg.)',
        answer: 'a) virtutis · b) ratione · c) corpora · d) homini',
      },
      {
        number: '3.4',
        prompt: 'Seneca Connection — Seneca writes (Letters I.1): "vindica te tibi." The word "te" is accusative of "tu." Seneca also writes about time: "Ita fac... omne tempus in tuas manus recipe." Parse "tempus" here. What case is it? What is its function? Why is tempus philosophically central to Letter I?',
        answer: 'tempus — acc. sg. neut. of tempus/temporis — direct object of recipe (reclaim/take back). Tempus is central because Letter I is entirely about time: Seneca argues that most people let others steal their time, and the first act of philosophical life is to reclaim it. "Vindica te tibi" and "omne tempus... recipe" are the same imperative applied to self and time respectively.',
      },
    ],
    quiz: [
      { question: 'How do you find the stem of a third declension noun?', options: ['Remove -us from the nominative', 'Remove -is from the genitive singular', 'Take the first two syllables of the nominative', 'Add -e to the nominative'], correct: 1 },
      { question: 'The ablative singular ending of third declension nouns is:', options: ['-o', '-a', '-e', '-i'], correct: 2 },
      { question: 'The accusative singular of ratio is:', options: ['ratio', 'rationis', 'rationem', 'ratione'], correct: 2 },
      { question: 'The Latin virtus corresponds to which Greek philosophical term?', options: ['logos', 'psyche', 'arete', 'phronesis'], correct: 2 },
      { question: 'Neuter third declension nouns differ from masculine/feminine in that:', options: ['They have no plural', 'Nominative, accusative, and vocative are always identical', 'They use first declension endings in the plural', 'They have no ablative form'], correct: 1 },
      { question: 'The dative/ablative plural of corpus is:', options: ['corpora', 'corporis', 'corpori', 'corporibus'], correct: 3 },
      { question: 'Seneca’s phrase "mens bona" (good mind) uses mens in the nominative. The genitive of mens is:', options: ['mensis', 'mentis', 'mentibus', 'mentem'], correct: 1 },
      { question: 'The Latin phrase "amor fati" (love of fate) uses amor in the nominative. Its genitive is:', options: ['amoris', 'amori', 'amorem', 'amore'], correct: 0 },
      { question: 'What makes the third declension challenging compared to the first and second?', options: ['It has more cases', 'The nominative singular is unpredictable — you must learn nominative + genitive as a pair', 'It only applies to neuter nouns', 'It has irregular plurals only'], correct: 1 },
      { question: 'The plural of corpus (body) in the nominative is:', options: ['corpori', 'corporum', 'corporibus', 'corpora'], correct: 3 },
    ],
    vocabulary: [
      { latin: 'ratio, rationis', pronunciation: 'RA-ti-o', english: 'reason, account, plan (f.)' },
      { latin: 'virtus, virtutis', pronunciation: 'WIR-tus', english: 'virtue, excellence (f.)' },
      { latin: 'corpus, corporis', pronunciation: 'KOR-pus', english: 'body (n.)' },
      { latin: 'mens, mentis', pronunciation: 'mens', english: 'mind, intention (f.)' },
      { latin: 'mos, moris', pronunciation: 'mos', english: 'custom, habit; (pl.) character (m.)' },
      { latin: 'pars, partis', pronunciation: 'pars', english: 'part, role (f.)' },
      { latin: 'tempus, temporis', pronunciation: 'TEM-pus', english: 'time (n.)' },
      { latin: 'nomen, nominis', pronunciation: 'NO-men', english: 'name (n.)' },
      { latin: 'homo, hominis', pronunciation: 'HO-mo', english: 'human being (m.)' },
      { latin: 'amor, amoris', pronunciation: 'A-mor', english: 'love (m.)' },
    ],
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Latin Verbs: Present Active Indicative',
    subtitle: 'The four conjugations · amo, moneo, rego, audio · person and number',
    targetText: SENECA_I_1,
    objectives: [
      'Identify the four Latin conjugation classes by their infinitive endings',
      'Conjugate verbs of all four conjugations in the present active indicative',
      'Parse any present active indicative form for person, number, and conjugation',
      'Connect Stoic philosophical verbs to their conjugation class',
    ],
    parts: [
      {
        heading: 'Part 1 — The Four Conjugations',
        body: 'Latin has four conjugation classes, identified by the vowel before the infinitive ending -re. This vowel is the key — it appears in most tense forms and tells you which set of endings to use. 3rd vs 2nd conjugation: both end in -ere, but 2nd conjugation has a long ē (monēre) and 3rd has a short e (regere). In practice you will learn each verb’s conjugation with its dictionary entry.',
        paradigms: [
          {
            title: 'The Four Conjugation Classes',
            headers: ['Conj.', 'Marker', 'Infinitive', 'Example', 'Meaning'],
            rows: [
              ['1st', '-a-', '-are', 'amare', 'to love'],
              ['2nd', '-e-', '-ēre', 'monere', 'to warn/advise'],
              ['3rd', '-e-', '-ere', 'regere', 'to rule (short e)'],
              ['4th', '-i-', '-ire', 'audire', 'to hear'],
            ],
          },
          {
            title: 'Present Active Indicative — All Four Conjugations',
            headers: ['Person', '1st (amo)', '2nd (moneo)', '3rd (rego)', '4th (audio)'],
            rows: [
              ['1sg. I', 'amo', 'moneo', 'rego', 'audio'],
              ['2sg. you', 'amas', 'mones', 'regis', 'audis'],
              ['3sg. he/she/it', 'amat', 'monet', 'regit', 'audit'],
              ['1pl. we', 'amamus', 'monemus', 'regimus', 'audimus'],
              ['2pl. you all', 'amatis', 'monetis', 'regitis', 'auditis'],
              ['3pl. they', 'amant', 'monent', 'regunt', 'audiunt'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — esse: The Verb "To Be"',
        body: 'Esse (to be) is irregular in Latin as in all Western languages. Its forms must be memorized. Seneca uses esse constantly — in predicate constructions ("vita brevis est"), philosophical claims ("bonum esse virtutem"), and indirect statement.',
        paradigms: [
          {
            title: 'esse — To Be, Present Indicative',
            headers: ['Person', 'Form', 'English'],
            rows: [
              ['1sg.', 'sum', 'I am'],
              ['2sg.', 'es', 'you are'],
              ['3sg.', 'est', 'he/she/it is'],
              ['1pl.', 'sumus', 'we are'],
              ['2pl.', 'estis', 'you are'],
              ['3pl.', 'sunt', 'they are'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Philosophical Verb Vocabulary',
        body: 'Each verb is given by its infinitive and conjugation — the form you will meet in Seneca.',
        paradigms: [
          {
            title: 'Core Verbs in Stoic Latin',
            headers: ['Latin', 'Conj.', 'English', 'Stoic Context'],
            rows: [
              ['amare', '1st', 'to love', 'amor fati — love of fate; to love what reason affirms'],
              ['vindicare', '1st', 'to claim, liberate', 'vindica te tibi — the opening imperative of Letter I'],
              ['vivere', '3rd', 'to live', 'bene vivere — to live well; the Stoic goal'],
              ['facere', '3rd', 'to do, make', 'ita fac — do this; Seneca’s direct command'],
              ['sequi', '3rd dep.', 'to follow', 'follow nature, follow reason — deponent verb (passive form, active sense)'],
              ['fugere', '3rd', 'to flee, avoid', 'flee vice as the Stoics flee only genuine evils'],
              ['scire', '4th', 'to know', 'sapientia is knowing; scientia is the Stoic’s knowledge'],
              ['recedere', '3rd', 'to withdraw', 'recede in te ipse — withdraw into yourself (Letter II)'],
              ['pati', '3rd dep.', 'to endure, suffer', 'patientia — endurance; a Stoic virtue'],
              ['colere', '3rd', 'to cultivate, care for', 'colere virtutem — cultivate virtue (philosophical formation)'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '4.1',
        prompt: 'Conjugate vivere (3rd conjugation) in the full present active indicative — all six persons. Find the present stem first (viv-).',
        answer: 'vivo · vivis · vivit · vivimus · vivitis · vivunt',
      },
      {
        number: '4.2',
        prompt: 'Parse each verb — give person, number, conjugation, infinitive, and English meaning: a) amat  b) regimus  c) auditis  d) sunt  e) vindicamus',
        answer: 'a) 3sg., 1st conj., amare — "he/she loves" · b) 1pl., 3rd conj., regere — "we rule" · c) 2pl., 4th conj., audire — "you all hear" · d) 3pl., esse — "they are" · e) 1pl., 1st conj., vindicare — "we claim/liberate"',
      },
      {
        number: '4.3',
        prompt: 'Translate into Latin: a) We live according to nature. (use vivere + secundum + acc.)  b) Virtue is the only good. (use esse)  c) I cultivate wisdom. (use colere + acc.)',
        answer: 'a) Secundum naturam vivimus. · b) Virtus sola bonum est. · c) Sapientiam colo.',
      },
      {
        number: '4.4',
        prompt: 'Ita fac — The opening two words of Seneca’s Letter I are "Ita fac" — "Do this" / "Do it this way." Fac is the irregular imperative of facere. Parse it: what person, number, and mood is "fac"? Why does Seneca open a philosophical letter with a command rather than an argument?',
        answer: 'Fac = 2nd person singular imperative of facere (do/make) — an irregular short-form imperative (fac rather than face). Seneca opens with a command because the Letters are not treatises but personal addresses. The imperative creates intimacy and urgency — philosophy here is not observation but direction. "Do this" before the "this" has even been named.',
      },
    ],
    quiz: [
      { question: 'Which infinitive ending identifies a first conjugation verb?', options: ['-ēre (long e)', '-ire', '-are', '-ere (short e)'], correct: 2 },
      { question: 'The third person plural present active of amare is:', options: ['amant', 'amatis', 'amat', 'amamus'], correct: 0 },
      { question: 'The Latin esse is equivalent to which Greek verb?', options: ['λύω', 'εἰμί', 'λέγω', 'ἔχω'], correct: 1 },
      { question: 'The phrase "bene vivere" (to live well) uses the infinitive of which conjugation?', options: ['1st', '2nd', '3rd', '4th'], correct: 2 },
      { question: 'Parse "audit":', options: ['1st sg. — "I hear"', '3rd sg. — "he/she hears"', '2nd pl. — "you all hear"', '1st pl. — "we hear"'], correct: 1 },
      { question: 'The verb vindicare is philosophically central to Letter I because:', options: ['It means to defeat an enemy', 'It means to claim, liberate — Seneca commands Lucilius to claim himself for himself', 'It means to write a letter', 'Vindica describes legal defense'], correct: 1 },
      { question: 'First person plural present active indicative of esse is:', options: ['sum', 'es', 'sumus', 'sunt'], correct: 2 },
      { question: 'What distinguishes 2nd conjugation (-ēre) from 3rd conjugation (-ere)?', options: ['2nd has more forms', '2nd has a long ē in the infinitive; 3rd has a short e', '3rd is always masculine', 'They are identical'], correct: 1 },
      { question: 'The verb pati (to endure) is described as "deponent." This means:', options: ['It has no present tense', 'It has passive forms but active meaning', 'It is an irregular 4th conjugation verb', 'It belongs to no conjugation class'], correct: 1 },
      { question: 'In the sentence "virtus bonum est," virtus is:', options: ['Direct object', 'Subject in the nominative', 'Ablative of means', 'Genitive of possession'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'amare', pronunciation: 'a-MA-re', english: 'to love (1st conj.)' },
      { latin: 'vindicare', pronunciation: 'win-DI-ka-re', english: 'to claim, liberate (1st conj.)' },
      { latin: 'vivere', pronunciation: 'WI-we-re', english: 'to live (3rd conj.)' },
      { latin: 'facere', pronunciation: 'FA-ke-re', english: 'to do, make (3rd conj.)' },
      { latin: 'sequi', pronunciation: 'SE-kwi', english: 'to follow (3rd conj. deponent)' },
      { latin: 'fugere', pronunciation: 'FU-ge-re', english: 'to flee, avoid (3rd conj.)' },
      { latin: 'scire', pronunciation: 'SKI-re', english: 'to know (4th conj.)' },
      { latin: 'colere', pronunciation: 'KO-le-re', english: 'to cultivate, care for (3rd conj.)' },
      { latin: 'esse', pronunciation: 'ES-se', english: 'to be (irregular)' },
    ],
  },

  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Adjectives & Agreement',
    subtitle: '1st-2nd declension adjectives · bonus, liber, sacer · predicate and attributive',
    targetText: SENECA_I_1,
    objectives: [
      'Decline 1st-2nd class adjectives (bonus, -a, -um) in all genders and cases',
      'Apply GNC agreement (gender, number, case) between adjectives and nouns',
      'Distinguish attributive ("the good man") from predicative ("the man is good") position',
      'Use the key philosophical adjectives: bonus, malus, liber, sapiens, verus',
    ],
    parts: [
      {
        heading: 'Part 1 — Latin Adjective Agreement',
        body: 'Latin adjectives agree with their nouns in gender, number, and case — exactly as in Greek. The most common adjective type uses 1st declension endings for feminine and 2nd declension for masculine and neuter. This is called the 1st-2nd class adjective (parallel to Greek’s 2-1-2 pattern).',
        paradigms: [
          {
            title: '1st-2nd Class Adjective — bonus, bona, bonum (good)',
            headers: ['Case', 'Masc. Sg.', 'Fem. Sg.', 'Neut. Sg.', 'Masc. Pl.', 'Fem. Pl.', 'Neut. Pl.'],
            rows: [
              ['Nom.', 'bonus', 'bona', 'bonum', 'boni', 'bonae', 'bona'],
              ['Gen.', 'boni', 'bonae', 'boni', 'bonorum', 'bonarum', 'bonorum'],
              ['Dat.', 'bono', 'bonae', 'bono', 'bonis', 'bonis', 'bonis'],
              ['Acc.', 'bonum', 'bonam', 'bonum', 'bonos', 'bonas', 'bona'],
              ['Abl.', 'bono', 'bona', 'bono', 'bonis', 'bonis', 'bonis'],
              ['Voc.', 'bone', 'bona', 'bonum', 'boni', 'bonae', 'bona'],
            ],
          },
        ],
        callout: {
          label: 'Key pattern',
          text: 'Dative and ablative plural are identical across all three genders: bonis. Neuter nominative/accusative/vocative are always identical: bonum (sg.) / bona (pl.).',
        },
      },
      {
        heading: 'Part 2 — Attributive vs. Predicative',
        body: 'Latin distinguishes adjective position less rigidly than Greek, but the distinction still matters. Attributive adjectives directly modify a noun. Predicative adjectives make a claim via esse.',
        paradigms: [
          {
            title: 'Adjective Position in Latin',
            headers: ['Type', 'Pattern', 'Example', 'Translation'],
            rows: [
              ['Attributive', 'adj. agrees with noun in GNC; often adjacent', 'vir bonus / bonus vir', 'the good man'],
              ['Predicative', 'adj. in nominative linked to subject via esse', 'vir bonus est', 'the man is good'],
              ['Predicate nom.', 'Both subject and predicate in nominative', 'virtus sola bonum est', 'virtue alone is good'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Philosophical Adjective Vocabulary',
        body: 'Memorize all three gender forms. Note: sapiens and brevis are 3rd declension adjectives — recognize them now; full treatment in Session 8.',
        paradigms: [
          {
            title: 'Core Philosophical Adjectives',
            headers: ['Latin', 'Fem.', 'Neut.', 'English', 'Stoic Note'],
            rows: [
              ['bonus', 'bona', 'bonum', 'good', 'Only virtue is bonum — Stoic ethics in one word'],
              ['malus', 'mala', 'malum', 'bad, evil', 'Only vice is malum — externals are neither'],
              ['liber', 'libera', 'liberum', 'free', 'animo libero — with free spirit; inner not outer freedom'],
              ['verus', 'vera', 'verum', 'true, real', 'vera bona — the true goods, as opposed to apparent goods'],
              ['magnus', 'magna', 'magnum', 'great', 'magnum animum — great soul; Stoic magnanimity'],
              ['beatus', 'beata', 'beatum', 'happy, blessed', 'vita beata — the happy life; Stoic philosophical goal'],
              ['sapiens', 'sapiens', 'sapiens', 'wise (3rd decl. adj.)', 'the Sage — sapiens is a 3rd declension adjective'],
              ['brevis', 'brevis', 'breve', 'short (3rd decl.)', 'vita brevis — life is short; Seneca’s opening premise'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '5.1',
        prompt: 'Make each adjective agree with its noun. Give the correct form of bonus: a) ______ vita (nom. sg. fem.)  b) ______ animi (gen. sg. masc.)  c) ______ corpora (nom. pl. neut.)  d) ______ rationi (dat. sg. fem.)',
        answer: 'a) bona · b) boni · c) bona · d) bonae',
      },
      {
        number: '5.2',
        prompt: 'Translate into Latin — use correct adjective agreement: a) the true good (nom. sg. neut.)  b) a free mind (abl. sg. — animus)  c) the happy life (acc. sg. — vita)  d) the great man is wise [use esse; sapiens is predicate]',
        answer: 'a) verum bonum · b) animo libero · c) vitam beatam · d) magnus vir sapiens est',
      },
      {
        number: '5.3',
        prompt: 'Identify attributive or predicative, and translate: a) vita brevis est  b) vita brevis  c) vir liber animum bonum habet  d) animus liber est',
        answer: 'a) predicative — "life is short" · b) attributive — "a short life" (no verb) · c) attributive (liber modifies vir, bonum modifies animum) — "a free man has a good mind" · d) predicative — "the mind is free"',
      },
      {
        number: '5.4',
        prompt: 'Seneca’s Claim — Seneca claims (paraphrased): "vera bona in animo sunt, non in rebus." (The true goods are in the mind, not in things.) a) Parse every word. b) Which adjective is attributive? c) What is the Stoic philosophical claim being made?',
        answer: 'a) vera — nom. pl. neut. adj., verus · bona — nom. pl. neut. noun · in — prep. + abl. · animo — abl. sg. masc., animus · sunt — 3pl. esse · non — negation · in rebus — in + abl. pl. of res (thing) · b) vera is attributive (modifying bona). c) Externals (res — things) are not genuine goods; only what resides in the rational soul (animus) is.',
      },
    ],
    quiz: [
      { question: 'GNC agreement means an adjective must agree with its noun in:', options: ['Grammar, nominative, conjugation', 'Gender, number, case', 'Genitive, noun, consonant', 'Grammar, nature, context'], correct: 1 },
      { question: 'The ablative plural of bonus (all genders) is:', options: ['bono', 'bonis', 'bonos', 'bonorum'], correct: 1 },
      { question: 'In "vita brevis est," brevis is a predicative adjective because:', options: ['It comes before vita', 'It is linked to vita through est — making a claim rather than describing which life', 'It is in the accusative', 'It is a 3rd declension adjective'], correct: 1 },
      { question: 'The vocative singular masculine of bonus is:', options: ['bonus', 'boni', 'bone', 'bonum'], correct: 2 },
      { question: 'The Stoic claim "vera bona in animo sunt" asserts:', options: ['True goods are physical and external', 'True goods reside in the rational soul — not in wealth, health, or reputation', 'The soul is the source of all evil', 'Goods are distributed between soul and body equally'], correct: 1 },
      { question: 'The neuter nominative plural of bonus is:', options: ['boni', 'bonas', 'bona', 'bonorum'], correct: 2 },
      { question: 'Which of the following is a 3rd declension adjective (not 1st-2nd class)?', options: ['bonus', 'liber', 'verus', 'sapiens'], correct: 3 },
      { question: 'The feminine nominative singular of liber (free) is:', options: ['libera', 'libre', 'liberi', 'liberum'], correct: 0 },
      { question: 'The phrase "vita beata" uses beatus as:', options: ['Predicative — "life is happy"', 'Attributive — "the happy life"', 'Genitive — "of the happy"', 'Vocative — "O happy life"'], correct: 1 },
      { question: 'In the predicate nominative construction "virtus sola bonum est," sola means:', options: ['holy', 'alone, only', 'solid', 'sole (fish)'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'bonus, -a, -um', pronunciation: 'BO-nus', english: 'good' },
      { latin: 'malus, -a, -um', pronunciation: 'MA-lus', english: 'bad, evil' },
      { latin: 'liber, -era, -erum', pronunciation: 'LI-ber', english: 'free' },
      { latin: 'verus, -a, -um', pronunciation: 'WE-rus', english: 'true, real' },
      { latin: 'magnus, -a, -um', pronunciation: 'MAG-nus', english: 'great' },
      { latin: 'beatus, -a, -um', pronunciation: 'be-A-tus', english: 'happy, blessed' },
      { latin: 'sapiens, sapientis', pronunciation: 'SA-pi-ens', english: 'wise (3rd decl. adj.)' },
      { latin: 'brevis, breve', pronunciation: 'BRE-wis', english: 'short (3rd decl. adj.)' },
    ],
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'The Genitive & Possession',
    subtitle: 'Of, belonging to · genitive with esse · Seneca’s time vocabulary',
    targetText: SENECA_I_1,
    objectives: [
      'Use the genitive of possession correctly across all three declensions',
      'Recognize the genitive with esse ("it is the mark of a wise man")',
      'Identify partitive, objective, and subjective genitives in Stoic Latin',
      'Parse all genitive forms met so far in first, second, and third declension',
    ],
    parts: [
      {
        heading: 'Part 1 — Genitive Uses',
        body: 'The genitive does many jobs in Latin. The construction "sapientis est cogitare de morte" — "it is the mark of a wise man to think about death" — is one of Seneca’s most common patterns. The genitive there indicates characteristic behavior; English renders it as "it is the X of Y" or "it belongs to Y to...".',
        paradigms: [
          {
            title: 'Genitive Uses in Latin',
            headers: ['Use', 'Latin Example', 'Translation'],
            rows: [
              ['Possession', 'animus hominis', 'the mind of the man / the man’s mind'],
              ['Genitive with esse', 'sapientis est...', 'it is the mark of a wise man to...'],
              ['Partitive', 'pars temporis', 'part of the time'],
              ['Objective genitive', 'amor virtutis', 'love of virtue (virtue is what is loved)'],
              ['Subjective genitive', 'amor Senecae', 'Seneca’s love (Seneca is the lover)'],
              ['Genitive of quality', 'vir magnae virtutis', 'a man of great virtue'],
              ['Genitive of charge', 'damnare alicuius', 'to convict of something'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Seneca’s Time Vocabulary',
        body: 'Letter I is entirely about time. Before you can read it, you need the genitive forms of the key time nouns. Note: dies belongs to the fifth declension — a small class of mostly feminine nouns ending in -es. The genitive singular -ei is distinctive.',
        paradigms: [
          {
            title: 'Time Nouns — Genitive Forms',
            headers: ['Noun', 'Gen. Sg.', 'Gen. Pl.', 'Key Phrase'],
            rows: [
              ['tempus (n., 3rd)', 'temporis', 'temporum', 'pars temporis — part of the time'],
              ['hora (f., 1st)', 'horae', 'horarum', 'omnis horae — of every hour'],
              ['dies (m./f., 5th)', 'diei', 'dierum', 'multos dies — many days (acc. pl.)'],
              ['vita (f., 1st)', 'vitae', 'vitarum', 'spatium vitae — the span of life'],
              ['aetas (f., 3rd)', 'aetatis', 'aetatum', 'prima aetas — the first age/youth'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '6.1',
        prompt: 'Translate using the genitive: a) the span of life  b) of great virtue [genitive of quality with a man]  c) love of wisdom (sapientiae)  d) it is the mark of a philosopher to seek truth',
        answer: 'a) spatium vitae · b) vir magnae virtutis · c) amor sapientiae · d) philosophi est veritatem quaerere',
      },
      {
        number: '6.2',
        prompt: 'Identify the genitive use in each phrase: a) pars temporis  b) amor virtutis  c) sapientis est bene vivere  d) animus hominis  e) vir magnae rationis',
        answer: 'a) partitive — "part of the time" · b) objective — "love of virtue" (virtue is loved) · c) genitive with esse — "it is the mark of a wise person to live well" · d) possessive — "the mind of the man" · e) genitive of quality — "a man of great reason"',
      },
      {
        number: '6.3',
        prompt: 'Seneca Letter I — Seneca writes: "Ita fac, mi Lucili: vindica te tibi, et tempus quod... auferebatur... recollege et serva." The phrase "tempus quod" means "the time which." Parse tempus. Then identify what Seneca is asking Lucilius to do with time, and connect this to the Stoic concept of what is eph’ hēmin (up to us).',
        answer: 'tempus — acc. sg. neut. (3rd decl., tempus/temporis) — direct object of recollege (collect back) and serva (keep). Seneca asks Lucilius to reclaim and hold onto his time — time that was being stolen by others, by obligations, by distraction. This connects to eph’ hēmin: how you use your time — your attention, your judgment, your assent — is one of the things genuinely in your power.',
      },
    ],
    quiz: [
      { question: 'The genitive of possession in "animus hominis" means:', options: ['the mind and the man', 'the man’s mind / the mind of the man', 'the man is a mind', 'the wise man'], correct: 1 },
      { question: 'The phrase "sapientis est..." uses the genitive to indicate:', options: ['Possession of an object', 'A characteristic action or quality — "it is the mark of a wise man to..."', 'A partitive relationship', 'Time duration'], correct: 1 },
      { question: 'An objective genitive in "amor virtutis" means:', options: ['Virtue loves', 'The love belonging to virtue', 'Love of virtue — virtue is the object of love', 'Virtuous love'], correct: 2 },
      { question: 'The genitive singular of tempus is:', options: ['tempori', 'temporis', 'tempora', 'temporibus'], correct: 1 },
      { question: 'The fifth declension genitive singular ending is:', options: ['-is', '-ae', '-ei', '-i'], correct: 2 },
      { question: 'The phrase "vir magnae virtutis" uses the genitive of:', options: ['Possession', 'Objective genitive', 'Quality — "a man of great virtue"', 'Partitive'], correct: 2 },
      { question: 'In Seneca’s Letter I, his command to reclaim time connects to Stoic ethics because:', options: ['Time is money', 'How one spends time — attention, assent, activity — is among what is genuinely up to us (eph’ hēmin)', 'Seneca believed in strict time management schedules', 'Time is an external and therefore indifferent'], correct: 1 },
      { question: 'The genitive plural of vita is:', options: ['vitae', 'vitam', 'vitarum', 'vitis'], correct: 2 },
      { question: 'A subjective genitive in "amor Senecae" means:', options: ['Love of Seneca (Seneca is loved)', 'Seneca’s love (Seneca is the lover)', 'Love similar to Seneca’s', 'Seneca’s beloved'], correct: 1 },
      { question: 'The genitive singular of ratio is:', options: ['rationem', 'rationibus', 'rationi', 'rationis'], correct: 3 },
    ],
    vocabulary: [
      { latin: 'tempus, temporis', pronunciation: 'TEM-pus', english: 'time (n., 3rd)' },
      { latin: 'hora, horae', pronunciation: 'HO-ra', english: 'hour (f., 1st)' },
      { latin: 'dies, diei', pronunciation: 'DI-es', english: 'day (m./f., 5th)' },
      { latin: 'aetas, aetatis', pronunciation: 'AI-tas', english: 'age, lifetime (f., 3rd)' },
      { latin: 'spatium, spatii', pronunciation: 'SPA-ti-um', english: 'span, space (n.)' },
      { latin: 'veritas, veritatis', pronunciation: 'WE-ri-tas', english: 'truth (f., 3rd)' },
      { latin: 'philosophus, philosophi', pronunciation: 'phi-LO-so-phus', english: 'philosopher (m.)' },
    ],
  },

  // ── SESSION 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'The Dative & Ablative',
    subtitle: 'Indirect object · means · manner · agent · the ablative absolute',
    targetText: SENECA_I_1,
    objectives: [
      'Use the dative for indirect object, purpose, reference, and possession',
      'Use the ablative for means, manner, accompaniment, agent, separation, and time',
      'Recognize the ablative absolute construction',
      'Parse dative and ablative forms across all three declensions',
    ],
    parts: [
      {
        heading: 'Part 1 — The Dative',
        body: 'The dative marks the person or thing affected indirectly by the action — to whom or for whom something is done.',
        paradigms: [
          {
            title: 'Dative Uses',
            headers: ['Use', 'Latin Example', 'Translation'],
            rows: [
              ['Indirect Object', 'dico tibi veritatem', 'I tell you the truth'],
              ['Dative of Possession', 'est mihi mens bona', 'I have a good mind (lit. "there is to me")'],
              ['Dative of Purpose', 'virtuti vivere', 'to live for virtue'],
              ['Dative of Reference', 'mihi videtur...', 'it seems to me that...'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — The Ablative',
        body: 'The ablative is Latin’s most versatile case — it absorbs means, manner, accompaniment, agent, separation, and time. Seneca uses it constantly.',
        paradigms: [
          {
            title: 'Ablative Uses',
            headers: ['Use', 'Latin Example', 'Translation'],
            rows: [
              ['Means/Instrument', 'ratione vivit', 'he lives by/with reason'],
              ['Manner', 'magna virtute agit', 'he acts with great virtue'],
              ['Accompaniment', 'cum amicis vivit', 'he lives with friends'],
              ['Agent (passive)', 'a sapiente laudatur', 'he is praised by a wise man'],
              ['Separation', 'liberari a cupiditate', 'to be freed from desire'],
              ['Time when', 'prima luce surgit', 'he rises at first light'],
              ['Ablative Absolute', 'vita contemplata, felix est', 'having contemplated life, he is happy'],
            ],
          },
        ],
        callout: {
          label: 'Ablative Absolute',
          text: 'The ablative absolute is a self-contained participial phrase in the ablative — a noun + participle, both ablative, that sets a scene or condition independent of the main clause. It is one of Latin’s most elegant constructions and appears constantly in Seneca. You will recognize it more fully once you learn participles (Session 9).',
        },
      },
    ],
    exercises: [
      {
        number: '7.1',
        prompt: 'Identify the ablative use and translate: a) animo libero vivit  b) a Seneca laudatur  c) ratione regitur  d) magna cura scribit  e) prima aetate philosophiam colit',
        answer: 'a) ablative of manner — "he lives with a free spirit" · b) ablative of agent (passive) — "he is praised by Seneca" · c) ablative of means — "he is governed by reason" · d) ablative of manner — "he writes with great care" · e) ablative of time — "in early youth he cultivates philosophy"',
      },
      {
        number: '7.2',
        prompt: 'Convert to Latin using dative or ablative as appropriate: a) I tell Lucilius the truth. [dative]  b) She lives with wisdom. [ablative of manner]  c) He has virtue. [dative of possession with esse]  d) He is freed from fear. [ablative of separation — use metus, -us for fear]',
        answer: 'a) Lucilio veritatem dico. · b) Sapientia / cum sapientia vivit. · c) Est ei virtus. · d) A metu liberatur.',
      },
      {
        number: '7.3',
        prompt: 'Seneca Letter I — Seneca writes that people waste time — some on pleasure (voluptas), some on ambition (ambitio), some on others’ affairs. He says: "omnia, Lucili, aliena sunt, tempus tantum nostrum est." Parse aliena and nostrum. What case and function does each have?',
        answer: 'aliena — nom. pl. neut. adj. (alienus, -a, -um — belonging to another), predicate adjective of omnia (all things are external/another’s) · nostrum — nom. sg. neut. adj. (noster, -tra, -trum — our), predicate adjective of tempus · Full translation: "Everything, Lucilius, belongs to others — time alone is ours."',
      },
    ],
    quiz: [
      { question: 'The dative of possession in "est mihi mens bona" literally means:', options: ['I own a good mind', 'There is to me a good mind — I have a good mind', 'My mind is good separately', 'The mind belongs to the good'], correct: 1 },
      { question: 'The ablative of means in "ratione vivit" indicates:', options: ['Living away from reason', 'Living toward reason', 'Living by/with reason as the instrument', 'Living despite reason'], correct: 2 },
      { question: 'The preposition "a/ab" + ablative expresses the agent in:', options: ['Active sentences', 'Passive sentences — "praised by a wise man"', 'Genitive constructions', 'Dative of purpose'], correct: 1 },
      { question: 'The ablative absolute construction consists of:', options: ['A noun + adjective in the ablative', 'A noun + participle in the ablative, independent of the main clause', 'Any two ablative words', 'The ablative of a gerund'], correct: 1 },
      { question: 'In "magna virtute agit," the ablative magna virtute expresses:', options: ['Agent — "he acts by virtue"', 'Separation — "apart from virtue"', 'Manner — "he acts with great virtue"', 'Time — "in great virtue"'], correct: 2 },
      { question: 'The dative indirect object in "dico tibi veritatem" is:', options: ['veritatem — the truth spoken', 'tibi — the person spoken to', 'dico — the act of speaking', 'The entire sentence'], correct: 1 },
      { question: 'Seneca’s claim "tempus nostrum est" (time is ours) connects to Stoic ethics because:', options: ['Time is money and should be saved', 'Time — specifically how we direct our attention and assent — is among what is genuinely eph’ hēmin', 'Seneca owned his time legally', 'Time passes regardless and cannot be controlled'], correct: 1 },
      { question: 'The ablative of time in "prima luce" means:', options: ['in the manner of light', 'by means of light', 'at/in first light — time when', 'away from the light'], correct: 2 },
      { question: 'The ablative singular of ratio is:', options: ['rationem', 'rationis', 'rationi', 'ratione'], correct: 3 },
      { question: 'The construction "cum amicis" uses cum + ablative to express:', options: ['Time', 'Means', 'Accompaniment — with friends', 'Agent'], correct: 2 },
    ],
    vocabulary: [
      { latin: 'cura, curae', pronunciation: 'KU-ra', english: 'care, concern (f.)' },
      { latin: 'amicus, amici', pronunciation: 'a-MI-kus', english: 'friend (m.)' },
      { latin: 'metus, metus', pronunciation: 'ME-tus', english: 'fear (m., 4th decl.)' },
      { latin: 'cupiditas, cupiditatis', pronunciation: 'ku-PI-di-tas', english: 'desire, greed (f.)' },
      { latin: 'lux, lucis', pronunciation: 'luks', english: 'light (f., 3rd)' },
      { latin: 'dicere', pronunciation: 'DI-ke-re', english: 'to say, tell (3rd conj.)' },
      { latin: 'laudare', pronunciation: 'lau-DA-re', english: 'to praise (1st conj.)' },
      { latin: 'liberare', pronunciation: 'li-be-RA-re', english: 'to free, liberate (1st conj.)' },
    ],
  },

  // ── SESSION 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'The Accusative & Prepositions',
    subtitle: 'Direct object · motion · ad, in, per, sub · indirect statement with infinitive',
    targetText: SENECA_I_1,
    objectives: [
      'Use the accusative correctly as direct object and in accusative + infinitive constructions',
      'Master the eight most important Latin prepositions and their case government',
      'Recognize accusative of extent (space and time)',
      'Translate indirect statement (accusative + infinitive) — Seneca’s most common argumentative structure',
    ],
    parts: [
      {
        heading: 'Part 1 — Accusative Uses',
        body: 'The accusative marks the direct object, the goal of motion, the extent of space or time, and — crucially for Seneca — the subject of an infinitive in indirect statement.',
        paradigms: [
          {
            title: 'Accusative Uses',
            headers: ['Use', 'Latin Example', 'Translation'],
            rows: [
              ['Direct Object', 'virtutem sequor', 'I follow virtue'],
              ['Motion Toward', 'ad sapientiam tendit', 'he strives toward wisdom'],
              ['Extent of Time', 'multos annos vixit', 'he lived for many years'],
              ['Extent of Space', 'mille passus ambulavit', 'he walked a thousand paces'],
              ['Acc. + Infinitive', 'dicit virtutem bonum esse', 'he says that virtue is good'],
              ['Acc. Subject of Inf.', 'puto me beatum esse', 'I think that I am happy'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Essential Latin Prepositions',
        body: 'The same preposition in can take accusative (motion into: in animum — into the mind) or ablative (location within: in animo — in the mind). A verb of motion takes accusative; a verb of being takes ablative.',
        paradigms: [
          {
            title: 'Prepositions with Case Government',
            headers: ['Preposition', 'Case', 'Meaning', 'Stoic Example'],
            rows: [
              ['ad', 'acc.', 'to, toward, at', 'ad virtutem — toward virtue'],
              ['in', 'acc.', 'into, against (motion)', 'in animum — into the mind'],
              ['in', 'abl.', 'in, within (location)', 'in animo — in the mind'],
              ['per', 'acc.', 'through, by means of', 'per rationem — through reason'],
              ['sub', 'acc./abl.', 'under (motion/location)', 'sub iugum — under the yoke'],
              ['de', 'abl.', 'down from, concerning, about', 'de vita beata — concerning the happy life'],
              ['ex/e', 'abl.', 'out of, from', 'ex virtute — out of / from virtue'],
              ['cum', 'abl.', 'with, together with', 'cum ratione — with reason'],
              ['sine', 'abl.', 'without', 'sine virtute — without virtue'],
              ['pro', 'abl.', 'on behalf of, in front of', 'pro vita — on behalf of life'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Indirect Statement',
        body: 'Latin expresses indirect speech (what someone says, thinks, believes) with accusative + infinitive. The subject of the reported statement goes into the accusative; the verb becomes an infinitive. This is Seneca’s most common structure for reporting philosophical positions. Direct: "Virtus sola bonum est." Indirect: "Stoici dicunt virtutem solam bonum esse." — The Stoics say that virtue alone is good.',
      },
    ],
    exercises: [
      {
        number: '8.1',
        prompt: 'Parse each preposition phrase — give preposition, case, use, and translate: a) ad sapientiam  b) in animo  c) sine virtute  d) per rationem  e) ex vita',
        answer: 'a) ad + acc., motion toward — "toward wisdom" · b) in + abl., location — "in the mind" · c) sine + abl. — "without virtue" · d) per + acc., means — "through/by reason" · e) ex + abl., separation — "out of life / from life"',
      },
      {
        number: '8.2',
        prompt: 'Convert to indirect statement using the accusative + infinitive construction: a) Direct: "Vita brevis est." — Report: "Seneca says that..."  b) Direct: "Homo rationalis est." — Report: "We believe that..."',
        answer: 'a) Seneca dicit vitam brevem esse. · b) Credimus hominem rationalem esse.',
      },
      {
        number: '8.3',
        prompt: 'Translate into Latin: a) He strives toward virtue for many years.  b) The Stoics say that virtue is the only good.  c) I live with reason, without fear.',
        answer: 'a) Multos annos ad virtutem tendit. · b) Stoici dicunt virtutem solum bonum esse. · c) Cum ratione, sine metu vivo.',
      },
      {
        number: '8.4',
        prompt: 'Letter I Preview — Seneca writes: "Ita fac, mi Lucili: vindica te tibi." The te is accusative — the direct object of vindica. Tibi is dative — "for yourself." Write a one-paragraph analysis: what is Seneca claiming is the right relationship between a person and themselves? Use the accusative/dative distinction to anchor your argument.',
        answer: 'te (acc.) is the object to be claimed — the self as something acted upon. tibi (dat.) is the beneficiary — the self as recipient. The construction "vindica te tibi" — claim yourself for yourself — implies that the self is currently alienated: owned by others, by obligations, by distraction. The claim is not merely "be yourself" but "actively reclaim yourself as your own property." The dative marks that this reclamation redounds to the self’s own benefit. Philosophically: this is the starting move of Stoic formation — the recognition that you are not currently your own.',
      },
    ],
    quiz: [
      { question: 'The preposition in + accusative expresses:', options: ['Location within', 'Motion into', 'Association with', 'Separation from'], correct: 1 },
      { question: 'In the accusative + infinitive construction, the subject of the reported clause is in the:', options: ['Nominative', 'Genitive', 'Accusative', 'Dative'], correct: 2 },
      { question: 'The preposition sine always takes which case?', options: ['Accusative', 'Genitive', 'Dative', 'Ablative'], correct: 3 },
      { question: 'The accusative of extent in "multos annos vixit" means:', options: ['He lived in many years', 'He lived for many years — duration', 'He lived among many years', 'He lived during a year'], correct: 1 },
      { question: 'In "Stoici dicunt virtutem bonum esse," virtutem is:', options: ['Subject of dicunt', 'Accusative subject of the infinitive esse in indirect statement', 'Direct object of esse', 'Predicate nominative'], correct: 1 },
      { question: 'The preposition ad + accusative in Stoic Latin most often expresses:', options: ['Opposition to virtue', 'Movement toward or striving toward something', 'Separation from virtue', 'Duration of time'], correct: 1 },
      { question: 'The preposition per + accusative can mean:', options: ['Without', 'Through or by means of', 'From', 'Under'], correct: 1 },
      { question: 'In "in animo" vs "in animum," the difference is:', options: ['There is no difference — both mean "in the mind"', 'In animo = location (in the mind); in animum = motion into the mind', 'In animum is genitive; in animo is dative', 'In animo is plural; in animum is singular'], correct: 1 },
      { question: 'The preposition cum + ablative expresses:', options: ['Location', 'Motion toward', 'Accompaniment — "with"', 'Means without accompaniment'], correct: 2 },
      { question: 'Seneca’s "vindica te tibi" uses te (accusative) and tibi (dative) to express:', options: ['Two different people', 'The same person in two grammatical roles — the self both claimed (acc.) and benefited (dat.)', 'A command to two people', 'An accusation followed by a verdict'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'ad (+ acc.)', pronunciation: 'ad', english: 'to, toward, at' },
      { latin: 'in (+ acc./abl.)', pronunciation: 'in', english: 'into (acc.) / in (abl.)' },
      { latin: 'per (+ acc.)', pronunciation: 'per', english: 'through, by means of' },
      { latin: 'sine (+ abl.)', pronunciation: 'SI-ne', english: 'without' },
      { latin: 'cum (+ abl.)', pronunciation: 'kum', english: 'with, together with' },
      { latin: 'ex / e (+ abl.)', pronunciation: 'eks / e', english: 'out of, from' },
      { latin: 'annus, anni', pronunciation: 'AN-nus', english: 'year (m.)' },
      { latin: 'tendere', pronunciation: 'TEN-de-re', english: 'to strive, stretch toward (3rd conj.)' },
      { latin: 'putare', pronunciation: 'pu-TA-re', english: 'to think, reckon (1st conj.)' },
    ],
  },

  // ── SESSION 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'Participles & the Perfect Tense',
    subtitle: 'Present active · perfect passive · perfect active indicative · temporal sequence',
    targetText: SENECA_I_1,
    objectives: [
      'Form and recognize the present active participle of all four conjugations',
      'Form and recognize the perfect passive participle (4th principal part)',
      'Conjugate the perfect active indicative — all six persons',
      'Use participles to identify the ablative absolute construction in Seneca',
    ],
    parts: [
      {
        heading: 'Part 1 — Present Active Participle',
        body: 'Participles are verbal adjectives — they carry the action of a verb but agree with a noun in gender, number, and case. The present active participle means "X-ing" (doing the action now, as the main verb happens). Present active participles decline like 3rd declension adjectives: nominative singular is -ns; all other cases use the stem + standard 3rd declension endings.',
        paradigms: [
          {
            title: 'Present Active Participle Formation',
            headers: ['Conjugation', 'Infinitive', 'Participle Stem', 'Nom. Sg. Masc.', 'Meaning'],
            rows: [
              ['1st', 'amare', 'amant-', 'amans', 'loving'],
              ['2nd', 'monere', 'monent-', 'monens', 'warning/advising'],
              ['3rd', 'regere', 'regent-', 'regens', 'ruling'],
              ['4th', 'audire', 'audient-', 'audiens', 'hearing'],
            ],
          },
          {
            title: 'amans — Present Active Participle of amare (loving)',
            headers: ['Case', 'Masc./Fem.', 'Neuter'],
            rows: [
              ['Nom. sg.', 'amans', 'amans'],
              ['Gen. sg.', 'amantis', 'amantis'],
              ['Dat. sg.', 'amanti', 'amanti'],
              ['Acc. sg.', 'amantem', 'amans'],
              ['Abl. sg.', 'amante/amanti', 'amante/amanti'],
              ['Nom. pl.', 'amantes', 'amantia'],
              ['Gen. pl.', 'amantium', 'amantium'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Perfect Active Indicative',
        body: 'The perfect tense in Latin expresses completed action — "I did X" or "I have done X." It is formed from the third principal part (the perfect stem) + perfect active endings. These endings are unique to the perfect and must be memorized.',
        paradigms: [
          {
            title: 'Perfect Active Indicative — amavi (I loved/have loved)',
            headers: ['Person', 'Form', 'Ending', 'English'],
            rows: [
              ['1sg.', 'amavi', '-i', 'I loved / I have loved'],
              ['2sg.', 'amavisti', '-isti', 'you loved'],
              ['3sg.', 'amavit', '-it', 'he/she/it loved'],
              ['1pl.', 'amavimus', '-imus', 'we loved'],
              ['2pl.', 'amavistis', '-istis', 'you all loved'],
              ['3pl.', 'amaverunt', '-erunt/-ere', 'they loved'],
            ],
          },
          {
            title: 'Perfect Stems — Key Verbs',
            headers: ['Infinitive', 'Perfect (1sg.)', 'Meaning'],
            rows: [
              ['amare', 'amavi', 'I loved'],
              ['vivere', 'vixi', 'I lived'],
              ['facere', 'feci', 'I did/made'],
              ['esse', 'fui', 'I was'],
              ['dicere', 'dixi', 'I said'],
              ['scribere', 'scripsi', 'I wrote'],
              ['colere', 'colui', 'I cultivated'],
              ['vindicare', 'vindicavi', 'I claimed'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '9.1',
        prompt: 'Form the present active participle of these verbs. Give nominative singular masculine and the genitive singular: a) vivere  b) colere  c) quaerere (to seek)  d) audire',
        answer: 'a) vivens, viventis · b) colens, colentis · c) quaerens, quaerentis · d) audiens, audientis',
      },
      {
        number: '9.2',
        prompt: 'Parse each perfect form — person, number, infinitive, English: a) vixit  b) scripsimus  c) fuerunt  d) vindicavi  e) coluerunt',
        answer: 'a) 3sg., vivere — "he/she lived" · b) 1pl., scribere — "we wrote" · c) 3pl., esse — "they were" · d) 1sg., vindicare — "I claimed" · e) 3pl., colere — "they cultivated"',
      },
      {
        number: '9.3',
        prompt: 'Ablative Absolute — Identify and translate the ablative absolute in each phrase: a) vita contemplata, felix est.  b) Seneca scribente, discimus.  c) ratione duce, bene vivimus.',
        answer: 'a) vita contemplata — "with life having been contemplated" (life is the noun, contemplata is perf. pass. ptcpl.) → "Having reflected on life, he is happy." · b) Seneca scribente — "while Seneca is writing" (present ptcpl. abl.) → "While Seneca writes, we learn." · c) ratione duce — "with reason as guide" (ablative absolute with a noun, not a participle) → "With reason as our guide, we live well."',
      },
      {
        number: '9.4',
        prompt: 'Letter I Preview — Seneca writes: "Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc auferebatur aut diripiebatur aut excidebat, collide et serva." The verbs in -bat/-batur are imperfect (past continuous). Parse vindicavi (if Lucilius were reporting Seneca’s command: "I claimed myself for myself"). Then write the sentence Lucilius might write back, beginning "Seneca me monuit..." using indirect statement.',
        answer: 'Vindicavi — 1sg. perf. act. ind. of vindicare — "I have claimed / I claimed." Lucilius’s response: "Seneca me monuit me mihi vindicandum esse." (Seneca warned me that I must claim myself for myself — using the gerundive of obligation, learned later.) Simpler: "Seneca me monuit me mihi vindicare." — Seneca warned me to claim myself for myself.',
      },
    ],
    quiz: [
      { question: 'The present active participle is formed from:', options: ['The infinitive stem + -ns', 'The present stem + -nt- + 3rd declension endings', 'The perfect stem + adjective endings', 'The supine + -us'], correct: 1 },
      { question: 'The present active participle of vivere (nom. sg.) is:', options: ['vivatus', 'vivens', 'vivit', 'viventem'], correct: 1 },
      { question: 'The perfect active indicative third person singular ending is:', options: ['-at', '-it', '-unt', '-ist'], correct: 1 },
      { question: 'The perfect of esse (to be) is:', options: ['erat', 'erit', 'fui', 'sit'], correct: 2 },
      { question: 'An ablative absolute consists of:', options: ['Any two words in the ablative', 'A noun + participle (or noun + noun), both in the ablative, forming an independent phrase', 'The ablative of a gerund only', 'A participle agreeing with the main subject'], correct: 1 },
      { question: 'The perfect of vivere (first person singular) is:', options: ['vivavi', 'vivevi', 'vixi', 'vivui'], correct: 2 },
      { question: 'In "Seneca scribente, discimus," the ablative absolute indicates:', options: ['The cause of learning', 'A temporal or circumstantial condition — "while Seneca writes"', 'The agent of learning', 'The manner of learning'], correct: 1 },
      { question: 'The genitive singular of the present participle amans is:', options: ['amans', 'amantem', 'amantis', 'amantibus'], correct: 2 },
      { question: 'The perfect active indicative first person plural ending is:', options: ['-amus', '-imus (perfect — same spelling, different stem)', '-erunt', '-isti'], correct: 1 },
      { question: 'Why are participles called "verbal adjectives"?', options: ['They replace verbs in Latin sentences', 'They carry verbal meaning (action, tense, voice) but decline like adjectives to agree with nouns', 'They are adjectives that evolved from verbs in Proto-Indo-European', 'They always appear with esse'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'amans, amantis', pronunciation: 'A-mans', english: 'loving (pres. act. ptcpl.)' },
      { latin: 'scribere', pronunciation: 'SKRI-be-re', english: 'to write (3rd conj.); perf. scripsi' },
      { latin: 'quaerere', pronunciation: 'KWAI-re-re', english: 'to seek, ask (3rd conj.)' },
      { latin: 'discere', pronunciation: 'DIS-ke-re', english: 'to learn (3rd conj.)' },
      { latin: 'monere', pronunciation: 'mo-NE-re', english: 'to warn, advise (2nd conj.); perf. monui' },
      { latin: 'contemplari', pronunciation: 'kon-tem-PLA-ri', english: 'to contemplate (1st conj. deponent)' },
      { latin: 'dux, ducis', pronunciation: 'duks', english: 'leader, guide (m., 3rd)' },
      { latin: 'felix, felicis', pronunciation: 'FE-liks', english: 'happy, fortunate (3rd decl. adj.)' },
    ],
  },

  // ── SESSION 10 — MILESTONE ─────────────────────────────────────────────────
  {
    id: 10,
    title: 'MILESTONE — Epistulae Morales I.1: First Reading',
    subtitle: 'Synthesis of Sessions 1–9 · full reading of Seneca’s opening letter',
    isMilestone: true,
    targetText: SENECA_I_1,
    objectives: [
      'Read and translate Epistulae Morales I.1 in full with minimal support',
      'Parse every major form — case, person, tense, construction',
      'Explain the philosophical argument of the letter in your own words',
      'Connect Seneca’s Latin to the Stoic ethical framework from PHIL 701 and GREK 101',
    ],
    parts: [
      {
        heading: 'Milestone Session — Synthesis, Not New Grammar',
        body: 'This session is a synthesis — no new grammar is introduced. Everything needed to read Epistulae Morales I.1 has been taught in Sessions 1–9. The goal is a full reading of Seneca’s first letter: to parse every word, to understand the argument, and to feel the force of philosophy written directly to a named person who was trying to do what you are trying to do.',
        callout: {
          label: 'The Text — Seneca, Epistulae Morales I.1',
          text: 'Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc auferebatur aut diripiebatur aut excidebat, collide et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit. Et si volueris attendere, magna pars vitae elabitur male agentibus, maxima nihil agentibus, tota vita aliud agentibus.',
        },
      },
      {
        heading: 'Sentence 1 — Word-by-Word Parse',
        body: '"Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc auferebatur aut diripiebatur aut excidebat, collide et serva."',
        paradigms: [
          {
            title: 'Sentence 1 Parse',
            headers: ['Word / Phrase', 'Form', 'Dictionary Entry', 'Meaning in Context'],
            rows: [
              ['Ita', 'Adverb', 'ita', 'in this way, thus — "do it this way"'],
              ['fac', '2sg. imperative of facio', 'facere', 'do! — irregular short imperative'],
              ['mi', 'Vocative sg. masc. of meus', 'meus, -a, -um', 'my — affectionate address'],
              ['Lucili', 'Vocative sg. masc.', 'Lucilius', 'Lucilius — the letter’s recipient'],
              ['vindica', '2sg. imperative, 1st conj.', 'vindicare', 'claim! liberate! — the philosophical command'],
              ['te', 'Acc. sg. of tu', 'tu', 'yourself — the object to be claimed'],
              ['tibi', 'Dat. sg. of tu', 'tu', 'for yourself — the beneficiary'],
              ['tempus', 'Acc. sg. neut., 3rd decl.', 'tempus, -oris', 'time — direct object of collide et serva'],
              ['quod', 'Acc. sg. neut. relative pronoun', 'qui, quae, quod', 'which — introduces relative clause'],
              ['adhuc', 'Adverb', 'adhuc', 'until now, still, up to this point'],
              ['auferebatur', '3sg. imperf. pass. of aufero', 'auferre', 'was being taken away (by others)'],
              ['diripiebatur', '3sg. imperf. pass. of diripio', 'diripere', 'was being torn away, plundered'],
              ['excidebat', '3sg. imperf. act. of excido', 'excidere', 'was falling away, slipping by'],
              ['collide', '2sg. imperative of colligo', 'colligere', 'gather up, collect — reclaim'],
              ['serva', '2sg. imperative of servo', 'servare', 'keep, preserve, guard'],
            ],
          },
        ],
        callout: {
          label: 'Translation of Sentence 1',
          text: 'Do this, my Lucilius: claim yourself for yourself, and gather up and keep the time which until now was being taken away, or torn away, or was slipping by.',
        },
      },
      {
        heading: 'Sentence 2 — Word-by-Word Parse',
        body: '"Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt."',
        paradigms: [
          {
            title: 'Sentence 2 Parse',
            headers: ['Word / Phrase', 'Form', 'Meaning'],
            rows: [
              ['Persuade tibi', '2sg. imperative + dat. reflexive', 'Convince yourself — dative of reference'],
              ['hoc sic esse', 'acc. + infinitive (indirect stmt.)', 'that this is so — hoc (acc.) is subject of esse'],
              ['ut scribo', 'comparative clause', 'as I am writing / as I describe'],
              ['quaedam tempora', 'nom. pl. neut. of quidam', 'certain portions of time (subject)'],
              ['eripiuntur', '3pl. pres. pass. of eripio', 'are snatched away (from us)'],
              ['nobis', 'dat. pl. of nos', 'from us — dative of separation'],
              ['subducuntur', '3pl. pres. pass. of subduco', 'are withdrawn, subtracted'],
              ['effluunt', '3pl. pres. act. of effluo', 'flow away, slip away'],
            ],
          },
        ],
        callout: {
          label: 'Translation of Sentence 2',
          text: 'Convince yourself that this is so, as I write: certain portions of time are snatched from us, certain ones are withdrawn, certain ones flow away.',
        },
      },
      {
        heading: 'Sentence 3 — Word-by-Word Parse',
        body: '"Turpissima tamen est iactura quae per neglegentiam fit. Et si volueris attendere, magna pars vitae elabitur male agentibus, maxima nihil agentibus, tota vita aliud agentibus."',
        paradigms: [
          {
            title: 'Sentence 3 Key Words',
            headers: ['Word', 'Form', 'English', 'Note'],
            rows: [
              ['Turpissima', 'Superlative of turpis — nom. sg. fem.', 'most shameful/disgraceful', 'predicate adjective with iactura'],
              ['iactura', 'Nom. sg. fem. — 1st decl.', 'loss, waste', 'subject of est'],
              ['quae', 'Nom. sg. fem. relative pronoun', 'which', 'refers to iactura'],
              ['per neglegentiam', 'per + acc.', 'through negligence/carelessness', 'the worst kind of time-loss'],
              ['fit', '3sg. pres. of fio (irregular)', 'is made, happens, occurs', 'fio = passive of facio'],
              ['volueris', '2sg. fut. perf. of volo', 'you will have wished, if you choose', 'future perfect condition'],
              ['attendere', 'infinitive of attendo', 'to pay attention, consider', 'complement of volueris'],
              ['magna pars vitae', 'nom. phrase + gen.', 'a great part of life', 'subject of elabitur'],
              ['elabitur', '3sg. pres. pass. of elabor', 'slips away', 'intransitive'],
              ['male agentibus', 'dat. pl. pres. ptcpl.', 'for those acting badly', 'dative of reference'],
              ['nihil agentibus', 'same construction', 'for those doing nothing', 'nihil = nothing (indeclinable)'],
              ['aliud agentibus', 'same construction', 'for those doing something else', 'aliud = another thing'],
            ],
          },
        ],
        callout: {
          label: 'Translation of Sentence 3 + Full Passage',
          text: 'Yet the most shameful loss is the one that happens through negligence. And if you choose to pay attention: a great part of life slips away for those acting badly, the greatest part for those doing nothing, and all of life for those doing something other than what matters. — FULL: Do this, my Lucilius: claim yourself for yourself, and gather up and keep the time which until now was being taken away, or torn away, or was slipping by. Convince yourself that this is so, as I write: certain portions of time are snatched from us, certain ones are withdrawn, certain ones flow away. Yet the most shameful loss is the one that happens through negligence. And if you choose to pay attention: a great part of life slips away for those acting badly, the greatest part for those doing nothing, and all of life for those doing something other than what matters.',
        },
      },
    ],
    exercises: [
      {
        number: '10.1',
        prompt: 'Close Reading — Seneca identifies three ways time is lost: eripiuntur (snatched), subducuntur (withdrawn), effluunt (flow away). He then adds a fourth — per neglegentiam (through negligence) — which he calls turpissima (most shameful). a) What is the difference between time being snatched and time flowing away? b) Why is negligence worse than having time stolen? c) Which of Seneca’s four categories describes how most people in your life lose time?',
        answer: 'a) Snatched = external theft (others’ demands, obligations); flowing away = passive loss through inattention. Both are involuntary but the second implicates the person themselves. b) Negligence is an act of the will — the person is present and choosing not to attend. A thief does not require your cooperation; negligence does. c) Open — the exercise is philosophical self-examination.',
      },
      {
        number: '10.2',
        prompt: 'Grammar Audit — List every grammatical construction in Letter I.1 that you needed help parsing. Organize by category: (a) verb forms, (b) participles, (c) indirect statement, (d) prepositions. Which area needs the most work before Unit II?',
        answer: '[Personal audit — open. Expected difficulty areas: auferebatur/diripiebatur (imperfect passive — not yet formally taught, but recognizable from the -batur ending), the triple dative participial construction (male agentibus / nihil agentibus / aliud agentibus), and fio as passive of facio (irregular).]',
      },
      {
        number: '10.3',
        prompt: 'Memorization — Memorize the opening: "Ita fac, mi Lucili: vindica te tibi." Write it from memory five times. Then write it in Greek — using what you know from GREK 101: "ποίει οὕτως, ὦ Λουκίλιε· ἀπόδος σεαυτὸν σεαυτῷ." Reflect: does the Latin or Greek version feel more urgent?',
        answer: '[Drill — no single answer. The Greek version uses imperatives ποίει (do) and ἀπόδος (give back/restore), which have different nuances: the Latin vindica (claim, liberate) is more legalistic and active; the Greek ἀπόδος (give back) implies restoration of something already yours. Both are urgent; the Latin is more combative.]',
      },
      {
        number: '10.4',
        prompt: 'Philosophical Application — Seneca ends with: "tota vita aliud agentibus" — for those doing something other than what matters, all of life slips away. Write 200 words: what does "doing something other than what matters" look like in your own life? Use at least one Latin phrase from Letter I.1 in your response.',
        answer: '[Open philosophical exercise. Expected use of Latin: aliud agere / magna pars vitae / per neglegentiam. The exercise connects ancient text to present experience — the core pedagogical aim of the course.]',
      },
    ],
    quiz: [
      { question: 'The imperative "vindica" is second person singular of:', options: ['vivere', 'vindicare', 'videre', 'vincere'], correct: 1 },
      { question: 'In "vindica te tibi," te is accusative (the object claimed) and tibi is:', options: ['Another accusative', 'Dative — the beneficiary of the claiming', 'Ablative of means', 'Nominative — the subject'], correct: 1 },
      { question: 'Seneca identifies three ways time is lost. Which is he not describing?', options: ['eripiuntur — snatched away', 'subducuntur — withdrawn', 'effluunt — flow away', 'consumuntur — consumed in virtue'], correct: 3 },
      { question: 'The superlative turpissima means:', options: ['rather shameful', 'shameful', 'most shameful / most disgraceful', 'not shameful'], correct: 2 },
      { question: 'The relative clause "quae per neglegentiam fit" refers to:', options: ['Lucilius', 'vita (life)', 'iactura (loss)', 'tempus (time)'], correct: 2 },
      { question: 'The construction "male agentibus" is a participial dative meaning:', options: ['those who acted well', 'for/from those acting badly — those who use time badly', 'badly acting (ablative absolute)', 'the badly acting (nominative subject)'], correct: 1 },
      { question: 'Seneca says the most shameful time-loss is per neglegentiam because:', options: ['Negligence is illegal', 'Negligence is a choice — unlike theft, it requires the person’s own participation', 'Negligence wastes more time than theft', 'Seneca personally suffered from negligence'], correct: 1 },
      { question: 'The imperfect passive auferebatur means:', options: ['was taken, snatched (completed)', 'was being taken away (continuous past — ongoing)', 'will be taken', 'has been taken'], correct: 1 },
      { question: 'The phrase "magna pars vitae" uses vitae as:', options: ['Dative singular', 'Nominative plural', 'Genitive singular — "of life"', 'Accusative singular'], correct: 2 },
      { question: 'Having completed Session 10, a student has:', options: ['Summarized Seneca’s Letter I from a translation', 'Read the first sentence of Letter I.1 in Latin', 'Read and parsed all three sentences of Seneca’s Epistulae Morales I.1 in the original Latin', 'Completed the entire Latin curriculum'], correct: 2 },
    ],
    vocabulary: [
      { latin: 'ita', pronunciation: 'I-ta', english: 'thus, in this way' },
      { latin: 'tempus, temporis', pronunciation: 'TEM-pus', english: 'time (n., 3rd)' },
      { latin: 'iactura, iacturae', pronunciation: 'yak-TU-ra', english: 'loss, waste (f.)' },
      { latin: 'neglegentia, neglegentiae', pronunciation: 'neg-le-GEN-ti-a', english: 'negligence, carelessness (f.)' },
      { latin: 'colligere', pronunciation: 'kol-LI-ge-re', english: 'to gather up, collect (3rd conj.)' },
      { latin: 'servare', pronunciation: 'ser-WA-re', english: 'to keep, preserve, guard (1st conj.)' },
      { latin: 'attendere', pronunciation: 'at-TEN-de-re', english: 'to pay attention (3rd conj.)' },
      { latin: 'elabi', pronunciation: 'e-LA-bi', english: 'to slip away (3rd conj. deponent)' },
      { latin: 'persuadere', pronunciation: 'per-swa-DE-re', english: 'to convince, persuade (2nd conj. + dat.)' },
      { latin: 'turpis, turpe', pronunciation: 'TUR-pis', english: 'shameful, disgraceful (3rd decl. adj.)' },
    ],
  },
];
