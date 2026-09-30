// server/tests/author-mentions.test.js
//
// Named-author detection and the primary-text reservation the parallel
// Cabinet applies after its general corpus search.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  RESERVED_MIN_SIMILARITY,
  detectNamedAuthors,
  getPrimaryAuthors,
  reserveNamedPrimary,
  withinTimeout,
} = require('../lib/author-mentions');

// The primary authors on the shelf as of 2026-09-30.
const SHELF = [
  'Adam Smith', 'Aesop', 'Antipater of Tarsus', 'Aristotle', 'Augustine', 'Cicero',
  'Cleanthes', 'Confucius', 'Diogenes Laërtius', 'Epictetus', 'Gellius', 'Laozi',
  'Marcus Aurelius', 'Michel de Montaigne', 'Musonius Rufus', 'Plato', 'Plutarch',
  'Seneca', 'Sun Tzu', 'Xenophon', 'Zeno of Citium',
];

test('finds an author by full name or by one distinctive name word', () => {
  assert.deepEqual(detectNamedAuthors('What does Marcus Aurelius say about the present moment?', SHELF), ['Marcus Aurelius']);
  assert.deepEqual(detectNamedAuthors('what would aurelius do', SHELF), ['Marcus Aurelius']);
  assert.deepEqual(detectNamedAuthors('Did Musonius teach women philosophy?', SHELF), ['Musonius Rufus']);
  assert.deepEqual(detectNamedAuthors('Zeno on the passions', SHELF), ['Zeno of Citium']);
});

test('folds accents and knows the listed variant spellings', () => {
  assert.deepEqual(detectNamedAuthors('Diogenes Laertius on Chrysippus', SHELF), ['Diogenes Laërtius']);
  assert.deepEqual(detectNamedAuthors('What does Lao Tzu mean by wu wei?', SHELF), ['Laozi']);
});

test('does not fire on stop words, short name words or substrings; Sun Tzu only in full', () => {
  assert.deepEqual(detectNamedAuthors('Adam asked about the sun and the tao', SHELF), []);
  assert.deepEqual(detectNamedAuthors('a platonic friendship', SHELF), []);
  assert.deepEqual(detectNamedAuthors('what is the art of war, as Sun Tzu wrote', SHELF), ['Sun Tzu']);
});

test('returns named authors in the order the question names them, at most two', () => {
  assert.deepEqual(
    detectNamedAuthors('Compare Seneca, Epictetus and Marcus on anger', SHELF),
    ['Seneca', 'Epictetus'],
  );
  assert.deepEqual(detectNamedAuthors('', SHELF), []);
  assert.deepEqual(detectNamedAuthors('Seneca', null), []);
});

const row = (id, author, text_type, similarity) => ({ id, author, text_type, similarity });
const general = [
  row('g1', 'Massimo Pigliucci', 'paper_summary', 0.64),
  row('g2', 'Arete (AI-assisted)', 'synthesis', 0.61),
  row('g3', 'John C. Joy', 'scholarship', 0.60),
  row('g4', 'W.L. Davidson', 'scholarship', 0.58),
  row('g5', 'John C. Joy', 'scholarship', 0.57),
  row('g6', 'Seneca', 'primary', 0.55),
  row('g7', 'Plutarch', 'primary', 0.54),
];

test('reserves the named author\'s primary rows by trimming the bottom of the general rows', () => {
  const named = [row('m1', 'Marcus Aurelius', 'primary', 0.53), row('m2', 'Marcus Aurelius', 'primary', 0.52)];
  const out = reserveNamedPrimary(general, named, 7);
  assert.equal(out.length, 7);
  assert.deepEqual(out.map(r => r.id), ['g1', 'g2', 'g3', 'g4', 'g5', 'm1', 'm2']);
});

test('counts primary rows the general search already holds, and never duplicates', () => {
  const withMarcus = [...general.slice(0, 6), row('m1', 'Marcus Aurelius', 'primary', 0.53)];
  const named = [row('m1', 'Marcus Aurelius', 'primary', 0.53), row('m2', 'Marcus Aurelius', 'primary', 0.52)];
  const out = reserveNamedPrimary(withMarcus, named, 7);
  assert.equal(out.length, 7);
  assert.equal(out.filter(r => r.id === 'm1').length, 1);
  assert.ok(out.some(r => r.id === 'm2'));
  // m1 was held by the general search; the trim spared it and dropped g6.
  assert.deepEqual(out.map(r => r.id), ['g1', 'g2', 'g3', 'g4', 'g5', 'm1', 'm2']);
});

test('reserves nothing below the similarity floor, outside the fence, or not primary', () => {
  const named = [
    row('weak', 'Adam Smith', 'primary', RESERVED_MIN_SIMILARITY - 0.01),
    row('fenced', 'Marcus Aurelius', 'primary', 0.6),
    row('commentary', 'Marcus Aurelius', 'scholarship', 0.6),
  ];
  const out = reserveNamedPrimary(general, named, 7, { fence: r => r.id !== 'fenced' });
  assert.deepEqual(out, general);
});

test('caps each author at perAuthor and the whole list at total', () => {
  const named = [
    row('m1', 'Marcus Aurelius', 'primary', 0.53), row('m2', 'Marcus Aurelius', 'primary', 0.52),
    row('m3', 'Marcus Aurelius', 'primary', 0.51),
    row('s1', 'Seneca', 'primary', 0.56),
  ];
  const out = reserveNamedPrimary(general, named, 7);
  assert.equal(out.length, 7);
  assert.equal(out.filter(r => r.author === 'Marcus Aurelius').length, 2);
  // Seneca already had g6; s1 makes two.
  assert.equal(out.filter(r => r.author === 'Seneca').length, 2);
  assert.ok(!out.some(r => r.id === 'm3'));
});

test('with no named rows the general rows pass through unchanged', () => {
  assert.deepEqual(reserveNamedPrimary(general, [], 7), general);
  assert.deepEqual(reserveNamedPrimary([], [], 7), []);
});

test('getPrimaryAuthors lists each author with primary text once', async () => {
  const shelf = [
    { author: 'Marcus Aurelius', text_type: 'primary' },
    { author: 'Marcus Aurelius', text_type: 'primary' },
    { author: 'John C. Joy', text_type: 'scholarship' },
  ];
  const ok = { rpc: async () => ({ data: shelf, error: null }) };
  assert.deepEqual(await getPrimaryAuthors(ok), ['Marcus Aurelius']);
});

test('withinTimeout passes a fast search through and drops a slow or failed one', async () => {
  const fast = Promise.resolve({ data: [{ id: 'a' }], error: null });
  assert.deepEqual(await withinTimeout(fast, 50), { data: [{ id: 'a' }], error: null });
  const slow = new Promise((resolve) => setTimeout(() => resolve({ data: [{ id: 'b' }], error: null }), 200));
  const out = await withinTimeout(slow, 20);
  assert.deepEqual(out.data, []);
  assert.ok(out.error);
  const failed = await withinTimeout(Promise.reject(new Error('network')), 50);
  assert.deepEqual(failed, { data: [], error: { message: 'network' } });
});
