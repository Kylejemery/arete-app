'use client'

// What Scribe retrieved this turn, tied to where it landed. Clicking a source
// paints its author and work in the draft and scrolls to the first mention, so
// "which sentence is this holding up?" stops being a manual search. A source
// with no mention anywhere is marked unplaced, which is real signal: Scribe
// searched, found it, and chose not to use it.

import { containsPhrase, type Highlight } from '@/lib/scribe/prose'
import chat from './chat.module.css'
import styles from './draft.module.css'
import type { Source } from './types'

// Names the draft would plausibly use for this source. Every name token counts,
// not just the surname: essays call him Marcus far more often than Aurelius.
// Kyle's own log entries are spine material woven in as his voice, never cited
// by name, so there is nothing to anchor and we do not pretend otherwise.
export function anchorPhrases(s: Source): string[] {
  if (s.author === 'Kyle' || s.work.startsWith('Log —')) return []
  const work = s.work.split(/[:(]/)[0].trim()
  const out = [s.author, ...s.author.split(/\s+/), work]
  return [...new Set(out)].filter(p => p.length >= 4)
}

export default function SourceList({
  sources,
  draftText,
  highlight,
  onHighlight,
  emptyNote,
}: {
  sources: Source[]
  draftText: string | null
  highlight: Highlight | null
  onHighlight: (h: Highlight | null) => void
  emptyNote: string
}) {
  if (!sources.length) return <p className={chat.draftEmpty}>{emptyNote}</p>

  const activePhrases = highlight?.kind === 'phrases' ? highlight.phrases.join('|') : null

  return (
    <>
      {sources.map(s => {
        const phrases = anchorPhrases(s)
        const placed = !!draftText && phrases.some(p => containsPhrase(draftText, p))
        const isActive = !!phrases.length && activePhrases === phrases.join('|')
        return (
          <div
            key={s.chunk_id}
            className={`${chat.sourceItem} ${phrases.length ? styles.sourceClickable : ''} ${isActive ? styles.sourceOn : ''}`}
            onClick={() => {
              if (!phrases.length) return
              onHighlight(isActive ? null : { kind: 'phrases', phrases })
            }}
            title={phrases.length ? 'Show where this lands in the draft' : undefined}
          >
            <span className={`${chat.sourceMode} ${s.mode === 'quote' ? chat.modeQuote : chat.modeParaphrase}`}>
              {s.mode === 'quote' ? 'QUOTE' : 'PARAPHRASE'}
            </span>
            <strong>{s.author}</strong>{' '}
            <span className={chat.sourceLoc}>
              — {[s.work, s.section_label].filter(Boolean).join(' ')}
              {s.translator ? `, trans. ${s.translator}` : ''}
            </span>
            {phrases.length > 0 && draftText && (
              <span className={placed ? styles.placed : styles.unplaced}>
                {placed ? 'placed' : 'not placed'}
              </span>
            )}
            <div className={chat.sourceQuery}>for: “{s.query}”</div>
          </div>
        )
      })}
    </>
  )
}
