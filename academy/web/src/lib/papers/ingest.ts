import { createAdminClient } from '@/lib/supabase-admin'
import { chunkText, wordCount, embedChunk } from '@/lib/corpus/ingest'
import { parseEditionYear } from '@/lib/papers/citation'

// Ingests an approved paper SUMMARY into rag_corpus as text_type='paper_summary'
// — modern scholarship entering the corpus pre-digested and clearly labeled.
// The paper's own text is never ingested (open-access is not public-domain);
// only the Paper Agent's reviewed summary becomes retrievable. paper_summary
// rows are excluded from the Library shelves server-side: counselors can quote
// them, but they never appear as readable works.
//
// Same embed → upsert pipeline and conflict key as every other layer, so
// paper chunks are indistinguishable in shape. author/work come from the
// submission (Kyle's citation, correctable during review), so retrieval
// attributes the summary to the scholar, not to Arete.
//
// Chunking differs from the verbatim layers on purpose. The agent writes the
// summary as a few structured paragraphs (thesis; argument; engagement with
// the tradition; significance), and a fixed 400-word window cut every summary
// mid-sentence and left a 150-word tail. Paragraphs are the natural unit:
// each is one move of the argument and each names the author, so a chunk
// retrieved on its own still attributes itself.

const PROGRAM_ID = 'stoicism-phd'

// A paragraph shorter than this is folded into its neighbour: a one-line
// transition retrieved alone says nothing.
const MIN_PARAGRAPH_WORDS = 80
// Longer than this and the paragraph is split by the word chunker (500
// words is beyond the agent's whole-summary floor, so this is a guard).
const MAX_PARAGRAPH_WORDS = 500

export type PaperForIngest = {
  id: string
  author: string
  work: string
  year: string | null
  venue: string | null
  summary_text: string
  source_url: string | null
  storage_path?: string | null
}

// Split a summary on blank lines, fold short paragraphs into the previous
// one (or the next, for a short opener), and split any overlong paragraph.
export function chunkSummary(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return []

  const merged: string[] = []
  for (const p of paragraphs) {
    const prev = merged[merged.length - 1]
    if (prev !== undefined && (wordCount(p) < MIN_PARAGRAPH_WORDS || wordCount(prev) < MIN_PARAGRAPH_WORDS)) {
      merged[merged.length - 1] = `${prev} ${p}`
    } else {
      merged.push(p)
    }
  }

  const out: string[] = []
  for (const p of merged) {
    if (wordCount(p) > MAX_PARAGRAPH_WORDS) out.push(...chunkText(p))
    else out.push(p)
  }
  return out
}

// Provenance for the row. A paper queued by link keeps its URL; an uploaded
// PDF lives in the private 'papers' bucket, and the storage path is the only
// honest pointer to it. The Scribe reference builder links only http(s).
export function paperSourceUrl(paper: Pick<PaperForIngest, 'source_url' | 'storage_path'>): string | null {
  if (paper.source_url) return paper.source_url
  if (paper.storage_path) return `storage:papers/${paper.storage_path}`
  return null
}

export async function ingestPaperSummary(
  paper: PaperForIngest
): Promise<{ chunksCreated: number; chunkIds: string[]; chunks: string[] }> {
  const admin = createAdminClient()
  const chunks = chunkSummary(paper.summary_text)
  if (chunks.length === 0) {
    throw new Error('Paper summary has no chunkable content')
  }

  const sectionBits = ['scholarly summary', paper.venue, paper.year].filter(Boolean)
  const editionYear = parseEditionYear(paper.year)
  const sourceUrl = paperSourceUrl(paper)
  const chunkIds: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedChunk(chunks[i])
    const { data, error } = await admin
      .from('rag_corpus')
      .upsert(
        {
          chunk_text: chunks[i],
          author: paper.author,
          work: paper.work,
          section_label: sectionBits.join(' — '),
          language: 'english',
          program_id: PROGRAM_ID,
          course_relevance: null,
          difficulty: 'Advanced',
          text_type: 'paper_summary',
          source_url: sourceUrl,
          edition_year: editionYear,
          chunk_index: i,
          word_count: wordCount(chunks[i]),
          embedding,
        },
        { onConflict: 'author,work,program_id,chunk_index' }
      )
      .select('id')
      .single()
    if (error) throw new Error(`upsert chunk ${i}: ${error.message}`)
    if (data?.id) chunkIds.push(data.id)
  }

  return { chunksCreated: chunks.length, chunkIds, chunks }
}
