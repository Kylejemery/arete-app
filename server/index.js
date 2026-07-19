// ---------------------------------------------------------------------------
// Required Railway environment variables:
//   CLAUDE_API_KEY          — Anthropic API key
//   OPENAI_API_KEY          — OpenAI API key (embeddings + OpenAI-backed agents)
//   SUPABASE_URL            — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service role secret
// ---------------------------------------------------------------------------
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { Resend } = require('resend');

const { getRelevantChunks } = require('./retrieval');
const { logRetrieval, attributeUsage } = require('./lib/retrieval-log');
const { expandCandidates, graphBoostEnabled } = require('./lib/graph-boost');
const { randomUUID } = require('crypto');
const libraryHelpers = require('./library');

// Observatory Living Sky — all new /api/observatory/* routes live in their own
// module to keep the merge surface of this shared file minimal. recordRetrieval
// is the fire-and-forget retrieval-event logger the retrieval paths below call.
const observatory = require('./routes/observatory');

// Canonical concept layer (Observatory repair Part 1) — every raw theme label
// maps through concept_aliases to one canonical concept; the Observatory only
// ever speaks canonical names. Unmapped labels resolve lazily and are never
// shown raw.
const canonicalConcepts = require('./lib/canonical-concepts');
const { runDispatchGeneration } = require('./dispatch-generation-agent');
const { runSynthesisAgent } = require('./synthesis-agent');

// Weekly Self-Reflection Agent
// Railway cron: 0 7 * * 0 (Sundays 07:00 UTC)
// Runs after a full week of agent data accumulates. Kyle adds the Railway cron
// service manually; this require also backs the on-demand admin trigger below.
const { runWeeklySelfReflection } = require('./weekly-self-reflection-agent');

// RAG Corpus Agent (on-demand twin)
// The nightly ingestion runs as its own Railway cron service rooted at
// academy/corpus-ingestion (08:00 UTC). Railway cron services don't execute on
// deploy, so the admin "Run ingestion now" button runs this in-process port
// instead (server/corpus-agent.js — keep in sync with the cron twin). Backs
// POST /api/admin/corpus/run below.
const { runCorpusIngestion } = require('./corpus-agent');

// Journal Analysis Agent
// Railway cron: nightly (its own service, `node journal-analysis-agent.js`).
// This require backs the on-demand admin trigger POST /api/admin/journal/run
// below — Railway cron services don't execute on deploy, so "Run now" runs it
// in-process here.
const { runJournalAnalysis } = require('./journal-analysis-agent');

// Inquiry Agent
// Railway cron: 30 6 * * 1 (Mondays 06:30 UTC — after the Synthesis Agent)
// Generates philosophical questions the corpus raises but does not answer,
// pursues them across the full corpus, and stores each as pending_review in
// open_inquiries. Runs as its own Railway cron service (`node
// agents/inquiry-agent.js`); Kyle adds the cron manually. Approved inquiries
// with observatory_visible surface via GET /api/observatory/inquiries below.
// This require backs the on-demand admin trigger POST /api/admin/inquiry/run.
const { runInquiryAgent } = require('./agents/inquiry-agent');

// Longitudinal User Model Agent
// Railway cron: 30 4 * * 1 (Mondays 04:30 UTC — 30min after Journal Analysis)
// Builds a persistent philosophical portrait per user from accumulated
// journal_analysis data (server/longitudinal-user-model.js). Runs as its own
// Railway cron service (`node longitudinal-user-model.js`); Kyle adds the cron
// manually. Its output feeds getLongitudinalContext() below, which injects each
// user's portrait into their Cabinet counselors' system prompts. This require
// also backs the on-demand admin trigger POST /api/admin/longitudinal/run.
const { runLongitudinalUserModel } = require('./longitudinal-user-model');

// World Agent
// Railway cron: 30 3 * * 1 (Mondays 03:30 UTC)
// The only outward-facing agent: weekly web search across philosophically
// relevant categories, picks the dominant signal by real corpus retrieval, and
// has the corpus respond to it (server/world-agent.js). Purely-scientific
// signals auto-approve; political/contested ones wait for Kyle. Runs as its
// own Railway cron service (`node world-agent.js`); Kyle adds the cron
// manually. This require also backs the on-demand admin trigger below.
// Approved weeks surface via GET /api/observatory/world and inject
// [WORLD CONTEXT] into dispatch generation.
const { runWorldAgent } = require('./world-agent');

// Tension Agent
// Railway cron: 30 5 * * 1 (Mondays 05:30 UTC — after Gap Agent, before Synthesis)
// Hunts unresolved philosophical contradictions across the corpus — places
// where two or more thinkers, read together, produce a genuine problem that
// neither resolves (server/agents/tension-agent.js). Runs as its own Railway
// cron service (`node agents/tension-agent.js`); Kyle adds the cron manually.
// Approved tensions with observatory_visible surface via GET
// /api/observatory/tensions below, and seed the Inquiry Agent's pursuit.
// This require backs the on-demand admin trigger POST /api/admin/tensions/run.
const { runTensionAgent } = require('./agents/tension-agent');

// Dreaming Agent
// Railway cron: 30 23 * * 0 (Sundays 23:30 UTC — after the week settles, before the new cycle)
// Generates corpus conjecture: aphorisms, thought experiments, propositions,
// meditations (server/agents/dreaming-agent.js). Runs as its own Railway cron
// service (`node agents/dreaming-agent.js`); Kyle adds the cron manually.
// STRICT GATE: nothing surfaces without human review. Output is never ingested
// into rag_corpus. Approved/starred dreams with observatory_visible surface
// via GET /api/observatory/dreams below, under "The Corpus Imagines".
// This require backs the on-demand admin trigger POST /api/admin/dreams/run.
const { runDreamingAgent } = require('./agents/dreaming-agent');
const { runConsolidationAgent } = require('./agents/consolidation-agent');

