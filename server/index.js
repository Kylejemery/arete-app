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
const { expandCandidates, retrievalMode } = require('./lib/graph-boost');
const { counselorRetrievalParams, isCounselorVisible, modernFenceParams, passesModernFence } = require('./lib/corpus-fence');
const { FREE_COUNSELOR_SLUGS, isFreeCounselorSlug } = require('./lib/free-counselors');
const { createEventLog } = require('./lib/events');
const { randomUUID } = require('crypto');
const libraryHelpers = require('./library');

// The corpus's knowledge of itself — appended to every user-facing chat's
// system prompt so any counselor can answer questions ABOUT Arete (the corpus,
// the tensions, "what do you dream," the background agents) accurately and in
// voice. Descriptive, not live; see server/lib/self-knowledge.js.
const { SELF_KNOWLEDGE } = require('./lib/self-knowledge');

// Observatory Living Sky — all new /api/observatory/* routes live in their own
// module to keep the merge surface of this shared file minimal. recordRetrieval
// is the fire-and-forget retrieval-event logger the retrieval paths below call.
const observatory = require('./routes/observatory');

// Read-only MCP server over rag_corpus for external agents (the Moltbook
// agent). Token-gated; disabled until ARETE_MCP_TOKEN is set.
const corpusMcp = require('./routes/corpus-mcp');
const agora = require('./routes/agora');

// The Enchiridion: a member's own handbook, compiled from their writing and
// printed on request. Member offer/request routes for the app and the admin
// roster/generate/review routes for the admin tab; the manuscript is built in
// enchiridion-agent.js. Wired with init() below, after the auth helpers.
const enchiridion = require('./routes/enchiridion');

// Canonical concept layer (Observatory repair Part 1) — every raw theme label
// maps through concept_aliases to one canonical concept; the Observatory only
// ever speaks canonical names. Unmapped labels resolve lazily and are never
// shown raw.
const canonicalConcepts = require('./lib/canonical-concepts');
const { runDispatchGeneration } = require('./dispatch-generation-agent');
// Counselor Broadcast delivery
// Railway cron: 0 * * * * (every hour, its own service, `node
// broadcast-delivery-agent.js`); Kyle adds the cron manually.
// A broadcast is a message written by hand in the admin Broadcasts tab and
// sent from a counselor to the membership. Unlike every other agent here it
// generates nothing — it delivers. The push is only the nudge; the message
// itself is the post the app collects from GET /api/broadcasts/pending below
// and seeds into the member's Cabinet thread, which is why a member with no
// notification permission still receives it. This require also backs the
// on-demand admin trigger POST /api/admin/broadcasts/deliver.
const { runBroadcastDelivery } = require('./broadcast-delivery-agent');
const {
  DEFAULT_TIMEZONE: BROADCAST_DEFAULT_TIMEZONE,
  isDue: isBroadcastDue,
  resolveSpeaker: resolveBroadcastSpeaker,
  loadCounselorNames,
} = require('./lib/broadcasts');
const { runSynthesisAgent } = require('./synthesis-agent');

// Weekly Self-Reflection Agent
// Railway cron: 0 7 * * 0 (Sundays 07:00 UTC)
// Runs after a full week of agent data accumulates. Kyle adds the Railway cron
// service manually; this require also backs the on-demand admin trigger below.
const { runWeeklySelfReflection } = require('./weekly-self-reflection-agent');

// Nightly Quality Audit Agent
// Railway cron: 0 9 * * * (09:00 UTC, after the 08:00 corpus ingest)
// Audits what is already in the system rather than growing it. The repo probes
// skip in this process — a Railway service rooted at server/ has no checkout —
// so the on-demand trigger below covers corpus, library and material only.
// See server/QUALITY_AUDIT_AGENT.md.
const { runQualityAudit } = require('./quality-audit-agent');

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
// Railway cron: 30 9 * * 1 (Mondays 09:30 UTC — 30min after Journal Analysis,
// which runs daily at 09:00. The earlier 04:30 slot ran *before* that morning's
// analysis landed, so every portrait was built a week stale.)
// Builds a persistent philosophical portrait per user from accumulated
// journal_analysis data (server/longitudinal-user-model.js). Runs as its own
// Railway cron service (`node longitudinal-user-model.js`); Kyle adds the cron
// manually. Its output feeds getLongitudinalContext() below, which injects each
// user's portrait into their Cabinet counselors' system prompts. This require
// also backs the on-demand admin trigger POST /api/admin/longitudinal/run.
const { runLongitudinalUserModel } = require('./longitudinal-user-model');

// Interlocutor Writing Profile Agent — derives one writing_profile row per
// student from their critique_history, so the Interlocutor can name patterns
// across pieces rather than judging each cold (server/interlocutor-profile.js).
// Its own Railway cron service (`node interlocutor-profile.js`), swept daily but
// content-gated: a user is re-derived only when they have new critiques since
// their last derivation. Backs the on-demand admin trigger
// POST /api/admin/interlocutor-profile/run.
const { runInterlocutorProfile } = require('./interlocutor-profile');

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

// Convergence Agent — the fork of Inquiry that runs the other direction. Where
// Inquiry finds the question the corpus cannot answer, Convergence finds the
// answer the corpus already contains but has never assembled: passages far
// apart in embedding space, held together, yielding the one conclusion (the
// sumperasma) that follows from all and is stated in none. Supplies validity
// and novelty; never significance (the human review gate does that).
// Railway cron: intended 30 6 * * 1 (Mondays 06:30 UTC — beside Inquiry), but
// the cron is deferred pending the Self-Reflection Sunday/Monday decision.
// STRICT GATE: nothing surfaces without human review. Output is never ingested
// into rag_corpus. Approved/starred convergences may seed Synthesis and surface
// via the Observatory under "The Corpus Concludes".
// This require backs the on-demand admin trigger POST /api/admin/convergence/run.
const { runConvergenceAgent } = require('./agents/convergence-agent');
const { runStoicReplyAgent } = require('./agents/stoic-reply-agent');

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

// ---------------------------------------------------------------------------
// Tier → model ladder. The subscription tier caps which model a chat runs on,
// regardless of what the client requests — model choice is a paid feature and
// per-message cost must scale with revenue (free Opus was ~3-4¢/message):
//   free    → Haiku only
//   premium → Sonnet by default; Haiku selectable
//   pro     → full picker (Opus default, GPT/Gemini/Grok honored)
// ---------------------------------------------------------------------------
const HAIKU_MODEL = 'claude-haiku-4-5';
const PREMIUM_MODEL = 'claude-sonnet-4-6';

function resolveModelForTier(tier, requested) {
  if (tier === 'pro') {
    return requested === HAIKU_MODEL ? HAIKU_MODEL : resolveCounselorModel(requested);
  }
  if (tier === 'premium') {
    return requested === HAIKU_MODEL ? HAIKU_MODEL : PREMIUM_MODEL;
  }
  return HAIKU_MODEL;
}

// Split an enriched system prompt into cacheable + volatile blocks for the
// Anthropic API. The static block (persona, profile, self-knowledge) is
// byte-identical across turns of a conversation, so cache_control makes
// repeat reads ~10% of full input price. Volatile content (timestamps, RAG
// retrievals, observatory pulse) must come after the breakpoint.
function buildSystemBlocks(staticText, volatileText) {
  const blocks = [{ type: 'text', text: staticText, cache_control: { type: 'ephemeral' } }];
  if (volatileText) blocks.push({ type: 'text', text: volatileText });
  return blocks;
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
  const choice = completion.choices?.[0];
  // finish_reason 'length' is the OpenAI-compat spelling of Anthropic's
  // stop_reason 'max_tokens'. Normalized here so callers check one value.
  return {
    text: choice?.message?.content ?? '',
    stopReason: choice?.finish_reason === 'length' ? 'max_tokens' : (choice?.finish_reason ?? null),
  };
}

// Floor for /api/chat, whose callers pass their own ceiling.
const CHAT_MIN_MAX_TOKENS = 1500;

/**
 * A reply that stops because it hit its token ceiling ends mid-word, and the
 * Cabinet persists whatever comes back — a guillotined sentence becomes
 * permanent conversation history that no later turn can repair. Cut back to
 * the last completed sentence so a severed reply at least reads as finished.
 *
 * Left unchanged when there is no sentence boundary to fall back to (one long
 * unbroken sentence), because half a thought still beats none. Either way the
 * warning is logged: a ceiling that is being hit regularly is the real bug,
 * and this only keeps it from reaching the user as a broken sentence.
 */
