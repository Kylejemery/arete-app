'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  alteration,
  definition,
  definitionYonge,
  handoff,
  impressions,
  models,
  refusal,
  type Sigil,
} from '@/content/playground/the-impression'
import CorpusDiscussion from '@/components/playground/CorpusDiscussion'
import styles from './TheImpression.module.css'

// ── the two souls ────────────────────────────────────────────────────────────
//
// Both panels receive the same impressions in the same order. The only thing
// that differs is what a soul is taken to be, which is the argument.
//
// The wax panel enforces exactly the constraint Chrysippus names and nothing
// beyond it: the seals want one and the same spot, so each new one is pressed
// where the last was and flattens it. Legibility is therefore a function of
// how many impressions arrived after you: the newest is whole, the one before
// it is half gone, anything older is gone. No other failure is invented.
//
// The tension panel puts every alteration in the same body too, at the same
// centre, but as a standing pattern rather than a displacement, so they
// superimpose instead of competing for the surface.

const SLOT = { cx: 150, cy: 150 }

function legibility(indexFromNewest: number): number {
  if (indexFromNewest === 0) return 1
  if (indexFromNewest === 1) return 0.34
  return 0
}

function SigilPath({ sigil, scale = 1 }: { sigil: Sigil; scale?: number }) {
  const r = 52 * scale
  if (sigil === 'round') return <circle cx={SLOT.cx} cy={SLOT.cy} r={r} />
  if (sigil === 'square')
    return <rect x={SLOT.cx - r} y={SLOT.cy - r} width={r * 2} height={r * 2} rx={3} />
  // The hand: a plain open palm mark, four fingers and a thumb.
  return (
    <g>
      <rect x={SLOT.cx - 26} y={SLOT.cy - 6} width={52} height={46} rx={10} />
      {[-19, -6, 7, 20].map((dx, i) => (
        <rect key={i} x={SLOT.cx + dx - 5} y={SLOT.cy - 44 + Math.abs(i - 1.5) * 6} width={10} height={44} rx={5} />
      ))}
      <rect x={SLOT.cx - 44} y={SLOT.cy - 4} width={22} height={10} rx={5} transform={`rotate(-28 ${SLOT.cx - 33} ${SLOT.cy})`} />
    </g>
  )
}

/** Cleanthes' soul: one surface, and every seal wants it. */
function WaxPanel({ sent }: { sent: string[] }) {
  const held = sent.filter((_, i) => legibility(sent.length - 1 - i) > 0).length
  return (
    <div className={styles.panel}>
      <svg viewBox="0 0 300 300" className={styles.plate} role="img" aria-label="A wax tablet, with each seal pressed into the same spot.">
        <rect x="0" y="0" width="300" height="300" className={styles.wax} />
        {sent.map((id, i) => {
          const op = legibility(sent.length - 1 - i)
          if (op === 0) return null
          const imp = impressions.find(x => x.id === id)!
          return (
            <g key={`${id}-${i}`} className={styles.waxMark} style={{ opacity: op }}>
              <SigilPath sigil={imp.sigil} />
            </g>
          )
        })}
        {!sent.length ? (
          <text x="150" y="155" textAnchor="middle" className={styles.blank}>
            unmarked
          </text>
        ) : null}
      </svg>
      <p className={styles.count} aria-live="polite">
        {sent.length ? `${held} of ${sent.length} still legible` : 'nothing sent yet'}
      </p>
    </div>
  )
}

/** Chrysippus' soul: one body, many tensions. */
function TensionPanel({ sent }: { sent: string[] }) {
  // Each impression is a standing pattern at its own scale. They share the
  // centre and none of them displaces another.
  const rings = useMemo(
    () =>
      sent.map((id, i) => {
        const imp = impressions.find(x => x.id === id)!
        return { id: `${id}-${i}`, sigil: imp.sigil, scale: 0.55 + i * 0.22 }
      }),
    [sent],
  )
  return (
    <div className={styles.panel}>
      <svg viewBox="0 0 300 300" className={styles.plate} role="img" aria-label="A field of tension, carrying every impression at once.">
        <rect x="0" y="0" width="300" height="300" className={styles.field} />
        {rings.map(r => (
          <g key={r.id} className={styles.tensionMark}>
            <SigilPath sigil={r.sigil} scale={r.scale} />
          </g>
        ))}
        {!sent.length ? (
          <text x="150" y="155" textAnchor="middle" className={styles.blank}>
            at rest
          </text>
        ) : null}
      </svg>
      <p className={styles.count} aria-live="polite">
        {sent.length ? `${sent.length} of ${sent.length} held` : 'nothing sent yet'}
      </p>
    </div>
  )
}

// ── the piece ────────────────────────────────────────────────────────────────

