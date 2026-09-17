// server/tests/graph-boost.test.js
//
// The graph-boost expansion is the one retrieval path that reaches rag_corpus
// without going through match_rag_corpus, so the guarantees that RPC carries
// in SQL — deprecated = false, and the caller's text_type fence — exist here
// only as JavaScript. Both have been missing before. These tests pin them,
// along with the depth walk built on top.
//
// No database and no install: @supabase/supabase-js is intercepted at module
// load and answered from a fixture graph, so `node --test` runs this anywhere.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

process.env.GRAPH_BOOST = 'true';
process.env.SUPABASE_URL = 'http://stub';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';

// --- stubbed client ---------------------------------------------------------
// WORLD is swapped per test. edgeQueries counts hops, which is how the depth
// assertions tell one walk from two.
let WORLD = { edges: [], corpus: [] };
let edgeQueries = 0;
let deprecatedFilterApplied = false;

function makeQuery(table) {
  const st = { table, eqs: {}, ids: null };
  const q = {
    select: () => q, gte: () => q, or: () => q, order: () => q, limit: () => q,
    eq: (col, val) => { st.eqs[col] = val; return q; },
    in: (_col, ids) => { st.ids = ids; return q; },
    then: (resolve) => {
      if (st.table === 'concept_edges') {
        edgeQueries++;
        return resolve({ data: WORLD.edges, error: null });
      }
      if (st.table === 'rag_corpus') {
        if ('deprecated' in st.eqs) deprecatedFilterApplied = true;
        let rows = WORLD.corpus.filter(r => st.ids.includes(r.id));
        if (st.eqs.deprecated === false) rows = rows.filter(r => r.deprecated === false);
        return resolve({ data: rows.map(({ deprecated, ...rest }) => rest), error: null });
      }
      return resolve({ data: [], error: null });
    },
  };
  return q;
}

const origLoad = Module._load;
Module._load = function (request) {
  if (request === '@supabase/supabase-js') return { createClient: () => ({ from: makeQuery }) };
  return origLoad.apply(this, arguments);
};

const {
  expandCandidates, graphBoostDepth, retrievalMode, MAX_DEPTH,
} = require('../lib/graph-boost');
const { isCounselorVisible } = require('../lib/corpus-fence');

// --- fixtures ---------------------------------------------------------------
const primary = (id, extra = {}) => ({
  id, chunk_text: id, author: 'epictetus', work: 'discourses',
  text_type: 'primary', deprecated: false, ...extra,
});
const src = (id, similarity) => ({ ...primary(id), similarity });

//   s1 --0.9-- a1(concordance) --0.9-- a2    a1 is fenced: a2 must stay unreachable
//   s1 --0.8-- b1              --0.8-- b2    clean chain: b2 arrives at depth 2
//   s2 --0.9-- x1(deprecated)  --0.9-- x2    x1 is dropped: x2 must stay unreachable
// At hop 2 the frontier is b1, whose s1 edge points back at a source.
const CHAIN = {
  sources: [src('s1', 0.9), src('s2', 0.5)],
  edges: [
    { chunk_a: 's1', chunk_b: 'a1', weight: 0.9 },
    { chunk_a: 'a1', chunk_b: 'a2', weight: 0.9 },
    { chunk_a: 's2', chunk_b: 'x1', weight: 0.9 },
    { chunk_a: 'x1', chunk_b: 'x2', weight: 0.9 },
    { chunk_a: 's1', chunk_b: 'b1', weight: 0.8 },
    { chunk_a: 'b1', chunk_b: 'b2', weight: 0.8 },
  ],
  corpus: [
    primary('a1', { text_type: 'concordance' }),
    primary('a2'), primary('b1'), primary('b2'),
    primary('x1', { deprecated: true }), primary('x2'),
  ],
};

function load(world) {
  WORLD = { edges: world.edges, corpus: world.corpus };
  edgeQueries = 0;
  deprecatedFilterApplied = false;
}

// What a call site gets: expansion, then its own post-filter.
async function served(world, k, opts) {
  load(world);
  const res = await expandCandidates(world.sources, k, opts);
  return { ids: res.rows.filter(isCounselorVisible).map(r => r.id), res };
}

// --- configuration ----------------------------------------------------------
test('GRAPH_BOOST_DEPTH resolves, clamps and labels the retrieval mode', () => {
  const cases = [
    [undefined, 1, 'graph_boost'],
    ['1', 1, 'graph_boost'],
    ['2', 2, 'graph_boost_n2'],
    ['99', MAX_DEPTH, `graph_boost_n${MAX_DEPTH}`],
    ['nonsense', 1, 'graph_boost'],
    ['0', 1, 'graph_boost'],
  ];
  for (const [env, depth, mode] of cases) {
    if (env === undefined) delete process.env.GRAPH_BOOST_DEPTH;
    else process.env.GRAPH_BOOST_DEPTH = env;
    assert.equal(graphBoostDepth(), depth, `GRAPH_BOOST_DEPTH=${env}`);
    assert.equal(retrievalMode(), mode, `GRAPH_BOOST_DEPTH=${env}`);
  }
  delete process.env.GRAPH_BOOST_DEPTH;
});

test('mode is vector and rows are untouched while the flag is off', async () => {
  process.env.GRAPH_BOOST = 'false';
  assert.equal(retrievalMode(), 'vector');
  load(CHAIN);
  const res = await expandCandidates(CHAIN.sources, 5, { fence: isCounselorVisible });
  assert.deepEqual(res.rows, CHAIN.sources);
  assert.equal(edgeQueries, 0, 'a disabled walk should not query at all');
  process.env.GRAPH_BOOST = 'true';
});

