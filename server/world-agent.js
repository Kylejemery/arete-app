// server/world-agent.js
//
// The World Agent — the first OUTWARD-facing agent in the Arete AI Agent System.
// Every other agent reads inward: the corpus, the users, the system itself. The
// World Agent reads the world and brings it back into philosophical conversation.
//
// It runs in three passes, once a week:
//   Pass 1 — World signal gathering. One Anthropic call with the web_search tool
//            enabled, over a curated set of philosophically-relevant categories.
//            The agent does not browse news/social — it surfaces only what
//            genuinely matters philosophically.
//   Pass 2 — Dominant-signal selection + corpus response. The signal with the
//            richest connection to the existing corpus is chosen (scored against
//            real rag_corpus retrieval), 10 passages across ≥3 authors are
//            retrieved, and Claude (no tools) writes the philosophical response,
//            the world/corpus tension, and a tight dispatch digest.
//   Pass 3 — Storage. Purely-scientific findings about wellbeing/behavior
//            auto-approve (low political sensitivity) and flow straight into
//            that day's Daily Dispatch; political/death/contested signals wait
//            for Kyle's review before their dispatch_context is used.
//
// Runs Mondays 03:30 UTC — before the other agents and the 10:00 UTC dispatch,
// so an auto-approved observation is available to that morning's generation.
//
// Standalone script (its own Railway cron service). Mirrors the other agents:
// raw fetch to OpenAI (embeddings) and Anthropic (generation + web search), no
// SDKs. Idempotent — upserts one observation per observation_week.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Authors well-represented in the corpus. A signal that retrieves these is
// preferred as the dominant one — the tradition has the most to say about it.
const WELL_REPRESENTED = new Set([
  'Marcus Aurelius', 'Epictetus', 'Seneca', 'Musonius Rufus',
  'Confucius', 'Montaigne', 'Plato', 'Aristotle',
]);

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the other agents.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'world-agent')
    .maybeSingle();

  return data?.config || {
    enabled: true,
    run_hour_utc: 3,
    run_minute_utc: 30,
    run_day: 'monday',
    model: DEFAULT_MODEL,
    signals_per_category: 2,
    corpus_retrieval_count: 10,
    corpus_response_max_words: 600,
    dispatch_context_max_words: 150,
    auto_approve_scientific_signals: true,
  };
}

// --- Anthropic helpers -----------------------------------------------------

async function anthropic(body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Concatenate every text block Claude emitted (web-search turns interleave
// server_tool_use / web_search_tool_result blocks we don't want).
function textOf(content) {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}

// Pull the last JSON value (array or object) out of a blob of prose. Handles
// ```json fences and trailing narration around the structured payload.
function extractJson(raw) {
  if (!raw) return null;
  const fenced = raw.match(/```json\s*([\s\S]*?)```/gi);
  if (fenced && fenced.length) {
    const body = fenced[fenced.length - 1].replace(/```json|```/gi, '').trim();
    try { return JSON.parse(body); } catch { /* fall through */ }
  }
  // Otherwise scan for the last balanced [ ... ] or { ... }.
  for (const [open, close] of [['[', ']'], ['{', '}']]) {
    const start = raw.indexOf(open);
    const end = raw.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* try next */ }
    }
  }
  return null;
}

// --- Pass 1: World signal gathering (web search) ---------------------------

function buildSearchPrompt(signalsPerCategory) {
  return `Search for recent developments (last 7 days) in the following categories that have philosophical relevance — things that connect to questions of how to live, what matters, what virtue requires, what it means to be human:

1. Scientific findings about human behavior, wellbeing, attention, or meaning
2. Cultural moments that reveal something about what people are collectively struggling with or reaching for
3. Political or social events that raise questions about justice, courage, or civic virtue
4. Technological developments that challenge how we think about autonomy, attention, or identity
5. Deaths of notable thinkers, practitioners, or exemplars

For each category, find 1-${signalsPerCategory} signals. Be selective. Surface only what genuinely matters philosophically — not what is merely trending.

When you are done searching, respond with a single JSON array (and nothing after it) of the signals you found. Each element must be an object with exactly these fields:
{
  "signal": "what happened — 1-2 factual sentences",
  "source_category": "the category name from the list above",
  "category": "one of: scientific | cultural | political | technological | death",
  "philosophical_relevance": "one sentence on why it matters philosophically",
  "tradition": "the philosophical tradition it speaks to most directly"
}

Output the JSON array inside a \`\`\`json code block.`;
}

