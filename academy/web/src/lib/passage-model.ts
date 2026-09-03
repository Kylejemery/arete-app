/**
 * The Passage — the model.
 *
 * Kept out of the component so it can be read, argued with, and run on its own.
 * Everything here is deterministic: given the dials, there is one trajectory and
 * one set of numbers, and dragging a slider recomputes both. Nothing is
 * simulated stochastically, because the quantities the page reports are
 * expectations over the hazard, and the expectation has a closed form.
 *
 * Time is measured in CENTURIES throughout. Rates are per century.
 *
 * ── the two curves ──
 *
 * Cultivated fraction s(t), logistic growth against generational forgetting:
 *
 *     ds/dt = g·s·(1 − s) − δ·s
 *
 * which is the logistic ds/dt = s·(r − g·s) with r = g − δ. Its ceiling is
 *
 *     s* = 1 − δ/g
 *
 * and that single line carries most of the argument on the page: the highest
 * fraction a civilization ever reaches is set by the RATIO of forgetting to
 * cultivation, not by how fast it teaches. Teach twice as fast against the same
 * forgetting and you arrive at the same place sooner.
 *
 * Capability, as a hazard multiplier that saturates rather than compounding
 * without limit — past the point where you can end yourself, further capability
 * adds mechanisms rather than outcomes:
 *
 *     c(t) = M − (M − 1)·2^(−t/T)
 *
 * ── the hazard ──
 *
 *     λ(t) = max( floor,  λ₀ · c(t) · ((1 − s(t)) / (1 − s₀))^k )
 *
 * The exponent k is the number of independent things that must coincide for a
 * catastrophe — capability, opportunity and will is the usual three — each of
 * which thins with the uncultivated remainder. It is the softest assumption in
 * the model, which is why it is on a dial rather than buried in a constant.
 *
 * ── the two ways it ends ──
 *
 * Extinction at λ(t). Lock-in at φ(t): a civilization frightened by its own
 * hazard reaches for control, so φ falls as the hazard falls,
 *
 *     φ(t) = φ₀ · min(1, λ(t)/λ₀)
 *
 * A civilization that freezes stops improving, so it keeps the hazard it froze
 * with for the rest of time. That is why lock-in is usually fatal too, on a
 * longer clock: it is not only a loss of what was worth surviving for, it is a
 * hazard rate held constant forever.
 */

import {
  BILLION_YEAR_HAZARD,
  DEEP_HORIZON,
  REACH,
  type Reach,
} from '@/content/playground/the-passage'

export type Dials = {
  /**
   * s₀ — the cultivated fraction today. The phoenix rate is the baseline from
   * BEFORE anyone cultivated deliberately; two and a half thousand years of a
   * tradition that teaches this on purpose should have moved it, and how far is
   * an honest unknown. It is a dial because the answer sets the length of the
   * crossing, and the length of the crossing is what the hazard is charged on.
   */
  start: number
  /** λ₀ — hazard per century at the start, before any capability multiplier. */
  hazard: number
  /** M — the hazard multiplier at full capability. */
  capMult: number
  /** T — capability doubling time, in centuries. */
  capDouble: number
  /** g — cultivation rate per century. */
  cultivation: number
  /** δ/g — forgetting as a fraction of cultivation. The ceiling is 1 − this. */
  forgetting: number
  /** k — how many independent things must coincide for a catastrophe. */
  conditions: number
  /** φ₀ — lock-in pressure per century at today's hazard. */
  lockin: number
  /** Where the civilization lives, which sets the hazard floor. */
  reach: Reach
}

export type Point = {
  /** Centuries from now. */
  t: number
  /** Cultivated fraction. */
  s: number
  /** Capability as a fraction of its own ceiling. */
  cap: number
  /** Hazard per century. */
  lam: number
  /** Still going, and still able to change. */
  moving: number
  /** Alive, and no longer able to. */
  frozen: number
  /** Ended. */
  ended: number
}

export type Run = {
  points: Point[]
  /** s* — the highest cultivated fraction ever reached. */
  ceiling: number
  /** Centuries until half the population is cultivated; null if never. */
  halfway: number | null
  /** The lowest hazard the civilization ever holds, per century. */
  floorReached: number
  /** Orders of magnitude between that hazard and the billion-year line. */
  ordersShort: number
  /** The uncultivated remainder that the billion-year line permits. */
  remainderAllowed: number
  /** Outcome shares at one billion years. */
  deep: { moving: number; frozen: number; ended: number }
  /** Centuries until the chance of having ended passes one half; null if never. */
  medianLife: number | null
  /**
   * The crossing itself: when the cultivation has done nine tenths of what it
   * will ever do, how many catastrophes are drawn against the civilization while
   * it gets there, and what share of civilizations are still moving at the end.
   *
   * This is the page's second condition, and the one the ceiling cannot help
   * with. A civilization can be headed somewhere safe and still be charged the
   * hazard of the whole journey on the way — so the crossing has to be short
   * relative to the hazard, not merely aimed correctly.
   */
  crossingEnd: number
  crossingCost: number
  crossingOdds: number
}

