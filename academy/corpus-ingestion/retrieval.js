require('dotenv').config();
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MATCH_THRESHOLD = 0.5;
const DEFAULT_TOP_K = 10;
const DEFAULT_PROGRAM = 'stoicism-phd';

const STOP_WORDS = new Set([
  'what', 'does', 'does', 'about', 'that', 'this', 'with', 'from', 'they',
  'have', 'will', 'been', 'were', 'their', 'there', 'when', 'which', 'would',
  'could', 'should', 'says', 'said', 'into', 'more', 'than', 'some', 'also',
  'much', 'most', 'over', 'just', 'like', 'such', 'each', 'very', 'even',
  'only', 'then', 'both', 'after', 'before', 'being', 'make', 'made',
]);

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key);
}

function extractKeyword(query) {
  const words = query.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const candidates = words.filter(w => w.length > 5 && !STOP_WORDS.has(w));
  if (candidates.length === 0) return words.sort((a, b) => b.length - a.length)[0] || '';
  return candidates.sort((a, b) => b.length - a.length)[0];
}

async function generateEmbedding(text) {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

async function retrieveAcademyChunks({ query, author = null, topK = DEFAULT_TOP_K, programId = DEFAULT_PROGRAM } = {}) {
  const supabase = getSupabase();

  const embedding = await generateEmbedding(query);

  const { data: semanticResults, error } = await supabase.rpc('match_academy_chunks', {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: topK,
    filter_author: author,
    filter_program: programId,
  });

  if (error) throw new Error(`match_academy_chunks RPC failed: ${error.message}`);

  let results = semanticResults || [];

  if (results.length < 3) {
    const keyword = extractKeyword(query);
    if (keyword) {
      const { data: keywordResults, error: kwError } = await supabase
        .from('rag_corpus')
        .select('id, author, work, section_label, chunk_text, translator')
        .ilike('chunk_text', `%${keyword}%`)
        .eq('program_id', programId)
        .limit(5);

      if (!kwError && keywordResults) {
        const fallback = keywordResults.map(r => ({ ...r, similarity: 0 }));
        results = [...results, ...fallback];
      }
    }
  }

  const seen = new Set();
  const deduped = results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return deduped.map(({ author, work, section_label, chunk_text, translator, similarity }) => ({
    author,
    work,
    section_label,
    chunk_text,
    translator,
    similarity,
  }));
}

function formatChunksForPrompt(chunks) {
  return chunks.map(({ author, work, section_label, chunk_text, translator }) => {
    const transNote = translator ? `, trans. ${translator}` : '';
    return `[${author}, ${work} ${section_label}${transNote}]\n"${chunk_text}"`;
  }).join('\n\n');
}

module.exports = { retrieveAcademyChunks, formatChunksForPrompt };
