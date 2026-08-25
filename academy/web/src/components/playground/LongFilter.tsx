'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ANCHOR_IMPROVEMENT,
  ANCHOR_RISK,
  ARISING_PER_YEAR,
  CIVILIZATIONS,
  HALVING_YEARS,
  LEDGER,
  LONG_LIFETIME,
  MATRIX_RATES,
  MATRIX_RISKS,
  PHOENIX_RATE,
  SCATTER_SEED,
  THRESHOLD_RATIO,
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

// ── the ratio ────────────────────────────────────────────────────────────────

/** Both gauge sliders read the same scale: 0.01% to 3.16% a year. */
const rateFromSlider = (v: number) => Math.pow(10, -4 + (v / 100) * 2.5)

/**
 * Transitioned civilizations expected alive right now.
 *
 * f_v = s₀^(p/g) — the exponentials cancel when τ_v = ln(1/s₀)/g is substituted
 * into the survival term, so the whole hypothesis reduces to the one ratio.
 */
const survivorCount = (p: number, g: number) =>
  ARISING_PER_YEAR * Math.pow(PHOENIX_RATE, p / g) * LONG_LIFETIME

/** Where a p/g ratio falls on the gauge, which runs 0.02 to 5 in log space. */
const GAUGE_LO = Math.log10(0.02)
const GAUGE_SPAN = Math.log10(5) - GAUGE_LO
const gaugePos = (ratio: number) =>
  Math.min(100, Math.max(0, ((Math.log10(ratio) - GAUGE_LO) / GAUGE_SPAN) * 100))

function fmtCount(n: number): string {
  if (n >= 1000) return Math.round(n).toLocaleString('en-US')
  if (n >= 10) return n.toFixed(0)
  if (n >= 1) return n.toFixed(1)
  if (n >= 0.01) return n.toFixed(2)
  return '0'
}

function gaugeVerdict(n: number): string {
  if (n >= 1000)
    return 'Comfortably past the threshold. The galaxy holds thousands of transitioned civilizations, which means the filter cannot be what makes the sky quiet. Something else is.'
  if (n >= 1)
    return 'Above the line, but not by much. A handful of them exist, scattered across a hundred thousand light years and under no obligation to announce it.'
  if (n >= 0.001)
    return 'Below the threshold. Expected survivors round to none. Whatever else is out there, nothing has finished growing up.'
  return 'Far below. On these numbers the transition is so much slower than the dice that the galaxy has never produced one, and there is no paradox left to explain.'
}

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

// ── the matrix ───────────────────────────────────────────────────────────────

/**
 * Expected survivors for each (p, g) pair, with indigo above the threshold and
 * flat oxide below it — the line is categorical, so the ramp only grades the
 * side of it that has anybody on it.
 */
