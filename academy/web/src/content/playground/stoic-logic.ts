/**
 * The Five Indemonstrables — content for the Playground experiment.
 *
 * Stoic logic is the first propositional logic in the West, and it was lost
 * for most of two thousand years. The five argument forms below are the whole
 * engine: Chrysippus held that every valid argument reduces to combinations of
 * them.
 *
 * Everything quoted here is verbatim from R.D. Hicks's 1925 translation of
 * Diogenes Laertius Book 7, which is public domain and in the corpus:
 *
 *   7.66 to 7.68   what counts as a proposition, and what does not
 *   7.72 to 7.74   the connectives and their truth conditions
 *   7.76 to 7.79   moods, variables, and arguments that only look valid
 *   7.79 to 7.81   the five indemonstrables themselves
 *
 * The modern names (modus ponens and the rest) and the framing against
 * Aristotle are not in the ancient text. They follow Benson Mates, Stoic
 * Logic, which is in the corpus as a summary rather than as his words, so it
 * is cited and never quoted.
 */

// ── the terms you can plug in ────────────────────────────────────────────────
//
// Pairs, not loose sentences, because the forms need two propositions and the
// point of the exercise is that the form does not care which two. Every pair
// here is one Diogenes Laertius actually uses.

export type Pair = {
  id: string
  label: string
  p: { aff: string; neg: string }
  q: { aff: string; neg: string }
  /** Where Diogenes uses it */
  source: string
  /**
   * The forms whose major premiss is actually TRUE of this pair. A form is
   * valid or not regardless, which is the lesson; but an argument can be
   * valid and still not true, and Diogenes separates the two at 7.79, so the
   * page says which you are looking at rather than letting a false premiss
   * pass unremarked.
   */
  suits: string[]
}

export const pairs: Pair[] = [
  {
    id: 'day-light',
    label: 'day and light',
    p: { aff: 'it is day', neg: 'it is not day' },
    q: { aff: 'it is light', neg: 'it is not light' },
    source: 'Diogenes Laertius 7.80',
    suits: ['first', 'second', 'denying', 'affirming'],
  },
  {
    id: 'day-night',
    label: 'day and night',
    p: { aff: 'it is day', neg: 'it is not day' },
    q: { aff: 'it is night', neg: 'it is not night' },
    source: 'Diogenes Laertius 7.81',
    suits: ['third', 'fourth', 'fifth'],
  },
  {
    id: 'plato',
    label: 'Plato dead and alive',
    p: { aff: 'Plato is dead', neg: 'Plato is not dead' },
    q: { aff: 'Plato is alive', neg: 'Plato is not alive' },
    source: 'Diogenes Laertius 7.80',
    suits: ['third', 'fourth', 'fifth'],
  },
  {
    id: 'dion',
    label: 'Dion walking and moving',
    p: { aff: 'Dion is walking', neg: 'Dion is not walking' },
    q: { aff: 'Dion is in motion', neg: 'Dion is not in motion' },
    source: 'Diogenes Laertius 7.78',
    suits: ['first', 'second', 'denying', 'affirming'],
  },
  {
    id: 'horse',
    label: 'Dion a horse and an animal',
    p: { aff: 'Dion is a horse', neg: 'Dion is not a horse' },
    q: { aff: 'Dion is an animal', neg: 'Dion is not an animal' },
    source: 'Diogenes Laertius 7.78',
    suits: ['first', 'second', 'denying', 'affirming'],
  },
]

// ── the forms ────────────────────────────────────────────────────────────────

export type Slot = 'p' | 'notP' | 'q' | 'notQ'
export type Line = { kind: 'if' | 'notBoth' | 'either' | 'plain'; a?: Slot; b?: Slot }

export type Form = {
  id: string
  /** 1 to 5 for the indemonstrables, null for the two impostors */
  ordinal: number | null
  name: string
  modern: string
  valid: boolean
  major: Line
  minor: Line
  conclusion: Line
  /** Verbatim Diogenes, where he gives this form */
  dl: string
  dlCite: string
  gloss: string
  /** For the invalid pair: a case where the premises hold and the conclusion does not */
  counter?: string
}

