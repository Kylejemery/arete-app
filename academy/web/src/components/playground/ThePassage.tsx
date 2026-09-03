'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BILLION_YEAR_HAZARD,
  ERAS,
  HAZARD_NOW,
  LEDGER,
  PHOENIX_RATE,
  PRESETS,
  REACH,
  SERIES,
  type Reach,
} from '@/content/playground/the-passage'
import { run, sensitivity, type Dials, type Point } from '@/lib/passage-model'
import styles from './ThePassage.module.css'

// ── scales and formatting ────────────────────────────────────────────────────

/** A log slider: 0–100 on the track, min–max in the model. */
function logScale(min: number, max: number) {
  const lo = Math.log10(min)
  const hi = Math.log10(max)
  return {
    from: (v: number) => Math.pow(10, lo + (v / 100) * (hi - lo)),
    to: (x: number) => ((Math.log10(x) - lo) / (hi - lo)) * 100,
  }
}
function linScale(min: number, max: number) {
  return {
    from: (v: number) => min + (v / 100) * (max - min),
    to: (x: number) => ((x - min) / (max - min)) * 100,
  }
}

const SCALES = {
  start: logScale(1e-9, 1e-2),
  hazard: logScale(1e-3, 0.5),
  capMult: logScale(1, 20),
  capDouble: logScale(0.1, 5),
  cultivation: logScale(0.02, 5),
  forgetting: logScale(1e-3, 1.2),
  conditions: linScale(1.5, 5),
  lockin: linScale(0, 0.5),
}

/** Centuries, phrased as the span of years a reader actually thinks in. */
function years(centuries: number): string {
  const y = centuries * 100
  if (y >= 1e9) return `${(y / 1e9).toFixed(y >= 1e10 ? 0 : 1).replace(/\.0$/, '')} billion yr`
  if (y >= 1e6) return `${(y / 1e6).toFixed(y >= 1e7 ? 0 : 1).replace(/\.0$/, '')} million yr`
  if (y >= 1e4) return `${Math.round(y / 1000).toLocaleString('en-US')},000 yr`
  if (y >= 1) return `${Math.round(y).toLocaleString('en-US')} yr`
  return '<1 yr'
}

/** A power of ten, typeset. */
function sci(x: number, places = 1): string {
  if (x === 0) return '0'
  const e = Math.floor(Math.log10(x))
  const m = x / Math.pow(10, e)
  const digits = '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'
  const sup = (n: number) =>
    (n < 0 ? '⁻' : '') +
    String(Math.abs(n))
      .split('')
      .map((c) => digits[Number(c) + 1])
      .join('')
  if (e >= -2 && e <= 3) return x >= 1 ? x.toFixed(Math.max(0, 2 - e)) : x.toFixed(-e + 1)
  if (m.toFixed(places) === (1).toFixed(places)) return `10${sup(e)}`
  return `${m.toFixed(places)} × 10${sup(e)}`
}

function pct(x: number): string {
  if (x > 0.9995) return '100%'
  if (x >= 0.99) return `${(x * 100).toFixed(1)}%`
  if (x >= 0.1) return `${(x * 100).toFixed(0)}%`
  if (x >= 0.001) return `${(x * 100).toFixed(1)}%`
  if (x > 0) return `${sci(x * 100)}%`
  return '0%'
}

/** A fraction of a population, said the way a person would say it. */
function inEvery(x: number): string {
  if (x >= 0.5) return `${(x * 100).toFixed(1)} in 100`
  if (x <= 0) return 'none'
  const n = 1 / x
  if (n < 1e4) return `1 in ${Math.round(n).toLocaleString('en-US')}`
  return `1 in ${sci(n)}`
}

// ── chart geometry ───────────────────────────────────────────────────────────

