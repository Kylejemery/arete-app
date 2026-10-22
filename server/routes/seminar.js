// ---------------------------------------------------------------------------
// Seminar Track admin endpoints: transcript generation and review
// (server/seminar/pipeline.js; Seminar Track spec, Part 3). Admin only.
//
//   POST /api/admin/seminar/units/:unitId/generate     {notes?}  start a run
//   GET  /api/admin/seminar/units/:unitId/job                     run status
//   POST /api/admin/seminar/transcripts/:id/approve
//   POST /api/admin/seminar/transcripts/:id/reject     {notes}
//   POST /api/admin/seminar/transcripts/:id/revise     {notes}   reject, then
//                                                                start a run
//   POST /api/admin/seminar/transcripts/:id/flags/:n/clear
//
// A run takes minutes (an outline and up to three drafts on Opus), longer
// than the proxy in front of this server waits, so generate and revise start
// the run and return 202; the builder polls the job. Jobs live in memory, one
// per unit: a run in progress refuses a second one for the same unit.
// ---------------------------------------------------------------------------
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const pipeline = require('../seminar/pipeline');

const router = express.Router();
const jobs = new Map();

let deps = null;
/**
 * @param {object} d
 * @param {(req) => Promise<string|null>} d.getAuthenticatedUserId
 * @param {(userId: string) => Promise<boolean>} d.isAdmin
 */
function init(d) { deps = d; }

let client = null;
const db = () => {
  if (!client) client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return client;
};

async function requireAdmin(req, res) {
  if (!deps) { res.status(500).json({ error: 'not_ready' }); return false; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.CLAUDE_API_KEY) {
    res.status(500).json({ error: 'not_configured', message: 'Server not configured for seminar generation.' });
    return false;
  }
  const userId = await deps.getAuthenticatedUserId(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  if (!(await deps.isAdmin(userId))) { res.status(403).json({ error: 'Forbidden' }); return false; }
  return true;
}

function startJob(unitId, run) {
  const job = { unit_id: unitId, status: 'running', stage: 'starting', started_at: new Date().toISOString() };
  jobs.set(unitId, job);
  run(stage => { job.stage = stage; })
    .then(out => {
      Object.assign(job, out.saved
        ? { status: 'saved', transcript_id: out.transcript.id, version: out.transcript.version, attempts: out.attempts }
        : { status: 'failed_verification', problems: out.problems, attempts: out.attempts });
    })
    .catch(err => {
      console.error(`[seminar] run for unit ${unitId} failed:`, err.message);
      Object.assign(job, { status: 'error', error: err.message });
    })
    .finally(() => { job.finished_at = new Date().toISOString(); });
  return job;
}

const busy = unitId => jobs.get(unitId)?.status === 'running';

router.post('/api/admin/seminar/units/:unitId/generate', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { unitId } = req.params;
  if (busy(unitId)) return res.status(409).json({ error: 'A run for this unit is already in progress' });
  const notes = String(req.body?.notes || '');
  const job = startJob(unitId, onStage => pipeline.generateTranscript(db(), unitId, { notes, onStage }));
  return res.status(202).json({ ok: true, job });
});

router.get('/api/admin/seminar/units/:unitId/job', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  return res.json({ job: jobs.get(req.params.unitId) || null });
});

router.post('/api/admin/seminar/transcripts/:id/approve', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const out = await pipeline.approve(db(), req.params.id);
    return out.ok ? res.json(out) : res.status(409).json(out);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/api/admin/seminar/transcripts/:id/reject', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    return res.json(await pipeline.reject(db(), req.params.id, String(req.body?.notes || '')));
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/api/admin/seminar/transcripts/:id/revise', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const notes = String(req.body?.notes || '').trim();
  if (!notes) return res.status(400).json({ error: 'A revision needs notes' });
  try {
    const { data: t, error } = await db().from('seminar_transcripts').select('unit_id').eq('id', req.params.id).single();
    if (error || !t) return res.status(404).json({ error: 'No such transcript' });
    if (busy(t.unit_id)) return res.status(409).json({ error: 'A run for this unit is already in progress' });
    const job = startJob(t.unit_id, onStage => pipeline.revise(db(), req.params.id, notes, { onStage }));
    return res.status(202).json({ ok: true, job });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/api/admin/seminar/transcripts/:id/flags/:n/clear', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const out = await pipeline.clearFlag(db(), req.params.id, req.params.n);
    return out.ok ? res.json(out) : res.status(404).json(out);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = { router, init };
