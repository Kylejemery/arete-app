'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  instruments,
  LIFE_YEARS,
  PRESENT_YEAR,
  AGE_MIN,
  AGE_MAX,
  AGE_DEFAULT,
  type Instrument,
} from '@/content/playground/instruments'
import styles from './ViewFromAbove.module.css'

type Kind<K extends Instrument['kind']> = Extract<Instrument, { kind: K }>

// ── shared maths ─────────────────────────────────────────────────────────────

const WINDOW = {
  calendar: 365 * 86400,
  clock: 86400,
  stopwatch: 3600,
  week: 7 * 86400,
} as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function twelveHour(h: number, m: number, s: number, withSeconds: boolean): string {
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  const mm = String(m).padStart(2, '0')
  return withSeconds ? `${h12}:${mm}:${String(s).padStart(2, '0')} ${ap}` : `${h12}:${mm} ${ap}`
}

/** The compressed timestamp for a fraction along a timeline scale. */
function stamp(f: number, scale: Kind<'timeline'>, ended = false): string {
  const window = WINDOW[scale.frame]
  const elapsed = f * window
  switch (scale.frame) {
    case 'calendar': {
      if (ended) return 'Dec 31 · Midnight'
      const d = new Date(Date.UTC(2001, 0, 1) + elapsed * 1000)
      const withSeconds = elapsed > window - 86400
      return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${twelveHour(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), withSeconds)}`
    }
    case 'clock': {
      if (ended) return 'Midnight'
      const d = new Date(Date.UTC(2001, 0, 1) + elapsed * 1000)
      const withSeconds = elapsed > window - 300
      return twelveHour(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), withSeconds)
    }
    case 'stopwatch': {
      if (ended) return '60:00'
      const total = Math.floor(elapsed)
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }
    case 'week': {
      if (ended) return 'Sun · Midnight'
      const dayIdx = Math.min(6, Math.floor(elapsed / 86400))
      const within = elapsed - dayIdx * 86400
      const d = new Date(Date.UTC(2001, 0, 1) + within * 1000)
      return `${DAYS[dayIdx]} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    }
  }
}