// --- the two guarantees -----------------------------------------------------
test('the neighbour query filters deprecated, and a deprecated row is never served', async () => {
  const { ids } = await served(CHAIN, 6, { fence: isCounselorVisible, depth: 1 });
  assert.ok(deprecatedFilterApplied, 'neighbour query must filter deprecated');
  assert.ok(!ids.includes('x1'), 'deprecated neighbour must not be served');
});

test('the fence runs before truncation, so the caller still gets k rows', async () => {
  // a1 outscores b1, so filtering after the slice would spend a slot on it and
  // hand back k-1 — losing the eligible row it displaced.
  const world = {
    sources: [src('s1', 0.9), src('s2', 0.8), src('s3', 0.7), src('s4', 0.6), src('s5', 0.5)],
    edges: [{ chunk_a: 's1', chunk_b: 'a1', weight: 0.95 }],
    corpus: [primary('a1', { text_type: 'concordance' })],
  };
  const { ids } = await served(world, 5, { fence: isCounselorVisible, depth: 1 });
  assert.equal(ids.length, 5, 'a fenced neighbour must not cost the caller a row');
  assert.ok(!ids.includes('a1'));
  assert.ok(ids.includes('s5'), 'the displaced row must survive');
});

// --- the depth walk ---------------------------------------------------------
test('depth 1 is a single hop', async () => {
  const { ids } = await served(CHAIN, 6, { fence: isCounselorVisible, depth: 1 });
  assert.ok(ids.includes('b1'), 'the one-hop neighbour should arrive');
  assert.ok(!ids.includes('b2'), 'a two-hop row must not');
  assert.equal(edgeQueries, 1);
});

test('depth 2 walks through, decays the score, and records the hop', async () => {
  const { ids, res } = await served(CHAIN, 6, { fence: isCounselorVisible, depth: 2 });
  assert.ok(ids.includes('b2'), 'depth 2 should reach b2 through b1');
  assert.equal(edgeQueries, 2);
  const by = Object.fromEntries(res.rows.map(r => [r.id, r]));
  assert.ok(by.b1.similarity > by.b2.similarity, 'score must decay with depth');
  assert.equal(by.b1._graphHop, 1);
  assert.equal(by.b2._graphHop, 2);
});

test('a fenced row does not seed the next hop', async () => {
  // a2 is reachable only through fenced a1. Fencing the output alone would
  // drop a1 and keep everything it dragged in.
  const { ids } = await served(CHAIN, 8, { fence: isCounselorVisible, depth: 3 });
  assert.ok(!ids.includes('a1'), 'fenced row must not be served');
  assert.ok(!ids.includes('a2'), 'nor anything reached only through it');
});

test('a deprecated row does not seed the next hop', async () => {
  const { ids } = await served(CHAIN, 8, { fence: isCounselorVisible, depth: 3 });
  assert.ok(!ids.includes('x1'));
  assert.ok(!ids.includes('x2'), 'a row reachable only through a deprecated one must stay unreachable');
});

test('a row already seen is not revisited', async () => {
  const { ids } = await served(CHAIN, 8, { fence: isCounselorVisible, depth: 3 });
  assert.equal(ids.filter(i => i === 's1').length, 1, 'the hop-2 edge back to s1 must not re-add it');
  assert.equal(new Set(ids).size, ids.length, 'no duplicates across hops');
});

test('depth clamps to MAX_DEPTH and stops when the frontier dries up', async () => {
  const { res } = await served(CHAIN, 8, { fence: isCounselorVisible, depth: 99 });
  assert.equal(res.depth, MAX_DEPTH);
  assert.ok(edgeQueries <= MAX_DEPTH, `walked ${edgeQueries} hops, max ${MAX_DEPTH}`);
});

// --- failing open -----------------------------------------------------------
test('hop 1 with nothing to build on returns the caller rows untouched', async () => {
  const world = { sources: [src('s1', 0.9), src('s2', 0.5)], edges: [], corpus: [] };
  load(world);
  const res = await expandCandidates(world.sources, 1, { fence: isCounselorVisible, depth: 2 });
  assert.deepEqual(res.rows, world.sources, 'no edges: hand back what the caller had');
  assert.equal(res.boosted, 0);
});

test('a chunk set that comes back wholly fenced still merges and truncates', async () => {
  // The subtle one. The walk reached rows and they were all fenced — that is
  // not "nothing to build on", so the sources must still go through the fence
  // and the slice. Returning them untouched here diverged from the single-hop
  // implementation on call sites that do not truncate afterwards.
  const world = {
    sources: [src('s1', 0.9), { ...primary('s2', { text_type: 'concordance' }), similarity: 0.8 }, src('s3', 0.7)],
    edges: [{ chunk_a: 's1', chunk_b: 'a1', weight: 0.9 }],
    corpus: [primary('a1', { text_type: 'concordance' })],
  };
  load(world);
  const res = await expandCandidates(world.sources, 2, { fence: isCounselorVisible, depth: 1 });
  assert.ok(res.rows.length <= 2, 'the k the caller asked for must still be honoured');
  assert.ok(!res.rows.some(r => r.id === 's2'), 'the fence must still have been applied to the sources');
});
