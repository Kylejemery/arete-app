// The Seminar Builder's server side (server/seminar/syllabus.js,
// questions.js): what the Syllabus agent reads, how a proposal is checked
// and turned into units and readings, the publish gates, and the questions
// step. In-memory database, scripted model.
//
//   cd server && node --test tests/seminar-builder.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../seminar/syllabus');
const Q = require('../seminar/questions');
const { fakeDb } = require('./helpers/fake-supabase');

const reply = body => async () => ({ content: [{ type: 'text', text: JSON.stringify(body) }] });

function tables() {
  return {
    seminar_courses: [{
      id: 'sem-801', title: 'Power Without Virtue', stance: 'counterposition', tier_required: 'scholar', status: 'draft',
      source_works: [{ author: 'Robert Greene', work: 'The 48 Laws of Power', role: 'counter' }],
      intent: 'Put the laws on trial.', objectives: [], syllabus_draft: null,
    }],
    seminar_units: [],
    seminar_readings: [],
    seminar_transcripts: [],
    seminar_questions: [],
    research_sources: [{ id: 'src48', author: 'Robert Greene', work: 'The 48 Laws of Power', licence_status: 'licensed_copy', deprecated: false }],
    research_source_sections: [
      { source_id: 'src48', key: 'preface', label: 'Preface', title: 'Preface', page_start: 'xvii', page_end: 'xxiii', char_start: 0, char_end: 100, parts: {}, position: 0, deprecated: false },
      { source_id: 'src48', key: 'law-15', label: 'Law 15', title: 'Crush Your Enemy Totally', page_start: '107', page_end: '114', char_start: 100, char_end: 300, parts: { reversal: 250 }, position: 15, deprecated: false },
    ],
    rag_corpus: [
      { id: 'g1', author: 'Robert Greene', work: 'The 48 Laws of Power', section_label: 'Laws 13-16 (Self-Interest, Spying, Crushing Enemies, Absence), pp. 1-8', chunk_index: 40, text_type: 'counterposition_summary', deprecated: false },
      { id: 'g2', author: 'Robert Greene', work: 'The 48 Laws of Power', section_label: 'Laws 1-4 (Never Outshine the Master to Always Say Less Than Necessary), pp. 1-8', chunk_index: 1, text_type: 'counterposition_summary', deprecated: false },
      { id: 'e1', author: 'Epictetus', work: 'Enchiridion', section_label: '1', chunk_index: 0, text_type: 'primary', deprecated: false },
      { id: 'd1', author: 'Epictetus', work: 'Discourses', section_label: '1.1', chunk_index: 0, text_type: 'primary', deprecated: false },
      { id: 'c2', author: 'Cicero', work: 'De Officiis', section_label: '', chunk_index: 210, text_type: 'primary', deprecated: false },
      { id: 'c1', author: 'Cicero', work: 'De Officiis', section_label: '', chunk_index: 200, text_type: 'primary', deprecated: false },
    ],
  };
}

const rpcs = {
  research_source_section_text: ({ p_key }) => `[p. ${p_key === 'preface' ? 'xvii' : '107'}] the text of ${p_key}`,
  seminar_corpus_catalog: () => [
    { author: 'Epictetus', work: 'Enchiridion', text_type: 'primary', chunks: 26, labels: ['1', '2'] },
    { author: 'Cicero', work: 'De Officiis', text_type: 'primary', chunks: 326, labels: [] },
  ],
};

const unit = (n, readings) => ({
  unit_number: n, title: `Unit ${n}`, objectives: ['State the claim fairly'], key_concepts: ['assent'],
  proctor_brief: 'Probe whether the student can answer Greene from Epictetus.', readings,
});
const greene = key => ({ source: 'indexed', author: 'Robert Greene', work: 'The 48 Laws of Power', section_key: key, role: 'assigned', reading_guide: 'Read the Reversal last.' });
const epictetus = { source: 'corpus', author: 'Epictetus', work: 'Enchiridion', section_labels: ['1'], role: 'counter_reading', reading_guide: 'What is up to us.' };
const cicero = { source: 'corpus', author: 'Cicero', work: 'De Officiis', search: 'the honourable and the useful, Book 3', locator: 'Book 3', role: 'counter_reading', reading_guide: 'The conflict of honour and use.' };

function proposal(n = 6) {
  return { objectives: ['Say where Greene borrows Stoic means'], units: Array.from({ length: n }, (_, i) => unit(i + 1, [greene(i === 0 ? 'preface' : 'law-15'), epictetus, cicero])) };
}
const search = async (author, work) => [{ id: 'c2', section_label: '', chunk_index: 210, text_type: 'primary' }, { id: 'c1', section_label: '', chunk_index: 200, text_type: 'primary' }];

