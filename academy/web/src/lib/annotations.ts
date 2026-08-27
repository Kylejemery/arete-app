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

// ── Keeping annotations anchored while the draft is edited ───────────────────
//
// The studio lets a student keep typing in the same document the Interlocutor
// marked up, so every offset recorded against the submitted text has to be
// re-based after each keystroke. An edit is treated as one replaced region
// (common prefix, common suffix, everything between them replaced), which is
// exact for typing, pasting, deleting, and for splicing in an accepted rewrite.

export interface EditRegion {
  start: number
  removed: number
  inserted: number
}

// Describe the difference between two versions of the draft as a single
// replaced region. Returns null when nothing changed.
export function diffRegion(prev: string, next: string): EditRegion | null {
  if (prev === next) return null
  const max = Math.min(prev.length, next.length)
  let p = 0
  while (p < max && prev[p] === next[p]) p++
  let s = 0
  while (s < max - p && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++
  return { start: p, removed: prev.length - s - p, inserted: next.length - s - p }
}

export interface OffsetPair {
  start: number
  end: number
}

// Re-base one span across an edit. A span before the edit is untouched; one
// after it slides by the edit's net length; one the edit happened *inside*
// grows or shrinks with it, which is what keeps a comment attached while the
// student rewrites the sentence it is about. A span the edit straddles can no
// longer be trusted to point at its own words, so it comes back null and the
// caller re-anchors it by quote or files it as a general note.
export function shiftSpan(span: OffsetPair, region: EditRegion): OffsetPair | null {
  const { start: p, removed, inserted } = region
  const editEnd = p + removed
  const delta = inserted - removed
  if (span.end <= p) return span
  if (span.start >= editEnd) return { start: span.start + delta, end: span.end + delta }
  if (p >= span.start && editEnd <= span.end) {
    const end = span.end + delta
    return end > span.start ? { start: span.start, end } : null
  }
  return null
}

// Re-anchor a set of annotations across one edit. Each mark slides, grows, or,
// when the edit ran straight through it, is looked up again by its quote before
// it is allowed to come loose. Shared by the composer (every keystroke) and by
// accepting a rewrite, which is just another edit.
export interface Anchored {
  start_offset: number | null
  end_offset: number | null
  quote: string
}

export function reanchor<T extends Anchored>(a: T, region: EditRegion, nextText: string): T {
  if (a.start_offset === null || a.end_offset === null) return a
  const moved = shiftSpan({ start: a.start_offset, end: a.end_offset }, region)
  if (moved) return { ...a, start_offset: moved.start, end_offset: moved.end }
  const found = a.quote ? locate(nextText, a.quote) : null
  return found
    ? { ...a, start_offset: found.start, end_offset: found.end }
    : { ...a, start_offset: null, end_offset: null }
}

// ── Accepting a rewrite in the document ──────────────────────────────────────
//
// Accepting is a splice plus a re-anchor: the marked passage becomes the
// Interlocutor's wording, the accepted mark is closed, and every other mark
// moves with the text around it. A mark with no rewrite, or one that has come
// loose from its passage, is only closed; there is nothing to splice.

export interface RewriteTarget extends Anchored {
  id: string
  suggestion: string | null
  status: string
}

export function acceptRewrite<T extends RewriteTarget>(
  content: string,
  annotations: T[],
  id: string
): { content: string; annotations: T[] } {
  const a = annotations.find(x => x.id === id)
  if (!a) return { content, annotations }

  const splices =
    !!a.suggestion &&
    a.start_offset !== null &&
    a.end_offset !== null &&
    a.end_offset > a.start_offset &&
    a.end_offset <= content.length

  if (!splices) {
    return {
      content,
      annotations: annotations.map(x => (x.id === id ? { ...x, status: 'accepted' } : x)),
    }
  }

  const start = a.start_offset as number
  const end = a.end_offset as number
  const suggestion = a.suggestion as string
  const next = content.slice(0, start) + suggestion + content.slice(end)
  const region: EditRegion = { start, removed: end - start, inserted: suggestion.length }
  return {
    content: next,
    annotations: annotations.map(x =>
      x.id === id
        ? { ...x, status: 'accepted', start_offset: null, end_offset: null }
        : reanchor(x, region, next)
    ),
  }
}

// Accept every rewrite on offer. Each splice runs against the text as it stands
// after the previous one, with the remaining marks re-anchored in between, so
// the order the marks came back in does not matter.
export function acceptAllRewrites<T extends RewriteTarget>(
  content: string,
  annotations: T[]
): { content: string; annotations: T[]; accepted: string[] } {
  const ids = annotations
    .filter(a => a.status === 'open' && a.suggestion && a.start_offset !== null && a.end_offset !== null)
    .map(a => a.id)
  let cur = content
  let anns = annotations
  for (const id of ids) {
    const r = acceptRewrite(cur, anns, id)
    cur = r.content
    anns = r.annotations
  }
  return { content: cur, annotations: anns, accepted: ids }
}

// Re-anchor an annotation into a text it was not written against: used when a
// piece is reopened and the working copy has drifted from the snapshot the
// Interlocutor marked. Offsets are meaningless across texts, so the quote is
// the only thing worth trusting; what cannot be found stands as a general note.
export function reanchorByQuote<T extends Anchored>(a: T, text: string): T {
  const found = a.quote ? locate(text, a.quote) : null
  return found
    ? { ...a, start_offset: found.start, end_offset: found.end }
    : { ...a, start_offset: null, end_offset: null }
}
