#!/usr/bin/env node
// Re-embed live chunks whose stored embedding no longer matches their text,
// or that have none.
//
// A migration that edits chunk_text (stripping page furniture, trimming an
// apparatus prefix) leaves the vector computed over the old text. rag_corpus
// records no embedded_at, so staleness is measured directly: embed the current
// text and compare it with the stored vector. Unchanged text reproduces its
// vector almost exactly (cosine ≈ 1); edited text does not.
//
// Usage:
//   node reembed-stale.js "Seneca/On Anger" "Plato/Alcibiades"          # dry run
//   node reembed-stale.js "Seneca/On Anger" "Plato/Alcibiades" --apply  # write
//   node reembed-stale.js "E. Vernon Arnold/Roman Stoicism" --missing-only --apply
//
// --missing-only embeds only chunks with no stored vector, such as a chunk a
// migration restored (migrations write text, not vectors), and skips measuring
// the rest. Without it, the model's run-to-run noise (cosine 0.998-0.999 on
// unchanged text) can put a few untouched chunks just under the threshold.
//
// Only non-deprecated chunks below --threshold (default 0.999) are rewritten,
// and each rewritten chunk is re-read and re-checked afterwards.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { embedChunks, estimateCost } = require('./embedder');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const missingOnly = args.includes('--missing-only');
const tIdx = args.indexOf('--threshold');
const threshold = tIdx >= 0 ? Number(args[tIdx + 1]) : 0.999;
const works = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--threshold');

if (!works.length || works.some(w => !w.includes('/'))) {
  console.error('Usage: node reembed-stale.js "Author/Work" [...] [--apply] [--threshold 0.999]');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseVector(v) {
  return typeof v === 'string' ? JSON.parse(v) : v;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function liveChunks(author, work) {
  const { data, error } = await supabase
    .from('rag_corpus')
    .select('id, author, work, chunk_index, chunk_text, embedding')
    .eq('author', author)
    .eq('work', work)
    .eq('deprecated', false)
    .order('chunk_index');
  if (error) throw new Error(`read ${author} / ${work}: ${error.message}`);
  return data;
}

async function measure(rows) {
  const embedded = await embedChunks(rows.map(r => ({ ...r, text: r.chunk_text })));
  // A chunk with no stored vector (one restored by a migration, which writes
  // text only) is stale by definition: nothing retrieves it until it has one.
  return embedded.map(r => ({
    ...r,
    cos: r.embedding_old == null ? -1 : cosine(parseVector(r.embedding_old), r.embedding),
  }));
}

async function main() {
  let stale = [];
  for (const w of works) {
    const [author, work] = w.split('/');
    const rows = (await liveChunks(author, work))
      .filter(r => !missingOnly || r.embedding == null)
      .map(r => ({ ...r, embedding_old: r.embedding, embedding: undefined }));
    if (!rows.length) { console.log(`${author} / ${work}: nothing to embed`); continue; }
    const measured = await measure(rows);
    const s = measured.filter(r => r.cos < threshold);
    const min = Math.min(...measured.map(r => r.cos));
    console.log(`${author} / ${work}: ${measured.length} live, ${s.length} stale (min cosine ${min.toFixed(5)})`);
    stale = stale.concat(s);
  }

  const { estimatedTokens, estimatedCost } = estimateCost(stale);
  console.log(`\n${stale.length} chunk(s) to re-embed, ~${estimatedTokens} tokens, ~$${estimatedCost.toFixed(4)}`);
  if (!apply) { console.log('Dry run. Pass --apply to write.'); return; }

  for (const r of stale) {
    const { error } = await supabase.from('rag_corpus').update({ embedding: r.embedding }).eq('id', r.id);
    if (error) throw new Error(`update ${r.id}: ${error.message}`);
  }

  // Verify: re-read what was written and compare with the vector just computed.
  let bad = 0;
  for (const r of stale) {
    const { data, error } = await supabase.from('rag_corpus').select('embedding').eq('id', r.id).single();
    if (error) throw new Error(`verify ${r.id}: ${error.message}`);
    if (cosine(parseVector(data.embedding), r.embedding) < 0.99999) bad++;
  }
  console.log(`Wrote ${stale.length}; ${stale.length - bad} verified, ${bad} mismatched.`);
  if (bad) process.exit(1);
}

main().catch(err => { console.error(err.message); process.exit(1); });
