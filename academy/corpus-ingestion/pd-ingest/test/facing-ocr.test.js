// pd-ingest/test/facing-ocr.test.js
//
// The facing-page parser against a small synthetic scan, and the Lutz
// Musonius (musonius-lectures-lutz-1947) against its committed OCR text:
// the admission checks asked for on 2026-09-29, runnable offline.
//
//   cd academy/corpus-ingestion && node --test pd-ingest/test/

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parse } = require('../parsers/facing-ocr');
const { build } = require('../build');
const { getLocal } = require('../fetch');
const { SOURCES } = require('../sources');

const OPTIONS = {
  firstPage: 3,
  translationHead: /^ENGLISH HEAD\b/,
  originalHead: /GREEK HEAD/,
  originalOpening: /^ΛΟΓΟΣ/,
  sections: [
    { cite: 'I', heading: /^ON PROOFS$/ },
    { cite: 'II', heading: /^ON VIRTUE$/ },
  ],
};

const SCAN = [
  'ΛΟΓΟΣ',
  'λόγου δέ ποτε γενομένου περὶ ἀποδείξεων',
  '',
  'I',
  'ON PROOFS',
  '',
  'Once when discussion turned upon proofs, he said that there was no',
  'sense in seeking many. The physician who pre-',
  'scribes many drugs deserves less praise.',
  'ἔφη, ἐπαινετὸς ὁ φάρμακα πολλὰ προσφέρων',
  '',
  '10',
  '15',
  '',
  '4 GREEK HEAD',
  'ὁ δι ὀλίγων ὧν προσφέρει λόγου ἀξίως ὠφελῶν',
  '22 The incident is related in Diogenes Laertius. Cf. Lives VII.',
  '',
  'ENGLISH HEAD 5',
  'The pupil too, the quicker his intelligence, the fewer proofs he will',
  'require.',
  '30 Odyssey IV, 611. Cf. the note above.',
  'more of the note',
  '',
  '6 GREEK HEAD',
  'πάντες φύσει πεφύκαμεν',
  '',
  'ENGLISH HEAD 7',
  'ON VIRTUE',
  'All of us, he used to say, are so fashioned by nature that we can live',
  'our lives free from error.',
].join('\n');

test('facing-ocr keeps the translation and drops the original, notes, heads and margin numbers', () => {
  const r = parse(SCAN, OPTIONS);
  assert.deepEqual(r.reasons, []);
  // A page that ends on a full sentence ends the paragraph.
  assert.deepEqual(r.sections.map((s) => [s.cite, s.pages]), [['I.1', ['3']], ['I.2', ['5']], ['II.1', ['7']]]);
  assert.equal(r.sections[0].text,
    'Once when discussion turned upon proofs, he said that there was no sense in seeking many. The physician who prescribes many drugs deserves less praise.');
  assert.equal(r.sections[1].text, 'The pupil too, the quicker his intelligence, the fewer proofs he will require.');
  const all = r.sections.map((s) => s.text).join(' ');
  assert.doesNotMatch(all, /[Ͱ-Ͽἀ-῿]|HEAD|Cf\.|Odyssey|note/);
});

test('facing-ocr marks a listed gap and never joins across it, and refuses a fix that does not match', () => {
  const r = parse(SCAN, {
    ...OPTIONS,
    gaps: [{ after: 'The physician who pre-', note: 'lost line' }],
    fixes: [[/prescribes/g, 'X', 'will not match once the gap splits the word']],
  });
  assert.match(r.sections[0].text, /The physician who pre \[…\] scribes/);
  assert.equal(r.sections[0].gap, 'lost line');
  assert.deepEqual(r.reasons, ['listed OCR fix never applied: will not match once the gap splits the word']);
});

test('facing-ocr cuts a long paragraph at sentence ends and keeps each piece its own pages', () => {
  // One paragraph over two pages: no sentence end at the foot of page 3.
  const scan = SCAN.replace('deserves less praise.', 'deserves less praise, and so')
    .replace('The pupil too, the quicker', 'the pupil too. The quicker');
  const r = parse(scan, { ...OPTIONS, maxSectionWords: 20 });
  const one = r.sections.filter((s) => s.parent === 'I');
  assert.deepEqual(one.map((s) => s.pages), [['3'], ['3', '5'], ['5']]);
  assert.ok(one.every((s) => /[.?!]$/.test(s.text)));
});

