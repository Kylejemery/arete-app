require('dotenv').config();
const { generateEmbedding, getSupabase, formatChunksForPrompt } = require('./retrieval');

// Queries match_rag_corpus, the function every agent retrieves through.
//
//   node test-retrieval.js ["query"] [--author "Musonius Rufus"]

const DEFAULT_QUERY = 'What does Marcus Aurelius say about the present moment?';
const TOP_K = 10;

const args = process.argv.slice(2);
const authorAt = args.indexOf('--author');
const author = authorAt >= 0 ? args[authorAt + 1] : null;
const positional = args.filter((_, i) => authorAt < 0 || (i !== authorAt && i !== authorAt + 1));
const query = positional[0] || DEFAULT_QUERY;

async function main() {
  console.log(`Query: "${query}"${author ? `  (author: ${author})` : ''}\n`);

  const embedding = await generateEmbedding(query);
  const started = Date.now();
  const { data: chunks, error } = await getSupabase().rpc('match_rag_corpus', {
    query_embedding: embedding,
    match_count:     TOP_K,
    filter_author:   author,
  });
  if (error) throw new Error(`match_rag_corpus RPC failed: ${error.message}`);
  console.log(`match_rag_corpus: ${chunks.length} rows in ${Date.now() - started} ms\n`);

  if (chunks.length === 0) {
    console.log('No results found.');
    return;
  }

  console.log(`Top ${Math.min(5, chunks.length)} results:\n`);
  chunks.slice(0, 5).forEach((chunk, i) => {
    console.log(`--- Result ${i + 1} (similarity: ${chunk.similarity.toFixed(4)}) ---`);
    console.log(`Author:  ${chunk.author}`);
    console.log(`Work:    ${chunk.work} — ${chunk.section_label}`);
    console.log(`Layer:   ${chunk.text_type}`);
    console.log(`Text:    ${chunk.chunk_text.slice(0, 200)}${chunk.chunk_text.length > 200 ? '...' : ''}`);
    console.log();
  });

  console.log('--- Formatted for prompt injection ---\n');
  console.log(formatChunksForPrompt(chunks.slice(0, 3)));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