export default function TheImpression({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [sent, setSent] = useState<string[]>([])
  const last = sent.length ? impressions.find(i => i.id === sent[sent.length - 1])! : null

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Link className={styles.back} href={backHref}>
          {backLabel}
        </Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>The Impression</p>
          <h1>Before you agree to anything</h1>
          <p className={styles.standfirst}>
            Something appears to you. That much is not up to you, and it has already happened by the
            time you have a view about it. Zeno said the appearing leaves an imprint, and borrowed
            the word from a seal in wax. Then his school spent a generation arguing about how
            literally he meant it, because on one reading a soul cannot hold two things at once.
          </p>
        </header>

        <section className={styles.movement} aria-labelledby="ti-def">
          <h2 id="ti-def" className={styles.h2}>
            The definition
          </h2>
          <figure className={styles.quote}>
            <blockquote>{definition.text}</blockquote>
            <figcaption>
              {definition.citation} <span className={styles.tr}>{definition.translator}</span>
            </figcaption>
          </figure>
          <p className={styles.lede}>
            Cleanthes read that straight: the soul is wax and the impression is a stamp, with
            hollows and reliefs. Chrysippus said it cannot be meant that way, and gave a reason you
            can watch fail.
          </p>
        </section>

        <section className={styles.movement} aria-labelledby="ti-souls">
          <h2 id="ti-souls" className={styles.h2}>
            Two souls, the same impressions
          </h2>
          <p className={styles.lede}>
            Send each impression to both. They arrive in the same order, with the same force, and
            land in the same place. All that differs is what a soul is taken to be.
          </p>

          <div className={styles.controls} role="group" aria-label="Send an impression">
            {impressions.map(i => (
              <button key={i.id} type="button" className={styles.chip} onClick={() => setSent(s => [...s, i.id])}>
                {i.short}
              </button>
            ))}
            <button
              type="button"
              className={styles.reset}
              onClick={() => setSent([])}
              disabled={!sent.length}
            >
              Clear both
            </button>
          </div>

          {last ? <p className={styles.scene}>{last.scene}</p> : null}

          <div className={styles.panels}>
            {models.map(m => (
              <div key={m.id} className={styles.column}>
                <h3 className={styles.modelName}>{m.name}</h3>
                <p className={styles.attribution}>{m.attribution}</p>
                <p className={styles.claim}>{m.claim}</p>
                {m.id === 'wax' ? <WaxPanel sent={sent} /> : <TensionPanel sent={sent} />}
                <p className={styles.reading}>{m.reading}</p>
              </div>
            ))}
          </div>

          {last ? <p className={styles.note}>{last.note}</p> : null}

          {sent.length >= 2 ? (
            <figure className={`${styles.quote} ${styles.quoteMain}`}>
              <blockquote>{refusal.text}</blockquote>
              <figcaption>
                {refusal.citation} <span className={styles.tr}>{refusal.translator}</span>
              </figcaption>
            </figure>
          ) : (
            <p className={styles.hint}>Send a second impression to see what Chrysippus objected to.</p>
          )}
        </section>

        <section className={styles.movement} aria-labelledby="ti-why">
          <h2 id="ti-why" className={styles.h2}>
            What he put in its place
          </h2>
          <figure className={styles.quote}>
            <blockquote>{alteration.text}</blockquote>
            <figcaption>
              {alteration.citation} <span className={styles.tr}>{alteration.translator}</span>
            </figcaption>
          </figure>
          <div className={styles.glosses}>
            {models.map(m => (
              <div key={m.id} className={styles.glossCard}>
                <h3>{m.name}</h3>
                <p>{m.gloss}</p>
              </div>
            ))}
          </div>
          <p className={styles.ourNote}>
            The wax and the tension are drawn here, and drawing them means choosing how they fail
            and hold. The failure shown is the one Chrysippus names, that many seals cannot share a
            spot, and no other. Yonge renders the same definition this way:{' '}
            <em>{definitionYonge.text}</em> <span className={styles.tr}>{definitionYonge.citation}, {definitionYonge.translator}</span>
          </p>
        </section>

        <section className={styles.movement} aria-labelledby="ti-next">
          <h2 id="ti-next" className={styles.h2}>
            And then, assent
          </h2>
          <p className={styles.closing}>{handoff}</p>
          <p className={styles.lede}>
            <Link className={styles.onward} href="/playground/zenos-hand">
              Zeno&rsquo;s Hand takes it from here →
            </Link>
          </p>
        </section>

        <section className={styles.movement}>
          <CorpusDiscussion
            threadKey="playground:the-impression"
            context="The Stoic impression before assent: Zeno's seal-in-wax definition at Diogenes Laertius 7.45, Cleanthes' literal reading, and Chrysippus's objection at 7.50 that many impressions cannot occupy one spot at one time, so an impression must be an alteration of the soul's tension rather than a stamp."
            heading="Take a side"
            intro="Is the tension a real answer, or the same picture with a softer word?"
          />
        </section>
      </div>
    </main>
  )
}
