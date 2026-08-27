// Draft diffing for the Scribe chat draft pane. Every Scribe turn rewrites the
// whole working draft, so the only way to see what actually changed is to diff
// consecutive drafts. Line-level LCS gives the hunks (a hunk is one contiguous
// run of changed lines — usually a paragraph); a word-level LCS inside each
// hunk gives the colouring. Kyle then accepts, dismisses, or edits each hunk
// and the resolved text becomes the new working draft.
//
// Pure module: no React, no DOM. Safe to unit-test and to call on the server.

export type WordOp = { type: 'same' | 'ins' | 'del'; text: string }

export type DiffPart =
  | { kind: 'same'; lines: string[] }
  | {
      kind: 'hunk'
      id: number
      baseLines: string[]
      headLines: string[]
      // Word-level detail, or null when the hunk is too big to diff finely
      // (then the UI falls back to whole-block removed/added rendering).
      words: WordOp[] | null
    }

export type Decision =
  | { mode: 'accept' }
  | { mode: 'dismiss' }
  | { mode: 'edit'; text: string }

// DP table ceiling. 2M cells of Uint32 = 8MB — comfortably safe in a browser,
// and large enough that only a wholesale rewrite falls back to block level.
const MAX_CELLS = 2_000_000
// Word tokens per side inside one hunk before we stop trying to colour it.
const MAX_WORD_TOKENS = 1400

type Op<T> = { type: 'same' | 'del' | 'ins'; value: T }

// Longest-common-subsequence diff with common prefix/suffix trimming. The trim
// is what keeps this cheap on the common case: a turn that rewrites one
// paragraph of a forty-paragraph essay only ever runs the DP on that paragraph.
function diffSeq(a: string[], b: string[]): Op<string>[] {
  const ops: Op<string>[] = []

  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  for (let i = 0; i < start; i++) ops.push({ type: 'same', value: a[i] })

  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)
  const n = midA.length
  const m = midB.length

  if (n === 0 || m === 0 || (n + 1) * (m + 1) > MAX_CELLS) {
    for (const v of midA) ops.push({ type: 'del', value: v })
    for (const v of midB) ops.push({ type: 'ins', value: v })
  } else {
    const w = m + 1
    const dp = new Uint32Array((n + 1) * w)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] =
          midA[i] === midB[j]
            ? dp[(i + 1) * w + (j + 1)] + 1
            : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)])
      }
    }
    let i = 0
    let j = 0
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        ops.push({ type: 'same', value: midA[i] })
        i++
        j++
      } else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) {
        ops.push({ type: 'del', value: midA[i] })
        i++
      } else {
        ops.push({ type: 'ins', value: midB[j] })
        j++
      }
    }
    while (i < n) ops.push({ type: 'del', value: midA[i++] })
    while (j < m) ops.push({ type: 'ins', value: midB[j++] })
  }

  for (let i = endA; i < a.length; i++) ops.push({ type: 'same', value: a[i] })
  return ops
}

// Words and whitespace runs, kept as separate tokens so the diff reconstructs
// the exact text and the colouring lands on word boundaries.
function tokenizeWords(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? []
}

export function wordDiff(base: string, head: string): WordOp[] | null {
  const a = tokenizeWords(base)
  const b = tokenizeWords(head)
  if (a.length > MAX_WORD_TOKENS || b.length > MAX_WORD_TOKENS) return null

  const ops = diffSeq(a, b)
  const merged: WordOp[] = []
  for (const op of ops) {
    const last = merged[merged.length - 1]
    if (last && last.type === op.type) last.text += op.value
    else merged.push({ type: op.type, text: op.value })
  }
  return merged
}

// Diff two drafts into a flat document of unchanged runs and changed hunks.
export function diffDraft(base: string, head: string): DiffPart[] {
  const ops = diffSeq(base.split('\n'), head.split('\n'))
  const parts: DiffPart[] = []
  let nextId = 0
  let i = 0

  while (i < ops.length) {
    if (ops[i].type === 'same') {
      const lines: string[] = []
      while (i < ops.length && ops[i].type === 'same') lines.push(ops[i++].value)
      parts.push({ kind: 'same', lines })
      continue
    }
    const baseLines: string[] = []
    const headLines: string[] = []
    while (i < ops.length && ops[i].type !== 'same') {
      if (ops[i].type === 'del') baseLines.push(ops[i].value)
      else headLines.push(ops[i].value)
      i++
    }
    parts.push({
      kind: 'hunk',
      id: nextId++,
      baseLines,
      headLines,
      words:
        baseLines.length && headLines.length
          ? wordDiff(baseLines.join('\n'), headLines.join('\n'))
          : null,
    })
  }
  return parts
}

export function hunkKind(part: Extract<DiffPart, { kind: 'hunk' }>): 'added' | 'removed' | 'revised' {
  if (!part.baseLines.length) return 'added'
  if (!part.headLines.length) return 'removed'
  return 'revised'
}

// Accepted hunks keep Scribe's text, dismissed hunks restore Kyle's, edited
// hunks take whatever he typed. A missing decision means "not reviewed yet",
// which resolves the same as accept — the head draft is already the working
// state — but is counted separately so the UI can show real progress.
export function resolveDiff(parts: DiffPart[], decisions: Record<number, Decision>): string {
  const out: string[] = []
  for (const p of parts) {
    if (p.kind === 'same') {
      out.push(...p.lines)
      continue
    }
    const d = decisions[p.id] ?? { mode: 'accept' as const }
    if (d.mode === 'dismiss') out.push(...p.baseLines)
    else if (d.mode === 'edit') out.push(...d.text.split('\n'))
    else out.push(...p.headLines)
  }
  return out.join('\n')
}

export function countHunks(parts: DiffPart[]): number {
  return parts.reduce((n, p) => n + (p.kind === 'hunk' ? 1 : 0), 0)
}

export interface DecisionTally {
  kept: number
  reverted: number
  rewrote: number
  unreviewed: number
  total: number
}

export function tallyDecisions(
  parts: DiffPart[],
  decisions: Record<number, Decision>
): DecisionTally {
  const t: DecisionTally = { kept: 0, reverted: 0, rewrote: 0, unreviewed: 0, total: 0 }
  for (const p of parts) {
    if (p.kind !== 'hunk') continue
    t.total++
    const d = decisions[p.id]
    if (!d) t.unreviewed++
    else if (d.mode === 'dismiss') t.reverted++
    else if (d.mode === 'edit') t.rewrote++
    else t.kept++
  }
  return t
}

// One-line description of what Kyle did, stored on the revision message so the
// thread (and Scribe) can see it.
export function describeDecisions(
  parts: DiffPart[],
  decisions: Record<number, Decision>
): string {
  const t = tallyDecisions(parts, decisions)
  if (!t.total) return 'no changes'
  const bits = [
    t.kept ? `kept ${t.kept}` : '',
    t.reverted ? `reverted ${t.reverted}` : '',
    t.rewrote ? `rewrote ${t.rewrote}` : '',
    t.unreviewed ? `left ${t.unreviewed} as written` : '',
  ].filter(Boolean)
  return `${bits.join(', ')} of ${t.total} changes`
}
