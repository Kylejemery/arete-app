// academy/corpus-ingestion/ingest-synthesis.test.js
//
// The synthesis documents parse, chunk by heading, and carry the verification
// statuses the layer spec assigns them.
//
//   node --test ingest-synthesis.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { parseSynthesis, loadAll, listSynthesisFiles, emitSql, INDEX_STRIDE } = require('./ingest-synthesis');

// Every committed version loads; the tests below check the newest of each,
// which is the one activate_synthesis_version() makes live.
const all = loadAll(listSynthesisFiles());
const docs = {};
for (const p of all) if (!docs[p.doc.doc_key] || p.doc.version > docs[p.doc.doc_key].doc.version) docs[p.doc.doc_key] = p;
const statusOf = (key, label) => {
  const cs = docs[key].chunks.filter(c => c.section_label === label);
  assert.ok(cs.length, `${key}: no chunk for "${label}"`);
  return cs[0].verification_status.join(',');
};

test('the three documents load with the fields the layer needs', () => {
  assert.deepEqual(Object.keys(docs).sort(), ['fate-providence-up-to-us', 'stoic-logic-summary', 'virtues-of-socrates']);
  for (const p of all) {
    assert.equal(p.doc.author, 'Arete (AI-assisted)');
    assert.equal(p.doc.reviewed_by, null);
    assert.ok(p.doc.sources_used.length && p.doc.regenerate_when.length);
    for (const c of p.chunks) {
      assert.ok(c.chunk_text.startsWith('[ARETE SYNTHESIS:'));
      assert.ok(c.chunk_text.includes(`Section: ${c.section_label}.`));
      assert.ok(c.chunk_index > p.doc.version * INDEX_STRIDE && c.chunk_index < (p.doc.version + 1) * INDEX_STRIDE);
      assert.ok(c.chunk_text.includes(`(version ${p.doc.version})`));
      assert.ok(!c.embed_input.includes('[ARETE SYNTHESIS'), 'the label is not embedded');
    }
  }
});

test('Stoic Logic: via_summary on the eight named sections, corpus_verified elsewhere', () => {
  const via = ['The conditional debate', 'Possible and necessary', 'The Master Argument', 'Signs and proof',
    'The five indemonstrables', 'The themata and analysis', 'Worked examples', 'Open disputes'];
  for (const c of docs['stoic-logic-summary'].chunks) {
    assert.equal(c.verification_status.join(','), via.includes(c.section_label) ? 'via_summary' : 'corpus_verified', c.section_label);
  }
});

test('Fate: via_summary on the four named sections, corpus_verified elsewhere', () => {
  const via = ['Causes and the cylinder', 'What is up to us', 'Responsibility without alternatives', 'Critics and verdicts'];
  for (const c of docs['fate-providence-up-to-us'].chunks) {
    assert.equal(c.verification_status.join(','), via.includes(c.section_label) ? 'via_summary' : 'corpus_verified', c.section_label);
  }
});

test('Virtues: version 2 is the newest, and version 1 stays committed for history', () => {
  const versions = all.filter(p => p.doc.doc_key === 'virtues-of-socrates').map(p => p.doc.version).sort();
  assert.deepEqual(versions, [1, 2]);
  assert.equal(docs['virtues-of-socrates'].chunks.length, 71);
});

test('Virtues: statuses by section', () => {
  const k = 'virtues-of-socrates';
  assert.equal(statusOf(k, 'How to read this document'), 'corpus_verified');
  for (const v of ['Courage', 'Self-discipline and temperance', 'Wisdom', 'Justice: how he treated people']) {
    assert.equal(statusOf(k, v), 'corpus_verified');
    assert.equal(statusOf(k, `${v} > Modern examples to strive for`), 'interpretive');
  }
  for (const c of docs[k].chunks) {
    const s = c.verification_status.join(',');
    if (c.section_label.startsWith('A Socratic life in modern terms')) assert.equal(s, 'interpretive', c.section_label);
    if (c.section_label.startsWith('Famous episodes')) assert.equal(s, 'unverified', c.section_label);
    if (c.section_label.startsWith('Rules for living')) assert.equal(s, 'corpus_verified', c.section_label);
  }
  assert.equal(statusOf(k, 'Feats to aim for'), 'interpretive');
  assert.equal(statusOf(k, 'Feats to aim for > Feats of the body'), 'interpretive,unverified');
  assert.equal(statusOf(k, 'Feats to aim for > Feats of character'), 'interpretive');
  const body = docs[k].chunks.find(c => c.section_label === 'Feats to aim for > Feats of the body');
  assert.match(body.chunk_text, /Do not present this section as what any ancient author said\./);
});

test('a status naming a heading the document lacks is an error', () => {
  const md = '---\ndoc_key: t\ntitle: T\nversion: 1\ncreated_at: 2026-09-29\ngenerated_with: x\n' +
    'default_status: corpus_verified\nsection_status:\n  - Nowhere => unverified\nsources_used:\n  - A | B\n---\n\n# T\n\n## Here\n\ntext\n';
  assert.throws(() => parseSynthesis(md, 't.v1.md'), /not a heading/);
  assert.throws(() => parseSynthesis(md.replace('Nowhere => unverified', 'Here => guessed'), 't.v1.md'), /unknown verification status/);
});

test('--part splits a load and only the last part activates', () => {
  const p = [docs['virtues-of-socrates']];
  const parts = [1, 2, 3].map(part => emitSql(p, { part, parts: 3 }));
  const count = s => (s.match(/^  \(\$q\$stoicism-phd/gm) || []).length;
  assert.equal(parts.map(count).reduce((a, b) => a + b), p[0].chunks.length);
  assert.deepEqual(parts.map(s => s.includes('activate_synthesis_version')), [false, false, true]);
});