function finishTruncatedReply(text, stopReason, label) {
  if (stopReason !== 'max_tokens' || typeof text !== 'string' || !text.trim()) return text;
  const trimmed = text.trimEnd();
  // The last sentence end: closing punctuation, any closing quote or bracket,
  // then whitespace or the end of the text. The lookahead is what keeps the
  // cut off the decimal point in "3.5" and off "Dr." mid-sentence.
  const kept = (trimmed.match(/^[\s\S]*[.!?]["'\u2019\u201d)\]]*(?=\s|$)/) || [''])[0];
  console.warn(
    `[Truncation] ${label} hit max_tokens at ${trimmed.length} chars: ` +
    (kept ? `trimmed ${trimmed.length - kept.length} trailing chars` : 'no sentence boundary, left as is')
  );
  return kept || text;
}

/**
 * Same repair as finishTruncatedReply, applied in place to an Anthropic
 * response body on the paths that forward it to the client untouched.
 */
function repairTruncatedContent(data, label) {
  if (data?.stop_reason !== 'max_tokens' || !Array.isArray(data.content)) return;
  const last = [...data.content].reverse().find(b => b.type === 'text' && typeof b.text === 'string');
  if (last) last.text = finishTruncatedReply(last.text, 'max_tokens', label);
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
  return {
    text: (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('') || '',
    stopReason: data.stop_reason ?? null,
  };
}

// Sentinel used in agentRouter to identify Anthropic-backed agents.
// Anthropic calls use raw fetch throughout this file (no SDK).
const anthropicClient = { provider: 'anthropic' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Product event log (retention plan R0): product_events writes, and the
// hourly last_active_at stamp. Nothing in it can throw into a request.
const eventLog = createEventLog(supabase);

// One gate_hit row per request the server refuses for tier or quota reasons,
// on every platform, so gate reach can be measured without trusting clients.
function logGateHit(req, userId, source, reason, extra = {}) {
  eventLog.logEvent(
    userId,
    'gate_hit',
    // origin tells these rows from the client's own gate_hit, logged when the
    // user actually sees the limit card (web DailyLimitCard).
    { source, reason, route: req.path, blocked: true, origin: 'server', ...extra },
    { platform: eventLog.platformFromRequest(req) }
  );
}

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
        // Editorial apparatus is not a source a counselor may claim to hold.
        if (!isCounselorVisible(r)) return null;
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
// Observatory pulse — live state of what the corpus is working through
// ---------------------------------------------------------------------------
// The self-knowledge block is descriptive ("what the Observatory shows"); this
// adds the current figures ("4 tensions on display right now, including …") so
// a counselor can answer "what is the corpus working through at the moment?"
// with the same live catalogue the Observatory renders. Same source of truth
// as the /api/observatory/* endpoints (approved AND observatory_visible only).
// The underlying agents update at most weekly, so a 30-minute in-memory cache
// makes this effectively free per message; on any error we degrade to the
// static description rather than fail the chat.

let observatoryPulseCache = { block: '', at: 0 };
const OBSERVATORY_PULSE_TTL_MS = 30 * 60 * 1000;

// First sentence / clause of a longer field — a count block names things, it
// does not argue them.
const firstClause = (s) => ((s || '').split(/(?<=[.!?])\s+/)[0] || '').trim();

async function getObservatoryPulseBlock() {
  if (Date.now() - observatoryPulseCache.at < OBSERVATORY_PULSE_TTL_MS) {
    return observatoryPulseCache.block;
  }
  try {
    const [tensionsR, inquiriesR, dreamsR, worldR] = await Promise.all([
      supabase.from('philosophical_tensions').select('title')
        .eq('status', 'approved').eq('observatory_visible', true),
      supabase.from('open_inquiries').select('question')
        .eq('status', 'approved').eq('observatory_visible', true),
      supabase.from('corpus_dreams').select('id')
        .in('status', ['approved', 'starred']).eq('observatory_visible', true),
      supabase.from('world_observations').select('dominant_signal')
        .in('status', ['approved', 'auto_approved']).eq('observatory_visible', true)
        .order('observation_week', { ascending: false }).limit(1),
    ]);

    const tensions = tensionsR.data || [];
    const inquiries = inquiriesR.data || [];
    const dreamCount = (dreamsR.data || []).length;
    const worldSignal = firstClause(worldR.data?.[0]?.dominant_signal);

    const lines = [];
    if (tensions.length) {
      const names = tensions.slice(0, 3).map(t => `"${t.title}"`).join(', ');
      lines.push(`- Open tensions on display in the Observatory: ${tensions.length}${names ? ` — including ${names}` : ''}.`);
    }
    if (inquiries.length) {
      const q = firstClause(inquiries[0].question);
      lines.push(`- Open inquiries the corpus is pursuing: ${inquiries.length}${q ? ` — such as "${q}"` : ''}.`);
    }
    if (dreamCount) {
      lines.push(`- Dreams the corpus is currently keeping (labelled conjecture, never source text): ${dreamCount}.`);
    }
    if (worldSignal) {
      lines.push(`- What the World Agent is currently responding to from outside: ${worldSignal}.`);
    }

    // Nothing approved-and-visible yet: emit no block, so the chat leans on the
    // static description rather than announcing an empty sky.
    const block = lines.length === 0 ? '' : `

[OBSERVATORY — LIVE RIGHT NOW]
This is the current, live state of what the corpus is working through, as shown in the Observatory. These figures shift as the background agents run (mostly weekly); cite them only when a person asks what the corpus is working through at the moment, and point them to the Observatory for the full, live view.
${lines.join('\n')}
[END OBSERVATORY LIVE]`;

    observatoryPulseCache = { block, at: Date.now() };
    return block;
  } catch (err) {
    console.error('[Observatory pulse] load failed:', err.message);
    return observatoryPulseCache.block || '';
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
app.use(corpusMcp.router);
app.use(agora.router);
app.use(enchiridion.router);

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

// Any request carrying a Bearer JWT counts as activity: stamps
// user_settings.last_active_at at most once an hour per user.
app.use(eventLog.lastActiveMiddleware);

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

const MESSAGE_LIMITS = { free: 10, premium: 50, pro: null };

// Canonical tiers are free | premium | pro (profiles.tier + is_premium,
// written only by the billing webhooks). Legacy spellings fold into premium;
// the old profiles.subscription_tier column is dead — never read it.
function normalizeTier(rawTier, isPremium) {
  if (rawTier === 'pro') return 'pro';
  if (rawTier === 'premium' || rawTier === 'arete' || rawTier === 'scholar') return 'premium';
  return isPremium ? 'premium' : 'free';
}

// Resolve the caller's subscription tier. Verified JWT identity is preferred;
// the client-supplied body user id is the fallback so app builds that don't
// send Authorization yet still resolve their real tier (matches the trust
// model these endpoints already use for cabinet lookups). No id → free.
async function resolveUserTier(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let userId = null;
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) userId = user.id;
  }
  // Only a JWT-verified id may unlock the user's private Know Thyself facts
  // (server/lib/profile-facts.js); the body fallback never does.
  req.areteVerifiedUserId = userId;
  if (!userId) userId = req.body?.user_id || req.body?.userId || null;
  if (!userId) return { userId: null, tier: 'free' };
  // Older app builds send no Authorization header, so the middleware never
  // sees them; their message traffic still counts as activity.
  eventLog.touchLastActive(userId);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tier, is_premium, age_band, locked_at')
    .eq('id', userId)
    .single();
  if (error || !profile) return { userId, tier: 'free' };
  // Run B, Part B5: age band for teen mode, and the under-13 lock.
  req.areteAgeBand = profile.age_band || null;
  req.areteLocked = !!profile.locked_at;
  return { userId, tier: normalizeTier(profile.tier, profile.is_premium) };
}

// Strict variant: the caller must present a valid Supabase JWT. No body
// fallback. Returns the verified user id, or null (after sending 401).
async function requireVerifiedUser(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'unauthorized', reason: 'missing_bearer_token' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'unauthorized', reason: 'invalid_token' });
    return null;
  }
  return user.id;
}

// Per-user daily cap for endpoints that are not Cabinet messages but still
// cost a model call (the conversational Know Thyself onboarding). Counted in
// memory, keyed by user and UTC day; resets on restart, which is acceptable
// for a 40/day ceiling whose purpose is abuse control, not billing.
const dailyUserHits = new Map(); // `${userId}:${YYYY-MM-DD}` → count
function consumeDailyUserCap(userId, limit, res, errorCode) {
  const d = new Date();
  const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const key = `${userId}:${day}`;
  const used = dailyUserHits.get(key) || 0;
  if (used >= limit) {
    res.status(429).json({ error: errorCode, limit, resets: 'midnight_utc' });
    return false;
  }
  dailyUserHits.set(key, used + 1);
  if (dailyUserHits.size > 10000) {
    // Drop entries from previous days so the map cannot grow without bound.
    for (const k of dailyUserHits.keys()) if (!k.endsWith(day)) dailyUserHits.delete(k);
  }
  return true;
}

// Morning and evening check-ins do not count against the daily message cap
// (retention plan R2, decision D2): the routines are the habit the product
// exists to build, and a chatty day must not cost someone their evening
// reflection. A request opts in with body.kind = 'morning' | 'evening'. Two
// exempt calls per user per UTC day, so the flag cannot be used to chat for
// free; a third is counted like any other message. A call that fails gives its
// exemption back, so a retry after an outage is still free. Counted in memory:
// a restart forgets the day's count, which errs on the generous side.
const CHECKIN_EXEMPT_PER_DAY = 2;
const checkInExemptions = new Map(); // `${userId}:${YYYY-MM-DD}` → used
function checkInExemptionKey(userId) {
  const d = new Date();
  return `${userId}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function takeCheckInExemption(userId) {
  const key = checkInExemptionKey(userId);
  const used = checkInExemptions.get(key) || 0;
  if (used >= CHECKIN_EXEMPT_PER_DAY) return false;
  checkInExemptions.set(key, used + 1);
  if (checkInExemptions.size > 10000) {
    const today = key.slice(key.indexOf(':') + 1);
    for (const k of checkInExemptions.keys()) if (!k.endsWith(today)) checkInExemptions.delete(k);
  }
  return true;
}
function refundCheckInExemption(userId) {
  const key = checkInExemptionKey(userId);
  const used = checkInExemptions.get(key) || 0;
  if (used > 0) checkInExemptions.set(key, used - 1);
}

// enforceMessageLimit, except that a check-in with an exemption left passes
// without touching daily_message_count.
async function enforceMessageLimitUnlessCheckIn(req, res) {
  const kind = req.body?.kind;
  if (kind === 'morning' || kind === 'evening') {
    const { userId, tier } = await resolveUserTier(req);
    if (userId && takeCheckInExemption(userId)) {
      req.areteTier = tier; // the model ladder reads this, as below
      req.checkInExempt = true;
      res.on('finish', () => { if (res.statusCode >= 400) refundCheckInExemption(userId); });
      return false;
    }
  }
  return enforceMessageLimit(req, res);
}

async function enforceMessageLimit(req, res) {
  const { userId, tier } = await resolveUserTier(req);
  // Stash for the model ladder — one lookup per request.
  req.areteTier = tier;
  if (!userId) return false; // anonymous flows: nothing to count against
  // Run B, Part B5: a locked account (under 13) gets no Cabinet.
  if (req.areteLocked) {
    res.status(403).json({ error: 'account_locked' });
    return true;
  }

  const limit = Object.prototype.hasOwnProperty.call(MESSAGE_LIMITS, tier) ? MESSAGE_LIMITS[tier] : MESSAGE_LIMITS.free;

  if (limit === null) return false; // pro = unlimited

  const d = new Date();
  const todayUTC = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  // Atomic check-and-increment: returns true if allowed, false if at limit.
  // A single UPDATE avoids the read-then-write race condition where two
  // simultaneous requests both pass the count check and both get through.
  const { data: allowed, error: rpcError } = await supabase.rpc('try_increment_message_count', {
    p_user_id: userId,
    p_today: todayUTC,
    p_limit: limit,
  });

  if (rpcError) {
    console.error('[enforceMessageLimit] rpc error:', rpcError.message);
    return false; // fail open — don't block on DB errors
  }

  if (!allowed) {
    // Name the gate the way the clients' paywall sources do, so server rows
    // join to paywall_viewed rows without a lookup table.
    const active = req.body?.activeCounselorId;
    let source = 'other_daily_limit';
    if (req.path === '/api/chat/counselor') {
      if (req.body?.sessionType === 'shared') source = 'shared_daily_limit';
      else if (typeof active === 'string' && active && active !== 'cabinet') source = 'counselor_daily_limit';
      else source = 'cabinet_daily_limit';
    }
    logGateHit(req, userId, source, 'daily_limit_reached', { tier, limit });
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

// ---------------------------------------------------------------------------
// Know Thyself in the Cabinet (retention plan R6)
//
// The group thread builds every counselor's persona server-side and drops the
// client's system prompt except the app-data tail, so the Know Thyself
// profile never reached the parallel Cabinet: counselors could only stumble
// on a detail through the longitudinal portrait or the app data. This block
// is built from user_settings and injected into every voice.
// ---------------------------------------------------------------------------
const KT_SETTINGS_COLUMNS = 'user_name, kt_background, kt_identity, kt_goals, kt_strengths, kt_weaknesses, kt_patterns, kt_major_events, future_self_years, future_self_description, feedback_preference, app_usage_intent, kt_life_situation, kt_off_limits, pronouns, kt_completed_at, cabinet_members';

// The wording every surface now shares (the clients' gatherUserProfile
// carries the same sentences): connect, do not list.
const KT_PROFILE_INSTRUCTION = 'You know this person. Do not list the profile back to them. Do connect what they say today to what you know about them, by name and specifics, when it is relevant. When a pattern from this profile appears in the conversation, name it. When their goals are relevant, connect them explicitly. When their known weaknesses or failure modes are playing out in what they are describing, call it by name, with care but without softening or omission.';
const KT_CONNECT_INSTRUCTION = 'This person completed their Know Thyself profile very recently. Make one specific connection to their profile in this reply: a goal, a pattern, a strength, or something they said about themselves, named plainly.';
const KT_FRESH_REPLIES = 3;

// Run B, Part B3: the person tapped "I'm not sure what to ask. Ask me something."
const ASK_ME_STARTER_INSTRUCTION = `\n\n[OPEN WITH A QUESTION]\nThe person has just arrived and chose "I'm not sure what to ask. Ask me something." Open the conversation yourself: one or two warm sentences in your own voice, then exactly one specific, answerable question about their life right now (what is on their mind this week, what they are working toward, what has been hard). No advice, no lists, no quotes. One question only.\n[END OPEN WITH A QUESTION]`;

// Activation Part 4: the first assistant turn of a new conversation.
const FIRST_REPLY_INSTRUCTION = `\n\n[FIRST REPLY IN THIS CONVERSATION]\nThis is your first reply in a new conversation, and it decides whether the person keeps talking. Keep it short: three to five sentences, no lists, no headings. Acknowledge the specific situation they described, in their terms, not a general version of it. Give one concrete observation about it. Do not stack advice, do not give a framework, do not quote at length. End with exactly one specific question that invites them to tell you more about their situation. This overrides any longer length guidance for this reply only.\n[END FIRST REPLY]`;

function describeChallengeStyle(pref) {
  if (!pref) return null;
  const p = String(pref).toLowerCase();
  if (p === 'firm') return 'They asked to be pushed hard. Be direct; skip the cushioning.';
  if (p === 'compassionate' || p === 'gentle') return 'They asked for compassion first. Hold the standard, but lead with care.';
  if (p === 'both') return 'They asked for both: challenge them, and make sure they feel you are on their side.';
  return `Stated preference for how to be challenged: ${pref}.`;
}

async function loadKnowThyselfSettings(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase.from('user_settings').select(KT_SETTINGS_COLUMNS).eq('user_id', userId).maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

function hasKnowThyselfAnswers(s) {
  return !!s && ['kt_background', 'kt_identity', 'kt_goals', 'kt_strengths', 'kt_weaknesses', 'kt_patterns', 'kt_major_events', 'future_self_description']
    .some(k => typeof s[k] === 'string' && s[k].trim());
}

// `fresh`: the first few Cabinet replies after completion should each make
// one explicit connection, so the profile visibly changed something.
function buildKnowThyselfBlock(s, { fresh = false } = {}) {
  if (!hasKnowThyselfAnswers(s)) return '';
  const name = s.user_name || 'the user';
  const line = (label, v) => `${label}: ${v && String(v).trim() ? String(v).trim() : '(not provided)'}`;
  const challenge = describeChallengeStyle(s.feedback_preference);
  return `\n\n[KNOW THYSELF: ${name.toUpperCase()}]\n${KT_PROFILE_INSTRUCTION}${fresh ? '\n' + KT_CONNECT_INSTRUCTION : ''}\n\n` +
    [
      line('Background', s.kt_background),
      line('Professional identity', s.kt_identity),
      line('Goals', s.kt_goals),
      line('Strengths', s.kt_strengths),
      line('Weaknesses', s.kt_weaknesses),
      line('Known patterns and failure modes', s.kt_patterns),
      line('Major life events', s.kt_major_events),
      line(`Future self vision (${s.future_self_years ?? 10} years out)`, s.future_self_description),
      challenge ? `How they want to be challenged: ${challenge}` : null,
    ].filter(Boolean).join('\n') +
    '\n[END KNOW THYSELF]';
}

// ---------------------------------------------------------------------------
// Know Thyself, filled by the Cabinet (activation plan, Part 3)
//
// For a JWT-verified user, loads user_profile_facts and the current
// conversation (the session inside the thread's cabinet_conversations row)
// and returns:
//   factsBlock     Known / Tentative / off-limits, for every voice
//   tentativeBlock Tentative + off-limits only, for the single path, whose
//                  client-built prompt already carries the Known profile
//   askBlock       at most one missing field the closing voice may ask about
//   isFirstTurn    no earlier user turn in this conversation (Part 4)
//   session        { userTurns, messageCount, start, distressed }
// On the next user turn after an ask, detectAskAnswer runs in the
// background. Nothing here logs content.
// ---------------------------------------------------------------------------
const { currentSession: ktCurrentSession, countUserTurns: ktCountUserTurns, isUserTurn: ktIsUserTurn } = require('./lib/conversation-sessions');
const profileFacts = require('./lib/profile-facts');
const profileExtraction = require('./lib/profile-extraction');

// Run B, Part B5: appended to every counselor prompt for a 13-17 year old.
const TEEN_ADDENDUM = `\n\n[THIS PERSON IS A TEENAGER (13-17)]\nSpeak in an age-appropriate way. No romantic or sexual advice beyond healthy, general guidance about relationships (respect, boundaries, honesty). Never encourage or normalise alcohol, vaping, or drug use. If you are one of the tough-love voices, especially David Goggins, keep the drive and the challenge but drop profanity and harshness: firm, never demeaning. If they express distress, respond with warmth, encourage them to talk to a trusted adult (a parent, a teacher, a school counselor), and mention that in the US they can call or text 988 at any time.\n[END TEENAGER]`;

const THREAD_ID_ALIASES = { 'marcus-aurelius': 'marcus', 'david-goggins': 'goggins', 'theodore-roosevelt': 'roosevelt', 'future-self': 'futureSelf' };

async function loadCabinetThread(userId, activeCounselorId) {
  let q = supabase.from('cabinet_conversations').select('id, messages').eq('user_id', userId);
  if (!activeCounselorId || activeCounselorId === 'cabinet') {
    q = q.is('counselor_slugs', null);
  } else {
    const slug = THREAD_ID_ALIASES[activeCounselorId] || activeCounselorId;
    q = q.filter('counselor_slugs', 'eq', `{${slug}}`);
  }
  const { data } = await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

async function buildPersonalContext({ userId, activeCounselorId, ktSettings, userMessage }) {
  const empty = { factsBlock: '', tentativeBlock: '', askBlock: '', isFirstTurn: false, conversationId: null, session: null };
  if (!userId) return empty;
  try {
    const [thread, facts, flagged, recentOffers, accountRow, taskOffers] = await Promise.all([
      loadCabinetThread(userId, activeCounselorId),
      profileExtraction.loadFacts(supabase, userId),
      profileExtraction.hasRecentDistressFlag(supabase, userId),
      supabase.from('cabinet_offers').select('kind, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .then(r => r.data || [], () => []),
      supabase.from('profiles').select('created_at, age_band').eq('id', userId).maybeSingle().then(r => r.data, () => null),
      supabase.from('cabinet_offers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'task')
        .then(r => r.count || 0, () => 1),
    ]);
    const now = Date.now();
    const session = ktCurrentSession(thread && Array.isArray(thread.messages) ? thread.messages : [], now);
    const priorUserTurns = ktCountUserTurns(session.messages);
    const sessionUserTexts = session.messages.filter(ktIsUserTurn).map(m => m.content);
    const distressed = flagged || profileFacts.looksDistressed([...sessionUserTexts, userMessage]);

    const merged = profileFacts.mergeProfile(facts, ktSettings);
    const name = ktSettings && ktSettings.user_name;
    // Run B, Part B4: the person's pronouns if they set them; otherwise no
    // guessed gender.
    const pronounSetting = ktSettings && ktSettings.pronouns;
    const pronounLine = pronounSetting === 'he/him' || pronounSetting === 'she/her' || pronounSetting === 'they/them'
      ? `\n\n[PRONOUNS] When you refer to this person in the third person, use ${pronounSetting}.`
      : '\n\n[PRONOUNS] Do not assume this person\'s gender; if you refer to them in the third person, use they/them.';
    // Run B, Part B5: teen mode for the 13-15 and 16-17 bands.
    const isTeen = !!accountRow && (accountRow.age_band === '13_15' || accountRow.age_band === '16_17');
    const teenLine = isTeen ? TEEN_ADDENDUM : '';
    const factsBlock = profileFacts.buildFactsBlock(merged, { name }) + pronounLine + teenLine;
    const tentativeBlock = profileFacts.buildFactsBlock({ known: [], tentative: merged.tentative, offLimits: merged.offLimits }, { name }) + pronounLine + teenLine;

    // An ask from earlier in this conversation still awaiting its answer?
    const sessionStart = session.start != null ? session.start : now;
    const pending = facts.find(f => f.asked_at && !f.value && f.status === 'active'
      && Date.parse(f.asked_at) >= sessionStart - 60 * 1000
      && (!f.ask_declined_at || Date.parse(f.ask_declined_at) < Date.parse(f.asked_at)));
    if (pending && CLAUDE_API_KEY) {
      const lastAssistant = [...session.messages].reverse().find(m => m && m.role === 'assistant' && typeof m.content === 'string');
      if (lastAssistant) {
        profileExtraction.detectAskAnswer(supabase, {
          userId,
          fieldKey: pending.field_key,
          assistantText: lastAssistant.content,
          userText: userMessage,
          logEvent: eventLog.logEvent,
        }).catch(() => console.error('[profile] ask answer detection failed'));
      }
    }

    let askBlock = '';
    if (!pending) {
      const field = profileFacts.chooseAskField({
        facts,
        settings: ktSettings,
        userMessage,
        sessionUserTurns: priorUserTurns + 1,
        sessionStart: session.start,
        distress: distressed,
        now,
      });
      if (field) {
        askBlock = profileFacts.buildAskInstruction(field);
        profileExtraction.recordAskOffered(supabase, { userId, fieldKey: field.key, conversationId: thread ? thread.id : null })
          .catch(() => console.error('[profile] record ask failed'));
      }
    }

    const speakerCounts = {};
    for (const m of session.messages) {
      if (m && m.role === 'assistant' && m.counselorId) speakerCounts[m.counselorId] = (speakerCounts[m.counselorId] || 0) + 1;
    }
    const sessionStartIso = new Date(session.start != null ? session.start : now).toISOString();
    const lastScroll = recentOffers.find(o => o.kind === 'scroll');

    return {
      factsBlock,
      tentativeBlock,
      askBlock,
      speakerCounts,
      accountCreatedAt: accountRow ? accountRow.created_at : null,
      isTeen,
      // A teen whose words right now read as distress sees the support card
      // in the conversation straight away (run B, Part B5).
      teenSupport: isTeen && profileFacts.looksDistressed([userMessage]),
      goalText: (merged.known.concat(merged.tentative).find(e => e.field.key === 'top_goal') || {}).value || null,
      offers: {
        taskOfferedEver: taskOffers > 0,
        goalOfferedThisConversation: recentOffers.some(o => o.kind === 'goal' && o.created_at >= sessionStartIso),
        lastScrollOfferAt: lastScroll ? lastScroll.created_at : null,
      },
      isFirstTurn: priorUserTurns === 0,
      conversationId: thread ? thread.id : null,
      session: {
        userTurns: priorUserTurns + 1,
        messageCount: session.messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.kind !== 'checkin').length + 1,
        start: session.start,
        distressed,
      },
    };
  } catch (err) {
    console.error('[profile] personal context failed:', err.message);
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Cabinet offers (activation plan, Parts 6 and 9)
// ---------------------------------------------------------------------------
const cabinetOffers = require('./lib/cabinet-offers');

// Records at most one offer for this turn and returns it for the client's
// card: the goal the closing voice offered, else a scroll offer when the
// conversation has run six messages and none was offered in 72 hours.
async function recordCabinetOffer({ userId, personal, goal, task = null, goalCounselorId, replies }) {
  if (!userId || !personal || !personal.session) return null;
  try {
    if (task) {
      const { data, error } = await supabase.from('cabinet_offers').insert({
        user_id: userId,
        kind: 'task',
        conversation_id: personal.conversationId,
        counselor_id: goalCounselorId,
        payload: task,
      }).select('id').single();
      if (error || !data) return null;
      eventLog.logEvent(userId, 'cabinet_offer_made', { kind: 'task', routine: task.routine }, { platform: 'server' });
      return { id: data.id, kind: 'task', counselorId: goalCounselorId, ...task };
    }
    if (goal) {
      const { data, error } = await supabase.from('cabinet_offers').insert({
        user_id: userId,
        kind: 'goal',
        conversation_id: personal.conversationId,
        counselor_id: goalCounselorId,
        payload: goal,
      }).select('id').single();
      if (error || !data) return null;
      eventLog.logEvent(userId, 'cabinet_offer_made', { kind: 'goal', category: goal.category }, { platform: 'server' });
      return { id: data.id, kind: 'goal', counselorId: goalCounselorId, ...goal };
    }
    const replyIds = (replies || []).filter(Boolean);
    const messageCount = personal.session.messageCount + (replies || []).length;
    const allowed = cabinetOffers.canOfferScroll({
      verified: true,
      distressed: personal.session.distressed,
      messageCount,
      lastScrollOfferAt: personal.offers && personal.offers.lastScrollOfferAt,
      goalOfferedThisTurn: false,
    });
    if (!allowed) return null;
    const counts = { ...(personal.speakerCounts || {}) };
    for (const id of replyIds) counts[id] = (counts[id] || 0) + 1;
    const counselorId = cabinetOffers.pickScrollCounselor(counts);
    const { data, error } = await supabase.from('cabinet_offers').insert({
      user_id: userId,
      kind: 'scroll',
      conversation_id: personal.conversationId,
      counselor_id: counselorId,
      payload: {},
    }).select('id').single();
    if (error || !data) return null;
    eventLog.logEvent(userId, 'cabinet_offer_made', { kind: 'scroll' }, { platform: 'server' });
    return { id: data.id, kind: 'scroll', counselorId };
  } catch (err) {
    console.error('[offers] record failed:', err.message);
    return null;
  }
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

// How much raw material to carry alongside the abstractions. Themes and growth
// edges tell a counselor what kind of person this is; they cannot produce a
// specific callback, because you cannot quote a theme. These excerpts are what
// make "you wrote three weeks ago that..." possible at all.
const RECALL_ENTRY_LIMIT = 6;
const RECALL_BELIEF_LIMIT = 3;
const RECALL_WINDOW_DAYS = 180;
const RECALL_EXCERPT_CHARS = 320;

// Not every journal row is quotable material as-is, but only one kind must never
// reach a counselor that has been told to quote the user back to themselves: saved
// Cabinet transcripts the user pasted back in. Those are the counselors' own
// words, not theirs, and they are the longest rows in the table — so any
// length-based selection actively prefers them, and quoting one back would have
// a counselor attribute its own dialogue to the user.
//
// source='evening_reflection' entries need care but not exclusion. They are
// answers to a nightly check-in prompt, and read as nonsense alone ("I certainly
// did. It felt good too."). But the prompt that produced them is stored on the
// same row in raw_input, so the pair reconstructs cleanly:
//
//   "Did you act in line with your values today?" → "I certainly did."
//
// Recomposed that way they are the single richest source available — the bulk of
// entries (26 of 41 at time of writing), every one carrying its question.
// Dropping them wholesale threw away roughly two thirds of the corpus to avoid a
// problem the data had already solved.
const MIN_RECALL_CHARS = 60;

// A check-in answer may be very short and still be meaningful once its question
// is attached, so the pair is measured together rather than the answer alone.
const MIN_RECALL_CHARS_PAIRED = 40;

// Cabinet transcripts are dense with asterisk stage directions ("*He steps
// forward.*", "*Marcus, quietly:*"); ordinary writing almost never has two.
function looksLikeCounselorTranscript(text) {
  return (String(text).match(/\*[^*\n]+\*/g) || []).length >= 2;
}

// A prompted entry keeps its question; anything else stands on its own.
function isPromptedEntry(source, prompt) {
  return source === 'evening_reflection' && typeof prompt === 'string' && prompt.trim().length > 0;
}

// Over-fetch so the length filter still leaves enough to choose from.
const RECALL_FETCH_MULTIPLIER = 4;

// A refined belief is a deliberate artifact and can be short and still potent
// ("Anger is a judgment I can withdraw"), so it gets a lower bar than a
// free-form journal entry.
const MIN_RECALL_CHARS_BELIEF = 40;

// `text` is what would be quoted — for a prompted entry that is the question and
// answer together, so a two-word reply still clears the bar when its question
// carries the meaning.
function recallable(text, source, min = MIN_RECALL_CHARS) {
  if (typeof text !== 'string' || text.trim().length < min) return false;
  return !looksLikeCounselorTranscript(text);
}

function excerpt(text, max = RECALL_EXCERPT_CHARS) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

// "three weeks ago", "yesterday" — counselors should speak in human time, not
// ISO dates. Anything past the recall window is described in months.
function humanAge(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return 'last week';
  if (days < 60) return `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

async function getLongitudinalContext(userId) {
  if (!userId) return '';
  const cached = longitudinalCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.block;

  let block = '';
  try {
    const since = new Date(Date.now() - RECALL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [modelRes, entriesRes, beliefsRes] = await Promise.all([
      supabase
        .from('user_longitudinal_models')
        .select('weeks_analyzed, persistent_themes, growth_edges, dominant_philosophical_orientation, emotional_tone_baseline')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('journal_entries')
        // raw_input carries the check-in question for prompted entries.
        .select('content, refined_statement, raw_input, topic, type, source, created_at')
        .eq('user_id', userId)
        .eq('type', 'reflection')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(RECALL_ENTRY_LIMIT * RECALL_FETCH_MULTIPLIER),
      // Beliefs the user has worked through live in journal_entries under
      // type='belief', not in the (currently unpopulated) beliefs table. Prefer
      // the encoded form when the refinement pipeline has produced one and fall
      // back to what they actually typed.
      supabase
        .from('journal_entries')
        .select('content, encoded_belief, refined_statement, topic, source, created_at')
        .eq('user_id', userId)
        .eq('type', 'belief')
        .order('created_at', { ascending: false })
        .limit(RECALL_BELIEF_LIMIT),
    ]);

    const data = modelRes.data;

    // Only inject once there is a meaningful portrait (4+ weeks of signal).
    if (data && (data.weeks_analyzed ?? 0) >= 4) {
      const themeNames = (arr) => (Array.isArray(arr)
        ? arr.map(t => (typeof t === 'string' ? t : t?.theme)).filter(Boolean)
        : []);
      const persistent = themeNames(data.persistent_themes);
      const edges = Array.isArray(data.growth_edges) ? data.growth_edges.filter(Boolean) : [];

      const entryLines = (entriesRes.data || [])
        .map(e => {
          const answer = e.refined_statement || e.content;
          const prompted = isPromptedEntry(e.source, e.raw_input);
          return {
            at: e.created_at,
            topic: e.topic,
            source: e.source,
            prompted,
            question: prompted ? e.raw_input : null,
            answer,
            // What the counselor would actually quote — for a prompted entry the
            // question is part of the meaning, so it is what gets length-checked.
            text: prompted ? `${e.raw_input} ${answer}` : answer,
          };
        })
        .filter(e => recallable(
          e.text,
          e.source,
          e.prompted ? MIN_RECALL_CHARS_PAIRED : MIN_RECALL_CHARS,
        ))
        .slice(0, RECALL_ENTRY_LIMIT)
        .map(e => {
          const topic = e.topic ? ` (on ${e.topic})` : '';
          // Render the pair as question → answer so the counselor can see what
          // the user was responding to and never mistakes the prompt for their
          // own words.
          if (e.prompted) {
            return `- ${humanAge(e.at)}${topic}, asked "${excerpt(e.question, 160)}" — they answered: "${excerpt(e.answer)}"`;
          }
          return `- ${humanAge(e.at)}${topic}: "${excerpt(e.text)}"`;
        });

      const beliefLines = (beliefsRes.data || [])
        .map(b => ({ text: b.encoded_belief || b.refined_statement || b.content, at: b.created_at, topic: b.topic, source: b.source }))
        .filter(b => recallable(b.text, b.source, MIN_RECALL_CHARS_BELIEF))
        .map(b => {
          const topic = b.topic ? ` (on ${b.topic})` : '';
          return `- ${humanAge(b.at)}${topic}: "${excerpt(b.text, 200)}"`;
        });

      const recall = [
        entryLines.length
          ? `What they have written recently (lines with "asked ..." are answers to a nightly check-in prompt — the question is the app's, the answer is theirs):\n${entryLines.join('\n')}`
          : '',
        beliefLines.length ? `Beliefs they have refined:\n${beliefLines.join('\n')}` : '',
      ].filter(Boolean).join('\n\n');

      block = `\n\n[LONGITUDINAL CONTEXT — updated weekly]
This user has been part of the platform for ${data.weeks_analyzed} weeks.

Persistent themes they carry: ${persistent.length ? persistent.join(', ') : 'none identified yet'}
Where they are growing: ${edges.length ? edges.join('; ') : 'not yet identified'}
Their philosophical orientation: ${data.dominant_philosophical_orientation || 'unspecified'}
Their emotional baseline: ${data.emotional_tone_baseline || 'unspecified'}${recall ? `\n\n${recall}` : ''}

How to use this: you know this person. Let the themes and growth edges set the
depth you assume, the questions you ask, the resistance you offer.

When their own words above genuinely bear on what they have just raised, refer
to them specifically and naturally — "when you wrote about X a few weeks back",
"you settled on Y, and this looks like the same knot". A counsel who remembers
is the entire point; a generic reply to someone you have known for
${data.weeks_analyzed} weeks is a failure.

Three limits. Do not narrate the mechanism — never say you have records, context,
or a profile, and never list what you know back at them. Do not force it: if
nothing above is actually relevant, say nothing about it. One earned callback is
worth more than three strained ones, and most turns warrant none. And quote only
what they wrote — on a check-in line the question was put to them, so never
attribute it to them ("you said you wanted equanimity" when the app asked about
equanimity is a fabrication); refer to what they answered.
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

  // Check-ins (body.kind) are exempt from the cap, twice a day.
  if (await enforceMessageLimitUnlessCheckIn(req, res)) return;

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
  // Static-first split: persona + fixed instructions cache across turns;
  // the volatile tail (local time, observatory pulse) sits after the
  // cache breakpoint so it can't invalidate the prefix.
  const systemBlocks = buildSystemBlocks(
    system + resourceInstruction + SELF_KNOWLEDGE,
    dateTimeLine + (await getObservatoryPulseBlock())
  );

  try {
    const truncatedMessages = truncateMessages(messages);
    const effectiveModel = resolveModelForTier(req.areteTier || 'free', model);
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/chat] messages: ${messages.length} → ${truncatedMessages.length} | est. tokens: ${Math.round(estimatedTokens)} | tier: ${req.areteTier} | model: ${model} → ${effectiveModel} | user: ${user_id}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: effectiveModel,
        // Floor, not a target: a ceiling only ever prevents a mid-sentence
        // cutoff, since a reply ends when the model reaches end_turn. The
        // check-in callers ask for 350, which a normal check-in reply runs
        // past — so a client asking for less than the floor gets the floor.
        max_tokens: Math.max(max_tokens || 1500, CHAT_MIN_MAX_TOKENS),
        system: systemBlocks,
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
      repairTruncatedContent(data, '/api/chat');
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

  // Tier gate on the requested counselor. The clients hide locked counselors,
  // but the endpoint accepted any slug from a free account. Checked before the
  // message limit so a rejected request does not consume one of the day's
  // messages. A 1:1 chat names its counselor in activeCounselorId (or the
  // older counselorSlug); 'cabinet' is the group thread.
  {
    const requested = (typeof req.body?.activeCounselorId === 'string' && req.body.activeCounselorId !== 'cabinet')
      ? req.body.activeCounselorId
      : (typeof req.body?.counselorSlug === 'string' ? req.body.counselorSlug : null);
    if (requested && !isFreeCounselorSlug(requested)) {
      const { tier } = await resolveUserTier(req);
      if (tier === 'free') {
        return res.status(403).json({ error: 'counselor_locked', counselor: requested, tier });
      }
    }
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
  // Free tier: the group thread only fires the free counselors (plus Future
  // Self, which filterRosterToCabinet always adds). Mirrors getUserCabinet in
  // lib/db.ts so a stale or hand-crafted cabinet_members list cannot pull a
  // paid counselor into a free Cabinet.
  if (req.areteTier === 'free') {
    const source = Array.isArray(effectiveCabinetMembers) && effectiveCabinetMembers.length > 0
      ? effectiveCabinetMembers
      : [];
    const allowed = source.filter(isFreeCounselorSlug);
    effectiveCabinetMembers = allowed.some(s => FREE_COUNSELOR_SLUGS.includes(s)) ? allowed : [...FREE_COUNSELOR_SLUGS];
  }

  // Ceilings, not targets: a reply ends when the model is done (end_turn), so
  // these only prevent a mid-sentence cutoff — they don't lengthen or add cost
  // to normal replies. A Cabinet reply renders multiple voices (e.g. Marcus,
  // Epictetus, Future Self) in one generation (~1.5–2k tokens), so the old
  // 400/600/1000 caps guillotined it mid-word. Length is governed by the
  // system prompt's "3–5 paragraphs" guidance, not by these ceilings.
  // Keyed on the canonical vocabulary (free | premium | pro). This map used
  // to be keyed on the legacy 'arete'/'arete_pro' spellings, which no client
  // sends: every lookup but 'free' missed and fell through to the client's
  // own max_tokens — the 400/600/1000 caps the comment above says were
  // removed. Premium was being capped at 600, below free's 1500.
  //
  // The tier comes from req.areteTier (resolved from profiles by
  // enforceMessageLimit), not the x-subscription-tier header: the header is
  // unauthenticated client input and a stale build can send anything.
  const TIER_MAX_TOKENS = { free: 1500, premium: 2500, pro: 4000 };
  const tier = req.areteTier || normalizeTier(req.headers['x-subscription-tier']) || 'free';
  const serverMaxTokens = TIER_MAX_TOKENS[tier] || max_tokens || 2500;

  // Per-voice ceiling for the parallel Cabinet, where each counselor is one
  // generation of several. Also a ceiling, not a target — the length guard in
  // fireParallelCounselors asks for 2-3 short paragraphs, and a reply ends at
  // end_turn — so raising it costs nothing on a normal turn. The old value was
  // hardcoded at 300, which cut counselors off mid-sentence whenever they
  // answered a substantial question.
  const TIER_VOICE_MAX_TOKENS = { free: 800, premium: 1000, pro: 1200 };
  const voiceMaxTokens = TIER_VOICE_MAX_TOKENS[tier] || 800;

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

  // --- Know Thyself (retention plan R6) ---
  // Built server-side so the parallel Cabinet finally sees the profile (and
  // so older app builds get it too). The client counts the assistant replies
  // since kt_completed_at and sends ktRepliesSinceComplete; under
  // KT_FRESH_REPLIES each reply is asked to make one explicit connection.
  const ktSettings = await loadKnowThyselfSettings(userId);
  const ktRepliesSinceComplete = Number.isFinite(req.body?.ktRepliesSinceComplete) ? req.body.ktRepliesSinceComplete : null;
  const ktFresh = ktRepliesSinceComplete !== null && ktRepliesSinceComplete < KT_FRESH_REPLIES;
  const knowThyselfBlock = buildKnowThyselfBlock(ktSettings, { fresh: ktFresh });

  // --- Know Thyself facts, filled by the Cabinet (activation Part 3) ---
  // Verified users only; shared sessions keep the per-participant profiles
  // above and never carry an ask.
  const lastUserText = Array.isArray(messages) ? String(messages[messages.length - 1]?.content || '') : '';
  const personal = sessionType === 'shared'
    ? { factsBlock: '', tentativeBlock: '', askBlock: '', isFirstTurn: false, conversationId: null, session: null }
    : await buildPersonalContext({
        userId: req.areteVerifiedUserId || null,
        activeCounselorId: activeCounselorId || counselorSlug || 'cabinet',
        ktSettings,
        userMessage: lastUserText,
      });
  // --- First reply of a conversation (activation Part 4) ---
  // 34% of conversations ended after one exchange. The first assistant turn
  // of a new conversation stays short, speaks to the specific situation,
  // offers one concrete observation and ends on one question that invites
  // the person to keep going. Later turns are unchanged. Without a verified
  // user (old builds) the only signal is a single user message in the payload.
  const isFirstTurn = sessionType !== 'shared' && (req.areteVerifiedUserId
    ? personal.isFirstTurn
    : (Array.isArray(messages) && messages.filter(m => m && m.role === 'user').length === 1));
  // Run B, Part B3: the empty-Cabinet starter "I'm not sure what to ask. Ask
  // me something." has the counselor open with one question instead.
  const askMeStarter = req.body?.starterId === 'ask_me';
  const firstReplyBlock = isFirstTurn ? (askMeStarter ? ASK_ME_STARTER_INSTRUCTION : FIRST_REPLY_INSTRUCTION) : '';

  // --- Goal offer (activation Part 6) ---
  const goalOfferAllowed = cabinetOffers.canOfferGoal({
    verified: !!req.areteVerifiedUserId && !!personal.session,
    isFirstTurn,
    distressed: !!(personal.session && personal.session.distressed),
    goalOfferedThisConversation: !!(personal.offers && personal.offers.goalOfferedThisConversation),
  });
  // Run B, Part B4: in the first week, once ever, a check-in task tied to the
  // stated goal takes the goal offer's place.
  const taskOfferAllowed = cabinetOffers.canOfferTask({
    verified: !!req.areteVerifiedUserId && !!personal.session,
    isFirstTurn,
    distressed: !!(personal.session && personal.session.distressed),
    accountCreatedAt: personal.accountCreatedAt,
    taskOfferedEver: !personal.offers || personal.offers.taskOfferedEver,
    goalText: personal.goalText,
  });
  const goalOfferBlock = taskOfferAllowed
    ? cabinetOffers.taskOfferInstruction(personal.goalText)
    : (goalOfferAllowed ? cabinetOffers.GOAL_OFFER_INSTRUCTION : '');

  // The facts block supersedes the user_settings-only block: it falls back to
  // the same columns for any field without a fact.
  const cabinetProfileBlock = personal.factsBlock
    ? personal.factsBlock + (ktFresh ? `\n${KT_CONNECT_INSTRUCTION}` : '')
    : knowThyselfBlock;

  // --- Client app data (routines, journal, goals, ATTEND context) ---
  // The client's `system` is buildSystemPrompt + gatherAppContext, but the
  // parallel Cabinet path builds each counselor's persona server-side and
  // historically discarded `system` entirely — which silently dropped the
  // user's routines/journal/Screen Time context from Cabinet chat. Extract
  // the app-data tail (it starts at "=== <NAME>'S CURRENT APP DATA") and
  // inject it into every counselor alongside the other context blocks.
  let clientAppContext = '';
  if (typeof system === 'string') {
    const marker = system.indexOf("'S CURRENT APP DATA");
    if (marker >= 0) {
      const start = system.lastIndexOf('===', marker);
      if (start >= 0) {
        clientAppContext = `\n\n[USER APP DATA — from the user's own tracking in Arete]\n${system.slice(start).trim()}\n[END USER APP DATA]`;
      }
    }
  }

  // --- Parallel Cabinet branch ---
  const { mode, counselors: parallelCounselors } = await selectCounselors(activeCounselorId, userId, effectiveCabinetMembers);

  if (mode === 'parallel') {
    const question = Array.isArray(messages) ? (messages[messages.length - 1]?.content || '') : '';
    const history = Array.isArray(messages) ? messages.slice(0, -1) : [];

    // One corpus retrieval shared across all counselors
    let contextChunks = [];
    if (process.env.OPENAI_API_KEY) {
      try {
        const embedding = await embedQuery(question);
        // Counselor path: the fence excludes editorial apparatus
        // (server/lib/corpus-fence.js), and the post-filter keeps graph-boost
        // expansion from reintroducing it.
        const { data, error } = await supabase.rpc('match_rag_corpus', {
          query_embedding: embedding,
          match_count: 7,
          filter_author: null,
          filter_language: 'english',
          ...counselorRetrievalParams(),
        });
        if (!error) contextChunks = (data ?? []);
        // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
        contextChunks = (await expandCandidates(contextChunks, 7, { fence: isCounselorVisible }))
          .rows.filter(isCounselorVisible);
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
      mode: retrievalMode(),
    });

    const selectedCounselors = await selectRespondingCounselors(question, parallelCounselors, history);
    // First reply: one voice, so the opening is one short, specific reply
    // with one question rather than a stack of advice from several people.
    const respondingCounselors = isFirstTurn ? selectedCounselors.slice(0, 1) : selectedCounselors;

    const results = await fireParallelCounselors(question, respondingCounselors, history, contextChunks, checkInContext, priorResponses, safeCounselorModels, cabinetProfileBlock + sharedContext + longitudinalContext + clientAppContext, req.areteTier || 'free', voiceMaxTokens, {
      allVoices: firstReplyBlock,
      // No Know Thyself ask on the first reply: it must end on the one
      // question about the person's own situation.
      lastVoice: isFirstTurn ? '' : personal.askBlock + goalOfferBlock,
    });

    // Offers (Parts 6 and 9): strip any goal marker from every voice; the
    // person only ever sees a card.
    let offeredGoal = null;
    let offeredTask = null;
    let goalCounselorId = null;
    for (const r of results) {
      if (!r || typeof r.response !== 'string') continue;
      const parsed = cabinetOffers.parseGoalMarker(r.response);
      const parsedTask = cabinetOffers.parseTaskMarker(parsed.text);
      r.response = parsedTask.text;
      if (parsed.goal && !offeredGoal) { offeredGoal = parsed.goal; goalCounselorId = r.counselorId || null; }
      if (parsedTask.task && !offeredTask) { offeredTask = parsedTask.task; goalCounselorId = r.counselorId || null; }
    }
    const offer = await recordCabinetOffer({
      userId: req.areteVerifiedUserId,
      personal,
      task: taskOfferAllowed ? offeredTask : null,
      goal: goalOfferAllowed && !taskOfferAllowed ? offeredGoal : null,
      goalCounselorId,
      replies: results.filter(r => !r.error && r.response).map(r => r.counselorId),
    });

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
      ...(offer ? { offer } : {}),
      ...(personal.teenSupport ? { support: true } : {}),
    });
  }

  // --- Single counselor path (unchanged) ---

  // Know Thyself injection block. The clients' single-mode system prompt
  // already carries gatherUserProfile, so this only adds anything for a
  // caller that sends userProfile in the body (none do today) and, for a
  // fresh completion, the one-connection instruction.
  let profileBlock = '';
  if (userProfile && typeof userProfile === 'object') {
    profileBlock = buildKnowThyselfBlock(userProfile, { fresh: ktFresh });
  } else if (ktFresh) {
    profileBlock = `\n\n${KT_CONNECT_INSTRUCTION}`;
  }
  // The client's single-mode prompt carries the Known profile already; add
  // what only the server knows: tentative facts and off-limits topics.
  profileBlock += personal.tentativeBlock;
  const singleTurnBlock = isFirstTurn ? firstReplyBlock : personal.askBlock + goalOfferBlock;
  const singleCounselorId = THREAD_ID_ALIASES[activeCounselorId || counselorSlug] || activeCounselorId || counselorSlug || null;

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
      // Counselor path: fenced (server/lib/corpus-fence.js).
      const { data, error } = await supabase.rpc('match_rag_corpus', {
        query_embedding: embedding,
        match_count: 5,
        filter_author: null,
        filter_language: 'english',
        ...counselorRetrievalParams(),
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
        libraryChunks = (await expandCandidates(data, 5, { fence: isCounselorVisible }))
          .rows.filter(isCounselorVisible);
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
    mode: retrievalMode(),
  });

  const dateTimeBlock = buildLocalDateTimeLine(tzOffsetMinutes);
  const resourceInstruction = `\n\nWhen a user's question or goal would benefit from a specific external resource — a book, article, or research study — you may search for it and include a URL in your response. Only suggest resources you have confirmed exist via web search. Weave the suggestion naturally into your response in your own voice. Do not list links at the end of your message. One resource per response maximum — only when it genuinely adds value.`;
  const pulseBlock = await getObservatoryPulseBlock();
  // Full string for the OpenAI-compatible providers (no block-level caching
  // there); a static/volatile block split for the Anthropic path. The static
  // half (persona, profile, catalog, self-knowledge) is byte-stable across a
  // conversation's turns; RAG retrievals, session context, and the pulse vary
  // per message and must stay after the cache breakpoint.
  const enrichedSystem = system + dateTimeBlock + profileBlock + sharedContext + longitudinalContext + ragContext + libraryContext + catalogBlock + resourceInstruction + SELF_KNOWLEDGE + pulseBlock + singleTurnBlock;
  const counselorSystemBlocks = buildSystemBlocks(
    system + profileBlock + catalogBlock + resourceInstruction + SELF_KNOWLEDGE,
    dateTimeBlock + sharedContext + longitudinalContext + ragContext + libraryContext + pulseBlock + singleTurnBlock
  );

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
  // Tier ladder: free → Haiku, premium → Sonnet, pro → full picker. Clamping
  // before provider routing means non-Anthropic models are pro-only for free.
  const tierModel = resolveModelForTier(req.areteTier || 'free', model);
  let anthropicModel = tierModel;
  if (isNonAnthropicModel(tierModel)) {
    const compatModel = ALLOWED_COUNSELOR_MODELS.has(tierModel) ? tierModel : DEFAULT_COUNSELOR_MODEL;
    const route = isNonAnthropicModel(compatModel) ? compatRouteFor(compatModel) : undefined;
    if (route) {
      try {
        console.log(`[/api/chat/counselor] messages: ${messages.length} | model: ${compatModel} (${route.provider})`);
        const { text: rawText, stopReason } = await callOpenAICompat(route, {
          model: compatModel,
          system: enrichedSystem,
          messages,
          maxTokens: serverMaxTokens,
        });
        const parsedReply = cabinetOffers.parseGoalMarker(finishTruncatedReply(rawText, stopReason, `counselor/${compatModel}`));
        const parsedTask = cabinetOffers.parseTaskMarker(parsedReply.text);
        const text = parsedTask.text;
        await writeSharedAssistant(text);
        if (text && loggedChunks.length > 0) {
          attributeUsage({ requestId, chunks: loggedChunks, responseText: text });
        }
        const offer = await recordCabinetOffer({
          userId: req.areteVerifiedUserId,
          personal,
          task: taskOfferAllowed ? parsedTask.task : null,
          goal: goalOfferAllowed && !taskOfferAllowed ? parsedReply.goal : null,
          goalCounselorId: singleCounselorId,
          replies: text ? [singleCounselorId] : [],
        });
        return res.json({ content: [{ type: 'text', text }], request_id: requestId, ...(offer ? { offer } : {}), ...(personal.teenSupport ? { support: true } : {}) });
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
    console.log(`[/api/chat/counselor] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | tier: ${req.areteTier} | model: ${model} → ${anthropicModel}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: anthropicModel || HAIKU_MODEL,
        max_tokens: serverMaxTokens,
        system: counselorSystemBlocks,
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
      repairTruncatedContent(data, '/api/chat/counselor');
    }
    // Strip any goal marker from the text blocks before anything else sees it.
    let singleGoal = null;
    let singleTask = null;
    for (const b of (data.content || [])) {
      if (b.type !== 'text' || typeof b.text !== 'string') continue;
      const parsed = cabinetOffers.parseGoalMarker(b.text);
      const parsedTask = cabinetOffers.parseTaskMarker(parsed.text);
      b.text = parsedTask.text;
      if (parsed.goal && !singleGoal) singleGoal = parsed.goal;
      if (parsedTask.task && !singleTask) singleTask = parsedTask.task;
    }
    const assistantText = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    await writeSharedAssistant(assistantText);
    const singleOffer = await recordCabinetOffer({
      userId: req.areteVerifiedUserId,
      personal,
      task: taskOfferAllowed ? singleTask : null,
      goal: goalOfferAllowed && !taskOfferAllowed ? singleGoal : null,
      goalCounselorId: singleCounselorId,
      replies: assistantText ? [singleCounselorId] : [],
    });
    if (singleOffer) data.offer = singleOffer;
    if (personal.teenSupport) data.support = true;
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

const APP_STORE_URL = 'https://apps.apple.com/us/app/arete-know-thyself/id6762371595';
const WEB_APP_URL = 'https://app.pursuearete.com';

// POST /api/sessions/invite — create a pending participant row + email the partner.
// ---------------------------------------------------------------------------
// Contact form (www.pursuearete.com/contact) → email via Resend.
// The site form posts here; the owner's inbox address lives server-side only
// so it never appears in the page source for scrapers.
// ---------------------------------------------------------------------------
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'kemery9585@gmail.com';
const contactHits = new Map(); // ip → [timestamps]

app.post('/api/contact', async (req, res) => {
  if (!resend) {
    console.warn('[contact] RESEND_API_KEY not set — cannot send');
    return res.status(503).json({ error: 'Contact form is temporarily unavailable.' });
  }

  const { name, email, message, website } = req.body || {};

  // Honeypot: "website" is a hidden field humans never fill. Bots that do get
  // a fake success so they don't adapt.
  if (website) return res.json({ success: true });

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Please include a message.' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please include a valid email so we can reply.' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (5000 characters max).' });
  }

  // 5 submissions per IP per hour — plenty for humans, a wall for scripts.
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  const hits = (contactHits.get(ip) || []).filter(t => now - t < 60 * 60 * 1000);
  if (hits.length >= 5) {
    return res.status(429).json({ error: 'Too many messages — please try again later.' });
  }
  hits.push(now);
  contactHits.set(ip, hits);

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 200) : '';

  try {
    await resend.emails.send({
      from: INVITE_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `[Arete Contact] ${cleanName || email}`,
      text: `From: ${cleanName || '(no name)'} <${email}>\n\n${message.trim()}`,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[contact] send failed:', err.message || err);
    return res.status(502).json({ error: 'Could not send your message. Please try again.' });
  }
});

app.post('/api/sessions/invite', async (req, res) => {
  const authenticatedUserId = await getAuthenticatedUserId(req);
  if (!authenticatedUserId) return res.status(401).json({ error: 'Unauthorized' });

  // Shared sessions are a Premium feature for the INVITER only. Accepting an
  // invite stays free — the partner may not have an account yet, and joining
  // free is the growth loop.
  const { tier } = await resolveUserTier(req);
  if (tier === 'free') {
    logGateHit(req, authenticatedUserId, 'shared_invite_gate', 'premium_required', { tier });
    return res.status(403).json({
      error: 'Shared sessions are an Arete Premium feature. Upgrade to invite a partner.',
      code: 'premium_required',
    });
  }

  // Invites go out by email (we send it via Resend) or by phone (the app opens
  // the inviter's own Messages composer with the join link, so no SMS provider
  // is needed server-side).
  const { sessionId, partnerEmail, partnerPhone } = req.body || {};
  if (!sessionId || (!partnerEmail && !partnerPhone)) {
    return res.status(400).json({ error: 'Missing required fields: sessionId and partnerEmail or partnerPhone' });
  }
  const partnerContact = partnerEmail || partnerPhone;

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
      invite_email: partnerContact, // contact-of-record; holds the phone for SMS invites
      invited_by: authenticatedUserId,
      invite_expires_at: expiresAt,
      display_name: partnerContact,
    }, { onConflict: 'session_id,user_id' });
  if (upsertErr) {
    console.error('[sessions/invite] upsert error:', upsertErr.message);
    return res.status(500).json({ error: 'Failed to create invite' });
  }

  const joinUrl = `${RAILWAY_PUBLIC_URL}/api/sessions/join?token=${token}`;
  const webJoinUrl = `${WEB_APP_URL}/join?token=${token}`;

  // Prewritten text for SMS invites: the app opens the inviter's Messages
  // composer with this body, so the text goes out from their own number.
  const smsBody = `${inviterName} is inviting you to join a philosophical discussion within the Arete app. Join here: ${joinUrl}`;

  if (resend && partnerEmail) {
    const text = `${inviterName} is inviting you to join a philosophical discussion within the Arete app.\n\nIn a shared Cabinet session, you and ${inviterName} each bring your philosophical profile, and your Cabinet counselors respond to both of you together.\n\nJoin in the app: ${joinUrl}\n\nPrefer the web? Sign up or sign in and join here: ${webJoinUrl}\n\nDon't have the Arete app yet? Download it first, then tap the join link on your phone: ${APP_STORE_URL}\n\nThis invite expires in 48 hours.\n\nIf you don't have an Arete account, you'll be prompted to create one.`;
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;line-height:1.5;">
      <p><strong>${inviterName}</strong> is inviting you to join a <strong>philosophical discussion</strong> within the Arete app.</p>
      <p>In a shared Cabinet session, you and ${inviterName} each bring your philosophical profile, and your Cabinet counselors respond to both of you together.</p>
      <p><a href="${joinUrl}" style="display:inline-block;background:#c9a84c;color:#1a1a2e;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Join Session</a></p>
      <p style="color:#666;font-size:13px;">Prefer the web? <a href="${webJoinUrl}" style="color:#8a6d1f;">Sign up or sign in and join at app.pursuearete.com</a>.</p>
      <p style="color:#666;font-size:13px;">Don't have the Arete app yet? <a href="${APP_STORE_URL}" style="color:#8a6d1f;">Download it from the App Store</a> first, then tap Join Session on your phone.</p>
      <p style="color:#666;font-size:13px;">This invite expires in 48 hours. If you don't have an Arete account, you'll be prompted to create one.</p>
    </div>`;
    try {
      await resend.emails.send({
        from: INVITE_FROM_EMAIL,
        to: partnerEmail,
        subject: `${inviterName} is inviting you to a philosophical discussion on Arete`,
        text,
        html,
      });
    } catch (err) {
      console.error('[sessions/invite] email send failed:', err.message || err);
      return res.json({ success: true, emailSent: false, joinUrl, webJoinUrl, smsBody });
    }
  } else if (partnerEmail) {
    console.warn('[sessions/invite] RESEND_API_KEY not set — skipping email send');
  }

  return res.json({
    success: true,
    emailSent: !!resend && !!partnerEmail,
    joinUrl,
    webJoinUrl,
    smsBody,
  });
});

// GET /api/sessions/pending-invite — surface an invite in-app for users who
// never opened the email. Matches pending, unexpired invites addressed to the
// authenticated user's email (phone invites can't be matched to an account).
app.get('/api/sessions/pending-invite', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!bearer) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(bearer);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const email = (user.email || '').trim();
  if (!email) return res.json({ invite: null });

  // ilike gives case-insensitive matching; escape its wildcards so an email
  // containing _ can't match other addresses.
  const emailPattern = email.replace(/[\\%_]/g, '\\$&');
  const { data: rows, error } = await supabase
    .from('session_participants')
    .select('invite_token, invited_by, invite_expires_at')
    .eq('status', 'pending')
    .ilike('invite_email', emailPattern)
    .neq('invited_by', user.id)
    .gt('invite_expires_at', new Date().toISOString())
    .order('invite_expires_at', { ascending: false })
    .limit(1);
  if (error) {
    console.error('[sessions/pending-invite] lookup error:', error.message);
    return res.status(500).json({ error: 'Failed to look up invites' });
  }
  const row = rows?.[0];
  if (!row?.invite_token) return res.json({ invite: null });

  let inviterName = 'Someone';
  try {
    const { data: inv } = await supabase
      .from('user_settings').select('user_name').eq('user_id', row.invited_by).maybeSingle();
    if (inv?.user_name) inviterName = inv.user_name;
  } catch { /* fall back to 'Someone' */ }

  return res.json({
    invite: { token: row.invite_token, inviterName, expiresAt: row.invite_expires_at },
  });
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
  // An HTTP redirect straight to a custom scheme dies silently in most email
  // in-app browsers (Gmail's webview especially). Serve a tiny interstitial
  // that attempts the deep link via JS and keeps a tappable button + guidance
  // as the fallback, so the tap never lands on a blank dead-end.
  const deepLink = `arete://join-session?token=${encodeURIComponent(token)}`;
  res.set('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Join your Arete session</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#1a1a2e;color:#e0d5b5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
  .card{max-width:420px}
  h1{color:#c9a84c;font-size:22px;margin-bottom:8px}
  p{color:#8A9BB0;font-size:15px;line-height:1.5}
  a.btn{display:inline-block;background:#c9a84c;color:#1a1a2e;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;margin:20px 0 12px}
  a.store{display:inline-block;color:#c9a84c;text-decoration:underline;font-size:14px;margin-bottom:8px}
  .hint{font-size:13px;color:#666}
</style></head>
<body><div class="card">
  <h1>Join your shared Cabinet session</h1>
  <p>Opening the Arete app&hellip;</p>
  <a class="btn" href="${deepLink}">Open in Arete</a>
  <p class="hint">Nothing happening? You may not have the Arete app installed yet.</p>
  <a class="store" href="${APP_STORE_URL}">Get Arete on the App Store</a>
  <p class="hint">After installing, come back to your invite and tap the join link again. If you opened this link on a computer, open it on your phone instead.</p>
  <a class="store" href="${WEB_APP_URL}/join?token=${encodeURIComponent(token)}">Or join on the web instead</a>
</div>
<script>setTimeout(function(){ window.location.href = ${JSON.stringify(deepLink)}; }, 400);</script>
</body></html>`);
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

  // Drop a system notice into the shared thread so both sides see the join.
  // Best-effort; realtime delivers it to the inviter, history to the joiner.
  try {
    await supabase.from('session_messages').insert({
      session_id: row.session_id,
      user_id: authenticatedUserId,
      role: 'system',
      content: `${partnerDisplayName || 'Your partner'} joined the session`,
    });
  } catch (err) {
    console.error('[sessions/accept] join notice failed:', err.message || err);
  }

  return res.json({ success: true, sessionId: row.session_id });
});

// ─── Weekly journal-analysis insight (delivered in-app) ──────────────────────

// Returns this user's most recent insight and marks it delivered
// (activation Part 7.2):
//   - Nothing while the user has a distress flag from the last 14 days, and
//     nothing when their latest analysis is itself flagged: a flagged week is
//     never answered with last week's insight, and never with a teaser or an
//     upsell. Flagged analyses go to distress_review_queue for human review.
//   - Free tier gets the first paragraph (teaser: true); the clients show the
//     insight_tease upgrade prompt for the rest. Premium and pro get it all.
// Delivery is still pull-based; the web Journal page now pulls too.
app.get('/api/user/insight', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (await profileExtraction.hasRecentDistressFlag(supabase, userId)) return res.json({ insight: null });

  const { data, error } = await supabase
    .from('journal_analysis')
    .select('id, analysis_week, themes, dominant_theme, insight_text, grounding_passages, weeks_analyzed, distress_flagged, delivered, created_at')
    .eq('user_id', userId)
    .order('analysis_week', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[/api/user/insight] lookup failed');
    return res.status(500).json({ error: 'Failed to load insight' });
  }
  if (!data || data.distress_flagged || !data.insight_text) return res.json({ insight: null });

  const { data: profile } = await supabase.from('profiles').select('tier, is_premium').eq('id', userId).maybeSingle();
  const tier = normalizeTier(profile?.tier, profile?.is_premium);

  if (!data.delivered) {
    await supabase
      .from('journal_analysis')
      .update({ delivered: true, delivered_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('distress_flagged', false);
  }

  const { distress_flagged: _flag, delivered: _delivered, ...insight } = data;
  if (tier === 'free') {
    // The first paragraph; an insight written as one paragraph gives its
    // first two sentences, so the rest is still the premium read.
    const full = String(data.insight_text).trim();
    let first = full.split(/\n\s*\n/)[0].trim();
    if (first === full) {
      const sentences = full.match(/[^.!?]+[.!?]+(\s|$)/g) || [full];
      first = sentences.slice(0, 2).join('').trim();
    }
    return res.json({ insight: { ...insight, insight_text: first, grounding_passages: [], teaser: true } });
  }
  return res.json({ insight: { ...insight, teaser: false } });
});

// ─── Support resources card ───────────────────────────────────────────────────

// Whether to show the gentle "you don't have to carry it alone" card on the
// Journal screen: true for 7 days after this user's most recent distress flag
// (the queue row's created_at is the moment of the flag). Returns only a key
// for per-card dismissal and the end of the window, never notes, status, or
// any hint of why, so nothing on the client can reveal that writing was
// analyzed.
const SUPPORT_CARD_DAYS = 7;
app.get('/api/user/support-card', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const since = new Date(Date.now() - SUPPORT_CARD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('distress_review_queue')
    .select('analysis_id, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[/api/user/support-card] lookup failed');
    return res.json({ show: false });
  }
  if (!data) return res.json({ show: false });

  const until = new Date(new Date(data.created_at).getTime() + SUPPORT_CARD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return res.json({ show: true, key: data.analysis_id, until });
});

// ─── Lifecycle email unsubscribe (retention plan R9) ─────────────────────────

// One-click unsubscribe from every kind of Arete email. The link in each
// email carries an HMAC token for the member (server/lib/email-unsubscribe.js),
// so it works without a login and can only ever set profiles.email_opt_out
// to true for that one account. GET is the link in the email body; POST is
// what mail clients send for the List-Unsubscribe-Post header (RFC 8058).
// Turning email back on is done from Settings on the web app.
const { verifyUnsubscribeToken } = require('./lib/email-unsubscribe');

function unsubscribePage(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0f1117;color:#e6eef8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:48px 20px;">
<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 20px;">Arete</p>
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:500;margin:0 0 12px;">${title}</h1>
<p style="line-height:1.55;color:#c6cfdb;margin:0 0 16px;">${body}</p>
<p><a href="${WEB_APP_URL}/settings" style="color:#c9a84c;">Open Settings</a></p>
</div></body></html>`;
}

async function handleEmailUnsubscribe(req, res) {
  const token = String(req.query?.token || req.body?.token || '');
  const userId = verifyUnsubscribeToken(token);
  res.set('Content-Type', 'text/html; charset=utf-8');
  if (!userId) {
    return res.status(400).send(unsubscribePage(
      'This link is not valid.',
      'The unsubscribe link may be incomplete. You can turn Arete email off from Settings in the web app instead.'
    ));
  }
  const { error } = await supabase
    .from('profiles')
    .update({ email_opt_out: true, email_opt_out_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    console.error('[email/unsubscribe] update failed:', error.message);
    return res.status(500).send(unsubscribePage(
      'Something went wrong.',
      'We could not save your choice just now. Please try the link again in a moment, or turn Arete email off from Settings in the web app.'
    ));
  }
  eventLog.logEvent(userId, 'email_unsubscribed', {}, { platform: 'email' });
  return res.send(unsubscribePage(
    'You are unsubscribed.',
    'Arete will not send you any more email. Your account and your Cabinet are unchanged. If you change your mind, you can turn email back on from Settings.'
  ));
}

app.get('/api/email/unsubscribe', handleEmailUnsubscribe);
app.post('/api/email/unsubscribe', express.urlencoded({ extended: false }), handleEmailUnsubscribe);

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

  if (data) await markDispatchRead(data.id, userId, '/api/dispatch/today');

  return res.json({ dispatch: data || null });
});

// Records that a member opened a dispatch (retention plan R5). Two things
// happen, both best-effort so a failure never blocks the read:
//  1. read_at is stamped on the member's delivery row whatever its status
//     (a push that was 'sent' used to stay 'sent' forever, so opens from a
//     notification were invisible), first open only; a row is created when
//     none exists (no push token at queue time, or the fallback delivery).
//  2. A still-pending row flips to 'read' (atomic on status='pending', so the
//     hourly push agent will not also send it) and counts as delivered.
async function markDispatchRead(dispatchId, userId, route) {
  const now = new Date().toISOString();
  try {
    const { data: flipped } = await supabase
      .from('dispatch_deliveries')
      .update({ status: 'read', sent_at: now, read_at: now })
      .eq('dispatch_id', dispatchId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select('id');
    if (flipped && flipped.length > 0) {
      const { data: d } = await supabase
        .from('daily_dispatches')
        .select('delivered_count')
        .eq('id', dispatchId)
        .single();
      await supabase
        .from('daily_dispatches')
        .update({ delivered_count: (d?.delivered_count || 0) + flipped.length })
        .eq('id', dispatchId);
      return;
    }
    // Not pending: stamp the existing row (sent, failed, dismissed, read) on
    // its first open, or create the row for a member the queue never had.
    const { data: stamped } = await supabase
      .from('dispatch_deliveries')
      .update({ read_at: now })
      .eq('dispatch_id', dispatchId)
      .eq('user_id', userId)
      .is('read_at', null)
      .select('id');
    if (stamped && stamped.length > 0) return;
    const { count } = await supabase
      .from('dispatch_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('dispatch_id', dispatchId)
      .eq('user_id', userId);
    if ((count ?? 0) === 0) {
      await supabase
        .from('dispatch_deliveries')
        .insert({ dispatch_id: dispatchId, user_id: userId, status: 'read', sent_at: now, read_at: now });
    }
  } catch (e) {
    console.error(`[${route}] read-marking failed:`, e.message);
  }
}

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
  // The deep-link target of the push: this is the open the push produced.
  await markDispatchRead(data.id, userId, '/api/dispatch/:id');
  return res.json({ dispatch: data });
});

// ─── Counselor broadcasts — the Cabinet post half ────────────────────────────
//
// A broadcast is a hand-written message from a counselor, delivered as a push
// notification and as a post in the member's Cabinet chat. The push is only
// the nudge (broadcast-delivery-agent.js); this is the delivery that always
// happens. The app sweeps /pending on every foreground, seeds each line into
// the Cabinet thread through the same path as Settings reminders and Attend
// nudges, then acknowledges with /seen. Until it acknowledges, the message
// stays owed — a push swiped away unread, a member who never granted
// notification permission, and a failed acknowledgement all recover here.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PENDING_BROADCASTS = 20;

// GET /api/broadcasts/pending — every broadcast this member is still owed and
// whose send hour has arrived in their own timezone.
app.get('/api/broadcasts/pending', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: owed, error: owedError } = await supabase
      .from('counselor_broadcast_deliveries')
      .select('broadcast_id, pushed_at')
      .eq('user_id', userId)
      .is('seeded_at', null)
      .limit(MAX_PENDING_BROADCASTS);
    if (owedError) throw owedError;
    if (!owed || owed.length === 0) return res.json({ broadcasts: [] });

    // 'sent' is included: the push half can finish long before every member
    // has opened the app to collect the post.
    const { data: rows, error } = await supabase
      .from('counselor_broadcasts')
      .select('id, counselor_slug, fallback_counselor_slug, title, message, send_date, send_hour')
      .in('id', owed.map(o => o.broadcast_id))
      .in('status', ['scheduled', 'sending', 'sent']);
    if (error) throw error;
    if (!rows || rows.length === 0) return res.json({ broadcasts: [] });

    const { data: settings } = await supabase
      .from('user_settings')
      .select('timezone, cabinet_members')
      .eq('user_id', userId)
      .maybeSingle();
    const timezone = settings?.timezone || BROADCAST_DEFAULT_TIMEZONE;
    const counselorNames = await loadCounselorNames(supabase);
    const pushedAt = new Map(owed.map(o => [o.broadcast_id, o.pushed_at]));

    const broadcasts = rows
      .filter(b => isBroadcastDue(b, timezone))
      .map(b => ({
        id: b.id,
        title: b.title,
        message: b.message,
        counselorName: resolveBroadcastSpeaker(b, settings?.cabinet_members, counselorNames).name,
        // When the line should read as having arrived: the push if one went
        // out, otherwise now.
        at: pushedAt.get(b.id) ? new Date(pushedAt.get(b.id)).getTime() : Date.now(),
      }));

    return res.json({ broadcasts });
  } catch (err) {
    console.error('[/api/broadcasts/pending] error:', err.message);
    return res.status(500).json({ error: 'Failed to load broadcasts' });
  }
});

// POST /api/broadcasts/seen — the app confirming these broadcasts are now in
// the member's Cabinet thread. Idempotent: the app re-acknowledges anything it
// had already seeded locally, which is how a lost acknowledgement heals.
app.post('/api/broadcasts/seen', async (req, res) => {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.filter(id => typeof id === 'string' && UUID_RE.test(id)).slice(0, MAX_PENDING_BROADCASTS)
    : [];
  if (ids.length === 0) return res.status(400).json({ error: 'No broadcast ids' });

  try {
    // Conditional on seeded_at IS NULL, so a repeat acknowledgement neither
    // moves the timestamp nor double-counts seeded_count.
    const { data: marked, error } = await supabase
      .from('counselor_broadcast_deliveries')
      .update({ seeded_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('broadcast_id', ids)
      .is('seeded_at', null)
      .select('broadcast_id');
    if (error) throw error;

    // One row per (broadcast, member), so each id here is a first landing.
    for (const broadcastId of (marked || []).map(m => m.broadcast_id)) {
      const { data: current } = await supabase
        .from('counselor_broadcasts')
        .select('seeded_count')
        .eq('id', broadcastId)
        .maybeSingle();
      await supabase
        .from('counselor_broadcasts')
        .update({ seeded_count: (current?.seeded_count || 0) + 1 })
        .eq('id', broadcastId);
    }

    return res.json({ acknowledged: (marked || []).length });
  } catch (err) {
    console.error('[/api/broadcasts/seen] error:', err.message);
    return res.status(500).json({ error: 'Failed to acknowledge broadcasts' });
  }
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

Good example: "Sam discussed their tendency to avoid difficult conversations at work, particularly with their manager about the layoffs. Marcus identified an all-or-nothing pattern in how Sam frames career decisions. Sam committed to drafting one honest email this week. The question of whether fear or wisdom is driving their caution remains unresolved." Refer to the person by name, and with they/them/their rather than a guessed gender.

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

// ─── Know Thyself reflection (retention plan R6) ─────────────────────────────
//
// "What your Cabinet now sees": right after the profile is saved, the chair
// of the user's Cabinet says, in three or four sentences, one pattern that
// connects two things the user wrote, the goal it threatens, and one
// question. Exempt from the message cap; at most a few generations a day
// per user (the clients call it once per save). Stored on user_settings so
// the Know Thyself page can show it again.

const KT_REFLECTIONS_PER_DAY = 6;

function chairForSettings(s, roster) {
  const members = Array.isArray(s?.cabinet_members) ? s.cabinet_members : [];
  for (const slug of members) {
    const id = SLUG_TO_COUNSELOR_ID[slug] || slug;
    if (id === 'future-self') continue;
    const c = roster.find(r => r.id === id);
    if (c) return c;
  }
  return roster.find(r => r.id === 'marcus') || roster[0];
}

app.post('/api/kt-reflection', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }
  const userId = await requireVerifiedUser(req, res);
  if (!userId) return;
  if (!consumeDailyUserCap(userId, KT_REFLECTIONS_PER_DAY, res, 'kt_reflection_limit_reached')) return;

  const settings = await loadKnowThyselfSettings(userId);
  if (!hasKnowThyselfAnswers(settings)) {
    return res.status(400).json({ error: 'profile_empty', message: 'Answer a few Know Thyself questions first.' });
  }
  const roster = await getCabinetRoster();
  const chair = chairForSettings(settings, roster);
  const name = settings.user_name || 'this person';
  const profile = buildKnowThyselfBlock(settings).replace(/^\n+/, '');

  const system = `${chair.systemPrompt}\n\n${profile}\n\nYou are ${chair.name}, the chair of ${name}'s Cabinet. ${name} has just finished telling the Cabinet who they are. Write what you now see, addressed to ${name} directly, in three or four sentences and nothing else:
1. Name one pattern that connects two specific things ${name} wrote, quoting or closely paraphrasing their own words.
2. Name the goal of theirs that this pattern threatens.
3. End with exactly one question that only ${name} can answer.
No flattery. No summary of every field. No greeting, no sign-off, no headings, no lists, no markdown. Plain prose in your own voice. Use commas, colons or semicolons, never dashes.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: PREMIUM_MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: `I have finished my Know Thyself profile. What do you see?` }],
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/kt-reflection] Claude API error:', response.status, errorText);
      return res.status(502).json({ error: 'reflection_failed' });
    }
    const data = await response.json();
    const text = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return res.status(502).json({ error: 'reflection_failed' });

    const now = new Date().toISOString();
    const { error: saveError } = await supabase
      .from('user_settings')
      .update({ kt_reflection: text, kt_reflection_at: now, kt_reflection_counselor: chair.name })
      .eq('user_id', userId);
    if (saveError) console.error('[/api/kt-reflection] save failed:', saveError.message);
    eventLog.logEvent(userId, 'kt_reflection_generated', { counselor: chair.id, chars: text.length }, { platform: eventLog.platformFromRequest(req) });
    console.log(`[/api/kt-reflection] ${chair.id} | ${text.length} chars | user ${userId}`);
    return res.json({ reflection: text, counselorId: chair.id, counselorName: chair.name, generatedAt: now });
  } catch (err) {
    console.error('[/api/kt-reflection] failed:', err.message || err);
    return res.status(502).json({ error: 'reflection_failed' });
  }
});

// ─── Check-in follow-up: the Yesterday card (retention plan R8) ──────────────
//
// One line from a Cabinet member about a day's intention, at most 25 words,
// ending in a question, stored on that day's check_ins row. Generated at
// evening completion (the clients prime it) or at the first open the next
// day. Exempt from the message cap; the in-memory daily ceiling only stops a
// loop. The line is stored, so repeat calls for the same day cost nothing.

const CHECKIN_FOLLOWUPS_PER_DAY = 6;
const FOLLOWUP_MAX_WORDS = 25;

function summarizeTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const done = list.filter(t => t && t.done);
  return {
    done: done.length,
    total: list.length,
    doneTitles: done.map(t => String(t.title || '').trim()).filter(Boolean).slice(0, 4),
  };
}

app.post('/api/checkin/followup', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }
  const userId = await requireVerifiedUser(req, res);
  if (!userId) return;
  const date = typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : null;
  if (!date) return res.status(400).json({ error: 'bad_date', message: 'date must be YYYY-MM-DD (the user\'s local date).' });

  const { data: row, error } = await supabase
    .from('check_ins')
    .select('id, intention, morning_tasks, evening_tasks, morning_done, evening_done, followup_line, followup_counselor')
    .eq('user_id', userId)
    .eq('check_in_date', date)
    .maybeSingle();
  if (error) {
    console.error('[/api/checkin/followup] read failed:', error.message);
    return res.status(500).json({ error: 'read_failed' });
  }
  if (!row) return res.status(404).json({ error: 'no_checkin' });

  const settings = await loadKnowThyselfSettings(userId);
  const roster = await getCabinetRoster();
  const chair = chairForSettings(settings, roster);
  const name = settings?.user_name || 'they';
  const intention = typeof row.intention === 'string' && row.intention.trim() ? row.intention.trim() : null;
  const morning = summarizeTasks(row.morning_tasks);
  const evening = summarizeTasks(row.evening_tasks);
  const tasksDone = morning.done + evening.done;
  const tasksTotal = morning.total + evening.total;
  const payload = (line, counselor) => ({
    date, intention, line, counselorId: counselor.id, counselorName: counselor.name, tasksDone, tasksTotal,
  });

  // Already written: return it. The stored counselor name is matched back to
  // the roster so the id is right even if the cabinet changed since.
  if (typeof row.followup_line === 'string' && row.followup_line.trim()) {
    const stored = roster.find(c => c.name === row.followup_counselor) || chair;
    return res.json(payload(row.followup_line.trim(), stored));
  }
  if (!consumeDailyUserCap(userId, CHECKIN_FOLLOWUPS_PER_DAY, res, 'followup_limit_reached')) return;

  const facts = intention
    ? `On ${date} ${name} wrote this intention for the day: "${intention}". They completed ${tasksDone} of ${tasksTotal} disciplines${morning.doneTitles.length ? ` (done: ${[...morning.doneTitles, ...evening.doneTitles].join(', ')})` : ''}.`
    : `On ${date} ${name} set no written intention. They completed ${tasksDone} of ${tasksTotal} disciplines${morning.doneTitles.length || evening.doneTitles.length ? ` (done: ${[...morning.doneTitles, ...evening.doneTitles].join(', ')})` : ''}.`;
  const system = `${chair.systemPrompt}\n\nYou are ${chair.name}. It is the morning after. Write exactly one line to ${name}, at most ${FOLLOWUP_MAX_WORDS} words, that holds them to what they said or did yesterday and ends with a question mark. ${intention ? 'Quote or closely paraphrase their own intention.' : 'Speak to what they did or left undone.'} No greeting, no name at the start, no praise for its own sake, no markdown, no dashes. Plain prose in your voice.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 120,
        system,
        messages: [{ role: 'user', content: facts }],
      }),
    });
    if (!response.ok) {
      console.error('[/api/checkin/followup] Claude API error:', response.status, await response.text());
      return res.status(502).json({ error: 'followup_failed' });
    }
    const data = await response.json();
    let line = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').replace(/\s+/g, ' ').trim();
    line = line.replace(/^["“]|["”]$/g, '').replace(/\s*[—–]\s*/g, ', ').trim();
    if (!line) return res.status(502).json({ error: 'followup_failed' });
    // Hard ceiling on length; a question mark is restored if the trim cut it.
    const words = line.split(' ');
    if (words.length > FOLLOWUP_MAX_WORDS + 5) line = words.slice(0, FOLLOWUP_MAX_WORDS).join(' ').replace(/[,.;:]$/, '') + '?';
    if (!line.endsWith('?')) line = line.replace(/[.!]$/, '') + '?';

    const { error: saveError } = await supabase
      .from('check_ins')
      .update({ followup_line: line, followup_counselor: chair.name })
      .eq('id', row.id);
    if (saveError) console.error('[/api/checkin/followup] save failed:', saveError.message);
    console.log(`[/api/checkin/followup] ${chair.id} | ${date} | ${words.length} words | user ${userId}`);
    return res.json(payload(line, chair));
  } catch (err) {
    console.error('[/api/checkin/followup] failed:', err.message || err);
    return res.status(502).json({ error: 'followup_failed' });
  }
});

const ONBOARDING_TURNS_PER_DAY = 40;

app.post('/api/onboard-web', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  // Signed-in users only: every turn is a Sonnet call, and the endpoint used
  // to be open to anyone who knew the URL.
  const userId = await requireVerifiedUser(req, res);
  if (!userId) return;
  if (!consumeDailyUserCap(userId, ONBOARDING_TURNS_PER_DAY, res, 'onboarding_limit_reached')) return;

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

// Writes one scroll: { title, body, counselor }. Throws on failure. Shared by
// POST /api/scrolls/generate and the Cabinet's scroll offer (activation
// Part 9), so an offered scroll goes through the same pipeline.
async function generateScrollContent({ goal, counselor: requestedCounselor, userName }) {
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
    const err = new Error(errorText);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const rawText = data.content?.find((b) => b.type === 'text')?.text || '';

  let parsed;
  try {
    // Strip markdown code fences if Claude wrapped it
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    const err = new Error('Failed to parse generated scroll');
    err.status = 500;
    throw err;
  }

  return { title: parsed.title, body: parsed.body, counselor };
}

app.post('/api/scrolls/generate', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { goal, counselor: requestedCounselor, userName } = req.body;

  if (!goal || typeof goal !== 'string') {
    return res.status(400).json({ error: 'Missing required field: goal' });
  }

  try {
    return res.json(await generateScrollContent({ goal, counselor: requestedCounselor, userName }));
  } catch (error) {
    if (error.status) {
      console.error('Scroll generation failed:', error.status);
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Failed to generate scroll:', error.message);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Cabinet offers: accept or decline (activation Parts 6 and 9) ───────────

// POST /api/cabinet/offers/:id/respond { accept, title?, category?, target_date? }
// goal:   accepting creates the goal (source = 'cabinet') with the title,
//         category and target date the person confirmed on the card.
// scroll: accepting answers 202 at once and writes the scroll in the
//         background through the same pipeline as a requested scroll; it
//         appears on the Scrolls page when ready.
// Nothing is created on decline, or without an offer the server made.
const { GOAL_CATEGORIES } = require('./lib/cabinet-offers');

async function scrollTopicForOffer(offer) {
  // The topic, in general terms, from the person's own turns in the
  // conversation the offer came from. Held only on the scroll row.
  const { data: thread } = await supabase.from('cabinet_conversations').select('messages').eq('id', offer.conversation_id).maybeSingle();
  const offeredAt = Date.parse(offer.created_at);
  const session = ktCurrentSession(thread && Array.isArray(thread.messages) ? thread.messages : [], offeredAt);
  const userTurns = session.messages.filter(ktIsUserTurn).map(m => m.content).slice(-8);
  if (userTurns.length === 0) return null;
  const raw = await profileExtraction.callHaiku(
    'Write ONE sentence, in the second person, naming the struggle or goal this person is working through, in general terms, for the title brief of a short personal essay. No names of other people. No quotes. Output only the sentence.',
    userTurns.map(t => `- ${t}`).join('\n'),
    120
  );
  const topic = String(raw || '').trim().split('\n')[0].slice(0, 300);
  return topic || null;
}

app.post('/api/cabinet/offers/:id/respond', async (req, res) => {
  const userId = await requireVerifiedUser(req, res);
  if (!userId) return;
  const accept = req.body?.accept === true;

  const { data: offer, error } = await supabase
    .from('cabinet_offers')
    .select('id, user_id, kind, conversation_id, counselor_id, payload, status, created_at')
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Failed to load offer' });
  if (!offer) return res.status(404).json({ error: 'not_found' });
  if (offer.status !== 'offered') return res.status(409).json({ error: 'already_answered', status: offer.status });

  const now = new Date().toISOString();
  if (!accept) {
    await supabase.from('cabinet_offers').update({ status: 'declined', responded_at: now }).eq('id', offer.id).eq('status', 'offered');
    eventLog.logEvent(userId, 'cabinet_offer_declined', { kind: offer.kind }, { platform: eventLog.platformFromRequest(req) });
    return res.json({ ok: true, status: 'declined' });
  }

  // Claim the offer first so a double tap cannot create two goals.
  const { data: claimed } = await supabase
    .from('cabinet_offers')
    .update({ status: 'accepted', responded_at: now })
    .eq('id', offer.id)
    .eq('status', 'offered')
    .select('id');
  if (!claimed || claimed.length === 0) return res.status(409).json({ error: 'already_answered' });

  if (offer.kind === 'goal') {
    const p = offer.payload || {};
    const title = String(req.body?.title ?? p.title ?? '').trim().slice(0, 120);
    const category = GOAL_CATEGORIES.includes(String(req.body?.category ?? p.category ?? '').toUpperCase())
      ? String(req.body?.category ?? p.category).toUpperCase()
      : 'GENERAL';
    const rawDate = String(req.body?.target_date ?? p.target_date ?? '');
    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && Number.isFinite(Date.parse(rawDate)) ? rawDate : null;
    if (!title) {
      await supabase.from('cabinet_offers').update({ status: 'offered', responded_at: null }).eq('id', offer.id);
      return res.status(400).json({ error: 'title_required' });
    }
    const { data: goal, error: goalError } = await supabase.from('goals').insert({
      user_id: userId,
      title,
      target_date: targetDate,
      category,
      counselor: offer.counselor_id || null,
      source: 'cabinet',
      completed: false,
    }).select('id, title, category, target_date').single();
    if (goalError || !goal) {
      await supabase.from('cabinet_offers').update({ status: 'offered', responded_at: null }).eq('id', offer.id);
      return res.status(500).json({ error: 'Failed to save goal' });
    }
    await supabase.from('cabinet_offers').update({ result_id: goal.id }).eq('id', offer.id);
    eventLog.logEvent(userId, 'cabinet_offer_accepted', { kind: 'goal', category }, { platform: eventLog.platformFromRequest(req) });
    return res.json({ ok: true, status: 'accepted', goal });
  }

  if (offer.kind === 'task') {
    const p = offer.payload || {};
    const title = String(req.body?.title ?? p.title ?? '').trim().slice(0, 60);
    const routine = (req.body?.routine ?? p.routine) === 'evening' ? 'evening' : 'morning';
    if (!title) {
      await supabase.from('cabinet_offers').update({ status: 'offered', responded_at: null }).eq('id', offer.id);
      return res.status(400).json({ error: 'title_required' });
    }
    const { count } = await supabase.from('routine_templates').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('type', routine);
    const { data: tmpl, error: tmplError } = await supabase.from('routine_templates').insert({
      user_id: userId, type: routine, title, emoji: '✨', sort_order: count || 0,
    }).select('id').single();
    if (tmplError || !tmpl) {
      await supabase.from('cabinet_offers').update({ status: 'offered', responded_at: null }).eq('id', offer.id);
      return res.status(500).json({ error: 'Failed to add task' });
    }
    await supabase.from('cabinet_offers').update({ result_id: tmpl.id }).eq('id', offer.id);
    eventLog.logEvent(userId, 'cabinet_offer_accepted', { kind: 'task', routine }, { platform: eventLog.platformFromRequest(req) });
    return res.json({ ok: true, status: 'accepted', task: { id: tmpl.id, title, routine } });
  }

  // Scroll: write it in the background.
  eventLog.logEvent(userId, 'cabinet_offer_accepted', { kind: 'scroll' }, { platform: eventLog.platformFromRequest(req) });
  res.status(202).json({ ok: true, status: 'writing' });
  (async () => {
    try {
      const topic = await scrollTopicForOffer(offer);
      if (!topic) return;
      const { data: settings } = await supabase.from('user_settings').select('user_name').eq('user_id', userId).maybeSingle();
      const scroll = await generateScrollContent({ goal: topic, counselor: offer.counselor_id || undefined, userName: settings?.user_name || undefined });
      const { data: row } = await supabase.from('scrolls').insert({
        user_id: userId,
        title: scroll.title,
        body: scroll.body,
        counselor: scroll.counselor,
        goal_source: topic,
        request_type: 'requested',
      }).select('id').single();
      if (row) await supabase.from('cabinet_offers').update({ result_id: row.id }).eq('id', offer.id);
    } catch (err) {
      console.error('[offers] scroll generation failed:', err.status || 'error');
    }
  })();
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
      // Seminar path: the modern philosophy of mind layer stays off the
      // syllabus by default (server/lib/corpus-fence.js); apparatus is allowed.
      const results = await Promise.all(
        authors.map(author =>
          supabase.rpc('match_rag_corpus', {
            query_embedding: embedding,
            match_count: 2,
            filter_author: author,
            filter_language: 'english',
            ...modernFenceParams(),
          })
        )
      );
      let rows = results.flatMap(r => r.data ?? []);
      rows.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
      // Phase B: expand through the Hebbian graph before truncation (no-op
      // unless GRAPH_BOOST=true).
      rows = (await expandCandidates(rows, Math.max(k, 4) * 2, { fence: passesModernFence }))
        .rows.filter(passesModernFence);
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
    mode: retrievalMode(),
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
    // Seminar path: modern layer fenced (server/lib/corpus-fence.js).
    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: k,
      filter_author: null,
      filter_language: 'english',
      ...modernFenceParams(),
    });
    if (error) {
      console.error('match_rag_corpus RPC error:', error.message);
      return [];
    }
    observatory.recordRetrieval(data ?? [], 'academy'); // fire-and-forget log
    // Phase B: Hebbian expansion (no-op unless GRAPH_BOOST=true).
    const { rows: expandedRaw } = await expandCandidates(data ?? [], k, { fence: passesModernFence });
    const expanded = expandedRaw.filter(passesModernFence);
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

// Maps the slug conventions used across the app (counselors table slugs,
// short thread ids, futureSelf) to the parallel-roster counselor ids above.
// Counselors loaded from the `counselors` table are added to this map (and
// to COUNSELOR_ALIASES) by getCabinetRoster() under their own slug.
const SLUG_TO_COUNSELOR_ID = {
  'marcus': 'marcus', 'marcus-aurelius': 'marcus',
  'epictetus': 'epictetus',
  'seneca': 'seneca',
  'goggins': 'goggins', 'david-goggins': 'goggins',
  'roosevelt': 'roosevelt', 'theodore-roosevelt': 'roosevelt',
  'montaigne': 'montaigne',
  'future-self': 'future-self', 'futureSelf': 'future-self',
};

// ---------------------------------------------------------------------------
// Dynamic Cabinet roster
//
// The hand-written personas above cover seven counselors. The `counselors`
// table seeds twenty-two, and Premium users can put any of them in their
// Cabinet. Before this loader existed, a selected counselor without a
// hand-written persona was silently dropped from the group thread and a
// 1:1 chat with them fell through to the group path, so they were "listed
// but never appeared". Every table row now gets a persona generated from
// its bio, philosophy, communication_style, challenge_level and quotes; the
// hand-written prompt still wins for the seven that have one.
// ---------------------------------------------------------------------------

const CHALLENGE_LEVEL_LINES = {
  direct: 'You are direct, even blunt. You do not soften hard truths and you do not pad your answers.',
  firm: 'You are firm and warm at once: you hold this person to a high standard without cruelty, and you say the hard thing plainly.',
  gentle: 'You are gentle and patient. You still tell the truth, but you lead with understanding and let the person arrive at it.',
};

function buildGeneratedPersona(row) {
  const name = String(row.name || row.slug || 'Counselor').trim();
  const dates = row.dates ? ` (${String(row.dates).trim()})` : '';
  const description = row.description ? String(row.description).trim() : '';
  const bio = row.bio ? String(row.bio).trim() : '';
  const philosophy = row.philosophy ? String(row.philosophy).trim() : '';
  const style = row.communication_style ? String(row.communication_style).trim() : '';
  const challenge = CHALLENGE_LEVEL_LINES[row.challenge_level] || '';
  const quotes = Array.isArray(row.quotes)
    ? row.quotes.filter(q => typeof q === 'string' && q.trim()).slice(0, 6)
    : [];

  const parts = [
    `You are ${name}${dates}. ${description} Speak in first person.`,
    bio,
    philosophy ? `Your philosophy: ${philosophy}` : '',
    style ? `How you speak: ${style}` : '',
    challenge,
    quotes.length > 0
      ? `Things you have actually said or written. Draw on them as memories, not as citations:\n${quotes.map(q => `- ${q.trim()}`).join('\n')}`
      : '',
    'Speak from your own life, works and deeds. Reference them naturally, as someone who lived them, and do not feign ignorance of the authors and ideas of your own tradition.',
    `Keep responses to 3-5 paragraphs. Do not mention that you are an AI. Do not break character. You are ${name}.`,
  ];
  return parts.filter(Boolean).join('\n\n');
}

// Name patterns for direct invocation ("Socrates, what do you think?").
// Full name always; each name word too when it is long enough to be
// unambiguous on its own (so "Muhammad Ali" does not fire on "ali").
function buildAliasRegex(name) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const full = String(name || '').trim().toLowerCase();
  if (!full) return null;
  const words = full
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !['de', 'von', 'van', 'the'].includes(w));
  const alts = new Set([esc(full)]);
  if (words.length > 1) {
    for (const w of words) {
      if (w.length >= 4) alts.add(esc(w));
    }
  }
  return new RegExp([...alts].map(a => `\\b${a}\\b`).join('|'), 'i');
}

const BUILTIN_COUNSELOR_IDS = new Set(CABINET_COUNSELORS.map(c => c.id));
let cabinetRosterCache = { roster: CABINET_COUNSELORS, at: 0 };
const CABINET_ROSTER_TTL_MS = 10 * 60 * 1000;

/**
 * The full parallel roster: hand-written personas plus one generated persona
 * per `counselors` row that lacks a hand-written one. Cached for 10 minutes
 * so a newly seeded counselor speaks without a redeploy. Falls back to the
 * hand-written seven if the table cannot be read.
 */
async function getCabinetRoster() {
  if (Date.now() - cabinetRosterCache.at < CABINET_ROSTER_TTL_MS) {
    return cabinetRosterCache.roster;
  }
  try {
    const { data, error } = await supabase
      .from('counselors')
      .select('slug, name, dates, description, bio, philosophy, communication_style, challenge_level, quotes, sort_order')
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const generated = [];
    const aliasAdds = [];
    for (const row of data || []) {
      if (!row?.slug) continue;
      const mapped = SLUG_TO_COUNSELOR_ID[row.slug];
      if (mapped && BUILTIN_COUNSELOR_IDS.has(mapped)) continue; // hand-written persona wins
      if (row.slug === 'futureSelf' || row.slug === 'future-self') continue;
      SLUG_TO_COUNSELOR_ID[row.slug] = row.slug;
      generated.push({ id: row.slug, name: row.name, systemPrompt: buildGeneratedPersona(row) });
      const re = buildAliasRegex(row.name);
      if (re) aliasAdds.push({ id: row.slug, re });
    }

    // Refresh the alias table: built-in patterns stay first, generated follow.
    COUNSELOR_ALIASES.splice(
      BUILTIN_COUNSELOR_ALIAS_COUNT,
      COUNSELOR_ALIASES.length - BUILTIN_COUNSELOR_ALIAS_COUNT,
      ...aliasAdds,
    );

    cabinetRosterCache = { roster: [...CABINET_COUNSELORS, ...generated], at: Date.now() };
    console.log(`[Cabinet] Roster loaded: ${CABINET_COUNSELORS.length} hand-written + ${generated.length} generated personas`);
  } catch (err) {
    console.error('[Cabinet] Roster load failed, using hand-written personas only:', err.message || err);
    cabinetRosterCache = { roster: CABINET_COUNSELORS, at: Date.now() };
  }
  return cabinetRosterCache.roster;
}
// Warm the cache at boot; never blocks startup.
setTimeout(() => { getCabinetRoster().catch(() => {}); }, 0);

/**
 * Restricts the parallel roster to the user's selected cabinet members.
 * Future Self is always present. A member whose slug is unknown is skipped;
 * if that leaves no one but Future Self, the chair (Marcus) joins so the
 * Cabinet always has a second voice. With no selection at all (older app
 * builds, or a user who never opened My Cabinet) the roster is the
 * hand-written seven, which was the behaviour before generated personas.
 */
function filterRosterToCabinet(roster, cabinetMembers) {
  if (!Array.isArray(cabinetMembers) || cabinetMembers.length === 0) {
    return roster.filter(c => BUILTIN_COUNSELOR_IDS.has(c.id));
  }
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
async function selectCounselors(activeCounselorId, userId, cabinetMembers) {
  // Clients send activeCounselorId: 'cabinet' for the group thread and the
  // counselor's slug for a 1:1 chat. Any explicit slug is single mode: the
  // client supplies that counselor's own system prompt. (This used to be an
  // allowlist of seven ids, so a 1:1 with any other counselor answered in
  // the group's voices.)
  const isSingleMode = typeof activeCounselorId === 'string'
    && activeCounselorId.length > 0
    && activeCounselorId !== 'cabinet';

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

  const fullRoster = await getCabinetRoster();
  const roster = filterRosterToCabinet(fullRoster, cabinetMembers);
  if (roster.length < fullRoster.length) {
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
const BUILTIN_COUNSELOR_ALIAS_COUNT = COUNSELOR_ALIASES.length;

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
// extras.allVoices is appended to every voice; extras.lastVoice only to the
// last voice of the turn (the one that closes it: an ask, an offer).
async function fireParallelCounselors(question, counselors, history, contextChunks, checkInContext, priorResponses, counselorModels = {}, sharedContext = '', tier = 'free', maxTokensPerVoice = 800, extras = {}) {
  const voiceGuard = `\n\nIMPORTANT: You are speaking as yourself only. Never write words for another Cabinet member or imitate their voice. You may briefly react to what a colleague has already said in this turn — agree, sharpen, or push back, addressing them by name — but the response is yours alone.`;

  const lengthGuard = `\n\nLength: You are one voice in a Cabinet of counselors. Keep your response to 2-3 short paragraphs maximum. Be direct. Leave room for the conversation to continue. Do not summarize, do not wrap up, do not deliver a closing thought. Speak and stop.`;

  const toneGuard = `\n\nTone: This is a spoken conversation among people in a room, not an exchange of essays. Use contractions. Address the user directly. Do not restate their question back to them. If one sharp sentence is the best response, give one sharp sentence and stop.`;

  // Shelf catalog: lets every counselor answer truthfully when asked whether
  // a specific work is in the library, beyond the few chunks retrieved above.
  const catalogBlock = await getLibraryCatalogBlock();

  const contextBlock = (contextChunks.length > 0
    ? `\n\n[CONTEXT]\n${contextChunks.map(c => `${c.author ?? ''}, ${c.work ?? 'Corpus'}:\n${c.chunk_text ?? ''}`).join('\n\n---\n\n')}\n[END CONTEXT]`
    : '') + catalogBlock + voiceGuard + lengthGuard + toneGuard + (sharedContext || '') + SELF_KNOWLEDGE + (await getObservatoryPulseBlock());

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

  for (const [voiceIndex, counselor] of counselors.entries()) {
    const colleagues = [...seedColleagues, ...results.filter(r => !r.error)];
    const voiceExtras = (extras.allVoices || '') + (voiceIndex === counselors.length - 1 ? (extras.lastVoice || '') : '');
    const colleaguesBlock = colleagues.length > 0
      ? `\n\n[WHAT YOUR COLLEAGUES SAID]\nThe following counselors have already spoken in this turn. You are speaking after them. Do not repeat their points. You may briefly react to one of them by name — agree, sharpen, or push back in a sentence — then add what only you can add.\n${colleagues.map(r => `${r.counselorName}:\n${r.response}`).join('\n\n')}\n[END COLLEAGUE RESPONSES]`
      : '';

    const model = resolveModelForTier(tier, counselorModels[counselor.id]);
    const t0 = Date.now();
    try {
      const { text, stopReason } = await callCounselorModel({
        model,
        system: counselor.systemPrompt + contextBlock + checkInBlock + colleaguesBlock + voiceExtras,
        messages,
        maxTokens: maxTokensPerVoice,
      });
      const responseText = finishTruncatedReply(text, stopReason, `Cabinet/${counselor.id}`);
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
    mode: retrievalMode(),
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
    mode: retrievalMode(),
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

  // Every getStoicContext caller speaks as a person or as the tradition
  // (Oracle, /ask, /v1/chat/completions, library debate, margin note), so
  // this is a counselor path: fenced (server/lib/corpus-fence.js).
  const { data: chunks, error } = await supabase.rpc('match_rag_corpus', {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_author: authorFilter || null,
    filter_language: 'english',
    ...counselorRetrievalParams(),
  });

  if (error) throw new Error(`RAG retrieval failed: ${error.message}`);
  observatory.recordRetrieval(chunks || [], 'oracle'); // fire-and-forget log
  // Phase B: Hebbian expansion for every getStoicContext caller (no-op
  // unless GRAPH_BOOST=true).
  return (await expandCandidates(chunks || [], topK, { fence: isCounselorVisible }))
    .rows.filter(isCounselorVisible);
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

// Admin only. Crash reports carry stack traces and launch ids; the POST stays
// open for clients, the read side does not.
app.get('/api/crash', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'unauthorized' });
  if (!(await isAdmin(user.id))) return res.status(403).json({ error: 'forbidden' });

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

    // 2. VALIDATE INPUT
    const { question, author, history } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question is required' });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'question must be 500 characters or fewer' });
    }

    // 3. DAILY QUOTA — free 5, Premium 50, Pro unlimited; keyed by the
    //    signed-in user when a Bearer JWT is present, else by IP.
    const quota = await consumeSymposiumQuota(req, res);
    if (!quota.allowed) return;
    const remaining = quota.remaining;

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
      mode: retrievalMode(),
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
[END CORPUS]${SELF_KNOWLEDGE}${await getObservatoryPulseBlock()}`;

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
    return res.json({ answer, sources, remaining, limit: quota.limit, tier: quota.tier, request_id: requestId });

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

// POST /api/admin/broadcasts/deliver — run the counselor-broadcast delivery
// agent on demand (admin only), instead of waiting for the hourly cron. Used
// by the admin Broadcasts tab's "Send now": the composer has already written
// the rows, this pushes the notifications for whoever is at their send hour.
// Idempotent — each delivery row moves out of 'pending' exactly once.
app.post('/api/admin/broadcasts/deliver', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server not configured for broadcast delivery' });
    }

    const totals = await runBroadcastDelivery();
    return res.json({ ok: true, ...totals });
  } catch (err) {
    console.error('[/api/admin/broadcasts/deliver] error:', err.message);
    return res.status(500).json({ error: err.message || 'Delivery failed' });
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

// POST /api/admin/quality-audit/run — run the nightly Quality Audit on demand
// (admin only). Same fire-and-return shape as the reflection trigger: the audit
// reads a sample of the corpus through Claude and can take a minute, longer
// than the Vercel proxy in front of this endpoint will wait, so start it,
// return 202, and let the Quality tab reload once the report row lands.
//
// The repo domain is dropped here whatever the caller asks for. Its probes need
// a checkout, this service is rooted at server/, and a probe that skips is
// recorded as skipped — so including it would write a report whose domain
// coverage claims more than it checked, and the night-to-night diff is keyed on
// that coverage.
let qualityAuditRunning = false;
app.post('/api/admin/quality-audit/run', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server not configured for the quality audit' });
    }
    if (qualityAuditRunning) {
      return res.status(409).json({ error: 'A quality audit run is already in progress' });
    }

    const requested = Array.isArray(req.body?.domains) ? req.body.domains : ['corpus', 'library', 'material'];
    const domains = requested.filter(d => d !== 'repo');
    if (!domains.length) {
      return res.status(400).json({ error: 'No runnable domains — repo probes need a checkout this service does not have.' });
    }

    qualityAuditRunning = true;
    runQualityAudit(['--domains', domains.join(',')])
      .then(result => {
        console.log('[/api/admin/quality-audit/run] finished:', JSON.stringify(result.counts || {}));
      })
      .catch(err => {
        console.error('[/api/admin/quality-audit/run] run failed:', err.message);
      })
      .finally(() => {
        qualityAuditRunning = false;
      });

    return res.status(202).json({ ok: true, started: true, domains });
  } catch (err) {
    qualityAuditRunning = false;
    console.error('[/api/admin/quality-audit/run] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start the quality audit' });
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
    runJournalAnalysis({ manual: true })
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

// POST /api/admin/interlocutor-profile/run — derive Interlocutor writing
// profiles on demand (admin only) instead of waiting for the daily cron.
// Awaited so the caller gets the summary { eligible, skipped, updated,
// unchanged, failures }; `unchanged` explains why an eligible user did not move
// (no new critiques since last derivation). Optional { force: true } re-derives
// every eligible user regardless — used after a prompt change. Idempotent: one
// living row per user.
let interlocutorProfileRunning = false;
app.post('/api/admin/interlocutor-profile/run', async (req, res) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Server not configured for the writing profile agent' });
    }
    if (interlocutorProfileRunning) {
      return res.status(409).json({ error: 'A writing profile run is already in progress' });
    }

    const force = req.body && req.body.force === true;
    interlocutorProfileRunning = true;
    try {
      const result = await runInterlocutorProfile({ force });
      return res.json({ ok: true, ...result });
    } finally {
      interlocutorProfileRunning = false;
    }
  } catch (err) {
    interlocutorProfileRunning = false;
    console.error('[/api/admin/interlocutor-profile/run] error:', err.message);
    return res.status(500).json({ error: err.message || 'Writing profile run failed' });
  }
});

// The on-demand agent triggers share one shape: admin gate, env pre-check
// (each agent process.exits on missing keys — must never happen in-process),
// overlap latch, fire-and-forget 202 (multi-candidate model calls can run for
// minutes; the tabs poll their pending lists).
//
// needsOpenAI defaults true because the thinking-chain agents (tension,
// inquiry, dreams) all embed. Consolidation does not — it only moves numbers
// and calls Anthropic — so requiring OPENAI_API_KEY there would refuse a run
// the agent could have completed. Name the missing keys in the response: the
// bare "not configured" string gave no way to tell which one was absent.
function makeAgentRunEndpoint(name, latch, runFn, { needsOpenAI = true } = {}) {
  return async (req, res) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });
      const missing = [
        ['SUPABASE_URL', process.env.SUPABASE_URL],
        ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
        ['CLAUDE_API_KEY', CLAUDE_API_KEY],
        ...(needsOpenAI ? [['OPENAI_API_KEY', process.env.OPENAI_API_KEY]] : []),
      ].filter(([, value]) => !value).map(([key]) => key);
      if (missing.length) {
        return res.status(500).json({
          error: `Server not configured for the ${name} agent: missing ${missing.join(', ')}`,
        });
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
app.post('/api/admin/consolidation/run', makeAgentRunEndpoint('consolidation', { running: false }, runConsolidationAgent, { needsOpenAI: false }));

// POST /api/admin/convergence/run — assemble convergences now instead of the
// (deferred) Monday 06:30 UTC cron. Embeds for selection + novelty, so OpenAI
// is required.
app.post('/api/admin/convergence/run', makeAgentRunEndpoint('convergence', { running: false }, runConvergenceAgent));

// POST /api/admin/stoic-replies/run — run the Stoic Reply Pipeline now
// (scout → safety gate → scoring → drafting) instead of the 6-hourly cron.
// Fills the review queue at /admin/stoic-replies; never posts anything.
app.post('/api/admin/stoic-replies/run', makeAgentRunEndpoint('stoic-replies', { running: false }, runStoicReplyAgent));

// ===========================================================================
// THE LIBRARY OF ARETE — public reading rooms over rag_corpus.
// Stoic-focused, but every primary text is viewable, readable, and discussable.
// All endpoints are public (no auth); the discuss/debate routes share the
// Oracle's 15/day IP rate limit.
// ===========================================================================

// The shelves change only when the corpus does, which is nightly, but this
// endpoint is public and both the app's Library tab and the web Library hit
// it on every visit. It was the app's most expensive query by total database
// time (1,241s over 712 calls) and timed out against the 8s statement limit;
// library_shelf() itself is now ~20ms after the excerpt cache, and this keeps
// the rest of the response — the overrides read and the pending-review count
// — off the path too. A minute is short enough that an admin sees a fresh
// ingest on the shelf almost at once, and long enough to absorb a crowd.
let libraryShelfCache = { payload: null, at: 0 };
const LIBRARY_SHELF_TTL_MS = 60 * 1000;

// GET /api/library/texts — the shelves: one entry per work, Stoic-flagged.
app.get('/api/library/texts', async (req, res) => {
  try {
    if (libraryShelfCache.payload && Date.now() - libraryShelfCache.at < LIBRARY_SHELF_TTL_MS) {
      return res.json(libraryShelfCache.payload);
    }

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
        textType: r.text_type,                                  // primary | scholarship | synthesis | modern_primary (others filtered below)
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
    // Concordances are editorial retrieval bridges, not works — no shelf.
    // Modern summaries are summaries of copyrighted work — no shelf. Modern
    // verbatim texts (Russell, Eddington, James) are readable public-domain
    // works and stay; the counselor catalog fences them separately.
    }).filter(t => !t.hidden && !['paper_summary', 'concordance', 'modern_summary'].includes(t.textType));

    // Count of syntheses awaiting admin review (not yet ingested, so not on a
    // shelf). Surfaced only to the admin in the UI as a jump to /admin/synthesis.
    const { count: pendingReview } = await supabase
      .from('synthesis_documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review');

    const payload = { texts, pendingReview: pendingReview || 0 };
    libraryShelfCache = { payload, at: Date.now() };
    return res.json(payload);
  } catch (err) {
    console.error('[/api/library/texts] error:', err.message);
    // A stale shelf beats no shelf: serve the last good payload if we have
    // one, so a database hiccup does not empty the Library.
    if (libraryShelfCache.payload) {
      console.warn('[/api/library/texts] serving the cached shelf after an error');
      return res.json(libraryShelfCache.payload);
    }
    return res.status(500).json({ error: 'Failed to load the shelves' });
  }
});

// GET /api/library/text?author=&work=&page= — full readable text, paginated by
// chunk range. Front/back matter (Gutenberg headers, licences, translators'
// prefaces and endnotes) is carried in rag_corpus with deprecated = true, so
// every read here filters on it; nothing is stripped by pattern.
const LIBRARY_PAGE_CHUNKS = 30;
app.get('/api/library/text', async (req, res) => {
  try {
    const author = (req.query.author || '').toString();
    const work = (req.query.work || '').toString();
    const page = Math.max(0, parseInt(req.query.page || '0', 10) || 0);
    if (!author || !work) {
      return res.status(400).json({ error: 'author and work are required' });
    }

    // Superseded ingests stay in the table with deprecated = true (the corpus
    // rule is deprecate, never delete); the reader must never show them.
    const { count, error: cErr } = await supabase
      .from('rag_corpus')
      .select('id', { count: 'exact', head: true })
      .eq('author', author)
      .eq('work', work)
      .eq('deprecated', false);
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
      .select('chunk_index, chunk_text, section_label, translator, source_url, edition_year, text_type')
      .eq('author', author)
      .eq('work', work)
      .eq('deprecated', false)
      .order('chunk_index', { ascending: true })
      .range(fetchFrom, to);
    if (error) throw error;
    let context = page > 0 ? (rows && rows[0] && rows[0].chunk_text) || null : null;
    const data = page > 0 ? (rows || []).slice(1) : (rows || []);
    // On the first page the first chunk shown usually follows deprecated front
    // matter, and its leading overlap duplicates that matter's tail. Fetch the
    // one row before it — deprecated or not — purely as trimming context. It
    // is never shown.
    if (page === 0 && data.length && data[0].chunk_index > 0) {
      const { data: prev } = await supabase
        .from('rag_corpus')
        .select('chunk_text')
        .eq('author', author)
        .eq('work', work)
        .eq('chunk_index', data[0].chunk_index - 1)
        .maybeSingle();
      context = (prev && prev.chunk_text) || null;
    }
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

    // Entry-chunked works (one canonical section per row) are formatted row
    // by row, which gives the paragraph each row starts at exactly. Stitched
    // works keep the overlap-stitching path and have theirs found by probe.
    // Either way the folio reports chunkStarts, and the outline's `chunk`
    // values index into it.
    let body;
    let chunkStarts = null;
    if (libraryHelpers.isEntryChunked(data)) {
      ({ body, chunkStarts } = libraryHelpers.formatEntries(data.map(c => c.chunk_text || '')));
    } else {
      // A stitched folio can say where each row begins too: stitching records
      // the offsets, and the rows are then located in the formatted text by
      // the words they open with. That is what lets the outline land on a
      // section, and the Contents panel follow the reader, for every work
      // rather than only the entry-chunked ones.
      const stitched = libraryHelpers.stitch(data.map(c => c.chunk_text || ''), context);
      body = libraryHelpers.formatReadable(libraryHelpers.stripGutenberg(stitched.text));
      chunkStarts = libraryHelpers.locateChunks(
        stitched.text, stitched.starts, body.split(/\n\n+/).filter(Boolean)
      );
    }

    return res.json({
      author,
      work,
      title: (ov && ov.title) || libraryHelpers.workTitle(work),
      era: (ov && ov.era) || libraryHelpers.era(author, work),
      tradition: (ov && ov.tradition) || libraryHelpers.tradition(author, data[0].text_type),
      translator: data[0].translator || null,
      sourceUrl: data[0].source_url || null,
      // The title page states the edition it is reading from. Only some rows
      // carry a year, so take the first the folio has rather than the first
      // row's, and let the page leave the line out when there is none.
      editionYear: (data.find(c => c.edition_year) || {}).edition_year || null,
      page,
      totalPages,
      totalPassages: total,
      body,
      // Position of this folio's first row within the work, and the paragraph
      // index each row on the folio begins at (null for stitched works).
      firstChunk: from,
      chunkStarts,
    });
  } catch (err) {
    console.error('[/api/library/text] error:', err.message);
    return res.status(500).json({ error: 'Failed to open the text' });
  }
});

// GET /api/widget/quote — the home-screen widget's daily line. Public, no
// auth (WidgetKit timeline providers fetch anonymously), deterministic per
// day so every refresh in a day shows the same line.
const WIDGET_QUOTES = [
  { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', author: 'Seneca' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', author: 'Epictetus' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'Begin at once to live, and count each separate day as a separate life.', author: 'Seneca' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'Man is not worried by real problems so much as by his imagined anxieties about real problems.', author: 'Epictetus' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'Confine yourself to the present.', author: 'Marcus Aurelius' },
  { text: 'Wealth consists not in having great possessions, but in having few wants.', author: 'Epictetus' },
  { text: 'He who fears death will never do anything worthy of a living man.', author: 'Seneca' },
  { text: 'The best revenge is to be unlike him who performed the injury.', author: 'Marcus Aurelius' },
  { text: 'Only the educated are free.', author: 'Epictetus' },
  { text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca' },
  { text: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.', author: 'Marcus Aurelius' },
  { text: 'Do not seek for things to happen the way you want them to; rather, wish that what happens happen the way it happens.', author: 'Epictetus' },
  { text: 'While we wait for life, life passes.', author: 'Seneca' },
  { text: 'If it is not right, do not do it. If it is not true, do not say it.', author: 'Marcus Aurelius' },
  { text: 'It is impossible for a man to learn what he thinks he already knows.', author: 'Epictetus' },
  { text: 'Hang on to your youthful enthusiasms; you will be able to use them better when you are older.', author: 'Seneca' },
  { text: 'When you arise in the morning, think of what a precious privilege it is to be alive.', author: 'Marcus Aurelius' },
  { text: 'Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.', author: 'Epictetus' },
  { text: 'Every night before going to sleep, we must ask ourselves: what weakness did I overcome today? What virtue did I acquire?', author: 'Seneca' },
  { text: 'The soul becomes dyed with the color of its thoughts.', author: 'Marcus Aurelius' },
  { text: 'Circumstances do not make the man; they only reveal him to himself.', author: 'Epictetus' },
  { text: 'As is a tale, so is life: not how long it is, but how good it is, is what matters.', author: 'Seneca' },
  { text: 'Dwell on the beauty of life. Watch the stars, and see yourself running with them.', author: 'Marcus Aurelius' },
  { text: 'Seek not the good in external things; seek it in yourself.', author: 'Epictetus' },
  { text: 'True happiness is to enjoy the present, without anxious dependence upon the future.', author: 'Seneca' },
];

app.get('/api/widget/quote', (req, res) => {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const quote = WIDGET_QUOTES[dayOfYear % WIDGET_QUOTES.length];
  res.set('Cache-Control', 'public, max-age=3600');
  return res.json(quote);
});

// GET /api/library/outline?author=&work= — a two-level table of contents with
// the reader page each entry begins on (pages are LIBRARY_PAGE_CHUNKS rows).
// Two sources, in order of preference:
//   1. section_label, when the ingest recorded one per chunk. Labels are chunk
//      ranges ("4.6–4.14", "15–16", "front matter"); the START of each range
//      is the unit the chunk opens in, and "book.chapter" splits into levels.
//   2. Otherwise the raw text, scanned for CHAPTER / BOOK / LETTER markers
//      (Montaigne, Plato, Aristotle carry no labels at all).
// Results are cached per work: the corpus for a work changes only on ingest.
const OUTLINE_CACHE = new Map();
const OUTLINE_TTL_MS = 6 * 60 * 60 * 1000;
app.get('/api/library/outline', async (req, res) => {
  try {
    const author = (req.query.author || '').toString();
    const work = (req.query.work || '').toString();
    if (!author || !work) {
      return res.status(400).json({ error: 'author and work are required' });
    }
    const cacheKey = `${author}::${work}`;
    const cached = OUTLINE_CACHE.get(cacheKey);
    if (cached && cached.at > Date.now() - OUTLINE_TTL_MS) return res.json(cached.payload);

    // Walk every chunk of the work (PostgREST caps a page at 1000 rows).
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from('rag_corpus')
        .select('chunk_index, section_label, chunk_text')
        .eq('author', author)
        .eq('work', work)
        .eq('deprecated', false)
        .order('chunk_index', { ascending: true })
        .range(offset, offset + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    const payload = libraryHelpers.buildOutline(rows, work, LIBRARY_PAGE_CHUNKS);
    OUTLINE_CACHE.set(cacheKey, { at: Date.now(), payload });
    return res.json(payload);
  } catch (err) {
    console.error('[/api/library/outline] error:', err.message);
    return res.status(500).json({ error: 'Failed to load the outline' });
  }
});

// GET /api/library/search?q=&author=&work= — plain-text search over the
// readable corpus. Scoped to one work it powers in-reader search; unscoped it
// searches the whole shelf. Each hit carries the reader page it lands on.
app.get('/api/library/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const author = (req.query.author || '').toString();
    const work = (req.query.work || '').toString();
    if (q.length < 3) {
      return res.status(400).json({ error: 'Search needs at least 3 characters' });
    }
    const esc = q.replace(/[\\%_]/g, '\\$&');
    let query = supabase
      .from('rag_corpus')
      .select('author, work, chunk_index, chunk_text, section_label')
      .ilike('chunk_text', `%${esc}%`)
      .eq('deprecated', false)
      .neq('text_type', 'paper_summary')
      .order('author', { ascending: true })
      .order('chunk_index', { ascending: true })
      .limit(20);
    if (author && work) query = query.eq('author', author).eq('work', work);
    const { data: rows, error } = await query;
    if (error) throw error;

    // Hidden works are off the shelf, so they must not surface in search.
    const { data: ovs } = await supabase
      .from('library_overrides').select('author, work, hidden').eq('hidden', true);
    const hidden = new Set((ovs || []).map(o => `${o.author}::${o.work}`));

    // Reader page = how many of the work's chunks precede this one. A few
    // works have gaps in chunk_index, so count rather than divide; the counts
    // are independent, so run them together.
    const shown = (rows || []).filter(r => !hidden.has(`${r.author}::${r.work}`));
    const counts = await Promise.all(shown.map(r =>
      supabase
        .from('rag_corpus')
        .select('id', { count: 'exact', head: true })
        .eq('author', r.author)
        .eq('work', r.work)
        .eq('deprecated', false)
        .lt('chunk_index', r.chunk_index)
        .then(({ count }) => count || 0)
        .catch(() => 0)
    ));
    const results = shown.map((r, i) => {
      const text = r.chunk_text || '';
      const at = text.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, at - 60);
      return {
        author: r.author,
        work: r.work,
        title: libraryHelpers.workTitle(r.work),
        section: r.section_label || null,
        page: Math.floor(counts[i] / LIBRARY_PAGE_CHUNKS),
        snippet: text.slice(start, start + 220).replace(/\s+/g, ' ').trim(),
      };
    });
    return res.json({ query: q, results });
  } catch (err) {
    console.error('[/api/library/search] error:', err.message);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/library/related — "reads itself alongside": semantic neighbors of
// an open text, drawn from a representative passage. Non-critical: failures
// return an empty list rather than erroring the reader.
// Library access model (2026-09-04):
//   • Reading the originals, related works, comments — free, no account needed.
//   • The Symposium (Oracle "sit" + Library debate) — free 5 dialogues/day,
//     Arete Premium 50/day, Pro unlimited.
//   • Asking the corpus to write in the margin (annotate) — Premium and Pro
//     only, drawing on the same daily quota.
// Quota is keyed by the verified user when a Bearer JWT is present, otherwise
// by IP, in the existing oracle_rate_limits table (ip_address is free text).

const SYMPOSIUM_LIMITS = { free: 5, premium: 50, pro: null };

async function resolveVerifiedTier(req) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return { userId: null, tier: 'free' };
  const { data, error } = await supabase
    .from('profiles')
    .select('tier, is_premium')
    .eq('id', userId)
    .single();
  if (error || !data) return { userId, tier: 'free' };
  return { userId, tier: normalizeTier(data.tier, data.is_premium) };
}

function symposiumLimitMessage(tier, limit) {
  if (tier === 'free') {
    return `You've reached your ${limit} free dialogues for today. Arete Premium members get ${SYMPOSIUM_LIMITS.premium} a day — or return tomorrow.`;
  }
  return `You've reached ${limit} dialogues for today. Return tomorrow.`;
}

// Consume one unit of the caller's daily Symposium quota. Returns
// { allowed, tier, limit, remaining, userId }; when !allowed the 429 has
// already been written. Fails open on a database error, as before.
async function consumeSymposiumQuota(req, res) {
  const { userId, tier } = await resolveVerifiedTier(req);
  const limit = Object.prototype.hasOwnProperty.call(SYMPOSIUM_LIMITS, tier) ? SYMPOSIUM_LIMITS[tier] : SYMPOSIUM_LIMITS.free;
  if (limit === null) return { allowed: true, tier, limit: null, remaining: null, userId };

  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ip = String(rawIp).split(',')[0].trim();
  const key = userId ? `user:${userId}` : ip;
  const { data: count, error } = await supabase.rpc('upsert_oracle_rate_limit', { p_ip: key });
  if (error) {
    console.error('[symposium quota] rate limit error:', error.message);
    return { allowed: true, tier, limit, remaining: null, userId };
  }
  if (count > limit) {
    // Anonymous (IP keyed) callers have no user id; logGateHit drops those.
    logGateHit(req, userId, 'symposium_daily_limit', 'daily_limit', { tier, limit });
    res.status(429).json({
      error: 'Daily limit reached',
      code: 'daily_limit',
      message: symposiumLimitMessage(tier, limit),
      tier,
      limit,
      remaining: 0,
      upgrade: tier === 'free',
    });
    return { allowed: false, tier, limit, remaining: 0, userId };
  }
  return { allowed: true, tier, limit, remaining: Math.max(0, limit - (count || 1)), userId };
}

app.post('/api/library/related', async (req, res) => {
  try {
    const { author, work } = req.body || {};
    if (!author || !work) return res.status(400).json({ error: 'author and work are required' });

    const { data: seed } = await supabase
      .from('rag_corpus')
      .select('chunk_text')
      .eq('author', author)
      .eq('work', work)
      .eq('deprecated', false)
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

    const quota = await consumeSymposiumQuota(req, res);
    if (!quota.allowed) return;
    const remaining = quota.remaining;

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
      limit: quota.limit,
      tier: quota.tier,
    });
  } catch (err) {
    console.error('[/api/library/debate] error:', err.message);
    return res.status(500).json({ error: 'The house could not convene. Please try again.' });
  }
});

// POST /api/library/annotate — the corpus weighs in on a passage as a note in
// the margin. A signed-in reader asks; the note is grounded in passages
// retrieved from OTHER works, names them in the prose, and is written into
// library_comments as a corpus note (is_corpus) that every reader then sees.
// Shares the Oracle's IP rate limit and the Pro gate with the other
// conversing routes. One bare corpus note per paragraph: asking again on the
// same paragraph without a quoted passage returns the note already there.
const CORPUS_HANDLE = 'The Corpus';
app.post('/api/library/annotate', async (req, res) => {
  try {
    if (!CLAUDE_API_KEY) return res.status(500).json({ error: 'Server not configured' });
    const { userId, tier: callerTier } = await resolveVerifiedTier(req);
    if (!userId) return res.status(401).json({ error: 'sign_in', message: 'Sign in to ask the corpus.' });
    if (callerTier === 'free') {
      logGateHit(req, userId, 'library_margin_note', 'premium_required', { tier: callerTier });
      return res.status(403).json({
        error: 'premium_required',
        message: 'Asking the corpus to write in the margin is an Arete Premium feature. Reading and commenting are always free.',
      });
    }

    const { author, work, page, paraIndex, anchorText, passage, quote, parentId } = req.body || {};
    if (!author || !work || typeof passage !== 'string' || passage.trim().length < 20) {
      return res.status(400).json({ error: 'author, work and a passage are required' });
    }
    const pg = Math.max(0, parseInt(page, 10) || 0);
    const pi = Math.max(0, parseInt(paraIndex, 10) || 0);
    const q = typeof quote === 'string' && quote.trim() ? quote.trim().slice(0, 600) : null;

    if (!q && !parentId) {
      const { data: existing } = await supabase
        .from('library_comments')
        .select('*')
        .eq('text_author', author).eq('text_work', work).eq('page', pg).eq('para_index', pi)
        .eq('is_corpus', true).is('parent_id', null).is('quote', null)
        .order('created_at', { ascending: true })
        .limit(1);
      if (existing && existing[0]) return res.json({ comment: existing[0], existing: true });
    }

    const quota = await consumeSymposiumQuota(req, res);
    if (!quota.allowed) return;
    const remaining = quota.remaining;

    const focus = (q || passage).replace(/\s+/g, ' ').trim().slice(0, 1400);
    const title = libraryHelpers.workTitle(work);
    const chunks = await getStoicContext(focus, 10, null).catch(() => []);
    const others = (chunks || []).filter(c => !(c.author === author && c.work === work)).slice(0, 5);
    const ctxBlock = others
      .map((c, i) => `[${i + 1}] ${c.author}, ${libraryHelpers.workTitle(c.work)}\n${String(c.chunk_text || '').slice(0, 900)}`)
      .join('\n\n');

    const system = `You are the Corpus of the Library of Arete: the whole tradition speaking as one reader who has the shelves by heart. A reader has marked a passage and asked what the corpus makes of it.

Write a marginal note of 90 to 160 words. Say plainly what the passage claims, then set it beside one or two other voices from the passages provided below: where another author agrees, sharpens, or pushes back. Name authors and works in the prose (for example: Seneca, in the Letters, says the same of grief). Stay grounded in the passages given and do not invent citations. You are writing in a shared margin for whoever reads next. If there is a tension, name it and leave it standing rather than resolving it. Do not use em dashes or en dashes anywhere; use commas, colons, or full stops instead. No headings, no lists, no markdown: plain prose only.

The passage, from ${author}, ${title}:
"""${focus}"""

Passages from elsewhere in the Library:
${ctxBlock || '(none retrieved; write from the passage alone and say that the shelves offered no close companion)'}`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system,
        messages: [{ role: 'user', content: 'What does the corpus make of this passage?' }],
      }),
    });
    if (!claudeRes.ok) {
      const t = await claudeRes.text();
      console.error('[/api/library/annotate] Claude error:', claudeRes.status, t);
      return res.status(502).json({ error: 'silent', message: 'The corpus is silent just now. Please try again.' });
    }
    const claudeData = await claudeRes.json();
    const body = String(claudeData.content?.[0]?.text || '')
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/\s+,/g, ',')
      .trim();
    if (!body) return res.status(502).json({ error: 'silent', message: 'The corpus is silent just now. Please try again.' });

    const { data: inserted, error: insErr } = await supabase
      .from('library_comments')
      .insert({
        text_author: author,
        text_work: work,
        page: pg,
        para_index: pi,
        anchor_text: String(anchorText || passage).slice(0, 120),
        quote: q,
        parent_id: parentId || null,
        user_id: null,
        handle: CORPUS_HANDLE,
        body,
        is_corpus: true,
        requested_by: userId,
        sources: others.map(c => ({ author: c.author, work: c.work, title: libraryHelpers.workTitle(c.work) })),
      })
      .select()
      .single();
    if (insErr) throw insErr;
    return res.json({ comment: inserted, remaining });
  } catch (err) {
    console.error('[/api/library/annotate] error:', err.message);
    return res.status(500).json({ error: 'failed', message: 'The corpus could not write just now. Please try again.' });
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
// Each carries the whole reading — the pursuit and where the corpus runs out —
// so the sidebar card can be opened and read in full without a second request.
// Public (no auth) — same posture as the other Observatory endpoints.
app.get('/api/observatory/inquiries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('open_inquiries')
      .select('id, question, question_origin, pursuit_text, where_corpus_runs_out, confidence, source_authors, pursuit_passages, inquiry_week')
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
        // The pursuit is the corpus's own attempt at the question — conjecture,
        // labelled as such wherever it is shown, never a source text.
        origin: r.question_origin || null,
        pursuit: r.pursuit_text || null,
        whereCorpusRunsOut: r.where_corpus_runs_out || null,
        authors: r.source_authors || [],
      };
    });

    return res.json({ inquiries });
  } catch (err) {
    console.error('[/api/observatory/inquiries] error:', err.message);
    return res.status(500).json({ error: 'The open inquiries could not be read' });
  }
});