const MATRIX_ROWS = MATRIX_RISKS.map((p) => ({
  p,
  label: `${(p * 100).toFixed(p < 0.01 ? 2 : 0)}%`,
  cells: MATRIX_RATES.map((g) => {
    const n = survivorCount(p, g)
    return {
      g,
      label:
        n >= 1000
          ? Math.round(n).toLocaleString('en-US')
          : n >= 1
            ? n.toFixed(1)
            : n >= 1e-4
              ? n.toFixed(4)
              : n.toExponential(0),
      background:
        n >= 1
          ? `rgb(${Math.round(36 + 30 * Math.min(1, Math.log10(n) / 5))}, 52, 86)`
          : '#7A2E23',
    }
  }),
}))

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
  const [gaugeRiskStep, setGaugeRiskStep] = useState(80)
  const [gaugeGrowthStep, setGaugeGrowthStep] = useState(71)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // the plate
  const p = riskFromSlider(riskStep)
  const years = yearsFromSlider(yearsStep)
  const share = survival(p, years, decay)
  const alive = Math.round(CIVILIZATIONS * share)
  const pct = share * 100

  const survivorText =
    pct >= 1
      ? `${pct.toFixed(0)}%`
      : pct >= 0.01
        ? `${pct.toFixed(2)}%`
        : pct > 0
          ? `${pct.toExponential(1)}%`
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

  // the gauge
  const gaugeRisk = rateFromSlider(gaugeRiskStep)
  const gaugeGrowth = rateFromSlider(gaugeGrowthStep)
  const ratio = gaugeRisk / gaugeGrowth
  const transitionedShare = Math.pow(PHOENIX_RATE, ratio)
  const count = survivorCount(gaugeRisk, gaugeGrowth)
  const survives = ratio <= THRESHOLD_RATIO

  useEffect(() => {
    const canvas = canvasRef.current
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
            turns on a single ratio: how fast a species can kill itself, against how fast it can
            improve.
          </p>
        </div>
        <div className={styles.plateFrame}>
          <canvas
            ref={canvasRef}
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
                <span className={`${styles.bigNum} ${pct > 5 ? styles.living : styles.dying}`}>
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
            is the one empirical number this whole argument has.
          </p>
        </div>
        <div className={styles.col}>
          <ol className={styles.deriv}>
            <li>
              <b>one sage / 500 years</b>
              Seneca&rsquo;s frame is an empire of roughly fifty million people with a life
              expectancy near twenty five, so about a billion lives are lived across those five
              centuries.
            </li>
            <li>
              <b>s₀ ≈ 10⁻⁹</b>
              One in a billion. Note what that number measures: the incidence of sagehood in a
              population that was not cultivating it deliberately or at scale. A floor, not a
              ceiling.
            </li>
            <li>
              <b>
                τ<sub>v</sub> = ln(1/s₀) / g
              </b>
              If the sage fraction grows at an annual rate <span className={styles.mono}>g</span>,
              the time to saturation is the log of the distance divided by the rate.
            </li>
            <li>
              <b>
                f<sub>v</sub> = s₀<sup>(p/g)</sup>
              </b>
              Substitute that into the survival term and the exponentials cancel. Everything
              collapses into one ratio.
            </li>
          </ol>
          <p className={styles.afterDeriv}>
            Two things fall out immediately. The first is that{' '}
            <strong>the target barely matters.</strong> At an improvement rate of 0.6 percent a year,
            reaching half sages takes 3,338 years and reaching all of them takes 3,454. A three
            percent difference for double the target, because the growth is exponential and the
            distance is logarithmic. Whether the threshold is a sage civilization or merely a
            sage-governed one changes almost nothing.
          </p>
          <p>
            The second is that <strong>the ratio is the whole argument.</strong> Not the risk on its
            own, and not the rate of improvement on its own. Only p over g.
          </p>
        </div>
      </section>

      {/* ── III. the ratio ── */}
      <div className={styles.gaugeBlock}>
        <div className={styles.wrap}>
          <div className={`${styles.secHead} ${styles.col}`}>
            <p className={styles.eyebrow}>III. The ratio</p>
            <h2>How many are out there</h2>
            <p>
              Set the annual risk against the annual rate of moral improvement. The scale below reads
              their ratio, and the number beside it is how many transitioned civilizations should be
              alive in the galaxy right now.
            </p>
          </div>

          <div className={styles.colWide}>
            <div className={styles.ctrl}>
              <div className={styles.ctrlTop}>
                <label className={styles.ctrlLabel} htmlFor="lf-gauge-risk">
                  {'p  · annual risk of self-destruction'}
                </label>
                <span className={styles.ctrlVal}>
                  {(gaugeRisk * 100).toFixed(gaugeRisk < 0.001 ? 3 : 2)}%
                </span>
              </div>
              <input
                type="range"
                id="lf-gauge-risk"
                min={0}
                max={100}
                step={0.5}
                value={gaugeRiskStep}
                onChange={(e) => setGaugeRiskStep(Number(e.target.value))}
              />
            </div>

            <div className={`${styles.ctrl} ${styles.ctrlTight}`}>
              <div className={styles.ctrlTop}>
                <label className={styles.ctrlLabel} htmlFor="lf-gauge-growth">
                  {'g  · annual rate of moral improvement'}
                </label>
                <span className={styles.ctrlVal}>
                  {(gaugeGrowth * 100).toFixed(gaugeGrowth < 0.001 ? 3 : 2)}%
                </span>
              </div>
              <input
                type="range"
                id="lf-gauge-growth"
                min={0}
                max={100}
                step={0.5}
                value={gaugeGrowthStep}
                onChange={(e) => setGaugeGrowthStep(Number(e.target.value))}
              />
            </div>

            <div className={styles.gauge}>
              <div
                className={`${styles.gaugeTick} ${styles.thresh}`}
                style={{ left: `${gaugePos(THRESHOLD_RATIO)}%` }}
              >
                <span>
                  p/g = {THRESHOLD_RATIO.toFixed(2)}
                  <br />
                  one civilization
                </span>
              </div>
              <div
                className={styles.gaugeTick}
                style={{ left: `${gaugePos(ANCHOR_RISK / ANCHOR_IMPROVEMENT)}%` }}
              >
                <span>where we sit</span>
              </div>
              <div className={styles.gaugeTrack}>
                <div
                  className={styles.gaugeHandle}
                  style={{ left: `${gaugePos(ratio)}%`, background: survives ? '#8FB0E8' : '#E0A183' }}
                />
              </div>
              <div className={styles.gaugeScale}>
                <span>0.02 &nbsp;populated</span>
                <span>empty&nbsp; 5.0</span>
              </div>
            </div>

            <div className={styles.gaugeGrid}>
              <div>
                <span
                  className={styles.verdictNum}
                  style={{ color: count >= 1 ? '#8FB0E8' : '#E0A183' }}
                >
                  {fmtCount(count)}
                </span>
                <span className={styles.verdictLabel}>sage civilizations in the galaxy</span>
              </div>
              <div>
                <p className={styles.gaugeVerdict} aria-live="polite">
                  {gaugeVerdict(count)}
                </p>
                <p className={`${styles.footnote} ${styles.gaugeNote}`}>
                  Assuming one technological civilization arises per century and each transitioned
                  one lasts 10<sup>8</sup> years.{' '}
                  <span className={styles.mono}>
                    p/g = {ratio.toFixed(2)} · f_v = {transitionedShare.toExponential(1)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── IV. the equation ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>IV. The equation</p>
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
            <div className={`${styles.line} ${styles.sub}`}>
              f<sub>v</sub> = s₀<sup>(p/g)</sup> &nbsp;&nbsp;&nbsp;&nbsp; s₀ ≈ 10⁻⁹
            </div>
          </div>

          <dl className={styles.terms}>
            <dt>Ṅ</dt>
            <dd>
              Technological civilizations arising per year in the galaxy. Absorbs the first five
              Drake terms.
            </dd>
            <dt>p</dt>
            <dd>Annual probability of self-destruction, once the capability exists.</dd>
            <dt>g</dt>
            <dd>Annual growth rate of the sage fraction of the population.</dd>
            <dt>s₀</dt>
            <dd>The phoenix rate. Baseline incidence of sagehood before deliberate cultivation.</dd>
            <dt>
              f<sub>v</sub>
            </dt>
            <dd>Fraction that make the transition before the dice find them.</dd>
            <dt>
              L<sub>s</sub>, L<sub>ℓ</sub>
            </dt>
            <dd>
              Mean lifetime of each population. The short one is roughly 1/p, a few centuries. The
              long one is bounded only by hazards virtue cannot reach.
            </dd>
            <dt>
              f<sub>c,ℓ</sub>
            </dt>
            <dd>
              Detectability of the transitioned population. Set this near zero and the crowded branch
              goes silent.
            </dd>
          </dl>

          <p className={styles.afterTerms}>
            The threshold is exact. For the galaxy to hold even one transitioned civilization besides
            ourselves,{' '}
            <strong>
              moral improvement has to run at least 1.5 times faster than annual catastrophic risk.
            </strong>{' '}
            That is a falsifiable claim, which is more than Drake&rsquo;s formula ever offered.
          </p>
        </div>
      </section>

      {/* ── V. the two anchors ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>V. The two anchors</p>
          <h2>Where the evidence puts us</h2>
          <p>
            European homicide fell from about forty per hundred thousand in the 1300s to roughly one
            today, an improvement rate near 0.6 percent a year. Global literacy odds improved at
            about 1.9 percent a year after 1820. Published estimates of annual nuclear risk cluster
            between one tenth of a percent and one percent. Both of our numbers are inside this
            table, and they land on opposite sides of the line.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.mtxScroll}>
            <table className={styles.mtx}>
              <caption className={`${styles.footnote} ${styles.mtxCaption}`}>
                Cells give the expected number of transitioned civilizations alive now. Blue survives
                the threshold, oxide does not.
              </caption>
              <thead>
                <tr>
                  <th className={styles.rowhead} scope="col">
                    {'p  \\  g'}
                  </th>
                  {MATRIX_RATES.map((g) => (
                    <th key={g} scope="col">
                      {(g * 100).toFixed(g < 0.01 ? 1 : 0)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((row) => (
                  <tr key={row.p}>
                    <td className={styles.rowhead}>{row.label}</td>
                    {row.cells.map((cell) => (
                      <td key={cell.g} style={{ background: cell.background }}>
                        {cell.label}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── VI. the fork ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VI. The fork</p>
          <h2>Two answers, and the ratio picks</h2>
          <p>
            This is the part I had wrong the first time. There is no single resolution to the paradox
            here. The ratio selects between two of them, and they require completely different
            explanations of the silence.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.fork}>
            <div className={styles.forkLeft}>
              <span className={styles.k}>p/g below 0.67</span>
              <h3>The galaxy is crowded and quiet</h3>
              <p>
                Survivors outnumber the doomed by orders of magnitude, because their lifetime is
                seven orders longer. Even a filter killing 99.99 percent leaves hundreds alive. So
                the silence cannot be explained by the filter at all. It rests entirely on
                detectability, and the reason for it has to be restraint: virtue that was not chosen
                is only architecture, and contact would foreclose the choosing.
              </p>
            </div>
            <div className={styles.forkRight}>
              <span className={styles.k}>p/g above 0.67</span>
              <h3>The galaxy is empty</h3>
              <p>
                The transition is so much slower than the dice that almost nothing clears it. There
                is no paradox left to solve, and nothing to explain. The sky is quiet because there
                is nobody in it, and we are early rather than overlooked. On this branch the argument
                stops being cosmology and becomes a warning.
              </p>
            </div>
          </div>
          <p className={styles.footnote}>
            The restraint argument on the left has one thing going for it that no other zoo
            hypothesis does. The usual objection is uniformity: it needs every survivor to
            independently choose silence, and one defector ruins it. If the survivors are sages
            reasoning from shared premises, the convergence is not a sociological accident, it is
            what correct reasoning does. Though the value premise is shared and the empirical
            prediction is not, so some of them may have got it wrong.
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
            Which branch we are on is not written anywhere. It is a ratio, and both of its terms are
            ours.
          </p>
          <p className={`${styles.footnote} ${styles.closeNote}`}>
            One hypothesis among several, and the boring ones remain live. Life may be rare,
            intelligence rarer, and the distances may simply be doing what distances do. Seneca was
            making a point about rarity, not conducting a census, so s₀ is an order of magnitude at
            best. Exponential growth in the sage fraction is an assumption and could as easily be
            logistic, which would put a ceiling below one and change everything.
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
