'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  causes,
  characters,
  closing,
  impressions,
  passage,
  setup,
  shapes,
  type CharacterId,
  type Shape,
  type ShapeId,
} from '@/content/playground/chrysippus-cylinder'
import CorpusDiscussion from '@/components/playground/CorpusDiscussion'
import styles from './ChrysippusCylinder.module.css'

// ── the floor ────────────────────────────────────────────────────────────────
//
// Seen from above, so all three shapes can be honest about where they go. The
// push is a fixed impulse applied at the left edge, identical for every shape
// and every run: that is the whole point, so it is not adjustable.
//
// Each shape integrates the same initial speed under its own rule:
//
//   cylinder  rolls true. Light rolling resistance, so it runs a long way in
//             a straight line and is still turning when it stops.
//   cone      rolls about its point, so its heading sweeps as it goes and the
//             path closes into a circle back toward the start.
//   cube      does not roll. It tips onto one face, which eats almost all of
//             the impulse at once, and stops.
//
// The numbers are chosen to read, not to be a physics engine, but they are
// sized to the floor rather than guessed. Under constant deceleration a body
// covers v0^2 / 2a before it stops, so:
//
//   cylinder  a = 145 gives about 215 units, which lands it short of the far
//             edge instead of jamming against it.
//   cone      a = 45 gives about 690 units of arc, and a turn radius of
//             v / omega = 110 makes a circle of circumference 691. It closes
//             the loop and arrives back at the start, which is the point.
//   cube      a = 620 gives about 50 units: one tip onto a face.
//
// What has to be true is that the input is identical and the outcomes are not.

const PUSH_SPEED = 250 // units per second, the same for every shape
const CONE_RADIUS = 110 // the circle a cone rolls, in floor units
// The floor is sized to the motion rather than to the page. Two constraints
// fix where the start goes: the cylinder needs 215 units of clear run above it,
// and the cone turns about a centre one radius to its right, so its circle
// reaches 110 *below* the start as well as 110 above. Starting at y = 340 on a
// 500-high floor satisfies both, and nothing reaches the clamp.
const VIEW = { w: 720, h: 500 }
// x is set so the cone's circle, whose centre is one radius to the right of
// the start, lands centred on the floor: 250 + 110 is half of 720.
const START = { x: 250, y: 340 }

type Body = { x: number; y: number; heading: number; speed: number; spin: number }
type Run = { body: Body; trail: { x: number; y: number }[]; done: boolean }

function step(shape: Shape, b: Body, dt: number): Body {
  const next: Body = { ...b }
  switch (shape.path) {
    case 'straight':
      next.speed = Math.max(0, b.speed - 145 * dt) // light rolling resistance
      next.heading = b.heading // straight up the floor, never turning
      break
    case 'arc':
      next.speed = Math.max(0, b.speed - 45 * dt)
      // Rolling about its own point. Turning at omega = v / r keeps the radius
      // fixed as it slows, so the path is a true circle rather than a spiral,
      // and the arc it has energy for is exactly one lap.
      next.heading = b.heading + (b.speed / CONE_RADIUS) * dt
      break
    case 'halt':
      // One tip onto a face, then nothing. Most of the impulse goes into
      // lifting the body over its own edge.
      next.speed = Math.max(0, b.speed - 620 * dt)
      break
  }
  next.x = b.x + Math.cos(next.heading) * next.speed * dt
  next.y = b.y + Math.sin(next.heading) * next.speed * dt
  next.spin = b.spin + (shape.path === 'halt' ? 0 : next.speed * dt * 0.9)
  return next
}

function freshRun(): Run {
  return {
    body: { x: START.x, y: START.y, heading: -Math.PI / 2, speed: 0, spin: 0 },
    trail: [],
    done: true,
  }
}

function Floor({ shape, run }: { shape: Shape; run: Run }) {
  const { body, trail } = run
  const d = trail.length
    ? 'M ' + trail.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
    : ''

  return (
    <svg
      className={styles.floor}
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      role="img"
      aria-label={`The ${shape.name.toLowerCase()}, seen from above, after an identical push from the left.`}
    >
      <defs>
        <pattern id="cc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.13" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={VIEW.w} height={VIEW.h} fill="url(#cc-grid)" className={styles.grid} />

      {/* Where every run begins, and the hand that starts it. */}
      <circle cx={START.x} cy={START.y} r="5" className={styles.startDot} />
      <line x1={START.x} y1={START.y + 46} x2={START.x} y2={START.y + 14} className={styles.pushArrow} markerEnd="url(#cc-head)" />
      <defs>
        <marker id="cc-head" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 z" className={styles.pushHead} />
        </marker>
      </defs>
      <text x={START.x} y={START.y + 66} textAnchor="middle" className={styles.floorLabel}>
        the push
      </text>

      {d ? <path d={d} className={styles.trail} /> : null}

      <g transform={`translate(${body.x} ${body.y}) rotate(${(body.heading * 180) / Math.PI + 90})`}>
        <g transform={`rotate(${shape.path === 'halt' ? 0 : body.spin})`}>
          <ShapeMark id={shape.id} />
        </g>
      </g>
    </svg>
  )
}

