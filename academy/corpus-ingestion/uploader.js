const { createClient } = require('@supabase/supabase-js');

const BATCH_SIZE = 50;
const TABLE = 'source_text_chunks';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  }
  return createClient(url, key);
}

/**
 * Upserts an array of embedded chunk objects to Supabase.
 *
 * Each chunk must have:
 *   counselor_slug, source_title, chunk_index, strategy, text, embedding
 *
 * Returns { uploaded, skipped, errors }
 */
async function uploadChunks(chunks) {
  const supabase = getClient();
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = chunks.slice(i, i + BATCH_SIZE);

    console.log(`  Uploading batch ${batchNum} of ${totalBatches}... (${uploaded} uploaded so far)`);

    const rows = batch.map(c => ({
      counselor_slug: c.counselor_slug,
      source_title:   c.source_title,
      chunk_index:    c.chunk_index,
      strategy:       c.strategy,
      content:        c.text,
      embedding:      c.embedding,
    }));

    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'counselor_slug,chunk_index,strategy' });

    if (error) {
      console.error(`  Batch ${batchNum} error:`, error.message);
      errors += batch.length;
    } else {
      uploaded += batch.length;
    }
  }

  return { uploaded, skipped: 0, errors };
}

module.exports = { uploadChunks };