export const forms: Form[] = [
  {
    id: 'first',
    ordinal: 1,
    name: 'The first',
    modern: 'modus ponens',
    valid: true,
    major: { kind: 'if', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'p' },
    conclusion: { kind: 'plain', a: 'q' },
    dl: 'The first kind of indemonstrable statement is that in which the whole argument is constructed of a hypothetical proposition and the clause with which the hypothetical proposition begins, while the final clause is the conclusion; as e.g. “If the first, then the second; but the first is, therefore the second is.”',
    dlCite: 'Diogenes Laertius 7.80',
    gloss:
      'Take the conditional and assert its front half. The back half follows. Everything else in the system is built to be reduced to this.',
  },
  {
    id: 'second',
    ordinal: 2,
    name: 'The second',
    modern: 'modus tollens',
    valid: true,
    major: { kind: 'if', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'notQ' },
    conclusion: { kind: 'plain', a: 'notP' },
    dl: 'The second is that which employs a hypothetical proposition and the contradictory of the consequent, while the conclusion is the contradictory of the antecedent; e.g. “If it is day, it is light; but it is night, therefore it is not day.”',
    dlCite: 'Diogenes Laertius 7.80',
    gloss:
      'Deny the back half and the front half falls with it. This is the form every experiment runs on: the prediction failed, so the hypothesis is gone.',
  },
  {
    id: 'third',
    ordinal: 3,
    name: 'The third',
    modern: 'the incompatibility form',
    valid: true,
    major: { kind: 'notBoth', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'p' },
    conclusion: { kind: 'plain', a: 'notQ' },
    dl: 'The third kind of indemonstrable employs a conjunction of negative propositions for major premiss and one of the conjoined propositions for minor premiss, concluding thence the contradictory of the remaining proposition; e.g. “It is not the case that Plato is both dead and alive; but he is dead, therefore Plato is not alive.”',
    dlCite: 'Diogenes Laertius 7.80',
    gloss:
      'Two things cannot both hold. One of them does. So the other does not. Note that this says nothing about what happens if neither holds.',
  },
  {
    id: 'fourth',
    ordinal: 4,
    name: 'The fourth',
    modern: 'disjunctive syllogism, affirming',
    valid: true,
    major: { kind: 'either', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'p' },
    conclusion: { kind: 'plain', a: 'notQ' },
    dl: 'The fourth kind employs a disjunctive proposition and one of the two alternatives in the disjunction as premisses, and its conclusion is the contradictory of the other alternative; e.g. “Either A or B; but A is, therefore B is not.”',
    dlCite: 'Diogenes Laertius 7.81',
    gloss:
      'This one only works because the Stoic “either” is exclusive. Diogenes is explicit that the disjunction guarantees one of the alternatives is false, so taking one rules the other out. A modern inclusive “or” would not license this at all.',
  },
  {
    id: 'fifth',
    ordinal: 5,
    name: 'The fifth',
    modern: 'disjunctive syllogism, denying',
    valid: true,
    major: { kind: 'either', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'notP' },
    conclusion: { kind: 'plain', a: 'q' },
    dl: 'The fifth kind is that in which the argument as a whole is constructed of a disjunctive proposition and the contradictory of one of the alternatives in the disjunction, its conclusion being the other alternative; e.g. “Either it is day or it is night; but it is not night, therefore it is day.”',
    dlCite: 'Diogenes Laertius 7.81',
    gloss:
      'Rule one alternative out and the other stands. This is the form of elimination, and of most detective work.',
  },
  {
    id: 'denying',
    ordinal: null,
    name: 'Denying the antecedent',
    modern: 'a fallacy, not a form',
    valid: false,
    major: { kind: 'if', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'notP' },
    conclusion: { kind: 'plain', a: 'notQ' },
    dl: 'Arguments not syllogistic are those which plausibly resemble syllogistic arguments, but are not cogent proof; e.g. “If Dion is a horse, he is an animal; but Dion is not a horse, therefore he is not an animal.”',
    dlCite: 'Diogenes Laertius 7.78',
    gloss:
      'It has the shape of the first indemonstrable with the minor premiss negated, and it is worthless. Diogenes names it as the type of argument that plausibly resembles a good one.',
    counter:
      'Dion is not a horse. He is a man, so he is an animal all the same. Both premisses hold and the conclusion is false, which is all it takes.',
  },
  {
    id: 'affirming',
    ordinal: null,
    name: 'Affirming the consequent',
    modern: 'a fallacy, not a form',
    valid: false,
    major: { kind: 'if', a: 'p', b: 'q' },
    minor: { kind: 'plain', a: 'q' },
    conclusion: { kind: 'plain', a: 'p' },
    dl: 'Inconclusive are such that the contradictory of the conclusion is not incompatible with combination of the premisses, as in the following: “If it is day, it is light; but it is day, therefore Dion walks.”',
    dlCite: 'Diogenes Laertius 7.77',
    gloss:
      'The second indemonstrable run backwards. The conditional licenses travel one way down the arrow and this goes the other way.',
    counter:
      'It is light, because a lamp is lit at midnight. The conditional held, the minor premiss held, and it is still not day.',
  },
]

// ── the connectives ──────────────────────────────────────────────────────────

