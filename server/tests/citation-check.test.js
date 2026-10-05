// server/tests/citation-check.test.js
//
// The server's check of a Cabinet reply against the passages of its turn.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { checkCitations, verbatimOverlap, OUTSIDE_MARK } = require('../lib/citation-check');

// Cases from the 2026-10-05 runs.
test('a tag that names no retrieved passage is replaced, visibly', () => {
  const r = checkCitations('A house should keep out the elements (Lectures XIX–XX).', ['[Musonius, Lecture XI, p. 81]']);
  assert.deepEqual(r.unmatched, ['(Lectures XIX–XX)']);
  assert.equal(r.text, `A house should keep out the elements ${OUTSIDE_MARK}.`);
});

test('retrieved tags, their prefixes, and shortened forms are left alone', () => {
  const tags = ['[DL 7.180–7.183]', '[Musonius, Lecture XI, p. 81]', '[Plut. Cat. Min. 5]'];
  const text = 'He wrote 500 lines a day [DL 7.180]. Farming suits a philosopher (Lectures XI). Cato walked [Plut. Cat. Min. 5].';
  const r = checkCitations(text, tags);
  assert.deepEqual(r.unmatched, []);
  assert.equal(r.text, text);
});

test('dates and asides in parentheses are never rewritten', () => {
  const text = 'Seneca died (AD 65) at Nero\'s order; Zeno came to Athens (c. 300 BC) and taught (about 2 hours a day, by one report).';
  assert.equal(checkCitations(text, []).text, text);
});

test('a bracketed tag with nothing retrieved is replaced', () => {
  const r = checkCitations('Chrysippus ran long distances [DL 7.179].', []);
  assert.deepEqual(r.unmatched, ['[DL 7.179]']);
});

const PLUTARCH = 'He built up his body by vigorous exercises, accustoming himself to endure both heat and snow with uncovered head, and to journey on foot at all seasons, without a vehicle.';

test('a passage copied word for word without quotation marks is flagged', () => {
  const reply = `Plutarch gives us this. ${PLUTARCH} That is the man.`;
  const f = verbatimOverlap(reply, [{ tag: '[Plut. Cat. Min. 5]', text: `Cato returned to his discipline. ${PLUTARCH} Friends rode horses.` }]);
  assert.equal(f.length, 1);
  assert.equal(f[0].quoted, false);
  assert.ok(f[0].words >= 20);
});

test('the same words quoted and tagged pass', () => {
  const reply = `Plutarch writes, "${PLUTARCH}" [Plut. Cat. Min. 5]. That is the man.`;
  assert.deepEqual(verbatimOverlap(reply, [{ tag: '[Plut. Cat. Min. 5]', text: PLUTARCH }]), []);
});

test('quoted but untagged is still flagged', () => {
  const reply = `Plutarch writes, "${PLUTARCH}" That is the man.`;
  const f = verbatimOverlap(reply, [{ tag: '[Plut. Cat. Min. 5]', text: PLUTARCH }]);
  assert.equal(f.length, 1);
  assert.equal(f[0].tagged, false);
});

test('a paraphrase sharing a few words is not flagged', () => {
  const reply = 'Cato trained his body hard, went bareheaded in heat and snow, and walked everywhere rather than ride [Plut. Cat. Min. 5].';
  assert.deepEqual(verbatimOverlap(reply, [{ tag: '[Plut. Cat. Min. 5]', text: PLUTARCH }]), []);
});
