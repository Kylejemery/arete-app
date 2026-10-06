// server/tests/citation-tag.test.js
//
// The citation tag each Cabinet passage carries, built from live row shapes.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { citationTag, attachCitationFields, formatTaggedPassage } = require('../lib/citation-tag');

const tag = (row) => citationTag(row).tag;

test('locators become short tags for the most cited works', () => {
  assert.equal(tag({ author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers', locator: '7.179', text_type: 'primary' }), '[DL 7.179]');
  assert.equal(tag({ author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VII', locator: '7.10–7.13' }), '[DL 7.10–7.13]');
  assert.equal(tag({ author: 'Seneca', work: 'Letters', locator: '104' }), '[Seneca, Ep. 104]');
  assert.equal(tag({ author: 'Marcus Aurelius', work: 'Meditations', locator: '7.43' }), '[Marcus, Med. 7.43]');
  assert.equal(tag({ author: 'Epictetus', work: 'Discourses', locator: '1.21–1.22' }), '[Epictetus, Disc. 1.21–1.22]');
  assert.equal(tag({ author: 'Musonius Rufus', work: 'Lectures', locator: 'VI, p. 53' }), '[Musonius, Lecture VI, p. 53]');
  assert.equal(tag({ author: 'Seneca', work: 'On Anger', locator: '3.9–3.10' }), '[Seneca, On Anger, 3.9–3.10]');
});

test('a locator written as a full citation stands alone', () => {
  assert.equal(tag({ author: 'Plutarch', work: 'Life of Cato the Younger', locator: 'Plut. Cat. Min. 5.3' }), '[Plut. Cat. Min. 5.3]');
});

test('without a locator, a section label that names a place is used', () => {
  const r = citationTag({ author: 'Musonius Rufus', work: 'Lectures', section_label: 'XXI' });
  assert.deepEqual(r, { tag: '[Musonius, Lecture XXI]', strength: 'section' });
  assert.equal(tag({ author: 'Seneca', work: 'On Clemency', section_label: 'On Clemency 1.1' }), '[Seneca, On Clemency, 1.1]');
  assert.equal(tag({ author: 'Seneca', work: 'Consolation to Helvia', section_label: 'Consolation to Helvia 1–Consolation to Helvia 2' }), '[Seneca, Consolation to Helvia, 1–2]');
  assert.equal(tag({ author: 'W.L. Davidson', work: 'The Stoic Creed', section_label: 'pp. 161', text_type: 'scholarship' }), '[W.L. Davidson, The Stoic Creed, pp. 161]');
});

test('a heading is never passed off as a locator', () => {
  for (const section_label of ['Of the Socratic philosophy (1/2)', 'Happy Life  Benefits  Anger  Clemency', 'On Leisure 8–On Peace of Mind 1', '']) {
    const r = citationTag({ author: 'Seneca', work: 'On Leisure', section_label });
    assert.equal(r.strength, 'weak', section_label);
    assert.equal(r.tag, '[Seneca, On Leisure, no locator]');
  }
  assert.equal(tag({ author: 'Plutarch', work: "Plutarch's essays and miscellanies, Vol. 3 (of 5)" }), "[Plutarch, Plutarch's essays and miscellanies, Vol. 3, no locator]");
});

test('synthesis carries its label and verification status', () => {
  assert.deepEqual(
    citationTag({ author: 'Arete (AI-assisted)', work: 'Fate, Providence, and What Is Up to Us: A Summary', text_type: 'synthesis', verification_status: ['corpus_verified'] }),
    { tag: '[Arete synthesis, corpus verified: Fate, Providence, and What Is Up to Us: A Summary]', strength: 'synthesis' },
  );
  assert.equal(tag({ author: 'Arete Synthesis', work: 'Time as Flesh and Blood' }), '[Arete synthesis, unverified: Time as Flesh and Blood]');
  assert.equal(tag({ author: 'Arete (AI-assisted)', work: 'X', text_type: 'synthesis', verification_status: ['interpretive'] }), '[Arete synthesis, interpretive: X]');
});

test('missing attribution is said outright', () => {
  assert.deepEqual(citationTag({ work: 'Corpus' }), { tag: '[Corpus, no locator]', strength: 'empty' });
  assert.deepEqual(citationTag({}), { tag: '[unattributed passage]', strength: 'empty' });
  assert.deepEqual(citationTag({ source_title: 'Letters from a Stoic' }), { tag: '[Letters from a Stoic, no locator]', strength: 'weak' });
});

test('scholarship and summaries are labelled beside the tag', () => {
  assert.equal(
    formatTaggedPassage({ author: 'Eduard Zeller', work: 'The Stoics, Epicureans and Sceptics', text_type: 'scholarship', chunk_text: 'text' }),
    "[Eduard Zeller, The Stoics, Epicureans and Sceptics, no locator] — modern scholarship: these are Eduard Zeller's words, not an ancient author's. Attribute any quotation to Eduard Zeller.\ntext",
  );
});

test('attachCitationFields adds locators by id without reordering or dropping rows', async () => {
  const rows = [{ id: 'b', author: 'Seneca' }, { id: 'a', author: 'DL' }, { id: 'c' }];
  const supabase = {
    from: () => ({ select: () => ({ in: async () => ({ data: [{ id: 'a', locator: '7.179', verification_status: null }, { id: 'b', locator: '104', verification_status: null }], error: null }) }) }),
  };
  const out = await attachCitationFields(supabase, rows);
  assert.deepEqual(out.map(r => r.id), ['b', 'a', 'c']);
  assert.equal(out[0].locator, '104');
  assert.equal(out[1].locator, '7.179');
  assert.equal(out[2].locator, undefined);
});

test('attachCitationFields leaves rows alone when the lookup fails', async () => {
  const rows = [{ id: 'a', section_label: 'XXI' }];
  const supabase = { from: () => ({ select: () => ({ in: async () => { throw new Error('down'); } }) }) };
  assert.deepEqual(await attachCitationFields(supabase, rows), rows);
});

test('summaries and synthesis say what they are not', () => {
  assert.match(formatTaggedPassage({ author: 'Émile Bréhier', work: 'Chrysippe (English summary)', text_type: 'paper_summary', chunk_text: 'x' }), /summary of Émile Bréhier's modern scholarship: not a quotation/);
  assert.match(formatTaggedPassage({ author: 'Arete Synthesis', work: 'T', text_type: 'synthesis', chunk_text: 'x' }), /not ancient testimony/);
  assert.equal(formatTaggedPassage({ author: 'Seneca', work: 'Letters', locator: '18', text_type: 'primary', chunk_text: 'x' }), '[Seneca, Ep. 18]\nx');
});
