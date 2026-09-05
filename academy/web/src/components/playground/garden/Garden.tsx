'use client'

import { useState } from 'react'
import Link from 'next/link'
import { parts, pictures, gardenSources, type PartId } from '@/content/playground/garden'
import GardenShell, { PART_SWATCH } from './GardenShell'
import styles from './Garden.module.css'

// ── the drawing ──────────────────────────────────────────────────────────────
//
// A cutaway of a walled garden: a low back wall with a gate, a pillar at each
// end, three fruit trees standing in a bed of soil that the cut exposes. The
// wall is logic, the soil and the trees are physics, the fruit is ethics.

const INK = '#16140f'
const STONE = '#a9a08c'
const STONE_DK = '#8b8371'
const SOIL = '#5a4229'
const SOIL_LIT = '#7a5a36'
const ROOT = '#a08560'
const BARK = '#4f3a28'
const LEAF = '#5f7a4a'
const LEAF_LIT = '#7a9460'
const LEAF_DEAD = '#5a574c'
const FRUIT = '#b8473f'
const FRUIT_LIT = '#d4655a'
const WEED = '#6d6a3a'

const GROUND = 300

function Course({ y, h, x0, x1, offset }: { y: number; h: number; x0: number; x1: number; offset: number }) {
  const w = 46
  const stones: React.ReactNode[] = []
  for (let x = x0 - (offset % w); x < x1; x += w) {
    const sx = Math.max(x0, x)
    const ex = Math.min(x1, x + w - 3)
    if (ex - sx < 6) continue
    stones.push(
      <rect key={x} x={sx} y={y} width={ex - sx} height={h - 3} rx={3} fill={STONE} stroke={INK} strokeWidth={1.5} />,
    )
  }
  return <>{stones}</>
}

function Wall({ x0, x1, top, bottom }: { x0: number; x1: number; top: number; bottom: number }) {
  const rows: React.ReactNode[] = []
  let i = 0
  for (let y = top; y < bottom; y += 20, i++) {
    rows.push(<Course key={y} y={y} h={Math.min(20, bottom - y)} x0={x0} x1={x1} offset={i % 2 ? 23 : 0} />)
  }
  return <>{rows}</>
}

function Pillar({ x, top }: { x: number; top: number }) {
  return (
    <g>
      <rect x={x} y={top} width={34} height={GROUND - top} rx={3} fill={STONE_DK} stroke={INK} strokeWidth={1.5} />
      <rect x={x - 5} y={top - 10} width={44} height={12} rx={2} fill={STONE} stroke={INK} strokeWidth={1.5} />
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1={x} x2={x + 34} y1={top + 24 + k * 24} y2={top + 24 + k * 24} stroke={INK} strokeWidth={1} opacity={0.6} />
      ))}
    </g>
  )
}

function Tree({ x, dead, bare }: { x: number; dead: boolean; bare: boolean }) {
  const leaf = dead ? LEAF_DEAD : LEAF
  const leafLit = dead ? '#6b685c' : LEAF_LIT
  return (
    <g>
      <rect x={x - 11} y={GROUND - 78} width={22} height={80} rx={5} fill={BARK} stroke={INK} strokeWidth={1.5} />
      <path d={`M ${x - 14} ${GROUND - 40} L ${x - 30} ${GROUND - 70}`} stroke={BARK} strokeWidth={9} strokeLinecap="round" />
      <path d={`M ${x + 14} ${GROUND - 48} L ${x + 30} ${GROUND - 80}`} stroke={BARK} strokeWidth={9} strokeLinecap="round" />
      {!bare && (
        <>
          <circle cx={x - 34} cy={GROUND - 100} r={38} fill={leaf} stroke={INK} strokeWidth={1.5} />
          <circle cx={x + 34} cy={GROUND - 104} r={40} fill={leaf} stroke={INK} strokeWidth={1.5} />
          <circle cx={x} cy={GROUND - 130} r={46} fill={leafLit} stroke={INK} strokeWidth={1.5} />
          <circle cx={x} cy={GROUND - 92} r={40} fill={leaf} stroke="none" />
        </>
      )}
    </g>
  )
}

