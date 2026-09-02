// Sentences as the unit of retyping.
//
// The composer's "type over" affordance works a sentence at a time: put the
// caret anywhere, and the sentence around it becomes the thing under the
// callout. That needs a splitter that agrees with a reader about where one
// sentence ends and the next begins, in prose that quotes ancient authors by
// abbreviation (Ep. 12, Disc. 1.24, Med. 5.1) and carries markdown line
// prefixes the writer never typed by hand.
//
// Everything here is offset-based against the raw text, the same text the
// Interlocutor's marks index, so a retyped range and a marked range are the
// same kind of thing.

export interface Range {
  start: number
  end: number
}

// A period after one of these is usually an abbreviation, not the end of a
// sentence. Three kinds, because they behave differently at a boundary:
//   title:   always joined ("Dr. Smith", "e.g. anger", "vs. the claim").
//   numeric: joined only before a number, a section sign, or a roman numeral
//            ("Ep. 12", "Med. 5.1", "Ench. §5"); "He said no. Then" splits.
//   final:   joined unless what follows opens a sentence ("etc. The" splits).
// Lower-cased, without the trailing period; dotted forms keep their dots.
const TITLE_ABBREVS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'sr', 'jr', 'rev', 'hon',
  'vs', 'cf', 'esp', 'viz', 'e.g', 'i.e', 'trans', 'tr', 'ed', 'eds',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  // The tradition's own shorthand for its authors.
  'cic', 'plut', 'diog', 'laert', 'epict', 'marc', 'aur', 'sen',
])
const NUMERIC_ABBREVS = new Set([
  'no', 'nos', 'p', 'pp', 'l', 'll', 'c', 'ca', 'fl', 'vol', 'vols', 'fig', 'figs',
  'sec', 'secs', 'ch', 'chs', 'bk', 'bks', 'pt', 'op', 'loc', 'fr', 'frag',
  // Works cited by book and section.
  'ep', 'epp', 'disc', 'med', 'ench', 'dl', 'ben', 'prov', 'ira', 'brev', 'vit',
  'const', 'tranq', 'off', 'fin', 'tusc', 'nat', 'deor', 'fat', 'acad', 'par',
  'rep', 'leg', 'gorg', 'prot', 'phaed', 'apol',
])
const FINAL_ABBREVS = new Set(['etc', 'ibid', 'al', 'a.m', 'p.m', 'a.d', 'b.c'])

type AbbrevKind = 'title' | 'numeric' | 'final' | 'initial'

// Markdown a line may open with. The prefix is not part of the sentence.
const LINE_PREFIX = /^(\s*)(#{1,6}\s+|>\s?|[*•-]\s+|\d+[.)]\s+)?/

// After a terminator, these may close before the whitespace that ends the sentence.
const CLOSERS = /[)\]"'”’*_]*/y

