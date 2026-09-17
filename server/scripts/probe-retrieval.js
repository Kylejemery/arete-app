// ---------------------------------------------------------------------------
// Retrieval probe: what the Cabinet would pull from rag_corpus for a
// question, without generating a reply and without writing to retrieval_log.
//
// The live path (POST /api/chat/counselor, parallel Cabinet branch in
// server/index.js) embeds the last user message with text-embedding-3-small,
// calls match_rag_corpus with match_count 7, filter_language 'english' and
// the counselor fence (server/lib/corpus-fence.js), then runs the graph-boost
// expansion (a no-op unless GRAPH_BOOST=true) and the fence post-filter. This
// script does exactly that and prints the rows with the fields the Cabinet
// UI never shows: section label, locator, text type, similarity.
//
// It can also replay what the live Cabinet actually retrieved, from
// retrieval_log, so a question typed into the app can be checked afterwards.
//
//   node scripts/probe-retrieval.js "Is fear of death rational?"
//   node scripts/probe-retrieval.js "…" --k 10 --fence modern      another surface's fence
//   node scripts/probe-retrieval.js "…" --author Seneca            one author, as the single-counselor path can
//   node scripts/probe-retrieval.js "…" --depth 3                  walk three hops, overriding GRAPH_BOOST_DEPTH
//   node scripts/probe-retrieval.js "…" --full                     whole chunk text, not a snippet
//   node scripts/probe-retrieval.js --recent 5                     last five Cabinet turns from retrieval_log
//   node scripts/probe-retrieval.js --recent 5 --agent oracle      another agent's log
//
// Run from server/ so .env is found. Needs SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY; a live probe also needs OPENAI_API_KEY.
// ---------------------------------------------------------------------------
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const {
  counselorRetrievalParams, modernFenceParams, isCounselorVisible, passesModernFence,
} = require('../lib/corpus-fence');
const { expandCandidates, graphBoostEnabled, graphBoostDepth, MAX_DEPTH } = require('../lib/graph-boost');

const CABINET_K = 7;
const CABINET_AGENTS = ['cabinet', 'counselor:cabinet'];

function parseArgs(argv) {
  const args = { question: null, k: CABINET_K, fence: 'counselor', author: null, full: false, recent: null, agent: null, depth: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--k') args.k = Number(argv[++i]);
    else if (a === '--fence') args.fence = argv[++i];
    else if (a === '--author') args.author = argv[++i];
    else if (a === '--depth') args.depth = Number(argv[++i]);
    else if (a === '--full') args.full = true;
    else if (a === '--recent') args.recent = Number(argv[++i]);
    else if (a === '--agent') args.agent = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else args.question = args.question ? `${args.question} ${a}` : a;
  }
  if (!['counselor', 'modern', 'none'].includes(args.fence)) throw new Error(`--fence must be counselor, modern or none (got ${args.fence})`);
  if (!Number.isInteger(args.k) || args.k < 1) throw new Error('--k must be a positive integer');
  if (args.depth != null && (!Number.isInteger(args.depth) || args.depth < 1 || args.depth > MAX_DEPTH)) {
    throw new Error(`--depth must be an integer from 1 to ${MAX_DEPTH}`);
  }
  if (args.recent != null && (!Number.isInteger(args.recent) || args.recent < 1)) throw new Error('--recent must be a positive integer');
  if (args.recent == null && !args.question) {
    throw new Error('give a question in quotes, or --recent N to replay the log');
  }
  return args;
}

function need(...keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`${missing.join(', ')} must be set (server/.env)`);
}

// Same call as embedQuery in server/index.js, which is not exported.
async function embedQuery(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  const data = await res.json();
  if (!res.ok || !data?.data?.[0]?.embedding) throw new Error(`embedding failed: ${data?.error?.message || res.status}`);
  return data.data[0].embedding;
}

function fenceParams(fence) {
  if (fence === 'counselor') return counselorRetrievalParams();
  if (fence === 'modern') return modernFenceParams();
  return {};
}
function fencePostFilter(fence) {
  if (fence === 'counselor') return isCounselorVisible;
  if (fence === 'modern') return passesModernFence;
  return () => true;
}

// match_rag_corpus does not return locator, translator or edition_year;
// fetch them for the rows we have.
async function decorate(supabase, rows) {
  const ids = rows.map(r => r.id).filter(Boolean);
  if (ids.length === 0) return rows;
  const { data, error } = await supabase
    .from('rag_corpus')
    .select('id, locator, translator, edition_year, word_count, section_label, text_type, author, work, chunk_text')
    .in('id', ids);
  if (error) throw new Error(`rag_corpus lookup failed: ${error.message}`);
  const byId = new Map((data ?? []).map(r => [r.id, r]));
  // The retrieved row wins where both carry a field (rank, similarity,
  // graph-boost flag); the table supplies what the RPC or the log lacks.
  return rows.map(r => ({ ...(byId.get(r.id) ?? {}), ...r }));
}

