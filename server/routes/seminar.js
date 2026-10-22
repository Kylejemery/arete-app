// ---------------------------------------------------------------------------
// Seminar Track endpoints (Seminar Track spec, Parts 2 to 4).
//
// Admin, the Seminar Builder (academy /admin/seminar proxies here):
//   GET   /api/admin/seminar/sources                      corpus catalog and research sources
//   POST  /api/admin/seminar/courses                      create a draft course
//   PATCH /api/admin/seminar/courses/:id                  edit fields or the syllabus proposal
//   POST  /api/admin/seminar/courses/:id/syllabus         run the Syllabus agent (job)
//   POST  /api/admin/seminar/courses/:id/syllabus/approve proposal -> units and readings
//   POST  /api/admin/seminar/courses/:id/publish          every unit published -> course live
//   PATCH /api/admin/seminar/units/:id                    edit a unit
//   PATCH /api/admin/seminar/readings/:id                 edit a reading's guide or locator
//   POST  /api/admin/seminar/units/:id/generate {notes?}  transcript, then questions (job)
//   POST  /api/admin/seminar/units/:id/questions/review   {approve: [ids], reject: [ids]}
//   POST  /api/admin/seminar/units/:id/publish            needs an approved transcript
//   GET   /api/admin/seminar/jobs/:key                    job status (unit id or course:<id>)
//   POST  /api/admin/seminar/transcripts/:id/approve
//   POST  /api/admin/seminar/transcripts/:id/reject       {notes}
//   POST  /api/admin/seminar/transcripts/:id/revise       {notes} (job)
//   POST  /api/admin/seminar/transcripts/:id/flags/:n/clear
//
// Members, the classroom:
//   GET   /api/seminar/courses/:courseId                  the course and its visible units
//   GET   /api/seminar/units/:unitId                      the reading pane, transcript, questions
//
// Agent runs take minutes, longer than the proxy in front of this server
// waits, so they return 202 and the builder polls the job. Jobs live in
// memory, one per unit or course: a run in progress refuses a second.
//
// Every admin write of text runs the dash check (seminar/verify.js); the
// transcript checks run inside the pipeline.
// ---------------------------------------------------------------------------
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const pipeline = require('../seminar/pipeline');
const syllabus = require('../seminar/syllabus');
const questions = require('../seminar/questions');
const { findDashes } = require('../seminar/verify');
const { modernFenceParams } = require('../lib/corpus-fence');

const router = express.Router();
const jobs = new Map();

let deps = null;
/**
 * @param {object} d
 * @param {(req) => Promise<string|null>} d.getAuthenticatedUserId
 * @param {(userId: string) => Promise<boolean>} d.isAdmin
 * @param {(text: string) => Promise<number[]>} d.embedQuery
 */
function init(d) { deps = d; }

let client = null;
const db = () => {
  if (!client) client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return client;
};

async function requireAdmin(req, res) {
  if (!deps) { res.status(500).json({ error: 'not_ready' }); return null; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.CLAUDE_API_KEY) {
    res.status(500).json({ error: 'not_configured', message: 'Server not configured for the Seminar Builder.' });
    return null;
  }
  const userId = await deps.getAuthenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (!(await deps.isAdmin(userId))) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return userId;
}

const handle = fn => async (req, res) => {
  try { await fn(req, res); } catch (err) {
    console.error(`[seminar] ${req.method} ${req.path}:`, err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

// Fields an admin may set, per table, and the dash check over them.
const pick = (body, fields) => Object.fromEntries(fields.filter(f => body[f] !== undefined).map(f => [f, body[f]]));
function dashRefusal(res, value, label) {
  const p = findDashes(value, label);
  if (!p.length) return false;
  res.status(422).json({ error: 'No em or en dashes', problems: p.map(x => x.detail) });
  return true;
}

// ── Jobs ────────────────────────────────────────────────────────────────────

function startJob(key, run) {
  const job = { key, status: 'running', stage: 'starting', started_at: new Date().toISOString() };
  jobs.set(key, job);
  run(stage => { job.stage = stage; })
    .then(out => Object.assign(job, out))
    .catch(err => {
      console.error(`[seminar] job ${key} failed:`, err.message);
      Object.assign(job, { status: 'error', error: err.message });
    })
    .finally(() => { job.finished_at = new Date().toISOString(); });
  return job;
}
const busy = key => jobs.get(key)?.status === 'running';

const transcriptOutcome = out => (out.saved
  ? { status: 'saved', transcript_id: out.transcript.id, version: out.transcript.version, attempts: out.attempts }
  : { status: 'failed_verification', problems: out.problems, attempts: out.attempts });

router.get('/api/admin/seminar/jobs/:key', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.json({ job: jobs.get(req.params.key) || null });
}));

// ── Sources and courses ─────────────────────────────────────────────────────

router.get('/api/admin/seminar/sources', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const catalog = await must(db().rpc('seminar_corpus_catalog'), 'catalog');
  const research = await must(db().from('research_sources').select('id, author, work, edition_year, licence_status').eq('deprecated', false), 'research sources');
  const sections = await must(db().from('research_source_sections').select('source_id').eq('deprecated', false), 'sections');
  const indexed = new Set(sections.map(s => s.source_id));
  res.json({
    corpus: catalog.map(c => ({ author: c.author, work: c.work, text_type: c.text_type, chunks: c.chunks, labelled: c.labels.length > 0 })),
    research: research.map(r => ({ ...r, indexed: indexed.has(r.id) })),
  });
}));