// What a numeric abbreviation may be followed by and still be one.
const NUMERIC_OBJECT = /^(\d|§|[IVXLC]+(?=[\s.\d]|$))/

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\r'
const isUpperStart = (c: string) => /[A-ZÀ-ÖØ-Þ"“‘'(\[*_\d]/.test(c)

// The word immediately before a period, as the abbreviation check needs it:
// letters and internal dots, lower-cased. "e.g" for "e.g.", "Ep" -> "ep".
function wordBefore(text: string, dot: number): string {
  let i = dot - 1
  while (i >= 0 && /[A-Za-zÀ-ÿ.]/.test(text[i])) i--
  return text.slice(i + 1, dot).toLowerCase()
}

function abbreviationKind(text: string, dot: number): AbbrevKind | null {
  const w = wordBefore(text, dot)
  if (!w) return null
  const last = w.split('.').pop() ?? ''
  for (const cand of [w, last]) {
    if (TITLE_ABBREVS.has(cand)) return 'title'
    if (NUMERIC_ABBREVS.has(cand)) return 'numeric'
    if (FINAL_ABBREVS.has(cand)) return 'final'
  }
  // A single capital initial: "J. S. Mill", "M. Aurelius".
  if (last.length === 1 && /[A-Z]/.test(text[dot - 1])) return 'initial'
  return null
}

// Split one line (no newlines) into sentence ranges, offsets relative to `base`.
function splitLine(line: string, base: number): Range[] {
  const out: Range[] = []
  const m = LINE_PREFIX.exec(line)
  let start = m ? m[0].length : 0
  const n = line.length
  let i = start

  const push = (from: number, to: number) => {
    while (from < to && isSpace(line[from])) from++
    while (to > from && isSpace(line[to - 1])) to--
    if (to > from) out.push({ start: base + from, end: base + to })
  }

  while (i < n) {
    const c = line[i]
    if (c === '.' || c === '!' || c === '?' || c === '…') {
      // Run of terminators ("?!", "...", "?.").
      let j = i
      while (j < n && (line[j] === '.' || line[j] === '!' || line[j] === '?' || line[j] === '…')) j++
      const dotted = c === '.' && j - i === 1
      // A decimal or a version number is not a boundary.
      if (dotted && i > 0 && /\d/.test(line[i - 1]) && j < n && /\d/.test(line[j])) {
        i = j
        continue
      }
      CLOSERS.lastIndex = j
      const closers = CLOSERS.exec(line)
      const k = closers ? j + closers[0].length : j
      const atEnd = k >= n
      let next = k
      while (next < n && isSpace(line[next])) next++
      const opens = next < n && isUpperStart(line[next])

      // An abbreviation never sits inside a closing quote, so the check only
      // applies when the period is bare. One at the very end of a line still
      // ends the sentence.
      const kind = dotted && k === j && !atEnd ? abbreviationKind(line, i) : null
      if (kind) {
        const joined =
          kind === 'title' || kind === 'initial'
            ? true
            : kind === 'numeric'
              ? NUMERIC_OBJECT.test(line.slice(next))
              : !opens
        if (joined) {
          i = j
          continue
        }
      }

      if (atEnd) {
        push(start, n)
        start = n
        i = n
        break
      }
      if (isSpace(line[k])) {
        // Lower-case continuation after a quoted fragment: not a boundary.
        if (next < n && !opens) {
          i = k
          continue
        }
        push(start, k)
        start = next
        i = next
        continue
      }
      i = k
      continue
    }
    i++
  }
  if (start < n) push(start, n)
  return out
}

// Every sentence in the text, in order. Sentences never cross a line break.
export function sentenceRanges(text: string): Range[] {
  const out: Range[] = []
  let base = 0
  for (const line of text.split('\n')) {
    out.push(...splitLine(line, base))
    base += line.length + 1
  }
  return out
}

// The sentence the caret is in. A caret on the space between two sentences
// belongs to the one it follows; one at the head of a paragraph, to the one it
// precedes. Null only for an empty document.
export function sentenceAt(text: string, pos: number): Range | null {
  const ranges = sentenceRanges(text)
  if (ranges.length === 0) return null
  const p = Math.max(0, Math.min(text.length, pos))
  let best: Range | null = null
  let bestDist = Infinity
  for (const r of ranges) {
    if (p >= r.start && p <= r.end) return r
    const d = p < r.start ? r.start - p : p - r.end
    // Prefer the sentence the caret follows when equidistant.
    if (d < bestDist || (d === bestDist && r.end <= p)) {
      best = r
      bestDist = d
    }
  }
  return best
}

// The sentence that begins after `pos`, or null at the end of the document.
export function sentenceAfter(text: string, pos: number): Range | null {
  for (const r of sentenceRanges(text)) if (r.start >= pos) return r
  return null
}

// The sentence that ends before `pos`, or null at the start of the document.
export function sentenceBefore(text: string, pos: number): Range | null {
  let last: Range | null = null
  for (const r of sentenceRanges(text)) {
    if (r.end <= pos) last = r
    else break
  }
  return last
}

// 1-based index of the sentence containing `r` among all sentences, and the
// total, for the "3 of 41" readout.
export function sentenceIndex(text: string, r: Range): { index: number; total: number } {
  const ranges = sentenceRanges(text)
  const idx = ranges.findIndex(x => x.start <= r.start && x.end >= r.end)
  return { index: idx === -1 ? 0 : idx + 1, total: ranges.length }
}
