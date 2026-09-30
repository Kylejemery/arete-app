// server/tests/library-outline.test.js
//
// buildOutline's section-label path: digit ranges as before, and Roman
// numerals with an edition's part letters (Lutz's Musonius, Lectures I-XXI).
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildOutline } = require('../library');

const rows = (labels) => labels.map(section_label => ({ section_label, chunk_text: 'text' }));

test('Roman-numeral labels give one entry per lecture, on the right page', () => {
  // 30 rows per page: lecture III starts on row 31, so page 1.
  const labels = [...Array(29).fill('I'), 'II', 'II', 'III', 'III', 'XXI'];
  const { sections, source } = buildOutline(rows(labels), 'Lectures', 30);
  assert.equal(source, 'labels');
  assert.deepEqual(sections.map(s => [s.level, s.label, s.page, s.chunk]), [
    [1, 'Lecture I', 0, 0],
    [1, 'Lecture II', 0, 29],
    [1, 'Lecture III', 1, 31],
    [1, 'Lecture XXI', 1, 33],
  ]);
});

test('a part letter becomes the second level under its lecture', () => {
  const labels = ['XII', 'XIIIA', 'XIIIA', 'XIIIB', 'XIV'];
  const { sections } = buildOutline(rows(labels), 'Lectures', 30);
  assert.deepEqual(sections.map(s => [s.level, s.label]), [
    [1, 'Lecture XII'],
    [1, 'Lecture XIII'],
    [2, 'XIIIA'],
    [2, 'XIIIB'],
    [1, 'Lecture XIV'],
  ]);
});

test('digit labels are read as before', () => {
  const labels = ['front matter', '1.1–1.3', '1.4', '2.1', '2.1–2.2'];
  const { sections, source } = buildOutline(rows(labels), 'Meditations', 30);
  assert.equal(source, 'labels');
  assert.deepEqual(sections.map(s => [s.level, s.label]), [
    [1, 'Front matter'],
    [1, 'Book 1'],
    [2, '1.1'],
    [2, '1.4'],
    [1, 'Book 2'],
    [2, '2.1'],
  ]);
});

test('a single catalogue label is still not an outline', () => {
  const { sections, source } = buildOutline(rows(['Jowett', 'Jowett']), 'Meno', 30);
  assert.equal(source, 'text');
  assert.deepEqual(sections, []);
});
