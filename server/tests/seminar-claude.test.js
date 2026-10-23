// The Seminar Track's streamed model call (server/seminar/claude.js): the
// stream is read into the reply the agents parse, and a reply that stopped
// short says why instead of failing as "returned no units".
//
//   cd server && node --test tests/seminar-claude.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { callClaudeStream, readReply } = require('../seminar/claude');
const S = require('../seminar/syllabus');
const { fakeDb } = require('./helpers/fake-supabase');

// A fetch that answers with the given server-sent events, split into small
// chunks so events cross chunk boundaries.
function sseFetch(events, seen) {
  return async (url, init) => {
    seen.push(JSON.parse(init.body));
    const body = events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
    const bytes = new TextEncoder().encode(body);
    async function* chunks() { for (let i = 0; i < bytes.length; i += 37) yield bytes.slice(i, i + 37); }
    return { ok: true, body: chunks() };
  };
}

const stream = (stopReason, extra = {}) => [
  { type: 'message_start', message: { usage: { input_tokens: 1200 } } },
  { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'weighing the laws' } },
  { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '{"units": [{"unit_' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'number": 1}]}' } },
  { type: 'message_delta', delta: { stop_reason: stopReason, ...extra }, usage: { output_tokens: 900 } },
  { type: 'message_stop' },
];

test('the stream is read into text blocks; thinking is left out; effort and streaming are sent', async () => {
  const realFetch = global.fetch; const realKey = process.env.CLAUDE_API_KEY;
  const seen = [];
  global.fetch = sseFetch(stream('end_turn'), seen);
  process.env.CLAUDE_API_KEY = 'test';
  try {
    const r = await callClaudeStream({ model: 'claude-opus-5-5', system: 's', userPrompt: 'u', maxTokens: 64000, effort: 'high' });
    assert.deepEqual(r.content, [{ type: 'text', text: '{"units": [{"unit_number": 1}]}' }]);
    assert.equal(r.stop_reason, 'end_turn');
    assert.equal(r.usage.output_tokens, 900);
    assert.equal(seen[0].stream, true);
    assert.equal(seen[0].max_tokens, 64000);
    assert.deepEqual(seen[0].output_config, { effort: 'high' });
  } finally { global.fetch = realFetch; process.env.CLAUDE_API_KEY = realKey; }
});

test('a reply cut off by max_tokens, or declined, says so', () => {
  assert.throws(() => readReply({ content: [{ type: 'text', text: '{"units": [' }], stop_reason: 'max_tokens', usage: { output_tokens: 16000 } }, 'the syllabus agent'),
    /the syllabus agent ran out of output budget \(16000 output tokens, thinking included\)/);
  assert.throws(() => readReply({ content: [], stop_reason: 'refusal', stop_details: { category: 'cyber' } }, 'the draft agent'),
    /the draft agent: the model declined \(cyber\)/);
  assert.equal(readReply({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' }, 'x'), 'ok');
});

test('the syllabus run reports why it failed instead of "returned no units"', async () => {
  const tables = {
    research_sources: [], research_source_sections: [],
  };
  const db = fakeDb(tables, { seminar_corpus_catalog: () => [] });
  const course = { id: 'sem-801', title: 'T', stance: 'counterposition', tier_required: 'scholar', source_works: [] };
  const cut = async () => ({ content: [{ type: 'text', text: '{"units": [{"unit_number": 1, "title": "The court' }], stop_reason: 'max_tokens', usage: { output_tokens: 64000 } });
  await assert.rejects(S.proposeSyllabus(db, course, { call: cut }), /ran out of output budget/);
  const prose = async () => ({ content: [{ type: 'text', text: 'I cannot design this course without the full text.' }], stop_reason: 'end_turn' });
  await assert.rejects(S.proposeSyllabus(db, course, { call: prose }), /returned no units\. It wrote: "I cannot design this course/);
});
