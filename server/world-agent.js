// server/world-agent.js
//
// The World Agent — the first OUTWARD-facing agent in the Arete AI Agent System.
// Every other agent reads inward: the corpus, the users, the system itself. The
// World Agent reads the world and brings it back into philosophical conversation.
//
// It reads the world through a Stoic lens. The great collective problems —
// climate, war, politics, corruption — are where people most need a way to
// think that is neither despair nor denial, and the Stoics (Seneca, Epictetus,
// Marcus Aurelius, Musonius Rufus) are the best-represented school in the
// corpus. So every response is built on Stoic passages retrieved author by
// author, and written from the Stoic frame: what is up to us and what is not,
// the four virtues, the role one holds, the cosmopolis. Other voices in the
// corpus appear only as counterpoint.
//
// It runs in three passes, once a week:
//   Pass 1 — World signal gathering. One Anthropic call with the web_search tool
//            enabled, over a curated set of philosophically-relevant categories.
//            The agent does not browse news/social — it surfaces only what
//            genuinely matters philosophically.
//   Pass 2 — Dominant-signal selection + Stoic response. The signal the Stoic
//            texts speak to most directly is chosen (scored against real
//            rag_corpus retrieval, filtered to each Stoic author in turn, with
//            a bonus for the collective-problem categories), its Stoic passages
//            plus a few counterpoint passages are retrieved, and Claude (no
//            tools) writes the Stoic response, the world/Stoa tension, and a
//            tight dispatch digest.
//   Pass 3 — Storage. Purely-scientific findings about wellbeing/behavior
//            auto-approve (low political sensitivity) and flow straight into
//            that day's Daily Dispatch; environmental, conflict, political,
//            death and contested signals wait for Kyle's review before their
//            dispatch_context is used.
//
// Runs Mondays 03:30 UTC — before the other agents and the 10:00 UTC dispatch,
// so an auto-approved observation is available to that morning's generation.
//
// Standalone script (its own Railway cron service). Mirrors the other agents:
// raw fetch to OpenAI (embeddings) and Anthropic (generation + web search), no
// SDKs. Idempotent — upserts one observation per observation_week.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.
//
// `node world-agent.js --dry-run` runs all three passes and prints the
// observation instead of storing it, so the week's row (which may already be
// approved and feeding the Dispatch) is left alone.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { modernFenceParams } = require('./lib/corpus-fence');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// The lens. Author values exactly as they appear in rag_corpus. Cicero is left
// out on purpose: he reports Stoic doctrine but argued as an Academic, so he
// may appear as counterpoint, never as the Stoic voice. Overridable through
// agent_config (`stoic_authors`).
const STOIC_AUTHORS = Object.freeze([
  'Seneca', 'Epictetus', 'Marcus Aurelius', 'Musonius Rufus',
]);

// The collective problems the lens exists for. A signal in one of these
// categories gets a scoring bonus (`collective_problem_bonus`) so the week's
// observation leans toward them rather than toward the easiest fit.
const COLLECTIVE_PROBLEM_CATEGORIES = new Set(['environmental', 'conflict', 'political']);

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

