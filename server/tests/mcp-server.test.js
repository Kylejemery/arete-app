// server/tests/mcp-server.test.js
//
// The single-key corpus MCP server (routes/mcp.js): the key comparison, the
// per-key rate limit, the opt-in layers, and the rendered result text. The
// HTTP path and the database are covered by scripts/verify-mcp.js.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { _test } = require('../routes/mcp');
const { keyMatches, takeToken, renderSearch, renderSources, TEXT_TYPES, OPT_IN_TEXT_TYPES } = _test;

test('key comparison accepts only the exact key', () => {
  assert.equal(keyMatches('abc123', 'abc123'), true);
  assert.equal(keyMatches('abc12', 'abc123'), false);
  assert.equal(keyMatches('', 'abc123'), false);
  assert.equal(keyMatches('abc1234', 'abc123'), false);
});

test('rate limit allows 60 calls a minute per key, then refuses', () => {
  const key = `test-${Date.now()}`;
  for (let i = 0; i < 60; i++) assert.equal(takeToken(key), true, `call ${i + 1}`);
  assert.equal(takeToken(key), false);
  assert.equal(takeToken(`${key}-other`), true, 'a different key has its own budget');
});

test('synthesis and counterpositions are opt-in, and both are known text types', () => {
  assert.deepEqual([...OPT_IN_TEXT_TYPES].sort(), ['counterposition_summary', 'synthesis']);
  for (const t of OPT_IN_TEXT_TYPES) assert.ok(TEXT_TYPES.includes(t));
});

test('search text shows the fields a caller needs, and labels synthesis', () => {
  const text = renderSearch([
    {
      id: '11111111-1111-1111-1111-111111111111', author: 'Seneca', work: 'On Anger', section_label: 'Book I',
      locator: null, language: 'english', chunk_index: 4, text_type: 'primary', translator: 'Aubrey Stewart',
      edition_year: 1900, verification_status: null, paired_chunk_id: null, similarity: 0.6123, chunk_text: 'Anger is brief madness.',
    },
    {
      id: '22222222-2222-2222-2222-222222222222', author: 'Arete Synthesis', work: 'On Anger', section_label: null,
      locator: null, language: 'english', chunk_index: 0, text_type: 'synthesis', translator: null,
      edition_year: null, verification_status: ['unverified'], paired_chunk_id: null, similarity: 0.5, chunk_text: 'A note.',
    },
  ]);
  assert.match(text, /^1\. Seneca, On Anger, Book I \(tr\. Aubrey Stewart, 1900\) \[english, primary\]/);
  assert.match(text, /similarity 0\.61; id 11111111-1111-1111-1111-111111111111; chunk_index 4/);
  assert.match(text, /Anger is brief madness\./);
  assert.match(text, /Arete synthesis \(AI-assisted teaching material, not evidence/);
  assert.match(text, /verification_status: unverified/);
});

test('sources text totals the passages', () => {
  const text = renderSources([
    { author: 'Seneca', work: 'On Anger', language: 'english', text_type: 'primary', count: 112 },
    { author: 'Seneca', work: 'Letters', language: 'english', text_type: 'primary', count: 583 },
  ]);
  assert.match(text, /Seneca \| On Anger \| english \| primary \| 112/);
  assert.match(text, /2 sources, 695 passages/);
});

test('no em or en dashes in the MCP server source', () => {
  const src = require('fs').readFileSync(require.resolve('../routes/mcp'), 'utf8');
  assert.equal(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`).test(src), false);
});
