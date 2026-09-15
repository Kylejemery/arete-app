'use client'

// The draft's editors: a formatting toolbar over a markdown textarea. Used in
// place for one block (ProseView) and for the whole draft (DraftWorkspace).
// Formatting is applied to the source, so it reads as headings, quotes, lists,
// and emphasis in the pane, in the changes view, and in the Word export.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { applyFormat, FORMAT_LABELS, type FormatAction } from '@/lib/scribe/format'
import styles from './draft.module.css'

export function FormatBar({
  onFormat,
  disabled,
}: {
  onFormat: (a: FormatAction) => void
  disabled?: boolean
}) {
  return (
    <div className={styles.formatBar} role="toolbar" aria-label="Formatting">
      {FORMAT_LABELS.map(f => (
        <button
          key={f.action}
          type="button"
          className={`${styles.formatBtn} ${f.action === 'bold' ? styles.formatBold : f.action === 'italic' ? styles.formatItalic : ''}`}
          title={f.title}
          disabled={disabled}
          // mousedown, not click, so the textarea keeps its selection.
          onMouseDown={e => { e.preventDefault(); onFormat(f.action) }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

export default function MarkdownEditor({
  source,
  onSave,
  onCancel,
  whole = false,
  saveLabel = 'Save',
}: {
  source: string
  onSave: (next: string) => void
  onCancel: () => void
  /** The whole draft rather than one block: taller, and the hint says so. */
  whole?: boolean
  saveLabel?: string
}) {
  const [buffer, setBuffer] = useState(source)
  const ref = useRef<HTMLTextAreaElement>(null)
  const pendingSel = useRef<[number, number] | null>(null)

  useEffect(() => {
    if (!pendingSel.current || !ref.current) return
    const [a, b] = pendingSel.current
    pendingSel.current = null
    ref.current.focus()
    ref.current.setSelectionRange(a, b)
  }, [buffer])

  function format(action: FormatAction) {
    const el = ref.current
    if (!el) return
    const next = applyFormat(buffer, el.selectionStart, el.selectionEnd, action)
    pendingSel.current = [next.selStart, next.selEnd]
    setBuffer(next.text)
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); return }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onSave(buffer); return }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); format('bold') }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); format('italic') }
  }

  const rows = whole ? undefined : Math.min(20, Math.max(3, buffer.split('\n').length + 2))

  return (
    <div className={`${styles.blockEditor} ${whole ? styles.wholeEditor : ''}`}>
      <FormatBar onFormat={format} />
      <textarea
        ref={ref}
        className={`${styles.blockTextarea} ${whole ? styles.wholeTextarea : ''}`}
        value={buffer}
        autoFocus
        rows={rows}
        spellCheck
        onChange={e => setBuffer(e.target.value)}
        onKeyDown={onKey}
      />
      <div className={styles.blockEditorBtns}>
        <button className={styles.hunkBtn} onClick={() => onSave(buffer)} disabled={buffer === source}>
          {saveLabel}
        </button>
        <button className={styles.hunkBtn} onClick={onCancel}>Cancel</button>
        <span className={styles.blockEditorHint}>
          ⌘↵ to save · Esc to cancel · ⌘B bold · ⌘I italic{whole ? ' · the whole draft, as markdown' : ''}
        </span>
      </div>
    </div>
  )
}
