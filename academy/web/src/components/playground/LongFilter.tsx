'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BYLINE,
  CEILING_MAX,
  CEILING_MIN,
  CIVILIZATIONS,
  DEFAULT_PRESET,
  GAP_MAX,
  GAP_MIN,
  HALVING_YEARS,
  LEDGER,
  PRESETS,
  RATIO_MAX,
  RATIO_MIN,
  REFERENCES,
  REVISED,
  SCATTER_SEED,
  type Preset,
  SETTLEMENT_MAX,
  SETTLEMENT_MIN,
  SETTLEMENT_YEARS,
} from '@/content/playground/long-filter'
import styles from './LongFilter.module.css'
import {
  type Params,
  countOf,
  countRow,
  criticalGap,
  evaluate,
  moralThreshold,
  transitionYears,
} from './long-filter-model'

// ── the arithmetic ───────────────────────────────────────────────────────────

/** A span of years, phrased for humans. */
function fmtYears(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '')} billion`
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')} million`
  return Math.round(n).toLocaleString('en-US')
}

/** Slider 0–70 → annual risk, 1e-1 down to 1e-5. */
const riskFromSlider = (v: number) => Math.pow(10, -((v / 70) * 4 + 1))

/** Slider 0–90 → years elapsed, 1 up to 1e9. */
const yearsFromSlider = (v: number) => Math.pow(10, (v / 90) * 9)

/**
 * Survival across `years` at annual risk `p`.
 *
 * Fixed hazard is the decay law, (1 − p)^n. Under decay the hazard halves every
 * HALVING_YEARS, so the exponent is the integral of p·2^(−t/H) — which
 * converges, and is the only reason any civilization clears deep time.
 */
function survival(p: number, years: number, decay: boolean): number {
  if (!decay) return Math.pow(1 - p, years)
  const integral = ((p * HALVING_YEARS) / Math.LN2) * (1 - Math.pow(2, -years / HALVING_YEARS))
  return Math.exp(-integral)
}

// ── the model ────────────────────────────────────────────────────────────────
//
// Lives in long-filter-model.ts: progressors growing logistically to s_max, one
// gap d driving malice and error, no hazard switching off, and the count taken
// from the expected lifetime past the transition.

/** Both gauge sliders read the same scale: 0.01% to 3.16% a year. */
const rateFromSlider = (v: number) => Math.pow(10, -4 + (v / 100) * 2.5)

/** The capability-gap slider spans the diagram's vertical axis. */
const gapFromSlider = (v: number) => GAP_MIN + (v / 100) * (GAP_MAX - GAP_MIN)

/** The error-rate dial: 0.0001% to 3.16% a year, the softest number in the model. */
const errorFromSlider = (v: number) => Math.pow(10, -6 + (v / 100) * 4.5)

/** The inverses, for loading a preset or a shared link. Off-scale values pin to the ends. */
const clampStep = (v: number) => Math.min(100, Math.max(0, v))
const sliderFromRate = (r: number) => clampStep(((Math.log10(r) + 4) / 2.5) * 100)
const sliderFromError = (r: number) => clampStep(((Math.log10(r) + 6) / 4.5) * 100)
const sliderFromGap = (d: number) => clampStep(((d - GAP_MIN) / (GAP_MAX - GAP_MIN)) * 100)

/** The ceiling dial, s_max, linear from 0.90 to 1.00; the conflict share φ, 0 to 1. */
const ceilingFromSlider = (v: number) => CEILING_MIN + (v / 100) * (CEILING_MAX - CEILING_MIN)
const sliderFromCeiling = (c: number) =>
  clampStep(((c - CEILING_MIN) / (CEILING_MAX - CEILING_MIN)) * 100)
const conflictFromSlider = (v: number) => v / 100
const sliderFromConflict = (f: number) => clampStep(f * 100)

/** The settlement dial: a thousand years to a million, log-scaled. */
const SETTLE_LO = Math.log10(SETTLEMENT_MIN)
const SETTLE_HI = Math.log10(SETTLEMENT_MAX)
const settleFromSlider = (v: number) => Math.pow(10, SETTLE_LO + (v / 100) * (SETTLE_HI - SETTLE_LO))
const sliderFromSettle = (t: number) =>
  clampStep(((Math.log10(t) - SETTLE_LO) / (SETTLE_HI - SETTLE_LO)) * 100)

/** A rate as the percent a link or a preset carries, to three figures. */
const asPercent = (v: number) => Number((v * 100).toPrecision(3))

const pct = (v: number, places: number) => `${(v * 100).toFixed(places)}%`
const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(3)}%`
/** Axis ticks are typeset rather than read out: coarser, with a real minus. */
const axisPct = (v: number) =>
  `${v >= 0 ? '+' : '\u2212'}${Math.abs(v * 100).toFixed(2)}%`

// ── the explainers ───────────────────────────────────────────────────────────
//
// Each dial carries a line of prose that changes with where it sits, anchored
// to something a reader already has a sense of: a span of history, a published
// estimate, a historical rate. The anchors are the ones the formal note uses.

/** A span of years against the human record. */
function spanAnchor(y: number): string {
  if (y < 80) return 'less than a human lifetime'
  if (y < 5000) return 'less than recorded history, which is about 5,000 years'
  if (y < 12000) return 'about the time since the first farms'
  if (y < 300000) return 'less than our species has existed'
  if (y < 6.6e7) return 'longer than our species has existed, though less than the time since the dinosaurs died'
  if (y < 4.7e8) return 'longer than the time since the dinosaurs died'
  return 'longer than there has been life on land'
}

/** I. Where the annual risk sits against the published estimates. */
function riskNote(p: number): string {
  const band =
    p >= 0.03
      ? 'Far above any published estimate for nuclear war.'
      : p >= 0.008
      ? 'About Hellman’s estimate for nuclear war, near 1 in 100 a year.'
      : p >= 0.001
        ? 'Inside the span of published estimates for major nuclear war, 1 in 1,000 to 1 in 100 a year.'
        : p >= 1e-4
          ? 'Below the published estimates. Most forecasters would call this optimistic.'
          : 'Far below any published estimate.'
  return `${band} At this risk a civilization lasts ${fmtYears(1 / p)} years on average, ${spanAnchor(1 / p)}.`
}

/**
 * I. What surviving this long amounts to, as a run of coin flips: a survival
 * chance S is as likely as log₂(1/S) heads in a row. Computed from ln S so the
 * deep-time end does not underflow to zero.
 */
function yearsNote(p: number, years: number, decay: boolean): string {
  const lnS = decay
    ? -((p * HALVING_YEARS) / Math.LN2) * (1 - Math.pow(2, -years / HALVING_YEARS))
    : years * Math.log1p(-p)
  const heads = -lnS / Math.LN2
  const odds =
    heads < 0.15
      ? 'Survival is close to certain.'
      : heads < 1
        ? 'Survival is better than a coin flip.'
        : heads < 1e6
          ? `Surviving it is as likely as flipping ${heads < 10 ? heads.toFixed(1) : Math.round(heads).toLocaleString('en-US')} heads in a row.`
          : 'Surviving it is less likely than a million heads in a row.'
  let tail = ''
  if (decay) {
    const now = p * Math.pow(2, -years / HALVING_YEARS)
    tail =
      now > 1e-15
        ? ` By then the annual risk has halved ${Math.floor(years / HALVING_YEARS).toLocaleString('en-US')} times, to 1 in ${fmtYears(1 / now)}.`
        : ' By then the annual risk has halved so often it is effectively zero.'
  }
  return `${fmtYears(years)} years is ${spanAnchor(years)}. ${odds}${tail}`
}

/** IV. Malice against the published totals it is borrowed from. */
function maliceNote(m: number, rStar: number, g: number): string {
  const band =
    m >= 0.008
      ? 'At Hellman’s figure or above. That total counts accidents too, so as malice alone this is pessimistic.'
      : m >= 0.002
        ? 'Near the superforecaster range for deliberate catastrophe.'
        : m >= 5e-4
          ? 'Below the superforecasters. Deliberate destruction would be rare by any published count.'
          : 'Far below any published estimate.'
  const limit = rStar * g
  return `${band} At this g, malice alone clears the moral threshold only below ${pct(limit, limit < 0.001 ? 3 : 2)} a year; a lead in competence can carry the rest.`
}

/** IV. The improvement rate against the two historical anchors. */
function growthNote(g: number, ceiling: number): string {
  const band =
    g < 0.003
      ? 'Slower than either historical anchor.'
      : g < 0.01
        ? 'About the pace at which European homicide fell, 0.6% a year over six centuries.'
        : g < 0.03
          ? 'Near the pace at which literacy spread, 2% a year over two centuries.'
          : 'Faster than either historical anchor.'
  return `${band} The progressor share doubles every ${fmtYears(Math.LN2 / g)} years at first and reaches 99% of its ceiling in ${fmtYears(transitionYears(g, ceiling))} years.`
}

/** IV. The baseline error rate, and what it adds up to with no gap at all. */
function errorNote(e: number, flat: number): string {
  const band =
    e < 4e-6
      ? 'Below even the optimistic baseline this note first assumed.'
      : e < 1e-4
      ? 'Near the tidy baseline this note first assumed, now kept as the optimistic case.'
      : e < 0.002
        ? 'Between the optimistic baseline and the realistic one.'
        : e < 0.009
          ? 'The realistic range: most of a 1% published total is error rather than malice.'
          : 'Above the realistic range.'
  const keep = Math.exp(-flat)
  return `${band} Even with competence keeping exact pace, the error integral comes to ${flat < 10 ? flat.toFixed(2) : flat.toFixed(0)} over the transition, which leaves ${keep >= 0.01 ? `${Math.round(keep * 100)}% of civilizations` : 'almost no civilizations'} standing.`
}

/** IV. The capability gap, as a doubling or halving time for error. */
function gapNote(d: number, e: number): string {
  if (Math.abs(d) < 2.5e-5)
    return 'Competence keeps exact pace with capability, so the error hazard stays at its baseline for the whole transition.'
  if (d > 0)
    return `Capability outruns competence by ${pct(d, 3)} a year, so the error hazard doubles every ${fmtYears(Math.LN2 / d)} years. Each new kind of capability opens failure channels the last kind did not have.`
  const cap = e / -d
  const floor = Math.exp(-cap)
  const capText = cap < 0.01 ? cap.toPrecision(1) : cap < 10 ? cap.toFixed(2) : cap.toFixed(0)
  return `Competence outpaces capability by ${pct(-d, 3)} a year, so the error hazard halves every ${fmtYears(Math.LN2 / -d)} years. However long the transition, the error integral can never pass ${capText}, ${floor >= 0.995 ? 'so the error term barely touches the count' : floor >= 0.01 ? `so at least ${Math.round(floor * 100)}% of civilizations get through the error term` : 'though that is still enough to stop almost every civilization'}.`
}

// ── the plate ────────────────────────────────────────────────────────────────

/** IV. The ceiling, as the hazard progressors leave standing once they stop spreading. */
function ceilingNote(sm: number, m: number, e: number, phi: number): string {
  const left = m * (1 - sm) + e * phi * (1 - sm)
  const holdouts = (1 - sm) * 100
  return `${holdouts < 0.05 ? 'Almost no one' : `${holdouts.toFixed(holdouts < 1 ? 1 : 0)}% of people`} never become progressors. Their share of malice and conflict error, ${pct(left, left < 1e-4 ? 4 : 3)} a year at today's capability, never goes away; only the gap can shrink it.`
}

