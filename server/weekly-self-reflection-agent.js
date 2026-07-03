// server/weekly-self-reflection-agent.js
//
// Weekly Self-Reflection Agent — Layer 6, the meta-agent of the Arete AI Agent
// System. Once a week it looks at what the whole living system did — corpus
// growth, agent performance, user engagement — detects anomalies, and writes a
// single structured report for the founder: machine-readable metrics + a prose
// narrative, stored in system_reflections.
//
// It reads only; it changes nothing about the other agents. Its audience is one
// person (Kyle), and its job is honest assessment — not a dashboard, a judgment.
//
// Standalone script (its own Railway cron service, Sundays 07:00 UTC — after a
// full week of the Monday agents' data has accumulated). Mirrors the other
// agents: raw fetch to Anthropic (generation), no SDKs. OpenAI is not needed —
// this agent does no retrieval.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Tier 1 authors whose absence is a critical corpus failure (per the spec).
const TIER1_AUTHORS = ['Marcus Aurelius', 'Epictetus', 'Seneca', 'Plato', 'Aristotle'];

// The full agent fleet this report covers. Keys match agent_status.
const FLEET = [
  'corpus', 'journal', 'gap', 'synthesis', 'dispatch',
  'world', 'longitudinal', 'tension', 'inquiry', 'dreaming',
  'self_reflection',
];

// Weekly agents whose Railway crons are not scheduled yet — Kyle runs them by
// hand, so a quiet week is expected rather than a failure. Their "did not
// fire" anomaly is a warning, not a critical, until the crons exist. Remove
// an agent from this set when its cron is scheduled.
const MANUAL_AGENTS = new Set(['world', 'longitudinal', 'tension', 'inquiry', 'dreaming']);

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the other agents.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// ISO-8601 week label (e.g. "2026-W26") for the human-facing log line.
function isoWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const target = new Date(d);
  const dayNr = (d.getUTCDay() + 6) % 7; // Mon=0
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week = 1 + Math.round((target - firstThursday) / (7 * DAY));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'weekly-self-reflection')
    .maybeSingle();

  return data?.config || {
    enabled: true,
    run_hour_utc: 7,
    run_day: 'sunday',
    model: DEFAULT_MODEL,
    max_report_words: 600,
    anomaly_critical_threshold_dispatch_delivery: 80,
    anomaly_critical_threshold_distress_unresolved: 3,
    anomaly_warning_threshold_synthesis_backlog: 5,
  };
}

// Enabled/disabled state for every agent, so a deliberately-disabled agent is
// not flagged as a "did not fire" anomaly.
async function getFleetEnabledState() {
  const { data } = await supabase.from('agent_config').select('agent_name, config');
  const byName = {};
  for (const row of data || []) byName[row.agent_name] = row.config || {};
  // Map the config rows we know about onto the fleet keys. Agents without a
  // config row are treated as enabled (corpus/journal/gap have none today).
  return {
    corpus: byName['corpus_agent']?.enabled ?? true,
    journal: byName['journal_agent']?.enabled ?? true,
    gap: byName['gap_agent']?.enabled ?? true,
    synthesis: byName['synthesis_agent']?.enabled ?? true,
    dispatch: byName['dispatch_agent']?.enabled ?? true,
    world: byName['world-agent']?.enabled ?? true,
    longitudinal: byName['longitudinal-user-model']?.enabled ?? true,
    tension: byName['tension-agent']?.enabled ?? true,
    inquiry: byName['inquiry-agent']?.enabled ?? true,
    dreaming: byName['dreaming-agent']?.enabled ?? true,
    self_reflection: byName['weekly-self-reflection']?.enabled ?? true,
  };
}

// --- Corpus health ---------------------------------------------------------

