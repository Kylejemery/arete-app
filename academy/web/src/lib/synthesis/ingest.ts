import { createAdminClient } from '@/lib/supabase-admin'
import { chunkText, wordCount, embedChunk } from '@/lib/corpus/ingest'

// Ingests an APPROVED synthesis document into rag_corpus as a third corpus
// layer (text_type='synthesis'), making it retrievable by Cabinet counselors —
// the corpus thinking about itself. Reuses the same chunk → embed → upsert
// pipeline as primary-source ingestion (academy/corpus-ingestion/ingest-sources.js
// and @/lib/corpus/ingest.ts) so synthesis chunks are indistinguishable in shape.
//
// program_id is 'stoicism-phd' (the corpus-wide value, NOT the 'general' the
// build spec floated): it matches every existing row and the conflict key, so
// retrieval that scopes to the program still surfaces these chunks. author is a
// fixed 'Arete Synthesis' so generated material is always clearly labeled.

const PROGRAM_ID = 'stoicism-phd'
const SYNTHESIS_AUTHOR = 'Arete Synthesis'

export type SynthesisDocForIngest = {
  id: string
  title: string
  content: string
  concept: string
  synthesis_type: string
}

export async function ingestSynthesisDocument(
  doc: SynthesisDocForIngest
): Promise<{ chunksCreated: number; chunkIds: string[] }> {
  const admin = createAdminClient()
  const chunks = chunkText(doc.content)
  if (chunks.length === 0) {
    throw new Error('Synthesis document has no chunkable content')
  }

  const chunkIds: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedChunk(chunks[i])
    const { data, error } = await admin
      .from('rag_corpus')
      .upsert(
        {
          chunk_text: chunks[i],
          author: SYNTHESIS_AUTHOR,
          work: doc.title,
          section_label: `${doc.synthesis_type} — ${doc.concept}`,
          language: 'english',
          program_id: PROGRAM_ID,
          course_relevance: null,
          difficulty: 'Advanced',
          text_type: 'synthesis',
          source_url: null,
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

  return { chunksCreated: chunks.length, chunkIds }
}
