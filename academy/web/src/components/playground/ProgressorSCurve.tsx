import styles from './LongFilterWalkthrough.module.css'

/**
 * The progressor S curve for the walkthrough's Step 3: the logistic solution
 * s(t) = s_max / (1 + ((s_max − s₀) / s₀)·e^(−g·t)) at the guide's teaching
 * values, plotted as a percentage over the first 3,000 years. Drawn as static
 * SVG on the plate, in the essay's palette: indigo for the progressors, oxide
 * for the midpoint, mono for every label.
 */

const S_MAX = 0.99
const S0 = 1e-9
const G = 0.01
const T_END = 3000

const share = (t: number) => S_MAX / (1 + ((S_MAX - S0) / S0) * Math.exp(-G * t))
const MIDPOINT = Math.log((S_MAX - S0) / S0) / G // ≈ 2,072 years

// Plot frame, in viewBox units.
const W = 480
const H = 300
const M = { top: 16, right: 14, bottom: 44, left: 48 }
const PW = W - M.left - M.right
const PH = H - M.top - M.bottom

const x = (t: number) => M.left + (t / T_END) * PW
const y = (pct: number) => M.top + (1 - pct / 100) * PH

const X_TICKS = [0, 500, 1000, 1500, 2000, 2500, 3000]
const Y_TICKS = [0, 25, 50, 75, 100]

const PATH = Array.from({ length: 301 }, (_, i) => {
  const t = (i / 300) * T_END
  return `${i === 0 ? 'M' : 'L'}${x(t).toFixed(2)},${y(share(t) * 100).toFixed(2)}`
}).join(' ')

const AT_1000 = share(1000) * 100 // ≈ 0.0022%

const TITLE = 'Progressors stay near zero for 1,500 years, then rise fast.'

export default function ProgressorSCurve() {
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figTitle}>{TITLE}</figcaption>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${TITLE} The progressor share is about ${AT_1000.toFixed(4)}% at year 1,000, reaches half its ceiling near year 2,070, and levels off at 99% by year 3,000.`}
      >
        {Y_TICKS.map((v) => (
          <g key={`y${v}`}>
            <line className={styles.grid} x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} />
            <text className={styles.tick} x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
              {v}%
            </text>
          </g>
        ))}
        {X_TICKS.map((t) => (
          <text key={`x${t}`} className={styles.tick} x={x(t)} y={H - M.bottom + 16} textAnchor="middle">
            {t.toLocaleString('en-US')}
          </text>
        ))}
        <text className={styles.axisLabel} x={M.left + PW / 2} y={H - 6} textAnchor="middle">
          Years since the transition began
        </text>

        <line className={styles.midLine} x1={x(MIDPOINT)} x2={x(MIDPOINT)} y1={M.top} y2={M.top + PH} />
        <text className={styles.midLabel} x={x(MIDPOINT) - 6} y={M.top + 12} textAnchor="end">
          Midpoint, year 2,070
        </text>

        <path className={styles.curve} d={PATH} />

        <circle className={styles.point} cx={x(1000)} cy={y(AT_1000)} r={3.5} />
        <text className={styles.pointLabel} x={x(1000)} y={y(AT_1000) - 12} textAnchor="middle">
          Year 1,000: about {AT_1000.toFixed(4)}%
        </text>
      </svg>
    </figure>
  )
}
