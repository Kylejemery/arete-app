import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'

// retrieval_log writer for the academy web app — the TypeScript twin of
// server/lib/retrieval-log.js, same table, same contract: one row per
// retrieved chunk, keyed by a request_id generated per agent request,
// fire-and-forget, never throws. Until this existed only the Railway
// counselors logged, so nothing could say whether a paper summary admitted
// for the research surfaces was ever retrieved by one.
//
// Only rag_corpus rows are logged (chunk_id is a uuid join key into it);
// scribe_source_chunks hits are the Scribe's private sources, not corpus
// learning signal.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LoggedChunk = { id?: string | null; similarity?: number | null }

export function newRequestId(): string {
  return randomUUID()
}

export function logRetrieval(p: {
  requestId: string
  agent: string // 'scribe:chat' | 'scribe:claims' | …
  queryText: string
  chunks: LoggedChunk[] // in retrieved order
  mode?: string
}): void {
  void (async () => {
    try {
      if (!p.requestId || !Array.isArray(p.chunks) || p.chunks.length === 0) return
      const rows = p.chunks
        .map((c, i) => ({
          request_id: p.requestId,
          agent: p.agent,
          query_text: String(p.queryText ?? '').slice(0, 4000),
          chunk_id: typeof c?.id === 'string' && UUID_RE.test(c.id) ? c.id : null,
          chunk_key: c?.id != null ? String(c.id) : '',
          corpus: 'rag_corpus',
          rank: i + 1,
          similarity: typeof c?.similarity === 'number' ? c.similarity : null,
          retrieval_mode: p.mode ?? 'vector',
        }))
        .filter(r => r.chunk_key)
      if (rows.length === 0) return
      const admin = createAdminClient()
      const { error } = await admin.from('retrieval_log').insert(rows)
      if (error) console.warn('[retrieval-log] insert failed:', error.message)
    } catch (err) {
      console.warn('[retrieval-log] logRetrieval error:', err instanceof Error ? err.message : err)
    }
  })()
}
