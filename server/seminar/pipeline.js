// server/seminar/pipeline.js
//
// Generates, verifies and reviews Seminar Track transcripts (Seminar Track
// spec, Part 3). The same pattern as synthesis drafts: an agent writes a
// version, programmatic checks gate it, and Kyle approves, rejects with
// notes, or sends it back for a revision, which becomes a new version.
//
//   generateTranscript  outline, draft, verify; a draft that fails is sent
//                       back to the Draft agent with the problems, up to
//                       MAX_ATTEMPTS drafts. A transcript that still fails is
//                       never saved, so it is never shown for review.
//   approve             only a verified transcript with every fence flag
//                       cleared; it becomes the unit's one active version.
//   reject / revise     record Kyle's notes; revise then generates the next
//                       version from the notes and the rejected turns.
//   clearFlag           Kyle clears one fence flag after reading the turn.
//
// Every function takes the Supabase client first and its model calls as
// options, so the tests run on fakes.

const V = require('./verify');
const { loadUnitContext, resolveCite } = require('./context');
const { outlineUnit, draftUnit, DRAFT_MODEL } = require('./agents');
const { classifyEndorsement } = require('./fence');

const MAX_ATTEMPTS = 3;
const DEFAULT_PAUSE_MS = 600;

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

// The agent's turns as stored: numbered, speakers lowercased, cites resolved
// from refs, pauses clamped.
function normalizeTurns(raw, ctx) {
  return raw.map((t, i) => ({
    n: i + 1,
    speaker: String(t.speaker || '').toLowerCase(),
    text: String(t.text || '').trim(),
    cites: (Array.isArray(t.cites) ? t.cites : []).map(c => resolveCite(c, ctx)),
    segment: String(t.segment || ''),
    pause_after_ms: Number.isFinite(t.pause_after_ms) ? Math.max(0, Math.min(3000, Math.round(t.pause_after_ms))) : DEFAULT_PAUSE_MS,
  }));
}

// Who the fence protects against: the counter work in source_works, else the
// first assigned reading.
function opponentOf(ctx) {
  const works = ctx.course.source_works || [];
  const counter = works.find(w => w.role === 'counter') || works.find(w => w.role === 'primary');
  const r = ctx.readings.find(x => x.role === 'assigned');
  return { opponent: counter?.author || r?.author || 'the author', work: counter?.work || r?.work || 'the assigned work' };
}

function lookupChunksWith(supabase) {
  return async ids => must(supabase.from('rag_corpus').select('id, deprecated').in('id', ids), 'cited chunks');
}

/**
 * @param {object} opts
 * @param {string} [opts.notes]          Kyle's revision notes
 * @param {object[]} [opts.prior]        turns of the version being revised
 * @param {function} [opts.call]         model call (tests)
 * @param {function} [opts.classify]     fence classifier (tests)
 * @param {function} [opts.onStage]      progress callback (stage name)
 * @returns {Promise<{saved: boolean, transcript?: object, problems?: object[], attempts: number}>}
 */
async function generateTranscript(supabase, unitId, opts = {}) {
  const { notes = '', prior = null, call, classify, onStage = () => {} } = opts;
  onStage('loading');
  const ctx = await loadUnitContext(supabase, unitId);
  const callOpt = call ? { call } : {};
  const fence = classify || (turns => classifyEndorsement(turns, opponentOf(ctx), callOpt));

  onStage('outline');
  const outline = await outlineUnit(ctx, { notes, ...callOpt });

  let previous = null;
  let result = null;
  let turns = null;
  let attempts = 0;
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    onStage(`draft ${attempts}`);
    const raw = await draftUnit(ctx, outline, { notes, previous, prior, ...callOpt });
    turns = normalizeTurns(raw, ctx);
    onStage(`verify ${attempts}`);
    result = await V.verifyTranscript({
      turns,
      speakers: [{ key: 'tutor' }, { key: 'student' }],
      stance: ctx.course.stance,
      readings: ctx.readings,
      quotationSources: ctx.quotationSources,
      lookupChunks: lookupChunksWith(supabase),
      classify: fence,
    });
    if (result.ok) break;
    previous = { turns, problems: result.problems };
  }
  if (!result.ok) return { saved: false, problems: result.problems, attempts };

  onStage('saving');
  const latest = await must(
    supabase.from('seminar_transcripts').select('version').eq('unit_id', unitId).order('version', { ascending: false }).limit(1),
    'latest version'
  );
  const version = (latest[0]?.version || 0) + 1;
  const transcript = await must(supabase.from('seminar_transcripts').insert({
    unit_id: unitId,
    version,
    turns,
    word_count: result.stats.word_count,
    est_minutes: result.stats.est_minutes,
    review_status: 'draft',
    checks: { ...result, outline, attempts, revision_notes: notes || null },
    generation_model: DRAFT_MODEL,
  }).select().single(), 'insert transcript');
  return { saved: true, transcript, attempts };
}

async function getTranscript(supabase, id) {
  return must(supabase.from('seminar_transcripts').select('*').eq('id', id).single(), 'transcript');
}

async function approve(supabase, id) {
  const t = await getTranscript(supabase, id);
  const gate = V.canApprove(t.checks);
  if (!gate.ok) return { ok: false, reason: gate.reason };
  // One active version per unit (seminar_transcripts_one_active): retire the
  // current one first.
  await must(supabase.from('seminar_transcripts').update({ is_active: false }).eq('unit_id', t.unit_id).eq('is_active', true), 'retire active');
  const row = await must(supabase.from('seminar_transcripts')
    .update({ review_status: 'approved', is_active: true, reviewed_at: new Date().toISOString() })
    .eq('id', id).select().single(), 'approve');
  return { ok: true, transcript: row };
}

async function reject(supabase, id, notes) {
  const row = await must(supabase.from('seminar_transcripts')
    .update({ review_status: 'rejected', is_active: false, review_notes: notes || null, reviewed_at: new Date().toISOString() })
    .eq('id', id).select().single(), 'reject');
  return { ok: true, transcript: row };
}

async function revise(supabase, id, notes, opts = {}) {
  if (!String(notes || '').trim()) return { ok: false, reason: 'a revision needs notes' };
  const { transcript } = await reject(supabase, id, notes);
  const out = await generateTranscript(supabase, transcript.unit_id, { ...opts, notes, prior: transcript.turns });
  return { ok: out.saved, ...out };
}

async function clearFlag(supabase, id, n) {
  const t = await getTranscript(supabase, id);
  const flags = t.checks?.fence?.flags || [];
  const flag = flags.find(f => f.n === Number(n));
  if (!flag) return { ok: false, reason: `no fence flag on turn ${n}` };
  flag.cleared = true;
  flag.cleared_at = new Date().toISOString();
  const row = await must(supabase.from('seminar_transcripts')
    .update({ checks: { ...t.checks, fence: { ...t.checks.fence, flags } } })
    .eq('id', id).select().single(), 'clear flag');
  return { ok: true, transcript: row };
}

module.exports = { MAX_ATTEMPTS, normalizeTurns, opponentOf, generateTranscript, approve, reject, revise, clearFlag };
