// server/agents/tension-agent.js
//
// Tension Agent — hunts unresolved philosophical contradictions across the
// corpus: places where two or more thinkers, read together, produce a genuine
// philosophical problem that neither resolves.
//
// The Synthesis Agent carries the guardrail "never resolve genuine
// philosophical tensions — surface them." This agent inverts that guardrail
// into a primary function. Where synthesis surfaces tensions as a byproduct of
// mapping a concept, this agent seeks tension deliberately, names it
// precisely, and holds it open. A corpus that only agrees with itself is a
// doctrine; a corpus that holds live contradictions is a tradition.
//
// Runs weekly (its own Railway cron service, Mondays 05:30 UTC — after the
// Coverage Gap Agent at 05:00, before the Synthesis Agent at 06:00, so fresh
// tensions can inform that morning's synthesis prioritization). Three passes
// per tension:
//   Pass 1 — Candidate Pairing: deliberately pair passages likely to conflict,
//            alternating cross-tradition collision (same concept, different
//            traditions) with intra-tradition friction (same tradition,
//            diverging practical recommendations).
//   Pass 2 — Tension Extraction: Claude states the strongest candidate tension
//            at full strength — both positions steelmanned — and classifies it
//            honestly. Terminological conflicts and near-duplicates of already
//            catalogued tensions are discarded, never dressed up as drama.
//   Pass 3 — User Theme Connection: tensions that map to what users are
//            actually wrestling with (journal_analysis themes, last 30 days)
//            get tagged so they surface first in the admin review queue.
//
// Every tension is stored in philosophical_tensions as `pending_review`.
// Nothing is surfaced to users without Kyle's observatory_visible approval.
// Genuine tensions are NEVER resolved — they are stated and held open.
// Storing zero tensions in a week is an acceptable outcome; the bar never
// lowers to hit a quota.
//
// Mirrors the other agents: raw fetch to OpenAI (embeddings) and Anthropic
// (generation), no SDKs.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { traditionFor, getMondayOfCurrentWeek } = require('./inquiry-agent');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const SYNTHESIS_AUTHOR = 'Arete Synthesis';

// Concepts where thinkers most often pull against each other. Strategy A picks
// from the whole list; Strategy B leans on the practical-recommendation
// concepts where intra-tradition friction lives (Seneca's wealth vs.
// Epictetus's poverty; engagement vs. withdrawal).
const COLLISION_CONCEPTS = [
  'virtue', 'death', 'fate and free will', 'desire', 'self-cultivation',
  'solitude', 'friendship', 'grief', 'pleasure', 'courage', 'contentment',
  'the self', 'nature', 'time', 'love and attachment',
];
const FRICTION_CONCEPTS = [
  'wealth and poverty', 'political engagement', 'ambition', 'anger',
  'withdrawal from public life', 'luxury and simplicity', 'exile',
  'dealing with power', 'work and leisure', 'self-improvement',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Embed a short string with text-embedding-3-small. Returns the vector or null.
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

async function callClaude(model, system, userMessage, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: maxTokens || 3000,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const block = (json.content || []).find(b => b.type === 'text');
  const raw = block ? block.text : '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'tension-agent')
    .maybeSingle();

  return data?.config || {
    enabled: true,
    run_hour_utc: 5,
    run_minute_utc: 30,
    run_day: 'monday',
    model: DEFAULT_MODEL,
    candidate_pairings_per_run: 4,
    passages_per_candidate: 8,
    lived_stakes_max_words: 250,
    user_theme_lookback_days: 30,
  };
}

// --- Pass 1. Candidate pairing ----------------------------------------------

// Semantic retrieval on a concept term, excluding the corpus's own syntheses,
// capped per-author so several voices are heard. Returns raw chunks.
async function retrieveOnConcept(concept, count) {
  const embedding = await embed(concept);
  if (!embedding) return [];
  const { data } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: Math.max(count * 5, 40),
  });
  return (data || []).filter(c => c.author && c.author !== SYNTHESIS_AUTHOR && c.chunk_text);
}