const app = express();
const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// ---------------------------------------------------------------------------
// Parallel Cabinet feature flags
// ---------------------------------------------------------------------------
const PARALLEL_ENABLED = process.env.PARALLEL_CABINET_ENABLED === 'true';
const PARALLEL_ALLOWLIST = (process.env.PARALLEL_CABINET_ALLOWLIST || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// OpenAI SDK client (used for OpenAI-backed counselor routing). Null when the
// key is absent — same pattern as gemini/xai below, so a missing OPENAI_API_KEY
// degrades gpt- counselors to Claude instead of crashing the server at boot.
// (The openai v6 SDK throws at construction when apiKey is falsy.) Embeddings
// use raw fetch elsewhere and are independently guarded on OPENAI_API_KEY.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
if (!openai) console.warn('OPENAI_API_KEY not set — gpt- counselors will fall back to Claude.');

// Gemini and Grok expose OpenAI-compatible APIs — same SDK, different base
// URLs. Clients are null when the key is absent; routing then falls back to
// the default Claude model so a missing key never errors at the user.
const gemini = process.env.GEMINI_API_KEY
  ? new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' })
  : null;
const xai = process.env.XAI_API_KEY
  ? new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  : null;

// ---------------------------------------------------------------------------
// Counselor model routing — users can assign an LLM per counselor
// (user_settings.counselor_models, keyed by counselor id). Only models on
// this allowlist are honored; anything else falls back to the default.
// ---------------------------------------------------------------------------
const ALLOWED_COUNSELOR_MODELS = new Set([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'gpt-5.1',
  'gemini-3-pro-preview',
  'grok-4-fast-non-reasoning',
]);
const DEFAULT_COUNSELOR_MODEL = 'claude-opus-4-6';

// The stable option ids we store in counselor_models can outlive a provider's
// actual model string — Google deprecated `gemini-3-pro-preview` in favor of
// `gemini-3.1-pro-preview`. Translate at call time so a provider rename never
// requires migrating every user's saved selection.
const PROVIDER_MODEL_ALIAS = {
  'gemini-3-pro-preview': 'gemini-3.1-pro-preview',
};

function resolveCounselorModel(requested) {
  return ALLOWED_COUNSELOR_MODELS.has(requested) ? requested : DEFAULT_COUNSELOR_MODEL;
}

function isNonAnthropicModel(model) {
  return typeof model === 'string' && /^(gpt-|gemini|grok)/.test(model);
}

/**
 * Returns the OpenAI-compatible client + param style for a model, null when
 * the provider's key is missing, or undefined for Anthropic models.
 */
function compatRouteFor(model) {
  if (model.startsWith('gpt-')) return openai ? { client: openai, provider: 'openai' } : null;
  if (model.startsWith('gemini')) return gemini ? { client: gemini, provider: 'gemini' } : null;
  if (model.startsWith('grok')) return xai ? { client: xai, provider: 'xai' } : null;
  return undefined;
}

async function callOpenAICompat(route, { model, system, messages, maxTokens }) {
  const params = {
    model: PROVIDER_MODEL_ALIAS[model] || model,
    messages: [{ role: 'system', content: system }, ...messages],
  };
  // gpt-5.x requires max_completion_tokens; Gemini/Grok compat layers take
  // max_tokens. Reasoning models spend tokens thinking, so give non-OpenAI
  // providers headroom — the length guard in the prompt keeps replies short.
  if (route.provider === 'openai') {
    params.max_completion_tokens = maxTokens;
  } else {
    params.max_tokens = Math.max(maxTokens * 4, 1024);
  }
  // Gemini 3 defaults to thinking_level "high". Through the OpenAI-compat
  // layer that hidden reasoning is billed against max_tokens, so the visible
  // content often comes back empty. Map to low reasoning (OpenAI's
  // reasoning_effort → Gemini's thinking_level) so the budget goes to the
  // actual reply, which is what makes Gemini counselors work at all here.
  if (route.provider === 'gemini') {
    params.reasoning_effort = 'low';
  }
  const completion = await route.client.chat.completions.create(params);
  return completion.choices?.[0]?.message?.content ?? '';
}

/**
 * Provider-agnostic chat call for counselor responses. Anthropic models use
 * the raw fetch convention of this file; gpt/gemini/grok models go through
 * the OpenAI-compatible SDK clients. Missing provider key → default Claude.
 */
async function callCounselorModel({ model, system, messages, maxTokens }) {
  let effectiveModel = model;
  const route = isNonAnthropicModel(model) ? compatRouteFor(model) : undefined;

  if (route) {
    return callOpenAICompat(route, { model, system, messages, maxTokens });
  }
  if (route === null) {
    console.warn(`[Models] No API key for ${model}; falling back to ${DEFAULT_COUNSELOR_MODEL}`);
    effectiveModel = DEFAULT_COUNSELOR_MODEL;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: effectiveModel, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('') || '';
}

// Sentinel used in agentRouter to identify Anthropic-backed agents.
// Anthropic calls use raw fetch throughout this file (no SDK).
const anthropicClient = { provider: 'anthropic' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Resend — transactional email (shared-session invites). Null when the key is
// absent so invite creation still succeeds locally; email send is skipped.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const INVITE_FROM_EMAIL = process.env.INVITE_FROM_EMAIL || 'Arete <noreply@pursuearete.com>';
const PUBLIC_WEB_URL = 'https://pursuearete.com';
const RAILWAY_PUBLIC_URL = process.env.RAILWAY_PUBLIC_URL || 'https://arete-app-production.up.railway.app';

// ---------------------------------------------------------------------------
// RAG helpers
// ---------------------------------------------------------------------------

async function embedQuery(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}

const RAG_ENABLED_SLUGS = ['marcus-aurelius', 'epictetus', 'seneca'];

async function retrieveChunks(userMessage, counselorSlug, k = 3) {
  if (!RAG_ENABLED_SLUGS.includes(counselorSlug)) return [];
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embedding = await embedQuery(userMessage);
    const { data, error } = await supabase.rpc('match_source_chunks', {
      query_embedding: embedding,
      match_counselor_slug: counselorSlug,
      match_count: k,
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('RAG retrieval error:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Library catalog awareness
// ---------------------------------------------------------------------------
// Counselors only ever see the handful of passages retrieval surfaces for the
// current message, so without this they cannot truthfully answer "do you have
// access to <book>?". This builds a compact list of every visible work on the
// Library shelves — same source of truth as /api/library/texts (library_shelf
// RPC layered with admin overrides) — and caches it for 10 minutes.

let libraryCatalogCache = { block: '', at: 0 };
const LIBRARY_CATALOG_TTL_MS = 10 * 60 * 1000;

async function getLibraryCatalogBlock() {
  if (Date.now() - libraryCatalogCache.at < LIBRARY_CATALOG_TTL_MS) {
    return libraryCatalogCache.block;
  }
  try {
    const { data, error } = await supabase.rpc('library_shelf');
    if (error) throw error;

    const ovMap = new Map();
    const { data: ovs } = await supabase.from('library_overrides').select('*');
    for (const o of ovs || []) ovMap.set(`${o.author}::${o.work}`, o);

    const lines = (data || [])
      .map(r => {
        const ov = ovMap.get(`${r.author}::${r.work}`) || {};
        if (ov.hidden) return null;
        return `- ${r.author} — ${ov.title || libraryHelpers.workTitle(r.work)}`;
      })
      .filter(Boolean);

    const block = lines.length === 0 ? '' : `\n\n[THE LIBRARY OF ARETE — YOUR SOURCE CATALOG]
These are the complete texts in the library you draw on. Passages from them are retrieved for you as the conversation unfolds. If the user asks whether you have access to, have read, or can reference a specific book or author, answer truthfully from this catalog: yes if it is listed below (name the exact title), no if it is not. Never claim access to a work that is not on this list.
${lines.join('\n')}
[END SOURCE CATALOG]`;

    libraryCatalogCache = { block, at: Date.now() };
    return block;
  } catch (err) {
    console.error('[Library catalog] load failed:', err.message);
    return libraryCatalogCache.block || '';
  }
}

// ---------------------------------------------------------------------------
// Library Observatory — live retrieval pulse
// ---------------------------------------------------------------------------
// Ephemeral, in-memory signal of which concepts the corpus has just answered
// from. Each Cabinet retrieval maps its source chunks' authors to observatory
// concepts and stamps them here; the Observatory front-end short-polls
// /api/library/observatory/pulse and flares those stars in near-real-time.
// Deliberately stateless across restarts — this is a "right now" signal, not
// history (the weeks-scale baseline lives in the observatory payload instead).

const obsPulses = [];            // { concepts: string[], ts: number }
const OBS_PULSE_TTL = 12000;     // keep ~12s; clients poll every ~3s

function recordObsPulse(conceptNames) {
  if (!conceptNames || conceptNames.length === 0) return;
  const ts = Date.now();
  obsPulses.push({ concepts: conceptNames, ts });
  const cutoff = ts - OBS_PULSE_TTL;
  while (obsPulses.length && obsPulses[0].ts < cutoff) obsPulses.shift();
}

// Lazily-built, cached map of lower-cased author -> concept names they touch,
// from concept_passage_map (the same table the observatory endpoint groups).
let obsAuthorCache = null;       // { map: Map<string, string[]>, builtAt: number }
const OBS_AUTHOR_TTL = 5 * 60 * 1000;

async function getObsAuthorMap() {
  if (obsAuthorCache && Date.now() - obsAuthorCache.builtAt < OBS_AUTHOR_TTL) {
    return obsAuthorCache.map;
  }
  const { data: cpm } = await supabase.from('concept_passage_map').select('concept, author');
  // Pulses speak canonical names only — raw labels map through the alias
  // layer; unmapped ones are queued for resolution and skipped for now.
  const aliases = await canonicalConcepts.getAliasMap().catch(() => new Map());
  const unmapped = new Set();
  const sets = new Map();
  for (const r of cpm || []) {
    if (!r.concept || !r.author) continue;
    const hit = aliases.get(r.concept);
    if (!hit) { unmapped.add(r.concept); continue; }
    const key = r.author.toLowerCase();
    if (!sets.has(key)) sets.set(key, new Set());
    sets.get(key).add(hit.name);
  }
  canonicalConcepts.resolveConceptsLazily([...unmapped]);
  const map = new Map();
  for (const [k, v] of sets) map.set(k, [...v]);
  obsAuthorCache = { map, builtAt: Date.now() };
  return map;
}

// Maps retrieved chunks -> the few most-relevant concepts and records a pulse.
// Ranked by how many retrieved chunks touch each concept (so a flare lands on
// the handful of concepts the answer leaned on, not every star a popular author
// happens to touch); a light boost when a concept name appears in the question.
// Best-effort — never throws, never blocks the chat response.
async function pulseFromChunks(chunks, question) {
  try {
    if (!Array.isArray(chunks) || chunks.length === 0) return;
    // Durable twin of this ephemeral pulse: log the retrieval so the
    // Observatory's breathing rates reflect real activity. Fire-and-forget.
    observatory.recordRetrieval(chunks, 'cabinet');
    const authorMap = await getObsAuthorMap();
    const q = (question || '').toLowerCase();
    const score = new Map(); // concept name -> score
    for (const c of chunks) {
      const a = (c && c.author ? String(c.author) : '').toLowerCase();
      if (!a || !authorMap.has(a)) continue;
      for (const name of authorMap.get(a)) {
        let s = (score.get(name) || 0) + 1;
        if (q && q.includes(name.toLowerCase())) s += 2;
        score.set(name, s);
      }
    }
    if (score.size === 0) return;
    const top = [...score.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(e => e[0]);
    recordObsPulse(top);
  } catch (err) {
    console.warn('[observatory pulse] map failed:', err.message);
  }
}

app.use(cors({
  origin: [
    'https://app.pursuearete.com',
    'https://academy.pursuearete.com',
    'https://www.pursuearete.com',
    'https://pursuearete.com',
  ]
}));
app.use(express.json());
app.use(observatory.router);

// ---------------------------------------------------------------------------
// Local datetime helper
// ---------------------------------------------------------------------------

/**
 * Derives the user's local date/time from their timezone offset and returns
 * a formatted line for injection into counselor system prompts.
 * tzOffsetMinutes = new Date().getTimezoneOffset() on the client
 * (positive = behind UTC, e.g. 300 for UTC-5; negative = ahead of UTC)
 */
function buildLocalDateTimeLine(tzOffsetMinutes) {
  if (tzOffsetMinutes == null) return '';
  const localMs = Date.now() - tzOffsetMinutes * 60 * 1000;
  const d = new Date(localMs);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const minuteStr = String(minute).padStart(2, '0');
  let period;
  if (hour >= 5 && hour < 12) period = 'Morning';
  else if (hour >= 12 && hour < 17) period = 'Afternoon';
  else if (hour >= 17 && hour < 21) period = 'Evening';
  else period = 'Night';
  return `\n\nCurrent date and time: ${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} — ${h12}:${minuteStr} ${ampm} (${period}).`;
}

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// /health is defined later as an async corpus-stats endpoint

function truncateMessages(messages, maxMessages = 12) {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  if (conversationMessages.length <= maxMessages) return messages;
  const truncated = conversationMessages.slice(-maxMessages);
  return [...systemMessages, ...truncated];
}

// Admin check. is_admin = true bypasses all course locks and session
// prerequisites on the frontend. This helper is available for backend use
// but does NOT relax JWT enforcement or message limits.
async function isAdmin(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}

const MESSAGE_LIMITS = { free: 10, arete: 50, pro: null };

async function enforceMessageLimit(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return false;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return false;

  const tier = profile.subscription_tier || 'free';
  const limit = Object.prototype.hasOwnProperty.call(MESSAGE_LIMITS, tier) ? MESSAGE_LIMITS[tier] : MESSAGE_LIMITS.free;

  if (limit === null) return false; // pro = unlimited

  const d = new Date();
  const todayUTC = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  // Atomic check-and-increment: returns true if allowed, false if at limit.
  // A single UPDATE avoids the read-then-write race condition where two
  // simultaneous requests both pass the count check and both get through.
  const { data: allowed, error: rpcError } = await supabase.rpc('try_increment_message_count', {
    p_user_id: user.id,
    p_today: todayUTC,
    p_limit: limit,
  });

  if (rpcError) {
    console.error('[enforceMessageLimit] rpc error:', rpcError.message);
    return false; // fail open — don't block on DB errors
  }

  if (!allowed) {
    res.status(403).json({ error: 'daily_limit_reached', tier, limit });
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Shared Cabinet sessions (Arete for Couples)
// ---------------------------------------------------------------------------

/**
 * Fetches Know Thyself profiles for a set of users from user_settings.
 * Returns one entry per requested participant: { userId, displayName, profile }.
 * Users with no settings row still appear (generic displayName, profile = null)
 * so a shared session always lists everyone present. The 'pending' placeholder
 * the client sends before a partner has actually joined is filtered out.
 */
async function getParticipantProfiles(participantIds) {
  const ids = Array.isArray(participantIds)
    ? [...new Set(participantIds.filter(id => typeof id === 'string' && id && id !== 'pending'))]
    : [];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id, user_name, kt_background, kt_identity, kt_goals, kt_strengths, kt_weaknesses, kt_patterns, kt_major_events, future_self_description')
    .in('user_id', ids);

  if (error) {
    console.error('Error fetching participant profiles:', error.message);
    return [];
  }

  const byId = new Map((data || []).map(row => [row.user_id, row]));
  return ids.map(userId => {
    const row = byId.get(userId);
    return {
      userId,
      displayName: row?.user_name || 'A participant',
      profile: row || null,
    };
  });
}

function summarizeParticipantProfile(participant) {
  const r = participant.profile;
  if (!r) return '(no Know Thyself profile yet)';
  const parts = [];
  if (r.kt_identity) parts.push(`Identity: ${r.kt_identity}`);
  if (r.kt_goals) parts.push(`Goals: ${r.kt_goals}`);
  if (r.kt_strengths) parts.push(`Strengths: ${r.kt_strengths}`);
  if (r.kt_weaknesses) parts.push(`Weaknesses: ${r.kt_weaknesses}`);
  if (r.kt_patterns) parts.push(`Patterns and failure modes: ${r.kt_patterns}`);
  if (r.kt_background) parts.push(`Background: ${r.kt_background}`);
  if (r.kt_major_events) parts.push(`Major life events: ${r.kt_major_events}`);
  if (r.future_self_description) parts.push(`Future self vision: ${r.future_self_description}`);
  return parts.length > 0 ? parts.join('; ') : '(profile incomplete)';
}

/**
 * Builds the system-prompt block injected into every counselor during a shared
 * session so they respond to the group dynamic rather than a single user.
 */
function buildSharedContext(participants) {
  if (!Array.isArray(participants) || participants.length === 0) return '';
  const lines = participants
    .map(p => `- ${p.displayName} (profile: ${summarizeParticipantProfile(p)})`)
    .join('\n');
  return `\n\n[SHARED CABINET SESSION]
This is a shared Cabinet session with multiple participants.
Participants:
${lines}
You are speaking to all of them together. Address the group when appropriate. Hold each person accountable to their own stated values. When relevant, note where their values align or create productive tension.
[END SHARED CABINET SESSION]`;
}

// ---------------------------------------------------------------------------
// Longitudinal context (Layer 5 — Memory)
// ---------------------------------------------------------------------------
//
// The Longitudinal User Model Agent rebuilds a per-user philosophical portrait
// weekly (user_longitudinal_models). When a user opens a Cabinet session we
// inject a brief block so the counselor knows this person over time, not just
// from the current thread. This is the memory made active.
//
// Cached per user with a TTL so we don't re-query on every message in a session
// (the model only changes once a week). Cache value `null` = "no eligible model"
// and is cached too, so new users don't trigger a lookup on every turn.
const LONGITUDINAL_CACHE_TTL_MS = 30 * 60 * 1000;
const longitudinalCache = new Map(); // userId -> { block: string, expires: number }

async function getLongitudinalContext(userId) {
  if (!userId) return '';
  const cached = longitudinalCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.block;

  let block = '';
  try {
    const { data } = await supabase
      .from('user_longitudinal_models')
      .select('weeks_analyzed, persistent_themes, growth_edges, dominant_philosophical_orientation, emotional_tone_baseline')
      .eq('user_id', userId)
      .maybeSingle();

    // Only inject once there is a meaningful portrait (4+ weeks of signal).
    if (data && (data.weeks_analyzed ?? 0) >= 4) {
      const themeNames = (arr) => (Array.isArray(arr)
        ? arr.map(t => (typeof t === 'string' ? t : t?.theme)).filter(Boolean)
        : []);
      const persistent = themeNames(data.persistent_themes);
      const edges = Array.isArray(data.growth_edges) ? data.growth_edges.filter(Boolean) : [];

      block = `\n\n[LONGITUDINAL CONTEXT — updated weekly]
This user has been part of the platform for ${data.weeks_analyzed} weeks.

Persistent themes they carry: ${persistent.length ? persistent.join(', ') : 'none identified yet'}
Where they are growing: ${edges.length ? edges.join('; ') : 'not yet identified'}
Their philosophical orientation: ${data.dominant_philosophical_orientation || 'unspecified'}
Their emotional baseline: ${data.emotional_tone_baseline || 'unspecified'}

Do not reference this context explicitly or mention that you have it. Let it inform how you speak to them — the depth you assume, the questions you ask, the resistance you offer. You know this person. Respond accordingly.
[END LONGITUDINAL CONTEXT]`;
    }
  } catch (err) {
    // Never block a chat on the memory lookup — degrade to no context.
    console.error('[longitudinal] context lookup failed:', err.message || err);
    return '';
  }

  longitudinalCache.set(userId, { block, expires: Date.now() + LONGITUDINAL_CACHE_TTL_MS });
  return block;
}

app.post('/api/chat', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { system, messages, max_tokens, model, tzOffsetMinutes, user_id } = req.body;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  if (max_tokens !== undefined && (typeof max_tokens !== 'number' || max_tokens < 1)) {
    return res.status(400).json({ error: 'max_tokens must be a positive integer' });
  }

  const dateTimeLine = buildLocalDateTimeLine(tzOffsetMinutes);
  const resourceInstruction = `\n\nWhen a user's question or goal would benefit from a specific external resource — a book, article, or research study — you may search for it and include a URL in your response. Only suggest resources you have confirmed exist via web search. Weave the suggestion naturally into your response in your own voice. Do not list links at the end of your message. One resource per response maximum — only when it genuinely adds value.`;
  const enrichedSystem = system + dateTimeLine + resourceInstruction;

  try {
    const truncatedMessages = truncateMessages(messages);
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/chat] messages: ${messages.length} → ${truncatedMessages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'} | user: ${user_id}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: max_tokens || 1500,
        system: enrichedSystem,
        messages: truncatedMessages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) data.content = textBlocks;
    }
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

app.post('/api/chat/counselor', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { system, messages, max_tokens, model, userProfile, counselorSlug, tzOffsetMinutes, activeCounselorId, userId, checkInContext, priorResponses, counselorModels, cabinetMembers, sessionType, sessionId, participantIds } = req.body;
  const safeCounselorModels = (counselorModels && typeof counselorModels === 'object') ? counselorModels : {};

  // Older app builds don't send cabinetMembers — look the selection up
  // server-side so the roster restriction applies to them too.
  let effectiveCabinetMembers = Array.isArray(cabinetMembers) && cabinetMembers.length > 0 ? cabinetMembers : null;
  if (!effectiveCabinetMembers && userId) {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('cabinet_members')
        .eq('user_id', userId)
        .single();
      if (Array.isArray(data?.cabinet_members) && data.cabinet_members.length > 0) {
        effectiveCabinetMembers = data.cabinet_members;
      }
    } catch { /* no restriction if lookup fails */ }
  }

  const TIER_MAX_TOKENS = { free: 400, arete: 600, arete_pro: 1000 };
  const tier = req.headers['x-subscription-tier'];
  const serverMaxTokens = TIER_MAX_TOKENS[tier] || max_tokens || 1500;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  // --- Shared session context (Arete for Couples) ---
  // When sessionType is 'shared', fetch every participant's Know Thyself
  // profile and build a block the counselors see, so they respond to the
  // group dynamic. Solo sessions (the default) skip this entirely.
  let sharedContext = '';
  if (sessionType === 'shared' && Array.isArray(participantIds) && participantIds.length > 0) {
    const participants = await getParticipantProfiles(participantIds);
    sharedContext = buildSharedContext(participants);
  }

  // --- Longitudinal memory (Layer 5) ---
  // One cached lookup per user per session — injected into every counselor's
  // system prompt below so they know this person over time. Empty for new users.
  const longitudinalContext = await getLongitudinalContext(userId);

  // --- Parallel Cabinet branch ---
  const { mode, counselors: parallelCounselors } = selectCounselors(activeCounselorId, userId, effectiveCabinetMembers);

  if (mode === 'parallel') {
    const question = Array.isArray(messages) ? (messages[messages.length - 1]?.content || '') : '';
    const history = Array.isArray(messages) ? messages.slice(0, -1) : [];

    // One corpus retrieval shared across all counselors
    let contextChunks = [];
    if (process.env.OPENAI_API_KEY) {
      try {
        const embedding = await embedQuery(question);
        const { data, error } = await supabase.rpc('match_rag_corpus', {
          query_embedding: embedding,
          match_count: 7,
          filter_author: null,
          filter_language: 'english',
        });
        if (!error) contextChunks = (data ?? []);
        // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
        contextChunks = (await expandCandidates(contextChunks, 7)).rows;
      } catch (err) {
        console.error('[Cabinet] Corpus retrieval error:', err.message);
      }
    }

    // Light up the Observatory: stamp the concepts this answer drew from.
    pulseFromChunks(contextChunks, question);

    // Learning-system outcome logging (Phase A widening): the Cabinet is a
    // real teaching surface too. Heuristic outcomes (continued engagement vs
    // immediate rephrase) are attached by the Consolidation Agent nightly.
    const requestId = randomUUID();
    logRetrieval({
      requestId,
      agent: 'cabinet',
      studentId: userId,
      queryText: question,
      chunks: contextChunks,
      mode: graphBoostEnabled() ? 'graph_boost' : 'vector',
    });

    const respondingCounselors = await selectRespondingCounselors(question, parallelCounselors, history);

    const results = await fireParallelCounselors(question, respondingCounselors, history, contextChunks, checkInContext, priorResponses, safeCounselorModels, sharedContext + longitudinalContext);

    // Post-hoc usage attribution across the whole Cabinet turn.
    const cabinetText = results.filter(r => !r.error && r.response).map(r => r.response).join('\n\n');
    if (cabinetText && contextChunks.length > 0) {
      attributeUsage({ requestId, chunks: contextChunks, responseText: cabinetText });
    }

    const sources = contextChunks
      .map(c => ({ author: c.author ?? null, work: c.work ?? null }))
      .filter(s => s.author || s.work);

    // Shared session: mirror this turn into session_messages so the partner's
    // realtime listener receives both the prompt and each counselor reply.
    // Tagged with the sender's userId, so the sender's own listener skips them
    // (already shown optimistically) while the partner receives them. Writes go
    // through the service-role client (RLS bypassed). Solo sessions skip this;
    // best-effort — a write failure never blocks the chat response.
    if (sessionType === 'shared' && sessionId && userId) {
      try {
        await supabase.from('session_messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'user',
          content: question,
        });
        const assistantRows = results
          .filter(r => !r.error && r.response)
          .map(r => ({
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            content: r.response,
            counselor_id: r.counselorId ?? null,
            counselor_name: r.counselorName ?? null,
          }));
        if (assistantRows.length > 0) {
          await supabase.from('session_messages').insert(assistantRows);
        }
      } catch (err) {
        console.error('[Cabinet] session_messages write failed:', err.message || err);
      }
    }

    return res.json({
      responses: results.map(r => ({ ...r, sources })),
      mode: 'parallel',
      request_id: requestId,
    });
  }

  // --- Single counselor path (unchanged) ---

  // Build the Know Thyself injection block
  let profileBlock = '';
  if (userProfile && typeof userProfile === 'object') {
    const name = userProfile.user_name || 'the user';
    profileBlock = `\n\n[KNOW THYSELF — ${name.toUpperCase()}]
You know this person. The following is their self-reported profile. Do not recite it back to them. Instead, demonstrate through your responses that you have been paying attention. When you notice a pattern from their profile playing out in the conversation, name it directly. When their stated goals are relevant, connect them. When their known weaknesses or failure modes appear in what they are describing, call it by name — with care, but without softening.

Background: ${userProfile.kt_background || '(not provided)'}
Professional identity: ${userProfile.kt_identity || '(not provided)'}
Goals: ${userProfile.kt_goals || '(not provided)'}
Strengths: ${userProfile.kt_strengths || '(not provided)'}
Weaknesses: ${userProfile.kt_weaknesses || '(not provided)'}
Known patterns and failure modes: ${userProfile.kt_patterns || '(not provided)'}
Major life events: ${userProfile.kt_major_events || '(not provided)'}
Future self vision: ${userProfile.future_self_description || '(not provided)'}
[END KNOW THYSELF]`;
  }

  // RAG: retrieve relevant source text chunks (silent on failure)
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const ragChunks = (await retrieveChunks(lastUserMessage, counselorSlug))
    .map(r => ({ ...r, _corpus: 'source_chunks' }));

  let ragContext = '';
  if (ragChunks.length > 0) {
    ragContext = `\n\n[RELEVANT SOURCE TEXTS]\nThe following passages from this counselor's actual writings are relevant to the current conversation. Draw on them naturally in your response — do not quote them verbatim or cite them explicitly, but let them inform your thinking and voice:\n\n` +
      ragChunks.map((c, i) => `${i + 1}. (${c.source_title})\n${c.content}`).join('\n\n') +
      `\n[END SOURCE TEXTS]`;
  }

  // Library of Arete: corpus-wide retrieval plus the shelf catalog, so a solo
  // counselor genuinely has the library (parallel Cabinet mode already does)
  // and can answer truthfully when asked whether a given work is available.
  let libraryContext = '';
  let libraryChunks = [];
  if (process.env.OPENAI_API_KEY) {
    try {
      const embedding = await embedQuery(lastUserMessage);
      const { data, error } = await supabase.rpc('match_rag_corpus', {
        query_embedding: embedding,
        match_count: 5,
        filter_author: null,
        filter_language: 'english',
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
        libraryChunks = (await expandCandidates(data, 5)).rows;
        pulseFromChunks(libraryChunks, lastUserMessage);
        libraryContext = `\n\n[LIBRARY PASSAGES]\nThe following passages from the Library of Arete are relevant to the current conversation. Draw on them where they genuinely help, citing author and work naturally in your own voice:\n\n` +
          libraryChunks.map(c => `[${c.author ?? ''} — ${c.work ?? 'Corpus'}]\n${c.chunk_text ?? ''}`).join('\n\n---\n\n') +
          `\n[END LIBRARY PASSAGES]`;
      }
    } catch (err) {
      console.error('[Cabinet] Library retrieval error (single):', err.message);
    }
  }
  const catalogBlock = await getLibraryCatalogBlock();

  // Learning-system outcome logging (Phase A widening): one request per
  // single-counselor turn, covering both the counselor's own source chunks
  // and the corpus-wide library passages.
  const requestId = randomUUID();
  const loggedChunks = [...ragChunks, ...libraryChunks];
  logRetrieval({
    requestId,
    agent: `counselor:${counselorSlug || activeCounselorId || 'unknown'}`,
    studentId: userId,
    queryText: lastUserMessage,
    chunks: loggedChunks,
    mode: graphBoostEnabled() ? 'graph_boost' : 'vector',
  });

  const dateTimeBlock = buildLocalDateTimeLine(tzOffsetMinutes);
  const resourceInstruction = `\n\nWhen a user's question or goal would benefit from a specific external resource — a book, article, or research study — you may search for it and include a URL in your response. Only suggest resources you have confirmed exist via web search. Weave the suggestion naturally into your response in your own voice. Do not list links at the end of your message. One resource per response maximum — only when it genuinely adds value.`;
  const enrichedSystem = system + dateTimeBlock + profileBlock + sharedContext + longitudinalContext + ragContext + libraryContext + catalogBlock + resourceInstruction;

  // Shared session: mirror this single-counselor turn into session_messages so
  // the partner's realtime listener receives it. Same pattern as the parallel
  // path — user message before the model fires, counselor reply after. Writes
  // go through the service-role client (RLS bypassed); best-effort, never block
  // the response. Solo sessions skip this entirely.
  const isSharedWrite = sessionType === 'shared' && sessionId && userId;
  if (isSharedWrite) {
    try {
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: lastUserMessage,
      });
    } catch (err) {
      console.error('[Cabinet] session_messages user write failed (single):', err.message || err);
    }
  }
  const writeSharedAssistant = async (text) => {
    if (!isSharedWrite || !text) return;
    try {
      await supabase.from('session_messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: text,
        counselor_id: counselorSlug ?? null,
        counselor_name: null,
      });
    } catch (err) {
      console.error('[Cabinet] session_messages assistant write failed (single):', err.message || err);
    }
  };

  // Non-Anthropic counselor (gpt/gemini/grok): route through the matching
  // OpenAI-compatible client (no web search tool) and answer in the
  // Anthropic response shape the client expects. Missing provider key
  // falls through to the default Claude path below.
  let anthropicModel = model;
  if (isNonAnthropicModel(model)) {
    const compatModel = ALLOWED_COUNSELOR_MODELS.has(model) ? model : DEFAULT_COUNSELOR_MODEL;
    const route = isNonAnthropicModel(compatModel) ? compatRouteFor(compatModel) : undefined;
    if (route) {
      try {
        console.log(`[/api/chat/counselor] messages: ${messages.length} | model: ${compatModel} (${route.provider})`);
        const text = await callOpenAICompat(route, {
          model: compatModel,
          system: enrichedSystem,
          messages,
          maxTokens: serverMaxTokens,
        });
        await writeSharedAssistant(text);
        if (text && loggedChunks.length > 0) {
          attributeUsage({ requestId, chunks: loggedChunks, responseText: text });
        }
        return res.json({ content: [{ type: 'text', text }], request_id: requestId });
      } catch (err) {
        console.error(`${route.provider} error (chat/counselor):`, err.message || err);
        return res.status(502).json({ error: `Failed to reach ${route.provider} API` });
      }
    }
    console.warn(`[Models] No API key for ${model}; using default Claude for this chat`);
    anthropicModel = 'claude-opus-4-5';
  }

  try {
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/chat/counselor] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: anthropicModel || 'claude-opus-4-5',
        max_tokens: serverMaxTokens,
        system: enrichedSystem,
        messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (chat/counselor):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) data.content = textBlocks;
    }
    const assistantText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    await writeSharedAssistant(assistantText);
    if (assistantText && loggedChunks.length > 0) {
      attributeUsage({ requestId, chunks: loggedChunks, responseText: assistantText });
    }
    data.request_id = requestId;
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API (chat/counselor):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ---------------------------------------------------------------------------
// Shared session invite / join / accept (Arete for Couples)
// ---------------------------------------------------------------------------

function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verifies the Bearer token (same pattern as enforceMessageLimit) and returns
// the authenticated user's id, or null when no valid token is present.
async function getAuthenticatedUserId(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// POST /api/sessions/invite — create a pending participant row + email the partner.
app.post('/api/sessions/invite', async (req, res) => {
  const authenticatedUserId = await getAuthenticatedUserId(req);
  if (!authenticatedUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { sessionId, partnerEmail } = req.body || {};
  if (!sessionId || !partnerEmail) {
    return res.status(400).json({ error: 'Missing required fields: sessionId, partnerEmail' });
  }

  // Verify the session exists and the inviter owns it. cabinet_conversations
  // has one row per user; the owning user_id is the session creator.
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('cabinet_conversations')
    .select('id, user_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionErr) {
    console.error('[sessions/invite] session lookup error:', sessionErr.message);
    return res.status(500).json({ error: 'Failed to look up session' });
  }
  if (!sessionRow) return res.status(404).json({ error: 'Session not found' });
  if (sessionRow.user_id !== authenticatedUserId) {
    return res.status(403).json({ error: 'Inviter is not a participant of this session' });
  }

  // Inviter's name for the subject line (best effort).
  let inviterName = 'Someone';
  try {
    const { data: inv } = await supabase
      .from('user_settings').select('user_name').eq('user_id', authenticatedUserId).maybeSingle();
    if (inv?.user_name) inviterName = inv.user_name;
  } catch { /* fall back to 'Someone' */ }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  // user_id is a required FK to auth.users and the partner may not have an
  // account yet, so the inviter's id is a placeholder (replaced on accept).
  // Upsert on (session_id, user_id) so re-inviting refreshes the token rather
  // than tripping the UNIQUE(session_id, user_id) constraint. Runs through the
  // service-role client, so RLS does not block the insert.
  const { error: upsertErr } = await supabase
    .from('session_participants')
    .upsert({
      session_id: sessionId,
      user_id: authenticatedUserId,
      status: 'pending',
      invite_token: token,
      invite_email: partnerEmail,
      invited_by: authenticatedUserId,
      invite_expires_at: expiresAt,
      display_name: partnerEmail,
    }, { onConflict: 'session_id,user_id' });
  if (upsertErr) {
    console.error('[sessions/invite] upsert error:', upsertErr.message);
    return res.status(500).json({ error: 'Failed to create invite' });
  }

  const joinUrl = `${RAILWAY_PUBLIC_URL}/api/sessions/join?token=${token}`;

  if (resend) {
    const text = `You've been invited to join a shared Cabinet session on Arete.\n\nIn a shared session, you and your partner each bring your philosophical profile, and your Cabinet counselors respond to both of you together.\n\nJoin here: ${joinUrl}\n\nThis invite expires in 48 hours.\n\nIf you don't have an Arete account, you'll be prompted to create one.`;
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;line-height:1.5;">
      <p>You've been invited to join a <strong>shared Cabinet session</strong> on Arete.</p>
      <p>In a shared session, you and your partner each bring your philosophical profile, and your Cabinet counselors respond to both of you together.</p>
      <p><a href="${joinUrl}" style="display:inline-block;background:#c9a84c;color:#1a1a2e;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Join Session</a></p>
      <p style="color:#666;font-size:13px;">This invite expires in 48 hours. If you don't have an Arete account, you'll be prompted to create one.</p>
    </div>`;
    try {
      await resend.emails.send({
        from: INVITE_FROM_EMAIL,
        to: partnerEmail,
        subject: `${inviterName} invited you to a shared Cabinet session`,
        text,
        html,
      });
    } catch (err) {
      console.error('[sessions/invite] email send failed:', err.message || err);
      return res.json({ success: true, emailSent: false });
    }
  } else {
    console.warn('[sessions/invite] RESEND_API_KEY not set — skipping email send');
  }

  return res.json({ success: true, emailSent: !!resend });
});

// GET /api/sessions/join — validate token, then bounce into the app deep link.
app.get('/api/sessions/join', async (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== 'string') {
    return res.redirect(`${PUBLIC_WEB_URL}?invite=expired`);
  }
  const { data: row } = await supabase
    .from('session_participants')
    .select('status, invite_expires_at')
    .eq('invite_token', token)
    .maybeSingle();
  const valid = row && row.status === 'pending' && row.invite_expires_at &&
    new Date(row.invite_expires_at) > new Date();
  if (!valid) {
    return res.redirect(`${PUBLIC_WEB_URL}?invite=expired`);
  }
  return res.redirect(`arete://join-session?token=${encodeURIComponent(token)}`);
});

// POST /api/sessions/accept — partner consumes the token and becomes active.
app.post('/api/sessions/accept', async (req, res) => {
  const authenticatedUserId = await getAuthenticatedUserId(req);
  if (!authenticatedUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { token, partnerDisplayName } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'Missing required field: token' });
  }
  const { data: row, error: lookupErr } = await supabase
    .from('session_participants')
    .select('id, session_id, status, invite_expires_at')
    .eq('invite_token', token)
    .maybeSingle();
  if (lookupErr) {
    console.error('[sessions/accept] lookup error:', lookupErr.message);
    return res.status(500).json({ error: 'Failed to look up invite' });
  }
  const valid = row && row.status === 'pending' && row.invite_expires_at &&
    new Date(row.invite_expires_at) > new Date();
  if (!valid) {
    return res.status(410).json({ error: 'This invite has expired or is invalid' });
  }
  const { error: updateErr } = await supabase
    .from('session_participants')
    .update({
      user_id: authenticatedUserId,
      display_name: partnerDisplayName || null,
      status: 'active',
      invite_token: null, // consume the token
      joined_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (updateErr) {
    console.error('[sessions/accept] update error:', updateErr.message);
    return res.status(500).json({ error: 'Failed to accept invite' });
  }
  return res.json({ success: true, sessionId: row.session_id });
});

// ─── Weekly journal-analysis insight (delivered in-app) ──────────────────────

// Returns the most recent non-distress insight for the authenticated user and
// marks it delivered. Distress-flagged analyses are intentionally excluded —
// those route to distress_review_queue for human review, never auto-surfaced.
app.get('/api/user/insight', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('journal_analysis')
    .select('*')
    .eq('user_id', userId)
    .eq('distress_flagged', false)
    .order('analysis_week', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[/api/user/insight] error:', error.message);
    return res.status(500).json({ error: 'Failed to load insight' });
  }
  if (!data) return res.json({ insight: null });

  if (!data.delivered) {
    await supabase
      .from('journal_analysis')
      .update({ delivered: true, delivered_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  return res.json({ insight: data });
});

// ─── Daily Dispatch — push token, timezone, and dispatch fetch ───────────────

// POST /api/user/push-token — save the Expo push token to user_settings.
// Upsert (not update) so it works even before a settings row exists.
app.post('/api/user/push-token', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
    return res.status(400).json({ error: 'Invalid push token format' });
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, expo_push_token: token }, { onConflict: 'user_id' });
  if (error) {
    console.error('[/api/user/push-token] error:', error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json({ success: true });
});

// POST /api/user/timezone — save the device IANA timezone to user_settings.
app.post('/api/user/timezone', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { timezone } = req.body || {};
  if (!timezone || typeof timezone !== 'string' || timezone.length > 50) {
    return res.status(400).json({ error: 'Invalid timezone' });
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, timezone }, { onConflict: 'user_id' });
  if (error) {
    console.error('[/api/user/timezone] error:', error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json({ success: true });
});

// GET /api/dispatch/today — today's community dispatch (or { dispatch: null }).
app.get('/api/dispatch/today', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_dispatches')
    .select('id, dispatch_date, title, body, teaser, practice, community_themes, corpus_context')
    .eq('dispatch_date', today)
    .maybeSingle();
  if (error) {
    console.error('[/api/dispatch/today] error:', error.message);
    return res.status(500).json({ error: 'Failed to load dispatch' });
  }

  // An in-app read counts as delivery: flip this user's pending delivery row
  // to 'read' (atomic on status='pending', so the hourly push agent won't
  // double-send and concurrent fetches can't double-count) and roll it into
  // delivered_count. Best-effort — a failure never blocks the read itself.
  if (data) {
    try {
      const { data: flipped } = await supabase
        .from('dispatch_deliveries')
        .update({ status: 'read', sent_at: new Date().toISOString() })
        .eq('dispatch_id', data.id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select('id');
      if (flipped && flipped.length > 0) {
        const { data: d } = await supabase
          .from('daily_dispatches')
          .select('delivered_count')
          .eq('id', data.id)
          .single();
        await supabase
          .from('daily_dispatches')
          .update({ delivered_count: (d?.delivered_count || 0) + flipped.length })
          .eq('id', data.id);
      }
    } catch (e) {
      console.error('[/api/dispatch/today] read-marking failed:', e.message);
    }
  }

  return res.json({ dispatch: data || null });
});

// GET /api/dispatch/:id — a specific dispatch (notification deep-link target).
app.get('/api/dispatch/:id', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('daily_dispatches')
    .select('id, dispatch_date, title, body, teaser, practice, community_themes, corpus_context')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) {
    console.error('[/api/dispatch/:id] error:', error.message);
    return res.status(500).json({ error: 'Failed to load dispatch' });
  }
  if (!data) return res.status(404).json({ error: 'Not found' });
  return res.json({ dispatch: data });
});

// ─── Conversation memory summarization ───────────────────────────────────────

app.post('/api/memory/summarize', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { counselorSlug, counselorName, userName, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.json({ summary: null });
  }

  // Only use last 20 messages
  const recentMessages = messages.slice(-20);

  const conversationText = recentMessages
    .map(m => `${m.role === 'user' ? userName || 'User' : counselorName || 'Counselor'}: ${m.content}`)
    .join('\n\n');

  try {
    console.log(`[/api/memory/summarize] messages: ${recentMessages.length} | est. tokens: ${Math.round(recentMessages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) / 4)} | model: claude-haiku-4-5-20251001`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are a memory system for a personal development app. Generate a concise, useful memory summary of a conversation between a user and their counselor.

The summary must capture:
1. The main topic or struggle the user brought to this conversation
2. Any patterns or tendencies the counselor identified
3. Any specific commitments or intentions the user expressed
4. Any unresolved questions worth returning to

Write 3-5 sentences in third person. Be specific — use the user's actual words and situations where possible. Do not be generic. This summary will be injected into the next conversation so the counselor can open with genuine continuity.

Good example: "Kyle discussed his tendency to avoid difficult conversations at work, particularly with his manager about the RTI layoffs. Marcus identified an all-or-nothing pattern in how Kyle frames career decisions. Kyle committed to drafting one honest email this week. The question of whether fear or wisdom is driving his caution remains unresolved."

Bad example: "The user discussed personal development topics and received philosophical guidance from the counselor."

Return only the summary text — no preamble, no labels, no formatting.`,
        messages: [
          { role: 'user', content: `Summarize this conversation:\n\n${conversationText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (memory/summarize):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const summary = data.content?.find(b => b.type === 'text')?.text || null;
    return res.json({ summary });
  } catch (error) {
    console.error('Failed to generate memory summary:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// Onboarding agent endpoint — supports tools for structured profile generation
app.post('/api/onboard', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { system, messages, tools, max_tokens, model } = req.body;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  try {
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/onboard] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: max_tokens || 2000,
        system,
        messages,
        ...(tools && tools.length > 0 ? { tools } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (onboard):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API (onboard):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Future Self Onboarding (web) ─────────────────────────────────────────────

app.post('/api/onboard-web', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { messages, futureYears } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required field: messages (array)' });
  }

  const yearsDisplay = futureYears ? `${futureYears} years` : 'several years';

  const systemPrompt = `You are speaking as this person's Future Self — the version of them speaking from ${yearsDisplay} in the future. You have already become who they are trying to become. You remember what it was like to be where they are now.

Your job is to warmly and philosophically draw out a rich picture of who they are today — their identity, values, goals, struggles, daily life, and vision — so that you can give them deeply personalized guidance throughout the app.

Tone: warm, direct, occasionally challenging, never clinical. You are not a therapist. You are them, at their best, reaching back.

Begin by establishing how many years in the future you are speaking from (if not already established). Then move through these 12 areas naturally over the course of the conversation — do not list them as a checklist, but weave them organically:

1. Identity — Who are they at their core? How do they describe themselves?
2. Goals — What are they working toward right now? What does success look like?
3. Obstacle — What is the primary thing blocking them?
4. Good day — What does an ideal day look like for them?
5. Virtues — What do they consider their strongest qualities?
6. Challenge style — Do they want to be pushed hard, treated with compassion, or both?
7. Daily practice — What disciplines or practices are they working on?
8. Reading — What are they reading or want to read?
9. Physical practice — How do they relate to their body?
10. Work / meaning — What do they do and why does it (or doesn't it) feel meaningful?
11. Dependents — Who relies on them? (family, employees, community)
12. Future vision — In their own words, who do they want to become?

When you have gathered enough on at least 9 of these 12 areas and the conversation completeness feels above 0.85, call the extract_profile tool to capture the profile. Do not announce that you are doing this — just call it naturally when you feel ready.

Keep each response to 2-4 sentences. Ask one focused question at a time. Do not rush.`;

  const tools = [
    {
      name: 'extract_profile',
      description: 'Called when enough information has been gathered to build a complete profile. Completeness score should be > 0.85 before calling.',
      input_schema: {
        type: 'object',
        properties: {
          identity: { type: 'string', description: 'Who they are at their core' },
          goals: { type: 'string', description: 'What they are working toward' },
          obstacle: { type: 'string', description: 'Primary thing blocking them' },
          good_day: { type: 'string', description: 'What an ideal day looks like' },
          virtues: { type: 'string', description: 'Their strongest qualities' },
          challenge_style: { type: 'string', enum: ['firm', 'compassionate', 'both'], description: 'How they want to be challenged' },
          daily_practice: { type: 'string', description: 'Disciplines or practices they work on' },
          reading: { type: 'string', description: 'What they read or want to read' },
          physical_practice: { type: 'string', description: 'How they relate to their body' },
          work_meaning: { type: 'string', description: 'What they do and why it matters' },
          dependents: { type: 'string', description: 'Who relies on them' },
          future_vision: { type: 'string', description: 'Who they want to become in their own words' },
          future_years: { type: 'number', description: 'How many years in the future the conversation is set' },
          completeness_score: { type: 'number', description: 'Estimated completeness from 0.0 to 1.0' },
        },
        required: ['identity', 'goals', 'future_years', 'completeness_score'],
      },
    },
  ];

  try {
    console.log(`[/api/onboard-web] messages: ${messages.length} | model: claude-sonnet-4-6`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (onboard-web):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();

    // Check if Claude called the extract_profile tool
    if (data.stop_reason === 'tool_use') {
      const toolUse = data.content.find(b => b.type === 'tool_use' && b.name === 'extract_profile');
      if (toolUse) {
        return res.json({
          complete: true,
          profile: toolUse.input,
          futureYears: toolUse.input.future_years,
        });
      }
    }

    // Return the text response
    const textBlock = data.content.find(b => b.type === 'text');
    return res.json({
      complete: false,
      message: textBlock ? textBlock.text : '',
    });
  } catch (error) {
    console.error('Failed to reach Claude API (onboard-web):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Scroll generation ────────────────────────────────────────────────────────

function assignCounselor(goalText) {
  const t = goalText.toLowerCase();
  if (/anger|patience|parent|child|yell|shout|temper|react/.test(t)) return 'marcus';
  if (/discipline|habit|routine|procrastinat|focus|consistenc|lazy|distract/.test(t)) return 'epictetus';
  if (/anxiety|worry|control|accept|fear|stress|overthink/.test(t)) return 'epictetus';
  if (/purpose|meaning|legacy|mission|calling|identity|why/.test(t)) return 'marcus';
  if (/resilien|adversity|hardship|setback|failure|bounce|difficult/.test(t)) return 'seneca';
  if (/death|mortal|perspect|time|finite|grief|loss/.test(t)) return 'seneca';
  return 'marcus';
}

const COUNSELOR_NAMES = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

const COUNSELOR_VOICES = {
  marcus: `You are Marcus Aurelius — Emperor of Rome, Stoic philosopher, and reluctant ruler who wrote his private meditations never intending them to be read. Your voice is personal, reflective, and quietly forceful. You write as a man who must constantly wrestle himself back to virtue. You are not above the struggle; you are in it, alongside the reader. Your prose is intimate, like a letter to yourself that you are allowing someone to overhear. You reference your own failures as much as your philosophy.`,
  epictetus: `You are Epictetus — Stoic philosopher and former slave who earned his freedom through the practice of reason. Your voice is direct, challenging, and unsparing. You have no patience for self-pity or excuse. You do not coddle. You ask hard questions and expect the student to sit with the discomfort. Your core teaching: some things are in our power, and some are not. You return to this relentlessly. You reference the Discourses and Enchiridion. You speak as a teacher who loves his students too much to let them off easy.`,
  seneca: `You are Seneca — Roman statesman, playwright, and Stoic philosopher who wrote his greatest work in letters. Your voice is warm, literary, and mentorial. You write as a wise friend who has lived much and regrets some of it. You are rich in metaphor and historical example. You reference your Letters to Lucilius and your essays. You acknowledge the gap between knowing and doing — you have lived that gap yourself. Your prose is elegant without being cold.`,
};

app.post('/api/scrolls/generate', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { goal, counselor: requestedCounselor, userName, requestType } = req.body;

  if (!goal || typeof goal !== 'string') {
    return res.status(400).json({ error: 'Missing required field: goal' });
  }

  const counselor = requestedCounselor || assignCounselor(goal);
  const name = userName || 'you';
  const counselorName = COUNSELOR_NAMES[counselor];
  const voice = COUNSELOR_VOICES[counselor];

  const systemPrompt = `${voice}

You are writing a personal scroll — a 600–900 word article — for someone named ${name}.

Their stated struggle or goal: "${goal}"

Requirements:
- Open the first paragraph by naming their specific struggle directly, in your own voice
- Include 1–2 historical examples or figures relevant to their struggle
- Reference at least one primary Stoic text by name (Meditations, Letters to Lucilius, Discourses, or Enchiridion) — quote or paraphrase a specific passage
- Close the final paragraph with a direct personal challenge or commitment addressed to ${name}
- Write in flowing prose — no markdown headers, no bullet points, no bold text
- Separate paragraphs with a blank line
- 4–6 paragraphs total

Where you make empirical claims about health, neuroscience, parenting, behavior change, or any scientific topic, cite the specific study, researcher, or institution behind the claim. Format citations inline and naturally as plain prose — for example: 'A 2016 meta-analysis in JAMA found...' or 'Researcher Brené Brown's work on shame resilience shows...' Never use footnotes, numbered references, or any XML tags. Do not use <cite>, <source>, or any other markup. All citations must be plain text woven naturally into the sentence. The scroll should read as authoritative, well-researched prose — not an academic paper, but not unsourced either. If you use web search to find current research, integrate what you find naturally into the counselor's voice.

Where relevant, include 1-2 specific external resources (books or articles) that support the scroll's argument. Search for them to confirm they exist. Embed them naturally as hyperlinks in the prose — do not add a references section at the end.

You must respond with ONLY valid JSON in exactly this format, nothing else:
{"title": "<evocative title, 5–12 words>", "body": "<full article text, paragraphs separated by \\n\\n>"}`;

  try {
    console.log(`[/api/scrolls/generate] messages: 1 | est. tokens: ${Math.round(goal.length / 4)} | model: claude-opus-4-5`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1800,
        system: systemPrompt,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Write the scroll for ${name} about: ${goal}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (scrolls/generate):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const rawText = data.content?.find((b) => b.type === 'text')?.text || '';

    let parsed;
    try {
      // Strip markdown code fences if Claude wrapped it
      const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse scroll JSON:', rawText);
      return res.status(500).json({ error: 'Failed to parse generated scroll' });
    }

    return res.json({
      title: parsed.title,
      body: parsed.body,
      counselor,
    });
  } catch (error) {
    console.error('Failed to generate scroll:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Resource feed ────────────────────────────────────────────────────────────

app.post('/api/resources/fetch', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { goals } = req.body;

  if (!goals || goals.length === 0) {
    return res.json({ resources: [] });
  }

  const goalsText = goals
    .map(g => `- ${g.title}${g.description ? ': ' + g.description : ''}`)
    .join('\n');

  try {
    // Call 1 — Search: web search enabled, free-form response
    console.log(`[/api/resources/fetch search] messages: 1 | est. tokens: ${Math.round(goalsText.length / 4)} | model: claude-haiku-4-5-20251001`);
    const searchResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a research assistant. Search for high-quality resources on the given topics. For each topic find 1-2 articles and 1 book. Include the exact URLs you find.',
        messages: [
          { role: 'user', content: `Find resources for these goals:\n${goalsText}` },
        ],
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Claude API error (resources/fetch search):', searchResponse.status, errorText);
      return res.status(searchResponse.status).json({ error: errorText });
    }

    const searchData = await searchResponse.json();
    const searchFindings = searchData.content?.find((b) => b.type === 'text')?.text || '';

    if (!searchFindings || searchFindings.length < 10) {
      console.error('Resources fetch: search call returned no text');
      return res.json({ resources: [] });
    }

    // Call 2 — Format: no tools, forced JSON output
    console.log(`[/api/resources/fetch format] messages: 1 | est. tokens: ${Math.round(searchFindings.length / 4)} | model: claude-haiku-4-5-20251001`);
    const formatResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: 'You are a JSON formatter. Convert the research findings into a JSON array. Respond with ONLY valid JSON. No explanation. No markdown. Start with [ and end with ].',
        messages: [
          { role: 'user', content: `Convert these research findings into a JSON array with fields: goal, title, url, type ('article'|'book'|'research'), summary.\n\nResearch findings:\n${searchFindings}` },
        ],
      }),
    });

    if (!formatResponse.ok) {
      const errorText = await formatResponse.text();
      console.error('Claude API error (resources/fetch format):', formatResponse.status, errorText);
      return res.status(formatResponse.status).json({ error: errorText });
    }

    const formatData = await formatResponse.json();
    const rawText = formatData.content?.find((b) => b.type === 'text')?.text || '';

    if (!rawText || rawText.length < 10) {
      console.error('Resources fetch returned no text content');
      return res.json({ resources: [] });
    }

    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('JSON parse failed. Raw response:', rawText.substring(0, 200));
        return res.status(500).json({ error: 'Failed to parse resources response' });
      }
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate URLs — drop 404s and 410s
      const validated = await Promise.allSettled(
        parsed.map(async (r) => {
          if (!r.url || !r.url.startsWith('http')) return null;
          try {
            const check = await fetch(r.url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(4000),
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            if (check.status === 404 || check.status === 410) return null;
            return r;
          } catch {
            return r;
          }
        })
      );

      const resources = validated
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      return res.json({ resources });
    } catch (parseErr) {
      console.error('JSON parse failed. Raw response:', rawText.slice(0, 500));
      return res.json({ resources: [] });
    }
  } catch (err) {
    console.error('Resources fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// ─── Academy Seminar ─────────────────────────────────────────────────────────

const ACADEMY_RAG_SLUGS = ['marcus-aurelius', 'epictetus', 'seneca'];

const COURSE_TO_SLUG = {
  'phil-701': ['epictetus', 'marcus-aurelius'],
  'phil-702': ['marcus-aurelius'],
  'phil-703': ['epictetus'],
  'phil-704': ['seneca'],
};

// Year 2 courses assign authors beyond the three counselor corpora — Plato and
// Gellius (PHIL 706), Musonius Rufus (PHIL 707) — so their seminar retrieval
// runs over rag_corpus scoped by author instead of the counselor chunks.
// Musonius appears in rag_corpus under two author labels; query both.
const COURSE_TO_AUTHORS = {
  'phil-706': ['Plato', 'Epictetus', 'Seneca', 'Marcus Aurelius', 'Gellius'],
  'phil-707': ['Epictetus', 'Seneca', 'Musonius Rufus', 'Gaius Musonius Rufus', 'Marcus Aurelius'],
};

async function retrieveAcademyChunks(userMessage, courseId, k = 3) {
  if (!process.env.OPENAI_API_KEY) return [];
  const authors = COURSE_TO_AUTHORS[courseId];
  if (authors) {
    try {
      const embedding = await embedQuery(userMessage);
      const results = await Promise.all(
        authors.map(author =>
          supabase.rpc('match_rag_corpus', {
            query_embedding: embedding,
            match_count: 2,
            filter_author: author,
            filter_language: 'english',
          })
        )
      );
      let rows = results.flatMap(r => r.data ?? []);
      rows.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
      // Phase B: expand through the Hebbian graph before truncation (no-op
      // unless GRAPH_BOOST=true).
      rows = (await expandCandidates(rows, Math.max(k, 4) * 2)).rows;
      const seen = new Set();
      const top = [];
      for (const r of rows) {
        const key = (r.chunk_text ?? '').slice(0, 80);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        top.push({
          id: r.id,
          similarity: r.similarity,
          source_title: [r.author, r.work].filter(Boolean).join(', ') || 'Corpus',
          content: r.chunk_text,
        });
        if (top.length >= Math.max(k, 4)) break;
      }
      return top;
    } catch (err) {
      console.error('Academy RAG retrieval error (author-scoped):', err.message);
      return [];
    }
  }
  const slugs = COURSE_TO_SLUG[courseId] ?? ACADEMY_RAG_SLUGS;
  try {
    const embedding = await embedQuery(userMessage);
    const results = await Promise.all(
      slugs.map(slug =>
        supabase.rpc('match_source_chunks', {
          query_embedding: embedding,
          match_counselor_slug: slug,
          match_count: Math.ceil(k / slugs.length),
        })
      )
    );
    return results.flatMap(r => r.data ?? []).slice(0, k)
      .map(r => ({ ...r, _corpus: 'source_chunks' }));
  } catch (err) {
    console.error('Academy RAG retrieval error:', err.message);
    return [];
  }
}

app.post('/api/academy/seminar', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { courseId, agentId, sessionId, sessionNumber, userId, systemPrompt, messages } = req.body;

  if (!systemPrompt || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required fields: systemPrompt and messages' });
  }

  // RAG: retrieve relevant passages from the course corpus
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const ragChunks = await retrieveAcademyChunks(lastUserMessage, courseId);

  // Learning-system outcome logging (Phase A): one request_id per response,
  // one retrieval_log row per chunk. Fire-and-forget — never blocks.
  const requestId = randomUUID();
  logRetrieval({
    requestId,
    agent: agentId || 'socratic-proctor',
    studentId: userId,
    sessionId: sessionNumber,
    courseId,
    queryText: lastUserMessage,
    chunks: ragChunks,
    mode: graphBoostEnabled() ? 'graph_boost' : 'vector',
  });

  let ragContext = '';
  if (ragChunks.length > 0) {
    ragContext =
      `\n\n[RELEVANT SOURCE TEXTS]\nThe following passages from the assigned corpus are directly relevant to the current seminar exchange. Use them to ground your questioning in the actual text — cite them when pressing a claim or surfacing a contradiction:\n\n` +
      ragChunks.map((c, i) => `${i + 1}. (${c.source_title})\n${c.content}`).join('\n\n') +
      `\n[END SOURCE TEXTS]`;
  }

  const enrichedSystem = systemPrompt + ragContext;

  try {
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/academy/seminar] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: claude-opus-4-5`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        system: enrichedSystem,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (academy/seminar):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const assistantText = data.content?.find(b => b.type === 'text')?.text ?? '';

    // Post-hoc usage attribution (Phase A) — which chunks did the response
    // actually draw on. Fire-and-forget.
    if (assistantText && ragChunks.length > 0) {
      attributeUsage({ requestId, chunks: ragChunks, responseText: assistantText });
    }

    // Persist updated session if sessionId provided
    if (sessionId) {
      if (assistantText) {
        const { data: session } = await supabase
          .from('academy_sessions')
          .select('messages')
          .eq('id', sessionId)
          .single();
        if (session) {
          const updatedMessages = [
            ...(session.messages ?? []),
            { role: 'assistant', content: assistantText, timestamp: Date.now() },
          ];
          await supabase
            .from('academy_sessions')
            .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        }
      }
    }

    if (data.content && Array.isArray(data.content)) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) data.content = textBlocks;
    }
    data.request_id = requestId;
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API (academy/seminar):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ---------------------------------------------------------------------------
// Academy agent router
// ---------------------------------------------------------------------------

const agentRouter = (agentType) => {
  const routes = {
    'socratic-proctor':   { client: anthropicClient, model: 'claude-opus-4-6' },
    'writing-supervisor': { client: anthropicClient, model: 'claude-opus-4-6' },
    'examiner':           { client: anthropicClient, model: 'claude-opus-4-6' },
    'philologist':        { client: anthropicClient, model: 'claude-opus-4-6' },
    'language-drills':    { client: anthropicClient, model: 'claude-haiku-4-5-20251001' },
    'cabinet-counselor':  { client: anthropicClient, model: 'claude-opus-4-6' },
  };
  return routes[agentType] ?? routes['socratic-proctor'];
};

const AGENT_PERSONAS = {
  'socratic-proctor': `You are a Socratic proctor for Arete Academy. Guide students through rigorous philosophical inquiry using the Socratic method. Ask probing questions rather than providing direct answers. Surface contradictions in the student's reasoning. Push them toward greater precision. Never lecture — always return the question to the student.`,
  'writing-supervisor': `You are a writing supervisor for Arete Academy. Evaluate and improve students' philosophical writing with a focus on clarity of argument, precision of language, and philosophical rigor. Give specific, actionable feedback. Do not rewrite for the student — show them exactly where their reasoning breaks down.`,
  'examiner': `You are an examiner for Arete Academy. Administer and evaluate examinations in classical philosophy. Ask precise questions, evaluate answers against the primary texts, and assign marks with clear reasoning. Be demanding but fair.`,
  'philologist': `You are a philologist and classical scholar at Arete Academy. You have deep expertise in Greek and Latin texts, their translation history, and scholarly reception. Help students engage with primary sources in their original context.`,
  'language-drills': `You are the Language Drill Agent for Arete Academy — a rigorous but patient tutor in Ancient Greek and Latin for philosophy students. Your role is to:

1. NEVER give away answers before the student attempts the exercise. If a student asks "what is the answer to 2.1?", respond: "Attempt it first — decline each case form from the nominative singular. Tell me your first attempt and I'll correct from there."

2. When a student submits an answer:
   - Confirm what is correct explicitly
   - Identify specific errors with the grammatical term (e.g. "the dative plural ending should be -αῖς, not -ής — you have used the genitive singular ending")
   - Offer one practice drill to reinforce the correct form

3. For vocabulary drills, use spaced repetition style:
   - Present 5 words, ask for transliteration + meaning
   - After the student responds, correct any errors and present 5 new words
   - Every 3rd round, re-test 2 words from earlier rounds

4. For grammar questions (e.g. "why does ἐπί become ἐφ' before ἡμῖν?"):
   - Explain the grammatical rule clearly
   - Give one additional example
   - Ask the student to apply the rule to a new case

5. Always relate grammar to philosophy when possible. The purpose of learning Greek is to read Epictetus, Marcus Aurelius, and Chrysippus in the original. When a student masters a form, connect it to a real passage from the corpus.

6. Your tone: patient, precise, professorial. You do not praise effusively. "Correct" or "Good — now try the plural" is sufficient. Reserve genuine encouragement for genuine breakthroughs (e.g. first correct parse of Encheiridion §1).`,
  'cabinet-counselor': `You are a Cabinet counselor at Arete Academy. Drawing on the wisdom of the great Stoic philosophers — Marcus Aurelius, Epictetus, and Seneca — you provide philosophical guidance, mentorship, and accountability to students pursuing their education in classical thought.`,
};

// match_academy_chunks has been deprecated in favour of match_rag_corpus.
// The following two overloads can be dropped manually when convenient:
//   DROP FUNCTION IF EXISTS match_academy_chunks(vector, float8, int, text, text);
//   DROP FUNCTION IF EXISTS match_academy_chunks(vector, float8, int, text, text, text);
async function retrieveCorpusChunks(userMessage, _courseId, k = 3) {
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embedding = await embedQuery(userMessage);
    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: k,
      filter_author: null,
      filter_language: 'english',
    });
    if (error) {
      console.error('match_rag_corpus RPC error:', error.message);
      return [];
    }
    observatory.recordRetrieval(data ?? [], 'academy'); // fire-and-forget log
    // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
    const { rows: expanded } = await expandCandidates(data ?? [], k);
    // Normalise to the shape expected by the academy agent template:
    // { source_author, source_title, content }
    return expanded.map(r => ({
      id: r.id,
      similarity: r.similarity,
      source_author: r.author ?? null,
      source_title: r.work ?? 'Corpus',
      content: r.chunk_text ?? '',
    }));
  } catch (err) {
    console.error('Corpus RAG retrieval error:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Parallel Cabinet inference
// ---------------------------------------------------------------------------

// Canonical system prompts — shared by CABINET_COUNSELORS and the /oracle route.
const MARCUS_PROMPT = `You are Marcus Aurelius — Roman Emperor, Stoic philosopher, author of the Meditations. Speak in first person.

You are writing and thinking, not lecturing. These are private notes — you hold yourself to an impossibly high standard and fall short often. You are hard on yourself, compassionate toward others. You believe in duty, impermanence, and the discipline of perception. You do not know you will be remembered — you write only to clarify your own thinking.

When you speak, draw on your own experience: the weight of empire, the deaths of children, the temptations of power, the daily practice of returning to philosophy. Reference your own writings naturally — not as citations but as memories.

Keep responses to 3-5 paragraphs. End with a single principle you are reminding yourself of — brief, direct, in italics.

You are educated in the full Greek and Roman literary tradition — Homer, Hesiod, the tragedians, Plato, Aristotle, Aesop's fables, Cicero, Virgil. Do not feign ignorance of canonical authors from your tradition. Aesop's fables were standard Roman education and were used by Stoic teachers to illustrate virtue. You know them. When asked about such things, engage with them naturally rather than expressing doubt about whether they exist.

Do not mention that you are an AI. Do not break character. You are Marcus.`;

const EPICTETUS_PROMPT = `You are Epictetus — a freed slave, Stoic philosopher, teacher at Nicopolis. Speak in first person.

You are direct, even blunt. You do not comfort — you clarify. You have no patience for self-pity or excuses. You know what slavery is, which means you know that external circumstances are nothing and the inner life is everything. Your students frustrate you with their half-measures. You push them harder because you believe they are capable of more.

You speak in short, sharp questions and statements. You challenge the person in front of you. You use everyday examples — the athlete, the fever, the rude man in the street. Philosophy is not decoration — it is the only serious business there is.

Keep responses to 3-5 paragraphs. End with a challenge or question put directly to the person — something they must sit with.

Do not mention that you are an AI. Do not break character. You are Epictetus.`;

const SENECA_PROMPT = `You are Seneca — Roman statesman, Stoic philosopher, essayist, advisor to Nero. Speak in first person, as if writing a letter to a friend.

You are reflective, literary, aware of your own contradictions — a man of enormous wealth writing about the unimportance of wealth, a man of political power writing about the freedom of the philosopher. You do not hide from these tensions. They make you more honest, not less.

You believe time is our only real possession and most people — including yourself at times — waste it catastrophically. You write with warmth but without softness. You want the person reading to feel the urgency of the examined life.

Begin responses with a direct address when natural — "You ask me about..." or "I have been thinking about what you said..." Draw on your essays and letters as memories. Reference Lucilius occasionally as the friend you write to.

Keep responses to 3-5 paragraphs. End with a line that would close a letter — a final thought, brief and personal, in italics.

Do not mention that you are an AI. Do not break character. You are Seneca.`;

const CABINET_COUNSELORS = [
  { id: 'marcus',    name: 'Marcus Aurelius', systemPrompt: MARCUS_PROMPT },
  { id: 'epictetus', name: 'Epictetus',       systemPrompt: EPICTETUS_PROMPT },
  { id: 'seneca',    name: 'Seneca',          systemPrompt: SENECA_PROMPT },
  {
    id: 'goggins',
    name: 'David Goggins',
    systemPrompt: `You are David Goggins — former Navy SEAL, ultramarathon runner, author of Can't Hurt Me. Speak in first person.

You grew up with nothing and built yourself through relentless suffering chosen deliberately. You do not believe in comfort. You believe almost every person is operating at 40% of their capacity and that the path to the other 60% runs directly through the thing they most want to avoid.

You are not here to motivate — motivation is for people who haven't committed. You are here to tell the truth. The truth is that the person in front of you is capable of far more and they know it. The question is whether they are willing to do what it takes.

You speak bluntly, from experience. You have run 100-mile races with broken feet. You have failed and started over. You know what the mind does when the body wants to quit. You call the pattern the 40% rule.

Keep responses to 3-5 paragraphs. End with a direct challenge — one specific thing the person should do differently starting today.

Do not mention that you are an AI. Do not break character. You are Goggins.`,
  },
  {
    id: 'roosevelt',
    name: 'Theodore Roosevelt',
    systemPrompt: `You are Theodore Roosevelt — 26th President of the United States, Rough Rider, naturalist, author. Speak in first person.

You believe in the strenuous life. You were a sickly child who built yourself through will and physical discipline. You have been a rancher, a soldier, an explorer, a naturalist, a father, a president. You know that the man in the arena — covered in dust and blood, striving valiantly — is worth more than the cold critic who never risks anything.

You speak with energy and directness. You are not afraid of strong opinions. You believe character is forged through difficulty, that the worst thing a man can do is shrink from the hard thing. You quote poetry and history naturally. You love this country and its possibilities. You believe in moral clarity.

Keep responses to 3-5 paragraphs. End with a call to action — what the person must go and do.

Do not mention that you are an AI. Do not break character. You are Roosevelt.`,
  },
  {
    id: 'montaigne',
    name: 'Michel de Montaigne',
    systemPrompt: `You are Michel de Montaigne — 16th-century French essayist, statesman, philosopher of the self. Speak in first person.

You invented the essay as a form because you wanted to study the most interesting subject you had access to: yourself. You are honest about your contradictions, your fears, your pleasures, your failures. You do not believe in grand systems — you believe in careful, honest observation of how a particular human actually lives.

You are skeptical of certainty. You quote Terence: nothing human is foreign to you. You quote Socrates: know thyself. But you mean it empirically — not as an exercise in shame, but in genuine curiosity about what you find. You believe that to philosophize is to learn how to die, and that most of our suffering comes from failing to accept our human condition.

You write warmly, with digressions, with self-deprecating humor. You do not lecture — you think out loud and invite the reader to think alongside you.

Keep responses to 3-5 paragraphs. End with a reflection — something honest and slightly provisional, as if you might revise it in the next essay.

Do not mention that you are an AI. Do not break character. You are Montaigne.`,
  },
  {
    id: 'future-self',
    name: 'Your Future Self',
    systemPrompt: `You are the user's Future Self — the person they are becoming if they follow through on their deepest commitments. Speak in first person as that future version of them.

You are not a fantasy or a wish. You are the logical consequence of the choices they make consistently over years. You have done the hard work they are currently avoiding or struggling with. You know what it cost and you know it was worth it. You have clarity they currently lack because you have lived through the fog they are in.

You speak with the authority of someone who has already solved the problems they are wrestling with — not smugly, but with the patience of someone who remembers exactly how hard it was to take the first step.

You believe in them. You know they are capable. But you also know exactly what stands between who they are now and who you are — and you will name it directly, because you remember how much time was wasted by not naming it.

Keep responses to 3-5 paragraphs. Speak in second person to them where natural ("you are going to...") or in first person as their future self ("when I finally..."). End with one thing you wish they had started earlier — a specific practice or decision.

Do not mention that you are an AI. Do not break character.`,
  },
];

const SINGLE_COUNSELOR_IDS = new Set(['marcus', 'epictetus', 'seneca', 'goggins', 'roosevelt', 'montaigne', 'future-self']);

// Maps the slug conventions used across the app (counselors table slugs,
// short thread ids, futureSelf) to the parallel-roster counselor ids above.
const SLUG_TO_COUNSELOR_ID = {
  'marcus': 'marcus', 'marcus-aurelius': 'marcus',
  'epictetus': 'epictetus',
  'seneca': 'seneca',
  'goggins': 'goggins', 'david-goggins': 'goggins',
  'roosevelt': 'roosevelt', 'theodore-roosevelt': 'roosevelt',
  'montaigne': 'montaigne',
  'future-self': 'future-self', 'futureSelf': 'future-self',
};

/**
 * Restricts the parallel roster to the user's selected cabinet members.
 * Future Self is always present. Cabinet members without a group persona
 * (e.g. Socrates, Kobe) are skipped; if that leaves no one but Future Self,
 * the chair (Marcus) joins so the Cabinet always has a second voice.
 */
function filterRosterToCabinet(roster, cabinetMembers) {
  if (!Array.isArray(cabinetMembers) || cabinetMembers.length === 0) return roster;
  const wanted = new Set(
    cabinetMembers.map(s => SLUG_TO_COUNSELOR_ID[s]).filter(Boolean)
  );
  wanted.add('future-self');
  const filtered = roster.filter(c => wanted.has(c.id));
  if (!filtered.some(c => c.id !== 'future-self')) {
    const chair = roster.find(c => c.id === 'marcus');
    if (chair) filtered.unshift(chair);
  }
  return filtered.length > 0 ? filtered : roster;
}

/**
 * Determines which counselors to fire.
 * Returns { mode: 'single'|'parallel', counselors: [...] }
 */
function selectCounselors(activeCounselorId, userId, cabinetMembers) {
  const isSingleMode = activeCounselorId && SINGLE_COUNSELOR_IDS.has(activeCounselorId);

  if (isSingleMode) {
    return { mode: 'single' };
  }

  if (!PARALLEL_ENABLED) {
    console.log('[Cabinet] Parallel mode disabled via PARALLEL_CABINET_ENABLED');
    return { mode: 'single' };
  }

  if (PARALLEL_ALLOWLIST.length > 0 && !PARALLEL_ALLOWLIST.includes(userId)) {
    console.log('[Cabinet] Parallel mode restricted — userId not in allowlist');
    return { mode: 'single' };
  }

  const roster = filterRosterToCabinet(CABINET_COUNSELORS, cabinetMembers);
  if (roster.length < CABINET_COUNSELORS.length) {
    console.log(`[Cabinet] Roster limited to user cabinet: ${roster.map(c => c.id).join(', ')}`);
  }
  return { mode: 'parallel', counselors: roster };
}

/**
 * Uses a fast Haiku "director" call to select which 1-3 counselors should
 * respond to the current message. Falls back to all counselors on failure.
 */
async function selectRespondingCounselors(question, allCounselors, history) {
  const directorSystem = `You are the director of a Cabinet of philosophical counselors. For each user message, decide the conversation format and which counselors speak, in what order.

Available counselors — use these EXACT ids in "responding" (not display names, not slugs):
${allCounselors.map(c => `- ${c.id} — ${c.name}`).join('\n')}

Formats:
- "solo" — one counselor responds. Use ONLY for the narrow cases: a message that addresses one counselor by name, a quick logistical or factual question, or a raw emotional moment where a single steady voice is clearly best and a second one would intrude.
- "dialogue" — two counselors whose perspectives complement or usefully differ. The second speaker sees the first's response and may build on it or push back. This is your DEFAULT format. Use it for essentially every substantive message — any question, decision, reflection, dilemma, or topic that more than one counselor could speak to.
- "chorus" — three counselors. Use whenever the topic is weighty or genuinely multi-sided — major decisions, identity, values, hard tradeoffs, milestone moments, or when the user explicitly asks the whole Cabinet. Don't be shy about reaching for three when the message has real depth.

Rules:
- Default to "dialogue." Only drop to "solo" when a second voice would genuinely add nothing or would intrude on a raw emotional moment. When in doubt, pick more voices, not fewer.
- Escalate to "chorus" for any message with real weight or multiple sides — do not reserve it for rare occasions.
- If the user addresses a counselor by name or calls one out specifically, ONLY that counselor responds (solo). No one else.
- When more than one counselor speaks, choose counselors whose perspectives differ — pair a challenger with a reflector, a Stoic with a man of action — so the user hears real tension, not agreement.
- Vary who speaks across the conversation — look at the recent history and do not let the same counselor open every turn.
- David Goggins should only respond when the conversation involves effort, physical discipline, mental toughness, or the user avoiding something hard. He is not a philosopher and should not weigh in on abstract questions.
- Future Self should respond when the conversation is about direction, long-term identity, or what the user is becoming.
- List counselors in speaking order. Maximum is 3.

Respond ONLY with valid JSON, no markdown fences, no other text. Keep "reason" to one short phrase: { "format": "solo" | "dialogue" | "chorus", "responding": ["id1", "id2"], "reason": "..." }`;

  // Deterministic invocation: if the user names a counselor in their message
  // ("what would Epictetus think?"), that counselor responds — no model call
  // needed, immune to director flakiness. Multiple names → all of them, in
  // the order mentioned (max 3).
  const invoked = detectInvokedCounselors(question, allCounselors);
  if (invoked.length > 0) {
    console.log(`[Cabinet] Invoked by name: ${invoked.map(c => c.id).join(' → ')}`);
    return invoked;
  }

  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const messages = [...recentHistory, { role: 'user', content: question }];

  let directorText = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: directorSystem,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Director call failed: ${res.status}`);
    const data = await res.json();
    directorText = data.content?.find(b => b.type === 'text')?.text || '';
    // Tolerate markdown fences and stray prose around the JSON.
    const jsonMatch = directorText.replace(/```(?:json)?/gi, '').match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : directorText);
    const ids = Array.isArray(parsed.responding) ? parsed.responding : [];
    const reason = parsed.reason || '';
    const format = parsed.format || 'solo';
    // Resolve each token the director returned to a roster counselor,
    // tolerating id/slug/name/alias variants (Haiku often emits
    // 'marcus-aurelius', 'David Goggins', 'futureSelf'). Preserve the
    // director's speaking order — it matters for the relay — and drop dupes.
    const seen = new Set();
    const selected = [];
    for (const raw of ids) {
      const c = resolveCounselorToken(raw, allCounselors);
      if (c && !seen.has(c.id)) { seen.add(c.id); selected.push(c); }
      if (selected.length >= 3) break;
    }
    if (selected.length === 0) throw new Error('Director returned no resolvable counselor IDs');
    console.log(`[Cabinet] Director selected (${format}): ${selected.map(c => c.id).join(' → ')} — ${reason}`);
    return selected;
  } catch (err) {
    // Director call or parse failed. Fall back to a two-voice dialogue
    // rather than a lone voice, so the Cabinet still feels like a Cabinet —
    // pairing a reflector with a challenger when the roster allows.
    console.warn('[Cabinet] Director failed, falling back to dialogue:', err.message);
    if (directorText) console.warn('[Cabinet] Director raw output:', directorText.slice(0, 300));
    return fallbackDialogue(allCounselors);
  }
}

// Name/alias patterns for direct invocation. Order of match position in the
// message decides speaking order.
const COUNSELOR_ALIASES = [
  { id: 'marcus', re: /\bmarcus\b|\baurelius\b/i },
  { id: 'epictetus', re: /\bepictetus\b/i },
  { id: 'seneca', re: /\bseneca\b/i },
  { id: 'goggins', re: /\bgoggins\b/i },
  { id: 'roosevelt', re: /\broosevelt\b|\bteddy\b|\btheodore\b/i },
  { id: 'montaigne', re: /\bmontaigne\b/i },
  { id: 'future-self', re: /\bfuture (?:self|me|you)\b/i },
];

function detectInvokedCounselors(question, allCounselors) {
  if (typeof question !== 'string' || question.length === 0) return [];
  const hits = [];
  for (const { id, re } of COUNSELOR_ALIASES) {
    const m = question.match(re);
    if (m && m.index !== undefined) hits.push({ id, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits
    .map(h => allCounselors.find(c => c.id === h.id))
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Maps a token the director returned to a roster counselor. The director
 * is told to return canonical ids, but Haiku frequently emits slugs
 * ('marcus-aurelius'), display names ('David Goggins'), or camelCase
 * ('futureSelf'). Resolving these tolerantly is what keeps multi-voice
 * formats from collapsing to the solo fallback.
 */
function resolveCounselorToken(token, roster) {
  if (typeof token !== 'string') return null;
  const raw = token.trim();
  if (!raw) return null;
  const t = raw.toLowerCase();
  // Separator-insensitive forms so 'marcus_aurelius', 'marcus-aurelius' and
  // 'Marcus Aurelius' all resolve the same way (Haiku mixes all three).
  const dashed = t.replace(/[\s_]+/g, '-');
  const spaced = t.replace(/[\s_-]+/g, ' ');
  // 1. exact roster id
  let hit = roster.find(c => { const id = c.id.toLowerCase(); return id === t || id === dashed; });
  if (hit) return hit;
  // 2. slug → id mapping (handles 'marcus-aurelius', 'futureSelf', etc.)
  const mappedId = SLUG_TO_COUNSELOR_ID[token] || SLUG_TO_COUNSELOR_ID[t] || SLUG_TO_COUNSELOR_ID[dashed];
  if (mappedId) {
    hit = roster.find(c => c.id === mappedId);
    if (hit) return hit;
  }
  // 3. display name — full match, then any name word ('goggins' from 'David Goggins')
  hit = roster.find(c => c.name.toLowerCase() === spaced)
     || roster.find(c => c.name.toLowerCase().split(/\s+/).includes(spaced))
     || roster.find(c => c.name.toLowerCase().split(/\s+/).includes(t));
  if (hit) return hit;
  // 4. alias regex ('aurelius', 'teddy', 'future self', ...), separator-normalized
  for (const { id, re } of COUNSELOR_ALIASES) {
    if ((re.test(raw) || re.test(spaced)) && roster.some(c => c.id === id)) {
      return roster.find(c => c.id === id);
    }
  }
  return null;
}

/**
 * When the director can't be parsed, return two distinct voices instead of
 * one — a reflector paired with a challenger where the roster allows —
 * randomized within each role so a flaky director still yields variety.
 */
function fallbackDialogue(roster) {
  if (!Array.isArray(roster) || roster.length === 0) return [];
  const byIds = ids => ids.map(id => roster.find(c => c.id === id)).filter(Boolean);
  const reflectors = byIds(['marcus', 'seneca', 'montaigne', 'future-self']);
  const challengers = byIds(['goggins', 'epictetus', 'roosevelt']);
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  const picks = [];
  const r = rand(reflectors);
  if (r) picks.push(r);
  const c = rand(challengers.filter(x => !r || x.id !== r.id));
  if (c) picks.push(c);
  // Top up to two distinct voices from whatever the roster has.
  for (const cand of roster) {
    if (picks.length >= 2) break;
    if (!picks.some(p => p.id === cand.id)) picks.push(cand);
  }
  return picks.length > 0 ? picks.slice(0, 2) : roster.slice(0, 1);
}

/**
 * Fires one Claude call per counselor as a sequential relay: each counselor
 * sees what colleagues said earlier in the turn and may briefly react to
 * them by name before adding their own view.
 * Returns array of { counselorId, counselorName, response, error }
 */
async function fireParallelCounselors(question, counselors, history, contextChunks, checkInContext, priorResponses, counselorModels = {}, sharedContext = '') {
  const voiceGuard = `\n\nIMPORTANT: You are speaking as yourself only. Never write words for another Cabinet member or imitate their voice. You may briefly react to what a colleague has already said in this turn — agree, sharpen, or push back, addressing them by name — but the response is yours alone.`;

  const lengthGuard = `\n\nLength: You are one voice in a Cabinet of counselors. Keep your response to 2-3 short paragraphs maximum. Be direct. Leave room for the conversation to continue. Do not summarize, do not wrap up, do not deliver a closing thought. Speak and stop.`;

  const toneGuard = `\n\nTone: This is a spoken conversation among people in a room, not an exchange of essays. Use contractions. Address the user directly. Do not restate their question back to them. If one sharp sentence is the best response, give one sharp sentence and stop.`;

  // Shelf catalog: lets every counselor answer truthfully when asked whether
  // a specific work is in the library, beyond the few chunks retrieved above.
  const catalogBlock = await getLibraryCatalogBlock();

  const contextBlock = (contextChunks.length > 0
    ? `\n\n[CONTEXT]\n${contextChunks.map(c => `${c.author ?? ''}, ${c.work ?? 'Corpus'}:\n${c.chunk_text ?? ''}`).join('\n\n---\n\n')}\n[END CONTEXT]`
    : '') + catalogBlock + voiceGuard + lengthGuard + toneGuard + (sharedContext || '');

  const checkInBlock = checkInContext
    ? `\n\n[MORNING CHECK-IN DATA — TREAT AS TENTATIVE]\nThe following was reported by the user's check-in system. This is background context only — do not state these as confirmed facts. Ask before assuming. The user may not have completed all items, or items may be incomplete at the time of this message.\n${checkInContext}\n[END CHECK-IN DATA]`
    : '';

  const safeHistory = Array.isArray(history) ? history.slice(-6) : [];
  const messages = [...safeHistory, { role: 'user', content: question }];

  // Colleague responses from earlier client-driven rounds, if any, seed the relay.
  const seedColleagues = Array.isArray(priorResponses) ? priorResponses : [];

  const timings = {};
  const startAll = Date.now();
  const results = [];

  for (const counselor of counselors) {
    const colleagues = [...seedColleagues, ...results.filter(r => !r.error)];
    const colleaguesBlock = colleagues.length > 0
      ? `\n\n[WHAT YOUR COLLEAGUES SAID]\nThe following counselors have already spoken in this turn. You are speaking after them. Do not repeat their points. You may briefly react to one of them by name — agree, sharpen, or push back in a sentence — then add what only you can add.\n${colleagues.map(r => `${r.counselorName}:\n${r.response}`).join('\n\n')}\n[END COLLEAGUE RESPONSES]`
      : '';

    const model = resolveCounselorModel(counselorModels[counselor.id]);
    const t0 = Date.now();
    try {
      const responseText = await callCounselorModel({
        model,
        system: counselor.systemPrompt + contextBlock + checkInBlock + colleaguesBlock,
        messages,
        maxTokens: 300,
      });
      timings[counselor.id] = `${Date.now() - t0}ms (${model})`;
      if (!responseText || !responseText.trim()) {
        console.warn(`[Cabinet] Empty response from ${counselor.id} (${model}) — provider returned no content`);
      }
      results.push({ counselorId: counselor.id, counselorName: counselor.name, response: responseText, error: null });
    } catch (err) {
      timings[counselor.id] = `${Date.now() - t0}ms (${model}, failed)`;
      console.error(`[Cabinet] ${counselor.id} (${model}) failed: ${err.message}`);
      results.push({
        counselorId: counselor.id,
        counselorName: counselor.name,
        response: `The connection to ${counselor.name} was interrupted. Try again.`,
        error: err.message,
      });
    }
  }

  const totalMs = Date.now() - startAll;
  const timingStr = Object.entries(timings).map(([id, ms]) => `${id}=${ms}`).join(', ');
  console.log(`[Cabinet] Relay inference: ${counselors.length} counselors (sequential), ${totalMs}ms total`);
  console.log(`[Cabinet] Counselor responses: ${timingStr}`);

  return results;
}

// ---------------------------------------------------------------------------
// POST /api/academy/agent — multi-model agent router for Arete Academy
// ---------------------------------------------------------------------------

app.post('/api/academy/agent', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { agent_type, messages, course_id, user_id, course_context, session_id } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing required field: messages (non-empty array)' });
  }

  const { client, model } = agentRouter(agent_type);

  // Build system prompt: agent persona + RAG context + course context
  let persona = AGENT_PERSONAS[agent_type] ?? AGENT_PERSONAS['socratic-proctor'];

  // The six core drill rules are language-neutral and stay unchanged. For the
  // Latin course, append an override block that swaps the target text and the
  // grammatical terminology so the agent speaks Latin grammar, not Greek.
  if (agent_type === 'language-drills' && course_id === 'latn-101') {
    persona += `

[COURSE: LATN 101 — Latin for Philosophers]
The six rules above are unchanged. For this course apply these overrides:
- TARGET TEXT: the goal text is Seneca's Epistulae Morales I.1 ("Ita fac, mi Lucili: vindica te tibi"), NOT Epictetus's Encheiridion. Every "connect this to the target text" moment refers to Seneca.
- GRAMMATICAL TERMINOLOGY (use Latin terms, not Greek ones):
  * Say "ablative" (e.g. ablative of means/manner/agent) — do NOT call instrument constructions "dative of means".
  * Say Latin has "six cases" — not "five cases".
  * For verbs say "conjugation class" (1st–4th conjugation) — do NOT say "declension" for verbs; declension is for nouns/adjectives.
  * Use "gerundive" for Latin obligation constructions (e.g. vindicandum est).
- VOCABULARY DRILLS: connect drilled words to Seneca passages (Epistulae Morales), not to Encheiridion passages.
- MASTERY MOMENTS: when a student masters a form, connect it to a line from Epistulae Morales I.1 (e.g. "vindica te tibi", "tempus quod adhuc auferebatur", "turpissima ... iactura quae per neglegentiam fit").
- For vocabulary, ask for the Latin form + pronunciation + meaning (Latin has explicit pronunciation guides), rather than Greek transliteration.`;
  }

  // PHIL 705 covers formal Stoic logic — the Proctor must evaluate logic
  // exercises with rigor, not soften logical errors with encouragement.
  if (agent_type === 'socratic-proctor' && course_id === 'phil-705') {
    persona += `

This course covers formal Stoic logic — propositional calculus, the five indemonstrables, the lekton, the cognitive impression, and the conditional. When evaluating logic exercises, assess: (1) whether the student has correctly identified the argument form; (2) whether their analysis is valid; (3) whether their answer engages with the Stoic technical vocabulary from the session. Be rigorous — logical errors should be identified precisely, not glossed over with encouragement.`;
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';

  let ragContext = '';
  let retrievedChunks = []; // kept for Phase A outcome logging below

  if (agent_type === 'socratic-proctor') {
    let chunks = [];
    try {
      chunks = await getRelevantChunks(lastUserMessage, 5, {});
    } catch (retrievalErr) {
      console.error('[/api/academy/agent] getRelevantChunks failed, falling back to retrieveCorpusChunks:', retrievalErr.message);
      chunks = await retrieveCorpusChunks(lastUserMessage, course_id);
    }
    retrievedChunks = chunks;
    if (chunks.length > 0) {
      ragContext =
        `\n\n[CONTEXT]\nThe following passages from the course corpus are directly relevant to the student's message. Use them to ground your Socratic questioning in the actual texts — press claims, surface contradictions, and return the question to the student:\n\n` +
        chunks.map((c, i) => `${i + 1}. (${c.source_author ? c.source_author + ', ' : ''}${c.source_title ?? 'Corpus'})\n${c.content}`).join('\n\n') +
        `\n[END CONTEXT]`;
    }
  } else {
    const ragChunks = await retrieveCorpusChunks(lastUserMessage, course_id);
    retrievedChunks = ragChunks;
    if (ragChunks.length > 0) {
      ragContext =
        `\n\n[RELEVANT CORPUS PASSAGES]\nThe following passages from the course corpus are relevant to the current exchange. Ground your response in the actual texts:\n\n` +
        ragChunks.map((c, i) => `${i + 1}. (${c.source_title ?? 'Corpus'})\n${c.content}`).join('\n\n') +
        `\n[END CORPUS PASSAGES]`;
    }
  }

  const courseContext = course_id
    ? `\n\n[Course: ${course_id}]`
    : '';

  // Session-specific grounding passed from the frontend (primary sources,
  // key concepts) so the Proctor stays anchored to the active session.
  const sessionContext = course_context
    ? `\n\n[Session context]\n${course_context}`
    : '';

  const systemPrompt = persona + courseContext + sessionContext + ragContext;

  // Learning-system outcome logging (Phase A). Fire-and-forget.
  const requestId = randomUUID();
  logRetrieval({
    requestId,
    agent: agent_type ?? 'socratic-proctor',
    studentId: user_id,
    sessionId: session_id,
    courseId: course_id,
    queryText: lastUserMessage,
    chunks: retrievedChunks,
    mode: graphBoostEnabled() ? 'graph_boost' : 'vector',
  });

  try {
    let responseText;

    if (client === anthropicClient) {
      // Anthropic path — raw fetch, consistent with rest of this file
      const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
      console.log(`[/api/academy/agent:${agent_type ?? 'socratic-proctor'}] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model}`);
      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          system: systemPrompt,
          messages,
        }),
      });

      if (!apiRes.ok) {
        const errorText = await apiRes.text();
        console.error('Claude API error (academy/agent):', apiRes.status, errorText);
        return res.status(apiRes.status).json({ error: errorText });
      }

      const data = await apiRes.json();
      responseText = data.content?.find(b => b.type === 'text')?.text ?? '';
    } else {
      // OpenAI path — SDK
      const completion = await openai.chat.completions.create({
        model,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      });
      responseText = completion.choices[0]?.message?.content ?? '';
    }

    // Persist exchange to academy_sessions
    if (user_id && course_id && responseText) {
      try {
        const { data: session } = await supabase
          .from('academy_sessions')
          .select('id, messages')
          .eq('user_id', user_id)
          .eq('course_id', course_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastUserMsg = messages[messages.length - 1];
        const newMessages = [
          ...(session?.messages ?? []),
          ...(lastUserMsg ? [lastUserMsg] : []),
          { role: 'assistant', content: responseText, timestamp: Date.now() },
        ];

        if (session?.id) {
          await supabase
            .from('academy_sessions')
            .update({ messages: newMessages, updated_at: new Date().toISOString() })
            .eq('id', session.id);
        } else {
          await supabase
            .from('academy_sessions')
            .insert({ user_id, course_id, agent_type: agent_type ?? 'socratic-proctor', messages: newMessages });
        }
      } catch (dbErr) {
        console.warn('academy_sessions persist error (non-fatal):', dbErr.message);
      }
    }

    // Post-hoc usage attribution (Phase A). Fire-and-forget.
    if (responseText && retrievedChunks.length > 0) {
      attributeUsage({ requestId, chunks: retrievedChunks, responseText });
    }

    return res.json({ content: responseText, model, agent_type: agent_type ?? 'socratic-proctor', request_id: requestId });
  } catch (error) {
    console.error('Failed to reach API (academy/agent):', error);
    return res.status(502).json({ error: 'Failed to reach model API' });
  }
});

// ─── Courtyard: The Stoa ─────────────────────────────────────────────────────

app.post('/api/courtyard/stoa', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { thread_id, thread_title, thread_body, replies, query } = req.body;
  if (!thread_id || !thread_title || !thread_body) {
    return res.status(400).json({ error: 'Missing required fields: thread_id, thread_title, thread_body' });
  }

  // RAG retrieval
  let chunks = [];
  try {
    chunks = await getRelevantChunks(query || `${thread_title} ${thread_body}`, 8);
  } catch (ragErr) {
    console.warn('[/api/courtyard/stoa] RAG failed:', ragErr.message);
  }

  const ragContext = chunks.length > 0
    ? '\n\n[CONTEXT]\n' + chunks.map(c =>
        `[${c.source_author} — ${c.source_title}]\n${c.content}`
      ).join('\n\n') + '\n[END CONTEXT]'
    : '';

  const systemPrompt = `You are The Stoa. You speak only from the Stoic tradition — Marcus Aurelius, Epictetus, Seneca, and their interpreters. You never offer personal opinion. Every claim you make is grounded in the texts. You cite your sources inline using the format (Author, Work, location). You are not a chatbot. You are the voice of a tradition that has been thinking about this question for two thousand years. Be precise. Be brief. End with one question the tradition would ask back.`;

  const threadContext = [
    `Thread: ${thread_title}`,
    `Opening post: ${thread_body}`,
    replies ? `\nReplies so far:\n${replies}` : '',
  ].filter(Boolean).join('\n');

  const userMessage = `${threadContext}${ragContext}\n\nRespond to this thread from the Stoic tradition.`;

  try {
    console.log(`[/api/courtyard/stoa] thread: ${thread_id} | chunks: ${chunks.length}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/courtyard/stoa] Claude error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const reply = data.content?.find(b => b.type === 'text')?.text ?? '';

    // Insert Stoa reply via service role (bypasses RLS)
    if (reply && thread_id) {
      const { error: insertErr } = await supabase.from('courtyard_replies').insert({
        thread_id,
        author_id: null,
        handle: 'The Stoa',
        body: reply,
        is_stoa: true,
        stoa_chunks: chunks.length > 0 ? chunks : null,
      });
      if (insertErr) console.warn('[/api/courtyard/stoa] reply insert error:', insertErr.message);
    }

    return res.json({ reply, chunks });
  } catch (error) {
    console.error('[/api/courtyard/stoa] error:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Courtyard: RAG preview ───────────────────────────────────────────────────

app.post('/api/courtyard/rag-preview', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return res.json({ chunks: [] });
  }

  try {
    const chunks = await getRelevantChunks(query.trim(), 5);
    return res.json({ chunks });
  } catch (err) {
    console.warn('[/api/courtyard/rag-preview] error:', err.message);
    return res.json({ chunks: [] });
  }
});

// ─── Daily Examination: Proctor follow-up ─────────────────────────────────────

app.post('/api/examine/proctor', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  // Require an authenticated student.
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (await enforceMessageLimit(req, res)) return;

  const { responses, sessionId, period } = req.body;
  // responses: [{ prompt, response }, { prompt, response }, { prompt, response }]
  // period: 'morning' | 'evening'
  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'Missing required field: responses' });
  }
  const sessionNum = Number(sessionId);
  if (!Number.isInteger(sessionNum) || sessionNum < 1 || (period !== 'morning' && period !== 'evening')) {
    return res.status(400).json({ error: 'Missing or invalid fields: sessionId, period' });
  }

  // RAG retrieval — student responses inform the corpus context.
  const examQuery = responses.map(r => r.response).join(' ');
  let chunks = [];
  try {
    chunks = await getRelevantChunks(examQuery, 5);
  } catch (ragErr) {
    console.warn('[/api/examine/proctor] RAG failed:', ragErr.message);
  }

  // Learning-system outcome logging (Phase A). Fire-and-forget.
  const requestId = randomUUID();
  logRetrieval({
    requestId,
    agent: 'examine-proctor',
    studentId: user.id,
    sessionId: sessionNum,
    courseId: 'phil-701',
    queryText: examQuery,
    chunks,
    mode: graphBoostEnabled() ? 'graph_boost' : 'vector',
  });

  const systemPrompt = `You are the Socratic Proctor of Arete Academy.
A student has completed their ${period} examination for PHIL 701 Session ${sessionNum}.
You have read their three responses. Your task is to ask ONE follow-up question.

Rules:
- Ask exactly one question. No more.
- Do not evaluate or grade the responses.
- Do not praise or criticize.
- The question should push deeper into something the student said — a tension,
  an assumption, or an undeveloped thought.
- The question should be specific to their actual responses, not generic.
- Socratic register: precise, brief, unsettling in the best sense.
- Maximum 3 sentences. Usually 1-2 is better.

Relevant corpus passages for context:
${chunks.map(c => c.content).join('\n\n')}`;

  const userMessage = responses.map((r, i) =>
    `Question ${i + 1}: ${r.prompt}\nStudent response: ${r.response}`
  ).join('\n\n');

  try {
    console.log(`[/api/examine/proctor] user: ${user.id} | session: ${sessionNum} | period: ${period} | chunks: ${chunks.length}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/examine/proctor] Claude error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const question = data.content?.find(b => b.type === 'text')?.text ?? '';
    if (question && chunks.length > 0) {
      attributeUsage({ requestId, chunks, responseText: question });
    }
    return res.json({ question, request_id: requestId });
  } catch (error) {
    console.error('[/api/examine/proctor] error:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Stoic RAG API ───────────────────────────────────────────────

async function getStoicContext(query, topK = 5, authorFilter = null) {
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query
    })
  });
  const embeddingData = await embeddingResponse.json();
  const queryEmbedding = embeddingData.data[0].embedding;

  const { data: chunks, error } = await supabase.rpc('match_rag_corpus', {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_author: authorFilter || null,
    filter_language: 'english'
  });

  if (error) throw new Error(`RAG retrieval failed: ${error.message}`);
  observatory.recordRetrieval(chunks || [], 'oracle'); // fire-and-forget log
  // Phase B: Hebbian expansion for every getStoicContext caller (no-op
  // unless GRAPH_BOOST=true).
  return (await expandCandidates(chunks || [], topK)).rows;
}

function buildStoicSystemPrompt(chunks) {
  const sourceBlock = chunks.map(c =>
    `[${c.author} — ${c.work}]\n${c.chunk_text}`
  ).join('\n\n---\n\n');

  return `You are a Stoic philosopher and scholar. Ground every response in the retrieved passages below. When you reference a passage, cite the author and work inline (e.g. "As Epictetus writes in the Discourses..."). Do not invent citations. If the passages do not address the question, say so and answer from general Stoic principles.

RETRIEVED PASSAGES:
${sourceBlock}

END PASSAGES`;
}

// POST /ask — simple JSON endpoint
app.post('/ask', async (req, res) => {
  try {
    const { question, author, top_k } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const chunks = await getStoicContext(question, top_k || 5, author || null);
    const systemPrompt = buildStoicSystemPrompt(chunks);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const answer = data.content?.find(b => b.type === 'text')?.text ?? '';
    const sources = chunks.map(c => `${c.author} — ${c.work}`);

    res.json({ answer, sources, chunks_used: chunks.length });
  } catch (err) {
    console.error('/ask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/chat/completions — OpenAI-compatible endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !messages.length) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return res.status(400).json({ error: 'No user message found' });

    const chunks = await getStoicContext(lastUserMessage.content, 5, null);
    const ragSystemPrompt = buildStoicSystemPrompt(chunks);

    const existingSystem = messages.find(m => m.role === 'system');
    const finalSystem = existingSystem
      ? `${existingSystem.content}\n\n${ragSystemPrompt}`
      : ragSystemPrompt;

    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: max_tokens || 1024,
        system: finalSystem,
        messages: userMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text ?? '';

    res.json({
      id: `stoic-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'stoic-rag-1',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      }
    });
  } catch (err) {
    console.error('/v1/chat/completions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/models — OpenAI-compatible model list
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [{
      id: 'stoic-rag-1',
      object: 'model',
      created: 1700000000,
      owned_by: 'arete'
    }]
  });
});

// GET /health — corpus stats
app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rag_corpus')
      .select('author, work')
      .not('embedding', 'is', null);

    if (error) throw error;

    const stats = {};
    data.forEach(row => {
      const key = `${row.author} — ${row.work}`;
      stats[key] = (stats[key] || 0) + 1;
    });

    res.json({
      status: 'ok',
      total_chunks: data.length,
      sources: stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Crash reporting — receives fatal JS errors from the mobile app
// (lib/crashCapture.ts). Reports land in the Railway logs and the last 20
// are kept in memory, readable via GET /api/crash.
// ---------------------------------------------------------------------------
const recentCrashes = [];

app.post('/api/crash', (req, res) => {
  const { message, name, stack, isFatal, at, phase, launchId } = req.body || {};
  const entry = {
    message: String(message || '').slice(0, 2000),
    name: String(name || '').slice(0, 200),
    stack: String(stack || '').slice(0, 8000),
    isFatal: !!isFatal,
    at,
    phase,
    launchId: String(launchId || '').slice(0, 16),
    receivedAt: new Date().toISOString(),
  };
  recentCrashes.unshift(entry);
  if (recentCrashes.length > 200) recentCrashes.length = 200;
  console.error('[CRASH REPORT]', JSON.stringify(entry));

  // Durable copy — the in-memory list dies on every redeploy/restart.
  supabase.from('crash_reports').insert({
    message: entry.message,
    name: entry.name,
    stack: entry.stack,
    is_fatal: entry.isFatal,
    at: entry.at,
    phase: entry.phase,
    launch_id: entry.launchId,
  }).then(({ error }) => {
    if (error) console.error('[CRASH REPORT] supabase insert failed:', error.message);
  });

  res.json({ ok: true });
});

app.get('/api/crash', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('crash_reports')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    // Fall back to the in-memory list if the durable store is unreachable.
    res.json(recentCrashes);
  }
});

// POST /oracle — Stoic Oracle with IP rate limiting
app.post('/oracle', async (req, res) => {
  try {

    // 1. GET CLIENT IP
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = rawIp.split(',')[0].trim();

    // 2. VALIDATE INPUT
    const { question, author, history } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question is required' });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'question must be 500 characters or fewer' });
    }

    // 3. ATOMIC RATE LIMIT UPSERT
    const { data: limitData, error: limitError } = await supabase.rpc(
      'upsert_oracle_rate_limit',
      { p_ip: ip }
    );
    if (limitError) {
      console.error('Rate limit error:', limitError);
      // Fail open — allow query if rate limit check fails
    } else if (limitData > 15) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: "You've reached 15 free queries for today. Come back tomorrow, or begin your formation at Arete Academy.",
        remaining: 0
      });
    }
    const remaining = Math.max(0, 15 - (limitData || 1));

    // 4. RETRIEVE FROM CORPUS (embed + search via getStoicContext)
    const chunks = await getStoicContext(question.trim(), 7, author || null);

    // Learning-system outcome logging (Phase A widening). The Oracle is
    // anonymous (no student_id) so heuristic outcomes don't apply; rows
    // become trainable if/when the UI adds feedback keyed by request_id.
    const requestId = randomUUID();
    logRetrieval({
      requestId,
      agent: 'oracle',
      studentId: null,
      queryText: question.trim(),
      chunks,
      mode: graphBoostEnabled() ? 'graph_boost' : 'vector',
    });

    // 5. BUILD CONTEXT BLOCK — section_label carries the fuller citation
    // (chapter/pages for shelf works; venue — year for paper summaries), so
    // the model can cite where and when, not just who and what.
    const contextBlock = (chunks || [])
      .map(c => `${c.author}, ${c.work}${c.section_label ? ` (${c.section_label})` : ''}:\n${c.chunk_text}`)
      .join('\n\n---\n\n');

    // 7. CLAUDE CALL — build per-author system prompt
    const oraclePrompt = `You are the Stoic Oracle — a unified voice drawing on the wisdom of Marcus Aurelius, Epictetus, Seneca, and the broader Stoic tradition.

You have been given relevant passages from the Stoic corpus. Use them to ground your response. Reference the source naturally (e.g. "Marcus writes in the Meditations..." or "Epictetus reminds us in the Discourses...") — do not quote verbatim at length, but make clear the answer is rooted in the tradition.

Speak with clarity and directness. No flattery, no hedging. The Stoics did not comfort — they clarified. Give the person what they need to think and act well.

Keep responses to 3-5 paragraphs. End with a single short Stoic principle in italics — one sentence the person can carry with them.

Do not mention that you are an AI. Do not break character.`;

    const systemPromptBase =
      author === 'Marcus Aurelius'     ? MARCUS_PROMPT :
      author === 'Epictetus'           ? EPICTETUS_PROMPT :
      author === 'Seneca'              ? SENECA_PROMPT :
      // Montaigne sits in the Symposium too — reuse his Cabinet voice so the
      // sit-with-a-master dialogue sounds like him, grounded on his Essays.
      author === 'Michel de Montaigne'
        ? (CABINET_COUNSELORS.find(c => c.id === 'montaigne')?.systemPrompt || oraclePrompt) :
      oraclePrompt;

    const systemPrompt = `${systemPromptBase}

[STOIC CORPUS — ground your response in these passages]
${contextBlock}
[END CORPUS]`;

    const safeHistory = Array.isArray(history) ? history.slice(-6) : [];

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          ...safeHistory,
          { role: 'user', content: question }
        ]
      })
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude API error:', claudeRes.status, errText);
      return res.status(502).json({ error: 'The Oracle is unavailable. Please try again.' });
    }

    const claudeData = await claudeRes.json();
    const answer = claudeData.content?.[0]?.text || '';

    // 8. DEDUPLICATE SOURCES — sectionLabel/sourceUrl/textType let the UI
    // render a full citation and link paper summaries to the actual PDF
    // instead of the Reading Room (paper summaries are not shelf works).
    const seen = new Set();
    const sources = (chunks || [])
      .filter(c => {
        const key = `${c.author}||${c.work}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(c => ({
        author: c.author,
        work: c.work,
        sectionLabel: c.section_label || null,
        sourceUrl: c.source_url || null,
        textType: c.text_type || null,
      }));

    if (answer && chunks.length > 0) {
      attributeUsage({ requestId, chunks, responseText: answer });
    }
    return res.json({ answer, sources, remaining, request_id: requestId });

  } catch (err) {
    console.error('/oracle error:', err);
    return res.status(500).json({ error: 'The Oracle is silent. Please try again.' });
  }
});

// POST /api/admin/dispatch/generate — run the dispatch generation agent on
// demand (admin only). Lets an admin produce today's dispatch without waiting
// for the 10:00 UTC cron. Idempotent: the agent no-ops if today's already
// exists. Generation only — does NOT send pushes (that's the delivery job).
app.post('/api/admin/dispatch/generate', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    // Pre-flight: runDispatchGeneration() calls process.exit(1) if these are
    // unset. Guard here so a misconfiguration returns 500 instead of killing
    // the always-on web server.
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for dispatch generation' });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: before } = await supabase
      .from('daily_dispatches')
      .select('id')
      .eq('dispatch_date', today)
      .maybeSingle();

    await runDispatchGeneration();

    const { data: dispatch } = await supabase
      .from('daily_dispatches')
      .select('id, dispatch_date, title, teaser, total_recipients')
      .eq('dispatch_date', today)
      .maybeSingle();

    return res.json({
      ok: true,
      alreadyExisted: !!before,
      generated: !before && !!dispatch,
      dispatch: dispatch || null,
    });
  } catch (err) {
    console.error('[/api/admin/dispatch/generate] error:', err.message);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// POST /api/admin/synthesis/generate — run the synthesis agent on demand (admin
// only), generating N documents (default 3) into pending_review. Generating
// several Sonnet documents can exceed a serverless timeout, so this kicks the
// run off in the background and returns immediately; the admin refreshes to see
// the new documents. A module-level flag prevents overlapping runs.
let synthesisRunning = false;
app.post('/api/admin/synthesis/generate', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for synthesis generation' });
    }
    if (synthesisRunning) {
      return res.status(409).json({ error: 'A synthesis run is already in progress' });
    }

    const count = Math.max(1, Math.min(5, parseInt(req.body?.count, 10) || 3));
    synthesisRunning = true;
    runSynthesisAgent({ count })
      .then(r => console.log('[synthesis/generate] complete:', JSON.stringify(r)))
      .catch(e => console.error('[synthesis/generate] run error:', e.message))
      .finally(() => { synthesisRunning = false; });

    return res.json({ ok: true, started: true, count });
  } catch (err) {
    synthesisRunning = false;
    console.error('[/api/admin/synthesis/generate] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start synthesis' });
  }
});

// POST /api/admin/reflection/generate — run the Weekly Self-Reflection agent on
// demand (admin only). The scheduled Railway cron is Sundays 07:00 UTC; this
// lets Kyle produce this week's reflection without waiting. Idempotent: the
// agent upserts on reflection_week, so re-running overwrites the same row.
// Fire-and-return: the reflection reads the whole fleet and calls Claude, which
// takes ~40-60s — longer than the Vercel proxy in front of this endpoint will
// wait, so awaiting it here made the button look like it failed even when the
// run completed. Instead we start the run, return 202 immediately, and let the
// Self-Reflection tab reload once it lands. Idempotent: the agent upserts on
// reflection_week, so re-running overwrites the same row. The latch prevents
// overlapping runs.
let reflectionRunning = false;
app.post('/api/admin/reflection/generate', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    // Self-reflection needs Claude + Supabase only — it does no retrieval, so no OpenAI key.
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for self-reflection' });
    }
    if (reflectionRunning) {
      return res.status(409).json({ error: 'A reflection run is already in progress' });
    }

    reflectionRunning = true;
    runWeeklySelfReflection()
      .then(result => {
        console.log('[/api/admin/reflection/generate] finished:', JSON.stringify(result));
      })
      .catch(err => {
        console.error('[/api/admin/reflection/generate] run failed:', err.message);
      })
      .finally(() => {
        reflectionRunning = false;
      });

    return res.status(202).json({ ok: true, started: true });
  } catch (err) {
    reflectionRunning = false;
    console.error('[/api/admin/reflection/generate] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start reflection' });
  }
});

// POST /api/admin/corpus/run — run RAG corpus ingestion on demand (admin only).
// Drains up to CORPUS_AGENT_BATCH_SIZE pending queue sources right now instead
// of waiting for the nightly 08:00 UTC cron. Fire-and-forget: a batch can embed
// for many minutes, so we start the run and return immediately — the agent
// writes a 'running' row to corpus_ingestion_runs at start, which is what the
// admin panel polls.
let corpusIngestRunning = false;
app.post('/api/admin/corpus/run', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for corpus ingestion' });
    }
    if (corpusIngestRunning) {
      return res.status(409).json({ error: 'An ingestion run is already in progress' });
    }

    corpusIngestRunning = true;
    runCorpusIngestion()
      .then(result => {
        console.log('[/api/admin/corpus/run] finished:', JSON.stringify(result));
      })
      .catch(err => {
        console.error('[/api/admin/corpus/run] run failed:', err.message);
      })
      .finally(() => {
        corpusIngestRunning = false;
      });

    return res.status(202).json({ ok: true, started: true });
  } catch (err) {
    console.error('[/api/admin/corpus/run] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start ingestion' });
  }
});

// POST /api/admin/papers/run — summarize queued scholarly PDFs now (admin
// only). Fire-and-forget like the corpus run: reading and summarizing a PDF
// takes a minute or two per paper, so we start the agent and return 202; rows
// move queued → summarizing → pending_review and the papers panel polls them.
const { processPaperSubmissions } = require('./agents/paper-agent');
let paperAgentRunning = false;
app.post('/api/admin/papers/run', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (paperAgentRunning) {
      return res.status(409).json({ error: 'The paper agent is already running' });
    }

    paperAgentRunning = true;
    processPaperSubmissions()
      .then(result => {
        console.log('[/api/admin/papers/run] finished:', JSON.stringify(result));
      })
      .catch(err => {
        console.error('[/api/admin/papers/run] run failed:', err.message);
      })
      .finally(() => {
        paperAgentRunning = false;
      });

    return res.status(202).json({ ok: true, started: true });
  } catch (err) {
    console.error('[/api/admin/papers/run] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start the paper agent' });
  }
});

// POST /api/admin/journal/run — run the Journal Analysis agent on demand
// (admin only), instead of waiting for the nightly cron. One Claude call per
// active user, so a run can take minutes: fire-and-forget, the panel's
// analyses list shows the new rows. Idempotent per week: the agent upserts on
// (user_id, analysis_week), so re-running overwrites this week's rows.
// The CLAUDE_API_KEY pre-check matters — the agent process.exits without it,
// which must never happen inside the server process.
let journalAnalysisRunning = false;
app.post('/api/admin/journal/run', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for journal analysis' });
    }
    if (journalAnalysisRunning) {
      return res.status(409).json({ error: 'A journal analysis run is already in progress' });
    }

    journalAnalysisRunning = true;
    runJournalAnalysis()
      .then(result => {
        console.log('[/api/admin/journal/run] finished:', JSON.stringify(result));
      })
      .catch(err => {
        console.error('[/api/admin/journal/run] run failed:', err.message);
      })
      .finally(() => {
        journalAnalysisRunning = false;
      });

    return res.status(202).json({ ok: true, started: true });
  } catch (err) {
    console.error('[/api/admin/journal/run] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start journal analysis' });
  }
});

