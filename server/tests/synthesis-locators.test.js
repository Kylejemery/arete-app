// The quotation check (synthesis/locators.js), against the two errors the
// first Stoic Life draft (2026-10-02) shipped with and against citations it
// got right. Passage excerpts are the corpus text.
//
//   cd server && node --test tests/synthesis-locators.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../synthesis/locators');

const passages = [
  {
    author: 'Marcus Aurelius', work: 'Meditations', section_label: '10.12',
    chunk_text: 'And if thou seest clear, go by this way content, without turning back; but if thou dost not see clear, stop and take the best advisers. But if any other things oppose thee, go on according to thy powers.',
  },
  {
    author: 'Marcus Aurelius', work: 'Meditations', section_label: '8.22',
    chunk_text: 'Attend to the matter which is before thee, whether it is an opinion or an act or a word.',
  },
  {
    author: 'Seneca', work: 'Letters', section_label: '109',
    chunk_text: '16. They say that men see farther in the affairs of others than in their own. A defect of character causes this.',
  },
  {
    author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VII', section_label: '7.92–7.95',
    chunk_text: 'And wisdom they define as the knowledge of things good and evil and of what is neither good nor evil; courage as knowledge of what we ought to choose, what we ought to beware of, and what is indifferent.',
  },
];

test('the first draft\'s wrong section number is caught: 8.22 for a passage at 10.12', () => {
  const text = 'Marcus Aurelius gives the same counsel with characteristic directness: "if thou seest clear, go by this way content, without turning back; but if thou dost not see clear, stop and take the best advisers" (Marcus Aurelius, Meditations 8.22). The instruction is not to take advice.';
  const f = L.checkQuotations(text, passages);
  assert.equal(f.length, 1);
  assert.equal(f[0].problem, 'wrong_locator');
  assert.match(f[0].detail, /Meditations 10\.12/);
});

test('the first draft\'s prose misattribution is caught: "Epictetus\'s instruction" quoting Marcus', () => {
  const text = 'The act of writing forces the classification. Epictetus\'s instruction to examine what is before you applies directly here: "attend to the matter which is before thee, whether it is an opinion or an act or a word" (Marcus Aurelius, Meditations 8.22, drawing on a common Stoic instruction).';
  const f = L.checkQuotations(text, passages);
  assert.equal(f.length, 1);
  assert.equal(f[0].problem, 'prose_attribution');
  assert.match(f[0].detail, /introduced as Epictetus/);
});

test('correct citations pass: a letter.section inside a letter label, a section inside a range', () => {
  const text = [
    'Self-love can narrow vision: "men see farther in the affairs of others than in their own" (Seneca, Letters 109.16).',
    'Diogenes Laërtius reports the definition: wisdom is "the knowledge of things good and evil and of what is neither good nor evil" (Diogenes Laërtius, Lives VII.92).',
    'Courage is "knowledge of what we ought to choose, what we ought to beware of, and what is indifferent" (Diogenes Laërtius, Lives VII.92).',
  ].join('\n\n');
  assert.deepEqual(L.checkQuotations(text, passages), []);
});

test('a quotation in no passage, and a citation to the wrong author', () => {
  const text = [
    'Seneca wrote that "the wise man is never troubled by anything at all" (Seneca, Letters 1).',
    'As Seneca put it, "men see farther in the affairs of others than in their own" (Marcus Aurelius, Meditations 4.3).',
  ].join('\n\n');
  const f = L.checkQuotations(text, passages);
  assert.deepEqual(f.map(x => x.problem), ['not_found', 'wrong_author']);
});

test('short quotes, unparseable labels and missing citations are skipped, never flagged', () => {
  const text = 'Some things are "preferred" and others "rejected". Marcus: "stop and take the best advisers" with no citation.';
  assert.deepEqual(L.checkQuotations(text, passages), []);
  const unlabelled = [{ ...passages[0], section_label: '' }];
  const cited = '"stop and take the best advisers" (Marcus Aurelius, Meditations 8.22).';
  assert.deepEqual(L.checkQuotations(cited, unlabelled), []);
});

test('an ellipsis splits a quotation into fragments that must each be found', () => {
  const text = 'He wrote: "if thou seest clear, go by this way content ... stop and take the best advisers" (Marcus Aurelius, Meditations 10.12).';
  assert.deepEqual(L.checkQuotations(text, passages), []);
});

test('locator parsing', () => {
  assert.deepEqual(L.citationLocator('Diogenes Laërtius, Lives VII.104-105'), [7, 104]);
  assert.deepEqual(L.citationLocator('Musonius Rufus, Lectures VI'), [6]);
  assert.deepEqual(L.parseLabelRange('On Clemency 1.10–On Clemency 1.11'), { start: [1, 10], end: [1, 11] });
  assert.equal(L.parseLabelRange(''), null);
  assert.equal(L.locatorInLabel([8, 22], '10.12'), false);
  assert.equal(L.locatorInLabel([109, 14], '109'), true);
  assert.equal(L.locatorInLabel([2, 6], '2.5–2.6'), true);
  assert.equal(L.locatorInLabel([6], 'VI'), true);
  assert.equal(L.locatorInLabel([6], ''), null);
});

test('a name the passage itself reports is not a misattribution (Posidonius in Diogenes Laertius)', () => {
  const dl = [{
    author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VII', section_label: '7.103–7.106',
    chunk_text: 'But Posidonius maintains that these things too are among goods.',
  }];
  const text = 'Posidonius, however, "maintains that these things too are among goods" (Diogenes Laërtius, Lives VII.103).';
  assert.deepEqual(L.checkQuotations(text, dl), []);
});
