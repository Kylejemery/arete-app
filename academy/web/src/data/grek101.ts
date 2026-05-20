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
];
