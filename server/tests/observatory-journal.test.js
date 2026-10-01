const test = require('node:test');
const assert = require('node:assert');
const { firstSentence, clip, readMinutes, toJournalEntry, sortJournal, KINDS } = require('../lib/observatory-journal');

test('the journal covers the five Observatory kinds', () => {
  assert.deepStrictEqual([...KINDS], ['tension', 'inquiry', 'dream', 'convergence', 'world']);
});

test('first sentence, clip and reading time', () => {
  assert.strictEqual(firstSentence('One thing.  Then another.'), 'One thing.');
  assert.strictEqual(clip('Does it *break* the self?'), 'Does it break the self?');
  assert.ok(clip('word '.repeat(100), 40).endsWith('…'));
  assert.strictEqual(readMinutes(''), 1);
  assert.strictEqual(readMinutes('w '.repeat(1000)), 5);
});

test('an inquiry leads with its pursuit, not its provenance', () => {
  const e = toJournalEntry('inquiry', {
    id: 'i1', question: 'Can wisdom be used by others?',
    question_origin: 'Seeded by Plato (The Republic); Aesop (Fables).',
    pursuit_text: 'The question splits in two. More follows.',
    source_authors: ['Plato', 'Aesop'], reviewed_at: '2026-09-28T00:00:00Z',
  });
  assert.strictEqual(e.dek, 'The question splits in two.');
  assert.strictEqual(e.title, 'Can wisdom be used by others?');
  assert.strictEqual(e.publishedAt, '2026-09-28T00:00:00Z');
});

test('a tension names its two poles as its voices', () => {
  const e = toJournalEntry('tension', {
    id: 't1', title: 'The greatness that shrinks you', tension_statement: 'They agree. Then they part.',
    position_a: { author: 'Epictetus', position_summary: 'a' }, position_b: { author: 'Seneca', position_summary: 'b' },
    source_authors: ['Cicero'], reviewed_at: '2026-10-01T00:00:00Z',
  });
  assert.deepStrictEqual(e.authors, ['Epictetus', 'Seneca']);
  assert.strictEqual(e.dek, 'They agree.');
});

test('convergences date from creation, dreams carry the star', () => {
  assert.strictEqual(toJournalEntry('convergence', { id: 'c', title: 'T', created_at: '2026-09-01T00:00:00Z' }).publishedAt, '2026-09-01T00:00:00Z');
  assert.strictEqual(toJournalEntry('dream', { id: 'd', content: 'x', status: 'starred' }).starred, true);
  assert.strictEqual(toJournalEntry('dream', { id: 'd', content: 'x' }).title, 'A thought from the corpus');
});

test('a world headline is the first sentence of the signal', () => {
  const e = toJournalEntry('world', { id: 'w', dominant_signal: 'A study found X. It also noted Y.', corpus_response: 'The Stoics answer.' });
  assert.strictEqual(e.title, 'A study found X.');
});

test('a row with no headline or an unknown kind is left out', () => {
  assert.strictEqual(toJournalEntry('tension', { id: 't', title: '  ' }), null);
  assert.strictEqual(toJournalEntry('essay', { id: 'e', title: 'x' }), null);
  assert.strictEqual(toJournalEntry('world', null), null);
});

test('newest first, undated last', () => {
  const out = sortJournal([
    { id: 'a', publishedAt: '2026-09-01T00:00:00Z' },
    { id: 'b', publishedAt: null },
    { id: 'c', publishedAt: '2026-10-01T00:00:00Z' },
  ]);
  assert.deepStrictEqual(out.map(e => e.id), ['c', 'a', 'b']);
});
