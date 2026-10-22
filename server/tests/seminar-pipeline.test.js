// The Seminar Track transcript pipeline (server/seminar/pipeline.js,
// context.js, agents.js) on an in-memory database and a scripted model:
// what the agents are shown, how a failed draft is repaired or refused, and
// the review gate.
//
//   cd server && node --test tests/seminar-pipeline.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../seminar/pipeline');

const { fakeDb } = require('./helpers/fake-supabase');

// ── Fixture: SEM 801, a counterposition unit on Law 15 ──────────────────────

const GREENE_TEXT = `[p. 107]\nLAW 15 CRUSH YOUR ENEMY TOTALLY ${Array.from({ length: 400 }, (_, i) => `greene${i}`).join(' ')}`;

function fixture() {
  return {
    seminar_courses: [{ id: 'sem-801', title: 'Power Without Virtue', subtitle: 'The 48 Laws of Power on Trial', stance: 'counterposition', source_works: [{ author: 'Robert Greene', work: 'The 48 Laws of Power', role: 'counter' }] }],
    seminar_units: [{ id: 'u3', course_id: 'sem-801', unit_number: 3, title: 'Using people', objectives: ['State Law 15 fairly'], key_concepts: ['anger'], proctor_brief: 'Probe the enemy as indifferent' }],
    seminar_readings: [
      { id: 'r1', unit_id: 'u3', position: 1, author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Law 15, pp. 107 to 114', role: 'assigned', access: 'own_copy', rag_chunk_ids: ['gs1'], research_source_id: 'src48', research_section_key: 'law-15' },
      { id: 'r2', unit_id: 'u3', position: 2, author: 'Seneca', work: 'On Anger', locator: '2', role: 'counter_reading', access: 'full_text_corpus', rag_chunk_ids: ['sen1'] },
    ],
    rag_corpus: [
      { id: 'gs1', author: 'Robert Greene', work: 'The 48 Laws of Power', section_label: 'Laws 13-16, pp. 9-15', chunk_text: '[COUNTERPOSITION: ...] summary of law fifteen and its stories', text_type: 'counterposition_summary', deprecated: false },
      { id: 'sen1', author: 'Seneca', work: 'On Anger', section_label: '2.32', chunk_text: 'It is the mark of a great mind to despise injuries.', text_type: 'primary', deprecated: false },
      { id: 'mar1', author: 'Marcus Aurelius', work: 'Meditations', section_label: '6.6', chunk_text: 'The best way of avenging thyself is not to become like the wrongdoer.', text_type: 'primary', deprecated: false },
    ],
    canonical_concepts: [{ name: 'anger', embedding: '[0.1,0.2]' }],
    seminar_transcripts: [],
  };
}

const rpcs = db => ({
  research_source_section_text: ({ p_key }) => (p_key === 'law-15' ? GREENE_TEXT : null),
  match_rag_corpus: () => db.rag_corpus.filter(r => r.id === 'mar1'),
});

const sentence = i => `Consider case ${i} where judgment ${i * 7} meets impression ${i * 13} and assent number ${i * 3} is tested.`;
const filler = (from, count) => Array.from({ length: count }, (_, k) => sentence(from + k)).join(' ');

// A draft that passes every check; `edit` changes one thing.
function draftTurns(edit = () => {}) {
  const turns = [];
  for (let i = 1; i <= 40; i++) {
    const student = i % 5 === 2 || i % 5 === 4;
    let segment = i <= 4 ? 'opening' : i <= 14 ? 'steelman' : i <= 30 ? 'cross_examination' : 'synthesis';
    if (i === 12 || i === 24) segment = 'student_objection';
    turns.push({ speaker: student ? 'Student' : 'Tutor', segment, text: filler(i * 100, student ? 4 : 7), cites: [] });
  }
  turns[5].cites = [{ ref: 'R1', page: '109' }, { ref: 'P1' }];
  turns[20].cites = [{ ref: 'P2' }, { ref: 'R2', section: '2.32' }];
  edit(turns);
  return turns;
}

// A model that answers the outline prompt once, then each draft prompt from
// a queue of drafts; it records every prompt.
function scriptedModel(drafts) {
  const prompts = [];
  const call = async ({ system, userPrompt }) => {
    prompts.push({ system, userPrompt });
    const isOutline = system.startsWith('You plan');
    const body = isOutline
      ? { segments: [{ segment: 'opening', purpose: 'frame the law', uses: [{ ref: 'R1', page: '107' }], target_words: 300 }], open_objection: 'Is an enemy ever merely indifferent?' }
      : { turns: drafts.shift() };
    return { content: [{ type: 'text', text: JSON.stringify(body) }] };
  };
  return { call, prompts };
}

const noFlags = async () => [];

test('generate: a passing draft is saved as version 1 with resolved cites and its checks', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const m = scriptedModel([draftTurns()]);
  const out = await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags });
  assert.equal(out.saved, true);
  const t = out.transcript;
  assert.equal(t.version, 1);
  assert.equal(t.review_status, 'draft');
  assert.equal(t.turns[0].speaker, 'tutor', 'speakers are lowercased');
  assert.deepEqual(t.turns[5].cites, [
    { author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Law 15, p. 109' },
    { author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Laws 13-16, pp. 9-15', chunk_id: 'gs1' },
  ]);
  assert.equal(t.turns[20].cites[0].chunk_id, 'sen1');
  assert.equal(t.checks.ok, true);
  assert.equal(t.checks.fence.ran, true);
  assert.ok(t.word_count >= 3000);
});

