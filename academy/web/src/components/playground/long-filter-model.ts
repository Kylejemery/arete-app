/**
 * The Long Filter's model, kept apart from the page so it can be checked on
 * its own (docs/long-filter-appendix.md, A.11, mirrors it line for line).
 *
 * Moral progressors, not sages, are the growing population. Their share s
 * starts at Seneca's phoenix rate, s₀ = 10⁻⁹, which is a conservative floor
 * (it counts sages, and progressors are far more common), and grows
 * logistically toward a ceiling s_max:
 *
 *   ds/dt = g s (1 − s/s_max)      s(t) = s_max / (1 + (s_max/s₀ − 1) e^(−gt))
 *
 * One capability gap d drives both reducible hazards, and no hazard switches
 * off when the transition ends:
 *
 *   malice  p_m(t) = p_m0 (1 − s) e^(dt)
 *   error   p_e(t) = p_e0 [φ (1 − s) + (1 − φ)] e^(dt)
 *   total   h(t)   = p_m + p_e + p_x, for all time
 *
 * φ is the share of error that depends on conflict and so falls as
 * progressors spread; the rest is error that virtue alone does not touch.
 *
 * The count is Ṅ times the expected time a civilization spends alive past the
 * end of its transition, N = Ṅ ∫_τ^∞ S(t) dt with S = exp(−∫h). The hazards
 * run on unchanged across τ; τ only decides who is counted. It barely matters
 * where τ is put (the half, 90% or 99% point give the same count to three
 * figures), and it is needed at all because the whole expected lifetime,
 * Ṅ ∫_0^∞ S, is dominated by civilizations that die young: at a 1% annual
 * hazard that alone is Ṅ/1% ≈ 1, whatever happens afterwards.
 *
 * S is integrated in three stretches. Before the transition s is below
 * s_max·e⁻¹² and the cumulative hazard has a closed form. Across it, the
 * hazard is integrated numerically on a grid set by g and d. After it, s is
 * s_max to within the same tolerance and the remaining lifetime has a closed
 * form in the exponential integrals.
 */

export const S0 = 1e-9
export const NDOT = 0.01
export const PX = 1e-8

/** Where the transition is said to end: the progressor share reaches 90% of its ceiling. */
export const TAU_FRACTION = 0.9

/** Logistic margin, in units of 1/g, beyond which s is taken as 0 or s_max. */
const EDGE = 12

export type Params = {
  /** p_m0, malice hazard at the start, per year. */
  malice: number
  /** p_e0, error hazard at the start, per year. */
  errorBase: number
  /** g, the progressors' growth rate, per year. */
  growth: number
  /** d = c − e, capability minus competence, per year. */
  gap: number
  /** s_max, the ceiling on the progressor share. */
  ceiling: number
  /** φ, the share of error that depends on conflict. */
  conflict: number
}

/** The progressor share at time t. */
export function share(t: number, growth: number, ceiling: number): number {
  const x = -growth * t
  if (x < -700) return ceiling
  return ceiling / (1 + (ceiling / S0 - 1) * Math.exp(x))
}

/** Time for the share to reach a fraction f of its ceiling. */
export function timeToFraction(f: number, growth: number, ceiling: number): number {
  return (Math.log(ceiling / S0 - 1) + Math.log(f / (1 - f))) / growth
}

/** The transition length τ: the share reaches 90% of its ceiling. */
export const transitionYears = (growth: number, ceiling: number) =>
  timeToFraction(TAU_FRACTION, growth, ceiling)

/** The midpoint of the transition, where the share is half its ceiling. */
export const midpointYears = (growth: number, ceiling: number) =>
  Math.log(ceiling / S0 - 1) / growth

/** ∫₀ᵗ e^(du) du, with its d → 0 limit. */
function growthIntegral(d: number, t: number): number {
  if (Math.abs(d * t) < 1e-9) return t
  return Math.expm1(d * t) / d
}

const EULER = 0.5772156649015329