async function gatherCorpusHealth(sinceISO) {
  // Aggregate counts via the RPC — rag_corpus is ~7k rows and a client select()
  // is capped at 1000 by PostgREST, which would undercount badly.
  const { data: stats } = await supabase
    .rpc('system_reflection_corpus_stats', { since: sinceISO })
    .maybeSingle();

  const total = Number(stats?.total_chunks ?? 0);
  const added = Number(stats?.chunks_added ?? 0);
  const authors = Number(stats?.authors_covered ?? 0);

  // Ingestion runs this week (small table — fetch rows to derive both counts).
  const { data: runs } = await supabase
    .from('corpus_ingestion_runs')
    .select('status, sources_failed, run_started_at')
    .gte('run_started_at', sinceISO);

  const runsThisWeek = (runs || []).length;
  const failuresThisWeek = (runs || []).filter(
    r => (r.status && r.status !== 'completed') || (r.sources_failed || 0) > 0
  ).length;
  const lastCorpusRun = (runs || [])
    .map(r => r.run_started_at)
    .sort()
    .pop() || null;

  // Tier gaps: significance map vs actual per-author+work chunk counts.
  const [{ data: sigMap }, { data: counts }] = await Promise.all([
    supabase.from('corpus_significance_map').select('author, work, tier, chunk_threshold').eq('active', true),
    supabase.rpc('corpus_work_counts'),
  ]);

  const countMap = {};
  for (const row of counts || []) countMap[`${row.author}|||${row.work}`] = Number(row.cnt);

  const tier1Gaps = [];
  const tier2Gaps = [];
  for (const entry of sigMap || []) {
    const actual = countMap[`${entry.author}|||${entry.work}`] || 0;
    const deficit = (entry.chunk_threshold || 0) - actual;
    if (deficit <= 0) continue;
    const gap = {
      author: entry.author,
      work: entry.work,
      tier: entry.tier,
      actual_chunks: actual,
      threshold: entry.chunk_threshold,
      deficit,
    };
    if (entry.tier === 1) tier1Gaps.push(gap);
    else if (entry.tier === 2) tier2Gaps.push(gap);
  }

  return {
    corpus_total_chunks: total,
    corpus_chunks_added_this_week: added,
    corpus_authors_covered: authors,
    corpus_tier1_gaps: tier1Gaps,
    corpus_tier2_gaps: tier2Gaps,
    ingestion_runs_this_week: runsThisWeek,
    ingestion_failures_this_week: failuresThisWeek,
    _lastCorpusRun: lastCorpusRun,
  };
}

// --- Agent performance + engagement ----------------------------------------

