const OpenAI = require('openai');

const BATCH_SIZE = 100;
const MODEL = 'text-embedding-3-small';

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Embeds an array of chunk objects.
 * Each chunk must have a `text` field.
 * Returns the same array with an `embedding` field (number[1536]) added to each.
 */
async function embedChunks(chunks) {
  const client = getClient();
  const results = [...chunks];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = chunks.slice(i, i + BATCH_SIZE);

    console.log(`  Embedding batch ${batchNum} of ${totalBatches}...`);

    const response = await client.embeddings.create({
      model: MODEL,
      input: batch.map(c => c.text),
    });

    response.data.forEach((item, j) => {
      results[i + j] = { ...results[i + j], embedding: item.embedding };
    });
  }

  return results;
}

/**
 * Rough token count estimate for cost logging.
 * text-embedding-3-small: ~$0.00002 per 1K tokens
 */
function estimateCost(chunks) {
  const totalChars = chunks.reduce((sum, c) => sum + (c.text || '').length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);
  const estimatedCost = (estimatedTokens / 1000) * 0.00002;
  return { estimatedTokens, estimatedCost };
}

module.exports = { embedChunks, estimateCost };
