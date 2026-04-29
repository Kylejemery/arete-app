require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const { chunkRaw }     = require('./chunker');
const { embedChunks, estimateCost } = require('./embedder');
const { uploadChunks } = require('./uploader');

const TEXTS_DIR = path.join(__dirname, 'texts');

// Fix common Windows-1252/Latin-1 mojibake that appears in Gutenberg UTF-8 files
function fixEncoding(text) {
  return text
    .replace(/â€™/g, "'")   // right single quote / apostrophe
    .replace(/â€œ/g, '"')   // left double quote
    .replace(/â€\x9d/g, '"') // right double quote
    .replace(/â€"/g, '—')   // em dash
    .replace(/â€"/g, '–')   // en dash
    .replace(/â€¦/g, '…')   // ellipsis
    .replace(/Ã©/g, 'é')
    .replace(/Ã /g, 'à')
    .replace(/Ã¨/g, 'è');
}

const MANIFEST = [
  { slug: 'marcus-aurelius', strategy: 'meditations',  file: 'marcus-meditations.txt' },
  { slug: 'epictetus',       strategy: 'discourses',   files: ['epictetus-discourses.txt', 'epictetus-enchiridion.txt'] },
  { slug: 'seneca',          strategy: 'letters',      files: ['seneca-letters.txt', 'seneca-shortness.txt'] },
];

function sourceTitle(filename) {
  return path.basename(filename, '.txt');
}

async function ingestOne(entry) {
  // Normalize to always work with an array of files
  const files = entry.files || [entry.file];

  // 1. Chunk all files, combining results with a global chunk_index
  let allRawChunks = [];
  let globalIndex = 0;

  for (const file of files) {
    const filepath = path.join(TEXTS_DIR, file);
    if (!fs.existsSync(filepath)) {
      console.warn(`  Skipping file not found: ${filepath}`);
      continue;
    }
    const raw = fixEncoding(fs.readFileSync(filepath, 'utf8'));
    const title = sourceTitle(file);
    const fileChunks = chunkRaw(raw, entry.strategy, { author: entry.slug, work: title });
    // Re-index so chunk_index is globally unique across all files for this counselor
    const reindexed = fileChunks.map(c => ({ ...c, chunk_index: globalIndex++, source_title: title }));
    console.log(`  Chunked "${title}" into ${fileChunks.length} chunks`);
    allRawChunks = allRawChunks.concat(reindexed);
  }

  if (allRawChunks.length === 0) {
    console.warn(`  No chunks produced for ${entry.slug} — all files missing?`);
    return null;
  }

  // 2. Shape chunks for embedder: add counselor_slug, strategy, map chunk_text -> text
  const shaped = allRawChunks.map(c => ({
    counselor_slug: entry.slug,
    source_title:   c.source_title,
    chunk_index:    c.chunk_index,
    strategy:       entry.strategy,
    text:           c.chunk_text,
    section_label:  c.section_label,
    word_count:     c.word_count,
  }));

  // 3. Cost estimate before touching the API
  const { estimatedTokens, estimatedCost } = estimateCost(shaped);
  console.log(`  Estimated tokens: ${estimatedTokens.toLocaleString()} (~$${estimatedCost.toFixed(4)})`);

  // 4. Embed
  const embedded = await embedChunks(shaped);
  console.log(`  Embedded ${embedded.length} chunks`);

  // 5. Upload
  const { uploaded, skipped, errors } = await uploadChunks(embedded);
  console.log(`  Done. ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);

  return { slug: entry.slug, total: allRawChunks.length, uploaded, errors };
}

async function main() {
  const targetSlug = process.argv[2] || null;
  const queue = targetSlug
    ? MANIFEST.filter(e => e.slug === targetSlug)
    : MANIFEST;

  if (queue.length === 0) {
    console.error(`No manifest entry found for slug: "${targetSlug}"`);
    console.error('Available slugs:', MANIFEST.map(e => e.slug).join(', '));
    process.exit(1);
  }

  console.log(`\nArete RAG Ingestion Pipeline`);
  console.log(`Processing ${queue.length} counselor(s)...\n`);

  const summary = [];
  for (const entry of queue) {
    console.log(`--- ${entry.slug} ---`);
    const result = await ingestOne(entry);
    if (result) summary.push(result);
    console.log();
  }

  console.log('=== Summary ===');
  for (const r of summary) {
    const status = r.errors > 0 ? '✗' : '✓';
    console.log(`${status} ${r.slug} — ${r.uploaded}/${r.total} chunks uploaded, ${r.errors} errors`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
