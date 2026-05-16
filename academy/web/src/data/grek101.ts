// GREK 101 — Ancient Greek for Philosophers
// Sessions 1-10 · Unit I: The Grammar Foundation
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
];
