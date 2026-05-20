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

  // ── SESSION 11 ─────────────────────────────────────────────────────────────
  {
    id: 11,
    title: 'Passive Voice',
    subtitle: 'Being acted upon — Latin’s third voice and the grammar of external circumstances',
    targetText: SENECA_I_1,
    objectives: [
      'Recognize and produce present passive indicative forms of all four conjugations',
      'Distinguish active from passive meaning by ending',
      'Use the ablative of agent with a/ab',
      'Identify passive infinitives',
      'Connect passive constructions to Stoic themes of what happens to us vs. what we do',
    ],
    parts: [
      {
        heading: 'Part 1 — Active vs. Passive: A Stoic Frame',
        body: 'Latin grammar mirrors a fundamental Stoic distinction. The active voice describes what the subject does: virtus exercetur — “virtue is practiced” (active). The passive describes what happens to the subject: virtus laudatur — “virtue is praised” (passive). For the Stoics, the ethical significance of this distinction is immense: what we do is eph’ hēmin (up to us); what happens to us is not. The passive voice is the grammar of external circumstances — things done to us, bestowed or withdrawn by fortune.\n\nEpictetus and Seneca write in both voices, but with full awareness: when Seneca says fata ducunt — “fate leads” (active) — he puts the agency squarely with fate. When he says ducimur — “we are led” — he describes the human side of the same event, stripped of agency. Both sentences describe the same reality; the voice encodes where agency sits.',
      },
      {
        heading: 'Part 2 — Present Passive Indicative: All Four Conjugations',
        body: 'The passive voice is formed by replacing the active endings with passive endings. The passive ending characteristic: -r appears in 1st person, -ris in 2nd, -tur in 3rd, -mur in 1st plural, -mini in 2nd plural, -ntur in 3rd plural.',
        paradigms: [
          {
            title: 'Present Passive Indicative',
            headers: ['Person', '1st Conj. (amare)', '2nd Conj. (monere)', '3rd Conj. (ducere)', '4th Conj. (audire)'],
            rows: [
              ['1st sg.', 'amor', 'moneor', 'ducor', 'audior'],
              ['2nd sg.', 'amaris', 'moneris', 'duceris', 'audiris'],
              ['3rd sg.', 'amatur', 'monetur', 'ducitur', 'auditur'],
              ['1st pl.', 'amamur', 'monemur', 'ducimur', 'audimur'],
              ['2nd pl.', 'amamini', 'monemini', 'ducimini', 'audimini'],
              ['3rd pl.', 'amantur', 'monentur', 'ducuntur', 'audiuntur'],
            ],
          },
        ],
        callout: {
          text: 'Memory key: active 1st sg. ends in -o/-m; passive 1st sg. ends in -r. Active 3rd sg. ends in -t; passive 3rd sg. ends in -tur. The -r signals “I am being acted upon.”',
        },
      },
      {
        heading: 'Part 3 — Ablative of Agent',
        body: 'When a passive verb needs to express who performs the action, Latin uses the preposition a/ab + ablative. This is the ablative of agent, used only with passive verbs and only with persons (not things — means uses the plain ablative).',
        paradigms: [
          {
            title: 'Agent vs. Means',
            headers: ['Construction', 'Latin', 'Translation'],
            rows: [
              ['Ablative of agent', 'virtus a philosopho laudatur.', 'Virtue is praised by the philosopher.'],
              ['Ablative of means (no a/ab)', 'ratio ratione regitur.', 'Reason is governed by reason (means).'],
              ['Ablative of agent', 'animus a Deo regitur.', 'The soul is governed by God.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Passive Infinitive',
        body: 'The present passive infinitive replaces the -re of the active infinitive with -ri (1st, 2nd, 4th conjugations) or -i (3rd conjugation).',
        paradigms: [
          {
            title: 'Passive Infinitive',
            headers: ['Conjugation', 'Active inf.', 'Passive inf.'],
            rows: [
              ['1st', 'amare (to love)', 'amari (to be loved)'],
              ['2nd', 'monere (to warn)', 'moneri (to be warned)'],
              ['3rd', 'ducere (to lead)', 'duci (to be led)'],
              ['4th', 'audire (to hear)', 'audiri (to be heard)'],
            ],
          },
        ],
        callout: {
          text: 'Seneca uses the passive infinitive in his philosophical program: beatum esse — “to be happy” (active), and contextually “to be made happy” in discussions of whether happiness is something done or something received.',
        },
      },
    ],
    exercises: [
      {
        number: '11.1',
        prompt: 'Form the Passive — give the present passive 3rd singular of: amo, moneo, duco, audio',
        answer: 'amatur, monetur, ducitur, auditur',
      },
      {
        number: '11.2',
        prompt: 'Translate: 1. virtus a sapiente laudatur.  2. animus ratione regitur.  3. fata a Deo ducuntur.  4. veritas non facile invenitur.',
        answer: '1. Virtue is praised by the wise man. 2. The soul/mind is governed by reason. 3. The fates are led by God. 4. Truth is not easily found.',
      },
      {
        number: '11.3',
        prompt: 'Active to Passive — convert to passive (retaining the same subject relationship): philosophus virtutem exercet.',
        answer: 'virtus a philosopho exercetur. (Virtue is practiced by the philosopher.)',
      },
      {
        number: '11.4',
        prompt: 'Stoic Reflection — what is the Stoic significance of the passive voice when applied to body, reputation, and wealth?',
        answer: 'Body is acted upon — it suffers disease, injury, aging — without our choosing. Reputation is conferred or withheld by others. Wealth is gained and lost by external fortune. The passive voice grammatically encodes what Epictetus calls the ouk eph’ hēmin category: things that happen to us, not things we do. When Seneca writes corpus corrumpitur — “the body is corrupted” — the passive correctly places agency outside the subject. The only thing that cannot be fully subjected to the passive is the soul’s judgment (iudicium) — which is why Stoics say the soul is free even in an enslaved body.',
      },
    ],
    quiz: [
      { question: 'What ending signals the passive 1st singular?', options: ['-o', '-r (e.g., amor, moneor, ducor)', '-tur', '-mur'], correct: 1 },
      { question: 'What ending signals the passive 3rd singular?', options: ['-t', '-tur (e.g., amatur, ducitur)', '-nt', '-r'], correct: 1 },
      { question: 'What construction expresses the agent with a passive verb?', options: ['a/ab + ablative (the ablative of agent)', 'the dative case alone', 'the genitive case', 'cum + ablative'], correct: 0 },
      { question: 'Give the passive infinitive of duco.', options: ['ducere', 'duci', 'ductus', 'duceri'], correct: 1 },
      { question: 'Translate: virtus a philosopho laudatur.', options: ['The philosopher praises virtue.', 'Virtue is praised by the philosopher.', 'Virtue praises the philosopher.', 'Let virtue be praised.'], correct: 1 },
      { question: 'What distinguishes the ablative of agent from the ablative of means?', options: ['Agent uses a/ab + ablative (persons); means uses the bare ablative (things/instruments)', 'They are identical', 'Agent uses the dative; means uses the genitive', 'Means always takes a/ab'], correct: 0 },
      { question: 'Give the present passive 3rd plural of audio.', options: ['audiunt', 'audiuntur', 'audiantur', 'audimur'], correct: 1 },
      { question: 'Give the present passive 1st plural of moneo.', options: ['monemus', 'monentur', 'monemur', 'moneor'], correct: 2 },
      { question: 'Translate: animus ratione regitur.', options: ['Reason governs the soul.', 'The soul/mind is governed by reason.', 'The soul governs by reason.', 'Let reason govern the soul.'], correct: 1 },
      { question: 'Why is the passive voice philosophically significant for Stoic ethics?', options: ['It is grammatically simpler than the active', 'It encodes what happens to us (ouk eph’ hēmin) vs. what we do (eph’ hēmin) — the foundational Stoic distinction', 'It is used only in poetry', 'It refers only to the gods'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'amare', pronunciation: 'a-MA-re', english: 'to love (1st conj.)' },
      { latin: 'monere', pronunciation: 'mo-NE-re', english: 'to warn, to advise (2nd conj.)' },
      { latin: 'ducere', pronunciation: 'DU-ke-re', english: 'to lead (3rd conj.)' },
      { latin: 'audire', pronunciation: 'au-DI-re', english: 'to hear (4th conj.)' },
      { latin: 'regere', pronunciation: 'RE-ge-re', english: 'to rule, to govern (3rd conj.)' },
      { latin: 'laudare', pronunciation: 'lau-DA-re', english: 'to praise (1st conj.)' },
    ],
  },

  // ── SESSION 12 ─────────────────────────────────────────────────────────────
  {
    id: 12,
    title: 'Imperfect Tense',
    subtitle: 'Continuous and repeated past action — the grammar of habit and formation',
    targetText: SENECA_I_1,
    objectives: [
      'Form the imperfect active and passive of all four conjugations',
      'Understand the aspectual difference between imperfect (ongoing) and perfect (completed)',
      'Recognize the imperfect of sum (esse)',
      'Read the imperfect in Seneca describing past practice and habit',
    ],
    parts: [
      {
        heading: 'Part 1 — The Latin Tense System: Aspect Matters',
        body: 'Latin makes a crucial aspectual distinction in the past: the imperfect describes ongoing, repeated, or background past action (“was doing,” “used to do”); the perfect describes completed action with present relevance (“has done,” “did and it is done”). This distinction maps onto the Stoic emphasis on continuous practice (exercitatio) as distinct from isolated acts.\n\nWhen Seneca describes his daily philosophical practices — what he used to do, what he was reflecting on — he reaches for the imperfect. The imperfect is the tense of the prokopton’s training journal, not the sage’s completed achievement.',
      },
      {
        heading: 'Part 2 — Imperfect Active: Formation',
        body: 'The imperfect active is formed by: present stem + ba + secondary active endings. The -ba- infix is the signature of the Latin imperfect.',
        paradigms: [
          {
            title: 'Imperfect Active',
            headers: ['Person', '1st Conj. (amare)', '2nd Conj. (monere)', '3rd Conj. (ducere)', '4th Conj. (audire)'],
            rows: [
              ['1st sg.', 'ama-ba-m', 'mone-ba-m', 'duce-ba-m', 'audie-ba-m'],
              ['2nd sg.', 'ama-ba-s', 'mone-ba-s', 'duce-ba-s', 'audie-ba-s'],
              ['3rd sg.', 'ama-ba-t', 'mone-ba-t', 'duce-ba-t', 'audie-ba-t'],
              ['1st pl.', 'ama-ba-mus', 'mone-ba-mus', 'duce-ba-mus', 'audie-ba-mus'],
              ['2nd pl.', 'ama-ba-tis', 'mone-ba-tis', 'duce-ba-tis', 'audie-ba-tis'],
              ['3rd pl.', 'ama-ba-nt', 'mone-ba-nt', 'duce-ba-nt', 'audie-ba-nt'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Imperfect Passive and sum',
        body: 'The imperfect passive replaces the active endings with passive endings on the same -ba- stem.',
        paradigms: [
          {
            title: 'Imperfect Active vs. Passive',
            headers: ['Person', 'Imperfect Active', 'Imperfect Passive'],
            rows: [
              ['1st sg.', 'amabam', 'amabar'],
              ['3rd sg.', 'amabat', 'amabatur'],
              ['3rd pl.', 'amabant', 'amabantur'],
            ],
          },
        ],
        callout: {
          text: 'sum (to be) has an irregular imperfect: eram, eras, erat, eramus, eratis, erant. These forms appear constantly in Seneca — especially erat (it was) in his narrative constructions.',
        },
      },
      {
        heading: 'Part 4 — Imperfect in Seneca',
        body: 'Epistulae Morales I.1 uses very few imperfects (it is primarily present-tense philosophical counsel), but adjacent Senecan prose is full of them. In Epistula I.4 — which Unit II students will encounter — Seneca describes his past habits of wasting time: diffundebam (I was squandering), procrastinabam (I was putting off). Both are imperfects, capturing the ongoing character of his former bad habits.',
        paradigms: [
          {
            title: 'The Imperfect in Context',
            headers: ['Latin', 'Translation + Note'],
            rows: [
              ['exercitabam animum cotidie.', 'I was training / used to train the mind daily. (imperfect of exercitare)'],
              ['tempus perdebam in nugis.', 'I was wasting time on trifles. (imperfect of perdere)'],
              ['sapientia non casu venit.', 'Wisdom does not come by chance. (present — general truth)'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '12.1',
        prompt: 'Form the Imperfect — give the imperfect active 1st singular of: amo, moneo, duco, audio',
        answer: 'amabam, monebam, ducebam, audiebam',
      },
      {
        number: '12.2',
        prompt: 'Imperfect of sum — give all six forms of the imperfect of sum.',
        answer: 'eram, eras, erat, eramus, eratis, erant',
      },
      {
        number: '12.3',
        prompt: 'Translate: 1. exercitabam animum cotidie.  2. philosophus virtutem laudabat semper.  3. tempus a nobis perdebatur.',
        answer: '1. I was training / used to train the mind daily. 2. The philosopher was always / used to praise virtue. 3. Time was being wasted by us.',
      },
      {
        number: '12.4',
        prompt: 'Aspectual Distinction — explain why Seneca would use the imperfect rather than the perfect to describe his former bad habits.',
        answer: 'The imperfect (perdebam — “I was wasting / used to waste”) describes habitual, ongoing past action — a pattern of behavior across many days and years. It captures the sustained character of the bad habit. The perfect (perdidi — “I wasted / I have wasted”) would describe a single completed act of waste. Seneca’s point is precisely that his former time-wasting was a habitual mode of life, not a single incident. The imperfect is the tense of bad character just as it is the tense of good practice — both are described as sustained patterns over time.',
      },
    ],
    quiz: [
      { question: 'What is the signature marker of the Latin imperfect?', options: ['-ba- between the stem and the secondary endings', '-vi-', '-r', '-nt'], correct: 0 },
      { question: 'What aspectual meaning does the imperfect carry?', options: ['Completed single past action', 'Ongoing, continuous, or repeated past action (“was doing,” “used to do”)', 'Future intention', 'A direct command'], correct: 1 },
      { question: 'Give the imperfect 3rd singular of sum.', options: ['est', 'erat', 'fuit', 'erit'], correct: 1 },
      { question: 'Give the imperfect active 3rd plural of amo.', options: ['amabant', 'amaverunt', 'amant', 'amabunt'], correct: 0 },
      { question: 'Give the imperfect passive 3rd singular of moneo.', options: ['monebat', 'monebatur', 'monetur', 'monebantur'], correct: 1 },
      { question: 'Translate: philosophus virtutem laudabat.', options: ['The philosopher praised virtue once.', 'The philosopher was praising / used to praise virtue.', 'The philosopher will praise virtue.', 'Let the philosopher praise virtue.'], correct: 1 },
      { question: 'Which tense describes completed past action with present relevance?', options: ['The imperfect', 'The future', 'The perfect', 'The present'], correct: 2 },
      { question: 'What is the imperfect active 1st plural of duco?', options: ['ducebam', 'ducebamus', 'duxerimus', 'ducimus'], correct: 1 },
      { question: 'Give the imperfect passive 3rd plural of audio.', options: ['audiebantur', 'audiebatur', 'audiuntur', 'audientur'], correct: 0 },
      { question: 'Translate: exercitabam animum cotidie.', options: ['I trained the mind once.', 'I was training / used to train the mind daily.', 'I will train the mind daily.', 'Train the mind daily!'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'exercitare', pronunciation: 'ek-ser-ki-TA-re', english: 'to train, to exercise (1st conj.)' },
      { latin: 'perdere', pronunciation: 'PER-de-re', english: 'to waste, to lose, to destroy (3rd conj.)' },
      { latin: 'cotidie', pronunciation: 'ko-TI-di-e', english: 'daily, every day (adv.)' },
      { latin: 'semper', pronunciation: 'SEM-per', english: 'always (adv.)' },
      { latin: 'sum, esse', pronunciation: 'sum, ES-se', english: 'to be (irregular)' },
      { latin: 'procrastinare', pronunciation: 'pro-kras-ti-NA-re', english: 'to put off, to delay (1st conj.)' },
    ],
  },

  // ── SESSION 13 ─────────────────────────────────────────────────────────────
  {
    id: 13,
    title: 'Subjunctive Mood I — Present and Imperfect',
    subtitle: 'Purpose, result, and indirect command — the grammar of Latin’s most important mood',
    targetText: SENECA_I_1,
    objectives: [
      'Form the present and imperfect subjunctive active and passive',
      'Use the subjunctive in purpose clauses (ut + subj.)',
      'Use the subjunctive in indirect commands (iubeo/hortor + ut + subj.)',
      'Understand sequence of tenses (primary vs. secondary sequence)',
    ],
    parts: [
      {
        heading: 'Part 1 — The Subjunctive: Latin’s Most Productive Mood',
        body: 'Latin uses the subjunctive mood far more extensively than Greek. Where Greek often uses the indicative for hypothetical statements, Latin regularly reaches for the subjunctive. For students of Stoic philosophical prose, mastery of the subjunctive is not optional — it is the mood of purpose, possibility, command, and indirect discourse.\n\nThe key formation rule: the present subjunctive uses different vowels than the present indicative. The mnemonic is “She sees a bee” — the 1st conjugation present subjunctive uses -e- (not -a-); the 2nd–4th use -a- (not -e-/-i-).',
      },
      {
        heading: 'Part 2 — Present Subjunctive Active',
        body: 'Formation: the 1st conj. present subjunctive changes -a- to -e- (amem). The 2nd–4th present subjunctive inserts -a- (moneam, ducam, audiam).',
        paradigms: [
          {
            title: 'Present Subjunctive Active',
            headers: ['Person', '1st Conj.', '2nd Conj.', '3rd Conj.', '4th Conj.'],
            rows: [
              ['1st sg.', 'amem', 'moneam', 'ducam', 'audiam'],
              ['2nd sg.', 'ames', 'moneas', 'ducas', 'audias'],
              ['3rd sg.', 'amet', 'moneat', 'ducat', 'audiat'],
              ['1st pl.', 'amemus', 'moneamus', 'ducamus', 'audiamus'],
              ['2nd pl.', 'ametis', 'moneatis', 'ducatis', 'audiatis'],
              ['3rd pl.', 'ament', 'moneant', 'ducant', 'audiant'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Imperfect Subjunctive',
        body: 'The imperfect subjunctive is the easiest Latin form to generate: it is the present infinitive + personal endings. Take any verb’s infinitive and add the personal endings directly.',
        paradigms: [
          {
            title: 'Imperfect Subjunctive',
            headers: ['Person', '1st Conj. (amare)', '2nd Conj. (monere)'],
            rows: [
              ['1st sg.', 'amarem', 'monerem'],
              ['2nd sg.', 'amares', 'moneres'],
              ['3rd sg.', 'amaret', 'moneret'],
              ['3rd pl.', 'amarent', 'monerent'],
            ],
          },
        ],
        callout: {
          text: 'Imperfect subjunctive of esse (to be): essem, esses, esset, essemus, essetis, essent — or the alternative form forem, fores, foret, forent (archaic, appears in Cicero and Livy).',
        },
      },
      {
        heading: 'Part 4 — Purpose Clauses and Sequence of Tenses',
        body: 'Purpose clauses (final clauses) use ut + subjunctive (positive) or ne + subjunctive (negative). The tense of the subjunctive depends on the main verb’s tense — this is the sequence of tenses. Primary sequence: if the main verb is present or future, the purpose clause uses the present subjunctive. Secondary sequence: if the main verb is past (perfect, imperfect, pluperfect), the purpose clause uses the imperfect subjunctive.',
        paradigms: [
          {
            title: 'Sequence of Tenses',
            headers: ['Main Verb', 'Example'],
            rows: [
              ['Present (primary): philosophatur', 'philosophatur ut virtutem discat. He philosophizes in order to learn virtue. (pres. subj.)'],
              ['Imperfect (secondary): philosophabatur', 'philosophabatur ut virtutem disceret. He was philosophizing in order to learn virtue. (imperf. subj.)'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '13.1',
        prompt: 'Form the Subjunctive — give the present subjunctive 3rd singular of: amo, moneo, duco, audio, sum',
        answer: 'amet, moneat, ducat, audiat, sit',
      },
      {
        number: '13.2',
        prompt: 'Purpose Clauses — translate: 1. philosophatur ut virtutem discat.  2. laborabat ne tempus perderet.',
        answer: '1. He philosophizes in order to learn virtue. 2. He was working so that he might not waste time.',
      },
      {
        number: '13.3',
        prompt: 'Sequence of Tenses — identify whether each uses primary or secondary sequence: 1. legit ut sapiat.  2. legebat ut saperet.  3. leget ut sapiat.',
        answer: '1. Primary (present main verb — legit). 2. Secondary (imperfect main verb — legebat). 3. Primary (future main verb — leget).',
      },
      {
        number: '13.4',
        prompt: 'Seneca on Purpose — translate and analyze: ita fac, mi Lucili: vindica te tibi — so that you may possess yourself.',
        answer: 'Seneca’s command: vindica te tibi — “claim yourself for yourself.” The implied purpose clause would be ut tibi vivas (so that you may live for yourself) — Seneca’s actual phrase in Ep. I.1. The subjunctive purpose clause encodes the telos of philosophical practice: the whole project of askēsis is oriented toward self-possession, which requires a subjunctive because it is not yet actual — it is aimed at.',
      },
    ],
    quiz: [
      { question: 'What vowel change creates the 1st conjugation present subjunctive?', options: ['-a- changes to -e- (amem, ames, amet…)', '-e- changes to -a-', '-i- changes to -e-', 'No vowel change occurs'], correct: 0 },
      { question: 'How is the imperfect subjunctive formed?', options: ['Augment + stem', 'Present infinitive + personal endings (amarem, amares, amaret…)', 'Perfect stem + -erim', 'Reduplication + stem'], correct: 1 },
      { question: 'What conjunction introduces purpose clauses?', options: ['quod (positive) / quia (negative)', 'ut (positive) or ne (negative) + subjunctive', 'cum + indicative', 'si + subjunctive'], correct: 1 },
      { question: 'What is primary sequence?', options: ['Main verb present or future → the purpose clause uses the present subjunctive', 'Main verb past → present subjunctive', 'Main verb present → imperfect subjunctive', 'Any verb → perfect subjunctive'], correct: 0 },
      { question: 'What is secondary sequence?', options: ['Main verb present → imperfect subjunctive', 'Main verb is past → the purpose clause uses the imperfect subjunctive', 'Main verb future → present subjunctive', 'There is no secondary sequence'], correct: 1 },
      { question: 'Give the present subjunctive 3rd singular of sum.', options: ['est', 'sit', 'esset', 'fuit'], correct: 1 },
      { question: 'Translate: laborat ut discat.', options: ['He learned by working.', 'He works in order to learn.', 'He was working to learn.', 'Let him work and learn.'], correct: 1 },
      { question: 'Give the imperfect subjunctive 1st singular of moneo.', options: ['moneam', 'monerem', 'monuissem', 'monebam'], correct: 1 },
      { question: 'What is the negative purpose conjunction?', options: ['non', 'ne (+ subjunctive)', 'haud', 'nec'], correct: 1 },
      { question: 'Why is the subjunctive the appropriate mood for purpose clauses?', options: ['Purpose statements are always false', 'Purpose describes something aimed at but not yet achieved — a goal, not a fact', 'The indicative cannot form clauses', 'Purpose clauses describe the past'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'discere', pronunciation: 'DIS-ke-re', english: 'to learn (3rd conj.)' },
      { latin: 'laborare', pronunciation: 'la-bo-RA-re', english: 'to work, to labor (1st conj.)' },
      { latin: 'sapere', pronunciation: 'SA-pe-re', english: 'to be wise, to taste (3rd conj.)' },
      { latin: 'ut', pronunciation: 'ut', english: 'so that, in order that (+ subjunctive)' },
      { latin: 'ne', pronunciation: 'ne', english: 'so that not, lest (+ subjunctive)' },
      { latin: 'philosophari', pronunciation: 'phi-lo-so-PHA-ri', english: 'to philosophize (1st conj. deponent)' },
    ],
  },

  // ── SESSION 14 ─────────────────────────────────────────────────────────────
  {
    id: 14,
    title: 'Participles — Present, Perfect, Future Active',
    subtitle: 'Latin’s three active participles and the grammar of character description',
    targetText: SENECA_I_1,
    objectives: [
      'Form present active, perfect passive, and future active participles',
      'Decline participles as 3rd declension adjectives',
      'Use participial phrases to compress relative clauses',
      'Recognize the ablative absolute construction',
      'Read participial phrases in Seneca describing the wise man and the prokopton',
    ],
    parts: [
      {
        heading: 'Part 1 — Latin’s Participle System',
        body: 'Latin has four participles: present active, perfect passive, future active, and future passive (gerundive). This session covers the first three; the gerundive gets its own treatment in Session 18.\n\nThe practical difference from English: Latin participles carry the full burden of subordinate clauses. Where English says “the man who was training,” Latin prefers the participle: vir exercitans. Where English says “having chosen virtue, he became wise,” Latin uses the perfect participle in an ablative absolute: virtute electa, sapiens factus est.',
      },
      {
        heading: 'Part 2 — Present Active Participle',
        body: 'Formed by adding -ns (gen. -ntis) to the present stem. It declines as a 3rd declension adjective (like the Greek -ων type). Key participles for Stoic texts: sapiens/sapientis (wise, the sage — also a noun, “the wise man”), vir exercitans (the man who is practicing), animus regens (the soul governing).',
        paradigms: [
          {
            title: 'Present Active Participle (amans)',
            headers: ['Case', 'Masc./Fem.', 'Neuter', 'Note'],
            rows: [
              ['Nom. sg.', 'amans', 'amans', 'same for m. and f.'],
              ['Gen. sg.', 'amantis', 'amantis', 'stem: amant-'],
              ['Dat. sg.', 'amanti', 'amanti', ''],
              ['Acc. sg.', 'amantem', 'amans', 'neuter acc. = nom.'],
              ['Abl. sg.', 'amante / amanti', 'amante / amanti', '-i in attributive use; -e in predicate/absolute'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Perfect Passive Participle and Ablative Absolute',
        body: 'The perfect passive participle (PPP) is the 4th principal part of the verb: amatus, -a, -um (having been loved). It declines as a 1st/2nd declension adjective. The ablative absolute is a participial construction where a noun + participle in the ablative case forms an independent clause, describing the circumstances of the main action.',
        paradigms: [
          {
            title: 'The Ablative Absolute',
            headers: ['Ablative Absolute', 'Translation + Note'],
            rows: [
              ['virtute electa, sapiens factus est.', 'With virtue having been chosen / Since virtue was chosen, he became wise.'],
              ['animo confirmato, timorem vicit.', 'With the soul having been strengthened / Once his soul was strengthened, he overcame fear.'],
              ['rebus compositis, ad philosophiam rediit.', 'With matters settled, he returned to philosophy.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Future Active Participle',
        body: 'The future active participle (FAP) is formed from the PPP stem + -urus, -a, -um. It describes intended or imminent action: moriturus (about to die), facturus (about to do), scripturus (about to write). It is often used with sum to form the active periphrastic conjugation.',
        paradigms: [
          {
            title: 'Future Active Participle',
            headers: ['Latin', 'Translation'],
            rows: [
              ['philosophaturus ad Forum venit.', 'He came to the Forum, about to philosophize.'],
              ['moriturus non timuisti.', 'You, about to die, did not fear. (addressing a Stoic)'],
              ['dicturus est multa de virtute.', 'He is about to say many things about virtue.'],
            ],
          },
        ],
        callout: {
          text: 'Seneca uses the future active participle to great effect in his discussions of death: moriturus — “about to die” — is not a threat but a philosophical frame. The man who remembers he is moriturus lives differently from the man who forgets.',
        },
      },
    ],
    exercises: [
      {
        number: '14.1',
        prompt: 'Form Participles — give the nominative singular masculine present active participle of: amo, moneo, duco, vivo',
        answer: 'amans, monens, ducens, vivens',
      },
      {
        number: '14.2',
        prompt: 'Ablative Absolute — translate the ablative absolutes: 1. animo confirmato, ad philosophiam rediit.  2. rebus compositis, sapiens quiescit.',
        answer: '1. With his soul strengthened / Once his soul was strengthened, he returned to philosophy. 2. With matters settled / Once matters are settled, the wise man rests.',
      },
      {
        number: '14.3',
        prompt: 'Future Active Participle — translate: moriturus non timuisti.',
        answer: 'Being about to die / Facing death, you did not fear.',
      },
      {
        number: '14.4',
        prompt: 'The Grammar of the Sage — Seneca calls the ideal philosopher a vir exercitans. Analyze the phrase grammatically and explain its philosophical significance.',
        answer: 'vir = nominative singular masculine (man). exercitans = present active participle of exercito/exerceo (training, practicing), nominative singular to agree with vir. Together: “the man who is practicing / the practicing man.” Philosophically, the present participle is significant: not vir exercitatus (the man who was trained — perfect), but vir exercitans (the man currently in the act of training). Stoic virtue is not a past acquisition but an active, ongoing exercise of reason. The present participle captures askēsis as a mode of being in the present, not a status conferred by past achievement.',
      },
    ],
    quiz: [
      { question: 'What is the present active participle of amo?', options: ['amatus', 'amans (gen. amantis)', 'amaturus', 'amavi'], correct: 1 },
      { question: 'How does the present active participle decline?', options: ['As a 1st declension noun', 'As a 3rd declension adjective (gen. in -ntis)', 'It does not decline', 'As a 2nd declension noun'], correct: 1 },
      { question: 'What is the perfect passive participle of amo?', options: ['amans', 'amaturus', 'amatus, -a, -um', 'amandus'], correct: 2 },
      { question: 'What is an ablative absolute?', options: ['A noun + participle in the ablative, grammatically independent from the main clause, expressing circumstance', 'A verb in the passive voice', 'A purpose clause', 'A superlative adjective'], correct: 0 },
      { question: 'What is the future active participle of facio?', options: ['factus', 'faciens', 'facturus, -a, -um', 'faciendus'], correct: 2 },
      { question: 'Translate: virtute electa, sapiens factus est.', options: ['He chose virtue and was wise.', 'With virtue chosen / Since virtue was chosen, he became wise.', 'Virtue makes the wise man.', 'He will choose virtue to become wise.'], correct: 1 },
      { question: 'What does sapiens mean as a noun?', options: ['The act of knowing', 'The wise man — the Stoic sage', 'Wisdom as an abstract quality', 'A wise saying'], correct: 1 },
      { question: 'Translate: moriturus non timuisti.', options: ['He was about to die and feared.', 'About to die / Facing death, you did not fear.', 'You died without fear.', 'May you die without fear.'], correct: 1 },
      { question: 'Why is -i the ablative singular of present participles in attributive use?', options: ['It is an error', '3rd declension adjectives use -i in the ablative when attributive; -e when predicate or in an ablative absolute', 'All ablatives end in -i', 'The -i marks the plural'], correct: 1 },
      { question: 'What does exercitans grammatically describe in vir exercitans?', options: ['A perfect passive participle — “the man who was trained”', 'A present active participle modifying vir — “the man who is training/practicing”', 'A future participle — “about to train”', 'A noun meaning “exercise”'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'vivere', pronunciation: 'WI-we-re', english: 'to live (3rd conj.)' },
      { latin: 'sapiens, sapientis', pronunciation: 'SA-pi-ens', english: 'wise; the wise man, the sage' },
      { latin: 'facere', pronunciation: 'FA-ke-re', english: 'to do, to make (3rd conj.)' },
      { latin: 'mori', pronunciation: 'MO-ri', english: 'to die (3rd conj. deponent)' },
      { latin: 'componere', pronunciation: 'kom-PO-ne-re', english: 'to settle, to arrange (3rd conj.)' },
      { latin: 'vir, viri', pronunciation: 'wir', english: 'man (m., 2nd decl.)' },
    ],
  },

  // ── SESSION 15 ─────────────────────────────────────────────────────────────
  {
    id: 15,
    title: 'Epistulae Morales I.1 — Full Parse',
    subtitle: 'The milestone of Unit II — complete grammatical analysis of Seneca’s first letter',
    targetText: SENECA_I_1,
    isMilestone: true,
    objectives: [
      'Parse every word of Epistula I.1 with full grammatical identification',
      'Produce a working translation from memory',
      'Explain each grammatical choice in context',
      'Connect Seneca’s letter to the Stoic framework built in Sessions 1–14',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Ita fac, mi Lucili: vindica te tibi, et tempus quod adhuc aut auferebatur aut subripiebatur aut excidebat, collige et serva. Persuade tibi hoc sic esse ut scribo: quaedam tempora eripiuntur nobis, quaedam subducuntur, quaedam effluunt. Turpissima tamen est iactura quae per neglegentiam fit. Et si volueris attendere, magna pars vitae elabitur male agentibus, magna otio, magna aliis occupati. Dabit tibi hoc ratio.\n\nTranslation target: “Do this, my Lucilius: claim yourself for yourself, and gather and save that time which was until now either being taken from you, or stolen, or slipping away. Persuade yourself that it is so as I write: some time is snatched from us, some is stolen, some flows away. But the most shameful loss is that which comes about through negligence. And if you are willing to pay attention, a large part of life slips away while we act badly, a large part in idleness, a large part while occupied with other things. This reason will give you.”',
      },
      {
        heading: 'Part 2 — Parse: Sentence 1',
        body: 'The opening sentence is a command followed by a relative clause describing the time to be reclaimed.',
        paradigms: [
          {
            title: 'Sentence 1 — Parse',
            headers: ['Word', 'Form', 'Parse', 'Role'],
            rows: [
              ['Ita fac', 'fac', 'imperative 2nd sg. of facio', 'command: “do this”'],
              ['mi Lucili', 'mi, Lucili', 'vocative (mi = meus contracted), proper noun vocative', 'address to recipient'],
              ['vindica', 'vindica', 'imperative 2nd sg. of vindico (1st conj.)', 'command: “claim, rescue”'],
              ['te tibi', 'te (acc.), tibi (dat.)', 'reflexive acc. + dat. of interest', '“yourself for yourself” — reflexive intensification'],
              ['quod… auferebatur', 'auferebatur', 'imperfect passive 3rd sg. of aufero', 'ongoing past action: “was being taken”'],
              ['aut subripiebatur', 'subripiebatur', 'imperfect passive 3rd sg. of subripio', 'parallel passive imperfect: “was being stolen”'],
              ['aut excidebat', 'excidebat', 'imperfect active 3rd sg. of excido', 'active — time itself slipping: “was slipping away”'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Parse: Central Distinctions',
        body: 'The central section gives Seneca’s taxonomy of how time is lost and names the vice that causes the worst loss.',
        paradigms: [
          {
            title: 'Central Distinctions — Parse',
            headers: ['Word', 'Form', 'Parse', 'Seneca’s Meaning'],
            rows: [
              ['eripiuntur', 'pres. pass. 3rd pl.', 'eripio — to snatch away', 'time violently stolen — external force'],
              ['subducuntur', 'pres. pass. 3rd pl.', 'subduco — to remove secretly', 'time quietly taken — subtle theft'],
              ['effluunt', 'pres. act. 3rd pl.', 'effluo — to flow out', 'time just drifting away — our own inattention'],
              ['iactura', 'nom. sg. fem.', '3rd decl. from iacio — loss, throwing away', 'the loss that results from neglegentia'],
              ['neglegentiam', 'acc. sg. fem.', '1st decl. — negligence, inattention', 'the vice Seneca diagnoses as worst'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — The Three Kinds of Time-Loss and Stoic Analysis',
        body: 'Seneca gives a taxonomy of how time is lost: eripiuntur (snatched — external force), subducuntur (stolen — subtle external appropriation), effluunt (flow away — our own inattention). The philosophical weight falls on the third: the turpissima (most shameful) loss is per neglegentiam — through our own failure of attention.\n\nThis taxonomy mirrors the Stoic analysis of obstacles: some come from outside (force majeure), some are social (others’ demands), but the worst come from within — from our failure to govern our own prohairesis. Neglegentia in time is the temporal equivalent of failure to examine impressions: we simply do not pay attention, and time flows away ungoverned.\n\nThe grammatical point: note that eripiuntur and subducuntur are passive (time is the recipient of action), while effluunt is active (time actively flows — we are neither subject nor object, just absent). Seneca’s grammar enacts his philosophy.',
      },
    ],
    exercises: [
      {
        number: '15.1',
        prompt: 'Unaided Translation — without notes: translate the opening of Epistula I.1 from memory.',
        answer: 'Do this, my Lucilius: claim yourself for yourself, and gather and save that time which was until now being taken from you, or stolen, or slipping away. Persuade yourself that it is so as I write: some time is snatched from us, some stolen, some flows away.',
      },
      {
        number: '15.2',
        prompt: 'Parse on Demand — parse fully: 1. auferebatur  2. eripiuntur  3. neglegentiam  4. effluunt',
        answer: '1. Imperfect passive 3rd sg. of aufero — “was being taken away” (ongoing past). 2. Present passive 3rd pl. of eripio — “are being snatched” (current process). 3. Accusative singular feminine of neglegentia (1st decl.) — “negligence,” object of per. 4. Present active 3rd pl. of effluo — “they flow away” (active — time itself as agent).',
      },
      {
        number: '15.3',
        prompt: 'Grammatical Philosophy — why does Seneca use the active voice (effluunt) for the third kind of time-loss but the passive voice (eripiuntur, subducuntur) for the first two?',
        answer: 'The passive voice places the agent of action outside the subject — time is acted upon by external forces (stolen, snatched). The active voice (effluunt) removes any external agent — time itself flows away, and we are neither subject nor object. We are simply absent. This grammatical distinction enacts Seneca’s philosophical point: external theft of time can be resisted or compensated; the flow of time from our own inattention is the worst because we are not even the subject of a passive sentence — we are simply not there. The most shameful loss is the one where there is no thief, no force, just our own ungoverned attention.',
      },
      {
        number: '15.4',
        prompt: 'Connection to Encheiridion §1 — connect Epistula I.1’s theme to Epictetus’s partition in Encheiridion §1.',
        answer: 'Seneca’s taxonomy of time-loss maps onto the Stoic partition: time snatched by external force (ouk eph’ hēmin — not up to us), time stolen by social demands (borderline — we could refuse but often do not), time that flows away from inattention (this is the eph’ hēmin category — our prohairesis governs our attention). The turpissima iactura is the one we could have prevented by exercising our eph’ hēmin faculty — attention, prosochē. Seneca’s letter is an application of Epictetus’s §1 to the specific domain of time-use: gather what is up to you (your attention and governance of time), let go of what is not.',
      },
    ],
    quiz: [
      { question: 'What does vindica te tibi mean?', options: ['“Claim yourself for yourself” — imperative of vindico + reflexive accusative and dative', '“Defend Lucilius”', '“Give yourself time”', '“Live for others”'], correct: 0 },
      { question: 'What are the three verbs describing how time is lost?', options: ['amo, moneo, duco', 'eripiuntur (snatched), subducuntur (stolen), effluunt (flow away)', 'vivo, lego, scribo', 'sum, fero, eo'], correct: 1 },
      { question: 'What does turpissima mean?', options: ['somewhat shameful', 'most shameful (superlative of turpis)', 'not shameful', 'shameful (positive degree)'], correct: 1 },
      { question: 'What is iactura?', options: ['gain, profit', 'a kind of letter', 'loss — the waste of time through negligence', 'attention'], correct: 2 },
      { question: 'Parse auferebatur.', options: ['Present active 3rd sg. of aufero', 'Imperfect passive 3rd singular of aufero — “was being taken away”', 'Perfect passive of aufero', 'Future of aufero'], correct: 1 },
      { question: 'Why is effluunt active while eripiuntur is passive?', options: ['effluunt is simply irregular', 'eripiuntur: time acted upon by external force; effluunt: time simply flows away — no external agent, we are absent', 'They mean the same thing', 'effluunt is passive too'], correct: 1 },
      { question: 'What is the grammatical form of mi Lucili?', options: ['Nominative', 'Vocative — mi (dear) + Lucili, vocative of Lucilius', 'Genitive', 'Ablative'], correct: 1 },
      { question: 'What vice does Seneca identify as the source of the worst time-loss?', options: ['avaritia (greed)', 'neglegentia — negligence, inattention', 'ira (anger)', 'superbia (pride)'], correct: 1 },
      { question: 'What is the Stoic parallel to Seneca’s call for time-governance?', options: ['amor fati', 'prosochē — attention to impressions and judgments; governing what is eph’ hēmin', 'apatheia', 'oikeiōsis'], correct: 1 },
      { question: 'Translate: magna pars vitae elabitur male agentibus.', options: ['A large part of life is praised by good men.', 'A large part of life slips away for those acting badly / while we act badly.', 'Life acts badly in great part.', 'A great part of life must be lived well.'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'auferre', pronunciation: 'au-FER-re', english: 'to take away, to carry off (irregular)' },
      { latin: 'eripere', pronunciation: 'e-RI-pe-re', english: 'to snatch away (3rd conj.)' },
      { latin: 'subducere', pronunciation: 'sub-DU-ke-re', english: 'to withdraw, to remove secretly (3rd conj.)' },
      { latin: 'effluere', pronunciation: 'ef-FLU-e-re', english: 'to flow away, to slip away (3rd conj.)' },
      { latin: 'differre', pronunciation: 'dif-FER-re', english: 'to put off, to defer (irregular)' },
      { latin: 'agere', pronunciation: 'A-ge-re', english: 'to do, to drive, to act (3rd conj.)' },
    ],
  },

  // ── SESSION 16 ─────────────────────────────────────────────────────────────
  {
    id: 16,
    title: 'Deponent Verbs and Semi-Deponents',
    subtitle: 'Passive in form, active in meaning — and the verbs Seneca most loves',
    targetText: SENECA_I_1,
    objectives: [
      'Recognize deponent verbs from their principal parts',
      'Conjugate common deponents in present, imperfect, and perfect',
      'Identify semi-deponents and their active/passive split',
      'Master the core Stoic deponents: loquor, sequor, morior, patior, utor',
    ],
    parts: [
      {
        heading: 'Part 1 — What Deponent Means',
        body: 'A deponent verb has laid aside (deposuit) its active forms — hence deponens. Its forms look passive but mean active. You cannot derive an active form from a deponent; it simply exists only in passive morphology with active meaning. This is not irregular behavior — it is a lexical property. Many of the most important philosophical verbs in Latin are deponents.\n\nRecognition rule: a deponent’s dictionary entry shows passive forms. Instead of amo, amare, amavi, amatum, you see loquor, loqui, locutus sum — passive infinitive, no active principal parts. When you see a verb whose dictionary entry ends in -or and whose infinitive ends in -i or -ari, it is a deponent.',
      },
      {
        heading: 'Part 2 — Core Stoic Deponents',
        body: 'These deponents recur constantly in Seneca and Epictetus. Each describes a mode of being — speaking, following, dying, suffering, using — rather than a transitive act on an external object.',
        paradigms: [
          {
            title: 'Core Stoic Deponents',
            headers: ['Verb', 'Meaning', '3rd sg. Pres.', 'Stoic Use'],
            rows: [
              ['loquor, loqui', 'to speak, say', 'loquitur', 'Sapiens de virtute loquitur.'],
              ['sequor, sequi', 'to follow', 'sequitur', 'Ratio naturam sequitur.'],
              ['morior, mori', 'to die', 'moritur', 'Omnes morimur. moriturus es.'],
              ['patior, pati', 'to suffer, allow', 'patitur', 'Sapiens nihil invitus patitur.'],
              ['utor, uti', 'to use (+ abl.)', 'utitur', 'Virtute uti debemus.'],
              ['proficiscor, proficisci', 'to set out, depart', 'proficiscitur', 'Ad philosophiam proficiscitur.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Conjugating Deponents',
        body: 'Deponents follow the same passive conjugation patterns you learned in Session 11. The only difference is meaning — passive forms, active translation.',
        paradigms: [
          {
            title: 'Conjugation of loquor',
            headers: ['Person', 'Present', 'Imperfect', 'Perfect', 'Translation'],
            rows: [
              ['1st sg.', 'loquor', 'loquebar', 'locutus sum', 'I speak / I was speaking / I spoke'],
              ['2nd sg.', 'loqueris', 'loquebaris', 'locutus es', 'you speak / were speaking / spoke'],
              ['3rd sg.', 'loquitur', 'loquebatur', 'locutus est', 'he speaks / was speaking / spoke'],
              ['3rd pl.', 'loquuntur', 'loquebantur', 'locuti sunt', 'they speak / were speaking / spoke'],
            ],
          },
        ],
        callout: {
          text: 'The perfect of deponents uses the perfect passive participle (4th principal part) + sum/es/est. But the meaning is active: locutus est = “he spoke,” not “he was spoken.”',
        },
      },
      {
        heading: 'Part 4 — Semi-Deponents',
        body: 'Semi-deponents have active forms in the present system but passive forms (with active meaning) in the perfect system.',
        paradigms: [
          {
            title: 'Semi-Deponents',
            headers: ['Verb', 'Present (active)', 'Perfect (deponent)'],
            rows: [
              ['audeo, -ere', 'I dare (active)', 'ausus sum (I dared — passive form, active meaning)'],
              ['soleo, -ere', 'I am accustomed (active)', 'solitus sum (I was accustomed)'],
              ['fido, -ere', 'I trust (active)', 'fisus sum (I trusted)'],
            ],
          },
        ],
        callout: {
          text: 'soleo is especially important in Seneca: solebam cotidie aliquid ex Epicuro legere — “I used to read something from Epicurus every day.” The combination of semi-deponent perfect and imperfect captures habitual past practice perfectly.',
        },
      },
    ],
    exercises: [
      {
        number: '16.1',
        prompt: 'Conjugate loquor — give all six persons of loquor in the present tense.',
        answer: 'loquor, loqueris, loquitur, loquimur, loquimini, loquuntur',
      },
      {
        number: '16.2',
        prompt: 'Translate: 1. sapiens de virtute loquitur.  2. ratio naturam sequitur.  3. mortem non timebo — moriturus sum.  4. virtute uti debemus.',
        answer: '1. The wise man speaks about virtue. 2. Reason follows nature. 3. I will not fear death — I am about to die. (future active participle as predicate) 4. We ought to use virtue.',
      },
      {
        number: '16.3',
        prompt: 'Identify Deponent or Regular Passive: 1. loquitur  2. laudatur  3. moriuntur  4. amantur  5. patimur',
        answer: '1. Deponent — loquitur = “he speaks” (active meaning). 2. Regular passive — laudatur = “he is praised.” 3. Deponent — moriuntur = “they die” (active meaning). 4. Regular passive — amantur = “they are loved.” 5. Deponent — patimur = “we suffer” (active meaning).',
      },
      {
        number: '16.4',
        prompt: 'patior and Stoic Suffering — explain the Stoic significance of the verb patior, pati: what does it mean to suffer, and why does Seneca say sapiens nihil invitus patitur?',
        answer: 'patior means to suffer, to undergo, to allow or permit. It is a deponent — passive in form, but describing an experience of the subject. Seneca’s sapiens nihil invitus patitur — “the wise man suffers nothing unwillingly” — makes a Stoic philosophical point using the grammar: patior acknowledges that things happen to the sage (external events, bodily pain, loss). The sage does not deny these events. But invitus (unwillingly, against one’s will) is what the sage eliminates. By aligning his will (voluntas) with what happens, the sage removes the involuntary quality from every experience. Grammar: nihil (accusative of nothing, direct object of patitur); invitus (predicate adjective modifying the subject of patitur, in the nominative — “the sage, being willing/not-unwilling, suffers nothing”).',
      },
    ],
    quiz: [
      { question: 'What is a deponent verb?', options: ['A verb with only active forms', 'A verb passive in form but active in meaning, with no active forms', 'A verb with no perfect tense', 'A verb used only in commands'], correct: 1 },
      { question: 'How do you recognize a deponent in the dictionary?', options: ['Its entry ends in -o', 'Its entry ends in -or and its infinitive in -i or -ari (e.g., loquor, loqui)', 'It has four active principal parts', 'It begins with a prefix'], correct: 1 },
      { question: 'What is the present 3rd singular of sequor?', options: ['sequit', 'sequitur', 'sequetur', 'secutus est'], correct: 1 },
      { question: 'What is the perfect of loquor?', options: ['loquivi', 'locutus/a sum', 'loquebar', 'loquebatur'], correct: 1 },
      { question: 'What is a semi-deponent?', options: ['A verb passive throughout', 'A verb with active forms in the present system but passive forms (active meaning) in the perfect', 'A verb with no infinitive', 'A half-conjugated verb'], correct: 1 },
      { question: 'Give an example of a semi-deponent.', options: ['amo (present) / amavi', 'audeo (present active) / ausus sum (perfect — “I dared”)', 'duco / duxi', 'sum / fui'], correct: 1 },
      { question: 'Translate: ratio naturam sequitur.', options: ['Nature follows reason.', 'Reason follows nature.', 'Reason is followed by nature.', 'Let reason follow nature.'], correct: 1 },
      { question: 'What case does utor take as its object?', options: ['The accusative', 'The genitive', 'The ablative case', 'The dative'], correct: 2 },
      { question: 'Translate: sapiens nihil invitus patitur.', options: ['The wise man suffers nothing unwillingly.', 'The wise man suffers everything.', 'Nothing is unwillingly wise.', 'The wise man is unwilling to suffer.'], correct: 0 },
      { question: 'Why are many key Stoic verbs deponents?', options: ['It is a historical accident with no meaning', 'Deponents often describe internal experience and self-directed action (to speak, follow, die, experience) — naturally middle/reflexive in sense', 'The Stoics invented the deponent verb', 'Deponents are easier to conjugate'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'loqui', pronunciation: 'LO-kwi', english: 'to speak, to say (3rd conj. deponent)' },
      { latin: 'sequi', pronunciation: 'SE-kwi', english: 'to follow (3rd conj. deponent)' },
      { latin: 'mori', pronunciation: 'MO-ri', english: 'to die (3rd conj. deponent)' },
      { latin: 'pati', pronunciation: 'PA-ti', english: 'to suffer, to allow (3rd conj. deponent)' },
      { latin: 'uti', pronunciation: 'U-ti', english: 'to use (+ ablative; 3rd conj. deponent)' },
      { latin: 'proficisci', pronunciation: 'pro-fi-KIS-ki', english: 'to set out, to depart (3rd conj. deponent)' },
    ],
  },

  // ── SESSION 17 ─────────────────────────────────────────────────────────────
  {
    id: 17,
    title: 'Indirect Statement — Accusative and Infinitive',
    subtitle: 'Reporting thought and speech — the construction Stoic philosophers use most',
    targetText: SENECA_I_1,
    objectives: [
      'Form indirect statement with accusative + infinitive after verba sentiendi et dicendi',
      'Match the tense of the infinitive to the time of the reported statement (present = same time, perfect = earlier, future = later)',
      'Use reflexive pronouns correctly in indirect statement',
      'Read indirect statement in Seneca’s philosophical arguments',
    ],
    parts: [
      {
        heading: 'Part 1 — Verba Dicendi and Sentiendi',
        body: 'Latin uses the accusative + infinitive construction (ACI) for indirect statement after verbs of saying, thinking, knowing, perceiving, and showing. The accusative is the subject of the embedded clause; the infinitive carries the predicate. The tense of the infinitive is relative to the main verb, not absolute.\n\nKey verbs taking the ACI: dico (say), puto/arbitror/censeo (think), scio/cognosco (know), sentio (perceive), video (see — when it means “perceive”), ostendo (show), nego (deny).',
      },
      {
        heading: 'Part 2 — Tense of the Infinitive',
        body: 'The tense of the infinitive in an ACI is relative: it locates the reported action before, at, or after the time of the main verb.',
        paradigms: [
          {
            title: 'Relative Tense of the Infinitive',
            headers: ['Infinitive tense', 'Meaning relative to main verb', 'Example'],
            rows: [
              ['Present infinitive', 'Same time as the main verb', 'dicit virtutem esse bonum — “he says virtue is good”'],
              ['Perfect infinitive', 'Earlier than the main verb', 'dicit virtutem fuisse bonum — “he says virtue was good (earlier)”'],
              ['Future infinitive', 'Later than the main verb', 'dicit virtutem futuram esse — “he says virtue will be good”'],
            ],
          },
        ],
        callout: {
          text: 'The future infinitive of esse is fore or futurum esse. For other verbs: future active participle + esse — facturum esse (to be about to do), victurum esse (to be about to conquer).',
        },
      },
      {
        heading: 'Part 3 — Reflexive Pronouns in the ACI',
        body: 'In indirect statement, se (himself/herself/themselves) refers back to the subject of the main verb, while eum/eam/eos refers to a different person. This distinction is critical and frequently tested.',
        paradigms: [
          {
            title: 'se vs. eum in Indirect Statement',
            headers: ['Latin', 'Translation + Note'],
            rows: [
              ['dicit se virtutem amare.', 'He says that he himself loves virtue. (se refers to the subject of dicit)'],
              ['dicit eum virtutem amare.', 'He says that he (= someone else) loves virtue. (eum = a different person)'],
              ['Seneca scribit se cotidie philosophari.', 'Seneca writes that he himself philosophizes daily.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Indirect Statement in Stoic Philosophy',
        body: 'Stoic philosophical argument constantly uses the ACI to report doctrines, characterize positions, and attribute beliefs. When Seneca says Stoici putant virtutem solam esse bonum — “the Stoics think that virtue alone is good” — the ACI is the grammatical vehicle for reporting the central Stoic thesis.\n\nThe indirect statement also governs how Stoics report their own judgments. When a Stoic says iudico hoc malum esse — “I judge this to be evil” — the ACI is the form of the false judgment that askēsis is supposed to correct. Learning to identify, analyze, and withhold assent from ACI constructions in one’s own thinking is the grammar of the prosochē practice.',
      },
    ],
    exercises: [
      {
        number: '17.1',
        prompt: 'Translate ACI: 1. Stoici putant virtutem solam esse bonum.  2. Seneca scribit se cotidie philosophari.  3. dicit eum mortem non timuisse.',
        answer: '1. The Stoics think that virtue alone is good. 2. Seneca writes that he himself philosophizes daily. 3. He says that he (= another person) did not fear death.',
      },
      {
        number: '17.2',
        prompt: 'Construct ACI — express in Latin using the ACI: “I know that virtue is the only good.”',
        answer: 'scio virtutem solum esse bonum. (or: scio virtutem solam bonam esse)',
      },
      {
        number: '17.3',
        prompt: 'se vs. eum — translate and explain: Seneca dicit se liberum esse. vs. Seneca dicit eum liberum esse.',
        answer: 'Seneca dicit se liberum esse — Seneca says that he himself is free. (se = Seneca, reflexive) Seneca dicit eum liberum esse — Seneca says that he (= someone else, not Seneca) is free. (eum = a different person)',
      },
      {
        number: '17.4',
        prompt: 'ACI and Stoic Assent — explain how the ACI connects to the Stoic theory of assent (synkatathesis in Greek, assensio in Latin).',
        answer: 'The ACI is the grammatical form of a proposition offered for assent. In Stoic epistemology, when an impression (phantasia/visum) arises, it presents the mind with a content — effectively an accusative + infinitive: “this thing to be good,” “that person to be an enemy.” The mind can give assent (synkatathesis/assensio) to this proposition, producing judgment (ὑπόληψις), or withhold assent. The ACI is precisely the structure of a kataleptic or acataleptic impression: an accusative subject (this, that) + an infinitive predicate (to be X). Stoic practice is partly the practice of recognizing these ACI structures in one’s own mind and choosing whether to assent — making the ACI not just a grammatical exercise but the form of every moment of philosophical attention.',
      },
    ],
    quiz: [
      { question: 'What is the ACI construction?', options: ['Ablative + participle', 'Accusative + infinitive — accusative subject, infinitive predicate, after verbs of saying/thinking', 'Nominative + subjunctive', 'Dative + gerund'], correct: 1 },
      { question: 'What does a present infinitive express in the ACI?', options: ['Action earlier than the main verb', 'Action simultaneous with the main verb', 'Action later than the main verb', 'A command'], correct: 1 },
      { question: 'What does a perfect infinitive express in the ACI?', options: ['Action simultaneous with the main verb', 'Action later than the main verb', 'Action earlier than the main verb', 'A purpose'], correct: 2 },
      { question: 'Translate: dicit virtutem esse bonum.', options: ['Virtue says he is good.', 'He says that virtue is good.', 'He wishes virtue to be good.', 'Virtue is said by the good.'], correct: 1 },
      { question: 'What is the future infinitive of esse?', options: ['esse', 'futurum esse (or fore)', 'fuisse', 'erat'], correct: 1 },
      { question: 'What does se refer to in indirect statement?', options: ['A different person from the subject', 'The subject of the main verb (reflexive)', 'The object of the infinitive', 'No one in particular'], correct: 1 },
      { question: 'How does eum differ from se in indirect statement?', options: ['eum and se are identical', 'eum refers to a different person from the subject of the main verb', 'eum is plural, se is singular', 'eum is nominative'], correct: 1 },
      { question: 'Translate: Stoici putant virtutem solam esse bonum.', options: ['The Stoics alone think virtue is good.', 'The Stoics think that virtue alone is good.', 'Virtue thinks the Stoics are good.', 'Only good Stoics think.'], correct: 1 },
      { question: 'Which group of verbs all take the ACI?', options: ['amo, moneo, rego, audio', 'dico, puto, scio, sentio', 'sum, possum, volo, eo', 'venio, facio, capio, ago'], correct: 1 },
      { question: 'How does the ACI relate to Stoic prosochē practice?', options: ['It has no connection to Stoic practice', 'Impressions present themselves as ACI-structured propositions (“this to be good/bad”); attention means recognizing and choosing whether to assent', 'The ACI is forbidden in Stoic texts', 'Only the sage may use the ACI'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'dicere', pronunciation: 'DI-ke-re', english: 'to say, to tell (3rd conj.)' },
      { latin: 'putare', pronunciation: 'pu-TA-re', english: 'to think, to suppose (1st conj.)' },
      { latin: 'scire', pronunciation: 'SKI-re', english: 'to know (4th conj.)' },
      { latin: 'sentire', pronunciation: 'sen-TI-re', english: 'to perceive, to feel (4th conj.)' },
      { latin: 'negare', pronunciation: 'ne-GA-re', english: 'to deny, to say no (1st conj.)' },
      { latin: 'arbitrari', pronunciation: 'ar-bi-TRA-ri', english: 'to think, to judge (1st conj. deponent)' },
    ],
  },

  // ── SESSION 18 ─────────────────────────────────────────────────────────────
  {
    id: 18,
    title: 'Gerund and Gerundive',
    subtitle: 'The grammar of obligation, purpose, and philosophical necessity',
    targetText: SENECA_I_1,
    objectives: [
      'Form the gerund as a verbal noun',
      'Form the gerundive as a verbal adjective of necessity',
      'Distinguish gerund from gerundive',
      'Use gerundive + esse for the passive periphrastic (obligation)',
      'Read gerundive constructions in Seneca expressing what must be done',
    ],
    parts: [
      {
        heading: 'Part 1 — The Gerund: Verbal Noun',
        body: 'The gerund is a verbal noun used in the oblique cases (genitive, dative, accusative with prepositions, ablative). It is formed by adding -nd- to the present stem + 2nd declension neuter endings: -ndi (gen.), -ndo (dat./abl.), -ndum (acc.). The nominative is replaced by the infinitive.',
        paradigms: [
          {
            title: 'The Gerund (amo)',
            headers: ['Case', 'Form (amo)', 'Translation'],
            rows: [
              ['Nominative (= inf.)', 'amare', 'to love / loving'],
              ['Genitive', 'amandi', 'of loving'],
              ['Dative', 'amando', 'for loving'],
              ['Accusative (w/ prep)', 'ad amandum', 'for the purpose of loving'],
              ['Ablative', 'amando', 'by loving / in loving'],
            ],
          },
        ],
        callout: {
          text: 'In Stoic texts: vivendi ars (the art of living — gen. gerund of vivo), ratio philosophandi (the method of philosophizing — gen. gerund of philosophor), ad discendum (for the purpose of learning — acc. gerund of disco).',
        },
      },
      {
        heading: 'Part 2 — The Gerundive: Verbal Adjective',
        body: 'The gerundive (future passive participle) looks like the gerund + adjective endings: -ndus, -nda, -ndum. It is an adjective meaning “needing to be done/loved/etc.” — it expresses necessity or obligation.',
        paradigms: [
          {
            title: 'The Gerundive',
            headers: ['Verb', 'Gerundive nom. sg.', 'Meaning'],
            rows: [
              ['amo', 'amandus, -a, -um', 'needing to be loved / to be loved'],
              ['sequor (dep.)', 'sequendus, -a, -um', 'needing to be followed / to be followed'],
              ['philosophor', 'philosophandum est', 'one must philosophize (impers.)'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Passive Periphrastic (Gerundive + esse)',
        body: 'When gerundive + sum appears, it expresses obligation — “must be done,” “ought to be done.” The person obligated goes in the dative (the dative of agent). This is the passive periphrastic, and it is Seneca’s favored construction for moral commands.',
        paradigms: [
          {
            title: 'The Passive Periphrastic',
            headers: ['Latin', 'Translation'],
            rows: [
              ['philosophandum est nobis.', 'We must philosophize. (lit. “it is to-be-philosophized by us”)'],
              ['virtus amanda est.', 'Virtue must be loved / ought to be loved.'],
              ['tempus colligendum est.', 'Time must be gathered / saved.'],
              ['mors non timenda est.', 'Death is not to be feared / must not be feared.'],
            ],
          },
        ],
        callout: {
          text: 'The last phrase — mors non timenda est — is one of Seneca’s most famous: “Death is not to be feared.” The gerundive here does the work of the Stoic analysis: death is not an evil (malum), therefore it does not fall into the category of things to be avoided (timendum).',
        },
      },
      {
        heading: 'Part 4 — Gerund vs. Gerundive: The Critical Distinction',
        body: 'The gerund is a neuter noun (invariable): ars vivendi — “the art of living.” The gerundive is an adjective agreeing with a noun: vita amanda — “a life to be loved.” When the gerund would take an accusative object, Latin prefers the gerundive construction: instead of ad colligendum tempus (gerund + object), Latin prefers ad tempus colligendum (gerundive agreeing with tempus).',
        paradigms: [
          {
            title: 'Preferred Gerundive Construction',
            headers: ['Preferred (gerundive)', 'Avoided (gerund + object)'],
            rows: [
              ['ad tempus colligendum', 'ad colligendum tempus'],
              ['ad virtutem amandam', 'ad amandum virtutem'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '18.1',
        prompt: 'Form the Gerund — give the genitive gerund of: vivo, philosophor, disco, sequor',
        answer: 'vivendi, philosophandi, discendi, sequendi',
      },
      {
        number: '18.2',
        prompt: 'Passive Periphrastic — translate: 1. philosophandum est nobis.  2. mors non timenda est.  3. virtus semper amanda est.',
        answer: '1. We must philosophize. 2. Death must not be feared / is not to be feared. 3. Virtue must always be loved.',
      },
      {
        number: '18.3',
        prompt: 'Gerund or Gerundive? Identify and explain: 1. ars vivendi  2. vita amanda  3. ad tempus colligendum',
        answer: '1. Gerund — vivendi is the genitive of the verbal noun. “The art of living.” 2. Gerundive — amanda agrees with vita (feminine). “A life to be loved.” 3. Gerundive — colligendum agrees with tempus (neuter acc.). “For the purpose of gathering time.”',
      },
      {
        number: '18.4',
        prompt: 'Seneca’s mors non timenda est — analyze the Stoic argument encoded in mors non timenda est. What philosophical work does the gerundive do?',
        answer: 'The gerundive -ndus conveys “ought to be / is to be” — it is the grammar of categorical obligation or prohibition. mors non timenda est = “death is not in the category of things to be feared.” This is not merely Seneca’s personal opinion but a categorical claim about death’s nature. The argument: for something to be timendum (to be feared), it must be malum (evil). Death is not malum — it is either indifferent (adiaphoron) or, for the Stoics, a natural event within the logos. Therefore death is non timenda — categorically not to be feared. The gerundive makes this an objective, class-level claim rather than a personal preference.',
      },
    ],
    quiz: [
      { question: 'What is the gerund?', options: ['A verbal adjective of necessity', 'A verbal noun used in oblique cases, formed by adding -nd- + 2nd decl. neuter endings to the present stem', 'A passive participle', 'An irregular verb'], correct: 1 },
      { question: 'What is the gerundive?', options: ['A verbal noun', 'A verbal adjective of necessity/obligation, formed like the gerund but with full adjectival endings (-ndus, -nda, -ndum)', 'A perfect tense form', 'A type of infinitive'], correct: 1 },
      { question: 'What construction uses gerundive + esse?', options: ['The active periphrastic', 'The passive periphrastic — expressing obligation (“must be done”)', 'The ablative absolute', 'Indirect statement'], correct: 1 },
      { question: 'Where does the agent of obligation go in a passive periphrastic?', options: ['In the accusative', 'In the ablative with a/ab', 'In the dative (the dative of agent)', 'In the genitive'], correct: 2 },
      { question: 'Translate: philosophandum est nobis.', options: ['We were philosophizing.', 'We must philosophize.', 'Let us philosophize!', 'We can philosophize.'], correct: 1 },
      { question: 'What is ars vivendi?', options: ['The life of art', 'The art of living — genitive gerund of vivo modifying ars', 'A life that must be lived', 'Living artfully'], correct: 1 },
      { question: 'Translate: mors non timenda est.', options: ['Death feared nothing.', 'Death must not be feared / is not to be feared.', 'Death is feared by all.', 'Let death be feared.'], correct: 1 },
      { question: 'When does Latin prefer the gerundive construction over the gerund with an object?', options: ['Always', 'Never', 'When the gerund would take an accusative object — Latin prefers gerundive + noun in the same case', 'Only in poetry'], correct: 2 },
      { question: 'What is the genitive gerund of philosophor?', options: ['philosophare', 'philosophandi', 'philosophatus', 'philosophando'], correct: 1 },
      { question: 'What Stoic argument does mors non timenda est encode grammatically?', options: ['It is only Seneca’s personal opinion', 'The gerundive makes a categorical claim: only evils (mala) are to be feared; death is not malum; therefore death is non timenda', 'It commands one to fear death', 'It has no philosophical content'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'vivendi', pronunciation: 'wi-WEN-di', english: 'of living (gen. gerund of vivo)' },
      { latin: 'timere', pronunciation: 'ti-ME-re', english: 'to fear (2nd conj.)' },
      { latin: 'ars, artis', pronunciation: 'ars', english: 'art, skill (f., 3rd decl.)' },
      { latin: 'mors, mortis', pronunciation: 'mors', english: 'death (f., 3rd decl.)' },
      { latin: 'amandus, -a, -um', pronunciation: 'a-MAN-dus', english: 'needing to be loved (gerundive of amo)' },
      { latin: 'oportet', pronunciation: 'o-POR-tet', english: 'it is necessary, one ought (impersonal)' },
    ],
  },

  // ── SESSION 19 ─────────────────────────────────────────────────────────────
  {
    id: 19,
    title: 'Subjunctive Mood II — Perfect, Pluperfect, and Result Clauses',
    subtitle: 'Completing the subjunctive system — consequence and completed hypothetical action',
    targetText: SENECA_I_1,
    objectives: [
      'Form the perfect and pluperfect subjunctive active and passive',
      'Use the subjunctive in result clauses (ut/ita ut + subj.)',
      'Distinguish purpose from result clauses',
      'Recognize the subjunctive in cum clauses',
      'Read complex subjunctive constructions in Seneca’s philosophical arguments',
    ],
    parts: [
      {
        heading: 'Part 1 — Perfect and Pluperfect Subjunctive Active',
        body: 'The perfect subjunctive active is formed from the perfect active stem + -erim endings (erim, eris, erit, erimus, eritis, erint). The pluperfect subjunctive active uses the perfect stem + -issem endings (issem, isses, isset, issemus, issetis, issent).',
        paradigms: [
          {
            title: 'Perfect and Pluperfect Subjunctive',
            headers: ['Person', 'Perfect Subj.', 'Pluperfect Subj.', 'Perf. of sum subj.', 'Pluperf. of sum subj.'],
            rows: [
              ['1st sg.', 'amaverim', 'amavissem', 'fuerim', 'fuissem'],
              ['2nd sg.', 'amaveris', 'amavisses', 'fueris', 'fuisses'],
              ['3rd sg.', 'amaverit', 'amavisset', 'fuerit', 'fuisset'],
              ['3rd pl.', 'amaverint', 'amavissent', 'fuerint', 'fuissent'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Result Clauses',
        body: 'Result clauses (consecutive clauses) describe the actual consequence of the main action. They use ut (positive) or ut non (negative) + subjunctive, typically signaled by an anticipatory word in the main clause: tam (so), ita (so), tantus (so great), talis (such).',
        paradigms: [
          {
            title: 'Result Clauses',
            headers: ['Latin', 'Translation'],
            rows: [
              ['ita philosophatur ut nemo sapientior sit.', 'He philosophizes so (in such a way) that no one is wiser.'],
              ['tam sapienter vixit ut omnes eum laudarent.', 'He lived so wisely that everyone praised him.'],
              ['tanta erat virtus eius ut vitia vinceret.', 'So great was his virtue that it overcame vices.'],
            ],
          },
        ],
        callout: {
          text: 'Distinguish purpose from result: purpose uses the subjunctive because the goal is not yet achieved; result uses the subjunctive but typically describes something that actually happened. Purpose: ita facit ut discat (he acts so that he may learn — goal). Result: ita fecit ut disceret (he acted in such a way that he learned — actual consequence).',
        },
      },
      {
        heading: 'Part 3 — cum Clauses',
        body: 'The conjunction cum (when/since/although) takes the subjunctive in two main constructions: (1) temporal cum with imperfect or pluperfect subjunctive in narrative describing circumstances; (2) causal/concessive cum meaning “since” or “although” + subjunctive.',
        paradigms: [
          {
            title: 'cum Clauses',
            headers: ['Type', 'Example'],
            rows: [
              ['Temporal (circumstantial)', 'cum haec scriberem, philosophabar. — When/while I was writing this, I was philosophizing.'],
              ['Causal', 'cum haec sciret, tamen timebat. — Since/although he knew this, he still feared.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — The Full Subjunctive System in Philosophical Prose',
        body: 'Seneca’s philosophical prose is dense with subjunctives of all types. In a single paragraph he may use purpose, result, cum-clauses, indirect questions, and conditions. The key to reading is identifying the introductory word: ut + subj. after tam/ita = result; ut + subj. expressing a goal = purpose; cum + subj. = temporal/causal/concessive; si + subj. = condition (Sessions to come).\n\nBy the end of Unit II, you have the full Latin subjunctive system. Unit III will apply it to sustained prose reading in Epistulae I.4 and selected passages from Marcus Aurelius’s Meditations in Latin translation.',
      },
    ],
    exercises: [
      {
        number: '19.1',
        prompt: 'Form Pluperfect Subjunctive — give the pluperfect subjunctive active 3rd singular of: amo, duco, sum',
        answer: 'amavisset, duxisset, fuisset',
      },
      {
        number: '19.2',
        prompt: 'Result or Purpose? 1. philosophatur ut sapiat.  2. ita philosophatur ut sapiat.  3. ita philosophatus est ut omnes mirarentur.',
        answer: '1. Purpose clause — “He philosophizes in order to be wise.” 2. Could be purpose or result; context needed. With ita anticipating: result — “He philosophizes in such a way that he is wise.” 3. Result — “He philosophized in such a way that everyone marveled.” (ita + pluperfect context)',
      },
      {
        number: '19.3',
        prompt: 'Translate cum Clause — translate: cum haec scriberet, cogitabat de morte.',
        answer: 'When/while he was writing this, he was thinking about death. (temporal cum + imperfect subjunctive)',
      },
      {
        number: '19.4',
        prompt: 'Synthesis: Seneca’s Argument Structure — identify and label all subjunctives in: philosophandum est nobis, cum vita brevis sit, ut ea bene utamur.',
        answer: 'sit — cum clause, present subjunctive (causal: “since life is short”). utamur — result/purpose clause with ut, present subjunctive (purpose: “so that we may use it well”). Reading: “We must philosophize, since life is short, so that we may use it well.”',
      },
    ],
    quiz: [
      { question: 'How is the perfect subjunctive active formed?', options: ['Present stem + -ba-', 'Perfect active stem + -erim endings (amaverim, amaveris, amaverit…)', 'Present infinitive + endings', 'Reduplication + the perfect stem'], correct: 1 },
      { question: 'How is the pluperfect subjunctive active formed?', options: ['Perfect stem + -issem endings (amavissem, amavisses, amavisset…)', 'Present stem + -ba-', 'Perfect stem + -erim', 'Present infinitive + endings'], correct: 0 },
      { question: 'What signals a result clause?', options: ['si + subjunctive', 'An anticipatory word (tam, ita, tantus, talis) in the main clause + ut + subjunctive', 'cum + indicative', 'A vocative'], correct: 1 },
      { question: 'How do you distinguish purpose from result?', options: ['They cannot be distinguished', 'Purpose: no anticipatory word, action aimed at; Result: anticipatory word (tam/ita), actual consequence', 'Purpose uses the indicative; result the subjunctive', 'Result always comes first'], correct: 1 },
      { question: 'Give the pluperfect subjunctive 3rd singular of sum.', options: ['erat', 'esset', 'fuisset', 'fuerit'], correct: 2 },
      { question: 'What does cum + imperfect subjunctive typically express in narrative?', options: ['A direct command', 'Temporal circumstances — “when/while he was doing X”', 'A future prediction', 'A purpose'], correct: 1 },
      { question: 'Translate: ita vixit ut omnes laudarent.', options: ['He lived in order that everyone might praise him.', 'He lived in such a way that everyone praised him.', 'Everyone praised the way he should live.', 'He will live and be praised.'], correct: 1 },
      { question: 'What is the negative of a result clause?', options: ['ne + subjunctive', 'ut non + subjunctive', 'non ut + indicative', 'There is no negative result clause'], correct: 1 },
      { question: 'Give the perfect subjunctive 3rd plural of amo.', options: ['amaverunt', 'amaverint', 'amavissent', 'amabant'], correct: 1 },
      { question: 'Translate: cum haec sciret, tamen timebat.', options: ['When he knew this, he feared.', 'Since/although he knew this, he still feared.', 'He feared because he did not know.', 'Knowing this, he will fear.'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'mirari', pronunciation: 'mi-RA-ri', english: 'to wonder, to marvel at (1st conj. deponent)' },
      { latin: 'cum', pronunciation: 'kum', english: 'when, since, although (+ subjunctive)' },
      { latin: 'tam', pronunciation: 'tam', english: 'so, so much (adv.)' },
      { latin: 'ita', pronunciation: 'I-ta', english: 'so, in such a way (adv.)' },
      { latin: 'vincere', pronunciation: 'WIN-ke-re', english: 'to conquer, to overcome (3rd conj.)' },
      { latin: 'cogitare', pronunciation: 'ko-gi-TA-re', english: 'to think, to ponder (1st conj.)' },
    ],
  },

  // ── SESSION 20 ─────────────────────────────────────────────────────────────
  {
    id: 20,
    title: 'Milestone II — Epistulae Morales I.4 Reading',
    subtitle: 'Sustained unseen prose — the Unit II culmination in Senecan philosophical Latin',
    targetText: SENECA_I_1,
    isMilestone: true,
    objectives: [
      'Read and parse a new Senecan passage (Ep. I.4) using all grammar from Units I and II',
      'Identify all constructions without scaffolding',
      'Connect the grammar to Stoic philosophical argument',
      'Prepare for Unit III: sustained reading in Seneca and the Meditations',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text of Epistula I.4',
        body: 'Dum differtur vita transcurrit. Omnia, Lucili, aliena sunt, tempus tantum nostrum est. In solam possessionem temporis natura nos posuit fugacis et labentis, ex qua expellit quicumque vult. Et tanta stultitia mortalium est ut, quae minima et vilissima sunt, certe recuperabilia, inputari sibi patiantur — nemo autem aestimat quantum temporis pereat, quasi nihil ibi abeat quod gratis constet aut parvi, cum sit omnium rerum pretiosissimum.\n\nTranslation target: “While we put it off, life passes. Everything, Lucilius, belongs to others; time alone is ours. Nature has placed us in possession of time alone — fleeting and slipping — from which anyone who wishes expels us. And the foolishness of mortals is so great that they allow things which are smallest and cheapest — and certainly recoverable — to be charged to their account, but no one estimates how much time is wasted, as if nothing passes there that costs nothing or little, when it is the most precious of all things.”',
      },
      {
        heading: 'Part 2 — Key Constructions: Annotated',
        body: 'Each of these phrases deploys a construction from Units I and II. Identify the construction first, then the parse.',
        paradigms: [
          {
            title: 'Key Constructions Annotated',
            headers: ['Phrase', 'Construction', 'Parse', 'Note'],
            rows: [
              ['Dum differtur', 'dum + indicative pres. passive', '3rd sg. pres. pass. of differo', '“while it is being put off” — dum + pres. ind. = simultaneous action'],
              ['vita transcurrit', 'intransitive active', '3rd sg. pres. act. of transcurro', '“life passes” — note active: life is the agent'],
              ['aliena sunt', 'predicate adj.', 'pl. of alienus, -a, -um', '“belonging to others” — alieni iuris, outside us'],
              ['tempus… nostrum est', 'predicate possessive', 'nostrum = gen. of nos as adj.', '“time is ours” — the only possession that is eph’ hēmin'],
              ['tanta stultitia est ut… patiantur', 'result clause', 'tantus anticipates ut; patiantur = pres. subj. of patior (deponent)', '“so great is the foolishness that they suffer/allow”'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Grammar Synthesis: What This Passage Uses',
        body: 'Epistula I.4 deploys every major construction from Units I and II:\n— Imperfect/present indicative for ongoing states (differtur, transcurrit, pereat)\n— Passive voice for things done to us (differtur, expellit… nos — active verb, passive situation)\n— Result clause with tanta… ut + subjunctive patiantur\n— Relative clause with quae and quicumque\n— Indirect question implied in aestimat quantum (quantum introduces an indirect question with the subjunctive pereat)\n— Gerundive phrase: recuperabilia (verbal adjective — “capable of being recovered”)\n\nThe sentence architecture: a short declarative (dum differtur, vita transcurrit), then slow elaboration of the central paradox (time is the only real possession yet most people ignore its loss), ending with the superlative cum sit omnium rerum pretiosissimum — the climactic declaration of time’s supreme value.',
      },
      {
        heading: 'Part 4 — Looking Forward: Unit III',
        body: 'You have completed Unit II. The grammar you now possess — all five cases, all four conjugations in active and passive voice, imperfect and perfect tenses, participles, infinitives, the full subjunctive in purpose/result/cum clauses, indirect statement, gerund and gerundive — is the complete toolkit for reading Senecan philosophical prose.\n\nUnit III (Sessions 21–30) will apply this toolkit to sustained reading: Epistulae Morales in sequence, selected passages from Marcus Aurelius’s Meditations, and the formal argument structures of Stoic philosophy as Cicero preserves them in De Finibus and De Natura Deorum. No new grammar — pure application.\n\nThe milestone of Session 30 is the same as every great Stoic goal: not the accumulation of more tools but the ability to use what you have. Omnia, Lucili, aliena sunt, tempus tantum nostrum est.',
      },
    ],
    exercises: [
      {
        number: '20.1',
        prompt: 'Unaided Translation — translate Epistula I.4 (the opening paragraph above) without notes.',
        answer: 'See the translation in Part 1. Key: “While we put it off, life passes. Everything belongs to others; time alone is ours. Nature has placed us in possession of time alone — fleeting and slipping — from which anyone who wishes expels us…”',
      },
      {
        number: '20.2',
        prompt: 'Parse on Demand — parse: 1. differtur  2. patiantur  3. pereat  4. pretiosissimum',
        answer: '1. Present passive 3rd sg. of differo — “is being put off/deferred.” 2. Present subjunctive 3rd pl. of patior (deponent) — in the result clause after tanta… ut. 3. Present subjunctive 3rd sg. of pereo — indirect question after quantum. 4. Superlative adjective, nominative/accusative neuter of pretiosus — “most precious.”',
      },
      {
        number: '20.3',
        prompt: 'Structural Analysis — identify the result clause in the passage and explain how you recognize it.',
        answer: 'Et tanta stultitia mortalium est ut… patiantur. Recognition: tanta (anticipatory adjective — “so great”) in the main clause signals the consequence coming in the subordinate clause. ut + subjunctive (patiantur, present subjunctive of patior) = result clause. Translation: “And the foolishness of mortals is so great that they allow…”',
      },
      {
        number: '20.4',
        prompt: 'Stoic Reflection: The Unit II Lesson — what single philosophical lesson do Seneca’s two letters (I.1 and I.4) together teach, and how does the Latin grammar embody it?',
        answer: 'Together, I.1 and I.4 teach one lesson: time is the only res that is truly nostra — truly eph’ hēmin — and we waste it through inattention (neglegentia) and deferral (differtur). I.1 gives the taxonomy of loss (snatched/stolen/flowing away) and the command: vindica te tibi. I.4 gives the philosophical foundation: omnia aliena sunt, tempus tantum nostrum est. The grammar embodies the philosophy throughout: passive voice for what happens to us (differtur, eripiuntur), active for what we do (transcurrit, colligamus), gerundive for what must be done (colligendum, philosophandum), and the present subjunctive in purpose clauses for what we aim at — the telos of governing our own prohairesis in time.',
      },
    ],
    quiz: [
      { question: 'Translate: Dum differtur vita transcurrit.', options: ['Life put off death.', 'While it is put off / while we defer, life passes.', 'Defer life and it will pass.', 'Life transcends time.'], correct: 1 },
      { question: 'What does aliena sunt mean?', options: ['They are alien creatures.', '“They belong to others” — literally “they are foreign/external things”', 'They are alone.', 'They are made of bronze.'], correct: 1 },
      { question: 'Parse patiantur in the result clause.', options: ['Present indicative 3rd pl. of patior', 'Present subjunctive 3rd pl. of patior (deponent) — they allow/suffer', 'Perfect of patior', 'Imperative of patior'], correct: 1 },
      { question: 'What is pretiosissimum?', options: ['A comparative adjective', 'The superlative of pretiosus — most precious, most valuable', 'A noun meaning “price”', 'A verb form'], correct: 1 },
      { question: 'What construction does quantum pereat use?', options: ['A purpose clause', 'An ablative absolute', 'An indirect question — quantum introduces a question with the subjunctive (pereat)', 'A result clause'], correct: 2 },
      { question: 'What is the central philosophical claim of I.4?', options: ['Virtue alone is good.', 'Omnia aliena sunt, tempus tantum nostrum est — everything belongs to others, time alone is ours', 'Death is not to be feared.', 'Reason follows nature.'], correct: 1 },
      { question: 'What is the Unit II milestone passage?', options: ['Epistula I.1 only', 'The Aeneid', 'Epistulae Morales I.1 (Session 15) and I.4 (Session 20)', 'The Meditations of Marcus Aurelius'], correct: 2 },
      { question: 'How does I.4 connect to Encheiridion §1?', options: ['They are unrelated', 'Tempus tantum nostrum est = the temporal application of eph’ hēmin — time-governance is the one “possession” up to us', 'I.4 rejects Epictetus', 'Both deny that time exists'], correct: 1 },
      { question: 'What does Unit III focus on?', options: ['New grammar each week', 'Application — sustained prose reading using the complete grammar of Units I and II', 'Only vocabulary memorization', 'Greek grammar'], correct: 1 },
      { question: 'What does Seneca’s phrase vindica te tibi mean, and why does it use the dative?', options: ['“Free Lucilius” — accusative of respect', '“Claim yourself for yourself” — tibi is a dative of interest (“for yourself”), intensifying the reflexive te', '“Give time to yourself” — ablative of means', '“You are claimed” — passive'], correct: 1 },
    ],
    vocabulary: [
      { latin: 'transcurrere', pronunciation: 'trans-KUR-re-re', english: 'to run past, to pass by (3rd conj.)' },
      { latin: 'alienus, -a, -um', pronunciation: 'a-li-E-nus', english: 'belonging to another, foreign' },
      { latin: 'possessio, possessionis', pronunciation: 'pos-SES-si-o', english: 'possession, ownership (f.)' },
      { latin: 'fugax, fugacis', pronunciation: 'FU-gaks', english: 'fleeting, swift to flee (adj.)' },
      { latin: 'pretiosus, -a, -um', pronunciation: 'pre-ti-O-sus', english: 'precious, valuable' },
      { latin: 'stultitia, stultitiae', pronunciation: 'stul-TI-ti-a', english: 'foolishness, folly (f.)' },
    ],
  },
];