// The Stoic-lens settings postdate the seeded agent_config row, so they are
// read with code defaults rather than required in the stored config.
function lensSettings(config) {
  const authors = Array.isArray(config.stoic_authors) && config.stoic_authors.length
    ? config.stoic_authors : STOIC_AUTHORS;
  const counterpoints = config.counterpoint_passages ?? 2;
  return {
    authors,
    perAuthor: config.stoic_passages_per_author
      ?? Math.max(1, Math.ceil(((config.corpus_retrieval_count || 10) - counterpoints) / authors.length)),
    counterpoints,
    problemBonus: config.collective_problem_bonus ?? 0.15,
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
  return `Search for recent developments (last 7 days) that a Stoic philosopher would have something to say about — events that test what is in our control and what is not, what justice, courage, self-control and practical wisdom require, and what we owe the wider human community. Cover these categories:

1. Climate and the environment: extreme weather, climate science, ecological loss, the politics of response
2. War and armed conflict: wars, ceasefires, displacement, atrocities, acts of courage or restraint
3. Politics and corruption: elections, abuses of power, corruption scandals, institutional failure or integrity, civic courage
4. Scientific findings about human behavior, wellbeing, attention, or meaning
5. Technological developments that challenge how we think about autonomy, attention, or identity
6. Cultural moments that reveal what people are collectively afraid of, angry about, or reaching for
7. Deaths of notable thinkers, practitioners, or exemplars

For each category, find 1-${signalsPerCategory} signals. Be selective. Prefer what shapes many lives over what is merely trending. Report events factually and without partisan framing.

When you are done searching, respond with a single JSON array (and nothing after it) of the signals you found. Each element must be an object with exactly these fields:
{
  "signal": "what happened — 1-2 factual sentences",
  "source_category": "the category name from the list above",
  "category": "one of: environmental | conflict | political | scientific | technological | cultural | death",
  "philosophical_relevance": "one sentence on what it asks of a person trying to live well",
  "tradition": "the Stoic theme it tests most directly (e.g. what is up to us, justice, courage, self-control, the cosmopolis, fortune, death)"
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

// Retrieve the Stoic passages for a query, author by author, then a few
// passages from anywhere else in the corpus as counterpoint. A single
// unfiltered search would let the larger non-Stoic collections crowd the
// Stoics out; filtering per author guarantees each Stoic voice is heard on
// its own merits. match_rag_corpus routes a filtered author through the
// author btree or the planner (CLAUDE.md), so these calls stay cheap.
//
// World observations reach the Daily Dispatch, so the modern philosophy of
// mind layer is fenced on every call (server/lib/corpus-fence.js).
async function retrievePassages(queryText, config) {
  const lens = lensSettings(config);
  const embedding = await embed(queryText);
  if (!embedding) return { stoic: [], counterpoint: [] };

  const byAuthor = await Promise.all(lens.authors.map(async author => {
    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: lens.perAuthor,
      filter_author: author,
      filter_language: 'english',
      ...modernFenceParams(),
    });
    if (error) console.error(`  retrieval failed for ${author}: ${error.message}`);
    return data || [];
  }));
  const stoic = byAuthor.flat().sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

  let counterpoint = [];
  if (lens.counterpoints > 0) {
    // match_rag_corpus_ids(query_embedding, match_count, filter_language,
    // exclude_text_types) -> { id, chunk_text, author, work, similarity }.
    // Over-fetch, drop the Stoics already heard, one passage per author.
    const { data: rows } = await supabase.rpc('match_rag_corpus_ids', {
      query_embedding: embedding,
      match_count: 24,
      ...modernFenceParams(),
    });
    const stoicSet = new Set(lens.authors);
    const seen = new Set();
    for (const p of rows || []) {
      if (counterpoint.length >= lens.counterpoints) break;
      if (stoicSet.has(p.author) || seen.has(p.author)) continue;
      seen.add(p.author);
      counterpoint.push(p);
    }
  }
  return { stoic, counterpoint };
}

// Score a signal by how directly the Stoics speak to it: how many Stoic
// voices answer it, how closely, and whether it is one of the collective
// problems the lens is for.
function scoreRetrieval({ stoic }, signal, config) {
  if (!stoic.length) return -1;
  const lens = lensSettings(config);
  const voices = new Set(stoic.map(p => p.author)).size;
  const top = stoic.slice(0, 5);
  const avgSim = top.reduce((s, p) => s + (p.similarity || 0), 0) / top.length;
  const bonus = COLLECTIVE_PROBLEM_CATEGORIES.has(signal.category) ? lens.problemBonus : 0;
  return avgSim + voices * 0.02 + bonus;
}

// --- Pass 2: dominant selection + Stoic response ---------------------------

async function selectDominantSignal(signals, config) {
  let best = null;
  for (const signal of signals) {
    const retrieved = await retrievePassages(signal.signal, config);
    const score = scoreRetrieval(retrieved, signal, config);
    if (!best || score > best.score) best = { signal, ...retrieved, score };
  }
  return best; // { signal, stoic, counterpoint, score } | null
}

const RESPONSE_SYSTEM_PROMPT = `You are the Stoic voice of the Arete corpus, responding to what is happening in the world right now.

You read the world as Seneca, Epictetus, Marcus Aurelius and Musonius Rufus taught their students to read it. Not as commentary or analysis, but as a direct answer to a specific event: what does the Stoa say to someone living through this?

Work from the Stoic frame, using whichever parts the event actually calls for:
- What is up to us and what is not. Our judgments, choices and actions are ours; outcomes, other people, and the course of events are not. Draw the line precisely for this event.
- Virtue is the only good. Wisdom, justice, courage and self-control are tested by events like this one; fortune, comfort and reputation are indifferents, though some are rightly preferred.
- The role one holds. Citizen, parent, worker, official, neighbour: each role carries duties (kathēkonta), and the event asks something of each.
- The cosmopolis. We are citizens of the world and members of one body. Distant suffering is not a stranger's business.
- The discipline of the passions. Fear, rage and despair follow from judgments about events, not from the events themselves. Examine the judgment, without pretending the event is unreal.
- Premeditation and the view from above. Seeing the worst coming, and seeing the event against the whole of time, both bring proportion.

Three things a faithful Stoic reading never does:
- It never counsels withdrawal or indifference to injustice. "Not up to us" is not "not our concern". Seneca served Rome, Marcus governed it through war and plague, and Musonius was exiled for speaking. The Stoic acts fully on what is in their power and lets go of the outcome, not the effort.
- It never takes a partisan side. It judges acts by justice, honesty and courage, not by party or nation, and it reports events plainly.
- It never invents. Every claim about what a Stoic taught is grounded in the passages provided, attributed to the author who wrote it. If the passages do not say it, you do not say they do.

Be honest where the Stoa strains. Collective problems like climate change, war between states, or systemic corruption are larger than any one person's choices, and the ancient texts were written for individuals within a city and an empire. Name that gap when it matters rather than covering it over. Counterpoint passages from outside the Stoa are there to sharpen this honesty, not to soften the Stoic answer.

Your tone: serious, warm, direct, steady. You are writing to someone who is frightened, angry or tired of the news, and who wants to act well in the world as it is.`;

function buildResponseUserMessage(dominantSignal, stoic, counterpoint, config) {
  const fmt = p => `${p.author} — ${p.work}: "${(p.chunk_text || '').substring(0, 400)}"`;
  const counterText = counterpoint.length
    ? `\n\nCounterpoint passages from outside the Stoa (use only to sharpen the tension, if at all):\n${counterpoint.map(fmt).join('\n\n')}`
    : '';

  return `This week in the world: ${dominantSignal}

Stoic passages from the corpus:
${stoic.map(fmt).join('\n\n')}${counterText}

Produce:
1. corpus_response: 400-${config.corpus_response_max_words || 600} words — what do the Stoics say to someone living through this? Say clearly what in this situation is up to the reader and what is not, which virtue it calls for, and what their roles ask of them. Ground every claim in the Stoic passages provided, naming the author. End with one concrete Stoic practice for this week in light of what is happening.
2. world_corpus_tension: 2-3 sentences — where does this event push back against or complicate the Stoic teaching? Be honest where the Stoa does not have a clean answer.
3. dispatch_context: 100-${config.dispatch_context_max_words || 150} words — a tight, vivid, non-partisan digest of the dominant signal for use in Daily Dispatch generation. Written as present-tense context: "This week, [what is happening]. The Stoics have something to say about this..."

Respond ONLY with valid JSON:
{
  "corpus_response": "string",
  "world_corpus_tension": "string",
  "dispatch_context": "string"
}`;
}

async function generateCorpusResponse(dominantSignal, stoic, counterpoint, config) {
  const data = await anthropic({
    model: config.model || DEFAULT_MODEL,
    max_tokens: 3000,
    system: RESPONSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildResponseUserMessage(dominantSignal, stoic, counterpoint, config) }],
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

async function runWorldAgent({ dryRun = false } = {}) {
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

  // Pass 2 — pick the dominant signal (the one the Stoics answer most
  // directly) + respond.
  const dominant = await selectDominantSignal(signals, config);
  if (!dominant || !dominant.stoic.length) {
    console.error('[world-agent] No Stoic grounding for any signal — cannot respond. Exiting.');
    return { skipped: 'no_grounding' };
  }
  const dom = dominant.signal;
  console.log(`[world-agent] Dominant signal selected: ${dom.signal.slice(0, 90)}`);

  const passages = [...dominant.stoic, ...dominant.counterpoint];
  const relevantAuthors = [...new Set(passages.map(p => p.author))].slice(0, 6);
  const relevantPassages = passages.map(p => ({
    id: p.id, author: p.author, work: p.work,
    text: (p.chunk_text || '').substring(0, 400), similarity: p.similarity,
  }));

  const generated = await generateCorpusResponse(dom.signal, dominant.stoic, dominant.counterpoint, config);
  const wordCount = generated.corpus_response.split(/\s+/).filter(Boolean).length;
  console.log(`[world-agent] Corpus response generated | Authors: ${relevantAuthors.join(', ')} | ${wordCount} words`);

  // Pass 3 — status. Purely-scientific wellbeing/behavior findings auto-approve
  // (low political sensitivity) and reach the dispatch immediately.
  // Environmental, conflict, political, death, and contested cultural signals
  // wait for Kyle's review.
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

  if (dryRun) {
    console.log('[world-agent] Dry run — observation not stored.');
    console.log(JSON.stringify(row, null, 2));
    return { dryRun: true, row };
  }

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
  STOIC_AUTHORS,
  lensSettings,
  scoreRetrieval,
  getMondayOfCurrentWeek,
  getAgentConfig,
  gatherWorldSignals,
  retrievePassages,
  selectDominantSignal,
  generateCorpusResponse,
  runWorldAgent,
};

if (require.main === module) {
  runWorldAgent({ dryRun: process.argv.includes('--dry-run') }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
