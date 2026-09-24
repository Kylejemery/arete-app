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
  inline = false,
  caret = null,
  saveLabel = 'Save',
}: {
  source: string
  onSave: (next: string) => void
  onCancel: () => void
  /** The whole draft rather than one block: taller, and the hint says so. */
  whole?: boolean
  /** Opened by clicking into the prose: set in the prose's own type, sized to
   *  its content, and saved when focus leaves it. */
  inline?: boolean
  /** Where to put the caret on open (a source offset); end of text if null. */
  caret?: number | null
  saveLabel?: string
}) {
  const [buffer, setBuffer] = useState(source)
  const ref = useRef<HTMLTextAreaElement>(null)
  const pendingSel = useRef<[number, number] | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || whole) return
    const at = caret === null ? el.value.length : Math.min(caret, el.value.length)
    el.setSelectionRange(at, at)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Grow with the text rather than scroll inside a box, so typing in a
  // passage reads like typing in the page.
  useEffect(() => {
    const el = ref.current
    if (!el || whole) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [buffer, whole])

  const save = (next: string) => { if (done.current) return; done.current = true; onSave(next) }
  const cancel = () => { if (done.current) return; done.current = true; onCancel() }

  // Clicking anywhere outside the passage keeps what was typed.
  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!inline) return
    if (e.relatedTarget instanceof Node && wrapRef.current?.contains(e.relatedTarget)) return
    if (buffer === source) cancel()
    else save(buffer)
  }

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
    if (e.key === 'Escape') { e.preventDefault(); cancel(); return }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(buffer); return }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); format('bold') }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); format('italic') }
  }

  const rows = whole ? undefined : 1

  return (
    <div
      ref={wrapRef}
      className={`${styles.blockEditor} ${whole ? styles.wholeEditor : ''} ${inline ? styles.inlineEditor : ''}`}
      onBlur={onBlur}
    >
      <FormatBar onFormat={format} />
      <textarea
        ref={ref}
        className={`${styles.blockTextarea} ${whole ? styles.wholeTextarea : ''} ${inline ? styles.inlineTextarea : ''}`}
        value={buffer}
        autoFocus
        rows={rows}
        spellCheck
        onChange={e => setBuffer(e.target.value)}
        onKeyDown={onKey}
      />
      <div className={styles.blockEditorBtns}>
        {/* mousedown kept from the textarea so a click here is not a blur-save. */}
        <button className={styles.hunkBtn} onMouseDown={e => e.preventDefault()} onClick={() => save(buffer)} disabled={buffer === source}>
          {saveLabel}
        </button>
        <button className={styles.hunkBtn} onMouseDown={e => e.preventDefault()} onClick={cancel}>Cancel</button>
        <span className={styles.blockEditorHint}>
          {inline ? 'Click away or ⌘↵ to save' : '⌘↵ to save'} · Esc to cancel · ⌘B bold · ⌘I italic{whole ? ' · the whole draft, as markdown' : ''}
        </span>
      </div>
    </div>
  )
}
