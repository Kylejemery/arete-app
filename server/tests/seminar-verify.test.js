// The Seminar Track write-path checks (server/seminar/verify.js, fence.js):
// one block per check in Part 6 of the spec, plus the approval gate.
//
//   cd server && node --test tests/seminar-verify.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../seminar/verify');
const { classifyEndorsement } = require('../seminar/fence');

const SPEAKERS = [{ key: 'tutor', display: 'Tutor', voice_id: null }, { key: 'student', display: 'Student', voice_id: null }];

const READINGS = [
  { author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Law 15, pp. 107 to 114', role: 'assigned', access: 'own_copy' },
  { author: 'Seneca', work: 'On Anger', locator: '2', role: 'counter_reading', access: 'full_text_corpus' },
  { author: 'Epictetus', work: 'Discourses', locator: '1.1', role: 'counter_reading', access: 'full_text_corpus' },
  { author: 'Seneca', work: 'Letters', locator: 'Letters 3 and 9', role: 'counter_reading', access: 'full_text_corpus' },
];

// A unique sentence per index, so filler never repeats a run of words.
const sentence = i => `Consider case ${i} where judgment ${i * 7} meets impression ${i * 13} and assent number ${i * 3} is tested.`;
const filler = (from, count) => Array.from({ length: count }, (_, k) => sentence(from + k)).join(' ');

// 40 turns, 16 for the Student (40%), two objection segments, about 3,400 words.
function validTurns() {
  const turns = [];
  for (let i = 1; i <= 40; i++) {
    const student = i % 5 === 2 || i % 5 === 4;
    let segment = i <= 4 ? 'opening' : i <= 14 ? 'steelman' : i <= 30 ? 'cross_examination' : i <= 37 ? 'synthesis' : 'exercise';
    if (i === 12 || i === 24) segment = 'student_objection';
    turns.push({
      n: i,
      speaker: student ? 'student' : 'tutor',
      text: filler(i * 100, student ? 4 : 7),
      cites: [],
      segment,
      pause_after_ms: 600,
    });
  }
  return turns;
}

const noChunks = async () => [];
const noFlags = async () => [];

test('the valid fixture passes every check', async () => {
  const turns = validTurns();
  const stats = V.transcriptStats(turns);
  assert.ok(stats.word_count >= 3000 && stats.word_count <= 4500, `fixture has ${stats.word_count} words`);
  const r = await V.verifyTranscript({ turns, speakers: SPEAKERS, stance: 'counterposition', readings: READINGS, quotationSources: [], lookupChunks: noChunks, classify: noFlags });
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
  assert.equal(r.fence.ran, true);
});

// ── 1. No dashes ────────────────────────────────────────────────────────────

test('dashes: an em dash or en dash anywhere in a record is reported with its path', () => {
  const unit = { title: 'Masks and reputation', proctor_brief: 'Probe the mask — and what it hides', objectives: ['State the law', 'pp. 107–118'] };
  const p = V.findDashes(unit, 'unit');
  assert.equal(p.length, 2);
  assert.deepEqual(p.map(x => x.path), ['unit.proctor_brief', 'unit.objectives[1]']);
});

test('dashes: hyphens, colons and commas are allowed', () => {
  assert.deepEqual(V.findDashes({ title: 'Re-Create Yourself: the self-made mask, examined' }), []);
});

test('dashes: a dash in a transcript turn refuses the transcript', async () => {
  const turns = validTurns();
  turns[5].text += ' The law—so Greene says—is absolute.';
  const r = await V.verifyTranscript({ turns, speakers: SPEAKERS, stance: 'aligned', readings: READINGS, quotationSources: [], lookupChunks: noChunks, classify: noFlags });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.check === 'no_dashes' && p.path === 'turns[5].text'));
});

// ── 2. Citations resolve ────────────────────────────────────────────────────

