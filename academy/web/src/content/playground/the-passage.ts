/**
 * The Passage — the fixed quantities behind the working note.
 *
 * Where The Long Filter asks whether anybody clears the transition, this note
 * asks what the crossing itself looks like from inside: how long it takes, what
 * the hazard does while it happens, and which institutions dissolve at which
 * point along the way. The prose lives in the component; what sits here is the
 * material the page computes over.
 *
 * Continuity with the sibling note is deliberate. The phoenix rate s₀ and the
 * log distance K are the same quantities, so a reader who has set the dials on
 * one page can carry the numbers to the other and expect them to agree.
 */

/**
 * The phoenix rate: the incidence of sagehood before anyone cultivated it
 * deliberately, read off Seneca's remark in the forty-second letter that the
 * good man appears about once in five hundred years. One in a billion.
 */
export const PHOENIX_RATE = 1e-9

/** K = ln(1/s₀) ≈ 20.72 — the log distance from the phoenix rate to everyone. */
export const LOG_DISTANCE = Math.log(1 / PHOENIX_RATE)

/**
 * The hazard a civilization must hold to have even a coin-flip chance of a
 * billion years: ln2 / 10⁷ centuries ≈ 6.93 × 10⁻⁸ per century. Every readout
 * on the page is ultimately a comparison against this one number.
 */
export const BILLION_YEAR_HAZARD = Math.LN2 / 1e7

/** The deep-time horizon, in centuries. 10⁷ centuries = one billion years. */
export const DEEP_HORIZON = 1e7

/**
 * Where the civilization lives, and the hazard floor that implies. A hazard
 * cannot be driven below the rate at which the sky alone ends things, so reach
 * is not decoration: a planet-bound civilization cannot reach the billion-year
 * line no matter how wise it becomes, because its floor sits above the line.
 */
export type Reach = 'planet' | 'worlds' | 'stars'

export const REACH: Record<Reach, { label: string; floor: number; note: string }> = {
  planet: {
    label: 'One world',
    floor: 1e-5,
    note: 'Asteroid, supervolcano, a nearby star doing something unusual, and in the end the sun itself brightening past what the biosphere tolerates. The floor sits two orders above the billion-year line, so this branch cannot reach it — not through any amount of wisdom.',
  },
  worlds: {
    label: 'Many worlds, one star',
    floor: 1e-7,
    note: 'Redundancy against anything local. The correlated risks remain: one star, one set of physics being experimented on, and one civilization capable of arguing with itself across the whole system.',
  },
  stars: {
    label: 'Many stars',
    floor: 1e-9,
    note: 'Nothing short of a decision reaches all of it at once. The floor drops below the line — and the failure mode changes from extinction to divergence, since branches out of contact stop being one civilization.',
  },
}

/** Where the hazard sits today, per century, on the usual estimate. */
export const HAZARD_NOW = 1 / 6

// ── the eras ─────────────────────────────────────────────────────────────────

/**
 * Phases of the crossing, keyed to the cultivated fraction s. The page reads
 * the era off s(t) at the scrubbed year, so these are not a timeline: how long
 * each lasts, and whether it is reached at all, is an output of the model.
 */
export type Era = {
  key: string
  /** Reached once the cultivated fraction crosses this. */
  at: number
  name: string
  /** One line, for the strip. */
  gloss: string
  /** What it is like to live in it. */
  body: string
}

