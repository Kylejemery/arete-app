// academy/corpus-ingestion/reingest-meditations.js
//
// Re-ingest the Meditations (George Long, Gutenberg #2680) one numbered
// entry per row, so a passage is citable as Meditations 4.3 and the Reading
// Room can open a book at the exact entry.
//
//   node reingest-meditations.js --dry-run            chunk, validate, print; touch nothing
//   node reingest-meditations.js --dry-run --source ./source_texts/marcus-meditations.txt
//   node reingest-meditations.js                      full run (asks before writing)
//   node reingest-meditations.js --yes                full run, no prompt
//
// Env (from .env in this directory): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// OPENAI_API_KEY. The dry run needs none of them.
//
// What it does, in order:
//   1. Load the text: --source path, else source_texts/marcus-meditations.txt
//      if present, else download from Gutenberg and save it there.
//   2. Chunk with the chunker's "meditations" strategy: one row per entry,
//      section_label and locator both "4.3".
//   3. Validate: twelve books, per-book entry counts against Long's edition,
//      unique ascending locators, no empty entries. A dry run stops here.
//   4. Embed every entry (text-embedding-3-small, same as every other row).
//      Nothing is written until every embedding is in hand.
//   5. Mark the current live rows deprecated. They are not moved or edited
//      otherwise: deprecate, never delete (CLAUDE.md, ACQUISITION_PLAN Part 5).
//   6. Upsert the new rows at chunk_index 1000 + n. The old rows keep their
//      indices under the table's unique key (author, work, program_id,
//      chunk_index), so the new generation takes the next free block of a
//      thousand. Ordering is all the reader needs from chunk_index; the
//      locator is the citable identity.
//   7. Verify from the database and print the numbers.
//
// Re-runnable: a second run finds the new rows already live and the old rows
// already deprecated, and only upserts what is missing. To reverse: set
// deprecated = true on chunk_index >= 1000 and false on the old rows.
//
// Retrieval note: entries are shorter than the 400-word chunks Marcus was
// retrieved from before, so the counselor path sees smaller, more precise
// passages for him. That is the intended trade (Part 1, hygiene problem two).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chunkRaw } = require('./chunker');
const { embedChunk } = require('./ingest-sources');

const AUTHOR = 'Marcus Aurelius';
const WORK = 'Meditations';
const META = {
  author: AUTHOR,
  work: WORK,
  translator: 'George Long',
  source_url: 'https://www.gutenberg.org/ebooks/2680',
  edition_year: 1862,          // Long's translation, first published 1862
  text_type: 'primary',
  language: 'english',
  program_id: 'stoicism-phd',  // matches the rows being superseded
  course_relevance: 'PHIL 701',
  difficulty: 'Primary Source',
};
const GUTENBERG_TXT = 'https://www.gutenberg.org/cache/epub/2680/pg2680.txt';
const LOCAL_SOURCE = path.join(__dirname, 'source_texts', 'marcus-meditations.txt');
const GENERATION_BLOCK = 1000;
const UPSERT_BATCH = 25;
const EMBED_CONCURRENCY = 4;

// Entries per book in George Long's numbering. Used to validate the chunking,
// not to force it: a mismatch of a few entries is reported, a missing book or
// a large drift aborts the run.
const EXPECTED_ENTRIES = { 1: 17, 2: 17, 3: 16, 4: 51, 5: 37, 6: 59, 7: 75, 8: 61, 9: 42, 10: 38, 11: 39, 12: 36 };

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DRY_RUN = flag('--dry-run');
const YES = flag('--yes');

function log(msg = '') { console.log(msg); }
function fail(msg) { console.error(`\n✖ ${msg}`); process.exit(1); }

// --- 1. text --------------------------------------------------------------

async function loadText() {
  const explicit = opt('--source');
  if (explicit) {
    log(`Source: ${explicit}`);
    return fs.readFileSync(explicit, 'utf8');
  }
  if (fs.existsSync(LOCAL_SOURCE)) {
    log(`Source: ${path.relative(process.cwd(), LOCAL_SOURCE)} (local copy)`);
    return fs.readFileSync(LOCAL_SOURCE, 'utf8');
  }
  log(`Source: ${GUTENBERG_TXT} (downloading)`);
  const res = await fetch(GUTENBERG_TXT, { headers: { 'User-Agent': 'arete-corpus-ingestion (pursuearete.com)' } });
  if (!res.ok) throw new Error(`Gutenberg returned ${res.status}`);
  const text = await res.text();
  if (!/\*\*\* START OF/i.test(text)) throw new Error('Downloaded text has no Gutenberg start marker; refusing to guess at its shape.');
  fs.mkdirSync(path.dirname(LOCAL_SOURCE), { recursive: true });
  fs.writeFileSync(LOCAL_SOURCE, text);
  log(`  saved to ${path.relative(process.cwd(), LOCAL_SOURCE)} for reproducibility`);
  return text;
}

