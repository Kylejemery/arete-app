'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CIVILIZATIONS,
  HALVING_YEARS,
  LAMBDA_RISKS,
  LAMBDA_TAUS,
  LEDGER,
  SCATTER_SEED,
} from '@/content/playground/long-filter'
import styles from './LongFilter.module.css'

// ── the arithmetic ───────────────────────────────────────────────────────────

/** A span of years, phrased for humans. */
function fmt(n: number): string {
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

// ── the Λ table ──────────────────────────────────────────────────────────────

/**
 * f_v = e^(−p·τ) for each cell, with a background ramped from oxide (nobody
 * makes it) to indigo (most do). The 0.32 exponent stops the ramp collapsing to
 * a single colour, since f_v spans many orders of magnitude across the grid.
 */
const LAMBDA_ROWS = LAMBDA_RISKS.map((p) => ({
  p,
  label: `1 in ${Math.round(1 / p).toLocaleString('en-US')}`,
  cells: LAMBDA_TAUS.map((tau) => {
    const f = Math.exp(-p * tau)
    const pct = f * 100
    const mix = Math.pow(f, 0.32)
    return {
      tau,
      label: pct >= 1 ? `${pct.toFixed(0)}%` : pct >= 0.001 ? `${pct.toFixed(3)}%` : `${pct.toExponential(0)}%`,
      background: `rgb(${Math.round(122 + (36 - 122) * mix)}, ${Math.round(46 + (52 - 46) * mix)}, ${Math.round(35 + (86 - 35) * mix)})`,
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
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      'With the risk halving every thousand years, the curve stops falling. The floor is ' +
      (floor >= 1 ? `${floor.toFixed(0)}%` : `${floor.toFixed(3)}%`) +
      ', and it holds for the rest of time. Survival never required zero. It required a derivative.'
  } else if (alive === 0) {
    verdict =
      'Nothing is left. At a fixed annual risk there is no value of p small enough to survive deep time, only values that take longer to lose.'
  } else {
    verdict = `At this risk, the coin flip arrives at year ${fmt(Math.log(0.5) / Math.log(1 - p))}. Keep dragging.`
  }

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
            A civilization that can end itself, eventually will. Not from malice on any particular
            Tuesday, but because a small annual probability, given a long enough run, becomes a
            certainty. This is what that fact does to the question of why the sky is quiet.
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
          <span>exposure {fmt(years)} yr</span>
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
              and each year is an independent throw, then survival across{' '}
              <span className={styles.mono}>n</span> years is{' '}
              <span className={styles.mono}>
                (1 − p)<sup>n</sup>
              </span>
              . It is the same equation that governs radioactive decay, pointed at a species instead
              of an isotope. Move the two dials and watch the plate.
            </p>
          </div>

          <div className={styles.engineGrid}>
            <div>
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <label className={styles.ctrlLabel} htmlFor="lf-risk">
                    Annual risk of self-destruction
                  </label>
                  <span className={styles.ctrlVal}>1 in {fmt(1 / p)}</span>
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
                  <span className={styles.ctrlVal}>{fmt(years)} yr</span>
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
                  Halve the risk every thousand years. This is the only escape the math allows: not
                  perfection, but a hazard rate that falls faster than the years accumulate.
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

      {/* ── II. the claim ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={styles.col}>
          <p className={styles.eyebrow}>II. The claim</p>
          <h2>Virtue is the price of admission</h2>
          <p>
            Every route to a low hazard rate that does not run through character turns out to have a
            person hidden inside it. Scatter a civilization across a hundred systems and you have
            bought time, not safety, so long as the branches can still reach each other. Bind it with
            constraints that cannot be lifted from inside and somebody has to be the one who does not
            lift them. Build minds that cannot defect and you have made something durable that can no
            longer be praised, and that will meet the first genuinely novel threat with a blind spot
            where its judgment should be.
          </p>
          <p>
            So the claim is necessity, not sufficiency. A civilization of sages is not guaranteed a
            billion years. It is simply the only kind that can have them. Asteroids, gamma ray bursts
            and bad luck remain, and virtue never touches those.
          </p>
        </div>
      </section>

      {/* ── III. the equation ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>III. The equation</p>
          <h2>Drake, split in two</h2>
          <p>
            Drake&rsquo;s formula averages the lifetime of a civilization into a single term,{' '}
            <span className={styles.mono}>L</span>. That average hides the whole problem, because
            there are two populations and they differ by seven orders of magnitude. Separate them,
            and separate existing from being detectable.
          </p>
        </div>

        <div className={styles.col}>
          <div className={styles.formula}>
            <div className={styles.line}>
              N<sub>obs</sub> = Ṅ × [ (1 − f<sub>v</sub>)·f<sub>c,s</sub>·L<sub>s</sub>{' '}
              &nbsp;+&nbsp; f<sub>v</sub>·f<sub>c,ℓ</sub>·L<sub>ℓ</sub> ]
            </div>
            <div className={`${styles.line} ${styles.sub}`}>
              f<sub>v</sub> = e<sup>−Λ</sup> &nbsp;&nbsp;&nbsp; Λ = p · τ<sub>v</sub>
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
            <dt>
              τ<sub>v</sub>
            </dt>
            <dd>
              Years needed to reach the moral transition, counted from the day the capability
              arrives.
            </dd>
            <dt>
              f<sub>v</sub>
            </dt>
            <dd>Fraction that make the transition before the dice find them.</dd>
            <dt>
              L<sub>s</sub>, L<sub>ℓ</sub>
            </dt>
            <dd>
              Mean lifetime of each population. The short one is roughly 1/p, a few centuries. The
              long one is bounded only by hazards that virtue cannot reach.
            </dd>
            <dt>
              f<sub>c,s</sub>, f<sub>c,ℓ</sub>
            </dt>
            <dd>
              Detectability of each population. Not the same number, and that turns out to be the
              whole argument.
            </dd>
          </dl>

          <p className={styles.afterTerms}>
            The hypothesis compresses into one dimensionless quantity.{' '}
            <strong>
              Λ is how dangerous you are per year multiplied by how long you take to grow up.
            </strong>{' '}
            Everything else is bookkeeping.
          </p>
        </div>
      </section>

      {/* ── IV. the one number ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>IV. The one number</p>
          <h2>Where we sit</h2>
          <p>
            Each cell is{' '}
            <span className={styles.mono}>
              f<sub>v</sub>
            </span>
            , the share of civilizations that make the transition. Read down for how reckless a
            species is, across for how slowly it learns.
          </p>
        </div>
        <div className={styles.col}>
          <div className={styles.lamScroll}>
            <table className={styles.lam}>
              <caption className={`${styles.footnote} ${styles.lamCaption}`}>
                Columns: years to the moral transition. Rows: annual risk of self-destruction.
              </caption>
              <thead>
                <tr>
                  <th className={styles.rowhead} scope="col">
                    annual risk \ τ
                  </th>
                  {LAMBDA_TAUS.map((tau) => (
                    <th key={tau} scope="col">
                      {tau.toLocaleString('en-US')} yr
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LAMBDA_ROWS.map((row) => (
                  <tr key={row.p}>
                    <td className={styles.rowhead}>{row.label}</td>
                    {row.cells.map((cell) => (
                      <td key={cell.tau} style={{ background: cell.background }}>
                        {cell.label}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.footnote}>
            We are roughly eighty years past acquiring the capability, at an annual risk most
            published estimates put somewhere between one in a thousand and one in a hundred. If the
            transition takes a thousand years, our prior sits near one in twenty thousand.
          </p>
        </div>
      </section>

      {/* ── V. the result ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={styles.col}>
          <p className={styles.eyebrow}>V. The result nobody expects</p>
          <h2>The filter makes the sky more crowded</h2>
          <p>
            Run both terms. Take one civilization arising per century and the brutal case where only
            one in twenty thousand transitions. The doomed population, living a few centuries each,
            has perhaps one member alive right now. The transitioned population, living on the order
            of a hundred million years each, has several hundred.
          </p>
          <p>
            Even a filter that kills 99.995 percent leaves the survivors outnumbering the dead by
            hundreds to one, because their lifetime is seven orders of magnitude longer.{' '}
            <strong>The filter cannot explain the silence.</strong> It predicts a galaxy thick with
            ancient civilizations. Which means the entire weight of the answer rests on one term:{' '}
            <span className={styles.mono}>
              f<sub>c,ℓ</sub>
            </span>
            , whether the survivors can be detected at all.
          </p>
          <p>
            The reason they are quiet is not that they are few, and it is not contempt. Contempt is a
            passion, and the passions are the thing they no longer have. Chrysippus held that
            everyone short of wisdom is drowning, and the one a foot beneath the surface is drowning
            exactly as much as the one a fathom down. You do not sneer at a drowning man. The circles
            of concern that Hierocles drew expand outward until the stranger has been pulled to the
            centre, and nothing in that doctrine stops at the edge of a species.
          </p>
          <p>
            What is left is restraint. Virtue that was not chosen is only architecture, and contact
            would foreclose the choosing. A civilization that has watched this happen many times, and
            knows how most of the watching ends, would be destroying the one thing that would have
            made us worth meeting.
          </p>
          <p className={styles.footnote}>
            This is the strongest form of the zoo hypothesis available, and for a specific reason.
            The usual objection is uniformity: it needs every survivor to independently choose
            silence, and one defector ruins it. If the survivors are sages reasoning from shared
            premises, the convergence is not a sociological accident. It is what correct reasoning
            does. Though the value premise is shared and the empirical prediction is not, so a few of
            them may have got it wrong.
          </p>
        </div>
      </section>

      {/* ── VI. the survivors ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VI. The survivors</p>
          <h2>What is left when nobody wants</h2>
          <p>
            Most of the description is subtraction. Institutions exist to manage vice, and the ones
            that manage nothing else do not survive the transition. What remains is smaller, and has
            a harder job.
          </p>
        </div>
        <div className={`${styles.col} ${styles.ledgerCol}`}>
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

      {/* ── VII. the close ── */}
      <section className={`${styles.section} ${styles.close}`}>
        <div className={`${styles.wrap} ${styles.col}`}>
          <p className={styles.eyebrow}>VII.</p>
          <h2>The invitation that cannot be sent</h2>
          <p>
            Fermi asked it over lunch. The galaxy is old and large and ought to be crowded. Where is
            everybody?
          </p>
          <p>
            If the filter is moral, then most of the silence is the silence of the dead, and that
            part is not mysterious. The harder part is the ones who made it, who have been out there
            a very long time, and who are not calling.
          </p>
          <p>
            <em>
              It is not that we are not invited. It is that the invitation cannot be sent without
              voiding what it invites us to.
            </em>
          </p>
          <p className={`${styles.footnote} ${styles.closeNote}`}>
            One hypothesis among several, and the boring ones remain live. Life may be rare,
            intelligence rarer, and the distances may simply be doing what distances do. The moral
            filter is not established by the silence. It is only compatible with it, which is a
            weaker claim and the strongest one on offer.
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
