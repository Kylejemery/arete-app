// ---------------------------------------------------------------------------
// RAG retrieval for rag_corpus — used by the Socratic Proctor agent, the
// Courtyard Stoa, and the exam proctor.
// Embedding model: text-embedding-3-small (matches corpus-ingestion/embedder.js)
//
// Runs on match_rag_corpus (match_academy_chunks is deprecated; see the note
// above retrieveCorpusChunks in index.js) with the modern fence: these are
// teaching surfaces, so the contemporary philosophy of mind layer stays off
// them by default while editorial apparatus is allowed
// (server/lib/corpus-fence.js). match_rag_corpus has no threshold parameter,
// so the similarity floor is applied here after over-fetching.
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js');
const { expandCandidates } = require('./lib/graph-boost');
const { modernFenceParams, passesModernFence } = require('./lib/corpus-fence');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MATCH_THRESHOLD = 0.4;

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  const data = await response.json();
  if (!data.data?.[0]?.embedding) {
    throw new Error('Embedding generation failed: ' + JSON.stringify(data.error ?? data));
  }
  return data.data[0].embedding;
}

/**
 * Retrieve the top-k chunks from rag_corpus most relevant to the query.
 *
 * @param {string} query - User message to embed and search against
 * @param {number} k - Max chunks to return (default 5)
 * @param {object} filters - Optional: { text_type, source_author, source_title }
 *   text_type    — 'primary' | 'scholarship' | 'paper_summary' | 'synthesis'
 *   source_author — e.g. 'epictetus', 'marcus-aurelius'
 *   source_title  — e.g. 'epictetus-discourses'
 * @returns {Promise<Array<{content, source_author, source_title, text_type, similarity}>>}
 */
async function getRelevantChunks(query, k = 5, filters = {}) {
  if (!process.env.OPENAI_API_KEY) return [];
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  try {
    const embedding = await generateEmbedding(query);
    const supabase = getSupabase();

    // Over-fetch: the similarity floor and any source_title / text_type
    // filters are applied here, not in the RPC.
    const fetchCount = Math.max(k * 4, 8);

    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: fetchCount,
      filter_author: filters.source_author ?? null,
      filter_language: 'english',
      ...modernFenceParams(),
    });

    if (error) {
      console.error('[retrieval] match_rag_corpus error:', error.message);
      return [];
    }

    let results = (data ?? []).filter(r => (r.similarity ?? 0) > MATCH_THRESHOLD);

    if (filters.source_title) {
      results = results.filter(r => r.work === filters.source_title);
    }
    if (filters.text_type) {
      results = results.filter(r => r.text_type === filters.text_type);
    }

    // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
    results = (await expandCandidates(results, k)).rows.filter(passesModernFence);

    return results.slice(0, k).map(r => ({
      id: r.id,
      content: r.chunk_text,
      source_author: r.author,
      source_title: r.work,
      text_type: r.text_type ?? null,
      similarity: r.similarity,
    }));
  } catch (err) {
    console.error('[retrieval] getRelevantChunks error:', err.message);
    return [];
  }
}

module.exports = { getRelevantChunks };
