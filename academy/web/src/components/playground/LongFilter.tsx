'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ARISING_PER_YEAR,
  CIVILIZATIONS,
  ERROR_HAZARD_BASE,
  EXTERNAL_HAZARD,
  GAP_MAX,
  GAP_MIN,
  HALVING_YEARS,
  LEDGER,
  LOG_DISTANCE,
  MORAL_THRESHOLD,
  RATIO_MAX,
  RATIO_MIN,
  SCATTER_SEED,
} from '@/content/playground/long-filter'
import styles from './LongFilter.module.css'

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

// ── the three-hazard model ───────────────────────────────────────────────────

/**
 * The error integral across a transition of `tau` years.
 *
 * Error hazard starts at p_e0 and compounds at the capability gap d, so the
 * accumulated exponent is p_e0·(e^(dτ) − 1)/d. At d = 0 that is the removable
 * singularity p_e0·τ; far above it the exponent overflows and nothing survives.
 */
function errorIntegral(gap: number, tau: number): number {
  if (Math.abs(gap) < 1e-12) return ERROR_HAZARD_BASE * tau
  const x = gap * tau
  if (x > 700) return Infinity
  return (ERROR_HAZARD_BASE * (Math.exp(x) - 1)) / gap
}

/**
 * Transitioned civilizations expected alive right now.
 *
 * Malice contributes p_m0·(1 − 1/K)·τ, which is exactly (e·s₀)^R once τ = K/g
 * is substituted — so that term keeps its closed form. Error and the external
 * hazard are added in the exponent, and the survivors live 1/p_x years each.
 */
function survivorCount(malice: number, growth: number, gap: number): number {
  const tau = LOG_DISTANCE / growth
  const exponent =
    malice * (1 - 1 / LOG_DISTANCE) * tau + errorIntegral(gap, tau) + EXTERNAL_HAZARD * tau
  if (!isFinite(exponent)) return 0
  return (ARISING_PER_YEAR * Math.exp(-exponent)) / EXTERNAL_HAZARD
}

/** The widest capability gap a transition of `tau` years survives — bisected. */
function criticalGap(tau: number): number {
  let lo = -0.02
  let hi = 0.05
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (errorIntegral(mid, tau) < Math.LN2) lo = mid
    else hi = mid
  }
  return lo
}

/** Both gauge sliders read the same scale: 0.01% to 3.16% a year. */
const rateFromSlider = (v: number) => Math.pow(10, -4 + (v / 100) * 2.5)

/** The capability-gap slider spans the diagram's vertical axis. */
const gapFromSlider = (v: number) => GAP_MIN + (v / 100) * (GAP_MAX - GAP_MIN)

