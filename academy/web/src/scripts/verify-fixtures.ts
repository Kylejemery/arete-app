// Fixture tests for the deterministic Stage D checks — no network, no keys.
// Run: npx tsx src/scripts/verify-fixtures.ts   (exits 1 on any failure)

import { normalizeQuote, quoteMatchesChunk, checkLocator } from '../lib/scribe/pipeline/verify'
import type { ScribeCitation } from '../lib/scribe/types'

let failures = 0
function expect(name: string, actual: unknown, want: unknown) {
  const ok = actual === want
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(want)}`}`)
}

const CHUNK =
  'It is not things that disturb human beings, but their judgments about things. ' +
  'Death, for instance, is nothing terrible — else it would have appeared so even to Socrates.'

// Exact quote passes
expect('verbatim quote matches', quoteMatchesChunk('It is not things that disturb human beings, but their judgments about things.', CHUNK), true)

// Typographic variance (curly quotes, em-dash, extra whitespace) still passes
expect(
  'typography-normalized quote matches',
  quoteMatchesChunk('Death, for instance, is nothing terrible — else it   would have appeared so', CHUNK.replace('—', '--').replace(/\s+/g, ' ')),
  true
)

// Elided quote: both segments must appear
expect('elided quote (both segments present) matches', quoteMatchesChunk('It is not things that disturb human beings … nothing terrible', CHUNK), true)

// Deliberate near-miss: one changed word must FAIL
expect('near-miss (changed word) fails', quoteMatchesChunk('It is not things that disturb human beings, but their opinions about things.', CHUNK), false)

// Fabricated quote fails
expect('fabricated quote fails', quoteMatchesChunk('The obstacle is the way, as Marcus famously wrote.', CHUNK), false)

// Trivially short segments alone do not count as a match
expect('too-short quote fails', quoteMatchesChunk('things', CHUNK), false)

// ── Locator checks ────────────────────────────────────────────────
const ragCitation = (locator: string | null): ScribeCitation => ({
  marker: 'm', chunk_table: 'rag_corpus', chunk_id: 'x', locator, quote: false,
})
const paperCitation = (locator: string | null): ScribeCitation => ({
  marker: 'm', chunk_table: 'scribe_source_chunks', chunk_id: 'x', locator, quote: false,
})

// Primary text with empty section_label (the corpus reality) → unverified
expect('rag locator with no metadata → unverified', checkLocator(ragCitation('Meditations 4.3'), { section_label: '' }), 'unverified')
expect('rag locator, no locator given → unverified', checkLocator(ragCitation(null), { section_label: 'Book 4' }), 'unverified')

// Metadata present and consistent → verified
expect('rag locator consistent with section_label → verified', checkLocator(ragCitation('Lives Book7 (Stoics)'), { section_label: 'Stoics' }), 'verified')

// Metadata present and contradictory → mismatch
expect('rag locator contradicting section_label → mismatch', checkLocator(ragCitation('Book 12'), { section_label: 'Stoics' }), 'mismatch')

// Paper page hints: within ±1 verified, off by more mismatch, missing hint unverified
expect('paper locator p.12 vs page_hint 12 → verified', checkLocator(paperCitation('p. 12'), { page_hint: 12 }), 'verified')
expect('paper locator p.12 vs page_hint 13 → verified (chunk spans pages)', checkLocator(paperCitation('p. 12'), { page_hint: 13 }), 'verified')
expect('paper locator p.12 vs page_hint 20 → mismatch', checkLocator(paperCitation('p. 12'), { page_hint: 20 }), 'mismatch')
expect('paper locator without page_hint → unverified', checkLocator(paperCitation('p. 12'), { page_hint: null }), 'unverified')

// normalizeQuote sanity
expect('normalizeQuote straightens curly quotes', normalizeQuote('“up to us”'), '"up to us"')

console.log(failures === 0 ? '\nAll fixtures pass.' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
