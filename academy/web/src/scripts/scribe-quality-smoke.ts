// Offline checks for the quotation check and the provenance attribution.
// No network, no tokens. Run: npx tsx src/scripts/scribe-quality-smoke.ts

import {
  checkQuotes,
  countUnverified,
  extractQuotedSpans,
  normalizeQuote,
  quoteMatchesChunk,
  type CandidateChunk,
} from '../lib/scribe/quote-check'
import { attributeDraft, originSpans } from '../lib/scribe/provenance'
import { GAPS_APPENDIX } from '../lib/scribe/chat'
import { buildExemplarBlock } from '../lib/composer'

let pass = 0
let fail = 0
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else {
    fail++
    console.log(`FAIL ${name}`, detail ?? '')
  }
}

// ── Quote extraction ─────────────────────────────────────────────────────────
const MARCUS = 'Men are disturbed not by things, but by the views which they take of things. Death, for example, is nothing terrible.'
const SELLARS = 'Sellars argues that the Stoic theory of impressions is best read as a cognitive account of assent rather than a passive theory of perception.'

const draft = `# The gutter

He never fixed it. Every rain reminded him, and he called that a fact about the gutter.

> "Men are disturbed not by things, but by the views which they take of things."

The judgment is the thing. As one modern reader puts it, "the Stoic theory of impressions is best read as a cognitive account of assent rather than a passive theory of perception."

He said "no" and meant it.

And he wrote, "Ideas are going to be the currency of the future. That, and the way to live your life."`

const spans = extractQuotedSpans(draft)
check('finds the blockquote', spans.some(s => s.text.includes('Men are disturbed')), spans.map(s => s.text.slice(0, 30)))
check('finds the inline quotation', spans.some(s => s.text.includes('cognitive account of assent')))
check('finds the writer quoting himself', spans.some(s => s.text.includes('currency of the future')))
check('ignores a short scare quote', !spans.some(s => s.text.trim() === 'no'), spans.map(s => s.text))
check('spans index into the draft', spans.every(s => draft.slice(s.start, s.end) === s.text))

// ── Matching ─────────────────────────────────────────────────────────────────
check('exact match', quoteMatchesChunk('Men are disturbed not by things', MARCUS))
check('typography is forgiven', quoteMatchesChunk('Men are disturbed not by things, but by the views', MARCUS.replace(/,/g, ',')))
check('curly quotes and dashes fold', normalizeQuote('“a—b’s”') === '"a-b\'s"', normalizeQuote('“a—b’s”'))
check('markdown emphasis inside a quote is not content', quoteMatchesChunk('Men are *disturbed* not by things', MARCUS))
check('ellipsis elision works', quoteMatchesChunk('Men are disturbed not by things ... nothing terrible', MARCUS))
check('a fabricated quote does not match', !quoteMatchesChunk('Men are disturbed by fortune above all', MARCUS))
check('a too-short fragment does not pass', !quoteMatchesChunk('Men', MARCUS))

// ── The check as a whole ─────────────────────────────────────────────────────
const chunks: CandidateChunk[] = [
  { chunk_id: 'c1', content: MARCUS, author: 'Epictetus', work: 'Enchiridion', section_label: '5', quotable: true },
  { chunk_id: 'c2', content: SELLARS, author: 'Sellars', work: 'Stoicism', section_label: null, quotable: false },
  { chunk_id: 'raw', content: 'Ideas are going to be the currency of the future. That, and the way to live your life.', author: 'You', work: 'Fragment', section_label: null, quotable: true },
]
const findings = checkQuotes(draft, chunks)
const byText = (needle: string) => findings.find(f => f.quote.includes(needle))
check('a real corpus quote verifies', byText('Men are disturbed')?.status === 'verified', byText('Men are disturbed'))
check('the verified finding names its source', byText('Men are disturbed')?.author === 'Epictetus')
check('quoting a summary is caught', byText('cognitive account')?.status === 'not-quotable', byText('cognitive account'))
check('the writer quoting himself verifies', byText('currency of the future')?.status === 'verified')
check('unverified counted', countUnverified(findings) === 1, findings.map(f => [f.quote.slice(0, 24), f.status]))

const invented = checkQuotes('He wrote: "The obstacle is never the way, and anyone who says so has not carried one."', chunks)
check('an invented quote comes back unverified', invented[0]?.status === 'unverified', invented)
check('no chunks at all means nothing verifies', checkQuotes(draft, [])[0]?.status === 'unverified')

// ── Provenance ───────────────────────────────────────────────────────────────
const RAW = 'He never fixed it. Every rain reminded him, and he called that a fact about the gutter.'
const scribeDraft = `${RAW} The judgment is the thing, and the tradition has a word for it. Marcus called it assent.`
const prov = attributeDraft(scribeDraft, [{ role: 'scribe', text: scribeDraft }], RAW)
check('the fragment is attributed to the writer', prov.spans.filter(s => s.origin === 'you').length === 2, prov.spans)
check("Scribe's new sentences are attributed to Scribe", prov.spans.filter(s => s.origin === 'scribe').length === 2)
check('share is a real proportion', prov.yourShare > 0 && prov.yourShare < 100, prov)
check('word counts add up', prov.yourWords + prov.scribeWords === prov.totalWords)

const handEdit = `${RAW} I never told anyone why.`
const prov2 = attributeDraft(handEdit, [
  { role: 'scribe', text: `${RAW} The judgment is the thing.` },
  { role: 'user', text: handEdit },
], RAW)
check('a sentence the writer typed is theirs', prov2.spans.every(s => s.origin === 'you'), prov2.spans)
check('a fully human draft is 100 percent', prov2.yourShare === 100, prov2)

const allScribe = attributeDraft('One new claim here. And a second new claim.', [], null)
check('unattributed prose defaults to Scribe', allScribe.yourShare === 0, allScribe)
check('empty draft does not divide by zero', attributeDraft('', [], null).yourShare === 0)
check('origin spans merge adjacent runs', originSpans(prov, 'you').length === 1, originSpans(prov, 'you'))
check('retyping only the punctuation keeps authorship', attributeDraft(RAW.replace(/\./g, '.'), [], RAW).yourShare === 100)

// ── The gaps appendix keeps the house rules ──────────────────────────────────
check('gaps appendix forbids finished prose', /may NOT write/.test(GAPS_APPENDIX))
check('gaps appendix has no dashes', !/[—–]/.test(GAPS_APPENDIX))
check('gaps appendix keeps his own words quotable', /copied verbatim from his fragment/.test(GAPS_APPENDIX))

// ── The voice prompt shows the rewrite pairs ─────────────────────────────────
const block = buildExemplarBlock([], null, [], [{ from: 'It is a testament to his resolve.', to: 'He kept going.' }])
check('rewrite pairs reach the voice prompt', /HOW THIS WRITER REWRITES/.test(block) && /He kept going\./.test(block))
check('no pairs, no section', !/HOW THIS WRITER REWRITES/.test(buildExemplarBlock([], null, [], [])))

console.log(`${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