const pct = (v: number, places: number) => `${(v * 100).toFixed(places)}%`
const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(3)}%`
/** Axis ticks are typeset rather than read out: coarser, with a real minus. */
const axisPct = (v: number) =>
  `${v >= 0 ? '+' : '\u2212'}${Math.abs(v * 100).toFixed(2)}%`

// ── the plate ────────────────────────────────────────────────────────────────

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
const CELL = 4

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
 * Redrawn only when g changes: moving g deforms the region itself, since a
 * slower transition means more years exposed to compounding capability, while
 * p_m0 and d only move the marker within it. The near-unity contour is painted
 * pale so the boundary reads as a line rather than a colour change.
 */
function drawField(ctx: CanvasRenderingContext2D, w: number, h: number, growth: number) {
  for (let x = 0; x < w; x += CELL) {
    const ratio = Math.pow(10, R_LO + ((x + CELL / 2) / w) * (R_HI - R_LO))
    const malice = ratio * growth
    for (let y = 0; y < h; y += CELL) {
      const gap = GAP_MAX - ((y + CELL / 2) / h) * (GAP_MAX - GAP_MIN)
      const n = survivorCount(malice, growth, gap)
      const lg = Math.log10(Math.max(n, 1e-300))
      ctx.fillStyle = Math.abs(lg) < 0.12 ? '#E6EAF2' : shade(n)
      ctx.fillRect(x, y, CELL, CELL)
    }
  }
}

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

function phaseVerdict(moralPass: boolean, gapPass: boolean, n: number): string {
  if (!moralPass && !gapPass)
    return 'Both conditions missed. Improvement is too slow to outrun the malice, and competence is falling behind capability at the same time. Nothing clears the filter.'
  if (!moralPass)
    return 'The moral condition fails. Competence is keeping pace, but the transition takes longer than the dice allow, and the count collapses regardless.'
  if (!gapPass)
    return 'The moral condition passes and the competence condition does not. Virtue is outrunning malice, and error is compounding faster than either. This is the failure mode the single-hazard model could not see.'
  if (n >= 1000)
    return 'Both cleared, comfortably. The galaxy holds thousands of transitioned civilizations, which means the filter cannot be what makes the sky quiet. Something else is.'
  return 'Both cleared, narrowly. A handful exist, scattered across a hundred thousand light years and under no obligation to announce it.'
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
  const [maliceStep, setMaliceStep] = useState(80)
  const [growthStep, setGrowthStep] = useState(71)
  const [gapStep, setGapStep] = useState(50)
  const plateRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<HTMLCanvasElement>(null)

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
  const gap = gapFromSlider(gapStep)
  const ratio = malice / growth
  const tau = LOG_DISTANCE / growth
  const count = survivorCount(malice, growth, gap)
  const gapLimit = criticalGap(tau)
  const moralPass = ratio < MORAL_THRESHOLD
  const gapPass = gap < gapLimit

  useEffect(() => {
    const canvas = plateRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < MARKS.length; i++) {
      const m = MARKS[i]
      const lit = i < alive
      ctx.beginPath()
      ctx.arc(m.x * (w - 24) + 12, m.y * (h - 24) + 12, lit ? m.r : m.r * 0.75, 0, Math.PI * 2)
      ctx.fillStyle = lit ? `rgba(20,24,21,${0.55 + m.r / 6})` : 'rgba(20,24,21,0.055)'
      ctx.fill()
    }
  }, [alive])

  useEffect(() => {
    const canvas = phaseRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawField(ctx, canvas.width, canvas.height, growth)
  }, [growth])

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
            A civilization that can end itself eventually will, because a small annual probability
            across a long enough run becomes a certainty. Follow that through and the Fermi question
            turns into two conditions, both of them measurable, and both of them ours.
          </p>
        </div>
        <div className={styles.plateFrame}>
          <canvas
            ref={plateRef}
            width={1200}
            height={440}
            role="img"
            aria-label={`A field of one thousand marks representing civilizations. ${alive.toLocaleString('en-US')} still lit, ${(CIVILIZATIONS - alive).toLocaleString('en-US')} faded.`}
          />
        </div>
        <div className={styles.plateCap}>
          <span>Plate I &nbsp;/&nbsp; 1,000 civilizations</span>
          <span>exposure {fmtYears(years)} yr</span>
        </div>
      </header>

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
              isotope. Move the dials and watch the plate.
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
                    Years elapsed
                  </label>
                  <span className={styles.ctrlVal}>{fmtYears(years)} yr</span>
                </div>
                <input
                  type="range"
                  id="lf-years"
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
                <span className={styles.verdict} aria-live="polite">
                  {verdict}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── II. the measured input ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>II. The measured input</p>
          <h2>The phoenix rate</h2>
          <p>
            Seneca writes in the forty-second letter that the good man appears perhaps once in five
            hundred years, like the phoenix. He meant it as a remark about rarity. Read as a rate, it
            is the one empirical number this argument has.
          </p>
        </div>
        <div className={styles.col}>
          <ol className={styles.deriv}>
            <li>
              <b>one sage / 500 years</b>
              Seneca&rsquo;s frame is an empire of roughly fifty million with a life expectancy near
              twenty five, so about a billion lives are lived across those five centuries.
            </li>
            <li>
              <b>s₀ ≈ 10⁻⁹</b>
              One in a billion. Note what it measures: the incidence of sagehood in a population not
              cultivating it deliberately or at scale. A floor, not a ceiling.
            </li>
            <li>
              <b>
                τ<sub>v</sub> = ln(1/s₀) / g
              </b>
              If the sage fraction grows at annual rate <span className={styles.mono}>g</span>, the
              time to saturation is the log of the distance over the rate. Write{' '}
              <span className={styles.mono}>K = ln(1/s₀) = {LOG_DISTANCE.toFixed(2)}</span>.
            </li>
            <li>
              <b>the target barely matters</b>
              At <span className={styles.mono}>g</span> = 0.6% a year, reaching half sages takes
              3,338 years and reaching all of them takes 3,454. Three percent more time for double
              the target, because the distance is logarithmic. Whether the threshold is a sage
              civilization or a sage-governed one changes almost nothing.
            </li>
          </ol>
        </div>
      </section>

      {/* ── III. three hazards ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>III. Three hazards</p>
          <h2>What can end you, and who governs it</h2>
          <p>
            An earlier version of this model held the annual risk fixed while assuming the sage
            fraction was rising, which cannot both be true if virtue is what suppresses risk.
            Splitting the hazard fixes that, and it exposes a failure mode the single-term version
            could not see.
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
                Destruction chosen for gain, status, or rivalry. It drains as the sage fraction
                rises, though far more slowly than you would hope: exponential growth spends almost
                all its time near zero, so the whole mechanism buys a 4.8 percent reduction.
              </p>
              <span className={styles.gov}>governed by g</span>
            </div>
            <div>
              <span className={styles.sym}>
                p<sub>e</sub>
              </span>
              <h3>Error</h3>
              <p>
                Accident, misjudgment, a design flaw nobody caught. Capability grows at{' '}
                <span className={styles.mono}>c</span> and competence per unit of it at{' '}
                <span className={styles.mono}>e</span>. If the gap{' '}
                <span className={styles.mono}>d = c − e</span> is positive, error risk compounds, and
                it can swamp everything else.
              </p>
              <span className={styles.gov}>governed by d, and by honesty</span>
            </div>
            <div>
              <span className={styles.sym}>
                p<sub>x</sub>
              </span>
              <h3>External</h3>
              <p>
                Impact, burst, the slow arithmetic of a star. Irreducible, and virtue never touches
                it. Negligible during the transition, and afterwards it is the only thing left, which
                makes it the term that sets how long a survivor survives.
              </p>
              <span className={styles.gov}>governed by nobody</span>
            </div>
          </div>
          <p className={`${styles.footnote} ${styles.hzNote}`}>
            The malice decomposition turns out to be exactly equivalent to replacing{' '}
            <span className={styles.mono}>s₀</span> with <span className={styles.mono}>e·s₀</span>,
            so the closed form is preserved and the threshold moves only from 0.667 to{' '}
            {MORAL_THRESHOLD.toFixed(3)}. The error term has no such courtesy.
          </p>
        </div>
      </section>

      {/* ── IV. the region ── */}
      <div className={styles.phaseBlock}>
        <div className={styles.wrap}>
          <div className={`${styles.secHead} ${styles.col}`}>
            <p className={styles.eyebrow}>IV. The region</p>
            <h2>Two conditions, not one</h2>
            <p>
              The horizontal axis is the moral ratio, malice risk over improvement rate. The vertical
              is the capability gap, how far competence trails capability. Blue is where at least one
              transitioned civilization should exist. Everything else is empty sky.
            </p>
          </div>

          <div className={styles.colWider}>
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
                min={0}
                max={100}
                step={0.5}
                value={maliceStep}
                onChange={(e) => setMaliceStep(Number(e.target.value))}
              />
            </div>

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
                min={0}
                max={100}
                step={0.5}
                value={growthStep}
                onChange={(e) => setGrowthStep(Number(e.target.value))}
              />
            </div>

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
                min={0}
                max={100}
                step={0.5}
                value={gapStep}
                onChange={(e) => setGapStep(Number(e.target.value))}
              />
            </div>

            <div className={styles.phaseWrap}>
              <div>
                <div className={styles.chart}>
                  <div className={styles.yax}>
                    {Y_TICKS.map((t) => (
                      <span key={t}>{axisPct(t)}</span>
                    ))}
                  </div>
                  <div className={styles.canvasHolder}>
                    <canvas
                      ref={phaseRef}
                      width={720}
                      height={420}
                      role="img"
                      aria-label="Phase diagram of survivable parameter combinations, moral ratio across and capability gap up."
                    />
                    <div
                      className={styles.marker}
                      style={{
                        left: `${Math.min(100, Math.max(0, ((Math.log10(ratio) - R_LO) / (R_HI - R_LO)) * 100))}%`,
                        top: `${Math.min(100, Math.max(0, ((GAP_MAX - gap) / (GAP_MAX - GAP_MIN)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div />
                  <div className={styles.xax}>
                    {X_TICKS.map((t) => (
                      <span key={t}>{t < 0.1 ? t.toFixed(2) : t.toFixed(1)}</span>
                    ))}
                  </div>
                </div>
                <p className={styles.axname}>
                  horizontal: R = p<sub>m0</sub> / g &nbsp;&nbsp;·&nbsp;&nbsp; vertical: d = c − e
                </p>
              </div>

              <div>
                <span
                  className={styles.verdictNum}
                  style={{ color: count >= 1 ? '#8FB0E8' : '#E0A183' }}
                >
                  {fmtCount(count)}
                </span>
                <span className={styles.verdictLabel}>sage civilizations in the galaxy</span>
                <div className={styles.gates}>
                  <div className={styles.gate}>
                    <span>moral &nbsp; R &lt; {MORAL_THRESHOLD.toFixed(2)}</span>
                    <span className={moralPass ? styles.pass : styles.fail}>
                      R = {ratio.toFixed(2)} &nbsp;{moralPass ? 'pass' : 'fail'}
                    </span>
                  </div>
                  <div className={styles.gate}>
                    <span>competence &nbsp; d &lt; d*</span>
                    <span className={gapPass ? styles.pass : styles.fail}>
                      d* = {pct(gapLimit, 3)} &nbsp;{gapPass ? 'pass' : 'fail'}
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
                </div>
                <p className={styles.phaseVerdict} aria-live="polite">
                  {phaseVerdict(moralPass, gapPass, count)}
                </p>
              </div>
            </div>

            <p className={`${styles.footnote} ${styles.phaseNote}`}>
              Moving <span className={styles.mono}>g</span> deforms the region itself, because a
              slower transition means more years exposed to compounding capability. A low improvement
              rate raises R and tightens d* at the same time. Moral slowness is punished twice, and
              the two conditions cannot be traded against each other.
            </p>
          </div>
        </div>
      </div>

      {/* ── V. the equation ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>V. The equation</p>
          <h2>Drake, split in two</h2>
          <p>
            Drake averages the lifetime of a civilization into a single term. That average hides the
            problem, because there are two populations and they differ by seven orders of magnitude.
            Separate them, and separate existing from being detectable.
          </p>
        </div>

        <div className={styles.col}>
          <div className={styles.formula}>
            <div className={styles.line}>
              N<sub>obs</sub> = Ṅ × [ (1 − f<sub>v</sub>)·f<sub>c,s</sub>·L<sub>s</sub>{' '}
              &nbsp;+&nbsp; f<sub>v</sub>·f<sub>c,ℓ</sub>·L<sub>ℓ</sub> ]
            </div>
            <div className={styles.line}>
              f<sub>v</sub> = (e·s₀)<sup>R</sup> · exp(−I<sub>e</sub>) · exp(−p<sub>x</sub>τ
              <sub>v</sub>)
            </div>
            <div className={`${styles.line} ${styles.sub}`}>
              R = p<sub>m0</sub>/g &nbsp;&nbsp; I<sub>e</sub> = p<sub>e0</sub>(e<sup>dτ</sup> − 1)/d
              &nbsp;&nbsp; L<sub>ℓ</sub> = 1/p<sub>x</sub>
            </div>
          </div>

          <dl className={styles.terms}>
            <dt>Ṅ</dt>
            <dd>Technological civilizations arising per year. Absorbs the first five Drake terms.</dd>
            <dt>R</dt>
            <dd>The moral ratio. Malice hazard divided by the rate of moral improvement.</dd>
            <dt>
              I<sub>e</sub>
            </dt>
            <dd>
              The error integral across the transition. Compounds if capability outruns competence.
            </dd>
            <dt>s₀</dt>
            <dd>The phoenix rate, 10⁻⁹. Baseline incidence before deliberate cultivation.</dd>
            <dt>
              f<sub>c,ℓ</sub>
            </dt>
            <dd>
              Detectability of the transitioned population. Set this near zero and the crowded branch
              goes silent.
            </dd>
          </dl>

          <p className={styles.afterTerms}>
            The first threshold has a closed form,{' '}
            <span className={styles.mono}>
              R* = log(Ṅ/p<sub>x</sub>) / log(1/(e·s₀)) = {MORAL_THRESHOLD.toFixed(3)}
            </span>
            . It is a ratio of logarithms, so it barely moves when the badly known parameters move:
            sweeping <span className={styles.mono}>s₀</span> across four orders of magnitude keeps it
            inside 0.47 to 1.04. <strong>The second threshold has no such robustness</strong>,
            because it depends exponentially on an error rate nobody has measured. That is the
            softest number in the model and it is worth saying so.
          </p>
        </div>
      </section>

      {/* ── VI. the fork ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VI. The fork</p>
          <h2>Two answers, and the conditions pick</h2>
          <p>
            There is no single resolution to the paradox here. The parameters select between two of
            them, and they require completely different explanations of the silence. Note the
            asymmetry: reaching the left branch requires clearing both conditions, and reaching the
            right requires missing only one.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.fork}>
            <div className={styles.forkLeft}>
              <span className={styles.k}>both conditions cleared</span>
              <h3>The galaxy is crowded and quiet</h3>
              <p>
                Survivors outnumber the doomed by orders of magnitude, because their lifetime is
                seven orders longer. Even a filter killing 99.99 percent leaves hundreds alive. So
                the silence cannot be explained by the filter at all. It rests entirely on
                detectability, and the reason has to be restraint: virtue that was not chosen is only
                architecture, and contact would foreclose the choosing.
              </p>
            </div>
            <div className={styles.forkRight}>
              <span className={styles.k}>either condition missed</span>
              <h3>The galaxy is empty</h3>
              <p>
                Either the transition is too slow to outrun the dice, or capability outpaces
                competence and the error term swallows everything. Nothing clears it. There is no
                paradox left to solve and nothing to explain. The sky is quiet because there is
                nobody in it, and we are early rather than overlooked.
              </p>
            </div>
          </div>
          <p className={styles.footnote}>
            The restraint argument on the left has one thing no other zoo hypothesis does. The usual
            objection is uniformity: it needs every survivor to independently choose silence, and one
            defector ruins it. If the survivors are sages reasoning from shared premises, the
            convergence is not a sociological accident, it is what correct reasoning does. Though the
            value premise is shared and the empirical prediction is not, so some of them may have got
            it wrong.
          </p>
        </div>
      </section>

      {/* ── VII. the survivors ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VII. The survivors</p>
          <h2>What is left when nobody wants</h2>
          <p>
            Most of the description is subtraction. Institutions exist to manage vice, and the ones
            that manage nothing else do not survive the transition. What remains is smaller, and has
            a harder job.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.ledger}>
            <div className={styles.ledgerHead}>Dissolved</div>
            <div className={`${styles.ledgerHead} ${styles.right}`}>What stands in its place</div>

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

      {/* ── VIII. the close ── */}
      <section className={`${styles.section} ${styles.close}`}>
        <div className={`${styles.wrap} ${styles.col}`}>
          <p className={styles.eyebrow}>VIII.</p>
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
            very large room, and a species eighty years into holding a match, improving at a rate
            that will not beat the odds it has already set running.
          </p>
          <p>
            Which branch we are on is not written anywhere. It is two ratios, and all four of their
            terms are ours.
          </p>
          <p className={`${styles.footnote} ${styles.closeNote}`}>
            One hypothesis among several, and the boring ones remain live. Life may be rare,
            intelligence rarer, and the distances may simply be doing what distances do. Seneca was
            making a point about rarity, not conducting a census, so s₀ is an order of magnitude at
            best. Exponential growth in the sage fraction is an assumption and could as easily be
            logistic, which would put a ceiling below one and convert the result from rare to never.
          </p>
        </div>
      </section>

      <footer className={`${styles.wrap} ${styles.colophon}`}>
        <p className={`${styles.footnote} ${styles.mono} ${styles.colophonLine}`}>
          Arete &nbsp;·&nbsp; working note &nbsp;·&nbsp; subject to revision
        </p>
      </footer>
    </main>
  )
}
