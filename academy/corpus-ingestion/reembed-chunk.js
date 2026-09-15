// academy/corpus-ingestion/reembed-chunk.js
//
// Recompute the embedding of existing rag_corpus rows from their current
// chunk_text. For a row whose text was corrected in place (a boilerplate
// prefix trimmed, a footnote run removed) and whose stored vector still
// describes the old text.
//
//   node reembed-chunk.js --id <uuid> [--id <uuid> ...]
//   node reembed-chunk.js --author Seneca --work Letters --chunk-index 0
//   add --dry-run to print the rows without writing
//
// Needs OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the .env here).
// Same model as every other ingest (text-embedding-3-small via embedder.js).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { embedChunks } = require('./embedder');

function parseArgs(argv) {
  const args = { ids: [], author: null, work: null, chunkIndex: null, programId: 'stoicism-phd', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--id') args.ids.push(argv[++i]);
    else if (a === '--author') args.author = argv[++i];
    else if (a === '--work') args.work = argv[++i];
    else if (a === '--chunk-index') args.chunkIndex = Number(argv[++i]);
    else if (a === '--program') args.programId = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else throw new Error(`unknown option ${a}`);
  }
  const byKey = args.author && args.work && Number.isInteger(args.chunkIndex);
  if (args.ids.length === 0 && !byKey) {
    throw new Error('give --id <uuid> (repeatable) or --author, --work and --chunk-index');
  }
  return args;
}

function wordCount(t) { return String(t).split(/\s+/).filter(Boolean).length; }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']) {
    if (!process.env[k]) throw new Error(`${k} must be set`);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let q = supabase.from('rag_corpus').select('id, author, work, chunk_index, section_label, word_count, deprecated, chunk_text');
  q = args.ids.length
    ? q.in('id', args.ids)
    : q.eq('author', args.author).eq('work', args.work).eq('program_id', args.programId).eq('chunk_index', args.chunkIndex);
  const { data: rows, error } = await q;
  if (error) throw new Error(`read rag_corpus: ${error.message}`);
  if (!rows || rows.length === 0) { console.log('no matching rows'); return; }

  for (const r of rows) {
    console.log(`${r.id}  ${r.author} — ${r.work}  #${r.chunk_index} [${r.section_label}]  ${wordCount(r.chunk_text)} words${r.deprecated ? '  (deprecated)' : ''}`);
    console.log(`    ${r.chunk_text.slice(0, 120).replace(/\s+/g, ' ')}…`);
  }
  if (args.dryRun) return;

  const embedded = await embedChunks(rows.map(r => ({ id: r.id, text: r.chunk_text })));
  for (const e of embedded) {
    const { error: upErr } = await supabase
      .from('rag_corpus')
      .update({ embedding: e.embedding, word_count: wordCount(e.text) })
      .eq('id', e.id);
    if (upErr) throw new Error(`update ${e.id}: ${upErr.message}`);
    console.log(`  ✓ re-embedded ${e.id}`);
  }
}

main().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
