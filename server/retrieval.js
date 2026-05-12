// ---------------------------------------------------------------------------
// RAG retrieval for rag_corpus — used by the Socratic Proctor agent
// Embedding model: text-embedding-3-small (matches corpus-ingestion/embedder.js)
// ---------------------------------------------------------------------------
const { createClient } = require('@supabase/supabase-js');

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
 *   text_type    — 'primary' | 'secondary'
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

    // Over-fetch to allow post-filtering by source_title / text_type
    const fetchCount = filters.source_title || filters.text_type ? k * 4 : k;

    const { data, error } = await supabase.rpc('match_academy_chunks', {
      query_embedding: embedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: fetchCount,
      filter_author: filters.source_author ?? null,
      filter_program: 'stoicism-phd',
    });

    if (error) {
      console.error('[retrieval] match_academy_chunks error:', error.message);
      return [];
    }

    let results = data ?? [];

    if (filters.source_title) {
      results = results.filter(r => r.work === filters.source_title);
    }
    if (filters.text_type) {
      results = results.filter(r => r.text_type === filters.text_type);
    }

    return results.slice(0, k).map(r => ({
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