const COURSE_FIELDS = ['title', 'subtitle', 'description', 'stance', 'tier_required', 'source_works', 'intent'];

router.post('/api/admin/seminar/courses', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const row = { id: String(req.body?.id || ''), ...pick(req.body || {}, COURSE_FIELDS), status: 'draft' };
  if (!/^sem-\d{3}$/.test(row.id)) return res.status(400).json({ error: 'Course ids are sem-NNN' });
  if (dashRefusal(res, row, 'course')) return;
  const { data, error } = await db().from('seminar_courses').insert(row).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true, course: data });
}));

router.patch('/api/admin/seminar/courses/:id', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const patch = pick(req.body || {}, COURSE_FIELDS);
  // The builder saves Kyle's inline edits to the proposal, and his notes for
  // a re-run, here.
  if (req.body?.proposal !== undefined || req.body?.notes !== undefined) {
    const course = await must(db().from('seminar_courses').select('syllabus_draft').eq('id', req.params.id).single(), 'course');
    patch.syllabus_draft = {
      ...(course.syllabus_draft || {}),
      ...(req.body.proposal !== undefined ? { proposal: req.body.proposal, edited_at: new Date().toISOString() } : {}),
      ...(req.body.notes !== undefined ? { notes: String(req.body.notes) } : {}),
    };
  }
  if (dashRefusal(res, patch, 'course')) return;
  const course = await must(db().from('seminar_courses').update(patch).eq('id', req.params.id).select().single(), 'update course');
  const problems = course.syllabus_draft?.proposal ? syllabus.validateSyllabus(course.syllabus_draft.proposal) : [];
  res.json({ ok: true, course, problems });
}));

router.post('/api/admin/seminar/courses/:id/syllabus', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const key = `course:${req.params.id}`;
  if (busy(key)) return res.status(409).json({ error: 'A syllabus run for this course is already in progress' });
  const course = await must(db().from('seminar_courses').select('*').eq('id', req.params.id).single(), 'course');
  const job = startJob(key, async onStage => {
    onStage('reading the sources');
    const out = await syllabus.proposeSyllabus(db(), course);
    onStage('saving');
    await must(db().from('seminar_courses').update({
      syllabus_draft: { ...(course.syllabus_draft || {}), proposal: out.draft, abridged: out.abridged, source_chars: out.source_chars, proposed_at: new Date().toISOString() },
    }).eq('id', course.id).select().single(), 'save proposal');
    return { status: 'saved', units: out.draft.units.length, abridged: out.abridged, problems: syllabus.validateSyllabus(out.draft) };
  });
  res.status(202).json({ ok: true, job });
}));

// Readings in an unlabelled work are found by searching inside that work.
async function searchWork(author, work, phrase) {
  if (!deps.embedQuery || !process.env.OPENAI_API_KEY) throw new Error('search needs the embedder (OPENAI_API_KEY)');
  const hits = await must(db().rpc('match_rag_corpus', {
    query_embedding: await deps.embedQuery(`${work}: ${phrase}`),
    match_count: 60,
    filter_author: author,
    ...modernFenceParams(),
  }), `search in ${work}`);
  const ids = (hits || []).filter(h => h.work === work).slice(0, syllabus.SEARCH_CHUNKS).map(h => h.id);
  if (!ids.length) return [];
  return must(db().from('rag_corpus').select('id, section_label, chunk_index, text_type').in('id', ids), 'searched chunks');
}

