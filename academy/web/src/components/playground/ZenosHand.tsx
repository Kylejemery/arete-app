'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  stages,
  impressions,
  definition,
  type Stage,
  type StageId,
  type Impression,
} from '@/content/playground/zenos-hand'
import CorpusDiscussion from '@/components/playground/CorpusDiscussion'
import styles from './ZenosHand.module.css'

// ── the hand ─────────────────────────────────────────────────────────────────
//
// A pose is six numbers: three finger joints, two thumb joints (degrees), and
// how far the second hand has closed (0..1). The hand is drawn in profile from
// the thumb side, palm facing right, so a positive rotation curls a finger
// toward the palm. Poses are tweened in JS so the drawing can use plain SVG
// transform attributes and stay nested (segment inside segment inside joint).

type Pose = [number, number, number, number, number, number]

const POSES: Record<StageId, Pose> = {
  impression: [0, 0, 0, 34, 6, 0],
  assent: [30, 34, 22, 56, 22, 0],
  katalepsis: [92, 92, 54, 98, 60, 0],
  knowledge: [92, 92, 54, 98, 60, 1],
}

/** The left hand brought over but unable to close — the fool's grip. */
const HOVER_WRAP = 0.38

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

function useTween(target: Pose, ms = 700): Pose {
  const [cur, setCur] = useState<Pose>(target)
  const curRef = useRef<Pose>(target)
  const key = target.join(',')

  useEffect(() => {
    const to = key.split(',').map(Number) as Pose
    const from = curRef.current
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || from.join(',') === key) {
      curRef.current = to
      setCur(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const e = easeInOut(p)
      const next = from.map((f, i) => f + (to[i] - f) * e) as Pose
      curRef.current = next
      setCur(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [key, ms])

  return cur
}

const SKIN = ['#d3cec0', '#bdb7a8', '#a49e90', '#8b8578'] // front → back
const LEFT_SKIN = ['#aaa497', '#928c7f', '#7a7469']
const INK = '#16140f'

// right-hand geometry (profile from the thumb side, palm facing right)
const KNUCKLE = { x: 200, y: 216 }
const FINGER_W = 42
const FINGER_L: [number, number, number] = [56, 36, 28]
// per finger (front → back): index, middle, ring, little
const FINGER_SCALE = [1, 1.06, 1, 0.86]

const THUMB = { x: 228, y: 266 }
const THUMB_W = 36
const THUMB_L: [number, number] = [40, 30]

function Segment({ w, len, fill }: { w: number; len: number; fill: string }) {
  return (
    <rect
      x={-w / 2}
      y={-len}
      width={w}
      height={len + w / 2}
      rx={w / 2}
      fill={fill}
      stroke={INK}
      strokeWidth={2.5}
    />
  )
}

/** A chain of segments hinged at (0,0), each rotated at its own joint. */
function Chain({ w, lens, angles, fill }: { w: number; lens: number[]; angles: number[]; fill: string }) {
  const build = (i: number): React.ReactNode => (
    <g transform={i === 0 ? `rotate(${angles[0]})` : `translate(0, ${-lens[i - 1]}) rotate(${angles[i]})`}>
      <Segment w={w} len={lens[i]} fill={fill} />
      {i + 1 < lens.length ? build(i + 1) : null}
    </g>
  )
  return build(0)
}

function Finger({ k, pose }: { k: number; pose: Pose }) {
  const s = FINGER_SCALE[k]
  return (
    <g transform={`translate(${KNUCKLE.x - 9 * k}, ${KNUCKLE.y - 3 * k}) scale(${s})`}>
      <Chain w={FINGER_W} lens={FINGER_L} angles={[pose[0], pose[1], pose[2]]} fill={SKIN[k]} />
    </g>
  )
}

function Thumb({ pose }: { pose: Pose }) {
  return (
    <g transform={`translate(${THUMB.x}, ${THUMB.y})`}>
      <Chain w={THUMB_W} lens={THUMB_L} angles={[pose[3], pose[4]]} fill={SKIN[0]} />
    </g>
  )
}

/**
 * The left hand, closing over the fist as `wrap` goes 0 → 1. Seen from the
 * same side: the forearm comes in from the upper left, the palm lies across
 * the top of the fist, the fingers curl down its front and the thumb down
 * its back.
 */
function LeftHand({ wrap }: { wrap: number }) {
  if (wrap <= 0.001) return null
  const dx = -70 * (1 - wrap)
  const dy = -90 * (1 - wrap)
  return (
    <g opacity={Math.min(1, wrap * 1.15)} transform={`translate(${dx}, ${dy})`}>
      {/* forearm, from the upper left */}
      <g transform="translate(160, 168) rotate(-38)">
        <rect x={-26} y={-30} width={52} height={230} rx={26} fill={LEFT_SKIN[1]} stroke={INK} strokeWidth={2.5} transform="rotate(180)" />
      </g>
      {/* fingers over the front (back to front) */}
      {[2, 1, 0].map((k) => (
        <g key={k} transform={`translate(${288 - 8 * k}, ${166 - 7 * k})`}>
          <Chain w={40} lens={[36, 84, 32]} angles={[90, 92, 62]} fill={LEFT_SKIN[k]} />
        </g>
      ))}
      {/* palm across the top */}
      <rect x={128} y={140} width={186} height={52} rx={26} fill={LEFT_SKIN[0]} stroke={INK} strokeWidth={2.5} />
      {/* thumb down the back */}
      <g transform="translate(140, 178)">
        <Chain w={40} lens={[92, 40]} angles={[184, -46]} fill={LEFT_SKIN[0]} />
      </g>
    </g>
  )
}

function Hand({ pose, title }: { pose: Pose; title: string }) {
  const wrap = pose[5]
  return (
    <svg
      className={styles.handSvg}
      viewBox="60 46 340 340"
      role="img"
      aria-label={title}
      focusable="false"
    >
      {/* forearm + palm */}
      <rect x={160} y={316} width={64} height={150} rx={22} fill={SKIN[1]} stroke={INK} strokeWidth={2.5} />
      <rect x={150} y={214} width={82} height={122} rx={30} fill={SKIN[0]} stroke={INK} strokeWidth={2.5} />
      {/* fingers, back to front */}
      {[3, 2, 1, 0].map((k) => (
        <Finger key={k} k={k} pose={pose} />
      ))}
      {/* the heel of the palm sits in front of the finger roots */}
      <rect x={150} y={242} width={82} height={94} rx={30} fill={SKIN[0]} stroke="none" />
      <Thumb pose={pose} />
      <LeftHand wrap={wrap} />
    </svg>
  )
}

// ── component ────────────────────────────────────────────────────────────────

export default function ZenosHand({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href={backHref} className={styles.backLink}>
          {backLabel}
        </Link>
      </div>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Arete Academy · The Playground</p>
        <h1 className={styles.title}>Zeno’s Hand</h1>
        <p className={styles.lede}>
          Zeno of Citium taught the whole of Stoic epistemology with one hand.
          Open it, curl it, close it, then close the other hand over it. Four
          positions, and the last one belongs only to the wise.
        </p>
      </header>

      <Gesture />
      <Trial />
      <Reflection />

      <section className={styles.discuss}>
        <CorpusDiscussion
          threadKey="zenos-hand"
          context={
            'The Playground experiment "Zeno\'s Hand": Cicero (Academica 2.145) reports that Zeno ' +
            'showed an open hand and called it an impression (phantasia), curled the fingers and called ' +
            'that assent (synkatathesis), closed the fist and called that a grasp (katalepsis), then ' +
            'gripped the fist with his left hand and called that knowledge (episteme), which only the sage ' +
            'has. The experiment argues that the fist is not knowledge: a single secure grasp is available ' +
            'to anyone, and knowledge is the whole system of grasps holding each grasp in place, which is ' +
            'why one loose assent (opinion, doxa) makes the grip a fool\'s grip. The reader is responding to this.'
          }
          heading="Take it up with the corpus"
          intro="Is knowledge really all-or-nothing? Does the Academic have the better of it? Say where you land, and the tradition will answer."
          placeholder="Push on the hand — is a grasp really enough to build on, or does the sceptic win?"
        />
      </section>
    </main>
  )
}

// ── section 1: the gesture ───────────────────────────────────────────────────

function Gesture() {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const stage = stages[idx]
  const pose = useTween(POSES[stage.id])

  useEffect(() => {
    if (!playing) return
    if (idx >= stages.length - 1) {
      const t = setTimeout(() => setPlaying(false), 1200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setIdx((i) => Math.min(stages.length - 1, i + 1)), 1500)
    return () => clearTimeout(t)
  }, [playing, idx])

  const play = () => {
    setIdx(0)
    setPlaying(true)
  }

  return (
    <section className={styles.section} aria-labelledby="gesture-h">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>I · The gesture</p>
        <h2 id="gesture-h" className={styles.h2}>
          Four positions of one hand
        </h2>
        <p className={styles.sectionLede}>
          Move through the stages. The story is usually told with three, and the
          one that gets dropped is the one that matters.
        </p>
      </div>

      <div className={styles.gestureGrid}>
        <div className={styles.stagePlate}>
          <Hand pose={pose} title={`${stage.name}: ${stage.hand}`} />
          <div className={styles.stageMeta}>
            <span className={styles.stageNum}>{stage.index + 1} / 4</span>
            <span className={styles.stageHand}>{stage.hand}</span>
          </div>
        </div>

        <div className={styles.stageCol}>
          <div className={styles.stepper} role="group" aria-label="Stage of the gesture">
            {stages.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.stepBtn} ${s.index === idx ? styles.stepBtnOn : ''} ${
                  s.index < idx ? styles.stepBtnDone : ''
                }`}
                aria-pressed={s.index === idx}
                onClick={() => {
                  setPlaying(false)
                  setIdx(s.index)
                }}
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
            max={stages.length - 1}
            step={1}
            value={idx}
            onChange={(e) => {
              setPlaying(false)
              setIdx(Number(e.target.value))
            }}
            aria-label="Close the hand"
          />
          <div className={styles.sliderScale}>
            <span>Open</span>
            <button type="button" className={styles.playBtn} onClick={play} disabled={playing}>
              {playing ? 'Closing…' : 'Play the gesture'}
            </button>
            <span>Gripped</span>
          </div>

          <StageCard stage={stage} />
        </div>
      </div>
    </section>
  )
}

function StageCard({ stage }: { stage: Stage }) {
  return (
    <article className={styles.stageCard} key={stage.id}>
      <p className={styles.stageTerms}>
        <span className={styles.stageLatin}>{stage.latin}</span>
        <span className={styles.stageGreek}>{stage.greek}</span>
      </p>
      <h3 className={styles.stageName}>{stage.name}</h3>
      <blockquote className={styles.ciceroLine}>
        {stage.cicero}
        <cite>Cicero, Academica 2.145</cite>
      </blockquote>
      <p className={styles.gloss}>{stage.gloss}</p>
    </article>
  )
}

// ── section 2: the trial ─────────────────────────────────────────────────────

type Choice = 'assent' | 'withhold'
type Outcome = 'grasp' | 'opinion' | 'suspended' | 'missed'

function outcomeOf(imp: Impression, choice: Choice): Outcome {
  if (choice === 'assent') return imp.clear ? 'grasp' : 'opinion'
  return imp.clear ? 'missed' : 'suspended'
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  grasp: 'A grasp',
  opinion: 'An opinion',
  suspended: 'Suspended',
  missed: 'Let go',
}

const OUTCOME_GLYPH: Record<Outcome, string> = {
  grasp: '●',
  opinion: '✕',
  suspended: '○',
  missed: '·',
}

function Trial() {
  const [answers, setAnswers] = useState<Record<string, Choice>>({})
  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const current = impressions[cursor]
  const choice = current ? answers[current.id] : undefined

  const tally = useMemo(() => {
    const t = { grasp: 0, opinion: 0, suspended: 0, missed: 0 }
    for (const imp of impressions) {
      const c = answers[imp.id]
      if (c) t[outcomeOf(imp, c)] += 1
    }
    return t
  }, [answers])

  const choose = (c: Choice) => {
    if (revealed) return
    setAnswers((a) => ({ ...a, [current.id]: c }))
    setRevealed(true)
  }

  const next = () => {
    if (cursor >= impressions.length - 1) {
      setDone(true)
      return
    }
    setCursor((i) => i + 1)
    setRevealed(false)
  }

  const reset = useCallback(() => {
    setAnswers({})
    setCursor(0)
    setRevealed(false)
    setDone(false)
  }, [])

  // The hand in the trial: open while deciding; curled when you assent;
  // shut when the assent turns out to be a grasp; loose when it was opinion.
  const trialPose: Pose = useMemo(() => {
    if (done) return POSES.impression
    if (!revealed || !choice) return POSES.impression
    if (choice === 'withhold') return POSES.impression
    return current.clear ? POSES.katalepsis : POSES.assent
  }, [done, revealed, choice, current])
  const trialTweened = useTween(trialPose, 550)

  return (
    <section className={styles.section} aria-labelledby="trial-h">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>II · The trial</p>
        <h2 id="trial-h" className={styles.h2}>
          Can the second hand close on yours?
        </h2>
        <p className={styles.sectionLede}>
          Nine impressions, each taken from the ancient argument itself. For each
          one, close your hand or keep it open. At the end you will see whether
          what you are holding could be gripped.
        </p>
      </div>

      <ol className={styles.progress} aria-label="Progress">
        {impressions.map((imp, i) => {
          const c = answers[imp.id]
          const o = c ? outcomeOf(imp, c) : null
          const isNow = !done && i === cursor
          return (
            <li
              key={imp.id}
              className={`${styles.progressDot} ${o ? styles[`dot_${o}`] : ''} ${
                isNow ? styles.dotNow : ''
              }`}
              title={o ? OUTCOME_LABEL[o] : isNow ? 'Now' : 'Not yet'}
            >
              {o ? OUTCOME_GLYPH[o] : ''}
            </li>
          )
        })}
      </ol>

      {done ? (
        <TrialResult tally={tally} answers={answers} onReset={reset} />
      ) : (
        <div className={styles.trialGrid}>
          <div className={`${styles.stagePlate} ${styles.stagePlateSmall}`}>
            <Hand pose={trialTweened} title="Your hand" />
          </div>

          <div className={styles.trialCol}>
            <p className={styles.caseNum}>
              Impression {cursor + 1} of {impressions.length}
            </p>
            <p className={styles.scene}>{current.scene}</p>

            {!revealed ? (
              <div className={styles.choices}>
                <button type="button" className={styles.choiceBtn} onClick={() => choose('withhold')}>
                  <span className={styles.choiceGlyph} aria-hidden="true">
                    ✋
                  </span>
                  <span>
                    <strong>Keep it open</strong>
                    <small>Withhold assent</small>
                  </span>
                </button>
                <button type="button" className={styles.choiceBtn} onClick={() => choose('assent')}>
                  <span className={styles.choiceGlyph} aria-hidden="true">
                    ✊
                  </span>
                  <span>
                    <strong>Close it</strong>
                    <small>Assent: take it as true</small>
                  </span>
                </button>
              </div>
            ) : (
              <div className={styles.reveal}>
                <p className={`${styles.revealLabel} ${styles[`rv_${outcomeOf(current, choice ?? 'withhold')}`]}`}>
                  {OUTCOME_LABEL[outcomeOf(current, choice ?? 'withhold')]} · {current.verdict}
                </p>
                <p className={styles.why}>{current.why}</p>
                <p className={styles.source}>{current.source}</p>
                <button type="button" className={styles.nextBtn} onClick={next}>
                  {cursor >= impressions.length - 1 ? 'See what you hold →' : 'Next impression →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

type Tally = { grasp: number; opinion: number; suspended: number; missed: number }

function TrialResult({
  tally,
  answers,
  onReset,
}: {
  tally: Tally
  answers: Record<string, Choice>
  onReset: () => void
}) {
  const assented = tally.grasp + tally.opinion
  const kind: 'sage' | 'fool' | 'academic' =
    assented === 0 ? 'academic' : tally.opinion === 0 ? 'sage' : 'fool'

  const pose: Pose =
    kind === 'sage'
      ? POSES.knowledge
      : kind === 'academic'
        ? POSES.impression
        : ([...POSES.katalepsis.slice(0, 5), HOVER_WRAP] as Pose)

  const tweened = useTween(pose, 1100)

  const opinions = impressions.filter((i) => answers[i.id] === 'assent' && !i.clear)
  const missed = impressions.filter((i) => answers[i.id] === 'withhold' && i.clear)

  return (
    <div className={styles.trialGrid}>
      <div className={`${styles.stagePlate} ${styles.stagePlateSmall} ${kind === 'fool' ? styles.plateLoose : ''}`}>
        <Hand
          pose={tweened}
          title={
            kind === 'sage'
              ? 'The left hand closed over the fist'
              : kind === 'fool'
                ? 'The left hand brought over, but not closing'
                : 'An open hand'
          }
        />
        <div className={styles.stageMeta}>
          <span className={styles.stageNum}>
            {kind === 'sage' ? 'Gripped' : kind === 'fool' ? 'Will not close' : 'Nothing to grip'}
          </span>
          <span className={styles.stageHand}>
            {tally.grasp} grasp{tally.grasp === 1 ? '' : 's'} · {tally.opinion} opinion
            {tally.opinion === 1 ? '' : 's'} · {tally.suspended + tally.missed} withheld
          </span>
        </div>
      </div>

      <div className={styles.trialCol}>
        <p className={styles.caseNum}>What you hold</p>
        {kind === 'sage' && (
          <>
            <h3 className={styles.resultName}>The second hand closes.</h3>
            <p className={styles.why}>
              You assented to nothing uncertain. Every fist you made was a grasp,
              and each of them is now held in place by the others, so there is
              nothing an argument could pry loose without meeting everything else
              you know. This is what Zeno meant by the left hand. It is not a
              stronger fist. It is the rest of the mind, closing.
            </p>
            {missed.length > 0 && (
              <p className={styles.why}>
                You also let {missed.length === 1 ? 'one clear impression' : `${missed.length} clear impressions`} go
                by. The Stoic sage assents to those, since a truth that is in
                front of you is not made safer by being refused. But that is a
                smaller fault than the other, and it costs you nothing you were
                holding.
              </p>
            )}
            <p className={styles.why}>
              The school was candid that this almost never happens. A sage, they
              said, is as rare as the phoenix. The gesture describes a standard,
              not a census.
            </p>
          </>
        )}
        {kind === 'fool' && (
          <>
            <h3 className={styles.resultName}>The second hand will not close.</h3>
            <p className={styles.why}>
              Your {tally.grasp === 1 ? 'grasp is' : 'grasps are'} real. The fist you made on{' '}
              {tally.grasp === 1 ? 'that clear impression' : 'those clear impressions'} is the same fist a sage
              would make. But sitting among {tally.grasp === 1 ? 'it' : 'them'}{' '}
              {opinions.length === 1 ? 'is one opinion' : `are ${opinions.length} opinions`}:{' '}
              {opinions.map((o) => o.short).join(', ')}.
              An opinion can be pried loose, and when it goes it shakes whatever
              was leaning on it. Knowledge is a grasp that reason cannot
              overturn. This grip is not that, and the left hand knows it.
            </p>
            <p className={styles.why}>
              This is the whole point of the fourth position. The fool and the
              sage can share a grasp. They cannot share the grip, because the
              grip is made of everything else.
            </p>
          </>
        )}
        {kind === 'academic' && (
          <>
            <h3 className={styles.resultName}>Nothing to grip.</h3>
            <p className={styles.why}>
              You kept the hand open all the way through. Arcesilaus, who ran
              Plato’s Academy against Zeno, would call that the only honest
              response: suspend judgement on everything, since nothing is
              stamped so clearly that it could not have come from what is not.
              Zeno’s answer is in the gesture. An open hand holds nothing. You
              refused {tally.missed} impression{tally.missed === 1 ? '' : 's'} that were standing
              plainly in front of you, and no amount of caution turns that into
              knowledge.
            </p>
            <p className={styles.why}>
              The argument between them ran for two centuries, and it is not
              obviously settled. Try again and see what it costs to close the
              hand.
            </p>
          </>
        )}

        <button type="button" className={styles.nextBtn} onClick={onReset}>
          Open the hand again ↺
        </button>
      </div>
    </div>
  )
}

// ── section 3: reflection ────────────────────────────────────────────────────

function Reflection() {
  return (
    <section className={styles.section} aria-labelledby="why-h">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>III · Why the fist is not the grip</p>
        <h2 id="why-h" className={styles.h2}>
          Wisdom is not a fifth position
        </h2>
      </div>

      <div className={styles.prose}>
        <p>
          The gesture is often retold with three stages: impression, knowledge,
          wisdom. That loses the thing Zeno built it to show. There are four
          positions, and the closed fist is not knowledge. It is a grasp, a
          single secure hold on a single truth, and the Stoics were emphatic
          that anyone can have one. A farmer who sees that it is day grasps that
          it is day as firmly as Chrysippus does.
        </p>
        <p>
          What the farmer does not have is the second hand. Knowledge, on the
          Stoic definition, is a grasp that is secure and cannot be overturned by
          argument, and no grasp is secure on its own. It is made secure by the
          other grasps around it: by there being nothing in the mind that an
          argument could use as a lever. That is why one loose assent spoils
          the grip without spoiling the fist. The fool and the sage hold the
          same truth in the same way. The difference is everything else they
          are holding.
        </p>
        <p>
          So wisdom is not a stage of the hand at all. It is the condition of
          the person whose fourth position closes: someone who has never once
          said yes to an impression that could have been false. The Stoics
          admitted that nobody they knew of had managed it. The gesture is not
          a description of a sage. It is a description of what you are for.
        </p>
      </div>

      <figure className={styles.reflection}>
        <figcaption className={styles.reflectionRef}>
          <span className={styles.diamond} />
          The definition the second hand illustrates
        </figcaption>
        <blockquote className={styles.reflectionText}>
          “{definition.text}”
          <cite className={styles.reflectionBy}>— {definition.by}</cite>
        </blockquote>
      </figure>

      <p className={styles.note}>
        The gesture is reported by Cicero, <em>Academica</em> 2.145, in the
        speech of Lucullus, writing in Latin about two centuries after Zeno. The
        wording here is close paraphrase, not quotation, and every case in the
        trial carries the ancient source it is taken from so it can be read
        against any edition.
      </p>
    </section>
  )
}
