// Know Thyself facts: the rules, as pure functions so they can be tested
// without a database or a model. I/O lives in server/lib/profile-extraction.js
// and server/index.js.
const { PROFILE_FIELDS, FIELD_BY_KEY, USER_SOURCES } = require('./profile-fields');

const MIN_INFER_CONFIDENCE = 0.75;
const MAX_VALUE_CHARS = 500;
const ASK_MIN_USER_TURN = 3;                       // never in the user's first two turns
const ASK_USER_COOLDOWN_MS = 48 * 60 * 60 * 1000;  // one ask per user per 48 hours
const ASK_DECLINE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

const filled = v => typeof v === 'string' && v.trim() !== '';
const ms = t => (t ? Date.parse(t) : NaN);

function factsByKey(facts) {
  const out = {};
  for (const f of facts || []) if (f && f.field_key) out[f.field_key] = f;
  return out;
}

// ── Extraction guardrails ───────────────────────────────────────────────────
// candidates: [{ field_key, value, confidence }] from the model.
// Returns the writes to make, each { field_key, value, confidence }.
//   - only registry fields; never sensitive ones (health, loss, relationships)
//   - confidence at least MIN_INFER_CONFIDENCE
//   - never over a value the user authored (form, cabinet_asked, user_confirmed)
//   - never a field the user rejected
//   - replacing an inferred value needs higher confidence than the stored one
function planExtractionWrites(candidates, existingFacts, { minConfidence = MIN_INFER_CONFIDENCE } = {}) {
  const existing = factsByKey(existingFacts);
  const best = {};
  for (const c of Array.isArray(candidates) ? candidates : []) {
    if (!c || typeof c.field_key !== 'string') continue;
    const field = FIELD_BY_KEY[c.field_key];
    if (!field || field.sensitive) continue;
    const value = typeof c.value === 'string' ? c.value.trim().slice(0, MAX_VALUE_CHARS) : '';
    const confidence = Number(c.confidence);
    if (!value || !Number.isFinite(confidence) || confidence < minConfidence || confidence > 1) continue;
    if (!best[c.field_key] || confidence > best[c.field_key].confidence) {
      best[c.field_key] = { field_key: c.field_key, value, confidence };
    }
  }

  const writes = [];
  for (const cand of Object.values(best)) {
    const cur = existing[cand.field_key];
    if (cur) {
      if (cur.status === 'rejected') continue;
      if (USER_SOURCES.has(cur.source) && filled(cur.value)) continue;
      if (cur.source === 'cabinet_inferred' && filled(cur.value)) {
        const stored = Number(cur.confidence) || 0;
        if (!(cand.confidence > stored)) continue;
        if (cur.value.trim() === cand.value) continue;
      }
    }
    writes.push(cand);
  }
  return writes;
}

// ── What the Cabinet knows ──────────────────────────────────────────────────
// Facts first; for a field with no fact, the user_settings column (what the
// user wrote on an older client, or an account the backfill skipped).
function mergeProfile(facts, settings) {
  const byKey = factsByKey(facts);
  const known = [];
  const tentative = [];
  let offLimits = null;
  for (const field of PROFILE_FIELDS) {
    const f = byKey[field.key];
    let entry = null;
    if (f && f.status === 'rejected') {
      entry = null;
    } else if (f && f.status === 'active' && filled(f.value)) {
      entry = { field, value: f.value.trim(), source: f.source };
    } else if (settings && filled(settings[field.column])) {
      entry = { field, value: settings[field.column].trim(), source: 'form' };
    }
    if (!entry) continue;
    if (field.key === 'off_limits') { offLimits = entry.value; continue; }
    if (entry.source === 'cabinet_inferred') tentative.push(entry);
    else known.push(entry);
  }
  return { known, tentative, offLimits };
}

