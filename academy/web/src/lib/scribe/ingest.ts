import { createAdminClient } from '@/lib/supabase-admin'
import { embedChunk } from '@/lib/corpus/ingest'
import type { ScribeIngestReport } from './types'

// Quotable full-text ingestion. When a source is marked quotable, its PDF
// (already sitting in the private 'papers' storage bucket via the existing
// papers flow, or at scribe_sources.file_path) is extracted page-by-page with
// unpdf, chunked with the same 400-word / 50-overlap convention as rag_corpus,
// embedded with the same model (text-embedding-3-small, 1536), and stored in
// scribe_source_chunks with a page_hint per chunk.
//
// These chunks are PRIVATE grounding material for drafting and verbatim-quote
// verification. They are never ingested into rag_corpus and never rendered
// beyond fair-use quotes inside drafts (decision recorded in
// docs/scribe-discovery.md §5).

const CHUNK_SIZE = 400
const OVERLAP = 50
const PAPERS_BUCKET = 'papers'

type PageText = { page: number; words: string[] }

export async function extractPdfPages(
  buffer: Uint8Array
): Promise<{ pages: PageText[]; failedPages: number[] }> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const doc = await getDocumentProxy(buffer)
  const { text } = await extractText(doc, { mergePages: false })
  const pages: PageText[] = []
  const failedPages: number[] = []
  const pageTexts: string[] = Array.isArray(text) ? text : [String(text)]
  pageTexts.forEach((t, i) => {
    const words = (t ?? '').split(/\s+/).filter(Boolean)
    if (words.length === 0) failedPages.push(i + 1)
    else pages.push({ page: i + 1, words })
  })
  return { pages, failedPages }
}

// Chunk across page boundaries while remembering which page each chunk
// starts on — the page_hint used in citations ("p. 12") and verification.
export function chunkPages(
  pages: PageText[]
): { content: string; page_hint: number }[] {
  const words: string[] = []
  const pageOfWord: number[] = []
  for (const p of pages) {
    for (const w of p.words) {
      words.push(w)
      pageOfWord.push(p.page)
    }
  }
  const chunks: { content: string; page_hint: number }[] = []
  let i = 0
  while (i < words.length) {
    const slice = words.slice(i, i + CHUNK_SIZE)
    const content = slice.join(' ')
    if (content.trim().length > 0) {
      chunks.push({ content, page_hint: pageOfWord[i] })
    }
    i += CHUNK_SIZE - OVERLAP
  }
  return chunks
}

async function downloadPdf(storagePath: string): Promise<Uint8Array> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(PAPERS_BUCKET).download(storagePath)
  if (error || !data) {
    throw new Error(`Could not download PDF at ${storagePath}: ${error?.message ?? 'no data'}`)
  }
  return new Uint8Array(await data.arrayBuffer())
}

// Full pipeline for one source. Resolves the PDF path (own file_path, or the
// linked paper_submission's storage_path), extracts, chunks, embeds, and
// replaces any previous chunks for the source. Returns the ingest report the
// UI shows.
export async function ingestQuotableSource(sourceId: string): Promise<ScribeIngestReport> {
  const admin = createAdminClient()

  const { data: source, error: srcErr } = await admin
    .from('scribe_sources')
    .select('id, file_path, paper_submission_id')
    .eq('id', sourceId)
    .single()
  if (srcErr || !source) throw new Error(`Source not found: ${srcErr?.message}`)

  let pdfPath = source.file_path as string | null
  if (!pdfPath && source.paper_submission_id) {
    const { data: sub } = await admin
      .from('paper_submissions')
      .select('storage_path')
      .eq('id', source.paper_submission_id)
      .single()
    pdfPath = sub?.storage_path ?? null
  }
  if (!pdfPath) {
    throw new Error('Source has no PDF: neither file_path nor a linked paper submission with a storage_path.')
  }

  const buffer = await downloadPdf(pdfPath)
  const { pages, failedPages } = await extractPdfPages(buffer)
  const chunks = chunkPages(pages)
  if (chunks.length === 0) {
    throw new Error('PDF text extraction produced no chunkable content.')
  }

  // Replace previous chunks wholesale — re-ingesting must not leave stale
  // rows behind (chunk counts can shrink when extraction improves).
  const { error: delErr } = await admin
    .from('scribe_source_chunks')
    .delete()
    .eq('source_id', sourceId)
  if (delErr) throw new Error(`Clearing old chunks failed: ${delErr.message}`)

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedChunk(chunks[i].content)
    const { error } = await admin.from('scribe_source_chunks').insert({
      source_id: sourceId,
      chunk_index: i,
      content: chunks[i].content,
      page_hint: chunks[i].page_hint,
      section_hint: null,
      embedding,
    })
    if (error) throw new Error(`Insert chunk ${i}: ${error.message}`)
  }

  const report: ScribeIngestReport = {
    pages_parsed: pages.length,
    chunks_created: chunks.length,
    failed_pages: failedPages,
  }

  const { error: updErr } = await admin
    .from('scribe_sources')
    .update({
      quotable: true,
      ingested_at: new Date().toISOString(),
      ingest_report: report,
    })
    .eq('id', sourceId)
  if (updErr) throw new Error(`Updating source after ingest: ${updErr.message}`)

  return report
}
