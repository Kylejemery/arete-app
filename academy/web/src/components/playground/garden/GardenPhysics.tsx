'use client'

import { useState } from 'react'
import Link from 'next/link'
import { grades, principles, physicsSources } from '@/content/playground/garden'
import GardenShell from './GardenShell'
import styles from './Garden.module.css'

/**
 * Physics — the soil. One instrument: the Stoic ladder of pneumatic tension,
 * from the stone that merely holds together to the reasoning creature that
 * can assent. The same breath, wound tighter at each step.
 */

const INK = '#16140f'
const BONE = '#c9c4b6'
const LEAF = '#7a9460'
const BARK = '#4f3a28'
const STONE = '#8b8371'

function Figure({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <path
          d="M 150 250 Q 140 200 176 186 Q 214 172 246 196 Q 268 216 256 244 Q 244 268 200 266 Q 160 268 150 250 Z"
          fill={STONE}
          stroke={INK}
          strokeWidth={2.5}
        />
      )
    case 1:
      return (
        <g>
          <path d="M 200 270 L 200 170" stroke={LEAF} strokeWidth={7} strokeLinecap="round" />
          <ellipse cx={176} cy={212} rx={26} ry={12} transform="rotate(-30 176 212)" fill={LEAF} stroke={INK} strokeWidth={2} />
          <ellipse cx={226} cy={192} rx={26} ry={12} transform="rotate(30 226 192)" fill={LEAF} stroke={INK} strokeWidth={2} />
          <ellipse cx={180} cy={170} rx={22} ry={10} transform="rotate(-40 180 170)" fill={LEAF} stroke={INK} strokeWidth={2} />
          <path d="M 200 270 Q 190 290 170 300 M 200 270 Q 208 292 228 302 M 200 270 L 202 306" stroke={BARK} strokeWidth={3} strokeLinecap="round" fill="none" />
        </g>
      )
    case 2:
      return (
        <g>
          <ellipse cx={196} cy={222} rx={58} ry={30} fill={BONE} stroke={INK} strokeWidth={2.5} />
          <path d="M 250 222 L 288 196 L 282 222 L 288 248 Z" fill={BONE} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M 190 192 Q 200 176 216 192" fill={BONE} stroke={INK} strokeWidth={2.5} />
          <circle cx={156} cy={216} r={5} fill={INK} />
          <path d="M 140 226 Q 148 232 156 226" stroke={INK} strokeWidth={1.5} fill="none" />
        </g>
      )
    default:
      return (
        <g stroke={INK} strokeWidth={2.5} fill={BONE} strokeLinecap="round">
          <circle cx={200} cy={168} r={20} />
          <rect x={182} y={192} width={36} height={60} rx={12} />
          <path d="M 184 202 L 156 240 M 216 202 L 244 236" fill="none" strokeWidth={9} />
          <path d="M 190 250 L 184 304 M 210 250 L 218 304" fill="none" strokeWidth={10} />
        </g>
      )
  }
}

