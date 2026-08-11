// Pure, I/O-free helpers for the Interlocutor's marked-up pass: locating the
// model's verbatim quotes in a draft, resolving overlapping spans into flat
// render segments, and applying accepted rewrites.
//
// Kept out of the route so the server (which locates offsets) and a test can
// exercise them without a database or a model. The model returns a verbatim
// `quote`; it is never trusted to count characters, so every offset is derived
// here from the text itself.

export interface LocatedSpan {
  start: number
  end: number
}

// Collapse runs of whitespace to a single space so a quote that differs from the
// draft only in spacing (a wrapped newline, a doubled space) still matches. The
// map records, for each normalized character, its index in the original string.
function buildNormIndex(content: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  let prevSpace = false
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (/\s/.test(ch)) {
      if (!prevSpace) {
        norm += ' '
        map.push(i)
        prevSpace = true
      }
      // additional whitespace in the run is dropped
    } else {
      norm += ch
      map.push(i)
      prevSpace = false
    }
  }
  return { norm, map }
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ')
}

// Locate `quote` in `content`. Three passes, most-exact first:
//   1. exact substring
//   2. whitespace-normalized substring, mapped back to real offsets
//   3. fuzzy: the first 40 characters of the quote, exact
// Returns null when none place it; the caller surfaces those as general notes
// rather than inline highlights, so nothing the model said is silently dropped.
export function locate(content: string, quote: string, fromIndex = 0): LocatedSpan | null {
  const q = quote.trim()
  if (!q) return null

  // 1. exact
  const exact = content.indexOf(q, fromIndex)
  if (exact !== -1) return { start: exact, end: exact + q.length }

  // 2. whitespace-normalized
  const normQuote = normalizeWs(q)
  const { norm, map } = buildNormIndex(content)
  const nIdx = norm.indexOf(normQuote)
  if (nIdx !== -1) {
    const start = map[nIdx]
    const endNorm = nIdx + normQuote.length - 1
    const end = map[endNorm] + 1
    if (typeof start === 'number' && typeof end === 'number' && end > start) {
      return { start, end }
    }
  }

  // 3. fuzzy anchor: first 40 chars, exact. Enough to place a long quote whose
  // tail the model altered; too short an anchor would mislocate, so require 12+.
  const anchor = q.slice(0, 40)
  if (anchor.length >= 12) {
    const a = content.indexOf(anchor, fromIndex)
    if (a !== -1) return { start: a, end: a + anchor.length }
  }

  return null
}

// ── Rendering ────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<string, number> = {
  critical: 5,
  major: 4,
  minor: 3,
  note: 2,
  strength: 1,
}
function rank(sev: string | null | undefined): number {
  return sev ? SEVERITY_RANK[sev] ?? 0 : 0
}

export interface SpanInput {
  id: string
  start: number
  end: number
  severity: string
}

export interface Segment {
  text: string
  start: number
  end: number
  annId: string | null
  severity: string | null
}

// Flatten overlapping annotation spans into a non-overlapping, ordered list of
// text segments for rendering. Where spans overlap, the higher-severity span
// wins the covered characters (ties keep the earlier span, since a later equal
// span cannot outrank it). Uncovered characters become plain segments with a
// null annId. The union of segment texts always reconstructs `content`.
export function buildSegments(content: string, spans: SpanInput[]): Segment[] {
  const owner: (SpanInput | null)[] = new Array(content.length).fill(null)
  const valid = spans.filter(
    s => s.end > s.start && s.start >= 0 && s.end <= content.length
  )
  for (const s of valid) {
    for (let i = s.start; i < s.end; i++) {
      const cur = owner[i]
      if (!cur || rank(s.severity) > rank(cur.severity)) owner[i] = s
    }
  }

  const segs: Segment[] = []
  let i = 0
  while (i < content.length) {
    const o = owner[i]
    let j = i + 1
    while (j < content.length && owner[j] === o) j++
    segs.push({
      text: content.slice(i, j),
      start: i,
      end: j,
      annId: o?.id ?? null,
      severity: o?.severity ?? null,
    })
    i = j
  }
  return segs
}

// ── Applying accepted rewrites ────────────────────────────────────────────────

export interface AcceptedEdit {
  start: number
  end: number
  suggestion: string
}

// Apply accepted rewrites to `content`, producing the revised draft the student
// carries into the next version. Splices right-to-left so each edit's offsets
// stay valid while earlier text is untouched. Overlapping accepted edits are
// resolved by keeping the earliest-starting one and dropping any that overlap it
// (the review view should never offer overlapping accepts, but the splice must
// not corrupt text if it does).
export function applyAccepted(content: string, edits: AcceptedEdit[]): string {
  const valid = edits
    .filter(
      e =>
        Number.isInteger(e.start) &&
        Number.isInteger(e.end) &&
        e.start >= 0 &&
        e.end <= content.length &&
        e.end > e.start
    )
    .sort((a, b) => a.start - b.start)

  const nonOverlap: AcceptedEdit[] = []
  let lastEnd = -1
  for (const e of valid) {
    if (e.start >= lastEnd) {
      nonOverlap.push(e)
      lastEnd = e.end
    }
  }

  let out = content
  for (let i = nonOverlap.length - 1; i >= 0; i--) {
    const e = nonOverlap[i]
    out = out.slice(0, e.start) + e.suggestion + out.slice(e.end)
  }
  return out
}