function toPassage(c) {
  return { id: c.id, author: c.author, work: c.work, chunk_text: c.chunk_text };
}

// Strategy A — cross-tradition collision: passages on the same concept from
// authors in different traditions. Prefers the human-approved
// concept_passage_map when it holds a concept spanning >=2 traditions;
// otherwise falls back to semantic search on a shared concept term.
async function buildCrossTraditionCandidate(config) {
  const size = config.passages_per_candidate || 8;

  // Approved concept map first — it is curated ground.
  const { data: mapped } = await supabase
    .from('concept_passage_map')
    .select('concept, chunk_id, author, work, chunk_text')
    .eq('approved', true)
    .limit(1000);
  const byConcept = new Map();
  for (const row of mapped || []) {
    if (!row.author || !row.chunk_text) continue;
    if (!byConcept.has(row.concept)) byConcept.set(row.concept, []);
    byConcept.get(row.concept).push(row);
  }
  const collisionConcepts = shuffle([...byConcept.keys()]).filter(concept => {
    const traditions = new Set(byConcept.get(concept).map(r => traditionFor(r.author)));
    return traditions.size >= 2;
  });

  let concept;
  let pool;
  if (collisionConcepts.length > 0) {
    concept = collisionConcepts[0];
    pool = byConcept.get(concept).map(r => ({
      id: r.chunk_id, author: r.author, work: r.work, chunk_text: r.chunk_text,
    }));
  } else {
    concept = pick(COLLISION_CONCEPTS);
    pool = (await retrieveOnConcept(concept, size)).map(toPassage);
  }

  // Balance across traditions: round-robin the tradition buckets so the
  // candidate actually collides worldviews instead of sampling one deeply.
  const byTradition = new Map();
  for (const p of shuffle(pool)) {
    const t = traditionFor(p.author);
    if (!byTradition.has(t)) byTradition.set(t, []);
    byTradition.get(t).push(p);
  }
  if (byTradition.size < 2) return null;

  const buckets = shuffle([...byTradition.values()]);
  const perAuthor = {};
  const passages = [];
  for (let round = 0; passages.length < size && round < size; round++) {
    for (const bucket of buckets) {
      if (passages.length >= size) break;
      const next = bucket.find(p => (perAuthor[p.author] || 0) < 3 && !passages.includes(p));
      if (next) {
        passages.push(next);
        perAuthor[next.author] = (perAuthor[next.author] || 0) + 1;
      }
    }
  }

  const authors = new Set(passages.map(p => p.author));
  const traditions = new Set(passages.map(p => traditionFor(p.author)));
  if (passages.length < 4 || authors.size < 2 || traditions.size < 2) return null;
  return { strategy: 'cross-tradition', concept, passages };
}

// Strategy B — intra-tradition friction: passages from within one tradition
// where practical recommendations diverge. Same-tradition tensions are often
// the most valuable because they cannot be dismissed as different premises.
async function buildIntraTraditionCandidate(config) {
  const size = config.passages_per_candidate || 8;
  const concept = pick(FRICTION_CONCEPTS);
  const retrieved = (await retrieveOnConcept(concept, size)).map(toPassage);

  // Find the tradition with the most distinct authors among the results.
  const byTradition = new Map();
  for (const p of retrieved) {
    const t = traditionFor(p.author);
    if (t === 'other') continue;
    if (!byTradition.has(t)) byTradition.set(t, []);
    byTradition.get(t).push(p);
  }
  let best = null;
  for (const [t, ps] of byTradition) {
    const authors = new Set(ps.map(p => p.author));
    if (authors.size >= 2 && (!best || authors.size > best.authorCount)) {
      best = { tradition: t, passages: ps, authorCount: authors.size };
    }
  }
  if (!best) return null;

  // Round-robin the authors within the tradition, max 3 passages each.
  const byAuthor = new Map();
  for (const p of shuffle(best.passages)) {
    if (!byAuthor.has(p.author)) byAuthor.set(p.author, []);
    if (byAuthor.get(p.author).length < 3) byAuthor.get(p.author).push(p);
  }
  const buckets = shuffle([...byAuthor.values()]);
  const passages = [];
  for (let round = 0; passages.length < size && round < 3; round++) {
    for (const bucket of buckets) {
      if (passages.length >= size) break;
      if (bucket[round]) passages.push(bucket[round]);
    }
  }

  if (passages.length < 4 || new Set(passages.map(p => p.author)).size < 2) return null;
  return { strategy: 'intra-tradition', concept, tradition: best.tradition, passages };
}

