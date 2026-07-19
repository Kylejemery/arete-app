// ---------------------------------------------------------------------------
// Learning System Phase A — retrieval + outcome logging.
//
// logRetrieval: one retrieval_log row per retrieved chunk, keyed by a
// request_id generated per agent response. Fire-and-forget, same contract as
// observatory.recordRetrieval: never awaited by callers, never throws, a
// logging failure can never break retrieval.
//
// attributeUsage: post-hoc Haiku call marking which retrieved chunks the
// generated response actually drew on (used_in_response). Also
// fire-and-forget — runs after the response has been sent.
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js');

// chunk_id is a uuid column; the source_chunks fallback corpus has integer
// ids, which can't be joined to rag_corpus learning anyway — skip those rows.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let _supabase = null;
function getSupabase() {
  if (!_supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

/**
 * Log one retrieval_log row per chunk. Call without awaiting.
 *
 * @param {object} p
 * @param {string} p.requestId  uuid generated per agent response
 * @param {string} p.agent      e.g. 'socratic-proctor', 'examine-proctor'
 * @param {string|null} p.studentId
 * @param {number|null} p.sessionId  academy session number
 * @param {string|null} p.courseId
 * @param {string} p.queryText
 * @param {Array<{id?: string, similarity?: number, _corpus?: string}>} p.chunks
 *   In retrieved order. Chunks without an id are skipped (nothing to join on).
 * @param {string} [p.mode] 'vector' (default) | 'graph_boost' — which retrieval
 *   mode served this request, for A/B comparison.
 */
function logRetrieval({ requestId, agent, studentId, sessionId, courseId, queryText, chunks, mode }) {
  (async () => {
    try {
      const supabase = getSupabase();
      if (!supabase || !requestId || !Array.isArray(chunks) || chunks.length === 0) return;
      const rows = chunks
        .map((c, i) => ({
          request_id: requestId,
          agent,
          student_id: studentId ?? null,
          session_id: Number.isInteger(sessionId) ? sessionId : null,
          course_id: courseId ?? null,
          query_text: String(queryText ?? '').slice(0, 4000),
          chunk_id: typeof c?.id === 'string' && UUID_RE.test(c.id) ? c.id : null,
          chunk_key: c?.id != null ? String(c.id) : '',
          corpus: c?._corpus ?? 'rag_corpus',
          rank: i + 1,
          similarity: typeof c?.similarity === 'number' ? c.similarity : null,
          retrieval_mode: mode ?? 'vector',
        }))
        .filter(r => r.chunk_key);
      if (rows.length === 0) return;
      const { error } = await supabase.from('retrieval_log').insert(rows);
      if (error) console.warn('[retrieval-log] insert failed:', error.message);
    } catch (err) {
      console.warn('[retrieval-log] logRetrieval error:', err?.message);
    }
  })();
}

/**
 * Ask Haiku which retrieved chunks the response actually drew on, then set
 * used_in_response on that request's rows. Call without awaiting, after the
 * response has been sent to the client.
 *
 * @param {object} p
 * @param {string} p.requestId
 * @param {Array<{id?: string, content?: string, chunk_text?: string}>} p.chunks
 *   Same array (same order) that was passed to logRetrieval.
 * @param {string} p.responseText
 */
function attributeUsage({ requestId, chunks, responseText }) {
  (async () => {
    try {
      const supabase = getSupabase();
      const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
      if (!supabase || !apiKey || !requestId || !responseText) return;
      const withIds = (chunks ?? [])
        .map((c, i) => ({ rank: i + 1, key: c?.id != null ? String(c.id) : '', text: c?.content ?? c?.chunk_text ?? '' }))
        .filter(c => c.key && c.text);
      if (withIds.length === 0) return;

      const passages = withIds
        .map(c => `PASSAGE ${c.rank}:\n${c.text.slice(0, 600)}`)
        .join('\n\n');
      const prompt = `A tutoring agent was given the numbered source passages below and wrote the response that follows. Which passages did the response actually draw on — quoted, paraphrased, or clearly used to shape its content? A passage that merely shares a topic but contributed nothing is NOT used.

${passages}

RESPONSE:
${responseText.slice(0, 6000)}

Reply with ONLY a JSON array of the passage numbers that were used, e.g. [1,3]. If none were used, reply [].`;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!resp.ok) {
        console.warn('[retrieval-log] attribution call failed:', resp.status);
        return;
      }
      const data = await resp.json();
      const text = data.content?.find(b => b.type === 'text')?.text ?? '';
      const match = text.match(/\[[\d,\s]*\]/);
      if (!match) return;
      const usedRanks = new Set(JSON.parse(match[0]).filter(Number.isInteger));

      const usedKeys = withIds.filter(c => usedRanks.has(c.rank)).map(c => c.key);
      const unusedKeys = withIds.filter(c => !usedRanks.has(c.rank)).map(c => c.key);
      if (usedKeys.length > 0) {
        await supabase.from('retrieval_log')
          .update({ used_in_response: true })
          .eq('request_id', requestId)
          .in('chunk_key', usedKeys);
      }
      if (unusedKeys.length > 0) {
        await supabase.from('retrieval_log')
          .update({ used_in_response: false })
          .eq('request_id', requestId)
          .in('chunk_key', unusedKeys);
      }
    } catch (err) {
      console.warn('[retrieval-log] attributeUsage error:', err?.message);
    }
  })();
}

module.exports = { logRetrieval, attributeUsage };
