'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { harvest, baskets, ethicsSources, type Basket } from '@/content/playground/garden'
import GardenShell from './GardenShell'
import styles from './Garden.module.css'

/**
 * Ethics — the fruit. The reader sorts twelve things into the Stoic baskets:
 * good, bad, preferred, dispreferred, wholly indifferent. Only the virtues
 * are good; only the vices bad; everything else is material.
 */

const INK = '#16140f'
const FRUIT = '#b8473f'
const FRUIT_LIT = '#d4655a'
const GOLD = '#c9a84c'
const LEAF = '#5f7a4a'
const BARK = '#4f3a28'

const FRUIT_AT: [number, number][] = [
  [-70, -20], [-30, -60], [20, -70], [66, -30], [-50, 20], [10, -20], [56, 20], [-10, 40],
  [-88, 20], [86, -4], [40, 56], [-40, 64],
]

function HarvestSvg({ sorted }: { sorted: Record<string, Basket | undefined> }) {
  return (
    <svg className={styles.plateSvg} viewBox="0 0 400 400" role="img" aria-label="A fruit tree with the sorted fruit marked">
      <rect x={186} y={250} width={28} height={130} rx={6} fill={BARK} stroke={INK} strokeWidth={2} />
      <circle cx={150} cy={230} r={60} fill={LEAF} stroke={INK} strokeWidth={2} />
      <circle cx={250} cy={226} r={62} fill={LEAF} stroke={INK} strokeWidth={2} />
      <circle cx={200} cy={170} r={72} fill="#7a9460" stroke={INK} strokeWidth={2} />
      <circle cx={200} cy={230} r={60} fill={LEAF} stroke="none" />
      {harvest.map((h, i) => {
        const [dx, dy] = FRUIT_AT[i]
        const b = sorted[h.id]
        const right = b === h.basket
        const fill = !b ? FRUIT : right ? GOLD : '#3a2d2d'
        return (
          <g key={h.id}>
            <circle cx={200 + dx} cy={200 + dy} r={11} fill={fill} stroke={INK} strokeWidth={2} />
            {!b && <circle cx={200 + dx - 3} cy={200 + dy - 4} r={3.5} fill={FRUIT_LIT} />}
            {b && !right && <path d={`M ${200 + dx - 4} ${200 + dy - 4} l 8 8 M ${200 + dx + 4} ${200 + dy - 4} l -8 8`} stroke={FRUIT} strokeWidth={2} />}
          </g>
        )
      })}
    </svg>
  )
}

