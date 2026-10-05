// server/tests/citation-check.test.js
//
// The server's check of a Cabinet reply against the passages of its turn.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { checkCitations, verbatimOverlap, quoteVerbatim, enforceSourcing, OUTSIDE_MARK } = require('../lib/citation-check');

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

test('a narrower range inside a retrieved range is retrieved; one outside it, or in another work, is not', () => {
  const tags = ['[DL 7.180–7.183]', '[DL 7.177–7.180]'];
  assert.deepEqual(checkCitations('He wrote daily [DL 7.180–7.181].', tags).unmatched, []);
  assert.deepEqual(checkCitations('He wrote daily [DL 7.182].', tags).unmatched, []);
  assert.deepEqual(checkCitations('He wrote daily [DL 7.190].', tags).unmatched, ['[DL 7.190]']);
  assert.deepEqual(checkCitations('He wrote daily [Seneca, Ep. 7.181].', tags).unmatched, ['[Seneca, Ep. 7.181]']);
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

const CATO = [{ tag: '[Plut. Cat. Min. 5]', text: `Cato returned to his silence and discipline. ${PLUTARCH} Friends rode horses.` }];

test('the server quotes and tags a copied run, from the sentence it copies', () => {
  const reply = `Cato went back into silence and discipline. ${PLUTARCH} That is the man.`;
  const r = quoteVerbatim(reply, CATO);
  assert.equal(r.text, `Cato went back into silence and discipline. “${PLUTARCH}” [Plut. Cat. Min. 5] That is the man.`);
  assert.equal(r.quoted.length, 1);
  assert.deepEqual(verbatimOverlap(r.text, CATO), []);
});

test('a copied run already quoted gets only its tag', () => {
  const reply = `Plutarch writes, "${PLUTARCH}" That is the man.`;
  const r = quoteVerbatim(reply, CATO);
  assert.equal(r.text, `Plutarch writes, "${PLUTARCH}" [Plut. Cat. Min. 5] That is the man.`);
});

test('a quotation the reply opened inside the run stays whole', () => {
  const said = 'What a piece of good fortune it is for Italy that he is a boy; for if he were a man, I do not think we could get a single vote among the people.';
  const passages = [{ tag: '[Plut. Cat. Min. 2.1–5]', text: `Pompaedius set him down and said quietly to his friends: "${said}"` }];
  const reply = `Pompaedius finally set him down and said quietly to his friends: "${said}" What do you make of that?`;
  const r = quoteVerbatim(reply, passages);
  // The reply's own quotation closes first, then the outer one, then the tag.
  assert.ok(r.text.includes(`"${said}"” [Plut. Cat. Min. 2.1–5]`), r.text);
  assert.equal((r.text.match(/“/g) || []).length, 1);
  assert.deepEqual(verbatimOverlap(r.text, passages), []);
});

test('enforceSourcing quotes copied runs and still replaces invented tags', () => {
  const reply = `Cato went back into silence and discipline. ${PLUTARCH} He also ran marathons (Plut. Cat. Min. 90).`;
  const r = enforceSourcing(reply, CATO);
  assert.equal(r.quoted.length, 1);
  assert.deepEqual(r.unmatched, ['(Plut. Cat. Min. 90)']);
  assert.ok(r.text.endsWith(`He also ran marathons ${OUTSIDE_MARK}.`));
});

// Run 3, 2026-10-05: the model shortened a synthesis tag and set it in italics.
test('a shortened tag whose words are all in one retrieved tag is retrieved', () => {
  const tags = ['[Arete synthesis, unverified: Discipline as Second Nature: Practice, Hardship, and the Question of What Asceticism Is For]', '[Seneca, Ep. 18]'];
  assert.deepEqual(checkCitations('He set days apart [Arete synthesis, *Discipline as Second Nature*].', tags).unmatched, []);
  assert.deepEqual(checkCitations('He set days apart [Arete synthesis, Discipline as First Nature].', tags).unmatched, ['[Arete synthesis, Discipline as First Nature]']);
  assert.deepEqual(checkCitations('He wrote to Lucilius (Seneca, Ep. 104).', tags).unmatched, ['(Seneca, Ep. 104)']);
});

test('a wrong tag right after a copied quotation names the passage it came from', () => {
  const reply = `Plutarch writes, "${PLUTARCH}" (Plut. Cat. Min. 90) That is the man.`;
  const r = enforceSourcing(reply, CATO);
  assert.deepEqual(r.unmatched, ['(Plut. Cat. Min. 90)']);
  assert.ok(r.text.includes(`"${PLUTARCH}" [Plut. Cat. Min. 5] That is the man.`), r.text);
  assert.deepEqual(verbatimOverlap(r.text, CATO), []);
});

test('a reply with nothing copied is returned unchanged', () => {
  const reply = 'Cato trained hard and walked everywhere [Plut. Cat. Min. 5].';
  assert.deepEqual(enforceSourcing(reply, CATO), { text: reply, unmatched: [], quoted: [] });
});