/** Each shape as it looks from above, which is how they differ. */
function ShapeMark({ id }: { id: ShapeId }) {
  if (id === 'cylinder') {
    return <rect x="-15" y="-26" width="30" height="52" rx="3" className={styles.body} />
  }
  if (id === 'cone') {
    return <path d="M 0 -28 L 17 22 L -17 22 Z" className={styles.body} />
  }
  return <rect x="-21" y="-21" width="42" height="42" rx="2" className={styles.body} />
}

// ── the piece ────────────────────────────────────────────────────────────────

export default function ChrysippusCylinder({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [shapeId, setShapeId] = useState<ShapeId>('cylinder')
  const [run, setRun] = useState<Run>(freshRun)
  const [pushed, setPushed] = useState(false)
  const raf = useRef<number | null>(null)
  const shape = shapes.find(s => s.id === shapeId)!

  const stop = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [])

  const push = useCallback(() => {
    stop()
    setPushed(true)
    const current = shapes.find(s => s.id === shapeId)!
    let body: Body = { x: START.x, y: START.y, heading: -Math.PI / 2, speed: PUSH_SPEED, spin: 0 }
    let trail: { x: number; y: number }[] = [{ x: body.x, y: body.y }]
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      body = step(current, body, dt)
      // Keep the body on the floor rather than letting it sail off the edge.
      body.x = Math.max(30, Math.min(VIEW.w - 30, body.x))
      body.y = Math.max(30, Math.min(VIEW.h - 30, body.y))
      trail = [...trail, { x: body.x, y: body.y }]
      const done = body.speed <= 0.5
      setRun({ body, trail, done })
      if (!done) raf.current = requestAnimationFrame(tick)
      else raf.current = null
    }
    setRun({ body, trail, done: false })
    raf.current = requestAnimationFrame(tick)
  }, [shapeId, stop])

  // Changing the shape clears the floor: the comparison is only honest if
  // each shape starts from the same place with nothing behind it.
  useEffect(() => {
    stop()
    setRun(freshRun())
    setPushed(false)
  }, [shapeId, stop])

  useEffect(() => stop, [stop])

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Link className={styles.back} href={backHref}>
          {backLabel}
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>Chrysippus&rsquo;s Cylinder</p>
          <h1>The push is not the rolling</h1>
          <p className={styles.standfirst}>
            If every event has a cause stretching back before you were born, in what sense is
            anything you do yours? Chrysippus answered with an object on a floor. Give it a shove
            and watch what happens next, because what happens next is not the shove.
          </p>
        </header>

        {/* ── first movement: the floor ── */}
        <section className={styles.movement} aria-labelledby="cc-floor">
          <h2 id="cc-floor" className={styles.h2}>
            One push, three natures
          </h2>
          <p className={styles.lede}>
            The hand at the bottom is fixed. It delivers the same force, in the same direction,
            from the same spot, whatever is sitting there. The only thing you can change is what
            you put on the floor.
          </p>

          <div className={styles.controls} role="group" aria-label="Choose what to put on the floor">
            {shapes.map(s => (
              <button
                key={s.id}
                type="button"
                className={`${styles.chip} ${s.id === shapeId ? styles.chipOn : ''}`}
                aria-pressed={s.id === shapeId}
                onClick={() => setShapeId(s.id)}
              >
                {s.name}
                {s.ancient ? <span className={styles.chipNote}>Cicero&rsquo;s</span> : null}
              </button>
            ))}
          </div>

          <Floor shape={shape} run={run} />

          <div className={styles.afterFloor}>
            <button type="button" className={styles.push} onClick={push}>
              {pushed ? 'Push again' : 'Push'}
            </button>
            <p className={styles.reading} aria-live="polite">
              {!pushed
                ? `${shape.name}. ${shape.motion}, if the analogy holds. Push it and see.`
                : run.done
                  ? shape.result
                  : 'Rolling.'}
            </p>
          </div>

          <p className={styles.gloss}>{shape.gloss}</p>

          {!shape.ancient ? (
            <p className={styles.ourNote}>
              Cicero gives only the cylinder. This shape is ours, added because the fastest way to
              see that the nature is doing the work is to change the nature and keep the push.
            </p>
          ) : null}
        </section>

        {/* ── the distinction the argument turns on ── */}
        <section className={styles.movement} aria-labelledby="cc-causes">
          <h2 id="cc-causes" className={styles.h2}>
            Two kinds of cause
          </h2>
          <p className={styles.lede}>
            Chrysippus does not deny that the push is fated. He concedes it, and then says it was
            never the interesting cause.
          </p>
          <div className={styles.causes}>
            {causes.map(c => (
              <div key={c.id} className={styles.cause}>
                <h3>{c.name}</h3>
                <p className={styles.latin}>{c.latin}</p>
                <p>{c.gloss}</p>
                <p className={styles.inScene}>{c.inTheScene}</p>
              </div>
            ))}
          </div>
          <figure className={styles.quote}>
            <blockquote>{setup.text}</blockquote>
            <figcaption>
              {setup.citation} <span className={styles.tr}>{setup.translator}</span>
            </figcaption>
          </figure>
        </section>

        {/* ── second movement: the transfer ── */}
        <Transfer />

        {/* ── the text ── */}
        <section className={styles.movement} aria-labelledby="cc-text">
          <h2 id="cc-text" className={styles.h2}>
            The passage
          </h2>
          <figure className={`${styles.quote} ${styles.quoteMain}`}>
            <blockquote>{passage.text}</blockquote>
            <figcaption>
              {passage.citation} <span className={styles.tr}>{passage.translator}</span>
            </figcaption>
          </figure>
          <p className={styles.closing}>{closing}</p>
        </section>

        <section className={styles.movement}>
          <CorpusDiscussion
            threadKey="playground:chrysippus-cylinder"
            context="Chrysippus's cylinder, from Cicero's De Fato 42 to 43: the push is the auxiliary cause and the shape is the principal one, so an action can be fully caused and still be the agent's own."
            heading="Take a side"
            intro="Does the cylinder save responsibility, or only rename the problem?"
          />
        </section>
      </div>
    </main>
  )
}

