import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'

// Stage B — Retrieve. For each key claim: embed, query BOTH corpora, and
// assemble a retrieval bundle. Chunks get short handles (R1…/S1…) — the
// draft stage cites handles, never raw UUIDs, so a fabricated citation
// cannot even be expressed: an unknown handle simply fails to resolve.

const RAG_K = 6
const SCRIBE_K = 4
// Below this cosine similarity a hit doesn't count as support; a claim with
// no hits above it is marked unsupported and must flow into the draft as the
// author's own voice, uncited.
const SUPPORT_THRESHOLD = 0.3

export interface BundleChunk {
  handle: string // R1… (rag_corpus) or S1… (scribe_source_chunks)
  chunk_table: 'rag_corpus' | 'scribe_source_chunks'
  chunk_id: string
  content: string
  // rag_corpus metadata
  author?: string
  work?: string
  section_label?: string | null
  translator?: string | null
  text_type?: string
  // scribe_source_chunks metadata
  source_id?: string
  citation_key?: string
  source_title?: string
  page_hint?: number | null
  similarity: number
}

export interface ClaimBundle {
  claim: string
  supported: boolean
  chunks: BundleChunk[]
}

type RagHit = {
  id: string
  chunk_text: string
  author: string
  work: string
  section_label: string | null
  translator: string | null
  text_type: string
  source_url: string | null
  similarity: number
}

type ScribeHit = {
  id: string
  source_id: string
  content: string
  page_hint: number | null
  section_hint: string | null
  similarity: number
}

export async function retrieveForClaims(claims: string[]): Promise<ClaimBundle[]> {
  const admin = createAdminClient()

  // citation_key / title lookup for scribe chunks' sources
  const { data: sources } = await admin
    .from('scribe_sources')
    .select('id, citation_key, title')
  const sourceMeta = new Map(
    (sources ?? []).map(s => [s.id as string, { key: s.citation_key as string, title: s.title as string }])
  )

  const bundles: ClaimBundle[] = []
  let rCounter = 0
  let sCounter = 0

  for (const claim of claims) {
    const embedding = await embedChunk(claim)

    const [ragRes, scribeRes] = await Promise.all([
      admin.rpc('match_rag_corpus_cited', {
        query_embedding: embedding,
        match_count: RAG_K,
      }),
      admin.rpc('match_scribe_source_chunks', {
        query_embedding: embedding,
        match_count: SCRIBE_K,
      }),
    ])

    if (ragRes.error) throw new Error(`match_rag_corpus_cited: ${ragRes.error.message}`)
    if (scribeRes.error) throw new Error(`match_scribe_source_chunks: ${scribeRes.error.message}`)

    const chunks: BundleChunk[] = []

    for (const hit of (ragRes.data ?? []) as RagHit[]) {
      if (hit.similarity < SUPPORT_THRESHOLD) continue
      rCounter++
      chunks.push({
        handle: `R${rCounter}`,
        chunk_table: 'rag_corpus',
        chunk_id: hit.id,
        content: hit.chunk_text,
        author: hit.author,
        work: hit.work,
        section_label: hit.section_label,
        translator: hit.translator,
        text_type: hit.text_type,
        similarity: hit.similarity,
      })
    }

    for (const hit of (scribeRes.data ?? []) as ScribeHit[]) {
      if (hit.similarity < SUPPORT_THRESHOLD) continue
      const meta = sourceMeta.get(hit.source_id)
      if (!meta) continue
      sCounter++
      chunks.push({
        handle: `S${sCounter}`,
        chunk_table: 'scribe_source_chunks',
        chunk_id: hit.id,
        content: hit.content,
        source_id: hit.source_id,
        citation_key: meta.key,
        source_title: meta.title,
        page_hint: hit.page_hint,
        similarity: hit.similarity,
      })
    }

    bundles.push({ claim, supported: chunks.length > 0, chunks })
  }

  return bundles
}
