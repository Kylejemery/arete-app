// server/tests/library-language.test.js
//
// The Library reader's reading-language filter: only a work that mixes
// languages is filtered, and a failed lookup filters nothing.
//
//   cd server && npm test

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { readingLanguageFilter, withLanguage, _resetForTests } = require('../lib/library-language');

// library_works() rows as of 2026-09-30, trimmed.
const WORKS = [
  { author: 'Musonius Rufus', work: 'Lectures', chunk_count: 131, language: 'english', language_count: 85 },
  { author: 'Musonius Rufus', work: 'Minor Fragments', chunk_count: 4, language: 'ancient_greek', language_count: 4 },
  { author: 'Plato', work: 'Meno', chunk_count: 37, language: 'english', language_count: 37 },
];

function client(result) {
  const calls = [];
  return { calls, rpc: async (name) => { calls.push(name); return result; } };
}

beforeEach(() => _resetForTests());

test('a mixed-language work is filtered to its reading language', async () => {
  const db = client({ data: WORKS, error: null });
  assert.equal(await readingLanguageFilter(db, 'Musonius Rufus', 'Lectures'), 'english');
  assert.deepEqual(db.calls, ['library_works']);
});

test('a single-language work, Greek or English, gets no filter', async () => {
  const db = client({ data: WORKS, error: null });
  assert.equal(await readingLanguageFilter(db, 'Plato', 'Meno'), null);
  assert.equal(await readingLanguageFilter(db, 'Musonius Rufus', 'Minor Fragments'), null);
  assert.equal(await readingLanguageFilter(db, 'Nobody', 'Nothing'), null);
});

test('the lookup is cached, not repeated per request', async () => {
  const db = client({ data: WORKS, error: null });
  await readingLanguageFilter(db, 'Plato', 'Meno');
  await readingLanguageFilter(db, 'Musonius Rufus', 'Lectures');
  assert.equal(db.calls.length, 1);
});

test('a failed lookup filters nothing', async () => {
  const db = client({ data: null, error: { message: 'boom' } });
  assert.equal(await readingLanguageFilter(db, 'Musonius Rufus', 'Lectures'), null);
});

test('withLanguage adds the filter only when there is a language', () => {
  const seen = [];
  const q = { eq: (col, val) => { seen.push([col, val]); return q; } };
  assert.equal(withLanguage(q, null), q);
  assert.deepEqual(seen, []);
  withLanguage(q, 'english');
  assert.deepEqual(seen, [['language', 'english']]);
});
