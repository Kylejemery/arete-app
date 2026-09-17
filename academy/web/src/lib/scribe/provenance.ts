// Whose sentences are these?
//
// Every draft state in a Scribe thread is attributable: the journal fragment
// is the writer's, a draft that arrived on one of their hand revisions is
// theirs, and a draft that arrived on a Scribe turn is Scribe's. So for any
// sentence in the working draft there is a first moment it appeared, and the
// role that produced that state is where the sentence came from.
//
// That makes provenance a fact about the thread rather than a guess about
// style: no model call, no fuzzy authorship score. The number it yields is
// the share of the finished essay the writer has actually written, which is
// the number worth watching before the retype.
//
// Pure module: no React, no DOM.

import { sentenceRanges } from '@/lib/sentences'

export type Origin = 'you' | 'scribe'

export interface DraftState {
  role: 'user' | 'scribe'
  text: string
}

export interface OriginSpan {
  start: number
  end: number
  origin: Origin
}

export interface Provenance {
  spans: OriginSpan[]
  yourWords: number
  scribeWords: number
  totalWords: number
  /** Share of the draft's words the writer wrote, 0 to 100. */
  yourShare: number
}

// Fold to a comparison key: case, whitespace, and the typography that a
// retype changes without changing authorship.
function key(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordCount(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length
}

// `history` is every committed draft state in thread order, oldest first;
// `rawText` is the journal fragment the entry started from, which counts as
// the writer's. The last state is normally the draft being measured, but any
// text may be passed (a preview, a snapshot) and is attributed against the
// same history.
export function attributeDraft(
  draft: string,
  history: DraftState[],
  rawText?: string | null
): Provenance {
  // The earliest state each sentence appears in, and who produced it.
  const states: DraftState[] = []
  if (rawText?.trim()) states.push({ role: 'user', text: rawText })
  states.push(...history)

  const seen = new Map<string, Origin>()
  for (const st of states) {
    const origin: Origin = st.role === 'user' ? 'you' : 'scribe'
    for (const r of sentenceRanges(st.text)) {
      const k = key(st.text.slice(r.start, r.end))
      if (k.length >= 12 && !seen.has(k)) seen.set(k, origin)
    }
  }

  const spans: OriginSpan[] = []
  let yourWords = 0
  let scribeWords = 0
  for (const r of sentenceRanges(draft)) {
    const text = draft.slice(r.start, r.end)
    const k = key(text)
    // A sentence with no earlier appearance arrived with the draft in hand:
    // if that draft is the writer's own edit it is theirs, and history says
    // so. Anything still unseen is new prose from the current state, which
    // for an unattributed draft is the honest default of Scribe's.
    const origin: Origin = seen.get(k) ?? 'scribe'
    spans.push({ start: r.start, end: r.end, origin })
    const words = wordCount(text)
    if (origin === 'you') yourWords += words
    else scribeWords += words
  }

  const totalWords = yourWords + scribeWords
  return {
    spans,
    yourWords,
    scribeWords,
    totalWords,
    yourShare: totalWords ? Math.round((yourWords / totalWords) * 100) : 0,
  }
}

// The spans to paint for one origin, merged where they run together.
export function originSpans(p: Provenance, origin: Origin): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  for (const s of p.spans) {
    if (s.origin !== origin) continue
    const last = out[out.length - 1]
    if (last && s.start - last.end <= 2) last.end = s.end
    else out.push({ start: s.start, end: s.end })
  }
  return out
}
