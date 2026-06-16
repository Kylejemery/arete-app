// academy/corpus-ingestion/ingest-sources.js
// Usage: node ingest-sources.js
//        node ingest-sources.js --file Epictetus_Enchiridion_English.txt
//        node ingest-sources.js --skip-existing
//        node ingest-sources.js --new-only

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SOURCE_DIR = path.join(__dirname, 'source_texts');
const CHUNK_SIZE = 400;
const OVERLAP = 50;

// Derive metadata from filename convention: Author_Title_Section_Language.txt
function parseFilename(filename) {
  const base = path.basename(filename, '.txt');
  const parts = base.split('_');
  const language = detectLanguage(parts[parts.length - 1]);
  const authorRaw = parts[0];
  const titleRaw = parts[1] || 'Unknown';
  const sectionRaw = parts.slice(2, language ? parts.length - 1 : parts.length).join(' ') || '';

  const authorMap = {
    Epictetus: 'Epictetus',
    Marcus: 'Marcus Aurelius',
    Seneca: 'Seneca',
    Cleanthes: 'Cleanthes',
    Cicero: 'Cicero',
    Diogenes: 'Diogenes Laërtius',
  };

  return {
    author: authorMap[authorRaw] || authorRaw,
    work: titleRaw.replace(/([A-Z])/g, ' $1').trim(),
    section_label: sectionRaw.replace(/([A-Z])/g, ' $1').trim(),
    language: language || 'english',
    program_id: 'stoicism-phd',
    course_relevance: 'PHIL 701',
    difficulty: 'Primary Source',
    text_type: 'primary',
  };
}

function detectLanguage(part) {
  if (!part) return null;
  const p = part.toLowerCase();
  if (p === 'greek' || p === 'ancientgreek') return 'ancient_greek';
  if (p === 'latin') return 'latin';
  if (p === 'english') return 'english';
  return null;
}

function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim().length > 0) chunks.push(chunk);
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

async function embedChunk(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function buildExistingCorpusSet() {
  const { data, error } = await supabase
    .from('rag_corpus')
    .select('author, work');
  if (error) throw new Error(`Failed to query existing corpus: ${error.message}`);
  const set = new Set();
  for (const row of data || []) {
    set.add(`${row.author}||${row.work}`);
  }
  return set;
}

/**
 * Embeds + upserts an array of chunk strings into rag_corpus under `meta`.
 * Shared by the CLI (ingestFile) and the corpus agent (corpus-agent.js) so the
 * chunking/embedding/upload logic lives in exactly one place.
 *
 * meta = { author, work, section_label, language, program_id,
 *          course_relevance, difficulty, text_type, source_url? }
 * Returns { ingested, skipped, errors }.
 */
async function ingestChunks(chunks, meta, { skipExisting = false } = {}) {
  let ingested = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (skipExisting) {
      const { data: existing } = await supabase
        .from('rag_corpus')
        .select('id')
        .eq('author', meta.author)
        .eq('work', meta.work)
        .eq('language', meta.language)
        .eq('chunk_index', i)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }
    }

    const embedding = await embedChunk(chunk);

    const { error } = await supabase.from('rag_corpus').upsert({
      chunk_text: chunk,
      author: meta.author,
      work: meta.work,
      section_label: meta.section_label,
      language: meta.language,
      program_id: meta.program_id,
      course_relevance: meta.course_relevance,
      difficulty: meta.difficulty,
      text_type: meta.text_type,
      source_url: meta.source_url ?? null,
      chunk_index: i,
      embedding,
    }, {
      onConflict: 'author,work,program_id,chunk_index',
    });

    if (error) {
      console.error(`  [${i}] ERROR:`, error.message);
      errors++;
    } else {
      ingested++;
      if (i % 10 === 0) process.stdout.write(`  chunks ingested: ${ingested}\r`);
    }
  }

  return { ingested, skipped, errors };
}

async function ingestFile(filepath, skipExisting) {
  const filename = path.basename(filepath);
  const meta = parseFilename(filename);
  const text = fs.readFileSync(filepath, 'utf8');
  const chunks = chunkText(text);

  console.log(`\n[${filename}] ${chunks.length} chunks — ${meta.author} / ${meta.work} / ${meta.language}`);

  const { ingested, skipped } = await ingestChunks(chunks, meta, { skipExisting });

  console.log(`  done — ${ingested} ingested, ${skipped} skipped`);
  return ingested;
}

async function main() {
  const args = process.argv.slice(2);
  const skipExisting = args.includes('--skip-existing');
  const newOnly = args.includes('--new-only');
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('source_texts/ directory not found');
    process.exit(1);
  }

  const files = fileArg
    ? [path.join(SOURCE_DIR, fileArg)]
    : fs.readdirSync(SOURCE_DIR)
        .filter(f => f.endsWith('.txt'))
        .map(f => path.join(SOURCE_DIR, f));

  if (files.length === 0) {
    console.log('No .txt files found in source_texts/');
    process.exit(0);
  }

  console.log(`Found ${files.length} file(s) to process`);

  let existingCorpus = null;
  if (newOnly) {
    console.log('--new-only: querying existing corpus...');
    existingCorpus = await buildExistingCorpusSet();
    console.log(`  ${existingCorpus.size} (author, work) pair(s) already in corpus`);
  }

  let filesSkipped = 0;
  let filesProcessed = 0;
  let totalChunks = 0;

  for (const filepath of files) {
    const filename = path.basename(filepath);
    if (newOnly) {
      const meta = parseFilename(filename);
      const key = `${meta.author}||${meta.work}`;
      if (existingCorpus.has(key)) {
        console.log(`[SKIP] ${filename} — already in corpus`);
        filesSkipped++;
        continue;
      }
    }
    const chunksUpserted = await ingestFile(filepath, skipExisting);
    filesProcessed++;
    totalChunks += chunksUpserted;
  }

  console.log('\nIngestion complete.');
  console.log(`Skipped:           ${filesSkipped} files (already in corpus)`);
  console.log(`Processed:         ${filesProcessed} files`);
  console.log(`Total chunks upserted: ${totalChunks}`);
}

// Only run the CLI when invoked directly. When required by corpus-agent.js,
// just expose the building blocks — do not execute main().
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { chunkText, embedChunk, ingestChunks, parseFilename };
