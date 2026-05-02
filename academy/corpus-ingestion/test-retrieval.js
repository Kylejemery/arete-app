require('dotenv').config();
const { retrieveAcademyChunks, formatChunksForPrompt } = require('./retrieval');

const TEST_QUERY = 'What does Marcus Aurelius say about the present moment?';

async function main() {
  console.log(`Query: "${TEST_QUERY}"\n`);

  const chunks = await retrieveAcademyChunks({
    query: TEST_QUERY,
    topK: 10,
  });

  if (chunks.length === 0) {
    console.log('No results found.');
    return;
  }

  console.log(`Top ${Math.min(5, chunks.length)} results:\n`);
  chunks.slice(0, 5).forEach((chunk, i) => {
    const sim = chunk.similarity ? chunk.similarity.toFixed(4) : 'keyword';
    console.log(`--- Result ${i + 1} (similarity: ${sim}) ---`);
    console.log(`Author:  ${chunk.author}`);
    console.log(`Work:    ${chunk.work} — ${chunk.section_label}`);
    if (chunk.translator) console.log(`Trans:   ${chunk.translator}`);
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