/** The cultivated fraction at time t, in closed form, stable at both ends. */
export function sageFraction(t: number, g: number, delta: number, s0: number): number {
  const r = g - delta
  if (Math.abs(r) < 1e-12) return s0 / (1 + g * s0 * t)
  const x = r * t
  if (x > 0) {
    // Divide through by e^{rt} so nothing overflows as the logistic saturates.
    const e = Math.exp(-x)
    return (r * s0) / (r * e + g * s0 * (1 - e))
  }
  const e = Math.exp(x)
  return (r * s0 * e) / (r + g * s0 * (e - 1))
}

/** The capability hazard multiplier at time t: 1 at the start, M in the limit. */
export function capabilityFactor(t: number, mult: number, double: number): number {
  return mult - (mult - 1) * Math.pow(2, -t / Math.max(double, 1e-6))
}

/** The hazard per century at time t. */
export function hazardAt(t: number, d: Dials): number {
  const s = sageFraction(t, d.cultivation, d.forgetting * d.cultivation, d.start)
  const c = capabilityFactor(t, d.capMult, d.capDouble)
  const remainder = Math.max(0, 1 - s) / (1 - d.start)
  const endogenous = d.hazard * c * Math.pow(remainder, d.conditions)
  return Math.max(REACH[d.reach].floor, endogenous)
}

/**
 * The time grid: geometric from half a year out to one billion years, so the
 * first few centuries — where everything happens — are dense, and deep time,
 * where the hazard is flat at its floor, is cheap.
 */
function grid(n = 880): number[] {
  const lo = Math.log(5e-3)
  const hi = Math.log(DEEP_HORIZON)
  const out = [0]
  for (let i = 0; i < n; i++) out.push(Math.exp(lo + ((hi - lo) * i) / (n - 1)))
  return out
}

const TIMES = grid()

/** Run the model. Pure, and cheap enough to call on every slider frame. */
export function run(d: Dials): Run {
  const delta = d.forgetting * d.cultivation
  const n = TIMES.length
  const s = new Float64Array(n)
  const cap = new Float64Array(n)
  const lam = new Float64Array(n)
  const phi = new Float64Array(n)
  const moving = new Float64Array(n)

  for (let i = 0; i < n; i++) {
    const t = TIMES[i]
    s[i] = sageFraction(t, d.cultivation, delta, d.start)
    const c = capabilityFactor(t, d.capMult, d.capDouble)
    cap[i] = (c - 1) / Math.max(d.capMult - 1, 1e-9)
    const remainder = Math.max(0, 1 - s[i]) / (1 - d.start)
    lam[i] = Math.max(
      REACH[d.reach].floor,
      d.hazard * c * Math.pow(remainder, d.conditions),
    )
    // Fear tracks the hazard: a civilization reaches for control in proportion
    // to how dangerous it currently is to itself.
    phi[i] = d.lockin * Math.min(1, lam[i] / Math.max(d.hazard, 1e-12))
  }

  // Survival of the population that is still moving: exp(−∫(λ + φ)).
  let acc = 0
  moving[0] = 1
  for (let i = 1; i < n; i++) {
    const dt = TIMES[i] - TIMES[i - 1]
    acc += ((lam[i] + phi[i] + lam[i - 1] + phi[i - 1]) / 2) * dt
    moving[i] = Math.exp(-acc)
  }

  // Frozen cohorts keep the hazard they froze with, forever. Summed over a
  // subsample of freezing times, which is plenty: φ is smooth and concentrated.
  const STRIDE = 4
  const frozen = new Float64Array(n)
  for (let j = STRIDE; j < n; j += STRIDE) {
    const du = TIMES[j] - TIMES[j - STRIDE]
    const born = phi[j] * moving[j] * du
    if (born < 1e-15) continue
    const lamJ = lam[j]
    for (let i = j; i < n; i++) {
      frozen[i] += born * Math.exp(-lamJ * (TIMES[i] - TIMES[j]))
    }
  }

  const points: Point[] = []
  for (let i = 0; i < n; i++) {
    const f = Math.min(frozen[i], Math.max(0, 1 - moving[i]))
    points.push({
      t: TIMES[i],
      s: s[i],
      cap: cap[i],
      lam: lam[i],
      moving: moving[i],
      frozen: f,
      ended: Math.max(0, 1 - moving[i] - f),
    })
  }

  // The crossing ends when cultivation has done nine tenths of what it ever
  // will; past that the curve is flat and the hazard is at its floor.
  const ceilingRaw = Math.max(0, 1 - d.forgetting)
  const target = d.start + 0.9 * Math.max(0, ceilingRaw - d.start)
  let ci = n - 1
  for (let i = 0; i < n; i++) {
    if (s[i] >= target) { ci = i; break }
  }
  let cost = 0
  for (let i = 1; i <= ci; i++) {
    const dt = TIMES[i] - TIMES[i - 1]
    cost += ((lam[i] + phi[i] + lam[i - 1] + phi[i - 1]) / 2) * dt
  }

  const ceiling = ceilingRaw
  const halfway = ceiling > 0.5 ? points.find((p) => p.s >= 0.5)?.t ?? null : null
  const floorReached = points.reduce((m, p) => Math.min(m, p.lam), Infinity)
  const last = points[points.length - 1]
  const median = points.find((p) => p.ended >= 0.5)

  // The remainder the billion-year line permits, once capability is saturated:
  // λ₀·M·x^k = λ*, solved for x.
  const remainderAllowed = Math.pow(
    BILLION_YEAR_HAZARD / Math.max(d.hazard * d.capMult, 1e-30),
    1 / d.conditions,
  )

  return {
    points,
    ceiling,
    halfway,
    floorReached,
    ordersShort: Math.log10(floorReached / BILLION_YEAR_HAZARD),
    remainderAllowed: Math.min(1, remainderAllowed),
    deep: { moving: last.moving, frozen: last.frozen, ended: last.ended },
    medianLife: median ? median.t : null,
    crossingEnd: TIMES[ci],
    crossingCost: cost,
    crossingOdds: Math.exp(-cost),
  }
}