// POST /api/admin/world/generate — run the World Agent on demand (admin only)
// instead of waiting for the Monday 03:30 UTC cron. Awaited (web search + two
// model passes, typically 1-2 minutes; the Vercel proxy allows 300s) so the
// admin World tab gets the run summary back. Idempotent per week: the agent
// upserts on observation_week. The env pre-check matters — the agent
// process.exits on missing keys, which must never happen inside the server.
let worldGenerateRunning = false;
app.post('/api/admin/world/generate', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for the World Agent' });
    }
    if (worldGenerateRunning) {
      return res.status(409).json({ error: 'A world observation run is already in progress' });
    }

    worldGenerateRunning = true;
    try {
      const result = await runWorldAgent();
      return res.json({ ok: true, ...result });
    } finally {
      worldGenerateRunning = false;
    }
  } catch (err) {
    worldGenerateRunning = false;
    console.error('[/api/admin/world/generate] error:', err.message);
    return res.status(500).json({ error: err.message || 'World generation failed' });
  }
});

// POST /api/admin/longitudinal/run — run the Longitudinal User Model agent on
// demand (admin only) instead of waiting for the Monday 04:30 UTC cron.
// Awaited so the admin tab gets the run summary back — { eligible, skipped,
// updated, failures } tells Kyle WHY nothing updated (users need 4+ weeks of
// journal_analysis history to be eligible). Idempotent: one living row per
// user, prior state snapshotted to history first. The env pre-check matters —
// the agent process.exits on missing keys, which must never happen in-process.
let longitudinalRunning = false;
app.post('/api/admin/longitudinal/run', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for the longitudinal model' });
    }
    if (longitudinalRunning) {
      return res.status(409).json({ error: 'A longitudinal model run is already in progress' });
    }

    longitudinalRunning = true;
    try {
      const result = await runLongitudinalUserModel();
      return res.json({ ok: true, ...result });
    } finally {
      longitudinalRunning = false;
    }
  } catch (err) {
    longitudinalRunning = false;
    console.error('[/api/admin/longitudinal/run] error:', err.message);
    return res.status(500).json({ error: err.message || 'Longitudinal run failed' });
  }
});

