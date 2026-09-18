// server/tests/consolidation-heuristic.test.js
//
// gradeTurn is the whole outcome decision for counselor conversations, and in
// practice the only signal the learning system has — the Evaluator covers
// socratic-proctor alone and that surface has almost no traffic. It is pure,
// so these run with no database.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

process.env.SUPABASE_URL = 'http://stub';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub';

// The agent reads .env and builds a client at module load; nothing here calls
// either. Stubbing both is what lets the suite run on a bare checkout.
const origLoad = Module._load;
Module._load = function (request) {
  if (request === '@supabase/supabase-js') return { createClient: () => ({ from: () => ({}) }) };
  if (request === 'dotenv') return { config: () => ({ parsed: {} }) };
  return origLoad.apply(this, arguments);
};

const { gradeTurn, sustainedRun } = require('../agents/consolidation-agent');

// --- fixture builder --------------------------------------------------------
const T0 = new Date('2026-09-18T10:00:00Z').getTime();
// Everything is settled unless a test says otherwise.
const SETTLED = new Date(T0 + 1000 * 60 * 60 * 24).toISOString();

// turns: [minutesFromStart, queryText]
const convo = (...turns) => turns.map(([min, query_text], i) => ({
  request_id: `r${i}`,
  student_id: 'u1',
  agent: 'counselor:epictetus',
  query_text,
  created_at: new Date(T0 + min * 60000).toISOString(),
}));

// Distinct topics: word overlap well under REPHRASE_JACCARD (0.45).
const Q = [
  'what does epictetus say about grief and loss',
  'how should anger be handled before a difficult meeting',
  'is ambition compatible with tranquillity in public life',
  'why do the stoics separate judgement from impression',
  'can courage be taught or only practised repeatedly',
];

test('a rewording of the same question is negative', () => {
  const c = convo([0, 'is the fear of death rational'], [5, 'is fear of death rational really']);
  assert.deepEqual(gradeTurn(c, 0, SETTLED), { outcome: 'student_negative', score: 0.2 });
});

test('a single follow-up on a new topic stays neutral at 0.5', () => {
  // One follow-up says only that the reader did not push back.
  const c = convo([0, Q[0]], [5, Q[1]]);
  assert.deepEqual(gradeTurn(c, 0, SETTLED), { outcome: 'student_neutral', score: 0.5 });
});

test('a sustained conversation climbs above the old flat ceiling', () => {
  const c = convo([0, Q[0]], [5, Q[1]], [10, Q[2]], [15, Q[3]], [20, Q[4]]);
  // depth 4 from turn 0, then 3, 2, 1 as the remaining run shortens.
  assert.deepEqual(gradeTurn(c, 0, SETTLED), { outcome: 'student_positive', score: 0.8 });
  assert.deepEqual(gradeTurn(c, 1, SETTLED), { outcome: 'student_positive', score: 0.7 });
  assert.deepEqual(gradeTurn(c, 2, SETTLED), { outcome: 'student_positive', score: 0.6 });
  assert.deepEqual(gradeTurn(c, 3, SETTLED), { outcome: 'student_neutral', score: 0.5 });
});

test('the ladder caps rather than running off the end', () => {
  const many = Array.from({ length: 12 }, (_, i) => [i * 3, `${Q[i % Q.length]} ${i}`]);
  const c = convo(...many);
  const graded = gradeTurn(c, 0, SETTLED);
  assert.equal(graded.outcome, 'student_positive');
  assert.equal(graded.score, 0.8, 'a very long run must not score above the engagement ceiling');
});

test('the ceiling leaves room for a real affirmation to outrank engagement', () => {
  const many = Array.from({ length: 12 }, (_, i) => [i * 3, `${Q[i % Q.length]} ${i}`]);
  assert.ok(gradeTurn(convo(...many), 0, SETTLED).score < 1.0);
});

test('a rewording later in the run cuts the run short', () => {
  // Turn 2 is reworded at turn 3, so the run from turn 0 is only 2 long.
  const c = convo([0, Q[0]], [5, Q[1]], [10, 'is the fear of death rational'],
                  [15, 'is fear of death rational really'], [20, Q[4]]);
  assert.deepEqual(gradeTurn(c, 0, SETTLED), { outcome: 'student_positive', score: 0.6 });
  assert.deepEqual(gradeTurn(c, 2, SETTLED), { outcome: 'student_negative', score: 0.2 });
});

test('a long gap ends the conversation rather than extending it', () => {
  const c = convo([0, Q[0]], [5, Q[1]], [200, Q[2]]);   // 195 min > the 45 min window
  // The gap cuts the run at turn 1, so turn 0 got a single follow-up, not a
  // sustained thread — the turn hours later belongs to a different sitting.
  assert.deepEqual(gradeTurn(c, 0, SETTLED), { outcome: 'student_neutral', score: 0.5 });
  assert.equal(gradeTurn(c, 1, SETTLED), null, 'the turn before a long gap is not evidence');
});

test('silence is not evidence either way', () => {
  const c = convo([0, Q[0]]);
  assert.equal(gradeTurn(c, 0, SETTLED), null, 'the last thing the reader said proves nothing');
});

test('a turn that has not settled is left for tomorrow', () => {
  const c = convo([0, Q[0]], [5, Q[1]]);
  const tooEarly = new Date(T0 - 60000).toISOString();
  assert.equal(gradeTurn(c, 0, tooEarly), null);
});

test('a run that may still be growing is not frozen at an undercount', () => {
  // Turn 0 has settled but the run reaches the newest turn, which has not.
  // Writes are insert-only, so labelling now would lock in a short run.
  const c = convo([0, Q[0]], [5, Q[1]], [10, Q[2]]);
  const midway = new Date(T0 + 6 * 60000).toISOString();
  assert.equal(gradeTurn(c, 0, midway), null, 'wait for the run to finish');
  assert.equal(sustainedRun(c, 0, midway).ended, false);
  assert.equal(sustainedRun(c, 0, SETTLED).ended, true);
});

test('scores stay inside what the outcome column and the edge EMA expect', () => {
  const c = convo([0, Q[0]], [5, Q[1]], [10, Q[2]], [15, Q[3]]);
  const allowed = new Set(['student_negative', 'student_neutral', 'student_positive']);
  for (let i = 0; i < c.length; i++) {
    const g = gradeTurn(c, i, SETTLED);
    if (!g) continue;
    assert.ok(allowed.has(g.outcome), `${g.outcome} must be in the response_outcomes check constraint`);
    assert.ok(g.score > 0 && g.score <= 1, `${g.score} out of range`);
  }
});
