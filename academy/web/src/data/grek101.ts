// GREK 101 — Ancient Greek for Philosophers
// Sessions 1–30: Unit I (grammar foundation), Unit II (verb system & readings),
// Unit III (advanced grammar, Encheiridion readings, final exam).
// Target text: Epictetus, Encheiridion §1

export type LanguageSession = {
  id: number;
  title: string;
  subtitle: string;
  isMilestone?: boolean;
  objectives: string[];
  parts: {
    heading: string;
    body: string;
    paradigms?: { title: string; headers: string[]; rows: string[][] }[];
    callout?: { label?: string; text: string };
  }[];
  exercises: {
    number: string;
    prompt: string;
    answer?: string;
  }[];
  quiz: {
    question: string;
    options: string[];
    correct: number; // 0-indexed
  }[];
  vocabulary: { greek: string; transliteration: string; english: string }[];
  targetText?: string;
};

const ENCHEIRIDION_1 =
  'Τῶν ὄντων τὰ μέν ἐστιν ἐφ᾿ ἡμῖν, τὰ δὲ οὐκ ἐφ᾿ ἡμῖν. ἐφ᾿ ἡμῖν μὲν ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις, καὶ ἁπλῶς ὅσα ἡμέτερα ἔργα· οὐκ ἐφ᾿ ἡμῖν δὲ σῶμα, κτῆσις, δόξα, ἀρχή, καὶ ἁπλῶς ὅσα οὐχ ἡμέτερα ἔργα.';