function TensionSvg({ index }: { index: number }) {
  // more rings, tighter dashes, faster turning as the tension rises
  const rings = index + 1
  return (
    <svg className={styles.plateSvg} viewBox="0 0 400 400" role="img" aria-label={`${grades[index].name}: ${grades[index].things}`}>
      {Array.from({ length: rings }).map((_, k) => {
        const r = 92 + k * 26
        const dash = 22 - index * 4
        return (
          <circle
            key={k}
            className={styles.ring}
            style={{ ['--spin' as string]: `${60 - index * 12 + k * 6}s` }}
            cx={200}
            cy={230}
            r={r}
            fill="none"
            stroke="#86a06c"
            strokeWidth={1.5}
            strokeDasharray={`${dash} ${dash * 0.8}`}
            opacity={0.75 - k * 0.12}
          />
        )
      })}
      {/* the two-way motion: out and back */}
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a} 200 230)`} opacity={0.5}>
          <path d={`M 200 ${230 - 70 - index * 4} L 200 ${230 - 84 - index * 6}`} stroke="#86a06c" strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
      <Figure index={index} />
    </svg>
  )
}

export default function GardenPhysics() {
  const [idx, setIdx] = useState(1)
  const g = grades[idx]

  return (
    <GardenShell
      part="physics"
      eyebrow="The Garden · The soil and the trees"
      title="Physics"
      lede="Everything in the garden grows out of the ground. For the Stoics that ground was a single living cosmos, held together by one breath at different tensions, and ethics is what it grows. Turn the tension up and watch the same breath become a stone, a tree, an animal, and you."
      threadKey="garden:physics"
      context={
        'The Garden experiment, the Physics bed ("One breath, four tensions"): physics as the soil of the Stoic garden. The reader steps through the Stoic ladder of pneumatic tension: hexis (tenor, in stones), physis (nature, in plants), psyche (soul, in animals), logos (reason, in humans and gods), then the two principles (active and passive). The page argues that Stoic ethics grows out of physics: "live according to nature" has content only because nature is rational, providential, and continuous with us. The reader is responding to this.'
      }
      discussHeading="Dig into it with the corpus"
      discussPlaceholder="Does ethics really need a physics under it, or could the fruit grow in any soil? The corpus will answer."
    >
      <section className={styles.section} aria-labelledby="tension-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>I · One breath, four tensions</p>
          <h2 id="tension-h" className={styles.h2}>
            The same stuff, wound tighter
          </h2>
          <p className={styles.sectionLede}>
            The Stoics did not divide the world into matter and mind. They said
            one breath, pneuma, runs through everything, moving outward and
            inward at once, and that what a thing is depends on how tightly
            that breath is wound. Move up the ladder.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.plate}>
            <TensionSvg index={idx} />
            <div className={styles.plateMeta}>
              <span>Tension {idx + 1} / 4</span>
              <span>{g.things}</span>
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.stepper} role="group" aria-label="Grade of tension">
              {grades.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.stepBtn} ${s.index === idx ? styles.stepBtnOn : ''}`}
                  aria-pressed={s.index === idx}
                  onClick={() => setIdx(s.index)}
                >
                  <span className={styles.stepNum}>{s.index + 1}</span>
                  <span className={styles.stepName}>{s.name}</span>
                </button>
              ))}
            </div>
            <input
              className={styles.slider}
              type="range"
              min={0}
              max={grades.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setIdx(Number(e.target.value))}
              aria-label="Tension of the breath"
            />
            <div className={styles.sliderScale}>
              <span>Loose</span>
              <span>Tight</span>
            </div>

            <article key={g.id} className={styles.partCard}>
              <p className={styles.gradeTerms}>
                <em>{g.greek}</em>
              </p>
              <h3 className={styles.partName}>{g.name}</h3>
              <dl className={styles.gradeRow}>
                <dt>Holds</dt>
                <dd>{g.things}</dd>
                <dt>The breath</dt>
                <dd>{g.does}</dd>
              </dl>
              <p className={styles.partGloss}>{g.gloss}</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="principles-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>II · Under the soil</p>
          <h2 id="principles-h" className={styles.h2}>
            Two principles, never found apart
          </h2>
          <p className={styles.sectionLede}>
            Dig below the ladder and you reach bedrock: two principles, one that
            acts and one that is acted on. Everything above is the pair of them
            together.
          </p>
        </div>
        <div className={styles.twoUp}>
          {[principles.active, principles.passive].map((p) => (
            <article key={p.name} className={styles.principle}>
              <h3>{p.name}</h3>
              <p className={styles.greek}>{p.greek}</p>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="grows-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>III · What grows from this</p>
          <h2 id="grows-h" className={styles.h2}>
            Why the fruit needs this soil
          </h2>
        </div>
        <div className={styles.prose}>
          <p>
            The Stoic rule of life is to live according to nature, and the
            sentence has no meaning until physics gives it one. Nature, on this
            account, is not a heap of matter but one living, reasoning thing,
            arranged by the same reason that is in you at the fourth tension.
            So to live according to nature is to live according to reason, and
            to live according to reason is to want what the whole wants. Every
            step of that argument is physics.
          </p>
          <p>
            The ladder also explains where the wanting comes from. At the third
            tension a creature is attached to its own constitution and seeks
            what suits it, which is the root the Stoics called oikeiōsis. At the
            fourth, the creature notices that reason is its constitution, and
            comes to be attached to that instead. That is the whole story of how
            an animal that wants food becomes a person who wants to be just, and
            it is told entirely in the vocabulary of the soil.
          </p>
          <p>
            And fate is physics too. If the cosmos is one body with one reason
            running through it, then what happens is what that reason does, and
            the only question left for ethics is how to want it. That is the
            question the <Link href="/playground/the-garden/ethics">fruit</Link>{' '}
            answers, and it cannot be asked in a world that is not made this
            way.
          </p>
        </div>
        <figure className={styles.reflection}>
          <figcaption className={styles.reflectionRef}>
            <span className={styles.diamond} />
            From the tradition
          </figcaption>
          <blockquote className={styles.reflectionText}>
            “Keep in mind that the whole is one living being with one substance and one soul, and how everything in it is taken up into one perception, and moves by one impulse, and is a cause of everything that comes to be.”
            <cite className={styles.reflectionBy}>— After Marcus Aurelius, Meditations 4.40</cite>
          </blockquote>
        </figure>
        <ul className={styles.sources}>
          {physicsSources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </GardenShell>
  )
}
