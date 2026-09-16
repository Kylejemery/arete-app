// Quote verification, shared by the pipeline's verify stage and by chat mode.
//
// The one unforgivable failure in Scribe is a quotation that does not trace to
// a real source chunk. The pipeline has always machine-checked this; chat mode
// had only the system prompt asking the model not to fabricate, which is not a
// check. This module is the shared, pure half: normalization, matching, and
// pulling the quoted spans out of a finished draft. The server half (fetching
// the chunks a quote could have come from) lives in the route.
//
// No imports beyond types: safe in the browser and on the server.

// Quotes must be verbatim up to typography — curly versus straight quotes,
// dash styles, markdown emphasis, and whitespace collapse. Case is preserved.
// (Markdown *emphasis* inside a quote is presentation, not content; a smoke
// run caught exactly this on a Meditations quote.)
export function normalizeQuote(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/…/g, '...')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// A quote may elide with ellipses; every segment of 8 characters or more must
// appear verbatim in the chunk.
export function quoteMatchesChunk(quoteText: string, chunkContent: string): boolean {
  const chunk = normalizeQuote(chunkContent)
  const segments = normalizeQuote(quoteText)
    .split('...')
    .map(s => s.replace(/^["'\s]+|["'\s]+$/g, ''))
    .filter(s => s.length >= 8)
  if (segments.length === 0) return false
  return segments.every(seg => chunk.includes(seg))
}

export interface QuotedSpan {
  text: string
  start: number
  end: number
}

// Shorter runs in quotation marks are scare quotes, a single word being
// mentioned, or dialogue, none of which claim a source.
const MIN_QUOTE_CHARS = 40

// The quotations a finished draft makes: text inside double quotes, and
// markdown blockquote paragraphs. Single quotes are not treated as quotation
// marks (apostrophes are far more common in prose than single-quoted
// citations), and a blockquote's own wrapping quotes are trimmed so the same
// passage is not reported twice.
export function extractQuotedSpans(draft: string): QuotedSpan[] {
  const spans: QuotedSpan[] = []

  // Pair the quotation marks in order rather than matching with one regex.
  // A regex pairs greedily across a short quote ("no") and then swallows the
  // real quotation that follows it, which is exactly the passage that must
  // not be missed. Walking the marks keeps every pair its own.
  let open: number | null = null
  for (let i = 0; i < draft.length; i++) {
    const c = draft[i]
    if (c !== '"' && c !== '“' && c !== '”') continue
    if (open === null) {
      if (c === '”') continue // a stray closer, usually a nested quotation
      open = i
      continue
    }
    const inner = draft.slice(open + 1, i)
    if (inner.length >= 10 && normalizeQuote(inner).length >= MIN_QUOTE_CHARS) {
      spans.push({ text: inner, start: open + 1, end: i })
    }
    open = null
  }

  // Blockquote runs: consecutive lines opening with '>'.
  const lines = draft.split('\n')
  let offset = 0
  let runStart = -1
  let runText: string[] = []
  const flush = (endOffset: number) => {
    if (runStart < 0) return
    const text = runText.join(' ').trim()
    const bare = text.replace(/^[“"]|[”"]$/g, '')
    if (normalizeQuote(bare).length >= MIN_QUOTE_CHARS) {
      // Skip when an inline match already covers this passage.
      const already = spans.some(s => normalizeQuote(s.text) === normalizeQuote(bare))
      if (!already) spans.push({ text: bare, start: runStart, end: endOffset })
    }
    runStart = -1
    runText = []
  }
  for (const line of lines) {
    const m = line.match(/^>\s?(.*)$/)
    if (m) {
      if (runStart < 0) runStart = offset
      runText.push(m[1])
    } else {
      flush(offset > 0 ? offset - 1 : 0)
    }
    offset += line.length + 1
  }
  flush(draft.length)

  return spans.sort((a, b) => a.start - b.start)
}

// One chunk a quote could have come from. `quotable` is false for the layers
// that were summarized on ingestion: their original text was never stored, so
// their words must be paraphrased, never quoted.
export interface CandidateChunk {
  chunk_id: string
  content: string
  author: string
  work: string
  section_label: string | null
  quotable: boolean
}

export type QuoteStatus = 'verified' | 'unverified' | 'not-quotable'

export interface QuoteFinding {
  quote: string
  status: QuoteStatus
  // Set when a chunk matched, whatever its status.
  author?: string
  work?: string
  section_label?: string | null
  chunk_id?: string
}

// Check each quotation in the draft against the chunks this session retrieved.
//
// verified     — the words appear in a chunk that may be quoted verbatim.
// not-quotable — the words appear in a summary of modern scholarship, which
//                must be paraphrased with attribution, never quoted.
// unverified   — no retrieved chunk contains these words. Not proof of
//                fabrication (the writer may be quoting something of their
//                own, or a source outside the corpus), which is why the
//                wording is "unverified" and not "false".
export function checkQuotes(draft: string, chunks: CandidateChunk[]): QuoteFinding[] {
  return extractQuotedSpans(draft).map(span => {
    const hit = chunks.find(c => quoteMatchesChunk(span.text, c.content))
    if (!hit) return { quote: span.text, status: 'unverified' as const }
    return {
      quote: span.text,
      status: hit.quotable ? ('verified' as const) : ('not-quotable' as const),
      author: hit.author,
      work: hit.work,
      section_label: hit.section_label,
      chunk_id: hit.chunk_id,
    }
  })
}

export function countUnverified(findings: QuoteFinding[]): number {
  return findings.filter(f => f.status !== 'verified').length
}
