// server/agents/consolidation-agent.js
//
// Consolidation Agent — the learning system's nightly memory pass. Named for
// what it actually does (memory consolidation), and deliberately NOT called a
// dream agent: the Dreaming Agent (agents/dreaming-agent.js) is this system's
// conjecture engine, with an absolute human-review gate. This agent never
// generates prose. It moves numbers.
//
// Pass 1 — Hebbian update. For every response since the last run whose outcome
// is known (response_outcomes, written by the Evaluator fan-out), every pair
// of rag_corpus chunks that were BOTH actually used in that response
// (retrieval_log.used_in_response = true) fires together: the edge between
// them EMAs toward the outcome score (apply_hebbian_edge RPC, atomic per
// pair-event). Chunks that teach well together grow connected.
//
// Pass 0 — Heuristic outcomes (spec A3 fallback). Counselor conversations
// have no Evaluator, so their requests would never earn outcomes. Nightly,
// consecutive requests by the same student to the same counselor surface
// within 45 minutes are read as engagement signals: an immediate rephrase of
// nearly the same question is a negative outcome (the answer didn't land);
// any other continuation is neutral. Insert-only — a real Evaluator verdict
// always wins, and heuristic rows are never overwritten onto anything.
//
// Pass 2 — Synthesis. Connected clusters of strong edges (weight >= 0.5,
// spanning at least two source works) are handed to Opus: "these passages
// have proven repeatedly useful together in teaching — articulate the
// connection, or REJECT it as spurious." The result lands in corpus_syntheses
// as pending_review. NOTHING is ingested into rag_corpus here: Kyle approves
// from the admin queue (the approve action embeds + ingests), keeping the
// system's charter intact — nothing enters the corpus without human judgment.
// Model rejections are stored too; the failures calibrate the thresholds.
//
// Pass 3 — Decay + prune. Edges that haven't fired in a week decay; edges that
// never established themselves are deleted (decay_concept_edges RPC).
// Learning requires forgetting.
//
// Pass 4 — Selection pressure. An APPROVED synthesis whose own retrieval
// outcomes average below deprecate_below over deprecate_window_days with at
// least deprecate_min_retrievals retrievals is deprecated: excluded from
// retrieval (rag_corpus.deprecated), kept for audit. Human judgment gates
// entry; empirical performance gates survival.
//
// Pass 5 — Morning report. A short Haiku digest of the night — new synthesis
// proposals, strongest connections, deprecations — written to
// consolidation_reports and surfaced in the admin dashboard.
//
// Every pass writes a consolidation_runs audit row. Updates run ONLY here —
// never inline at retrieval time — so retrieval latency stays clean and every
// weight change is attributable to a run.
//
// Railway cron: 30 7 * * * (daily 07:30 UTC ≈ 2:30–3:30am ET) — its own cron
// service (`node agents/consolidation-agent.js`); Kyle adds the cron manually.
// On-demand: POST /api/admin/consolidation/run.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY (synthesis +
// report passes degrade to skipped without it).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

const DEFAULTS = {
  enabled: true,
  learning_rate: 0.1,
  decay: 0.995,
  stale_days: 7,
  min_weight: 0.02,
  min_co_retrievals: 3,
  window_hours_first_run: 168,
  synthesis_enabled: true,
  synthesis_model: 'claude-opus-4-8',
  synthesis_edge_threshold: 0.5,
  max_syntheses_per_night: 3,
  max_cluster_chunks: 6,
  synthesis_max_corpus_pct: 15,
  deprecate_below: 0.4,
  deprecate_min_retrievals: 10,
  deprecate_window_days: 30,
};

async function callClaude({ model, system, prompt, maxTokens }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return data.content?.find(b => b.type === 'text')?.text ?? '';
}