function fmtSim(s) { return typeof s === 'number' ? s.toFixed(3) : '  —  '; }
function snippet(text, full) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return full ? t : (t.length > 160 ? `${t.slice(0, 160)}…` : t);
}

function printRows(rows, { full }) {
  rows.forEach((r, i) => {
    const rank = r.rank ?? i + 1;
    const flags = [r._graphBoosted ? 'graph' : null, r.used_in_response === true ? 'used' : r.used_in_response === false ? 'unused' : null].filter(Boolean);
    const where = [r.section_label, r.locator ? `§${r.locator}` : null].filter(Boolean).join(' · ');
    const edition = [r.translator, r.edition_year].filter(Boolean).join(' ');
    console.log(`  ${String(rank).padStart(2)}. ${fmtSim(r.similarity)}  ${r.author ?? '?'} — ${r.work ?? '?'}  [${r.text_type ?? '?'}]${flags.length ? `  (${flags.join(', ')})` : ''}`);
    if (where) console.log(`      ${where}`);
    if (edition) console.log(`      ${edition}`);
    console.log(`      ${snippet(r.chunk_text, full)}`);
  });
}

function printSummary(rows) {
  if (rows.length === 0) { console.log('  no rows'); return; }
  const works = new Set(rows.map(r => `${r.author} — ${r.work}`));
  const authors = new Set(rows.map(r => r.author));
  const types = {};
  for (const r of rows) types[r.text_type ?? '?'] = (types[r.text_type ?? '?'] || 0) + 1;
  const sims = rows.map(r => r.similarity).filter(s => typeof s === 'number');
  const noLocator = rows.filter(r => !r.locator).length;
  const used = rows.filter(r => r.used_in_response === true).length;
  const attributed = rows.some(r => r.used_in_response != null);
  console.log(`  ${rows.length} rows · ${works.size} distinct work(s) · ${authors.size} author(s) · ${Object.entries(types).map(([t, n]) => `${t} ${n}`).join(', ')}`);
  if (sims.length) console.log(`  similarity ${Math.min(...sims).toFixed(3)} – ${Math.max(...sims).toFixed(3)} (mean ${(sims.reduce((a, b) => a + b, 0) / sims.length).toFixed(3)})`);
  if (noLocator) console.log(`  ${noLocator} row(s) without a locator`);
  if (attributed) console.log(`  ${used} row(s) marked as used in the reply`);
}

async function probe(supabase, args) {
  need('OPENAI_API_KEY');
  console.log(`Question: ${JSON.stringify(args.question)}`);
  console.log(`match_rag_corpus: k=${args.k}, fence=${args.fence}, author=${args.author ?? 'any'}, language=english, graph boost ${graphBoostEnabled() ? `on (depth ${args.depth ?? graphBoostDepth()})` : 'off'}\n`);
  const embedding = await embedQuery(args.question);
  const { data, error } = await supabase.rpc('match_rag_corpus', {
    query_embedding: embedding,
    match_count: args.k,
    filter_author: args.author,
    filter_language: 'english',
    ...fenceParams(args.fence),
  });
  if (error) throw new Error(`match_rag_corpus failed: ${error.message}`);
  const fence = fencePostFilter(args.fence);
  let rows = (await expandCandidates(data ?? [], args.k, { fence, depth: args.depth })).rows.filter(fence);
  rows = await decorate(supabase, rows);
  printRows(rows, args);
  console.log();
  printSummary(rows);
  console.log('\n(not written to retrieval_log)');
}

async function recent(supabase, args) {
  const agents = args.agent ? [args.agent] : CABINET_AGENTS;
  const { data: heads, error } = await supabase
    .from('retrieval_log')
    .select('request_id, created_at, query_text, agent, retrieval_mode')
    .in('agent', agents)
    .eq('rank', 1)
    .order('created_at', { ascending: false })
    .limit(args.recent);
  if (error) throw new Error(`retrieval_log read failed: ${error.message}`);
  if (!heads || heads.length === 0) { console.log(`no retrieval_log rows for agent ${agents.join(' / ')}`); return; }
  for (const h of heads) {
    const { data: logRows, error: logErr } = await supabase
      .from('retrieval_log')
      .select('rank, similarity, used_in_response, chunk_id')
      .eq('request_id', h.request_id)
      .order('rank');
    if (logErr) throw new Error(`retrieval_log read failed: ${logErr.message}`);
    let rows = (logRows ?? []).map(l => ({ id: l.chunk_id, rank: l.rank, similarity: l.similarity, used_in_response: l.used_in_response }));
    rows = await decorate(supabase, rows);
    console.log(`\n${h.created_at}  ${h.agent}  ${h.retrieval_mode}`);
    console.log(`Question: ${JSON.stringify(String(h.query_text).slice(0, 200))}`);
    printRows(rows, args);
    printSummary(rows);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  need('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (args.recent != null) await recent(supabase, args);
  else await probe(supabase, args);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