/** Compressed duration, e.g. 0.18 seconds / 2.7 hours. */
function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Number(seconds.toPrecision(2))} seconds`
  if (seconds < 90) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} seconds`
  if (seconds < 5400) return `${(seconds / 60).toFixed(1)} minutes`
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} hours`
  return `${(seconds / 86400).toFixed(1)} days`
}

/** A span of years, phrased for humans. */
function bigYears(years: number): string {
  if (years < 1e3) return `${Math.round(years)} years`
  if (years < 1e6) return `${Math.round(years).toLocaleString()} years`
  if (years < 1e9) return `${+(years / 1e6).toFixed(1)} million years`
  if (years < 1e12) return `${+(years / 1e9).toFixed(1)} billion years`
  const exp = Math.round(Math.log10(years))
  return `10^${exp} years`
}

/** A short magnitude tag for the future list, e.g. "+5B yr" or "10^14 yr". */
function aheadTag(years: number): string {
  const exp = Math.round(Math.log10(years))
  if (exp >= 13) return `10^${exp} yr`
  if (years >= 1e9) return `+${+(years / 1e9).toPrecision(2)}B yr`
  if (years >= 1e6) return `+${+(years / 1e6).toPrecision(2)}M yr`
  if (years >= 1e3) return `+${(years / 1e3).toLocaleString()}k yr`
  return `+${years} yr`
}

function intWithCommas(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

const START_LABEL = {
  calendar: 'Jan 1',
  clock: 'Midnight',
  stopwatch: '00:00',
  week: 'Mon',
} as const

// ── component ────────────────────────────────────────────────────────────────

export default function ViewFromAbove({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [activeId, setActiveId] = useState(instruments[0].id)
  const [age, setAge] = useState(AGE_DEFAULT)

  const inst = instruments.find((s) => s.id === activeId) ?? instruments[0]

  const groups = useMemo(() => {
    const out: { section: string; items: Instrument[] }[] = []
    for (const item of instruments) {
      const g = out.find((x) => x.section === item.section)
      if (g) g.items.push(item)
      else out.push({ section: item.section, items: [item] })
    }
    return out
  }, [])

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href={backHref} className={styles.backLink}>
          {backLabel}
        </Link>
      </div>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Arete Academy · The Playground</p>
        <h1 className={styles.title}>The View from Above</h1>
        <p className={styles.lede}>
          The oldest Stoic exercise is to rise, in the mind, until the whole of
          things is in view — and to see how brief, how small, and how
          astonishing your place in it is. Fifteen instruments for the ascent.
        </p>
      </header>

      <div className={styles.layout}>
        <nav className={styles.rail} aria-label="Instruments">
          {groups.map((g) => (
            <div key={g.section} className={styles.railGroup}>
              <p className={styles.railGroupLabel}>{g.section}</p>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  className={`${styles.railItem} ${s.id === activeId ? styles.railItemActive : ''}`}
                  aria-current={s.id === activeId}
                  onClick={() => setActiveId(s.id)}
                >
                  <span className={styles.railKicker}>{s.kicker}</span>
                  <span className={styles.railName}>{s.name}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className={styles.main}>
          <Header inst={inst} />
          <Body inst={inst} age={age} setAge={setAge} />
          <Reflection inst={inst} />
        </section>
      </div>
    </main>
  )
}

// ── header + reflection ──────────────────────────────────────────────────────

function Header({ inst }: { inst: Instrument }) {
  return (
    <div className={styles.scaleHead}>
      <h2 className={styles.scaleName}>{inst.name}</h2>
      {inst.kind === 'timeline' ? (
        <p className={styles.mapping}>
          <span className={styles.mappingSpan}>{inst.spanLabel}</span>
          <span className={styles.mappingArrow}>compressed into</span>
          <span className={styles.mappingSpan}>{inst.intoLabel}</span>
        </p>
      ) : inst.mapping ? (
        <p className={styles.mappingText}>{inst.mapping}</p>
      ) : null}
      {inst.ratio && <p className={styles.ratio}>{inst.ratio}</p>}
      <p className={styles.blurb}>{inst.blurb}</p>
    </div>
  )
}

function Reflection({ inst }: { inst: Instrument }) {
  return (
    <figure className={styles.reflection}>
      <figcaption className={styles.reflectionRef}>
        <span className={styles.diamond} />
        From the tradition
      </figcaption>
      <blockquote className={styles.reflectionText}>
        “{inst.reflection.text}”
        <cite className={styles.reflectionBy}>— {inst.reflection.by}</cite>
      </blockquote>
    </figure>
  )
}

// ── body dispatch ────────────────────────────────────────────────────────────

function Body({ inst, age, setAge }: { inst: Instrument; age: number; setAge: (n: number) => void }) {
  switch (inst.kind) {
    case 'timeline':
      return <TimelineBody inst={inst} age={age} setAge={setAge} />
    case 'future':
      return <FutureBody inst={inst} />
    case 'relay':
      return <RelayBody inst={inst} />
    case 'generations':
      return <GenerationsBody inst={inst} />
    case 'weeks':
      return <WeeksBody inst={inst} age={age} setAge={setAge} />
    case 'heartbeat':
      return <HeartbeatBody inst={inst} age={age} setAge={setAge} />
    case 'peppercorn':
      return <PeppercornBody inst={inst} />
    case 'powers':
      return <PowersBody inst={inst} />
    case 'travel':
      return <TravelBody inst={inst} />
    case 'emptyAtom':
      return <EmptyAtomBody inst={inst} />
    case 'numbers':
      return <NumbersBody inst={inst} />
  }
}

// ── shared: age control ──────────────────────────────────────────────────────

function AgeControl({
  age,
  setAge,
  readout,
}: {
  age: number
  setAge: (n: number) => void
  readout: React.ReactNode
}) {
  return (
    <div className={styles.ageBox}>
      <div className={styles.ageTop}>
        <span className={styles.ageLabel}>Set the hand to your age</span>
        <span className={styles.ageReadout}>{readout}</span>
      </div>
      <input
        className={styles.slider}
        type="range"
        min={AGE_MIN}
        max={AGE_MAX}
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
        aria-label="Your age"
      />
      <div className={styles.sliderScale}>
        <span>Birth</span>
        <span>{AGE_MAX} yrs</span>
      </div>
    </div>
  )
}

// ── timeline ─────────────────────────────────────────────────────────────────

function TimelineBody({
  inst,
  age,
  setAge,
}: {
  inst: Kind<'timeline'>
  age: number
  setAge: (n: number) => void
}) {
  const isLife = inst.anchor === 'birth'
  const fractionOf = (ev: (typeof inst.events)[number]) =>
    clamp01(isLife ? (ev.atAge ?? 0) / inst.spanYears : 1 - (ev.yearsAgo ?? 0) / inst.spanYears)
  const ageFraction = clamp01(age / inst.spanYears)
  const lifeSeconds = (LIFE_YEARS / inst.spanYears) * WINDOW[inst.frame]

  return (
    <>
      {isLife && (
        <AgeControl
          age={age}
          setAge={setAge}
          readout={
            <>
              It is <strong>{stamp(ageFraction, inst, ageFraction >= 1)}</strong> — age {age}
            </>
          }
        />
      )}

      <div className={styles.barWrap}>
        <div className={styles.bar} aria-hidden="true">
          {inst.events.map((ev, i) => {
            const f = fractionOf(ev)
            return (
              <span
                key={i}
                className={`${styles.tick} ${ev.emphasis ? styles.tickEmphasis : ''}`}
                style={{ left: `${f * 100}%` }}
                title={`${ev.label} — ${stamp(f, inst, f >= 1)}`}
              >
                <span className={styles.tickDot} />
              </span>
            )
          })}
          {isLife && (
            <span
              className={`${styles.tick} ${styles.tickEmphasis}`}
              style={{ left: `${ageFraction * 100}%` }}
            >
              <span className={styles.tickDot} />
            </span>
          )}
        </div>
        <div className={styles.barEnds}>
          <span>{START_LABEL[inst.frame]}</span>
          <span>{isLife ? 'The end of the day' : 'Now'}</span>
        </div>
        <p className={styles.barCaption}>
          {isLife
            ? 'Each mark is a stage of life; the bright line is you.'
            : 'Each mark is an event. Notice how everything you have a name for is pressed against the right-hand edge.'}
        </p>
      </div>

      <ol className={styles.events}>
        {inst.events.map((ev, i) => {
          const f = fractionOf(ev)
          return (
            <li key={i} className={`${styles.event} ${ev.emphasis ? styles.eventEmphasis : ''}`}>
              <span className={styles.eventStamp}>{stamp(f, inst, f >= 1)}</span>
              <span className={styles.eventBody}>
                <span className={styles.eventLabel}>{ev.label}</span>
                {ev.detail && <span className={styles.eventDetail}>{ev.detail}</span>}
              </span>
            </li>
          )
        })}
      </ol>

      {!isLife && (
        <div className={styles.lifeStat}>
          <p className={styles.lifeStatLabel}>Where you fit</p>
          <p className={styles.lifeStatValue}>
            A whole human life — eighty years — lasts <strong>{formatDuration(lifeSeconds)}</strong> on this scale.
          </p>
        </div>
      )}
    </>
  )
}

// ── future (log axis) ────────────────────────────────────────────────────────

function FutureBody({ inst }: { inst: Kind<'future'> }) {
  const fOf = (yearsAhead: number) => clamp01(Math.log10(yearsAhead) / 100)
  return (
    <>
      <div className={styles.barWrap}>
        <div className={styles.bar} aria-hidden="true">
          <span className={`${styles.tick} ${styles.tickEmphasis}`} style={{ left: '0%' }}>
            <span className={styles.tickDot} />
          </span>
          {inst.events.map((ev, i) => {
            const f = fOf(ev.yearsAhead)
            return (
              <span
                key={i}
                className={`${styles.tick} ${ev.emphasis ? styles.tickEmphasis : ''}`}
                style={{ left: `${f * 100}%` }}
                title={`${ev.label} — ${aheadTag(ev.yearsAhead)}`}
              >
                <span className={styles.tickDot} />
              </span>
            )
          })}
        </div>
        <div className={styles.barEnds}>
          <span>Now</span>
          <span>10^100 yr</span>
        </div>
        <p className={styles.barCaption}>
          Every step to the right is ten times further ahead — so nearly the whole width is still to come.
        </p>
      </div>

      <ol className={styles.events}>
        {inst.events.map((ev, i) => (
          <li key={i} className={`${styles.event} ${ev.emphasis ? styles.eventEmphasis : ''}`}>
            <span className={styles.eventStamp}>{aheadTag(ev.yearsAhead)}</span>
            <span className={styles.eventBody}>
              <span className={styles.eventLabel}>{ev.label}</span>
              {ev.detail && <span className={styles.eventDetail}>{ev.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

// ── relay (unbroken thread) ──────────────────────────────────────────────────

function RelayBody({ inst }: { inst: Kind<'relay'> }) {
  const denom = Math.log10(inst.spanYears + 1)
  const fOf = (yearsAgo: number) => clamp01(1 - Math.log10(yearsAgo + 1) / denom)
  return (
    <>
      <div className={styles.barWrap}>
        <div className={`${styles.bar} ${styles.barThread}`} aria-hidden="true">
          {inst.waypoints.map((w, i) => {
            const f = fOf(w.yearsAgo)
            return (
              <span
                key={i}
                className={`${styles.tick} ${w.emphasis ? styles.tickEmphasis : ''}`}
                style={{ left: `${f * 100}%` }}
                title={w.label}
              >
                <span className={styles.tickDot} />
              </span>
            )
          })}
        </div>
        <div className={styles.barEnds}>
          <span>3.8 billion yrs ago</span>
          <span>You</span>
        </div>
        <p className={styles.barCaption}>One continuous line — never once broken — from the first cell to you.</p>
      </div>

      <div className={styles.lifeStat}>
        <p className={styles.lifeStatLabel}>The streak</p>
        <p className={styles.lifeStatValue}>{inst.stat}</p>
      </div>

      <ol className={styles.events} style={{ marginTop: '1.8rem' }}>
        {inst.waypoints.map((w, i) => (
          <li key={i} className={`${styles.event} ${w.emphasis ? styles.eventEmphasis : ''}`}>
            <span className={styles.eventStamp}>{w.yearsAgo === 0 ? 'now' : `${bigYears(w.yearsAgo)} ago`}</span>
            <span className={styles.eventBody}>
              <span className={styles.eventLabel}>{w.label}</span>
              {w.detail && <span className={styles.eventDetail}>{w.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

// ── generations ──────────────────────────────────────────────────────────────

function GenerationsBody({ inst }: { inst: Kind<'generations'> }) {
  const [gen, setGen] = useState(10)
  const yearAt = PRESENT_YEAR - gen * inst.yearsPerGen
  const sorted = [...inst.milestones].sort((a, b) => b.year - a.year)
  const nearest =
    [...sorted].reverse().find((m) => PRESENT_YEAR - m.year <= gen * inst.yearsPerGen) ?? sorted[0]
  const yearLabel = (y: number) => (y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`)

  return (
    <>
      <div className={styles.ageBox}>
        <div className={styles.ageTop}>
          <span className={styles.ageLabel}>Generations back</span>
          <span className={styles.ageReadout}>
            <strong>{gen}</strong> back ≈ {yearLabel(yearAt)}
          </span>
        </div>
        <input
          className={styles.slider}
          type="range"
          min={1}
          max={inst.maxGen}
          value={gen}
          onChange={(e) => setGen(Number(e.target.value))}
          aria-label="Generations back"
        />
        <div className={styles.sliderScale}>
          <span>You</span>
          <span>{inst.maxGen} generations</span>
        </div>
      </div>

      <div className={styles.lifeStat}>
        <p className={styles.lifeStatLabel}>Who is that close</p>
        <p className={styles.lifeStatValue}>
          <strong>{gen}</strong> sets of hands back — around {yearLabel(yearAt)} — you reach{' '}
          <strong>{nearest.label}</strong>.
        </p>
      </div>

      <ol className={styles.events} style={{ marginTop: '1.8rem' }}>
        {inst.milestones.map((m, i) => {
          const gensBack = Math.max(1, Math.round((PRESENT_YEAR - m.year) / inst.yearsPerGen))
          return (
            <li key={i} className={`${styles.event} ${m.emphasis ? styles.eventEmphasis : ''}`}>
              <span className={styles.eventStamp}>{gensBack} gens</span>
              <span className={styles.eventBody}>
                <span className={styles.eventLabel}>{m.label}</span>
                <span className={styles.eventDetail}>{yearLabel(m.year)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}

// ── four thousand weeks ──────────────────────────────────────────────────────

function WeeksBody({
  inst,
  age,
  setAge,
}: {
  inst: Kind<'weeks'>
  age: number
  setAge: (n: number) => void
}) {
  const totalWeeks = AGE_MAX * inst.perYear
  const spent = Math.min(totalWeeks, Math.round(age * inst.perYear))
  const remaining = totalWeeks - spent

  return (
    <>
      <AgeControl
        age={age}
        setAge={setAge}
        readout={
          <>
            <strong>{age}</strong> years — {intWithCommas(spent)} weeks
          </>
        }
      />

      <p className={styles.weeksReadout}>
        You have spent about <strong>{intWithCommas(spent)}</strong> weeks. Roughly{' '}
        <strong>{intWithCommas(remaining)}</strong> remain.
      </p>

      <div className={styles.weeksGrid} aria-hidden="true">
        {Array.from({ length: totalWeeks }, (_, i) => (
          <span
            key={i}
            className={`${styles.week} ${i < spent ? styles.weekSpent : ''} ${i === spent ? styles.weekNow : ''}`}
          />
        ))}
      </div>

      <div className={styles.weeksLegend}>
        <span>
          <span className={styles.legendSwatch} style={{ background: '#8a2b2b' }} />
          Weeks spent
        </span>
        <span>
          <span className={styles.legendSwatch} style={{ background: '#c9a84c' }} />
          This week
        </span>
        <span>
          <span className={styles.legendSwatch} style={{ background: '#241f16' }} />
          Weeks remaining
        </span>
      </div>
    </>
  )
}

// ── heartbeat ────────────────────────────────────────────────────────────────

function HeartbeatBody({
  inst,
  age,
  setAge,
}: {
  inst: Kind<'heartbeat'>
  age: number
  setAge: (n: number) => void
}) {
  const beatsPerYear = inst.bpm * 60 * 24 * 365.25
  const totalBeats = LIFE_YEARS * beatsPerYear
  const spentBase = Math.round(age * beatsPerYear)
  const [ticks, setTicks] = useState(0)

  useEffect(() => {
    setTicks(0)
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(() => setTicks((t) => t + 1), 60000 / inst.bpm)
    return () => clearInterval(id)
  }, [inst.bpm, age])

  const spent = spentBase + ticks
  const remaining = Math.max(0, totalBeats - spent)
  const pct = clamp01(spent / totalBeats) * 100

  return (
    <>
      <AgeControl age={age} setAge={setAge} readout={<><strong>{age}</strong> years lived</>} />

      <div className={styles.heartWrap}>
        <svg className={styles.heart} viewBox="0 0 32 29" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16 29S1.6 20.3 1.6 9.8C1.6 5 5.2 1.6 9.4 1.6c2.8 0 5.2 1.5 6.6 3.8 1.4-2.3 3.8-3.8 6.6-3.8 4.2 0 7.8 3.4 7.8 8.2C30.4 20.3 16 29 16 29z"
          />
        </svg>
        <div className={styles.beatBlock}>
          <p className={styles.beatCounterLabel}>Beats spent, and counting</p>
          <div className={styles.beatCounter}>{intWithCommas(spent)}</div>
        </div>
      </div>

      <div className={styles.budgetBar} aria-hidden="true">
        <span className={styles.budgetFill} style={{ width: `${pct}%` }} />
      </div>
      <p className={styles.beatReadout}>
        Of a lifetime’s <strong>{intWithCommas(totalBeats)}</strong> beats, about{' '}
        <strong>{intWithCommas(remaining)}</strong> remain — and one more just now.
      </p>
    </>
  )
}

// ── peppercorn solar system ──────────────────────────────────────────────────

const PX_PER_M = 3.2
const SUN_X = 100

function PeppercornBody({ inst }: { inst: Kind<'peppercorn'> }) {
  const maxM = Math.max(...inst.bodies.map((b) => b.modelMeters))
  const trackWidth = SUN_X + maxM * PX_PER_M + 150

  return (
    <>
      <div className={styles.ppScroll}>
        <div className={styles.ppTrack} style={{ width: `${trackWidth}px` }}>
          <div className={styles.ppSun} title={inst.sunNote} />
          {inst.bodies.map((b) => (
            <div key={b.name} className={styles.ppBody} style={{ left: `${SUN_X + b.modelMeters * PX_PER_M}px` }}>
              <span className={`${styles.ppDot} ${b.emphasis ? styles.ppDotEm : ''}`} />
              <span className={styles.ppLabel}>{b.name}</span>
              <span className={styles.ppMeta}>
                {b.modelMeters} m · {b.size}
              </span>
              <span className={styles.ppMeta}>{b.realAU}</span>
            </div>
          ))}
        </div>
      </div>
      <p className={styles.ppHint}>← the Sun · scroll right through the emptiness to Neptune →</p>

      <div className={styles.lifeStat}>
        <p className={styles.lifeStatLabel}>To scale</p>
        <p className={styles.lifeStatValue}>
          Earth is a peppercorn <strong>26 metres</strong> from a 20 cm Sun. Neptune is a pinhead{' '}
          <strong>776 metres</strong> out. Everything between is empty.
        </p>
      </div>
    </>
  )
}

// ── powers of ten ────────────────────────────────────────────────────────────

function PowersBody({ inst }: { inst: Kind<'powers'> }) {
  const youIndex = inst.steps.findIndex((s) => s.emphasis)
  const [i, setI] = useState(youIndex >= 0 ? youIndex : 0)
  const step = inst.steps[i]

  return (
    <>
      <div className={styles.powHeadline}>
        <span className={styles.powExp}>{step.label}</span>
      </div>
      <p className={styles.powHere}>{step.here}</p>

      <div className={styles.powRuler} role="presentation">
        {inst.steps.map((s, idx) => (
          <button
            key={s.exp}
            className={`${styles.powTick} ${idx === i ? styles.powTickActive : ''}`}
            onClick={() => setI(idx)}
            aria-label={s.label}
          >
            {s.emphasis && <span className={styles.powYou}>You</span>}
            <span className={styles.powTickDot} />
          </button>
        ))}
      </div>
      <div className={styles.powEnds}>
        <span>{inst.steps[0].label}</span>
        <span>{inst.steps[inst.steps.length - 1].label}</span>
      </div>

      <input
        className={styles.slider}
        type="range"
        min={0}
        max={inst.steps.length - 1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        aria-label="Scale"
      />
    </>
  )
}

// ── cost of the void ─────────────────────────────────────────────────────────

const CAR_KMH = 100
const LIGHT_KMS = 299792.458

function formatTravelTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} sec`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`
  if (seconds < 2 * 365.25 * 86400) return `${(seconds / 86400).toFixed(0)} days`
  return bigYears(seconds / (365.25 * 86400))
}

function TravelBody({ inst }: { inst: Kind<'travel'> }) {
  const [mode, setMode] = useState<'car' | 'light'>('car')
  const speedKmS = mode === 'car' ? CAR_KMH / 3600 : LIGHT_KMS
  const rows = inst.rows.map((r) => ({ ...r, seconds: r.km / speedKmS }))
  const maxLog = Math.max(...rows.map((r) => Math.log10(r.seconds)))
  const minLog = Math.min(...rows.map((r) => Math.log10(r.seconds)))

  return (
    <>
      <div className={styles.seg} role="group" aria-label="Speed">
        <button className={`${styles.segBtn} ${mode === 'car' ? styles.segBtnOn : ''}`} onClick={() => setMode('car')}>
          By car · 100 km/h
        </button>
        <button
          className={`${styles.segBtn} ${mode === 'light' ? styles.segBtnOn : ''}`}
          onClick={() => setMode('light')}
        >
          At the speed of light
        </button>
      </div>

      <div>
        {rows.map((r) => {
          const w = ((Math.log10(r.seconds) - minLog) / (maxLog - minLog || 1)) * 92 + 8
          return (
            <div key={r.dest} className={`${styles.travelRow} ${r.emphasis ? styles.travelRowEm : ''}`}>
              <div className={styles.travelTop}>
                <span className={styles.travelDest}>{r.dest}</span>
                <span className={styles.travelTime}>{formatTravelTime(r.seconds)}</span>
              </div>
              <div className={styles.travelBarWrap}>
                <div className={styles.travelBar} style={{ width: `${w}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.lifeStat}>
        <p className={styles.lifeStatLabel}>The punchline</p>
        <p className={styles.lifeStatValue}>
          {mode === 'car'
            ? 'By car, the centre of our galaxy is further away in time than the universe is old — by a factor of twenty.'
            : 'Even at the ultimate speed limit, light takes tens of thousands of years just to cross to the galaxy’s heart.'}
        </p>
      </div>
    </>
  )
}

// ── mostly empty ─────────────────────────────────────────────────────────────

function EmptyAtomBody({ inst }: { inst: Kind<'emptyAtom'> }) {
  return (
    <>
      <div className={styles.atomWrap}>
        <div className={styles.atomFig} aria-hidden="true">
          <span className={styles.atomShell} />
          <span className={styles.atomOrbit}>
            <span className={styles.atomElectron} />
          </span>
          <span className={styles.atomNucleus} />
        </div>
        <div className={styles.atomStat}>
          <p className={styles.atomBigLabel}>Of every atom in you</p>
          <div className={styles.atomBig}>{inst.emptyPercent}</div>
          <p className={styles.atomNote}>is empty space.</p>
        </div>
      </div>

      <div className={styles.lifeStat}>
        <p className={styles.lifeStatLabel}>The stadium</p>
        <p className={styles.lifeStatValue}>{inst.stadium}</p>
      </div>
    </>
  )
}

// ── a million vs a billion ───────────────────────────────────────────────────

function NumbersBody({ inst }: { inst: Kind<'numbers'> }) {
  const maxLog = Math.max(...inst.rows.map((r) => Math.log10(r.seconds)))
  const minLog = Math.min(...inst.rows.map((r) => Math.log10(r.seconds)))
  return (
    <div>
      {inst.rows.map((r) => {
        const w = ((Math.log10(r.seconds) - minLog) / (maxLog - minLog || 1)) * 92 + 8
        return (
          <div key={r.label} className={`${styles.numRow} ${r.emphasis ? styles.numRowEm : ''}`}>
            <div className={styles.numTop}>
              <span className={styles.numLabel}>{r.label}</span>
              <span className={styles.numHuman}>{r.human}</span>
            </div>
            <div className={styles.numBarWrap}>
              <div className={styles.numBar} style={{ width: `${w}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