/** Same impression, three characters. The floor again, in a mind. */
function Transfer() {
  const [impressionId, setImpressionId] = useState(impressions[0].id)
  const [characterId, setCharacterId] = useState<CharacterId>('trained')
  const impression = impressions.find(i => i.id === impressionId)!
  const character = characters.find(c => c.id === characterId)!

  return (
    <section className={styles.movement} aria-labelledby="cc-transfer">
      <h2 id="cc-transfer" className={styles.h2}>
        The same floor, in a mind
      </h2>
      <p className={styles.lede}>
        This is what the analogy is for. An impression arrives and strikes: that is the push, and
        it is not yours. What you then agree to is the rolling. Hold the impression still and
        change the character, exactly as you held the push still and changed the shape.
      </p>

      <div className={styles.controls} role="group" aria-label="Choose the impression">
        {impressions.map(i => (
          <button
            key={i.id}
            type="button"
            className={`${styles.chip} ${i.id === impressionId ? styles.chipOn : ''}`}
            aria-pressed={i.id === impressionId}
            onClick={() => setImpressionId(i.id)}
          >
            {i.short}
          </button>
        ))}
      </div>

      <p className={styles.scene}>{impression.scene}</p>

      <div className={styles.controls} role="group" aria-label="Choose the character">
        {characters.map(c => (
          <button
            key={c.id}
            type="button"
            className={`${styles.chip} ${c.id === characterId ? styles.chipOn : ''}`}
            aria-pressed={c.id === characterId}
            onClick={() => setCharacterId(c.id)}
          >
            {c.name}
            <span className={styles.chipNote}>{shapes.find(s => s.id === c.shape)!.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.assent} aria-live="polite">
        <p className={styles.characterGloss}>{character.gloss}</p>
        <p className={styles.assentBody}>{impression.assent[characterId]}</p>
      </div>

      <p className={styles.ourNote}>
        The three characters are ours, not Cicero&rsquo;s. What is his is the claim underneath
        them: that the impression is the same in every case, and the difference is the thing it
        landed on.
      </p>
    </section>
  )
}