test('citations: a live chunk passes; a missing or deprecated chunk fails', async () => {
  const turns = validTurns();
  turns[0].cites = [{ author: 'Seneca', work: 'On Anger', locator: '2.32', chunk_id: 'live' }];
  turns[1].cites = [{ author: 'Seneca', work: 'On Anger', locator: '2.32', chunk_id: 'gone' }];
  turns[2].cites = [{ author: 'Seneca', work: 'On Anger', locator: '2.32', chunk_id: 'old' }];
  const lookup = async ids => ids.filter(id => id !== 'gone').map(id => ({ id, deprecated: id === 'old' }));
  const p = await V.checkCitations(turns, READINGS, lookup);
  assert.equal(p.length, 2);
  assert.match(p[0].detail, /gone does not exist/);
  assert.match(p[1].detail, /old is deprecated/);
});

test('citations: a locator inside an assigned reading passes', async () => {
  const cites = [
    { author: 'Robert Greene', work: '48 Laws of Power', locator: 'Law 15, p. 109' },
    { author: 'Seneca', work: 'On Anger', locator: '2.32' },
    { author: 'Epictetus', work: 'Discourses', locator: '1.1.7' },
    { author: 'Seneca', work: 'Letters', locator: '9.5' },
  ];
  const turns = [{ n: 1, cites }];
  assert.deepEqual(await V.checkCitations(turns, READINGS, noChunks), []);
});

