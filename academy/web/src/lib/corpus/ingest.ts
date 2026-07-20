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

// text-embedding-3-small caps input at 8192 tokens. Corpus chunks are far under
// it, but callers that embed a whole document (e.g. a long log entry) can cross
// it and get a hard 400 back. How many characters fit varies with the prose —
// observed entries run anywhere from ~4 to ~5.9 chars per token — so rather than
// guess a character budget, shrink and retry until it fits. That never truncates
// more than the text actually requires.
const OVERLONG = /maximum context length|reduce.*length|too many tokens/i

export async function embedChunk(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not configured')

  let input = text
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input }),
    })
    if (res.ok) {
      const data = await res.json()
      return data.data[0].embedding
    }
    // Only length is recoverable by trimming — auth, quota and rate limits are
    // surfaced as-is so the caller reports the real reason.
    const body = await res.text()
    if (res.status === 400 && OVERLONG.test(body) && attempt < 6 && input.length > 500) {
      input = input.slice(0, Math.floor(input.length * 0.8))
      continue
    }
    throw new Error(`OpenAI embeddings ${res.status}: ${body}`)
  }
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

// Highest chunk_index already stored for this (author, work, program_id), or -1
// if the work is new. New chunks start after it so a second passage APPENDS
// instead of overwriting the first (the upsert key is
// author,work,program_id,chunk_index — restarting at 0 would clobber).
export async function maxChunkIndex(author: string, work: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('rag_corpus')
    .select('chunk_index')
    .eq('author', author)
    .eq('work', work)
    .eq('program_id', PROGRAM_ID)
    .order('chunk_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? data.chunk_index : -1
}

export async function ingestText(
  text: string,
  meta: IngestMeta
): Promise<{ chunksCreated: number; wordCount: number; chunkIds: string[] }> {
  const admin = createAdminClient()
  const chunks = chunkText(text)
  const offset = (await maxChunkIndex(meta.author, meta.work)) + 1
  const chunkIds: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedChunk(chunks[i])
    const { data, error } = await admin
      .from('rag_corpus')
      .upsert(
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
          chunk_index: offset + i,
          word_count: wordCount(chunks[i]),
          embedding,
        },
        { onConflict: 'author,work,program_id,chunk_index' }
      )
      .select('id')
      .single()
    if (error) throw new Error(`upsert chunk ${offset + i}: ${error.message}`)
    if (data?.id) chunkIds.push(data.id)
  }

  return { chunksCreated: chunks.length, wordCount: wordCount(text), chunkIds }
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
