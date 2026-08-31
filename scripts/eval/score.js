// Scores the vector retriever against the human judgments. The bm25 and
// keyword retrievers exist only to build an honest candidate pool; they are
// not scored.
//
// Metrics, computed per query and averaged over queries that have at least
// one relevant chunk for the metric in question:
//
//   recall@5 (strict)   relevant set is relevance 2 only
//   recall@10 (strict)  relevant set is relevance 2 only
//   recall@5 (lenient)  relevant set is relevance 1 or 2
//   MRR                 reciprocal rank of the first relevance 2 hit in the
//                       vector ranking, 0 when none appears
//
// All metrics are also broken out by register and by doctrine. Results are
// printed as a table and written as timestamped JSON to scripts/eval/results/.
//
// Usage:
//   node scripts/eval/score.js
//   node scripts/eval/score.js diff <baseline.json> <candidate.json>

const fs = require('fs');
const path = require('path');
const { supabaseClient } = require('./lib');

const RESULTS_DIR = path.join(__dirname, 'results');

async function fetchAll(client, table, columns) {
  // PostgREST caps responses at 1000 rows, so page through.
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await client.from(table).select(columns).range(from, from + page - 1);
    if (error) throw new Error(table + ' fetch failed: ' + error.message);
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

function recallAtK(rankedIds, relevantSet, k) {
  if (!relevantSet.size) return null;
  let hit = 0;
  for (const id of rankedIds.slice(0, k)) {
    if (relevantSet.has(id)) hit += 1;
  }
  return hit / relevantSet.size;
}

function mrr(rankedIds, relevantSet) {
  if (!relevantSet.size) return null;
  for (let i = 0; i < rankedIds.length; i++) {
    if (relevantSet.has(rankedIds[i])) return 1 / (i + 1);
  }
  return 0;
}

function mean(values) {
  const xs = values.filter((v) => v !== null && v !== undefined);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function aggregate(perQuery) {
  return {
    queries_judged: perQuery.length,
    queries_with_rel2: perQuery.filter((q) => q.rel2_count > 0).length,
    queries_with_rel12: perQuery.filter((q) => q.rel12_count > 0).length,
    recall_at_5_strict: mean(perQuery.map((q) => q.recall_at_5_strict)),
    recall_at_10_strict: mean(perQuery.map((q) => q.recall_at_10_strict)),
    recall_at_5_lenient: mean(perQuery.map((q) => q.recall_at_5_lenient)),
    mrr_rel2: mean(perQuery.map((q) => q.mrr_rel2)),
  };
}

function fmt(v) {
  if (v === null || v === undefined) return '   n/a';
  return v.toFixed(3).padStart(6);
}

function printTable(title, rows) {
  console.log('');
  console.log(title);
  console.log(
    'group'.padEnd(24) + 'n'.padStart(4) + 'r@5'.padStart(8) +
    'r@10'.padStart(8) + 'r@5len'.padStart(8) + 'MRR'.padStart(8)
  );
  for (const [name, agg] of rows) {
    console.log(
      name.padEnd(24) +
      String(agg.queries_judged).padStart(4) +
      fmt(agg.recall_at_5_strict).padStart(8) +
      fmt(agg.recall_at_10_strict).padStart(8) +
      fmt(agg.recall_at_5_lenient).padStart(8) +
      fmt(agg.mrr_rel2).padStart(8)
    );
  }
}

async function score() {
  const supabase = supabaseClient();
  const evalDb = supabase.schema('eval');

  const [queries, candidates, judgments] = await Promise.all([
    fetchAll(evalDb, 'eval_queries', 'id, query_text, register, doctrine'),
    fetchAll(evalDb, 'eval_candidates', 'query_id, chunk_id, retriever, rank'),
    fetchAll(evalDb, 'eval_judgments', 'query_id, chunk_id, relevance'),
  ]);

  if (!judgments.length) {
    console.log('No judgments in eval.eval_judgments yet. Run judge.js first.');
    process.exit(0);
  }

  const vectorByQuery = new Map();
  for (const c of candidates) {
    if (c.retriever !== 'vector') continue;
    if (!vectorByQuery.has(c.query_id)) vectorByQuery.set(c.query_id, []);
    vectorByQuery.get(c.query_id).push(c);
  }
  for (const list of vectorByQuery.values()) list.sort((a, b) => a.rank - b.rank);

  const judgmentsByQuery = new Map();
  for (const j of judgments) {
    if (!judgmentsByQuery.has(j.query_id)) judgmentsByQuery.set(j.query_id, new Map());
    judgmentsByQuery.get(j.query_id).set(j.chunk_id, j.relevance);
  }

  const perQuery = [];
  for (const q of queries) {
    const judged = judgmentsByQuery.get(q.id);
    if (!judged || !judged.size) continue;

    const rankedIds = (vectorByQuery.get(q.id) || []).map((c) => c.chunk_id);
    const rel2 = new Set([...judged.entries()].filter(([, r]) => r === 2).map(([id]) => id));
    const rel12 = new Set([...judged.entries()].filter(([, r]) => r >= 1).map(([id]) => id));

    perQuery.push({
      query_id: q.id,
      query_text: q.query_text,
      register: q.register,
      doctrine: q.doctrine || 'none',
      vector_results: rankedIds.length,
      judged_candidates: judged.size,
      rel2_count: rel2.size,
      rel12_count: rel12.size,
      recall_at_5_strict: recallAtK(rankedIds, rel2, 5),
      recall_at_10_strict: recallAtK(rankedIds, rel2, 10),
      recall_at_5_lenient: recallAtK(rankedIds, rel12, 5),
      mrr_rel2: mrr(rankedIds, rel2),
    });
  }

  const byRegister = {};
  const byDoctrine = {};
  for (const q of perQuery) {
    (byRegister[q.register] = byRegister[q.register] || []).push(q);
    (byDoctrine[q.doctrine] = byDoctrine[q.doctrine] || []).push(q);
  }

  const results = {
    generated_at: new Date().toISOString(),
    retriever: 'vector (match_rag_corpus, text-embedding-3-small)',
    overall: aggregate(perQuery),
    by_register: Object.fromEntries(
      Object.entries(byRegister).map(([k, v]) => [k, aggregate(v)])
    ),
    by_doctrine: Object.fromEntries(
      Object.entries(byDoctrine).map(([k, v]) => [k, aggregate(v)])
    ),
    per_query: perQuery,
  };

  printTable('OVERALL (vector retriever)', [['all queries', results.overall]]);
  printTable('BY REGISTER', Object.entries(results.by_register));
  printTable(
    'BY DOCTRINE',
    Object.entries(results.by_doctrine).sort(([a], [b]) => a.localeCompare(b))
  );
  console.log('');
  console.log(
    'Recall counts relevance 2 as relevant except r@5len, which counts 1 or 2. ' +
    'MRR is the reciprocal rank of the first relevance 2 hit.'
  );

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = results.generated_at.replace(/[:.]/g, '-');
  const outPath = path.join(RESULTS_DIR, 'results-' + stamp + '.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('');
  console.log('Wrote ' + outPath);
}

function diffAgg(a, b) {
  const keys = ['recall_at_5_strict', 'recall_at_10_strict', 'recall_at_5_lenient', 'mrr_rel2'];
  const out = {};
  for (const k of keys) {
    const av = a ? a[k] : null;
    const bv = b ? b[k] : null;
    out[k] = {
      baseline: av,
      candidate: bv,
      delta: av !== null && av !== undefined && bv !== null && bv !== undefined ? bv - av : null,
    };
  }
  return out;
}

function printDiffTable(title, diffs) {
  console.log('');
  console.log(title);
  console.log(
    'group'.padEnd(24) + 'metric'.padStart(10) + 'base'.padStart(8) +
    'cand'.padStart(8) + 'delta'.padStart(9)
  );
  const short = {
    recall_at_5_strict: 'r@5',
    recall_at_10_strict: 'r@10',
    recall_at_5_lenient: 'r@5len',
    mrr_rel2: 'MRR',
  };
  for (const [group, metrics] of diffs) {
    for (const [metric, d] of Object.entries(metrics)) {
      const delta = d.delta === null ? '     n/a'
        : (d.delta >= 0 ? '+' : '') + d.delta.toFixed(3);
      console.log(
        group.padEnd(24) + short[metric].padStart(10) +
        fmt(d.baseline).padStart(8) + fmt(d.candidate).padStart(8) + delta.padStart(9)
      );
    }
  }
}

function diff(fileA, fileB) {
  const a = JSON.parse(fs.readFileSync(fileA, 'utf8'));
  const b = JSON.parse(fs.readFileSync(fileB, 'utf8'));
  console.log('baseline:  ' + fileA + ' (' + a.generated_at + ')');
  console.log('candidate: ' + fileB + ' (' + b.generated_at + ')');

  printDiffTable('OVERALL', [['all queries', diffAgg(a.overall, b.overall)]]);

  const registers = [...new Set([...Object.keys(a.by_register || {}), ...Object.keys(b.by_register || {})])];
  printDiffTable(
    'BY REGISTER',
    registers.map((r) => [r, diffAgg((a.by_register || {})[r], (b.by_register || {})[r])])
  );

  const doctrines = [...new Set([...Object.keys(a.by_doctrine || {}), ...Object.keys(b.by_doctrine || {})])].sort();
  printDiffTable(
    'BY DOCTRINE',
    doctrines.map((d) => [d, diffAgg((a.by_doctrine || {})[d], (b.by_doctrine || {})[d])])
  );
}

async function main() {
  if (process.argv[2] === 'diff') {
    const [fileA, fileB] = process.argv.slice(3);
    if (!fileA || !fileB) {
      console.error('Usage: node scripts/eval/score.js diff <baseline.json> <candidate.json>');
      process.exit(1);
    }
    diff(fileA, fileB);
    return;
  }
  await score();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
