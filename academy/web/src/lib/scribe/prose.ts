// Lightweight prose parser for the Scribe draft pane. Scribe writes essays in
// plain prose with a little markdown: the occasional heading, a blockquote for
// a corpus passage, the odd list, *emphasis*, and [YOUR TURN: ...] gaps. This
// turns that into blocks so the draft can be typeset like an essay instead of
// dumped as a <pre>. Deliberately not a markdown implementation — no links,
// no tables, no HTML — because anything it doesn't recognise must survive
// verbatim as body text.
//
// Every block carries the line range it came from, which is what makes the
// draft editable in place: editing a paragraph splices those exact lines back
// into the draft, markers and all, with nothing else disturbed.

import { metricSpans, type MetricKind, type Span } from './voice-metrics'

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'gap'; text: string } // [YOUR TURN: ...] — Kyle's to fill

export interface BlockSpan {
  lineStart: number
  lineEnd: number // inclusive
}

export type Block = BlockSpan &
  (
    | { type: 'h1' | 'h2' | 'h3'; text: string }
    | { type: 'p'; text: string }
    | { type: 'quote'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'hr' }
  )

const HEADING = /^(#{1,3})\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n')
}

// Group lines into paragraph-ish blocks. Blank lines separate; a heading, rule,
// quote, or list item also breaks the run so a missing blank line doesn't glue
// a heading onto the paragraph under it.
export function parseProse(text: string): Block[] {
  const lines = splitLines(text)
  const blocks: Block[] = []
  let para: string[] = []
  let paraStart = 0

  const flushPara = (endLine: number) => {
    if (!para.length) return
    blocks.push({ type: 'p', text: para.join(' ').trim(), lineStart: paraStart, lineEnd: endLine })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.trim()) {
      flushPara(i - 1)
      continue
    }
    if (RULE.test(line)) {
      flushPara(i - 1)
      blocks.push({ type: 'hr', lineStart: i, lineEnd: i })
      continue
    }

    const h = line.match(HEADING)
    if (h) {
      flushPara(i - 1)
      const level = h[1].length
      blocks.push({
        type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3',
        text: h[2].trim(),
        lineStart: i,
        lineEnd: i,
      })
      continue
    }

    if (QUOTE.test(line)) {
      flushPara(i - 1)
      const start = i
      const quoted: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push((lines[i].match(QUOTE) as RegExpMatchArray)[1])
        i++
      }
      i--
      blocks.push({ type: 'quote', text: quoted.join(' ').trim(), lineStart: start, lineEnd: i })
      continue
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      flushPara(i - 1)
      const start = i
      const ordered = NUMBERED.test(line)
      const items: string[] = []
      while (i < lines.length) {
        const m = lines[i].match(ordered ? NUMBERED : BULLET)
        if (!m) break
        items.push(m[1].trim())
        i++
      }
      i--
      blocks.push({ type: 'list', ordered, items, lineStart: start, lineEnd: i })
      continue
    }

    if (!para.length) paraStart = i
    para.push(line.trim())
  }
  flushPara(lines.length - 1)
  return blocks
}

// The raw source of one block, markers included — what an in-place edit opens.
export function blockSource(text: string, block: BlockSpan): string {
  return splitLines(text).slice(block.lineStart, block.lineEnd + 1).join('\n')
}

// Splice an edited block back into the draft. Everything outside the block's
// own lines is byte-identical afterwards, which is what keeps a hand edit from
// silently reformatting the rest of the essay.
export function replaceBlockLines(text: string, block: BlockSpan, replacement: string): string {
  const lines = splitLines(text)
  const next = replacement.replace(/\r\n?/g, '\n').split('\n')
  lines.splice(block.lineStart, block.lineEnd - block.lineStart + 1, ...next)
  return lines.join('\n')
}

// **strong**, *em* / _em_, and [YOUR TURN: ...] gaps. Anything unmatched stays
// as literal text — an unpaired asterisk must not eat the rest of the essay.
export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|\[(YOUR TURN:[^\]]*)\]/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ type: 'strong', text: m[1] })
    else if (m[2] !== undefined) out.push({ type: 'em', text: m[2] })
    else if (m[3] !== undefined) out.push({ type: 'em', text: m[3] })
    else out.push({ type: 'gap', text: m[4] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}

// ── Highlighting ──────────────────────────────────────────────────────────
// One vocabulary for every "show me where" affordance: the voice meter, an
// outside-read finding, and a retrieved source all resolve to ranges over the
// text actually on screen.

export type Highlight =
  | { kind: 'metric'; metric: MetricKind }
  | { kind: 'phrases'; phrases: string[] }

// Fold whitespace, case, curly quotes, and dashes so a finding quoted with
// different typography still lands. `idx` maps each normalised position back
// to its original offset.
function normalize(text: string): { out: string; idx: number[] } {
  let out = ''
  const idx: number[] = []
  let lastWasSpace = false
  for (let i = 0; i < text.length; i++) {
    let c = text[i]
    if (/\s/.test(c)) {
      if (lastWasSpace) continue
      c = ' '
      lastWasSpace = true
    } else {
      lastWasSpace = false
      if (c === '‘' || c === '’') c = "'"
      else if (c === '“' || c === '”') c = '"'
      else if (c === '—' || c === '–') c = '-'
      c = c.toLowerCase()
    }
    out += c
    idx.push(i)
  }
  return { out, idx }
}

function phraseSpans(text: string, phrases: string[]): Span[] {
  const hay = normalize(text)
  const spans: Span[] = []
  for (const raw of phrases) {
    const needle = normalize(raw).out.trim()
    if (needle.length < 3) continue
    let from = 0
    for (;;) {
      const at = hay.out.indexOf(needle, from)
      if (at < 0) break
      const start = hay.idx[at]
      const end = hay.idx[at + needle.length - 1] + 1
      spans.push({ start, end, label: raw })
      from = at + needle.length
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Span[] = []
  for (const s of spans) {
    const last = out[out.length - 1]
    if (last && s.start < last.end) continue
    out.push(s)
  }
  return out
}

export function highlightSpans(text: string, h: Highlight | null): Span[] {
  if (!h || !text) return []
  return h.kind === 'metric' ? metricSpans(text, h.metric) : phraseSpans(text, h.phrases)
}

// True when a quoted line can still be found in the draft. An outside-read
// finding that fails this has been edited away, which is worth saying rather
// than silently failing to scroll anywhere.
export function containsPhrase(text: string, phrase: string): boolean {
  return phraseSpans(text, [phrase]).length > 0
}

// Reading stats for the draft header — cheap, and the number Kyle actually
// cares about when sizing a Substack essay.
export function proseStats(text: string): { words: number; minutes: number } {
  const words = (text.trim().match(/[^\s]+/g) ?? []).length
  return { words, minutes: Math.max(1, Math.round(words / 225)) }
}

export type { MetricKind, Span }