// GET /api/observatory/convergences — the Convergence Agent's conclusions for
// the Observatory, under "The Corpus Concludes". Unlike inquiries/tensions,
// convergences have no observatory_visible flag: the review status IS the gate,
// so approved AND starred both surface (starred first, then most recent). Each
// is a conclusion the corpus ASSEMBLED, not a passage it holds — the frontend
// discloses that. Public (no auth) — same posture as the other endpoints.
app.get('/api/observatory/convergences', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('convergences')
      .select('id, title, conclusion_text, entailment_strength, novelty, source_authors, source_traditions, mean_pairwise_distance, pursuit_text, breakpoint_text, created_at, status')
      .in('status', ['approved', 'starred'])
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) throw error;

    // Starred convergences lead (Kyle marked them dispatch-worthy), then the
    // rest by recency.
    const convergences = (data || [])
      .map(r => ({
        id: r.id,
        title: r.title,
        conclusion: r.conclusion_text,
        entailment: r.entailment_strength,
        novelty: r.novelty,
        authors: Array.isArray(r.source_authors) ? r.source_authors : [],
        traditions: Array.isArray(r.source_traditions) ? r.source_traditions : [],
        spread: r.mean_pairwise_distance,
        pursuit: r.pursuit_text,
        breakpoint: r.breakpoint_text,
        starred: r.status === 'starred',
        created_at: r.created_at,
      }))
      .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));

    return res.json({ convergences });
  } catch (err) {
    console.error('[/api/observatory/convergences] error:', err.message);
    return res.status(500).json({ error: 'The convergences could not be read' });
  }
});

