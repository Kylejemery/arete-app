// server/tests/observatory-passage.test.js
//
// The Observatory star's passage picker: footnotes and OCR'd Greek from
// scanned editions never reach a reader, and a model reply with trailing
// text after its JSON still parses.
//
//   cd server && npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test';
const { _test: { sentenceWindow, looksLikeApparatus, firstJsonObject } } = require('../routes/observatory');

// What the Kosmios star showed on 2026-10-01 (Arnold, Roman Stoicism).
const FOOTNOTES = "296. See generally Schmekel, pp. 288-290. 137 Ov. Met. xv 96-142; Schmekel p. 288. " +
  "188 kar' dpxas mev obv Kad' abriv dvra [rov Oedv] tpémew THv Tacav ovalav dv' dépos els Hdwp Diog. L. vii 136. " +
  "189 This stage, at which the whole universe is water, even though the four elements have not yet been created, " +
  "reflects the popular tradition as to Chaos as in the last section: see Pearson p. 102. " +
  "For the process of creation as described by Cleanthes see Pearson p. 252. 140 See above, § 178. " +
  "lél cal domep ev Ty youg TO owdpua epiexerat, ob'rw Kal TodToOy, omepyartKdy Abyov byra Tot Kécpov.";

const PROSE = "The Stoics held that the universe is a single living being, pervaded by a reason which is also fire. " +
  "From this fire the elements arise in turn, and into it they return at the appointed time. " +
  "Cleanthes found in this cycle a ground for reverence rather than despair.";

test('a chunk of nothing but footnotes yields no window', () => {
  assert.equal(sentenceWindow(FOOTNOTES, 620), '');
});

test('prose before the page-bottom notes is kept, the notes are not', () => {
  assert.equal(sentenceWindow(`${PROSE} ${FOOTNOTES}`, 620), PROSE);
});

test('prose after the notes is found, not the tail of a note', () => {
  assert.equal(sentenceWindow(`${FOOTNOTES} ${PROSE}`, 620), PROSE);
});

test('apparatus signals', () => {
  assert.ok(looksLikeApparatus('296. See generally Schmekel, pp. 288-290.'));
  assert.ok(looksLikeApparatus('things of high degree (mponypuÃ©va), observing that this was so.'));
  assert.ok(looksLikeApparatus('Kal TodToOy, omepyartKdy Abyov byra Tot Kécpov.'));
  assert.ok(looksLikeApparatus('Ov. Met. xv 96-142; Schmekel p. 288.'));
  assert.ok(!looksLikeApparatus('Virtue is the only good, and vice the only evil.'));
  assert.ok(!looksLikeApparatus('In Book II Seneca turns to the civil wars of his youth.'));
});

test('first JSON object wins over trailing text', () => {
  const reply = '{"answer": "Fire {is} first.", "passage_index": 2, "quote": "a \\"b\\""}\n\n{"note": "extra"}';
  assert.deepEqual(firstJsonObject(reply), { answer: 'Fire {is} first.', passage_index: 2, quote: 'a "b"' });
  assert.equal(firstJsonObject('no json here'), null);
});