export type Connective = {
  id: 'conjunction' | 'disjunction' | 'conditional'
  name: string
  word: string
  /** Truth-functional? Some of the rival conditionals are not. */
  dl: string
  dlCite: string
  gloss: string
}

export const connectives: Connective[] = [
  {
    id: 'conjunction',
    name: 'Conjunction',
    word: 'and',
    dl: 'It is not the case that Plato is both dead and alive; but he is dead, therefore Plato is not alive.',
    dlCite: 'Diogenes Laertius 7.80',
    gloss: 'True when both halves are true, and in no other case.',
  },
  {
    id: 'disjunction',
    name: 'Disjunction',
    word: 'either',
    dl: 'A disjunctive proposition is one which is constituted such by the disjunctive conjunction “Either,” as e.g. “Either it is day or it is night.” This conjunction guarantees that one or other of the alternatives is false.',
    dlCite: 'Diogenes Laertius 7.72',
    gloss:
      'Exclusive, and the text says so outright. Exactly one half is true. This is not the inclusive “or” of a modern logic course, and the fourth indemonstrable depends on the difference.',
  },
  {
    id: 'conditional',
    name: 'Conditional',
    word: 'if',
    dl: 'A hypothetical proposition is therefore true, if the contradictory of its conclusion is incompatible with its premiss, e.g. “If it is day, it is light.” This is true. For the statement “It is not light,” contradicting the conclusion, is incompatible with the premiss “It is day.”',
    dlCite: 'Diogenes Laertius 7.73',
    gloss:
      'The hard one, and the one the schools fought over. This test is not a truth table: it asks whether the denial of the back half could sit alongside the front half, which is a question about what is possible, not about what happens to be the case.',
  },
]

/**
 * The three rival accounts of the conditional. Only the first can be read off
 * a truth table, which is the point of showing them together. Philo and
 * Diodorus come to us through Sextus, who is not in the corpus; they are
 * reported here after Mates, Stoic Logic, and are not quoted.
 */
export const conditionals = [
  {
    id: 'philo',
    who: 'Philo the Megarian',
    claim: 'False in one case only: the front half true and the back half false. Otherwise true.',
    truthFunctional: true,
    note: 'This is the material conditional of modern logic, twenty-two centuries early.',
  },
  {
    id: 'diodorus',
    who: 'Diodorus Cronus',
    claim: 'True when it neither is nor ever was possible for the front half to hold and the back half to fail.',
    truthFunctional: false,
    note: 'Philo’s test, run over all of time rather than over this moment. The truth values you can see are not enough to settle it.',
  },
  {
    id: 'chrysippus',
    who: 'Chrysippus',
    claim: 'True when the contradictory of the back half is incompatible with the front half.',
    truthFunctional: false,
    note: 'The strictest of the three, and the one Diogenes states. It asks for a connection between the halves, not a coincidence of their truth values.',
  },
]

// ── what can be true at all ──────────────────────────────────────────────────

export const propositionTest = {
  dl: 'Interrogations, inquiries and the like are neither true nor false, whereas judgements (or propositions) are always either true or false.',
  dlCite: 'Diogenes Laertius 7.68',
}

export const utterances = [
  { text: 'It is day.', proposition: true, kind: 'a judgement' },
  { text: 'Is it day?', proposition: false, kind: 'an interrogation' },
  { text: 'Go thou to the waters of Inachus.', proposition: false, kind: 'an imperative' },
  { text: 'Most glorious son of Atreus, Agamemnon, lord of men.', proposition: false, kind: 'a vocative' },
  { text: 'Plato is alive.', proposition: true, kind: 'a judgement' },
  { text: 'How like to Priam’s sons the cowherd is!', proposition: false, kind: 'a quasi-proposition' },
]

// ── framing ──────────────────────────────────────────────────────────────────

/** Valid is not the same as true, and the text separates them. */
export const validVsTrue = {
  dl: 'Further, arguments may be divided into true and false. The former draw their conclusions by means of true premisses; e.g. \u201cIf virtue does good, vice does harm; but virtue does good, therefore vice does harm.\u201d',
  dlCite: 'Diogenes Laertius 7.79',
}

export const mood = {
  dl: 'A mood is a sort of outline of an argument, like the following: “If the first, then the second; but the first is, therefore the second is.”',
  dlCite: 'Diogenes Laertius 7.76',
}

export const closing =
  'Chrysippus held that every valid argument could be reduced to combinations of these five, and wrote meta-rules for doing the reducing. Most of those rules are lost, so whether he was right cannot now be settled. What can be said is that this is a logic of propositions, where the variables stand for whole sentences, and that Aristotle’s was a logic of terms. For most of two thousand years the second was taught and the first was not, which is why Kant could say logic had not advanced since Aristotle and be believed.'
