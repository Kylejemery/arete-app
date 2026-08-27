'use client'

// The changes view: what this Scribe turn actually did to the working draft,
// hunk by hunk, in colour — and Kyle's three verbs on each one. Keep takes
// Scribe's revision, Revert restores what the draft said before, Edit lets him
// write the passage himself. Unchanged prose renders normally around them so
// the essay still reads as an essay while he works through the changes.

import { useState } from 'react'
import ProseView from './ProseView'
import { hunkKind, type Decision, type DiffPart } from '@/lib/scribe/diff'
import styles from './draft.module.css'

const KIND_LABEL: Record<'added' | 'removed' | 'revised', string> = {
  added: 'Added',
  removed: 'Cut',
  revised: 'Revised',
}

function currentText(part: Extract<DiffPart, { kind: 'hunk' }>, d: Decision): string {
  if (d.mode === 'edit') return d.text
  if (d.mode === 'dismiss') return part.baseLines.join('\n')
  return part.headLines.join('\n')
}

function HunkCard({
  part,
  decision,
  onDecide,
}: {
  part: Extract<DiffPart, { kind: 'hunk' }>
  decision: Decision
  onDecide: (d: Decision) => void
}) {
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState('')
  const kind = hunkKind(part)

  const startEdit = () => {
    setBuffer(currentText(part, decision))
    setEditing(true)
  }

  const stateClass =
    decision.mode === 'dismiss' ? styles.hunkReverted
    : decision.mode === 'edit' ? styles.hunkEdited
    : styles.hunkKept

  return (
    <div className={`${styles.hunk} ${stateClass}`}>
      <div className={styles.hunkBar}>
        <span className={`${styles.hunkKind} ${styles[`kind_${kind}`]}`}>{KIND_LABEL[kind]}</span>
        <span className={styles.hunkState}>
          {decision.mode === 'dismiss' ? 'reverted' : decision.mode === 'edit' ? 'your wording' : 'keeping'}
        </span>
        <span className={styles.hunkBtns}>
          <button
            className={`${styles.hunkBtn} ${decision.mode === 'accept' ? styles.hunkBtnOn : ''}`}
            onClick={() => { setEditing(false); onDecide({ mode: 'accept' }) }}
            title="Keep Scribe's revision"
          >
            Keep
          </button>
          <button
            className={`${styles.hunkBtn} ${decision.mode === 'dismiss' ? styles.hunkBtnOn : ''}`}
            onClick={() => { setEditing(false); onDecide({ mode: 'dismiss' }) }}
            disabled={!part.baseLines.length && !part.headLines.length}
            title="Put back what the draft said before"
          >
            Revert
          </button>
          <button
            className={`${styles.hunkBtn} ${decision.mode === 'edit' ? styles.hunkBtnOn : ''}`}
            onClick={startEdit}
            title="Write this passage yourself"
          >
            Edit
          </button>
        </span>
      </div>

      {editing ? (
        <div className={styles.hunkEdit}>
          <textarea
            className={styles.hunkTextarea}
            value={buffer}
            autoFocus
            rows={Math.min(18, Math.max(3, buffer.split('\n').length + 1))}
            onChange={e => setBuffer(e.target.value)}
          />
          <div className={styles.hunkEditBtns}>
            <button
              className={styles.hunkBtn}
              onClick={() => { onDecide({ mode: 'edit', text: buffer }); setEditing(false) }}
            >
              Save wording
            </button>
            <button className={styles.hunkBtn} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : decision.mode === 'edit' ? (
        <div className={styles.hunkBody}>{decision.text}</div>
      ) : decision.mode === 'dismiss' ? (
        <div className={`${styles.hunkBody} ${styles.hunkBodyMuted}`}>
          {part.baseLines.length ? part.baseLines.join('\n') : '(nothing — the addition is dropped)'}
        </div>
      ) : part.words ? (
        <div className={styles.hunkBody}>
          {part.words.map((w, i) =>
            w.type === 'ins' ? <ins key={i} className={styles.ins}>{w.text}</ins>
            : w.type === 'del' ? <del key={i} className={styles.del}>{w.text}</del>
            : <span key={i}>{w.text}</span>
          )}
        </div>
      ) : (
        <div className={styles.hunkBody}>
          {part.baseLines.length > 0 && <del className={styles.del}>{part.baseLines.join('\n')}</del>}
          {part.baseLines.length > 0 && part.headLines.length > 0 && '\n'}
          {part.headLines.length > 0 && <ins className={styles.ins}>{part.headLines.join('\n')}</ins>}
        </div>
      )}
    </div>
  )
}

export default function DiffView({
  parts,
  decisions,
  onDecide,
  compact = false,
}: {
  parts: DiffPart[]
  decisions: Record<number, Decision>
  onDecide: (id: number, d: Decision) => void
  compact?: boolean
}) {
  return (
    <div className={styles.diffDoc}>
      {parts.map((p, i) => {
        if (p.kind === 'same') {
          const text = p.lines.join('\n')
          if (!text.trim()) return null
          return (
            <div key={`s${i}`} className={styles.diffSame}>
              <ProseView text={text} compact={compact} />
            </div>
          )
        }
        return (
          <HunkCard
            key={`h${p.id}`}
            part={p}
            decision={decisions[p.id] ?? { mode: 'accept' }}
            onDecide={d => onDecide(p.id, d)}
          />
        )
      })}
    </div>
  )
}
