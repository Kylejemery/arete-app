// server/tests/scroll-json.test.js
//
// Reading a scroll's { title, body } from a web_search reply, built from the
// content-block shapes the Messages API returns when the model searches.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { readScrollJson } = require('../lib/scroll-json');

const SCROLL = { title: 'The Citadel Within', body: 'First paragraph.\n\nSecond, with {braces} and "quotes".' };
const json = JSON.stringify(SCROLL);
const text = (t) => ({ type: 'text', text: t });
const search = [
  { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'q' } },
  { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: [] },
];

test('a sentence before searching no longer hides the JSON', () => {
  const content = [text('Let me find some current research on this.'), ...search, text(json)];
  // The old reader took the first text block, which is not JSON.
  assert.throws(() => JSON.parse(content[0].text));
  const { scroll, diag } = readScrollJson(content, 'end_turn');
  assert.deepEqual(scroll, SCROLL);
  assert.equal(diag.first_text_starts_json, false);
  assert.deepEqual(diag.blocks, { text: 2, server_tool_use: 1, web_search_tool_result: 1 });
});

test('a plain single block still parses, fenced or not', () => {
  assert.deepEqual(readScrollJson([text(json)], 'end_turn').scroll, SCROLL);
  assert.deepEqual(readScrollJson([text('```json\n' + json + '\n```')], 'end_turn').scroll, SCROLL);
});

test('JSON split across text blocks (citations) is joined', () => {
  const mid = Math.floor(json.length / 2);
  const content = [text(json.slice(0, mid)), text(json.slice(mid))];
  assert.deepEqual(readScrollJson(content, 'end_turn').scroll, SCROLL);
});

test('the last object with a title and body wins over earlier braces', () => {
  const content = [text('A note {not json} and {"query": "stoic research"}.'), ...search, text('Here it is:\n' + json + '\nDone.')];
  assert.deepEqual(readScrollJson(content, 'end_turn').scroll, SCROLL);
});

test('a truncated reply returns null with the stop reason in diag, and no text', () => {
  const content = [text('Searching first.'), ...search, text(json.slice(0, 30))];
  const { scroll, diag } = readScrollJson(content, 'max_tokens');
  assert.equal(scroll, null);
  assert.equal(diag.stop_reason, 'max_tokens');
  assert.equal(diag.json_objects, 0);
  assert.ok(!JSON.stringify(diag).includes('Searching'));
});

test('missing or empty content returns null', () => {
  assert.equal(readScrollJson(undefined).scroll, null);
  assert.equal(readScrollJson([]).scroll, null);
  assert.equal(readScrollJson([text('{"title": "x", "body": ""}')]).scroll, null);
});