function isFieldFilled(key, facts, settings) {
  const f = factsByKey(facts)[key];
  if (f && f.status === 'active' && filled(f.value)) return true;
  if (f && f.status === 'rejected') return false;
  const field = FIELD_BY_KEY[key];
  return !!(field && settings && filled(settings[field.column]));
}

// 0..1, weighted by priority (the first field counts most). off_limits is
// not part of completeness: an empty answer there is a complete answer.
function computeCompleteness(facts, settings) {
  const scored = PROFILE_FIELDS.filter(f => f.key !== 'off_limits');
  const maxP = Math.max(...scored.map(f => f.priority));
  let total = 0;
  let have = 0;
  for (const f of scored) {
    const w = maxP + 1 - f.priority;
    total += w;
    if (isFieldFilled(f.key, facts, settings)) have += w;
  }
  return total ? Math.round((have / total) * 100) / 100 : 0;
}

function describeChallengeStyle(pref) {
  if (!pref) return null;
  const p = String(pref).toLowerCase();
  if (p === 'firm') return 'They asked to be pushed hard. Be direct; skip the cushioning.';
  if (p === 'compassionate' || p === 'gentle') return 'They asked for compassion first. Hold the standard, but lead with care.';
  if (p === 'both') return 'They asked for both: challenge them, and make sure they feel you are on their side.';
  return `In their words, how they want to be challenged: ${pref}`;
}

function labelFor(field) {
  switch (field.key) {
    case 'feedback_style': return 'How they want to be challenged';
    case 'arete_reason': return 'What brought them to Arete';
    case 'top_goal': return 'Current top goal';
    case 'main_obstacle': return 'Where they consistently fall short';
    case 'life_situation': return 'Life situation';
    case 'background': return 'Background';
    case 'hard_times_pattern': return 'What they do when things get hard';
    case 'identity': return 'Professional identity and pursuits';
    case 'strengths': return 'Strengths';
    case 'future_self': return 'Who they want to become';
    case 'major_events': return 'Major life events';
    default: return field.question;
  }
}

const PROFILE_INSTRUCTION = 'You know this person. Do not list the profile back to them. Connect what they say today to what you know, by specifics, when it is relevant, and name a known pattern when you see it playing out.';
const TENTATIVE_INSTRUCTION = 'The TENTATIVE items are your Cabinet\'s current understanding from earlier conversations, not things the person confirmed. They may shape the questions you ask. Never state them back as certain, never say "you told me" about them, and drop one the moment the person contradicts it.';

// The block every counselor sees. Empty string when nothing is known.
function buildFactsBlock(merged, { name } = {}) {
  const { known, tentative, offLimits } = merged || {};
  const parts = [];
  const display = e => (e.field.key === 'feedback_style' ? describeChallengeStyle(e.value) : e.value);
  if ((known && known.length) || (tentative && tentative.length)) {
    parts.push(`[KNOW THYSELF: ${(name || 'the user').toUpperCase()}]`);
    parts.push(PROFILE_INSTRUCTION);
    if (known && known.length) {
      parts.push('\nKNOWN (they said or confirmed this themselves):');
      for (const e of known) parts.push(`- ${labelFor(e.field)}: ${display(e)}`);
    }
    if (tentative && tentative.length) {
      parts.push('\nTENTATIVE (your understanding, unconfirmed):');
      for (const e of tentative) parts.push(`- ${labelFor(e.field)}: ${display(e)}`);
      parts.push(TENTATIVE_INSTRUCTION);
    }
    parts.push('[END KNOW THYSELF]');
  }
  if (filled(offLimits)) {
    parts.push(`[HARD CONSTRAINT: OFF-LIMITS TOPICS]\nThis person asked that the Cabinet never bring up the following. Do not raise, allude to, or steer toward these topics. If they raise one themselves, follow their lead gently and do not dwell.\n${offLimits.trim()}\n[END HARD CONSTRAINT]`);
  }
  return parts.length ? `\n\n${parts.join('\n')}` : '';
}