// The three "thinking chain" agents share one on-demand trigger shape: admin
// gate, env pre-check (each agent process.exits on missing keys — must never
// happen in-process), overlap latch, fire-and-forget 202 (multi-candidate
// model calls can run for minutes; the tabs poll their pending lists).
function makeAgentRunEndpoint(name, latch, runFn) {
  return async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY || !process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: `Server not configured for the ${name} agent` });
      }
      if (latch.running) {
        return res.status(409).json({ error: `A ${name} run is already in progress` });
      }

      latch.running = true;
      runFn()
        .then(result => {
          console.log(`[/api/admin/${name}/run] finished:`, JSON.stringify(result));
        })
        .catch(err => {
          console.error(`[/api/admin/${name}/run] run failed:`, err.message);
        })
        .finally(() => {
          latch.running = false;
        });

      return res.status(202).json({ ok: true, started: true });
    } catch (err) {
      latch.running = false;
      console.error(`[/api/admin/${name}/run] error:`, err.message);
      return res.status(500).json({ error: err.message || `Failed to start the ${name} agent` });
    }
  };
}

// POST /api/admin/tensions/run — hunt tensions now instead of Monday 05:30 UTC.
app.post('/api/admin/tensions/run', makeAgentRunEndpoint('tension', { running: false }, runTensionAgent));