/** IV. The conflict share of error, and the part virtue alone does not touch. */
function conflictNote(phi: number, e: number): string {
  const fixed = e * (1 - phi)
  return `${Math.round(phi * 100)}% of error falls as progressors spread. The other ${Math.round((1 - phi) * 100)}%, ${pct(fixed, fixed < 1e-4 ? 4 : 3)} a year at today's capability, is accident that virtue does not prevent, and only competence outpacing capability shrinks it.`
}

/**
 * IV. Interstellar settlement against the transition. The model treats a
 * civilization as one target until it saturates; settlement around other stars
 * before then would decouple its fate and escape the filter by distance.
 */
function settleNote(t: number, g: number, ceiling: number): string {
  const tau = transitionYears(g, ceiling)
  const crossing = settleCrossing(t, ceiling)
  if (tau < t)
    return `The transition finishes in ${fmtYears(tau)} years, ${fmtYears(t - tau)} years before settlement arrives, so the single-target assumption holds and the count stands. It would stop holding below ${pct(crossing, 2)} a year.`
  return `Settlement arrives ${fmtYears(tau - t)} years before the transition finishes. A civilization spread across stars by then could escape by distance rather than character, and the count no longer describes it. The transition wins only above ${pct(crossing, 2)} a year.`
}

/** The improvement rate at which the transition takes exactly T_s years. */
const settleCrossing = (t: number, ceiling: number) => (transitionYears(1, ceiling)) / t

type Mark = { x: number; y: number; r: number }

/**
 * One thousand marks, scattered once from a fixed seed so the field holds still
 * while the dials move — only how many are lit ever changes. Shuffled by a
 * second draw from the same stream, so the ones that go dark go dark at random
 * rather than in reading order.
 */
const MARKS: Mark[] = (() => {
  let seed = SCATTER_SEED
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const out: (Mark & { order: number })[] = []
  for (let i = 0; i < CIVILIZATIONS; i++) {
    out.push({ x: rnd(), y: rnd(), r: 0.55 + rnd() * 1.9, order: rnd() })
  }
  out.sort((a, b) => a.order - b.order)
  return out
})()

// ── the phase diagram ────────────────────────────────────────────────────────

const R_LO = Math.log10(RATIO_MIN)
const R_HI = Math.log10(RATIO_MAX)

/** Logical sizes of the two canvases; the backing store is scaled to the screen. */
const PLATE_W = 1200
const PLATE_H = 440
const PHASE_W = 720
const PHASE_H = 420

/**
 * The backing-store scale for a canvas drawn in logical units: its CSS width
 * times the device pixel ratio, over the logical width. Starts at 1 so the
 * server render and the first client render agree, then follows resizes.
 */
function useCanvasScale(ref: React.RefObject<HTMLCanvasElement | null>, logicalWidth: number) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const measure = () => {
      const next = (canvas.clientWidth * (window.devicePixelRatio || 1)) / logicalWidth
      if (next > 0) setScale((s) => (Math.abs(s - next) > 0.01 ? next : s))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [ref, logicalWidth])
  return scale
}

/** Indigo where somebody survives, oxide where nobody does, both ramped by count. */
function shade(n: number): string {
  if (n >= 1) {
    const t = Math.min(1, Math.log10(n) / 6)
    return `rgb(${Math.round(34 + 92 * t)}, ${Math.round(48 + 112 * t)}, ${Math.round(82 + 134 * t)})`
  }
  const u = Math.min(1, Math.max(0, -Math.log10(Math.max(n, 1e-30)) / 10))
  return `rgb(${Math.round(122 - 88 * u)}, ${Math.round(46 - 30 * u)}, ${Math.round(35 - 21 * u)})`
}

/**
 * The survivable region for one improvement rate.
 *
 * Redrawn only when g or p_e0 changes: those two deform the region itself,
 * since a slower transition means more years exposed to compounding
 * capability, while p_m0 and d only move the marker within it. The near-unity
 * contour is painted pale so the boundary reads as a line rather than a colour
 * change.
 */
function drawField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: Omit<Params, 'malice' | 'gap'>,
  cell: number,
) {
  const malices: number[] = []
  for (let x = 0; x < w; x += cell) {
    malices.push(Math.pow(10, R_LO + ((x + cell / 2) / w) * (R_HI - R_LO)) * base.growth)
  }
  for (let y = 0; y < h; y += cell) {
    const gap = GAP_MAX - ((y + cell / 2) / h) * (GAP_MAX - GAP_MIN)
    const row = countRow(base, gap, malices)
    for (let i = 0; i < row.length; i++) {
      const n = row[i]
      const lg = Math.log10(Math.max(n, 1e-300))
      ctx.fillStyle = Math.abs(lg) < 0.12 ? '#E6EAF2' : shade(n)
      ctx.fillRect(i * cell, y, cell, cell)
    }
  }
}

/** Ratio ticks read as plain numbers: 0.01, 0.1, 1, 10. */
const ratioTick = (t: number) => (t >= 1 ? t.toFixed(0) : String(Number(t.toPrecision(1))))

/** Where a moral threshold falls across the diagram, in percent of its width. */
const thresholdLeft = (rStar: number) =>
  Math.min(100, Math.max(0, ((Math.log10(rStar) - R_LO) / (R_HI - R_LO)) * 100))

/** Axis ticks, derived from the bounds the diagram is drawn over. */
const Y_TICKS = [0, 1, 2, 3, 4].map((i) => GAP_MAX - (i / 4) * (GAP_MAX - GAP_MIN))
const X_TICKS = [0, 1, 2, 3].map((i) => Math.pow(10, R_LO + (i / 3) * (R_HI - R_LO)))

function fmtCount(n: number): string {
  if (n >= 1000) return Math.round(n).toLocaleString('en-US')
  if (n >= 10) return n.toFixed(0)
  if (n >= 1) return n.toFixed(1)
  if (n >= 0.01) return n.toFixed(2)
  return '0'
}

/**
 * A count where the interesting values are the tiny ones: below a hundredth it
 * is set as a power of ten, so "nine orders of magnitude short" can be read off
 * the page rather than collapsing to zero.
 */
function Tiny({ n }: { n: number }) {
  if (n >= 0.01) return <>{fmtCount(n)}</>
  if (!(n > 0)) return <>0</>
  return (
    <>
      10<sup>{`\u2212${-Math.floor(Math.log10(n))}`}</sup>
    </>
  )
}

/** The setting the diagram holds, in fractions a year. */
type Setting = {
  malice: number
  growth: number
  errorBase: number
  gap: number
  ceiling: number
  conflict: number
}

const fromPreset = (p: Preset): Setting => ({
  malice: p.malice / 100,
  growth: p.growth / 100,
  errorBase: p.errorBase / 100,
  gap: p.gap / 100,
  ceiling: p.ceiling,
  conflict: p.conflict,
})

const OPENING = fromPreset(PRESETS.find((p) => p.key === DEFAULT_PRESET) ?? PRESETS[0])

