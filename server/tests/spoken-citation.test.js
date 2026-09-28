// server/tests/spoken-citation.test.js
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spokenCitation, numberWords } = require('../lib/spoken-citation');

test('numbers are written out without hyphens', () => {
  assert.equal(numberWords(22), 'twenty two');
  assert.equal(numberWords(121), 'one hundred twenty one');
  assert.equal(numberWords(100), 'one hundred');
  assert.equal(numberWords(7), 'seven');
});

test('Diogenes Laertius 7.121, the acceptance test passage', () => {
  assert.equal(
    spokenCitation({ author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VII', locator: '7.121–7.123' }),
    'Diogenes Laertius, Lives of Eminent Philosophers, book seven, sections one hundred twenty one to one hundred twenty three',
  );
  assert.equal(
    spokenCitation({ author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VII', locator: '7.121' }),
    'Diogenes Laertius, Lives of Eminent Philosophers, book seven, section one hundred twenty one',
  );
});

test('Epictetus: book, chapter, section; translator suffix dropped', () => {
  assert.equal(
    spokenCitation({ author: 'Epictetus', work: 'Discourses (tr. Oldfather)', locator: '3.22' }),
    'Epictetus, Discourses, book three, chapter twenty two',
  );
  assert.equal(
    spokenCitation({ author: 'Epictetus', work: 'Discourses (tr. Oldfather)', locator: '3.22.1–3.22.8' }),
    'Epictetus, Discourses, book three, chapter twenty two, sections one to eight',
  );
  assert.equal(
    spokenCitation({ author: 'Epictetus', work: 'Discourses', locator: '3.22.95–3.23.2' }),
    'Epictetus, Discourses, book three, chapter twenty two, section ninety five to chapter twenty three, section two',
  );
});

test('Plutarch: Moralia page and letter', () => {
  assert.equal(
    spokenCitation({ author: 'Plutarch', work: 'On Listening to Lectures', locator: '37C–38A' }),
    'Plutarch, On Listening to Lectures, Moralia page thirty seven C to page thirty eight A',
  );
  assert.equal(
    spokenCitation({ author: 'Plutarch', work: 'On Listening to Lectures', locator: '47D–E' }),
    'Plutarch, On Listening to Lectures, Moralia page forty seven D to E',
  );
});

test('Gellius: book, chapter, paragraph', () => {
  assert.equal(
    spokenCitation({ author: 'Aulus Gellius', work: 'Attic Nights', locator: '1.26' }),
    'Aulus Gellius, Attic Nights, book one, chapter twenty six',
  );
  assert.equal(
    spokenCitation({ author: 'Aulus Gellius', work: 'Attic Nights', locator: '1.26.1–1.26.4' }),
    'Aulus Gellius, Attic Nights, book one, chapter twenty six, paragraphs one to four',
  );
});

test('an unreadable or missing locator gives author and work only, never a guess', () => {
  assert.equal(spokenCitation({ author: 'Cicero', work: 'Academica', locator: null }), 'Cicero, Academica');
  assert.equal(spokenCitation({ author: 'Cicero', work: 'Academica', locator: 'Preface' }), 'Cicero, Academica');
  assert.equal(spokenCitation({ author: 'Cicero', work: 'Academica', locator: '1.16–2' }), 'Cicero, Academica');
});
