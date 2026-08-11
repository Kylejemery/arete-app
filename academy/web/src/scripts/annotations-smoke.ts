// Offline unit test for src/lib/annotations.ts. No database, no model, no env.
// Run:  npx tsx src/scripts/annotations-smoke.ts
//
// Covers the three things that would silently corrupt the marked-up view:
// locating a quote (exact / whitespace-normalized / fuzzy / not-found), flatten-
// ing overlapping spans into render segments, and splicing accepted rewrites
// without drifting later offsets.

import assert from 'node:assert'
import { locate, buildSegments, applyAccepted, type SpanInput } from '../lib/annotations'

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ok  ${name}`)
}

const DRAFT =
  'The thesis is that virtue suffices for happiness. ' + // 0..49
  'Everyone agrees with this claim.\n\n' +               // 50..83 (\n\n at 82,83)
  'It follows,   obviously,   that we need nothing else.' // wide gaps for ws test

// ── locate ───────────────────────────────────────────────────────────────────

check('locate: exact substring', () => {
  const span = locate(DRAFT, 'virtue suffices for happiness')
  assert.ok(span, 'expected a hit')
  assert.strictEqual(DRAFT.slice(span!.start, span!.end), 'virtue suffices for happiness')
})

check('locate: whitespace-normalized (collapsed multi-space)', () => {
  // The quote uses single spaces; the draft has runs of spaces. Must still map
  // back to the real offsets that cover the original wide-gap text.
  const span = locate(DRAFT, 'It follows, obviously, that we need nothing else.')
  assert.ok(span, 'expected a normalized hit')
  const got = DRAFT.slice(span!.start, span!.end)
  assert.ok(got.startsWith('It follows,'), `got: ${JSON.stringify(got)}`)
  assert.ok(got.endsWith('nothing else.'), `got: ${JSON.stringify(got)}`)
})

check('locate: whitespace-normalized across a newline', () => {
  const span = locate(DRAFT, 'this claim. It follows')
  assert.ok(span, 'expected a hit across the paragraph break')
  const got = DRAFT.slice(span!.start, span!.end)
  assert.ok(got.startsWith('this claim.'))
  assert.ok(got.endsWith('It follows'))
})

check('locate: fuzzy anchor when the tail was altered', () => {
  // Model quoted the span but mangled the end; the 40-char head still anchors.
  const span = locate(DRAFT, 'The thesis is that virtue suffices for happiness FOREVER AND EVER')
  assert.ok(span, 'expected a fuzzy hit')
  assert.strictEqual(span!.start, 0)
})

check('locate: unfindable quote returns null', () => {
  assert.strictEqual(locate(DRAFT, 'a sentence that is nowhere in the draft at all'), null)
})

check('locate: empty quote returns null', () => {
  assert.strictEqual(locate(DRAFT, '   '), null)
})

// ── buildSegments ──────────────────────────────────────────────────────────────

check('buildSegments: segments reconstruct the content exactly', () => {
  const spans: SpanInput[] = [{ id: 'a', start: 4, end: 10, severity: 'major' }]
  const segs = buildSegments(DRAFT, spans)
  assert.strictEqual(segs.map(s => s.text).join(''), DRAFT)
})

check('buildSegments: overlap resolved by severity, higher wins', () => {
  const content = 'ABCDEFGHIJ'
  // minor covers 0..6, critical covers 3..8 — the overlap 3..6 must go critical.
  const spans: SpanInput[] = [
    { id: 'minor', start: 0, end: 6, severity: 'minor' },
    { id: 'crit', start: 3, end: 8, severity: 'critical' },
  ]
  const segs = buildSegments(content, spans)
  assert.strictEqual(segs.map(s => s.text).join(''), content, 'reconstruct')
  const at = (i: number) => segs.find(s => i >= s.start && i < s.end)!
  assert.strictEqual(at(0).annId, 'minor')
  assert.strictEqual(at(4).annId, 'crit', 'overlap should belong to critical')
  assert.strictEqual(at(7).annId, 'crit')
  assert.strictEqual(at(9).annId, null, 'uncovered tail is plain')
})

// ── applyAccepted ──────────────────────────────────────────────────────────────

check('applyAccepted: multi-accept keeps offsets valid (right-to-left)', () => {
  const content = 'one two three'
  // Replace 'one' (0..3) and 'three' (8..13) at once. If splicing left-to-right
  // naively, the second offset would drift after the first replacement changes
  // the length. Right-to-left keeps both correct.
  const out = applyAccepted(content, [
    { start: 0, end: 3, suggestion: 'ONE-LONGER' },
    { start: 8, end: 13, suggestion: 'THREE' },
  ])
  assert.strictEqual(out, 'ONE-LONGER two THREE')
})

check('applyAccepted: overlapping accepts drop the later one', () => {
  const content = 'ABCDEFGHIJ'
  const out = applyAccepted(content, [
    { start: 0, end: 6, suggestion: 'X' },
    { start: 3, end: 8, suggestion: 'Y' }, // overlaps the first; dropped
  ])
  assert.strictEqual(out, 'XGHIJ')
})

check('applyAccepted: out-of-range edits are ignored', () => {
  const content = 'short'
  const out = applyAccepted(content, [
    { start: 2, end: 99, suggestion: 'nope' },
    { start: -1, end: 2, suggestion: 'nope' },
    { start: 0, end: 2, suggestion: 'GO' },
  ])
  assert.strictEqual(out, 'GOort')
})

console.log(`\nannotations-smoke: ${passed} checks passed`)
