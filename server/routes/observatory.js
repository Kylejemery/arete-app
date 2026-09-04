// ---------------------------------------------------------------------------
// Observatory Living Sky — state API + retrieval event logging
//
// Governing principle: every motion in the Observatory is caused by real data.
// This module owns the new /api/observatory/* routes so index.js (a shared-
// conflict file with the agent build sessions) only carries a single require
// and a single app.use.
//
// Graceful degradation is load-bearing: several tables this module reads
// (open_inquiries, philosophical_tensions, corpus_dreams, author_chronology,
// agent_config, …) are created by agent builds that may not have run yet.
// Every read is guarded — if a table or RPC is absent, its layer is silently
// omitted and the Observatory renders perfectly without it.
// ---------------------------------------------------------------------------
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
// Canonical concept layer (Part 1) — the Observatory only ever speaks
// canonical names; raw theme labels map through concept_aliases.
const canonicalConcepts = require('../lib/canonical-concepts');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// ---------------------------------------------------------------------------
// UTC agent choreography — the static schedule the corpus lives by. Used by
// the client to derive the sky state (dreaming / waking / awake) and to show
// "the corpus is thinking" while an agent window is likely active. lastRuns
// (below) layers real run timestamps on top when the log tables exist.
// dow: 0 = Sunday. daily: fires every day at hour:minute.
// ---------------------------------------------------------------------------
const AGENT_SCHEDULE = [
  { agent: 'dreaming',     dow: 0, hour: 23, minute: 30, caption: 'the corpus is dreaming' },
  { agent: 'ingestion',    dow: 1, hour: 3,  minute: 0,  caption: 'the corpus is reading new texts' },
  { agent: 'world',        dow: 1, hour: 3,  minute: 30, caption: 'the corpus is looking at the world' },
  { agent: 'journal',      dow: 1, hour: 4,  minute: 0,  caption: 'the corpus is reading its users' },
  { agent: 'longitudinal', dow: 1, hour: 4,  minute: 30, caption: 'the corpus is remembering its people' },
  { agent: 'gap',          dow: 1, hour: 5,  minute: 0,  caption: 'the corpus is finding what it lacks' },
  { agent: 'tension',      dow: 1, hour: 5,  minute: 30, caption: 'the corpus is holding contradictions open' },
  { agent: 'synthesis',    dow: 1, hour: 6,  minute: 0,  caption: 'the corpus is writing across its sources' },
  { agent: 'inquiry',      dow: 1, hour: 6,  minute: 30, caption: 'the corpus is asking what it cannot answer' },
  { agent: 'convergence',  dow: 1, hour: 6,  minute: 45, caption: 'the corpus is assembling what it never said' },
  { agent: 'dispatch',     daily: true, hour: 10, minute: 0, caption: 'the corpus is composing the dispatch' },
];

// ---------------------------------------------------------------------------
// Graceful-degradation query guard. Missing tables/RPCs (agent builds that
// have not run yet) return null silently; real failures warn once per call
// but still return null so the state payload always assembles.
// ---------------------------------------------------------------------------
const MISSING_RE = /does not exist|schema cache|could not find/i;