// --- 2 + 3. chunk and validate -------------------------------------------

function chunkAndValidate(text) {
  const chunks = chunkRaw(text, 'meditations', META);
  if (chunks.length === 0) fail('The meditations strategy produced no entries. Is this the George Long Gutenberg text?');

  const perBook = {};
  const seen = new Set();
  const problems = [];
  let prev = null;
  for (const c of chunks) {
    if (!/^\d+\.\d+$/.test(c.locator || '')) problems.push(`entry ${c.chunk_index} has locator "${c.locator}"`);
    if (c.section_label !== c.locator) problems.push(`entry ${c.locator} label "${c.section_label}" differs from its locator`);
    if (seen.has(c.locator)) problems.push(`duplicate locator ${c.locator}`);
    seen.add(c.locator);
    const [book, entry] = c.locator.split('.').map(Number);
    perBook[book] = (perBook[book] || 0) + 1;
    if (prev && (book < prev.book || (book === prev.book && entry <= prev.entry))) {
      problems.push(`locator ${c.locator} is out of order after ${prev.book}.${prev.entry}`);
    }
    prev = { book, entry };
    if (!c.chunk_text || c.chunk_text.length < 20) problems.push(`entry ${c.locator} is empty or tiny: "${c.chunk_text}"`);
    if (/\(\d+\/\d+\)$/.test(c.section_label)) problems.push(`entry ${c.locator} was split by the oversize guard; the reader cannot treat it as one entry`);
  }

  log(`\nEntries: ${chunks.length}`);
  log('Per book (found / expected in Long):');
  let drift = 0;
  for (let b = 1; b <= 12; b++) {
    const found = perBook[b] || 0;
    const expected = EXPECTED_ENTRIES[b];
    const mark = found === expected ? '' : found === 0 ? '   ← MISSING' : `   ← differs by ${found - expected}`;
    log(`  Book ${String(b).padStart(2)}: ${String(found).padStart(3)} / ${expected}${mark}`);
    if (found === 0) problems.push(`Book ${b} has no entries`);
    drift += Math.abs(found - expected);
  }
  const words = chunks.reduce((n, c) => n + c.word_count, 0);
  const longest = chunks.reduce((m, c) => (c.word_count > m.word_count ? c : m), chunks[0]);
  log(`Words: ${words.toLocaleString()}; longest entry ${longest.locator} at ${longest.word_count} words`);

  if (problems.length) {
    log('\nProblems:');
    problems.slice(0, 20).forEach(p => log(`  - ${p}`));
    if (problems.length > 20) log(`  ... and ${problems.length - 20} more`);
  }
  const totalExpected = Object.values(EXPECTED_ENTRIES).reduce((a, b) => a + b, 0);
  if (problems.some(p => /no entries|duplicate|out of order|oversize/.test(p))) fail('Fix the chunking before ingesting.');
  if (drift > totalExpected * 0.05) fail(`Entry counts drift from Long's edition by ${drift}; check the source text before ingesting.`);
  if (drift > 0) log(`\nNote: ${drift} entries differ from the expected counts. Small differences come from Long's own numbering and are fine; read the list above.`);

  log(`\nFirst: ${chunks[0].locator}  "${chunks[0].chunk_text.slice(0, 90)}..."`);
  log(`Last:  ${chunks[chunks.length - 1].locator}  "${chunks[chunks.length - 1].chunk_text.slice(0, 90)}..."`);
  return chunks;
}

// --- database ---------------------------------------------------------------

let _supabase = null;
function supabase() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    const { createClient } = require('@supabase/supabase-js');
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

async function currentState() {
  const { data, error } = await supabase()
    .from('rag_corpus')
    .select('id, chunk_index, deprecated, locator')
    .eq('author', AUTHOR).eq('work', WORK).eq('program_id', META.program_id);
  if (error) throw error;
  const rows = data || [];
  return {
    rows,
    oldLive: rows.filter(r => !r.deprecated && r.chunk_index < GENERATION_BLOCK),
    oldDeprecated: rows.filter(r => r.deprecated && r.chunk_index < GENERATION_BLOCK),
    newRows: rows.filter(r => r.chunk_index >= GENERATION_BLOCK),
  };
}