async function gatherAgentAndEngagement(sinceISO) {
  const [
    journalRows,
    gapReports,
    synthThisWeek,
    synthPendingCount,
    dispatches,
    distressRows,
    distressUnresolved,
    worldRows,
    longitudinalRows,
    tensionRows,
    inquiryRows,
    dreamRows,
  ] = await Promise.all([
    supabase.from('journal_analysis')
      .select('user_id, delivered, created_at').gte('created_at', sinceISO),
    supabase.from('corpus_gap_reports')
      .select('report_week, recommended_additions, created_at').gte('created_at', sinceISO),
    supabase.from('synthesis_documents')
      .select('status, created_at').gte('created_at', sinceISO),
    supabase.from('synthesis_documents')
      .select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('daily_dispatches')
      .select('total_recipients, delivered_count, created_at, dispatch_date').gte('created_at', sinceISO),
    supabase.from('distress_review_queue')
      .select('status, created_at, reviewed_at').gte('created_at', sinceISO),
    supabase.from('distress_review_queue')
      .select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    // The weekly agents: "fired" means their output table gained rows this week.
    supabase.from('world_observations')
      .select('generated_at').gte('generated_at', sinceISO),
    supabase.from('user_longitudinal_models')
      .select('portrait_updated_at').gte('portrait_updated_at', sinceISO),
    supabase.from('philosophical_tensions')
      .select('generated_at').gte('generated_at', sinceISO),
    supabase.from('open_inquiries')
      .select('generated_at').gte('generated_at', sinceISO),
    supabase.from('corpus_dreams')
      .select('generated_at').gte('generated_at', sinceISO),
  ]);

  const journal = journalRows.data || [];
  const gaps = gapReports.data || [];
  const synth = synthThisWeek.data || [];
  const dsp = dispatches.data || [];
  const distress = distressRows.data || [];

  // --- Synthesis ---
  const synthGenerated = synth.length;
  const synthApproved = synth.filter(d => d.status === 'approved' || d.status === 'ingested').length;
  const synthPending = synthPendingCount.count ?? 0; // total backlog, not just this week

  // --- Gap ---
  const gapReportsGenerated = gaps.length;
  let gapActioned = 0;
  for (const r of gaps) {
    const recs = Array.isArray(r.recommended_additions) ? r.recommended_additions : [];
    gapActioned += recs.filter(x => x && x.queued === true).length;
  }

  // --- Engagement ---
  const activeUsers = new Set(journal.map(r => r.user_id).filter(Boolean)).size;
  const insightsDelivered = journal.filter(r => r.delivered === true).length;

  const totalRecipients = dsp.reduce((s, d) => s + (d.total_recipients || 0), 0);
  const totalDelivered = dsp.reduce((s, d) => s + (d.delivered_count || 0), 0);
  const dispatchesSent = dsp.length;
  const deliveryRate = totalRecipients > 0
    ? Math.round((totalDelivered / totalRecipients) * 10000) / 100
    : null; // null = no recipients to deliver to (not a delivery failure)

  const distressThisWeek = distress.length;
  const distressResolved = distress.filter(
    d => (d.status === 'resolved' || d.status === 'reviewed') && d.reviewed_at
  ).length;

  // --- last-run timestamps for agent_status ---
  const lastJournal = journal.map(r => r.created_at).sort().pop() || null;
  const lastGap = gaps.map(r => r.created_at).sort().pop() || null;
  const lastSynth = synth.map(r => r.created_at).sort().pop() || null;
  const lastDispatch = dsp.map(r => r.created_at).sort().pop() || null;

  const world = worldRows.data || [];
  const longitudinal = longitudinalRows.data || [];
  const tensions = tensionRows.data || [];
  const inquiries = inquiryRows.data || [];
  const dreams = dreamRows.data || [];
  const lastWorld = world.map(r => r.generated_at).sort().pop() || null;
  const lastLongitudinal = longitudinal.map(r => r.portrait_updated_at).sort().pop() || null;
  const lastTension = tensions.map(r => r.generated_at).sort().pop() || null;
  const lastInquiry = inquiries.map(r => r.generated_at).sort().pop() || null;
  const lastDream = dreams.map(r => r.generated_at).sort().pop() || null;

  return {
    synthesis_docs_generated: synthGenerated,
    synthesis_docs_approved: synthApproved,
    synthesis_docs_pending: synthPending,
    gap_reports_generated: gapReportsGenerated,
    gap_recommendations_actioned: gapActioned,
    active_users_this_week: activeUsers,
    dispatches_sent: dispatchesSent,
    dispatch_delivery_rate: deliveryRate,
    insights_delivered: insightsDelivered,
    distress_flags_this_week: distressThisWeek,
    distress_flags_resolved: distressResolved,
    _distressUnresolved: distressUnresolved.count ?? 0,
    _fired: {
      journal: journal.length > 0,
      gap: gaps.length > 0,
      synthesis: synth.length > 0,
      dispatch: dsp.length > 0,
      world: world.length > 0,
      longitudinal: longitudinal.length > 0,
      tension: tensions.length > 0,
      inquiry: inquiries.length > 0,
      dreaming: dreams.length > 0,
    },
    _lastRun: {
      journal: lastJournal,
      gap: lastGap,
      synthesis: lastSynth,
      dispatch: lastDispatch,
      world: lastWorld,
      longitudinal: lastLongitudinal,
      tension: lastTension,
      inquiry: lastInquiry,
      dreaming: lastDream,
    },
  };
}

// --- Anomaly detection -----------------------------------------------------