export default function GardenEthics() {
  const [answers, setAnswers] = useState<Record<string, Basket>>({})
  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)

  const current = harvest[cursor]
  const choice = answers[current.id]
  const right = useMemo(() => harvest.filter((h) => answers[h.id] === h.basket).length, [answers])
  const answered = Object.keys(answers).length

  const choose = (b: Basket) => {
    if (revealed) return
    setAnswers((a) => ({ ...a, [current.id]: b }))
    setRevealed(true)
  }
  const next = () => {
    if (cursor >= harvest.length - 1) setDone(true)
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

  const goodsClaimed = harvest.filter((h) => answers[h.id] === 'good' && h.basket !== 'good')
  const badsClaimed = harvest.filter((h) => answers[h.id] === 'bad' && h.basket !== 'bad')

  return (
    <GardenShell
      part="ethics"
      eyebrow="The Garden · The fruit"
      title="Ethics"
      lede="The fruit is what the garden is for. But the Stoics said something strange about it: of everything a life can bear, only one kind of thing is actually good, only one kind actually bad, and the rest, health and wealth and death included, is neither. Sort the harvest and see whether you can hold the line."
      threadKey="garden:ethics"
      context={
        'The Garden experiment, the Ethics bed ("Sort the harvest"): ethics as the fruit of the Stoic garden. The reader sorts twelve things (justice, health, cowardice, wealth, death, courage, an odd number of hairs, pain, reputation, injustice, poverty, bending a finger) into the Stoic baskets: good (virtue only), bad (vice only), preferred indifferent, dispreferred indifferent, wholly indifferent. The page argues that only virtue is good and everything else is material for virtue, and notes the disputes with Aristo and the Peripatetics. The reader is responding to this.'
      }
      discussHeading="Argue over the harvest"
      discussPlaceholder="Is health really not a good? Would you keep the preferred and dispreferred, or side with Aristo? The corpus will answer."
    >
      <section className={styles.section} aria-labelledby="harvest-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>I · Sort the harvest</p>
          <h2 id="harvest-h" className={styles.h2}>
            Which of these is actually good?
          </h2>
          <p className={styles.sectionLede}>
            Twelve things a life can bear. Put each in the basket the Stoa would
            use. The test for the good is severe: a good thing benefits in every
            use and can never harm. Almost nothing passes.
          </p>
        </div>

        <div className={styles.fruitRow} aria-label="The harvest">
          {harvest.map((h, i) => {
            const b = answers[h.id]
            return (
              <span
                key={h.id}
                className={`${styles.fruit} ${!done && i === cursor ? styles.fruitNow : ''} ${b ? styles.fruitDone : ''}`}
              >
                <span className={`${styles.fruitDot} ${b ? styles[b] : ''}`} />
                {h.name}
              </span>
            )
          })}
        </div>

        <div className={styles.grid}>
          <div className={styles.plate}>
            <HarvestSvg sorted={answers} />
            <div className={styles.plateMeta}>
              <span>{done ? 'The harvest' : `${cursor + 1} of ${harvest.length}`}</span>
              <span>
                {right} of {answered} sorted as the Stoa would
              </span>
            </div>
          </div>

          <div className={styles.col}>
            {done ? (
              <div className={styles.reveal}>
                <p className={styles.caseNum}>What you gathered</p>
                <h3 className={styles.resultName}>
                  {right === harvest.length
                    ? 'You held the line.'
                    : goodsClaimed.length + badsClaimed.length === 0
                      ? 'Only the virtues in the good basket. That is the hard part.'
                      : 'You let something into the good or the bad that the Stoa keeps out.'}
                </h3>
                {goodsClaimed.length + badsClaimed.length > 0 ? (
                  <p className={styles.why}>
                    You counted{' '}
                    {[...goodsClaimed.map((h) => `${h.name.toLowerCase()} as good`), ...badsClaimed.map((h) => `${h.name.toLowerCase()} as bad`)].join(', ')}.
                    Most of the ancient world agreed with you, and Aristotle would have. The Stoic reply is a single question: can it be used badly? Health can arm a tyrant; wealth can buy a poisoning; death, borne well, has made more sages than it has unmade. Whatever can be used badly is not the good but material for it, and the only thing that cannot be used badly is the skill of using things well, which is virtue.
                  </p>
                ) : (
                  <p className={styles.why}>
                    The whole of Stoic ethics rests on that line. If only virtue is good, then nothing that happens to you can make your life go badly, and the only thing that can is what you do. Everything else, the preferred and the dispreferred, is the raw material that virtue is exercised on: the game, not the score.
                  </p>
                )}
                {right < harvest.length && goodsClaimed.length + badsClaimed.length === 0 && (
                  <p className={styles.why}>
                    Where you differed from the school was only among the indifferents, which is where the school differed from itself. Aristo of Chios said there was no such thing as a preferred indifferent and that the sage simply does whatever the moment suggests. Chrysippus said that a sage who did not select health over sickness, other things equal, would be mad. The mainstream followed Chrysippus.
                  </p>
                )}
                <button type="button" className={styles.nextBtn} onClick={reset}>
                  Sort it again ↺
                </button>
              </div>
            ) : (
              <>
                <p className={styles.caseNum}>Fruit {cursor + 1} of {harvest.length}</p>
                <p className={styles.big}>
                  <strong>{current.name}.</strong> Which basket?
                </p>
                {!revealed ? (
                  <div className={`${styles.choices} ${styles.choices5}`}>
                    {baskets.map((b) => (
                      <button key={b.id} type="button" className={styles.choiceBtn} onClick={() => choose(b.id)}>
                        <strong>{b.name}</strong>
                        <small>{b.short}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.reveal}>
                    <p className={`${styles.revealLabel} ${choice === current.basket ? styles.ok : styles.miss}`}>
                      {choice === current.basket ? 'As the Stoa sorts it' : `You said ${baskets.find((b) => b.id === choice)?.name.toLowerCase()}; the Stoa says ${baskets.find((b) => b.id === current.basket)?.name.toLowerCase()}`}
                      {' · '}
                      {baskets.find((b) => b.id === current.basket)?.greek}
                    </p>
                    <p className={styles.why}>{current.why}</p>
                    <button type="button" className={styles.nextBtn} onClick={next}>
                      {cursor >= harvest.length - 1 ? 'Weigh the harvest →' : 'Next fruit →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.basketKey} aria-label="The baskets">
          {baskets.map((b) => (
            <span key={b.id}>
              <span className={`${styles.fruitDot} ${styles[b.id]}`} />
              {b.name} · {b.greek}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="why-h">
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>II · Why the fruit</p>
          <h2 id="why-h" className={styles.h2}>
            One good, and everything else is material
          </h2>
        </div>
        <div className={styles.prose}>
          <p>
            Stoic ethics begins where physics leaves off. Every creature is
            born attached to its own constitution and seeks what suits it; a
            rational creature, growing up, discovers that reason is its
            constitution and comes to prize the order of its choices above the
            things it chooses. That discovery is the fruit ripening. The Stoics
            called it living in agreement with nature, and they meant by it
            that a person’s good is entirely in how they act, not in what they
            get.
          </p>
          <p>
            From that follows the sorting you just did. The virtues, which are
            forms of knowledge about how to act, are good. The vices are bad.
            Everything else, from health to death, is indifferent to whether
            your life goes well, though not indifferent to what you should do:
            the preferred things are to be selected, the dispreferred avoided,
            and the skill of selecting well is precisely what virtue is. This is
            why the Stoics could say that a sage in poverty and pain is happy
            and mean it, and also why they could say that the sage will take
            wealth and health when they come, and mean that too.
          </p>
          <p>
            The wall and the soil are for this. The{' '}
            <Link href="/playground/the-garden/logic">wall</Link> keeps out the
            argument that health must be good because everyone wants it. The{' '}
            <Link href="/playground/the-garden/physics">soil</Link> supplies
            the nature that “according to nature” refers to. Take either away
            and the sorting has no basis. Keep both, and it is the most
            demanding, and the most consoling, account of a good life the
            ancient world produced.
          </p>
        </div>
        <figure className={styles.reflection}>
          <figcaption className={styles.reflectionRef}>
            <span className={styles.diamond} />
            From the tradition
          </figcaption>
          <blockquote className={styles.reflectionText}>
            “Of things that exist, some are good, some bad, and some neither. The virtues are good; the vices bad; and the rest, life and death, health and sickness, wealth and poverty, reputation and obscurity, are neither, though not all of them are alike.”
            <cite className={styles.reflectionBy}>— After Diogenes Laertius 7.101–102</cite>
          </blockquote>
        </figure>
        <ul className={styles.sources}>
          {ethicsSources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </GardenShell>
  )
}