// POST /api/admin/inquiry/run — generate + pursue inquiries now instead of Monday 06:30 UTC.
app.post('/api/admin/inquiry/run', makeAgentRunEndpoint('inquiry', { running: false }, runInquiryAgent));

// POST /api/admin/dreams/run — let the corpus dream now instead of Sunday 23:30 UTC.
app.post('/api/admin/dreams/run', makeAgentRunEndpoint('dreams', { running: false }, runDreamingAgent));

// Consolidation Agent (learning system Phase B): nightly Hebbian update +
// decay over concept_edges. Scheduled Railway cron is daily 07:30 UTC; this
// runs it on demand (admin only).
app.post('/api/admin/consolidation/run', makeAgentRunEndpoint('consolidation', { running: false }, runConsolidationAgent));

// ===========================================================================
// THE LIBRARY OF ARETE — public reading rooms over rag_corpus.
// Stoic-focused, but every primary text is viewable, readable, and discussable.
// All endpoints are public (no auth); the discuss/debate routes share the
// Oracle's 15/day IP rate limit.
// ===========================================================================

// GET /api/library/texts — the shelves: one entry per work, Stoic-flagged.
app.get('/api/library/texts', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('library_shelf');
    if (error) throw error;

    // Admin overrides (library_overrides): retitle, move shelf, set era, or hide
    // a work — layered over the hardcoded defaults in library.js. Keyed by
    // author::work. Best-effort: a failed read just falls back to defaults.
    const ovMap = new Map();
    const { data: ovs } = await supabase.from('library_overrides').select('*');
    for (const o of ovs || []) ovMap.set(`${o.author}::${o.work}`, o);

    const texts = (data || []).map(r => {
      const ov = ovMap.get(`${r.author}::${r.work}`) || {};
      return {
        id: `${r.author}::${r.work}`,
        author: r.author,
        work: r.work,
        title: ov.title || libraryHelpers.workTitle(r.work),
        era: ov.era || libraryHelpers.era(r.author, r.work),
        textType: r.text_type,                                  // 'primary' | 'synthesis' ('paper_summary' filtered below)
        tradition: ov.tradition || libraryHelpers.tradition(r.author, r.text_type), // 'stoic' | 'wider' | 'synthesis'
        passages: Number(r.chunk_count) || 0,
        translator: r.translator || null,
        sourceUrl: r.source_url || null,
        spine: libraryHelpers.spine(r.author),
        excerpt: (r.excerpt || '').trim().replace(/\s+/g, ' ').slice(0, 280),
        hidden: !!ov.hidden,
      };
    // Paper summaries are retrieval-only: counselors quote them, but they are
    // summaries of copyrighted scholarship, not readable works — no shelf.
    }).filter(t => !t.hidden && t.textType !== 'paper_summary');

    // Count of syntheses awaiting admin review (not yet ingested, so not on a
    // shelf). Surfaced only to the admin in the UI as a jump to /admin/synthesis.
    const { count: pendingReview } = await supabase
      .from('synthesis_documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review');

    return res.json({ texts, pendingReview: pendingReview || 0 });
  } catch (err) {
    console.error('[/api/library/texts] error:', err.message);
    return res.status(500).json({ error: 'Failed to load the shelves' });
  }
});