// ---- Lutz, Musonius Rufus: the admission checks of 2026-09-29 ------------

const LUTZ = SOURCES.find((s) => s.slug === 'musonius-lectures-lutz-1947');
const lutz = build(LUTZ, LUTZ.localFiles.map((n) => getLocal(LUTZ.slug, n)));
const body = lutz.ok ? lutz.chunks.filter((c) => c.kind === 'body') : [];

test('Lutz builds from the committed OCR text, whose hash is the one Kyle attached', () => {
  assert.deepEqual(lutz.reasons, []);
  assert.equal(getLocal(LUTZ.slug, LUTZ.localFiles[0]).sha256, '723f09745288948f305b771ad259214a8fd31899a8f4e6ffac3bb6d92b263b49');
});

test('Lutz: 23 section labels, I to XXI with XIIIA/B and XVIIIA/B, in order', () => {
  const labels = [...new Set(body.map((c) => c.section_label))];
  assert.deepEqual(labels, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIIIA', 'XIIIB',
    'XIV', 'XV', 'XVI', 'XVII', 'XVIIIA', 'XVIIIB', 'XIX', 'XX', 'XXI']);
});

test('Lutz: no chunk holds Greek, the running head, or a note ("Cf.")', () => {
  for (const c of body) assert.doesNotMatch(c.chunk_text, /[Ͱ-Ͽἀ-῿]|CORA E\. LUTZ|MUSONIUS RUFUS|Cf\./, c.locator);
});

test('Lutz: each test phrase is found once, in the lecture it belongs to', () => {
  for (const [phrase, lecture] of [
    ['cheese, and honey', 'XVIIIA'],
    ['I would choose sickness rather than luxury', 'XX'],
    ['Theory which teaches how one should act', 'V'],
    ['Phocion', 'X'],
  ]) {
    assert.deepEqual([...new Set(body.filter((c) => c.chunk_text.includes(phrase)).map((c) => c.section_label))], [lecture], phrase);
  }
});

test('Lutz: the lines the OCR lost are filled from the page images, and no chunk is marked damaged', () => {
  for (const c of body) assert.doesNotMatch(c.chunk_text, /\[…\]/, c.locator);
  for (const [phrase, lecture] of [
    // VIII, p. 67 (image 17)
    ['you may understand from this. The attribute of a kingly person', 'VIII'],
    ['helpful, and humane. Could anyone be found more fit', 'VIII'],
    ['such a man? No one. Even if he does not have many subjects', 'VIII'],
    ['skilled in horsemanship. And so the title of kingly person', 'VIII'],
    ['grateful for what he said and added, “In return', 'VIII'],
    // XVI, p. 107 (image 37): the OCR's clipped margin
    ['your father will restrain you', 'XVI'],
    ['for we do not study philosophy with our hands', 'XVI'],
    ['from using it nor from thinking', 'XVI'],
    ['long hair nor deviate from the ordinary', 'XVI'],
    // XVIIIA, p. 113 (image 40)
    ['can nourish man well, and also food (other than flesh)', 'XVIIIA'],
    ['meat was a less civilized kind of food', 'XVIIIA'],
    ['as it seemed to Heraclitus when he said, “The clear dry soul is wisest and best.” But now, he said', 'XVIIIA'],
    ['much worse than the unreasoning brutes', 'XVIIIA'],
  ]) {
    assert.deepEqual([...new Set(body.filter((c) => c.chunk_text.includes(phrase)).map((c) => c.section_label))], [lecture], phrase);
  }
  // No chunk overrides the source's quality with its own 'poor' or 'fair'.
  for (const c of body) assert.ok(!['poor', 'fair'].includes(c.ocr_quality), c.locator);
});

test('Lutz: every chunk is cited by lecture and printed page, and none crosses a lecture', () => {
  for (const c of body) {
    assert.match(c.locator, /^[IVX]+[AB]?, pp?\. \d+(–\d+)?$/);
    assert.ok(c.locator.startsWith(`${c.section_label}, `));
  }
});
