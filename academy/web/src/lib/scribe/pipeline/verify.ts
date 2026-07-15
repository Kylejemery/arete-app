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
// quotes, dash styles, and whitespace collapse. Case is preserved.
export function normalizeQuote(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/…/g, '...')
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

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim()
}

export function checkLocator(
  citation: ScribeCitation,
  chunkMeta: { section_label?: string | null; page_hint?: number | null }
): LocatorStatus {
  if (!citation.locator) return 'unverified'

  if (citation.chunk_table === 'rag_corpus') {
    const label = chunkMeta.section_label?.trim()
    if (!label) return 'unverified' // primary texts lack passage metadata (v1)
    const a = normalizeLabel(citation.locator)
    const b = normalizeLabel(label)
    return a.includes(b) || b.includes(a) ? 'verified' : 'mismatch'
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
      if (!content.includes(c.marker.slice(0, 40))) {
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