async function confirm(question) {
  if (YES) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(res => rl.question(`${question} [y/N] `, res));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

// --- 4. embed ----------------------------------------------------------------

async function embedAll(chunks) {
  const out = new Array(chunks.length);
  let next = 0; let done = 0;
  async function worker() {
    while (next < chunks.length) {
      const i = next++;
      let attempt = 0;
      for (;;) {
        try { out[i] = await embedChunk(chunks[i].chunk_text); break; }
        catch (err) {
          attempt++;
          if (attempt >= 4) throw new Error(`embedding ${chunks[i].locator} failed four times: ${err.message}`);
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
      done++;
      if (done % 25 === 0 || done === chunks.length) process.stdout.write(`  embedded ${done}/${chunks.length}\r`);
    }
  }
  await Promise.all(Array.from({ length: EMBED_CONCURRENCY }, worker));
  process.stdout.write('\n');
  return out;
}

// --- 5 + 6. write --------------------------------------------------------------

async function deprecateOldRows(oldLive) {
  if (oldLive.length === 0) { log('Old rows: already deprecated.'); return; }
  const ids = oldLive.map(r => r.id);
  const { error } = await supabase().from('rag_corpus').update({ deprecated: true }).in('id', ids);
  if (error) throw error;
  log(`Old rows: ${ids.length} marked deprecated (kept in place).`);
}

async function upsertNewRows(chunks, embeddings) {
  let written = 0;
  for (let i = 0; i < chunks.length; i += UPSERT_BATCH) {
    const batch = chunks.slice(i, i + UPSERT_BATCH).map((c, j) => ({
      author: AUTHOR,
      work: WORK,
      program_id: META.program_id,
      chunk_index: GENERATION_BLOCK + c.chunk_index,
      source_chunk_index: GENERATION_BLOCK + c.chunk_index,
      section_label: c.section_label,
      locator: c.locator,
      chunk_text: c.chunk_text,
      word_count: c.word_count,
      translator: META.translator,
      source_url: META.source_url,
      edition_year: META.edition_year,
      text_type: META.text_type,
      language: META.language,
      course_relevance: META.course_relevance,
      difficulty: META.difficulty,
      deprecated: false,
      embedding: embeddings[i + j],
    }));
    const { error } = await supabase().from('rag_corpus').upsert(batch, { onConflict: 'author,work,program_id,chunk_index' });
    if (error) throw new Error(`upsert of entries ${batch[0].locator}..${batch[batch.length - 1].locator} failed: ${error.message}`);
    written += batch.length;
    process.stdout.write(`  written ${written}/${chunks.length}\r`);
  }
  process.stdout.write('\n');
}

// --- 7. verify ----------------------------------------------------------------

async function verify(chunks) {
  const state = await currentState();
  const live = state.rows.filter(r => !r.deprecated);
  const liveNew = live.filter(r => r.chunk_index >= GENERATION_BLOCK);
  const liveOld = live.filter(r => r.chunk_index < GENERATION_BLOCK);
  const missingLocator = liveNew.filter(r => !r.locator).length;
  const { data: shelf } = await supabase().rpc('library_shelf');
  const shelfRow = (shelf || []).find(r => r.author === AUTHOR && r.work === WORK);

  log('\nVerification');
  log(`  live rows in the new block:   ${liveNew.length} (expected ${chunks.length})`);
  log(`  live rows in the old block:   ${liveOld.length} (expected 0)`);
  log(`  deprecated rows:              ${state.rows.filter(r => r.deprecated).length}`);
  log(`  live rows without a locator:  ${missingLocator} (expected 0)`);
  log(`  library_shelf() count:        ${shelfRow ? shelfRow.chunk_count : 'not on the shelf'} (expected ${chunks.length})`);
  const ok = liveNew.length === chunks.length && liveOld.length === 0 && missingLocator === 0 && shelfRow && Number(shelfRow.chunk_count) === chunks.length;
  log(ok ? '\n✓ The Meditations is live one entry per row.' : '\n✖ Something is off; read the numbers above before doing anything else.');
  return ok;
}

// --- main --------------------------------------------------------------------

(async () => {
  log(`Re-ingest: ${AUTHOR}, ${WORK} (${META.translator}, ${META.edition_year})${DRY_RUN ? '  [dry run]' : ''}`);
  const text = await loadText();
  const chunks = chunkAndValidate(text);
  if (DRY_RUN) { log('\nDry run: nothing written.'); return; }

  if (!process.env.OPENAI_API_KEY) fail('OPENAI_API_KEY must be set.');
  const before = await currentState();
  log(`\nDatabase now: ${before.oldLive.length} live rows, ${before.oldDeprecated.length} deprecated, ${before.newRows.length} already in the new block.`);
  if (before.newRows.length && before.newRows.length !== chunks.length) {
    log(`  The new block holds ${before.newRows.length} rows but the text chunks to ${chunks.length}; the upsert will overwrite by index and leave any extras. Check afterwards.`);
  }
  const go = await confirm(`Embed ${chunks.length} entries, deprecate ${before.oldLive.length} live rows, and write the new generation?`);
  if (!go) { log('Stopped. Nothing written.'); return; }

  log('\nEmbedding');
  const embeddings = await embedAll(chunks);

  log('\nWriting');
  await deprecateOldRows(before.oldLive);
  await upsertNewRows(chunks, embeddings);

  const ok = await verify(chunks);
  process.exit(ok ? 0 : 2);
})().catch(err => fail(err.message || String(err)));
