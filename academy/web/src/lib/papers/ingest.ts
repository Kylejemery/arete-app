import { createAdminClient } from '@/lib/supabase-admin'
import { chunkText, wordCount, embedChunk } from '@/lib/corpus/ingest'

// Ingests an approved paper SUMMARY into rag_corpus as text_type='paper_summary'
// — modern scholarship entering the corpus pre-digested and clearly labeled.
// The paper's own text is never ingested (open-access is not public-domain);
// only the Paper Agent's reviewed summary becomes retrievable. paper_summary
// rows are excluded from the Library shelves server-side: counselors can quote
// them, but they never appear as readable works.
//
// Same chunk → embed → upsert pipeline and conflict key as every other layer,
// so paper chunks are indistinguishable in shape. author/work come from the
// submission (Kyle's citation, correctable during review), so retrieval
// attributes the summary to the scholar, not to Arete.

const PROGRAM_ID = 'stoicism-phd'

export type PaperForIngest = {
  id: string
  author: string
  work: string
  year: string | null
  venue: string | null
  summary_text: string
  source_url: string | null
}

export async function ingestPaperSummary(
  paper: PaperForIngest
): Promise<{ chunksCreated: number; chunkIds: string[]; chunks: string[] }> {
  const admin = createAdminClient()
  const chunks = chunkText(paper.summary_text)
  if (chunks.length === 0) {
    throw new Error('Paper summary has no chunkable content')
  }

  const sectionBits = ['scholarly summary', paper.venue, paper.year].filter(Boolean)
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
          source_url: paper.source_url,
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
