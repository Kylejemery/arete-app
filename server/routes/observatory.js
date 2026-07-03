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
  const sets = new Map();
  for (const r of rows || []) {
    if (!r.concept || !r.author) continue;
    const key = r.author.toLowerCase();
    if (!sets.has(key)) sets.set(key, new Set());
    sets.get(key).add(r.concept);
  }
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

// Part 8 wires SSE broadcasting through here; until then it is a quiet no-op
// placeholder so recordRetrieval has a single seam.
let emitRetrieval = () => {};
function setRetrievalEmitter(fn) { emitRetrieval = typeof fn === 'function' ? fn : () => {}; }

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
        concept: (r.position_a && r.position_a.concept) || null,
      },
      poleB: {
        author: (r.position_b && r.position_b.author) || (r.source_authors || [])[1] || null,
        concept: (r.position_b && r.position_b.concept) || null,
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
- Present tense only.
- No hype, no exclamation marks, no first person, no addressing the reader.
- State only facts present in the JSON you are given. Never invent an event; if a field is empty, say nothing about it.
- Prefer the most alive facts: what the corpus dreamed about, what it is wondering, what tension it holds, what new voice arrived, what people asked it about this week.
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
function greetingFacts(state) {
  const week = state?.recentActivity?.week ?? {};
  const hot = Object.entries(week).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  return {
    openInquiries: (state?.inquiries ?? []).slice(0, 2).map(i => i.question),
    openTensions: (state?.tensions ?? []).slice(0, 2).map(t => ({
      title: t.title, between: [t.poleA?.author, t.poleB?.author].filter(Boolean),
    })),
    dreamsStarredThisWeek: (state?.dreams ?? []).map(d => d.dream_type),
    newVoicesLast48h: (state?.births ?? []).map(b => b.author),
    mostRetrievedConceptsThisWeek: hot,
    lastAgentRuns: state?.agentPulse?.lastRuns ?? {},
  };
}

router.get('/api/observatory/greeting', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const state = await getState();
    const plaque = plaqueLine(state);

    if (greetingCache.date === today && greetingCache.line) {
      return res.json({ line: greetingCache.line, plaque });
    }

    // Durable copy from a previous process today?
    const stored = await guarded('system_greetings', () => supabase
      .from('system_greetings').select('line').eq('greeting_date', today).limit(1));
    if (stored && stored[0] && stored[0].line) {
      greetingCache = { date: today, line: stored[0].line };
      return res.json({ line: stored[0].line, plaque });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.json({ line: '', plaque });
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
        messages: [{ role: 'user', content: `Today's state JSON:\n${JSON.stringify(greetingFacts(state))}` }],
      }),
    });
    if (!response.ok) {
      console.warn('[/api/observatory/greeting] Claude error:', response.status);
      return res.json({ line: '', plaque });
    }
    const data = await response.json();
    let line = (data.content?.find(b => b.type === 'text')?.text ?? '').trim();
    // Enforce the register even if the model slips: no exclamations, no
    // newlines, bounded length.
    line = line.replace(/!/g, '.').replace(/\s+/g, ' ').slice(0, 320).trim();

    if (line) {
      greetingCache = { date: today, line };
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

module.exports = { router, recordRetrieval, setRetrievalEmitter };