// --- Pass 2. Tension extraction ----------------------------------------------

const TENSION_SYSTEM_PROMPT = `You are a philosophical analyst whose sole job is finding genuine tensions — places where serious thinkers, read together, produce a contradiction or dilemma that neither resolves.

You are rigorous about what counts as genuine tension:
- A GENUINE CONTRADICTION means the positions cannot both be true as stated
- A CONTEXTUAL DIVERGENCE means the positions differ because the circumstances they address differ
- A TERMINOLOGICAL conflict dissolves once terms are carefully defined
- A DEVELOPMENTAL difference reflects one tradition or thinker at different stages

Most apparent tensions are not genuine. Your credibility depends on classifying honestly. A terminological conflict labeled as genuine contradiction is a failure. A genuine contradiction papered over as "different emphasis" is also a failure.

You never resolve genuine tensions. You state them at maximum strength — each position presented in its strongest form, as its author would defend it. Steelman both sides. The tension should feel live, not staged.

The most valuable tensions are the ones users actually live inside: ambition vs. acceptance, engagement vs. withdrawal, self-improvement vs. self-acceptance, love vs. non-attachment.`;

function buildTensionUserMessage(candidate, existingTensions) {
  const authors = [...new Set(candidate.passages.map(p => p.author))];
  const passageBlock = candidate.passages.map((p, i) =>
    `[passage ${i + 1} — ${p.author}, ${p.work}]\n${p.chunk_text}`
  ).join('\n\n');
  const existingBlock = existingTensions.length
    ? existingTensions.map(t => `- "${t.title}": ${(t.tension_statement || '').split(/(?<=[.!?])\s+/)[0]}`).join('\n')
    : '(none yet)';

  return `Here are passages from ${authors.join(', ')} on ${candidate.concept}:

${passageBlock}

Existing tensions already catalogued (do not duplicate):
${existingBlock}

Determine whether these passages contain a genuine philosophical tension. If the strongest candidate is terminological or merely apparent, say so — do not manufacture drama.

If a real tension exists, produce:
1. title — evocative, specific, 3-8 words (in the style of "The Mirror We Refuse")
2. tension_statement — one precise paragraph stating the contradiction at full strength
3. position_a and position_b — for each: author, work, position_summary (2-3 sentences, steelmanned)
4. lived_stakes — 150-250 words on what this tension means for how a person actually lives. Concrete. A reader should recognize their own dilemma in it.
5. tension_type — genuine_contradiction | contextual_divergence | terminological | developmental
6. is_resolvable — no | possibly | apparent_only
7. resolution_note — only if terminological or apparent_only: briefly why
8. is_duplicate — true/false, and if true, which existing tension it duplicates

Respond ONLY with valid JSON:
{
  "has_genuine_tension": boolean,
  "is_duplicate": boolean,
  "duplicate_of": "string or null",
  "title": "string",
  "tension_statement": "string",
  "position_a": { "author": "string", "work": "string", "position_summary": "string" },
  "position_b": { "author": "string", "work": "string", "position_summary": "string" },
  "lived_stakes": "string",
  "tension_type": "string",
  "is_resolvable": "string",
  "resolution_note": "string or null"
}`;
}

async function extractTension(candidate, existingTensions, config) {
  return callClaude(
    config.model,
    TENSION_SYSTEM_PROMPT,
    buildTensionUserMessage(candidate, existingTensions),
    3000
  );
}