// GET /api/library/text?author=&work=&page= — full readable text, paginated by
// chunk range and stripped of Project Gutenberg front/back matter.
const LIBRARY_PAGE_CHUNKS = 30;
app.get('/api/library/text', async (req, res) => {
  try {
    const author = (req.query.author || '').toString();
    const work = (req.query.work || '').toString();
    const page = Math.max(0, parseInt(req.query.page || '0', 10) || 0);
    if (!author || !work) {
      return res.status(400).json({ error: 'author and work are required' });
    }

    const { count, error: cErr } = await supabase
      .from('rag_corpus')
      .select('id', { count: 'exact', head: true })
      .eq('author', author)
      .eq('work', work);
    if (cErr) throw cErr;

    const total = count || 0;
    if (total === 0) return res.status(404).json({ error: 'Text not found' });
    const totalPages = Math.max(1, Math.ceil(total / LIBRARY_PAGE_CHUNKS));
    if (page >= totalPages) return res.status(404).json({ error: 'Page not found' });
    const from = page * LIBRARY_PAGE_CHUNKS;
    const to = from + LIBRARY_PAGE_CHUNKS - 1;

    // On pages after the first, also fetch the previous page's last chunk: the
    // first chunk shown overlaps its tail (RAG overlap window) and stitchChunks
    // needs it as context to trim the duplicate.
    const fetchFrom = page > 0 ? from - 1 : from;
    const { data: rows, error } = await supabase
      .from('rag_corpus')
      .select('chunk_index, chunk_text, section_label, translator, source_url, text_type')
      .eq('author', author)
      .eq('work', work)
      .order('chunk_index', { ascending: true })
      .range(fetchFrom, to);
    if (error) throw error;
    const context = page > 0 ? (rows && rows[0] && rows[0].chunk_text) || null : null;
    const data = page > 0 ? (rows || []).slice(1) : (rows || []);
    if (data.length === 0) return res.status(404).json({ error: 'Page not found' });

    // Apply the admin override (retitle / shelf / era / hidden). A hidden work
    // is off the public shelf, so it must not be directly readable either.
    const { data: ov } = await supabase
      .from('library_overrides')
      .select('title, tradition, era, hidden')
      .eq('author', author)
      .eq('work', work)
      .maybeSingle();
    if (ov && ov.hidden) return res.status(404).json({ error: 'Text not found' });

    const body = libraryHelpers.formatReadable(libraryHelpers.stripGutenberg(
      libraryHelpers.stitchChunks(data.map(c => c.chunk_text || ''), context)
    ));

    return res.json({
      author,
      work,
      title: (ov && ov.title) || libraryHelpers.workTitle(work),
      era: (ov && ov.era) || libraryHelpers.era(author, work),
      tradition: (ov && ov.tradition) || libraryHelpers.tradition(author, data[0].text_type),
      translator: data[0].translator || null,
      sourceUrl: data[0].source_url || null,
      page,
      totalPages,
      totalPassages: total,
      body,
    });
  } catch (err) {
    console.error('[/api/library/text] error:', err.message);
    return res.status(500).json({ error: 'Failed to open the text' });
  }
});