function Roots({ x }: { x: number }) {
  return (
    <g stroke={ROOT} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.85}>
      <path d={`M ${x} ${GROUND + 2} Q ${x - 10} ${GROUND + 40} ${x - 46} ${GROUND + 70}`} />
      <path d={`M ${x} ${GROUND + 2} Q ${x + 14} ${GROUND + 44} ${x + 50} ${GROUND + 62}`} />
      <path d={`M ${x} ${GROUND + 2} L ${x + 4} ${GROUND + 96}`} />
      <path d={`M ${x - 6} ${GROUND + 30} Q ${x - 30} ${GROUND + 40} ${x - 40} ${GROUND + 34}`} strokeWidth={2.5} />
      <path d={`M ${x + 8} ${GROUND + 50} Q ${x + 30} ${GROUND + 66} ${x + 26} ${GROUND + 88}`} strokeWidth={2.5} />
    </g>
  )
}

const FRUIT_AT: [number, number][] = [
  [-40, -88],
  [-8, -142],
  [30, -120],
  [46, -80],
  [2, -100],
  [-30, -120],
]

function Fruits({ x }: { x: number }) {
  return (
    <g>
      {FRUIT_AT.map(([dx, dy], i) => (
        <g key={i}>
          <circle cx={x + dx} cy={GROUND + dy} r={9} fill={FRUIT} stroke={INK} strokeWidth={1.5} />
          <circle cx={x + dx - 3} cy={GROUND + dy - 3} r={3} fill={FRUIT_LIT} />
        </g>
      ))}
    </g>
  )
}

function Weed({ x, h }: { x: number; h: number }) {
  return (
    <g stroke={WEED} strokeWidth={3} strokeLinecap="round" fill="none">
      <path d={`M ${x} ${GROUND} Q ${x - 6} ${GROUND - h / 2} ${x + 2} ${GROUND - h}`} />
      <path d={`M ${x - 1} ${GROUND - h * 0.55} L ${x - 16} ${GROUND - h * 0.75}`} />
      <path d={`M ${x + 1} ${GROUND - h * 0.4} L ${x + 16} ${GROUND - h * 0.62}`} />
      <path d={`M ${x + 2} ${GROUND - h} l -8 -9 M ${x + 2} ${GROUND - h} l 9 -8 M ${x + 2} ${GROUND - h} l 0 -12`} strokeWidth={2.5} />
    </g>
  )
}

const TREES = [190, 400, 610]

