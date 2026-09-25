'use client'

// Highlight a passage in the draft and act on it. Without this, directing a
// revision means describing in the composer which sentence you mean, which is
// the most common and most tedious loop in the whole tool. The bar floats over
// the selection and turns it into a scoped instruction Scribe is told to obey
// narrowly, so the change comes back as one reviewable hunk.

import { useCallback, useEffect, useRef, useState } from 'react'
import { SCOPED_LABELS, type ScopedAction } from '@/lib/scribe/scoped-turns'
import styles from './draft.module.css'

const ACTIONS: ScopedAction[] = ['revise', 'voice', 'ground', 'cut', 'explain']
const MIN_CHARS = 4

export default function SelectionBar({
  containerRef,
  disabled,
  onAction,
}: {
  containerRef: React.RefObject<HTMLElement | null>
  disabled?: boolean
  onAction: (action: ScopedAction, selection: string, note?: string) => void
}) {
  const [sel, setSel] = useState<{ text: string; top: number; left: number } | null>(null)
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState('')
  const rangeRef = useRef<Range | null>(null)

  const place = useCallback((range: Range, text: string) => {
    const r = range.getBoundingClientRect()
    setSel({ text, top: r.top, left: r.left + r.width / 2 })
  }, [])

  const clear = useCallback(() => {
    rangeRef.current = null
    setSel(null)
    setNoting(false)
    setNote('')
  }, [])

  useEffect(() => {
    if (disabled) { clear(); return }

    const read = () => {
      const s = window.getSelection()
      if (!s || s.isCollapsed || s.rangeCount === 0) { clear(); return }
      const range = s.getRangeAt(0)
      const host = containerRef.current
      if (!host || !host.contains(range.commonAncestorContainer)) { clear(); return }
      const text = s.toString().trim()
      if (text.length < MIN_CHARS) { clear(); return }
      rangeRef.current = range
      place(range, text)
    }

    const onScrollOrResize = () => {
      if (rangeRef.current && sel) place(rangeRef.current, sel.text)
    }

    document.addEventListener('mouseup', read)
    document.addEventListener('keyup', read)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mouseup', read)
      document.removeEventListener('keyup', read)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [containerRef, disabled, clear, place, sel])

  if (!sel) return null

  const fire = (action: ScopedAction, withNote?: string) => {
    onAction(action, sel.text, withNote)
    window.getSelection()?.removeAllRanges()
    clear()
  }

  return (
    <div
      className={styles.selBar}
      style={{ top: Math.max(8, sel.top - 46), left: sel.left }}
      // Keep the selection alive while the bar is being clicked.
      onMouseDown={e => e.preventDefault()}
    >
      {noting ? (
        <>
          <input
            className={styles.selInput}
            autoFocus
            placeholder="What should change here?"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); fire('revise', note) }
              if (e.key === 'Escape') { e.preventDefault(); setNoting(false) }
            }}
          />
          <button className={styles.selBtn} onClick={() => fire('revise', note)}>Send</button>
        </>
      ) : (
        ACTIONS.map(a => (
          <button
            key={a}
            className={styles.selBtn}
            onClick={() => (a === 'revise' ? setNoting(true) : fire(a))}
          >
            {SCOPED_LABELS[a]}
          </button>
        ))
      )}
    </div>
  )
}
