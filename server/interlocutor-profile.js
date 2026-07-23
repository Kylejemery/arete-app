// server/interlocutor-profile.js
//
// Interlocutor Writing Profile Agent — the derivation half of the Interlocutor.
//
// The critique route writes one critique_history row per critique but never
// reads them back, and writing_profile has no client write path. This job is
// what closes the loop: it reads a student's whole critique_history and derives
// the one writing_profile row the critique route injects next time. That row is
// what lets the agent say "the fourth time in six weeks" instead of judging
// every piece as if it were the first. Without it the Interlocutor is a critic;
// with it, a teacher.
//
// Cadence is time-triggered but content-gated. A writer critiques ten pieces in
// a day or none for a month, so a weekly clock serves neither: the cron sweeps
// daily, but a user is re-derived only when they have new critiques since their
// last derivation (pieces_reviewed on the profile vs the live count). Unchanged
// users cost one integer comparison, not a Claude call.
//
// The counts and date spans are computed HERE, in code, from dimensions_flagged
// and created_at. The model names the pattern and decides what is recurring
// versus cleared, but it never counts: "the fourth time" has to be true, and a
// model asked to tally its own evidence will drift. Same division of labour as
// the Longitudinal User Model Agent, which computes theme persistence in code.
//
// Standalone script (its own Railway cron service). Raw fetch to Anthropic, no
// SDK, matching the sibling agents. No retrieval, so OpenAI is not needed.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// The six rubric dimensions, mirrored from academy/web/src/lib/interlocutor.ts.
// Kept as a plain list rather than imported: this is a separate Node service
// with no path into the Next.js app.
const RUBRIC_DIMENSIONS = ['thesis', 'validity', 'soundness', 'charity', 'economy', 'fidelity'];

const DEFAULTS = {
  min_critiques: 3,        // fewer than this is too little to call anything a pattern
  recent_detail_count: 30, // full text of at most this many recent critiques goes to Claude
  cleared_window: 3,       // a dimension absent from the last N critiques is a cleared candidate
  excerpt_chars: 400,      // per-critique excerpt cap in the prompt
  critique_chars: 900,     // per-critique critique-text cap in the prompt
  model: DEFAULT_MODEL,
};

function shortId(id) {
  return (id || '').toString().slice(0, 8);
}

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'interlocutor-profile')
    .maybeSingle();
  return { ...DEFAULTS, ...(data?.config || {}) };
}

// --- Eligibility ------------------------------------------------------------

// Users with at least `minCritiques` critique_history rows. critique_history is
// small at current scale, so tallying client-side is safe (mirrors the
// longitudinal agent's approach to journal_analysis).
async function getEligibleUsers(minCritiques) {
  const { data, error } = await supabase
    .from('critique_history')
    .select('user_id')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`eligible users: ${error.message}`);

  const countByUser = new Map();
  for (const row of data || []) {
    if (!row.user_id) continue;
    countByUser.set(row.user_id, (countByUser.get(row.user_id) || 0) + 1);
  }

  const eligible = [];
  const skipped = [];
  for (const [userId, count] of countByUser.entries()) {
    if (count >= minCritiques) eligible.push({ userId, count });
    else skipped.push({ userId, count });
  }
  return { eligible, skipped };
}

// --- Data gathering ---------------------------------------------------------

