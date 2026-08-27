// Lightweight prose parser for the Scribe draft pane. Scribe writes essays in
// plain prose with a little markdown: the occasional heading, a blockquote for
// a corpus passage, the odd list, *emphasis*, and [YOUR TURN: ...] gaps. This
// turns that into blocks so the draft can be typeset like an essay instead of
// dumped as a <pre>. Deliberately not a markdown implementation — no links,
// no tables, no HTML — because anything it doesn't recognise must survive
// verbatim as body text.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'gap'; text: string } // [YOUR TURN: ...] — Kyle's to fill

export type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'hr' }

const HEADING = /^(#{1,3})\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

// Group lines into paragraph-ish blocks. Blank lines separate; a heading, rule,
// quote, or list item also breaks the run so a missing blank line doesn't glue
// a heading onto the paragraph under it.
export function parseProse(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []

  const flushPara = () => {
    if (!para.length) return
    blocks.push({ type: 'p', text: para.join(' ').trim() })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line.trim()) {
      flushPara()
      continue
    }
    if (RULE.test(line)) {
      flushPara()
      blocks.push({ type: 'hr' })
      continue
    }

    const h = line.match(HEADING)
    if (h) {
      flushPara()
      const level = h[1].length
      blocks.push({ type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3', text: h[2].trim() })
      continue
    }

    if (QUOTE.test(line)) {
      flushPara()
      const quoted: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push((lines[i].match(QUOTE) as RegExpMatchArray)[1])
        i++
      }
      i--
      blocks.push({ type: 'quote', text: quoted.join(' ').trim() })
      continue
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      flushPara()
      const ordered = NUMBERED.test(line)
      const items: string[] = []
      while (i < lines.length) {
        const m = lines[i].match(ordered ? NUMBERED : BULLET)
        if (!m) break
        items.push(m[1].trim())
        i++
      }
      i--
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    para.push(line.trim())
  }
  flushPara()
  return blocks
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

// Reading stats for the draft header — cheap, and the number Kyle actually
// cares about when sizing a Substack essay.
export function proseStats(text: string): { words: number; minutes: number } {
  const words = (text.trim().match(/[^\s]+/g) ?? []).length
  return { words, minutes: Math.max(1, Math.round(words / 225)) }
}