const W = 1000
const H = 300
const PAD = { l: 62, r: 118, t: 16, b: 34 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b

const T_MIN = 0.01 // one year, in centuries
const T_MAX = 1e7 // one billion years

/** A log-time scale across the plot width. */
const mkTx = (min: number, max: number) => (t: number) =>
  PAD.l + ((Math.log10(Math.max(t, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * PW

const tx = mkTx(T_MIN, T_MAX)

const T_TICKS: [number, string][] = [
  [0.01, '1 yr'],
  [1, '100 yr'],
  [100, '10k'],
  [1e4, '1M'],
  [1e6, '100M'],
  [1e7, '1B yr'],
]

/** Plate III looks only at the window in which anything happens. */
const E_MAX = 2000 // 200,000 years, in centuries
const etx = mkTx(T_MIN, E_MAX)
const E_TICKS: [number, string][] = [
  [0.01, '1 yr'],
  [1, '100 yr'],
  [10, '1,000'],
  [100, '10k'],
  [1000, '100k yr'],
]

/** A legend is always present for two or more series; identity is never colour alone. */
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className={styles.legend}>
      {items.map((i) => (
        <span key={i.label}>
          <span className={styles.swatch} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Nearest sample to a pointer position, for the crosshair. */
function nearest(points: Point[], px: number, max = T_MAX): Point {
  const t = Math.pow(
    10,
    Math.log10(T_MIN) + ((px - PAD.l) / PW) * (Math.log10(max) - Math.log10(T_MIN)),
  )
  let best = points[0]
  let bd = Infinity
  for (const p of points) {
    const d = Math.abs(Math.log10(Math.max(p.t, T_MIN)) - Math.log10(t))
    if (d < bd) {
      bd = d
      best = p
    }
  }
  return best
}

function useHover(points: Point[], max = T_MAX) {
  const [hit, setHit] = useState<Point | null>(null)
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    if (px < PAD.l || px > PAD.l + PW) return setHit(null)
    setHit(nearest(points, px, max))
  }
  return { hit, onMove, onLeave: () => setHit(null) }
}

function XAxis({ ticks = T_TICKS, scale = tx }: { ticks?: [number, string][]; scale?: (t: number) => number }) {
  return (
    <g className={styles.axis}>
      <line x1={PAD.l} x2={PAD.l + PW} y1={PAD.t + PH} y2={PAD.t + PH} />
      {ticks.map(([t, label]) => (
        <g key={label}>
          <line x1={scale(t)} x2={scale(t)} y1={PAD.t + PH} y2={PAD.t + PH + 5} />
          <text x={scale(t)} y={PAD.t + PH + 20} textAnchor="middle">
            {label}
          </text>
        </g>
      ))}
    </g>
  )
}

// ── plate I: the three outcomes ──────────────────────────────────────────────

function OutcomePlate({ points }: { points: Point[] }) {
  const { hit, onMove, onLeave } = useHover(points)
  const y = (v: number) => PAD.t + (1 - v) * PH

  // Bottom-to-top: still moving, frozen, ended. Each band is drawn as a closed
  // path against the band below it, with a 2px plate-coloured stroke on the
  // boundary so adjacent fills never touch.
  const band = (lo: (p: Point) => number, hi: (p: Point) => number) => {
    const up = points.map((p) => `${tx(p.t)},${y(hi(p))}`).join(' L')
    const down = [...points].reverse().map((p) => `${tx(p.t)},${y(lo(p))}`).join(' L')
    return `M${up} L${down} Z`
  }
  const edge = (f: (p: Point) => number) => `M${points.map((p) => `${tx(p.t)},${y(f(p))}`).join(' L')}`

  // Label a band where it is thickest, and only if it is thick enough to read.
  const thickest = (lo: (p: Point) => number, hi: (p: Point) => number) => {
    let best = points[0]
    let bw = -1
    for (const p of points) {
      const w = hi(p) - lo(p)
      if (w > bw) { bw = w; best = p }
    }
    return { p: best, w: bw, mid: (hi(best) + lo(best)) / 2 }
  }
  const bands = [
    { key: 'still moving', lo: () => 0, hi: (p: Point) => p.moving },
    { key: 'frozen', lo: (p: Point) => p.moving, hi: (p: Point) => p.moving + p.frozen },
    { key: 'ended', lo: (p: Point) => p.moving + p.frozen, hi: () => 1 },
  ].map((b) => ({ ...b, ...thickest(b.lo, b.hi) }))

  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={onLeave} role="img"
        aria-label="Stacked bands showing the share of civilizations still moving, frozen, and ended, from one year to one billion years.">
        <g className={styles.grid}>
          {[0.25, 0.5, 0.75, 1].map((v) => (
            <line key={v} x1={PAD.l} x2={PAD.l + PW} y1={y(v)} y2={y(v)} />
          ))}
        </g>

        <path d={band(() => 0, (p) => p.moving)} fill={SERIES.moving} fillOpacity={0.9} />
        <path d={band((p) => p.moving, (p) => p.moving + p.frozen)} fill={SERIES.frozen} fillOpacity={0.9} />
        <path d={band((p) => p.moving + p.frozen, () => 1)} fill={SERIES.ended} fillOpacity={0.86} />
        <path d={edge((p) => p.moving)} className={styles.seam} />
        <path d={edge((p) => p.moving + p.frozen)} className={styles.seam} />

        <g className={styles.yaxis}>
          {[0, 0.5, 1].map((v) => (
            <text key={v} x={PAD.l - 10} y={y(v) + 4} textAnchor="end">
              {v * 100}%
            </text>
          ))}
        </g>
        <XAxis />

        {/* Direct labels inside the bands that can hold them. The ochre sits
            below 3:1 on this ground, so identity never rests on colour: what a
            band cannot label for itself, the legend below names. */}
        <g className={styles.inBand}>
          {bands
            .filter((b) => b.w > 0.14)
            .map((b) => (
              <text
                key={b.key}
                // held clear of the axis at either end, so a band thickest at
                // the very edge never prints its label over the tick labels
                x={Math.min(Math.max(tx(b.p.t), PAD.l + 62), PAD.l + PW - 62)}
                y={y(b.mid) + 4}
                textAnchor="middle"
              >
                {b.key}
              </text>
            ))}
        </g>

        {hit && (
          <g>
            <line className={styles.crosshair} x1={tx(hit.t)} x2={tx(hit.t)} y1={PAD.t} y2={PAD.t + PH} />
            <circle cx={tx(hit.t)} cy={y(hit.moving)} r={4} className={styles.dot} />
          </g>
        )}
      </svg>
      <Legend
        items={[
          { color: SERIES.moving, label: 'still moving' },
          { color: SERIES.frozen, label: 'frozen' },
          { color: SERIES.ended, label: 'ended' },
        ]}
      />
      <figcaption className={styles.tip} aria-live="polite">
        {hit ? (
          <>
            <b>{years(hit.t)}</b> — still moving {pct(hit.moving)} · frozen {pct(hit.frozen)} · ended{' '}
            {pct(hit.ended)} · cultivated {inEvery(hit.s)} · hazard {sci(hit.lam)} per century
          </>
        ) : (
          <>Plate I / the three outcomes. Hover the plate to read any moment.</>
        )}
      </figcaption>
    </figure>
  )
}

// ── plate II: the hazard ─────────────────────────────────────────────────────

const L_MIN = 1e-10
const L_MAX = 10
const ly = (v: number) =>
  PAD.t + (1 - (Math.log10(Math.max(v, L_MIN)) - Math.log10(L_MIN)) / (Math.log10(L_MAX) - Math.log10(L_MIN))) * PH

function HazardPlate({ points, floor }: { points: Point[]; floor: number }) {
  const { hit, onMove, onLeave } = useHover(points)
  const path = `M${points.map((p) => `${tx(p.t)},${ly(p.lam)}`).join(' L')}`
  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={onLeave} role="img"
        aria-label="The hazard per century over time, against the billion-year line and the floor set by reach.">
        <g className={styles.grid}>
          {[-9, -7, -5, -3, -1].map((e) => (
            <line key={e} x1={PAD.l} x2={PAD.l + PW} y1={ly(Math.pow(10, e))} y2={ly(Math.pow(10, e))} />
          ))}
        </g>
        <g className={styles.yaxis}>
          {[-9, -7, -5, -3, -1].map((e) => (
            <text key={e} x={PAD.l - 10} y={ly(Math.pow(10, e)) + 4} textAnchor="end">
              {sci(Math.pow(10, e))}
            </text>
          ))}
        </g>

        <line className={styles.ruleLine} x1={PAD.l} x2={PAD.l + PW}
          y1={ly(BILLION_YEAR_HAZARD)} y2={ly(BILLION_YEAR_HAZARD)} />
        <text className={styles.ruleLabel} x={PAD.l + PW + 10} y={ly(BILLION_YEAR_HAZARD) + 4}>
          the billion-year line
        </text>

        <line className={styles.floorLine} x1={PAD.l} x2={PAD.l + PW} y1={ly(floor)} y2={ly(floor)} />
        <text className={styles.ruleLabel} x={PAD.l + PW + 10} y={ly(floor) - 8}>
          floor: the sky
        </text>

        <path d={path} className={styles.hazardPath} stroke={SERIES.ended} />
        <XAxis />

        {hit && (
          <g>
            <line className={styles.crosshair} x1={tx(hit.t)} x2={tx(hit.t)} y1={PAD.t} y2={PAD.t + PH} />
            <circle cx={tx(hit.t)} cy={ly(hit.lam)} r={4} className={styles.dot} />
          </g>
        )}
      </svg>
      <figcaption className={styles.tip} aria-live="polite">
        {hit ? (
          <>
            <b>{years(hit.t)}</b> — hazard {sci(hit.lam)} per century, which is{' '}
            {hit.lam > BILLION_YEAR_HAZARD
              ? `${(Math.log10(hit.lam / BILLION_YEAR_HAZARD)).toFixed(1)} orders above the line`
              : 'below the line'}
          </>
        ) : (
          <>Plate II / the hazard per century, against the rate a billion years requires.</>
        )}
      </figcaption>
    </figure>
  )
}

// ── plate III: the race ──────────────────────────────────────────────────────

function EnginePlate({ points }: { points: Point[] }) {
  const window = points.filter((p) => p.t <= E_MAX)
  const { hit, onMove, onLeave } = useHover(window, E_MAX)
  const y = (v: number) => PAD.t + (1 - v) * PH
  const line = (f: (p: Point) => number) => `M${window.map((p) => `${etx(p.t)},${y(f(p))}`).join(' L')}`
  const end = window[window.length - 1]
  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={onLeave} role="img"
        aria-label="Two curves, each as a fraction of its own ceiling: capability, and the cultivated fraction.">
        <g className={styles.grid}>
          {[0.25, 0.5, 0.75, 1].map((v) => (
            <line key={v} x1={PAD.l} x2={PAD.l + PW} y1={y(v)} y2={y(v)} />
          ))}
        </g>
        <g className={styles.yaxis}>
          {[0, 0.5, 1].map((v) => (
            <text key={v} x={PAD.l - 10} y={y(v) + 4} textAnchor="end">
              {v * 100}%
            </text>
          ))}
        </g>
        <path d={line((p) => p.cap)} className={styles.enginePath} stroke={SERIES.ended} />
        <path d={line((p) => p.s)} className={styles.enginePath} stroke={SERIES.moving} />
        <XAxis ticks={E_TICKS} scale={etx} />
        {/* anchored to where each curve actually ends, so the label never floats */}
        <g className={styles.direct}>
          <text x={PAD.l + PW + 10} y={y(end.cap) + 4} fill={SERIES.ended}>capability</text>
          <text x={PAD.l + PW + 10} y={y(end.s) + 4} fill={SERIES.moving}>cultivation</text>
        </g>
        {hit && (
          <g>
            <line className={styles.crosshair} x1={etx(hit.t)} x2={etx(hit.t)} y1={PAD.t} y2={PAD.t + PH} />
            <circle cx={etx(hit.t)} cy={y(hit.cap)} r={4} className={styles.dot} />
            <circle cx={etx(hit.t)} cy={y(hit.s)} r={4} className={styles.dot} />
          </g>
        )}
      </svg>
      <Legend
        items={[
          { color: SERIES.ended, label: 'capability, as a fraction of its ceiling' },
          { color: SERIES.moving, label: 'cultivated fraction of the population' },
        ]}
      />
      <figcaption className={styles.tip} aria-live="polite">
        {hit ? (
          <>
            <b>{years(hit.t)}</b> — capability at {pct(hit.cap)} of its ceiling, cultivation at{' '}
            {pct(hit.s)} of the population
          </>
        ) : (
          <>Plate III / the race, each curve as a fraction of its own ceiling. The gap between them is the hazard.</>
        )}
      </figcaption>
    </figure>
  )
}

// ── the instrument ───────────────────────────────────────────────────────────

export default function ThePassage({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [dials, setDials] = useState<Dials>(PRESETS[0].dials)
  const [preset, setPreset] = useState<string>(PRESETS[0].key)
  const [scrub, setScrub] = useState(520)

  const set = <K extends keyof Dials>(k: K, v: Dials[K]) => {
    setDials((d) => ({ ...d, [k]: v }))
    setPreset('')
  }

  const model = useMemo(() => run(dials), [dials])
  const sens = useMemo(() => sensitivity(dials), [dials])

  // The scrubbed moment: 10 years out to 100,000 years, log-spaced.
  const scrubT = Math.pow(10, -1 + (scrub / 1000) * 4)
  const now = useMemo(
    () => model.points.reduce((a, b) => (Math.abs(b.t - scrubT) < Math.abs(a.t - scrubT) ? b : a)),
    [model, scrubT],
  )
  const era = [...ERAS].reverse().find((e) => now.s >= e.at) ?? ERAS[0]

  /** When each row of the ledger is crossed, given the dials. */
  const crossings = useMemo(
    () =>
      LEDGER.map((row) => ({
        row,
        at: row.at > model.ceiling ? null : (model.points.find((p) => p.s >= row.at)?.t ?? null),
      })),
    [model],
  )

  const floor = REACH[dials.reach].floor
  const clearsLine = model.floorReached <= BILLION_YEAR_HAZARD
  // Two things can hold the hazard up, and which one is binding is the whole
  // question at this point in the dials — being wise on one world and being
  // careless across many stars fail for opposite reasons.
  const reachBinds = model.floorReached <= floor * (1 + 1e-9)
  const cheap = model.crossingCost < 1

  const tableRows = [0.1, 1, 5, 20, 50, 100, 1000, 1e4, 1e6, 1e7].map((t) =>
    model.points.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)),
  )

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
          <h1>The Passage</h1>
          <p className={styles.lede}>
            The Long Filter asks whether anybody gets through. This asks what the crossing is like
            from inside it — how long it takes, what it costs while it happens, and which of our
            institutions dissolve at which point along the way. Every date on this page is an output.
            Move a dial and the social history moves with it.
          </p>
        </div>
        <OutcomePlate points={model.points} />
      </header>

      {/* ── I ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>I. The target</p>
          <h2>What a billion years actually asks for</h2>
        </div>
        <div className={styles.col}>
          <p>
            Treat the end of a civilization as a hazard with rate{' '}
            <span className={styles.mono}>λ</span> per century. Survival across{' '}
            <span className={styles.mono}>T</span> is{' '}
            <span className={styles.mono}>e^(−λT)</span>, so a coin-flip chance at a billion years —
            ten million centuries — needs
          </p>
          <p className={styles.formula}>
            λ* = ln 2 / 10⁷ = {sci(BILLION_YEAR_HAZARD, 2)} per century
          </p>
          <p>
            The usual estimate for our own century is about one in six. The distance between those
            two numbers is{' '}
            <strong>{Math.log10(HAZARD_NOW / BILLION_YEAR_HAZARD).toFixed(1)} orders of magnitude</strong>,
            and that single quantity reframes the whole question. A sage civilization is not one that
            is much safer. It is one that has become safer from itself than we are from the sky.
          </p>
          <p>
            The intuition worth breaking here is that being very careful is enough. A civilization
            holding λ = 10⁻⁴ — one expected catastrophe per million years, safer than anything we can
            presently imagine — still has a median life of{' '}
            <strong>{years((Math.LN2 / 1e-4))}</strong>. It misses a billion by three orders. Careful
            is not the same kind of thing as permanent.
          </p>
          <p>
            One consequence falls straight out and it is not the romantic one. Since the sky alone
            ends things at some rate, and that rate for a single planet sits above λ*, a civilization
            that stays on one world cannot reach a billion years however wise it becomes.{' '}
            <em>The sage civilization cannot be Arcadian.</em> It has to keep deflecting things,
            keep engineering around a brightening sun, keep spreading — permanently coupling the
            wisdom to the capability rather than retreating from it.
          </p>
        </div>
      </section>

      {/* ── II ── */}
      <section className={`${styles.section} ${styles.engine}`}>
        <div className={styles.wrap}>
          <div className={`${styles.secHead} ${styles.col}`}>
            <p className={styles.eyebrow}>II. The two clocks</p>
            <h2>A ceiling, and a bill for the crossing</h2>
            <p>
              The model has two curves. Cultivation spreads logistically and is eaten by forgetting,
              because each generation relearns from something close to the start. Capability rises
              and saturates. The hazard is what sits between them.
            </p>
          </div>

          <div className={styles.col}>
            <p className={styles.formula}>
              ds/dt = g·s·(1 − s) − δ·s &nbsp;&nbsp;→&nbsp;&nbsp; s* = 1 − δ/g
            </p>
            <p>
              That ceiling is the first condition and it is unforgiving in an instructive way: the
              highest fraction ever reached depends on the <em>ratio</em> of forgetting to
              cultivation, not on either rate alone. Teach twice as fast against the same forgetting
              and you arrive at the same place sooner. Only the ratio moves the ceiling — which is
              why a corpus that makes accumulated judgment retrievable instead of re-derived is a
              different kind of intervention from teaching harder.
            </p>
            <p className={styles.formula}>
              λ(t) = max( floor, λ₀ · c(t) · (1 − s(t))^k )
            </p>
            <p>
              The exponent <span className={styles.mono}>k</span> is how many independent things must
              coincide for a catastrophe — capability, opportunity and will is the usual three — each
              thinning with the uncultivated remainder. It is the softest assumption here, so it is
              on a dial rather than buried in a constant.
            </p>
            <p>
              The second condition is the one a ceiling cannot help with. A civilization is charged
              the hazard of the whole journey while it makes it, so the crossing has to be short
              relative to the danger, not merely aimed correctly. The bill is{' '}
              <span className={styles.mono}>∫λ dt</span> over the crossing — the expected number of
              catastrophes drawn on the way — and it has to come in under about one.
            </p>
          </div>

          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button key={p.key} onClick={() => { setDials(p.dials); setPreset(p.key) }}
                className={preset === p.key ? `${styles.preset} ${styles.presetOn}` : styles.preset}
                aria-pressed={preset === p.key}>
                {p.name}
              </button>
            ))}
          </div>
          {preset && (
            <p className={`${styles.presetNote} ${styles.col}`}>
              {PRESETS.find((p) => p.key === preset)?.note}
            </p>
          )}

          <div className={styles.dialGrid}>
            <div className={styles.dials}>
              <Dial label="Where we start" hint={`cultivated fraction today — the dial bottoms out at the phoenix rate, ${inEvery(PHOENIX_RATE)}`}
                value={inEvery(dials.start)} scale={SCALES.start} v={dials.start}
                onChange={(x) => set('start', x)} />
              <Dial label="Hazard now" hint="per century, before capability"
                value={`${sci(dials.hazard)} · ${inEvery(dials.hazard)} a century`}
                scale={SCALES.hazard} v={dials.hazard} onChange={(x) => set('hazard', x)} />
              <Dial label="Capability multiplier" hint="hazard at full capability"
                value={`× ${dials.capMult.toFixed(1)}`} scale={SCALES.capMult} v={dials.capMult}
                onChange={(x) => set('capMult', x)} />
              <Dial label="Capability doubling" hint="how fast it gets there"
                value={years(dials.capDouble)} scale={SCALES.capDouble} v={dials.capDouble}
                onChange={(x) => set('capDouble', x)} />
            </div>
            <div className={styles.dials}>
              <Dial label="Cultivation rate" hint="g, per century"
                value={dials.cultivation.toFixed(2)} scale={SCALES.cultivation} v={dials.cultivation}
                onChange={(x) => set('cultivation', x)} />
              <Dial label="Forgetting" hint="δ/g — the ceiling is 1 minus this"
                value={`${sci(dials.forgetting)} of cultivation`} scale={SCALES.forgetting}
                v={dials.forgetting} onChange={(x) => set('forgetting', x)} />
              <Dial label="Independent conditions" hint="k — what must coincide"
                value={dials.conditions.toFixed(1)} scale={SCALES.conditions} v={dials.conditions}
                onChange={(x) => set('conditions', x)} />
              <Dial label="Lock-in pressure" hint="φ₀ — reaching for control"
                value={`${sci(dials.lockin)} a century`} scale={SCALES.lockin} v={dials.lockin}
                onChange={(x) => set('lockin', x)} />
              <div className={styles.ctrl}>
                <div className={styles.ctrlTop}>
                  <span className={styles.ctrlLabel}>Reach</span>
                  <span className={styles.ctrlVal}>floor {sci(floor)}</span>
                </div>
                <div className={styles.segmented}>
                  {(Object.keys(REACH) as Reach[]).map((r) => (
                    <button key={r} onClick={() => set('reach', r)} aria-pressed={dials.reach === r}
                      className={dials.reach === r ? styles.segOn : undefined}>
                      {REACH[r].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className={`${styles.reachNote} ${styles.col}`}>{REACH[dials.reach].note}</p>

          <div className={styles.wrap}>
            <div className={styles.gates}>
              <div className={styles.gate}>
                <span className={styles.gateLabel}>The ceiling</span>
                <span className={styles.gateNum}>{pct(model.ceiling)}</span>
                <span className={clearsLine ? styles.pass : styles.fail}>
                  {clearsLine ? 'clears the line' : `${model.ordersShort.toFixed(1)} orders short`}
                </span>
                <span className={styles.gateNote}>
                  Highest cultivated fraction ever reached, leaving {inEvery(1 - model.ceiling)}{' '}
                  outside, which holds the hazard at {sci(model.floorReached)} — set by{' '}
                  {reachBinds ? 'the sky at this reach' : 'the remainder it never cultivates'}. The
                  line permits {inEvery(model.remainderAllowed)} outside.
                </span>
              </div>
              <div className={styles.gate}>
                <span className={styles.gateLabel}>The crossing</span>
                <span className={styles.gateNum}>{model.crossingCost.toFixed(2)}</span>
                <span className={cheap ? styles.pass : styles.fail}>
                  {cheap ? 'affordable' : 'more than it can pay'}
                </span>
                <span className={styles.gateNote}>
                  Catastrophes drawn while crossing, over {years(model.crossingEnd)}. Civilizations
                  still moving at the far side: {pct(model.crossingOdds)}.
                </span>
              </div>
              <div className={styles.gate}>
                <span className={styles.gateLabel}>At a billion years</span>
                <span className={styles.gateNum}>{pct(model.deep.moving)}</span>
                <span className={model.deep.moving > 0.01 ? styles.pass : styles.fail}>
                  still moving
                </span>
                <span className={styles.gateNote}>
                  Frozen {pct(model.deep.frozen)} · ended {pct(model.deep.ended)}. Both conditions
                  have to hold; either one alone is a slower way of ending.
                </span>
              </div>
            </div>
          </div>

          <div className={styles.wrap}>
            <HazardPlate points={model.points} floor={floor} />
          </div>
        </div>
      </section>

      {/* ── III ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>III. The race</p>
          <h2>Two curves, and the gap between them</h2>
          <p>
            Capability compounds on a technological clock and cultivation on a cultural one, so by
            default the gap widens and the hazard rises. Both are drawn as a fraction of their own
            ceiling, which is the only honest way to put two quantities of different kinds on one
            axis.
          </p>
        </div>
        <EnginePlate points={model.points} />
        <p className={`${styles.footnote} ${styles.col}`}>
          Capability reaches half its ceiling in {years(dials.capDouble)}; cultivation reaches half
          the population in {model.halfway ? years(model.halfway) : 'never, at this forgetting rate'}.
          When the red curve is above the blue one, the civilization is holding instruments it has
          not yet learned to hold.
        </p>
      </section>

      {/* ── IV ── */}
      <section className={`${styles.section} ${styles.centuries}`}>
        <div className={styles.wrap}>
          <div className={`${styles.secHead} ${styles.col}`}>
            <p className={styles.eyebrow}>IV. The centuries</p>
            <h2>What it looks like from inside</h2>
            <p>
              Drag the year. Everything below is read off the model at that moment — which era the
              civilization is in, and which institutions have already dissolved. The dates are not
              written anywhere; they are the dials, and they move when you move them.
            </p>
          </div>

          <div className={styles.scrubWrap}>
            <input type="range" min={0} max={1000} value={scrub} className={styles.scrub}
              aria-label="Years from now" onChange={(e) => setScrub(Number(e.target.value))} />
            <div className={styles.scrubRead}>
              <span className={styles.scrubYear}>{years(now.t)}</span>
              <span className={styles.scrubMeta}>from now</span>
            </div>
          </div>

          <div className={styles.momentGrid}>
            <div className={styles.moment}>
              <span className={styles.momentLabel}>Cultivated</span>
              <span className={styles.momentNum}>{inEvery(now.s)}</span>
            </div>
            <div className={styles.moment}>
              <span className={styles.momentLabel}>Hazard</span>
              <span className={styles.momentNum}>{sci(now.lam)}</span>
            </div>
            <div className={styles.moment}>
              <span className={styles.momentLabel}>Still moving</span>
              <span className={styles.momentNum}>{pct(now.moving)}</span>
            </div>
            <div className={styles.moment}>
              <span className={styles.momentLabel}>Frozen</span>
              <span className={styles.momentNum}>{pct(now.frozen)}</span>
            </div>
            <div className={styles.moment}>
              <span className={styles.momentLabel}>Ended</span>
              <span className={styles.momentNum}>{pct(now.ended)}</span>
            </div>
          </div>

          <div className={`${styles.eraCard} ${styles.col}`}>
            <p className={styles.eyebrow}>{era.gloss}</p>
            <h3>{era.name}</h3>
            <p>{era.body}</p>
            <p className={styles.eraCaveat}>
              This is the path conditional on still being here. At this moment {pct(now.ended)} of
              civilizations that started where we are have already ended, and they never see it.
            </p>
          </div>

          <div className={styles.colWide}>
            <div className={styles.ledger}>
              <div className={styles.ledgerHead}>Dissolved</div>
              <div className={styles.ledgerHead}>What stands in its place</div>
              <div className={`${styles.ledgerHead} ${styles.right}`}>Crossed</div>
              {crossings.map(({ row, at }) => {
                const done = at !== null && at <= now.t
                const never = at === null
                return (
                  <div key={row.gone}
                    className={`${styles.ledgerRow} ${done ? styles.done : never ? styles.never : styles.ahead}`}>
                    <div className={styles.gone}>
                      <b>{row.gone}</b>
                      {row.body}
                    </div>
                    <div className={styles.stays}>
                      <b>{row.stays}</b>
                      <span className={styles.atMark}>at {inEvery(row.at)} cultivated</span>
                    </div>
                    <div className={styles.when}>
                      {never ? <em>never</em> : done ? years(at) : `in ${years(at)}`}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className={styles.footnote}>
              Rows marked <em>never</em> sit above the ceiling s* = {pct(model.ceiling)}. A
              civilization at this forgetting rate gets partway down the list and stops — not because
              it was stopped, but because the fraction it needed was never going to be reached. That
              is the most quietly alarming output on the page: a civilization can complete most of
              its transformation and still be four orders of magnitude from permanence.
            </p>
          </div>
        </div>
      </section>

      {/* ── V ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>V. What actually moves it</p>
          <h2>The bars are the research agenda</h2>
          <p>
            Each dial is nudged by a tenth and the bar shows what that does to{' '}
            {sens.basis === 'deep'
              ? 'the chance of still moving at a billion years'
              : 'the chance of completing the crossing at all — the deep-time number is already zero at these settings, so nudging it moves zero to zero'}
            , in orders of magnitude. Whichever bar is longest is where the argument is worth having.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.bars}>
            {sens.bars.map((b) => {
              const max = Math.max(...sens.bars.map((x) => Math.abs(x.effect)), 0.05)
              return (
                <div key={b.key} className={styles.bar}>
                  <span className={styles.barLabel}>{b.label}</span>
                  <span className={styles.barTrack}>
                    <span className={styles.barFill}
                      style={{ width: `${(Math.abs(b.effect) / max) * 100}%`, background: SERIES.moving }} />
                  </span>
                  <span className={styles.barVal}>
                    {b.effect >= 0 ? '+' : '−'}
                    {Math.abs(b.effect).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className={styles.footnote}>
            The ranking is not stable across the parameter space, and that is the finding rather than
            a defect. Where the crossing is the binding constraint, the rates dominate and forgetting
            barely registers. Once the crossing is affordable, forgetting and reach take over,
            because they are what set the floor the civilization then has to hold for ten million
            centuries. A model whose sensitivities did not change would not be telling you anything.
          </p>
        </div>
      </section>

      {/* ── VI ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VI. The other failure</p>
          <h2>Surviving is not the same as being here</h2>
        </div>
        <div className={styles.col}>
          <p>
            Minimising the hazard and keeping the thing worth saving are not the same objective, and
            past a point they pull against each other. A civilization frightened by its own numbers
            reaches for control, and control applied hard enough does lower the hazard — by ending
            the argument. What is left survives without being able to change, which is why the model
            gives frozen civilizations the hazard they froze with, permanently. They are not safe.
            They are stopped, at whatever rate they stopped at.
          </p>
          <p>
            This is where the corpus&rsquo;s own standing rule turns into a modelling parameter. A
            tradition that resolves its genuine tensions has locked in; one that holds them open
            keeps the capacity to correct, and pays for it in permanent unease. Lock-in pressure is
            the dial for how much unease a civilization will tolerate before it reaches for
            certainty — and at{' '}
            <span className={styles.mono}>φ₀ = {sci(dials.lockin)}</span> the model puts{' '}
            <strong>{pct(model.deep.frozen)}</strong> of civilizations in that state at a billion
            years, against {pct(model.deep.moving)} still moving.
          </p>
          <p>
            Reach cuts the same way in the other direction. Spreading across many stars drops the
            floor below the line, and it converts the surviving population into branches that cannot
            stay in contact — so the extinction term falls and a divergence term nobody has modelled
            here rises in its place. There is no setting on this page that removes the tradeoff. That
            is not a limitation of the instrument; it is the shape of the problem.
          </p>
        </div>
      </section>

      {/* ── VII ── */}
      <section className={`${styles.section} ${styles.wrap}`}>
        <div className={`${styles.secHead} ${styles.col}`}>
          <p className={styles.eyebrow}>VII. The numbers themselves</p>
          <h2>The same run, as a table</h2>
          <p>
            Every plate above is drawn from this. It is here because a chart that identifies a band
            by colour has not told a reader who cannot separate those colours anything at all.
          </p>
        </div>
        <div className={styles.colWide}>
          <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>From now</th>
                <th>Cultivated</th>
                <th>Hazard / century</th>
                <th>Still moving</th>
                <th>Frozen</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((p) => (
                <tr key={p.t}>
                  <td>{years(p.t)}</td>
                  <td>{inEvery(p.s)}</td>
                  <td>{sci(p.lam)}</td>
                  <td>{pct(p.moving)}</td>
                  <td>{pct(p.frozen)}</td>
                  <td>{pct(p.ended)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* ── VIII ── */}
      <section className={`${styles.section} ${styles.close}`}>
        <div className={`${styles.wrap} ${styles.col}`}>
          <p className={styles.eyebrow}>VIII. What this is not</p>
          <h2>A reasoning instrument, not a forecast</h2>
          <p>
            There is one civilization, no out-of-sample test, and a selection effect that biases
            every base rate here optimistic: only survivors are around to estimate their own odds.
            Past a few centuries the parameters are structured speculation and should be read that
            way. The model earns its keep in three places and no others — the orders-of-magnitude
            reframe in section I, the ranking in section V, and the discipline of having to write the
            assumptions down where someone can disagree with them.
          </p>
          <p>
            What would make it a model rather than an essay is the thing it does not have yet: an
            annual update, scored. Freeze the dials each year as a versioned record, publish
            predictions for the observable proxies at one, five and ten years — concentration of
            unilateral catastrophic capacity, crisis decision latency, elite time horizon,
            intergenerational drift, institutional memory depth — and then score them. Twenty years
            of that is what makes a long-range model worth listening to, and the short-horizon
            proxies are the only part of any of this that ever touches reality.
          </p>
          <p className={styles.footnote}>
            The softest numbers, named: <span className={styles.mono}>k</span>, which no one has
            measured and which the deep-time answer is exponentially sensitive to; the claim that
            hazard falls with the uncultivated remainder at all, rather than with the disposition of
            the few hundred people who actually hold the instruments; the treatment of forgetting as
            a constant fraction of cultivation rather than something that varies with what a
            civilization has built to remember with; and the phoenix rate, which was a remark about
            rarity in a letter, not a census.
          </p>
        </div>
      </section>

      <footer className={`${styles.wrap} ${styles.colophon}`}>
        <p className={`${styles.footnote} ${styles.mono} ${styles.colophonLine}`}>
          Arete &nbsp;·&nbsp; working note &nbsp;·&nbsp; s₀ from Seneca, ep. 42 &nbsp;·&nbsp; subject
          to revision
        </p>
      </footer>
    </main>
  )
}

/** One labelled dial on a log or linear track. */
function Dial({
  label,
  hint,
  value,
  scale,
  v,
  onChange,
}: {
  label: string
  hint: string
  value: string
  scale: { from: (n: number) => number; to: (n: number) => number }
  v: number
  onChange: (x: number) => void
}) {
  const id = `pg-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className={styles.ctrl}>
      <div className={styles.ctrlTop}>
        <label className={styles.ctrlLabel} htmlFor={id}>
          {label}
        </label>
        <span className={styles.ctrlVal}>{value}</span>
      </div>
      <input type="range" id={id} min={0} max={100} step={0.5} value={scale.to(v)}
        onChange={(e) => onChange(scale.from(Number(e.target.value)))} />
      <span className={styles.ctrlHint}>{hint}</span>
    </div>
  )
}