// All critique_history rows for a user, oldest → newest.
async function getCritiqueHistory(userId) {
  const { data } = await supabase
    .from('critique_history')
    .select('excerpt, dimensions_flagged, critique, piece_title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return data || [];
}

async function getPriorProfile(userId) {
  const { data } = await supabase
    .from('writing_profile')
    .select('current_edge, pieces_reviewed')
    .eq('user_id', userId)
    .maybeSingle();
  return data || null;
}

// --- Dimension statistics (the counts the model must not do itself) ---------

const day = (iso) => (iso ? String(iso).slice(0, 10) : null);

// Per-dimension frequency and span across ALL of a user's critiques, plus
// whether the dimension has gone quiet in the most recent `clearedWindow`. This
// is the authoritative signal: the model receives these numbers and reasons
// about them, but does not recompute them.
function computeDimensionStats(critiques, clearedWindow) {
  const recentCutoff = critiques.length - clearedWindow;
  const stats = {};
  for (const dim of RUBRIC_DIMENSIONS) {
    stats[dim] = { count: 0, first_seen: null, last_seen: null, in_recent: false, in_earlier: false };
  }

  critiques.forEach((c, i) => {
    const flagged = Array.isArray(c.dimensions_flagged) ? c.dimensions_flagged : [];
    for (const dim of flagged) {
      const s = stats[dim];
      if (!s) continue; // ignore anything outside the known rubric
      s.count += 1;
      if (!s.first_seen) s.first_seen = c.created_at;
      s.last_seen = c.created_at;
      if (i >= recentCutoff) s.in_recent = true;
      else s.in_earlier = true;
    }
  });

  return stats;
}

// --- Claude generation ------------------------------------------------------

const SYSTEM_PROMPT = `You are the memory of the Interlocutor, a teacher of philosophical writing. Your job is to read the full record of critiques a single student has received and derive a durable profile of them as a writer: the failures that recur, the standards they have cleared, their genuine strengths, and the one edge to press on now.

This profile is injected into the Interlocutor before it reads the student's next piece. It is what lets the teacher name a pattern ("the fourth time in six weeks your thesis has been undeniable") instead of correcting the same instance forever. So it must be true to the record and nothing more.

Rules:

GROUND EVERYTHING. Every failure, cleared standard, and strength must be visible in the critiques provided. Do not infer a tendency from a single instance, and do not invent one the record does not show. Where the record is thin, say less.

A RECURRING FAILURE is a dimension the student fails repeatedly and still fails. If a dimension was flagged early but is absent from recent critiques, that is a CLEARED STANDARD, not a recurring failure — name it as cleared, so the teacher stops praising it and presses elsewhere. A dimension flagged once is neither; it is a note, not a pattern.

DO NOT COUNT. The frequencies and date spans are computed for you and provided per dimension. Use them; do not produce your own numbers. Your job is to name what the failure IS in this student's writing (how their thesis fails, not merely that "thesis" was flagged), in your own words, specifically.

STRENGTHS MUST BE EARNED. Only name a strength the critiques actually credit. Automatic praise makes the whole profile unreliable.

THE EDGE IS SINGULAR. current_edge is the one thing to press on now: usually the most persistent unresolved failure, or the next dimension up once the obvious one is cleared.

Never use em dashes or en dashes. Use commas, colons, semicolons, or parentheses.

Respond ONLY with valid JSON, no markdown fences:
{
  "recurring_failures": [{ "dimension": "one of the six", "description": "how this student fails it, specifically, in your words" }],
  "cleared_standards": [{ "dimension": "one of the six", "note": "what they now do reliably" }],
  "strengths": [{ "strength": "short name", "evidence": "what in the record shows it" }],
  "current_edge": "the single thing to press on now"
}`;

function buildUserMessage(input, config) {
  const statLines = RUBRIC_DIMENSIONS.map((dim) => {
    const s = input.stats[dim];
    if (!s.count) return `- ${dim}: never flagged`;
    const span = s.first_seen === s.last_seen ? day(s.first_seen) : `${day(s.first_seen)} to ${day(s.last_seen)}`;
    const recency = s.in_recent
      ? 'flagged in recent critiques'
      : `absent from the last ${config.cleared_window} critiques${s.in_earlier ? ' (cleared candidate)' : ''}`;
    return `- ${dim}: flagged ${s.count}x, ${span}, ${recency}`;
  }).join('\n');

  // Full text of the most recent critiques only; the stats above already cover
  // the whole history, so the detail window is about texture, not counting.
  const recent = input.critiques.slice(-config.recent_detail_count);
  const detail = recent
    .map((c, i) => {
      const title = c.piece_title ? ` "${c.piece_title}"` : '';
      const excerpt = String(c.excerpt || '').slice(0, config.excerpt_chars);
      const crit = String(c.critique || '').slice(0, config.critique_chars);
      const dims = Array.isArray(c.dimensions_flagged) ? c.dimensions_flagged.join(', ') : '';
      return `[${day(c.created_at)}]${title} (flagged: ${dims || 'none'})\nSUBMISSION: ${excerpt}\nCRITIQUE: ${crit}`;
    })
    .join('\n\n---\n\n');

  return `Student critique record.

Total critiques on file: ${input.totalCount}
Prior edge (from the last derivation, if any): ${input.priorEdge || 'none'}

PER-DIMENSION FREQUENCY (authoritative, computed from the full record — do not recompute):
${statLines}

RECENT CRITIQUES IN FULL (most recent ${recent.length} of ${input.totalCount}):

${detail}

Derive the profile. Name recurring failures specifically, mark cleared standards, credit only earned strengths, and choose the single current edge.`;
}

async function callClaude(model, userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const block = (json.content || []).find((b) => b.type === 'text');
  const raw = block ? block.text : '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// --- Per-user processing ----------------------------------------------------

// Returns a result object, or { skipped: true } when there is nothing new to
// derive since the last run.
async function buildProfileForUser(userId, config, { force = false } = {}) {
  const [critiques, prior] = await Promise.all([
    getCritiqueHistory(userId),
    getPriorProfile(userId),
  ]);

  const totalCount = critiques.length;
  if (totalCount < config.min_critiques) return { skipped: true, reason: 'below_min' };

  // Content gate: skip if no new critiques since the last derivation.
  if (!force && prior && prior.pieces_reviewed === totalCount) {
    return { skipped: true, reason: 'no_new_critiques' };
  }

  const stats = computeDimensionStats(critiques, config.cleared_window);

  const generated = await callClaude(config.model, buildUserMessage({
    totalCount,
    stats,
    critiques,
    priorEdge: prior?.current_edge || null,
  }, config));

  // Enrich the model's recurring_failures with the authoritative counts and
  // spans. The model supplied dimension + description; the numbers come from
  // computeDimensionStats, never from the model.
  const recurringFailures = (Array.isArray(generated.recurring_failures) ? generated.recurring_failures : [])
    .map((f) => {
      const dim = String(f.dimension || '').trim().toLowerCase();
      const s = stats[dim];
      if (!s || !s.count) return null; // drop any dimension the record does not support
      return {
        dimension: dim,
        description: String(f.description || '').trim(),
        count: s.count,
        first_seen: s.first_seen,
        last_seen: s.last_seen,
      };
    })
    .filter(Boolean);

  const clearedStandards = (Array.isArray(generated.cleared_standards) ? generated.cleared_standards : [])
    .map((c) => ({ dimension: String(c.dimension || '').trim().toLowerCase(), note: String(c.note || '').trim() }))
    .filter((c) => RUBRIC_DIMENSIONS.includes(c.dimension));

  const strengths = (Array.isArray(generated.strengths) ? generated.strengths : [])
    .map((s) => ({ strength: String(s.strength || '').trim(), evidence: String(s.evidence || '').trim() }))
    .filter((s) => s.strength);

  const row = {
    user_id: userId,
    recurring_failures: recurringFailures,
    cleared_standards: clearedStandards,
    strengths,
    current_edge: String(generated.current_edge || '').trim() || null,
    pieces_reviewed: totalCount,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('writing_profile')
    .upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(`upsert profile: ${error.message}`);

  return {
    skipped: false,
    isUpdate: !!prior,
    piecesReviewed: totalCount,
    recurringCount: recurringFailures.length,
    edge: row.current_edge,
  };
}

// --- Main -------------------------------------------------------------------

async function runInterlocutorProfile(opts = {}) {
  const startAll = Date.now();
  console.log('[interlocutor-profile] run started');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }

  const config = await getAgentConfig();
  if (config.enabled === false) {
    console.log('[interlocutor-profile] Disabled in config. Exiting.');
    return { disabled: true };
  }

  const { eligible, skipped } = await getEligibleUsers(config.min_critiques);
  console.log(`[interlocutor-profile] Eligible users: ${eligible.length} | Skipped (below ${config.min_critiques} critiques): ${skipped.length}`);

  let updated = 0;
  let unchanged = 0;
  let failures = 0;

  for (const { userId } of eligible) {
    try {
      const result = await buildProfileForUser(userId, config, { force: opts.force === true });
      if (result.skipped) {
        unchanged++;
        continue;
      }
      updated++;
      const tag = result.isUpdate ? 'updated' : 'generated';
      console.log(`[interlocutor-profile] User ${shortId(userId)}: profile ${tag} | pieces: ${result.piecesReviewed} | recurring: ${result.recurringCount} | edge: ${(result.edge || '—').slice(0, 60)}`);
      await new Promise((r) => setTimeout(r, 500)); // gentle rate limit
    } catch (err) {
      failures++;
      console.error(`[interlocutor-profile] User ${shortId(userId)}: FAILED — ${err.message}`);
    }
  }

  const secs = ((Date.now() - startAll) / 1000).toFixed(0);
  console.log(`[interlocutor-profile] Completed in ${secs}s | ${updated} derived | ${unchanged} unchanged | ${failures} failures`);
  return { eligible: eligible.length, skipped: skipped.length, updated, unchanged, failures };
}

module.exports = {
  getAgentConfig,
  getEligibleUsers,
  computeDimensionStats,
  buildProfileForUser,
  runInterlocutorProfile,
};

if (require.main === module) {
  // `node interlocutor-profile.js --force` re-derives every eligible user even
  // when there are no new critiques (useful after a prompt change).
  const force = process.argv.includes('--force');
  runInterlocutorProfile({ force }).catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