test('context: Greene reaches the agents only as the object under examination; neighbours use the modern fence', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const m = scriptedModel([draftTurns()]);
  await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags });
  const material = m.prompts[0].userPrompt;
  assert.match(material, /R1 OBJECT UNDER EXAMINATION\. FULL TEXT, PRIVATE COPY: Robert Greene/);
  assert.match(material, /P1 OBJECT UNDER EXAMINATION\. COUNTERPOSITION_SUMMARY/);
  assert.match(material, /P2 PRIMARY \(for R2\): Seneca, On Anger, 2\.32/);
  assert.doesNotMatch(material, /OBJECT UNDER EXAMINATION\. PRIMARY/);
  assert.match(material, /P3 NEIGHBOUR of the concept "anger": Marcus Aurelius/);
  const match = db.calls.rpc.find(c => c.name === 'match_rag_corpus');
  assert.ok(match.args.exclude_text_types.includes('counterposition_summary'));
  assert.deepEqual(match.args.query_embedding, [0.1, 0.2]);
});

test('generate: a failed draft goes back with its problems and the repair is saved', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const bad = draftTurns(t => { t[3].text += ' The law—so he says—holds.'; });
  const m = scriptedModel([bad, draftTurns()]);
  const out = await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags });
  assert.equal(out.saved, true);
  assert.equal(out.attempts, 2);
  assert.match(m.prompts[2].userPrompt, /YOUR LAST DRAFT FAILED VERIFICATION/);
  assert.match(m.prompts[2].userPrompt, /dash in turns\[3\]\.text/);
});

test('generate: a transcript that never passes is not saved', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const invented = () => draftTurns(t => { t[7].cites = [{ ref: 'P99' }]; });
  const m = scriptedModel([invented(), invented(), invented()]);
  const out = await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags });
  assert.equal(out.saved, false);
  assert.equal(out.attempts, P.MAX_ATTEMPTS);
  assert.ok(out.problems.some(p => p.check === 'citations' && /unknown reference P99/.test(p.detail)));
  assert.equal(tables.seminar_transcripts.length, 0);
});

test('generate: copying more than 60 words of the private full text is refused', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const copied = Array.from({ length: 70 }, (_, i) => `greene${i + 10}`).join(' ');
  const copy = () => draftTurns(t => { t[8].text += ` ${copied}`; });
  const m = scriptedModel([copy(), copy(), copy()]);
  const out = await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags });
  assert.equal(out.saved, false);
  assert.ok(out.problems.some(p => p.check === 'quotations' && /70 words copied from Robert Greene, The 48 Laws of Power, Law 15/.test(p.detail)));
});

test('review: a fence flag blocks approval until cleared; approving v2 retires v1', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const m = scriptedModel([draftTurns(), draftTurns()]);
  const flagTurn6 = async tutorTurns => (tutorTurns.some(t => t.n === 6) ? [{ n: 6, reason: 'calls the law sound advice' }] : []);
  const v1 = (await P.generateTranscript(db, 'u3', { call: m.call, classify: flagTurn6 })).transcript;
  assert.equal(v1.checks.fence.flags.length, 1);
  assert.equal((await P.approve(db, v1.id)).ok, false);
  assert.equal((await P.clearFlag(db, v1.id, 6)).ok, true);
  assert.equal((await P.approve(db, v1.id)).ok, true);
  assert.equal(tables.seminar_transcripts[0].is_active, true);

  const v2 = (await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags })).transcript;
  assert.equal(v2.version, 2);
  assert.equal((await P.approve(db, v2.id)).ok, true);
  assert.deepEqual(tables.seminar_transcripts.map(t => [t.version, t.is_active]), [[1, false], [2, true]]);
});

test('review: revise records the notes and drafts a new version from them', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const m = scriptedModel([draftTurns(), draftTurns()]);
  const v1 = (await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags })).transcript;
  assert.equal((await P.revise(db, v1.id, '', { call: m.call, classify: noFlags })).ok, false, 'a revision needs notes');
  const out = await P.revise(db, v1.id, 'Give the Student a stronger defence of Law 15.', { call: m.call, classify: noFlags });
  assert.equal(out.saved, true);
  assert.equal(out.transcript.version, 2);
  assert.equal(tables.seminar_transcripts[0].review_status, 'rejected');
  assert.equal(tables.seminar_transcripts[0].review_notes, 'Give the Student a stronger defence of Law 15.');
  const draftPrompt = m.prompts[m.prompts.length - 1].userPrompt;
  assert.match(draftPrompt, /REVIEWER NOTES FOR THIS VERSION \(Kyle\):\nGive the Student a stronger defence/);
  assert.match(draftPrompt, /PREVIOUS VERSION, sent back with the reviewer notes/);
});

test('prompts: the agents are told the fence and the voice rules, with no dashes of their own', async () => {
  const tables = fixture(); const db = fakeDb(tables, rpcs(tables));
  const m = scriptedModel([draftTurns()]);
  await P.generateTranscript(db, 'u3', { call: m.call, classify: noFlags });
  for (const { system } of m.prompts) {
    assert.match(system, /The Tutor never says a law is good advice/);
    assert.match(system, /Never use an em dash or an en dash/);
    assert.doesNotMatch(system, /[–—]/);
  }
});
