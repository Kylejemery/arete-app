// Pools retrieval candidates for every eval query from three independent
// retrievers and writes the union to eval.eval_candidates.
//
//   vector:  top 20 from the production path, match_rag_corpus with the same
//            embedding model the app uses (text-embedding-3-small). No new
//            retrieval code, same defaults the app relies on.
//   bm25:    top 20 from Postgres full text search via eval.bm25_search.
//   keyword: top 20 by ILIKE over the two or three most distinctive content
//            words in the query, chosen by corpus document frequency.
//
// Pooling from multiple retrievers keeps the judgment pool from being the
// vector system grading its own homework. If we only pooled vector output,
// every future retrieval change would look worse than it is by construction,
// because its newly found relevant chunks would be unjudged.
//
// Dedup: eval_candidates is unique on (query_id, chunk_id), so a chunk found
// by several retrievers keeps one row. Priority is vector, then bm25, then
// keyword, because scoring only consumes vector ranks: every chunk the vector
// retriever returned must keep its vector rank, or recall against the pool
// would be computed from a corrupted ranking.
//
// Usage:
//   node scripts/eval/pool-candidates.js            (all queries)
//   node scripts/eval/pool-candidates.js --limit 5  (first N, for smoke tests)

const { supabaseClient, embedQuery } = require('./lib');

const TOP_K = 20;
const KEYWORD_WORD_COUNT = 3;

// Common words that should never count as distinctive query content.
const STOPWORDS = new Set([
  'a', 'about', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'anyway', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'come', 'could', 'day',
  'days', 'did', 'do', 'does', 'doing', 'done', 'down', 'during', 'each',
  'even', 'ever', 'every', 'exact', 'exactly', 'feel', 'feeling', 'few',
  'for', 'from', 'get', 'give', 'go', 'goes', 'going', 'gone', 'got', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'him', 'his', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'just', 'keep', 'keeps', 'kept',
  'know', 'knows', 'last', 'like', 'little', 'lot', 'made', 'make', 'man',
  'me', 'men', 'more', 'morning', 'most', 'much', 'my', 'myself', 'need',
  'never', 'next', 'night', 'no', 'nobody', 'none', 'not', 'nothing', 'now',
  'of', 'off', 'on', 'one', 'only', 'or', 'other', 'our', 'out', 'over',
  'own', 'people', 'person', 'probably', 'put', 'really', 'same', 'say',
  'saying', 'says', 'see', 'seem', 'seems', 'she', 'should', 'since', 'so',
  'some', 'someone', 'something', 'still', 'stop', 'such', 'take', 'than',
  'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'thing',
  'things', 'think', 'thinking', 'this', 'those', 'though', 'three', 'time',
  'to', 'told', 'too', 'turn', 'two', 'up', 'us', 'used', 'very', 'want',
  'was', 'way', 'we', 'week', 'weeks', 'well', 'went', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whole', 'why', 'will', 'with', 'without',
  'would', 'year', 'years', 'you', 'your',
]);

function contentWords(queryText) {
  const words = queryText
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

// Picks the most distinctive words: lowest corpus document frequency that is
// still above zero, so the words are rare but actually retrievable.
async function pickDistinctiveWords(evalDb, queryText) {
  const candidates = contentWords(queryText);
  if (!candidates.length) return [];
  const { data, error } = await evalDb.rpc('word_doc_counts', { words: candidates });
  if (error) throw new Error('word_doc_counts failed: ' + error.message);
  return (data || [])
    .filter((r) => Number(r.doc_count) > 0)
    .sort((a, b) => Number(a.doc_count) - Number(b.doc_count))
    .slice(0, KEYWORD_WORD_COUNT)
    .map((r) => r.word);
}

async function poolForQuery(supabase, evalDb, query) {
  // Vector: the exact production path.
  const embedding = await embedQuery(query.query_text);
  const { data: vectorRows, error: vectorError } = await supabase.rpc('match_rag_corpus', {
    query_embedding: embedding,
    match_count: TOP_K,
  });
  if (vectorError) throw new Error('match_rag_corpus failed: ' + vectorError.message);

  // bm25: Postgres full text search.
  const { data: bm25Rows, error: bm25Error } = await evalDb.rpc('bm25_search', {
    query_text: query.query_text,
    match_count: TOP_K,
  });
  if (bm25Error) throw new Error('bm25_search failed: ' + bm25Error.message);

  // keyword: ILIKE over distinctive content words.
  const words = await pickDistinctiveWords(evalDb, query.query_text);
  let keywordRows = [];
  if (words.length) {
    const { data, error } = await evalDb.rpc('keyword_search', {
      words,
      match_count: TOP_K,
    });
    if (error) throw new Error('keyword_search failed: ' + error.message);
    keywordRows = data || [];
  }

  // Merge with vector > bm25 > keyword priority (see header comment).
  const merged = new Map();
  const addAll = (rows, retriever, idOf, scoreOf) => {
    (rows || []).forEach((row, i) => {
      const chunkId = idOf(row);
      if (!merged.has(chunkId)) {
        merged.set(chunkId, {
          query_id: query.id,
          chunk_id: chunkId,
          retriever,
          rank: i + 1,
          score: scoreOf(row),
        });
      }
    });
  };
  addAll(vectorRows, 'vector', (r) => r.id, (r) => r.similarity);
  addAll(bm25Rows, 'bm25', (r) => r.chunk_id, (r) => r.score);
  addAll(keywordRows, 'keyword', (r) => r.chunk_id, (r) => r.score);

  // Repooling a query replaces its previous pool.
  const { error: deleteError } = await evalDb
    .from('eval_candidates')
    .delete()
    .eq('query_id', query.id);
  if (deleteError) throw new Error('candidate delete failed: ' + deleteError.message);

  const rows = [...merged.values()];
  const { error: insertError } = await evalDb.from('eval_candidates').insert(rows);
  if (insertError) throw new Error('candidate insert failed: ' + insertError.message);

  return {
    total: rows.length,
    vector: (vectorRows || []).length,
    bm25: (bm25Rows || []).length,
    keyword: keywordRows.length,
    words,
  };
}

async function main() {
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : null;

  const supabase = supabaseClient();
  const evalDb = supabase.schema('eval');

  let queryReq = evalDb
    .from('eval_queries')
    .select('id, query_text, register, doctrine')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  const { data: queries, error } = await queryReq;
  if (error) throw new Error('query fetch failed: ' + error.message);
  const targets = limit ? queries.slice(0, limit) : queries;

  console.log('Pooling candidates for ' + targets.length + ' queries.');
  let done = 0;
  for (const query of targets) {
    const stats = await poolForQuery(supabase, evalDb, query);
    done += 1;
    console.log(
      '[' + done + '/' + targets.length + '] ' +
      stats.total + ' pooled (vector ' + stats.vector +
      ', bm25 ' + stats.bm25 + ', keyword ' + stats.keyword +
      (stats.words.length ? ', words: ' + stats.words.join(' ') : ', words: none') +
      ') :: ' + query.query_text.slice(0, 60)
    );
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
