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
// Pass 2 — Decay + prune. Edges that haven't fired in a week decay; edges that
// never established themselves are deleted (decay_concept_edges RPC).
// Learning requires forgetting.
//
// Every pass writes a consolidation_runs audit row. Updates run ONLY here —
// never inline at retrieval time — so retrieval latency stays clean and every
// weight change is attributable to a run.
//
// Railway cron: 30 7 * * * (daily 07:30 UTC ≈ 2:30–3:30am ET) — its own cron
// service (`node agents/consolidation-agent.js`); Kyle adds the cron manually.
// On-demand: POST /api/admin/consolidation/run.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULTS = {
  enabled: true,
  learning_rate: 0.1,
  decay: 0.995,
  stale_days: 7,
  min_weight: 0.02,
  min_co_retrievals: 3,
  window_hours_first_run: 168,
};

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

  const hebbian = await runHebbianPass(config);
  await audit('hebbian', hebbian);
  console.log(`[consolidation-agent] hebbian: ${hebbian.pair_events} pair-events from ${hebbian.outcomes} outcomes (since ${hebbian.since})`);

  const decay = await runDecayPass(config);
  await audit('decay', decay);
  console.log(`[consolidation-agent] decay: ${decay.decayed ?? 0} decayed, ${decay.pruned ?? 0} pruned`);

  const { count } = await supabase
    .from('concept_edges').select('*', { count: 'exact', head: true });
  console.log(`[consolidation-agent] graph now holds ${count ?? '?'} edges`);
  console.log(`Run time: ${((Date.now() - runStart) / 1000).toFixed(1)}s`);

  return { hebbian, decay, edges: count ?? null };
}

module.exports = { getAgentConfig, runHebbianPass, runDecayPass, runConsolidationAgent };

if (require.main === module) {
  runConsolidationAgent().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
