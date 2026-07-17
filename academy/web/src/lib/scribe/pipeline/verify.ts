import { createAdminClient } from '@/lib/supabase-admin'
import { runStage, extractJson, type StageUsage } from '../anthropic'
import type {
  ScribeCitation,
  ScribeCitationVerification,
  ScribeDraftVerification,
  LocatorStatus,
} from '../types'

// Stage D — Verify. Deterministic checks first, then one cheap-model pass:
//   1. Every citation resolves to a real chunk id (code).
//   2. Every quote string-matches its chunk, normalized (code).
//   3. Locator sanity against chunk metadata (code) — primary texts mostly
//      lack passage metadata, so 'unverified' is the honest common case
//      (decision recorded in docs/scribe-discovery.md §3).
//   4. Paraphrase support for non-quote citations (haiku, one batched call).

// Normalization: quotes must be verbatim up to typography — curly vs straight
// quotes, dash styles, markdown emphasis, and whitespace collapse. Case is
// preserved. (Markdown *emphasis* inside a quote is presentation, not
// content — the smoke run caught exactly this on a Meditations quote.)
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

// A quote may elide with ellipses; every segment ≥ 8 chars must appear
// verbatim in the chunk.
export function quoteMatchesChunk(quoteText: string, chunkContent: string): boolean {
  const chunk = normalizeQuote(chunkContent)
  const segments = normalizeQuote(quoteText)
    .split('...')
    .map(s => s.replace(/^["'\s]+|["'\s]+$/g, ''))
    .filter(s => s.length >= 8)
  if (segments.length === 0) return false
  return segments.every(seg => chunk.includes(seg))
}

// Passage labels from the enrichment pass (label-passages.ts) are numeric
// dotted refs, possibly a range across a chunk boundary: "5", "1.24",
// "4.49–5.1". Sentinel labels mark non-citable regions.
const SENTINEL_LABELS = ['front matter', 'end matter', 'duplicate ingestion']

function parseRef(s: string): number[] | null {
  const m = s.match(/^\d+(\.\d+)*$/)
  return m ? s.split('.').map(Number) : null
}

// Compare dotted refs component-wise at their shared depth; a shorter ref
// equal on shared components counts as equal (book-level cites book).
function cmpRef(a: number[], b: number[]): number {
  const depth = Math.min(a.length, b.length)
  for (let i = 0; i < depth; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

// Essay labels carry a title + ref: "On Providence 3", ranges repeat the
// title ("On Anger 1.5–On Anger 1.6"). The title must overlap the locator on
// a distinctive word (Latin equivalents aliased) before the numbers are
// compared — otherwise the honest answer is 'unverified', never a false
// verify across same-numbered chapters of different essays.
const TITLE_STOPWORDS = new Set(['on', 'of', 'the', 'a', 'to', 'de', 'life', 'vita'])
const LATIN_ALIASES: Record<string, string[]> = {
  anger: ['ira'],
  providence: ['providentia'],
  clemency: ['clementia'],
  constancy: ['constantia'],
  shortness: ['brevitate', 'brevitatis'],
  happy: ['beata'],
  leisure: ['otio'],
  peace: ['tranquillitate', 'tranquillitatis'],
  mind: ['animi'],
}

function checkEssayLocator(locator: string, label: string): LocatorStatus {
  const partRe = /^(.*?)\s+(\d+(?:\.\d+)*)$/
  const parts = label
    .split(/[–—]/)
    .map(s => s.trim().match(partRe))
    .filter((m): m is RegExpMatchArray => !!m)
  if (parts.length === 0) return 'unverified' // legacy non-passage label

  const titleWords = parts[0][1]
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w && !TITLE_STOPWORDS.has(w))
  const loc = locator.toLowerCase()
  const titleMatches = titleWords.some(
    w => loc.includes(w) || (LATIN_ALIASES[w] ?? []).some(alias => loc.includes(alias))
  )
  if (!titleMatches) return 'unverified' // different naming tradition — cannot adjudicate

  const tokens = locator.match(/\d+(?:\.\d+)*/g)
  if (!tokens?.length) return 'unverified'
  const cited = tokens[tokens.length - 1].split('.').map(Number)
  const lo = parts[0][2].split('.').map(Number)
  const hi = parts[parts.length - 1][2].split('.').map(Number)
  return cmpRef(cited, lo) >= 0 && cmpRef(cited, hi) <= 0 ? 'verified' : 'mismatch'
}

export function checkLocator(
  citation: ScribeCitation,
  chunkMeta: { section_label?: string | null; page_hint?: number | null }
): LocatorStatus {
  if (!citation.locator) return 'unverified'

  if (citation.chunk_table === 'rag_corpus') {
    const label = chunkMeta.section_label?.trim()
    if (!label) return 'unverified' // work has no passage metadata yet
    if (SENTINEL_LABELS.some(s => label.includes(s))) {
      // A canonical locator pointing at front matter / license boilerplate /
      // a duplicate ingestion is wrong by construction.
      return 'mismatch'
    }

    // Range like "4.49–5.1" or single ref like "1.24".
    const parts = label.split(/[–—-]/).map(s => parseRef(s.trim())).filter((r): r is number[] => !!r)
    if (parts.length === 0) {
      // Essay-titled labels from the Minor Dialogues layer:
      // "On Providence 3" · "On Anger 1.5–On Anger 1.6".
      return checkEssayLocator(citation.locator, label)
    }

    // The cited passage: the last dotted-numeric token in the locator
    // ("Discourses 1.24.1" → 1.24.1; "Enchiridion 5" → 5).
    const tokens = citation.locator.match(/\d+(?:\.\d+)*/g)
    if (!tokens?.length) return 'unverified'
    const cited = tokens[tokens.length - 1].split('.').map(Number)

    const lo = parts[0]
    const hi = parts[parts.length - 1]
    return cmpRef(cited, lo) >= 0 && cmpRef(cited, hi) <= 0 ? 'verified' : 'mismatch'
  }

  // scribe_source_chunks: locator like "p. 12" vs the chunk's page_hint.
  const pageMatch = citation.locator.match(/(\d+)/)
  if (!pageMatch || chunkMeta.page_hint == null) return 'unverified'
  const cited = parseInt(pageMatch[1], 10)
  // Chunks span pages (400 words ≈ 1–2 pages) — allow ±1.
  return Math.abs(cited - chunkMeta.page_hint) <= 1 ? 'verified' : 'mismatch'
}

// Pull the sentence around the citation marker out of the draft, for the
// paraphrase-support check. Falls back to the marker itself.
export function sentenceAround(content: string, marker: string): string {
  const idx = content.indexOf(marker.slice(0, 60))
  if (idx === -1) return marker
  const start = Math.max(
    content.lastIndexOf('.', idx),
    content.lastIndexOf('\n', idx),
    0
  )
  const endDot = content.indexOf('.', idx + marker.length)
  const end = endDot === -1 ? Math.min(content.length, idx + 400) : endDot + 1
  return content.slice(start + 1, end).trim()
}

type ChunkRow = {
  id: string
  content: string
  section_label?: string | null
  page_hint?: number | null
  author?: string
  work?: string
}

async function fetchChunks(citations: ScribeCitation[]): Promise<Map<string, ChunkRow>> {
  const admin = createAdminClient()
  const ragIds = [...new Set(citations.filter(c => c.chunk_table === 'rag_corpus').map(c => c.chunk_id))]
  const scribeIds = [...new Set(citations.filter(c => c.chunk_table === 'scribe_source_chunks').map(c => c.chunk_id))]

  const map = new Map<string, ChunkRow>()
  if (ragIds.length) {
    const { data, error } = await admin
      .from('rag_corpus')
      .select('id, chunk_text, section_label, author, work')
      .in('id', ragIds)
    if (error) throw new Error(`Fetching rag_corpus chunks: ${error.message}`)
    for (const r of data ?? []) {
      map.set(`rag_corpus:${r.id}`, {
        id: r.id,
        content: r.chunk_text,
        section_label: r.section_label,
        author: r.author,
        work: r.work,
      })
    }
  }
  if (scribeIds.length) {
    const { data, error } = await admin
      .from('scribe_source_chunks')
      .select('id, content, page_hint, section_hint')
      .in('id', scribeIds)
    if (error) throw new Error(`Fetching scribe chunks: ${error.message}`)
    for (const r of data ?? []) {
      map.set(`scribe_source_chunks:${r.id}`, {
        id: r.id,
        content: r.content,
        page_hint: r.page_hint,
      })
    }
  }
  return map
}

const SUPPORT_SYSTEM = `You check whether source passages actually support the claims that cite them. For each item you receive a CLAIM (a sentence from a draft) and a PASSAGE (the cited source chunk). Judge only entailment/support, not style:
- "supported": the passage clearly supports the claim as stated
- "partial": the passage is related and partially supports it, but the claim overreaches or shifts emphasis
- "not": the passage does not support the claim

Return ONLY a JSON array, one entry per item, in order: [{ "index": n, "support": "supported"|"partial"|"not", "note": "<one short sentence, only when not fully supported>" }]`

export async function verifyDraft(
  content: string,
  citations: ScribeCitation[]
): Promise<{ verification: ScribeDraftVerification; usage: StageUsage | null }> {
  const chunkMap = await fetchChunks(citations)

  const results: ScribeCitationVerification[] = citations.map(c => {
    const chunk = chunkMap.get(`${c.chunk_table}:${c.chunk_id}`)
    const chunk_resolves = !!chunk
    let quote_match: boolean | null = null
    let locator: LocatorStatus = 'unverified'
    let note: string | null = null

    if (!chunk) {
      note = 'Citation does not resolve to a stored chunk — this must not ship.'
    } else {
      if (c.quote) {
        const quoteText = c.quote_text || c.marker
        quote_match = quoteMatchesChunk(quoteText, chunk.content)
        if (!quote_match) note = 'Quoted text does not match the source chunk verbatim.'
      }
      locator = checkLocator(c, chunk)
      if (locator === 'mismatch') {
        note = [note, 'Locator contradicts the chunk metadata.'].filter(Boolean).join(' ')
      } else if (locator === 'unverified' && c.locator && c.chunk_table === 'rag_corpus') {
        note = [note, 'Locator unverifiable — corpus lacks passage metadata for this work.']
          .filter(Boolean)
          .join(' ')
      }
      if (!normalizeQuote(content).includes(normalizeQuote(c.marker).slice(0, 40))) {
        note = [note, 'Marker text not found in the draft.'].filter(Boolean).join(' ')
      }
    }

    return { marker: c.marker, chunk_resolves, quote_match, locator, support: null, note }
  })

  // Paraphrase-support pass (haiku) for resolvable non-quote citations.
  const toCheck = citations
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => !c.quote && results[i].chunk_resolves)

  let usage: StageUsage | null = null
  if (toCheck.length > 0) {
    const items = toCheck
      .map(({ c, i }, n) => {
        const chunk = chunkMap.get(`${c.chunk_table}:${c.chunk_id}`)!
        return `ITEM ${n} (index ${i})\nCLAIM: ${sentenceAround(content, c.marker)}\nPASSAGE: ${chunk.content.slice(0, 1200)}`
      })
      .join('\n\n---\n\n')

    try {
      const res = await runStage('verify', SUPPORT_SYSTEM, items)
      usage = res.usage
      const judged = extractJson<{ index: number; support: 'supported' | 'partial' | 'not'; note?: string }[]>(res.text)
      for (const j of judged) {
        const r = results[j.index]
        if (!r) continue
        r.support = j.support
        if (j.support !== 'supported' && j.note) {
          r.note = [r.note, j.note].filter(Boolean).join(' ')
        }
      }
    } catch (e) {
      // The deterministic checks stand on their own; a failed support pass is
      // recorded, not fatal.
      for (const { i } of toCheck) {
        results[i].note = [results[i].note, 'Support check did not run.'].filter(Boolean).join(' ')
      }
      console.error('[scribe/verify] support pass failed:', e)
    }
  }

  return {
    verification: { checked_at: new Date().toISOString(), results },
    usage,
  }
}

// A draft is "ready"-eligible only when every citation resolves and every
// quote matches. Locator 'unverified' does not block; 'mismatch' does.
export function verificationPasses(v: ScribeDraftVerification): boolean {
  return v.results.every(
    r => r.chunk_resolves && r.quote_match !== false && r.locator !== 'mismatch'
  )
}
