'use client'

// Typesets a Scribe draft as an essay rather than dumping it as preformatted
// text. Used by both the narrow draft pane and the full-page workspace; the
// only difference is the `compact` flag, which shrinks the type scale.

import { Fragment } from 'react'
import { parseProse, parseInline, type Block } from '@/lib/scribe/prose'
import styles from './draft.module.css'

export function Inlines({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) => {
        if (seg.type === 'strong') return <strong key={i}>{seg.text}</strong>
        if (seg.type === 'em') return <em key={i}>{seg.text}</em>
        if (seg.type === 'gap') return <mark key={i} className={styles.gap}>{seg.text}</mark>
        return <Fragment key={i}>{seg.text}</Fragment>
      })}
    </>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'h1':
      return <h1 className={styles.h1}><Inlines text={block.text} /></h1>
    case 'h2':
      return <h2 className={styles.h2}><Inlines text={block.text} /></h2>
    case 'h3':
      return <h3 className={styles.h3}><Inlines text={block.text} /></h3>
    case 'quote':
      return <blockquote className={styles.quote}><Inlines text={block.text} /></blockquote>
    case 'hr':
      return <hr className={styles.hr} />
    case 'list':
      return block.ordered ? (
        <ol className={styles.list}>
          {block.items.map((it, i) => <li key={i}><Inlines text={it} /></li>)}
        </ol>
      ) : (
        <ul className={styles.list}>
          {block.items.map((it, i) => <li key={i}><Inlines text={it} /></li>)}
        </ul>
      )
    default:
      return <p className={styles.p}><Inlines text={block.text} /></p>
  }
}

export default function ProseView({ text, compact = false }: { text: string; compact?: boolean }) {
  const blocks = parseProse(text)
  return (
    <div className={`${styles.prose} ${compact ? styles.proseCompact : ''}`}>
      {blocks.map((b, i) => <BlockView key={i} block={b} />)}
    </div>
  )
}
