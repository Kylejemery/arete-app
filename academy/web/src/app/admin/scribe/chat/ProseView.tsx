'use client'

// Typesets a Scribe draft as an essay rather than dumping it as preformatted
// text, and is also where the draft becomes a document you can work in: each
// block can be opened and edited in place, and any block can be painted with
// highlight ranges (a voice-meter category, an outside-read finding, a source
// the draft cites). Used by both the narrow draft pane and the full-page
// workspace; `compact` only changes the type scale.

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  blockSource,
  highlightSpans,
  parseInline,
  parseProse,
  type Block,
  type Highlight,
  type Inline,
} from '@/lib/scribe/prose'
import styles from './draft.module.css'

interface Painted {
  nodes: ReactNode
  hits: number
}

// Apply highlight ranges to inline segments. Ranges are computed over the
// plain text (markers already stripped by parseInline), so the two always
// agree on offsets no matter how the block is emphasised.
function paint(text: string, highlight: Highlight | null, firstRef?: (el: HTMLElement | null) => void): Painted {
  const segs: Inline[] = parseInline(text)
  const plain = segs.map(s => s.text).join('')
  const spans = highlightSpans(plain, highlight)

  const wrap = (seg: Inline, key: string, inner: ReactNode): ReactNode => {
    if (seg.type === 'strong') return <strong key={key}>{inner}</strong>
    if (seg.type === 'em') return <em key={key}>{inner}</em>
    if (seg.type === 'gap') return <mark key={key} className={styles.gap}>{inner}</mark>
    return <Fragment key={key}>{inner}</Fragment>
  }

  if (!spans.length) {
    return { nodes: segs.map((s, i) => wrap(s, `s${i}`, s.text)), hits: 0 }
  }

  let cursor = 0
  let hitIndex = 0
  const nodes = segs.map((seg, i) => {
    const segStart = cursor
    const segEnd = cursor + seg.text.length
    cursor = segEnd

    const overlapping = spans.filter(s => s.start < segEnd && s.end > segStart)
    if (!overlapping.length) return wrap(seg, `s${i}`, seg.text)

    const parts: ReactNode[] = []
    let at = segStart
    for (const s of overlapping) {
      const hs = Math.max(s.start, segStart)
      const he = Math.min(s.end, segEnd)
      if (hs > at) parts.push(seg.text.slice(at - segStart, hs - segStart))
      const isFirst = hitIndex === 0
      hitIndex++
      parts.push(
        <mark
          key={`h${hs}`}
          className={styles.hit}
          ref={isFirst && firstRef ? firstRef : undefined}
        >
          {seg.text.slice(hs - segStart, he - segStart)}
        </mark>
      )
      at = he
    }
    if (at < segEnd) parts.push(seg.text.slice(at - segStart))
    return wrap(seg, `s${i}`, parts)
  })

  return { nodes, hits: spans.length }
}

function Painted({
  text,
  highlight,
  firstRef,
}: {
  text: string
  highlight: Highlight | null
  firstRef?: (el: HTMLElement | null) => void
}) {
  return <>{paint(text, highlight, firstRef).nodes}</>
}

export function Inlines({ text }: { text: string }) {
  return <Painted text={text} highlight={null} />
}

function BlockBody({
  block,
  highlight,
  firstRef,
}: {
  block: Block
  highlight: Highlight | null
  firstRef?: (el: HTMLElement | null) => void
}) {
  switch (block.type) {
    case 'h1':
      return <h1 className={styles.h1}><Painted text={block.text} highlight={highlight} firstRef={firstRef} /></h1>
    case 'h2':
      return <h2 className={styles.h2}><Painted text={block.text} highlight={highlight} firstRef={firstRef} /></h2>
    case 'h3':
      return <h3 className={styles.h3}><Painted text={block.text} highlight={highlight} firstRef={firstRef} /></h3>
    case 'quote':
      return <blockquote className={styles.quote}><Painted text={block.text} highlight={highlight} firstRef={firstRef} /></blockquote>
    case 'hr':
      return <hr className={styles.hr} />
    case 'list':
      return block.ordered ? (
        <ol className={styles.list}>
          {block.items.map((it, i) => <li key={i}><Painted text={it} highlight={highlight} /></li>)}
        </ol>
      ) : (
        <ul className={styles.list}>
          {block.items.map((it, i) => <li key={i}><Painted text={it} highlight={highlight} /></li>)}
        </ul>
      )
    default:
      return <p className={styles.p}><Painted text={block.text} highlight={highlight} firstRef={firstRef} /></p>
  }
}

function EditableBlock({
  source,
  onSave,
  onCancel,
}: {
  source: string
  onSave: (next: string) => void
  onCancel: () => void
}) {
  const [buffer, setBuffer] = useState(source)
  return (
    <div className={styles.blockEditor}>
      <textarea
        className={styles.blockTextarea}
        value={buffer}
        autoFocus
        rows={Math.min(20, Math.max(3, buffer.split('\n').length + 2))}
        onChange={e => setBuffer(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(buffer) }
        }}
      />
      <div className={styles.blockEditorBtns}>
        <button className={styles.hunkBtn} onClick={() => onSave(buffer)} disabled={buffer === source}>
          Save
        </button>
        <button className={styles.hunkBtn} onClick={onCancel}>Cancel</button>
        <span className={styles.blockEditorHint}>⌘↵ to save · Esc to cancel</span>
      </div>
    </div>
  )
}

export default function ProseView({
  text,
  compact = false,
  highlight = null,
  scrollKey,
  onEditBlock,
}: {
  text: string
  compact?: boolean
  highlight?: Highlight | null
  /** Changing this scrolls the first highlighted span into view. */
  scrollKey?: string | number
  /** Omit to render read-only. */
  onEditBlock?: (block: Block, nextSource: string) => void
}) {
  const blocks = parseProse(text)
  const [editing, setEditing] = useState<number | null>(null)
  const firstHit = useRef<HTMLElement | null>(null)
  const claimed = useRef(false)
  claimed.current = false

  useEffect(() => {
    if (scrollKey === undefined) return
    firstHit.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [scrollKey, highlight])

  // Editing is per-render-position; a new draft closes any open editor.
  useEffect(() => { setEditing(null) }, [text])

  // Only the first highlighted span in the whole document takes the ref.
  const takeFirstRef = (el: HTMLElement | null) => {
    if (el && !claimed.current) {
      claimed.current = true
      firstHit.current = el
    }
  }

  return (
    <div className={`${styles.prose} ${compact ? styles.proseCompact : ''}`}>
      {blocks.map((b, i) =>
        editing === i && onEditBlock ? (
          <EditableBlock
            key={i}
            source={blockSource(text, b)}
            onSave={next => { setEditing(null); onEditBlock(b, next) }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={i} className={onEditBlock ? styles.blockWrap : undefined}>
            <BlockBody block={b} highlight={highlight} firstRef={takeFirstRef} />
            {onEditBlock && b.type !== 'hr' && (
              <button
                className={styles.blockEditBtn}
                onClick={() => setEditing(i)}
                title="Edit this passage in place"
                aria-label="Edit this passage"
              >
                ✎
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}