// ── Distress (conservative, keyword level) ─────────────────────────────────
const DISTRESS_PATTERNS = [
  /\bkill (my ?self|me)\b/i, /\bsuicid/i, /\bself[- ]?harm/i, /\bend (it all|my life)\b/i,
  /\bwant to die\b/i, /\bdon'?t want to (live|be here)\b/i, /\bhopeless\b/i, /\bworthless\b/i,
  /\bcan'?t (go on|take it|do this anymore)\b/i, /\bno reason to live\b/i, /\bcutting\b/i,
  /\bpanic attack/i, /\bbreaking down\b/i, /\bfalling apart\b/i,
];
function looksDistressed(texts) {
  return (texts || []).some(t => typeof t === 'string' && DISTRESS_PATTERNS.some(re => re.test(t)));
}

// ── Asking limiter ──────────────────────────────────────────────────────────
// Returns the one registry field a counselor may consider asking about in
// this reply, or null. Rules:
//   - never in the user's first two turns of the conversation
//   - never when the conversation shows distress, or the user was flagged in
//     the last 14 days (the caller folds that into `distress`)
//   - at most one ask per conversation (session) and per 48 hours per user
//   - a declined or unanswered ask is not repeated for 14 days
//   - only fields that are missing, askable, and not rejected
//   - most relevant to what the user is talking about, then by priority; a
//     sensitive field only when the user's own topic touches it
function chooseAskField({
  facts = [],
  settings = null,
  userMessage = '',
  sessionUserTurns = 0,
  sessionStart = null,
  distress = false,
  now = Date.now(),
} = {}) {
  if (sessionUserTurns < ASK_MIN_USER_TURN) return null;
  if (distress) return null;

  let lastAsk = -Infinity;
  for (const f of facts) {
    const t = ms(f.asked_at);
    if (Number.isFinite(t) && t > lastAsk) lastAsk = t;
  }
  if (now - lastAsk < ASK_USER_COOLDOWN_MS) return null;
  if (sessionStart != null && lastAsk >= sessionStart) return null;

  const byKey = factsByKey(facts);
  const text = String(userMessage || '').toLowerCase();
  let best = null;
  for (const field of PROFILE_FIELDS) {
    if (!field.askable) continue;
    if (isFieldFilled(field.key, facts, settings)) continue;
    const f = byKey[field.key];
    if (f && f.status === 'rejected') continue;
    if (f && Number.isFinite(ms(f.ask_declined_at)) && now - ms(f.ask_declined_at) < ASK_DECLINE_COOLDOWN_MS) continue;
    const relevance = field.keywords.reduce((n, k) => n + (text.includes(k) ? 1 : 0), 0);
    if (field.sensitive && relevance === 0) continue;
    if (!best || relevance > best.relevance || (relevance === best.relevance && field.priority < best.field.priority)) {
      best = { field, relevance };
    }
  }
  return best ? best.field : null;
}

function buildAskInstruction(field) {
  if (!field) return '';
  return `\n\n[ONE QUESTION YOU MAY ASK]\nYou do not yet know ${field.phrasing}. Only if the person's own topic has already been addressed in this reply, and only if it fits what they are talking about, you may end with one short question, in your own voice and tied to what they just said, that would let them tell you. If it does not fit naturally, do not ask. Never mention a form, a profile, a questionnaire, or "filling in" anything. Ask at most one such question.\n[END ONE QUESTION]`;
}

module.exports = {
  MIN_INFER_CONFIDENCE,
  ASK_MIN_USER_TURN,
  ASK_USER_COOLDOWN_MS,
  ASK_DECLINE_COOLDOWN_MS,
  planExtractionWrites,
  mergeProfile,
  isFieldFilled,
  computeCompleteness,
  buildFactsBlock,
  looksDistressed,
  chooseAskField,
  buildAskInstruction,
  describeChallengeStyle,
  labelFor,
};
