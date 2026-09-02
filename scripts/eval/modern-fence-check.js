// Acceptance test for the modern philosophy of mind fence
// (docs/corpus/MODERN_LAYER_PROPOSAL.md, section 4).
//
// Named query: "Is consciousness a fundamental feature of matter, or does it
// emerge from physical organisation?"
//
//   1. Counselor path: match_rag_corpus with the counselor exclusion, then
//      the same post-filter the Cabinet applies. Zero modern or concordance
//      rows, or the fence has a hole.
//   2. Dispatch path: match_rag_corpus_ids with the modern exclusion. Zero
//      modern rows.
//   3. Synthesis path: match_rag_corpus_ids with no exclusion, text_type
//      joined by id. At least three modern rows once the layer is ingested.
//   4. Bridge regression: "does the Stoic cosmos have a mind" on the Synthesis
//      path still returns a concordance entry and an ancient passage.
//
// Before the modern layer exists the script reports "layer not present" for
// check 3 and exits 0: the fence checks (1, 2, 4) are the ones that can fail
// today. Once any modern_primary or modern_summary row exists, check 3 is
// enforced and a shortfall exits 1.
//
// Usage: node scripts/eval/modern-fence-check.js
// Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (see lib.js).

const { supabaseClient, embedQuery } = require('./lib');
const {
  COUNSELOR_EXCLUDED_TEXT_TYPES, MODERN_TEXT_TYPES,
  counselorRetrievalParams, modernFenceParams, isCounselorVisible,
} = require('../../server/lib/corpus-fence');

const QUERY = 'Is consciousness a fundamental feature of matter, or does it emerge from physical organisation?';
const BRIDGE_QUERY = 'does the Stoic cosmos have a mind';
const MODERN = new Set(MODERN_TEXT_TYPES);
const FENCED = new Set(COUNSELOR_EXCLUDED_TEXT_TYPES);

function show(label, rows) {
  console.log(`\n${label}`);
  rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.author} — ${r.work} (${r.text_type ?? '?'}, ${Number(r.similarity).toFixed(3)})`));
  if (rows.length === 0) console.log('  (nothing returned)');
}

async function typesById(supabase, rows) {
  const ids = rows.map(r => r.id);
  if (ids.length === 0) return rows;
  const { data, error } = await supabase.from('rag_corpus').select('id, text_type').in('id', ids);
  if (error) throw new Error(`text_type lookup: ${error.message}`);
  const byId = new Map((data || []).map(r => [r.id, r.text_type]));
  return rows.map(r => ({ ...r, text_type: byId.get(r.id) ?? null }));
}

async function main() {
  const supabase = supabaseClient();
  let failures = 0;
  const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
  const ok = msg => console.log(`  ✓ ${msg}`);

  const { count: modernRows, error: cErr } = await supabase
    .from('rag_corpus').select('id', { count: 'exact', head: true })
    .in('text_type', MODERN_TEXT_TYPES).eq('deprecated', false);
  if (cErr) throw new Error(`modern row count: ${cErr.message}`);
  console.log(`Modern layer rows live: ${modernRows}`);

  const embedding = await embedQuery(QUERY);

  // 1. Counselor path.
  const c = await supabase.rpc('match_rag_corpus', {
    query_embedding: embedding, match_count: 7, filter_author: null, filter_language: 'english',
    ...counselorRetrievalParams(),
  });
  if (c.error) throw new Error(`match_rag_corpus (counselor): ${c.error.message}`);
  const counselor = (c.data || []).filter(isCounselorVisible);
  show('1. Counselor path (Oracle / Cabinet view)', counselor);
  const leaked = counselor.filter(r => FENCED.has(r.text_type));
  leaked.length ? fail(`${leaked.length} fenced row(s) reached the counselor path`) : ok('no modern or concordance rows on the counselor path');

  // 2. Dispatch path.
  const d = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding, match_count: 12, ...modernFenceParams(),
  });
  if (d.error) throw new Error(`match_rag_corpus_ids (dispatch): ${d.error.message}`);
  const dispatch = await typesById(supabase, d.data || []);
  show('2. Dispatch path (match_rag_corpus_ids, modern fence)', dispatch);
  const dLeak = dispatch.filter(r => MODERN.has(r.text_type));
  dLeak.length ? fail(`${dLeak.length} modern row(s) reached the Dispatch path`) : ok('no modern rows on the Dispatch path');

  // 3. Synthesis path.
  const s = await supabase.rpc('match_rag_corpus_ids', { query_embedding: embedding, match_count: 8 });
  if (s.error) throw new Error(`match_rag_corpus_ids (synthesis): ${s.error.message}`);
  const synthesis = await typesById(supabase, s.data || []);
  show('3. Synthesis path (match_rag_corpus_ids, no exclusion)', synthesis);
  const modernHits = synthesis.filter(r => MODERN.has(r.text_type)).length;
  if (modernRows === 0) console.log('  · layer not present yet; check 3 not enforced');
  else if (modernHits >= 3) ok(`${modernHits} modern rows in the top eight`);
  else fail(`only ${modernHits} modern row(s) in the top eight; expected at least three`);

  // 4. Bridge regression.
  const bEmbedding = await embedQuery(BRIDGE_QUERY);
  const b = await supabase.rpc('match_rag_corpus', {
    query_embedding: bEmbedding, match_count: 5, filter_author: null, filter_language: 'english',
  });
  if (b.error) throw new Error(`match_rag_corpus (bridge): ${b.error.message}`);
  const bridge = b.data || [];
  show(`4. Bridge regression: "${BRIDGE_QUERY}"`, bridge);
  const hasConc = bridge.some(r => r.text_type === 'concordance');
  const hasAncient = bridge.some(r => r.text_type === 'primary');
  if (hasConc && hasAncient) ok('a concordance entry and a primary passage both in the top five');
  else if (!hasConc) fail('no concordance entry in the top five (not synced yet, or crowded out)');
  else fail('concordance entries return but no primary passage does');

  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