async function getAgentConfig() {
  try {
    const { data } = await supabase
      .from('agent_config').select('config')
      .eq('agent_name', 'consolidation-agent').single();
    return { ...DEFAULTS, ...(data?.config ?? {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

// ---------------------------------------------------------------------------
// Pass 0 — Heuristic outcomes for counselor conversations.
// ---------------------------------------------------------------------------

const HEURISTIC_WINDOW_HOURS = 48;   // re-scanned nightly; inserts are idempotent
const HEURISTIC_SETTLE_MINUTES = 60; // let a conversation finish before judging
const HEURISTIC_FOLLOWUP_MINUTES = 45; // a successor within this gap = same conversation
const REPHRASE_JACCARD = 0.45;       // word overlap above this = "asked the same thing again"
                                     // (a genuine rephrase swaps a verb or two; topical
                                     // follow-ups land far lower — see agent audit stats)

function jaccard(a, b) {
  const words = s => new Set(String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3));
  const wa = words(a), wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

async function runHeuristicsPass() {
  const stats = { requests_seen: 0, labeled: 0, negative: 0, neutral: 0 };
  const windowStart = new Date(Date.now() - HEURISTIC_WINDOW_HOURS * 3600 * 1000).toISOString();
  const settled = new Date(Date.now() - HEURISTIC_SETTLE_MINUTES * 60 * 1000).toISOString();

  // One row per request (rank 1) for counselor-surface agents with a known
  // student. The Evaluator owns academy agents; the Oracle is anonymous.
  const { data: rows, error } = await supabase
    .from('retrieval_log')
    .select('request_id, student_id, agent, query_text, created_at')
    .eq('rank', 1)
    .not('student_id', 'is', null)
    .or('agent.eq.cabinet,agent.like.counselor:*')
    .gt('created_at', windowStart)
    .order('created_at', { ascending: true })
    .limit(5000);
  if (error) throw new Error('retrieval_log read failed: ' + error.message);
  if (!rows || rows.length === 0) return stats;
  stats.requests_seen = rows.length;

  // Group into conversations by (student, agent) and label each request that
  // has a successor within the follow-up gap. The last message of a
  // conversation gets no heuristic — silence is not evidence either way.
  const byConvo = new Map();
  for (const r of rows) {
    const key = `${r.student_id}|${r.agent}`;
    if (!byConvo.has(key)) byConvo.set(key, []);
    byConvo.get(key).push(r);
  }

  const outcomes = [];
  for (const convo of byConvo.values()) {
    for (let i = 0; i < convo.length - 1; i++) {
      const cur = convo[i], next = convo[i + 1];
      if (cur.created_at > settled) continue; // conversation may still be live
      const gapMin = (new Date(next.created_at) - new Date(cur.created_at)) / 60000;
      if (gapMin > HEURISTIC_FOLLOWUP_MINUTES) continue;
      const rephrased = jaccard(cur.query_text, next.query_text) > REPHRASE_JACCARD;
      outcomes.push({
        request_id: cur.request_id,
        agent: cur.agent,
        student_id: cur.student_id,
        outcome: rephrased ? 'student_negative' : 'student_neutral',
        outcome_source: 'heuristic',
        score: rephrased ? 0.2 : 0.5,
      });
      if (rephrased) stats.negative++; else stats.neutral++;
    }
  }
  if (outcomes.length === 0) return stats;

  // Insert-only: never overwrite an Evaluator verdict or a prior heuristic.
  const { error: iErr, count } = await supabase
    .from('response_outcomes')
    .upsert(outcomes, { onConflict: 'request_id', ignoreDuplicates: true, count: 'exact' });
  if (iErr) throw new Error('response_outcomes upsert failed: ' + iErr.message);
  stats.labeled = count ?? outcomes.length;
  return stats;
}

// The Hebbian window starts where the last successful hebbian pass ended, so
// an outcome is never double-applied and a missed night is caught up on the
// next run. First run reaches back window_hours_first_run.
async function getWindowStart(config) {
  const { data } = await supabase
    .from('consolidation_runs').select('ran_at')
    .eq('pass', 'hebbian')
    .order('ran_at', { ascending: false }).limit(1);
  if (data?.[0]?.ran_at) return data[0].ran_at;
  return new Date(Date.now() - config.window_hours_first_run * 3600 * 1000).toISOString();
}

async function runHebbianPass(config) {
  const since = await getWindowStart(config);
  const stats = { since, outcomes: 0, requests_with_pairs: 0, pair_events: 0, errors: 0 };

  // Outcomes that arrived since the last pass. The outcome row's created_at is
  // the window key (not the retrieval's): the Evaluator writes outcomes for a
  // whole session at once, possibly days after the retrievals.
  const { data: outcomes, error: oErr } = await supabase
    .from('response_outcomes')
    .select('request_id, score')
    .gt('created_at', since)
    .not('score', 'is', null)
    .limit(5000);
  if (oErr) throw new Error('response_outcomes read failed: ' + oErr.message);
  stats.outcomes = outcomes?.length ?? 0;
  if (!outcomes || outcomes.length === 0) return stats;

  const scoreByRequest = new Map(outcomes.map(o => [o.request_id, o.score]));

  // The chunks each of those responses actually drew on (rag_corpus only —
  // chunk_id is null for the source_chunks corpus).
  const requestIds = [...scoreByRequest.keys()];
  const used = [];
  for (let i = 0; i < requestIds.length; i += 200) {
    const { data: rows, error: rErr } = await supabase
      .from('retrieval_log')
      .select('request_id, chunk_id')
      .in('request_id', requestIds.slice(i, i + 200))
      .eq('used_in_response', true)
      .not('chunk_id', 'is', null);
    if (rErr) throw new Error('retrieval_log read failed: ' + rErr.message);
    used.push(...(rows ?? []));
  }

  const chunksByRequest = new Map();
  for (const r of used) {
    if (!chunksByRequest.has(r.request_id)) chunksByRequest.set(r.request_id, new Set());
    chunksByRequest.get(r.request_id).add(r.chunk_id);
  }

  // Fire every pair, sequentially — apply_hebbian_edge is atomic per event and
  // nightly volumes are small (≤ C(8,2) pairs per request).
  for (const [requestId, chunkSet] of chunksByRequest) {
    const chunks = [...chunkSet];
    if (chunks.length < 2) continue;
    stats.requests_with_pairs++;
    const score = scoreByRequest.get(requestId);
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const { error } = await supabase.rpc('apply_hebbian_edge', {
          p_a: chunks[i],
          p_b: chunks[j],
          p_score: score,
          p_learning_rate: config.learning_rate,
        });
        if (error) {
          stats.errors++;
          console.warn('[consolidation-agent] apply_hebbian_edge failed:', error.message);
        } else {
          stats.pair_events++;
        }
      }
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Pass 2 — Synthesis. Clusters of proven-together passages become synthesis
// proposals for the review queue. Never writes to rag_corpus.
// ---------------------------------------------------------------------------

const SYNTHESIS_SYSTEM = `You are a scholarly annotator for a corpus of classical philosophy used in live Socratic teaching. You write synthesis notes: careful commentary articulating why a set of passages keeps proving useful together, in the register of a scholarly commentary — measured, precise, citing each passage by author and work. You never invent doctrine; you articulate connections the passages themselves support. You never attribute the note to any historical figure.`;

function clusterKey(chunkIds) {
  return [...chunkIds].sort().join('|');
}

// Connected components over the strong-edge subgraph (union-find).
function connectedComponents(edges) {
  const parent = new Map();
  const find = x => {
    while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
    return x;
  };
  const union = (a, b) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const e of edges) union(e.chunk_a, e.chunk_b);
  const comps = new Map();
  for (const node of parent.keys()) {
    const root = find(node);
    if (!comps.has(root)) comps.set(root, new Set());
    comps.get(root).add(node);
  }
  return [...comps.values()];
}

async function runSynthesisPass(config) {
  const stats = { candidates: 0, generated: 0, model_rejected: 0, skipped_reason: null };
  if (!config.synthesis_enabled) { stats.skipped_reason = 'disabled'; return stats; }
  if (!CLAUDE_API_KEY) { stats.skipped_reason = 'no CLAUDE_API_KEY'; return stats; }

  // Guardrail: synthesis chunks stay a small minority of the corpus.
  const [{ count: totalChunks }, { count: synthChunks }] = await Promise.all([
    supabase.from('rag_corpus').select('*', { count: 'exact', head: true }),
    supabase.from('rag_corpus').select('*', { count: 'exact', head: true })
      .eq('source_type', 'consolidation_synthesis').eq('deprecated', false),
  ]);
  if (totalChunks && synthChunks != null &&
      (synthChunks / totalChunks) * 100 >= config.synthesis_max_corpus_pct) {
    stats.skipped_reason = `synthesis chunks at ${synthChunks}/${totalChunks} — cap ${config.synthesis_max_corpus_pct}% reached`;
    return stats;
  }

  const { data: strongEdges, error: eErr } = await supabase
    .from('concept_edges')
    .select('chunk_a, chunk_b, weight')
    .gte('weight', config.synthesis_edge_threshold)
    .order('weight', { ascending: false })
    .limit(300);
  if (eErr) throw new Error('concept_edges read failed: ' + eErr.message);
  if (!strongEdges || strongEdges.length === 0) { stats.skipped_reason = 'no edges above threshold'; return stats; }

  // Clusters already proposed (any status — a model rejection is a verdict,
  // not an invitation to retry nightly).
  const { data: prior } = await supabase.from('corpus_syntheses').select('cluster_chunks');
  const priorKeys = new Set((prior ?? []).map(s => clusterKey(s.cluster_chunks ?? [])));

  // Chunk metadata for cross-text checks and the prompt.
  const allIds = [...new Set(strongEdges.flatMap(e => [e.chunk_a, e.chunk_b]))];
  const chunkById = new Map();
  for (let i = 0; i < allIds.length; i += 200) {
    const { data: rows } = await supabase
      .from('rag_corpus')
      .select('id, author, work, section_label, chunk_text, source_type')
      .in('id', allIds.slice(i, i + 200));
    for (const r of rows ?? []) chunkById.set(r.id, r);
  }

  const meanWeightOf = (chunkSet) => {
    const inCluster = strongEdges.filter(e => chunkSet.has(e.chunk_a) && chunkSet.has(e.chunk_b));
    return inCluster.length
      ? inCluster.reduce((s, e) => s + e.weight, 0) / inCluster.length
      : 0;
  };

  const candidates = connectedComponents(strongEdges)
    .map(set => {
      // Cap cluster size at the strongest members so the prompt stays focused.
      let ids = [...set].filter(id => chunkById.has(id));
      if (ids.length > config.max_cluster_chunks) {
        const strength = new Map(ids.map(id => [id, 0]));
        for (const e of strongEdges) {
          if (set.has(e.chunk_a) && set.has(e.chunk_b)) {
            strength.set(e.chunk_a, (strength.get(e.chunk_a) ?? 0) + e.weight);
            strength.set(e.chunk_b, (strength.get(e.chunk_b) ?? 0) + e.weight);
          }
        }
        ids = ids.sort((a, b) => (strength.get(b) ?? 0) - (strength.get(a) ?? 0))
          .slice(0, config.max_cluster_chunks);
      }
      return ids;
    })
    .filter(ids => {
      if (ids.length < 2) return false;
      // Spec: syntheses connect DIFFERENT source texts, and dream on primary
      // material only — never on other syntheses.
      const works = new Set(ids.map(id => `${chunkById.get(id)?.author}|${chunkById.get(id)?.work}`));
      if (works.size < 2) return false;
      if (ids.some(id => chunkById.get(id)?.source_type === 'consolidation_synthesis')) return false;
      return !priorKeys.has(clusterKey(ids));
    })
    .map(ids => ({ ids, meanWeight: meanWeightOf(new Set(ids)) }))
    .sort((a, b) => b.meanWeight - a.meanWeight)
    .slice(0, Math.min(config.max_syntheses_per_night, 5)); // hard guardrail: never more than 5/night

  stats.candidates = candidates.length;

  for (const { ids, meanWeight } of candidates) {
    const members = ids.map(id => chunkById.get(id));
    const passages = members.map((m, i) =>
      `PASSAGE ${i + 1} — ${m.author}, ${m.work}${m.section_label ? `, ${m.section_label}` : ''}:\n${(m.chunk_text ?? '').slice(0, 1500)}`
    ).join('\n\n');
    const prompt = `These passages have proven repeatedly useful together in live Socratic teaching — students demonstrating mastery of learning objectives were taught from them in combination, and the system's outcome tracking strengthened the connections between them.

${passages}

Write a synthesis note (300–500 words) articulating the connection between these passages, in the register of a scholarly commentary. Cite each source passage by author and work. Do not attribute the note itself to any historical figure.

Format: first line is a short title (no markdown, no quotes), then a blank line, then the note.

If the connection is spurious or trivial — an artifact of co-retrieval rather than a real conceptual relation — respond with exactly REJECT on the first line, then one sentence explaining why.`;

    try {
      const text = (await callClaude({
        model: config.synthesis_model,
        system: SYNTHESIS_SYSTEM,
        prompt,
        maxTokens: 1500,
      })).trim();

      const rejected = /^REJECT\b/.test(text);
      const firstBreak = text.indexOf('\n');
      const title = rejected ? null
        : (firstBreak > 0 ? text.slice(0, firstBreak) : text.slice(0, 80)).trim().slice(0, 200);
      const content = rejected ? text.replace(/^REJECT\b[:\s]*/, '').trim()
        : (firstBreak > 0 ? text.slice(firstBreak + 1) : text).trim();

      const { error } = await supabase.from('corpus_syntheses').insert({
        title,
        content,
        cluster_chunks: ids,
        citations: members.map(m => ({ author: m.author, work: m.work, section_label: m.section_label })),
        cluster_stats: { mean_weight: Math.round(meanWeight * 1000) / 1000, chunks: ids.length },
        status: rejected ? 'model_rejected' : 'pending_review',
        model_used: config.synthesis_model,
      });
      if (error) throw new Error(error.message);
      if (rejected) stats.model_rejected++; else stats.generated++;
    } catch (err) {
      console.warn('[consolidation-agent] synthesis failed for a cluster:', err.message);
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Pass 4 — Selection pressure over approved syntheses.
// ---------------------------------------------------------------------------

async function runDeprecationSweep(config) {
  const stats = { checked: 0, deprecated: 0, titles: [] };
  const { data: approved } = await supabase
    .from('corpus_syntheses')
    .select('id, title, rag_corpus_id')
    .eq('status', 'approved')
    .not('rag_corpus_id', 'is', null);
  if (!approved || approved.length === 0) return stats;

  const since = new Date(Date.now() - config.deprecate_window_days * 24 * 3600 * 1000).toISOString();
  for (const s of approved) {
    stats.checked++;
    const { data: rows } = await supabase
      .from('retrieval_log')
      .select('request_id')
      .eq('chunk_id', s.rag_corpus_id)
      .gt('created_at', since)
      .limit(1000);
    const requestIds = [...new Set((rows ?? []).map(r => r.request_id))];
    if (requestIds.length < config.deprecate_min_retrievals) continue;
    const { data: outs } = await supabase
      .from('response_outcomes')
      .select('score')
      .in('request_id', requestIds)
      .not('score', 'is', null);
    if (!outs || outs.length < config.deprecate_min_retrievals) continue;
    const avg = outs.reduce((a, o) => a + o.score, 0) / outs.length;
    if (avg < config.deprecate_below) {
      await supabase.from('rag_corpus').update({ deprecated: true }).eq('id', s.rag_corpus_id);
      await supabase.from('corpus_syntheses')
        .update({ status: 'deprecated', reviewed_at: new Date().toISOString() })
        .eq('id', s.id);
      stats.deprecated++;
      stats.titles.push(s.title);
      console.log(`[consolidation-agent] deprecated synthesis "${s.title}" (avg outcome ${avg.toFixed(2)} over ${outs.length} retrievals)`);
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Pass 5 — Morning report.
// ---------------------------------------------------------------------------

async function runReportPass(config, night) {
  const stats = { written: false };
  const { data: strongest } = await supabase
    .from('concept_edges')
    .select('chunk_a, chunk_b, weight')
    .order('weight', { ascending: false })
    .limit(5);
  const edgeLines = [];
  for (const e of strongest ?? []) {
    const { data: pair } = await supabase
      .from('rag_corpus').select('id, author, work').in('id', [e.chunk_a, e.chunk_b]);
    const byId = new Map((pair ?? []).map(r => [r.id, r]));
    const a = byId.get(e.chunk_a), b = byId.get(e.chunk_b);
    if (a && b) edgeLines.push(`${a.author} (${a.work}) <-> ${b.author} (${b.work}): weight ${e.weight.toFixed(2)}`);
  }
  const { data: pendingRows } = await supabase
    .from('corpus_syntheses').select('title').eq('status', 'pending_review');

  const rawStats = {
    heuristics: night.heuristics,
    hebbian: night.hebbian,
    synthesis: night.synthesis,
    decay: night.decay,
    deprecation: { deprecated: night.deprecation?.deprecated ?? 0, titles: night.deprecation?.titles ?? [] },
    strongest_edges: edgeLines,
    awaiting_review: (pendingRows ?? []).map(p => p.title),
  };

  let content = null;
  if (CLAUDE_API_KEY) {
    try {
      content = (await callClaude({
        model: 'claude-haiku-4-5-20251001',
        prompt: `You are writing the morning report of a learning system that studies which classical-philosophy passages teach well together. Last night's run, as JSON:

${JSON.stringify(rawStats, null, 2)}

Write a short digest (4-8 sentences, plain prose, no headers or bullets) for the system's owner: what strengthened, what was proposed for review, what was deprecated, and whether anything needs attention. If the night was quiet, say so briefly — do not pad.`,
        maxTokens: 400,
      })).trim();
    } catch (err) {
      console.warn('[consolidation-agent] report generation failed:', err.message);
    }
  }
  if (!content) {
    content = `Quiet report (generated without model): ${night.hebbian?.pair_events ?? 0} pair-events, ` +
      `${night.synthesis?.generated ?? 0} syntheses proposed, ${night.decay?.pruned ?? 0} edges pruned, ` +
      `${rawStats.deprecation.deprecated} deprecations. ${rawStats.awaiting_review.length} awaiting review.`;
  }

  const { error } = await supabase.from('consolidation_reports').insert({
    report_date: new Date().toISOString().slice(0, 10),
    content,
    stats: rawStats,
  });
  if (error) console.warn('[consolidation-agent] report insert failed:', error.message);
  else stats.written = true;
  stats.content = content;
  return stats;
}

async function runDecayPass(config) {
  const { data, error } = await supabase.rpc('decay_concept_edges', {
    p_decay: config.decay,
    p_stale_days: config.stale_days,
    p_min_weight: config.min_weight,
    p_min_co: config.min_co_retrievals,
  });
  if (error) throw new Error('decay_concept_edges failed: ' + error.message);
  return data ?? {};
}

async function audit(pass, stats) {
  const { error } = await supabase.from('consolidation_runs').insert({ pass, stats });
  if (error) console.warn('[consolidation-agent] audit insert failed:', error.message);
}

async function runConsolidationAgent() {
  const runStart = Date.now();
  const config = await getAgentConfig();
  if (!config.enabled) {
    console.log('[consolidation-agent] disabled via agent_config; skipping');
    return { skipped: true };
  }

  const heuristics = await runHeuristicsPass();
  await audit('heuristics', heuristics);
  console.log(`[consolidation-agent] heuristics: ${heuristics.labeled} counselor requests labeled (${heuristics.negative} negative, ${heuristics.neutral} neutral)`);

  const hebbian = await runHebbianPass(config);
  await audit('hebbian', hebbian);
  console.log(`[consolidation-agent] hebbian: ${hebbian.pair_events} pair-events from ${hebbian.outcomes} outcomes (since ${hebbian.since})`);

  const synthesis = await runSynthesisPass(config);
  await audit('synthesis', synthesis);
  console.log(`[consolidation-agent] synthesis: ${synthesis.generated} proposed, ${synthesis.model_rejected} model-rejected` +
    (synthesis.skipped_reason ? ` (skipped: ${synthesis.skipped_reason})` : ''));

  const decay = await runDecayPass(config);
  await audit('decay', decay);
  console.log(`[consolidation-agent] decay: ${decay.decayed ?? 0} decayed, ${decay.pruned ?? 0} pruned`);

  const deprecation = await runDeprecationSweep(config);
  await audit('deprecation', deprecation);
  console.log(`[consolidation-agent] selection pressure: ${deprecation.deprecated}/${deprecation.checked} approved syntheses deprecated`);

  const report = await runReportPass(config, { heuristics, hebbian, synthesis, decay, deprecation });
  await audit('report', { written: report.written });
  console.log(`[consolidation-agent] report ${report.written ? 'written' : 'FAILED'}`);

  const { count } = await supabase
    .from('concept_edges').select('*', { count: 'exact', head: true });
  console.log(`[consolidation-agent] graph now holds ${count ?? '?'} edges`);
  console.log(`Run time: ${((Date.now() - runStart) / 1000).toFixed(1)}s`);

  return { hebbian, synthesis, decay, deprecation, report: report.written, edges: count ?? null };
}

module.exports = {
  getAgentConfig,
  runHeuristicsPass,
  runHebbianPass,
  runSynthesisPass,
  runDecayPass,
  runDeprecationSweep,
  runReportPass,
  runConsolidationAgent,
};

if (require.main === module) {
  runConsolidationAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