export const ERAS: Era[] = [
  {
    key: 'adolescence',
    at: 0,
    name: 'The Adolescence',
    gloss: 'Full capability, unformed judgment',
    body: 'The dangerous window, and the one we are in. Every instrument required to end the species exists, and the disposition required not to is held by a rounding error of the people who hold the instruments. Nothing structural has changed and nothing structural can: at this fraction the cultivated are not a constituency, they are an anecdote. The hazard is at its maximum here, and this is also the only era in which the whole thing can be lost in an afternoon.',
  },
  {
    key: 'cultivation',
    at: 1e-4,
    name: 'The Cultivation',
    gloss: 'Method, before it is visible',
    body: 'Something has been found that works and can be taught — not a doctrine, a practice with a reliable effect. It spreads the way literacy spread: unevenly, through institutions built for other purposes, invisible in every aggregate statistic. A person alive in this era would not describe their civilization as transforming. They would describe a school their neighbour attends. The hazard has barely moved, because a fraction this small changes nothing about who holds the instruments.',
  },
  {
    key: 'lengthening',
    at: 0.01,
    name: 'The Lengthening',
    gloss: 'Time horizons stretch past a life',
    body: 'The first structural symptom, and it shows up in accounting before it shows up in anything else. Projects begin to be started whose payoff arrives after their authors are dead — not as monuments, which we have always built, but as ordinary undertakings with ordinary budgets. One percent is enough for this because the cultivated concentrate in the places where long decisions are made. The hazard begins to bend, slightly, mostly because fewer of the decisions being taken are being taken in panic.',
  },
  {
    key: 'subtraction',
    at: 0.1,
    name: 'The Subtraction',
    gloss: 'Institutions built on wanting lose their function',
    body: 'The transformation is mostly negative and it arrives faster than anyone plans for. An industry that exists to manufacture desire finds a tenth of its market simply unresponsive, and an industry with a tenth less market is an industry in structural decline. What goes first is never the thing anyone campaigned against; it is whatever was most purely parasitic on the appetite that is thinning. This is the era of unemployment in professions nobody thought of as vices.',
  },
  {
    key: 'handover',
    at: 0.4,
    name: 'The Handover',
    gloss: 'Coercive institutions become custodial',
    body: 'Coercion does not end, it narrows. Armies, courts and police were each built to manage a population that would defect given the chance, and with most of the population no longer defecting they are left holding a much smaller job that they are badly shaped for. The institutions do not dissolve so much as get handed over — the same buildings, a third of the staff, a different question. This is the longest and least stable era: the cultivated majority still depends on instruments designed by and for the uncultivated, and either half can wreck it.',
  },
  {
    key: 'settling',
    at: 0.8,
    name: 'The Settling',
    gloss: 'The remainder problem',
    body: 'The hazard is now concentrated almost entirely in whoever is left out, and the question of the era is what a civilization of sages owes to the fraction that did not take. Every fast answer available here is a bad one — exclusion, compulsion, or the quiet decision to stop counting them. The honest answer is that the remainder is not a defect to be cleared but the standing proof that the cultivation was chosen rather than installed, which is the whole reason it was worth anything. Civilizations that lose patience in this era are the ones that freeze.',
  },
  {
    key: 'present',
    at: 0.99,
    name: 'The Long Present',
    gloss: 'The hazard reaches its floor',
    body: 'The endogenous term is finally below the exogenous one: this civilization is now more likely to be ended by the sky than by itself, which no civilization has ever been. Almost nothing about daily life is dramatic. What is different is the tense — projects are begun with completion dates written in a notation that has no business on a work order, and they are begun casually, because virtue is complete in the acting and a result arriving in nine thousand years costs its author nothing.',
  },
]

// ── the ledger ───────────────────────────────────────────────────────────────

/**
 * What dissolves, and at what cultivated fraction. The model timestamps each
 * row — with these thresholds fixed, the year a row is crossed is entirely a
 * function of the dials, and a row above the ceiling s* is never crossed at all.
 *
 * Several rows restate the survivors' ledger from The Long Filter, which
 * described the far end of this same passage. What is new here is the ordering:
 * the claim that these go in a particular sequence, and that the sequence is
 * forced by which appetite each institution was built to manage.
 */
export type LedgerRow = {
  at: number
  gone: string
  stays: string
  body: string
}

export const LEDGER: LedgerRow[] = [
  {
    at: 3e-4,
    gone: 'Cultivation as a private eccentricity',
    stays: 'Schools',
    body: 'The practice acquires teachers, a literature and a way of being wrong that can be corrected. It is the only entry on this list that is an addition.',
  },
  {
    at: 0.004,
    gone: 'Persuasion as a profession',
    stays: 'Description',
    body: 'Rhetoric aimed at moving someone past their own judgment stops paying first, because it is the trade with the least residual use once judgment holds.',
  },
  {
    at: 0.02,
    gone: 'The quarterly horizon',
    stays: 'The century project',
    body: 'Not an ethical improvement — an arithmetic one. The horizon was short because the discount rate was high, and the discount rate was high because the future was full of people who could not be trusted with what you left them.',
  },
  {
    at: 0.08,
    gone: 'Advertising',
    stays: 'Notification',
    body: 'The residual job is real and small: telling someone a thing exists. What ends is the part that manufactures the wanting it then offers to relieve.',
  },
  {
    at: 0.15,
    gone: 'The wanting economy',
    stays: 'Allocation',
    body: 'Bushels stay finite. What ends is rivalry, not scarcity — and markets coordinated between people who did not trust each other, so the coordination problem outlives the mistrust.',
  },
  {
    at: 0.28,
    gone: 'Prisons',
    stays: 'Restraint of the few',
    body: 'Confinement as a general instrument stops making sense long before the last person who needs restraining is gone. What survives is narrow, medical in posture, and embarrassed about itself.',
  },
  {
    at: 0.45,
    gone: 'Standing armies',
    stays: 'Custodianship',
    body: 'Armies answer to hostile states, and hostile states are what wanting looks like when it meets an obstacle. What remains is the maintenance of things too dangerous to leave unattended.',
  },
  {
    at: 0.58,
    gone: 'Adversarial courts',
    stays: 'Mediation',
    body: 'Not deciding who is right, but working out how an agreed principle applies to a case nobody anticipated when the principle was formed.',
  },
  {
    at: 0.72,
    gone: 'Policing',
    stays: 'Care',
    body: 'Deterrence presupposes the deterrable. Someone in crisis is not committing a crime; they need a person to come, and that person does not need to be armed.',
  },
  {
    at: 0.88,
    gone: 'The state as an instrument of power',
    stays: 'The state as an instrument of judgment',
    body: 'Politics survives and gets to be about the question rather than the players. Two sages reading the same models still weigh the same evidence differently, and neither is failing at anything.',
  },
  {
    at: 0.96,
    gone: 'Borders',
    stays: 'Jurisdiction',
    body: 'A line that marks where one body of judgment applies, rather than where one body of force does. Crossing it stops being an event.',
  },
  {
    at: 0.995,
    gone: 'The discount rate',
    stays: 'Deep time',
    body: 'The last thing to go, and the one that changes what can be built. At any rate we actually use, a payoff a thousand years out is worth nothing today, which is why nothing we build aims there.',
  },
]