/** A preset is lit when the dials sit on it, to the precision a link carries. */
const onPreset = (p: Preset, s: Setting) =>
  asPercent(s.malice) === p.malice &&
  asPercent(s.growth) === p.growth &&
  asPercent(s.errorBase) === p.errorBase &&
  Math.abs(s.gap * 100 - p.gap) < 0.005 &&
  Math.abs(s.ceiling - p.ceiling) < 0.0005 &&
  Math.abs(s.conflict - p.conflict) < 0.005

type Hover = { left: number; top: number; ratio: number; gap: number; n: number }

function phaseVerdict(n: number, gap: number, d1: number | null): string {
  if (n >= 1000)
    return 'Clear, comfortably. Thousands of civilizations past their transition, which means the filter cannot be what makes the sky quiet. Something else is.'
  if (n >= 1)
    return 'Clear, narrowly. A handful past their transition, scattered across a hundred thousand light years and under no obligation to announce it.'
  if (gap >= 0)
    return 'Holding the gap level is not enough. The error that virtue does not touch never falls, so even the civilizations that get through the transition do not last. The gap has to be negative.'
  if (d1 === null)
    return 'Competence leads, but no lead in range is enough at these rates. Something else has to give.'
  return `Competence leads, but not by enough. The count reaches one at d = ${signedPct(d1)}, and the hazards left standing do the rest.`
}

// ── component ────────────────────────────────────────────────────────────────

