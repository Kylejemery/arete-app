'use client'

// Typesets a Scribe draft as an essay rather than dumping it as preformatted
// text, and is also where the draft becomes a document you can work in: each
// block can be opened and edited in place, and any block can be painted with
// highlight ranges (a voice-meter category, an outside-read finding, a source
// the draft cites). Used by both the narrow draft pane and the full-page
// workspace; `compact` only changes the type scale.

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import MarkdownEditor from './MarkdownEditor'
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

// Where a click landed, as an offset into the block's rendered text, so the
// editor can open with the caret in the same place.
function renderedOffsetAt(host: HTMLElement, x: number, y: number): number | null {
  type CaretDoc = Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const d = document as CaretDoc
  let node: Node | null = null
  let offset = 0
  const pos = d.caretPositionFromPoint?.(x, y)
  if (pos) { node = pos.offsetNode; offset = pos.offset }
  else {
    const r = d.caretRangeFromPoint?.(x, y)
    if (r) { node = r.startContainer; offset = r.startOffset }
  }
  if (!node || !host.contains(node)) return null
  const before = document.createRange()
  before.selectNodeContents(host)
  before.setEnd(node, offset)
  return before.toString().length
}

// The rendered text is the source with its markup (#, >, -, *, _, the gap
// brackets) taken out, so it is a subsequence of the source. Walk the two
// together to carry a rendered offset back to a source offset.
function sourceOffset(source: string, rendered: string, at: number): number {
  let s = 0
  let p = 0
  while (s < source.length && p < at) {
    if (source[s] === rendered[p]) p++
    s++
  }
  return s
}

// A click this long without a second click or a drag is a click to type. The
// wait lets a double-click select a word for the selection bar instead.
const CLICK_TO_EDIT_MS = 220

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

export default function ProseView({
  text,
  compact = false,
  pane = false,
  highlight = null,
  scrollKey,
  onEditBlock,
}: {
  text: string
  compact?: boolean
  /** The wide draft column: essay measure and size, short of the full page. */
  pane?: boolean
  highlight?: Highlight | null
  /** Changing this scrolls the first highlighted span into view. */
  scrollKey?: string | number
  /** Omit to render read-only. */
  onEditBlock?: (block: Block, nextSource: string) => void
}) {
  const blocks = parseProse(text)
  const [editing, setEditing] = useState<{ index: number; caret: number | null } | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstHit = useRef<HTMLElement | null>(null)
  const claimed = useRef(false)
  claimed.current = false

  useEffect(() => {
    if (scrollKey === undefined) return
    firstHit.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [scrollKey, highlight])

  // Editing is per-render-position; a new draft closes any open editor.
  useEffect(() => { setEditing(null) }, [text])

  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current) }, [])

  // Click into a passage to type in it. A drag or a double-click is a
  // selection, which belongs to the selection bar, so neither opens the editor.
  const clickToEdit = (i: number, b: Block) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null }
    if (!onEditBlock || b.type === 'hr' || e.detail !== 1) return
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) return
    const host = e.currentTarget
    const rendered = host.textContent ?? ''
    const at = renderedOffsetAt(host, e.clientX, e.clientY)
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) return
      const caret = at === null ? null : sourceOffset(blockSource(text, b), rendered, at)
      setEditing({ index: i, caret })
    }, CLICK_TO_EDIT_MS)
  }

  // Only the first highlighted span in the whole document takes the ref.
  const takeFirstRef = (el: HTMLElement | null) => {
    if (el && !claimed.current) {
      claimed.current = true
      firstHit.current = el
    }
  }

  return (
    <div className={`${styles.prose} ${compact ? styles.proseCompact : ''} ${pane ? styles.prosePane : ''}`}>
      {blocks.map((b, i) =>
        editing?.index === i && onEditBlock ? (
          <MarkdownEditor
            key={i}
            inline
            caret={editing.caret}
            source={blockSource(text, b)}
            onSave={next => { setEditing(null); onEditBlock(b, next) }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div
            key={i}
            className={onEditBlock ? `${styles.blockWrap} ${b.type !== 'hr' ? styles.blockTypable : ''}` : undefined}
            onClick={onEditBlock ? clickToEdit(i, b) : undefined}
          >
            <BlockBody block={b} highlight={highlight} firstRef={takeFirstRef} />
            {onEditBlock && b.type !== 'hr' && (
              <button
                className={styles.blockEditBtn}
                onClick={() => setEditing({ index: i, caret: null })}
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