// GET /api/observatory/tensions — the Tension Agent's approved, publicly
// surfaced philosophical contradictions for the Observatory sidebar. Only
// tensions Kyle has approved AND marked observatory_visible are ever returned;
// most recent 4, each with its full statement, both poles and the lived stakes
// so the sidebar card can be opened and read in full.
// (The synthesis-sourced "awaiting review" tension cards in
// /api/library/observatory remain separate — these are the approved catalogue.)
// Public (no auth) — same posture as the other Observatory endpoints.
app.get('/api/observatory/tensions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('philosophical_tensions')
      .select('id, title, tension_statement, position_a, position_b, additional_positions, lived_stakes, tension_type, is_resolvable, resolution_note, source_authors, tension_week')
      .eq('status', 'approved')
      .eq('observatory_visible', true)
      .order('reviewed_at', { ascending: false })
      .limit(4);
    if (error) throw error;

    // A pole as the reader sees it: who holds it, where, and the steelmanned
    // summary. key_passages are internal chunk ids and never leave the server.
    const pole = p => (p && (p.author || p.position_summary))
      ? { author: p.author || null, work: p.work || null, summary: p.position_summary || null }
      : null;

    const tensions = (data || []).map(r => {
      // First sentence of the statement only — the CARD names the tension, it
      // does not argue it. The full statement rides alongside so the reader can
      // open the tension and read it whole without a second request.
      const firstSentence = (r.tension_statement || '').split(/(?<=[.!?])\s+/)[0] || '';
      const authors = [
        r.position_a?.author,
        r.position_b?.author,
      ].filter(Boolean);
      const positions = [
        pole(r.position_a),
        pole(r.position_b),
        ...(Array.isArray(r.additional_positions) ? r.additional_positions.map(pole) : []),
      ].filter(Boolean);
      return {
        id: r.id,
        title: r.title,
        firstSentence,
        authors: authors.length >= 2 ? authors : (r.source_authors || []).slice(0, 2),
        week: r.tension_week,
        statement: r.tension_statement || '',
        positions,
        livedStakes: r.lived_stakes || null,
        tensionType: r.tension_type || null,
        isResolvable: r.is_resolvable || null,
        // Only meaningful when the tension is apparent_only / terminological.
        resolutionNote: r.resolution_note || null,
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
      .select('id, observation_week, dominant_signal, corpus_response, world_signals, world_corpus_tension, relevant_authors')
      .in('status', ['approved', 'auto_approved'])
      .eq('observatory_visible', true)
      .order('observation_week', { ascending: false })
      .limit(1);
    if (error) throw error;

    const row = (data || [])[0];
    if (!row) return res.json({ world: null });

    // The other signals the agent weighed before settling on the dominant one —
    // named only, so the reader can see what the week actually held.
    const signals = (Array.isArray(row.world_signals) ? row.world_signals : [])
      .map(s => (s && s.signal)
        ? { signal: s.signal, category: s.source_category || null }
        : null)
      .filter(Boolean)
      .slice(0, 6);

    return res.json({
      world: {
        id: row.id,
        dominantSignal: row.dominant_signal,
        // The agent's actual answer (400-600 words). The card teases the signal;
        // this is what the reader opens the card to read.
        response: row.corpus_response || null,
        signals,
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

// GET /api/observatory/piece/:kind/:id — one Observatory piece for a share
// link. Same visibility rules and the same shape as the feed it came from,
// so a shared piece is readable long after it has scrolled out of the
// feed's window. Kinds: tension | inquiry | dream | convergence | world.
// Public (no auth) — same posture as the feeds; only approved, visible rows.
const OBS_PIECE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadObservatoryPiece(kind, id) {
  if (kind === 'tension') {
    const { data } = await supabase
      .from('philosophical_tensions')
      .select('id, title, tension_statement, position_a, position_b, additional_positions, lived_stakes, tension_type, is_resolvable, resolution_note, source_authors, tension_week')
      .eq('id', id).eq('status', 'approved').eq('observatory_visible', true)
      .maybeSingle();
    if (!data) return null;
    const pole = p => (p && (p.author || p.position_summary))
      ? { author: p.author || null, work: p.work || null, summary: p.position_summary || null }
      : null;
    const authors = [data.position_a?.author, data.position_b?.author].filter(Boolean);
    return {
      id: data.id,
      title: data.title,
      firstSentence: (data.tension_statement || '').split(/(?<=[.!?])\s+/)[0] || '',
      authors: authors.length >= 2 ? authors : (data.source_authors || []).slice(0, 2),
      week: data.tension_week,
      statement: data.tension_statement || '',
      positions: [pole(data.position_a), pole(data.position_b), ...(Array.isArray(data.additional_positions) ? data.additional_positions.map(pole) : [])].filter(Boolean),
      livedStakes: data.lived_stakes || null,
      tensionType: data.tension_type || null,
      isResolvable: data.is_resolvable || null,
      resolutionNote: data.resolution_note || null,
    };
  }
  if (kind === 'inquiry') {
    const { data } = await supabase
      .from('open_inquiries')
      .select('id, question, question_origin, pursuit_text, where_corpus_runs_out, confidence, source_authors, pursuit_passages, inquiry_week')
      .eq('id', id).eq('status', 'approved').eq('observatory_visible', true)
      .maybeSingle();
    if (!data) return null;
    const pursuitAuthors = Array.isArray(data.pursuit_passages)
      ? new Set(data.pursuit_passages.map(p => p && p.author).filter(Boolean)).size
      : 0;
    return {
      id: data.id,
      question: data.question,
      confidence: data.confidence,
      authorCount: pursuitAuthors || (data.source_authors || []).length,
      week: data.inquiry_week,
      origin: data.question_origin || null,
      pursuit: data.pursuit_text || null,
      whereCorpusRunsOut: data.where_corpus_runs_out || null,
      authors: data.source_authors || [],
    };
  }
  if (kind === 'dream') {
    const { data } = await supabase
      .from('corpus_dreams')
      .select('id, dream_type, title, content, seed_authors, seed_summary, status, dream_week')
      .eq('id', id).in('status', ['approved', 'starred']).eq('observatory_visible', true)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      dreamType: data.dream_type,
      title: data.title,
      content: data.content,
      seedAuthors: data.seed_authors || [],
      seedSummary: data.seed_summary || null,
      starred: data.status === 'starred',
      dreamWeek: data.dream_week || null,
    };
  }
  if (kind === 'convergence') {
    const { data } = await supabase
      .from('convergences')
      .select('id, title, conclusion_text, entailment_strength, novelty, source_authors, source_traditions, mean_pairwise_distance, pursuit_text, breakpoint_text, created_at, status')
      .eq('id', id).in('status', ['approved', 'starred'])
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      title: data.title,
      conclusion: data.conclusion_text,
      entailment: data.entailment_strength,
      novelty: data.novelty,
      authors: Array.isArray(data.source_authors) ? data.source_authors : [],
      traditions: Array.isArray(data.source_traditions) ? data.source_traditions : [],
      spread: data.mean_pairwise_distance,
      pursuit: data.pursuit_text,
      breakpoint: data.breakpoint_text,
      starred: data.status === 'starred',
      created_at: data.created_at,
    };
  }
  if (kind === 'world') {
    const { data } = await supabase
      .from('world_observations')
      .select('id, observation_week, dominant_signal, corpus_response, world_signals, world_corpus_tension, relevant_authors')
      .eq('id', id).in('status', ['approved', 'auto_approved']).eq('observatory_visible', true)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      dominantSignal: data.dominant_signal,
      response: data.corpus_response || null,
      signals: (Array.isArray(data.world_signals) ? data.world_signals : [])
        .map(sg => (sg && sg.signal) ? { signal: sg.signal, category: sg.source_category || null } : null)
        .filter(Boolean).slice(0, 6),
      tension: data.world_corpus_tension,
      authors: data.relevant_authors || [],
      week: data.observation_week,
    };
  }
  return null;
}

app.get('/api/observatory/piece/:kind/:id', async (req, res) => {
  const { kind, id } = req.params;
  if (!['tension', 'inquiry', 'dream', 'convergence', 'world'].includes(kind) || !OBS_PIECE_ID_RE.test(id || '')) {
    return res.status(404).json({ error: 'No such piece' });
  }
  try {
    const piece = await loadObservatoryPiece(kind, id);
    if (!piece) return res.status(404).json({ error: 'No such piece' });
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ kind, piece });
  } catch (err) {
    console.error('[/api/observatory/piece] error:', err.message);
    return res.status(500).json({ error: 'The piece could not be read' });
  }
});

// The Agora's counselor-answer pipeline borrows this file's helpers rather
// than duplicating them. Wired here, after every const it needs is defined.
agora.init({
  getAuthenticatedUserId,
  isAdmin,
  getStoicContext,
  callCounselorModel,
  cabinetCounselors: CABINET_COUNSELORS,
  slugToCounselorId: SLUG_TO_COUNSELOR_ID,
  claudeApiKey: CLAUDE_API_KEY,
});

enchiridion.init({
  getAuthenticatedUserId,
  isAdmin,
  resend,
  fromEmail: INVITE_FROM_EMAIL,
  adminEmail: CONTACT_TO_EMAIL,
  webAppUrl: WEB_APP_URL,
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (CLAUDE_API_KEY) {
    console.log('CLAUDE_API_KEY is configured');
  } else {
    console.warn('WARNING: CLAUDE_API_KEY is not set');
  }
});
