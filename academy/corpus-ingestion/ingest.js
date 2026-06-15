require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const { chunkRaw, chunkSummaryDocx } = require('./chunker');
const { embedChunks, estimateCost }  = require('./embedder');
const { uploadChunks }               = require('./uploader');

const TEXTS_DIR = path.join(__dirname, 'texts');

// Fix common Windows-1252/Latin-1 mojibake that appears in Gutenberg UTF-8 files
function fixEncoding(text) {
  return text
    .replace(/â€™/g, "'")    // right single quote / apostrophe
    .replace(/â€œ/g, '"')    // left double quote
    .replace(/â€\x9d/g, '"') // right double quote
    .replace(/â€"/g, '—')    // em dash
    .replace(/â€"/g, '–')    // en dash
    .replace(/â€¦/g, '…')    // ellipsis
    .replace(/Ã©/g, 'é')
    .replace(/Ã /g, 'à')
    .replace(/Ã¨/g, 'è');
}

const MANIFEST = [
  { slug: 'marcus-aurelius', strategy: 'meditations', file: 'marcus-meditations.txt' },
  { slug: 'epictetus',       strategy: 'discourses',  files: ['epictetus-discourses.txt', 'epictetus-enchiridion.txt'] },
  { slug: 'seneca',          strategy: 'letters',     files: ['seneca-letters.txt', 'seneca-shortness.txt'] },
];

// ── Summary metadata ──────────────────────────────────────────────────────────
//
// Keys are "AuthorLastName_ShortTitle" prefixes matching the docx filename
// convention: AuthorLastName_ShortTitle_ChN_summary.docx
//
// Add an entry here for each new text before ingesting its summary docx.
// Fields map directly to rag_corpus columns.
// ─────────────────────────────────────────────────────────────────────────────
const SUMMARY_METADATA_OVERRIDES = {
  'Sellars_Stoicism': {
    author:           'John Sellars',
    work:             'Stoicism',
    translator:       '',
    program_id:       'stoicism-phd',
    course_relevance: 'PHIL 701',
    difficulty:       'Introductory',
  },
};

/**
 * Resolve rag_corpus metadata for a summary docx.
 *
 * Priority:
 *  1. SUMMARY_METADATA_OVERRIDES entry matching "Author_Title" prefix
 *  2. Values derived from filename convention (Author_Title_ChN_summary.docx)
 *
 * Returns a metadata object suitable for passing to uploadChunks().
 */
function getSummaryMetadata(filename) {
  // Try each registered override key as a filename prefix
  for (const [key, meta] of Object.entries(SUMMARY_METADATA_OVERRIDES)) {
    if (filename.startsWith(key)) {
      return { ...meta };
    }
  }

  // Fallback: derive from filename
  const nameMatch = filename.match(/^([^_]+)_([^_]+)_Ch(\d+)_summary\.docx$/i);
  if (nameMatch) {
    const [, authorSlug, titleSlug] = nameMatch;
    return {
      author:           authorSlug,
      work:             titleSlug.replace(/([A-Z])/g, ' $1').trim(),
      translator:       '',
      program_id:       'stoicism-phd',
      course_relevance: null,
      difficulty:       null,
    };
  }

  // Last-resort fallback
  return {
    author:           'Unknown',
    work:             filename,
    translator:       '',
    program_id:       'stoicism-phd',
    course_relevance: null,
    difficulty:       null,
  };
}

function sourceTitle(filename) {
  return path.basename(filename, '.txt');
}

// ── Primary text ingestion ────────────────────────────────────────────────────

async function ingestOne(entry) {
  const files = entry.files || [entry.file];

  let allRawChunks = [];
  let globalIndex  = 0;

  for (const file of files) {
    const filepath = path.join(TEXTS_DIR, file);
    if (!fs.existsSync(filepath)) {
      console.warn(`  Skipping file not found: ${filepath}`);
      continue;
    }
    const raw   = fixEncoding(fs.readFileSync(filepath, 'utf8'));
    const title = sourceTitle(file);
    const fileChunks = chunkRaw(raw, entry.strategy, { author: entry.slug, work: title });
    const reindexed  = fileChunks.map(c => ({ ...c, chunk_index: globalIndex++, source_title: title }));
    console.log(`  Chunked "${title}" into ${fileChunks.length} chunks`);
    allRawChunks = allRawChunks.concat(reindexed);
  }

  if (allRawChunks.length === 0) {
    console.warn(`  No chunks produced for ${entry.slug} — all files missing?`);
    return null;
  }

  // Shape: map chunk_text → text for the embedder; keep section_label and chunk_index
  const shaped = allRawChunks.map(c => ({
    text:          c.chunk_text,
    chunk_index:   c.chunk_index,
    section_label: c.section_label,
    word_count:    c.word_count,
    // Per-chunk author/work/translator come from TEXT_METADATA via chunker baseMeta
    author:        c.author,
    work:          c.work,
    translator:    c.translator || '',
    text_type:     c.text_type  || 'primary',
    source_title:  c.source_title,
  }));

  const { estimatedTokens, estimatedCost } = estimateCost(shaped);
  console.log(`  Estimated tokens: ${estimatedTokens.toLocaleString()} (~$${estimatedCost.toFixed(4)})`);

  const embedded = await embedChunks(shaped);
  console.log(`  Embedded ${embedded.length} chunks`);

  const { uploaded, skipped, errors } = await uploadChunks(embedded, {
    program_id: 'stoicism-phd',
  });
  console.log(`  Done. ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);

  return { slug: entry.slug, total: allRawChunks.length, uploaded, errors };
}

// ── Summary docx ingestion ────────────────────────────────────────────────────

async function ingestSummaries() {
  const summariesDir = path.join(__dirname, 'summaries');

  if (!fs.existsSync(summariesDir)) {
    console.log('No summaries/ folder found — skipping.');
    return;
  }

  const files = fs.readdirSync(summariesDir).filter(f => f.endsWith('_summary.docx'));

  if (files.length === 0) {
    console.log('No summary .docx files found in summaries/.');
    return;
  }

  for (const file of files) {
    console.log(`\nIngesting summary: ${file}`);
    try {
      const filepath = path.join(summariesDir, file);
      const metadata = getSummaryMetadata(file);

      console.log(`  Metadata: author="${metadata.author}", work="${metadata.work}", ` +
                  `course="${metadata.course_relevance || 'none'}", ` +
                  `difficulty="${metadata.difficulty   || 'none'}"`);

      const chunks = await chunkSummaryDocx(filepath);
      console.log(`  Chunks produced: ${chunks.length}`);

      // Shape: map chunk_text → text for embedder; carry section_label and chunk_index
      const shaped = chunks.map(c => ({
        text:          c.chunk_text,
        chunk_index:   c.chunk_index,
        section_label: c.section_label,
        word_count:    c.word_count,
        text_type:     'secondary',
      }));

      const { estimatedTokens, estimatedCost } = estimateCost(shaped);
      console.log(`  Estimated tokens: ${estimatedTokens.toLocaleString()} (~$${estimatedCost.toFixed(4)})`);

      const embedded = await embedChunks(shaped);
      const { uploaded, skipped, errors } = await uploadChunks(embedded, metadata);
      console.log(`  ✓ ${file} — ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }
}

// ── CLI entry point ───────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2] || null;

  if (command === 'summaries') {
    console.log('\nArete RAG Ingestion — Summaries\n');
    await ingestSummaries();
    return;
  }

  const targetSlug = command;
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
