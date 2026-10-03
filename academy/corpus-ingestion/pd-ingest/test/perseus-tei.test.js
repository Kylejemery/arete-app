// pd-ingest/test/perseus-tei.test.js — the Perseus TEI parser, against the
// real cached file of Perrin's Cato the Younger (data/raw/<slug>/, committed)
// and a small synthetic case for the quotation rules.
//
//   cd academy/corpus-ingestion && node --test pd-ingest/test/

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { build, parseFiles } = require('../build');
const { getLocal } = require('../fetch');
const tei = require('../parsers/perseus-tei');
const { SOURCES } = require('../sources');

const SLUG = 'plutarch-cato-minor-perrin-1919';
const source = SOURCES.find((s) => s.slug === SLUG);
const files = () => source.localFiles.map((n) => getLocal(SLUG, n));

test('quotations get their marks back; a quotation that runs on stays open', () => {
  const xml = `<TEI><text><body>
<div type="textpart" subtype="chapter" n="1">
<div type="textpart" subtype="section" n="1"><p>He said: <q type="spoken">Go, and say <q>no</q> to him.</q></p></div>
<div type="textpart" subtype="section" n="2"><p><q type="spoken" rend="merge">And come back.</q> Then he left.<note resp="editor">A note.</note></p></div>
</div></body></text></TEI>`;
  const r = tei.parse(xml);
  assert.deepEqual(r.sections.map((s) => s.cite), ['1.1', '1.2']);
  assert.equal(r.sections[0].text, 'He said: “Go, and say ‘no’ to him.');
  assert.equal(r.sections[1].text, '“And come back.” Then he left.');
  assert.deepEqual(r.notes, [{ id: 'note1', text: 'A note.', annotates: '1.2' }]);
});

test('Cato the Younger: 73 chapters, 318 sections, every word of the TEI body kept', () => {
  const parsed = parseFiles(source, files());
  assert.equal(new Set(parsed.sections.map((s) => s.parent)).size, 73);
  assert.equal(parsed.sections.length, 318);
  assert.deepEqual(parsed.reasons, []);
  const r = build(source, files());
  assert.ok(r.ok, r.reasons && r.reasons.join('; '));
  assert.equal(r.stats.bodyChunks, 103);
  assert.equal(r.stats.noteChunks, 77);
  const body = r.chunks.filter((c) => c.kind === 'body');
  assert.ok(body.every((c) => /^Plut\. Cat\. Min\. \d+(\.\d+(–\d+)?)?$/.test(c.locator)));
  assert.ok(body.every((c) => /^Chapter \d+(, sections? \d+(–\d+)?)?$/.test(c.section_label)));
  assert.ok(body.every((c) => !/[<>\u0002\u0003\u0004]/.test(c.chunk_text)));
  assert.ok(!body.some((c) => c.chunk_text.includes('camps,72')));
  // Whole chapters are cited by chapter; a split chapter by section range.
  assert.equal(body.find((c) => c.locator === 'Plut. Cat. Min. 5').section_label, 'Chapter 5');
  assert.equal(body.find((c) => c.locator === 'Plut. Cat. Min. 9.1–3').section_label, 'Chapter 9, sections 1–3');
  assert.match(body.find((c) => c.locator === 'Plut. Cat. Min. 56').chunk_text, /the march lasted for seven days consecutively/);
});
