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
