// server/tests/corpus-layers.test.js
//
// The synthesis layer's retrieval rules, as the code sends them: the research
// profile excludes synthesis in the query, and the corpus MCP server returns
// canon only unless a caller names more layers. The same exclusion lists are
// run against the live database by
// academy/corpus-ingestion/synthesis/retrieval-fence.test.sql.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const fence = require('../lib/corpus-fence');

// corpus-mcp.js requires express and supabase at load. Stub both, and record
// the RPC call so the test can see what search_corpus sent.
const calls = [];
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'express') return { Router: () => ({ post() {}, get() {} }) };
  if (request === '@supabase/supabase-js') {
    return {
      createClient: () => ({
        rpc: async (name, args) => { calls.push({ name, args }); return { data: [], error: null }; },
        from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
      }),
    };
  }
  return realLoad.call(this, request, ...rest);
};
const { formatResults, resolveLayers, searchCorpus } = require('../routes/corpus-mcp');
Module._load = realLoad;

test('research profile excludes synthesis and nothing else', () => {
  assert.deepEqual(fence.researchRetrievalParams(), { exclude_text_types: ['synthesis'] });
});

test('teaching fences are unchanged and do not exclude synthesis', () => {
  assert.ok(!fence.counselorRetrievalParams().exclude_text_types.includes('synthesis'));
  assert.ok(!fence.modernFenceParams().exclude_text_types.includes('synthesis'));
});

test('every locked text_type belongs to exactly one layer', () => {
  const all = Object.values(fence.LAYERS).flat();
  assert.deepEqual([...all].sort(), [
    'concordance', 'modern_primary', 'modern_summary', 'paper_summary', 'primary', 'scholarship', 'synthesis',
  ]);
  assert.equal(new Set(all).size, all.length);
});

test('canon-only leaves primary texts and excludes synthesis', () => {
  const ex = fence.excludeTextTypesForLayers(['canon']);
  assert.ok(ex.includes('synthesis'));
  assert.ok(!ex.includes('primary'));
  assert.deepEqual(fence.excludeTextTypesForLayers(Object.keys(fence.LAYERS)), []);
  assert.throws(() => fence.excludeTextTypesForLayers(['synthesys']), /unknown layer/);
});

test('research post-filter catches both synthesis authors when a row has no text_type', () => {
  assert.equal(fence.isResearchVisible({ author: 'Arete (AI-assisted)' }), false);
  assert.equal(fence.isResearchVisible({ author: 'Arete Synthesis' }), false);
  assert.equal(fence.isResearchVisible({ author: 'Epictetus' }), true);
  assert.equal(fence.isResearchVisible({ author: 'Epictetus', text_type: 'synthesis' }), false);
  assert.equal(fence.SYNTHESIS_AUTHORS_IN_LIST, '("Arete Synthesis","Arete (AI-assisted)")');
});

test('MCP layers: default canon, connection default, per-call override', () => {
  assert.deepEqual(resolveLayers(undefined, null), ['canon']);
  assert.deepEqual(resolveLayers([], ['canon', 'synthesis']), ['canon', 'synthesis']);
  assert.deepEqual(resolveLayers(['scholarship'], ['canon', 'synthesis']), ['scholarship']);
  assert.throws(() => resolveLayers(['everything'], null), /unknown layer/);
});

test('search_corpus with default parameters asks the RPC to exclude synthesis', async () => {
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ data: [{ embedding: [0.1] }] }) });
  try {
    calls.length = 0;
    await searchCorpus({ query: 'the master argument' });
    await searchCorpus({ query: 'the master argument' }, { layers: ['canon', 'scholarship', 'apparatus', 'synthesis'] });
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(calls[0].name, 'match_rag_corpus');
  assert.ok(calls[0].args.exclude_text_types.includes('synthesis'));
  assert.deepEqual(calls[1].args.exclude_text_types, []);
});

test('a synthesis row prints its layer and verification status', () => {
  const row = {
    id: 's1', author: 'Arete (AI-assisted)', work: 'Stoic Logic: A Summary', section_label: 'The Master Argument',
    similarity: 0.8, text_type: 'synthesis', chunk_text: '[ARETE SYNTHESIS: ...]',
  };
  const out = formatResults([row], new Map([['s1', { verification_status: ['via_summary'] }]]));
  assert.match(out, /\nlayer: synthesis \(AI-assisted, not evidence\); verification_status: via_summary\n/);
  const primary = formatResults([{ ...row, text_type: 'primary' }], new Map());
  assert.doesNotMatch(primary, /layer: synthesis/);
});