function detectAnomalies(metrics, agentStatus, enabled, config) {
  const anomalies = [];
  const crit = (domain, message) => anomalies.push({ severity: 'critical', domain, message });
  const warn = (domain, message) => anomalies.push({ severity: 'warning', domain, message });

  const deliveryThreshold = config.anomaly_critical_threshold_dispatch_delivery ?? 80;
  const distressThreshold = config.anomaly_critical_threshold_distress_unresolved ?? 3;
  const synthBacklogThreshold = config.anomaly_warning_threshold_synthesis_backlog ?? 5;

  // Any enabled agent that did not fire at all this week. CRITICAL for
  // cron-scheduled agents; only a WARNING for the manually-run agents
  // (MANUAL_AGENTS) whose crons are not scheduled yet — a quiet week there
  // is Kyle not pressing the button, not a system failure.
  for (const key of FLEET) {
    if (key === 'self_reflection') continue; // it's firing right now by definition
    if (enabled[key] && agentStatus[key] && agentStatus[key].fired === false) {
      if (MANUAL_AGENTS.has(key)) {
        warn('agents', `The ${key} agent did not fire this week (manually run — its cron is not scheduled yet).`);
      } else {
        crit('agents', `The ${key} agent did not fire at all this week (0 runs).`);
      }
    }
  }

  // CRITICAL — dispatch delivery rate below threshold (only when there were recipients).
  if (metrics.dispatch_delivery_rate != null && metrics.dispatch_delivery_rate < deliveryThreshold) {
    crit('engagement', `Dispatch delivery rate was ${metrics.dispatch_delivery_rate}% — below the ${deliveryThreshold}% floor.`);
  }

  // CRITICAL — more than N unresolved distress flags in the queue.
  if (metrics._distressUnresolved > distressThreshold) {
    crit('engagement', `${metrics._distressUnresolved} unresolved distress flags in the review queue (threshold ${distressThreshold}). Triage them in the admin dashboard.`);
  }

  // CRITICAL — any Tier 1 author below their chunk threshold.
  for (const gap of metrics.corpus_tier1_gaps || []) {
    if (TIER1_AUTHORS.includes(gap.author)) {
      crit('corpus', `Tier 1 author ${gap.author} (${gap.work}) is below threshold — ${gap.actual_chunks}/${gap.threshold} chunks (${gap.deficit} short).`);
    }
  }

  // WARNING — corpus added 0 new chunks this week.
  if ((metrics.corpus_chunks_added_this_week || 0) === 0) {
    warn('corpus', 'The corpus added 0 new chunks this week.');
  }

  // WARNING — synthesis review backlog above threshold.
  if ((metrics.synthesis_docs_pending || 0) > synthBacklogThreshold) {
    warn('agents', `${metrics.synthesis_docs_pending} synthesis documents are pending review (threshold ${synthBacklogThreshold}). Clear the queue in the Synthesis tab.`);
  }

  // WARNING — gap agent fired but 0 recommendations were acted on.
  if (metrics.gap_reports_generated > 0 && (metrics.gap_recommendations_actioned || 0) === 0) {
    warn('agents', 'The gap agent produced a report but 0 recommendations were actioned (no new sources queued).');
  }

  // WARNING — any ingestion run failure this week.
  if ((metrics.ingestion_failures_this_week || 0) > 0) {
    warn('corpus', `${metrics.ingestion_failures_this_week} ingestion run(s) failed this week.`);
  }

  return anomalies;
}

// --- Claude generation -----------------------------------------------------

const SYSTEM_PROMPT = `You are the self-reflection layer of the Arete AI agent system — a living philosophical platform built on the Stoic corpus. Your job is to look at what the system did this week, assess its health honestly, surface anomalies, and recommend specific actions to the founder.

You write to a single reader: the founder of Arete. He is a Stoic practitioner and public health researcher. He built this system. He can handle direct, honest assessment. Do not soften failures. Do not inflate successes.

Your tone: precise, direct, warm where warranted. The system is trying to become excellent. Report on whether it did.

Every recommended action must be specific and immediately actionable — not "consider improving X" but "approve the 3 pending synthesis documents in the admin dashboard" or "queue Musonius Rufus in the corpus ingestion page."

Philosophical guardrail: you are reporting on an organism built to serve human flourishing. Keep that in view. When the system performs well, say so. When it fails, say so and say why it matters.`;

function buildUserMessage(gathered, maxWords) {
  return `Here is the full data gathered for this week's self-reflection:

\`\`\`json
${JSON.stringify(gathered, null, 2)}
\`\`\`

Based on this data, produce:

1. A report_title (8 words or fewer — captures the essential character of this week)
2. A report_body (400–${maxWords} words prose narrative covering all four domains: corpus health, agent performance, user engagement, system trajectory — week-over-week trend if prior week data exists)
3. A recommended_actions array (3–7 items, each with priority, action, rationale)

Respond ONLY with valid JSON matching this schema:
{
  "report_title": "string",
  "report_body": "string",
  "recommended_actions": [
    { "priority": "high|medium|low", "action": "string", "rationale": "string" }
  ]
}`;
}

async function callClaude(model, userMessage) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
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

// --- Main ------------------------------------------------------------------