router.post('/api/admin/seminar/courses/:id/syllabus/approve', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const out = await syllabus.approveSyllabus(db(), req.params.id, { search: searchWork });
  res.status(out.ok ? 200 : 422).json(out);
}));

router.post('/api/admin/seminar/courses/:id/publish', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const out = await syllabus.publishCourse(db(), req.params.id);
  res.status(out.ok ? 200 : 409).json(out);
}));

// ── Units and readings ──────────────────────────────────────────────────────

router.patch('/api/admin/seminar/units/:id', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const patch = pick(req.body || {}, ['title', 'objectives', 'key_concepts', 'proctor_brief']);
  if (dashRefusal(res, patch, 'unit')) return;
  res.json({ ok: true, unit: await must(db().from('seminar_units').update(patch).eq('id', req.params.id).select().single(), 'update unit') });
}));

router.patch('/api/admin/seminar/readings/:id', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const patch = pick(req.body || {}, ['reading_guide', 'locator']);
  if (dashRefusal(res, patch, 'reading')) return;
  res.json({ ok: true, reading: await must(db().from('seminar_readings').update(patch).eq('id', req.params.id).select().single(), 'update reading') });
}));

// Generate unit: the transcript, then (if it was saved) the questions.
router.post('/api/admin/seminar/units/:id/generate', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const unitId = req.params.id;
  if (busy(unitId)) return res.status(409).json({ error: 'A run for this unit is already in progress' });
  const notes = String(req.body?.notes || '');
  const job = startJob(unitId, async onStage => {
    const out = await pipeline.generateTranscript(db(), unitId, { notes, onStage });
    const result = transcriptOutcome(out);
    if (!out.saved) return result;
    onStage('questions');
    const q = await questions.generateQuestions(db(), unitId, out.transcript);
    return { ...result, questions: q.saved ? q.questions.length : 0, question_problems: q.problems || [] };
  });
  res.status(202).json({ ok: true, job });
}));

router.post('/api/admin/seminar/units/:id/questions/review', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const approve = Array.isArray(req.body?.approve) ? req.body.approve : [];
  const reject = Array.isArray(req.body?.reject) ? req.body.reject : [];
  res.json(await questions.reviewQuestions(db(), req.params.id, { approve, reject }));
}));

router.post('/api/admin/seminar/units/:id/publish', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const out = await syllabus.publishUnit(db(), req.params.id);
  res.status(out.ok ? 200 : 409).json(out);
}));

// ── Transcript review ───────────────────────────────────────────────────────

router.post('/api/admin/seminar/transcripts/:id/approve', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const out = await pipeline.approve(db(), req.params.id);
  res.status(out.ok ? 200 : 409).json(out);
}));

router.post('/api/admin/seminar/transcripts/:id/reject', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.json(await pipeline.reject(db(), req.params.id, String(req.body?.notes || '')));
}));

router.post('/api/admin/seminar/transcripts/:id/revise', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const notes = String(req.body?.notes || '').trim();
  if (!notes) return res.status(400).json({ error: 'A revision needs notes' });
  const t = await must(db().from('seminar_transcripts').select('unit_id').eq('id', req.params.id).single(), 'transcript');
  if (busy(t.unit_id)) return res.status(409).json({ error: 'A run for this unit is already in progress' });
  const job = startJob(t.unit_id, async onStage => transcriptOutcome(await pipeline.revise(db(), req.params.id, notes, { onStage })));
  res.status(202).json({ ok: true, job });
}));

router.post('/api/admin/seminar/transcripts/:id/flags/:n/clear', handle(async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const out = await pipeline.clearFlag(db(), req.params.id, req.params.n);
  res.status(out.ok ? 200 : 404).json(out);
}));

// ── Members: the classroom ──────────────────────────────────────────────────

const TIER_RANK = { auditor: 0, scholar: 1, fellow: 2 };

// The same standing the RLS helper seminar_member_rank() computes.
async function memberRank(userId) {
  const { data } = await db().from('profiles').select('tier, is_premium').eq('id', userId).maybeSingle();
  const t = String(data?.tier || '').toLowerCase();
  if (t === 'pro') return 2;
  if (['premium', 'arete', 'scholar'].includes(t) || data?.is_premium) return 1;
  return 0;
}