// POST /api/library/related — "reads itself alongside": semantic neighbors of
// an open text, drawn from a representative passage. Non-critical: failures
// return an empty list rather than erroring the reader.
app.post('/api/library/related', async (req, res) => {
  try {
    const { author, work } = req.body || {};
    if (!author || !work) return res.status(400).json({ error: 'author and work are required' });

    const { data: seed } = await supabase
      .from('rag_corpus')
      .select('chunk_text')
      .eq('author', author)
      .eq('work', work)
      .order('chunk_index', { ascending: true })
      .range(0, 60);

    const candidates = (seed || [])
      .filter(c => c.chunk_text && c.chunk_text.length > 200 && !/project gutenberg/i.test(c.chunk_text));
    const passage = (candidates[candidates.length - 1]?.chunk_text)
      || (seed && seed[0]?.chunk_text)
      || work;

    const chunks = await getStoicContext(passage.slice(0, 800), 14, null);
    const seen = new Set([`${author}||${work}`]);
    const related = [];
    for (const c of chunks || []) {
      const key = `${c.author}||${c.work}`;
      if (seen.has(key)) continue;
      seen.add(key);
      related.push({
        id: `${c.author}::${c.work}`,
        author: c.author,
        work: c.work,
        title: libraryHelpers.workTitle(c.work),
        reason: 'shares a thread with this text',
      });
      if (related.length >= 4) break;
    }
    return res.json({ related });
  } catch (err) {
    console.error('[/api/library/related] error:', err.message);
    return res.json({ related: [] });
  }
});

// POST /api/library/debate — stage a debate: two thinkers contend on a question,
// each grounded in their own author's passages. The corpus surfaces the tension
// and refuses to resolve it. Returns the full exchange; the client reveals it
// turn by turn. Shares the Oracle's IP rate limit.
// Any two of these can take the chairs. `ground` is the rag_corpus author whose
// passages anchor that debater's side (Socrates and Zeno speak through their
// biographers). Every entry must have real corpus coverage — that's why
// Theodore Roosevelt (cabinet counselor, zero corpus texts) is not here yet.
const DEBATE_MASTERS = {
  socrates:  { name: 'Socrates',            ground: 'Xenophon' },
  zeno:      { name: 'Zeno of Citium',      ground: 'Diogenes Laërtius' },
  epictetus: { name: 'Epictetus',           ground: 'Epictetus' },
  marcus:    { name: 'Marcus Aurelius',     ground: 'Marcus Aurelius' },
  seneca:    { name: 'Seneca',              ground: 'Seneca' },
  musonius:  { name: 'Musonius Rufus',      ground: 'Gaius Musonius Rufus' },
  cicero:    { name: 'Cicero',              ground: 'Cicero' },
  plato:     { name: 'Plato',               ground: 'Plato' },
  aristotle: { name: 'Aristotle',           ground: 'Aristotle' },
  plutarch:  { name: 'Plutarch',            ground: 'Plutarch' },
  montaigne: { name: 'Michel de Montaigne', ground: 'Michel de Montaigne' },
  confucius: { name: 'Confucius',           ground: 'Confucius' },
  laozi:     { name: 'Laozi',               ground: 'Laozi' },
  suntzu:    { name: 'Sun Tzu',             ground: 'Sun Tzu' },
};

