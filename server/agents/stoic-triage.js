// server/agents/stoic-triage.js
//
// Stoic Reply Pipeline, stage 2: Triage. Two model calls per candidate, never
// one, because the safety gate must be a hard boolean that cannot be traded
// off against a high relevance score.
//
//   2a — Safety gate (Haiku, binary). Biased toward exiting: a false exit
//        costs one missed reply; a false pass costs someone in crisis
//        receiving philosophy from a stranger. EXIT rows become
//        rejected_safety and are never re-evaluated. Unparseable gate output
//        fails closed (counts as EXIT).
//   2b — Relevance scoring (Sonnet, structured JSON). Promotion threshold:
//        stoic_fit >= 7 AND openness >= 6 AND already_answered == false.
//
// Mirrors the other agents: raw fetch to Anthropic, no SDK.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const GATE_MODEL = process.env.STOIC_GATE_MODEL || 'claude-haiku-4-5';
const SCORE_MODEL = process.env.STOIC_SCORE_MODEL || 'claude-sonnet-5';

const STOIC_FIT_MIN = 7;
const OPENNESS_MIN = 6;

const DOCTRINES = [
  'dichotomy_of_control', 'judgment_not_events', 'premeditatio', 'memento_mori',
  'anger', 'envy', 'reputation', 'duty', 'none',
];

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function callClaude(model, system, userMessage, maxTokens = 1000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const block = (json.content || []).find(b => b.type === 'text');
  return block ? block.text.trim() : '';
}

// Pull the first JSON object out of a model reply, tolerating code fences.
function parseJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// --- Stage 2a: safety gate ---------------------------------------------------

const GATE_SYSTEM = `You are a hard safety gate for a system that surfaces public posts a Stoic-philosophy reply might help with. Your ONLY job is deciding whether it is safe and appropriate for a stranger to reply to this post with philosophy.

Respond with exactly one line, nothing else:
EXIT: <short reason>
or
PASS

Return EXIT on ANY of the following, however mild or indirect:
- Any mention of suicide, self-harm, or wanting to not exist
- Active mental health crisis, psychosis, dissociation, mania
- Disordered eating
- Grief within days of a death
- Abuse, violence, or being a victim of crime
- Medical or legal decisions in progress
- The author is or appears to be a minor
- Anything where the right response is a professional, not a philosopher

Bias hard toward EXIT. A false exit costs one missed reply. A false pass costs someone in crisis receiving philosophy from a stranger. If you are uncertain, EXIT.`;

async function safetyGate(candidate) {
  const raw = await callClaude(
    GATE_MODEL,
    GATE_SYSTEM,
    `POST (from ${candidate.platform}):\n\n${candidate.body}`,
    200
  );
  if (/^PASS\b/i.test(raw)) return { pass: true };
  const m = raw.match(/^EXIT:?\s*(.*)$/im);
  if (m) return { pass: false, reason: m[1].trim() || 'safety gate exit' };
  // Anything unparseable fails closed.
  return { pass: false, reason: `unparseable gate response: ${raw.slice(0, 120)}` };
}

// --- Stage 2b: relevance scoring ---------------------------------------------

const SCORE_SYSTEM = `You score public posts for whether a brief, grounded Stoic reply from a thoughtful stranger would genuinely help. Return JSON only, no preamble:

{"stoic_fit": 0-10, "doctrine": "dichotomy_of_control | judgment_not_events | premeditatio | memento_mori | anger | envy | reputation | duty | none", "openness": 0-10, "already_answered": true|false, "reasoning": "one sentence"}

Definitions:
- stoic_fit: does the difficulty here actually turn on something Stoicism addresses? Someone whose landlord is illegally withholding a deposit needs a lawyer, not Epictetus. Someone tormented by what a coworker thinks of them is squarely in scope. Score the fit, not the intensity of the distress.
- doctrine: the single Stoic doctrine most squarely addressing the difficulty, or "none".
- openness: is this person asking, wondering, or stuck? Or are they venting, performing, or arguing? Venting does not want a reply. Score low for rhetorical questions and posts whose energy is contempt rather than confusion.
- already_answered: judging from the comment count and any visible discussion context, has the point likely already been made well? If so, adding another reply is noise. With no visible comments, false.`;

async function scoreCandidate(candidate) {
  const raw = await callClaude(
    SCORE_MODEL,
    SCORE_SYSTEM,
    `POST (from ${candidate.platform}, ${candidate.comment_count ?? 0} existing comments):\n\n${candidate.body}` +
      (candidate.parent_context ? `\n\nIN REPLY TO:\n\n${candidate.parent_context}` : ''),
    500
  );
  const parsed = parseJson(raw);
  if (!parsed) return null;
  const fit = Number(parsed.stoic_fit);
  const openness = Number(parsed.openness);
  if (!Number.isFinite(fit) || !Number.isFinite(openness)) return null;
  return {
    stoic_fit: Math.max(0, Math.min(10, Math.round(fit))),
    doctrine: DOCTRINES.includes(parsed.doctrine) ? parsed.doctrine : 'none',
    openness: Math.max(0, Math.min(10, Math.round(openness))),
    already_answered: parsed.already_answered === true,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 500) : '',
  };
}

// --- Run ---------------------------------------------------------------------

async function runStoicTriage(limit = 40) {
  const supabase = getSupabase();
  const summary = { triaged: 0, safetyExits: 0, scoreRejects: 0, promoted: 0, errors: [] };

  const { data: rows, error } = await supabase
    .from('reply_candidates')
    .select('id, platform, body, parent_context, comment_count')
    .eq('status', 'raw')
    .order('fetched_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`reply_candidates select: ${error.message}`);

  for (const candidate of rows || []) {
    try {
      const gate = await safetyGate(candidate);
      if (!gate.pass) {
        summary.safetyExits++;
        await supabase.from('reply_candidates').update({
          status: 'rejected_safety',
          exit_reason: gate.reason,
          triaged_at: new Date().toISOString(),
        }).eq('id', candidate.id);
        summary.triaged++;
        continue;
      }

      const scores = await scoreCandidate(candidate);
      if (!scores) {
        // Leave as raw; a later run retries scoring. The safety gate already
        // passed, but we re-run it then — the gate is cheap and hard.
        summary.errors.push(`unparseable scores for ${candidate.id}`);
        continue;
      }

      const promoted =
        scores.stoic_fit >= STOIC_FIT_MIN &&
        scores.openness >= OPENNESS_MIN &&
        !scores.already_answered;

      if (promoted) summary.promoted++;
      else summary.scoreRejects++;

      await supabase.from('reply_candidates').update({
        status: promoted ? 'promoted' : 'rejected_score',
        exit_reason: promoted
          ? null
          : `fit ${scores.stoic_fit}/${STOIC_FIT_MIN}, openness ${scores.openness}/${OPENNESS_MIN}, already_answered ${scores.already_answered}`,
        stoic_fit: scores.stoic_fit,
        doctrine: scores.doctrine,
        openness: scores.openness,
        already_answered: scores.already_answered,
        triage_reasoning: scores.reasoning,
        triaged_at: new Date().toISOString(),
      }).eq('id', candidate.id);
      summary.triaged++;
    } catch (err) {
      console.error(`[stoic-triage] candidate ${candidate.id} failed:`, err.message);
      summary.errors.push(`${candidate.id}: ${err.message}`);
    }
  }

  console.log(`[stoic-triage] triaged ${summary.triaged}: ${summary.safetyExits} safety exits, ${summary.scoreRejects} score rejects, ${summary.promoted} promoted`);
  return summary;
}

module.exports = { runStoicTriage };
