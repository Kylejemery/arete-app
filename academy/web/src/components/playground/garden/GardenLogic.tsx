'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { visitors, logicSources, type Visitor } from '@/content/playground/garden'
import GardenShell from './GardenShell'
import styles from './Garden.module.css'

/**
 * Logic — the wall. Nine arguments come to the gate, and the reader admits
 * or turns each away. The valid ones are Chrysippus' five indemonstrables;
 * the rest are their counterfeits and two famous sophisms.
 */

type Choice = 'admit' | 'turn'

const INK = '#16140f'
const STONE = '#a9a08c'
const STONE_DK = '#8b8371'

function GateSvg({ state }: { state: 'closed' | 'open' | 'breach' }) {
  const open = state !== 'closed'
  return (
    <svg className={styles.plateSvg} viewBox="0 0 400 400" role="img" aria-label={state === 'breach' ? 'A gap in the wall' : open ? 'The gate standing open' : 'The gate closed'}>
      {/* wall on both sides */}
      {[0, 1].map((side) => (
        <g key={side} transform={side ? 'translate(260,0)' : ''}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => (
            <g key={r}>
              {[0, 1, 2, 3].map((c) => (
                <rect
                  key={c}
                  x={(r % 2 ? -22 : 0) + c * 46}
                  y={140 + r * 22}
                  width={43}
                  height={19}
                  rx={3}
                  fill={STONE}
                  stroke={INK}
                  strokeWidth={1.5}
                />
              ))}
            </g>
          ))}
        </g>
      ))}
      <rect x={-10} y={130} width={420} height={10} fill={STONE} stroke={INK} strokeWidth={1.5} />
      {/* pillars */}
      <rect x={124} y={110} width={30} height={210} rx={3} fill={STONE_DK} stroke={INK} strokeWidth={1.5} />
      <rect x={246} y={110} width={30} height={210} rx={3} fill={STONE_DK} stroke={INK} strokeWidth={1.5} />
      <rect x={118} y={100} width={42} height={12} rx={2} fill={STONE} stroke={INK} strokeWidth={1.5} />
      <rect x={240} y={100} width={42} height={12} rx={2} fill={STONE} stroke={INK} strokeWidth={1.5} />
      {/* ground */}
      <rect x={0} y={318} width={400} height={82} fill="#5a4229" stroke={INK} strokeWidth={1.5} />
      {/* the gate */}
      {state === 'breach' ? (
        <>
          <path d="M 156 318 L 158 210 L 176 214 L 178 318 Z" fill="#4f3a28" stroke={INK} strokeWidth={1.5} />
          <path d="M 244 318 L 240 236 L 222 240 L 226 318 Z" fill="#4f3a28" stroke={INK} strokeWidth={1.5} />
          <path d="M 184 300 l 12 -30 l 14 20 l 10 -26" stroke="#4f3a28" strokeWidth={6} strokeLinecap="round" fill="none" />
        </>
      ) : open ? (
        <g style={{ transition: 'transform 0.5s ease' }}>
          <path d="M 154 318 L 154 118 L 182 134 L 182 318 Z" fill="#4f3a28" stroke={INK} strokeWidth={1.5} />
          <path d="M 246 318 L 246 118 L 218 134 L 218 318 Z" fill="#4f3a28" stroke={INK} strokeWidth={1.5} />
        </g>
      ) : (
        <>
          <rect x={154} y={118} width={46} height={200} fill="#4f3a28" stroke={INK} strokeWidth={1.5} />
          <rect x={200} y={118} width={46} height={200} fill="#4f3a28" stroke={INK} strokeWidth={1.5} />
          {[150, 190, 230, 270].map((y) => (
            <line key={y} x1={158} x2={242} y1={y} y2={y} stroke={INK} strokeWidth={1} />
          ))}
        </>
      )}
    </svg>
  )
}

type Outcome = 'admitted' | 'kept' | 'breach' | 'shutout'

function outcomeOf(v: Visitor, c: Choice): Outcome {
  if (c === 'admit') return v.valid ? 'admitted' : 'breach'
  return v.valid ? 'shutout' : 'kept'
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  admitted: 'Admitted, rightly',
  kept: 'Turned away, rightly',
  breach: 'A breach: a bad argument got in',
  shutout: 'A truth kept out',
}