// ── presets ──────────────────────────────────────────────────────────────────

/** A named starting point: every dial at once, and the point it makes. */
export type Preset = {
  key: string
  name: string
  note: string
  dials: {
    start: number
    hazard: number
    capMult: number
    capDouble: number
    cultivation: number
    forgetting: number
    conditions: number
    lockin: number
    reach: Reach
  }
}

export const PRESETS: Preset[] = [
  {
    key: 'as-we-are',
    name: 'As we are',
    note: 'Today’s hazard, cultivation at about the rate the tradition has actually managed, and forgetting at the rate a civilization forgets when every generation relearns from the start. Both conditions fail, and they fail for different reasons.',
    dials: {
      start: 1e-6,
      hazard: HAZARD_NOW,
      capMult: 3,
      capDouble: 0.5,
      cultivation: 0.6,
      forgetting: 0.15,
      conditions: 3,
      lockin: 0.02,
      reach: 'planet',
    },
  },
  {
    key: 'teaching-without-memory',
    name: 'Teaching without memory',
    note: 'Teach three times as fast and change nothing about forgetting. The crossing gets shorter, which genuinely helps — and it still ends in the same place, because the ceiling is set by the ratio of the two rates, never by either alone.',
    dials: {
      start: 1e-6,
      hazard: HAZARD_NOW,
      capMult: 3,
      capDouble: 0.5,
      cultivation: 1.8,
      forgetting: 0.15,
      conditions: 3,
      lockin: 0.02,
      reach: 'planet',
    },
  },
  {
    key: 'the-corpus-holds',
    name: 'The corpus holds',
    note: 'Cultivation unchanged, forgetting cut to a fraction of it — what it would mean for accumulated judgment to be retrievable rather than re-derived by each generation. The ceiling lifts and the floor drops by orders of magnitude. The crossing is exactly as long and exactly as expensive as before.',
    dials: {
      start: 1e-6,
      hazard: HAZARD_NOW,
      capMult: 3,
      capDouble: 0.5,
      cultivation: 0.6,
      forgetting: 0.004,
      conditions: 3,
      lockin: 0.02,
      reach: 'planet',
    },
  },
  {
    key: 'both-clocks',
    name: 'Both clocks',
    note: 'Long memory, and a crossing short enough to be paid for: further along at the start than we usually assume, cultivating fast, and spread across enough sky to put the floor below the line. The only configuration here that finishes.',
    dials: {
      start: 1e-3,
      hazard: HAZARD_NOW,
      capMult: 3,
      capDouble: 0.5,
      cultivation: 2.4,
      forgetting: 0.004,
      conditions: 3,
      lockin: 0.02,
      reach: 'stars',
    },
  },
  {
    key: 'the-frightened-century',
    name: 'The frightened century',
    note: 'The same crossing, made by a civilization that answers its own hazard with control. It survives in the sense that something is still there. Watch which band it ends up in.',
    dials: {
      start: 1e-3,
      hazard: HAZARD_NOW,
      capMult: 3,
      capDouble: 0.5,
      cultivation: 2.4,
      forgetting: 0.004,
      conditions: 3,
      lockin: 0.35,
      reach: 'stars',
    },
  },
]

// ── series colours ───────────────────────────────────────────────────────────

/**
 * Three outcomes, three hues, assigned in fixed order and never cycled.
 * Validated against the plate ground (#d7dad1): lightness band, chroma floor,
 * CVD separation and normal-vision separation all pass. The ochre sits at 2.5:1
 * against the plate rather than 3:1, so every area it fills is also directly
 * labelled and repeated in the table below the chart.
 */
export const SERIES = {
  moving: '#3f5fb0',
  frozen: '#b0801c',
  ended: '#a83f2c',
} as const
