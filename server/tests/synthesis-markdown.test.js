// The renderer the Synthesis Agent uses for drafts, checked against the real
// parser the nightly sync uses (academy/corpus-ingestion/ingest-synthesis.js).
// If the two disagree, a draft Kyle approves would fail at export.
//
//   cd server && node --test tests/synthesis-markdown.test.js
//   (the parser needs academy/corpus-ingestion's npm install)

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { renderSynthesisMarkdown, slugify, cleanHeading } = require('../lib/synthesis-markdown');
const { withReviewedBy, statusSummary, addReadmeRow } = require('../../academy/corpus-ingestion/export-synthesis-drafts');

let parseSynthesis = null;
try {
  ({ parseSynthesis } = require(path.join(__dirname, '../../academy/corpus-ingestion/ingest-synthesis')));
} catch (err) {
  console.warn(`skipping round trips: ${err.message}`);
}
const needsParser = { skip: !parseSynthesis && 'academy/corpus-ingestion dependencies not installed' };

const base = () => ({
  doc_key: 'stoic-life-courage',
  version: 1,
  title: 'Courage: What the Stoics Asked of It',
  created_at: '2026-10-02',
  generated_with: 'claude-sonnet-4-6, Arete Synthesis Agent (Stoic Life mode)',
  review_by: '2027-10-02',
  sources_used: ['Seneca | Letters', 'Epictetus | Discourses'],
  regenerate_when: ['World observation of 2026-09-28 superseded'],
  introduction: { body: 'Courage, for the Stoics, was knowledge.', status: ['interpretive'] },
  sections: [
    { heading: 'What Seneca says', body: 'Seneca writes that the brave man fears nothing dishonourable (Seneca, Letters).', status: ['corpus_verified'] },
    { heading: 'What Epictetus says', body: 'Epictetus asks what is up to us.', status: ['corpus_verified'] },
    { heading: 'Courage now', body: 'Applied today, this asks us to speak plainly.', status: ['interpretive'] },
    { heading: 'An unchecked claim', body: 'Chrysippus said something we could not check.', status: ['unverified'] },
  ],
});

test('a rendered draft parses, and every section keeps its status', needsParser, () => {
  const md = renderSynthesisMarkdown(base());
  const { doc, chunks } = parseSynthesis(md, 'stoic-life-courage.v1.md');
  assert.equal(doc.doc_key, 'stoic-life-courage');
  assert.equal(doc.version, 1);
  assert.equal(doc.title, 'Courage: What the Stoics Asked of It');
  assert.equal(doc.review_by, '2027-10-02');
  assert.equal(doc.reviewed_by, null, 'reviewed_by stays empty until the export');
  assert.deepEqual(doc.sources_used, ['Seneca | Letters', 'Epictetus | Discourses']);
  assert.deepEqual(doc.regenerate_when, ['World observation of 2026-09-28 superseded']);
  const status = label => chunks.find(c => c.section_label === label).verification_status.join(',');
  assert.equal(status('Introduction'), 'interpretive');
  assert.equal(status('What Seneca says'), 'corpus_verified');
  assert.equal(status('Courage now'), 'interpretive');
  assert.equal(status('An unchecked claim'), 'unverified');
  assert.match(chunks.find(c => c.section_label === 'Courage now').chunk_text, /Review by: 2027-10-02/);
});

test('awkward headings and bodies survive the round trip', needsParser, () => {
  const d = base();
  d.sections = [
    { heading: '**Bold** heading => with arrow', body: '# not a heading\nbody text', status: ['interpretive'] },
    { heading: 'Same', body: 'one', status: ['corpus_verified'] },
    { heading: 'Same', body: 'two', status: ['unverified'] },
    { heading: '## Introduction', body: 'clashes with the intro path', status: ['unverified'] },
    { heading: 'Empty', body: '   ', status: ['unverified'] },
  ];
  const md = renderSynthesisMarkdown(d);
  const { chunks } = parseSynthesis(md, 'x.v1.md');
  const labels = chunks.map(c => c.section_label);
  assert.ok(labels.includes('Bold heading → with arrow'));
  assert.ok(labels.includes('Same') && labels.includes('Same (2)'));
  assert.ok(labels.includes('Introduction (continued)'));
  assert.ok(!labels.includes('Empty'), 'an empty section is dropped, not left as a dangling status');
  assert.equal(chunks.find(c => c.section_label === 'Same (2)').verification_status.join(), 'unverified');
  assert.ok(chunks.some(c => c.body.includes('not a heading')), 'a # line in a body is kept as text');
});

test('the export sets reviewed_by and the file still parses', needsParser, () => {
  const md = withReviewedBy(renderSynthesisMarkdown(base()), 'Kyle');
  const { doc, chunks } = parseSynthesis(md, 'stoic-life-courage.v1.md');
  assert.equal(doc.reviewed_by, 'Kyle');
  assert.equal(withReviewedBy(md, 'Kyle'), md, 'setting it twice changes nothing');
  assert.match(statusSummary(chunks), /corpus_verified/);
});

test('the README row lands after the last row of the Documents table', () => {
  const readme = '# x\n\n| File | Chunks | Status |\n| --- | --- | --- |\n| `a.v1.md` | 2 | 2 corpus_verified |\n\nAfter.\n';
  const out = addReadmeRow(readme, '| `b.v1.md` | 3 | 3 interpretive |');
  assert.match(out, /\| `a\.v1\.md` \| 2 \| 2 corpus_verified \|\n\| `b\.v1\.md` \| 3 \| 3 interpretive \|\n\nAfter\./);
});

test('bad input fails at render time, not at export', () => {
  assert.throws(() => renderSynthesisMarkdown({ ...base(), doc_key: 'Not Kebab' }), /kebab-case/);
  assert.throws(() => renderSynthesisMarkdown({ ...base(), sources_used: [] }), /sources_used/);
  assert.throws(() => renderSynthesisMarkdown({ ...base(), review_by: 'soon' }), /review_by/);
  const d = base();
  d.sections[0].status = ['probably_true'];
  assert.throws(() => renderSynthesisMarkdown(d), /unknown verification status/);
});

test('slugs and headings', () => {
  assert.equal(slugify('Stoic Life: Assent & Impressions — Épictète'), 'stoic-life-assent-impressions-epictete');
  assert.equal(slugify('!!!'), 'untitled');
  assert.ok(slugify('a'.repeat(200)).length <= 60);
  assert.equal(cleanHeading('### _Italic_ and `code`'), 'Italic and code');
});
