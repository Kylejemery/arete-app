const test = require('node:test');
const assert = require('node:assert');

// world-agent.js builds its Supabase client at load; these tests never call it.
process.env.SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test';
const { STOIC_AUTHORS, lensSettings, scoreRetrieval } = require('../world-agent');

const p = (author, similarity) => ({ author, similarity });

test('the lens is the four Stoics, and Cicero is not one of them', () => {
  assert.deepStrictEqual([...STOIC_AUTHORS], ['Seneca', 'Epictetus', 'Marcus Aurelius', 'Musonius Rufus']);
  assert.ok(!STOIC_AUTHORS.includes('Cicero'));
});

test('the seeded config keeps ten passages: two per Stoic plus two counterpoints', () => {
  const lens = lensSettings({ corpus_retrieval_count: 10 });
  assert.strictEqual(lens.perAuthor, 2);
  assert.strictEqual(lens.counterpoints, 2);
  assert.strictEqual(lens.authors.length * lens.perAuthor + lens.counterpoints, 10);
});

test('stored settings override the defaults', () => {
  const lens = lensSettings({ stoic_authors: ['Epictetus'], stoic_passages_per_author: 5, counterpoint_passages: 0 });
  assert.deepStrictEqual(lens.authors, ['Epictetus']);
  assert.strictEqual(lens.perAuthor, 5);
  assert.strictEqual(lens.counterpoints, 0);
});

test('a signal with no Stoic passages cannot be chosen over one with any', () => {
  assert.strictEqual(scoreRetrieval({ stoic: [] }, { category: 'conflict' }, {}), -1);
  assert.ok(scoreRetrieval({ stoic: [p('Seneca', 0.3)] }, { category: 'cultural' }, {}) > -1);
});

test('a collective problem outranks an equally well-answered signal', () => {
  const stoic = [p('Seneca', 0.6), p('Epictetus', 0.58)];
  const climate = scoreRetrieval({ stoic }, { category: 'environmental' }, {});
  const tech = scoreRetrieval({ stoic }, { category: 'technological' }, {});
  assert.ok(climate > tech);
});

test('a much closer Stoic fit still beats the collective-problem bonus', () => {
  const close = scoreRetrieval({ stoic: [p('Epictetus', 0.75), p('Seneca', 0.74)] }, { category: 'scientific' }, {});
  const weak = scoreRetrieval({ stoic: [p('Seneca', 0.45), p('Epictetus', 0.44)] }, { category: 'political' }, {});
  assert.ok(close > weak);
});