export const GREK_101_SESSIONS: LanguageSession[] = [
  // ── SESSION 1 ──────────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'The Greek Alphabet & Pronunciation',
    subtitle: 'The 24 letters · Breathing marks · Accents · Reading the Encheiridion’s opening word',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Recognize and produce all 24 letters of the Greek alphabet in both upper and lower case',
      'Distinguish the smooth (᾿) from the rough (῾) breathing mark and pronounce each correctly',
      'Identify the three accent marks: acute, grave, and circumflex',
      'Transliterate Greek words into Latin characters and read simple words aloud',
    ],
    parts: [
      {
        heading: 'Part 1 — Why Learn Greek?',
        body: 'Stoic philosophy was written in Greek. Every translation — however careful — collapses distinctions the original preserves. The Greek word λόγος is rendered as "reason," "word," "account," "principle," or "ratio" depending on context; no single English word carries its full sense. To read Epictetus, Marcus Aurelius, and Chrysippus in the original is to read the actual sentences they wrote, with their actual ambiguities intact. This is the purpose of GREK 101.',
        callout: {
          label: 'The end goal',
          text: 'By Session 10 you will read the opening sentence of the Encheiridion in the original Greek: "Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν." — Of the things that exist, some are up to us, others are not up to us. Every paradigm in this unit serves that sentence.',
        },
      },
      {
        heading: 'Part 2 — The 24 Letters',
        body: 'Greek has 24 letters. Seven are vowels (α, ε, η, ι, ο, υ, ω); the rest are consonants. Memorize them in order — knowing the sequence makes dictionary lookup automatic.',
        paradigms: [
          {
            title: 'The Greek Alphabet',
            headers: ['Upper', 'Lower', 'Name', 'Translit.', 'Pronunciation (Erasmian)'],
            rows: [
              ['Α', 'α', 'alpha', 'a', 'as in "father"'],
              ['Β', 'β', 'beta', 'b', 'as in "boy"'],
              ['Γ', 'γ', 'gamma', 'g', 'as in "go" (hard g)'],
              ['Δ', 'δ', 'delta', 'd', 'as in "do"'],
              ['Ε', 'ε', 'epsilon', 'e', 'short e as in "bet"'],
              ['Ζ', 'ζ', 'zeta', 'z', 'as in "zoo" (sometimes "dz")'],
              ['Η', 'η', 'eta', 'ē', 'long e as in "they"'],
              ['Θ', 'θ', 'theta', 'th', 'as in "thin"'],
              ['Ι', 'ι', 'iota', 'i', 'as in "machine"'],
              ['Κ', 'κ', 'kappa', 'k', 'as in "kite"'],
              ['Λ', 'λ', 'lambda', 'l', 'as in "love"'],
              ['Μ', 'μ', 'mu', 'm', 'as in "mom"'],
              ['Ν', 'ν', 'nu', 'n', 'as in "no"'],
              ['Ξ', 'ξ', 'xi', 'x', 'as in "axe"'],
              ['Ο', 'ο', 'omicron', 'o', 'short o as in "pot"'],
              ['Π', 'π', 'pi', 'p', 'as in "pat"'],
              ['Ρ', 'ρ', 'rho', 'r', 'rolled r'],
              ['Σ', 'σ / ς', 'sigma', 's', 'as in "see" (ς at word end)'],
              ['Τ', 'τ', 'tau', 't', 'as in "top"'],
              ['Υ', 'υ', 'upsilon', 'u / y', 'as French "u" or German "ü"'],
              ['Φ', 'φ', 'phi', 'ph', 'as in "phone"'],
              ['Χ', 'χ', 'chi', 'ch', 'as in German "Bach"'],
              ['Ψ', 'ψ', 'psi', 'ps', 'as in "lapse"'],
              ['Ω', 'ω', 'omega', 'ō', 'long o as in "boat"'],
            ],
          },
        ],
        callout: {
          label: 'Erasmian vs. Modern Greek',
          text: 'Academic Greek courses use Erasmian pronunciation — a reconstruction of how 5th-century Athenians might have spoken. Modern Greek pronunciation differs significantly (η, ι, υ, ει, οι all sound the same — "ee"). For reading philosophical texts, Erasmian is standard.',
        },
      },
      {
        heading: 'Part 3 — Breathing Marks',
        body: 'Every word that begins with a vowel (or with ρ) carries a breathing mark above the initial letter. There are two kinds: smooth (᾿) means no h-sound is pronounced; rough (῾) means an h-sound is pronounced. The mark sits on top of the vowel — or on the second vowel of a diphthong.',
        paradigms: [
          {
            title: 'Breathing Marks',
            headers: ['Symbol', 'Name', 'Pronunciation', 'Example', 'Translit.'],
            rows: [
              ['᾿', 'smooth (psilon)', 'no h-sound', 'ἀρετή', 'aretē'],
              ['῾', 'rough (dasy)', 'h-sound before vowel', 'ἡμεῖς', 'hēmeis'],
              ['῾', 'rough (on ρ)', 'rh- at word start', 'ῥήτωρ', 'rhētōr'],
            ],
          },
        ],
        callout: {
          text: 'In the Encheiridion’s opening word "Τῶν" (gen. pl. article "of the"), the τ has no breathing — only vowel-initial words receive them. But in "ἡμῖν" ("us"), the η carries a rough breathing, giving the h- in transliteration "hēmin."',
        },
      },
      {
        heading: 'Part 4 — Accents',
        body: 'Greek words carry an accent mark on one syllable. There are three accents: acute (´), grave (`), and circumflex (̃). In classical pronunciation these indicated pitch (rising, falling, rising-falling); in modern reading they mark stress. Memorize the shape — you will see these on every Greek word.',
        paradigms: [
          {
            title: 'Accent Marks',
            headers: ['Symbol', 'Name', 'Example', 'Notes'],
            rows: [
              ['´', 'acute', 'ἀρετή', 'most common; can sit on any of last 3 syllables'],
              ['`', 'grave', 'τὸν λόγον', 'replaces a final acute when another word follows'],
              ['̃', 'circumflex', 'ψυχῆς', 'only on long vowels or diphthongs; last 2 syllables'],
            ],
          },
        ],
        callout: {
          label: 'You do not need to produce accents yet',
          text: 'Recognizing accent marks is essential; producing them correctly is a separate art (the "rules of accent") taught gradually. For Sessions 2-10, focus on recognizing forms — the accents will be supplied in vocabulary and paradigms.',
        },
      },
      {
        heading: 'Part 5 — Reading Your First Sentence',
        body: 'You now have the tools to read the opening of the Encheiridion. Sound it out letter by letter, noting breathings and accents. The grammar will come in Sessions 2-9 — for now, just read.',
        callout: {
          label: 'Encheiridion §1, opening',
          text: 'Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν. Transliteration: Tōn ontōn ta men estin ephʼ hēmin, ta de ouk ephʼ hēmin. Translation (revealed in Session 10): "Of the things that exist, some are up to us, others are not up to us."',
        },
      },
    ],
    exercises: [
      {
        number: '1.1',
        prompt: 'Identify each letter (upper or lower case) and give its name and Latin transliteration: a) Φ  b) ω  c) Ψ  d) θ  e) Χ',
        answer: 'a) phi (ph) · b) omega (ō) · c) psi (ps) · d) theta (th) · e) chi (ch)',
      },
      {
        number: '1.2',
        prompt: 'Transliterate each Greek word into Latin characters (mark long vowels and breathings): a) λόγος  b) ψυχή  c) ἀρετή  d) κόσμος  e) ἡμεῖς',
        answer: 'a) logos · b) psychē · c) aretē · d) kosmos · e) hēmeis (note rough breathing → h-)',
      },
      {
        number: '1.3',
        prompt: 'For each word, identify whether the initial breathing is smooth or rough, and whether the word would begin with an h-sound in English transliteration: a) ἀρετή  b) ἡμεῖς  c) ὄντων  d) ἐφʿ  e) ἁπλῶς',
        answer: 'a) smooth — aretē · b) rough — hēmeis · c) smooth — ontōn · d) smooth — ephʼ · e) rough — haplōs',
      },
      {
        number: '1.4',
        prompt: 'Read aloud the phrase "ἐφʿ ἡμῖν" three times. Why does the elision mark (ʼ) appear after the φ? (Preview — fully explained in Session 7.)',
        answer: 'The preposition ἐπί ("on, upon") loses its final ι before a vowel — and the π becomes φ before the rough breathing of ἡμῖν. The result: ἐφʿ ἡμῖν, pronounced "eph hēmin," meaning "up to us / in our power."',
      },
    ],
    quiz: [
      {
        question: 'How many letters are in the Greek alphabet?',
        options: ['22', '24', '26', '28'],
        correct: 1,
      },
      {
        question: 'Which letter transliterates as "ph"?',
        options: ['Ψ (psi)', 'Χ (chi)', 'Φ (phi)', 'Θ (theta)'],
        correct: 2,
      },
      {
        question: 'The rough breathing mark (῾) indicates:',
        options: [
          'A silent vowel',
          'A long vowel',
          'An h-sound at the start of the word',
          'The end of a sentence',
        ],
        correct: 2,
      },
      {
        question: 'Which two Greek letters are long vowels (long e and long o)?',
        options: [
          'α and ο',
          'ε and ω',
          'η and ω',
          'υ and ι',
        ],
        correct: 2,
      },
      {
        question: 'The word ἀρετή (virtue) begins with which breathing mark?',
        options: ['Smooth', 'Rough', 'It has no breathing', 'Both — they alternate'],
        correct: 0,
      },
      {
        question: 'In the word ψυχή, the letter ψ transliterates as:',
        options: ['p', 'ph', 'ps', 'z'],
        correct: 2,
      },
      {
        question: 'The grave accent (`) appears when:',
        options: [
          'A word has a long vowel in the final syllable',
          'A final acute accent is replaced because another word follows',
          'A word begins with rough breathing',
          'A word ends in a consonant',
        ],
        correct: 1,
      },
      {
        question: 'Which form of sigma is used at the end of a word?',
        options: ['σ', 'ς', 'Σ', 'There is no special form'],
        correct: 1,
      },
      {
        question: 'The circumflex accent (̃) can appear only on:',
        options: [
          'The first syllable of a word',
          'Short vowels',
          'Long vowels or diphthongs',
          'Consonants',
        ],
        correct: 2,
      },
      {
        question: 'In "ἐφʿ ἡμῖν," the rough breathing on ἡμῖν means the word is pronounced beginning with:',
        options: ['A silent h', 'An aspirated h-sound', 'A glottal stop', 'A trilled r'],
        correct: 1,
      },
    ],
    vocabulary: [
      { greek: 'ἀρετή', transliteration: 'aretē', english: 'virtue, excellence' },
      { greek: 'ψυχή', transliteration: 'psychē', english: 'soul, mind' },
      { greek: 'λόγος', transliteration: 'logos', english: 'reason, word, account' },
      { greek: 'κόσμος', transliteration: 'kosmos', english: 'order, world, cosmos' },
      { greek: 'ἡμεῖς', transliteration: 'hēmeis', english: 'we, us' },
      { greek: 'ἐπί', transliteration: 'epi', english: 'on, upon, in the power of' },
    ],
  },

  // ── SESSION 2 ──────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'Nouns: The First Declension',
    subtitle: 'Feminine -ā and -ē stem nouns · The philosophical vocabulary of soul, truth, virtue',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Recognize and produce all first declension endings in singular and plural',
      'Identify the nominative, genitive, dative, accusative, and vocative in a first declension noun',
      'Decline ψυχή (psychē, soul) and ἀλήθεια (alētheia, truth) in full',
      'Read simple noun phrases using first declension nouns with the definite article',
    ],
    parts: [
      {
        heading: 'Part 1 — What a Declension Is',
        body: 'Greek is an inflected language. Where English signals grammatical function by word order ("the dog bites the man" vs. "the man bites the dog"), Greek signals it by changing the ending of the noun itself. The set of endings a noun uses is its declension. First declension nouns are almost all feminine and end in -ā or -ē in the nominative singular. There are five cases in Greek. Each signals a different function:',
        paradigms: [
          {
            title: 'The Five Cases',
            headers: ['Case', 'Function', 'Example (English)'],
            rows: [
              ['Nominative', 'Subject of the sentence', 'The soul is immortal'],
              ['Genitive', 'Possession / "of"', 'the virtue of the soul'],
              ['Dative', 'Indirect object / "to/for"', 'to the soul, for the soul'],
              ['Accusative', 'Direct object', 'I pursue virtue'],
              ['Vocative', 'Direct address', 'O soul! O virtue!'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — First Declension Endings',
        body: 'The first declension contains two subtypes based on the vowel in the stem. The ψυχή type (long ē throughout) is the most common for philosophical vocabulary.',
        paradigms: [
          {
            title: 'First Declension — ψυχή, ψυχῆς (soul) — ē-stem',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'ψυχή', '-ή', 'ψυχαί', '-αί'],
              ['Genitive', 'ψυχῆς', '-ῆς', 'ψυχῶν', '-ῶν'],
              ['Dative', 'ψυχῇ', '-ῇ', 'ψυχαῖς', '-αῖς'],
              ['Accusative', 'ψυχήν', '-ήν', 'ψυχάς', '-άς'],
              ['Vocative', 'ψυχή', '-ή', 'ψυχαί', '-αί'],
            ],
          },
          {
            title: 'First Declension — ἀλήθεια, ἀληθείας (truth) — -ia stem (short α in sg.)',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'ἀλήθεια', '-α', 'ἀλήθειαι', '-αι'],
              ['Genitive', 'ἀληθείας', '-ας', 'ἀληθειῶν', '-ῶν'],
              ['Dative', 'ἀληθείᾳ', '-ᾳ', 'ἀληθείαις', '-αις'],
              ['Accusative', 'ἀλήθειαν', '-αν', 'ἀληθείας', '-ας'],
              ['Vocative', 'ἀλήθεια', '-α', 'ἀλήθειαι', '-αι'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — The Definite Article (First Declension)',
        body: 'Greek has a definite article — "the" — which must agree with its noun in gender, number, and case. The first declension is feminine; here are the feminine article forms:',
        paradigms: [
          {
            title: 'Definite Article — Feminine (ἡ)',
            headers: ['Case', 'Singular', 'Plural'],
            rows: [
              ['Nominative', 'ἡ', 'αἱ'],
              ['Genitive', 'τῆς', 'τῶν'],
              ['Dative', 'τῇ', 'ταῖς'],
              ['Accusative', 'τήν', 'τάς'],
            ],
          },
        ],
        callout: {
          label: 'Key pattern',
          text: 'The article and noun endings are nearly identical. Once you know the article, you know the noun endings — and vice versa. This symmetry makes Greek highly learnable once the patterns are internalized.',
        },
      },
      {
        heading: 'Part 4 — First Declension Philosophical Vocabulary',
        body: 'These nouns appear constantly in Stoic texts. Memorize the nominative + genitive pair — that pair is the dictionary entry for any Greek noun.',
        paradigms: [
          {
            title: 'Core First Declension Nouns',
            headers: ['Greek', 'Genitive', 'English', 'Stoic Significance'],
            rows: [
              ['ψυχή', 'ψυχῆς', 'soul, mind', 'Seat of the hēgemonikon; site of impressions, assent, impulse'],
              ['ἀλήθεια', 'ἀληθείας', 'truth', 'Object of the Sage’s knowledge; what katalēptikē phantasia grasps'],
              ['ἀρετή', 'ἀρετῆς', 'virtue, excellence', 'The only genuine good; sufficient for happiness (eudaimonia)'],
              ['ἡδονή', 'ἡδονῆς', 'pleasure', 'A "preferred indifferent" — not a genuine good for Stoics'],
              ['τύχη', 'τύχης', 'fortune, chance', 'Paradigmatic external — not "up to us" (ephʼ hēmin)'],
              ['φύσις', 'φύσεως', 'nature', 'Note: 3rd decl. — will be learned in Session 13 — listed for awareness'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '2.1',
        prompt: 'Decline the full paradigm (all 5 cases, singular and plural) for ἀρετή, ἀρετῆς (virtue). Follow the ψυχή model exactly.',
        answer: 'Nom: ἀρετή / ἀρεταί · Gen: ἀρετῆς / ἀρετῶν · Dat: ἀρετῇ / ἀρεταῖς · Acc: ἀρετήν / ἀρετάς · Voc: ἀρετή / ἀρεταί',
      },
      {
        number: '2.2',
        prompt: 'Identify the case and number of each underlined form. Give one possible English translation: a) ψυχῆς  b) ἀληθείᾳ  c) ἀρετάς  d) αἱ ψυχαί  e) τῇ ἀρετῇ',
        answer: 'a) genitive singular — "of the soul" · b) dative singular — "to/for truth" · c) accusative plural — "virtues" (direct object) · d) nominative plural — "the souls" (subject) · e) dative singular — "to/for virtue" (with the article)',
      },
      {
        number: '2.3',
        prompt: 'Translate into Greek using the vocabulary from Part 4. Use the definite article where indicated: a) of virtue (genitive)  b) the souls (nominative plural)  c) for truth (dative)  d) I pursue virtue [accusative — just the noun]',
        answer: 'a) τῆς ἀρετῆς · b) αἱ ψυχαί · c) τῇ ἀληθείᾳ · d) ἀρετήν',
      },
      {
        number: '2.4',
        prompt: 'Encheiridion Preview — In Session 10, you will read: "τὰ μέν ἐστιν ἐφʿ ἡμῖν." The word ἡμῖν is the dative plural of ἡμεῖς (we/us). Compare its ending (-ῖν) to the first declension dative forms you have learned. Although ἡμῖν is a pronoun, not a first declension noun, what dative pattern do you notice it shares? What does "ἐφʿ ἡμῖν" likely mean?',
        answer: 'The -ῖν ending echoes the accented dative pattern. ἐφʿ ἡμῖν = "upon us" / "up to us" — the Stoic formula for things in our control. The preposition ἐπί (contracted to ἐφʿ before rough breathing) + dative = "dependent on, in the power of."',
      },
    ],
    quiz: [
      { question: 'Which case marks the subject of a Greek sentence?', options: ['Genitive', 'Nominative', 'Accusative', 'Dative'], correct: 1 },
      { question: 'The genitive plural ending for first declension nouns is:', options: ['-ης', '-αις', '-ων', '-ας'], correct: 2 },
      { question: 'The dative singular of ψυχή is:', options: ['ψυχής', 'ψυχήν', 'ψυχῇ', 'ψυχαί'], correct: 2 },
      { question: 'The definite article form τῆς is:', options: ['Nominative singular feminine', 'Genitive singular feminine', 'Dative plural feminine', 'Accusative singular feminine'], correct: 1 },
      { question: 'Which word correctly fills the blank? "______ ἀρετήν διώκω" (I pursue ______ virtue)', options: ['τῆς', 'τήν', 'τῇ', 'αἱ'], correct: 1 },
      { question: 'The Stoic term ψυχή refers to:', options: ['The body’s physical constitution', 'The seat of impressions, assent, and impulse — the rational soul', 'The external circumstances of fortune', 'The cosmic principle of reason'], correct: 1 },
      { question: 'Which first declension noun has the genitive singular ἀληθείας?', options: ['ψυχή', 'ἀρετή', 'ἀλήθεια', 'ἡδονή'], correct: 2 },
      { question: 'The vocative case is used for:', options: ['Showing possession', 'Marking the direct object', 'Direct address', 'Indicating the indirect object'], correct: 2 },
      { question: 'Τύχη (fortune/chance) is philosophically significant in Stoicism because:', options: ['It is the highest good', 'It represents things that are not "up to us" — paradigmatic externals', 'It is identical to virtue', 'The Stoics valued it equally with reason'], correct: 1 },
      { question: 'The nominative plural of ἀρετή is:', options: ['ἀρετῶν', 'ἀρεταῖς', 'ἀρετάς', 'ἀρεταί'], correct: 3 },
    ],
    vocabulary: [
      { greek: 'ψυχή, ψυχῆς', transliteration: 'psychē', english: 'soul, mind' },
      { greek: 'ἀλήθεια, ἀληθείας', transliteration: 'alētheia', english: 'truth' },
      { greek: 'ἀρετή, ἀρετῆς', transliteration: 'aretē', english: 'virtue, excellence' },
      { greek: 'ἡδονή, ἡδονῆς', transliteration: 'hēdonē', english: 'pleasure' },
      { greek: 'τύχη, τύχης', transliteration: 'tychē', english: 'fortune, chance' },
      { greek: 'φύσις, φύσεως', transliteration: 'physis', english: 'nature (3rd decl. — preview)' },
      { greek: 'ἡ, τῆς', transliteration: 'hē', english: 'the (fem. def. article)' },
    ],
  },

  // ── SESSION 3 ──────────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Nouns: The Second Declension',
    subtitle: 'Masculine -ος and neuter -ον stems · logos, nous, kosmos',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Recognize and produce all second declension masculine and neuter endings',
      'Decline λόγος (logos) and νόμος (nomos) as masculine paradigms',
      'Contrast neuter ἔργον (neuter -ον) with the masculine pattern',
      'Use the masculine definite article (ὁ) correctly with second declension nouns',
    ],
    parts: [
      {
        heading: 'Part 1 — The Second Declension',
        body: 'The second declension contains two genders: masculine (ending in -ος) and neuter (ending in -ον). The masculine is the most important for Stoic philosophical vocabulary — λόγος, νόμος, κόσμος, and νοῦς are all second declension. Neuter nouns have one key rule that applies across all declensions: the nominative and accusative neuter are always identical. This makes them easy to spot — if a neuter noun looks the same in subject and object positions, that is by design.',
        paradigms: [
          {
            title: 'Second Declension Masculine — λόγος, λόγου (reason, word)',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'λόγος', '-ος', 'λόγοι', '-οι'],
              ['Genitive', 'λόγου', '-ου', 'λόγων', '-ων'],
              ['Dative', 'λόγῳ', '-ῳ', 'λόγοις', '-οις'],
              ['Accusative', 'λόγον', '-ον', 'λόγους', '-ους'],
              ['Vocative', 'λόγε', '-ε', 'λόγοι', '-οι'],
            ],
          },
          {
            title: 'Second Declension Neuter — ἔργον, ἔργου (work, deed)',
            headers: ['Case', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['Nominative', 'ἔργον', '-ον', 'ἔργα', '-α'],
              ['Genitive', 'ἔργου', '-ου', 'ἔργων', '-ων'],
              ['Dative', 'ἔργῳ', '-ῳ', 'ἔργοις', '-οις'],
              ['Accusative', 'ἔργον', '-ον', 'ἔργα', '-α'],
              ['Vocative', 'ἔργον', '-ον', 'ἔργα', '-α'],
            ],
          },
          {
            title: 'Definite Article — Masculine (ὁ) and Neuter (τό)',
            headers: ['Case', 'Masc. Sg.', 'Masc. Pl.', 'Neut. Sg.', 'Neut. Pl.'],
            rows: [
              ['Nominative', 'ὁ', 'οἱ', 'τό', 'τά'],
              ['Genitive', 'τοῦ', 'τῶν', 'τοῦ', 'τῶν'],
              ['Dative', 'τῷ', 'τοῖς', 'τῷ', 'τοῖς'],
              ['Accusative', 'τόν', 'τούς', 'τό', 'τά'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Second Declension Philosophical Vocabulary',
        body: 'These nouns name the central concepts of Stoic metaphysics and ethics. Memorize the nominative-genitive pair for each.',
        paradigms: [
          {
            title: 'Core Second Declension Nouns',
            headers: ['Greek', 'Genitive', 'Gender', 'English', 'Stoic Significance'],
            rows: [
              ['λόγος', 'λόγου', 'masc.', 'reason, word, account', 'The rational principle in the cosmos; the human faculty of reason; the Stoic God'],
              ['νόμος', 'νόμου', 'masc.', 'law, custom', 'Natural law (νόμος φύσεως) — the rational order the Sage lives in accord with'],
              ['κόσμος', 'κόσμου', 'masc.', 'order, world, cosmos', 'The rationally ordered universe; the Stoic God is also identified with the cosmos'],
              ['νοῦς', 'νοῦ', 'masc.', 'mind, intellect', 'Note: contracted 2nd decl. (νοῦς/νοῦ/νῷ/νοῦν) — irregular but critical'],
              ['βίος', 'βίου', 'masc.', 'life (biographical)', 'Distinguished from ζωή (biological life); the philosophical life = the examined bios'],
              ['ἔργον', 'ἔργου', 'neut.', 'work, deed, function', 'The Stoic ergon (function) of a human being is to exercise reason — the foundation of role ethics'],
              ['πάθος', 'πάθους', 'neut.', 'passion, emotion, suffering', 'Note: 3rd decl. — preview only; pathos as false judgment is central to Stoic ethics'],
            ],
          },
        ],
        callout: {
          label: 'The Contracted Noun νοῦς',
          text: 'νοῦς is a contracted second declension noun. Its forms are shortened: Nom. νοῦς · Gen. νοῦ · Dat. νῷ · Acc. νοῦν. Memorize these individually — they appear constantly in philosophical texts.',
        },
      },
    ],
    exercises: [
      {
        number: '3.1',
        prompt: 'Decline the full paradigm for κόσμος, κόσμου (cosmos/world). Follow the λόγος model.',
        answer: 'Nom: κόσμος/κόσμοι · Gen: κόσμου/κόσμων · Dat: κόσμῳ/κόσμοις · Acc: κόσμον/κόσμους · Voc: κόσμε/κόσμοι',
      },
      {
        number: '3.2',
        prompt: 'Parse each form — give case, number, gender, and the dictionary entry it belongs to: a) λόγοι  b) τοῦ νόμου  c) ἔργα  d) τῷ κόσμῳ  e) νοῦν',
        answer: 'a) nom. pl. masc. — λόγος · b) gen. sg. masc. — νόμος · c) nom./acc. pl. neut. — ἔργον · d) dat. sg. masc. — κόσμος · e) acc. sg. masc. — νοῦς (contracted)',
      },
      {
        number: '3.3',
        prompt: 'Translate into Greek. Include the definite article: a) The cosmos (nominative)  b) Of the law (genitive)  c) For the mind (dative)  d) I see the deed [accusative]',
        answer: 'a) ὁ κόσμος · b) τοῦ νόμου · c) τῷ νῷ (contracted) · d) τό ἔργον',
      },
      {
        number: '3.4',
        prompt: 'Both Declensions — Identify which declension each noun belongs to (1st or 2nd), its gender, and its dictionary form (nominative + genitive): ψυχή · λόγος · ἀλήθεια · κόσμος · ἀρετή · νοῦς · ἔργον',
        answer: 'ψυχή — 1st, fem, ψυχή/ψυχῆς · λόγος — 2nd, masc, λόγος/λόγου · ἀλήθεια — 1st, fem, ἀλήθεια/ἀληθείας · κόσμος — 2nd, masc, κόσμος/κόσμου · ἀρετή — 1st, fem, ἀρετή/ἀρετῆς · νοῦς — 2nd contr., masc, νοῦς/νοῦ · ἔργον — 2nd, neut, ἔργον/ἔργου',
      },
    ],
    quiz: [
      { question: 'The second declension masculine nominative singular ending is:', options: ['-α', '-η', '-ος', '-ον'], correct: 2 },
      { question: 'What is the key grammatical rule for neuter nouns across all declensions?', options: ['Neuter nouns use the masculine article', 'Neuter nominative and accusative are always identical', 'Neuter nouns have no plural', 'Neuter nouns are always in the genitive'], correct: 1 },
      { question: 'The contracted noun νοῦς has the accusative singular:', options: ['νόον', 'νοῦν', 'νῷ', 'νοῦ'], correct: 1 },
      { question: 'The masculine dative plural article is:', options: ['τῶν', 'τοῖς', 'τοῦ', 'τῷ'], correct: 1 },
      { question: 'Κόσμος in Stoic philosophy refers to:', options: ['Chaos and disorder', 'The rationally ordered universe', 'The physical body only', 'A type of logical argument'], correct: 1 },
      { question: 'The genitive singular of λόγος is:', options: ['λόγοι', 'λόγους', 'λόγου', 'λόγων'], correct: 2 },
      { question: 'The neuter noun ἔργον (function/deed) is philosophically significant because:', options: ['It refers to warfare and conquest', 'The ergon of a human being is the exercise of reason — the Stoic foundation of role ethics', 'It describes the physical cosmos', 'It is the Stoic term for political office'], correct: 1 },
      { question: 'Which article form matches a second declension masculine nominative singular noun?', options: ['ἡ', 'ὁ', 'τό', 'αἱ'], correct: 1 },
      { question: 'The dative singular of κόσμος is:', options: ['κόσμου', 'κόσμον', 'κόσμοις', 'κόσμῳ'], correct: 3 },
      { question: 'Βίος (biographical life) is distinguished from ζωή (biological life) in Stoic thought because:', options: ['They are synonyms — the distinction is purely stylistic', 'Bios refers to the philosophical life — the examined, deliberate life one constructs through reason', 'Bios refers to animal existence; zōē to human existence', 'Bios is mortal; zōē is eternal'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'λόγος, λόγου', transliteration: 'logos', english: 'reason, word, account' },
      { greek: 'νόμος, νόμου', transliteration: 'nomos', english: 'law, custom' },
      { greek: 'κόσμος, κόσμου', transliteration: 'kosmos', english: 'order, world, cosmos' },
      { greek: 'νοῦς, νοῦ', transliteration: 'nous', english: 'mind, intellect (contracted)' },
      { greek: 'βίος, βίου', transliteration: 'bios', english: 'life (biographical)' },
      { greek: 'ἔργον, ἔργου', transliteration: 'ergon', english: 'work, deed, function' },
      { greek: 'πάθος, πάθους', transliteration: 'pathos', english: 'passion, emotion (3rd decl. preview)' },
      { greek: 'ὁ, τοῦ', transliteration: 'ho', english: 'the (masc. def. article)' },
      { greek: 'τό, τοῦ', transliteration: 'to', english: 'the (neut. def. article)' },
    ],
  },

  // ── SESSION 4 ──────────────────────────────────────────────────────────────
  {
    id: 4,
    title: 'The Greek Verb: Present Active Indicative',
    subtitle: 'The λύω paradigm · Person, number, tense · The verb "to be" (εἰμί)',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Conjugate any regular verb in the present active indicative (all 6 persons)',
      'Identify person and number from verb endings alone',
      'Conjugate εἰμί (to be) in the present indicative',
      'Construct simple subject-verb and subject-verb-object sentences',
    ],
    parts: [
      {
        heading: 'Part 1 — How Greek Verbs Work',
        body: 'Greek verbs encode person, number, tense, voice, and mood directly in their endings. A single word — διώκω — means "I pursue." The subject pronoun is built into the verb. This means simple Greek sentences can be one or two words long. The present active indicative is the most fundamental verb form. "Active" means the subject performs the action. "Indicative" means the verb makes a straightforward statement. "Present" means the action is happening now (or habitually).',
        paradigms: [
          {
            title: 'Present Active Indicative — λύω (I loosen/release)',
            headers: ['Person', 'Singular', 'Ending', 'Plural', 'Ending'],
            rows: [
              ['1st (I / we)', 'λύω', '-ω', 'λύομεν', '-ομεν'],
              ['2nd (you / you all)', 'λύεις', '-εις', 'λύετε', '-ετε'],
              ['3rd (he/she/it/they)', 'λύει', '-ει', 'λύουσι(ν)', '-ουσι(ν)'],
            ],
          },
          {
            title: 'εἰμί — To Be (Present Indicative, Irregular)',
            headers: ['Person', 'Singular', 'Plural'],
            rows: [
              ['1st', 'εἰμί (I am)', 'ἐσμέν (we are)'],
              ['2nd', 'εἶ (you are)', 'ἐστέ (you [pl.] are)'],
              ['3rd', 'ἐστί(ν) (he/she/it is)', 'εἰσί(ν) (they are)'],
            ],
          },
        ],
        callout: {
          label: 'Parsing shorthand',
          text: 'When asked to parse a verb, give: person · number · tense · voice · mood · infinitive. Example: λύει = 3rd singular present active indicative of λύω (to loosen). εἰμί is accented and enclitic in certain forms — the details of enclitic accentuation come later. For now, memorize the six forms. ἐστί and εἰσί add movable ν (ν-movable) before vowels and at end of sentence.',
        },
      },
      {
        heading: 'Part 2 — Stoic Verb Vocabulary',
        body: 'These verbs appear repeatedly in Epictetus, Marcus, and Chrysippus. Each is given in its 1st singular form — the dictionary entry.',
        paradigms: [
          {
            title: 'Core Verbs for Stoic Texts',
            headers: ['Greek', '1st Sg.', 'English', 'Stoic Context'],
            rows: [
              ['διώκω', 'διώκω', 'I pursue', 'Pursuing virtue (ἀρετήν διώκω)'],
              ['φεύγω', 'φεύγω', 'I flee, avoid', 'Avoiding vice — the Stoic negative duty'],
              ['λέγω', 'λέγω', 'I say, speak', 'The verb of logos — rational speech'],
              ['ἔχω', 'ἔχω', 'I have, hold', 'Epictetus: what do you have power over?'],
              ['ὁράω', 'ὁρῶ', 'I see', 'Seeing clearly = correct impression'],
              ['νομίζω', 'νομίζω', 'I consider, think', 'The verb of doxa (belief/opinion)'],
              ['ἀσκέω', 'ἀσκέω', 'I practice, train', 'The Stoic practice (askēsis) of philosophy'],
              ['ζητέω', 'ζητέω', 'I seek, inquire', 'Philosophical inquiry — Socratic elenchus'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '4.1',
        prompt: 'Conjugate ἀσκέω (I practice) in the full present active indicative — all six persons.',
        answer: 'ἀσκέω · ἀσκεῖς · ἀσκεῖ · ἀσκοῦμεν · ἀσκεῖτε · ἀσκοῦσι(ν)',
      },
      {
        number: '4.2',
        prompt: 'Parse each verb form — give person, number, tense, voice, mood, and dictionary entry: a) λέγομεν  b) ζητεῖς  c) ἔχει  d) εἰσί  e) ἀσκῶ',
        answer: 'a) 1pl. pres. act. ind. — λέγω · b) 2sg. pres. act. ind. — ζητέω · c) 3sg. pres. act. ind. — ἔχω · d) 3pl. pres. ind. — εἰμί · e) 1sg. pres. act. ind. — ἀσκέω',
      },
      {
        number: '4.3',
        prompt: 'Translate into English: a) ἀρετήν διώκω.  b) ὁ σοφὸς φεύγει τὴν ἡδονήν.  c) ἀσκοῦμεν τὴν φιλοσοφίαν.  d) τί ζητεῖς;',
        answer: 'a) I pursue virtue. · b) The wise man flees pleasure. · c) We practice philosophy. · d) What are you seeking?',
      },
      {
        number: '4.4',
        prompt: 'Sentence Building — Construct three original Greek sentences using vocabulary from Sessions 2–4. Each sentence must include: (1) a noun with a definite article, (2) a correctly conjugated verb. Write the Greek and then the English translation.',
        answer: 'Sample: ὁ φιλόσοφος ζητεῖ τὴν ἀλήθειαν. (The philosopher seeks truth.) — Many valid answers possible. Check: article agrees with noun in case/gender/number; verb ending matches subject.',
      },
    ],
    quiz: [
      { question: 'The first person singular present active indicative ending is:', options: ['-εις', '-ει', '-ω', '-ομεν'], correct: 2 },
      { question: 'The verb εἰμί is irregular. Its third person plural form is:', options: ['ἐσμέν', 'εἶ', 'εἰσί(ν)', 'ἐστί(ν)'], correct: 2 },
      { question: 'The second person plural present active indicative of λύω is:', options: ['λύεις', 'λύετε', 'λύουσι', 'λύομεν'], correct: 1 },
      { question: 'The Greek verb ἀσκέω is particularly important in Stoic philosophy because:', options: ['It means to speak in public', 'It means to practice — askēsis (training/practice) is the Stoic method of philosophical formation', 'It means to avoid pain', 'It refers to political participation'], correct: 1 },
      { question: 'Which verb ending indicates third person singular?', options: ['-ω', '-ομεν', '-ετε', '-ει'], correct: 3 },
      { question: 'How is the subject usually indicated in a Greek verb?', options: ['By a separate pronoun always placed before the verb', 'By the ending of the verb itself — the pronoun is built in', 'By the definite article of the nearest noun', 'By word order only'], correct: 1 },
      { question: 'Parse λέγομεν:', options: ['1st singular present active indicative', '3rd plural present active indicative', '1st plural present active indicative', '2nd plural present active indicative'], correct: 2 },
      { question: 'The Greek verb ζητέω connects to the philosophical method of Socrates because:', options: ['Zētein (to seek) is the root of zētēsis — Socratic inquiry, the constant questioning that is philosophy', 'It means to argue loudly in public', 'Socrates used it to describe political campaigning', 'It means to write philosophical texts'], correct: 0 },
      { question: 'The movable ν added to ἐστί before a vowel or at sentence end:', options: ['Changes the meaning of the verb', 'Is a phonological convention — no meaning change', 'Indicates a different mood', 'Marks the verb as irregular'], correct: 1 },
      { question: 'In the sentence "ὁ σοφὸς διώκει τὴν ἀρετήν," what case is ἀρετήν?', options: ['Nominative — it is the subject', 'Genitive — it shows possession', 'Accusative — it is the direct object', 'Dative — it is the indirect object'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'διώκω', transliteration: 'diōkō', english: 'I pursue' },
      { greek: 'φεύγω', transliteration: 'pheugō', english: 'I flee, avoid' },
      { greek: 'λέγω', transliteration: 'legō', english: 'I say, speak' },
      { greek: 'ἔχω', transliteration: 'echō', english: 'I have, hold' },
      { greek: 'ὁράω / ὁρῶ', transliteration: 'horaō', english: 'I see' },
      { greek: 'νομίζω', transliteration: 'nomizō', english: 'I consider, think' },
      { greek: 'ἀσκέω', transliteration: 'askeō', english: 'I practice, train' },
      { greek: 'ζητέω', transliteration: 'zēteō', english: 'I seek, inquire' },
      { greek: 'εἰμί', transliteration: 'eimi', english: 'I am' },
    ],
  },

  // ── SESSION 5 ──────────────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Adjectives & Agreement',
    subtitle: 'The 2-1-2 pattern · Predicative and attributive position · Good, just, wise, free',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Understand the three-gender agreement system for Greek adjectives',
      'Decline 2-1-2 adjectives (ἀγαθός, ἀγαθή, ἀγαθόν) in full',
      'Distinguish attributive position (ὁ ἀγαθὸς ἄνθρωπος) from predicative (ὁ ἄνθρωπος ἀγαθός)',
      'Use philosophical adjectives — sophos, dikaios, eleutheros — correctly in context',
    ],
    parts: [
      {
        heading: 'Part 1 — How Greek Adjectives Work',
        body: 'Greek adjectives agree with their nouns in three things: gender, number, and case. This is called GNC agreement. An adjective modifying a feminine noun must take feminine endings; modifying a masculine noun, masculine endings; and so on. The most common adjective type is called 2-1-2 because masculine and neuter forms use second declension endings, and feminine forms use first declension endings. Once you know both declensions from Sessions 2 and 3, you already know the adjective endings.',
        paradigms: [
          {
            title: '2-1-2 Adjective — ἀγαθός, -ή, -όν (good)',
            headers: ['Case', 'Masc. Sg.', 'Fem. Sg.', 'Neut. Sg.', 'Masc. Pl.', 'Fem. Pl.', 'Neut. Pl.'],
            rows: [
              ['Nom.', 'ἀγαθός', 'ἀγαθή', 'ἀγαθόν', 'ἀγαθοί', 'ἀγαθαί', 'ἀγαθά'],
              ['Gen.', 'ἀγαθοῦ', 'ἀγαθῆς', 'ἀγαθοῦ', 'ἀγαθῶν', 'ἀγαθῶν', 'ἀγαθῶν'],
              ['Dat.', 'ἀγαθῷ', 'ἀγαθῇ', 'ἀγαθῷ', 'ἀγαθοῖς', 'ἀγαθαῖς', 'ἀγαθοῖς'],
              ['Acc.', 'ἀγαθόν', 'ἀγαθήν', 'ἀγαθόν', 'ἀγαθούς', 'ἀγαθάς', 'ἀγαθά'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Attributive vs. Predicative Position',
        body: 'Greek has two ways to use an adjective. The position relative to the article changes the meaning:',
        paradigms: [
          {
            title: 'Adjective Position',
            headers: ['Type', 'Pattern', 'Greek Example', 'Translation'],
            rows: [
              ['Attributive', 'article + adj. + noun  OR  article + noun + article + adj.', 'ὁ ἀγαθὸς ἄνθρωπος / ὁ ἄνθρωπος ὁ ἀγαθός', 'the good man (adjective describes which man)'],
              ['Predicative', 'adj. + noun  OR  noun + adj. (NO repeated article)', 'ἀγαθὸς ὁ ἄνθρωπος  OR  ὁ ἄνθρωπος ἀγαθός', 'the man is good (adjective makes a claim)'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Philosophical Adjective Vocabulary',
        body: 'These adjectives are the moral vocabulary of Stoic ethics. Memorize all three gender forms — they will appear in every gender as the noun they modify dictates.',
        paradigms: [
          {
            title: 'Core Philosophical Adjectives',
            headers: ['Greek (Masc.)', 'Fem.', 'Neut.', 'English', 'Stoic Significance'],
            rows: [
              ['ἀγαθός', 'ἀγαθή', 'ἀγαθόν', 'good', 'Only virtue is genuinely agathos — external goods are not goods at all'],
              ['κακός', 'κακή', 'κακόν', 'bad, evil', 'Only vice is genuinely kakos — external ills are not evils at all'],
              ['καλός', 'καλή', 'καλόν', 'beautiful, noble', 'What is truly kalos is virtue; cosmetic beauty is an indifferent'],
              ['δίκαιος', 'δικαία', 'δίκαιον', 'just, righteous', 'Justice (dikaiosynē) as one of the four cardinal Stoic virtues'],
              ['σοφός', 'σοφή', 'σοφόν', 'wise', 'The Sage (sophos) — the ideal of complete virtue; exceedingly rare'],
              ['ἐλεύθερος', 'ἐλευθέρα', 'ἐλεύθερον', 'free', 'True freedom is inner — Epictetus the slave was freer than his master'],
              ['ἀδιάφορος', 'ἀδιάφορη', 'ἀδιάφορον', 'indifferent', 'The Stoic adiaphoron — externals are neither good nor bad in themselves'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '5.1',
        prompt: 'Make each adjective agree with its noun. Give the correct form of ἀγαθός: a) ______ ψυχή (nominative sg. fem.)  b) ______ λόγου (genitive sg. masc.)  c) ______ ἔργα (accusative pl. neut.)  d) ______ σοφοῖς (dative pl. masc.)',
        answer: 'a) ἀγαθή · b) ἀγαθοῦ · c) ἀγαθά · d) ἀγαθοῖς',
      },
      {
        number: '5.2',
        prompt: 'Identify whether each phrase is attributive or predicative, and translate: a) ὁ σοφὸς ἄνθρωπος  b) ὁ ἄνθρωπος σοφός  c) αἱ ἐλεύθεραι ψυχαί  d) ἐλεύθεραι αἱ ψυχαί',
        answer: 'a) Attributive — "the wise man" · b) Predicative — "the man is wise" · c) Attributive — "the free souls" · d) Predicative — "the souls are free"',
      },
      {
        number: '5.3',
        prompt: 'Translate into Greek: a) The just man pursues virtue.  b) The soul is free.  c) We practice the noble deeds.',
        answer: 'a) ὁ δίκαιος ἄνθρωπος ἀρετήν διώκει. · b) ἡ ψυχή ἐλευθέρα ἐστί(ν). · c) ἀσκοῦμεν τὰ καλὰ ἔργα.',
      },
      {
        number: '5.4',
        prompt: 'Stoic Analysis — Epictetus says that his master Epaphroditus thought he could control Epictetus by threatening his body. Epictetus disagreed. Using the adjectives from Part 3, construct a single Greek sentence that captures Epictetus’s response — the idea that he (Epictetus) is free while his master is enslaved. Use at least two adjectives and two nouns from this session.',
        answer: 'Sample: ἡ ψυχή μου ἐλευθέρα ἐστίν· ὁ δεσπότης δὲ οὐκ ἐλεύθερός ἐστιν. (My soul is free; the master, however, is not free.) — Many valid constructions possible.',
      },
    ],
    quiz: [
      { question: 'GNC agreement means a Greek adjective must agree with its noun in:', options: ['Grammar, Nominative, Conjugation', 'Gender, Number, Case', 'Genitive, Noun, Consonant', 'Grammar, Nature, Context'], correct: 1 },
      { question: 'In the phrase ὁ σοφὸς ἄνθρωπος, the adjective σοφός is:', options: ['Predicative — "the man is wise"', 'Attributive — "the wise man"', 'Vocative — addressing the man', 'Genitive — showing possession'], correct: 1 },
      { question: 'The Stoic term ἀδιάφορον (indifferent) refers to:', options: ['Vices and passions', 'Externals that are neither genuinely good nor bad in themselves', 'Things the Sage avoids', 'The Sage’s state of mind'], correct: 1 },
      { question: 'The feminine nominative singular of δίκαιος is:', options: ['δίκαιος', 'δίκαιον', 'δικαία', 'δικαίης'], correct: 2 },
      { question: 'In the phrase ὁ ἄνθρωπος σοφός (no article before σοφός), the adjective is:', options: ['Attributive', 'Predicative', 'Substantive', 'Genitive'], correct: 1 },
      { question: 'The adjective ἐλεύθερος is philosophically central in Stoicism because:', options: ['Political freedom was the Stoics’ primary concern', 'True freedom is inner — the slave who governs his own mind is freer than the tyrant who does not', 'Stoics believed slaves should be liberated by law', 'Eleutheros was Zeno’s original name'], correct: 1 },
      { question: 'The 2-1-2 adjective type uses which declension endings for the feminine forms?', options: ['Third declension', 'Second declension', 'First declension', 'A unique adjective declension'], correct: 2 },
      { question: 'Which is the correct attributive construction for "the good soul"?', options: ['ψυχή ἀγαθή ἡ', 'ἡ ψυχή ἀγαθή', 'ἡ ἀγαθὴ ψυχή', 'ψυχή ἡ ἀγαθή'], correct: 2 },
      { question: 'The Stoic claim that only virtue is ἀγαθόν (good) is radical because:', options: ['It was illegal to deny that wealth was good in Athens', 'It excludes health, wealth, reputation, and pleasure from the category of genuine goods — all are "indifferents"', 'It was the view of Plato, not the Stoics specifically', 'It only applies to the Sage, not ordinary people'], correct: 1 },
      { question: 'The neuter plural nominative of καλός is:', options: ['καλοί', 'καλαί', 'καλά', 'καλῶν'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'ἀγαθός, -ή, -όν', transliteration: 'agathos', english: 'good' },
      { greek: 'κακός, -ή, -όν', transliteration: 'kakos', english: 'bad, evil' },
      { greek: 'καλός, -ή, -όν', transliteration: 'kalos', english: 'beautiful, noble' },
      { greek: 'δίκαιος, -α, -ον', transliteration: 'dikaios', english: 'just, righteous' },
      { greek: 'σοφός, -ή, -όν', transliteration: 'sophos', english: 'wise' },
      { greek: 'ἐλεύθερος, -α, -ον', transliteration: 'eleutheros', english: 'free' },
      { greek: 'ἀδιάφορος, -ον', transliteration: 'adiaphoros', english: 'indifferent' },
    ],
  },

  // ── SESSION 6 ──────────────────────────────────────────────────────────────
  {
    id: 6,
    title: 'The Verb εἰμί & Predicate Adjectives',
    subtitle: 'Using "to be" · Predicate nominative · The philosophical copula',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Use εἰμί fluently in all six present indicative forms',
      'Construct and parse predicate adjective sentences (noun + εἰμί + adjective)',
      'Distinguish predicate adjective from attributive adjective in real sentences',
      'Translate key Stoic propositions using εἰμί as the copula',
    ],
    parts: [
      {
        heading: 'Part 1 — The Predicate Nominative',
        body: 'When εἰμί links a subject to a noun or adjective that describes it, both the subject and the predicate noun/adjective are in the nominative case. This is called the predicate nominative. There is no accusative with εἰμί as there would be with an action verb.',
        paradigms: [
          {
            title: 'Predicate Patterns with εἰμί',
            headers: ['Pattern', 'Greek Example', 'Translation'],
            rows: [
              ['Noun = Noun', 'ὁ κόσμος θεός ἐστιν.', 'The cosmos is god. (Stoic theology)'],
              ['Noun = Adjective', 'ἡ ἀρετή ἀγαθή ἐστιν.', 'Virtue is good.'],
              ['Noun = Adjective', 'ὁ σοφὸς ἐλεύθερός ἐστιν.', 'The sage is free.'],
              ['Noun = Noun', 'ὁ λόγος ἡ ἀρχή ἐστιν.', 'Reason is the principle/beginning.'],
            ],
          },
        ],
        callout: {
          label: 'Philosophical note',
          text: 'The Stoic God is identified with the cosmos, with logos, and with reason itself. The sentence "ὁ κόσμος θεός ἐστιν" (The cosmos is god) is not metaphor — it is the Stoic thesis of pantheism, expressed in a single predicate nominative.',
        },
      },
      {
        heading: 'Part 2 — Key Stoic Propositions in Greek',
        body: 'The following sentences are paraphrases of actual Stoic doctrines. Parse every word and translate each one:',
        paradigms: [
          {
            title: 'Stoic Propositions — Reading Practice',
            headers: ['Greek', 'Notes'],
            rows: [
              ['ἡ ἀρετή ἀγαθόν ἐστιν.', 'ἀγαθόν: neut. sg. pred. adj. — virtue is (the) good'],
              ['ὁ σοφὸς ἐλεύθερός ἐστιν.', 'even if legally enslaved — the Epictetan thesis'],
              ['ὁ κόσμος λόγῳ κυβερνᾶται.', 'kubernātai: is steered/governed — preview of passive'],
              ['τὰ ἐκτὸς ἀδιάφορά ἐστιν.', 'ta ektos: the externals (neut. pl. with article used as noun)'],
              ['ἡ κακία μόνη κακόν ἐστιν.', 'kakia (vice) and kakon — the mirror of aretē and agathon'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '6.1',
        prompt: 'Translate and parse the predicate proposition: "ὁ σοφὸς ἐλεύθερός ἐστιν." For each word: give the form, case (if noun/adj.), and its role in the sentence.',
        answer: 'ὁ — def. art., nom. sg. masc., modifies σοφός · σοφός — adj., nom. sg. masc., subject · ἐλεύθερος — adj., nom. sg. masc., predicate adj. · ἐστιν — 3sg. pres. ind. of εἰμί, copula · Translation: "The wise man is free."',
      },
      {
        number: '6.2',
        prompt: 'Convert each attributive phrase to a predicative sentence using εἰμί: a) ὁ δίκαιος ἄνθρωπος  b) αἱ ἀγαθαὶ ψυχαί  c) ὁ ἐλεύθερος λόγος',
        answer: 'a) ὁ ἄνθρωπος δίκαιός ἐστιν. · b) αἱ ψυχαί ἀγαθαί εἰσιν. · c) ὁ λόγος ἐλεύθερός ἐστιν.',
      },
      {
        number: '6.3',
        prompt: 'Translate into Greek: a) Virtue alone is good.  b) The cosmos is rational. (use λογικός, -ή, -όν)  c) The passions are not good. (use "οὐκ" for "not")',
        answer: 'a) ἡ ἀρετή μόνη ἀγαθή ἐστιν. · b) ὁ κόσμος λογικός ἐστιν. · c) τὰ πάθη οὐκ ἀγαθά ἐστιν.',
      },
      {
        number: '6.4',
        prompt: 'Proposition Analysis — The Stoics argued that all ethical claims have logical structure. Take the proposition "ἡ ἀρετή ἀγαθόν ἐστιν" (Virtue is good). a) Is ἀγαθόν here attributive or predicative? How do you know? b) What would change grammatically if we wanted to say "the good virtue" instead? c) What is the philosophical difference between those two statements?',
        answer: 'a) Predicative — ἀγαθόν is not preceded by an article, and εἰμί is the main verb linking the two nominatives. b) ἡ ἀγαθὴ ἀρετή — article before adjective, no εἰμί needed. c) "Virtue is good" is a philosophical claim (a proposition about the nature of virtue). "The good virtue" merely describes a kind of virtue — it assumes virtue can be good or not good, which the Stoics would reject.',
      },
    ],
    quiz: [
      { question: 'In a predicate nominative construction, the predicate noun or adjective is in the:', options: ['Accusative case', 'Genitive case', 'Nominative case', 'Dative case'], correct: 2 },
      { question: 'The Stoic sentence "ὁ κόσμος θεός ἐστιν" expresses:', options: ['The view that the cosmos was created by God', 'Stoic pantheism — the cosmos itself is identified with God/logos', 'That God transcends the cosmos', 'That the cosmos is beautiful'], correct: 1 },
      { question: 'How do you distinguish a predicate adjective from an attributive adjective?', options: ['Predicate adjectives are always in the dative', 'Predicate adjectives stand outside the article-noun unit and often accompany εἰμί', 'Attributive adjectives always follow the noun', 'There is no grammatical difference'], correct: 1 },
      { question: 'The third person plural of εἰμί is:', options: ['ἐστί', 'ἐσμέν', 'εἰσί(ν)', 'εἶ'], correct: 2 },
      { question: 'In "τὰ ἐκτὸς ἀδιάφορά ἐστιν," what does τὰ ἐκτός mean?', options: ['The inner things', 'The externals (neuter plural article used substantively with an adverb)', 'The good things', 'The necessary things'], correct: 1 },
      { question: 'The mirror proposition to "ἡ ἀρετή ἀγαθόν ἐστιν" in Stoic ethics is:', options: ['ἡ ψυχή ἀγαθή ἐστιν', 'ἡ κακία κακόν ἐστιν', 'ὁ κόσμος λογικός ἐστιν', 'ἡ ἡδονή ἀγαθή ἐστιν'], correct: 1 },
      { question: 'Which sentence correctly uses the predicate position for "the souls are free"?', options: ['αἱ ψυχαί αἱ ἐλεύθεραι εἰσιν', 'αἱ ἐλεύθεραι ψυχαί εἰσιν', 'αἱ ψυχαί ἐλεύθεραί εἰσιν', 'ἐλεύθεραι αἱ ψυχαί ἐστιν'], correct: 2 },
      { question: 'The first person singular of εἰμί is:', options: ['ἐσμέν', 'εἶ', 'εἰμί', 'ἐστί'], correct: 2 },
      { question: 'Why is εἰμί called a "copula"?', options: ['Because it describes physical motion', 'Because it links (Latin: copulare) subject and predicate without describing an action', 'Because it takes an accusative object', 'Because it is always irregular'], correct: 1 },
      { question: 'The Stoic thesis that "the sage is free" (ὁ σοφὸς ἐλεύθερός ἐστιν) was radical because:', options: ['It was illegal in Athens to call a slave free', 'Epictetus — a slave — was one of its most powerful examples; freedom is inner, not a legal status', 'It contradicted Aristotle’s view that the Sage must be wealthy', 'It applied only to citizens'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'θεός, θεοῦ', transliteration: 'theos', english: 'god' },
      { greek: 'ἀρχή, ἀρχῆς', transliteration: 'archē', english: 'beginning, principle, rule' },
      { greek: 'κακία, κακίας', transliteration: 'kakia', english: 'vice, badness' },
      { greek: 'τὰ ἐκτός', transliteration: 'ta ektos', english: 'the externals' },
      { greek: 'λογικός, -ή, -όν', transliteration: 'logikos', english: 'rational' },
      { greek: 'μόνος, -η, -ον', transliteration: 'monos', english: 'alone, only' },
      { greek: 'οὐκ / οὐχ', transliteration: 'ouk / ouch', english: 'not (before vowels; οὐχ before rough breathing)' },
    ],
  },

  // ── SESSION 7 ──────────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'Prepositions & the Genitive Case',
    subtitle: 'Spatial and logical relations · ἐπί, ἐν, ἐκ, πρός, ὑπό · ephʼ hēmin preview',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Use the eight most important Greek prepositions with the correct cases',
      'Recognize that Greek prepositions can take different cases with different meanings',
      'Understand the genitive of possession and the partitive genitive',
      'Parse the preposition in ἐφʼ ἡμῖν — the Stoic formula — and explain its grammar',
    ],
    parts: [
      {
        heading: 'Part 1 — Prepositions and Case Government',
        body: 'Greek prepositions govern specific cases — they "take" a genitive, dative, or accusative, and sometimes different cases produce different meanings. This is not arbitrary: the cases encode spatial and logical relationships, and the preposition refines that relationship.',
        paradigms: [
          {
            title: 'Essential Prepositions',
            headers: ['Preposition', 'With Genitive', 'With Dative', 'With Accusative'],
            rows: [
              ['ἐπί', 'on, upon, at the time of', 'on, upon (position)', 'onto, against, toward'],
              ['ἐν', '— (not used)', 'in, within, among', '— (not used)'],
              ['ἐκ/ἐξ', 'out of, from', '— (not used)', '— (not used)'],
              ['πρός', 'from (the side of)', 'at, near', 'toward, to, in relation to'],
              ['ὑπό', 'by (agent in passive)', 'under', 'under (motion), by'],
              ['κατά', 'down from, against', '— (not used)', 'according to, throughout'],
              ['περί', 'concerning, about', 'around', 'around (motion)'],
              ['σύν', '— (not used)', 'together with', '— (not used)'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — ἐφʼ ἡμῖν: The Stoic Formula Unpacked',
        body: 'The phrase ἐφʼ ἡμῖν (eph’ hēmin) means "up to us" or "in our power." It is the most important prepositional phrase in Stoic ethics. Session 1 asked you to notice it; now you can parse it completely. ἐπί is the preposition (normally + gen., dat., or acc.). ἡμῖν is the dative plural of ἡμεῖς (we/us) — "to/for us / in our case." ἐπί + dative here expresses position or location — "dependent on us," "in our domain." Elision: ἐπί + rough breathing (ἡ-) → ἐφʼ (the π becomes φ before the h-sound).',
        callout: {
          label: 'The full Encheiridion §1 opening',
          text: 'Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν. You now have all the grammar needed to parse this except τῶν ὄντων (which you will learn in Session 14 — present participle genitive plural). The structure is: "Of the things that exist, some are up to us, others are not up to us."',
        },
      },
      {
        heading: 'Part 3 — The Genitive Case Extended',
        body: 'The genitive case has several uses beyond the prepositions that take it. The most important for philosophical Greek:',
        paradigms: [
          {
            title: 'Genitive Uses',
            headers: ['Use', 'Greek Example', 'Translation'],
            rows: [
              ['Possession', 'ἡ ψυχή τοῦ σοφοῦ', 'the soul of the wise man'],
              ['Partitive', 'τὰ μέν ἐστιν ἐφʼ ἡμῖν', 'some (of the things) are up to us'],
              ['Genitive absolute', 'τοῦ σοφοῦ λέγοντος', '(with/while) the wise man speaking'],
              ['With prepositions', 'ἐκ τῆς ψυχῆς', 'out of the soul'],
              ['Objective genitive', 'ἡ τῆς ἀρετῆς ἄσκησις', 'the practice of virtue'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '7.1',
        prompt: 'Parse the preposition + case in each phrase and translate: a) ἐν τῇ ψυχῇ  b) ἐκ τοῦ κόσμου  c) πρὸς τὴν ἀλήθειαν  d) κατὰ φύσιν  e) ὑπὸ τοῦ λόγου',
        answer: 'a) ἐν + dat. — "in the soul" · b) ἐκ + gen. — "out of the cosmos" · c) πρός + acc. — "toward truth" · d) κατά + acc. — "according to nature" · e) ὑπό + gen. — "by reason" (agent)',
      },
      {
        number: '7.2',
        prompt: 'Fully parse ἐφʼ ἡμῖν: identify the preposition, the form it takes, why elision occurs, and translate the phrase.',
        answer: 'ἐπί (prep.) + ἡμῖν (dat. pl. of ἡμεῖς) — ἐπί + dative = "on, at, in the power of." Elision: ἐπί before rough breathing (ἡ) → ἐφʼ (π → φ before h-sound). Translation: "up to us / in our power."',
      },
      {
        number: '7.3',
        prompt: 'Translate into Greek using prepositions from Part 1: a) I pursue virtue according to nature.  b) The logos is in the soul.  c) The sage acts out of virtue.',
        answer: 'a) ἀρετήν διώκω κατὰ φύσιν. · b) ὁ λόγος ἐν τῇ ψυχῇ ἐστιν. · c) ὁ σοφὸς ἐξ ἀρετῆς πράττει.',
      },
      {
        number: '7.4',
        prompt: 'Encheiridion §1 Partial Parse — Write out the Encheiridion §1 opening: "Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν." For each word you have now learned, give the grammatical form. Mark with [?] any word you cannot yet parse. Translate as much as you can.',
        answer: 'Τῶν [gen. pl. of ὁ/ἡ/τό — partitive gen., "of the things"] · ὄντων [?] · τά [nom. pl. neut. art.] · μέν [particle, "on the one hand"] · ἐστιν [3sg. εἰμί] · ἐφʿ [ἐπί + elision] · ἡμῖν [dat. pl. of ἡμεῖς] · τά [nom. pl. neut. art.] · δέ [particle, "on the other hand"] · οὐκ [negation] · ἐφʿ ἡμῖν. Full parse of ὄντων in Session 14.',
      },
    ],
    quiz: [
      { question: 'The preposition ἐν only takes which case?', options: ['Genitive only', 'Dative only', 'Accusative only', 'Genitive and dative'], correct: 1 },
      { question: 'The phrase ἐφʼ ἡμῖν consists of:', options: ['ἐπί + nominative', 'ἐκ + dative', 'ἐπί + dative (with elision before rough breathing)', 'πρός + genitive'], correct: 2 },
      { question: 'In the phrase κατὰ φύσιν (according to nature), κατά takes the:', options: ['Genitive', 'Dative', 'Accusative', 'Nominative'], correct: 2 },
      { question: 'The genitive in "ἡ ψυχή τοῦ σοφοῦ" is:', options: ['Genitive absolute', 'Objective genitive', 'Genitive of possession — "the soul of the wise man"', 'Partitive genitive'], correct: 2 },
      { question: 'When ἐπί is followed by a rough breathing, the π changes to φ. This process is called:', options: ['Assimilation', 'Elision', 'Crasis', 'Syncope'], correct: 0 },
      { question: 'The preposition ὑπό + genitive expresses:', options: ['Location below', 'Movement under', 'Agency — "by" the agent in a passive construction', 'Accompaniment'], correct: 2 },
      { question: 'The phrase ἡ τῆς ἀρετῆς ἄσκησις uses the genitive as:', options: ['Possessive genitive', 'Objective genitive — "the practice of virtue" (virtue is what is practiced)', 'Partitive genitive', 'Genitive absolute'], correct: 1 },
      { question: 'ἐκ + genitive means:', options: ['Into', 'Out of / from', 'Toward', 'With'], correct: 1 },
      { question: 'The Stoic formula ἐφʼ ἡμῖν is significant because:', options: ['It is the Stoic name for the cosmos', 'It marks the boundary between what is in our power (virtue, assent) and what is not (externals)', 'It refers to the Stoic political community', 'It describes the movement of pneuma through the body'], correct: 1 },
      { question: 'The preposition σύν always takes the:', options: ['Genitive', 'Accusative', 'Dative', 'Nominative'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'ἐπί (+ gen./dat./acc.)', transliteration: 'epi', english: 'on, upon, in the power of' },
      { greek: 'ἐν (+ dat.)', transliteration: 'en', english: 'in, within, among' },
      { greek: 'ἐκ / ἐξ (+ gen.)', transliteration: 'ek / ex', english: 'out of, from' },
      { greek: 'πρός (+ acc./dat./gen.)', transliteration: 'pros', english: 'toward, at, in relation to' },
      { greek: 'ὑπό (+ gen./dat./acc.)', transliteration: 'hypo', english: 'by (agent); under' },
      { greek: 'κατά (+ acc./gen.)', transliteration: 'kata', english: 'according to; down from' },
      { greek: 'περί (+ gen./dat./acc.)', transliteration: 'peri', english: 'concerning, around' },
      { greek: 'σύν (+ dat.)', transliteration: 'syn', english: 'together with' },
    ],
  },

  // ── SESSION 8 ──────────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'The Dative Case',
    subtitle: 'Indirect object, possession, means · σύν and ἐν · Stoic dative patterns',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Identify and produce the dative in all three genders across first and second declension',
      'Use the dative for indirect object, possession, means/instrument, and manner',
      'Recognize the dative in prepositional phrases (ἐν, σύν, ἐπί + dative)',
      'Parse the dative in several key Stoic phrases',
    ],
    parts: [
      {
        heading: 'Part 1 — Dative Uses',
        body: 'The dative case does several jobs that in English require prepositions. Learning to recognize them is essential for reading Greek prose.',
        paradigms: [
          {
            title: 'Dative Uses',
            headers: ['Use', 'Greek Example', 'Literal', 'Natural English'],
            rows: [
              ['Indirect Object', 'λέγω σοι τὴν ἀλήθειαν.', 'I say to you the truth.', 'I tell you the truth.'],
              ['Dative of Possession', 'ἔστι μοι ψυχή.', 'There is to me a soul.', 'I have a soul.'],
              ['Dative of Means', 'λόγῳ κυβερνᾶται.', 'It is steered by reason.', 'It is governed by/with reason.'],
              ['Dative of Manner', 'σπουδῇ ἀσκεῖ.', 'He practices with zeal.', 'He practices zealously.'],
              ['Dative of Association', 'σὺν ἀρετῇ ζῇ.', 'He lives with virtue.', 'He lives virtuously.'],
            ],
          },
        ],
        callout: {
          label: 'Dative of possession',
          text: 'Greek often expresses "I have X" as "X exists to me" — ἔστι μοι. Philosophers use this construction constantly: "ἔστι μοι ψυχή" = "I have a soul." It frames possession differently than English — the thing is primary; the person is secondary.',
        },
      },
      {
        heading: 'Part 2 — Dative Forms Review',
        body: 'A consolidated reference table of the dative endings across genders. These should be memorized.',
        paradigms: [
          {
            title: 'Dative Singular and Plural — Summary',
            headers: ['Declension / Gender', 'Singular', 'Plural'],
            rows: [
              ['1st (fem.) — ψυχή', 'ψυχῇ', 'ψυχαῖς'],
              ['2nd (masc.) — λόγος', 'λόγῳ', 'λόγοις'],
              ['2nd (neut.) — ἔργον', 'ἔργῳ', 'ἔργοις'],
              ['Article fem.', 'τῇ', 'ταῖς'],
              ['Article masc./neut.', 'τῷ', 'τοῖς'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '8.1',
        prompt: 'Identify the dative use in each sentence and translate: a) λέγω σοι τὴν ἀλήθειαν.  b) ὁ κόσμος λόγῳ κυβερνᾶται.  c) ἔστι τῷ σοφῷ ἀρετή.  d) σπουδῇ τὴν φιλοσοφίαν ἀσκοῦμεν.',
        answer: 'a) Indirect object — "I tell you the truth." · b) Dative of means — "The cosmos is governed by reason." · c) Dative of possession — "The wise man has virtue." (lit. "Virtue belongs to the wise man.") · d) Dative of manner — "We practice philosophy zealously."',
      },
      {
        number: '8.2',
        prompt: 'Convert each English sentence to Greek using the dative: a) I have a soul. [dative of possession]  b) She practices with virtue. [σύν + dative]  c) We speak to the philosopher. [indirect object]',
        answer: 'a) ἔστι μοι ψυχή. · b) σὺν ἀρετῇ ἀσκεῖ. · c) λέγομεν τῷ φιλοσόφῳ.',
      },
      {
        number: '8.3',
        prompt: 'Stoic Datives — Parse every dative in the following passage (a paraphrase of Stoic doctrine): "ὁ σοφὸς λόγῳ καὶ ἀρετῇ ζῇ. ἔστιν αὐτῷ ἐλευθερία καὶ εὐδαιμονία. σὺν τῇ φύσει πράττει." For each dative: give the case use, the noun’s dictionary form, and its meaning.',
        answer: 'λόγῳ — dat. means, λόγος, "by/with reason" · ἀρετῇ — dat. means/association, ἀρετή, "by/with virtue" · αὐτῷ — dat. possession, αὐτός (pronoun, 3sg. masc.), "he has" · τῇ φύσει — dat. with σύν (prep.), φύσις, "with nature" — note: φύσις is 3rd decl. (preview)',
      },
    ],
    quiz: [
      { question: 'The dative of possession is expressed in Greek as:', options: ['The noun in the genitive following the verb "have"', '"Exists to [person]" — ἔστι + dative', 'The accusative with a special possessive verb', 'The nominative of the possessed thing'], correct: 1 },
      { question: 'In "ὁ κόσμος λόγῳ κυβερνᾶται," the dative λόγῳ expresses:', options: ['The indirect object', 'The manner of governing', 'The means or instrument — "by reason"', 'Possession'], correct: 2 },
      { question: 'The dative singular feminine article is:', options: ['τήν', 'τῇ', 'τῆς', 'τῶν'], correct: 1 },
      { question: 'The preposition σύν takes which case?', options: ['Genitive', 'Accusative', 'Dative', 'Nominative'], correct: 2 },
      { question: 'The dative of manner in "σπουδῇ ἀσκεῖ" means:', options: ['He practices with a student', 'He practices zealously / with zeal', 'He practices for zeal’s sake', 'Zeal practices with him'], correct: 1 },
      { question: 'The dative plural of ψυχή is:', options: ['ψυχῶν', 'ψυχήν', 'ψυχαῖς', 'ψυχῇ'], correct: 2 },
      { question: 'Why does Greek use the dative of possession ("X exists to me") rather than a direct verb "to have"?', options: ['Greek has no verb meaning "to have"', 'The dative construction is shorter', 'It reflects a different conceptual framing — the thing is primary, the person secondary; possession is a relationship', 'It is only used in poetry'], correct: 2 },
      { question: 'In "λέγω σοι τὴν ἀλήθειαν," σοι is:', options: ['Dative of means', 'Dative of manner', 'Indirect object — "to you"', 'Dative of possession'], correct: 2 },
      { question: 'The dative plural of λόγος is:', options: ['λόγους', 'λόγοις', 'λόγων', 'λόγῳ'], correct: 1 },
      { question: 'The Stoic phrase "κατὰ φύσιν ζῆν" (to live according to nature) uses κατά + accusative. If you wanted instead to say "to live with nature" using σύν, what case would φύσις take?', options: ['Genitive: σὺν τῆς φύσεως', 'Dative: σὺν τῇ φύσει', 'Accusative: σὺν τὴν φύσιν', 'Nominative: σὺν ἡ φύσις'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'σοι', transliteration: 'soi', english: 'to you (dat. sg. of σύ)' },
      { greek: 'μοι', transliteration: 'moi', english: 'to me (dat. sg. of ἐγώ)' },
      { greek: 'αὐτῷ', transliteration: 'autōi', english: 'to him / for him (dat. sg. of αὐτός)' },
      { greek: 'σπουδή, σπουδῆς', transliteration: 'spoudē', english: 'zeal, eagerness' },
      { greek: 'εὐδαιμονία, εὐδαιμονίας', transliteration: 'eudaimonia', english: 'flourishing, happiness' },
      { greek: 'ἐλευθερία, ἐλευθερίας', transliteration: 'eleutheria', english: 'freedom' },
      { greek: 'ζῶ / ζῇ', transliteration: 'zō / zēi', english: 'I live / he-she lives' },
      { greek: 'πράττω', transliteration: 'prattō', english: 'I do, act, accomplish' },
    ],
  },

  // ── SESSION 9 ──────────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'The Accusative & Direct Object',
    subtitle: 'Transitive verbs · Motion · Extent · τὰ ἐφʼ ἡμῖν as accusative target',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Use the accusative correctly as the direct object of transitive verbs',
      'Recognize the accusative of extent (space and time)',
      'Identify accusative uses with prepositions (εἰς, πρός, κατά, ἐπί + acc.)',
      'Translate complete subject-verb-object sentences with all three genders',
    ],
    parts: [
      {
        heading: 'Part 1 — Accusative Uses',
        body: 'The accusative is the case of the direct object — the noun that receives the action of a transitive verb. It also expresses extent (of space or time), motion toward, and serves as the subject of an infinitive in indirect speech constructions.',
        paradigms: [
          {
            title: 'Accusative Uses',
            headers: ['Use', 'Greek Example', 'Translation'],
            rows: [
              ['Direct Object', 'διώκω τὴν ἀρετήν.', 'I pursue virtue.'],
              ['Accusative of Extent', 'τρεῖς ἡμέρας μένει.', 'He remains for three days.'],
              ['With εἰς (motion to)', 'εἰς τὸν κόσμον βλέπει.', 'He looks into/toward the cosmos.'],
              ['With πρός (toward)', 'πρὸς τὴν ἀλήθειαν ζητεῖ.', 'He seeks toward truth.'],
              ['With κατά (according)', 'κατὰ φύσιν πράττει.', 'He acts according to nature.'],
              ['Accusative subject of inf.', 'λέγει τὸν σοφὸν ἐλεύθερον εἶναι.', 'He says that the sage is free.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Accusative Forms Review',
        body: 'A consolidated reference table of the accusative endings across genders.',
        paradigms: [
          {
            title: 'Accusative Singular and Plural — Summary',
            headers: ['Declension / Gender', 'Singular', 'Plural'],
            rows: [
              ['1st (fem.) — ψυχή', 'ψυχήν', 'ψυχάς'],
              ['2nd (masc.) — λόγος', 'λόγον', 'λόγους'],
              ['2nd (neut.) — ἔργον', 'ἔργον', 'ἔργα'],
              ['Article fem.', 'τήν', 'τάς'],
              ['Article masc.', 'τόν', 'τούς'],
              ['Article neut.', 'τό', 'τά'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '9.1',
        prompt: 'Identify the case of each underlined form and its function. Translate the full sentence: a) ὁ φιλόσοφος διώκει τὴν ἀρετήν.  b) πρὸς τὸν κόσμον βλέπομεν.  c) κατὰ φύσιν ζῇ ὁ σοφός.  d) λέγει τὸν νοῦν ἐλεύθερον εἶναι.',
        answer: 'a) ἀρετήν — acc. sg. fem., direct object — "The philosopher pursues virtue." · b) κόσμον — acc. sg. masc. with πρός — "We look toward the cosmos." · c) φύσιν — acc. sg. with κατά — "The wise man lives according to nature." · d) νοῦν — acc. sg. masc., subject of inf. — "He says that the mind is free."',
      },
      {
        number: '9.2',
        prompt: 'Build sentences. Use a transitive verb and put the noun in the accusative: a) The sage seeks (ζητεῖ) truth.  b) We practice (ἀσκοῦμεν) philosophy.  c) I pursue (διώκω) virtue alone.',
        answer: 'a) ὁ σοφὸς ζητεῖ τὴν ἀλήθειαν. · b) ἀσκοῦμεν τὴν φιλοσοφίαν. · c) μόνην τὴν ἀρετὴν διώκω.',
      },
      {
        number: '9.3',
        prompt: 'Full Parse: Encheiridion §1 (Nearly Complete) — Write out: "Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν." You now have all the grammar except one word (ὄντων). Parse everything else and attempt a complete translation. Identify what ὄντων might be given its context.',
        answer: 'Τῶν — gen. pl. (partitive) of the article (τό) · ὄντων — gen. pl. of participle of εἰμί — "of the things existing/that exist" [Session 14] · τά — nom. pl. neut. article · μέν — particle ("on the one hand") · ἐστιν — 3sg. pres. εἰμί · ἐφʿ — ἐπί + elision · ἡμῖν — dat. pl. of ἡμεῖς · τά — nom. pl. neut. · δέ — particle ("but/on the other hand") · οὐκ — negation · Full translation: "Of the things that exist, some are up to us, others are not up to us."',
      },
    ],
    quiz: [
      { question: 'The accusative case primarily marks:', options: ['The subject of the sentence', 'The direct object of a transitive verb', 'The indirect object', 'Possession'], correct: 1 },
      { question: 'The accusative singular masculine article is:', options: ['τῷ', 'τόν', 'τοῦ', 'τό'], correct: 1 },
      { question: 'In "κατὰ φύσιν πράττει," the accusative φύσιν follows κατά meaning:', options: ['Out of nature', 'Against nature', 'According to nature', 'Into nature'], correct: 2 },
      { question: 'The neuter accusative plural of ἔργον is:', options: ['ἔργους', 'ἔργων', 'ἔργοις', 'ἔργα'], correct: 3 },
      { question: 'The "accusative subject of infinitive" construction in "λέγει τὸν σοφὸν ἐλεύθερον εἶναι" means:', options: ['The sage says freedom.', 'He says that the sage is free. (τόν σοφόν is the subject of the infinitive εἶναι)', 'He says freedom to the sage.', 'The free sage says something.'], correct: 1 },
      { question: 'The accusative of extent in "τρεῖς ἡμέρας μένει" expresses:', options: ['Direction of movement', 'How long he remains — a duration of time', 'Where he remains', 'Why he remains'], correct: 1 },
      { question: 'The preposition εἰς takes which case?', options: ['Genitive', 'Dative', 'Accusative', 'Nominative'], correct: 2 },
      { question: 'In "ὁ φιλόσοφος διώκει τὴν ἀρετήν," what determines that ὁ φιλόσοφος is the subject and not τήν ἀρετήν?', options: ['Word order — subject must come first', 'The nominative case of ὁ φιλόσοφος vs. the accusative τήν ἀρετήν', 'The definite article on both nouns', 'The verb ending -ει'], correct: 1 },
      { question: 'The accusative feminine plural of ψυχή is:', options: ['ψυχαί', 'ψυχῶν', 'ψυχάς', 'ψυχαῖς'], correct: 2 },
      { question: 'After studying Sessions 7–9, you can now parse most of Encheiridion §1. The only word you cannot fully parse yet is ὄντων. Based on context, ὄντων is likely:', options: ['A first declension noun', 'A present participle of εἰμί in the genitive plural — "of the things that exist"', 'A second declension adjective', 'A verb form in the imperfect tense'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'εἰς (+ acc.)', transliteration: 'eis', english: 'into, to, toward' },
      { greek: 'βλέπω', transliteration: 'blepō', english: 'I look, see' },
      { greek: 'μένω', transliteration: 'menō', english: 'I remain, stay' },
      { greek: 'εἶναι', transliteration: 'einai', english: 'to be (infinitive of εἰμί)' },
      { greek: 'φιλοσοφία, φιλοσοφίας', transliteration: 'philosophia', english: 'philosophy' },
      { greek: 'φιλόσοφος, φιλοσόφου', transliteration: 'philosophos', english: 'philosopher' },
      { greek: 'ἡμέρα, ἡμέρας', transliteration: 'hēmera', english: 'day' },
      { greek: 'τρεῖς', transliteration: 'treis', english: 'three' },
    ],
  },

  // ── SESSION 10 — MILESTONE ─────────────────────────────────────────────────
  {
    id: 10,
    title: 'MILESTONE — Encheiridion §1: First Reading',
    subtitle: 'Synthesis of Sessions 1–9 · First unaided reading of Epictetus in Greek',
    isMilestone: true,
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Read and translate Encheiridion §1 (first three sentences) with minimal support',
      'Parse every word in the passage — case, form, and function',
      'Explain the philosophical significance of each key term in context',
      'Identify one grammatical form (ὄντων) that will be fully explained in Session 14',
    ],
    parts: [
      {
        heading: 'Milestone Session — Synthesis, Not New Grammar',
        body: 'This session is a synthesis, not a new grammar lesson. No new paradigms are introduced. Everything you need to parse and translate Encheiridion §1 has been taught in Sessions 1–9. The goal is to attempt a sustained reading of primary Stoic text — imperfectly, but in the original Greek.',
        callout: {
          label: 'The Text — Epictetus, Encheiridion §1',
          text: 'Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν. ἐφʿ ἡμῖν μὲν ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις, καὶ ἁπλῶς ὅσα ἡμέτερα ἔργα· οὐκ ἐφʿ ἡμῖν δὲ σῶμα, κτῆσις, δόξα, ἀρχή, καὶ ἁπλῶς ὅσα οὐχ ἡμέτερα ἔργα.',
        },
      },
      {
        heading: 'Sentence 1 — Word-by-Word Parse',
        body: 'Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν. Work through each word. For every word: give the grammatical form, the lexical entry, and the meaning in context.',
        paradigms: [
          {
            title: 'Sentence 1 Parse',
            headers: ['Word', 'Form', 'Dictionary Entry', 'Meaning in Context'],
            rows: [
              ['Τῶν', 'Gen. pl. masc./neut. article', 'ὁ/ἡ/τό', 'Of [the things] — partitive genitive'],
              ['ὄντων', 'Gen. pl. pres. ptcpl. of εἰμί', 'εἰμί', 'Of the things that exist — Session 14'],
              ['τά', 'Nom. pl. neut. article', 'ὁ/ἡ/τό', 'Some [things] — with μέν, partitive'],
              ['μέν', 'Particle (contrast: μέν...δέ)', 'μέν', 'On the one hand / some'],
              ['ἐστιν', '3sg. pres. ind. of εἰμί', 'εἰμί', 'are / is'],
              ['ἐφʿ', 'ἐπί + elision (rough breathing)', 'ἐπί', 'upon / in the power of'],
              ['ἡμῖν', 'Dat. pl. of ἡμεῖς (1st pers. pron.)', 'ἡμεῖς', 'us / to us / in our case'],
              ['τά', 'Nom. pl. neut. article', 'ὁ/ἡ/τό', 'Others [things]'],
              ['δέ', 'Particle (contrast with μέν)', 'δέ', 'But / on the other hand'],
              ['οὐκ', 'Negation (before smooth breathing)', 'οὐ', 'not'],
              ['ἐφʿ ἡμῖν', 'Repeated prepositional phrase', '—', 'up to us (same as above)'],
            ],
          },
        ],
        callout: {
          label: 'Translation of Sentence 1',
          text: 'Of the things that exist, some are up to us, others are not up to us.',
        },
      },
      {
        heading: 'Sentence 2 — Vocabulary & Parse',
        body: 'ἐφʿ ἡμῖν μὲν ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις, καὶ ἁπλῶς ὅσα ἡμέτερα ἔργα·',
        paradigms: [
          {
            title: 'Sentence 2 Vocabulary',
            headers: ['Word', 'Form', 'English'],
            rows: [
              ['ὑπόληψις', 'Nom. sg. fem. — 3rd decl. (Session 13)', 'judgement, opinion (what we think about impressions)'],
              ['ὁρμή', 'Nom. sg. fem. — 1st decl.', 'impulse, drive (the movement toward action)'],
              ['ὄρεξις', 'Nom. sg. fem. — 3rd decl.', 'desire, appetite (reaching out toward what seems good)'],
              ['ἔκκλισις', 'Nom. sg. fem. — 3rd decl.', 'aversion, avoidance (the negative counterpart to desire)'],
              ['ἁπλῶς', 'Adverb', 'simply, in a word (rhetorical summation)'],
              ['ὅσα', 'Nom./acc. pl. neut. of ὅσος (rel. pron.)', 'as many as, whatever — "all that"'],
              ['ἡμέτερα', 'Nom./acc. pl. neut. of ἡμέτερος (adj.)', 'our own — ἡμέτερα ἔργα = our own works/deeds/functions'],
              ['ἔργα', 'Nom. pl. neut. — 2nd decl. — ἔργον', 'deeds, functions, works (neut. pl. nom. = neut. pl. acc.)'],
            ],
          },
        ],
        callout: {
          label: 'Translation of Sentence 2 + Philosophical Note',
          text: '"Up to us are: judgement, impulse, desire, aversion — and in a word, whatever are our own functions." The four things Epictetus lists — ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις — are the four acts of the hēgemonikon (ruling faculty). Judgement and desire are directed at what seems good; impulse and aversion produce action. Epictetus’s claim: these alone are up to us. Everything else follows.',
        },
      },
      {
        heading: 'Sentence 3 — Vocabulary & Parse',
        body: 'οὐκ ἐφʿ ἡμῖν δὲ σῶμα, κτῆσις, δόξα, ἀρχή, καὶ ἁπλῶς ὅσα οὐχ ἡμέτερα ἔργα.',
        paradigms: [
          {
            title: 'Sentence 3 Vocabulary',
            headers: ['Word', 'Form', 'English', 'Philosophical Note'],
            rows: [
              ['σῶμα', 'Nom. sg. neut. — 3rd decl.', 'body', 'The body — health, beauty, strength — all externals'],
              ['κτῆσις', 'Nom. sg. fem. — 3rd decl.', 'property, possessions', 'Wealth and material goods — not ephʼ hēmin'],
              ['δόξα', 'Nom. sg. fem. — 1st decl.', 'reputation, glory, opinion', 'What others think of you — external, uncontrollable'],
              ['ἀρχή', 'Nom. sg. fem. — 1st decl.', 'office, rule, beginning', 'Political power — Seneca and Marcus both tested this'],
              ['οὐχ', 'Negation before rough breathing', 'not (οὐ + rough breathing → οὐχ)', 'Phonological variation of οὐ'],
            ],
          },
        ],
        callout: {
          label: 'Translation of Sentence 3 + Full Passage',
          text: '"Not up to us are: body, property, reputation, political office — and in a word, whatever are not our own functions." Full translation: "Of the things that exist, some are up to us, others are not up to us. Up to us are judgement, impulse, desire, aversion — and in a word, whatever are our own functions. Not up to us are body, property, reputation, political office — and in a word, whatever are not our own functions."',
        },
      },
    ],
    exercises: [
      {
        number: '10.1',
        prompt: 'Close Reading — Epictetus lists four things that are "up to us": ὑπόληψις (judgement), ὁρμή (impulse), ὄρεξις (desire), ἔκκλισις (aversion). a) What do these four things have in common — what is the general category Epictetus is pointing to? b) He lists four things "not up to us": σῶμα, κτῆσις, δόξα, ἀρχή. What do these have in common? c) Is this distinction intuitive or counterintuitive? What resists it?',
        answer: 'a) All four are activities of the rational soul — the hēgemonikon. They are internal, psychological acts over which the agent has (in principle) direct authority. b) All are external to the soul — body states, economic status, reputation, political power. They depend on circumstances outside the agent’s rational control. c) The distinction is counterintuitive because we usually think of our body as "us." What resists it: the strong identification most people have with their physical condition, status, and what others think of them.',
      },
      {
        number: '10.2',
        prompt: 'Grammar Audit — List every word in §1 that you parsed correctly without the answer key. List every word you needed help with. Which grammatical forms do you most need to review before Session 11?',
        answer: '[Open — personal audit. Common difficulties: ὄντων (participle — Session 14), ὑπόληψις/ὄρεξις/ἔκκλισις (3rd declension — Session 13), the correlative pronoun ὅσα. This exercise calibrates the student’s own understanding.]',
      },
      {
        number: '10.3',
        prompt: 'Memorization — Memorize the first sentence: "Τῶν ὄντων τὰ μέν ἐστιν ἐφʿ ἡμῖν, τὰ δὲ οὐκ ἐφʿ ἡμῖν." Write it out from memory three times. Then write the English translation from memory. This sentence should become automatic — it is the key to the course.',
        answer: '[Drill exercise — no single answer. The sentence should be committed to memory by end of Session 10. Students report it in Session 11 from memory without prompting.]',
      },
      {
        number: '10.4',
        prompt: 'Philosophical Application — Epictetus wrote Encheiridion §1 as a slave. His master Epaphroditus had physically tortured him. Write 150–200 words on how this biographical fact changes (or doesn’t change) your reading of ἐφʿ ἡμῖν. Is the claim more or less credible given who wrote it?',
        answer: '[Open response. Expected engagement: The biography lends the text a weight that abstract philosophical propositions lack. Epictetus is not claiming that suffering doesn’t exist — he is claiming that what is "up to us" remains intact regardless. Counter-consideration: does the victim of extreme violence truly retain inner freedom? The Proctor should probe this hard.]',
      },
    ],
    quiz: [
      { question: 'The opening words "Τῶν ὄντων" use a genitive that is:', options: ['Genitive of possession', 'Partitive genitive — "of the things [that exist], some..."', 'Genitive absolute', 'Objective genitive'], correct: 1 },
      { question: 'The μέν...δέ construction in §1 signals:', options: ['Negation', 'A question and answer', 'A contrast — "on the one hand...on the other"', 'A temporal sequence'], correct: 2 },
      { question: 'The word ὄντων (which you cannot yet fully parse) is flagged as:', options: ['An irregular 2nd declension noun', 'A present participle of εἰμί in the genitive plural — "of the things that exist"', 'A 1st declension adjective', 'A perfect tense verb form'], correct: 1 },
      { question: 'The four things Epictetus lists as ἐφʼ ἡμῖν are:', options: ['Body, property, reputation, office', 'Cosmos, logos, nature, virtue', 'Judgement, impulse, desire, aversion', 'Wisdom, justice, courage, moderation'], correct: 2 },
      { question: 'The elision in ἐφʿ ἡμῖν produces φ instead of π because:', options: ['Phi is easier to pronounce than pi', 'Pi becomes phi before a rough breathing — a process of aspiration assimilation', 'It is an irregular form of ἐπί', 'The ι in ἡμῖν triggers the change'], correct: 1 },
      { question: 'The phrase ἡμέτερα ἔργα means:', options: ['The good deeds', 'Our own functions / what belongs to us', 'The things we fear', 'The things the sage desires'], correct: 1 },
      { question: 'Why is δόξα (reputation) listed among things NOT up to us?', options: ['Because reputation is unimportant', 'Because what others think of us is formed in their minds, not ours — we cannot directly control it', 'Because the Stoics thought reputation was bad', 'Because Epictetus personally had a bad reputation'], correct: 1 },
      { question: 'The negation οὐχ (instead of οὐκ) in Sentence 3 appears because:', options: ['It is a different word with a different meaning', 'Οὐ changes to οὐχ before a rough breathing (ἡ-)', 'It indicates a stronger negation', 'It is an error in the text'], correct: 1 },
      { question: 'The word ὁρμή (impulse, drive) is philosophically connected to which Stoic concept?', options: ['The indifferents (adiaphora)', 'The impulse toward action — hormē is what produces movement from assent, the causal chain from impression to deed', 'The Sage’s knowledge', 'The physical constitution of pneuma'], correct: 1 },
      { question: 'Having completed Session 10, a student has successfully read:', options: ['A summary of Epictetus’s philosophy', 'The first sentence of the Encheiridion in English translation', 'The first three sentences of the Encheiridion in the original Greek, with full parsing', 'All 53 sections of the Encheiridion'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'ὑπόληψις, ὑπολήψεως', transliteration: 'hypolēpsis', english: 'judgement, supposition' },
      { greek: 'ὁρμή, ὁρμῆς', transliteration: 'hormē', english: 'impulse, drive' },
      { greek: 'ὄρεξις, ὀρέξεως', transliteration: 'orexis', english: 'desire, appetite' },
      { greek: 'ἔκκλισις, ἐκκλίσεως', transliteration: 'ekklisis', english: 'aversion, avoidance' },
      { greek: 'σῶμα, σώματος', transliteration: 'sōma', english: 'body' },
      { greek: 'κτῆσις, κτήσεως', transliteration: 'ktēsis', english: 'property, acquisition' },
      { greek: 'δόξα, δόξης', transliteration: 'doxa', english: 'reputation, glory, opinion' },
      { greek: 'ἀρχή, ἀρχῆς', transliteration: 'archē', english: 'rule, office, beginning' },
      { greek: 'ἡμέτερος, -α, -ον', transliteration: 'hēmeteros', english: 'our (own)' },
      { greek: 'ἁπλῶς', transliteration: 'haplōs', english: 'simply, in a word' },
      { greek: 'ὅσος, -η, -ον', transliteration: 'hosos', english: 'as many/much as, whatever' },
      { greek: 'μέν ... δέ', transliteration: 'men ... de', english: 'on the one hand ... on the other' },
    ],
  },

  // ── SESSION 11 ─────────────────────────────────────────────────────────────
  {
    id: 11,
    title: 'Present Middle & Passive Voice',
    subtitle: 'Reflexive action, passive constructions, and the grammar of self-governance',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Recognize and produce present middle/passive endings in all persons and numbers',
      'Distinguish middle from passive meaning using context',
      'Understand the philosophical significance of middle-voice verbs in Stoic texts',
      'Read and parse ἐπιμελέομαι, σκέπτομαι, and κρίνομαι in context',
    ],
    parts: [
      {
        heading: 'Part 1 — The Middle Voice: Acting on Yourself',
        body: 'Greek has three voices where English has two. The active voice describes the subject doing something to an object — “the teacher instructs the student.” The passive describes the subject receiving an action — “the student is instructed.” The middle voice, unique to Greek, describes the subject acting upon themselves, for themselves, or with special interest in the action.\n\nFor the Stoics, the middle voice carries philosophical weight. The verb ἐπιμελέομαι (to care for oneself) is inherently middle — the caring loops back to the subject. The same is true of σκέπτομαι (to examine oneself/things for oneself) and κρίνομαι (to judge for oneself). These are not passive constructions. They are grammatically active verbs that foreground the self as the site of the action.\n\nEpictetus builds much of his practical ethics on middle-voice assumptions. When he says “examine your impressions,” the verb is middle — you are the agent and the object is within your own faculty of judgment.',
        paradigms: [
          {
            title: 'The Three Voices',
            headers: ['Voice', 'Meaning', 'Greek Example', 'English'],
            rows: [
              ['Active', 'Subject acts on other', 'λύω', 'I release (something)'],
              ['Middle', 'Subject acts for/on self', 'λύομαι', 'I release (myself / for myself)'],
              ['Passive', 'Subject receives action', 'λύομαι*', 'I am released'],
            ],
          },
        ],
        callout: {
          text: '*The present middle and passive are identical in form. Context determines meaning.',
        },
      },
      {
        heading: 'Part 2 — Present Middle/Passive Endings',
        body: 'The middle/passive endings replace the active endings you learned in Session 4. The stem is unchanged; only the endings differ.',
        paradigms: [
          {
            title: 'Present Middle/Passive Endings of λύω',
            headers: ['Person', 'Active (review)', 'Middle/Passive', 'Translation (middle)'],
            rows: [
              ['1st sg.', 'λύ-ω', 'λύ-ομαι', 'I release (myself)'],
              ['2nd sg.', 'λύ-εις', 'λύ-ῃ / λύ-ει', 'you release (yourself)'],
              ['3rd sg.', 'λύ-ει', 'λύ-εται', 'he/she releases (himself)'],
              ['1st pl.', 'λύ-ομεν', 'λυ-όμεθα', 'we release (ourselves)'],
              ['2nd pl.', 'λύ-ετε', 'λύ-εσθε', 'you (pl.) release (yourselves)'],
              ['3rd pl.', 'λύ-ουσι', 'λύ-ονται', 'they release (themselves)'],
            ],
          },
        ],
        callout: {
          text: 'Notice the characteristic -μαι, -σαι/-ῃ, -ται, -μεθα, -σθε, -νται pattern. These endings recur in the imperfect, perfect, and pluperfect middle/passive as well — learn them now and they serve you across the entire verb system.',
        },
      },
      {
        heading: 'Part 3 — Key Stoic Middle-Voice Verbs',
        body: 'These verbs appear throughout Epictetus and Marcus Aurelius. All are predominantly middle in the philosophical texts.',
        paradigms: [
          {
            title: 'Key Stoic Middle-Voice Verbs',
            headers: ['Verb', 'Meaning', 'Stoic Context', 'Encheiridion Ref.'],
            rows: [
              ['ἐπιμελέομαι', 'care for (oneself/things)', 'Care for your prohairesis', 'Ench. 29'],
              ['σκέπτομαι', 'examine, consider', 'Examine impressions carefully', 'Ench. 1'],
              ['βούλομαι', 'wish, want (for oneself)', 'What do you truly will?', 'Disc. 1.1'],
              ['ἔρχομαι', 'go, come', 'Deponent — always middle form', 'Common'],
              ['κρίνομαι', 'judge (for oneself)', 'Self-judgment of actions', 'Disc. 3.2'],
              ['φαίνομαι', 'appear, seem', 'The impression appears thus', 'Ench. 1'],
            ],
          },
        ],
        callout: {
          text: 'Note: “deponent” verbs (like ἔρχομαι) are middle or passive in form but active in meaning. They have no active form in classical Greek. You will encounter several deponents in Epictetus.',
        },
      },
      {
        heading: 'Part 4 — εἰμί in the Imperfect: Linking to Session 12',
        body: 'Before the exercises, one bridging point: εἰμί (to be) has an imperfect form that appears frequently in Stoic texts when describing past states of soul or past judgments. The imperfect of εἰμί is: ἦν (I was), ἦσθα (you were), ἦν (he/she/it was), ἦμεν (we were), ἦτε (you pl. were), ἦσαν (they were).\n\nThis form is already past tense — it is not a middle/passive. But it rhymes phonologically with middle/passive endings, which confuses beginners. The rule: if you see ἦ- at the start, it is εἰμί imperfect, not a middle/passive stem. Session 12 will build the full imperfect system for regular verbs.',
      },
    ],
    exercises: [
      {
        number: '11.1',
        prompt: 'Identify Voice — for each form, state whether it is Active, Middle, or Passive: 1. λύεται  2. λύει  3. λυόμεθα  4. λύονται  5. λύεσθε',
        answer: '1. Middle or Passive (identical in the present). 2. Active 3rd sg. — or Middle 2nd sg. (λύει). 3. Middle/Passive 1st pl. 4. Middle/Passive 3rd pl. 5. Middle/Passive 2nd pl.',
      },
      {
        number: '11.2',
        prompt: 'Translate into English: 1. ἐπιμελέομαι τῆς ψυχῆς μου.  2. σκέπτεται τὴν φαντασίαν.  3. βουλόμεθα τὴν ἀρετήν.  4. φαίνεται ἀγαθόν.  5. ἔρχονται εἰς τὴν σχολήν.',
        answer: '1. I care for my soul. 2. He/she examines the impression. 3. We wish for virtue. 4. It appears good. 5. They come into the school.',
      },
      {
        number: '11.3',
        prompt: 'Conjugate σκέπτομαι (to examine) in all 6 persons, present middle/passive.',
        answer: 'σκέπτομαι, σκέπτῃ/σκέπτει, σκέπτεται, σκεπτόμεθα, σκέπτεσθε, σκέπτονται',
      },
      {
        number: '11.4',
        prompt: 'Middle or Deponent? Explain why ἔρχομαι cannot be passive, while λύομαι can be either middle or passive.',
        answer: 'ἔρχομαι is a deponent verb — it has no active form in Greek. It always appears in middle/passive form but carries active meaning (“I come/go”). A deponent cannot be passive because there is no active counterpart from which a passive could be formed. λύομαι, by contrast, has an active form λύω, so λύομαι can be either middle (“I release myself”) or passive (“I am released”) — context determines which.',
      },
    ],
    quiz: [
      { question: 'What is the 3rd singular present middle/passive of λύω?', options: ['λύομαι', 'λύεται', 'λύονται', 'λύεσθε'], correct: 1 },
      { question: 'What is the 1st plural present middle/passive of λύω?', options: ['λυόμεθα', 'λύομεν', 'λύονται', 'λυόμην'], correct: 0 },
      { question: 'What does ἐπιμελέομαι mean?', options: ['To be released', 'To appear good', 'To care for oneself or something', 'To examine an impression'], correct: 2 },
      { question: 'What is a deponent verb?', options: ['A verb with only active forms', 'A verb that exists only in the imperfect', 'A verb middle/passive in form but active in meaning, with no active form', 'A verb that takes no object'], correct: 2 },
      { question: 'What does φαίνομαι mean in a philosophical context?', options: ['To care for', 'To appear or seem — used of impressions (phantasiai)', 'To judge', 'To release'], correct: 1 },
      { question: 'How do you distinguish middle from passive in the present tense?', options: ['By the accent', 'By the augment', 'By context — the forms are identical', 'By the ending alone'], correct: 2 },
      { question: 'What is the 2nd singular present middle/passive ending of a -ω verb?', options: ['-ομαι', '-ῃ or -ει', '-εται', '-εσθε'], correct: 1 },
      { question: 'Translate: σκέπτεται τὴν φαντασίαν.', options: ['They examine the impression.', 'We examine the impression.', 'He/she examines the impression.', 'You examine the impression.'], correct: 2 },
      { question: 'What is the philosophical significance of the middle voice for Epictetus?', options: ['It marks completed past action', 'It is reserved for speaking of the gods', 'It grammatically encodes self-directed action — care and judgment turned upon oneself', 'It signals a question'], correct: 2 },
      { question: 'What is the imperfect 3rd singular of εἰμί?', options: ['ἐστί', 'ἦν', 'ἔσται', 'εἶ'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἐπιμελέομαι', transliteration: 'epimeleomai', english: 'to care for (oneself, something)' },
      { greek: 'σκέπτομαι', transliteration: 'skeptomai', english: 'to examine, consider' },
      { greek: 'βούλομαι', transliteration: 'boulomai', english: 'to wish, to want' },
      { greek: 'ἔρχομαι', transliteration: 'erchomai', english: 'to go, to come (deponent)' },
      { greek: 'κρίνομαι', transliteration: 'krinomai', english: 'to judge (for oneself)' },
      { greek: 'φαίνομαι', transliteration: 'phainomai', english: 'to appear, to seem' },
    ],
  },

  // ── SESSION 12 ─────────────────────────────────────────────────────────────
  {
    id: 12,
    title: 'The Imperfect Tense',
    subtitle: 'Past continuous action — what was being done, what was ongoing',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form the imperfect active and middle/passive of regular -ω verbs',
      'Apply the augment correctly including epsilon-augment and temporal augment',
      'Understand the aspectual difference between imperfect and aorist (to be introduced in Session 16)',
      'Read imperfect forms in Stoic contexts describing past habit and practice',
    ],
    parts: [
      {
        heading: 'Part 1 — Aspect Before Tense',
        body: 'Greek verb tenses encode two things simultaneously: time (past/present/future) and aspect (the shape of the action). The present tense describes ongoing or repeated action in the present — “I am practicing,” “I practice (habitually).” The imperfect describes the same kind of ongoing action, but in the past — “I was practicing,” “I used to practice.”\n\nThis distinction matters for reading Stoic texts. When Marcus Aurelius reflects on his youth or on habits he was forming, he uses the imperfect. When Epictetus describes what his students were doing when he interrupted them, the imperfect captures that ongoing background action. The imperfect does not describe completed events — that is the aorist’s job.\n\nThe key rule: imperfect = ongoing or repeated action in the past. If you find yourself wanting to say “was -ing” or “used to,” the imperfect is your tense.',
      },
      {
        heading: 'Part 2 — Forming the Imperfect',
        body: 'The imperfect is formed by three additions to the present stem: (1) the augment prepended to the stem, (2) the same stem as the present, (3) secondary endings replacing the primary endings.\n\nAugment rule: If the verb begins with a consonant, prefix ἐ-. If it begins with a vowel, lengthen that vowel (α/ε → η; ο → ω; αι/αυ → ῃ/ηυ).',
        paradigms: [
          {
            title: 'The Imperfect of λύω',
            headers: ['Person', 'Imperfect Active', 'Imperfect Mid/Pass', 'Note'],
            rows: [
              ['1st sg.', 'ἔ-λυ-ον', 'ἐ-λυ-όμην', 'augment + stem + ending'],
              ['2nd sg.', 'ἔ-λυ-ες', 'ἐ-λύ-ου', ''],
              ['3rd sg.', 'ἔ-λυ-ε(ν)', 'ἐ-λύ-ετο', 'movable ν on 3rd sg.'],
              ['1st pl.', 'ἐ-λύ-ομεν', 'ἐ-λυ-όμεθα', ''],
              ['2nd pl.', 'ἐ-λύ-ετε', 'ἐ-λύ-εσθε', ''],
              ['3rd pl.', 'ἔ-λυ-ον', 'ἐ-λύ-οντο', 'same form as 1st sg. active — parse by context'],
            ],
          },
        ],
        callout: {
          text: 'The 1st singular active and 3rd plural active are identical (ἔλυον). Context — especially the subject — resolves ambiguity.',
        },
      },
      {
        heading: 'Part 3 — Imperfect of εἰμί and Contract Verbs',
        body: 'εἰμί has an irregular imperfect: ἦν, ἦσθα, ἦν, ἦμεν, ἦτε, ἦσαν. These forms appear constantly in Stoic texts and must be memorized.',
        paradigms: [
          {
            title: 'The Imperfect of εἰμί',
            headers: ['Form', 'Person', 'Translation'],
            rows: [
              ['ἦν', '1st/3rd sg.', 'I was / he/she/it was'],
              ['ἦσθα', '2nd sg.', 'you were'],
              ['ἦμεν', '1st pl.', 'we were'],
              ['ἦτε', '2nd pl.', 'you (pl.) were'],
              ['ἦσαν', '3rd pl.', 'they were'],
            ],
          },
        ],
        callout: {
          text: 'Contract verbs (those ending in -έω, -άω, -όω) apply the augment before contraction. ἀσκέω (“to practice”) becomes ἤσκουν in the imperfect 1st singular — the ε- augment lengthens the initial α to η, then the contraction applies. This is advanced but appears in Epictetus’s discussions of askēsis (practice).',
        },
      },
      {
        heading: 'Part 4 — Imperfect in Stoic Philosophical Prose',
        body: 'The imperfect is the tense of habit, practice, and gradual formation — the language of the prokopton (one making progress). When Epictetus describes the philosopher’s past practice or when Marcus Aurelius records his daily self-examination (as he was doing, repeatedly, over years), the imperfect is their natural instrument.',
        paradigms: [
          {
            title: 'The Imperfect in Context',
            headers: ['Greek', 'Transliteration', 'Translation + Note'],
            rows: [
              ['ἤσκουν τὴν προσοχήν.', 'ēskoun tēn prosochēn.', 'I was practicing attention. (Imperfect of ἀσκέω)'],
              ['ἐσκέπτετο τὰς φαντασίας.', 'eskepteto tas phantasias.', 'He was examining the impressions. (3rd sg. imperfect of σκέπτομαι)'],
              ['ἦσαν σοφοί.', 'ēsan sophoi.', 'They were wise. (Imperfect of εἰμί)'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '12.1',
        prompt: 'Form the Imperfect — give the imperfect active 1st singular of: ἀσκέω, λύω, διώκω, γράφω',
        answer: 'ἤσκουν (contract), ἔλυον, ἐδίωκον, ἔγραφον',
      },
      {
        number: '12.2',
        prompt: 'Augment Practice — apply the correct augment to: ἄρχω, ὁράω, εὑρίσκω, ἀγγέλλω',
        answer: 'ἦρχον (α → η); ἑώρων (ο → ω, with reduplication — irregular; accept ἑώρα for recognition); ηὕρισκον (εὑ- → ηὑ-); ἤγγελλον (α → η).',
      },
      {
        number: '12.3',
        prompt: 'Parse and Translate: 1. ἐσκέπτετο τὴν φαντασίαν.  2. ἤσκουν τὴν ἀρετήν.  3. ἦσαν ἐλεύθεροι.  4. ἐλυόμεθα ὑπὸ τοῦ δεσμοῦ.',
        answer: '1. He/she was examining the impression. (3rd sg. imperfect middle of σκέπτομαι) 2. I was practicing virtue. (1st sg. imperfect active of ἀσκέω, contract) 3. They were free. (3rd pl. imperfect of εἰμί + predicate adj.) 4. We were being released from the chain. (1st pl. imperfect passive of λύω)',
      },
      {
        number: '12.4',
        prompt: 'Aspect Distinction — explain in your own words why a Stoic teacher would use the imperfect to describe a student’s practice, rather than the aorist.',
        answer: 'The imperfect describes ongoing or repeated past action — “was practicing,” “used to practice.” Stoic practice (askēsis) is precisely this: not a single completed event but a sustained, habitual activity of attending to impressions, choosing rightly, and examining oneself. The aorist (“he practiced once”) would misrepresent the nature of philosophical formation, which requires repetition over time.',
      },
    ],
    quiz: [
      { question: 'What two elements are added to the present stem to form the imperfect?', options: ['The augment and secondary (past) endings', 'A suffix and reduplication', 'The σα marker and primary endings', 'Reduplication and the augment'], correct: 0 },
      { question: 'What is the augment for a verb beginning with a consonant?', options: ['Lengthen the first vowel', 'Add -σα-', 'Prefix ἐ- before the stem', 'Reduplicate the first consonant'], correct: 2 },
      { question: 'What is the imperfect 3rd plural of εἰμί?', options: ['ἦμεν', 'ἦσαν', 'ἦτε', 'ἦν'], correct: 1 },
      { question: 'What aspectual meaning does the imperfect carry?', options: ['Completed, single past action', 'Future intention', 'Ongoing or repeated action in the past', 'Present habit'], correct: 2 },
      { question: 'Give the imperfect active 1st singular of λύω.', options: ['λύσω', 'ἔλυσα', 'ἔλυον', 'λέλυκα'], correct: 2 },
      { question: 'Which tense encodes completed past action (introduced later)?', options: ['The perfect', 'The future', 'The aorist', 'The imperfect'], correct: 2 },
      { question: 'Translate: ἐσκέπτετο τὰς φαντασίας.', options: ['He/she examined the impression once.', 'He/she was examining the impressions.', 'They will examine the impressions.', 'He/she examines the impressions.'], correct: 1 },
      { question: 'What is the imperfect middle/passive 3rd singular of λύω?', options: ['ἐλύετο', 'ἔλυε', 'λύεται', 'ἐλύοντο'], correct: 0 },
      { question: 'Why are the 1st singular active and 3rd plural active imperfect identical?', options: ['They sound alike but are spelled differently', 'Both are ἔλυον — the subject/context disambiguates', 'The accent differs between them', 'One takes an augment, the other does not'], correct: 1 },
      { question: 'How does a temporal augment differ from an epsilon augment?', options: ['A temporal augment adds -σα-; an epsilon augment reduplicates', 'They are identical processes', 'A temporal augment lengthens an initial vowel; an epsilon augment prefixes ἐ- before a consonant', 'A temporal augment is used only for εἰμί'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'ἀσκέω', transliteration: 'askeō', english: 'to practice, to train' },
      { greek: 'προσοχή, προσοχῆς', transliteration: 'prosochē', english: 'attention, attentiveness' },
      { greek: 'διώκω', transliteration: 'diōkō', english: 'to pursue, to chase' },
      { greek: 'γράφω', transliteration: 'graphō', english: 'to write' },
      { greek: 'εὑρίσκω', transliteration: 'heuriskō', english: 'to find, to discover' },
      { greek: 'ἐλεύθερος, -α, -ον', transliteration: 'eleutheros', english: 'free' },
    ],
  },

  // ── SESSION 13 ─────────────────────────────────────────────────────────────
  {
    id: 13,
    title: 'The Third Declension',
    subtitle: 'Consonant stems, neuter nouns, and the vocabulary of body, soul, and reason',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Recognize third declension consonant stems from the genitive',
      'Decline σῶμα (neuter), νύξ (feminine), and λόγος (masculine — 3rd decl. type)',
      'Distinguish 3rd declension from 1st and 2nd by ending patterns',
      'Read philosophical phrases using σῶμα, πνεῦμα, and ὄνομα',
    ],
    parts: [
      {
        heading: 'Part 1 — The Third Declension: Why It’s Different',
        body: 'The first and second declensions have predictable nominative endings (-η/-α for 1st, -ος/-ον for 2nd). The third declension is less predictable in the nominative — but highly predictable once you know the genitive. The rule for all third declension nouns: find the genitive singular, remove -ος, and you have the stem. All other forms build on that stem.\n\nThe third declension covers a huge range of philosophical vocabulary: σῶμα (body), πνεῦμα (breath/spirit), ὄνομα (name), λόγος in its logic sense, νοῦς contracted from νόος, and the participle forms you will learn in Sessions 14 and 19. Mastering the 3rd declension unlocks Stoic physics and cosmology.',
      },
      {
        heading: 'Part 2 — Neuter -μα Nouns (the Most Common Type)',
        body: 'The -μα nouns are the most important 3rd declension type for Stoic philosophy. They include σῶμα (body), πνεῦμα (breath, spirit, the Stoic life-force), ὄνομα (name), ἅρμα (chariot), πρᾶγμα (thing, matter, affair).',
        paradigms: [
          {
            title: 'σῶμα (body) — Neuter 3rd Declension',
            headers: ['Case', 'σῶμα (body)', 'Form', 'Key Feature'],
            rows: [
              ['Nominative sg.', 'σῶμα', 'σῶμα', 'stem = σωματ-'],
              ['Genitive sg.', 'σώματος', 'σώματος', 'remove -ος to get stem'],
              ['Dative sg.', 'σώματι', 'σώματι', '-ι added to stem'],
              ['Accusative sg.', 'σῶμα', 'σῶμα', 'same as nominative (neuter rule)'],
              ['Nominative pl.', 'σώματα', 'σώματα', '-α added to stem'],
              ['Genitive pl.', 'σωμάτων', 'σωμάτων', '-ων added to stem'],
              ['Dative pl.', 'σώμασι(ν)', 'σώμασι(ν)', 'τ drops before σι'],
              ['Accusative pl.', 'σώματα', 'σώματα', 'same as nominative pl.'],
            ],
          },
        ],
        callout: {
          text: 'Neuter rule: in ALL declensions, nominative and accusative neuter are always identical — in singular and in plural.',
        },
      },
      {
        heading: 'Part 3 — Consonant Stem Nouns: νύξ and σάρξ',
        body: 'Nouns with consonant stems — especially labial (π, β, φ), dental (τ, δ, θ), and velar (κ, γ, χ) stems — show regular but phonetically conditioned changes.',
        paradigms: [
          {
            title: 'νύξ (night) and σάρξ (flesh)',
            headers: ['Case', 'νύξ (night)', 'σάρξ (flesh)'],
            rows: [
              ['Nom. sg.', 'νύξ', 'σάρξ'],
              ['Gen. sg.', 'νυκτός', 'σαρκός'],
              ['Dat. sg.', 'νυκτί', 'σαρκί'],
              ['Acc. sg.', 'νύκτα', 'σάρκα'],
              ['Nom. pl.', 'νύκτες', 'σάρκες'],
              ['Gen. pl.', 'νυκτῶν', 'σαρκῶν'],
              ['Dat. pl.', 'νυξί(ν)', 'σαρξί(ν)'],
              ['Acc. pl.', 'νύκτας', 'σάρκας'],
            ],
          },
        ],
        callout: {
          text: 'The dative plural shows the phonological rule: κτ + σι → ξι; κ + σι → ξι. The velar + sigma always produces ξ.',
        },
      },
      {
        heading: 'Part 4 — Key 3rd Declension Philosophical Vocabulary',
        body: 'These nouns recur throughout Stoic physics and ethics. Each is given with its genitive singular, from which the stem is derived.',
        paradigms: [
          {
            title: 'Key 3rd Declension Vocabulary',
            headers: ['Greek', 'Gen. sg.', 'English', 'Stoic Significance'],
            rows: [
              ['σῶμα, -ατος', 'σώματος', 'body', 'The material substrate; not ephʼ hēmin'],
              ['πνεῦμα, -ατος', 'πνεύματος', 'breath, spirit', 'The Stoic cosmological force pervading all things'],
              ['ὄνομα, -ατος', 'ὀνόματος', 'name', 'The signifier in Stoic semiotics (vs. lekton)'],
              ['πρᾶγμα, -ατος', 'πράγματος', 'thing, affair', 'External circumstance — not ephʼ hēmin'],
              ['ἡγεμονικόν, -οῦ', 'ἡγεμονικοῦ', 'ruling faculty', '2nd decl. but philosophically paired with σῶμα'],
              ['λόγος (as 3rd)', 'see note', 'reason, word', 'Some compounds use 3rd decl. oblique stems'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '13.1',
        prompt: 'Find the Stem — given the genitive singular, identify the 3rd declension stem: 1. σώματος  2. πνεύματος  3. νυκτός  4. ὀνόματος  5. σαρκός',
        answer: '1. σωματ-  2. πνευματ-  3. νυκτ-  4. ὀνοματ-  5. σαρκ-',
      },
      {
        number: '13.2',
        prompt: 'Decline σῶμα — decline σῶμα, σώματος fully in singular and plural.',
        answer: 'Sg.: σῶμα, σώματος, σώματι, σῶμα. Pl.: σώματα, σωμάτων, σώμασιν, σώματα.',
      },
      {
        number: '13.3',
        prompt: 'Translate: 1. τὸ σῶμα οὐκ ἔστιν ἐφ᾿ ἡμῖν.  2. τοῦ σώματος ἡ φροντίς ἐστι τῶν ἀδιαφόρων.  3. τὸ πνεῦμα διέρχεται πάντα.',
        answer: '1. The body is not up to us. 2. The care of the body is among the indifferent things. 3. The spirit/breath passes through all things.',
      },
      {
        number: '13.4',
        prompt: 'Why Does This Matter? Explain the Stoic significance of σῶμα vs. πνεῦμα in their cosmology.',
        answer: 'For the Stoics, all reality is corporeal — but not all bodies are the same. σῶμα is body as passive matter (hylē). πνεῦμα is the active, divine, fiery breath that pervades and organizes passive matter. The cosmos is a living body animated by πνεῦμα. In the human being, the hēgemonikon (ruling faculty) is the densest, most refined concentration of πνεῦμα — which is why it can reason. The soul IS pneuma at a particular tension (tonos). This physics underlies all Stoic ethics: your ruling faculty is a fragment of the divine logos, which is why virtuous reason is living according to nature.',
      },
    ],
    quiz: [
      { question: 'How do you find the stem of a 3rd declension noun?', options: ['Remove -ος from the genitive singular', 'Remove -α from the nominative', 'Add -ος to the dative', 'Lengthen the first vowel'], correct: 0 },
      { question: 'What is the neuter rule?', options: ['Neuter nouns have no plural', 'Nominative and accusative are always identical in neuter nouns', 'Neuter nouns take only the article τό', 'Neuter nouns never decline'], correct: 1 },
      { question: 'Give the dative plural of σῶμα.', options: ['σώματα', 'σωμάτων', 'σώμασιν', 'σώματι'], correct: 2 },
      { question: 'What does πνεῦμα mean in Stoic cosmology?', options: ['Passive matter awaiting form', 'The active, divine, fiery breath pervading and organizing all matter', 'The body as opposed to the soul', 'A spoken name'], correct: 1 },
      { question: 'What case signals possession in the phrase “of the body”?', options: ['Dative — τῷ σώματι', 'Accusative — τὸ σῶμα', 'Genitive — τοῦ σώματος', 'Nominative — τὸ σῶμα'], correct: 2 },
      { question: 'Give the accusative singular of νύξ.', options: ['νυκτός', 'νύκτα', 'νυκτί', 'νύκτες'], correct: 1 },
      { question: 'What phonological change explains νυξί(ν) in the dative plural?', options: ['κτ + σι → ξι (velar + sigma produces ξ)', 'The vowel lengthens before σ', 'The τ doubles before ι', 'Reduplication of the stem'], correct: 0 },
      { question: 'What is ὄνομα in Stoic semiotics?', options: ['The external thing itself (pragma)', 'The proposition (lekton)', 'The name/signifier — a sound, distinct from the lekton and the pragma', 'The ruling faculty'], correct: 2 },
      { question: 'Translate: τοῦ σώματος ἡ φροντίς ἐστι τῶν ἀδιαφόρων.', options: ['The body is the only good.', 'The care of the body is among the indifferent things.', 'The body governs the soul.', 'The soul cares for nothing.'], correct: 1 },
      { question: 'Which group are all -μα nouns of philosophical importance?', options: ['λόγος, νοῦς, ψυχή', 'ἀρετή, δόξα, ἀρχή', 'σῶμα, πνεῦμα, ὄνομα, πρᾶγμα', 'νύξ, σάρξ, ἕξις'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'σῶμα, σώματος', transliteration: 'sōma', english: 'body' },
      { greek: 'πνεῦμα, πνεύματος', transliteration: 'pneuma', english: 'breath, spirit' },
      { greek: 'ὄνομα, ὀνόματος', transliteration: 'onoma', english: 'name' },
      { greek: 'πρᾶγμα, πράγματος', transliteration: 'pragma', english: 'thing, matter, affair' },
      { greek: 'νύξ, νυκτός', transliteration: 'nyx', english: 'night' },
      { greek: 'σάρξ, σαρκός', transliteration: 'sarx', english: 'flesh' },
    ],
  },

  // ── SESSION 14 ─────────────────────────────────────────────────────────────
  {
    id: 14,
    title: 'Participles I — Present Active',
    subtitle: 'Verbal adjectives, simultaneous action, and the grammar of philosophical description',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form the present active participle of regular -ω verbs',
      'Decline the present active participle in all three genders',
      'Use participles to express simultaneous action and circumstantial meaning',
      'Read participial phrases in Epictetus describing the person who practices philosophy',
    ],
    parts: [
      {
        heading: 'Part 1 — What a Participle Is',
        body: 'A participle is a verbal adjective. It carries verbal information (tense, voice, aspect) while also functioning as an adjective — modifying a noun, agreeing with it in gender, number, and case. In English: “the practicing philosopher,” “the man who is choosing.” In Greek, the present active participle describes action simultaneous with the main verb and expresses it as an adjectival modifier.\n\nEpictetus’s Discourses are full of participles. He describes his students as “those practicing” (οἱ ἀσκοῦντες), “the one choosing” (ὁ αἱρούμενος), “the person examining impressions” (ὁ σκεπτόμενος τὰς φαντασίας). Participles are his preferred way of describing philosophical character — not “the philosopher” as a static title, but “the one who is doing philosophy.”',
      },
      {
        heading: 'Part 2 — Forming the Present Active Participle',
        body: 'The present active participle is formed by adding -ων, -ουσα, -ον to the present stem (removing the -ω). It declines like a 3rd declension adjective in the masculine and neuter, and like a 1st declension noun in the feminine.',
        paradigms: [
          {
            title: 'Present Active Participle of λύω',
            headers: ['Case', 'Masculine', 'Feminine', 'Neuter'],
            rows: [
              ['Nom. sg.', 'λύ-ων', 'λύ-ουσα', 'λύ-ον'],
              ['Gen. sg.', 'λύ-οντος', 'λυ-ούσης', 'λύ-οντος'],
              ['Dat. sg.', 'λύ-οντι', 'λυ-ούσῃ', 'λύ-οντι'],
              ['Acc. sg.', 'λύ-οντα', 'λύ-ουσαν', 'λύ-ον'],
              ['Nom. pl.', 'λύ-οντες', 'λύ-ουσαι', 'λύ-οντα'],
              ['Gen. pl.', 'λυ-όντων', 'λυ-ουσῶν', 'λυ-όντων'],
              ['Dat. pl.', 'λύ-ουσι(ν)', 'λυ-ούσαις', 'λύ-ουσι(ν)'],
              ['Acc. pl.', 'λύ-οντας', 'λυ-ούσας', 'λύ-οντα'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Uses of the Participle',
        body: 'The present active participle has three main uses:\n\n1. Attributive: placed with the article to modify a noun directly. ὁ ἀσκῶν ἄνθρωπος — “the practicing man.” The participle agrees with ἄνθρωπος in gender, number, case.\n\n2. Substantive: used with the article but without a noun — the participle IS the noun. οἱ ἀσκοῦντες — “those who are practicing,” “the practitioners.”\n\n3. Circumstantial: without an article, modifying the subject or object of a clause. ἀσκῶν τὴν ἀρετήν, εὐδαίμων ἦν. — “Practicing virtue, he was happy.” The participle describes simultaneous action.',
        paradigms: [
          {
            title: 'The Three Uses',
            headers: ['Use', 'Greek', 'Translation'],
            rows: [
              ['Attributive', 'ὁ ἀσκῶν φιλόσοφος', 'the practicing philosopher'],
              ['Substantive', 'οἱ φιλοσοφοῦντες', 'those who philosophize'],
              ['Circumstantial', 'ἀσκῶν, ἔλεγε…', 'While practicing, he said…'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Participles in the Encheiridion',
        body: 'Session 15’s full parse will encounter several participial forms. These forms appear in §1 and adjacent passages. Note that τῶν ὄντων in Encheiridion §1 is the present active participle of εἰμί in the genitive plural — “of the things that exist/are.” This single participial phrase opens the entire Encheiridion and frames the Stoic cosmology: the things that are, some are eph’ hēmin, some are not.',
        paradigms: [
          {
            title: 'Participial Forms in §1 and Nearby',
            headers: ['Participle', 'From', 'In context'],
            rows: [
              ['ὤν, οὖσα, ὄν', 'εἰμί (being)', 'τῶν ὄντων — “of the things that are/exist”'],
              ['ἐφιέμενος', 'ἐφίεμαι (desiring)', 'ὀρεγόμενος or ἐφιέμενος τυγχάνει — “desiring, he attains”'],
              ['κωλύων', 'κωλύω (hindering)', 'τοῦ κωλύοντος — “of the one hindering”'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '14.1',
        prompt: 'Form the Participle — give the nominative singular masculine present active participle of: λύω, ἀσκέω, σκέπτομαι, φιλοσοφέω',
        answer: 'λύων, ἀσκῶν (contract), σκεπτόμενος (middle), φιλοσοφῶν (contract)',
      },
      {
        number: '14.2',
        prompt: 'Identify Use — identify whether each participle is attributive, substantive, or circumstantial: 1. οἱ ἀσκοῦντες πρόκοπτον.  2. ὁ φιλοσοφῶν ἄνθρωπος μακάριός ἐστιν.  3. ἀσκῶν τὴν ἀρετήν, εὐδαίμων ἐγένετο.',
        answer: '1. Substantive — “Those who practice make progress.” 2. Attributive — “The philosophizing man is blessed.” 3. Circumstantial — “Practicing virtue, he became happy.”',
      },
      {
        number: '14.3',
        prompt: 'Parse τῶν ὄντων — parse τῶν ὄντων fully (from Encheiridion §1).',
        answer: 'Present active participle of εἰμί. Genitive plural. Neuter (modifying implied τά, “the things”). Translation: “of the things that are/exist.” This is the opening phrase of Encheiridion §1 — “Of the things that exist, some are up to us, some are not.”',
      },
      {
        number: '14.4',
        prompt: 'Translate: 1. οἱ φιλοσοφοῦντες ζητοῦσι τὴν ἀρετήν.  2. ἡ ψυχὴ ἀσκοῦσα ἐλευθέρα γίγνεται.',
        answer: '1. Those who philosophize seek virtue. 2. The soul, practicing, becomes free.',
      },
    ],
    quiz: [
      { question: 'What is a participle?', options: ['A verbal noun used only as a subject', 'A verbal adjective — carries verbal meaning while modifying nouns like an adjective', 'An irregular form of the article', 'A type of accent mark'], correct: 1 },
      { question: 'What is the nominative singular masculine present active participle of λύω?', options: ['λύουσα', 'λῦσαι', 'λύων', 'λελυκώς'], correct: 2 },
      { question: 'What is the feminine nominative singular of the present active participle of λύω?', options: ['λύουσα', 'λύον', 'λύοντος', 'λύουσι'], correct: 0 },
      { question: 'What is the neuter nominative singular of the present active participle of λύω?', options: ['λύων', 'λύουσα', 'λύον', 'λύοντα'], correct: 2 },
      { question: 'What does “substantive participle” mean?', options: ['A participle used with the article but without a noun — it IS the noun', 'A participle modifying a verb', 'A participle in the future tense', 'A participle that takes no article'], correct: 0 },
      { question: 'Parse τῶν ὄντων.', options: ['Genitive plural noun of the 2nd declension', 'Present active participle of εἰμί, genitive plural neuter — “of the things that exist”', 'A perfect tense verb', 'A 1st declension adjective'], correct: 1 },
      { question: 'What does the present active participle express temporally?', options: ['Action completed before the main verb', 'Action after the main verb', 'Action simultaneous with the main verb', 'No temporal relation at all'], correct: 2 },
      { question: 'Give the genitive plural masculine of the present active participle of λύω.', options: ['λυόντων', 'λύοντες', 'λύουσι', 'λύοντα'], correct: 0 },
      { question: 'Translate: οἱ ἀσκοῦντες πρόκοπτον.', options: ['The practiced ones were praised.', 'Those who practice make progress.', 'They will practice virtue.', 'He practiced and stopped.'], correct: 1 },
      { question: 'How does the feminine present active participle decline?', options: ['Like a 3rd declension noun', 'Like the masculine, identically', 'Like a 1st declension noun (-ουσα, -ούσης, -ούσῃ, -ουσαν…)', 'It does not decline'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'φιλοσοφέω', transliteration: 'philosopheō', english: 'to do philosophy, to philosophize' },
      { greek: 'ζητέω', transliteration: 'zēteō', english: 'to seek, to look for' },
      { greek: 'γίγνομαι', transliteration: 'gignomai', english: 'to become, to come to be' },
      { greek: 'κωλύω', transliteration: 'kōlyō', english: 'to hinder, to prevent' },
      { greek: 'μακάριος, -α, -ον', transliteration: 'makarios', english: 'blessed, happy' },
      { greek: 'εὐδαίμων, -ον', transliteration: 'eudaimōn', english: 'happy, flourishing' },
    ],
  },

  // ── SESSION 15 ─────────────────────────────────────────────────────────────
  {
    id: 15,
    title: 'Encheiridion §1 — Full Parse',
    subtitle: 'Complete grammatical analysis of the first passage — the milestone of Unit II',
    targetText: ENCHEIRIDION_1,
    isMilestone: true,
    objectives: [
      'Parse every word of Encheiridion §1 with full grammatical identification',
      'Produce a working translation without reference',
      'Explain each grammatical choice in context',
      'Identify all cases, tenses, voices, and participle forms encountered',
    ],
    parts: [
      {
        heading: 'Part 1 — The Text',
        body: 'Τῶν ὄντων τὰ μέν ἐστιν ἐφ᾿ ἡμῖν, τὰ δὲ οὐκ ἐφ᾿ ἡμῖν. ἐφ᾿ ἡμῖν μὲν ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις, καὶ ἑνὶ λόγῳ, ὅσα ἡμέτερα ἔργα· οὐκ ἐφ᾿ ἡμῖν δὲ σῶμα, κτῆσις, δόξα, ἀρχή, καὶ ἑνὶ λόγῳ, ὅσα οὐχ ἡμέτερα ἔργα.\n\nTranslation target: “Of the things that exist, some are up to us, some are not up to us. Up to us are: judgment, impulse, desire, aversion — and in a word, whatever is our own doing. Not up to us are: body, property, reputation, office — and in a word, whatever is not our own doing.”',
      },
      {
        heading: 'Part 2 — Word-by-Word Parse: Sentence 1',
        body: 'The first sentence states the partition itself: of all the things that exist, some belong to one category and some to the other.',
        paradigms: [
          {
            title: 'Sentence 1 — Parse',
            headers: ['Word', 'Form', 'Parse', 'Role in sentence'],
            rows: [
              ['Τῶν', 'τῶν', 'definite article, gen. pl. neuter', 'modifies ὄντων'],
              ['ὄντων', 'ὄντων', 'pres. act. ptcpl. of εἰμί, gen. pl. neuter', 'partitive genitive — “of the things that are”'],
              ['τὰ μέν', 'τά', 'article, nom. pl. neuter', 'subject of ἐστιν, anticipates what follows'],
              ['ἐστιν', 'ἐστί(ν)', 'pres. act. indic. 3rd sg. of εἰμί', 'main verb — “is/are”'],
              ['ἐφ᾿ ἡμῖν', 'ἐφ᾿ + dat.', 'prep. phrase: ἐπί + ἡμῖν (dat. pl. of ἡμεῖς)', 'predicate: “up to us / in our power”'],
              ['τὰ δέ', 'τά', 'article, nom. pl. neuter', 'subject of implied ἐστιν — “and the others”'],
              ['οὐκ', 'οὐκ', 'negative particle before vowel', 'negates ἐφ᾿ ἡμῖν'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Word-by-Word Parse: Sentence 2 (The List)',
        body: 'The second sentence lists the things that are up to us — the four acts of the ruling faculty — and closes with a summarizing relative clause.',
        paradigms: [
          {
            title: 'Sentence 2 — Parse',
            headers: ['Word', 'Form', 'Parse', 'Stoic Significance'],
            rows: [
              ['ὑπόληψις', 'nom. sg. fem.', '1st decl. noun from ὑπολαμβάνω', 'judgment, opinion — the faculty of assent (synkatathesis)'],
              ['ὁρμή', 'nom. sg. fem.', '1st decl. noun', 'impulse toward action — the Stoic term for voluntary movement'],
              ['ὄρεξις', 'nom. sg. fem.', '3rd decl. -εως noun', 'desire, reaching toward — positive appetite'],
              ['ἔκκλισις', 'nom. sg. fem.', '3rd decl. -εως noun', 'aversion, turning away — negative appetite'],
              ['ἑνὶ λόγῳ', 'dat. sg. masc.', 'dat. of manner: “in one word/reason”', 'formulaic phrase — “in a word”; λόγῳ is dat. of λόγος'],
              ['ὅσα', 'nom./acc. pl. neut.', 'relative pronoun “as many as, whatever”', 'introduces relative clause'],
              ['ἡμέτερα', 'nom. pl. neut.', 'possessive adj. from ἡμεῖς', '“our own” — eph’ hēmin class'],
              ['ἔργα', 'nom. pl. neut.', '2nd decl. of ἔργον', 'deeds, works, doings — what we do'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — The Not-Up-To-Us List and Summary',
        body: 'The architecture of §1 is a binary partition of all existing things. Everything that exists (τῶν ὄντων) falls into one of two categories: eph’ hēmin (up to us) or ouk eph’ hēmin (not up to us). The eph’ hēmin category is entirely internal — faculties of soul. The ouk eph’ hēmin category is entirely external — body, goods, reputation, position. This binary is not a minor organizational device. It is the foundation of the entire Stoic ethical system. Everything Epictetus says in the remaining chapters of the Encheiridion is an application of this partition.',
        paradigms: [
          {
            title: 'Sentence 3 — The Not-Up-To-Us List',
            headers: ['Word', 'Form', 'Parse', 'Stoic Significance'],
            rows: [
              ['σῶμα', 'nom. sg. neut.', '3rd decl. -ματος noun', 'body — external, not our doing'],
              ['κτῆσις', 'nom. sg. fem.', '3rd decl. -εως noun', 'property, possessions'],
              ['δόξα', 'nom. sg. fem.', '1st decl. noun', 'reputation, opinion (others’ of us) — external'],
              ['ἀρχή', 'nom. sg. fem.', '1st decl. noun', 'office, command, position — external'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '15.1',
        prompt: 'Unaided Translation — without notes: translate Encheiridion §1 from memory.',
        answer: 'Of the things that exist, some are up to us, some are not. Up to us: judgment, impulse, desire, aversion — in a word, whatever is our own doing. Not up to us: body, property, reputation, office — in a word, whatever is not our own doing.',
      },
      {
        number: '15.2',
        prompt: 'Parse on Demand — parse fully: 1. ὄντων  2. ἡμῖν  3. ἔκκλισις  4. ἡμέτερα',
        answer: '1. Present active participle of εἰμί, genitive plural, neuter. 2. Dative plural of ἡμεῖς (1st person plural pronoun) — governed by ἐπί in ἐφ᾿ ἡμῖν. 3. Nominative singular feminine, 3rd declension -εως noun from ἐκκλίνω — aversion. 4. Nominative plural neuter possessive adjective (ἡμέτερος, -α, -ον) — “our own.”',
      },
      {
        number: '15.3',
        prompt: 'Structural Analysis — explain the grammatical structure of ὅσα ἡμέτερα ἔργα. What kind of clause is this?',
        answer: 'ὅσα introduces a relative clause (“as many as, whatever”). ἡμέτερα is a predicate adjective (“our own”). ἔργα is the subject (“deeds/works”). The clause: “whatever things are our own deeds.” It functions as a nominative phrase in apposition to the list (ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις), summarizing them as “whatever is our own doing.”',
      },
      {
        number: '15.4',
        prompt: 'Philosophical Commentary — why does Epictetus place ὑπόληψις (judgment) first in the eph’ hēmin list?',
        answer: 'For Epictetus, ὑπόληψις (judgment, the act of taking something to be a certain way) is the most fundamental eph’ hēmin faculty because it is the substrate of all the others. Impulse (ὁρμή) follows from judgment — we move toward what we judge to be good. Desire (ὄρεξις) follows from judging something worth having. Aversion (ἔκκλισις) follows from judging something worth avoiding. If you can govern your judgments, all the rest follows. This is why the Stoic practice of attention (prosochē) is primarily attention to judgments — catching false ones before they generate bad impulses, desires, and aversions.',
      },
    ],
    quiz: [
      { question: 'Parse τῶν ὄντων.', options: ['A 2nd declension noun in the genitive plural', 'Present active participle of εἰμί, genitive plural neuter — “of the things that exist”', 'A perfect tense verb', 'An adjective in the nominative'], correct: 1 },
      { question: 'What grammatical construction is ἐφ᾿ ἡμῖν?', options: ['A verb in the middle voice', 'A relative clause', 'A prepositional phrase: ἐπί + dative plural of ἡμεῖς — “in our power, up to us”', 'A genitive absolute'], correct: 2 },
      { question: 'What does ὑπόληψις mean?', options: ['Judgment, opinion — the faculty of taking something to be a certain way', 'Bodily strength', 'Reputation among others', 'Political office'], correct: 0 },
      { question: 'What does ὁρμή mean?', options: ['Aversion from something harmful', 'Impulse toward action — voluntary movement initiated by the hēgemonikon', 'A spoken name', 'Wealth and possessions'], correct: 1 },
      { question: 'What does ἔκκλισις mean?', options: ['Desire for something good', 'Judgment about a thing', 'Aversion — turning away from something judged bad or harmful', 'An external circumstance'], correct: 2 },
      { question: 'What declension is σῶμα?', options: ['First declension', 'Second declension', 'Third declension, -ματος type (neuter)', 'It is indeclinable'], correct: 2 },
      { question: 'What does δόξα mean in this passage?', options: ['Glory of the gods', 'Reputation — what others think of us; external and not eph’ hēmin', 'Correct doctrine', 'A discipline of the soul'], correct: 1 },
      { question: 'What is the function of ἑνὶ λόγῳ?', options: ['Subject of the sentence', 'Dative of manner — “in one word,” a summary formula', 'A verb in the imperfect', 'An accusative object'], correct: 1 },
      { question: 'Translate: ὅσα οὐχ ἡμέτερα ἔργα.', options: ['Whatever things are our own doings', '“Whatever things are not our own doings” — the ouk eph’ hēmin summary', 'The things the soul desires', 'The four acts of the ruling faculty'], correct: 1 },
      { question: 'What is the philosophical significance of the partition in §1?', options: ['It is a minor stylistic device', 'It distinguishes Greek from Latin grammar', 'It is the foundation of all Stoic ethics — everything is either eph’ hēmin (internal faculties) or ouk eph’ hēmin (external conditions)', 'It lists the cardinal virtues'], correct: 2 },
    ],
    vocabulary: [
      { greek: 'ὄντα, τὰ ὄντα', transliteration: 'ta onta', english: 'the things that exist, beings' },
      { greek: 'ἔργον, ἔργου', transliteration: 'ergon', english: 'deed, work, function' },
      { greek: 'ἡμέτερος, -α, -ον', transliteration: 'hēmeteros', english: 'our own' },
      { greek: 'ἑνὶ λόγῳ', transliteration: 'heni logōi', english: 'in a word, in short' },
      { greek: 'οὐχ', transliteration: 'ouch', english: 'not (before a rough breathing)' },
      { greek: 'φαντασία, φαντασίας', transliteration: 'phantasia', english: 'impression, appearance' },
    ],
  },

  // ── SESSION 16 ─────────────────────────────────────────────────────────────
  {
    id: 16,
    title: 'The Aorist Tense',
    subtitle: 'Simple completed past action — the decisive act, the singular event',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form the first and second aorist active of common verbs',
      'Apply the aorist augment (same as imperfect)',
      'Understand the aspectual distinction between aorist (completed, simple) and imperfect (ongoing, repeated)',
      'Read aorist forms in Stoic contexts describing decisive choices and completed events',
    ],
    parts: [
      {
        heading: 'Part 1 — The Aorist: Point-Action in the Past',
        body: 'The Greek verb system distinguishes two kinds of past action by aspect. The imperfect (Session 12) describes ongoing, repeated, or background action: “I was practicing,” “he used to say.” The aorist describes action viewed as a complete whole, a single event or decisive act: “I chose,” “he said,” “it happened.”\n\nThe word ἀόριστος means “undefined” or “unbounded” — the aorist does not specify duration. It simply states that something happened. In narrative, the aorist advances the plot while the imperfect provides background. In Stoic texts, the aorist captures the moment of choice (prohairesis), the decision point, the decisive response to an impression.',
      },
      {
        heading: 'Part 2 — First Aorist (Weak Aorist)',
        body: 'The first aorist is formed by: augment + stem + σα + secondary endings. The σα marker is the signature of the first aorist — if you see -σα- in a past form, it is first aorist.',
        paradigms: [
          {
            title: 'First Aorist of λύω',
            headers: ['Person', 'First Aorist Active', 'First Aorist Mid.', 'Note'],
            rows: [
              ['1st sg.', 'ἔ-λυ-σα', 'ἐ-λυ-σάμην', 'σα marker + secondary ending'],
              ['2nd sg.', 'ἔ-λυ-σας', 'ἐ-λύ-σω', ''],
              ['3rd sg.', 'ἔ-λυ-σε(ν)', 'ἐ-λύ-σατο', ''],
              ['1st pl.', 'ἐ-λύ-σαμεν', 'ἐ-λυ-σάμεθα', ''],
              ['2nd pl.', 'ἐ-λύ-σατε', 'ἐ-λύ-σασθε', ''],
              ['3rd pl.', 'ἔ-λυ-σαν', 'ἐ-λύ-σαντο', ''],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Second Aorist (Strong Aorist)',
        body: 'The second aorist uses the same secondary endings as the first aorist but does NOT have the σα marker. Instead, it uses a different stem — often shorter than the present stem. The endings look exactly like the imperfect; only the stem identifies it as aorist.',
        paradigms: [
          {
            title: 'Common Second Aorists',
            headers: ['Verb', 'Present stem', 'Aorist stem', '2nd Aorist 3rd sg.'],
            rows: [
              ['λαμβάνω (take)', 'λαμβαν-', 'λαβ-', 'ἔλαβε(ν)'],
              ['λέγω (say)', 'λεγ-', 'εἰπ-/λεγ-', 'εἶπε(ν) / ἔλεξε'],
              ['ὁράω (see)', 'ὁρα-/ὁρ-', 'ἰδ-', 'εἶδε(ν)'],
              ['βάλλω (throw)', 'βαλλ-', 'βαλ-', 'ἔβαλε(ν)'],
              ['αἱρέω (choose, take)', 'αἱρε-', 'ἑλ-', 'εἵλετο (mid.)'],
            ],
          },
        ],
        callout: {
          text: 'αἱρέω is philosophically significant: its aorist middle εἵλετο means “he chose for himself.” The prohairesis (προαίρεσις) is the capacity that does this choosing. The root of the word is αἱρ- — the aorist stem.',
        },
      },
      {
        heading: 'Part 4 — Aorist vs. Imperfect: The Critical Distinction',
        body: 'The Stoic ethics of choice lives in the aorist. When Epictetus says “choose” (αἱροῦ or the aorist imperative ἑλοῦ), the aorist captures the decisive quality of prohairesis — not “be in the process of choosing” but “make the choice, now, once.”',
        paradigms: [
          {
            title: 'Aorist vs. Imperfect',
            headers: ['Sentence', 'Tense', 'Meaning'],
            rows: [
              ['ἔλεγε τὴν ἀλήθειαν.', 'Imperfect', 'He was telling / used to tell the truth.'],
              ['εἶπε τὴν ἀλήθειαν.', 'Aorist (2nd)', 'He told the truth (on that occasion).'],
              ['ἠσκεῖτο τὴν ἀρετήν.', 'Imperfect', 'He was practicing virtue (ongoing).'],
              ['εἵλετο τὴν ἀρετήν.', 'Aorist middle', 'He chose virtue (decisive act).'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '16.1',
        prompt: 'First Aorist Forms — give the first aorist 3rd singular active of: λύω, γράφω, ἀσκέω, πιστεύω',
        answer: 'ἔλυσε(ν), ἔγραψε(ν), ἤσκησε(ν), ἐπίστευσε(ν)',
      },
      {
        number: '16.2',
        prompt: 'Identify Aorist or Imperfect: 1. ἔλεγε  2. εἶπε  3. ἔγραφε  4. ἔγραψε  5. εἵλετο',
        answer: '1. Imperfect — ongoing/repeated saying. 2. Aorist (2nd) — decisive/completed saying. 3. Imperfect — was writing. 4. Aorist (1st) — wrote (completed). 5. Aorist middle of αἱρέω — chose (for himself).',
      },
      {
        number: '16.3',
        prompt: 'Translate: 1. εἵλετο τὴν ἀρετήν, καίπερ χαλεπὴν οὖσαν.  2. ἔλεγεν ἀεὶ ὅτι ἡ ψυχὴ ἐλευθέρα ἐστίν.',
        answer: '1. He chose virtue, even though it was difficult (lit. “being difficult”). 2. He was always saying that the soul is free.',
      },
      {
        number: '16.4',
        prompt: 'Philosophical Reflection — why is it significant that prohairesis comes from the aorist stem of αἱρέω?',
        answer: 'Προαίρεσις (prohairesis) means “choosing before” or “prior choice” — the capacity for deliberate, self-directed decision. The root αἱρ- is the aorist stem of αἱρέω (to choose, take). The aorist expresses single, complete, decisive action — not ongoing process. By grounding the word in the aorist stem, the name captures the quality Epictetus most values in the faculty: its decisiveness, its character as a complete act of will rather than a drift or tendency. Every time you exercise prohairesis, you make a discrete choice. The aorist is the tense of discrete choices.',
      },
    ],
    quiz: [
      { question: 'What is the signature marker of the first aorist?', options: ['-σα- between the stem and the secondary endings', 'The augment ἐ- alone', 'Reduplication of the first consonant', 'The ending -μαι'], correct: 0 },
      { question: 'What is the aspectual difference between aorist and imperfect?', options: ['Aorist is future, imperfect is past', 'Aorist = completed, single act viewed as a whole; imperfect = ongoing, repeated, background action', 'Aorist = ongoing; imperfect = completed', 'They are identical in meaning'], correct: 1 },
      { question: 'Give the first aorist 1st singular of λύω.', options: ['ἔλυον', 'ἔλυσα', 'λύσω', 'λέλυκα'], correct: 1 },
      { question: 'What is the 2nd aorist 3rd singular of λέγω?', options: ['ἔλεγε', 'εἶπε(ν)', 'λέξει', 'ἐρεῖ'], correct: 1 },
      { question: 'What is the aorist middle 3rd singular of αἱρέω?', options: ['αἱρεῖται', 'ᾑρέθη', 'εἵλετο', 'ἕξεται'], correct: 2 },
      { question: 'What is the connection between αἱρέω and prohairesis?', options: ['They are unrelated words', 'Προαίρεσις is built on αἱρ-, the aorist stem of αἱρέω — it names the faculty of decisive choice', 'αἱρέω is the future tense of προαιρέω', 'Both verbs mean “to see”'], correct: 1 },
      { question: 'Give the 2nd aorist 3rd singular of ὁράω.', options: ['ἑώρα', 'ὄψεται', 'εἶδε(ν)', 'ὁρᾷ'], correct: 2 },
      { question: 'How do you distinguish a 2nd aorist from an imperfect?', options: ['By the augment', 'By the accent', 'By the stem — 2nd aorist uses a different (usually shorter) stem than the present', 'They cannot be distinguished'], correct: 2 },
      { question: 'Translate: εἵλετο τὴν ἀρετήν.', options: ['He was choosing virtue.', 'He chose virtue (for himself) — a decisive act.', 'He will choose virtue.', 'Virtue was chosen by him.'], correct: 1 },
      { question: 'In a narrative, how do aorist and imperfect work together?', options: ['Both describe the future', 'The imperfect provides ongoing background; the aorist advances the plot with completed events', 'The aorist gives background; the imperfect advances the plot', 'They cannot occur in the same narrative'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'αἱρέω', transliteration: 'haireō', english: 'to take, to choose (mid. αἱρέομαι)' },
      { greek: 'λαμβάνω', transliteration: 'lambanō', english: 'to take, to receive' },
      { greek: 'λέγω', transliteration: 'legō', english: 'to say, to speak' },
      { greek: 'ὁράω', transliteration: 'horaō', english: 'to see' },
      { greek: 'προαίρεσις, προαιρέσεως', transliteration: 'prohairesis', english: 'choice, moral purpose, will' },
      { greek: 'ἀλήθεια, ἀληθείας', transliteration: 'alētheia', english: 'truth' },
    ],
  },

  // ── SESSION 17 ─────────────────────────────────────────────────────────────
  {
    id: 17,
    title: 'The Future Tense',
    subtitle: 'Anticipation, planning, and the Stoic relationship to what is coming',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form the future active and middle of regular verbs',
      'Recognize the future of contract verbs and key irregular futures',
      'Understand the philosophical tension between Stoic amor fati and the grammatical future',
      'Read future forms in Epictetus and Marcus Aurelius',
    ],
    parts: [
      {
        heading: 'Part 1 — Forming the Future Active',
        body: 'The future active is formed by adding -σ- between the present stem and the present active endings. For consonant-stem verbs, phonological rules apply: a labial (π, β, φ) + σ = ψ; a velar (κ, γ, χ) + σ = ξ; a dental (τ, δ, θ) + σ drops before σ.',
        paradigms: [
          {
            title: 'Future Active of λύω',
            headers: ['Person', 'Future Active', 'Translation', 'Note'],
            rows: [
              ['1st sg.', 'λύ-σ-ω', 'I will release', 'σ inserted before primary endings'],
              ['2nd sg.', 'λύ-σ-εις', 'you will release', ''],
              ['3rd sg.', 'λύ-σ-ει', 'he/she will release', ''],
              ['1st pl.', 'λύ-σ-ομεν', 'we will release', ''],
              ['2nd pl.', 'λύ-σ-ετε', 'you will release', ''],
              ['3rd pl.', 'λύ-σ-ουσι', 'they will release', ''],
            ],
          },
        ],
      },
      {
        heading: 'Part 2 — Key Irregular Futures',
        body: 'A handful of high-frequency verbs form their future from a different root or with a middle ending. These must be memorized — they appear constantly in Stoic prose.',
        paradigms: [
          {
            title: 'Key Irregular Futures',
            headers: ['Verb', 'Future', 'Meaning', 'Note'],
            rows: [
              ['εἰμί', 'ἔσομαι', 'I will be', 'middle form, no active future'],
              ['ἔχω', 'ἕξω / σχήσω', 'I will have', 'both forms exist'],
              ['λέγω', 'ἐρῶ', 'I will say', 'from a different root'],
              ['ὁράω', 'ὄψομαι', 'I will see', 'middle form'],
              ['φέρω', 'οἴσω', 'I will carry', 'suppletive future'],
              ['γίγνομαι', 'γενήσομαι', 'I will become', 'middle form'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Stoic Philosophy and the Future Tense',
        body: 'The Stoics have a philosophically loaded relationship to the future. On the one hand, they counsel that desire should not reach beyond the present moment — anticipatory anxiety about future events is a passion (pathos) arising from false judgment. On the other hand, Stoic physics holds that everything that will happen is already determined by the divine logos — the future, in a sense, is already fixed.\n\nYet Epictetus uses the future tense constantly. He writes: “If you try to avoid sickness or death or poverty, you will be miserable” (ἄθλιος ἔσῃ). He uses ἔσομαι (I will be) and related forms to express conditional predictions — “if you do this, that will follow.” The future is not forbidden in Stoic thought; anticipatory anxiety about it is.\n\nMarcus Aurelius strikes the balance with his memento mori futures: ὁ νῦν σπουδαζόμενος ἔσται ἐπιλελησμένος — “what is now eagerly pursued will be forgotten.” He uses the future to puncture attachment to present circumstances by showing their impermanence.',
      },
      {
        heading: 'Part 4 — Phonological Rules for the Future',
        body: 'When the future σ meets a consonant stem, the same euphonic rules apply that you met in the noun system. Memorize the four patterns and you can predict the future of almost any verb.',
        paradigms: [
          {
            title: 'Future Phonological Rules',
            headers: ['Stem ending', 'Rule', 'Example'],
            rows: [
              ['Labial (π, β, φ)', 'π/β/φ + σ = ψ', 'γράφω → γράψω (I will write)'],
              ['Velar (κ, γ, χ)', 'κ/γ/χ + σ = ξ', 'ἄγω → ἄξω (I will lead)'],
              ['Dental (τ, δ, θ)', 'τ/δ/θ drops before σ', 'πείθω → πείσω (I will persuade)'],
              ['Contract -έω', '-εσ- → contraction', 'ἀσκέω → ἀσκήσω (I will practice)'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '17.1',
        prompt: 'Form the Future — give future active 1st singular of: λύω, γράφω, ἄγω, ἀσκέω, πείθω',
        answer: 'λύσω, γράψω, ἄξω, ἀσκήσω, πείσω',
      },
      {
        number: '17.2',
        prompt: 'Irregular Futures — give the future 1st singular of: εἰμί, λέγω, ὁράω',
        answer: 'ἔσομαι, ἐρῶ, ὄψομαι',
      },
      {
        number: '17.3',
        prompt: 'Translate: 1. ἐὰν ὀρέγῃ τῶν ἐκτός, ἄθλιος ἔσῃ.  2. ἡ ψυχὴ ἐλευθέρα ἔσται, ἐὰν τὴν ὁρμὴν κατέχῃ.',
        answer: '1. If you desire external things, you will be miserable. 2. The soul will be free, if it holds back its impulse.',
      },
      {
        number: '17.4',
        prompt: 'Philosophical Reflection — explain the Stoic view: the future tense is permitted in speech, but anticipatory desire for future goods is forbidden. How are these consistent?',
        answer: 'The Stoics distinguish between using the future tense to make conditional predictions (“if X, then Y will follow”) and using desire to reach after future outcomes (“I must have that future good”). The first is rational inference — the logos can trace causal chains and speak about what will follow. The second is an inappropriate extension of desire (orexis) beyond the present sphere of prohairesis. Epictetus permits the former — “if you eat the fig tree, your stomach will hurt” — while forbidding the second: “reach only for what is eph’ hēmin, which is always present-tensed (your current judgment, impulse, assent).” The future tense is a grammatical tool; anticipatory attachment is a passion.',
      },
    ],
    quiz: [
      { question: 'How is the future active formed?', options: ['Augment + stem + secondary endings', 'Present stem + σ + primary active endings', 'Reduplication + stem + κα', 'Stem + lengthened thematic vowel'], correct: 1 },
      { question: 'What happens when a labial stem meets the future σ?', options: ['The σ drops', 'Labial + σ = ψ (e.g., γράφω → γράψω)', 'Labial + σ = ξ', 'The vowel lengthens'], correct: 1 },
      { question: 'What is the future of εἰμί?', options: ['ἦν', 'ἔσομαι (middle form) — “I will be”', 'ἐστί', 'εἶναι'], correct: 1 },
      { question: 'What is the future 1st singular of λέγω?', options: ['λέξω', 'ἔλεξα', 'ἐρῶ — from a different root (suppletive)', 'λεγήσω'], correct: 2 },
      { question: 'Give the future 3rd singular of ἀσκέω.', options: ['ἀσκεῖ', 'ἤσκει', 'ἀσκήσει', 'ἀσκήσεται'], correct: 2 },
      { question: 'What is the Stoic prohibition regarding the future?', options: ['Never use the future tense', 'Anticipatory desire (orexis) should not extend toward future goods — only what is eph’ hēmin is the proper object of desire', 'The future tense is grammatically forbidden', 'Only the gods may speak of the future'], correct: 1 },
      { question: 'Translate: ἄθλιος ἔσῃ.', options: ['You were miserable.', 'You will be miserable.', 'He is miserable.', 'May you be miserable.'], correct: 1 },
      { question: 'What does a velar stem + σ produce?', options: ['ψ', 'ξ (e.g., ἄγω → ἄξω)', 'σσ', 'The σ drops'], correct: 1 },
      { question: 'What does a dental stem do before σ in the future?', options: ['It becomes ψ', 'It becomes ξ', 'The dental (τ, δ, θ) drops before σ (e.g., πείθω → πείσω)', 'It doubles'], correct: 2 },
      { question: 'How does Marcus Aurelius use the future to puncture present attachment?', options: ['He forbids the future tense entirely', 'He shows that what is now eagerly pursued will be forgotten — ἔσται ἐπιλελησμένος', 'He uses only the imperfect', 'He predicts personal success'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'εἰμί (fut. ἔσομαι)', transliteration: 'eimi / esomai', english: 'to be / I will be' },
      { greek: 'ἔχω', transliteration: 'echō', english: 'to have, to hold' },
      { greek: 'φέρω', transliteration: 'pherō', english: 'to carry, to bear' },
      { greek: 'πείθω', transliteration: 'peithō', english: 'to persuade' },
      { greek: 'ἄθλιος, -α, -ον', transliteration: 'athlios', english: 'wretched, miserable' },
      { greek: 'τὰ ἐκτός', transliteration: 'ta ektos', english: 'external things, externals' },
    ],
  },

  // ── SESSION 18 ─────────────────────────────────────────────────────────────
  {
    id: 18,
    title: 'Infinitives',
    subtitle: 'Verbal nouns, indirect statement, and the grammar of philosophical purpose',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form present and aorist active and middle infinitives',
      'Use infinitives in indirect statement with the accusative-plus-infinitive construction',
      'Recognize infinitives after verbs of wishing, commanding, and ability',
      'Read infinitive constructions in Stoic texts expressing purpose and indirect discourse',
    ],
    parts: [
      {
        heading: 'Part 1 — The Infinitive as Verbal Noun',
        body: 'The infinitive is the “dictionary form” of a verb in English (“to run,” “to be”). In Greek, infinitives function as verbal nouns — they can serve as subjects, objects, or complements of other verbs. They carry tense (present = ongoing, aorist = simple/completed) and voice (active, middle, passive) but do not inflect for person or number.\n\nThe present infinitive emphasizes ongoing action: ζῆν εὖ, “to be living well.” The aorist infinitive emphasizes completion or simple occurrence: γενέσθαι σοφόν, “to become wise.” This aspectual distinction mirrors the indicative tenses.',
      },
      {
        heading: 'Part 2 — Infinitive Forms',
        body: 'The infinitive endings are -ειν (present active), -εσθαι (present middle), -σαι (first aorist active), and -σασθαι (first aorist middle). Second aorist infinitives use the aorist stem with the present endings.',
        paradigms: [
          {
            title: 'Infinitive Forms',
            headers: ['Form', 'Greek', 'Translation'],
            rows: [
              ['Present active inf.', 'λύ-ειν', 'to be releasing / to release'],
              ['Present middle inf.', 'λύ-εσθαι', 'to be releasing (for oneself)'],
              ['Aorist active inf. (1st)', 'λῦ-σαι', 'to have released / to release (once)'],
              ['Aorist middle inf. (1st)', 'λύ-σασθαι', 'to have released for oneself'],
              ['Aorist active inf. (2nd)', 'λαβ-εῖν (from λαμβάνω)', 'to take (completed)'],
              ['εἰμί present inf.', 'εἶναι', 'to be'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Indirect Statement with Accusative + Infinitive',
        body: 'After verbs of saying, thinking, believing, knowing, and perceiving, Greek often uses the accusative + infinitive construction for indirect statement. The subject of the infinitive is in the accusative; the infinitive expresses the content of the belief or statement. Structure: [main verb of saying/thinking] + [accusative subject] + [infinitive predicate].',
        paradigms: [
          {
            title: 'Accusative + Infinitive',
            headers: ['Greek', 'Literal', 'Translation'],
            rows: [
              ['νομίζω τὴν ψυχὴν ἐλευθέραν εἶναι.', '“I consider the soul to be free.”', 'I think the soul is free.'],
              ['λέγουσιν αὐτὸν σοφὸν εἶναι.', '“They say him to be wise.”', 'They say he is wise.'],
              ['ἐπίσταμαι τὸν θάνατον ἀδιάφορον εἶναι.', '“I know death to be indifferent.”', 'I know that death is indifferent.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Infinitives After βούλομαι, δύναμαι, δεῖ',
        body: 'Three constructions appear constantly in Epictetus and require the infinitive:\n\nβούλομαι + inf. — “I wish to ___.” The subject of the infinitive is usually the same as the subject of βούλομαι, so no accusative is expressed: βούλομαι ἀσκεῖν τὴν ἀρετήν — “I wish to practice virtue.”\n\nδύναμαι + inf. — “I am able to ___, I can.” δυνάμεθα αἱρεῖσθαι τὴν ἀρετήν — “We are able to choose virtue.”\n\nδεῖ + accusative + inf. — “it is necessary for [someone] to ___.” Impersonal verb; the “experiencer” goes into the accusative: δεῖ σε σκέπτεσθαι τὰς φαντασίας — “It is necessary for you to examine your impressions.”',
      },
    ],
    exercises: [
      {
        number: '18.1',
        prompt: 'Form the Infinitive — give present active and aorist active infinitives of: λύω, ἀσκέω, λαμβάνω',
        answer: 'λύω: λύειν (pres.), λῦσαι (aor.). ἀσκέω: ἀσκεῖν (pres., contracted), ἀσκῆσαι (aor.). λαμβάνω: λαμβάνειν (pres.), λαβεῖν (2nd aor.).',
      },
      {
        number: '18.2',
        prompt: 'Translate the Indirect Statement: 1. νομίζω τὸν θάνατον ἀδιάφορον εἶναι.  2. λέγουσιν αὐτὸν τὴν ἀρετὴν ᾑρῆσθαι.',
        answer: '1. I believe death to be indifferent. / I think that death is indifferent. 2. They say that he has chosen virtue. (perfect infinitive — Session 25 will formalize)',
      },
      {
        number: '18.3',
        prompt: 'δεῖ constructions — translate: δεῖ σε σκέπτεσθαι τὰς φαντασίας πρὶν συγκατατίθεσθαι.',
        answer: 'It is necessary for you to examine the impressions before giving assent (to them).',
      },
      {
        number: '18.4',
        prompt: 'Identify Tense and Aspect — explain the difference in meaning between: βούλομαι ἀσκεῖν (pres. inf.) vs. βούλομαι ἀσκῆσαι (aor. inf.)',
        answer: 'βούλομαι ἀσκεῖν — “I wish to be practicing / to practice (as an ongoing activity).” The present infinitive emphasizes the ongoing, habitual nature of the practice. βούλομαι ἀσκῆσαι — “I wish to practice (once, on this occasion).” The aorist infinitive views the practice as a single, completed event. In Stoic contexts, the present infinitive fits better for describing askēsis as a sustained discipline; the aorist might describe a specific exercise or performance.',
      },
    ],
    quiz: [
      { question: 'What is the present active infinitive of λύω?', options: ['λύειν', 'λῦσαι', 'λύεσθαι', 'λελυκέναι'], correct: 0 },
      { question: 'What is the first aorist active infinitive of λύω?', options: ['λύειν', 'λῦσαι', 'λύσασθαι', 'λαβεῖν'], correct: 1 },
      { question: 'What is the present infinitive of εἰμί?', options: ['ἐστί', 'ἦν', 'εἶναι', 'ἔσεσθαι'], correct: 2 },
      { question: 'What construction does Greek use for indirect statement after verbs of thinking?', options: ['Genitive absolute', 'A purpose clause with ἵνα', 'Accusative + infinitive (accusative subject, infinitive predicate)', 'The subjunctive alone'], correct: 2 },
      { question: 'Translate: νομίζω τὸν θάνατον ἀδιάφορον εἶναι.', options: ['I think/believe death to be indifferent.', 'Death thinks me to be indifferent.', 'I wish death to come.', 'Death is necessary for me.'], correct: 0 },
      { question: 'What does δεῖ + accusative + infinitive mean?', options: ['“I wish to ___”', '“I am able to ___”', '“It is necessary for [someone] to ___”', '“I say that ___”'], correct: 2 },
      { question: 'What is the 2nd aorist infinitive of λαμβάνω?', options: ['λαμβάνειν', 'λαβεῖν', 'λήψεσθαι', 'λαβέσθαι'], correct: 1 },
      { question: 'What aspectual difference does present vs. aorist infinitive express?', options: ['Present = past, aorist = future', 'Present = ongoing, continuous action; aorist = simple, completed, or point-action', 'Present = active, aorist = passive', 'There is no difference'], correct: 1 },
      { question: 'Give the present middle infinitive of λύω.', options: ['λύειν', 'λύεσθαι', 'λῦσαι', 'λύσασθαι'], correct: 1 },
      { question: 'Translate: δεῖ σε σκέπτεσθαι τὰς φαντασίας.', options: ['You examine the impressions.', 'It is necessary for you to examine the impressions.', 'You wish to examine the impressions.', 'You were examining the impressions.'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'εἶναι', transliteration: 'einai', english: 'to be (infinitive of εἰμί)' },
      { greek: 'βούλομαι', transliteration: 'boulomai', english: 'to wish, to want' },
      { greek: 'δύναμαι', transliteration: 'dynamai', english: 'to be able, can' },
      { greek: 'δεῖ', transliteration: 'dei', english: 'it is necessary (impersonal)' },
      { greek: 'νομίζω', transliteration: 'nomizō', english: 'to think, to believe, to consider' },
      { greek: 'ἐπίσταμαι', transliteration: 'epistamai', english: 'to know, to understand' },
    ],
  },

  // ── SESSION 19 ─────────────────────────────────────────────────────────────
  {
    id: 19,
    title: 'Participles II — Aorist & Perfect',
    subtitle: 'Completed action as description — the philosophical grammar of formation',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form the aorist active and perfect active participle',
      'Decline aorist and perfect participles in all three genders',
      'Distinguish present (simultaneous), aorist (prior completed), and perfect (resulting state) participles by aspect',
      'Read complex participial phrases in Epictetus describing character formation',
    ],
    parts: [
      {
        heading: 'Part 1 — Three Participial Aspects',
        body: 'You have learned the present active participle (Session 14): action simultaneous with the main verb. Greek has two additional participial aspects that are philosophically significant:\n\nThe aorist participle describes action completed before the main verb — “having chosen,” “having practiced,” “having examined.” It answers “what did he do first, and then…?” For Stoics, the aorist participle captures formation that precedes and enables the current state.\n\nThe perfect participle describes a state resulting from a completed action — “having been trained (and therefore being trained now),” “having chosen (and therefore standing in the position of having chosen).” It is the participle of character formation — of the person who has done the work and now possesses the disposition.',
      },
      {
        heading: 'Part 2 — Aorist Active Participle',
        body: 'The aorist active participle adds -σας, -σασα, -σαν to the aorist stem (without augment — participles never take augment outside the indicative).',
        paradigms: [
          {
            title: 'Aorist Active Participle of λύω',
            headers: ['Case', 'Masculine', 'Feminine', 'Neuter'],
            rows: [
              ['Nom. sg.', 'λύ-σας', 'λύ-σασα', 'λύ-σαν'],
              ['Gen. sg.', 'λύ-σαντος', 'λυ-σάσης', 'λύ-σαντος'],
              ['Dat. sg.', 'λύ-σαντι', 'λυ-σάσῃ', 'λύ-σαντι'],
              ['Acc. sg.', 'λύ-σαντα', 'λύ-σασαν', 'λύ-σαν'],
            ],
          },
        ],
        callout: {
          text: 'Key note: participles never take the augment. If you see ἐ- before a participial form, it is not an aorist participle — it is an indicative form.',
        },
      },
      {
        heading: 'Part 3 — Perfect Active Participle',
        body: 'The perfect active participle is formed with reduplication (a repeated first consonant + ε) + the perfect stem + -κώς, -κυῖα, -κός.',
        paradigms: [
          {
            title: 'Perfect Active Participle of λύω',
            headers: ['Case', 'Masculine', 'Feminine', 'Neuter'],
            rows: [
              ['Nom. sg.', 'λε-λυ-κώς', 'λε-λυ-κυῖα', 'λε-λυ-κός'],
              ['Gen. sg.', 'λε-λυ-κότος', 'λε-λυ-κυίας', 'λε-λυ-κότος'],
            ],
          },
        ],
        callout: {
          text: 'The reduplication (λε- in λελυκώς) is the signature of all perfect forms in Greek — present in the perfect active, perfect middle/passive, and the pluperfect. Reduplication signals: this action has been completed and its result persists.',
        },
      },
      {
        heading: 'Part 4 — Reading Participial Chains in Epictetus',
        body: 'Epictetus builds character descriptions as participial chains — stacking aorist participles to describe the formation history of a person, then reaching a perfect or present participle to describe their current state. The pattern: “Having practiced X, having examined Y, having chosen Z, he now stands as W.”',
        paradigms: [
          {
            title: 'Participial Chains',
            headers: ['Participial phrase', 'Analysis'],
            rows: [
              ['ἀσκήσας τὴν προσοχήν', 'Aorist participle — having practiced attention (first, then…)'],
              ['ἑλόμενος τὴν ἀρετήν', 'Aorist middle participle of αἱρέω — having chosen virtue (second)'],
              ['πεπαιδευμένος ἐλεύθερος ἐστίν', 'Perfect passive participle — the man who has been educated is free'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '19.1',
        prompt: 'Form the Aorist Participle — give the nominative singular masculine aorist active participle of: λύω, γράφω, ἀσκέω',
        answer: 'λύσας, γράψας, ἀσκήσας',
      },
      {
        number: '19.2',
        prompt: 'Identify Aspect — identify each as present, aorist, or perfect participle: 1. λύων  2. λύσας  3. λελυκώς  4. ἀσκῶν  5. ἀσκήσας',
        answer: '1. Present active participle (simultaneous). 2. Aorist active participle (prior completed). 3. Perfect active participle (resulting state). 4. Present active participle. 5. Aorist active participle.',
      },
      {
        number: '19.3',
        prompt: 'Translate Participial Chains — ἀσκήσας τὴν ἀρετὴν καὶ ἑλόμενος τὸ καλόν, εὐδαίμων ἐγένετο.',
        answer: 'Having practiced virtue and having chosen the noble/good, he became happy.',
      },
      {
        number: '19.4',
        prompt: 'Perfect Participle and Character — explain the philosophical significance of using the perfect participle to describe a Stoic sage.',
        answer: 'The perfect participle (πεπαιδευμένος — “having been educated, trained”) describes not merely what someone did in the past but the stable state of character that results from it. For Stoic ethics, this is crucial: virtue (aretē) is not a series of discrete actions but a stable disposition (hexis) of the soul. The perfect tense/aspect expresses exactly this — the completed formation whose result persists in the present as character. When Epictetus describes the prokopton (one making progress) or the sage, he reaches for the perfect because it captures what the sustained practice of Sessions 11–19 is supposed to produce: not someone who is currently practicing but someone who has practiced and has thereby become something.',
      },
    ],
    quiz: [
      { question: 'What does the aorist participle express temporally?', options: ['Action simultaneous with the main verb', 'Action completed before the main verb — “having done X”', 'Action after the main verb', 'No temporal relation'], correct: 1 },
      { question: 'What is the signature feature of perfect forms?', options: ['The augment ἐ-', 'The -σα- marker', 'Reduplication (repeated first consonant + ε) before the stem', 'The ending -ομαι'], correct: 2 },
      { question: 'Give the nominative singular masculine aorist active participle of λύω.', options: ['λύων', 'λύσας', 'λελυκώς', 'λύσασα'], correct: 1 },
      { question: 'Give the nominative singular masculine perfect active participle of λύω.', options: ['λύσας', 'λύων', 'λελυκώς', 'λυθείς'], correct: 2 },
      { question: 'Do participles take the augment?', options: ['Yes, always', 'No — the augment appears only on indicative forms, not on participles', 'Only the aorist participle does', 'Only the perfect participle does'], correct: 1 },
      { question: 'What does the perfect participle describe?', options: ['A future intention', 'An ongoing background action', 'A stable state resulting from a completed action — character rather than event', 'A simple past event'], correct: 2 },
      { question: 'Translate: ἀσκήσας τὴν ἀρετήν, εὐδαίμων ἐγένετο.', options: ['Practicing virtue, he is happy.', 'Having practiced virtue, he became happy.', 'He will practice virtue and be happy.', 'Virtue having been praised, he rejoiced.'], correct: 1 },
      { question: 'What is the feminine nominative singular of the aorist active participle of λύω?', options: ['λύσασα', 'λύουσα', 'λελυκυῖα', 'λύσαν'], correct: 0 },
      { question: 'What is the neuter nominative singular of the perfect active participle of λύω?', options: ['λύσαν', 'λῦον', 'λελυκός', 'λελυκώς'], correct: 2 },
      { question: 'What philosophical concept does the perfect participle encode for Epictetus?', options: ['A single decisive choice', 'Stable disposition (hexis) — the formed character that results from sustained practice', 'Anticipatory anxiety', 'An external indifferent'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἀσκέω', transliteration: 'askeō', english: 'to practice, to train' },
      { greek: 'αἱρέομαι', transliteration: 'haireomai', english: 'to choose (middle)' },
      { greek: 'παιδεύω', transliteration: 'paideuō', english: 'to educate, to train' },
      { greek: 'ἕξις, ἕξεως', transliteration: 'hexis', english: 'disposition, stable state' },
      { greek: 'καλόν, τὸ καλόν', transliteration: 'to kalon', english: 'the noble, the beautiful, the good' },
      { greek: 'πρόκοπτων', transliteration: 'prokoptōn', english: 'one making progress' },
    ],
  },

  // ── SESSION 20 ─────────────────────────────────────────────────────────────
  {
    id: 20,
    title: 'The Subjunctive Mood',
    subtitle: 'Possibility, purpose, and deliberation — the grammar of choice under uncertainty',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Form the present and aorist subjunctive active and middle',
      'Use the subjunctive in purpose clauses (ἵνα, ὡς, ὅπως + subjunctive)',
      'Use the subjunctive in indefinite relative clauses (ἐάν + subjunctive)',
      'Read subjunctive constructions in Stoic texts expressing conditional guidance and purpose',
    ],
    parts: [
      {
        heading: 'Part 1 — The Subjunctive: Action as Possible or Purposed',
        body: 'The indicative mood (all sessions to date) states facts about the actual world. The subjunctive mood refers to action as possible, purposed, or conditional — “in order that,” “whenever,” “if ever.” The subjunctive does not express unreality (that is the optative, Session 21) but possibility and purpose.\n\nFor Stoic practical reasoning, the subjunctive is the mood of deliberation. When Epictetus counsels “practice examining impressions so that you may not be swept away,” the purpose clause requires the subjunctive: ἵνα μὴ παρασύρῃ. The subjunctive encodes the teleological structure of Stoic askēsis — practice toward a purpose.',
      },
      {
        heading: 'Part 2 — Forming the Present Subjunctive',
        body: 'The subjunctive is formed on the present or aorist stem with lengthened thematic vowels: ο/ε → ω/η. The endings are identical to the primary active endings but on lengthened stems.',
        paradigms: [
          {
            title: 'Present Subjunctive of λύω',
            headers: ['Person', 'Present Subj. Active', 'Present Subj. Mid/Pass.', 'Note'],
            rows: [
              ['1st sg.', 'λύ-ω', 'λύ-ωμαι', 'identical to indicative 1st sg.!'],
              ['2nd sg.', 'λύ-ῃς', 'λύ-ῃ', 'lengthened vowel η'],
              ['3rd sg.', 'λύ-ῃ', 'λύ-ηται', ''],
              ['1st pl.', 'λύ-ωμεν', 'λυ-ώμεθα', 'ω throughout 1st pl.'],
              ['2nd pl.', 'λύ-ητε', 'λύ-ησθε', ''],
              ['3rd pl.', 'λύ-ωσι(ν)', 'λύ-ωνται', ''],
            ],
          },
        ],
        callout: {
          text: 'The 1st singular present subjunctive is identical to the present indicative (λύω). Context — particularly the presence of ἵνα, ὅπως, ἐάν — signals the subjunctive.',
        },
      },
      {
        heading: 'Part 3 — Purpose Clauses',
        body: 'Purpose clauses use ἵνα, ὡς, or ὅπως followed by the subjunctive (in primary sequence) or the optative (in secondary sequence). The basic pattern: [main clause] + ἵνα + [subjunctive].',
        paradigms: [
          {
            title: 'Purpose Clauses',
            headers: ['Greek', 'Translation'],
            rows: [
              ['ἀσκεῖ ἵνα μὴ παρασύρηται.', 'He practices so that he may not be swept away.'],
              ['σκέπτου τὰς φαντασίας ὅπως μὴ πλανᾷ.', 'Examine the impressions so that you may not be deceived.'],
              ['ἐπιμελοῦ τῆς ψυχῆς ἵνα ἐλεύθερος ᾖς.', 'Care for your soul so that you may be free.'],
            ],
          },
        ],
      },
      {
        heading: 'Part 4 — Indefinite Relative Clauses with ἐάν',
        body: 'When a relative clause (ὅς, ὅτι, ὅσος) refers not to a definite person or thing but to an indefinite or general class, it uses ἐάν (= εἰ + ἄν) + the subjunctive. This is the grammatical form of the Stoic conditionals: “whatever is eph’ hēmin,” “whoever examines impressions,” “whenever you desire externals.”',
        paradigms: [
          {
            title: 'Indefinite Relative Clauses',
            headers: ['Greek', 'Translation'],
            rows: [
              ['ὅσα ἐφ᾿ ἡμῖν ἐστιν, ἐκεῖνα αἱροῦ.', 'Choose those things, whatever is up to us.'],
              ['ὃς ἂν σκέπτηται τὰς φαντασίας, οὗτος ἐλεύθερός ἐστιν.', 'Whoever examines his impressions is free.'],
              ['ἐὰν ὀρέγῃ τῶν ἐκτός, ἀτυχήσεις.', 'If ever you desire external things, you will fail.'],
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        number: '20.1',
        prompt: 'Form the Subjunctive — give the present subjunctive 3rd singular active of: λύω, ἀσκέω, εἰμί',
        answer: 'λύῃ, ἀσκῇ (contracted), ᾖ (irregular)',
      },
      {
        number: '20.2',
        prompt: 'Purpose Clauses — translate: ἐπιμελοῦ τῆς ψυχῆς ἵνα ἐλεύθερος ᾖς.',
        answer: 'Care for your soul so that you may be free.',
      },
      {
        number: '20.3',
        prompt: 'Indefinite Relative — translate: ὃς ἂν σκέπτηται τὰς φαντασίας, οὗτος ἐλεύθερός ἐστιν.',
        answer: 'Whoever examines his impressions, that person is free.',
      },
      {
        number: '20.4',
        prompt: 'The Subjunctive and Stoic Purpose — why is the purpose clause with ἵνα + subjunctive the natural grammatical form for expressing Stoic askēsis?',
        answer: 'Stoic practice (askēsis) is inherently teleological — it is done for a purpose, toward an end (telos). Every Stoic exercise has a rationale: examining impressions in order not to give false assent, practicing attention in order not to be swept away by passions, caring for the hēgemonikon in order to live according to reason. The purpose clause (ἵνα + subjunctive) grammatically encodes this teleological structure. The subjunctive mood (possible, purposed action, not yet actual) is fitting because the goal is not yet achieved — it is being aimed at. This is the grammar of the prokopton (one making progress), not yet the sage.',
      },
    ],
    quiz: [
      { question: 'What does the subjunctive mood express?', options: ['Facts about the actual world', 'Possible, purposed, or conditional action — not actual but aimed at or conditional', 'Completed past action', 'Direct commands only'], correct: 1 },
      { question: 'How is the present subjunctive formed?', options: ['Augment + stem + secondary endings', 'Reduplication + stem + κα', 'Present stem + lengthened thematic vowels (ο→ω, ε→η) + primary endings', 'Stem + σα + endings'], correct: 2 },
      { question: 'What conjunctions introduce purpose clauses?', options: ['ὅτι and γάρ', 'ἵνα, ὡς, or ὅπως — followed by the subjunctive', 'εἰ and ἄν', 'μέν and δέ'], correct: 1 },
      { question: 'Give the present subjunctive 3rd singular of εἰμί.', options: ['ἐστί', 'ἦν', 'ᾖ', 'ἔσται'], correct: 2 },
      { question: 'What does ἐάν + subjunctive signal?', options: ['A completed past event', 'An indefinite/general condition — “if ever,” “whenever”', 'A direct question', 'A purpose already achieved'], correct: 1 },
      { question: 'Translate: ἐὰν ὀρέγῃ τῶν ἐκτός, ἀτυχήσεις.', options: ['You desired external things and failed.', 'If ever you desire external things, you will fail.', 'You must not desire external things.', 'Desiring externals, he failed.'], correct: 1 },
      { question: 'How do you distinguish the present subjunctive 1st singular from the present indicative 1st singular?', options: ['By the accent', 'By the augment', 'They are identical (λύω) — context (ἵνα, ὅπως, ἐάν) signals the subjunctive', 'The subjunctive adds -μι'], correct: 2 },
      { question: 'How is the aorist subjunctive formed?', options: ['Augment + aorist stem + secondary endings', 'Aorist stem (without augment) + lengthened endings — e.g., λύσω', 'Reduplication + perfect stem', 'Present stem + -σα-'], correct: 1 },
      { question: 'Translate: ἀσκεῖ ἵνα μὴ παρασύρηται.', options: ['He practiced so that he was not swept away.', 'He practices so that he may not be swept away.', 'He will be swept away unless he practices.', 'Practicing, he was swept away.'], correct: 1 },
      { question: 'Why is the subjunctive called “the mood of the prokopton”?', options: ['It is the easiest mood to learn', 'It expresses what is aimed at but not yet achieved — purpose and possibility — fitting the student making progress toward a telos not yet attained', 'It is used only by the sage', 'It describes only past events'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ἵνα', transliteration: 'hina', english: 'in order that, so that' },
      { greek: 'ὅπως', transliteration: 'hopōs', english: 'so that, in order that' },
      { greek: 'ἐάν', transliteration: 'ean', english: 'if, if ever (+ subjunctive)' },
      { greek: 'παρασύρω', transliteration: 'parasyrō', english: 'to sweep away, to drag aside' },
      { greek: 'πλανάω', transliteration: 'planaō', english: 'to lead astray, to deceive' },
      { greek: 'ἐλεύθερος, -α, -ον', transliteration: 'eleutheros', english: 'free' },
    ],
  },

  // ── SESSION 21 ─────────────────────────────────────────────────────────────
  {
    id: 21,
    title: 'The Optative Mood',
    subtitle: 'Wishes, possibilities, and the grammar of what might be — γένοιτο',
    objectives: [
      'Form the present and aorist optative, active and middle',
      'Use the optative of wish (εἴθε, εἰ γάρ + optative)',
      'Use the potential optative (optative + ἄν) for “could” and “would”',
      'Distinguish the optative from the subjunctive in form and function',
    ],
    parts: [
      {
        heading: 'Part 1 — The Optative: Action as Wished or Possible',
        body: 'The subjunctive (Session 20) refers to action as purposed or anticipated. The optative steps one degree further from actuality: it refers to action as wished for or merely possible.\n\nThe optative has two independent uses. The optative of wish, often introduced by εἴθε or εἰ γάρ, expresses a wish for the future: εἴθε σοφὸς εἴην — “would that I were wise.” The potential optative, always accompanied by the particle ἄν, expresses what could or would happen: γένοιτο ἄν — “it could come to pass.”\n\nThe single most famous optative in later Greek is the bare γένοιτο — “may it be so.” For the Stoic reader the optative is philosophically charged territory: it is the grammar of desire projected onto the world. Epictetus’ counsel (Ench. 8) is precisely a discipline of the optative: do not wish that events happen as you want; want them as they happen.',
        callout: {
          label: 'Recognizing the optative',
          text: 'The optative is the mood of the diphthongs οι and αι: λύοιμι, λύοις, λύοι · λύσαιμι, λύσαις, λύσαι. If a verb form contains -οι- or -αι- where you expect the thematic vowel, suspect the optative.',
        },
      },
      {
        heading: 'Part 2 — Forming the Present and Aorist Optative',
        body: 'The present optative is built on the present stem with the mood suffix -οι- plus secondary endings. The aorist optative is built on the aorist stem (no augment — the augment belongs to the indicative only) with -αι-.',
        paradigms: [
          {
            title: 'Present Optative of λύω',
            headers: ['Person', 'Active', 'Middle/Passive'],
            rows: [
              ['1st sg.', 'λύ-οιμι', 'λυ-οίμην'],
              ['2nd sg.', 'λύ-οις', 'λύ-οιο'],
              ['3rd sg.', 'λύ-οι', 'λύ-οιτο'],
              ['1st pl.', 'λύ-οιμεν', 'λυ-οίμεθα'],
              ['2nd pl.', 'λύ-οιτε', 'λύ-οισθε'],
              ['3rd pl.', 'λύ-οιεν', 'λύ-οιντο'],
            ],
          },
          {
            title: 'Aorist Optative Active of λύω · Present Optative of εἰμί',
            headers: ['Person', 'Aorist Optative (λύω)', 'εἰμί'],
            rows: [
              ['1st sg.', 'λύσαιμι', 'εἴην'],
              ['2nd sg.', 'λύσαις (λύσειας)', 'εἴης'],
              ['3rd sg.', 'λύσαι (λύσειε)', 'εἴη'],
              ['1st pl.', 'λύσαιμεν', 'εἶμεν'],
              ['2nd pl.', 'λύσαιτε', 'εἶτε'],
              ['3rd pl.', 'λύσαιεν (λύσειαν)', 'εἶεν'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — The Optative in Subordinate Clauses',
        body: 'Beyond wish and potential, the optative replaces the subjunctive in subordinate clauses when the main verb is in a past (secondary) tense. A purpose clause after a present-tense verb takes ἵνα + subjunctive: ἀσκεῖ ἵνα ἐλεύθερος ᾖ — “he practices so that he may be free.” After a past-tense verb, the same clause shifts to the optative: ἤσκει ἵνα ἐλεύθερος εἴη — “he was practicing so that he might be free.”\n\nThis is called the optative of secondary sequence. It softens the vividness of the subjunctive to match the remoteness of past time — Greek grammar keeping precise account of how far a purpose stands from present actuality. You will meet it constantly in the narrative portions of the Discourses, where Epictetus reports what someone did and why.',
        callout: {
          label: 'Subjunctive vs. optative at a glance',
          text: 'Subjunctive: lengthened vowels ω/η — anticipated, vivid, tied to the present. Optative: diphthongs οι/αι — wished, possible, or shifted into the past. Purpose after a present verb → subjunctive; purpose after a past verb → optative.',
        },
      },
    ],
    exercises: [
      {
        number: '21.1',
        prompt: 'Form the optative — give the present optative active, 3rd singular and 3rd plural, of: λέγω, ἀσκέω (contract: -οίη/-οῖεν), ἔχω',
        answer: 'λέγοι, λέγοιεν · ἀσκοίη, ἀσκοῖεν · ἔχοι, ἔχοιεν',
      },
      {
        number: '21.2',
        prompt: 'Wish or potential? Classify each and translate: (a) εἴθε ἐλεύθερος εἴην. (b) γένοιτο ἄν. (c) εἰ γὰρ ἀσκοίης. (d) λέγοι ἄν τις ὅτι…',
        answer: '(a) Wish — “Would that I were free.” (b) Potential — “It could come to pass.” (c) Wish — “If only you would practice.” (d) Potential — “Someone might say that…” (the standard move for introducing an objection).',
      },
      {
        number: '21.3',
        prompt: 'Sequence shift — rewrite in secondary sequence: ἀσκοῦμεν ἵνα μὴ ταρασσώμεθα (“we practice so that we may not be disturbed”). Change the main verb to the imperfect and shift the mood.',
        answer: 'ἠσκοῦμεν ἵνα μὴ ταρασσοίμεθα — “we were practicing so that we might not be disturbed.” The subjunctive ταρασσώμεθα becomes optative ταρασσοίμεθα after the past-tense main verb.',
      },
      {
        number: '21.4',
        prompt: 'Reflection — Epictetus (Ench. 8) commands: do not seek that events happen as you wish. Given what the optative expresses, why might a Stoic say the discipline of desire is a discipline of the optative mood? Answer in 3–4 sentences.',
        answer: 'Open response. Strong answers: the optative projects wish onto the world — “may it be so.” Epictetus does not forbid the mood but redirects its object: instead of wishing the world matched desire, the prokopton wishes to assent well, act well, desire rightly — things that are up to us. γένοιτο aimed at externals is bondage; aimed at one’s own character it is the whole program.',
      },
    ],
    quiz: [
      { question: 'The optative mood characteristically shows which vowels?', options: ['ω and η', 'The diphthongs οι and αι', 'ει and ου', 'Augmented initial vowels'], correct: 1 },
      { question: 'εἴθε σοφὸς εἴην means:', options: ['I am certainly wise.', 'Would that I were wise.', 'I was wise once.', 'Am I wise?'], correct: 1 },
      { question: 'The potential optative always appears with which particle?', options: ['μή', 'ἵνα', 'ἄν', 'δέ'], correct: 2 },
      { question: 'γένοιτο ἄν is best translated:', options: ['It has come to pass.', 'Let it never happen.', 'It could come to pass.', 'It is coming to pass.'], correct: 2 },
      { question: 'The aorist optative of λύω is built on:', options: ['The augmented aorist stem (ἐλυσα-)', 'The unaugmented aorist stem + -αι- (λύσαι-)', 'The perfect stem (λελυκ-)', 'The present stem + ω/η'], correct: 1 },
      { question: 'Give the present optative 3rd singular of εἰμί.', options: ['ᾖ', 'εἴη', 'ἦν', 'ἔστω'], correct: 1 },
      { question: 'After a past-tense main verb, a purpose clause takes:', options: ['ἵνα + subjunctive', 'ἵνα + optative (secondary sequence)', 'ἵνα + indicative', 'The infinitive only'], correct: 1 },
      { question: 'Translate: ἤσκει ἵνα ἐλεύθερος εἴη.', options: ['He practices in order to be free.', 'He was practicing so that he might be free.', 'If only he would practice freedom.', 'He could practice freely.'], correct: 1 },
      { question: 'λέγοι ἄν τις (“someone might say”) is which use of the optative?', options: ['Optative of wish', 'Potential optative', 'Secondary-sequence optative', 'Imperatival optative'], correct: 1 },
      { question: 'Why is the optative philosophically significant for the discipline of desire?', options: ['It is the mood the sage uses exclusively', 'It is the grammar of wish — and Stoic training redirects wish from externals to one’s own judgments', 'It expresses only past regret', 'It cannot be negated'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'εἴθε', transliteration: 'eithe', english: 'would that, if only (introduces a wish)' },
      { greek: 'γένοιτο', transliteration: 'genoito', english: 'may it come to pass (aor. opt. of γίγνομαι)' },
      { greek: 'ἄν', transliteration: 'an', english: 'particle of potentiality (untranslatable alone)' },
      { greek: 'εὔχομαι', transliteration: 'euchomai', english: 'to pray, to wish for' },
      { greek: 'τύχη', transliteration: 'tychē', english: 'fortune, chance' },
      { greek: 'ἴσως', transliteration: 'isōs', english: 'perhaps, probably' },
    ],
  },

  // ── SESSION 22 ─────────────────────────────────────────────────────────────
  {
    id: 22,
    title: 'Conditions',
    subtitle: 'If it is up to us, if it were up to us — the complete Greek conditional system',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Identify and translate the principal Greek conditional types',
      'Distinguish ἐάν + subjunctive from εἰ + indicative and εἰ + optative',
      'Form and translate contrary-to-fact conditions with ἄν',
      'Read Stoic conditional reasoning in its original grammatical dress',
    ],
    parts: [
      {
        heading: 'Part 1 — A System of Distance from Fact',
        body: 'English marks conditions crudely: “if” plus a shift of tense. Greek deploys mood, tense, and the particle ἄν to grade a condition by its distance from actuality — from open questions of fact, through generalities and future possibilities, down to what is contrary to fact.\n\nStoic ethics lives in conditional form. The Encheiridion’s core arguments are chains of conditionals: if a thing is not up to us, it is nothing to us; if you desire what is not up to you, you will be hindered. To feel the exact force of these claims — is Epictetus stating a fact, a general law, or a warning about a possible future? — you must read the mood of the protasis.',
      },
      {
        heading: 'Part 2 — The Conditional Types',
        body: 'A condition has two parts: the protasis (the if-clause) and the apodosis (the then-clause). The principal types:',
        paradigms: [
          {
            title: 'The Greek Conditional System',
            headers: ['Type', 'Protasis', 'Apodosis', 'English feel'],
            rows: [
              ['Simple present', 'εἰ + pres. indic.', 'pres. indic.', 'if it is (open fact) … it is'],
              ['Simple past', 'εἰ + past indic.', 'past indic.', 'if it was … it was'],
              ['Present general', 'ἐάν + subjunctive', 'pres. indic.', 'if ever / whenever … (as a rule)'],
              ['Past general', 'εἰ + optative', 'imperfect indic.', 'if ever (in the past) … used to'],
              ['Future more vivid', 'ἐάν + subjunctive', 'future indic.', 'if (as may well happen) … will'],
              ['Future less vivid', 'εἰ + optative', 'optative + ἄν', 'if (you) should … would'],
              ['Present contrary-to-fact', 'εἰ + imperfect', 'imperfect + ἄν', 'if it were (but it isn’t) … would'],
              ['Past contrary-to-fact', 'εἰ + aorist', 'aorist + ἄν', 'if it had been (but it wasn’t) … would have'],
            ],
          },
        ],
        callout: {
          label: 'Two signals to watch',
          text: 'ἐάν (= εἰ + ἄν) always takes the subjunctive — general or vivid-future conditions. Bare εἰ with a past indicative plus ἄν in the apodosis is contrary to fact: εἰ + imperfect for present unreality, εἰ + aorist for past unreality.',
        },
      },
      {
        heading: 'Part 3 — Stoic Conditionals in the Wild',
        body: 'Epictetus prefers ἐάν + subjunctive: his warnings are general laws that hold whenever the case arises. ἐὰν ὀρέγῃ τῶν οὐκ ἐφ᾿ ἡμῖν, ἀτυχήσεις — “if ever you desire the things not up to us, you will fail” — this is how the world reliably works.\n\nThe contrary-to-fact appears at a famous moment you will read in full in Session 30. Encheiridion 5: death is nothing terrible — ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο, “since it would have appeared so even to Socrates.” The imperfect ἐφαίνετο with ἄν: if death were terrible (it is not), it would appear terrible to Socrates (it did not). One particle carries the whole counterfactual argument.\n\nNotice, finally, what this session shares with PHIL 705: Chrysippus’ conflict criterion asks when “if P then Q” genuinely holds. Greek grammar asks a prior question — what kind of holding is being claimed. The two disciplines meet in the same sentence.',
      },
    ],
    exercises: [
      {
        number: '22.1',
        prompt: 'Classify each condition by type: (a) ἐὰν ἀσκῇς, προκόψεις. (b) εἰ σοφὸς ἦν, οὐκ ἂν ἐταράσσετο. (c) εἰ ἀσκοίης, προκόπτοις ἄν. (d) εἰ ταῦτα λέγει, ἁμαρτάνει.',
        answer: '(a) Future more vivid — “If you practice, you will make progress.” (b) Present contrary-to-fact — “If he were wise, he would not be disturbed” (but he is not wise). (c) Future less vivid — “If you should practice, you would make progress.” (d) Simple present — “If he says these things, he errs” (open question of fact).',
      },
      {
        number: '22.2',
        prompt: 'Build the contrary-to-fact — render into Greek using ταράσσω (disturb): “If death were up to us (ἐφ᾿ ἡμῖν), it would not disturb us.”',
        answer: 'εἰ ὁ θάνατος ἐφ᾿ ἡμῖν ἦν, οὐκ ἂν ἡμᾶς ἐτάρασσεν. — εἰ + imperfect (ἦν) in the protasis, imperfect + ἄν (ἐτάρασσεν) in the apodosis: present contrary-to-fact.',
      },
      {
        number: '22.3',
        prompt: 'Parse the mood logic — Epictetus writes general laws with ἐάν + subjunctive rather than εἰ + present indicative. What is the philosophical difference between “if you desire externals, you suffer” as an open factual claim versus a general law? 3–4 sentences.',
        answer: 'Open response. Strong answers: εἰ + indicative treats a single case as an open question of fact; ἐάν + subjunctive legislates over every occurrence — whenever the antecedent arises, the consequent follows. Epictetus’ psychology is offered as law-like: the failure is not incidental but built into the structure of desire directed at what is not up to us. The grammar itself claims necessity — which is exactly what Chrysippus’ conflict criterion demands of a genuine conditional.',
      },
      {
        number: '22.4',
        prompt: 'Translate: ἐὰν τὴν ἔκκλισιν ἔχῃς πρὸς μόνα τὰ ἐφ᾿ ἡμῖν, οὐδέποτε δυστυχήσεις.',
        answer: '“If you direct aversion only toward the things that are up to us, you will never meet misfortune.” Future more vivid: ἐάν + subjunctive (ἔχῃς), future indicative (δυστυχήσεις). This is the argument of Encheiridion 2, which you read in full in Session 24.',
      },
    ],
    quiz: [
      { question: 'The two parts of a condition are called:', options: ['Subject and predicate', 'Protasis (if-clause) and apodosis (then-clause)', 'Antecedent and relative', 'Thesis and antithesis'], correct: 1 },
      { question: 'ἐάν always takes which mood?', options: ['Indicative', 'Optative', 'Subjunctive', 'Imperative'], correct: 2 },
      { question: 'A future-more-vivid condition is formed with:', options: ['εἰ + optative, optative + ἄν', 'ἐάν + subjunctive, future indicative', 'εἰ + imperfect, imperfect + ἄν', 'εἰ + present, present'], correct: 1 },
      { question: 'εἰ σοφὸς ἦν, οὐκ ἂν ἐταράσσετο is which type?', options: ['Simple past', 'Future less vivid', 'Present contrary-to-fact', 'Present general'], correct: 2 },
      { question: 'The signal of a contrary-to-fact apodosis is:', options: ['ἵνα + subjunctive', 'A past indicative with ἄν', 'A future indicative', 'The bare optative'], correct: 1 },
      { question: 'Present contrary-to-fact uses which tense in both clauses?', options: ['Aorist', 'Perfect', 'Imperfect', 'Future'], correct: 2 },
      { question: 'A “future less vivid” (should/would) condition is formed with:', options: ['εἰ + optative in the protasis, optative + ἄν in the apodosis', 'ἐάν + subjunctive, future indicative', 'εἰ + aorist, aorist + ἄν', 'εἰ + present, imperative'], correct: 0 },
      { question: 'In Ench. 5, ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο (“since it would have appeared so even to Socrates”), the ἄν + imperfect signals:', options: ['A general law', 'A contrary-to-fact claim — death is not terrible, so it did not appear terrible to Socrates', 'A vivid future prediction', 'An optative of wish'], correct: 1 },
      { question: 'Translate: ἐὰν ἀσκῇς, προκόψεις.', options: ['If you had practiced, you would have progressed.', 'If you practice, you will make progress.', 'If only you would practice!', 'Since you practice, you progress.'], correct: 1 },
      { question: 'Why does Epictetus prefer ἐάν + subjunctive for his ethical warnings?', options: ['It is easier to pronounce', 'It frames them as general laws holding for every occurrence, not claims about a single case', 'It is the only mood available with negatives', 'It marks the statements as doubtful'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'εἰ', transliteration: 'ei', english: 'if' },
      { greek: 'ἐάν', transliteration: 'ean', english: 'if (ever) — εἰ + ἄν, with subjunctive' },
      { greek: 'κωλύω', transliteration: 'kōlyō', english: 'to hinder, to prevent' },
      { greek: 'ἀναγκάζω', transliteration: 'anankazō', english: 'to compel, to force' },
      { greek: 'βλάπτω', transliteration: 'blaptō', english: 'to harm, to damage' },
      { greek: 'μέμφομαι', transliteration: 'memphomai', english: 'to blame, to find fault with' },
      { greek: 'δυστυχέω', transliteration: 'dystycheō', english: 'to meet misfortune' },
    ],
  },

  // ── SESSION 23 ─────────────────────────────────────────────────────────────
  {
    id: 23,
    title: 'Indirect Statement',
    subtitle: 'He says that… — the grammar of reported judgment',
    objectives: [
      'Use ὅτι/ὡς + finite verb after verbs of saying',
      'Use the accusative + infinitive construction after φημί and verbs of thinking',
      'Use the accusative + participle after verbs of knowing and perceiving',
      'Conjugate φημί and recognize its role in philosophical prose',
    ],
    parts: [
      {
        heading: 'Part 1 — Three Ways to Report a Thought',
        body: 'Greek has three constructions for indirect statement — reporting what someone says, thinks, or perceives — and the choice depends on the introducing verb.\n\n(1) ὅτι or ὡς + a finite verb, after most verbs of saying: λέγει ὅτι ὁ θάνατος οὐδὲν δεινόν ἐστιν — “he says that death is nothing terrible.” The reported clause keeps its own moods and tenses; this is the closest to English “that.”\n\n(2) Accusative + infinitive, after φημί (“say, assert”) and verbs of thinking (νομίζω, οἴομαι, ἡγέομαι): φησὶ τὸν θάνατον οὐδὲν δεινὸν εἶναι — literally “he asserts death to be nothing terrible.” The subject of the reported statement goes into the accusative; its verb becomes an infinitive.\n\n(3) Accusative + participle, after verbs of knowing and perceiving (οἶδα, ὁράω, ἀκούω): οἶδα σε ἀσκοῦντα — “I know you practicing,” i.e., “I know that you practice.” Perception verbs report what is directly grasped, and the participle keeps the reported fact vivid and present.',
        callout: {
          label: 'Why three constructions?',
          text: 'The construction encodes epistemic distance. ὅτι reports words; the infinitive reports a claim held as content; the participle reports what is known or perceived as fact. Greek marks in its syntax what modern epistemology marks with labels — saying, believing, knowing.',
        },
      },
      {
        heading: 'Part 2 — The Verb φημί',
        body: 'φημί (“I say, I assert”) is an irregular -μι verb of the highest frequency in philosophical prose — it is how doctrines are attributed: οἱ Στωικοί φασι… “the Stoics assert…”',
        paradigms: [
          {
            title: 'φημί — Present and Imperfect',
            headers: ['Person', 'Present', 'Imperfect'],
            rows: [
              ['1st sg.', 'φημί', 'ἔφην'],
              ['2nd sg.', 'φῄς', 'ἔφης (ἔφησθα)'],
              ['3rd sg.', 'φησί(ν)', 'ἔφη'],
              ['1st pl.', 'φαμέν', 'ἔφαμεν'],
              ['2nd pl.', 'φατέ', 'ἔφατε'],
              ['3rd pl.', 'φασί(ν)', 'ἔφασαν'],
            ],
          },
        ],
        callout: {
          text: 'ἔφη — “he said” — is the workhorse of the Discourses, which are Arrian’s transcripts of Epictetus talking. When you see ἔφη dropped into the middle of a sentence, it marks reported speech, exactly like English “, he said,”.',
        },
      },
      {
        heading: 'Part 3 — The Grammar of Assent',
        body: 'Indirect statement is where Greek grammar touches the Stoic theory of judgment most directly. A δόγμα — a judgment, the thing Encheiridion 5 says actually disturbs us — has the form of a statement held as true: “death is terrible.” The discipline of assent asks you to notice when you have moved from perceiving to asserting.\n\nGreek syntax keeps the ledger. ὁρῶ τὸν ἄνθρωπον ἀποθνῄσκοντα — “I see the man dying” (participle: perception). νομίζω τὸν θάνατον δεινὸν εἶναι — “I judge death to be terrible” (infinitive: a claim I hold). The second sentence is where the Stoic locates the error — and the grammar shows the exact point where the impression became an assertion. δοκεῖ μοι — “it seems to me” — is the impression itself, not yet assented to.\n\nReading Epictetus with this distinction in view turns grammatical analysis into a spiritual exercise: every indirect statement is somebody’s assent, laid open for inspection.',
      },
    ],
    exercises: [
      {
        number: '23.1',
        prompt: 'Identify the construction (ὅτι-clause, acc. + infinitive, or acc. + participle) and translate: (a) λέγει ὅτι ἀσκεῖ. (b) φησὶ τὴν ἀρετὴν μόνην ἀγαθὸν εἶναι. (c) οἶδα τὸν σοφὸν οὐ ταρασσόμενον. (d) νομίζουσι τὰ ἐκτὸς ἀγαθὰ εἶναι.',
        answer: '(a) ὅτι-clause — “He says that he practices.” (b) Acc. + inf. — “He asserts that virtue alone is good” (the core Stoic value thesis). (c) Acc. + part. — “I know that the wise man is not disturbed.” (d) Acc. + inf. — “They think that externals are goods” (the diagnosis of the many, per the Stoics: a false δόγμα).',
      },
      {
        number: '23.2',
        prompt: 'Convert direct to indirect — turn each direct statement into indirect statement after the given verb: (a) ὁ θάνατος οὐδὲν δεινόν ἐστιν. → φησὶ… (b) ἀσκῶ. → λέγει ὅτι… (c) προκόπτεις. → οἶδα…',
        answer: '(a) φησὶ τὸν θάνατον οὐδὲν δεινὸν εἶναι. (b) λέγει ὅτι ἀσκεῖ. (note the person shift: “I practice” → “he says that he practices”) (c) οἶδα σε προκόπτοντα. — “I know that you are making progress.”',
      },
      {
        number: '23.3',
        prompt: 'Conjugation drill — give the 3rd singular and 3rd plural, present and imperfect, of φημί.',
        answer: 'Present: φησί(ν), φασί(ν). Imperfect: ἔφη, ἔφασαν. The imperfect 3rd singular ἔφη (“he said”) is among the most frequent verb forms in the Discourses.',
      },
      {
        number: '23.4',
        prompt: 'Reflection — using the three constructions, explain in Greek-grammar terms the Stoic distinction between receiving an impression and assenting to it. Which construction corresponds to each stage? 3–5 sentences.',
        answer: 'Open response. Strong answers: perception verbs + participle (ὁρῶ… ἀποθνῄσκοντα) report the impression — what strikes the soul before evaluation; δοκεῖ μοι frames it as mere seeming. Verbs of thinking + infinitive (νομίζω… εἶναι) mark assent: the content is now held as a claim about how things are. The Stoic discipline is to linger in the first construction — to see, and to say “it seems” — before granting the infinitive of judgment.',
      },
    ],
    quiz: [
      { question: 'After λέγω, indirect statement is most commonly expressed by:', options: ['Accusative + infinitive', 'ὅτι or ὡς + a finite verb', 'Accusative + participle', 'The optative alone'], correct: 1 },
      { question: 'After φημί, indirect statement takes:', options: ['ὅτι + indicative', 'Accusative + infinitive', 'Accusative + participle', 'ἵνα + subjunctive'], correct: 1 },
      { question: 'After verbs of knowing and perceiving (οἶδα, ὁράω), indirect statement takes:', options: ['Accusative + participle', 'ὅτι + optative only', 'The bare infinitive', 'ἐάν + subjunctive'], correct: 0 },
      { question: 'φησὶ τὸν θάνατον οὐδὲν δεινὸν εἶναι means:', options: ['He fears that death is terrible.', 'He asserts that death is nothing terrible.', 'He knows death, which is terrible.', 'Say that death is nothing terrible!'], correct: 1 },
      { question: 'The 3rd singular imperfect of φημί — the “he said” of the Discourses — is:', options: ['φησί', 'ἔφη', 'ἔφασαν', 'φάτε'], correct: 1 },
      { question: 'In acc. + infinitive, the subject of the reported statement appears in the:', options: ['Nominative', 'Genitive', 'Dative', 'Accusative'], correct: 3 },
      { question: 'οἶδα σε ἀσκοῦντα means:', options: ['I know that you practice.', 'I say that you practiced.', 'Practice, so that I may know you!', 'I think you should practice.'], correct: 0 },
      { question: 'δοκεῖ μοι (“it seems to me”) corresponds to which stage of Stoic psychology?', options: ['Assent (synkatathesis)', 'The impression (phantasia), prior to assent', 'Impulse (hormē)', 'Virtue itself'], correct: 1 },
      { question: 'οἱ Στωικοί φασι τὴν ἀρετὴν μόνην ἀγαθὸν εἶναι reports:', options: ['A perception', 'The Stoic assertion that virtue alone is good', 'A wish about virtue', 'A condition contrary to fact'], correct: 1 },
      { question: 'Why does the choice among the three constructions matter philosophically?', options: ['It is purely stylistic', 'It encodes epistemic distance: reported words (ὅτι), held claims (infinitive), and known or perceived facts (participle)', 'Only the infinitive construction can be negated', 'The participle construction is later Christian Greek'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'φημί', transliteration: 'phēmi', english: 'to say, to assert (acc. + inf.)' },
      { greek: 'νομίζω', transliteration: 'nomizō', english: 'to think, to believe, to hold as custom' },
      { greek: 'οἴομαι / οἶμαι', transliteration: 'oiomai / oimai', english: 'to suppose, to imagine' },
      { greek: 'ἡγέομαι', transliteration: 'hēgeomai', english: 'to consider, to lead' },
      { greek: 'οἶδα', transliteration: 'oida', english: 'to know (perfect in form, present in meaning)' },
      { greek: 'δοκέω', transliteration: 'dokeō', english: 'to seem; δοκεῖ μοι — it seems to me' },
      { greek: 'δόγμα, -ατος, τό', transliteration: 'dogma', english: 'judgment, opinion, doctrine' },
    ],
  },

  // ── SESSION 24 ─────────────────────────────────────────────────────────────
  {
    id: 24,
    title: 'Encheiridion §§2–3 — New Passage',
    subtitle: 'Desire and aversion in the original — your second sustained reading',
    isMilestone: true,
    targetText:
      'Μέμνησο, ὅτι ὀρέξεως ἐπαγγελία ἐπιτυχία, οὗ ὀρέγῃ, ἐκκλίσεως ἐπαγγελία τὸ μὴ περιπεσεῖν ἐκείνῳ, ὃ ἐκκλίνεται, καὶ ὁ μὲν ἐν ὀρέξει ἀποτυγχάνων ἀτυχής, ὁ δὲ ἐν ἐκκλίσει περιπίπτων δυστυχής.',
    objectives: [
      'Read Encheiridion §2 in Greek with full grammatical comprehension',
      'Read the pot-and-kiss passage of Encheiridion §3',
      'Recognize ἄν (= ἐάν) + subjunctive and the genitive absolute in real text',
      'Master the vocabulary of desire (ὄρεξις) and aversion (ἔκκλισις)',
    ],
    parts: [
      {
        heading: 'Part 1 — From Paradigms to Text',
        body: 'Session 10 gave you Encheiridion §1: some things are up to us, some are not. Sessions 11–23 have been armament — voices, tenses, moods, participles, conditions, indirect statement. This session is the second milestone: §§2–3, where Epictetus draws the practical consequence of §1 for desire and aversion.\n\nRead the way you were trained: find the verb, find its subject, group each article with its noun, then let the particles (μέν… δέ…) show you the architecture. §2 is built on a strict μέν/δέ symmetry between ὄρεξις (desire, reaching-toward) and ἔκκλισις (aversion, leaning-away) — the two movements of the soul that the discipline of desire trains.',
        callout: {
          label: 'The two movements',
          text: 'ὄρεξις — desire, from ὀρέγω, “stretch out, reach for” (it takes a genitive object: ὀρέγῃ τινός, “you reach for something”). ἔκκλισις — aversion, from ἐκκλίνω, “lean away from.” All of Stoic moral psychology begins as the management of these two vectors.',
        },
      },
      {
        heading: 'Part 2 — Encheiridion §2: The Promise of Desire',
        body: 'Μέμνησο, ὅτι ὀρέξεως ἐπαγγελία ἐπιτυχία, οὗ ὀρέγῃ, ἐκκλίσεως ἐπαγγελία τὸ μὴ περιπεσεῖν ἐκείνῳ, ὃ ἐκκλίνεται, καὶ ὁ μὲν ἐν ὀρέξει ἀποτυγχάνων ἀτυχής, ὁ δὲ ἐν ἐκκλίσει περιπίπτων δυστυχής.\n\n“Remember that the promise of desire is the attainment of what you desire; the promise of aversion is not to fall into what is avoided; and the one who fails in desire is unfortunate (ἀτυχής), while the one who falls into what he avoids is miserable (δυστυχής).”\n\nEpictetus then turns the screw with a condition you can now parse on sight: ἂν μὲν οὖν μόνα ἐκκλίνῃς τὰ παρὰ φύσιν τῶν ἐπὶ σοί, οὐδενί, ὧν ἐκκλίνεις, περιπεσῇ — “if, then, you avoid only what is contrary to nature among the things that are up to you, you will fall into nothing that you avoid.” But — νόσον δ᾿ ἂν ἐκκλίνῃς ἢ θάνατον ἢ πενίαν, δυστυχήσεις — “if you try to avoid sickness or death or poverty, you will be miserable.” The conclusion is a command built from Session 13 vocabulary: lift your aversion away from everything not up to us.',
        paradigms: [
          {
            title: 'Encheiridion §2 — Clause-by-Clause Parse',
            headers: ['Greek', 'Form', 'Reading'],
            rows: [
              ['Μέμνησο', 'perf. mid. imperative of μιμνῄσκω', '“Remember!” — perfect: hold in a completed state of memory'],
              ['ὀρέξεως ἐπαγγελία ἐπιτυχία', 'three nominatives/genitives, no verb', 'nominal sentence: “the promise of desire [is] attainment”'],
              ['οὗ ὀρέγῃ', 'gen. relative + 2nd sg. middle', '“of that which you reach for” — ὀρέγομαι takes the genitive'],
              ['τὸ μὴ περιπεσεῖν ἐκείνῳ', 'articular aorist infinitive + dative', '“the not-falling-into that” — the infinitive as noun'],
              ['ὁ μὲν… ἀποτυγχάνων / ὁ δὲ… περιπίπτων', 'articular present participles', '“the one failing… the one falling-into” — participles as subjects'],
              ['ἂν ἐκκλίνῃς… περιπεσῇ / δυστυχήσεις', 'ἄν + subj. → future', 'future more vivid — the general law of Session 22'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — Encheiridion §3: The Pot and the Kiss',
        body: 'ἂν χύτραν στέργῃς, ὅτι “χύτραν στέργω”. κατεαγείσης γὰρ αὐτῆς οὐ ταραχθήσῃ· ἂν παιδίον σαυτοῦ καταφιλῇς ἢ γυναῖκα, ὅτι ἄνθρωπον καταφιλεῖς· ἀποθανόντος γὰρ οὐ ταραχθήσῃ.\n\n“If you are fond of a pot, say ‘it is a pot I am fond of’ — for when it is broken, you will not be disturbed. If you kiss your own child or your wife, say that you are kissing a human being — for when they die, you will not be disturbed.”\n\nTwo grammatical jewels here. First, κατεαγείσης αὐτῆς and ἀποθανόντος are genitive absolutes — a participle and its subject set off in the genitive, giving attendant circumstance: “it having been broken,” “the person having died.” Second, οὐ ταραχθήσῃ is the future passive of ταράσσω — the verb of Encheiridion 5. The whole aim of the practice is stated in a single future-passive verb: you will not be disturbed.\n\nThis is the most notorious passage in the Encheiridion — kiss your child while rehearsing their mortality. Read precisely, it is an exercise in the discipline of assent (Session 23): say what the thing is (ὁποῖόν ἐστιν), beginning from the smallest cases (ἀπὸ τῶν σμικροτάτων ἀρξάμενος), so that your love does not silently smuggle in the false judgment that the beloved is a permanent possession.',
        callout: {
          label: 'Genitive absolute',
          text: 'A participle whose subject is not part of the main clause goes into the genitive along with its subject: ἀποθανόντος (αὐτοῦ) — “he having died” → “when he dies.” You will meet it in nearly every paragraph of real Greek prose from here on.',
        },
      },
    ],
    exercises: [
      {
        number: '24.1',
        prompt: 'Parse fully: ὀρέξεως — ἐκκλίνῃς — περιπεσεῖν — ἀποτυγχάνων — ταραχθήσῃ.',
        answer: 'ὀρέξεως: gen. sg. of ὄρεξις (3rd decl.), “of desire.” ἐκκλίνῃς: pres. subjunctive act. 2nd sg. of ἐκκλίνω (after ἄν), “you avoid.” περιπεσεῖν: aorist infinitive of περιπίπτω, “to fall into.” ἀποτυγχάνων: pres. act. participle, nom. masc. sg., “failing to obtain.” ταραχθήσῃ: future passive 2nd sg. of ταράσσω, “you will be disturbed.”',
      },
      {
        number: '24.2',
        prompt: 'The μέν/δέ symmetry — lay out §2’s opening as a two-column table: what is the promise (ἐπαγγελία) of desire, and of aversion? Who is ἀτυχής and who is δυστυχής, and what is the difference?',
        answer: 'Desire (ὄρεξις): promises attainment (ἐπιτυχία) of what you reach for; the one who fails (ἀποτυγχάνων) is ἀτυχής — unfortunate, he missed. Aversion (ἔκκλισις): promises not falling into (μὴ περιπεσεῖν) what is avoided; the one who falls in (περιπίπτων) is δυστυχής — miserable, he got what he dreaded. The asymmetry matters: failed desire merely disappoints; failed aversion delivers you into the very thing you fear. That is why Epictetus’ first instruction is to retrain aversion, not desire.',
      },
      {
        number: '24.3',
        prompt: 'Genitive absolute — identify both genitive absolutes in §3, parse them, and translate the clauses they govern.',
        answer: 'κατεαγείσης αὐτῆς: aorist passive participle (κατάγνυμι, “break”) + pronoun, both genitive — “it having been broken” → “for when it is broken, you will not be disturbed” (οὐ ταραχθήσῃ). ἀποθανόντος: aorist active participle of ἀποθνῄσκω, genitive, subject understood — “(the person) having died” → “for when they die, you will not be disturbed.”',
      },
      {
        number: '24.4',
        prompt: 'Reflection — the instruction of §3 is to “say over” (ἐπιλέγειν) what a thing is, starting from the smallest things. Using the grammar of indirect statement from Session 23, explain what kind of speech-act ἐπιλέγειν names, and why starting with a pot rather than a child is pedagogically essential. 4–5 sentences.',
        answer: 'Open response. Strong answers: ἐπιλέγειν is deliberate self-addressed assertion — supplying, in words, the true description (“it is a pot,” “it is a mortal human”) before the false judgment (“it is mine forever”) can be assented to silently. It is assent made explicit and therefore inspectable. Starting from the pot trains the mechanism where the stakes are trivial and the judgment is easy to correct; the same grammatical and psychological move must already be habitual before it can hold under the weight of a child’s mortality. The order of practice is itself Stoic pedagogy: paradigms before texts, pots before persons.',
      },
    ],
    quiz: [
      { question: 'ὄρεξις and ἔκκλισις are, respectively:', options: ['Assent and impulse', 'Desire (reaching-toward) and aversion (leaning-away)', 'Virtue and vice', 'Pleasure and pain'], correct: 1 },
      { question: 'Μέμνησο is:', options: ['A present infinitive', 'A perfect middle imperative — “remember!”', 'An aorist subjunctive', 'A future indicative'], correct: 1 },
      { question: 'ὀρέγομαι (“I reach for, desire”) takes its object in the:', options: ['Accusative', 'Dative', 'Genitive', 'Nominative'], correct: 2 },
      { question: 'The one who fails in desire (ὁ ἐν ὀρέξει ἀποτυγχάνων) is called:', options: ['δυστυχής', 'ἀτυχής', 'σοφός', 'ἐλεύθερος'], correct: 1 },
      { question: 'ἂν ἐκκλίνῃς νόσον ἢ θάνατον, δυστυχήσεις is which conditional type?', options: ['Present contrary-to-fact', 'Future more vivid', 'Past general', 'Future less vivid'], correct: 1 },
      { question: 'κατεαγείσης αὐτῆς (“it having been broken”) is:', options: ['A dative of respect', 'A genitive absolute', 'An accusative + infinitive', 'A vocative phrase'], correct: 1 },
      { question: 'ταραχθήσῃ is:', options: ['Present middle, 3rd singular', 'Future passive, 2nd singular — “you will be disturbed”', 'Aorist active, 1st singular', 'Perfect passive participle'], correct: 1 },
      { question: 'In §3, Epictetus instructs you to say of your child that you kiss:', options: ['A blessing (εὐλογίαν)', 'A possession (κτῆμα)', 'A human being (ἄνθρωπον)', 'A gift of fortune (δῶρον τύχης)'], correct: 2 },
      { question: 'The articular infinitive τὸ μὴ περιπεσεῖν functions as:', options: ['A command', 'A noun — “the not-falling-into”', 'A question', 'A genitive absolute'], correct: 1 },
      { question: 'Why does Epictetus say to begin ἀπὸ τῶν σμικροτάτων — from the smallest things?', options: ['Small things are more valuable', 'The habit of true description must be built where stakes are low before it can hold where they are high', 'Large things cannot be described in Greek', 'The gods forbid practicing on people'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ὄρεξις, -εως, ἡ', transliteration: 'orexis', english: 'desire, reaching-toward' },
      { greek: 'ἔκκλισις, -εως, ἡ', transliteration: 'ekklisis', english: 'aversion, leaning-away' },
      { greek: 'ἐπαγγελία, -ας, ἡ', transliteration: 'epangelia', english: 'promise, profession' },
      { greek: 'ἀποτυγχάνω', transliteration: 'apotynchanō', english: 'to fail to obtain (+ gen.)' },
      { greek: 'περιπίπτω', transliteration: 'peripiptō', english: 'to fall into, to encounter (+ dat.)' },
      { greek: 'ἀτυχής / δυστυχής', transliteration: 'atychēs / dystychēs', english: 'unfortunate / miserable' },
      { greek: 'χύτρα, -ας, ἡ', transliteration: 'chytra', english: 'earthen pot' },
      { greek: 'στέργω', transliteration: 'stergō', english: 'to be fond of, to love (of affection)' },
      { greek: 'καταφιλέω', transliteration: 'kataphileō', english: 'to kiss' },
      { greek: 'ταράσσω', transliteration: 'tarassō', english: 'to disturb, to trouble' },
    ],
  },

  // ── SESSION 25 ─────────────────────────────────────────────────────────────
  {
    id: 25,
    title: 'The Perfect Tense',
    subtitle: 'πεπαίδευμαι — the grammar of formed character',
    objectives: [
      'Form the perfect active with reduplication (λέλυκα)',
      'Form the perfect middle/passive (λέλυμαι)',
      'Distinguish the perfect (present state from completed action) from the aorist (simple past event)',
      'Recognize the perfect as the tense of Stoic hexis — settled character',
    ],
    parts: [
      {
        heading: 'Part 1 — What the Perfect Means',
        body: 'The Greek perfect is not a past tense. It denotes a present state resulting from a completed action. ἔμαθον (aorist) — “I learned” (an event, over). μεμάθηκα (perfect) — “I have learned,” i.e., “I now stand in the state of one who learned”: I know.\n\nThis is why οἶδα (“I know”) is perfect in form with present meaning — knowing is the standing result of having seen. And it is why the perfect is philosophically the most Stoic of tenses. The goal of askēsis is not to have done exercises (aorist) but to be, now, the kind of person the exercises produced — a hexis, a settled disposition. πεπαίδευμαι: I have been educated, and I stand educated. γεγύμνασμαι: I stand trained. πέπεισμαι: I stand convinced — assent that has hardened into character.',
        callout: {
          label: 'Aorist vs. perfect',
          text: 'Aorist: the event happened (snapshot). Perfect: the result stands now (state). “Marcus wrote the Meditations” — aorist. “It stands written” (γέγραπται) — perfect. When Epictetus asks whether you have merely done philosophy or been changed by it, he is asking an aorist-versus-perfect question.',
        },
      },
      {
        heading: 'Part 2 — Forming the Perfect',
        body: 'The perfect active is marked by reduplication + stem + κα endings. Reduplication: an initial consonant is doubled with ε (λύω → λέ-λυκα; παιδεύω → πε-παίδευκα). An initial aspirate reduplicates with its unaspirated partner (φιλέω → πε-φίληκα; θύω → τέ-θυκα). Verbs beginning with a vowel lengthen it instead (ἀσκέω → ἤσκηκα).\n\nThe perfect middle/passive adds the personal endings directly to the reduplicated stem, with no thematic vowel: λέλυμαι, λέλυσαι, λέλυται…',
        paradigms: [
          {
            title: 'Perfect of λύω — Active and Middle/Passive',
            headers: ['Person', 'Perfect Active', 'Perfect Mid./Pass.'],
            rows: [
              ['1st sg.', 'λέλυκα', 'λέλυμαι'],
              ['2nd sg.', 'λέλυκας', 'λέλυσαι'],
              ['3rd sg.', 'λέλυκε(ν)', 'λέλυται'],
              ['1st pl.', 'λελύκαμεν', 'λελύμεθα'],
              ['2nd pl.', 'λελύκατε', 'λέλυσθε'],
              ['3rd pl.', 'λελύκασι(ν)', 'λέλυνται'],
            ],
          },
          {
            title: 'Philosophically Loaded Perfects',
            headers: ['Present', 'Perfect', 'Meaning of the perfect'],
            rows: [
              ['παιδεύω (educate)', 'πεπαίδευμαι', 'I stand educated'],
              ['γυμνάζω (train)', 'γεγύμνασμαι', 'I stand trained'],
              ['πείθω (persuade)', 'πέπεισμαι', 'I stand convinced'],
              ['κτάομαι (acquire)', 'κέκτημαι', 'I possess (having acquired)'],
              ['μανθάνω (learn)', 'μεμάθηκα', 'I know (having learned)'],
              ['γράφω (write)', 'γέγραπται', 'it stands written'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — The Perfect and the Stoic Hexis',
        body: 'κέκτημαι — the perfect of κτάομαι, “acquire” — means simply “I possess.” The acquisition is past; the possession is the present state. You will meet exactly this verb in Session 29, where Epictetus asks which faculty κέκτηται τὸ θεωρητικόν — “possesses the power of contemplation.”\n\nThe Stoics analyzed character the same way the perfect tense analyzes action. A virtue is not a series of good acts (aorists); it is the standing condition (hexis) that those acts built and that now produces new acts effortlessly. When Seneca says he is not yet wise but is making progress, the grammar of his claim is that the perfects are not yet true of him: he is being trained (present) but cannot yet say γεγύμνασμαι without qualification.\n\nAsk yourself, in Greek, at the end of each study session: τί μεμάθηκα; — what have I learned, such that I now stand knowing it? The perfect tense is a daily examination built into the language.',
      },
    ],
    exercises: [
      {
        number: '25.1',
        prompt: 'Form the perfect — give the perfect active 1st singular of: παιδεύω, φιλέω, ἀσκέω, μανθάνω (irregular: μεμάθηκα).',
        answer: 'πεπαίδευκα · πεφίληκα (aspirate φ reduplicates as π) · ἤσκηκα (initial vowel lengthens — no consonant reduplication) · μεμάθηκα.',
      },
      {
        number: '25.2',
        prompt: 'Aorist or perfect? Choose the correct tense for each meaning and give the form of πείθω (mid./pass.): (a) “He was persuaded (at that moment).” (b) “He stands convinced.”',
        answer: '(a) Aorist passive: ἐπείσθη — the event of persuasion. (b) Perfect middle/passive: πέπεισται — the standing state of conviction. The Stoic point: assent that matters is (b), not (a) — a conviction that persists as character, not a momentary yielding.',
      },
      {
        number: '25.3',
        prompt: 'Translate and comment: ὁ σοφὸς γεγύμνασται· ἡμεῖς δὲ ἔτι γυμναζόμεθα.',
        answer: '“The wise man stands trained; but we are still training.” Perfect (γεγύμνασται) versus present (γυμναζόμεθα): the sage possesses the completed state; the prokopton is inside the ongoing process. One sentence, two tenses, the entire Stoic distinction between the sage and the student.',
      },
      {
        number: '25.4',
        prompt: 'Reflection — why is οἶδα (“I know”) perfect in form? Connect the grammar to the Stoic distinction between katalepsis (secure grasp) and mere opinion. 3–4 sentences.',
        answer: 'Open response. Strong answers: οἶδα is the standing result of having seen (the root is that of εἶδον, “I saw”) — knowledge as the state left behind by a completed act of grasping. The Stoics defined epistēmē as katalepsis that is secure and unshakable by argument — precisely a perfect-tense condition: not the event of grasping but the abiding grip. Opinion (doxa) is grammatically present-tense — it wavers with each new impression; knowledge is perfective — settled, reduplicated into the structure of the soul.',
      },
    ],
    quiz: [
      { question: 'The Greek perfect tense denotes:', options: ['A simple past event', 'A present state resulting from a completed action', 'A future possibility', 'Repeated past action'], correct: 1 },
      { question: 'The perfect active of λύω is:', options: ['ἔλυσα', 'λέλυκα', 'λύσω', 'ἐλυόμην'], correct: 1 },
      { question: 'Reduplication of an initial aspirate (φ, θ, χ) uses:', options: ['The same aspirate (φε-, θε-, χε-)', 'The corresponding unaspirated stop (πε-, τε-, κε-)', 'The vowel η', 'No reduplication at all'], correct: 1 },
      { question: 'The perfect of a vowel-initial verb like ἀσκέω is formed by:', options: ['Consonant reduplication (σέσκηκα)', 'Lengthening the initial vowel (ἤσκηκα)', 'Adding the augment ἐ-', 'Using the aorist stem'], correct: 1 },
      { question: 'κέκτημαι (perfect of κτάομαι) means:', options: ['I acquired long ago and lost', 'I possess — the standing result of having acquired', 'I will acquire', 'I am acquiring'], correct: 1 },
      { question: 'οἶδα is perfect in form because:', options: ['It is an irregular aorist', 'Knowing is the standing state left by a completed act of seeing/grasping', 'It was borrowed from Latin', 'All -μι verbs are perfect'], correct: 1 },
      { question: 'πέπεισμαι means:', options: ['I am being persuaded right now', 'I stand convinced — persuasion hardened into a settled state', 'I persuaded someone else', 'I refuse to be persuaded'], correct: 1 },
      { question: 'γέγραπται (“it stands written”) is:', options: ['Perfect middle/passive, 3rd singular', 'Aorist active, 3rd plural', 'Future passive, 2nd singular', 'Present subjunctive'], correct: 0 },
      { question: 'The perfect 3rd plural active ending is:', options: ['-ουσι(ν) on the present stem', '-κασι(ν): λελύκασι(ν)', '-σαν: ἐλύκεσαν', '-νται: λέλυνται'], correct: 1 },
      { question: 'Why is the perfect “the tense of Stoic hexis”?', options: ['The Stoics wrote only in the perfect', 'Character, like the perfect, is a present standing state produced by completed past actions', 'The perfect is easier than the aorist', 'Hexis is a perfect-tense verb'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'παιδεύω / πεπαίδευμαι', transliteration: 'paideuō / pepaideumai', english: 'to educate / I stand educated' },
      { greek: 'γυμνάζω / γεγύμνασμαι', transliteration: 'gymnazō / gegymnasmai', english: 'to train / I stand trained' },
      { greek: 'πείθω / πέπεισμαι', transliteration: 'peithō / pepeismai', english: 'to persuade / I stand convinced' },
      { greek: 'κτάομαι / κέκτημαι', transliteration: 'ktaomai / kektēmai', english: 'to acquire / I possess' },
      { greek: 'μανθάνω / μεμάθηκα', transliteration: 'manthanō / memathēka', english: 'to learn / I know (having learned)' },
      { greek: 'ἕξις, -εως, ἡ', transliteration: 'hexis', english: 'settled state, disposition, character' },
    ],
  },

  // ── SESSION 26 ─────────────────────────────────────────────────────────────
  {
    id: 26,
    title: 'Compound Verbs & Prefixes',
    subtitle: 'προαίρεσις, συγκατάθεσις, προκοπή — the anatomy of the Stoic vocabulary',
    objectives: [
      'Recognize the common prepositional prefixes and their force',
      'Apply the rules of assimilation (συν + κατά → συγκατα-)',
      'Decompose the core Stoic technical terms into prefix + root',
      'Use the alpha-privative (ἀ-/ἀν-) to read negated abstracts like ἀπάθεια and ἀταραξία',
    ],
    parts: [
      {
        heading: 'Part 1 — Greek Builds Words Like Arguments',
        body: 'Greek philosophical vocabulary is not a list of arbitrary labels — it is built, transparently, from prepositions and roots. Once you know a dozen prefixes, hundreds of technical terms open on sight.\n\nThe main prefixes and their force: ἀπο- (away from), κατα- (down, against, thoroughly), συν- (with, together), παρα- (beside, aside, amiss), ἐπι- (upon, toward, in addition), προ- (before, forward), ἐκ- (out of), ἀνα- (up, again), ὑπο- (under), περι- (around, beyond).\n\nWhen a prefix meets the verb, sounds assimilate: συν + κατά + τίθημι gives συγκατατίθεμαι (ν → γ before κ); συν + λαμβάνω gives συλλαμβάνω (ν → λ before λ); ἐν + πίπτω gives ἐμπίπτω (ν → μ before π). Assimilation is why the dictionary form sometimes hides the prefix — you must learn to see through it.',
        callout: {
          label: 'The augment goes inside',
          text: 'In compound verbs the augment sits between prefix and root: προκόπτω → imperfect προὔκοπτον / aorist προὔκοψα (προ + ε contracts), ἐκκλίνω → ἐξέκλινον. If a verb seems to have its augment in the middle, it is a compound.',
        },
      },
      {
        heading: 'Part 2 — Decomposing the Stoic Lexicon',
        body: 'Now take apart the words you have been using all year. Each one is a compressed philosophical claim:',
        paradigms: [
          {
            title: 'The Stoic Technical Terms, Decomposed',
            headers: ['Term', 'Anatomy', 'Literal sense', 'Technical sense'],
            rows: [
              ['προαίρεσις', 'προ (before) + αἵρεσις (choosing)', 'choosing-before', 'the faculty of choice; moral character'],
              ['συγκατάθεσις', 'συν + κατά + θέσις (placing)', 'placing-down-together-with', 'assent — the mind setting itself with a proposition'],
              ['προκοπή', 'προ (forward) + κοπή (cutting)', 'cutting forward (as through forest)', 'moral progress; hence προκόπτων, the one making progress'],
              ['ἔκκλισις', 'ἐκ (out/away) + κλίσις (leaning)', 'leaning away', 'aversion'],
              ['ἐπιμέλεια', 'ἐπι (upon) + μέλει (it is a care)', 'care directed upon', 'attentive care — Socrates’ care of the soul'],
              ['ἀπάθεια', 'ἀ- (not) + πάθος (passion)', 'un-passion', 'freedom from pathological passion — not numbness'],
              ['ἀταραξία', 'ἀ- (not) + ταραχή (disturbance)', 'un-disturbedness', 'tranquility — ταράσσω defeated'],
            ],
          },
        ],
        callout: {
          label: 'The alpha-privative',
          text: 'ἀ- (ἀν- before vowels) negates: θάνατος/ἀθάνατος (deathless), δίκαιος/ἄδικος (unjust), πάθος/ἀπάθεια. English borrowed the device in “a-moral,” “an-archy.” Reading ἀπάθεια as “apathy” is exactly the mistake this session inoculates against: the word means the passions are absent, not that care is.',
        },
      },
      {
        heading: 'Part 3 — Reading with X-Ray Vision',
        body: 'Consider συγκατάθεσις one more time. Zeno’s image (reported by Cicero) was the open hand closing: the impression arrives (φαντασία), the hand begins to close (assent, συγκατάθεσις), the fist grips (κατάληψις, from κατά + λαμβάνω — “grasping down”), and knowledge (ἐπιστήμη, from ἐπί + ἵστημι — “standing upon”) is the grip that the other hand cannot pry loose. The entire Stoic epistemology is written into four compound nouns.\n\nOr take προαίρεσις, Epictetus’ favorite word for what you fundamentally are. It is not mere “will”: it is προ-αίρεσις, the choosing that stands before every particular choice — the standing policy of the soul from which individual decisions issue. When Epictetus says the tyrant can chain your leg but not your προαίρεσις, the word itself explains why: the leg is downstream; the choosing-before is upstream, where chains do not reach.\n\nFrom now on, when you meet an unfamiliar philosophical term, do not reach for the lexicon first. Cut it at the prefix, name the root, and guess. Then check. This is how fluent readers of philosophical Greek actually operate.',
      },
    ],
    exercises: [
      {
        number: '26.1',
        prompt: 'Decompose and gloss: ἐπισκοπέω — ἀποθνῄσκω — περιπίπτω — ἀναβαίνω — ὑπομένω.',
        answer: 'ἐπισκοπέω: ἐπι (upon) + σκοπέω (look) — “inspect, examine” (root of “episcopal” — the overseer). ἀποθνῄσκω: ἀπο (away/off) + θνῄσκω (die) — “die off,” the standard prose verb for dying. περιπίπτω: περι (around/into) + πίπτω (fall) — “fall in with, encounter” (Ench. 2!). ἀναβαίνω: ἀνα (up) + βαίνω (step) — “go up, ascend.” ὑπομένω: ὑπο (under) + μένω (remain) — “remain under,” i.e., endure — the Stoic ἀνέχου (bear) in one compound.',
      },
      {
        number: '26.2',
        prompt: 'Assimilation — apply the sound rules: συν + κατατίθεμαι; συν + λογίζομαι; ἐν + πίπτω; συν + βαίνω.',
        answer: 'συγκατατίθεμαι (ν → γ before κ) — “I assent.” συλλογίζομαι (ν → λ before λ) — “I reckon together, reason” — the root of “syllogism.” ἐμπίπτω (ν → μ before π) — “I fall into.” συμβαίνω (ν → μ before β) — “I come together, happen” — τὰ συμβαίνοντα, “the things that happen,” Epictetus’ phrase for events.',
      },
      {
        number: '26.3',
        prompt: 'Alpha-privative — build and translate the negated form: θάνατος (death) → ; δίκαιος (just) → ; ταραχή (disturbance) → ; πάθος (passion) → .',
        answer: 'ἀθάνατος — deathless, immortal. ἄδικος — unjust. ἀταραξία — undisturbedness, tranquility. ἀπάθεια — freedom from passion. Note the last two are the twin goals of Stoic practice, and both are grammatically negative: the Greek names the goal by what is absent — the storm, not the calm, is the marked term.',
      },
      {
        number: '26.4',
        prompt: 'Reflection — Epictetus says the tyrant chains the leg, not the προαίρεσις. Using the decomposition προ + αἵρεσις, explain in 3–4 sentences why the compound structure of the word itself carries the argument.',
        answer: 'Open response. Strong answers: αἵρεσις is a particular act of choosing; the prefix προ- places the faculty before all such acts — a standing disposition upstream of every situation. What is upstream of situations cannot be seized by anything that operates within situations (chains, tyrants, prisons). The word’s architecture — before + choosing — locates the self outside the reach of circumstance, which is precisely the claim of the dichotomy of control.',
      },
    ],
    quiz: [
      { question: 'The prefix συν- means:', options: ['Away from', 'With, together', 'Before', 'Under'], correct: 1 },
      { question: 'συν + κατά + τίθημι assimilates to:', options: ['συνκατατίθεμαι', 'συγκατατίθεμαι', 'συλκατατίθεμαι', 'σακατατίθεμαι'], correct: 1 },
      { question: 'προαίρεσις decomposes as:', options: ['πρός (toward) + αἴρω (lift)', 'προ (before) + αἵρεσις (choosing)', 'προ (before) + ἔρις (strife)', 'περί (around) + αἵρεσις'], correct: 1 },
      { question: 'προκοπή (progress) literally means:', options: ['Walking in circles', 'Cutting forward — as through obstruction', 'Climbing upward', 'Speaking beforehand'], correct: 1 },
      { question: 'The alpha-privative ἀ-/ἀν-:', options: ['Intensifies the root', 'Negates the root: πάθος → ἀπάθεια', 'Makes the root plural', 'Marks the aorist'], correct: 1 },
      { question: 'ἀπάθεια properly means:', options: ['Apathy — not caring about anything', 'Freedom from pathological passion — the passions absent, not care', 'Inability to feel pain', 'Hatred of pleasure'], correct: 1 },
      { question: 'In compound verbs, the augment appears:', options: ['Before the prefix (ἐπροκοπτον)', 'Between prefix and root (προὔκοπτον, ἐξέκλινον)', 'At the end of the word', 'Compounds take no augment'], correct: 1 },
      { question: 'κατάληψις (cognitive grasp) decomposes as:', options: ['κατά (down) + λῆψις (grasping) — “grasping down,” Zeno’s closing fist', 'κατά + λέξις (speech)', 'κάτω (below) + ἄληψις', 'It is not a compound'], correct: 0 },
      { question: 'συλλογίζομαι (reason together — root of “syllogism”) shows which assimilation?', options: ['ν → γ before κ', 'ν → λ before λ', 'ν → μ before π', 'Loss of the prefix'], correct: 1 },
      { question: 'τὰ συμβαίνοντα — Epictetus’ word for “events” — literally means:', options: ['The things sent by the gods', 'The things that step together / come to pass', 'The things that fall from above', 'The things outside us'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'προαίρεσις, -εως, ἡ', transliteration: 'prohairesis', english: 'moral choice, the choosing faculty' },
      { greek: 'συγκατατίθεμαι', transliteration: 'synkatatithemai', english: 'to assent to (+ dat.)' },
      { greek: 'προκόπτω / προκοπή', transliteration: 'prokoptō / prokopē', english: 'to make progress / progress' },
      { greek: 'ἐπισκοπέω', transliteration: 'episkopeō', english: 'to examine, to inspect' },
      { greek: 'ὑπομένω', transliteration: 'hypomenō', english: 'to endure, to stand firm under' },
      { greek: 'συμβαίνω', transliteration: 'symbainō', english: 'to happen, to come to pass' },
      { greek: 'ἀταραξία, -ας, ἡ', transliteration: 'ataraxia', english: 'tranquility, undisturbedness' },
    ],
  },

  // ── SESSION 27 ─────────────────────────────────────────────────────────────
  {
    id: 27,
    title: 'Numbers & Time Expressions',
    subtitle: 'ὄρθρου — at dawn: the grammar of the Stoic day',
    objectives: [
      'Decline εἷς, μία, ἕν and use the cardinals one through ten',
      'Use ordinals (πρῶτος, δεύτερος, τρίτος…)',
      'Express time when (dative), time within which (genitive), and duration (accusative)',
      'Read the temporal expressions that frame Stoic daily practice',
    ],
    parts: [
      {
        heading: 'Part 1 — The Cardinals and Ordinals',
        body: 'Greek numbers one through four decline; five through ten do not. The number one — εἷς, μία, ἕν — declines like a 3-1-3 adjective and matters philosophically: it is the word in claims of unity (one cosmos, one logos, one good).',
        paradigms: [
          {
            title: 'εἷς, μία, ἕν — “one”',
            headers: ['Case', 'Masc.', 'Fem.', 'Neut.'],
            rows: [
              ['Nom.', 'εἷς', 'μία', 'ἕν'],
              ['Gen.', 'ἑνός', 'μιᾶς', 'ἑνός'],
              ['Dat.', 'ἑνί', 'μιᾷ', 'ἑνί'],
              ['Acc.', 'ἕνα', 'μίαν', 'ἕν'],
            ],
          },
          {
            title: 'Cardinals and Ordinals, 1–10',
            headers: ['Number', 'Cardinal', 'Ordinal'],
            rows: [
              ['1', 'εἷς, μία, ἕν', 'πρῶτος, -η, -ον'],
              ['2', 'δύο', 'δεύτερος'],
              ['3', 'τρεῖς, τρία', 'τρίτος'],
              ['4', 'τέτταρες, τέτταρα', 'τέταρτος'],
              ['5', 'πέντε', 'πέμπτος'],
              ['6', 'ἕξ', 'ἕκτος'],
              ['7', 'ἑπτά', 'ἕβδομος'],
              ['8', 'ὀκτώ', 'ὄγδοος'],
              ['9', 'ἐννέα', 'ἔνατος'],
              ['10', 'δέκα', 'δέκατος'],
            ],
          },
        ],
        callout: {
          text: 'οὐδείς, οὐδεμία, οὐδέν — “no one, nothing” — is simply οὐδέ + εἷς: “not even one.” You have been reading it since Session 10: οὐδὲν δεινόν, “nothing terrible.” Watch for it declined: οὐδενί (dative), οὐδεμίαν (accusative feminine) — a form that anchors the reading in Session 29.',
        },
      },
      {
        heading: 'Part 2 — The Three Cases of Time',
        body: 'Greek expresses time by bare case, without a preposition, and the case choice is meaningful:\n\nDative — time when (a point): τῇ τρίτῃ ἡμέρᾳ, “on the third day.” τῇ ὑστεραίᾳ, “on the next day.”\n\nGenitive — time within which (a container): νυκτός, “by night / during the night.” ὄρθρου, “at dawn” (literally “within the dawn-time”). χειμῶνος, “in winter.”\n\nAccusative — duration (an extent): τρεῖς ἡμέρας, “for three days.” ὅλην τὴν νύκτα, “the whole night through.”\n\nThe logic is the cases you already know: the dative locates (as with place), the genitive partitions (a slice out of a stretch), the accusative measures extent (as the direct object measures the verb’s reach).',
      },
      {
        heading: 'Part 3 — The Grammar of the Stoic Day',
        body: 'Stoic practice is scheduled — morning preparation, daytime attention, evening review — and its texts are full of bare-case time expressions.\n\nMarcus Aurelius opens Meditations 5.1 with a genitive of time: Ὄρθρου, ὅταν δυσόκνως ἐξεγείρῃ, πρόχειρον ἔστω ὅτι ἐπὶ ἀνθρώπου ἔργον ἐγείρομαι — “At dawn, when you rise reluctantly, let this be at hand: I am rising for the work of a human being.” One genitive (ὄρθρου) sets the scene; the ὅταν-clause (ὅταν + subjunctive — Session 20’s indefinite construction) generalizes it to every morning.\n\nSeneca describes the evening examination: each night, review the day — ordinal by ordinal. τί πρῶτον ἐποίησας; τί δεύτερον; τί τρίτον; What did you do first? Second? Third? The ordinals turn a day into an examinable sequence.\n\nAnd duration marks the standard of practice: not οἴνῳ μιᾷ ἡμέρᾳ — “on one day” — but πάσας τὰς ἡμέρας, “all one’s days.” Philosophy, Epictetus insists, is not for τρεῖς ἡμέρας (three days, accusative of duration — the enthusiasm of the beginner) but for a lifetime.',
        callout: {
          label: 'ὅταν + subjunctive',
          text: 'ὅταν (= ὅτε + ἄν, “whenever”) takes the subjunctive exactly as ἐάν does — the indefinite temporal clause: ὅταν ἐξεγείρῃ, “whenever you wake.” Session 20’s grammar, now telling time.',
        },
      },
    ],
    exercises: [
      {
        number: '27.1',
        prompt: 'Decline οὐδείς in the masculine, all four cases, and translate οὐδενὶ περιπεσῇ (cf. Ench. 2).',
        answer: 'οὐδείς, οὐδενός, οὐδενί, οὐδένα. οὐδενὶ περιπεσῇ — “you will fall into nothing” (dative with περιπίπτω): the promise of correctly aimed aversion.',
      },
      {
        number: '27.2',
        prompt: 'Choose the case — translate into Greek using ἡμέρα (day) and νύξ (night): (a) “on the third day” (b) “for three days” (c) “during the night”.',
        answer: '(a) τῇ τρίτῃ ἡμέρᾳ — dative of time when. (b) τρεῖς ἡμέρας — accusative of duration. (c) νυκτός — genitive of time within which.',
      },
      {
        number: '27.3',
        prompt: 'Read Marcus — parse Ὄρθρου and ὅταν δυσόκνως ἐξεγείρῃ in Meditations 5.1, and explain what each construction contributes to the sentence’s force.',
        answer: 'Ὄρθρου: genitive of time within which — “at dawn / in the dawn-hours.” ὅταν … ἐξεγείρῃ: ὅταν + present subjunctive — indefinite temporal clause, “whenever you wake (reluctantly).” The genitive stamps the scene at its hardest hour; the indefinite subjunctive makes the instruction stand for every morning, not one. The grammar generalizes the exercise into a rule of life.',
      },
      {
        number: '27.4',
        prompt: 'The evening review — write, in Greek, the three questions of Seneca’s nightly examination using ordinals: “What did you do first? What second? What third?” (use ποιέω in the aorist).',
        answer: 'τί πρῶτον ἐποίησας; τί δεύτερον; τί τρίτον; — aorist ἐποίησας because each act is a completed event under review; the ordinals partition the day into a sequence the ruling faculty can audit.',
      },
    ],
    quiz: [
      { question: 'The Greek numbers that decline are:', options: ['All numbers one through ten', 'One through four; five through ten are indeclinable', 'Only “one”', 'None — Greek numbers never decline'], correct: 1 },
      { question: 'οὐδείς is built from:', options: ['οὐ + δεῖ (“it is not necessary”)', 'οὐδέ + εἷς — “not even one”', 'οὖς + δίς (“twice an ear”)', 'A Persian loanword'], correct: 1 },
      { question: 'Time when (a point in time) takes the:', options: ['Genitive', 'Dative', 'Accusative', 'Nominative'], correct: 1 },
      { question: 'Time within which takes the:', options: ['Genitive', 'Dative', 'Accusative', 'Vocative'], correct: 0 },
      { question: 'Duration of time takes the:', options: ['Genitive', 'Dative', 'Accusative', 'Nominative'], correct: 2 },
      { question: 'τρεῖς ἡμέρας means:', options: ['On the third day', 'For three days', 'Within three days', 'Every third day'], correct: 1 },
      { question: 'Ὄρθρου at the opening of Meditations 5.1 is:', options: ['A vocative — “O dawn!”', 'A genitive of time — “at dawn”', 'The name of a god', 'An accusative of duration'], correct: 1 },
      { question: 'ὅταν takes which mood?', options: ['Indicative always', 'Subjunctive — indefinite temporal clause (“whenever”)', 'Optative always', 'Imperative'], correct: 1 },
      { question: 'The ordinal “third” is:', options: ['τρεῖς', 'τρία', 'τρίτος', 'τριάς'], correct: 2 },
      { question: 'The dative of time parallels which spatial use of the dative?', options: ['Possession', 'Location at a point', 'Instrument', 'Indirect object'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'εἷς, μία, ἕν', transliteration: 'heis, mia, hen', english: 'one' },
      { greek: 'οὐδείς, οὐδεμία, οὐδέν', transliteration: 'oudeis', english: 'no one, nothing' },
      { greek: 'ἡμέρα, -ας, ἡ', transliteration: 'hēmera', english: 'day' },
      { greek: 'νύξ, νυκτός, ἡ', transliteration: 'nyx', english: 'night' },
      { greek: 'ὄρθρος, -ου, ὁ', transliteration: 'orthros', english: 'dawn, daybreak' },
      { greek: 'χρόνος, -ου, ὁ', transliteration: 'chronos', english: 'time (duration)' },
      { greek: 'καιρός, -οῦ, ὁ', transliteration: 'kairos', english: 'the right moment, occasion' },
    ],
  },

  // ── SESSION 28 ─────────────────────────────────────────────────────────────
  {
    id: 28,
    title: 'Relative Clauses',
    subtitle: 'ὅσα ἡμέτερα ἔργα — the things which are up to us',
    targetText: ENCHEIRIDION_1,
    objectives: [
      'Decline the relative pronoun ὅς, ἥ, ὅ',
      'Apply the agreement rule: gender and number from the antecedent, case from the relative clause',
      'Use ὅστις (indefinite relative) and ὅσος (“as much/many as”)',
      'Re-read Encheiridion §§1–2 with full command of their relative constructions',
    ],
    parts: [
      {
        heading: 'Part 1 — The Relative Pronoun',
        body: 'A relative clause packs a full sentence into an adjective’s job: “the things which are up to us.” The relative pronoun ὅς, ἥ, ὅ looks like the article without the initial τ (and with rough breathing and accent): ὅς, οὗ, ᾧ, ὅν…\n\nThe agreement rule is the hinge of the whole construction: the relative takes its gender and number from its antecedent, but its case from its own function inside the relative clause. ὁ σοφός, ὃν ὁρᾷς — “the wise man whom you see”: masculine singular from ὁ σοφός, but accusative because he is the object of ὁρᾷς.',
        paradigms: [
          {
            title: 'The Relative Pronoun ὅς, ἥ, ὅ',
            headers: ['Case', 'Masc. sg.', 'Fem. sg.', 'Neut. sg.', 'Masc. pl.', 'Fem. pl.', 'Neut. pl.'],
            rows: [
              ['Nom.', 'ὅς', 'ἥ', 'ὅ', 'οἵ', 'αἵ', 'ἅ'],
              ['Gen.', 'οὗ', 'ἧς', 'οὗ', 'ὧν', 'ὧν', 'ὧν'],
              ['Dat.', 'ᾧ', 'ᾗ', 'ᾧ', 'οἷς', 'αἷς', 'οἷς'],
              ['Acc.', 'ὅν', 'ἥν', 'ὅ', 'οὕς', 'ἅς', 'ἅ'],
            ],
          },
        ],
        callout: {
          label: 'Relative vs. article',
          text: 'ὁ (article) has no accent; ὅ (relative) is accented. οἱ (article) vs. οἵ (relative). The breathing and accent are the entire visible difference — one more reason the diacriticals of Session 1 were never optional.',
        },
      },
      {
        heading: 'Part 2 — Omitted Antecedents, ὅστις, and ὅσος',
        body: 'Greek freely omits a general antecedent: instead of “the things which are up to us,” simply ἃ ἐφ᾿ ἡμῖν — “what is up to us.” The neuter plural relative alone carries the sense “the things that…”.\n\nThe indefinite relative ὅστις, ἥτις, ὅ τι (“whoever, whatever”) declines both halves: οὗτινος, ᾧτινι… It generalizes: ὅστις ἀσκεῖ, προκόπτει — “whoever practices, progresses.”\n\nὅσος, -η, -ον means “as much as, as many as” — quantity rather than identity. This is the relative of the Encheiridion’s opening: καὶ ἁπλῶς ὅσα ἡμέτερα ἔργα — “and, in a word, as many things as are our own doings.” Epictetus does not enumerate what is up to us and close the list; ὅσα leaves the class open — everything, however much there is, that is our own work.\n\nOne refinement you have already met without knowing it: attraction. A relative that should be accusative is often pulled into the case of its genitive or dative antecedent. And verbs govern their relatives’ cases directly: in Ench. 2, οὗ ὀρέγῃ — “what you reach for” — is genitive because ὀρέγομαι takes the genitive (Session 24), not because of the antecedent.',
      },
      {
        heading: 'Part 3 — Re-Reading §1 with Open Eyes',
        body: 'Return to the sentence this course is built around: ἐφ᾿ ἡμῖν μὲν ὑπόληψις, ὁρμή, ὄρεξις, ἔκκλισις, καὶ ἁπλῶς ὅσα ἡμέτερα ἔργα· οὐκ ἐφ᾿ ἡμῖν δὲ σῶμα, κτῆσις, δόξα, ἀρχή, καὶ ἁπλῶς ὅσα οὐχ ἡμέτερα ἔργα.\n\nThe architecture is now completely transparent: two μέν/δέ lists, each closed by ὅσα + a nominal clause. The four powers up to us — judgment (ὑπόληψις), impulse (ὁρμή), desire (ὄρεξις), aversion (ἔκκλισις) — are named; then ὅσα ἡμέτερα ἔργα sweeps in everything of the same kind. The four externals — body, possessions, reputation, office — are named; then ὅσα οὐχ ἡμέτερα ἔργα closes that class too.\n\nThe philosophical work is done by the relative of quantity. Epictetus’ dichotomy is not two lists but two open classes, and the criterion of membership is stated inside the relative clause itself: is it ἡμέτερον ἔργον — our own doing? Grammar and doctrine are here the same thing: master the relative clause and you have mastered the sentence; master the sentence and you have the whole Stoic map of responsibility.',
      },
    ],
    exercises: [
      {
        number: '28.1',
        prompt: 'Apply the agreement rule — supply the correct form of the relative and translate: (a) ἡ ἀρετή, ___ διώκομεν (“virtue, which we pursue”) (b) ὁ φιλόσοφος, ___ ὁ λόγος ἀληθής (“the philosopher, whose account is true”) (c) τὰ πράγματα, ___ οὐκ ἐφ᾿ ἡμῖν (“the things, which are not up to us”).',
        answer: '(a) ἣν — feminine singular (from ἡ ἀρετή), accusative (object of διώκομεν). (b) οὗ — masculine singular, genitive (possession: “of whom the account is true”). (c) ἅ — neuter plural (from τὰ πράγματα), nominative in its clause.',
      },
      {
        number: '28.2',
        prompt: 'Omitted antecedent — translate: ἃ ἐφ᾿ ἡμῖν, ταῦτα φύσει ἐλεύθερα· ὧν δὲ οὐκ ἐφ᾿ ἡμῖν ὀρέγῃ, δουλεύσεις.',
        answer: '“What is up to us — these things are by nature free; but if you reach for what is not up to us (literally: of-the-things which are not up to us, if you desire [them]), you will be a slave.” ἃ: neuter plural relative with omitted antecedent. ὧν: genitive plural because ὀρέγομαι governs the genitive — the verb inside the clause, not the antecedent, fixes the case.',
      },
      {
        number: '28.3',
        prompt: 'ὅσος at work — in Ench. 1, why does Epictetus close each list with ὅσα (“as many as”) rather than a definite ἅ (“the ones which”)? What does the quantity-relative do philosophically? 3–4 sentences.',
        answer: 'Open response. Strong answers: ἅ would refer to a determinate, closed set — as if the four named items plus some known remainder exhausted the class. ὅσα leaves the class open and criterion-governed: however many things are our own doings, all of them fall on this side. The dichotomy is thereby a rule for sorting any future case, not a finished inventory — which is exactly what a daily practice needs: you meet a new situation and ask which side of ὅσα it falls on.',
      },
      {
        number: '28.4',
        prompt: 'Distinguish the forms — article or relative? ὁ λόγος / ὃ λέγεις / οἱ σοφοί / οἵ ἀσκοῦσιν. Translate each.',
        answer: 'ὁ λόγος — article: “the account/reason.” ὃ λέγεις — relative (accent!): “what you say.” οἱ σοφοί — article: “the wise.” οἵ ἀσκοῦσιν — relative: “who practice.” The accent and breathing are the only visible difference; the syntax confirms it (a relative introduces a clause with its own verb).',
      },
    ],
    quiz: [
      { question: 'The relative pronoun takes its gender and number from ___ and its case from ___:', options: ['Its own clause; the antecedent', 'The antecedent; its function in its own clause', 'The verb; the subject', 'The article; the noun'], correct: 1 },
      { question: 'In ἡ ἀρετή, ἣν διώκομεν, the relative is accusative because:', options: ['ἀρετή is accusative', 'It is the object of διώκομεν inside the relative clause', 'All feminine relatives are accusative', 'It agrees with διώκομεν in case'], correct: 1 },
      { question: 'The visible difference between ὁ (article) and ὅ (relative) is:', options: ['Nothing — context alone decides', 'The accent (and rough breathing on the relative)', 'The relative is always capitalized', 'The article is enclitic'], correct: 1 },
      { question: 'ὅσα in καὶ ἁπλῶς ὅσα ἡμέτερα ἔργα means:', options: ['The ones which (definite)', 'As many things as — an open, criterion-governed class', 'Whichever one (singular)', 'Because'], correct: 1 },
      { question: 'ὅστις differs from ὅς in that ὅστις is:', options: ['Plural only', 'Indefinite — “whoever, whatever”', 'Interrogative', 'Used only in poetry'], correct: 1 },
      { question: 'A general antecedent (“the things”) may be:', options: ['Repeated twice for emphasis', 'Omitted — ἃ ἐφ᾿ ἡμῖν, “what is up to us”', 'Placed after the relative clause only', 'Expressed only with ὅστις'], correct: 1 },
      { question: 'In Ench. 2’s οὗ ὀρέγῃ, the relative is genitive because:', options: ['Its antecedent is genitive', 'ὀρέγομαι takes a genitive object — the verb inside the clause governs the case', 'All relatives after ὅτι are genitive', 'It is a genitive absolute'], correct: 1 },
      { question: 'The genitive plural of the relative — identical in all three genders — is:', options: ['οἷς', 'ὧν', 'ἅς', 'οὗ'], correct: 1 },
      { question: 'The four powers Ench. 1 names as up to us are:', options: ['Body, possessions, reputation, office', 'Judgment (ὑπόληψις), impulse (ὁρμή), desire (ὄρεξις), aversion (ἔκκλισις)', 'Wisdom, courage, justice, temperance', 'Logic, physics, ethics, rhetoric'], correct: 1 },
      { question: 'Why is the relative clause the grammatical heart of the dichotomy of control?', options: ['It makes the sentence longer and more solemn', 'The membership criterion (ἡμέτερα ἔργα — our own doings) is stated inside the relative clause, turning the dichotomy into a rule for sorting any case', 'Relative clauses were sacred to the Stoics', 'It avoids naming the gods'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'ὅς, ἥ, ὅ', transliteration: 'hos, hē, ho', english: 'who, which, that' },
      { greek: 'ὅστις, ἥτις, ὅ τι', transliteration: 'hostis', english: 'whoever, whatever' },
      { greek: 'ὅσος, -η, -ον', transliteration: 'hosos', english: 'as much as, as many as' },
      { greek: 'ὑπόληψις, -εως, ἡ', transliteration: 'hypolēpsis', english: 'judgment, opinion, assumption' },
      { greek: 'ὁρμή, -ῆς, ἡ', transliteration: 'hormē', english: 'impulse toward action' },
      { greek: 'κτῆσις, -εως, ἡ', transliteration: 'ktēsis', english: 'possession, property' },
      { greek: 'ἕκαστος, -η, -ον', transliteration: 'hekastos', english: 'each, every' },
    ],
  },

  // ── SESSION 29 ─────────────────────────────────────────────────────────────
  {
    id: 29,
    title: 'Reading Workshop — Discourses I.1',
    subtitle: 'Sustained reading: the faculty that examines itself',
    isMilestone: true,
    targetText:
      'Τῶν ἄλλων δυνάμεων οὐδεμίαν εὑρήσετε αὐτὴν αὑτῆς θεωρητικήν, οὐ τοίνυν οὐδὲ δοκιμαστικὴν ἢ ἀποδοκιμαστικήν.',
    objectives: [
      'Read the opening of Discourses I.1 with grammatical control',
      'Apply the full toolkit — future, perfect, articular infinitive, reflexives — to unadapted prose',
      'Practice the professional reading method: verb first, then subject, then structure',
      'Understand why Epictetus begins the Discourses with the self-examining faculty',
    ],
    parts: [
      {
        heading: 'Part 1 — How to Attack a Real Paragraph',
        body: 'Everything before this session was preparation; this is the event. The Discourses are unadapted, spoken, argumentative Greek — Arrian’s transcript of Epictetus teaching. The chapter you are entering carries the title Περὶ τῶν ἐφ᾿ ἡμῖν καὶ οὐκ ἐφ᾿ ἡμῖν — “On the things that are up to us and not up to us.” You have been reading that phrase since Session 10; now you read the seminar it names.\n\nThe method, fixed as ritual: (1) Find the finite verb — person, number, tense, mood. (2) Find its subject — check the agreement. (3) Group every article with its noun before translating anything. (4) Set particles (μέν, δέ, γάρ, οὖν, τοίνυν) as signposts, not words to translate. (5) Only then render the sentence. Fluent readers do not read word-by-word left to right; they read grammatically, in one orbit around the verb.',
      },
      {
        heading: 'Part 2 — Discourses I.1.1: The Opening Sentence',
        body: 'Τῶν ἄλλων δυνάμεων οὐδεμίαν εὑρήσετε αὐτὴν αὑτῆς θεωρητικήν, οὐ τοίνυν οὐδὲ δοκιμαστικὴν ἢ ἀποδοκιμαστικήν.\n\n“Of the other faculties, you will find none that is contemplative of itself — none, therefore, that approves or disapproves (of itself).”\n\nWork the method. The verb: εὑρήσετε — future active, 2nd plural, of εὑρίσκω: “you will find.” The object: οὐδεμίαν — accusative feminine of οὐδείς (Session 27): “not one” (agreeing with an understood δύναμιν). The frame: τῶν ἄλλων δυνάμεων — partitive genitive standing first for emphasis: “of the other faculties.” Then the predicate accusatives: αὐτὴν αὑτῆς θεωρητικήν — “itself contemplative of itself” — note the rough breathing on αὑτῆς: this is the reflexive (of itself), not the plain pronoun. Finally the particle τοίνυν (“therefore, accordingly”) extends the point: no other faculty is self-examining, and so none is δοκιμαστική — approving — or ἀποδοκιμαστική — disapproving. The -ικός adjectives are capacity-words: “able to examine,” “able to approve.”',
        paradigms: [
          {
            title: 'Discourses I.1.1 — Word-by-Word Anatomy',
            headers: ['Greek', 'Form', 'Function'],
            rows: [
              ['Τῶν ἄλλων δυνάμεων', 'gen. pl.', 'partitive genitive, fronted: “of the other faculties”'],
              ['οὐδεμίαν', 'acc. fem. sg. of οὐδείς', 'object of εὑρήσετε; understand δύναμιν'],
              ['εὑρήσετε', 'fut. act. 2nd pl., εὑρίσκω', 'main verb: “you will find”'],
              ['αὐτὴν αὑτῆς', 'acc. + reflexive gen.', '“itself … of itself” — the reflexive marks self-relation'],
              ['θεωρητικήν', 'acc. fem. sg., -ικός adj.', 'predicate: “contemplative (of)” + gen.'],
              ['οὐ τοίνυν οὐδέ', 'particles', '“accordingly not even” — the inference marker'],
              ['δοκιμαστικὴν ἢ ἀποδοκιμαστικήν', 'acc. fem. sg.', '“approving or disapproving” — δοκιμάζω + -ικός'],
            ],
          },
        ],
      },
      {
        heading: 'Part 3 — The Argument Unfolds: Grammar, Music, and the Rational Faculty',
        body: 'Epictetus continues by interrogating the arts one by one. ἡ γραμματικὴ μέχρι τίνος κέκτηται τὸ θεωρητικόν; — “Grammar: how far does it possess the power of contemplation?” μέχρι τοῦ διαγνῶναι τὰ γράμματα — “as far as discriminating the letters.” ἡ μουσική; — “And music?” μέχρι τοῦ διαγνῶναι τὸ μέλος — “as far as discriminating the melody.”\n\nEvery tool of the course is on this surface. κέκτηται — the perfect of κτάομαι (Session 25): grammar stands possessing its power. μέχρι τοῦ διαγνῶναι — the articular infinitive in the genitive after μέχρι (“up to the point of discriminating”): the infinitive-as-noun from Session 18, now governed by a preposition. τὸ θεωρητικόν — the neuter adjective with article as abstract noun: “the contemplative (capacity).”\n\nGrammar can parse a sentence commanding you to write to a friend — Epictetus’ own example — but it cannot tell you whether now is the time to write. Music can tune the lyre; it cannot tell you whether now is the time to sing or to be silent. Only one faculty examines both itself and all the others, approves and disapproves, uses impressions and judges its own use of them: ἡ δύναμις ἡ λογική — the rational faculty. That is why it, alone of all things, is ἐφ᾿ ἡμῖν — and why the Discourses open here. The book’s first argument is a proof, from the self-application of reason, of the dichotomy you met in Session 10. You have now read it as its first students heard it.',
        callout: {
          label: 'αὐτοῦ vs. αὑτοῦ',
          text: 'Smooth breathing αὐτοῦ = “of him/it” (plain pronoun). Rough breathing αὑτοῦ = “of himself/itself” (contracted reflexive, ἑαυτοῦ). In I.1.1, αὑτῆς is what makes the faculty self-examining. An entire philosophy of reflexivity rides on one breathing mark — the payoff of Session 1’s diacritical drills.',
        },
      },
    ],
    exercises: [
      {
        number: '29.1',
        prompt: 'Method drill — for Discourses I.1.1, execute steps 1–3 of the reading method in writing: name the finite verb with full parsing, its subject, and every article-noun group in the sentence.',
        answer: 'Verb: εὑρήσετε — future active indicative, 2nd person plural, of εὑρίσκω (“you will find”). Subject: “you” (the students), contained in the verb ending — no expressed subject. Article-noun groups: τῶν ἄλλων δυνάμεων (“of the other faculties”). οὐδεμίαν stands alone (its noun δύναμιν is understood); θεωρητικήν, δοκιμαστικήν, ἀποδοκιμαστικήν are predicate adjectives on the understood δύναμιν.',
      },
      {
        number: '29.2',
        prompt: 'Parse the perfect — κέκτηται: identify tense, voice, person; name the present-tense dictionary form; explain why the perfect matters to the sense.',
        answer: 'κέκτηται: perfect middle, 3rd singular, of κτάομαι (“acquire”). The perfect of acquiring is possessing (Session 25): grammar stands in possession of its contemplative power. Epictetus is not narrating that grammar once got a capacity (aorist) but stating what capacity it now has — the standing endowment that his question μέχρι τίνος; (“up to what point?”) then measures.',
      },
      {
        number: '29.3',
        prompt: 'The articular infinitive — analyze μέχρι τοῦ διαγνῶναι τὰ γράμματα word by word, and explain how the construction works.',
        answer: 'μέχρι — preposition, “up to, as far as,” governing the genitive. τοῦ διαγνῶναι — articular infinitive: the aorist infinitive διαγνῶναι (διαγιγνώσκω, “discriminate, distinguish”) made a noun by the article, in the genitive as μέχρι requires: “the act of discriminating.” τὰ γράμματα — accusative, object of the infinitive: “the letters.” Whole: “up to the point of discriminating the letters” — the infinitive functions as a noun while keeping its own object, the signature double life of the articular infinitive.',
      },
      {
        number: '29.4',
        prompt: 'Reflection — Epictetus opens his whole teaching with the claim that only the rational faculty is θεωρητικὴ αὑτῆς — contemplative of itself. Why must the faculty that judges impressions be self-examining for the dichotomy of control to hold? Connect the grammar (the reflexive αὑτῆς) to the doctrine. 4–6 sentences.',
        answer: 'Open response. Strong answers: the dichotomy of control claims that judgment, impulse, desire, and aversion are up to us. But a faculty’s acts are only fully ours if the faculty can audit them — otherwise its errors would be invisible to it and correction impossible. Reason alone turns back on itself (the reflexive αὑτῆς is the grammatical trace of that turning): it can examine its own use of impressions, approve or disapprove its own assents. Self-examination is therefore the mechanism that makes self-governance possible; the reflexive pronoun is carrying the entire possibility of moral progress. Grammar can judge letters and music can judge melodies, but neither judges itself — which is why neither is free, and reason is.',
      },
    ],
    quiz: [
      { question: 'The chapter title of Discourses I.1 is:', options: ['Περὶ ἀρετῆς — On Virtue', 'Περὶ τῶν ἐφ᾿ ἡμῖν καὶ οὐκ ἐφ᾿ ἡμῖν — On what is up to us and not up to us', 'Περὶ θανάτου — On Death', 'Περὶ λόγου — On Reason'], correct: 1 },
      { question: 'εὑρήσετε is:', options: ['Aorist middle, 3rd plural', 'Future active, 2nd plural — “you will find”', 'Perfect active, 2nd singular', 'Present subjunctive, 1st plural'], correct: 1 },
      { question: 'οὐδεμίαν in I.1.1 is:', options: ['Nominative — the subject', 'Accusative feminine of οὐδείς — the object, with δύναμιν understood', 'A genitive absolute', 'An adverb'], correct: 1 },
      { question: 'τῶν ἄλλων δυνάμεων, fronted at the head of the sentence, is:', options: ['A dative of respect', 'A partitive genitive — “(none) of the other faculties”', 'The subject of the verb', 'A vocative address'], correct: 1 },
      { question: 'The difference between αὐτῆς and αὑτῆς is:', options: ['Dialect only', 'Smooth breathing = plain “of her/it”; rough breathing = reflexive “of herself/itself”', 'Singular versus plural', 'There is no difference'], correct: 1 },
      { question: 'Adjectives in -ικός (θεωρητικός, δοκιμαστικός) express:', options: ['Past completion', 'Capacity or aptitude — “able to contemplate, able to examine”', 'Negation', 'Endearment'], correct: 1 },
      { question: 'κέκτηται (of grammar’s power) is:', options: ['Perfect middle of κτάομαι — “stands possessing”', 'Aorist of κεντέω', 'Future of κτείνω', 'Imperfect of καλέω'], correct: 0 },
      { question: 'In μέχρι τοῦ διαγνῶναι, the infinitive is:', options: ['A command', 'An articular infinitive in the genitive, governed by μέχρι — “up to the point of discriminating”', 'Indirect statement after φημί', 'A genitive absolute'], correct: 1 },
      { question: 'Epictetus’ examples of faculties that cannot examine themselves are:', options: ['Sight and hearing', 'Grammar and music', 'Courage and justice', 'Memory and imagination'], correct: 1 },
      { question: 'Why does the argument of I.1 ground the dichotomy of control?', options: ['Because the gods decreed it', 'Because only the self-examining rational faculty can audit and govern its own acts — so only its acts are fully up to us', 'Because the other faculties are illusions', 'Because reason is the strongest faculty physically'], correct: 1 },
    ],
    vocabulary: [
      { greek: 'δύναμις, -εως, ἡ', transliteration: 'dynamis', english: 'faculty, power, capacity' },
      { greek: 'εὑρίσκω / εὑρήσω', transliteration: 'heuriskō / heurēsō', english: 'to find / I will find' },
      { greek: 'θεωρητικός, -ή, -όν', transliteration: 'theōrētikos', english: 'contemplative, able to examine' },
      { greek: 'δοκιμάζω', transliteration: 'dokimazō', english: 'to test, to approve' },
      { greek: 'διαγιγνώσκω', transliteration: 'diagignōskō', english: 'to discriminate, to distinguish' },
      { greek: 'χρῆσις, -εως, ἡ', transliteration: 'chrēsis', english: 'use, employment' },
      { greek: 'φαντασία, -ας, ἡ', transliteration: 'phantasia', english: 'impression, appearance' },
    ],
  },

  // ── SESSION 30 ─────────────────────────────────────────────────────────────
  {
    id: 30,
    title: 'Final Examination & Translation',
    subtitle: 'Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα — the unseen passage',
    isMilestone: true,
    targetText:
      'Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα.',
    objectives: [
      'Translate an unseen passage from the Stoic corpus with lexicon support',
      'Demonstrate command of the full grammar: declensions, tenses, moods, participles, conditions, indirect statement',
      'Parse any form encountered in Encheiridion-level prose',
      'Complete GREK 101 — and know exactly what to read next',
    ],
    parts: [
      {
        heading: 'Part 1 — The Shape of the Examination',
        body: 'The final examination has four parts, taken in conversation with the drill agent or the Proctor.\n\nPart I — Parsing (ten forms). You will be given ten forms drawn from Encheiridion 1–5 and Discourses I.1 and asked for a full parse: part of speech, and for verbs — person, number, tense, voice, mood; for nouns and adjectives — case, number, gender, and the dictionary form.\n\nPart II — Unseen translation. A short passage you have not officially read, translated with a lexicon. This session’s Part 2 below is a full dress rehearsal.\n\nPart III — Grammar synthesis. Short questions requiring you to explain constructions: why this mood, why this case, what this particle signals.\n\nPart IV — Composition. Four English sentences to render into Greek using course vocabulary — the inverse skill, which proves the grammar is productive, not just recognized.',
      },
      {
        heading: 'Part 2 — The Unseen: Encheiridion 5',
        body: 'Here is your rehearsal unseen — the most famous sentence in the Encheiridion, and the sentence behind everything this Academy teaches about judgment:\n\nΤαράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα, ἀλλὰ τὰ περὶ τῶν πραγμάτων δόγματα· οἷον ὁ θάνατος οὐδὲν δεινόν, ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο, ἀλλὰ τὸ δόγμα τὸ περὶ τοῦ θανάτου, διότι δεινόν, ἐκεῖνο τὸ δεινόν ἐστιν.\n\n“It is not things that disturb human beings, but their judgments about things. Death, for instance, is nothing terrible — else it would have appeared so even to Socrates — but the judgment about death, that it is terrible: that is the terrible thing.”\n\nAttack it with the method. Verb first: Ταράσσει — present active, 3rd singular; its subject is the neuter plural τὰ δόγματα (neuter plurals take singular verbs — Session 5), with τὰ πράγματα as the negated alternative subject: “not things… but judgments… disturb.” The sandwiched attributive: τὰ περὶ τῶν πραγμάτων δόγματα — the prepositional phrase seated between article and noun (“the about-things judgments”). Then the counterfactual you were promised in Session 22: ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο — ἄν + imperfect, present contrary-to-fact, with the dative Σωκράτει: “since (if it were terrible) it would appear so even to Socrates.” Finally διότι δεινόν — “namely that it is terrible” — the judgment quoted in miniature, and the emphatic demonstrative close: ἐκεῖνο τὸ δεινόν ἐστιν — “that is the terrible thing.”',
        paradigms: [
          {
            title: 'Encheiridion 5 — Examination-Standard Parse',
            headers: ['Greek', 'Parse', 'Rendering'],
            rows: [
              ['Ταράσσει', 'pres. act. indic., 3rd sg.', '“disturbs” — neuter pl. subject, sg. verb'],
              ['τοὺς ἀνθρώπους', 'acc. masc. pl.', 'object: “human beings”'],
              ['τὰ πράγματα', 'nom. neut. pl.', 'negated subject: “not things”'],
              ['τὰ περὶ τῶν πραγμάτων δόγματα', 'nom. neut. pl., attributive sandwich', 'true subject: “the judgments about things”'],
              ['οἷον', 'adverbial', '“for instance”'],
              ['ἐπεὶ … ἂν ἐφαίνετο', 'ἄν + impf. — contrary-to-fact', '“since it would (otherwise) have appeared so”'],
              ['Σωκράτει', 'dat. sg.', '“to Socrates” — dative with φαίνομαι'],
              ['ἐκεῖνο τὸ δεινόν ἐστιν', 'demonstrative + pred.', '“that is the terrible thing”'],
            ],
          },
        ],
        callout: {
          label: 'Why this sentence is the course',
          text: 'Session 1 gave you the alphabet to spell δόγμα. Session 5 explained the article in τὰ περὶ τῶν πραγμάτων δόγματα. Session 22 armed you for ἂν ἐφαίνετο. Session 23 taught you what a δόγμα grammatically is — an assented statement. Thirty sessions converge on one sentence about where disturbance actually lives.',
        },
      },
      {
        heading: 'Part 3 — Where You Stand, and What to Read Next',
        body: 'Completing GREK 101 means you can parse and translate Encheiridion-level prose with a lexicon, and read it — increasingly — without one. You have read Encheiridion 1, 2, 3, and 5 in the original, and the opening argument of the Discourses as its first hearers met it.\n\nThe path forward is a reading program, not more paradigms. First: finish the Encheiridion — fifty-three short chapters, most no harder than what you have read; a chapter a day with Liddell & Scott is a complete daily practice. Second: Discourses I.1 whole, then I.2 (Περὶ τοῦ πῶς ἄν τις σῴζοι τὸ κατὰ πρόσωπον ἐν παντί — how one may preserve one’s proper character in everything). Third: Marcus — the Meditations are harder Greek (compressed, private, allusive), but Book II is approachable and Session 27 has already given you its dawn. Keep Smyth’s Grammar within reach for constructions this course deferred.\n\nτί οὖν μεμάθηκας; — what, then, do you stand having learned? Not Greek “about” Stoicism: the actual sentences. From here, every hour with the lexicon is an hour inside the texts themselves — ὧν οὐδείς σε ἀφαιρήσεται: which no one will take from you.',
      },
    ],
    exercises: [
      {
        number: '30.1',
        prompt: 'PART I REHEARSAL — Parse fully: ταράσσει · ἐφαίνετο · Σωκράτει · μεμάθηκας · ἐκκλίνῃς · γένοιτο · οὗ · ἀποθανόντος · εὑρήσετε · μέμνησο.',
        answer: 'ταράσσει: pres. act. indic. 3rd sg. (ταράσσω). ἐφαίνετο: impf. mid./pass. 3rd sg. (φαίνομαι) — with ἄν, contrary-to-fact. Σωκράτει: dat. sg. of Σωκράτης (3rd decl.). μεμάθηκας: perf. act. 2nd sg. (μανθάνω) — “you stand having learned.” ἐκκλίνῃς: pres. act. subjunctive 2nd sg. (ἐκκλίνω), after ἄν/ἐάν. γένοιτο: aor. mid. optative 3rd sg. (γίγνομαι) — wish. οὗ: gen. sg. relative pronoun (ὅς). ἀποθανόντος: aor. act. participle, gen. sg. (ἀποθνῄσκω) — genitive absolute. εὑρήσετε: fut. act. 2nd pl. (εὑρίσκω). μέμνησο: perf. mid. imperative 2nd sg. (μιμνῄσκω) — “remember!”',
      },
      {
        number: '30.2',
        prompt: 'PART II REHEARSAL — Translate Encheiridion 5 (given in Part 2 above) without looking at the provided rendering, then compare. Note every place your version differs and identify the grammatical point at stake.',
        answer: 'Model: “It is not things that disturb human beings, but their judgments about things. Death, for instance, is nothing terrible — since (if it were) it would have appeared so even to Socrates — but the judgment about death, that it is terrible: that is what is terrible.” Key checkpoints: (1) neuter plural subject with singular verb; (2) the attributive sandwich τὰ περὶ τῶν πραγμάτων δόγματα as a single noun phrase; (3) ἂν ἐφαίνετο as contrary-to-fact, not a plain past; (4) ἐκεῖνο picking out the judgment, not death, as the referent of “terrible.”',
      },
      {
        number: '30.3',
        prompt: 'PART III REHEARSAL — Answer in one or two sentences each: (a) Why is the verb Ταράσσει singular when its subject is plural? (b) What does ἄν contribute to ἐφαίνετο? (c) Why is Σωκράτει dative? (d) In τὸ δόγμα τὸ περὶ τοῦ θανάτου, why is the article repeated?',
        answer: '(a) Neuter plural subjects take singular verbs — the classic Greek concord rule (Session 5). (b) ἄν converts the imperfect from a past statement into a present contrary-to-fact: “would appear” (it does not, because death is not terrible). (c) φαίνομαι takes a dative of the person to whom something appears: “would have appeared to Socrates.” (d) The repeated article (τὸ… τὸ…) is the attributive position for the prepositional phrase: “the judgment — the one about death” — binding περὶ τοῦ θανάτου inside the noun phrase.',
      },
      {
        number: '30.4',
        prompt: 'PART IV REHEARSAL — Composition. Render into Greek: (a) “Some things are up to us.” (b) “If you practice, you will make progress.” (c) “The wise man says that death is nothing terrible.” (d) “Remember that you are kissing a human being.”',
        answer: '(a) τὰ μέν ἐστιν ἐφ᾿ ἡμῖν. (or: ἔνια ἐφ᾿ ἡμῖν ἐστιν.) (b) ἐὰν ἀσκῇς, προκόψεις. (c) ὁ σοφὸς φησὶ τὸν θάνατον οὐδὲν δεινὸν εἶναι. (or: λέγει ὅτι ὁ θάνατος οὐδὲν δεινόν ἐστιν.) (d) μέμνησο ὅτι ἄνθρωπον καταφιλεῖς. Reasonable variants accepted — what is graded is the construction: μέν/δέ or ἔνια, ἐάν + subjunctive with future apodosis, acc. + infinitive after φημί, μέμνησο ὅτι + indicative.',
      },
    ],
    quiz: [
      { question: 'In Ταράσσει τοὺς ἀνθρώπους οὐ τὰ πράγματα…, the verb is singular because:', options: ['Epictetus wrote hastily', 'Neuter plural subjects take singular verbs in Greek', 'τὰ πράγματα is actually singular', 'The verb agrees with τοὺς ἀνθρώπους'], correct: 1 },
      { question: 'τὰ περὶ τῶν πραγμάτων δόγματα is best translated:', options: ['The things concerning judged matters', 'The judgments about things — a prepositional phrase in attributive position', 'Judgments and things together', 'The practical judgments'], correct: 1 },
      { question: 'ἐπεὶ καὶ Σωκράτει ἂν ἐφαίνετο functions as:', options: ['A vivid future warning', 'A contrary-to-fact argument: if death were terrible, it would have appeared so to Socrates — it did not', 'A wish for Socrates’ return', 'Indirect statement after φημί'], correct: 1 },
      { question: 'The word δόγμα is grammatically related to which verb?', options: ['δίδωμι (give)', 'δοκέω (seem, think) — a δόγμα is a seeming assented to', 'διώκω (pursue)', 'δουλεύω (be a slave)'], correct: 1 },
      { question: 'μέμνησο (Ench. 2’s “Remember!”) is which form?', options: ['Aorist infinitive', 'Perfect middle imperative — hold in completed memory', 'Future indicative', 'Present optative'], correct: 1 },
      { question: 'Which construction requires ἄν? (Select the necessary pairing.)', options: ['Purpose clause with ἵνα', 'Potential optative and contrary-to-fact apodoses', 'Indirect statement with ὅτι', 'The genitive absolute'], correct: 1 },
      { question: 'οἶδα σε προκόπτοντα uses which indirect-statement construction?', options: ['ὅτι + finite verb', 'Accusative + infinitive', 'Accusative + participle — after a verb of knowing', 'The optative of secondary sequence'], correct: 2 },
      { question: 'ὅσα ἡμέτερα ἔργα closes each half of Ench. 1 with:', options: ['A closed list of four items', 'An open, criterion-governed class — “as many things as are our own doings”', 'A rhetorical question', 'A genitive absolute'], correct: 1 },
      { question: 'After GREK 101, the recommended next reading is:', options: ['Homer’s Iliad', 'The remaining chapters of the Encheiridion, then Discourses I.1–I.2, then Meditations Book II', 'Plato’s complete works', 'The Septuagint'], correct: 1 },
      { question: 'The final sentence of the course’s farewell — ὧν οὐδείς σε ἀφαιρήσεται — means:', options: ['Which no one will take from you', 'Which everyone will admire', 'Which you must never forget', 'Which the gods have given'], correct: 0 },
    ],
    vocabulary: [
      { greek: 'πρᾶγμα, -ατος, τό', transliteration: 'pragma', english: 'thing, matter, affair' },
      { greek: 'δόγμα, -ατος, τό', transliteration: 'dogma', english: 'judgment, opinion' },
      { greek: 'δεινός, -ή, -όν', transliteration: 'deinos', english: 'terrible, fearsome; clever' },
      { greek: 'θάνατος, -ου, ὁ', transliteration: 'thanatos', english: 'death' },
      { greek: 'φαίνομαι', transliteration: 'phainomai', english: 'to appear, to seem (+ dat. of person)' },
      { greek: 'ἐπεί', transliteration: 'epei', english: 'since, because' },
      { greek: 'ἀφαιρέω', transliteration: 'aphaireō', english: 'to take away from' },
    ],
  },
];