export default function GardenLogic() {
  const [answers, setAnswers] = useState<Record<string, Choice>>({})
  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const current = visitors[cursor]
  const choice = answers[current.id]

  const tally = useMemo(() => {
    const t: Record<Outcome, number> = { admitted: 0, kept: 0, breach: 0, shutout: 0 }
    for (const v of visitors) {
      const c = answers[v.id]
      if (c) t[outcomeOf(v, c)] += 1
    }
    return t
  }, [answers])

  const choose = (c: Choice) => {
    if (revealed) return
    setAnswers((a) => ({ ...a, [current.id]: c }))
    setRevealed(true)
  }
  const next = () => {
    if (cursor >= visitors.length - 1) setDone(true)
    else {
      setCursor((i) => i + 1)
      setRevealed(false)
    }
  }
  const reset = () => {
    setAnswers({})
    setCursor(0)
    setRevealed(false)
    setDone(false)
  }

  const gateState: 'closed' | 'open' | 'breach' = done
    ? tally.breach > 0
      ? 'breach'
      : 'closed'
    : !revealed
      ? 'closed'
      : outcomeOf(current, choice ?? 'turn') === 'breach'
        ? 'breach'
        : choice === 'admit'
          ? 'open'
          : 'closed'

  return (
    <GardenShell
      part="logic"
      eyebrow="The Garden · The wall"
      title="Logic"
      lede="The Stoics put logic around the garden, not inside it. Its job is to keep false things out: to say what an argument is, when a conclusion follows, and when to refuse to answer. Nine arguments are at the gate. Decide which get in."
      threadKey="garden:logic"
      context={
        'The Garden experiment, the Logic bed ("At the gate"): logic as the wall of the Stoic garden. The reader admits or turns away nine arguments: the five indemonstrables of Chrysippus (valid), affirming the consequent and denying the antecedent (invalid counterfeits), the Horned Man and the Sorites (sophisms). The page argues that Stoic logic is not an academic ornament but the boundary that keeps false beliefs out of physics and ethics. The reader is responding to this.'
      }
      discussHeading="Argue it at the gate"
      discussPlaceholder="Is logic really the wall, or could a good life stand without it? The corpus will answer."
    >
      <section className={styles.section} aria-labelledby="gate-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>I · At the gate</p>
          <h2 id="gate-h" className={styles.h2}>
            Which arguments get into the garden?
          </h2>
          <p className={styles.sectionLede}>
            Each visitor is an argument. Admit it if the conclusion follows from
            the premises; turn it away if it does not. The Stoics held that any
            valid argument can be reduced to five that need no proof. Their
            counterfeits, and two old sophisms, are in the queue too.
          </p>
        </div>

        <ol className={styles.progress} aria-label="Progress">
          {visitors.map((v, i) => {
            const c = answers[v.id]
            const o = c ? outcomeOf(v, c) : null
            const good = o === 'admitted' || o === 'kept'
            return (
              <li
                key={v.id}
                className={`${styles.dot} ${o ? (good ? styles.dotOk : styles.dotMiss) : ''} ${!done && i === cursor ? styles.dotNow : ''}`}
                title={o ? OUTCOME_LABEL[o] : ''}
              >
                {o ? (good ? '●' : '✕') : ''}
              </li>
            )
          })}
        </ol>

        <div className={styles.grid}>
          <div className={styles.plate}>
            <GateSvg state={gateState} />
            <div className={styles.plateMeta}>
              <span>{done ? (tally.breach ? `${tally.breach} breach${tally.breach === 1 ? '' : 'es'}` : 'Wall intact') : `Visitor ${cursor + 1} of ${visitors.length}`}</span>
              <span>
                {tally.admitted + tally.kept} right · {tally.breach} in wrongly · {tally.shutout} shut out
              </span>
            </div>
          </div>

          <div className={styles.col}>
            {done ? (
              <div className={styles.reveal}>
                <p className={styles.caseNum}>The wall</p>
                <h3 className={styles.resultName}>
                  {tally.breach === 0 && tally.shutout === 0
                    ? 'The wall stands, and the gate works.'
                    : tally.breach === 0
                      ? 'The wall stands, but it kept some truth out.'
                      : `${tally.breach === 1 ? 'One bad argument is' : `${tally.breach} bad arguments are`} inside the garden.`}
                </h3>
                <p className={styles.why}>
                  {tally.breach === 0
                    ? 'Nothing false got past you. That is what the wall is for, and it is the whole of the Stoic case for studying logic: not that arguments are interesting, though they are, but that a physics or an ethics with a bad inference in it is a garden with a hole in the wall.'
                    : 'Each breach is a false belief that will now be watered and pruned with the true ones, and from inside the garden nothing marks it out. Epictetus said that the person who cannot tell a valid argument from its counterfeit is at the mercy of anyone who can. Look at which visitors got through: nearly always it is the counterfeit of a real form.'}
                </p>
                {tally.shutout > 0 && (
                  <p className={styles.why}>
                    You also turned away {tally.shutout === 1 ? 'one valid argument' : `${tally.shutout} valid arguments`}. That is the lesser fault, but not no fault: a wall that keeps out truths starves the trees. The remedy is the same as for breaches, which is to learn the five forms until you can see them through any disguise.
                  </p>
                )}
                <button type="button" className={styles.nextBtn} onClick={reset}>
                  Open the gate again ↺
                </button>
              </div>
            ) : (
              <>
                <p className={styles.caseNum}>Visitor {cursor + 1} of {visitors.length}</p>
                <ul className={styles.premises}>
                  {current.premises.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p className={styles.conclusion}>{current.conclusion}</p>

                {!revealed ? (
                  <div className={styles.choices}>
                    <button type="button" className={styles.choiceBtn} onClick={() => choose('admit')}>
                      <strong>Admit it</strong>
                      <small>The conclusion follows</small>
                    </button>
                    <button type="button" className={styles.choiceBtn} onClick={() => choose('turn')}>
                      <strong>Turn it away</strong>
                      <small>It does not follow</small>
                    </button>
                  </div>
                ) : (
                  <div className={styles.reveal}>
                    <p className={`${styles.revealLabel} ${outcomeOf(current, choice ?? 'turn') === 'admitted' || outcomeOf(current, choice ?? 'turn') === 'kept' ? styles.ok : styles.miss}`}>
                      {OUTCOME_LABEL[outcomeOf(current, choice ?? 'turn')]} · {current.form}
                    </p>
                    <p className={styles.why}>{current.why}</p>
                    <p className={styles.source}>{current.source}</p>
                    <button type="button" className={styles.nextBtn} onClick={next}>
                      {cursor >= visitors.length - 1 ? 'Inspect the wall →' : 'Next visitor →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="why-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>II · Why the wall</p>
          <h2 id="why-h" className={styles.h2}>
            Logic was the whole theory of not being fooled
          </h2>
        </div>
        <div className={styles.prose}>
          <p>
            What the Stoics called logic covered more ground than the word does
            now. It included the study of argument, which is what the gate
            tests. It included rhetoric, the art of saying a true thing so that
            it lands. And it included what we would call epistemology: what an
            impression is, which impressions can be trusted, and what it is to
            assent to one. That last part is the subject of{' '}
            <Link href="/playground/zenos-hand">Zeno’s Hand</Link>, and it is
            logic too, because a false belief can get into the garden by a bad
            assent as easily as by a bad inference.
          </p>
          <p>
            The wall is not there for its own sake. Nobody builds a wall around
            nothing. It stands because of what is inside: an account of nature
            that would be worthless if it could not survive an argument, and a
            rule for living that would be dangerous if it rested on a false
            impression. Epictetus, asked why he bothered his students with
            arguments about heaps and horns, answered that the person who has
            not studied them will be led wherever a clever speaker wants, and
            will not even know it is happening.
          </p>
          <p>
            The five indemonstrables are the mortar. Chrysippus held that every
            valid argument reduces to a chain of these: from a conditional and
            its antecedent, the consequent; from a conditional and the denial
            of its consequent, the denial of its antecedent; from a denied
            conjunction and one conjunct, the denial of the other; from an
            exclusive disjunction and one disjunct, the denial of the other;
            from an exclusive disjunction and the denial of one disjunct, the
            other. Learn those five and the counterfeits stop looking like
            visitors and start looking like what they are.
          </p>
        </div>
        <figure className={styles.reflection}>
          <figcaption className={styles.reflectionRef}>
            <span className={styles.diamond} />
            From the tradition
          </figcaption>
          <blockquote className={styles.reflectionText}>
            “When someone asked what use logic was, Epictetus answered with a question: would you like to know whether that very question was valid?”
            <cite className={styles.reflectionBy}>— After Epictetus, Discourses 2.25</cite>
          </blockquote>
        </figure>
        <ul className={styles.sources}>
          {logicSources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </GardenShell>
  )
}