// Runs the web-search call, resuming through any pause_turn cycles, and returns
// the parsed signals array. Empty array if nothing parseable came back.
async function gatherWorldSignals(config) {
  const messages = [{ role: 'user', content: buildSearchPrompt(config.signals_per_category || 2) }];
  let lastContent = [];

  for (let i = 0; i < 4; i++) { // bound the server-tool continuation loop
    const data = await anthropic({
      model: config.model || DEFAULT_MODEL,
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
      messages,
    });
    lastContent = data.content || [];
    if (data.stop_reason === 'pause_turn') {
      // Server tool loop paused — echo the assistant turn back to resume.
      messages.push({ role: 'assistant', content: lastContent });
      continue;
    }
    break;
  }

  const parsed = extractJson(textOf(lastContent));
  const signals = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.signals) ? parsed.signals : []);
  // Normalize + drop anything missing the essentials.
  return signals
    .filter(s => s && s.signal)
    .map(s => ({
      signal: String(s.signal).trim(),
      source_category: String(s.source_category || '').trim(),
      category: String(s.category || '').toLowerCase().trim(),
      philosophical_relevance: String(s.philosophical_relevance || '').trim(),
      tradition: String(s.tradition || '').trim(),
    }));
}

// --- Corpus retrieval ------------------------------------------------------

async function embed(text) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      console.error(`  embedding failed (${res.status})`);
      return null;
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    console.error('  embedding error:', e.message);
    return null;
  }
}

// Retrieve the most relevant corpus passages for a query string, deduped so at
// least `minAuthors` distinct voices are represented, capped at `count`.
async function retrievePassages(queryText, count, minAuthors = 3) {
  const embedding = await embed(queryText);
  if (!embedding) return [];

  // match_rag_corpus_ids(query_embedding, match_count, filter_language DEFAULT 'english')
  // -> { id, chunk_text, author, work, similarity }. Over-fetch, then diversify.
  const { data: rows } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: Math.max(count * 3, 24),
  });
  const passages = rows || [];

  // First pass: one per author (breadth). Second pass: fill remaining slots by
  // similarity. Guarantees ≥ minAuthors voices when the corpus allows it.
  const seenAuthors = new Set();
  const picked = [];
  for (const p of passages) {
    if (picked.length >= count) break;
    if (!seenAuthors.has(p.author)) { seenAuthors.add(p.author); picked.push(p); }
  }
  for (const p of passages) {
    if (picked.length >= count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return { passages: picked, distinctAuthors: seenAuthors.size, minAuthors };
}

// Score a signal by how richly the corpus can respond to it: distinct voices,
// a bonus for well-represented authors, and top-match similarity.
function scoreRetrieval(passages) {
  if (!passages.length) return -1;
  const authors = new Set(passages.map(p => p.author));
  const tierHits = [...authors].filter(a => WELL_REPRESENTED.has(a)).length;
  const avgSim = passages.slice(0, 5).reduce((s, p) => s + (p.similarity || 0), 0) / Math.min(5, passages.length);
  return authors.size + tierHits * 1.5 + avgSim;
}

// --- Pass 2: dominant selection + corpus response --------------------------

async function selectDominantSignal(signals, retrievalCount) {
  let best = null;
  for (const signal of signals) {
    const { passages } = await retrievePassages(signal.signal, retrievalCount);
    const score = scoreRetrieval(passages);
    if (!best || score > best.score) best = { signal, passages, score };
  }
  return best; // { signal, passages, score } | null
}

const RESPONSE_SYSTEM_PROMPT = `You are the philosophical voice of the Arete corpus, responding to what is happening in the world right now.

Your job is not commentary. It is not analysis. It is philosophical response — what does the tradition have to say about this specific moment? Not in general. Not as abstraction. As a direct response to something that is actually happening.

You write with the corpus behind you. Every claim is grounded in specific thinkers and texts. You do not pretend the tradition has easy answers when it does not. You surface tension where it exists between what the world is doing and what philosophy recommends.

Your tone: serious, warm, direct. You are writing to someone who is trying to live well in the middle of the world as it actually is — not as it should be.`;

function buildResponseUserMessage(dominantSignal, passages, config) {
  const passagesText = passages.map(p =>
    `${p.author} — ${p.work}: "${(p.chunk_text || '').substring(0, 400)}"`
  ).join('\n\n');

  return `This week in the world: ${dominantSignal}

Relevant passages from the corpus:
${passagesText}

Produce:
1. corpus_response: 400-${config.corpus_response_max_words || 600} words — what does the philosophical tradition have to say about this? Ground every claim in the passages provided. End with one concrete practice this week in light of what is happening.
2. world_corpus_tension: 2-3 sentences — where does the world this week push back against or complicate what the corpus teaches? Be honest where the tradition does not have a clean answer.
3. dispatch_context: 100-${config.dispatch_context_max_words || 150} words — a tight, vivid digest of the dominant signal for use in Daily Dispatch generation. Written as present-tense context: "This week, [what is happening]. Philosophy has something to say about this..."

Respond ONLY with valid JSON:
{
  "corpus_response": "string",
  "world_corpus_tension": "string",
  "dispatch_context": "string"
}`;
}

async function generateCorpusResponse(dominantSignal, passages, config) {
  const data = await anthropic({
    model: config.model || DEFAULT_MODEL,
    max_tokens: 3000,
    system: RESPONSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildResponseUserMessage(dominantSignal, passages, config) }],
  });
  const parsed = extractJson(textOf(data.content));
  if (!parsed || !parsed.corpus_response) {
    throw new Error('Corpus response did not return valid JSON');
  }
  return {
    corpus_response: String(parsed.corpus_response),
    world_corpus_tension: String(parsed.world_corpus_tension || ''),
    dispatch_context: String(parsed.dispatch_context || ''),
  };
}