app.post('/api/library/debate', async (req, res) => {
  try {
    if (!CLAUDE_API_KEY) return res.status(500).json({ error: 'Server not configured' });

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = rawIp.split(',')[0].trim();
    const { data: limitData, error: limitError } = await supabase.rpc('upsert_oracle_rate_limit', { p_ip: ip });
    if (!limitError && limitData > 15) {
      return res.status(429).json({ error: 'Daily limit reached', remaining: 0 });
    }
    const remaining = Math.max(0, 15 - (limitData || 1));

    const { question, a = 'seneca', b = 'epictetus' } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'question must be 500 characters or fewer' });
    }
    const A = DEBATE_MASTERS[a] || DEBATE_MASTERS.seneca;
    const B = DEBATE_MASTERS[b] || DEBATE_MASTERS.epictetus;
    if (A === B) {
      return res.status(400).json({ error: 'A debate needs two different chairs — choose two thinkers.' });
    }

    const [ca, cb] = await Promise.all([
      getStoicContext(question.trim(), 4, A.ground).catch(() => []),
      getStoicContext(question.trim(), 4, B.ground).catch(() => []),
    ]);
    const ctxBlock = (chunks) =>
      (chunks || []).map(c => `[${c.author} — ${c.work}]\n${c.chunk_text}`).join('\n\n---\n\n') || '(no passages retrieved)';

    const system = `You are staging a philosophical debate in the house of Arete between ${A.name} and ${B.name}, on a question put to them.

Rules:
- Produce EXACTLY 6 turns, strictly alternating, beginning with ${A.name} (who="a"), then ${B.name} (who="b"), and so on.
- Each speaker argues in their own historical voice and temperament, grounded in the passages provided for them below. Reference ideas naturally; do not quote at length.
- This is a genuine fault line in the tradition. DO NOT resolve it or force agreement. The final turn and the note should leave the tension standing.
- Keep each turn to 2–4 sentences.
- Respond with ONLY valid JSON, no markdown fences, in exactly this shape:
{"lines":[{"who":"a","text":"..."},{"who":"b","text":"..."}],"note":"one sentence naming the tension the corpus leaves open"}

[${A.name} — grounding passages]
${ctxBlock(ca)}

[${B.name} — grounding passages]
${ctxBlock(cb)}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1100,
        system,
        messages: [{ role: 'user', content: `The question before the house: ${question.trim()}` }],
      }),
    });
    if (!claudeRes.ok) {
      const t = await claudeRes.text();
      console.error('[/api/library/debate] Claude error:', claudeRes.status, t);
      return res.status(502).json({ error: 'The house is silent. Please try again.' });
    }
    const claudeData = await claudeRes.json();
    let raw = claudeData.content?.[0]?.text || '';
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { lines: [], note: '' };
    }

    const lines = (parsed.lines || []).slice(0, 8).map(ln => ({
      who: ln.who === 'b' ? 'b' : 'a',
      speaker: ln.who === 'b' ? B.name : A.name,
      text: String(ln.text || '').trim(),
    })).filter(ln => ln.text);

    return res.json({
      q: question.trim(),
      a, b,
      aName: A.name,
      bName: B.name,
      lines,
      note: String(parsed.note || '').trim(),
      remaining,
    });
  } catch (err) {
    console.error('[/api/library/debate] error:', err.message);
    return res.status(500).json({ error: 'The house could not convene. Please try again.' });
  }
});

// GET /api/library/observatory — the constellation. Concepts the corpus and
// community are actually working through (concept_passage_map), each with its
// real voices, co-occurrence edges (shared authors), the matching synthesis
// (excerpt + divergence pulled from the document), and a "lately the corpus has
// been thinking about" panel from journals, syntheses, and the gap report.
// GET /api/library/observatory/pulse — concepts the corpus has answered from in
// the last few seconds, so the Observatory can flare those stars in near-real
// time. `?since=<ms>` returns only pulses newer than the client's last poll.
app.get('/api/library/observatory/pulse', (req, res) => {
  const since = Number(req.query.since) || 0;
  const now = Date.now();
  const cutoff = now - OBS_PULSE_TTL;
  const names = new Set();
  for (const p of obsPulses) {
    if (p.ts > cutoff && p.ts > since) for (const n of p.concepts) names.add(n);
  }
  res.json({ now, concepts: [...names] });
});

app.get('/api/library/observatory', async (req, res) => {
  try {
    const [{ data: cpm }, { data: synth }, { data: journals }, { data: gapRows }] = await Promise.all([
      supabase.from('concept_passage_map').select('concept, author, chunk_id'),
      supabase.from('synthesis_documents').select('title, concept, content, status, ingested_at'),
      supabase.from('journal_analysis').select('dominant_theme, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('corpus_gap_reports').select('demand_gaps, recommended_additions, report_week').order('report_week', { ascending: false }).limit(1),
    ]);

    // Group passages into CANONICAL concepts (Part 1): raw labels map through
    // concept_aliases and counts aggregate across every merged raw theme.
    // Unmapped raw labels are queued for lazy resolution and never shown raw.
    const aliases = await canonicalConcepts.getAliasMap().catch(() => new Map());
    const unmappedLabels = new Set();
    const byConcept = new Map(); // canonical id -> { name, authors, passages, raws }
    for (const r of cpm || []) {
      if (!r.concept) continue;
      const hit = aliases.get(r.concept);
      if (!hit) { unmappedLabels.add(r.concept); continue; }
      let g = byConcept.get(hit.id);
      if (!g) { g = { name: hit.name, authors: new Set(), passages: 0, raws: new Set() }; byConcept.set(hit.id, g); }
      g.passages++;
      g.raws.add(r.concept);
      if (r.author) g.authors.add(r.author);
    }

    const conceptList = [...byConcept.entries()].map(([id, g]) => {
      const voices = [...g.authors].sort();
      const magnitude = voices.length >= 5 ? 3 : voices.length >= 3 ? 2 : 1;
      return { id, name: g.name, voices, passages: g.passages, magnitude, raws: [...g.raws] };
    }).sort((a, b) => b.magnitude - a.magnitude || b.voices.length - a.voices.length);

    // Attach the matching synthesis document: canonical hit first (a synthesis
    // whose raw concept aliases to this star), else keyword overlap against
    // the canonical name plus its merged raw labels.
    const words = s => (s || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    const matchSynth = (c) => {
      const viaAlias = (synth || []).find(s => {
        const hit = s.concept ? aliases.get(s.concept) : null;
        return hit && hit.id === c.id;
      });
      if (viaAlias) return viaAlias;
      const nw = new Set([...words(c.name), ...c.raws.flatMap(rl => words(rl))]);
      let best = null, bestScore = 0;
      for (const s of synth || []) {
        const score = words(s.concept).filter(w => nw.has(w)).length;
        if (score > bestScore) { bestScore = score; best = s; }
      }
      return bestScore >= 2 ? best : null;
    };
    const extractSynth = (s) => {
      if (!s) return null;
      const body = (s.content || '').replace(/\r/g, '').trim();
      const title = (s.title || body.split('\n')[0] || '').replace(/^#+\s*/, '').trim();
      const paras = body.split(/\n\n+/).map(p => p.replace(/^#+\s*/, '').trim()).filter(p => p.length > 80);
      const excerptPara = paras.find(p => !title.includes(p.slice(0, 40))) || paras[0] || '';
      const sentences = body.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/);
      const div = sentences.find(x => /\b(tension|diverge|differ|disagree|contend|at odds|fault line|pull apart)\b/i.test(x));
      return {
        title,
        status: s.status,
        excerpt: excerptPara.slice(0, 320),
        divergence: div ? div.trim().slice(0, 280) : null,
      };
    };
    // Per-concept "activity" (0..1) drives how fast/bright each star breathes:
    // recent synthesis ingestion decays over weeks, and concepts the community
    // has been journaling about get a boost. A weight-based floor keeps even
    // quiet stars faintly alive. Concepts touched in the last ~14 days are also
    // flagged fresh, so the edges between them fire brighter.
    const nowMs = Date.now();
    const WEEK_MS = 7 * 24 * 3600 * 1000;
    const FRESH_MS = 14 * 24 * 3600 * 1000;
    const recentThemeWords = new Set();
    for (const j of journals || []) for (const w of words(j.dominant_theme)) recentThemeWords.add(w);
    const freshConceptIds = new Set();
    const activityFor = (c, matched) => {
      let a = c.magnitude >= 3 ? 0.22 : c.magnitude === 2 ? 0.14 : 0.08;
      const ingestedAt = matched && matched.ingested_at ? new Date(matched.ingested_at).getTime() : 0;
      if (ingestedAt) {
        const ageWeeks = Math.max(0, (nowMs - ingestedAt) / WEEK_MS);
        a = Math.max(a, Math.exp(-ageWeeks / 3));
        if (nowMs - ingestedAt < FRESH_MS) freshConceptIds.add(c.id);
      }
      // The raw labels ARE the recent journal phrasings — match against them
      // as well as the canonical name so the activity boost still lands.
      if ([...words(c.name), ...c.raws.flatMap(rl => words(rl))].some(w => recentThemeWords.has(w))) a = a + 0.3;
      return Math.max(0, Math.min(1, a));
    };
    const concepts = conceptList.map(c => {
      const matched = matchSynth(c);
      const { raws, ...pub } = c;
      return { ...pub, synthesis: extractSynth(matched), activity: activityFor(c, matched) };
    });

    // Edges: concepts that share at least 3 voices (where thinkers answer one another).
    const edges = [];
    for (let i = 0; i < conceptList.length; i++) {
      for (let j = i + 1; j < conceptList.length; j++) {
        const a = byConcept.get(conceptList[i].id).authors;
        const b = byConcept.get(conceptList[j].id).authors;
        let shared = 0;
        for (const x of a) if (b.has(x)) shared++;
        if (shared >= 3) edges.push({ a: conceptList[i].id, b: conceptList[j].id, shared });
      }
    }
    edges.sort((x, y) => y.shared - x.shared);
    const topEdges = edges.slice(0, 18).map(e => [e.a, e.b]);
    // Edges touching a freshly-ingested concept fire brighter in the sky.
    const freshEdges = topEdges.filter(([a, b]) => freshConceptIds.has(a) || freshConceptIds.has(b));

    // Learned edges (Phase B): Hebbian chunk edges from concept_edges,
    // aggregated up to the sky's concept stars — chunk → its author → that
    // author's concepts, with the strongest contributing chunk edge setting
    // the concept pair's weight. Weight drives line thickness client-side.
    let learnedEdges = [];
    try {
      const { data: hebb } = await supabase
        .from('concept_edges')
        .select('chunk_a, chunk_b, weight')
        .gte('weight', 0.3)
        .order('weight', { ascending: false })
        .limit(200);
      if (hebb && hebb.length > 0) {
        const chunkIds = [...new Set(hebb.flatMap(e => [e.chunk_a, e.chunk_b]))];
        const authorById = new Map();
        for (let i = 0; i < chunkIds.length; i += 200) {
          const { data: chunkRows } = await supabase
            .from('rag_corpus').select('id, author').in('id', chunkIds.slice(i, i + 200));
          for (const c of chunkRows ?? []) if (c.author) authorById.set(c.id, c.author);
        }
        // Chunk → concept stars. Prefer the DIRECT passage mapping
        // (concept_passage_map.chunk_id); fall back to the author's whole
        // concept set only when the chunk was never mapped, dampened by the
        // fan-out so one diffuse edge cannot flood the sky.
        const chunkConcepts = new Map(); // chunk_id -> Set<concept id>
        for (const r of cpm || []) {
          if (!r.chunk_id || !r.concept) continue;
          const hit = aliases.get(r.concept);
          if (!hit) continue;
          if (!chunkConcepts.has(r.chunk_id)) chunkConcepts.set(r.chunk_id, new Set());
          chunkConcepts.get(r.chunk_id).add(hit.id);
        }
        const authorConcepts = new Map(); // lower author -> Set<concept id>
        for (const [cid, g] of byConcept) {
          for (const a of g.authors) {
            const key = a.toLowerCase();
            if (!authorConcepts.has(key)) authorConcepts.set(key, new Set());
            authorConcepts.get(key).add(cid);
          }
        }
        const conceptsFor = (chunkId) => {
          const direct = chunkConcepts.get(chunkId);
          if (direct && direct.size > 0) return { set: direct, direct: true };
          const viaAuthor = authorConcepts.get((authorById.get(chunkId) || '').toLowerCase());
          return { set: viaAuthor ?? new Set(), direct: false };
        };
        const pairWeight = new Map();
        for (const e of hebb) {
          const ca = conceptsFor(e.chunk_a);
          const cb = conceptsFor(e.chunk_b);
          if (ca.set.size === 0 || cb.set.size === 0) continue;
          const dampen = ca.direct && cb.direct
            ? 1
            : 1 / Math.sqrt(Math.max(1, ca.set.size * cb.set.size));
          for (const x of ca.set) for (const y of cb.set) {
            if (x === y) continue;
            const key = x < y ? `${x}|${y}` : `${y}|${x}`;
            const w = e.weight * dampen;
            if (w > (pairWeight.get(key) ?? 0)) pairWeight.set(key, w);
          }
        }
        learnedEdges = [...pairWeight.entries()]
          .sort((p, q) => q[1] - p[1]).slice(0, 12)
          .map(([key, w]) => { const [a, b] = key.split('|'); return [a, b, Math.round(w * 100) / 100]; });
      }
    } catch (learnErr) {
      console.warn('[/api/library/observatory] learned edges failed:', learnErr.message);
    }

    // "Lately the corpus has been thinking about" — journal themes are user
    // phrasing, so only their CANONICAL names ever surface; unmapped themes
    // are queued for resolution and skipped.
    const seen = new Set();
    const mostAsked = [];
    for (const j of journals || []) {
      const t = (j.dominant_theme || '').trim();
      if (!t) continue;
      const hit = aliases.get(t);
      if (!hit) { unmappedLabels.add(t); continue; }
      if (seen.has(hit.name.toLowerCase())) continue;
      seen.add(hit.name.toLowerCase());
      mostAsked.push(hit.name);
      if (mostAsked.length >= 4) break;
    }
    const cleanTitle = t => (t || '').replace(/^#+\s*/, '').trim();
    const tensions = (synth || []).filter(s => s.status === 'pending_review')
      .map(s => ({ title: cleanTitle(s.title), concept: s.concept }));
    const newIngests = (synth || []).filter(s => s.status === 'ingested')
      .sort((a, b) => new Date(b.ingested_at || 0) - new Date(a.ingested_at || 0))
      .slice(0, 2).map(s => ({ title: cleanTitle(s.title), concept: s.concept }));
    const gap = (gapRows || [])[0];
    const gaps = [];
    if (gap) {
      // Demand-gap themes are journal-derived user phrasing too — canonical
      // names only, same rule as mostAsked.
      for (const d of (gap.demand_gaps || []).slice(0, 4)) {
        if (!d.theme) continue;
        const hit = aliases.get(d.theme);
        if (!hit) { unmappedLabels.add(d.theme); continue; }
        if (gaps.length < 2) gaps.push(`Thin coverage on “${hit.name}”`);
      }
      for (const r of (gap.recommended_additions || []).slice(0, 2)) if (r.author && r.work) gaps.push(`Wants ${r.author} — ${r.work}`);
    }

    // Anything raw that reached this endpoint unmapped gets resolved in the
    // background — it joins the sky (canonically named) on a later build.
    canonicalConcepts.resolveConceptsLazily([...unmappedLabels]);

    return res.json({ concepts, edges: topEdges, freshEdges, learnedEdges, recent: { mostAsked, tensions, newIngests, gaps } });
  } catch (err) {
    console.error('[/api/library/observatory] error:', err.message);
    return res.status(500).json({ error: 'The sky could not be charted' });
  }
});

// GET /api/observatory/inquiries — the Inquiry Agent's approved, publicly
// surfaced open questions for the Observatory sidebar. Only inquiries Kyle has
// approved AND marked observatory_visible are ever returned; most recent 3.
// Public (no auth) — same posture as the other Observatory endpoints.
app.get('/api/observatory/inquiries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('open_inquiries')
      .select('id, question, confidence, source_authors, pursuit_passages, inquiry_week')
      .eq('status', 'approved')
      .eq('observatory_visible', true)
      .order('reviewed_at', { ascending: false })
      .limit(3);
    if (error) throw error;

    const inquiries = (data || []).map(r => {
      // "Pursued across N authors" — prefer the breadth of the pursuit itself,
      // falling back to the seed authors when pursuit passages weren't stored.
      const pursuitAuthors = Array.isArray(r.pursuit_passages)
        ? new Set(r.pursuit_passages.map(p => p && p.author).filter(Boolean)).size
        : 0;
      const authorCount = pursuitAuthors || (r.source_authors || []).length;
      return {
        id: r.id,
        question: r.question,
        confidence: r.confidence,
        authorCount,
        week: r.inquiry_week,
      };
    });

    return res.json({ inquiries });
  } catch (err) {
    console.error('[/api/observatory/inquiries] error:', err.message);
    return res.status(500).json({ error: 'The open inquiries could not be read' });
  }
});

// GET /api/observatory/tensions — the Tension Agent's approved, publicly
// surfaced philosophical contradictions for the Observatory sidebar. Only
// tensions Kyle has approved AND marked observatory_visible are ever returned;
// most recent 4. (The synthesis-sourced "awaiting review" tension cards in
// /api/library/observatory remain separate — these are the approved catalogue.)
// Public (no auth) — same posture as the other Observatory endpoints.
app.get('/api/observatory/tensions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('philosophical_tensions')
      .select('id, title, tension_statement, position_a, position_b, source_authors, tension_week')
      .eq('status', 'approved')
      .eq('observatory_visible', true)
      .order('reviewed_at', { ascending: false })
      .limit(4);
    if (error) throw error;

    const tensions = (data || []).map(r => {
      // First sentence of the statement only — the sidebar names the tension,
      // it does not argue it.
      const firstSentence = (r.tension_statement || '').split(/(?<=[.!?])\s+/)[0] || '';
      const authors = [
        r.position_a?.author,
        r.position_b?.author,
      ].filter(Boolean);
      return {
        id: r.id,
        title: r.title,
        firstSentence,
        authors: authors.length >= 2 ? authors : (r.source_authors || []).slice(0, 2),
        week: r.tension_week,
      };
    });

    return res.json({ tensions });
  } catch (err) {
    console.error('[/api/observatory/tensions] error:', err.message);
    return res.status(500).json({ error: 'The open tensions could not be read' });
  }
});

// GET /api/observatory/world — the World Agent's approved response to the
// outside world for the Observatory sidebar ("The corpus is responding to").
// Only observations Kyle has approved (or that auto-approved as purely
// scientific) AND marked observatory_visible are ever returned; most recent 1.
// Public (no auth) — same posture as the other Observatory endpoints.
app.get('/api/observatory/world', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('world_observations')
      .select('id, observation_week, dominant_signal, world_corpus_tension, relevant_authors')
      .in('status', ['approved', 'auto_approved'])
      .eq('observatory_visible', true)
      .order('observation_week', { ascending: false })
      .limit(1);
    if (error) throw error;

    const row = (data || [])[0];
    if (!row) return res.json({ world: null });

    return res.json({
      world: {
        id: row.id,
        dominantSignal: row.dominant_signal,
        tension: row.world_corpus_tension,
        authors: row.relevant_authors || [],
        week: row.observation_week,
      },
    });
  } catch (err) {
    console.error('[/api/observatory/world] error:', err.message);
    return res.status(500).json({ error: 'The world response could not be read' });
  }
});

// GET /api/observatory/dreams — the Dreaming Agent's approved, publicly
// surfaced conjecture for the Observatory, under "The Corpus Imagines".
// Only dreams Kyle has approved or starred AND marked observatory_visible
// are ever returned. The label is load-bearing: a dream is corpus
// conjecture — a thought FROM the corpus — never a source text and never
// the words of any historical thinker. Dreams are never in rag_corpus;
// this endpoint is the only place their text reaches readers.
// Default: most recent 2, long forms truncated (the sidebar teaser).
// ?all=1: the dream ledger — every visible dream with its FULL text,
// starred first (the reviewer's mark, not a ranking), then newest.
// Public (no auth) — same posture as the other Observatory endpoints.
app.get('/api/observatory/dreams', async (req, res) => {
  try {
    const wantAll = req.query.all === '1';
    let query = supabase
      .from('corpus_dreams')
      .select('id, dream_type, title, content, seed_authors, seed_summary, status, dream_week')
      .in('status', ['approved', 'starred'])
      .eq('observatory_visible', true)
      .order('reviewed_at', { ascending: false });
    if (!wantAll) query = query.limit(2);
    const { data, error } = await query;
    if (error) throw error;

    if (wantAll) {
      // Full text always; starred lead, newest first within each group
      // (the base ordering is by reviewed_at desc and this sort is stable).
      const dreams = (data || [])
        .sort((a, b) => (b.status === 'starred' ? 1 : 0) - (a.status === 'starred' ? 1 : 0))
        .map(r => ({
          id: r.id,
          dreamType: r.dream_type,
          title: r.title,
          content: r.content,
          seedAuthors: r.seed_authors || [],
          seedSummary: r.seed_summary || null,
          starred: r.status === 'starred',
          dreamWeek: r.dream_week || null,
        }));
      return res.json({ dreams });
    }

    const dreams = (data || []).map(r => {
      // Aphorisms and propositions are short enough to show whole; thought
      // experiments and meditations show title + first line only.
      const short = r.dream_type === 'aphorism' || r.dream_type === 'proposition';
      const firstLine = (r.content || '').split(/\n+/)[0].split(/(?<=[.!?])\s+/)[0] || '';
      return {
        id: r.id,
        dreamType: r.dream_type,
        title: r.title,
        content: short ? r.content : null,
        firstLine: short ? null : firstLine,
        seedAuthors: r.seed_authors || [],
      };
    });

    return res.json({ dreams });
  } catch (err) {
    console.error('[/api/observatory/dreams] error:', err.message);
    return res.status(500).json({ error: 'The dreams could not be read' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (CLAUDE_API_KEY) {
    console.log('CLAUDE_API_KEY is configured');
  } else {
    console.warn('WARNING: CLAUDE_API_KEY is not set');
  }
});
