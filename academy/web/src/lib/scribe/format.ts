// Formatting for the draft editors: a toolbar action applied to a selection
// in markdown source. The draft stays markdown underneath, which is what
// makes the formatting travel: Scribe reads and edits the same text, the
// changes view diffs it, and the Word export renders it as real headings,
// lists, and emphasis. Pure module, unit-tested.

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'bullets'
  | 'numbers'
  | 'plain'
  | 'rule'
  | 'gap'

export interface Formatted {
  text: string
  selStart: number
  selEnd: number
}

const LINE_PREFIX = /^(\s*)(?:#{1,3}\s+|>\s?|[-*•]\s+|\d+[.)]\s+)/

function lineBounds(text: string, start: number, end: number): { from: number; to: number } {
  const from = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nl = text.indexOf('\n', end)
  const to = nl < 0 ? text.length : nl
  return { from, to }
}

function wrap(text: string, start: number, end: number, marker: string, placeholder: string): Formatted {
  const sel = text.slice(start, end)
  const m = marker.length
  // Toggle off when the selection is already wrapped, inside or outside.
  if (sel.startsWith(marker) && sel.endsWith(marker) && sel.length >= 2 * m) {
    const inner = sel.slice(m, sel.length - m)
    return { text: text.slice(0, start) + inner + text.slice(end), selStart: start, selEnd: start + inner.length }
  }
  if (text.slice(start - m, start) === marker && text.slice(end, end + m) === marker) {
    return { text: text.slice(0, start - m) + sel + text.slice(end + m), selStart: start - m, selEnd: start - m + sel.length }
  }
  const body = sel || placeholder
  const next = text.slice(0, start) + marker + body + marker + text.slice(end)
  return { text: next, selStart: start + m, selEnd: start + m + body.length }
}

function prefixLines(
  text: string,
  start: number,
  end: number,
  prefix: (i: number) => string
): Formatted {
  const { from, to } = lineBounds(text, start, end)
  const lines = text.slice(from, to).split('\n')
  const out = lines.map((line, i) => {
    const bare = line.replace(LINE_PREFIX, '$1')
    const p = prefix(i)
    // Toggle: the same prefix on every line comes off again.
    return p && lines.every(l => l.replace(LINE_PREFIX, '$1') !== l && l.trimStart().startsWith(p.trim()))
      ? bare
      : bare.replace(/^(\s*)/, `$1${p}`)
  })
  const block = out.join('\n')
  return { text: text.slice(0, from) + block + text.slice(to), selStart: from, selEnd: from + block.length }
}

function insertAt(text: string, at: number, snippet: string, select?: [number, number]): Formatted {
  const before = text.slice(0, at)
  const after = text.slice(at)
  const pad = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const tail = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
  const inserted = pad + snippet + tail
  const base = at + pad.length
  return {
    text: before + inserted + after,
    selStart: select ? base + select[0] : base + snippet.length,
    selEnd: select ? base + select[1] : base + snippet.length,
  }
}

export function applyFormat(text: string, start: number, end: number, action: FormatAction): Formatted {
  const s = Math.max(0, Math.min(start, end))
  const e = Math.min(text.length, Math.max(start, end))
  switch (action) {
    case 'bold':
      return wrap(text, s, e, '**', 'bold text')
    case 'italic':
      return wrap(text, s, e, '*', 'emphasis')
    case 'h1':
      return prefixLines(text, s, e, () => '# ')
    case 'h2':
      return prefixLines(text, s, e, () => '## ')
    case 'h3':
      return prefixLines(text, s, e, () => '### ')
    case 'quote':
      return prefixLines(text, s, e, () => '> ')
    case 'bullets':
      return prefixLines(text, s, e, () => '- ')
    case 'numbers':
      return prefixLines(text, s, e, i => `${i + 1}. `)
    case 'plain':
      return prefixLines(text, s, e, () => '')
    case 'rule':
      return insertAt(text, e, '---')
    case 'gap': {
      const inner = text.slice(s, e).trim() || 'what only you can say here'
      const snippet = `[YOUR TURN: ${inner}]`
      const before = text.slice(0, s)
      const after = text.slice(e)
      return { text: before + snippet + after, selStart: s + 12, selEnd: s + 12 + inner.length }
    }
  }
}

export const FORMAT_LABELS: { action: FormatAction; label: string; title: string }[] = [
  { action: 'bold', label: 'B', title: 'Bold (⌘B)' },
  { action: 'italic', label: 'I', title: 'Italic (⌘I)' },
  { action: 'h1', label: 'Chapter', title: 'Chapter title (starts a new page in the book view)' },
  { action: 'h2', label: 'H2', title: 'Heading 2' },
  { action: 'h3', label: 'H3', title: 'Heading 3' },
  { action: 'quote', label: '❝', title: 'Block quote (a corpus passage)' },
  { action: 'bullets', label: '•', title: 'Bulleted list' },
  { action: 'numbers', label: '1.', title: 'Numbered list' },
  { action: 'plain', label: '¶', title: 'Plain paragraph (remove heading, quote, or list)' },
  { action: 'rule', label: '—', title: 'Section rule' },
  { action: 'gap', label: '[…]', title: 'Mark a YOUR TURN gap' },
]