/**
 * How much each dial matters, measured where it counts: the change in the log
 * odds of still moving at a billion years when the dial is nudged by a tenth.
 * Reported as orders of magnitude, so a bar of 2 means that nudge moved the
 * deep-time survival chance by a hundredfold.
 *
 * This is the part of the page that sets a research agenda rather than
 * describing a future: whichever bar is longest is where the argument should go.
 */
export type Sensitivity = { key: keyof Dials; label: string; effect: number }
/**
 * When the deep-time chance is already zero to the limits of a double, nudging
 * a dial moves it from zero to zero and every bar reads flat — true, and
 * useless. In that case the same nudges are measured against the odds of
 * completing the crossing at all, which is always measurable, and the panel
 * says which question it is answering.
 */
export type SensitivityReport = { basis: 'deep' | 'crossing'; bars: Sensitivity[] }

const NUDGE: { key: keyof Dials; label: string; apply: (d: Dials) => Dials }[] = [
  {
    key: 'forgetting',
    label: 'Forgetting',
    apply: (d) => ({ ...d, forgetting: Math.max(1e-4, d.forgetting * 0.9) }),
  },
  {
    key: 'cultivation',
    label: 'Cultivation rate',
    apply: (d) => ({ ...d, cultivation: d.cultivation * 1.1 }),
  },
  {
    key: 'hazard',
    label: 'Hazard now',
    apply: (d) => ({ ...d, hazard: d.hazard * 0.9 }),
  },
  {
    key: 'capMult',
    label: 'Capability multiplier',
    apply: (d) => ({ ...d, capMult: Math.max(1, d.capMult * 0.9) }),
  },
  {
    key: 'conditions',
    label: 'Independent conditions',
    apply: (d) => ({ ...d, conditions: d.conditions * 1.1 }),
  },
  {
    key: 'lockin',
    label: 'Lock-in pressure',
    apply: (d) => ({ ...d, lockin: d.lockin * 0.9 }),
  },
  {
    key: 'capDouble',
    label: 'Capability doubling',
    apply: (d) => ({ ...d, capDouble: d.capDouble * 1.1 }),
  },
]

const FLOOR = 1e-300

export function sensitivity(d: Dials): SensitivityReport {
  const baseRun = run(d)
  const measurable = baseRun.deep.moving > 1e-30
  const basis: 'deep' | 'crossing' = measurable ? 'deep' : 'crossing'
  const read = (r: Run) => (measurable ? r.deep.moving : r.crossingOdds)
  const base = Math.max(read(baseRun), FLOOR)
  const bars = NUDGE.map(({ key, label, apply }) => {
    const moved = Math.max(read(run(apply(d))), FLOOR)
    return { key, label, effect: Math.log10(moved / base) }
  }).sort((a, b) => b.effect - a.effect)
  return { basis, bars }
}
