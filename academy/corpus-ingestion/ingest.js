require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const { chunkRaw }     = require('./chunker');
const { embedChunks, estimateCost } = require('./embedder');
const { uploadChunks } = require('./uploader');

const TEXTS_DIR = path.join(__dirname, 'texts');

const MANIFEST = [
  { slug: 'marcus-aurelius',    strategy: 'meditations', file: 'marcus-aurelius.txt',    work: 'Meditations' },
  { slug: 'epictetus',          strategy: 'discourses',  file: 'epictetus.txt',           work: 'Discourses' },
  { slug: 'seneca',             strategy: 'letters',     file: 'seneca.txt',              work: 'Letters to Lucilius' },
  { slug: 'theodore-roosevelt', strategy: 'paragraphs',  file: 'theodore-roosevelt.txt',  work: 'Selected Writings' },
  { slug: 'viktor-frankl',      strategy: 'paragraphs',  file: 'viktor-frankl.txt',       work: "Man's Search for Meaning" },
  { slug: 'david-goggins',      strategy: 'paragraphs',  file: 'david-goggins.txt',       work: "Can't Hurt Me" },
];

async function ingestOne(entry) {
  const filepath = path.join(TEXTS_DIR, entry.file);

  if (!fs.existsSync(filepath)) {
    console.warn(`  Skipping ${entry.slug} — file not found: ${filepath}`);
    return null;
  }

  // 1. Chunk
  const raw = fs.readFileSync(filepath, 'utf8');
  const rawChunks = chunkRaw(raw, entry.strategy, { author: entry.slug, work: entry.work });
  console.log(`  Chunked "${entry.work}" into ${rawChunks.length} chunks`);

  // 2. Shape chunks for embedder: add counselor_slug, strategy, map chunk_text -> text
  const shaped = rawChunks.map(c => ({
    counselor_slug: entry.slug,
    source_title:   entry.work,
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

  return { slug: entry.slug, total: rawChunks.length, uploaded, errors };
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