function GardenSvg({ focus, removed }: { focus: PartId | null; removed: Set<PartId> }) {
  const cls = (id: PartId) =>
    `${styles.part} ${removed.has(id) ? styles.partGone : focus && focus !== id ? styles.partDim : ''}`
  const noSoil = removed.has('physics')
  const noWall = removed.has('logic')

  return (
    <svg className={styles.gardenSvg} viewBox="0 0 800 430" role="img" aria-label="A walled garden in cutaway: the wall, the soil and trees, and the fruit">
      {/* the soil (physics) */}
      <g className={cls('physics')} data-part="physics">
        <path
          d={`M 40 ${GROUND} L 760 ${GROUND} L 760 420 L 40 420 Z`}
          fill={SOIL}
          stroke={INK}
          strokeWidth={1.5}
        />
        <path d={`M 40 ${GROUND} L 760 ${GROUND} L 760 ${GROUND + 14} L 40 ${GROUND + 14} Z`} fill={SOIL_LIT} />
        {TREES.map((x) => (
          <Roots key={x} x={x} />
        ))}
        {[90, 140, 300, 520, 700].map((x, i) => (
          <ellipse key={x} cx={x} cy={GROUND + 40 + (i % 3) * 22} rx={7} ry={4} fill={SOIL_LIT} />
        ))}
        {/* the cut edge */}
        <line x1={40} x2={40} y1={GROUND} y2={420} stroke={INK} strokeWidth={2} />
        <line x1={760} x2={760} y1={GROUND} y2={420} stroke={INK} strokeWidth={2} />
      </g>

      {/* the back wall and pillars (logic) */}
      <g className={cls('logic')} data-part="logic">
        <Wall x0={40} x1={368} top={216} bottom={GROUND} />
        <Wall x0={432} x1={760} top={216} bottom={GROUND} />
        <rect x={40} y={208} width={328} height={10} rx={2} fill={STONE} stroke={INK} strokeWidth={1.5} />
        <rect x={432} y={208} width={328} height={10} rx={2} fill={STONE} stroke={INK} strokeWidth={1.5} />
        <Pillar x={360} top={186} />
        <Pillar x={406} top={186} />
        <Pillar x={40} top={172} />
        <Pillar x={726} top={172} />
        {/* the gate, standing open */}
        <path d={`M 394 ${GROUND} L 394 214 L 372 208 L 372 ${GROUND - 6} Z`} fill={BARK} stroke={INK} strokeWidth={1.5} />
        <line x1={376} x2={390} y1={240} y2={236} stroke={INK} strokeWidth={1} />
        <line x1={376} x2={390} y1={270} y2={266} stroke={INK} strokeWidth={1} />
      </g>

      {/* the trees (physics) */}
      <g className={cls('physics')} data-part="physics">
        {TREES.map((x) => (
          <Tree key={x} x={x} dead={noSoil} bare={false} />
        ))}
      </g>

      {/* the fruit (ethics) */}
      <g className={`${cls('ethics')} ${noSoil ? styles.partGone : ''}`} data-part="ethics">
        {TREES.map((x) => (
          <Fruits key={x} x={x} />
        ))}
      </g>

      {/* weeds, when the wall is gone */}
      <g className={`${styles.weeds} ${noWall ? '' : styles.hidden}`} aria-hidden="true">
        {[110, 150, 285, 330, 480, 540, 680, 720, 760].map((x, i) => (
          <Weed key={x} x={x} h={38 + (i % 3) * 14} />
        ))}
      </g>

    </svg>
  )
}

// ── component ────────────────────────────────────────────────────────────────

