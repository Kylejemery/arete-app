// server/tests/eval-cabinet-citations.test.js
//
// The detector behind the Cabinet citation eval.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { checkResponse } = require('../scripts/eval-cabinet-citations');

test('flags the fabricated detail that started this', () => {
  const f = checkResponse('Chrysippus walked forty miles a day.', ['[DL 7.179]']);
  assert.deepEqual(f.map(x => x.kind), ['untagged']);
});

test('a tagged claim passes, and so does one marked outside the library', () => {
  assert.deepEqual(checkResponse('Diogenes Laertius says Chrysippus practised as a long-distance runner (DL 7.179).', ['[DL 7.179]']), []);
  assert.deepEqual(checkResponse('Plutarch reports, though it is not in our library, that Cato went barefoot.', []), []);
});

test('a tag that was never retrieved is flagged as invented', () => {
  const f = checkResponse('Cato marched through the desert on foot (Plut. Cat. Min. 56.4).', ['[Seneca, Ep. 104]']);
  assert.deepEqual(f.map(x => x.kind), ['invented']);
});

test('a cited prefix of a retrieved range counts as retrieved', () => {
  assert.deepEqual(checkResponse('Zeno taught walking up and down the Stoa (DL 7.5).', ['[DL 7.5–7.8]']), []);
});

test('advice with no figure and no detail is left alone', () => {
  assert.deepEqual(checkResponse('Start small and be honest with yourself.', []), []);
});

test('a voice that errored is a failure, never a clean pass', () => {
  const { report } = require('../scripts/eval-cabinet-citations');
  const r = report([{ prompt: { id: 'x', text: 'x' }, retrievedTags: [], voices: [{ name: 'Marcus Aurelius', text: 'The connection to Marcus Aurelius was interrupted. Try again.', error: 'Claude API 400' }] }]);
  assert.equal(r.failed, 1);
  assert.match(r.markdown, /Failed prompts or voices: 1/);
});

// Cases from the first live run, 2026-10-05.
test('a tag in square brackets counts, and its dots do not split the sentence', () => {
  assert.deepEqual(checkResponse('Diocles reports an old woman saying Chrysippus wrote 500 lines a day [DL 7.180].', ['[DL 7.180–7.183]']), []);
  assert.deepEqual(checkResponse('Cato walked while his companions rode [Plut. Cat. Min. 5].', ['[Plut. Cat. Min. 5]']), []);
});

test('a shortened tag naming a retrieved place is not invented', () => {
  assert.deepEqual(checkResponse('Musonius said farming suits a philosopher (Lectures XI).', ['[Musonius, Lecture XI, p. 81]']), []);
  const f = checkResponse('Musonius said farming suits a philosopher (Lectures XIV).', ['[Musonius, Lecture XI, p. 81]']);
  assert.deepEqual(f.map(x => x.kind), ['invented']);
});

test('a sentence that goes on about the named figure is checked too', () => {
  const f = checkResponse('Seneca was wealthy. He wrote openly that he was still "in the deep waters of wickedness."', []);
  assert.deepEqual(f.map(x => x.kind), ['untagged']);
});

test('a reply that never repeats the name is still about the figure the question named', () => {
  const reply = 'He practiced it, in a limited way. He wrote openly that he was still "in the deep waters of wickedness."';
  assert.deepEqual(checkResponse(reply, [], false), []);
  assert.deepEqual(checkResponse(reply, [], true).map(x => x.kind), ['untagged']);
});
