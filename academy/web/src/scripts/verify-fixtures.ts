// Fixture tests for the deterministic Stage D checks — no network, no keys.
// Run: npx tsx src/scripts/verify-fixtures.ts   (exits 1 on any failure)

import { normalizeQuote, quoteMatchesChunk, checkLocator } from '../lib/scribe/pipeline/verify'
import { resolveCitations } from '../lib/scribe/pipeline/draft'
import { _test as refs } from '../lib/scribe/references'
import type { ClaimBundle } from '../lib/scribe/pipeline/retrieve'
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

// Markdown emphasis inside a quote is presentation, not content (smoke-run regression)
expect(
  'markdown-emphasized quote matches',
  quoteMatchesChunk('It is not *things* that disturb human beings, but their _judgments_ about things.', CHUNK),
  true
)

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

// Numeric passage labels (from the enrichment pass) verify by range
expect('exact passage match → verified', checkLocator(ragCitation('Discourses 1.24'), { section_label: '1.24' }), 'verified')
expect('deeper cite within chapter → verified', checkLocator(ragCitation('Discourses 1.24.1'), { section_label: '1.24' }), 'verified')
expect('cite inside a spanning range → verified', checkLocator(ragCitation('Meditations 5.1'), { section_label: '4.49–5.1' }), 'verified')
expect('Enchiridion chapter match → verified', checkLocator(ragCitation('Enchiridion 5'), { section_label: '5' }), 'verified')
expect('wrong chapter → mismatch (substring would falsely pass)', checkLocator(ragCitation('Discourses 1.2'), { section_label: '1.24' }), 'mismatch')
expect('cite outside range → mismatch', checkLocator(ragCitation('Meditations 6.13'), { section_label: '4.49–5.1' }), 'mismatch')
expect('canonical cite pointing at front matter → mismatch', checkLocator(ragCitation('Meditations 4.3'), { section_label: 'front matter' }), 'mismatch')
expect('canonical cite pointing at duplicate ingestion → mismatch', checkLocator(ragCitation('Meditations 12.36'), { section_label: 'duplicate ingestion' }), 'mismatch')

// Legacy non-passage labels cannot be adjudicated
expect('legacy junk label → unverified', checkLocator(ragCitation('Lives 7.87'), { section_label: 'Stoics' }), 'unverified')

// Paper page hints: within ±1 verified, off by more mismatch, missing hint unverified
expect('paper locator p.12 vs page_hint 12 → verified', checkLocator(paperCitation('p. 12'), { page_hint: 12 }), 'verified')
expect('paper locator p.12 vs page_hint 13 → verified (chunk spans pages)', checkLocator(paperCitation('p. 12'), { page_hint: 13 }), 'verified')
expect('paper locator p.12 vs page_hint 20 → mismatch', checkLocator(paperCitation('p. 12'), { page_hint: 20 }), 'mismatch')
expect('paper locator without page_hint → unverified', checkLocator(paperCitation('p. 12'), { page_hint: null }), 'unverified')

// normalizeQuote sanity
expect('normalizeQuote straightens curly quotes', normalizeQuote('“up to us”'), '"up to us"')

// ── Citation resolution: a fabricated handle cannot survive ──────
const bundles: ClaimBundle[] = [
  {
    claim: 'test claim',
    supported: true,
    chunks: [
      { handle: 'R1', chunk_table: 'rag_corpus', chunk_id: 'real-uuid-1', content: 'x', similarity: 0.5 },
      { handle: 'S1', chunk_table: 'scribe_source_chunks', chunk_id: 'real-uuid-2', content: 'y', similarity: 0.5 },
    ],
  },
]
const resolved = resolveCitations(
  [
    { marker: 'good rag cite', handle: 'R1', locator: null, quote: false },
    { marker: 'good paper cite', handle: 'S1', locator: 'p. 3', quote: false },
    { marker: 'PLANTED FAKE', handle: 'R99', locator: 'Meditations 1.1', quote: true, quote_text: 'invented' },
  ],
  bundles
)
expect('valid handles resolve', resolved.citations.length, 2)
expect('resolved citation carries real chunk id', resolved.citations[0].chunk_id, 'real-uuid-1')
expect('planted fake handle is dropped', resolved.droppedHandles.length, 1)
expect('dropped handle is the fake one', resolved.droppedHandles[0], 'R99')
expect('fake citation absent from citations', resolved.citations.some(c => c.marker === 'PLANTED FAKE'), false)

// ── Reference formatting ─────────────────────────────────────────
expect(
  'APA modern reference',
  refs.formatModern(
    { authors: [{ family: 'Hadot', given: 'Pierre' }], year: '1995', title: 'Philosophy as a Way of Life', venue: 'Blackwell', doi: null, url: null },
    'apa'
  ),
  'Hadot, P. (1995). Philosophy as a Way of Life. *Blackwell*.'
)
expect(
  'Chicago modern reference',
  refs.formatModern(
    { authors: [{ family: 'Hadot', given: 'Pierre' }], year: '1995', title: 'Philosophy as a Way of Life', venue: 'Blackwell', doi: null, url: null },
    'chicago'
  ),
  'Hadot, Pierre. 1995. "Philosophy as a Way of Life." *Blackwell*.'
)
expect(
  'APA falls back to plain author string (paper_summary rows)',
  refs.formatModern(
    { authors: [], authorFallback: 'David Forman', year: '2008', title: 'Free Will and The Freedom of the Sage', venue: 'History of Philosophy Quarterly', doi: null, url: null },
    'apa'
  ),
  'David Forman (2008). Free Will and The Freedom of the Sage. *History of Philosophy Quarterly*.'
)
expect(
  'Classical reference credits the translation',
  refs.formatClassical({ author: 'Marcus Aurelius', work: 'Meditations', translator: 'George Long' }),
  'Marcus Aurelius. *Meditations*. Translated by George Long.'
)
expect(
  'Classical reference without translator',
  refs.formatClassical({ author: 'Epictetus', work: 'Discourses', translator: null }),
  'Epictetus. *Discourses*.'
)

console.log(failures === 0 ? '\nAll fixtures pass.' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