// --- Main ------------------------------------------------------------------

async function runWorldAgent() {
  const startTime = Date.now();
  console.log(`=== World Agent — ${new Date().toISOString()} ===`);
  console.log('[world-agent] Monday 03:30 UTC run started');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set — corpus retrieval is impossible; aborting.');
    process.exit(1);
  }

  const config = await getAgentConfig();
  if (!config.enabled) {
    console.log('World agent disabled in config. Exiting.');
    return { disabled: true };
  }

  const observationWeek = getMondayOfCurrentWeek();

  // Pass 1 — gather signals.
  const signals = await gatherWorldSignals(config);
  const categories = new Set(signals.map(s => s.category).filter(Boolean));
  console.log(`[world-agent] Web search complete — ${signals.length} signals gathered across ${categories.size} categories`);
  if (!signals.length) {
    console.error('[world-agent] No signals gathered — nothing to observe this week. Exiting.');
    return { skipped: 'no_signals' };
  }

  // Pass 2 — pick the dominant signal (richest corpus connection) + respond.
  const dominant = await selectDominantSignal(signals, config.corpus_retrieval_count || 10);
  if (!dominant || !dominant.passages.length) {
    console.error('[world-agent] No corpus grounding for any signal — cannot respond. Exiting.');
    return { skipped: 'no_grounding' };
  }
  const dom = dominant.signal;
  console.log(`[world-agent] Dominant signal selected: ${dom.signal.slice(0, 90)}`);

  const relevantAuthors = [...new Set(dominant.passages.map(p => p.author))].slice(0, 6);
  const relevantPassages = dominant.passages.map(p => ({
    id: p.id, author: p.author, work: p.work,
    text: (p.chunk_text || '').substring(0, 400), similarity: p.similarity,
  }));

  const generated = await generateCorpusResponse(dom.signal, dominant.passages, config);
  const wordCount = generated.corpus_response.split(/\s+/).filter(Boolean).length;
  console.log(`[world-agent] Corpus response generated | Authors: ${relevantAuthors.join(', ')} | ${wordCount} words`);

  // Pass 3 — status. Purely-scientific wellbeing/behavior findings auto-approve
  // (low political sensitivity) and reach the dispatch immediately. Political,
  // death, and contested cultural signals wait for Kyle's review.
  const autoApprove = !!config.auto_approve_scientific_signals && dom.category === 'scientific';
  const status = autoApprove ? 'auto_approved' : 'pending_review';
  if (autoApprove) {
    console.log('[world-agent] Status: auto_approved (scientific signal — low political sensitivity, injected into dispatch)');
  } else {
    console.log(`[world-agent] Status: pending_review (${dom.category || 'non-scientific'} signal — requires Kyle review)`);
  }

  const row = {
    observation_week: observationWeek,
    world_signals: signals,
    dominant_signal: dom.signal,
    corpus_response: generated.corpus_response,
    relevant_passages: relevantPassages,
    relevant_authors: relevantAuthors,
    world_corpus_tension: generated.world_corpus_tension,
    dispatch_context: generated.dispatch_context,
    status,
    reviewed_at: autoApprove ? new Date().toISOString() : null,
    observatory_visible: false, // Kyle enables this explicitly in the admin.
    model_used: config.model || DEFAULT_MODEL,
    generated_at: new Date().toISOString(),
    generation_duration_ms: Date.now() - startTime,
  };

  const { data: stored, error } = await supabase
    .from('world_observations')
    .upsert(row, { onConflict: 'observation_week' })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to store observation: ${error.message}`);

  console.log(`[world-agent] Observation saved. ID: ${stored.id}`);
  console.log(`Run time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  return {
    id: stored.id,
    observationWeek,
    dominantSignal: dom.signal,
    signalsGathered: signals.length,
    relevantAuthors,
    status,
  };
}

module.exports = {
  getMondayOfCurrentWeek,
  getAgentConfig,
  gatherWorldSignals,
  retrievePassages,
  selectDominantSignal,
  generateCorpusResponse,
  runWorldAgent,
};

if (require.main === module) {
  runWorldAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