export default function Garden() {
  const [pinned, setPinned] = useState<PartId | null>(null)
  const [hover, setHover] = useState<PartId | null>(null)
  const [removed, setRemoved] = useState<Set<PartId>>(new Set())

  const focus = hover ?? pinned
  const part = parts.find((p) => p.id === (pinned ?? hover ?? 'ethics')) ?? parts[2]

  const toggleRemoved = (id: PartId) =>
    setRemoved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <GardenShell
      part={null}
      eyebrow="Arete Academy · The Playground"
      title="The Garden"
      lede="The Stoics said their philosophy had three parts and that the parts were one thing, and to show it they drew a fertile field: logic the wall around it, physics the soil and the trees, ethics the fruit. Walk it, then take a part away and see what is left."
      threadKey="garden"
      context={
        'The Playground experiment "The Garden": Diogenes Laertius 7.40 reports that the Stoics compared philosophy to a fertile field, with logic as the surrounding wall, physics as the soil or the trees, and ethics as the fruit (alongside the egg and the living-creature pictures). The experiment lets the reader select each part and remove it to see that the three are interdependent: without logic false beliefs get in, without physics "live according to nature" has no content, without ethics the other two have no point. The reader is responding to this picture of Stoicism as one interconnected whole.'
      }
      discussHeading="Take it up with the corpus"
      discussPlaceholder="Is the garden really one thing? Which wall would you tear down first? The corpus will answer."
    >
      <section className={styles.section} aria-labelledby="walk-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>I · Walk the garden</p>
          <h2 id="walk-h" className={styles.h2}>
            Three parts, one plot of ground
          </h2>
          <p className={styles.sectionLede}>
            Choose a part to see what it is doing here, then step through the
            gate into its bed.
          </p>
        </div>

        <div className={styles.gardenGrid}>
          <div className={styles.gardenCol}>
            <div className={styles.gardenPlate} onMouseLeave={() => setHover(null)}>
              <div
                onClick={(e) => {
                  const t = (e.target as Element).closest('[data-part]') as HTMLElement | null
                  if (t?.dataset.part) setPinned(t.dataset.part as PartId)
                }}
              >
                <GardenSvg focus={focus} removed={removed} />
              </div>
            </div>

            <div className={styles.legend} role="group" aria-label="Parts of the garden">
              {parts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.legendBtn} ${part.id === p.id ? styles.legendBtnOn : ''}`}
                  style={{ ['--swatch' as string]: PART_SWATCH[p.id] }}
                  aria-pressed={pinned === p.id}
                  onMouseEnter={() => setHover(p.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(p.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => setPinned((cur) => (cur === p.id ? null : p.id))}
                >
                  <span className={styles.legendKicker}>{p.figure}</span>
                  <span className={styles.legendName}>{p.name}</span>
                  <span className={styles.legendFigure}>{p.line}</span>
                </button>
              ))}
            </div>

            <div className={styles.remove}>
              <p className={styles.removeLabel}>Take one away</p>
              <div className={styles.removeRow}>
                {parts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.removeBtn} ${removed.has(p.id) ? styles.removeBtnOn : ''}`}
                    aria-pressed={removed.has(p.id)}
                    onClick={() => toggleRemoved(p.id)}
                  >
                    {removed.has(p.id) ? `Put back ${p.figure.toLowerCase()}` : `Remove ${p.figure.toLowerCase()}`}
                  </button>
                ))}
              </div>
              {[...removed].map((id) => {
                const p = parts.find((x) => x.id === id)!
                return (
                  <p key={id} className={styles.without}>
                    <strong>Without {p.name.toLowerCase()}.</strong> {p.without}
                  </p>
                )
              })}
            </div>
          </div>

          <div className={styles.gardenCol}>
            <article className={styles.partCard} key={part.id} style={{ ['--accent' as string]: PART_SWATCH[part.id] }}>
              <p className={styles.partTerms}>
                <em>{part.greek}</em>
                <span>{part.figure}</span>
              </p>
              <h3 className={styles.partName}>{part.name}</h3>
              <p className={styles.partLine}>{part.line}</p>
              <p className={styles.partGloss}>{part.gloss}</p>
              <Link href={part.href} className={styles.goLink}>
                {part.go} →
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pictures-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>II · The three pictures</p>
          <h2 id="pictures-h" className={styles.h2}>
            A field, an egg, an animal
          </h2>
          <p className={styles.sectionLede}>
            The field was one of three images Diogenes Laertius records. All
            three make the same point: the parts are not a curriculum but an
            anatomy, and you cannot have one without the others.
          </p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.pictures}>
            <thead>
              <tr>
                <th>Picture</th>
                <th>Logic</th>
                <th>Physics</th>
                <th>Ethics</th>
              </tr>
            </thead>
            <tbody>
              {pictures.map((pic) => (
                <tr key={pic.id}>
                  <td>{pic.name}</td>
                  <td>{pic.logic}</td>
                  <td>{pic.physics}</td>
                  <td>{pic.ethics}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.prose} style={{ marginTop: '1.6rem' }}>
          <p>
            Notice that physics gets the soul of the animal and the yolk of the
            egg, the part the rest grows from, and that in every picture ethics
            is what you would actually want: the flesh, the white, the fruit.
            Logic is never the point and always the boundary.
          </p>
          <p>
            The school argued about where to begin. Zeno and Chrysippus taught
            logic first; Diogenes of Ptolemais began with ethics; others with
            physics. Chrysippus also said that physics comes last in the order
            of teaching and that its study is undertaken only to tell good from
            bad. The garden settles the question a different way. There is no
            first part of a garden. There is only the whole of it, or a plot of
            weeds.
          </p>
        </div>
        <ul className={styles.sources}>
          {gardenSources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </GardenShell>
  )
}