// --- Pass 3. User theme connection -------------------------------------------

const STOPWORDS = new Set([
  'the', 'and', 'with', 'from', 'that', 'this', 'what', 'when', 'where',
  'about', 'into', 'over', 'toward', 'towards', 'between', 'their', 'your',
  'ones', 'one\'s', 'self', 'life', 'living',
]);

// Community themes from journal_analysis over the lookback window. Returns
// de-duplicated display names.
async function getRecentUserThemes(config) {
  const lookbackDays = config.user_theme_lookback_days || 30;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('journal_analysis')
    .select('themes, dominant_theme')
    .gte('created_at', since);

  const names = new Map(); // normalized -> display
  for (const row of data || []) {
    const arr = Array.isArray(row.themes) ? row.themes : [];
    for (const t of arr) {
      const name = (t && (typeof t === 'string' ? t : t.theme)) || '';
      const trimmed = String(name).trim();
      if (trimmed) names.set(trimmed.toLowerCase(), trimmed);
    }
    if (row.dominant_theme) {
      const trimmed = String(row.dominant_theme).trim();
      if (trimmed) names.set(trimmed.toLowerCase(), trimmed);
    }
  }
  return [...names.values()];
}

// Simple keyword/concept matching (v1): a theme connects when a substantive
// word it contains appears in the tension's title, statement, or lived stakes.
function connectThemes(tension, themes) {
  const haystack = `${tension.title} ${tension.tension_statement} ${tension.lived_stakes || ''}`.toLowerCase();
  const connected = [];
  for (const theme of themes) {
    const words = theme.toLowerCase().split(/[^a-z']+/).filter(w => w.length >= 4 && !STOPWORDS.has(w));
    if (words.length === 0) continue;
    if (words.some(w => haystack.includes(w))) connected.push(theme);
    if (connected.length >= 6) break;
  }
  return connected;
}

// --- Main ---------------------------------------------------------------------

// options.count — attempt exactly this many candidate pairings on demand
// (overrides candidate_pairings_per_run). Returns a summary so callers report.
async function runTensionAgent(options = {}) {
  const runStart = Date.now();
  console.log(`=== Tension Agent — ${new Date().toISOString()} ===`);
  console.log('[tension-agent] Monday 05:30 UTC run started');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set — candidate pairing needs embeddings. Aborting.');
    process.exit(1);
  }

  const config = await getAgentConfig();
  if (!config.enabled && !options.count) {
    console.log('[tension-agent] disabled in config. Exiting.');
    return { stored: 0, discarded: 0, failures: 0, disabled: true, tensions: [] };
  }

  const attempts = options.count
    ? Math.max(1, options.count)
    : (config.candidate_pairings_per_run || 4);
  const tensionWeek = getMondayOfCurrentWeek();
  const model = config.model || DEFAULT_MODEL;

  // Existing catalogue — passed to Claude so near-duplicates are flagged, not
  // regenerated. Newly stored tensions join the list within the same run.
  const { data: existingRows } = await supabase
    .from('philosophical_tensions')
    .select('title, tension_statement')
    .in('status', ['approved', 'pending_review']);
  const existing = existingRows || [];

  const userThemes = await getRecentUserThemes(config);

  let stored = 0;
  let discarded = 0;
  let failures = 0;
  const tensions = [];

  for (let i = 0; i < attempts; i++) {
    // Alternate strategies across the run: A, B, A, B …
    const useCross = i % 2 === 0;
    const label = useCross ? 'cross-tradition' : 'intra-tradition';
    const candidateStart = Date.now();
    try {
      const candidate = useCross
        ? await buildCrossTraditionCandidate(config)
        : await buildIntraTraditionCandidate(config);
      if (!candidate) {
        console.log(`[tension-agent] Candidate ${i + 1} (${label}): could not build a diverse pairing — skipped`);
        discarded++;
        continue;
      }

      const authors = [...new Set(candidate.passages.map(p => p.author))];
      const pairingDesc = `${authors.slice(0, 2).join(' x ')} on ${candidate.concept}`;

      const result = await extractTension(candidate, existing, config);

      if (result.is_duplicate) {
        console.log(`[tension-agent] Candidate ${i + 1} (${label}): duplicate of "${result.duplicate_of || 'existing tension'}", discarded`);
        discarded++;
        continue;
      }
      if (!result.has_genuine_tension) {
        const why = result.tension_type && result.tension_type !== 'genuine_contradiction'
          ? result.tension_type : 'no genuine tension';
        console.log(`[tension-agent] Candidate ${i + 1} (${label}): ${pairingDesc} — ${why}, discarded`);
        discarded++;
        continue;
      }
      if (!result.title || !result.tension_statement || !result.position_a || !result.position_b) {
        throw new Error('incomplete tension payload from model');
      }

      // Normalize to the CHECK-constrained sets.
      const validTypes = ['genuine_contradiction', 'contextual_divergence', 'terminological', 'developmental'];
      const tensionType = validTypes.includes(result.tension_type) ? result.tension_type : 'genuine_contradiction';
      const validResolvable = ['no', 'possibly', 'apparent_only'];
      const isResolvable = validResolvable.includes(result.is_resolvable) ? result.is_resolvable : 'no';
      const resolutionNote = (tensionType === 'terminological' || isResolvable === 'apparent_only')
        ? (result.resolution_note || null) : null;

      // Ground each position in the chunk ids of its author's passages.
      const passagesFor = (position) => candidate.passages
        .filter(p => position?.author && p.author &&
          (p.author.toLowerCase().includes(position.author.toLowerCase()) ||
           position.author.toLowerCase().includes(p.author.toLowerCase())))
        .map(p => p.id).filter(Boolean);

      const themeConnections = connectThemes(result, userThemes);

      const row = {
        tension_week: tensionWeek,
        title: result.title.trim(),
        tension_statement: result.tension_statement.trim(),
        position_a: { ...result.position_a, key_passages: passagesFor(result.position_a) },
        position_b: { ...result.position_b, key_passages: passagesFor(result.position_b) },
        additional_positions: null,
        lived_stakes: result.lived_stakes || null,
        user_theme_connections: themeConnections,
        tension_type: tensionType,
        is_resolvable: isResolvable,
        resolution_note: resolutionNote,
        source_chunk_ids: candidate.passages.map(p => p.id).filter(Boolean),
        source_authors: authors,
        status: 'pending_review',
        observatory_visible: false,
        model_used: model,
        generated_at: new Date().toISOString(),
        generation_duration_ms: Date.now() - candidateStart,
      };

      const { error } = await supabase.from('philosophical_tensions').insert(row);
      if (error) throw new Error(error.message);

      console.log(
        `[tension-agent] Candidate ${i + 1} (${label}): ${pairingDesc} — GENUINE | "${row.title}" stored` +
        (themeConnections.length ? ` | connects to user themes: ${themeConnections.join(', ')}` : '')
      );
      stored++;
      tensions.push({ title: row.title, tension_type: tensionType, authors });
      existing.push({ title: row.title, tension_statement: row.tension_statement });

      // Rate limit — one Claude call per candidate.
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`[tension-agent] Candidate ${i + 1} (${label}) failed:`, err.message);
      failures++;
    }
  }

  console.log(`[tension-agent] ${stored} tensions stored as pending_review | ${discarded} discarded | ${failures} failures`);
  console.log(`Run time: ${((Date.now() - runStart) / 1000).toFixed(1)}s`);

  return { stored, discarded, failures, tensions, tensionWeek };
}

module.exports = {
  getAgentConfig,
  buildCrossTraditionCandidate,
  buildIntraTraditionCandidate,
  extractTension,
  getRecentUserThemes,
  connectThemes,
  runTensionAgent,
};

if (require.main === module) {
  runTensionAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