test('syllabus: the agent reads the full text of every indexed section and the corpus catalog', async () => {
  const t = tables(); const db = fakeDb(t, rpcs);
  let prompt = null;
  const call = async args => { prompt = args; return reply({ units: proposal().units })(); };
  const out = await S.proposeSyllabus(db, t.seminar_courses[0], { call });
  assert.equal(out.abridged, false);
  assert.match(prompt.userPrompt, /INDEXED SOURCES \(FULL TEXT\)/);
  assert.match(prompt.userPrompt, /section "law-15" \(Law 15, pp\. 107 to 114; Crush Your Enemy Totally\) ===\n\[p\. 107\] the text of law-15/);
  assert.match(prompt.userPrompt, /Epictetus, Enchiridion \[primary, 26 chunks\]: 1 \| 2/);
  assert.match(prompt.userPrompt, /Cicero, De Officiis \[primary, 326 chunks\]: \(no section labels: give a "search" phrase instead\)/);
  assert.match(prompt.userPrompt, /Kyle's intent: Put the laws on trial\./);
  assert.match(prompt.system, /Never use an em dash or an en dash/);
  assert.equal(out.draft.units.length, 6);
});

test('syllabus: validation catches unit counts, numbering, missing parts and dashes', () => {
  assert.deepEqual(S.validateSyllabus(proposal()), []);
  assert.ok(S.validateSyllabus(proposal(5)).some(p => /5 units/.test(p)));
  assert.ok(S.validateSyllabus(proposal(11)).some(p => /11 units/.test(p)));
  const bad = proposal();
  bad.units[2].unit_number = 7;
  bad.units[3].readings = [epictetus];
  bad.units[4].proctor_brief = 'Probe the mask — and the face';
  bad.units[5].readings.push({ source: 'corpus', author: 'Seneca', work: 'Letters', role: 'counter_reading' });
  const p = S.validateSyllabus(bad);
  assert.ok(p.some(x => /unit 3 is numbered 7/.test(x)));
  assert.ok(p.some(x => /unit 4 has no assigned reading/.test(x)));
  assert.ok(p.some(x => /dash in syllabus\.units\[4\]\.proctor_brief/.test(x)));
  assert.ok(p.some(x => /needs section_labels or a search phrase/.test(x)));
});

test('syllabus: Greene summary chunks are matched to a law by their law range', () => {
  assert.ok(S.summaryCoversLaw('Laws 13-16 (Self-Interest, Spying, Crushing Enemies, Absence), pp. 1-8', 15));
  assert.ok(!S.summaryCoversLaw('Laws 13-16 (...), pp. 1-8', 17));
  assert.ok(!S.summaryCoversLaw('Preface, pp. 1-5', 1));
});

test('approve: the proposal becomes units and readings, with access and locators derived', async () => {
  const t = tables(); const db = fakeDb(t, rpcs);
  t.seminar_courses[0].syllabus_draft = { proposal: proposal() };
  const out = await S.approveSyllabus(db, 'sem-801', { search });
  assert.equal(out.ok, true, JSON.stringify(out.problems));
  assert.equal(t.seminar_units.length, 6);
  assert.equal(t.seminar_units[0].status, 'draft');
  const r = t.seminar_readings.filter(x => x.unit_id === t.seminar_units[1].id);
  assert.deepEqual(r.map(x => [x.author, x.access, x.locator]), [
    ['Robert Greene', 'own_copy', 'Law 15, pp. 107 to 114'],
    ['Epictetus', 'full_text_corpus', '1'],
    ['Cicero', 'full_text_corpus', 'Book 3'],
  ]);
  assert.equal(r[0].research_source_id, 'src48');
  assert.equal(r[0].research_section_key, 'law-15');
  assert.deepEqual(r[0].rag_chunk_ids, ['g1'], 'the Laws 13-16 summary, not the Laws 1-4 one');
  assert.deepEqual(r[2].rag_chunk_ids, ['c1', 'c2'], 'searched chunks are put in reading order');
  assert.equal(t.seminar_courses[0].status, 'in_review');
  assert.equal(out.searched.length, 6, 'every searched reading is listed for Kyle to check');
});

test('approve: refused on an unknown section, a missing label, or a course that already has units', async () => {
  const t = tables(); const db = fakeDb(t, rpcs);
  const p = proposal();
  p.units[0].readings[0] = greene('law-99');
  p.units[1].readings[1] = { ...epictetus, section_labels: ['53'] };
  t.seminar_courses[0].syllabus_draft = { proposal: p };
  const out = await S.approveSyllabus(db, 'sem-801', { search });
  assert.equal(out.ok, false);
  assert.ok(out.problems.some(x => /no indexed section "law-99"/.test(x)));
  assert.ok(out.problems.some(x => /no live chunks labelled "53"/.test(x)));
  assert.equal(t.seminar_units.length, 0, 'nothing is written when any reading fails');

  t.seminar_courses[0].syllabus_draft = { proposal: proposal() };
  assert.equal((await S.approveSyllabus(db, 'sem-801', { search })).ok, true);
  const again = await S.approveSyllabus(db, 'sem-801', { search });
  assert.equal(again.ok, false);
  assert.match(again.problems[0], /already has units/);
});

test('publish: a unit needs an active transcript; the course needs every unit published', async () => {
  const t = tables(); const db = fakeDb(t, rpcs);
  t.seminar_courses[0].syllabus_draft = { proposal: proposal() };
  await S.approveSyllabus(db, 'sem-801', { search });
  const [u1, u2] = t.seminar_units;
  assert.equal((await S.publishUnit(db, u1.id)).ok, false);
  t.seminar_transcripts.push({ id: 'x1', unit_id: u1.id, is_active: true, review_status: 'approved' });
  assert.equal((await S.publishUnit(db, u1.id)).ok, true);
  assert.equal(u1.status, 'published');
  const early = await S.publishCourse(db, 'sem-801');
  assert.equal(early.ok, false);
  assert.match(early.reason, /units not yet published: 2, 3, 4, 5, 6/);
  for (const u of t.seminar_units) u.status = 'published';
  assert.equal((await S.publishCourse(db, 'sem-801')).ok, true);
  assert.equal(t.seminar_courses[0].status, 'published');
  assert.ok(t.seminar_courses[0].published_at);
  assert.equal(u2.status, 'published');
});

test('questions: saved as drafts with reference answers; a dash or a bad type refuses the set', async () => {
  const t = tables(); const db = fakeDb(t, rpcs);
  t.seminar_units.push({ id: 'u1', course_id: 'sem-801', unit_number: 1, title: 'The court as the world', objectives: ['x'], proctor_brief: 'y' });
  t.seminar_readings.push({ unit_id: 'u1', position: 1, author: 'Robert Greene', work: 'The 48 Laws of Power', locator: 'Preface', role: 'assigned' });
  const transcript = { version: 1, turns: [{ speaker: 'tutor', text: 'Begin.' }], checks: { outline: { open_objection: 'Is the sage powerless?' } } };
  const good = { questions: [
    { type: 'recall', prompt: 'What does Epictetus put up to us (Ench. 1)?', rubric: { reference_answer: 'Opinion, impulse, desire, aversion.', must_include: ['Ench. 1'] } },
    { type: 'cross_examination', prompt: 'Answer the Preface from Discourses 1.1.', rubric: { reference_answer: 'The court is indifferent.' } },
  ] };
  let seen = null;
  const out = await Q.generateQuestions(db, 'u1', transcript, { call: async a => { seen = a; return reply(good)(); } });
  assert.equal(out.saved, true);
  assert.deepEqual(t.seminar_questions.map(q => [q.position, q.type, q.review_status]), [[1, 'recall', 'draft'], [2, 'cross_examination', 'draft']]);
  assert.equal(t.seminar_questions[0].rubric.reference_answer, 'Opinion, impulse, desire, aversion.');
  assert.match(seen.userPrompt, /Objection left standing: Is the sage powerless\?/);

  const dashed = { questions: [{ type: 'essay', prompt: 'Greene – right or wrong?', rubric: { reference_answer: 'Wrong.' } }] };
  const bad = await Q.generateQuestions(db, 'u1', transcript, { call: reply(dashed) });
  assert.equal(bad.saved, false);
  assert.ok(bad.problems.some(p => /type "essay"/.test(p)));
  assert.ok(bad.problems.some(p => /dash in questions\[0\]\.prompt/.test(p)));
  assert.equal(t.seminar_questions.length, 2);

  await Q.reviewQuestions(db, 'u1', { approve: [t.seminar_questions[0].id], reject: [t.seminar_questions[1].id] });
  assert.deepEqual(t.seminar_questions.map(q => q.review_status), ['approved', 'rejected']);
});