/** e^C · E₁(C), for C > 0. */
function expE1(c: number): number {
  if (c < 1) {
    // E₁(C) = −γ − ln C − Σ (−C)^k / (k·k!)
    let sum = 0
    let term = 1
    for (let k = 1; k < 40; k++) {
      term *= -c / k
      sum += term / k
    }
    return Math.exp(c) * (-EULER - Math.log(c) - sum)
  }
  // Continued fraction (modified Lentz), which gives e^C E₁(C) directly.
  let b = c + 1
  let cc = 1 / 1e-300
  let dd = 1 / b
  let h = dd
  for (let i = 1; i < 200; i++) {
    const a = -i * i
    b += 2
    dd = 1 / (a * dd + b)
    cc = b + a / cc
    const del = cc * dd
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return h
}

/** e^(−C) · Ein(C), where Ein(C) = ∫₀^C (eᶻ − 1)/z dz, for C ≥ 0. */
function expNegEin(c: number): number {
  if (c < 40) {
    let sum = 0
    let term = 1
    for (let k = 1; k < 200; k++) {
      term *= c / k
      const add = term / k
      sum += add
      if (add < sum * 1e-16) break
    }
    return Math.exp(-c) * sum
  }
  const r = 1 / c
  return r * (1 + r + 2 * r * r + 6 * r * r * r + 24 * r * r * r * r)
}

/**
 * Expected further lifetime from a moment when the hazard is c·e^(du) + p_x
 * and the share no longer moves: ∫₀^∞ exp(−c(e^(du) − 1)/d − p_x u) du.
 */
function tailLifetime(c: number, d: number): number {
  if (c <= 0) return 1 / PX
  if (d === 0) return 1 / (c + PX)
  if (d < 0) {
    // The reducible hazard has c/|d| left to spend; afterwards only p_x.
    const big = c / -d
    return Math.exp(-big) / PX + expNegEin(big) / -d
  }
  // It grows without bound; p_x is negligible beside it, folded in as a rate.
  const j = expE1(c / d) / d
  return j / (1 + PX * j)
}

export type Outcome = {
  /** N, transitioned civilizations expected alive in the galaxy. */
  count: number
  /** τ, the transition length in years. */
  tau: number
  /** Cumulative malice, error and external hazard across the transition. */
  maliceLoad: number
  errorLoad: number
  externalLoad: number
  /** Total reducible hazard per year left standing at τ. */
  residual: number
}

/**
 * The whole model for one setting. `stepCap` bounds the work across the
 * transition; the diagram passes a lower one than the readouts.
 */
export function evaluate(p: Params, stepCap = 6000): Outcome {
  const { malice: pm, errorBase: pe, growth: g, gap: d, ceiling: sm, conflict: phi } = p
  const tau = transitionYears(g, sm)
  const mid = midpointYears(g, sm)
  const t1 = Math.max(0, mid - EDGE / g)
  const tEnd = mid + EDGE / g
  const dead: Outcome = {
    count: 0,
    tau,
    maliceLoad: Infinity,
    errorLoad: Infinity,
    externalLoad: PX * tau,
    residual: Infinity,
  }

  // 1. Before the transition: s ≈ 0, so h = (p_m0 + p_e0) e^(dt) + p_x.
  const g1 = growthIntegral(d, t1)
  let hm = pm * g1
  let he = pe * g1
  let hx = PX * t1
  let H = hm + he + hx
  if (!(H < 745)) return dead

  // 2. Across it, numerically. The rows of the diagram share g and d.
  const rate = Math.max(g, Math.abs(d))
  const steps = Math.min(stepCap, Math.max(200, Math.ceil(((tEnd - t1) * rate) / 0.05)))
  const dt = (tEnd - t1) / steps
  const hazardAt = (t: number) => {
    const s = share(t, g, sm)
    const grow = Math.exp(d * t)
    return {
      m: pm * (1 - s) * grow,
      e: pe * (phi * (1 - s) + (1 - phi)) * grow,
    }
  }
  let t = t1
  let prev = hazardAt(t)
  let post = 0
  let mAtTau = 0
  let eAtTau = 0
  let pastTau = false
  for (let i = 0; i < steps; i++) {
    let next = t + dt
    // Put a grid point exactly at τ, so the count starts where it should.
    const crossing = !pastTau && t < tau && next >= tau
    if (crossing) next = tau
    const cur = hazardAt(next)
    const dm = 0.5 * (prev.m + cur.m) * (next - t)
    const de = 0.5 * (prev.e + cur.e) * (next - t)
    const dx = PX * (next - t)
    const dH = dm + de + dx
    if (pastTau) {
      // Exact ∫ e^(−H) over a piece where H is linear.
      post += Math.exp(-H) * (next - t) * (dH > 1e-12 ? -Math.expm1(-dH) / dH : 1)
    } else {
      hm += dm
      he += de
      hx += dx
    }
    H += dH
    if (!(H < 745)) return { ...dead, maliceLoad: hm, errorLoad: he, externalLoad: hx }
    t = next
    prev = cur
    if (crossing) {
      pastTau = true
      mAtTau = cur.m
      eAtTau = cur.e
      i-- // the step to τ was a partial one; keep the grid's count
    }
  }

  // 3. After it: s = s_max, h = A·e^(dt) + p_x from here on.
  const residualAtEnd =
    (pm * (1 - sm) + pe * (phi * (1 - sm) + (1 - phi))) * Math.exp(d * t)
  post += Math.exp(-H) * tailLifetime(residualAtEnd, d)

  return {
    count: NDOT * post,
    tau,
    maliceLoad: hm,
    errorLoad: he,
    externalLoad: hx,
    residual: mAtTau + eAtTau,
  }
}

export const countOf = (p: Params, stepCap?: number) => evaluate(p, stepCap).count

/**
 * d₁: the widest gap at which the count still reaches one, by bisection.
 * Null when no gap in range gets there, Infinity when every gap does.
 */
export function criticalGap(p: Omit<Params, 'gap'>, lo = -0.05, hi = 0.02): number | null {
  if (countOf({ ...p, gap: lo }) < 1) return null
  if (countOf({ ...p, gap: hi }) >= 1) return Infinity
  for (let i = 0; i < 60; i++) {
    const midGap = (lo + hi) / 2
    if (countOf({ ...p, gap: midGap }) >= 1) lo = midGap
    else hi = midGap
  }
  return lo
}

/**
 * R*: the moral threshold, the ratio p_m0/g at which malice alone (no error,
 * no gap) brings the count to one. It now depends on g and on s_max, because
 * a ceiling below one leaves malice standing after the transition.
 */
export function moralThreshold(growth: number, ceiling: number): number {
  const at = (r: number) =>
    countOf({ malice: r * growth, errorBase: 0, growth, gap: 0, ceiling, conflict: 1 })
  let lo = 1e-4
  let hi = 50
  if (at(lo) < 1) return 0
  if (at(hi) >= 1) return Infinity
  for (let i = 0; i < 60; i++) {
    const m = Math.sqrt(lo * hi)
    if (at(m) >= 1) lo = m
    else hi = m
  }
  return lo
}

/**
 * Counts for one row of the phase diagram: a fixed gap, many malice values.
 * Everything that does not depend on malice (the grid, the share, the growth
 * factor) is computed once for the row, which is what keeps a full redraw
 * of the diagram fast enough to follow a dial.
 */
export function countRow(
  base: Omit<Params, 'malice' | 'gap'>,
  gap: number,
  malices: number[],
  stepCap = 1500,
): number[] {
  const { errorBase: pe, growth: g, ceiling: sm, conflict: phi } = base
  const d = gap
  const tau = transitionYears(g, sm)
  const mid = midpointYears(g, sm)
  const t1 = Math.max(0, mid - EDGE / g)
  const tEnd = mid + EDGE / g
  const rate = Math.max(g, Math.abs(d))
  const steps = Math.min(stepCap, Math.max(200, Math.ceil(((tEnd - t1) * rate) / 0.05)))
  const dt = (tEnd - t1) / steps

  // The grid, with τ inserted as its own point.
  const ts: number[] = []
  for (let i = 0; i <= steps; i++) ts.push(t1 + i * dt)
  let tauIndex = ts.findIndex((t) => t >= tau)
  if (ts[tauIndex] !== tau) ts.splice(tauIndex, 0, tau)
  else tauIndex = ts.indexOf(tau)
  const free = ts.map((t) => 1 - share(t, g, sm))
  const grow = ts.map((t) => Math.exp(d * t))
  const errorPath = ts.map((_, i) => pe * (phi * free[i] + (1 - phi)) * grow[i])
  const malicePath = ts.map((_, i) => free[i] * grow[i])
  const g1 = growthIntegral(d, t1)
  const last = ts.length - 1
  const tailGrow = Math.exp(d * ts[last])
  const errorTail = pe * (phi * (1 - sm) + (1 - phi)) * tailGrow

  return malices.map((pm) => {
    let H = (pm + pe) * g1 + PX * t1
    if (!(H < 745)) return 0
    let post = 0
    let prev = pm * malicePath[0] + errorPath[0]
    for (let i = 1; i <= last; i++) {
      const cur = pm * malicePath[i] + errorPath[i]
      const step = ts[i] - ts[i - 1]
      const dH = (0.5 * (prev + cur) + PX) * step
      if (i > tauIndex) post += Math.exp(-H) * step * (dH > 1e-12 ? -Math.expm1(-dH) / dH : 1)
      H += dH
      if (!(H < 745)) return 0
      prev = cur
    }
    post += Math.exp(-H) * tailLifetime(pm * (1 - sm) * tailGrow + errorTail, d)
    return NDOT * post
  })
}