async function guarded(label, build) {
  try {
    const { data, error } = await build();
    if (error) {
      if (!MISSING_RE.test(error.message || '')) {
        console.warn(`[observatory/state] ${label} failed:`, error.message);
      }
      return null;
    }
    return data ?? null;
  } catch (err) {
    if (!MISSING_RE.test(err.message || '')) {
      console.warn(`[observatory/state] ${label} threw:`, err.message);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Retrieval event logging — the data behind breathing rate and live flares.
// Maps retrieved chunks to the few observatory concepts they touch (same
// author → concept grouping the constellation is built from) and appends up
// to 3 rows to retrieval_events. Fire-and-forget: never awaited by callers,
// never throws, a failure can never break retrieval.
// ---------------------------------------------------------------------------
let authorConceptCache = null; // { map: Map<lowerAuthor, string[]>, at: number }
const AUTHOR_CONCEPT_TTL = 5 * 60 * 1000;

async function getAuthorConceptMap() {
  if (authorConceptCache && Date.now() - authorConceptCache.at < AUTHOR_CONCEPT_TTL) {
    return authorConceptCache.map;
  }
  const rows = await guarded('concept_passage_map', () =>
    supabase.from('concept_passage_map').select('concept, author'));
  // retrieval_events log canonical names from here on (old raw rows still
  // aggregate correctly — the counting RPC joins the alias table).
  let aliases = new Map();
  try { aliases = await canonicalConcepts.getAliasMap(); } catch { /* degrade to empty sky mapping */ }
  const unmapped = new Set();
  const sets = new Map();
  for (const r of rows || []) {
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
  authorConceptCache = { map, at: Date.now() };
  return map;
}

// Called (not awaited) from every real retrieval path in index.js.
// chunks: rows shaped like match_rag_corpus output ({ author, ... }) or the
// academy-agent normalisation ({ source_author, ... }).
function recordRetrieval(chunks, source) {
  (async () => {
    try {
      if (!Array.isArray(chunks) || chunks.length === 0) return;
      const map = await getAuthorConceptMap();
      // Rank concepts by how many retrieved chunks touch them, so the log
      // lands on the concepts the answer leaned on — mirrors the live pulse.
      const score = new Map();
      const repAuthor = new Map();
      let firstAuthor = null;
      for (const c of chunks) {
        const a = String((c && (c.author ?? c.source_author)) || '').trim();
        if (!a) continue;
        if (!firstAuthor) firstAuthor = a;
        for (const name of map.get(a.toLowerCase()) || []) {
          score.set(name, (score.get(name) || 0) + 1);
          if (!repAuthor.has(name)) repAuthor.set(name, a);
        }
      }
      const top = [...score.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
      const rows = top.length > 0
        ? top.map(([concept]) => ({ concept, author: repAuthor.get(concept) || null, source }))
        : (firstAuthor ? [{ concept: null, author: firstAuthor, source }] : []);
      if (rows.length === 0) return;
      const { error } = await supabase.from('retrieval_events').insert(rows);
      if (error && !MISSING_RE.test(error.message || '')) {
        console.warn('[observatory] retrieval_events insert failed:', error.message);
      }
      emitRetrieval(rows); // Part 8 live flare — no-op until clients connect
    } catch { /* logging must never break retrieval */ }
  })();
}

// ---------------------------------------------------------------------------
// GET /api/observatory/live — Server-Sent Events. Every real retrieval is
// broadcast to connected Observatories so the matching star can flare gold:
// someone, somewhere, just asked the corpus something. Connection count is
// capped and dead connections are swept on write; a broadcast failure can
// never affect retrieval.
// ---------------------------------------------------------------------------
const liveClients = new Set();
const LIVE_MAX_CLIENTS = 200;
const LIVE_HEARTBEAT_MS = 25 * 1000;

router.get('/api/observatory/live', (req, res) => {
  if (liveClients.size >= LIVE_MAX_CLIENTS) {
    return res.status(503).json({ error: 'The sky is at capacity just now.' });
  }
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(':connected\n\n');
  liveClients.add(res);

  const cleanup = () => { clearInterval(hb); liveClients.delete(res); };
  const hb = setInterval(() => {
    try { res.write(':hb\n\n'); } catch { cleanup(); }
  }, LIVE_HEARTBEAT_MS);
  req.on('close', cleanup);
});

function emitRetrieval(rows) {
  try {
    if (liveClients.size === 0 || !Array.isArray(rows)) return;
    const concepts = [...new Set(rows.map(r => r.concept).filter(Boolean))];
    const authors = [...new Set(rows.map(r => r.author).filter(Boolean))];
    if (concepts.length === 0 && authors.length === 0) return;
    const frame = `data: ${JSON.stringify({ concepts, authors, ts: Date.now() })}\n\n`;
    for (const client of [...liveClients]) {
      try { client.write(frame); } catch { liveClients.delete(client); }
    }
  } catch { /* a broadcast failure must never affect retrieval */ }
}

// ---------------------------------------------------------------------------
// GET /api/observatory/state — one payload for the whole living sky,
// cached in-memory for 60 seconds.
// ---------------------------------------------------------------------------
let stateCache = { at: 0, payload: null };
const STATE_TTL_MS = 60 * 1000;

async function buildState() {
  const nowIso = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [
    corpusStats,
    retrievalCounts,
    inquiries,
    tensions,
    dreams,
    lastIngestion,
    lastDream,
    lastWorld,
    lastJournal,
    lastLongitudinal,
    lastGap,
    lastTension,
    lastSynthesis,
    lastInquiry,
    chronology,
  ] = await Promise.all([
    guarded('observatory_corpus_stats', () => supabase.rpc('observatory_corpus_stats')),
    guarded('observatory_retrieval_counts', () => supabase.rpc('observatory_retrieval_counts')),
    guarded('open_inquiries', () => supabase
      .from('open_inquiries').select('id, question, generated_at')
      .eq('status', 'approved').eq('observatory_visible', true)
      .order('generated_at', { ascending: false }).limit(12)),
    guarded('philosophical_tensions', () => supabase
      .from('philosophical_tensions')
      .select('id, title, position_a, position_b, source_authors, generated_at')
      .eq('status', 'approved').eq('observatory_visible', true)
      .order('generated_at', { ascending: false }).limit(12)),
    guarded('corpus_dreams', () => supabase
      .from('corpus_dreams').select('id, dream_type, reviewed_at')
      .eq('status', 'starred').gte('reviewed_at', weekAgo)
      .order('reviewed_at', { ascending: false }).limit(6)),
    guarded('corpus_ingestion_runs', () => supabase
      .from('corpus_ingestion_runs').select('run_started_at')
      .order('run_started_at', { ascending: false }).limit(1)),
    guarded('corpus_dreams last run', () => supabase
      .from('corpus_dreams').select('generated_at')
      .order('generated_at', { ascending: false }).limit(1)),
    guarded('world_observations last run', () => supabase
      .from('world_observations').select('generated_at')
      .order('generated_at', { ascending: false }).limit(1)),
    guarded('journal_analysis last run', () => supabase
      .from('journal_analysis').select('created_at')
      .order('created_at', { ascending: false }).limit(1)),
    guarded('user_longitudinal_models last run', () => supabase
      .from('user_longitudinal_models').select('portrait_updated_at')
      .order('portrait_updated_at', { ascending: false }).limit(1)),
    guarded('corpus_gap_reports last run', () => supabase
      .from('corpus_gap_reports').select('created_at')
      .order('created_at', { ascending: false }).limit(1)),
    guarded('philosophical_tensions last run', () => supabase
      .from('philosophical_tensions').select('generated_at')
      .order('generated_at', { ascending: false }).limit(1)),
    guarded('synthesis_documents last run', () => supabase
      .from('synthesis_documents').select('created_at')
      .order('created_at', { ascending: false }).limit(1)),
    guarded('open_inquiries last run', () => supabase
      .from('open_inquiries').select('generated_at')
      .order('generated_at', { ascending: false }).limit(1)),
    // author_chronology is created by the Epistemic Boundaries build; rows
    // pass through as-is so the client can map whatever columns it ships with.
    guarded('author_chronology', () => supabase
      .from('author_chronology').select('*').limit(500)),
  ]);

  const firstTs = (rows, field) => {
    const v = Array.isArray(rows) && rows[0] ? rows[0][field] : null;
    return v || null;
  };

  // Tension poles carry raw concept labels; the payload speaks canonical
  // names only (null when unmapped — the client then falls back to the
  // author's star, which is the existing behavior for missing concepts).
  let aliasMap = new Map();
  try { aliasMap = await canonicalConcepts.getAliasMap(); } catch { /* plaque still speaks */ }
  const toCanonical = raw => (raw && aliasMap.get(raw) ? aliasMap.get(raw).name : null);

  const lastRuns = {};
  const put = (agent, ts) => { if (ts) lastRuns[agent] = ts; };
  put('ingestion', firstTs(lastIngestion, 'run_started_at'));
  put('dreaming', firstTs(lastDream, 'generated_at'));
  put('world', firstTs(lastWorld, 'generated_at'));
  put('journal', firstTs(lastJournal, 'created_at'));
  put('longitudinal', firstTs(lastLongitudinal, 'portrait_updated_at'));
  put('gap', firstTs(lastGap, 'created_at'));
  put('tension', firstTs(lastTension, 'generated_at'));
  put('synthesis', firstTs(lastSynthesis, 'created_at'));
  put('inquiry', firstTs(lastInquiry, 'generated_at'));

  return {
    generatedAt: nowIso,
    corpus: corpusStats ? {
      totalChunks: corpusStats.totalChunks ?? 0,
      authorCount: corpusStats.authorCount ?? 0,
      byAuthor: corpusStats.byAuthor ?? {},
      byConcept: corpusStats.byConcept ?? {},
    } : { totalChunks: 0, authorCount: 0, byAuthor: {}, byConcept: {} },
    recentActivity: {
      day: (retrievalCounts && retrievalCounts.day) || {},
      week: (retrievalCounts && retrievalCounts.week) || {},
      weekByAuthor: (retrievalCounts && retrievalCounts.weekByAuthor) || {},
    },
    inquiries: (inquiries || []).map(r => ({
      id: r.id, question: r.question, created_at: r.generated_at,
    })),
    tensions: (tensions || []).map(r => ({
      id: r.id,
      title: r.title,
      poleA: {
        author: (r.position_a && r.position_a.author) || (r.source_authors || [])[0] || null,
        concept: toCanonical(r.position_a && r.position_a.concept),
      },
      poleB: {
        author: (r.position_b && r.position_b.author) || (r.source_authors || [])[1] || null,
        concept: toCanonical(r.position_b && r.position_b.concept),
      },
      created_at: r.generated_at,
    })),
    dreams: (dreams || []).map(r => ({
      id: r.id, dream_type: r.dream_type, created_at: r.reviewed_at,
    })),
    births: (corpusStats && corpusStats.births) || [],
    agentPulse: { schedule: AGENT_SCHEDULE, lastRuns },
    chronology: chronology || null,
  };
}

async function getState() {
  if (stateCache.payload && Date.now() - stateCache.at < STATE_TTL_MS) {
    return stateCache.payload;
  }
  const payload = await buildState();
  stateCache = { at: Date.now(), payload };
  return payload;
}

router.get('/api/observatory/state', async (req, res) => {
  try {
    return res.json(await getState());
  } catch (err) {
    console.error('[/api/observatory/state] error:', err.message);
    return res.status(500).json({ error: 'The sky state could not be read' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/observatory/greeting — the Observatory's voice. One or two
// present-tense sentences composed from live state by claude-haiku, cached
// for the UTC day in memory and in system_greetings (so it survives
// redeploys), always followed by the plaque line. If the model is
// unreachable the plaque alone speaks — the Observatory always has a voice.
// ---------------------------------------------------------------------------
let greetingCache = { date: '', line: '' };

const GREETING_SYSTEM = `You compose a one-to-two sentence greeting for the Library of Arete's Observatory — a quiet public star map of what a philosophical corpus is working through.

Rules, all absolute:
- Present tense only. Maximum two sentences.
- No em dashes, no en dashes, no semicolons, no exclamation marks.
- No hype, no first person, no addressing the reader.
- State only facts present in the JSON you are given. Never invent an event; if a field is empty, say nothing about it.
- Prefer the most alive facts: what the corpus dreamed (by type only), what it is asking, what new voice arrived, which agents have been at work.
- Lowercase quiet register is welcome; proper nouns keep their case.
- Do NOT include any counts of passages, voices, or open questions — a plaque line after your sentences carries those.
- Return only the sentences, nothing else.`;

function plaqueLine(state) {
  const chunks = state?.corpus?.totalChunks ?? 0;
  const authors = state?.corpus?.authorCount ?? 0;
  const inquiries = (state?.inquiries ?? []).length;
  return `${chunks.toLocaleString('en-US')} passages · ${authors} voices · ${inquiries} open question${inquiries === 1 ? '' : 's'}`;
}

// The compact fact sheet the model may draw on — nothing else exists to it.
//
// PRIVACY BOUNDARY, enforced at the code level so no prompt failure can leak:
// only system-level facts may enter this object — corpus counts, new authors
// ingested, approved dream activity BY TYPE ONLY, open inquiry count and
// topics (inquiries are corpus-derived), agent activity. User-derived
// material must NEVER be added here: journal analysis themes, longitudinal
// model content, gap analysis themes, tension titles (tension seeds inherit
// from user themes), and retrieval concepts (retrieval_events concepts
// inherit from journal/gap themes) are all excluded.
function greetingFacts(state) {
  return {
    openInquiryCount: (state?.inquiries ?? []).length,
    openInquiries: (state?.inquiries ?? []).slice(0, 2).map(i => i.question),
    dreamsStarredThisWeek: (state?.dreams ?? []).map(d => d.dream_type),
    newVoicesLast48h: (state?.births ?? []).map(b => b.author),
    lastAgentRuns: state?.agentPulse?.lastRuns ?? {},
  };
}

// Exception path, disabled by default (GREETING_USER_THEMES_ENABLED !== 'true'):
// a user-derived theme may be mentioned only when it appears across at least
// GREETING_THEME_MIN_USERS distinct users in the last 30 days. Ships OFF.
const USER_THEMES_ENABLED = process.env.GREETING_USER_THEMES_ENABLED === 'true';
const GREETING_THEME_MIN_USERS = 5;

async function crossUserThemes() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const rows = await guarded('journal_analysis cross-user themes', () => supabase
    .from('journal_analysis').select('user_id, themes').gte('created_at', since));
  const byTheme = new Map(); // theme -> Set<user_id>
  for (const r of rows || []) {
    if (!r.user_id) continue;
    for (const t of Array.isArray(r.themes) ? r.themes : []) {
      const theme = String((t && t.theme) || '').toLowerCase().trim();
      if (!theme) continue;
      if (!byTheme.has(theme)) byTheme.set(theme, new Set());
      byTheme.get(theme).add(r.user_id);
    }
  }
  return [...byTheme.entries()]
    .filter(([, users]) => users.size >= GREETING_THEME_MIN_USERS)
    .map(([theme]) => theme);
}

// Style enforcement even when the model slips: no exclamations, no em or en
// dashes, no semicolons, at most two sentences, one line, bounded length.
function sanitizeGreeting(raw) {
  let line = String(raw || '').replace(/\s+/g, ' ').trim();
  line = line.replace(/!/g, '.');
  line = line.replace(/\s*[—–]\s*/g, ', ');
  line = line.replace(/;/g, ',');
  return line.split(/(?<=[.?])\s+/).slice(0, 2).join(' ').slice(0, 320).trim();
}

// Consistency guard: a greeting that contradicts the plaque's numbers never
// ships — if it implies open questions while the count is 0 (or dreams,
// or new voices, likewise), the plaque line speaks alone instead.
function violatesFacts(line, state) {
  const inquiries = (state?.inquiries ?? []).length;
  const dreams = (state?.dreams ?? []).length;
  const births = (state?.births ?? []).length;
  if (inquiries === 0 && /\b(question|inquir|wonder|ask)/i.test(line)) return true;
  if (dreams === 0 && /\bdream/i.test(line)) return true;
  if (births === 0 && /\b(new voice|new light|arriv|join)/i.test(line)) return true;
  return false;
}

router.get('/api/observatory/greeting', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const state = await getState();
    const plaque = plaqueLine(state);

    if (greetingCache.date === today) {
      return res.json({ line: greetingCache.line, plaque });
    }

    // Durable copy from a previous process today? It must pass today's rules
    // — a stored line that violates the style or contradicts the plaque is
    // discarded and regenerated.
    const stored = await guarded('system_greetings', () => supabase
      .from('system_greetings').select('line').eq('greeting_date', today).limit(1));
    if (stored && stored[0] && stored[0].line) {
      const line = sanitizeGreeting(stored[0].line);
      if (line && !violatesFacts(line, state)) {
        greetingCache = { date: today, line };
        return res.json({ line, plaque });
      }
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.json({ line: '', plaque });
    }

    const facts = greetingFacts(state);
    if (USER_THEMES_ENABLED) {
      // Only themes shared by ≥5 distinct users may cross the boundary, and
      // only when the flag is explicitly on (it ships off).
      facts.communityThemes = await crossUserThemes();
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: GREETING_SYSTEM,
        messages: [{ role: 'user', content: `Today's state JSON:\n${JSON.stringify(facts)}` }],
      }),
    });
    if (!response.ok) {
      console.warn('[/api/observatory/greeting] Claude error:', response.status);
      return res.json({ line: '', plaque });
    }
    const data = await response.json();
    let line = sanitizeGreeting(data.content?.find(b => b.type === 'text')?.text ?? '');
    if (line && violatesFacts(line, state)) {
      console.warn('[/api/observatory/greeting] consistency guard tripped — plaque speaks alone:', line);
      line = '';
    }

    // Cache even an empty (guard-tripped) result for the day so a failing
    // generation is not retried on every request; only real lines persist.
    greetingCache = { date: today, line };
    if (line) {
      const { error } = await supabase.from('system_greetings')
        .upsert({ greeting_date: today, line }, { onConflict: 'greeting_date' });
      if (error && !MISSING_RE.test(error.message || '')) {
        console.warn('[/api/observatory/greeting] store failed:', error.message);
      }
    }
    return res.json({ line, plaque });
  } catch (err) {
    console.error('[/api/observatory/greeting] error:', err.message);
    // Even here, try to speak the plaque.
    try {
      const state = await getState();
      return res.json({ line: '', plaque: plaqueLine(state) });
    } catch {
      return res.status(500).json({ error: 'The Observatory is silent' });
    }
  }
});

// ---------------------------------------------------------------------------
// POST /api/observatory/passage — touch a star, draw one passage.
//
// Runs match_rag_corpus with the concept as the query, then asks Claude to
// read the top passages and answer in two parts: a short, precise statement
// of what these thinkers hold about the concept, and ONE quotation, verbatim,
// beginning and ending on sentence boundaries. The quotation is verified
// against the retrieved chunk before it is trusted; if the model paraphrased,
// or Claude is unavailable, the star falls back to a sentence-trimmed excerpt
// of the best chunk so nothing ever begins mid-sentence.
//
// Rate-limited 10/day per IP via upsert_observatory_rate_limit (same pattern
// as the Oracle's limiter, its own table) — this is a taste, not a service.
// ---------------------------------------------------------------------------
const PASSAGE_DAILY_LIMIT = 10;
const PASSAGE_MATCH_COUNT = 6;
const PASSAGE_MODEL = process.env.OBSERVATORY_PASSAGE_MODEL || 'claude-opus-5';
const PASSAGE_CHUNK_CHARS = 2400;   // what each passage is trimmed to before Claude reads it
const EXCERPT_MAX_CHARS = 620;      // fallback excerpt length
const QUOTE_MAX_CHARS = 900;        // longest quotation we will show

// Plain prose from a stored chunk: collapse whitespace, drop the markdown
// emphasis markers older ingests carry (_gladiators_, *thus*), and unify
// the typographic quotes that break substring checks.
function plainProse(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/(^|[\s(])[_*]{1,2}([^_*]{1,80}?)[_*]{1,2}(?=[\s.,;:!?)]|$)/g, '$1$2')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const SENTENCE_END = /[.!?]["')\]]?(?=\s|$)/g;

// Split prose into sentences on terminal punctuation followed by whitespace.
// Deliberately simple: the corpus is nineteenth-century English prose, and a
// false split at "Mr." costs far less than a fragment shown to a reader.
function sentencesOf(text) {
  const out = [];
  let last = 0;
  SENTENCE_END.lastIndex = 0;
  let m;
  while ((m = SENTENCE_END.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const s = text.slice(last, end).trim();
    if (s) out.push(s);
    last = end;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push(tail);
  return out;
}

function looksLikeSentenceStart(s) {
  return /^["'(]?[A-Z0-9]/.test(s);
}
function looksLikeSentenceEnd(s) {
  return /[.!?]["')\]]?$/.test(s);
}

// A window of whole sentences from a chunk: skip a leading fragment (chunk
// boundaries fall anywhere), keep whole sentences up to maxChars, drop a
// trailing fragment. Returns '' when the chunk holds no complete sentence.
function sentenceWindow(text, maxChars) {
  const sentences = sentencesOf(plainProse(text));
  let i = 0;
  while (i < sentences.length && !looksLikeSentenceStart(sentences[i])) i++;
  const kept = [];
  let len = 0;
  for (; i < sentences.length; i++) {
    const s = sentences[i];
    if (!looksLikeSentenceEnd(s)) break;         // trailing fragment
    if (kept.length && len + s.length + 1 > maxChars) break;
    kept.push(s);
    len += s.length + 1;
  }
  // A single sentence longer than the cap still shows whole rather than cut.
  return kept.join(' ');
}

// Does the model's quotation actually occur in the chunk? Compared with
// punctuation and case stripped so a curly quote or a dropped comma does not
// fail a genuine quotation, while a paraphrase still does.
function quoteKey(s) {
  return plainProse(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function quoteOccursIn(quote, chunk) {
  const q = quoteKey(quote);
  if (q.length < 40) return false;
  return quoteKey(chunk).includes(q);
}

// Strip dashes the house style forbids in generated prose.
function noDashes(s) {
  return String(s || '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .trim();
}

const PASSAGE_SYSTEM = `You are the voice of a star in the Library of Arete's Observatory. Each star is a philosophical concept. When a reader touches it, you answer from the corpus passages you are given and nothing else.

Reply with a single JSON object and no other text:
{"answer": string, "passage_index": integer, "quote": string}

"answer": two or three sentences, at most 80 words, plain and precise, stating what these thinkers actually hold about the concept. Name who says what. State positions, not summaries of the passages' structure. Do not mention passages, indices, "the corpus", or that you are answering. No hedging, no preamble, no rhetorical questions. Use commas, colons, and semicolons, never dashes.

"passage_index": the number of the one passage that best earns a quotation.

"quote": a quotation copied EXACTLY from that passage, character for character, between 25 and 90 words. It must begin at the start of a sentence and end at the end of a sentence. Never alter, trim inside, or join non-adjacent sentences. If no passage contains a quotable whole sentence, return an empty string.`;

async function composeStarAnswer(concept, chunks) {
  if (!process.env.CLAUDE_API_KEY) return null;
  const listing = chunks.map((c, i) => {
    const who = [c.author, c.work, c.section_label].filter(Boolean).join(', ');
    return `PASSAGE ${i + 1} (${who || 'unattributed'}):\n${plainProse(c.chunk_text).slice(0, PASSAGE_CHUNK_CHARS)}`;
  }).join('\n\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: PASSAGE_MODEL,
        max_tokens: 1200,
        output_config: { effort: 'low' },
        system: PASSAGE_SYSTEM,
        messages: [{ role: 'user', content: `Concept: ${concept}\n\n${listing}` }],
      }),
    });
    if (!response.ok) {
      console.warn('[/api/observatory/passage] Claude error:', response.status, (await response.text()).slice(0, 200));
      return null;
    }
    const data = await response.json();
    if (data.stop_reason === 'refusal') return null;
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const body = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(body.slice(start, end + 1));
    const idx = Number(parsed.passage_index);
    return {
      answer: noDashes(parsed.answer),
      index: Number.isInteger(idx) && idx >= 1 && idx <= chunks.length ? idx - 1 : 0,
      quote: typeof parsed.quote === 'string' ? plainProse(parsed.quote) : '',
    };
  } catch (err) {
    console.warn('[/api/observatory/passage] compose failed:', err.name === 'AbortError' ? 'timeout' : err.message, err.cause ? `(${err.cause.code || err.cause.message})` : '');
    return null;
  } finally {
    clearTimeout(timer);
  }
}

router.post('/api/observatory/passage', async (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = String(rawIp).split(',')[0].trim() || 'unknown';

    const concept = typeof req.body?.concept === 'string' ? req.body.concept.trim() : '';
    if (!concept) return res.status(400).json({ error: 'concept is required' });
    if (concept.length > 200) return res.status(400).json({ error: 'concept must be 200 characters or fewer' });

    const { data: limitData, error: limitError } = await supabase.rpc(
      'upsert_observatory_rate_limit', { p_ip: ip });
    if (limitError) {
      console.error('[/api/observatory/passage] rate limit error:', limitError.message);
      // Fail open — same posture as the Oracle limiter.
    } else if (limitData > PASSAGE_DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: 'You have drawn ten passages from the sky today. Return tomorrow, or read the sources in full at the Academy.',
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'The star does not answer just now.' });
    }

    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: concept }),
    });
    const embData = await embRes.json();
    const embedding = embData.data?.[0]?.embedding;
    if (!embedding) throw new Error('embedding failed');

    const { data: rows, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: PASSAGE_MATCH_COUNT,
      filter_author: null,
      filter_language: 'english',
    });
    if (error) throw new Error(error.message);
    // Only chunks that hold at least one whole sentence can be quoted.
    const chunks = (rows || []).filter(c => sentenceWindow(c.chunk_text, EXCERPT_MAX_CHARS));
    if (!chunks.length) return res.status(404).json({ error: 'The star holds no passage yet.' });

    const composed = await composeStarAnswer(concept, chunks);

    let chunk = chunks[0];
    let text = '';
    let answer = '';
    if (composed) {
      chunk = chunks[composed.index];
      answer = composed.answer;
      if (composed.quote && composed.quote.length <= QUOTE_MAX_CHARS
          && looksLikeSentenceStart(composed.quote) && looksLikeSentenceEnd(composed.quote)
          && quoteOccursIn(composed.quote, chunk.chunk_text)) {
        text = composed.quote;
      }
    }
    if (!text) text = sentenceWindow(chunk.chunk_text, EXCERPT_MAX_CHARS);

    recordRetrieval([chunk], 'observatory'); // a touch is a real retrieval

    return res.json({
      answer: answer || null,
      passage: {
        text,
        author: chunk.author || null,
        work: chunk.work || null,
        section: chunk.section_label || null,
      },
      remaining: Math.max(0, PASSAGE_DAILY_LIMIT - (limitData || 1)),
    });
  } catch (err) {
    console.error('[/api/observatory/passage] error:', err.message);
    return res.status(500).json({ error: 'The star could not be read just now.' });
  }
});

module.exports = { router, recordRetrieval };