export default function LongFilter({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [riskStep, setRiskStep] = useState(35)
  const [yearsStep, setYearsStep] = useState(60)
  const [decay, setDecay] = useState(false)
  const [maliceStep, setMaliceStep] = useState(() => sliderFromRate(OPENING.malice))
  const [growthStep, setGrowthStep] = useState(() => sliderFromRate(OPENING.growth))
  const [errorStep, setErrorStep] = useState(() => sliderFromError(OPENING.errorBase))
  const [gapStep, setGapStep] = useState(() => sliderFromGap(OPENING.gap))
  const [ceilingStep, setCeilingStep] = useState(() => sliderFromCeiling(OPENING.ceiling))
  const [conflictStep, setConflictStep] = useState(() => sliderFromConflict(OPENING.conflict))
  const [settleStep, setSettleStep] = useState(() => sliderFromSettle(SETTLEMENT_YEARS))
  const [hover, setHover] = useState<Hover | null>(null)
  const [copied, setCopied] = useState(false)
  const plateRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<HTMLCanvasElement>(null)
  const plateScale = useCanvasScale(plateRef, PLATE_W)
  const phaseScale = useCanvasScale(phaseRef, PHASE_W)
  /** Set once the reader moves a dial, so an untouched page leaves the URL clean. */
  const touched = useRef(false)

  const apply = useCallback((s: Partial<Setting>) => {
    if (s.malice !== undefined) setMaliceStep(sliderFromRate(s.malice))
    if (s.growth !== undefined) setGrowthStep(sliderFromRate(s.growth))
    if (s.errorBase !== undefined) setErrorStep(sliderFromError(s.errorBase))
    if (s.gap !== undefined) setGapStep(sliderFromGap(s.gap))
    if (s.ceiling !== undefined) setCeilingStep(sliderFromCeiling(s.ceiling))
    if (s.conflict !== undefined) setConflictStep(sliderFromConflict(s.conflict))
  }, [])

  // A shared link opens on its setting: ?pm=0.3&g=0.6&pe=0.7&d=0, in percent a
  // year, with sm (s_max) and phi (φ) as fractions.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const read = (key: string, positive: boolean) => {
      const raw = q.get(key)
      if (raw === null) return undefined
      const v = Number(raw)
      return Number.isFinite(v) && (!positive || v > 0) ? v / 100 : undefined
    }
    apply({
      malice: read('pm', true),
      growth: read('g', true),
      errorBase: read('pe', true),
      gap: read('d', false),
    })
    const frac = (key: string, lo: number, hi: number) => {
      const v = Number(q.get(key))
      return q.get(key) !== null && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
    }
    apply({ ceiling: frac('sm', CEILING_MIN, CEILING_MAX), conflict: frac('phi', 0, 1) })
    const ts = Number(q.get('ts'))
    if (q.get('ts') !== null && Number.isFinite(ts) && ts > 0) setSettleStep(sliderFromSettle(ts))
  }, [apply])

  // the plate
  const p = riskFromSlider(riskStep)
  const years = yearsFromSlider(yearsStep)
  const share = survival(p, years, decay)
  const alive = Math.round(CIVILIZATIONS * share)
  const survivingPct = share * 100

  const survivorText =
    survivingPct >= 1
      ? `${survivingPct.toFixed(0)}%`
      : survivingPct >= 0.01
        ? `${survivingPct.toFixed(2)}%`
        : survivingPct > 0
          ? `${survivingPct.toExponential(1)}%`
          : '0%'

  let verdict: string
  if (decay) {
    const floor = Math.exp((-p * HALVING_YEARS) / Math.LN2) * 100
    verdict =
      'With the risk halving every thousand years the curve stops falling. The floor is ' +
      (floor >= 1 ? `${floor.toFixed(0)}%` : `${floor.toFixed(3)}%`) +
      ', and it holds for the rest of time. Survival never required zero. It required a derivative.'
  } else if (alive === 0) {
    verdict =
      'Nothing is left. At a fixed annual risk there is no value of p small enough to survive deep time, only values that take longer to lose.'
  } else {
    verdict = `At this risk the coin flip arrives at year ${fmtYears(Math.log(0.5) / Math.log(1 - p))}. Keep dragging.`
  }

  // the phase diagram
  const malice = rateFromSlider(maliceStep)
  const growth = rateFromSlider(growthStep)
  const errorBase = errorFromSlider(errorStep)
  const gap = gapFromSlider(gapStep)
  const settle = settleFromSlider(settleStep)
  const ceiling = ceilingFromSlider(ceilingStep)
  const conflict = conflictFromSlider(conflictStep)
  const ratio = malice / growth
  const params: Params = { malice, growth, errorBase, gap, ceiling, conflict }
  const outcome = evaluate(params)
  const tau = outcome.tau
  const transitionFirst = tau < settle
  const count = outcome.count
  // The thresholds are bisections over the whole model, so they are kept to
  // the dials that move them: d₁ ignores d, R* depends only on g and s_max.
  const gapLimit = useMemo(
    () => criticalGap({ malice, growth, errorBase, ceiling, conflict }),
    [malice, growth, errorBase, ceiling, conflict],
  )
  const rStar = useMemo(() => moralThreshold(growth, ceiling), [growth, ceiling])
  const flatError = useMemo(
    () => evaluate({ malice, growth, errorBase, gap: 0, ceiling, conflict }).errorLoad,
    [malice, growth, errorBase, ceiling, conflict],
  )
  const setting: Setting = { malice, growth, errorBase, gap, ceiling, conflict }
  const query = `pm=${asPercent(malice)}&g=${asPercent(growth)}&pe=${asPercent(errorBase)}&d=${Number((gap * 100).toFixed(3))}&sm=${Number(ceiling.toFixed(3))}&phi=${Number(conflict.toFixed(2))}&ts=${Number(settle.toPrecision(3))}`
  const rawLeft = ((Math.log10(ratio) - R_LO) / (R_HI - R_LO)) * 100
  const offChart = rawLeft < 0 || rawLeft > 100
  const errorLoad = outcome.errorLoad
  const moralPass = ratio < rStar
  // What is doing the killing: each hazard's share of the cumulative hazard
  // across the transition.
  const maliceLoad = outcome.maliceLoad
  const externalLoad = outcome.externalLoad
  const totalLoad = maliceLoad + errorLoad + externalLoad
  const shares = isFinite(totalLoad)
    ? { malice: maliceLoad / totalLoad, error: errorLoad / totalLoad, external: externalLoad / totalLoad }
    : { malice: 0, error: 1, external: 0 }
  const errorSmall = errorLoad < Math.LN2

  // Once the reader has moved a dial, the address bar carries the setting.
  useEffect(() => {
    if (!touched.current) return
    const { pathname, hash } = window.location
    window.history.replaceState(null, '', `${pathname}?${query}${hash}`)
  }, [query])

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    touched.current = true
    set(v)
  }

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?${query}#region`
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      },
      () => {},
    )
  }

  /** The diagram point under the pointer, as a ratio and a gap. */
  const pointAt = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
    const fy = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height))
    return {
      fx,
      fy,
      ratio: Math.pow(10, R_LO + fx * (R_HI - R_LO)),
      gap: GAP_MAX - fy * (GAP_MAX - GAP_MIN),
    }
  }

  const onPhaseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { fx, fy, ratio: r, gap: d } = pointAt(e)
    setHover({
      left: fx * 100,
      top: fy * 100,
      ratio: r,
      gap: d,
      n: countOf({ ...params, malice: r * growth, gap: d }),
    })
  }

  /** Clicking the diagram moves the marker there, holding g, p_e0, s_max and φ. */
  const onPhaseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { ratio: r, gap: d } = pointAt(e)
    touched.current = true
    apply({ malice: r * growth, gap: d })
  }

  useEffect(() => {
    const canvas = plateRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const w = PLATE_W
    const h = PLATE_H
    ctx.setTransform(plateScale, 0, 0, plateScale, 0, 0)
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < MARKS.length; i++) {
      const m = MARKS[i]
      const lit = i < alive
      ctx.beginPath()
      ctx.arc(m.x * (w - 24) + 12, m.y * (h - 24) + 12, lit ? m.r : m.r * 0.75, 0, Math.PI * 2)
      ctx.fillStyle = lit ? `rgba(20,24,21,${0.55 + m.r / 6})` : 'rgba(20,24,21,0.055)'
      ctx.fill()
    }
  }, [alive, plateScale])

  useEffect(() => {
    const canvas = phaseRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.setTransform(phaseScale, 0, 0, phaseScale, 0, 0)
    drawField(ctx, PHASE_W, PHASE_H, { errorBase, growth, ceiling, conflict }, phaseScale > 1.5 ? 3 : 4)
  }, [growth, errorBase, ceiling, conflict, phaseScale])

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href={backHref} className={styles.backLink}>
          {backLabel}
        </Link>
      </div>

      {/* ── hero ── */}
      <header className={`${styles.wrap} ${styles.hero}`}>
        <div className={styles.heroCol}>
          <p className={styles.eyebrow}>Arete / playground / working note</p>
          <h1>The Long Filter</h1>
          <p className={styles.lede}>
            A civilization that can end itself, and keeps a steady chance of doing so, eventually
            will. A small annual probability over a long enough run becomes a certainty, and on the
            course we are on that is the expected end. What follows is the one path the arithmetic
            leaves open, described as a conditional: if a civilization were to survive, this is what
            its survival would have to look like.
          </p>
          <p className={styles.byline}>
            {BYLINE} &nbsp;·&nbsp; working note &nbsp;·&nbsp; {REVISED}
          </p>
        </div>
        <div className={styles.plateFrame}>
          <canvas
            ref={plateRef}
            width={Math.round(PLATE_W * plateScale)}
            height={Math.round(PLATE_H * plateScale)}
            role="img"
            aria-label={`A field of one thousand marks representing civilizations. ${alive.toLocaleString('en-US')} still lit, ${(CIVILIZATIONS - alive).toLocaleString('en-US')} faded.`}
          />
        </div>
        <div className={styles.plateCap}>
          <span>Plate I &nbsp;/&nbsp; 1,000 civilizations</span>
          <span>exposure {fmtYears(years)} yr</span>
        </div>
      </header>

      {/* ── in brief ── */}
      <section className={`${styles.wrap} ${styles.brief}`} aria-labelledby="lf-brief">
        <h2 id="lf-brief" className={styles.briefTitle}>
          The argument in a minute
        </h2>
        <div className={styles.briefGrid}>
          <div>
            <h3>The claim</h3>
            <p>
              A constant annual risk of self-destruction, however small, compounds to near-certain
              extinction (section I). Nothing in our record shows that risk falling, so the default
              is not survival. This is the strongest claim on the page, and it needs the fewest
              assumptions.
            </p>
          </div>
          <div>
            <h3>If it were to be</h3>
            <p>
              The risk would have to fall, and keep falling. In this model that means competence
              outpacing capability, so that hazards are retired faster than new ones are built: by
              about 0.07% a year, through the transition and after it. If that held, the galaxy
              should hold survivors. Whether anyone manages it is the open question.
            </p>
          </div>
          <div>
            <h3>What it is not</h3>
            <p>
              Not a sales pitch for virtue. The payoff lies thousands of years out, and no motive
              aimed at the payoff survives that discount. The filter spares civilizations that
              stopped treating survival, wealth and winning as goods. It does not reward wanting to
              survive.
            </p>
          </div>
        </div>
        <p className={styles.briefGloss}>
          Two words come from Stoic philosophy. A <em>prokoptōn</em> (plural{' '}
          <em>prokoptontes</em>) is a moral progressor: someone not yet wise who is making progress
          toward it, and the population this model follows. The <em>phoenix rate</em> is
          Seneca&rsquo;s estimate of how often a sage, the finished article, appears unaided;
          section II uses it as a floor.
        </p>
        <p className={styles.briefLinks}>
          <a href="#region">Go to the diagram ↓</a>
          <Link href="/playground/the-long-filter/formalism">Read the derivations →</Link>
        </p>
      </section>

      {/* ── I. the arithmetic ── */}
      <section className={`${styles.section} ${styles.engine}`}>
        <div className={styles.wrap}>
          <div className={`${styles.secHead} ${styles.col}`}>
            <p className={styles.eyebrow}>I. The arithmetic</p>
            <h2>Odds do not forget</h2>
            <p>
              If a catastrophe carries a fixed annual probability <span className={styles.mono}>p</span>,
              and each year is an independent throw, survival across{' '}
              <span className={styles.mono}>n</span> years is{' '}
              <span className={styles.mono}>
                (1 − p)<sup>n</sup>
              </span>
              . The same equation governs radioactive decay, pointed at a species instead of an
              isotope. This is the default path, and nothing below softens it: every way out runs
              through a hazard that falls. Move the dials and watch the plate.
            </p>
          </div>

          <div className={styles.engineGrid}>
            <div>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-risk">
                    Annual risk of self-destruction
                  </label>
                  <span className={styles.ctrlVal}>1 in {fmtYears(1 / p)}</span>
                </div>
                <input
                  type="range"
                  id="lf-risk"
                  aria-describedby="lf-risk-note"
                  min={0}
                  max={70}
                  step={1}
                  value={riskStep}
                  onChange={(e) => setRiskStep(Number(e.target.value))}
                />
              </div>

              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-years">
                    Years exposed at this risk &nbsp;· an illustration
                  </label>
                  <span className={styles.ctrlVal}>{fmtYears(years)} yr</span>
                </div>
                <input
                  type="range"
                  id="lf-years"
                  aria-describedby="lf-years-note"
                  min={0}
                  max={90}
                  step={1}
                  value={yearsStep}
                  onChange={(e) => setYearsStep(Number(e.target.value))}
                />
              </div>

              <label className={styles.toggle} htmlFor="lf-decay">
                <input
                  type="checkbox"
                  id="lf-decay"
                  checked={decay}
                  onChange={(e) => setDecay(e.target.checked)}
                />
                <span>
                  Halve the risk every thousand years. This is the only escape the arithmetic
                  allows: not perfection, but a hazard rate that falls faster than the years
                  accumulate.
                </span>
              </label>
            </div>

            <div>
              <div className={styles.readout}>
                <span
                  className={`${styles.bigNum} ${survivingPct > 5 ? styles.living : styles.dying}`}
                >
                  {survivorText}
                </span>
                <span className={styles.readoutLabel}>still here</span>
              </div>
              <div className={styles.readout}>
                <span className={`${styles.bigNum} ${styles.dying}`}>
                  {(CIVILIZATIONS - alive).toLocaleString('en-US')}
                </span>
                <span className={styles.readoutLabel}>of 1,000 gone dark</span>
              </div>
              <div className={styles.readout}>
                <span className={styles.readoutLabel}>reading the dials</span>
                <p className={styles.note} id="lf-risk-note">
                  {riskNote(p)}
                </p>
                <p className={styles.note} id="lf-years-note">
                  {yearsNote(p, years, decay)}
                </p>
              </div>
              <div className={styles.readout}>
                <span className={styles.verdict} aria-live="polite">
                  {verdict}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── II. who is growing ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>II. Who is growing</p>
          <h2>Progressors, from a phoenix floor</h2>
          <p>
            The population that matters is not sages, who are rare by definition, but moral
            progressors: the people the Stoics called <em>prokoptontes</em>, making progress without
            having arrived. The model needs a starting share for them, a rate at which it grows, and
            a ceiling.
          </p>
        </div>
        <div className={styles.col}>
          <ol className={styles.deriv}>
            <li>
              <b>one sage / 500 years</b>
              Seneca writes in the forty-second letter that the good man appears perhaps once in five
              hundred years, like the phoenix. His frame is an empire of roughly fifty million with a
              life expectancy near twenty five, so about a billion lives across those five
              centuries.
            </li>
            <li>
              <b>s₀ = 10⁻⁹, a floor</b>
              One in a billion is the incidence of sages, and progressors are far more common than
              sages. The model starts the progressor share there anyway. That is conservative: any
              larger starting share shortens the transition and helps.
            </li>
            <li>
              <b>ds/dt = g s (1 − s/s<sub>max</sub>)</b>
              The share grows at rate <span className={styles.mono}>g</span> and levels off at a
              ceiling <span className={styles.mono}>s<sub>max</sub></span>, the share that ever
              moves. The ceiling is a dial below, from 0.90 to 1.00.
            </li>
            <li>
              <b>τ: the year s reaches 99% of s<sub>max</sub></b>
              This is where the page says the transition ends. At{' '}
              <span className={styles.mono}>g</span> = 0.6% a year and a ceiling of 0.99 it takes
              4,218 years. Put the line at the half or the 90% point instead and, wherever the gap is
              negative, the count moves by less than one part in a thousand.
            </li>
            <li>
              <b>protection arrives late</b>
              Logistic growth from one in a billion spends most of the transition near zero. At these
              settings progressors are still under 1% of people in year 2,688 of 4,218, and by then
              about four fifths of all the malice the transition will see has already been spent.
              Virtue&rsquo;s protection is real, but it arrives mostly at the end.
            </li>
          </ol>
          <p>
            <strong>Who counts as a progressor.</strong> The test has to be checkable, and it must
            not mention risk, or the argument would be circular. The Stoic criteria serve. A
            progressor treats externals (health, wealth, reputation, winning) as indifferent rather
            than as goods, so does not lie, cheat or fight for them; and acts from reason rather than
            from passion, so that what they do survives being examined. Neither criterion says
            anything about catastrophe, and both show in what a person does.
          </p>
          <p>
            <strong>The paradox.</strong> The Stoics also held that everyone who is not wise is
            equally far from virtue: someone an arm&rsquo;s length under the surface drowns as surely
            as someone five hundred fathoms down (Cicero, <em>De Finibus</em> 3.48). If that were the
            whole story, progress would count for nothing. But risk does not respond to virtue as a
            state. It responds to actions, and progressors perform the appropriate actions, the{' '}
            <em>kathēkonta</em>, more reliably than others. Appropriate actions are what keep a
            weapon unbuilt and a result honestly reported. So every individual&rsquo;s progress moves{' '}
            <span className={styles.mono}>s</span>, whether or not anyone arrives.
          </p>
        </div>
      </section>

      {/* ── III. three hazards, one gap ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>III. Three hazards, one gap</p>
          <h2>What can end you, and who governs it</h2>
          <p>
            Malice and error are driven by the same gap,{' '}
            <span className={styles.mono}>d = c − e</span>: how fast capability grows, less how fast
            the understanding of it grows. When capability runs ahead, each new power arrives before
            anyone knows how to hold it, and both the chance that someone uses it and the chance that
            it fails grow with the gap. No hazard switches off when the transition ends.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.hz}>
            <div>
              <span className={styles.sym}>
                p<sub>m</sub>
              </span>
              <h3>Malice</h3>
              <p>
                Destruction chosen for gain, status or rivalry:{' '}
                <span className={styles.mono}>
                  p<sub>m0</sub>(1 − s)e<sup>dt</sup>
                </span>
                . It falls as progressors spread, and with the gap. With a ceiling below one it never
                reaches zero by virtue alone.
              </p>
              <span className={styles.gov}>governed by g, s_max and d</span>
            </div>
            <div>
              <span className={styles.sym}>
                p<sub>e</sub>
              </span>
              <h3>Error</h3>
              <p>
                Accident, misjudgment, a flaw nobody caught:{' '}
                <span className={styles.mono}>
                  p<sub>e0</sub>[φ(1 − s) + 1 − φ]e<sup>dt</sup>
                </span>
                . The share φ comes from conflict (haste, secrecy, racing) and falls as progressors
                spread. The rest is accident that virtue does not prevent, and only the gap shrinks it.
              </p>
              <span className={styles.gov}>governed by d, and partly by g</span>
            </div>
            <div>
              <span className={styles.sym}>
                p<sub>x</sub>
              </span>
              <h3>External</h3>
              <p>
                Impact, burst, the slow arithmetic of a star. Irreducible, and virtue never touches
                it. Once everything else has been retired, it is what sets how long a survivor
                survives.
              </p>
              <span className={styles.gov}>governed by nobody</span>
            </div>
          </div>
          <p className={styles.hzNote}>
            Both reducible hazards carry the same factor{' '}
            <span className={styles.mono}>
              e<sup>dt</sup>
            </span>
            . That is the model&rsquo;s one structural bet: the danger in a capability lies mostly in
            the distance between having it and understanding it.
          </p>
          <p>
            <strong>Conflict error.</strong> Castle Bravo, in 1954, is the clearest case of the
            share φ. Its yield was calculated honestly, the calculation missed a reaction, and the
            device came in at 15 megatons instead of 6. The mistake was ordinary; the danger was
            not. A test of that size, at that pace, existed only because of the arms race, each
            side building before it understood for fear the other would. That is error that depends
            on conflict: honest in its making, and dangerous only because of the race around it.
          </p>
          <p>
            <strong>Breadth, not magnitude.</strong> Each new kind of capability opens failure
            channels the previous kinds did not have. Nuclear does not teach you the failure modes of
            engineered biology, and neither teaches you whatever comes next. That is why the gap is
            measured against capability in general, and why keeping it negative is a standing
            discipline rather than a one-off fix.
          </p>
          <p>
            What raises <span className={styles.mono}>e</span> is the machinery of error
            correction: open criticism, replication, audit, a press nobody owns. David Brin&rsquo;s
            phrase for it is that criticism is the only known antidote to error. Those institutions
            work only while the people inside them will not fake a result, bury an awkward finding or
            keep a secret for advantage. That is where progressors matter before they are a majority.
            They rise into government and business gradually, as anyone does, and change
            institutions from within: the auditor who will not sign, the engineer who will not ship
            what nobody understands. That is how a minority lowers risk long before it is a
            majority, and why the transition is a movement of the whole civilization, beginning with
            understanding and then choice, rather than a headcount.
          </p>
          <p>
            <strong>All three terms rest on one assumption: until the transition ends, a
            civilization is a single target.</strong> The arithmetic counts one throw a year, which
            holds only if one catastrophe ends everyone. The obvious objection is to spread out.
            Dispersal counts only for a settlement that could rebuild technological civilization on
            its own; an outpost that needs resupply dies with its supplier. Settlements within one
            solar system sit days or months apart, and protect against an impact and little else:
            weapons cross the distance, a pathogen can ride a supply ship, a flawed technology is
            built everywhere from the same designs, and each settlement brings its own malice and
            error. Settlements around other stars would decouple their fates. But the ordering runs
            the wrong way. The power to destroy yourself arrives long before the power to leave: we
            have had the first since about 1955, and have neither the second nor a self-sufficient
            settlement anywhere. So dispersal comes after the filter, not instead of it. The diagram
            below takes a date for interstellar settlement as a hypothesis, ten thousand years from
            now unless you move it. At 0.6 percent a year the transition takes about 4,200 years and
            finishes first; below about 0.25 percent a year it does not.
          </p>
          <p className={`${styles.footnote} ${styles.hzCaveat}`}>
            One more correction, and it is uncomfortable. The published catastrophe estimates
            everyone quotes are totals, and the documented near misses lean heavily toward false
            alarms and misjudgment rather than decisions to attack. So most of that number belongs in
            the error term, not the malice one, and the realistic baseline error rate is not the tidy
            10⁻⁵ this page originally assumed.
          </p>
        </div>
      </section>

      {/* ── IV. the region ── */}
      <div className={styles.phaseBlock} id="region">
        <div className={styles.wrap}>
          <div className={`${styles.secHead} ${styles.col}`}>
            <p className={styles.eyebrow}>IV. The region</p>
            <h2>Where the line actually sits</h2>
            <p>
              The horizontal axis is the moral ratio, malice risk over improvement rate. The vertical
              is the gap <span className={styles.mono}>d</span>, how far capability runs ahead of
              understanding. Blue is where at least one civilization should be alive past the end of
              its transition, which this page puts at the year the progressor share reaches 99% of
              its ceiling. Everything else is empty sky. The page opens on the realistic split: a 30
              percent malice share of a 1 percent total, the rest in error. Hover the diagram to read
              any point, or click to move there.
            </p>
          </div>

          <div className={styles.colWider}>
            <div className={styles.presets} role="group" aria-label="Load a parameter set">
              {PRESETS.map((pr) => {
                const active = onPreset(pr, setting)
                return (
                  <button
                    key={pr.key}
                    type="button"
                    className={`${styles.preset} ${active ? styles.presetOn : ''}`}
                    aria-pressed={active}
                    onClick={() => {
                      touched.current = true
                      apply(fromPreset(pr))
                    }}
                  >
                    <span className={styles.presetLabel}>{pr.label}</span>
                    <span className={styles.presetNote}>{pr.note}</span>
                  </button>
                )
              })}
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-malice">
                    p<sub>m0</sub> &nbsp;· annual malice risk
                  </label>
                  <span className={styles.ctrlVal}>{pct(malice, malice < 0.001 ? 3 : 2)}</span>
                </div>
                <input
                  type="range"
                  id="lf-malice"
                  aria-describedby="lf-malice-note"
                  min={0}
                  max={100}
                  step={0.5}
                  value={maliceStep}
                  onChange={(e) => touch(setMaliceStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-malice-note">
                {maliceNote(malice, rStar, growth)}
              </p>
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-growth">
                    g &nbsp;· moral improvement rate
                  </label>
                  <span className={styles.ctrlVal}>{pct(growth, growth < 0.001 ? 3 : 2)}</span>
                </div>
                <input
                  type="range"
                  id="lf-growth"
                  aria-describedby="lf-growth-note"
                  min={0}
                  max={100}
                  step={0.5}
                  value={growthStep}
                  onChange={(e) => touch(setGrowthStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-growth-note">
                {growthNote(growth, ceiling)}
              </p>
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-error">
                    p<sub>e0</sub> &nbsp;· baseline error rate
                  </label>
                  <span className={styles.ctrlVal}>{pct(errorBase, errorBase < 0.001 ? 3 : 2)}</span>
                </div>
                <input
                  type="range"
                  id="lf-error"
                  aria-describedby="lf-error-note"
                  min={0}
                  max={100}
                  step={0.5}
                  value={errorStep}
                  onChange={(e) => touch(setErrorStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-error-note">
                {errorNote(errorBase, flatError)}
              </p>
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-gap">
                    d &nbsp;· capability minus competence
                  </label>
                  <span className={styles.ctrlVal}>{signedPct(gap)}</span>
                </div>
                <input
                  type="range"
                  id="lf-gap"
                  aria-describedby="lf-gap-note"
                  min={0}
                  max={100}
                  step={0.5}
                  value={gapStep}
                  onChange={(e) => touch(setGapStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-gap-note">
                {gapNote(gap, errorBase)}
              </p>
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-ceiling">
                    s<sub>max</sub> &nbsp;· ceiling on the progressor share
                  </label>
                  <span className={styles.ctrlVal}>{ceiling.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  id="lf-ceiling"
                  aria-describedby="lf-ceiling-note"
                  min={0}
                  max={100}
                  step={0.5}
                  value={ceilingStep}
                  onChange={(e) => touch(setCeilingStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-ceiling-note">
                {ceilingNote(ceiling, malice, errorBase, conflict)}
              </p>
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-conflict">
                    φ &nbsp;· share of error that depends on conflict
                  </label>
                  <span className={styles.ctrlVal}>{Math.round(conflict * 100)}%</span>
                </div>
                <input
                  type="range"
                  id="lf-conflict"
                  aria-describedby="lf-conflict-note"
                  min={0}
                  max={100}
                  step={1}
                  value={conflictStep}
                  onChange={(e) => touch(setConflictStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-conflict-note">
                {conflictNote(conflict, errorBase)}
              </p>
            </div>

            <div className={styles.ctrlRow}>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-settle">
                    T<sub>s</sub> &nbsp;· interstellar settlement, a hypothesis
                  </label>
                  <span className={styles.ctrlVal}>{fmtYears(settle)} yr</span>
                </div>
                <input
                  type="range"
                  id="lf-settle"
                  aria-describedby="lf-settle-note"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settleStep}
                  onChange={(e) => touch(setSettleStep)(Number(e.target.value))}
                />
              </div>
              <p className={styles.ctrlNote} id="lf-settle-note">
                {settleNote(settle, growth, ceiling)}
              </p>
            </div>

            <div className={styles.phaseWrap}>
              <div>
                <div className={styles.chart}>
                  <div className={styles.yax}>
                    {Y_TICKS.map((t) => (
                      <span key={t}>{axisPct(t)}</span>
                    ))}
                  </div>
                  <div
                    className={styles.canvasHolder}
                    onMouseMove={onPhaseMove}
                    onMouseLeave={() => setHover(null)}
                    onClick={onPhaseClick}
                  >
                    <canvas
                      ref={phaseRef}
                      width={Math.round(PHASE_W * phaseScale)}
                      height={Math.round(PHASE_H * phaseScale)}
                      role="img"
                      aria-label="Phase diagram of survivable parameter combinations, moral ratio across and capability gap up."
                    />
                    <div className={styles.threshold} style={{ left: `${thresholdLeft(rStar).toFixed(3)}%` }}>
                      <span>R*</span>
                    </div>
                    <div
                      className={`${styles.marker} ${offChart ? styles.markerOff : ''}`}
                      title={offChart ? `R = ${ratio.toFixed(3)} is off the chart` : undefined}
                      style={{
                        left: `${Math.min(100, Math.max(0, rawLeft)).toFixed(3)}%`,
                        top: `${Math.min(100, Math.max(0, ((GAP_MAX - gap) / (GAP_MAX - GAP_MIN)) * 100)).toFixed(3)}%`,
                      }}
                    />
                    {hover && (
                      <div
                        className={`${styles.tip} ${hover.left > 60 ? styles.tipLeft : ''} ${hover.top > 75 ? styles.tipUp : ''}`}
                        style={{ left: `${hover.left}%`, top: `${hover.top}%` }}
                        aria-hidden="true"
                      >
                        R {hover.ratio < 0.1 ? hover.ratio.toFixed(3) : hover.ratio.toFixed(2)}{' '}
                        · d {signedPct(hover.gap)}
                        <br />
                        <b className={hover.n >= 1 ? styles.tipLive : styles.tipDead}>
                          <Tiny n={hover.n} />
                        </b>{' '}
                        civilizations
                      </div>
                    )}
                  </div>
                  <div />
                  <div className={styles.xax}>
                    {X_TICKS.map((t) => (
                      <span key={t}>{ratioTick(t)}</span>
                    ))}
                  </div>
                </div>
                <p className={styles.axname}>
                  horizontal: R = p<sub>m0</sub> / g &nbsp;&nbsp;·&nbsp;&nbsp; vertical: d = c − e
                  {offChart && (
                    <>
                      <br />
                      the marker is pinned: R = {ratio.toFixed(3)} is off the chart
                    </>
                  )}
                </p>
              </div>

              <div>
                <span
                  className={styles.verdictNum}
                  style={{ color: count >= 1 ? '#8FB0E8' : '#E0A183' }}
                >
                  <Tiny n={count} />
                </span>
                <span className={styles.verdictLabel}>
                  civilizations past their transition, expected in the galaxy
                </span>
                <div className={styles.gates}>
                  <div className={styles.gate}>
                    <span>moral term &nbsp; R</span>
                    <span className={moralPass ? styles.pass : styles.fail}>
                      {ratio.toFixed(2)} &nbsp;
                      {moralPass ? `clears ${rStar.toFixed(2)}` : `over ${rStar.toFixed(2)}`}
                    </span>
                  </div>
                  <div className={styles.gate}>
                    <span>
                      error integral &nbsp; I<sub>e</sub>
                    </span>
                    <span className={errorSmall ? styles.pass : styles.fail}>
                      {isFinite(errorLoad) ? errorLoad.toFixed(2) : '∞'} &nbsp;
                      {errorSmall ? 'small' : 'costly'}
                    </span>
                  </div>
                  <div className={styles.gate}>
                    <span>
                      count reaches one at &nbsp; d<sub>1</sub>
                    </span>
                    <span className={styles.neutral}>
                      {gapLimit === null
                        ? 'none'
                        : gapLimit === Infinity
                          ? 'any d'
                          : signedPct(gapLimit)}
                    </span>
                  </div>
                  <div className={styles.gate}>
                    <span>
                      τ<sub>v</sub>
                    </span>
                    <span className={styles.neutral}>
                      {Math.round(tau).toLocaleString('en-US')} yr
                    </span>
                  </div>
                  <div className={styles.gate}>
                    <span>
                      settlement &nbsp; T<sub>s</sub>
                    </span>
                    <span className={transitionFirst ? styles.pass : styles.fail}>
                      {fmtYears(settle)} yr &nbsp; {transitionFirst ? 'after' : 'before'} τ<sub>v</sub>
                    </span>
                  </div>
                  <div className={styles.gate}>
                    <span>
                      g where τ<sub>v</sub> = T<sub>s</sub>
                    </span>
                    <span className={styles.neutral}>{pct(settleCrossing(settle, ceiling), 2)}</span>
                  </div>
                </div>
                <div className={styles.load}>
                  <span className={styles.loadLabel}>what is doing the killing</span>
                  <div className={styles.loadBar} aria-hidden="true">
                    <span className={styles.loadMalice} style={{ width: `${(shares.malice * 100).toFixed(3)}%` }} />
                    <span className={styles.loadError} style={{ width: `${(shares.error * 100).toFixed(3)}%` }} />
                    <span className={styles.loadExternal} style={{ width: `${(shares.external * 100).toFixed(3)}%` }} />
                  </div>
                  <p className={styles.loadKey}>
                    malice {Math.round(shares.malice * 100)}% &nbsp;·&nbsp; error{' '}
                    {Math.round(shares.error * 100)}% &nbsp;·&nbsp; external{' '}
                    {shares.external < 0.005 ? '<1' : Math.round(shares.external * 100)}%
                  </p>
                </div>
                <p className={styles.phaseVerdict} aria-live="polite">
                  {phaseVerdict(count, gap, gapLimit === Infinity ? null : gapLimit)}
                </p>
                <button type="button" className={styles.copyLink} onClick={copyLink}>
                  {copied ? 'Link copied' : 'Copy a link to this setting'}
                </button>
              </div>
            </div>

            <p className={styles.phaseNote}>
              <strong>
                If competence can outpace capability by about{' '}
                {gapLimit === null || !isFinite(gapLimit) ? '0.07%' : pct(-gapLimit, 2)} a year for
                the length of the transition, and keep that lead afterwards, the galaxy should hold
                survivors.
              </strong>{' '}
              That is the whole positive result, and it is a conditional. At the realistic setting
              the count climbs fast below the line, to about 59 civilizations at −0.10% and 6,770 at
              −0.20%. Above it the count collapses: holding the gap at zero leaves less than 10⁻¹⁵,
              because the error that virtue does not touch never falls.
            </p>
            <p className={styles.phaseBody}>
              <strong>The gap is the open question.</strong> Nobody has measured it. The one proxy
              with any history is near misses per unit of destructive capacity in the nuclear era.
              Taken crudely: the Chatham House catalogue lists thirteen cases of near nuclear use
              between 1962 and 2002, about one every three years, across arsenals that peaked near
              70,000 warheads in 1986 and then fell by more than half. Thirteen events cannot resolve
              a trend in their rate much finer than a couple of percent a year over forty years, so
              the proxy rules out a large gap in either direction and cannot tell −0.07% from zero. It
              is one technology, the catalogue is not a census, and a warhead count is a poor measure
              of capability. Read it as a first, crude estimate of how the question could be
              measured, not as an answer.
            </p>
            <p className={`${styles.footnote} ${styles.phaseCaveat}`}>
              The dashed line R* is where malice alone, with the gap held at zero, would bring the
              count to one. It is no longer a wall: malice carries the same factor{' '}
              <span className={styles.mono}>
                e<sup>dt</sup>
              </span>{' '}
              as error, so a lead in competence shrinks it too, and the blue region runs well past the
              line. What R* still marks is how far a civilization is leaning on competence rather than
              character. Moving <span className={styles.mono}>g</span>,{' '}
              <span className={styles.mono}>
                p<sub>e0</sub>
              </span>
              , s<sub>max</sub> or φ redraws the region itself; d<sub>1</sub> is where the count
              reaches one.
            </p>
          </div>
        </div>
      </div>

      {/* ── V. after the transition ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>V. After the transition</p>
          <h2>Retire the hazard</h2>
          <p>
            No hazard switches off when the transition ends; the model runs every term for all time.
            What survivors do differently is keep the gap negative: they keep retiring hazards, and
            they never build capability ahead of the understanding of it. With{' '}
            <span className={styles.mono}>d</span> below zero every reducible term shrinks year on
            year, and the risk that remains adds up to a finite total instead of growing without
            limit.{' '}
            <strong>
              A hazard you keep shrinking cannot eventually catch you; only one you leave standing
              can.
            </strong>
          </p>
        </div>
        <div className={styles.col}>
          <p>
            The examples are already on the record, in small. The world&rsquo;s nuclear arsenals
            fell from about 70,000 warheads in 1986 to about 12,000 now: hazards decommissioned, not
            merely deterred. Declining to race for superintelligence would be the same move made in
            advance, not building the capability until it is understood. Races are what force
            capability ahead of understanding, because each side builds before it understands for
            fear the other will. Virtue is what makes caution affordable: a civilization that does
            not treat winning as a good has no race to lose.
          </p>
          <p>
            <strong>The residue.</strong> A ceiling below one means some people never choose
            virtue, and the model leaves their share of malice standing for good. A civilization
            does not need everyone. It needs enough that the rest never get access to
            civilization-ending power, and that access is denied by retiring hazards, not by
            policing people. A weapon that no longer exists cannot be stolen, and a capability nobody
            built cannot be misused.
          </p>
          <p>
            <strong>Why not control instead.</strong> The obvious alternative is coercion: a
            surveillance state of the kind Nick Bostrom has described, watching everyone so that no
            one can use what exists. It concentrates malice in the controllers; it does not remove
            it. A hazard left standing, however small, ends in certain extinction (section I), so
            coercion survives only if the controllers are reliably good. That is virtue again, now
            asked of the few people with the most power to abuse.
          </p>
        </div>
      </section>

      {/* ── VI. why people say no ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VI. Why people say no</p>
          <h2>Two causes, and a culture</h2>
          <p>
            If virtue is what the filter spares, why is it rare? Chrysippus gave two causes for the
            distortion of reason: the persuasiveness of external things, and the teaching of those
            around us (Diogenes Laertius 7.89). Nature gives starting points that are uncorrupted;
            what corrupts them is what we see prized, and what we are taught to prize.
          </p>
        </div>
        <div className={styles.col}>
          <p>
            That has a consequence for the model. Culture sets{' '}
            <span className={styles.mono}>g</span>, how fast people move toward virtue, and{' '}
            <span className={styles.mono}>
              s<sub>max</sub>
            </span>
            , how many never do. So the ceiling is not human nature; it is the current teaching. The
            target is the values, treating externals as goods, not markets as such. A market that
            allocates bushels is a coordination tool. What does the damage is a culture that treats
            the bushels, and the winning, as what a life is for.
          </p>
          <p>
            The record is mixed in an instructive way. Homicide in Europe fell for centuries, about
            0.6 percent a year over six hundred years (Eisner), which is where this page&rsquo;s
            default <span className={styles.mono}>g</span> comes from. The decline of war between
            states is contested: Cirillo and Taleb argue that the data cannot tell a falling rate
            from a long quiet stretch under a heavy-tailed, constant risk. The recent wars fit the
            model. A quiet stretch under constant risk is a lull, not a falling hazard, and the
            arithmetic of section I treats it as one.
          </p>
        </div>
      </section>

      {/* ── VII. the equation ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VII. The equation</p>
          <h2>Drake, counted past the transition</h2>
          <p>
            Drake averages the lifetime of a civilization into one term. That hides the problem,
            because almost every civilization dies young and a few, if any, live for epochs. So the
            count here is only those still alive past the end of their transition. The whole expected
            lifetime would not do: at a 1 percent annual hazard the ones that die young contribute
            about one civilization&rsquo;s worth on their own, whatever happens later, and drown the
            signal.
          </p>
        </div>

        <div className={styles.col}>
          <div className={styles.formula}>
            <div className={styles.line}>
              N = Ṅ ∫<sub>τ</sub>
              <sup>∞</sup> S(t) dt &nbsp;&nbsp; S(t) = exp(−∫<sub>0</sub>
              <sup>t</sup> h)
            </div>
            <div className={styles.line}>
              h = [p<sub>m0</sub>(1 − s) + p<sub>e0</sub>(φ(1 − s) + 1 − φ)] e<sup>dt</sup> + p
              <sub>x</sub>
            </div>
            <div className={`${styles.line} ${styles.sub}`}>
              ds/dt = g s (1 − s/s<sub>max</sub>) &nbsp;&nbsp; s(0) = 10⁻⁹ &nbsp;&nbsp; s(τ) =
              0.99 s<sub>max</sub>
            </div>
          </div>

          <dl className={styles.terms}>
            <dt>Ṅ</dt>
            <dd>Technological civilizations arising per year. Absorbs the first five Drake terms.</dd>
            <dt>s</dt>
            <dd>
              The progressor share, from the phoenix floor toward its ceiling s<sub>max</sub>.
            </dd>
            <dt>d</dt>
            <dd>
              Capability minus competence. Drives malice and error alike, and keeps its value after
              the transition.
            </dd>
            <dt>φ</dt>
            <dd>The share of error that depends on conflict, and so falls as progressors spread.</dd>
            <dt>τ</dt>
            <dd>The end of the transition: the year the share reaches 99% of its ceiling.</dd>
          </dl>

          <p className={styles.afterTerms}>
            There is no closed form now. The page integrates S numerically: exactly before the
            transition, on a grid across it, and with exponential integrals after it, as the
            derivations set out. The thresholds come from bisection. R*, malice alone with no gap,
            is about 0.30 at the default rates and moves with g and s<sub>max</sub>. d<sub>1</sub>{' '}
            barely moves with s<sub>max</sub> or φ, but it depends on the baseline error rate, which
            nobody has measured. That is the softest number in the model, and the slider above
            exposes it rather than hiding it. Detectability is not in the count; the silence is a
            separate question.
          </p>
        </div>
      </section>

      {/* ── VIII. the silence ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VIII. The silence</p>
          <h2>Two answers, and the conditions pick</h2>
          <p>
            The parameters select between two resolutions of the paradox, and they need different
            explanations of the silence. The empty galaxy needs only one hazard left standing. The
            crowded one needs the gap kept negative through the transition and after it. On the
            default path it is the first.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.fork}>
            <div className={styles.forkRight}>
              <span className={styles.k}>on the default path: the count collapses</span>
              <h3>The galaxy is empty</h3>
              <p>
                Somewhere a hazard is left standing, and the arithmetic does the rest. There is no
                paradox left to solve and nothing to explain. The sky is quiet because there is nobody
                in it, and we are early rather than overlooked.
              </p>
            </div>
            <div className={styles.forkLeft}>
              <span className={styles.k}>only if the gap stays negative</span>
              <h3>The galaxy is crowded and quiet</h3>
              <p>
                Survivors who keep retiring hazards live for epochs, so even a filter that stops 99.99
                percent of civilizations leaves about a hundred alive. The silence then cannot be
                explained by the filter at all. It rests entirely on detectability, and the reason
                would have to be restraint.
              </p>
            </div>
          </div>
          <p>
            <strong>The cosmopolitan objection.</strong> The Stoics were cosmopolitans: the wise
            person is a citizen of the world and owes help to everyone in it. So why would sages not
            teach? The answer lies in what would be taught. Virtue has to be chosen. Epictetus has
            Zeus admit that not even he can overpower a person&rsquo;s moral choice (
            <em>Discourses</em> 1.1.23). Instruction from a civilization vastly older and stronger
            would not land as an offer the hearer could freely assess. It would land as authority,
            and virtue taken on authority is obedience. The help that would be most wanted is the
            help that cannot be given.
          </p>
          <p>
            <strong>A premise, named.</strong> This rests on something from Stoic physics: reason (
            <em>logos</em>) is the same everywhere, so the rational survivors of any species reach the
            same conclusions in different words, this one about restraint included. It also rests on
            a Stoic account of us: humans are born with starting points toward virtue (
            <em>aphormai</em>), not with the virtues themselves, so there is something left to
            choose. Accept both and the silence follows. Reject them and the crowded branch needs
            another reason, or fails.
          </p>
          <p className={styles.footnote}>
            The restraint branch is a zoo hypothesis, and it inherits the zoo hypothesis&rsquo;s
            standing problem, which Brin pressed in his 1983 survey of the silence: it needs every
            survivor to choose silence, and one defector ruins it. The premise above is the reply,
            and it is partial. The value premise is shared and the empirical prediction is not, so
            some survivors may have got it wrong, and one who got it wrong is enough. That is one more
            reason to read the empty branch as the default.
          </p>
        </div>
      </section>

      {/* ── IX. the survivors ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>IX. The survivors</p>
          <h2>What is left when nobody wants</h2>
          <p>
            This is the speculative part, and nothing above depends on it. Much of the description is
            subtraction: a good deal of what institutions do is manage vice, and that work shrinks.
            It is a ledger of tendencies, not abolitions. Progressors still err, so the institutions
            that catch error grow rather than shrink.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.ledger}>
            <div className={styles.ledgerHead}>Shrinks</div>
            <div className={`${styles.ledgerHead} ${styles.right}`}>What grows in its place</div>

            {LEDGER.map((row) => (
              <div key={row.gone.title} className={styles.ledgerRow}>
                <div className={styles.gone}>
                  <b>{row.gone.title}</b>
                  {row.gone.body}
                </div>
                <div className={styles.stays}>
                  <b>{row.stays.title}</b>
                  {row.stays.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── X. objections and replies ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>X. Objections and replies</p>
          <h2>Five ways this could be wrong</h2>
          <p>
            Each objection is stated as strongly as it can be, then answered. Where the answer
            concedes something, it says so.
          </p>
        </div>
        <div className={styles.col}>
          <h3 className={styles.objection}>1. Marcus chose Commodus</h3>
          <p>
            <strong>Objection.</strong> The most philosophical emperor Rome had handed the empire to
            his son, who was among its worst. If a Stoic at the summit of power could not secure a
            good succession, the hope that virtue can steer a civilization is naive.
          </p>
          <p>
            <strong>Reply.</strong> One virtuous ruler was never the claim. Marcus was made over
            decades: Antoninus Pius adopted him and shaped him through more than twenty years at his
            side. Marcus spent much of Commodus&rsquo;s youth on campaign on the Danube, and the son
            was formed by the court instead. A ruler over a population that does not share his
            values cannot make anything last, which is the Stoic point against Plato&rsquo;s
            philosopher king. The filter is passed by a civilization, not by a leader.
          </p>

          <h3 className={styles.objection}>2. You cannot retire knowledge</h3>
          <p>
            <strong>Objection.</strong> Warheads can be dismantled, but knowledge cannot. As biology
            gets cheaper, the means to end a civilization will sit within reach of small groups and
            eventually of individuals. No gap, however negative, retires what anyone can look up.
          </p>
          <p>
            <strong>Reply.</strong> Risk never reaches zero, and the model never says it does. But a
            civilization that is not spending itself on rivalry puts its resources into detection
            and defence, and that is what keeps <span className={styles.mono}>d</span> negative even
            when knowledge cannot be withdrawn. Malice also rarely needs only one malicious person.
            It usually needs the silence of bystanders. The US Secret Service and Department of
            Education studied 37 attacks on schools and found that before most of them, other people
            knew of the attacker&rsquo;s idea or plan; a later companion study looked at those
            bystanders and what they did with what they knew. Courage among the many lowers the
            risk. As a possible extension, not built into
            the model here, this would make malice fall faster than the non-progressor share,
            perhaps with its square, since an attack would need both a malicious person and silent
            people around them.
          </p>

          <h3 className={styles.objection}>3. Caution has its own risk</h3>
          <p>
            <strong>Objection.</strong> A civilization that refuses to build what it does not
            understand will be defenceless against the external term. The asteroid does not wait for
            a careful species to finish deliberating.
          </p>
          <p>
            <strong>Reply.</strong> The asteroid does not care how wise you are. But a wise
            civilization aims everything it has at the asteroid. Ours aims most of what it has at
            each other. Caution means not building what you do not understand, not building less.
          </p>

          <h3 className={styles.objection}>4. Indifference to death breeds carelessness</h3>
          <p>
            <strong>Objection.</strong> The Stoics call life and death indifferent. A civilization
            that does not care whether it survives is the last one to trust with survival.
          </p>
          <p>
            <strong>Reply.</strong> Indifferent never meant careless. Life is a preferred
            indifferent: not a good in itself, but what reason selects when nothing better is at
            stake. And each person is part of a larger whole. &ldquo;What is not good for the hive
            is not good for the bee&rdquo; (Marcus Aurelius, <em>Meditations</em> 6.54). The Stoic
            conditions for a reasonable exit from life lead with service to country and friends
            (Diogenes Laertius 7.130). They are about serving others, not indifference to them.
          </p>

          <h3 className={styles.objection}>5. Agreement is a single point of failure</h3>
          <p>
            <strong>Objection.</strong> A civilization of people who reason alike, without rivals to
            check them, loses the friction that catches mistakes. Competition is ugly, but it is
            redundancy.
          </p>
          <p>
            <strong>Reply.</strong> Dissent is welcome. Rivalry is something else: it values an
            indifferent, winning, and brings cheating and scheming with it. But the real risk should
            be conceded, and there are examples. The Stoics themselves reasoned honestly into a
            physics that was wrong. Chlorofluorocarbons were chosen because everyone agreed they
            were inert, and that inertness is what carried them into the stratosphere to destroy
            ozone, which was caught by two dissenters, Molina and Rowland, in 1974. Nobody was
            racing anybody; the agreement itself was the hazard. So a progressor civilization has to
            cultivate dissent on purpose, through sceptics and red teams, rather than relying on rivals to provide it.
            The argument about the silence shares this risk: rational beings who converge can
            converge on the same mistake.
          </p>
        </div>
      </section>

      {/* ── XI. the close ── */}
      <section className={`${styles.section} ${styles.close}`}>
        <div className={`${styles.wrap} ${styles.col}`}>
          <p className={styles.eyebrow}>XI.</p>
          <h2>The invitation that cannot be sent</h2>
          <p>
            Fermi asked it over lunch. The galaxy is old and large and ought to be crowded. Where is
            everybody?
          </p>
          <p>
            On one branch the answer is that they are there, in numbers, and holding back. Virtue
            arrived at any way but freely is only architecture, so a civilization that has watched
            this many times would be destroying the one thing that would have made us worth meeting.{' '}
            <em>
              It is not that we are not invited. It is that the invitation cannot be sent without
              voiding what it invites us to.
            </em>
          </p>
          <p>
            On the other branch there is no invitation, no watchers, and nothing withheld. Only a
            very large room, and a species eighty years into holding a match, under a risk that has
            not yet been shown to fall.
          </p>
          <p>
            The default path leads to the second. This page is an illumination of that path, not a
            sales pitch for virtue: virtue chosen for what it pays would not survive a discount
            thousands of years long, and the filter is not fooled by wanting to survive. What it
            spares is a civilization that has stopped treating survival, wealth and winning as goods,
            and that begins, as any such movement does, with understanding and then choice. Teaching
            raises <span className={styles.mono}>g</span>, so an essay like this one is a small part
            of the mechanism it describes. Which branch we are on is not written anywhere. It is a
            handful of rates, and every one of them is ours.
          </p>
          <p className={`${styles.footnote} ${styles.closeNote}`}>
            One hypothesis among several, and the boring ones remain live. Life may be rare,
            intelligence rarer, and the distances may simply be doing what distances do. Seneca was
            making a point about rarity, not conducting a census, so s₀ is an order of magnitude at
            best, which is why the page uses it only as a floor. The ceiling on progressors moves the
            moral threshold a great deal, from about 0.21 at 0.90 to 0.67 at 1.00, and the
            competence threshold hardly at all.
          </p>
        </div>
      </section>
      <footer className={`${styles.wrap} ${styles.colophon}`}>
        <div className={styles.sources}>
          <h2 className={styles.sourcesTitle}>Sources</h2>
          <ol>
            {REFERENCES.map((r) => (
              <li key={r.cite}>
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noopener noreferrer">
                    {r.cite}
                  </a>
                ) : (
                  r.cite
                )}
              </li>
            ))}
          </ol>
        </div>
        <p className={`${styles.footnote} ${styles.colophonLink}`}>
          <Link href="/playground/the-long-filter/formalism">
            The derivations, the parameter sources, and the thirteen ways this could be wrong
          </Link>
        </p>
        <p className={`${styles.footnote} ${styles.mono} ${styles.colophonLine}`}>
          Arete &nbsp;·&nbsp; working note &nbsp;·&nbsp; subject to revision
        </p>
      </footer>
    </main>
  )
}
