/**
 * The Impression — content for the Playground experiment.
 *
 * What happens to a soul when something appears to it, before any agreeing is
 * done. Zeno defined the impression as an imprint, borrowing the word from a
 * seal in wax. Cleanthes took the wax literally. Chrysippus refused it, and
 * his reason is the whole exhibit: many impressions cannot be in one spot at
 * one time, and a soul plainly holds many at once.
 *
 * Both halves are quoted verbatim from the public-domain translations in the
 * corpus, so nothing here is paraphrase:
 *
 *   the definition   Diogenes Laertius 7.45, tr. R.D. Hicks (1925)
 *   the refusal      Diogenes Laertius 7.50, same
 *   Yonge's 1853 rendering of the definition is in the corpus too, and is
 *   quoted where a second voice helps.
 *
 * What is ours: the wax and the tension are drawn, and drawing them means
 * choosing how they fail and hold. The failure shown is the one Chrysippus
 * names and no other.
 */

// ── the impressions ──────────────────────────────────────────────────────────

export type Sigil = 'round' | 'square' | 'hand'

export type Impression = {
  id: string
  /** What appears, in the second person */
  scene: string
  /** A handle for it */
  short: string
  sigil: Sigil
  /** Why this one is in the set */
  note: string
}

/**
 * The first two are the ancient tower, which the Academics used against the
 * Stoics: the same object gives contradictory impressions at two distances,
 * and a soul holds both. On a literal wax reading it cannot, because they
 * want the same spot. The third is Zeno's own clear case, added so the set
 * is not only trouble.
 */
export const impressions: Impression[] = [
  {
    id: 'tower-far',
    short: 'the tower, far off',
    scene: 'A tower on the horizon. From here it is round.',
    sigil: 'round',
    note: 'The stock case of the ancient debate. Nothing is wrong with your eyes, and the tower still looks round.',
  },
  {
    id: 'tower-near',
    short: 'the tower, up close',
    scene: 'You walk to the tower. Up close it is square.',
    sigil: 'square',
    note: 'Now you hold both. The soul has not discarded the first: you can still call it up, which is how you know the two disagree.',
  },
  {
    id: 'hand',
    short: 'your own hand',
    scene: 'Your hand, held up in good light, close, with nothing wrong with the conditions.',
    sigil: 'hand',
    note: 'The Stoic model case: from what is, exactly as it is, under conditions with nothing wrong in them.',
  },
]

// ── the two models ───────────────────────────────────────────────────────────

export type ModelId = 'wax' | 'pneuma'

export type Model = {
  id: ModelId
  name: string
  attribution: string
  claim: string
  /** What the panel is showing */
  reading: string
  /** Why it behaves as it does */
  gloss: string
}

export const models: Model[] = [
  {
    id: 'wax',
    name: 'The wax',
    attribution: 'Cleanthes, taking Zeno literally',
    claim: 'An impression is a stamp: hollows and reliefs pressed into the soul.',
    reading: 'Each new seal wants the same ground. What was there is flattened to take it.',
    gloss:
      'Read the definition strictly and this follows. Wax takes a shape by giving up the shape it had, so the newest impression is always the clearest and the older ones are going, and two impressions that disagree cannot both be held, because there is only one surface and they both want it.',
  },
  {
    id: 'pneuma',
    name: 'The tension',
    attribution: 'Chrysippus, in the second book of On the Soul',
    claim: 'An impression is an alteration: a change in the tension of the breath that the soul is.',
    reading: 'Each impression sets up its own tension. They occupy the same body and stay distinct.',
    gloss:
      'The soul is pneuma, a body under tension, and a body under tension can carry many alterations at once the way a struck string carries more than one mode. Nothing is flattened, nothing has to give up its place, and two impressions that disagree can both be held, which is the precondition of noticing that they disagree at all.',
  },
]

// ── the passages ─────────────────────────────────────────────────────────────

export const definition = {
  text:
    'A presentation (or mental impression) is an imprint on the soul: the name having been appropriately borrowed from the imprint made by the seal upon the wax.',
  citation: 'Diogenes Laertius, Lives 7.45',
  translator: 'tr. R. D. Hicks, 1925',
}

export const refusal = {
  text:
    'For, says he, we must not take “impression” in the literal sense of the stamp of a seal, because it is impossible to suppose that a number of such impressions should be in one and the same spot at one and the same time.',
  citation: 'Diogenes Laertius, Lives 7.50',
  translator: 'tr. R. D. Hicks, 1925',
}

export const alteration = {
  text:
    'the former is the act of imprinting something on the soul, that is a process of change, as is set forth by Chrysippus in the second book of his treatise Of the Soul',
  citation: 'Diogenes Laertius, Lives 7.50',
  translator: 'tr. R. D. Hicks, 1925',
}

/** Yonge's 1853 rendering, for the second voice on the definition. */
export const definitionYonge = {
  text:
    'Perception, again, is an impression produced on the mind, its name being appropriately borrowed from impressions on wax made by a seal.',
  citation: 'Diogenes Laertius, Lives, Life of Zeno',
  translator: 'tr. C. D. Yonge, 1853',
}

export const handoff =
  'Everything on this page happened without your agreement. The tower looked round whether you liked it or not, and the tension changed before you had a view about it. Only now does the one act that is yours become possible: to assent, or to withhold. That is the next gesture, and Zeno taught it with his hand.'
