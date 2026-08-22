'use client'

import { useState } from 'react'
import Link from 'next/link'
import { timeScales, LIFE_YEARS, type TimeScale, type TimeEvent } from '@/content/playground/timeScales'
import styles from './ViewFromAbove.module.css'

// ── Time maths ───────────────────────────────────────────────────────────────
// Every scale maps its real span onto a compressed window. Positions come from
// each event's real distance from now (or, for a life, its age), so the stamps
// are computed rather than hand-placed.

const WINDOW: Record<TimeScale['frame'], number> = {
  calendar: 365 * 86400,
  clock: 86400,
  stopwatch: 3600,
  week: 7 * 86400,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Fraction along the window, 0 (start) → 1 (now / end), clamped. */
function fractionOf(ev: TimeEvent, scale: TimeScale): number {
  const f =
    scale.anchor === 'birth'
      ? (ev.atAge ?? 0) / scale.spanYears
      : 1 - (ev.yearsAgo ?? 0) / scale.spanYears
  return Math.min(1, Math.max(0, f))
}

function twelveHour(h: number, m: number, s: number, withSeconds: boolean): string {
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  const mm = String(m).padStart(2, '0')
  return withSeconds
    ? `${h12}:${mm}:${String(s).padStart(2, '0')} ${ap}`
    : `${h12}:${mm} ${ap}`
}

/** The compressed timestamp for a fraction along a given scale. */
function stamp(f: number, scale: TimeScale, ended = false): string {
  const window = WINDOW[scale.frame]
  const elapsed = f * window

  switch (scale.frame) {
    case 'calendar': {
      if (ended) return 'Dec 31 · Midnight'
      const d = new Date(Date.UTC(2001, 0, 1) + elapsed * 1000)
      const withSeconds = elapsed > window - 86400
      return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${twelveHour(
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        withSeconds,
      )}`
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
      return `${DAYS[dayIdx]} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(
        d.getUTCMinutes(),
      ).padStart(2, '0')}`
    }
  }
}

/** Human-readable compressed duration, e.g. 0.18 seconds / 2.7 hours. */
function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Number(seconds.toPrecision(2))} seconds`
  if (seconds < 90) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} seconds`
  if (seconds < 5400) return `${(seconds / 60).toFixed(1)} minutes`
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} hours`
  return `${(seconds / 86400).toFixed(1)} days`
}

/** How long an eighty-year life lasts on a deep-time scale. */
function lifeOnScale(scale: TimeScale): string {
  return formatDuration((LIFE_YEARS / scale.spanYears) * WINDOW[scale.frame])
}

const START_LABEL: Record<TimeScale['frame'], string> = {
  calendar: 'Jan 1',
  clock: 'Midnight',
  stopwatch: '00:00',
  week: 'Mon',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ViewFromAbove({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [activeId, setActiveId] = useState(timeScales[0].id)
  const [age, setAge] = useState(40)

  const scale = timeScales.find((s) => s.id === activeId) ?? timeScales[0]
  const isLife = scale.anchor === 'birth'
  const ageFraction = Math.min(1, Math.max(0, age / scale.spanYears))

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
          time is in view — and to see how brief and how astonishing your place
          in it is. Pick a scale, and watch everything you know crowd into its
          final seconds.
        </p>
      </header>

      <div className={styles.layout}>
        {/* rail */}
        <nav className={styles.rail} aria-label="Time scales">
          {timeScales.map((s) => (
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
        </nav>

        {/* detail */}
        <section className={styles.main}>
          <div className={styles.scaleHead}>
            <h2 className={styles.scaleName}>{scale.name}</h2>
            <p className={styles.mapping}>
              <span className={styles.mappingSpan}>{scale.spanLabel}</span>
              <span className={styles.mappingArrow}>compressed into</span>
              <span className={styles.mappingSpan}>{scale.intoLabel}</span>
            </p>
            <p className={styles.ratio}>{scale.ratio}</p>
            <p className={styles.blurb}>{scale.blurb}</p>
          </div>

          {/* the age control, only on the personal scale */}
          {isLife && (
            <div className={styles.ageBox}>
              <div className={styles.ageTop}>
                <span className={styles.ageLabel}>Set the hand to your age</span>
                <span className={styles.ageReadout}>
                  It is <strong>{stamp(ageFraction, scale, ageFraction >= 1)}</strong> — age {age}
                </span>
              </div>
              <input
                className={styles.ageSlider}
                type="range"
                min={0}
                max={LIFE_YEARS}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                aria-label="Your age"
              />
              <div className={styles.ageScaleRow}>
                <span>Birth</span>
                <span>{LIFE_YEARS} yrs</span>
              </div>
            </div>
          )}

          {/* the compressed bar */}
          <div className={styles.barWrap}>
            <div className={styles.bar} aria-hidden="true">
              {scale.events.map((ev, i) => {
                const f = fractionOf(ev, scale)
                return (
                  <span
                    key={i}
                    className={`${styles.tick} ${ev.emphasis ? styles.tickEmphasis : ''}`}
                    style={{ left: `${f * 100}%` }}
                    title={`${ev.label} — ${stamp(f, scale, f >= 1)}`}
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
              <span>{START_LABEL[scale.frame]}</span>
              <span>{isLife ? 'The end of the day' : 'Now'}</span>
            </div>
            <p className={styles.barCaption}>
              {isLife
                ? 'Each mark is a stage of life; the bright line is you.'
                : 'Each mark is an event. Notice how everything you have a name for is pressed against the right-hand edge.'}
            </p>
          </div>

          {/* the event list */}
          <ol className={styles.events}>
            {scale.events.map((ev, i) => {
              const f = fractionOf(ev, scale)
              return (
                <li key={i} className={`${styles.event} ${ev.emphasis ? styles.eventEmphasis : ''}`}>
                  <span className={styles.eventStamp}>{stamp(f, scale, f >= 1)}</span>
                  <span className={styles.eventBody}>
                    <span className={styles.eventLabel}>{ev.label}</span>
                    {ev.detail && <span className={styles.eventDetail}>{ev.detail}</span>}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* the whole-life stat, on deep-time scales */}
          {!isLife && (
            <div className={styles.lifeStat}>
              <p className={styles.lifeStatLabel}>Where you fit</p>
              <p className={styles.lifeStatValue}>
                A whole human life — eighty years — lasts{' '}
                <strong>{lifeOnScale(scale)}</strong> on this scale.
              </p>
            </div>
          )}

          {/* reflection */}
          <figure className={styles.reflection}>
            <figcaption className={styles.reflectionRef}>
              <span className={styles.diamond} />
              From the tradition
            </figcaption>
            <blockquote className={styles.reflectionText}>
              “{scale.reflection.text}”
              <cite className={styles.reflectionBy}>— {scale.reflection.by}</cite>
            </blockquote>
          </figure>
        </section>
      </div>
    </main>
  )
}