// Who is asking, and may they see this course? Admins see drafts.
async function viewer(req, res, courseId) {
  if (!deps) { res.status(500).json({ error: 'not_ready' }); return null; }
  const userId = await deps.getAuthenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const admin = await deps.isAdmin(userId);
  const { data: course } = await db().from('seminar_courses').select('*').eq('id', courseId).maybeSingle();
  if (!course) { res.status(404).json({ error: 'No such course' }); return null; }
  if (!admin && (course.status !== 'published' || (await memberRank(userId)) < TIER_RANK[course.tier_required])) {
    res.status(403).json({ error: 'This seminar is not open to you yet' });
    return null;
  }
  return { userId, admin, course };
}

router.get('/api/seminar/courses/:courseId', handle(async (req, res) => {
  const v = await viewer(req, res, req.params.courseId);
  if (!v) return;
  let q = db().from('seminar_units').select('id, unit_number, title, objectives, key_concepts, proctor_brief, status').eq('course_id', v.course.id).order('unit_number', { ascending: true });
  if (!v.admin) q = q.eq('status', 'published');
  const units = await must(q, 'units');
  // The classroom gates unit N on the quiz of unit N-1; a unit with no
  // approved questions does not gate.
  const qs = units.length
    ? await must(db().from('seminar_questions').select('unit_id').eq('review_status', 'approved').in('unit_id', units.map(u => u.id)), 'question counts')
    : [];
  const count = qs.reduce((m, x) => m.set(x.unit_id, (m.get(x.unit_id) || 0) + 1), new Map());
  const { id, title, subtitle, description, stance, tier_required, status, source_works, objectives } = v.course;
  res.json({
    admin: v.admin,
    course: { id, title, subtitle, description, stance, tier_required, status, source_works, objectives },
    units: units.map(u => ({ ...u, question_count: count.get(u.id) || 0 })),
  });
}));

// The reading pane, by licence (spec Part 2):
//   full_text_corpus  the public domain text, chunk by chunk, with locators
//   own_copy          the assignment, the guide and the corpus summary; the
//                     admin also gets the private full text of an indexed
//                     section, which members never do
//   admin_private     the admin only; members do not see the reading at all
router.get('/api/seminar/units/:unitId', handle(async (req, res) => {
  const { data: unit } = await db().from('seminar_units').select('*').eq('id', req.params.unitId).maybeSingle();
  if (!unit) return res.status(404).json({ error: 'No such unit' });
  const v = await viewer(req, res, unit.course_id);
  if (!v) return;
  if (!v.admin && unit.status !== 'published') return res.status(403).json({ error: 'This unit is not open yet' });

  const readings = await must(db().from('seminar_readings').select('*').eq('unit_id', unit.id).order('position', { ascending: true }), 'readings');
  const visible = readings.filter(r => v.admin || r.access !== 'admin_private');
  const ids = [...new Set(visible.flatMap(r => r.rag_chunk_ids || []))];
  const chunks = ids.length ? await must(db().from('rag_corpus').select('id, section_label, chunk_text, text_type, deprecated').in('id', ids), 'chunks') : [];
  const byId = new Map(chunks.filter(c => !c.deprecated).map(c => [c.id, c]));

  const pane = [];
  for (const r of visible) {
    const passages = (r.rag_chunk_ids || []).map(id => byId.get(id)).filter(Boolean)
      .map(c => ({ chunk_id: c.id, section_label: c.section_label, text: c.chunk_text, text_type: c.text_type }));
    let full_text = null;
    if (v.admin && r.research_source_id && r.research_section_key) {
      full_text = await must(db().rpc('research_source_section_text', { p_source: r.research_source_id, p_key: r.research_section_key }), 'full text');
    }
    pane.push({
      id: r.id, position: r.position, author: r.author, work: r.work, locator: r.locator, role: r.role, access: r.access,
      reading_guide: r.reading_guide, passages, full_text,
    });
  }

  let tq = db().from('seminar_transcripts').select('id, version, speakers, turns, word_count, est_minutes, audio_status, audio_url, audio_duration_s, review_status, is_active').eq('unit_id', unit.id);
  tq = tq.eq('is_active', true);
  const [transcript] = await must(tq, 'transcript');
  let qq = db().from('seminar_questions').select('id, position, type, prompt, rubric, review_status').eq('unit_id', unit.id).order('position', { ascending: true });
  qq = qq.eq('review_status', 'approved');
  const qs = await must(qq, 'questions');

  res.json({
    admin: v.admin,
    unit,
    readings: pane,
    transcript: transcript || null,
    questions: qs.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, answer: q.rubric?.reference_answer || '' })),
  });
}));

module.exports = { router, init };
