'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  closing,
  conditionals,
  connectives,
  forms,
  mood,
  pairs,
  propositionTest,
  utterances,
  validVsTrue,
  type Form,
  type Line,
  type Pair,
  type Slot,
} from '@/content/playground/stoic-logic'
import CorpusDiscussion from '@/components/playground/CorpusDiscussion'
import styles from './StoicLogic.module.css'

// ── rendering an argument ────────────────────────────────────────────────────
//
// A form is a shape with holes in it. Filling the holes from a pair is the
// whole lesson: the form does not care which two propositions go in, which is
// what makes it a logic of propositions rather than of the things propositions
// happen to be about.

function slotText(slot: Slot, pair: Pair): string {
  switch (slot) {
    case 'p': return pair.p.aff
    case 'notP': return pair.p.neg
    case 'q': return pair.q.aff
    case 'notQ': return pair.q.neg
  }
}

/** The same shape twice: once with the variables showing, once filled in. */
function lineText(line: Line, pair: Pair | null): string {
  const t = (s?: Slot) => {
    if (!s) return ''
    if (pair) return slotText(s, pair)
    return { p: 'the first', notP: 'not the first', q: 'the second', notQ: 'not the second' }[s]
  }
  switch (line.kind) {
    case 'if': return `If ${t(line.a)}, then ${t(line.b)}`
    case 'notBoth': return `Not both ${t(line.a)} and ${t(line.b)}`
    case 'either': return `Either ${t(line.a)} or ${t(line.b)}`
    case 'plain': return t(line.a)
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Argument({ form, pair }: { form: Form; pair: Pair | null }) {
  return (
    <div className={`${styles.argument} ${form.valid ? styles.valid : styles.invalid}`}>
      <p className={styles.premise}>{cap(lineText(form.major, pair))}.</p>
      <p className={styles.premise}>{cap(lineText(form.minor, pair))}.</p>
      <div className={styles.turnstile} aria-hidden="true" />
      <p className={styles.conclusionLine}>
        <span className={styles.therefore}>therefore</span> {lineText(form.conclusion, pair)}.
      </p>
    </div>
  )
}

// ── the piece ────────────────────────────────────────────────────────────────

export default function StoicLogic({
  backHref = '/playground',
  backLabel = '← The Playground',
}: {
  backHref?: string
  backLabel?: string
}) {
  const [formId, setFormId] = useState(forms[0].id)
  const [pairId, setPairId] = useState<string | null>(null)
  const form = forms.find(f => f.id === formId)!
  const pair = pairId ? pairs.find(p => p.id === pairId)! : null

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Link className={styles.back} href={backHref}>{backLabel}</Link>

        <header className={styles.head}>
          <p className={styles.eyebrow}>The Five Indemonstrables</p>
          <h1>The logic that was lost</h1>
          <p className={styles.standfirst}>
            The Stoics built the first logic of propositions in the West, ran it on five argument
            forms they held to be complete, and had it forgotten for the better part of two
            thousand years while Aristotle&rsquo;s logic of terms was taught in its place. Here are
            the five, working.
          </p>
        </header>

        {/* ── what can be true at all ── */}
        <Propositions />

        {/* ── the five ── */}
        <section className={styles.movement} aria-labelledby="sl-five">
          <h2 id="sl-five" className={styles.h2}>The five, and two impostors</h2>
          <p className={styles.lede}>
            Each form is a shape with two holes in it. Pick a form to see the shape, then drop a
            pair of propositions in and watch the shape stay exactly as valid, or exactly as
            broken, as it was. That indifference to content is the whole idea.
          </p>

          <div className={styles.forms} role="group" aria-label="Choose a form">
            {forms.map(f => (
              <button
                key={f.id}
                type="button"
                className={`${styles.formChip} ${f.id === formId ? styles.formChipOn : ''} ${f.valid ? '' : styles.formChipBad}`}
                aria-pressed={f.id === formId}
                onClick={() => setFormId(f.id)}
              >
                <span className={styles.formOrdinal}>{f.ordinal ?? '×'}</span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <div className={styles.pairRow} role="group" aria-label="Choose what to plug in">
            <button
              type="button"
              className={`${styles.pairChip} ${!pairId ? styles.pairChipOn : ''}`}
              aria-pressed={!pairId}
              onClick={() => setPairId(null)}
            >
              variables only
            </button>
            {pairs.map(p => (
              <button
                key={p.id}
                type="button"
                className={`${styles.pairChip} ${p.id === pairId ? styles.pairChipOn : ''}`}
                aria-pressed={p.id === pairId}
                onClick={() => setPairId(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Argument form={form} pair={pair} />

          <p className={styles.verdict} aria-live="polite">
            {form.valid
              ? `Valid. ${form.modern}.`
              : `Not valid. It is ${form.modern}, and it holds its shape while losing its force.`}
          </p>

          {/* Validity is a property of the shape; truth is a property of the
              premisses. Plugging day and light into the third form gives a
              perfectly valid argument off a plainly false major premiss, and
              saying nothing about that would teach the wrong lesson. */}
          {pair && !pair.suits.includes(form.id) ? (
            <p className={styles.untrue}>
              <span className={styles.counterLabel}>Valid, and not true</span>
              The shape holds, but the major premiss is false of this pair: {form.major.kind === 'if'
                ? 'the one does not follow from the other'
                : form.major.kind === 'notBoth'
                  ? 'those two can perfectly well both hold'
                  : 'those two are not alternatives'}. Diogenes keeps validity and
              truth apart, and so should you.
            </p>
          ) : null}

          <p className={styles.gloss}>{form.gloss}</p>

          {form.counter ? (
            <p className={styles.counter}>
              <span className={styles.counterLabel}>Where it breaks</span>
              {form.counter}
            </p>
          ) : null}

          <figure className={styles.quote}>
            <blockquote>{form.dl}</blockquote>
            <figcaption>{form.dlCite} <span className={styles.tr}>tr. R. D. Hicks, 1925</span></figcaption>
          </figure>

          <figure className={`${styles.quote} ${styles.quoteAside}`}>
            <blockquote>{mood.dl}</blockquote>
            <figcaption>{mood.dlCite} <span className={styles.tr}>tr. R. D. Hicks, 1925</span></figcaption>
          </figure>

          <figure className={`${styles.quote} ${styles.quoteAside}`}>
            <blockquote>{validVsTrue.dl}</blockquote>
            <figcaption>{validVsTrue.dlCite} <span className={styles.tr}>tr. R. D. Hicks, 1925</span></figcaption>
          </figure>
        </section>

        {/* ── the connectives ── */}
        <Connectives />

        {/* ── the conditional fight ── */}
        <section className={styles.movement} aria-labelledby="sl-if">
          <h2 id="sl-if" className={styles.h2}>Three ways to mean &ldquo;if&rdquo;</h2>
          <p className={styles.lede}>
            The conditional is where the schools broke apart, and the disagreement is not a quibble:
            only the first of these can be settled by looking at the truth values. The other two ask
            what is possible, which no table can show you.
          </p>
          <div className={styles.rivals}>
            {conditionals.map(c => (
              <div key={c.id} className={styles.rival}>
                <h3>{c.who}</h3>
                <p className={styles.rivalClaim}>{c.claim}</p>
                <p className={styles.rivalFlag}>
                  {c.truthFunctional ? 'Readable from a truth table' : 'Not readable from a truth table'}
                </p>
                <p className={styles.rivalNote}>{c.note}</p>
              </div>
            ))}
          </div>
          <p className={styles.ourNote}>
            Chrysippus&rsquo;s is the account Diogenes states, and it is quoted above. Philo&rsquo;s
            and Diodorus&rsquo;s reach us through Sextus Empiricus, who is not in the Corpus, so
            they are reported here after Benson Mates, Stoic Logic, and are not quoted.
          </p>
        </section>

        <section className={styles.movement} aria-labelledby="sl-close">
          <h2 id="sl-close" className={styles.h2}>Why you were not taught this</h2>
          <p className={styles.closing}>{closing}</p>
          <p className={styles.lede}>
            <Link className={styles.onward} href="/playground/the-impression">
              The Impression asks what happens before any of this starts →
            </Link>
          </p>
        </section>

        <section className={styles.movement}>
          <CorpusDiscussion
            threadKey="playground:stoic-logic"
            context="Stoic propositional logic: the five indemonstrables at Diogenes Laertius 7.80 to 7.81, the exclusive disjunction at 7.72, Chrysippus's connexive conditional at 7.73, and the contrast with Aristotle's logic of terms."
            heading="Take a side"
            intro="Chrysippus claimed the five were complete. Was he right, and how would anyone now tell?"
          />
        </section>
      </div>
    </main>
  )
}

/** What can bear a truth value at all, which is where the system starts. */
function Propositions() {
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const score = useMemo(() => {
    const done = utterances.filter(u => picked[u.text] !== undefined)
    const right = done.filter(u => picked[u.text] === u.proposition)
    return { done: done.length, right: right.length }
  }, [picked])

  return (
    <section className={styles.movement} aria-labelledby="sl-prop">
      <h2 id="sl-prop" className={styles.h2}>First, what can be true</h2>
      <p className={styles.lede}>
        Logic runs on propositions, and not everything you can say is one. A question is not false.
        An order is not true. Before anything can be inferred, the Stoics had to say which
        utterances are even eligible. Sort these.
      </p>

      <ul className={styles.utterances}>
        {utterances.map(u => {
          const choice = picked[u.text]
          const answered = choice !== undefined
          const right = choice === u.proposition
          return (
            <li key={u.text} className={styles.utterance}>
              <span className={styles.utteranceText}>{u.text}</span>
              <span className={styles.utteranceButtons}>
                <button
                  type="button"
                  className={`${styles.sortBtn} ${answered && choice ? (right ? styles.sortRight : styles.sortWrong) : ''}`}
                  onClick={() => setPicked(s => ({ ...s, [u.text]: true }))}
                >
                  true or false
                </button>
                <button
                  type="button"
                  className={`${styles.sortBtn} ${answered && !choice ? (right ? styles.sortRight : styles.sortWrong) : ''}`}
                  onClick={() => setPicked(s => ({ ...s, [u.text]: false }))}
                >
                  neither
                </button>
              </span>
              {answered ? <span className={styles.utteranceKind}>{u.kind}</span> : null}
            </li>
          )
        })}
      </ul>

      <p className={styles.verdict} aria-live="polite">
        {score.done ? `${score.right} of ${score.done} sorted as the Stoics would.` : 'Six utterances. Only some of them can be true.'}
      </p>

      <figure className={styles.quote}>
        <blockquote>{propositionTest.dl}</blockquote>
        <figcaption>{propositionTest.dlCite} <span className={styles.tr}>tr. R. D. Hicks, 1925</span></figcaption>
      </figure>
    </section>
  )
}

/** The truth table, which the Stoics did not draw but did specify. */
function Connectives() {
  const [p, setP] = useState(true)
  const [q, setQ] = useState(false)

  const values = {
    conjunction: p && q,
    disjunction: p !== q, // exclusive, per 7.72
    conditional: !(p && !q), // Philo's account, the only truth-functional one
  }

  return (
    <section className={styles.movement} aria-labelledby="sl-conn">
      <h2 id="sl-conn" className={styles.h2}>The three connectives</h2>
      <p className={styles.lede}>
        Set the two propositions true or false and watch what the Stoic connectives do with them.
        The disjunction is the one that surprises people: the text says outright that &ldquo;either&rdquo;
        guarantees one alternative is false, so it is exclusive, and the fourth indemonstrable
        depends on that.
      </p>

      <div className={styles.switches}>
        <button type="button" className={styles.switch} onClick={() => setP(v => !v)} aria-pressed={p}>
          <span className={styles.switchLabel}>the first</span>
          <span className={p ? styles.on : styles.off}>{p ? 'true' : 'false'}</span>
        </button>
        <button type="button" className={styles.switch} onClick={() => setQ(v => !v)} aria-pressed={q}>
          <span className={styles.switchLabel}>the second</span>
          <span className={q ? styles.on : styles.off}>{q ? 'true' : 'false'}</span>
        </button>
      </div>

      <div className={styles.table}>
        {connectives.map(c => {
          const v = values[c.id]
          return (
            <div key={c.id} className={styles.row}>
              <div className={styles.rowHead}>
                <h3>{c.name}</h3>
                <p className={styles.word}>
                  {c.id === 'conjunction' ? 'the first and the second'
                    : c.id === 'disjunction' ? 'either the first or the second'
                      : 'if the first, then the second'}
                </p>
              </div>
              <div className={`${styles.cell} ${v ? styles.cellTrue : styles.cellFalse}`} aria-live="polite">
                {v ? 'true' : 'false'}
              </div>
              <p className={styles.rowGloss}>
                {c.gloss}
                {c.id === 'conditional' ? ' The value shown is Philo’s, because his is the only one a table can decide.' : ''}
              </p>
            </div>
          )
        })}
      </div>

      {connectives.map(c => (
        <figure key={c.id} className={`${styles.quote} ${styles.quoteAside}`}>
          <blockquote>{c.dl}</blockquote>
          <figcaption>{c.dlCite} <span className={styles.tr}>tr. R. D. Hicks, 1925</span></figcaption>
        </figure>
      ))}
    </section>
  )
}
