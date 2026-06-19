import { createAdminClient } from '@/lib/supabase-admin'

// Mirrors academy/corpus-ingestion/ingest-sources.js exactly (chunk size,
// overlap, column mapping, and the author/work/program_id/chunk_index conflict
// key) so passages ingested here are indistinguishable from the CLI/agent path.
// The pipeline itself can't be imported here (it's a CJS Node script outside
// the web app, with its own openai/dotenv deps and SUPABASE_URL env names), so
// the same ~12 lines of chunk → embed → upsert are re-expressed against the
// service-role client and a fetch-based embeddings call.

const CHUNK_SIZE = 400
const OVERLAP = 50
const PROGRAM_ID = 'stoicism-phd' // rag_corpus.program_id is NOT NULL; matches existing rows

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    if (chunk.trim().length > 0) chunks.push(chunk)
    i += CHUNK_SIZE - OVERLAP
  }
  return chunks
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export async function embedChunk(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.data[0].embedding
}

export type IngestMeta = {
  author: string
  work: string
  section_label: string | null
  language: string | null
  course_relevance: string | null
  difficulty: string | null
  text_type: string // 'summary' | 'public_domain'
}

export async function ingestText(
  text: string,
  meta: IngestMeta
): Promise<{ chunksCreated: number; wordCount: number }> {
  const admin = createAdminClient()
  const chunks = chunkText(text)

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedChunk(chunks[i])
    const { error } = await admin.from('rag_corpus').upsert(
      {
        chunk_text: chunks[i],
        author: meta.author,
        work: meta.work,
        section_label: meta.section_label,
        language: meta.language,
        program_id: PROGRAM_ID,
        course_relevance: meta.course_relevance,
        difficulty: meta.difficulty,
        text_type: meta.text_type,
        source_url: null,
        chunk_index: i,
        word_count: wordCount(chunks[i]),
        embedding,
      },
      { onConflict: 'author,work,program_id,chunk_index' }
    )
    if (error) throw new Error(`upsert chunk ${i}: ${error.message}`)
  }

  return { chunksCreated: chunks.length, wordCount: wordCount(text) }
}

// Live chunk count for a single author (for the post-ingest "coverage" line).
export async function authorChunkCount(author: string): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('rag_corpus')
    .select('id', { count: 'exact', head: true })
    .eq('author', author)
  if (error) throw new Error(error.message)
  return count ?? 0
}
