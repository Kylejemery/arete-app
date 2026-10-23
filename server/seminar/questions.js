// server/seminar/questions.js
//
// The unit quiz for a Seminar Track unit (Seminar Track spec, Part 4, the
// Generate unit step). One Opus call writes the questions from the unit's
// approved material: its objectives, proctor brief, readings and the
// transcript version just saved. Questions land as drafts for Kyle; the
// classroom shows only approved ones, graded under the doctoral standard
// (lib/doctoral.ts) as open questions with a reference answer.
//
// Every question passes the dash check before it is saved.

const { extractJson } = require('../synthesis/shared');
const { callClaudeStream, readReply, glimpse } = require('./claude');
const { findDashes } = require('./verify');

const QUESTIONS_MODEL = 'claude-opus-5-5';
const TYPES = ['recall', 'analysis', 'cross_examination', 'application'];

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

const SYSTEM = `You write the written quiz for one unit of a doctoral seminar in the Arete Academy. The student answers in prose; a grader compares each answer with your reference answer under a doctoral standard (claims about a text need a locus; a scholar's or an author's position must be stated as he holds it).

Write 4 to 6 questions covering every objective. Types: recall (what a text says, with its locus), analysis (how an argument works), application (a new case), and, for a course that reads an opponent, cross_examination (put the author's claim against a named Stoic text). At least one question asks the student to answer the objection the transcript leaves standing.

Each question has a reference answer of 80 to 200 words that a specialist would accept, with loci, and a list of what a full answer must contain. Never use an em dash or an en dash.

Return only JSON:
{"questions": [{"type": "<recall | analysis | cross_examination | application>", "prompt": "...", "rubric": {"reference_answer": "...", "must_include": ["..."]}}]}`;

async function generateQuestions(supabase, unitId, transcript, { call = callClaudeStream, model = QUESTIONS_MODEL } = {}) {
  const unit = await must(supabase.from('seminar_units').select('*').eq('id', unitId).single(), 'unit');
  const course = await must(supabase.from('seminar_courses').select('id, title, stance').eq('id', unit.course_id).single(), 'course');
  const readings = await must(supabase.from('seminar_readings').select('author, work, locator, role').eq('unit_id', unitId).order('position', { ascending: true }), 'readings');
  const userPrompt = `COURSE: ${course.id}, ${course.title}. Stance: ${course.stance}.
UNIT ${unit.unit_number}: ${unit.title}
Objectives: ${JSON.stringify(unit.objectives)}
Proctor brief: ${unit.proctor_brief || ''}
Readings: ${readings.map(r => `${r.author}, ${r.work}, ${r.locator} (${r.role})`).join('; ')}
Objection left standing: ${transcript.checks?.outline?.open_objection || '(see transcript)'}

TRANSCRIPT (version ${transcript.version}):
${transcript.turns.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n')}`;
  const data = await call({ model, system: SYSTEM, userPrompt, maxTokens: 32000, effort: 'high' });
  const text = readReply(data, 'the questions agent');
  const parsed = extractJson(text);
  const qs = (parsed && Array.isArray(parsed.questions)) ? parsed.questions : [];
  if (!qs.length) throw new Error(`the questions agent returned no questions.${glimpse(text)}`);
  const problems = [];
  qs.forEach((q, i) => {
    if (!TYPES.includes(q.type)) problems.push(`question ${i + 1}: type "${q.type}"`);
    if (!String(q.prompt || '').trim()) problems.push(`question ${i + 1} is empty`);
    if (!String(q.rubric?.reference_answer || '').trim()) problems.push(`question ${i + 1} has no reference answer`);
  });
  problems.push(...findDashes(qs, 'questions').map(p => p.detail));
  if (problems.length) return { saved: false, problems };

  // New questions follow any earlier set; earlier drafts stay as they are.
  const prior = await must(supabase.from('seminar_questions').select('position').eq('unit_id', unitId).order('position', { ascending: false }).limit(1), 'question positions');
  const start = prior[0]?.position || 0;
  const rows = [];
  for (const [i, q] of qs.entries()) {
    rows.push(await must(supabase.from('seminar_questions').insert({
      unit_id: unitId,
      position: start + i + 1,
      type: q.type,
      prompt: q.prompt,
      rubric: { reference_answer: q.rubric.reference_answer, must_include: q.rubric.must_include || [], transcript_version: transcript.version },
      review_status: 'draft',
    }).select().single(), `question ${i + 1}`));
  }
  return { saved: true, questions: rows };
}

// Kyle approves or rejects a unit's draft questions in one pass.
async function reviewQuestions(supabase, unitId, { approve = [], reject = [] }) {
  for (const id of approve) await must(supabase.from('seminar_questions').update({ review_status: 'approved' }).eq('id', id).eq('unit_id', unitId).select(), 'approve question');
  for (const id of reject) await must(supabase.from('seminar_questions').update({ review_status: 'rejected' }).eq('id', id).eq('unit_id', unitId).select(), 'reject question');
  return { ok: true };
}

module.exports = { QUESTIONS_MODEL, TYPES, generateQuestions, reviewQuestions };
