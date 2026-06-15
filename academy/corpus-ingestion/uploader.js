const { createClient } = require('@supabase/supabase-js');

const BATCH_SIZE = 50;
const TABLE = 'rag_corpus';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  }
  return createClient(url, key);
}

/**
 * Upserts an array of embedded chunk objects into rag_corpus.
 *
 * Each chunk must have:
 *   text           — the passage text (maps to chunk_text)
 *   chunk_index    — position within the source document (maps to source_chunk_index)
 *   section_label  — human-readable section name
 *   embedding      — number[1536] from text-embedding-3-small
 *
 * Chunks may also carry author, work, translator, text_type directly
 * (set by chunker.js for primary texts).  The metadata argument overrides
 * or supplements those per-chunk fields.
 *
 * metadata = {
 *   author, work, translator, text_type,
 *   program_id, course_relevance, difficulty
 * }
 *
 * Upsert conflict key: (author, work, program_id, source_chunk_index)
 * — requires the unique index created in migration 20260526000003.
 *
 * Returns { uploaded, skipped, errors }
 */
async function uploadChunks(chunks, metadata = {}) {
  const supabase = getClient();
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
  let uploaded = 0;
  let errors   = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch    = chunks.slice(i, i + BATCH_SIZE);

    console.log(`  Uploading batch ${batchNum} of ${totalBatches}... (${uploaded} uploaded so far)`);

    const rows = batch.map(c => ({
      author:             metadata.author            || c.author            || 'Unknown',
      work:               metadata.work              || c.work              || c.source_title || 'Unknown',
      section_label:      c.section_label            || null,
      chunk_text:         c.text,
      translator:         metadata.translator        != null ? metadata.translator : (c.translator  ?? ''),
      text_type:          metadata.text_type         || c.text_type         || 'secondary',
      embedding:          c.embedding,
      program_id:         metadata.program_id        || 'stoicism-phd',
      course_relevance:   metadata.course_relevance  ?? null,
      difficulty:         metadata.difficulty        ?? null,
      source_chunk_index: c.chunk_index              != null ? c.chunk_index : i,
    }));

    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'author,work,program_id,source_chunk_index' });

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