async function runWeeklySelfReflection() {
  const startTime = Date.now();
  console.log(`=== Weekly Self-Reflection Agent — ${new Date().toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }

  const config = await getAgentConfig();
  if (!config.enabled) {
    console.log('Self-reflection agent disabled in config. Exiting.');
    return { disabled: true };
  }

  const reflectionWeek = getMondayOfCurrentWeek();
  const weekLabel = isoWeekLabel(reflectionWeek);
  const sinceISO = new Date(Date.now() - 7 * DAY).toISOString();

  // 1. Gather.
  const [corpus, perf, enabled] = await Promise.all([
    gatherCorpusHealth(sinceISO),
    gatherAgentAndEngagement(sinceISO),
    getFleetEnabledState(),
  ]);

  // Prior week (for week-over-week trend in the prose).
  const { data: priorWeek } = await supabase
    .from('system_reflections')
    .select('reflection_week, corpus_total_chunks, corpus_chunks_added_this_week, active_users_this_week, dispatch_delivery_rate, synthesis_docs_pending, anomalies')
    .lt('reflection_week', reflectionWeek)
    .order('reflection_week', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Agent status map.
  const agentStatus = {
    corpus: { fired: corpus.ingestion_runs_this_week > 0, failures: corpus.ingestion_failures_this_week, last_run: corpus._lastCorpusRun },
    journal: { fired: perf._fired.journal, failures: 0, last_run: perf._lastRun.journal },
    gap: { fired: perf._fired.gap, failures: 0, last_run: perf._lastRun.gap },
    synthesis: { fired: perf._fired.synthesis, failures: 0, last_run: perf._lastRun.synthesis },
    dispatch: { fired: perf._fired.dispatch, failures: 0, last_run: perf._lastRun.dispatch },
    world: { fired: perf._fired.world, failures: 0, last_run: perf._lastRun.world },
    longitudinal: { fired: perf._fired.longitudinal, failures: 0, last_run: perf._lastRun.longitudinal },
    tension: { fired: perf._fired.tension, failures: 0, last_run: perf._lastRun.tension },
    inquiry: { fired: perf._fired.inquiry, failures: 0, last_run: perf._lastRun.inquiry },
    dreaming: { fired: perf._fired.dreaming, failures: 0, last_run: perf._lastRun.dreaming },
    self_reflection: { fired: true, failures: 0, last_run: new Date().toISOString() },
  };
  const agentsFired = FLEET.filter(k => agentStatus[k].fired).length;

  // Combined metrics object (strip the private _-prefixed helpers for storage).
  const metrics = {
    corpus_total_chunks: corpus.corpus_total_chunks,
    corpus_chunks_added_this_week: corpus.corpus_chunks_added_this_week,
    corpus_authors_covered: corpus.corpus_authors_covered,
    corpus_tier1_gaps: corpus.corpus_tier1_gaps,
    corpus_tier2_gaps: corpus.corpus_tier2_gaps,
    ingestion_runs_this_week: corpus.ingestion_runs_this_week,
    ingestion_failures_this_week: corpus.ingestion_failures_this_week,
    synthesis_docs_generated: perf.synthesis_docs_generated,
    synthesis_docs_approved: perf.synthesis_docs_approved,
    synthesis_docs_pending: perf.synthesis_docs_pending,
    gap_reports_generated: perf.gap_reports_generated,
    gap_recommendations_actioned: perf.gap_recommendations_actioned,
    active_users_this_week: perf.active_users_this_week,
    dispatches_sent: perf.dispatches_sent,
    dispatch_delivery_rate: perf.dispatch_delivery_rate,
    insights_delivered: perf.insights_delivered,
    distress_flags_this_week: perf.distress_flags_this_week,
    distress_flags_resolved: perf.distress_flags_resolved,
    _distressUnresolved: perf._distressUnresolved,
  };

  // 3. Anomalies.
  const anomalies = detectAnomalies(metrics, agentStatus, enabled, config);
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;

  // 4. Claude generation.
  const gathered = {
    reflection_week: reflectionWeek,
    iso_week: weekLabel,
    corpus_health: {
      total_chunks: metrics.corpus_total_chunks,
      chunks_added_this_week: metrics.corpus_chunks_added_this_week,
      authors_covered: metrics.corpus_authors_covered,
      tier1_gaps: metrics.corpus_tier1_gaps,
      tier2_gaps: metrics.corpus_tier2_gaps,
      ingestion_runs_this_week: metrics.ingestion_runs_this_week,
      ingestion_failures_this_week: metrics.ingestion_failures_this_week,
    },
    agent_performance: {
      agents_fired: `${agentsFired}/${FLEET.length}`,
      agent_status: agentStatus,
      synthesis: {
        generated: metrics.synthesis_docs_generated,
        approved: metrics.synthesis_docs_approved,
        pending_review_backlog: metrics.synthesis_docs_pending,
      },
      gap: {
        reports_generated: metrics.gap_reports_generated,
        recommendations_actioned: metrics.gap_recommendations_actioned,
      },
    },
    user_engagement: {
      active_users_this_week: metrics.active_users_this_week,
      dispatches_sent: metrics.dispatches_sent,
      dispatch_delivery_rate_pct: metrics.dispatch_delivery_rate,
      insights_delivered: metrics.insights_delivered,
      distress_flags_this_week: metrics.distress_flags_this_week,
      distress_flags_resolved: metrics.distress_flags_resolved,
      distress_flags_unresolved_total: metrics._distressUnresolved,
    },
    anomalies,
    prior_week: priorWeek || null,
  };

  console.log(`Gathered data for ${weekLabel}. Calling Claude (${config.model || DEFAULT_MODEL})…`);
  let generated;
  try {
    generated = await callClaude(config.model, buildUserMessage(gathered, config.max_report_words || 600));
  } catch (err) {
    console.error('Claude generation failed:', err.message);
    throw err;
  }

  const recommendedActions = Array.isArray(generated.recommended_actions) ? generated.recommended_actions : [];

  // 5. Idempotent storage — re-runnable for the same week.
  const row = {
    reflection_week: reflectionWeek,
    corpus_total_chunks: metrics.corpus_total_chunks,
    corpus_chunks_added_this_week: metrics.corpus_chunks_added_this_week,
    corpus_authors_covered: metrics.corpus_authors_covered,
    corpus_tier1_gaps: metrics.corpus_tier1_gaps,
    corpus_tier2_gaps: metrics.corpus_tier2_gaps,
    ingestion_runs_this_week: metrics.ingestion_runs_this_week,
    ingestion_failures_this_week: metrics.ingestion_failures_this_week,
    agent_status: agentStatus,
    synthesis_docs_generated: metrics.synthesis_docs_generated,
    synthesis_docs_approved: metrics.synthesis_docs_approved,
    synthesis_docs_pending: metrics.synthesis_docs_pending,
    gap_reports_generated: metrics.gap_reports_generated,
    gap_recommendations_actioned: metrics.gap_recommendations_actioned,
    active_users_this_week: metrics.active_users_this_week,
    dispatches_sent: metrics.dispatches_sent,
    dispatch_delivery_rate: metrics.dispatch_delivery_rate,
    insights_delivered: metrics.insights_delivered,
    distress_flags_this_week: metrics.distress_flags_this_week,
    distress_flags_resolved: metrics.distress_flags_resolved,
    anomalies,
    recommended_actions: recommendedActions,
    report_title: generated.report_title || `Weekly Reflection — ${weekLabel}`,
    report_body: generated.report_body || '',
    model_used: config.model || DEFAULT_MODEL,
    generated_at: new Date().toISOString(),
    generation_duration_ms: Date.now() - startTime,
  };

  const { data: stored, error } = await supabase
    .from('system_reflections')
    .upsert(row, { onConflict: 'reflection_week' })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to store reflection: ${error.message}`);

  // 6. Railway stdout summary.
  console.log(`[weekly-self-reflection] Week: ${weekLabel}`);
  console.log(`[weekly-self-reflection] Corpus: ${metrics.corpus_total_chunks} chunks, +${metrics.corpus_chunks_added_this_week} this week, ${metrics.corpus_authors_covered} authors`);
  console.log(`[weekly-self-reflection] Agents: ${agentsFired}/${FLEET.length} fired | Synthesis: ${metrics.synthesis_docs_generated} generated, ${metrics.synthesis_docs_approved} approved`);
  console.log(`[weekly-self-reflection] Engagement: ${metrics.active_users_this_week} users | Dispatch: ${metrics.dispatch_delivery_rate == null ? 'n/a' : metrics.dispatch_delivery_rate + '%'} delivery`);
  console.log(`[weekly-self-reflection] Anomalies: ${criticalCount} critical, ${warningCount} warning`);
  console.log(`[weekly-self-reflection] Report saved. ID: ${stored.id}`);
  console.log(`Run time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  return {
    id: stored.id,
    reflectionWeek,
    weekLabel,
    agentsFired,
    anomalies: { critical: criticalCount, warning: warningCount },
    title: row.report_title,
  };
}

module.exports = {
  getMondayOfCurrentWeek,
  isoWeekLabel,
  getAgentConfig,
  gatherCorpusHealth,
  gatherAgentAndEngagement,
  detectAnomalies,
  runWeeklySelfReflection,
};

if (require.main === module) {
  runWeeklySelfReflection().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