test('citations: a locator outside the readings, or an unassigned work, fails', async () => {
  const cites = [
    { author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Law 16, p. 117' },
    { author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Law 15, p. 140' },
    { author: 'Seneca', work: 'On Anger', locator: '3.1' },
    { author: 'Epictetus', work: 'Discourses', locator: '1.2' },
    { author: 'Marcus Aurelius', work: 'Meditations', locator: '4.3' },
  ];
  const p = await V.checkCitations([{ n: 3, cites }], READINGS, noChunks);
  assert.equal(p.length, 5);
});

test('citations: locator parsing reads laws, page ranges and sections', () => {
  const l = V.parseLocator('Laws 2, 7 and 14, pp. 107 to 118');
  assert.deepEqual([...l.laws].sort((a, b) => a - b), [2, 7, 14]);
  assert.deepEqual(l.pages, [['107', '118']]);
  assert.ok(V.locatorWithin('p. xx', 'Preface, pp. xvii to xxiii'));
  assert.ok(!V.locatorWithin('p. 3', 'Preface, pp. xvii to xxiii'));
  assert.ok(!V.locatorWithin('Plutarch', 'Laws 1 to 4'), 'a word starting with p is not a page');
});

// ── 3. Quotation limits ─────────────────────────────────────────────────────

const SOURCE = Array.from({ length: 200 }, (_, i) => `power${i}`).join(' ');

test('quotations: a 60 word run is allowed, a 61 word run is refused', () => {
  const sixty = SOURCE.split(' ').slice(10, 70).join(' ');
  const sixtyOne = SOURCE.split(' ').slice(10, 71).join(' ');
  assert.equal(V.checkQuotations([{ n: 1, text: `He writes: ${sixty}. Then we ask why.` }], [{ label: 'Greene, Law 15', text: SOURCE }]).length, 0);
  const p = V.checkQuotations([{ n: 1, text: `He writes: ${sixtyOne}.` }], [{ label: 'Greene, Law 15', text: SOURCE }]);
  assert.equal(p.length, 1);
  assert.match(p[0].detail, /61 words copied from Greene, Law 15/);
});

test('quotations: punctuation, case and OCR noise do not hide a copied run', () => {
  const src = SOURCE.split(' ').map((w, i) => (i % 9 === 0 ? `${w.toUpperCase()},` : w)).join('  ');
  const copied = SOURCE.split(' ').slice(0, 80).join(' ');
  assert.equal(V.checkQuotations([{ n: 4, text: copied }], [{ label: 'Greene', text: src }]).length, 1);
});

test('quotations: a long run split across two turns is still caught', () => {
  const w = SOURCE.split(' ');
  const turns = [{ n: 1, text: w.slice(0, 40).join(' ') }, { n: 2, text: w.slice(40, 90).join(' ') }];
  const p = V.checkQuotations(turns, [{ label: 'Greene', text: SOURCE }]);
  assert.equal(p.length, 1);
  assert.match(p[0].detail, /across turns/);
});

// ── 4. Counterposition fence ────────────────────────────────────────────────

test('fence: flagged Tutor turns are recorded uncleared and block approval', async () => {
  const turns = validTurns();
  const classify = async tutorTurns => [{ n: tutorTurns[2].n, reason: 'says crushing the enemy is wise' }, { n: 2, reason: 'student turn, ignored' }];
  const r = await V.verifyTranscript({ turns, speakers: SPEAKERS, stance: 'counterposition', readings: READINGS, quotationSources: [], lookupChunks: noChunks, classify });
  assert.equal(r.ok, true, 'flags do not refuse the save');
  assert.equal(r.fence.flags.length, 1, 'only Tutor turns can be flagged');
  assert.equal(V.canApprove(r).ok, false);
  r.fence.flags[0].cleared = true;
  assert.equal(V.canApprove(r).ok, true);
});

test('fence: aligned courses skip the classifier; a failed classifier refuses the save', async () => {
  const turns = validTurns();
  let called = false;
  const spy = async () => { called = true; return []; };
  await V.verifyTranscript({ turns, speakers: SPEAKERS, stance: 'aligned', readings: READINGS, quotationSources: [], lookupChunks: noChunks, classify: spy });
  assert.equal(called, false);
  const broken = async () => { throw new Error('API 500'); };
  const r = await V.verifyTranscript({ turns, speakers: SPEAKERS, stance: 'counterposition', readings: READINGS, quotationSources: [], lookupChunks: noChunks, classify: broken });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some(p => p.check === 'fence'));
});

test('fence: the Haiku classifier parses flags and fails closed on an unparseable reply', async () => {
  const reply = text => async () => ({ content: [{ type: 'text', text }] });
  const turns = [{ n: 3, segment: 'synthesis', text: 'So follow Law 15.' }];
  const ctx = { opponent: 'Robert Greene', work: 'The 48 Laws of Power' };
  assert.deepEqual(await classifyEndorsement(turns, ctx, { call: reply('{"flags":[{"n":3,"reason":"tells the student to follow Law 15"}]}') }), [{ n: 3, reason: 'tells the student to follow Law 15' }]);
  await assert.rejects(classifyEndorsement(turns, ctx, { call: reply('I cannot tell.') }));
});

test('approval: an unverified transcript cannot be approved', () => {
  assert.equal(V.canApprove({ ok: false }).ok, false);
  assert.equal(V.canApprove(null).ok, false);
});

// ── 5. Length and balance ───────────────────────────────────────────────────

test('length: under 3,000 or over 4,500 words fails', () => {
  const short = validTurns().slice(0, 20).map((t, i) => ({ ...t, n: i + 1 }));
  assert.ok(V.checkLengthBalance(short).some(p => /words; a transcript runs/.test(p.detail)));
  const long = validTurns().map(t => ({ ...t, text: `${t.text} ${t.text}` }));
  assert.ok(V.checkLengthBalance(long).some(p => /words; a transcript runs/.test(p.detail)));
});

test('balance: the Student needs 25% of turns and two objection segments', () => {
  const turns = validTurns().map(t => ({ ...t, speaker: t.n % 5 === 2 ? 'student' : 'tutor' }));
  assert.ok(V.checkLengthBalance(turns).some(p => /Student has 20% of the turns/.test(p.detail)));
  const one = validTurns().map(t => (t.n === 24 ? { ...t, segment: 'cross_examination' } : t));
  assert.ok(V.checkLengthBalance(one).some(p => /1 student_objection segment/.test(p.detail)));
  const adjacent = validTurns().map(t => (t.n === 24 ? { ...t, segment: 'cross_examination' } : t.n === 13 ? { ...t, segment: 'student_objection' } : t));
  assert.equal(V.transcriptStats(adjacent).student_objection_segments, 1, 'consecutive objection turns are one segment');
});

test('shape: bad numbering, speakers or segments refuse before the other checks', async () => {
  const turns = validTurns();
  turns[3] = { ...turns[3], speaker: 'narrator', segment: 'aside' };
  const r = await V.verifyTranscript({ turns, speakers: SPEAKERS, stance: 'aligned', readings: READINGS, quotationSources: [], lookupChunks: noChunks, classify: noFlags });
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 2);
  assert.ok(r.problems.every(p => p.check === 'shape'));
});
