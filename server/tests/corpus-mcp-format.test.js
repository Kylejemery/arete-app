// server/tests/corpus-mcp-format.test.js
//
// The corpus MCP result format. quotable_on_air is what the Examiner quotes
// by, so it must print for every row and default to false when provenance is
// missing rather than disappear.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// corpus-mcp.js requires express and supabase at load; neither is exercised
// by formatResults, so stub them to keep the test install-free.
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'express') return { Router: () => ({ post() {}, get() {} }) };
  if (request === '@supabase/supabase-js') return { createClient: () => ({}) };
  return realLoad.call(this, request, ...rest);
};
const { formatResults } = require('../routes/corpus-mcp');
Module._load = realLoad;

const row = {
  id: 'a1',
  author: 'Diogenes Laërtius',
  work: 'Lives of Eminent Philosophers, Book VII',
  section_label: 'Zeno',
  similarity: 0.61234,
  chunk_text: 'the Cynic way of life is a short cut to virtue',
};

test('provenance fields and spoken citation print with the passage', () => {
  const out = formatResults([row], new Map([['a1', {
    locator: '7.121–7.123', translator: 'R.D. Hicks', edition_year: 1925, quotable_on_air: true,
  }]]));
  assert.equal(out, [
    '[1] Diogenes Laërtius — Lives of Eminent Philosophers, Book VII, 7.121–7.123 (tr. R.D. Hicks, 1925) (similarity 0.61; chunk a1)',
    'quotable_on_air: true',
    'spoken: "Diogenes Laertius, Lives of Eminent Philosophers, book seven, sections one hundred twenty one to one hundred twenty three"',
    'the Cynic way of life is a short cut to virtue',
  ].join('\n'));
});

test('missing provenance reads as not quotable, with the section label kept', () => {
  const out = formatResults([row], new Map());
  assert.match(out, /Book VII, Zeno \(similarity/);
  assert.match(out, /\nquotable_on_air: false\n/);
});
