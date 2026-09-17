// server/quality-audit-agent.js
//
// Nightly Quality Audit Agent — the fleet's auditor.
//
// The other agents grow the system or measure what it is missing. The Corpus
// Agent ingests, the Coverage Gap Agent finds the works the corpus should hold
// and does not, the Weekly Self-Reflection Agent narrates how the week went.
// None of them asks whether what is already in there is correct. This one does,
// across four domains:
//
//   corpus    the standing rules — Part 5 metadata, the copyright rule, the
//             text_type fence, the two failure modes this pipeline has actually
//             hit (split identities, writes landing where retrieval does not
//             read) — plus the fences tested end to end with a real query.
//   library   the reading rooms and the Garden: shelf entries pointing at live
//             works, exhibits carrying what their status promises, works that
//             still present under a raw filename fragment.
//   repo      applied SQL that is not committed SQL, cron services pointed at
//             missing scripts, lint and typecheck, credentials in tracked
//             files, docs linking into the void.
//   material  the part no query can see: a bounded random sample of live
//             chunks, read by a model, checked for front matter, editorial
//             apparatus under the author's name, OCR wreckage, wrong labels.
//
// It reads and reports. It changes nothing — no deprecations, no re-ingests,
// no commits. Every finding names what to do; a person decides whether to.
//
// The report diffs against the previous run, so the morning brief leads with
// what changed. Findings Kyle has accepted as known debt go in
// quality_audit_mutes and stop appearing until the mute expires.
//
// Runnable three ways:
//   node quality-audit-agent.js                        (everything available)
//   node quality-audit-agent.js --domains corpus,repo   (a subset)
//   node quality-audit-agent.js --probe corpus.metadata_required --dry-run
//
// On a Railway cron service rooted at server/ the repo probes skip themselves,
// because there is no checkout to look at. See QUALITY_AUDIT_AGENT.md.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required),
//      CLAUDE_API_KEY (material probe + prose brief),
//      OPENAI_API_KEY (live retrieval fence probe).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { selectProbes, findRepoRoot, DOMAINS } = require('./lib/quality-audit');
const {
  runProbes, applyMutes, diffAgainstPrevious, countBySeverity,
} = require('./lib/quality-audit/framework');
const { callClaude } = require('./lib/quality-audit/claude');

const AGENT_NAME = 'quality-audit-agent';

const DEFAULT_CONFIG = {
  enabled: true,
  model: 'claude-sonnet-4-6',
  standards_since: '2026-09-02',   // the date Part 5 of the acquisition plan took effect
  migration_drift_since: '20260901',
  domains: DOMAINS,
  material_sample_size: 40,
  mode2_max_words: 1800,          // twice the Paper Agent's 900-word summary ceiling
  mode2_min_attribution: 0.5,     // below this, a long Mode 2 work does not read as a rewrite
  queue_stale_days: 7,
  brief_max_words: 400,
};

// --- CLI --------------------------------------------------------------------

function parseArgs(argv) {
  const args = { domains: null, probes: [], dryRun: false, json: false, brief: true, failOnCritical: false, sample: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--json') args.json = true;
    else if (a === '--no-brief') args.brief = false;
    else if (a === '--fail-on-critical') args.failOnCritical = true;
    else if (a === '--domains') args.domains = (argv[++i] || '').split(',').filter(Boolean);
    else if (a.startsWith('--domains=')) args.domains = a.slice(10).split(',').filter(Boolean);
    else if (a === '--probe') args.probes.push(argv[++i]);
    else if (a.startsWith('--probe=')) args.probes.push(a.slice(8));
    else if (a === '--sample') args.sample = parseInt(argv[++i], 10);
    else if (a.startsWith('--sample=')) args.sample = parseInt(a.slice(9), 10);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

const HELP = `Nightly Quality Audit Agent

  node quality-audit-agent.js [options]

  --domains a,b          only these domains (${DOMAINS.join(', ')})
  --probe <id>           only this probe (repeatable; overrides --domains)
  --sample <n>           override the material sample size (0 disables the read pass)
  --dry-run              run everything, write no report row
  --json                 print the findings as JSON instead of a brief
  --no-brief             skip the model-written prose brief
  --fail-on-critical     exit 1 if any critical finding survives the mute list
`;

// --- Config -----------------------------------------------------------------

async function loadConfig(supabase) {
  const { data } = await supabase
    .from('agent_config').select('config').eq('agent_name', AGENT_NAME).maybeSingle();
  return { ...DEFAULT_CONFIG, ...(data?.config || {}) };
}

// --- Brief ------------------------------------------------------------------

const BRIEF_SYSTEM = `You are the auditor of Arete — a living philosophical platform built on a Stoic RAG corpus. You have just finished a nightly quality audit and you are writing the brief its founder reads over coffee.

You write to one reader: the founder. He built this. He can take a direct assessment and he resents padding. Do not congratulate him, do not restate the findings as a list — he has the list. Tell him what matters tonight and why.

Hold two things apart:

1. What is broken. Rank by what it costs if left alone, not by how many rows it touches. A misattributed passage quoted in a counselor's voice is worse than a thousand rows missing an edition year. Say which finding you would fix first and why.

2. What could be better. The findings are evidence about the system, not just defects in it. A recurring class of defect usually means a gap at the write path, not a backlog to clear by hand. Where you see one, name the upstream fix. Where the findings suggest a genuine improvement that nothing has flagged as broken, say so.

If nothing important changed since last night, say that plainly and briefly. A short honest brief is better than a long one.

Write prose. No headings, no bullet lists, no preamble.`;

function buildBriefMessage(payload, maxWords) {
  return `Tonight's audit:

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Write the brief. At most ${maxWords} words.`;
}

async function generateBrief(ctx, findings, resolved, counts) {
  const payload = {
    run_date: ctx.runDate,
    counts,
    findings: findings.map(f => ({
      probe: f.probe, domain: f.domain, severity: f.severity, state: f.state,
      title: f.title, detail: f.detail, count: f.count,
      evidence: f.evidence.slice(0, 5), action: f.action,
    })),
    resolved_since_last_run: resolved,
    domains_covered: ctx.domainsCovered,
    probes_skipped: ctx.skipped,
  };

  return callClaude({
    apiKey: ctx.claudeKey,
    model: ctx.config.model,
    system: BRIEF_SYSTEM,
    message: buildBriefMessage(payload, ctx.config.brief_max_words),
    maxTokens: 2000,
  });
}

// The brief without a model: still the thing a person reads first.
function plainBrief(findings, resolved, counts) {
  if (!findings.length) {
    return resolved.length
      ? `Nothing outstanding. ${resolved.length} finding(s) cleared since the last run.`
      : 'Nothing outstanding.';
  }
  const lines = [
    `${counts.critical} critical, ${counts.warning} warning, ${counts.info} info ` +
    `(${counts.new} new since the last run, ${resolved.length} resolved).`,
    '',
  ];
  for (const f of findings) {
    lines.push(`[${f.severity}${f.state === 'new' ? ' · new' : ''}] ${f.title}`);
    lines.push(`    ${f.action}`);
  }
  return lines.join('\n');
}

// --- Output -----------------------------------------------------------------

function printReport(findings, resolved, counts, brief) {
  console.log('');
  console.log('='.repeat(72));
  console.log('QUALITY AUDIT');
  console.log('='.repeat(72));
  console.log('');
  console.log(brief);
  console.log('');

  if (findings.length) {
    console.log('-'.repeat(72));
    for (const f of findings) {
      const state = f.state === 'new' ? ' · NEW' : '';
      console.log(`\n[${f.severity.toUpperCase()}${state}] ${f.title}`);
      console.log(`  probe:  ${f.probe}`);
      console.log(`  why:    ${f.detail}`);
      if (f.evidence.length) {
        for (const e of f.evidence.slice(0, 5)) console.log(`          · ${e}`);
        if (f.evidence.length > 5) console.log(`          · … ${f.evidence.length - 5} more`);
      }
      console.log(`  do:     ${f.action}`);
      console.log(`  mute:   insert into quality_audit_mutes (fingerprint, reason) values ('${f.fingerprint}', '…');`);
    }
    console.log('');
  }

  if (resolved.length) {
    console.log('-'.repeat(72));
    console.log('\nResolved since the last run:');
    for (const r of resolved) console.log(`  · ${r.title}`);
    console.log('');
  }
}

// --- Main -------------------------------------------------------------------

async function runQualityAudit(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(HELP);
    return { findings: [], counts: {} };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const config = await loadConfig(supabase);
  if (args.sample !== null && Number.isFinite(args.sample)) config.material_sample_size = args.sample;

  if (config.enabled === false && !args.probes.length) {
    console.log('quality-audit-agent is disabled in agent_config. Nothing to do.');
    return { findings: [], counts: {} };
  }

  const runDate = new Date().toISOString().split('T')[0];
  const domains = args.domains || config.domains || DOMAINS;
  const probes = selectProbes({ domains, ids: args.probes });

  const repoRoot = findRepoRoot(__dirname);
  const ctx = {
    supabase,
    config,
    runDate,
    repoRoot,
    claudeKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || null,
    openaiKey: process.env.OPENAI_API_KEY || null,
    log: msg => console.log(msg),
  };

  console.log(`\nQuality Audit — ${runDate}`);
  console.log(`  probes:    ${probes.length}${args.probes.length ? ' (explicit)' : ` across ${domains.join(', ')}`}`);
  console.log(`  checkout:  ${repoRoot || 'not present — repo probes will skip'}`);
  console.log(`  model:     ${ctx.claudeKey ? config.model : 'no CLAUDE_API_KEY — material probe and prose brief will skip'}`);
  console.log('');

  // Claim the row up front so a run that dies mid-flight is visible as a
  // failure rather than as a night that never happened.
  let reportId = null;
  if (!args.dryRun) {
    const { data, error } = await supabase
      .from('quality_audit_reports')
      .insert({ run_date: runDate, status: 'running', domains })
      .select('id').single();
    if (error) throw new Error(`could not open report row: ${error.message}`);
    reportId = data.id;
  }

  try {
    const { findings: raw, ran, skipped, errored } = await runProbes(probes, ctx);
    ctx.skipped = skipped;
    ctx.domainsCovered = [...new Set(probes.map(p => p.domain))];

    const { data: mutes } = await supabase.from('quality_audit_mutes').select('*');
    const { kept, muted } = applyMutes(raw, mutes);
    if (muted.length) console.log(`\n  ${muted.length} finding(s) muted.`);

    // Diff against the last completed run in the same shape. A partial run
    // (--domains corpus) must not "resolve" everything it did not look at.
    const { data: previous } = await supabase
      .from('quality_audit_reports')
      .select('findings')
      .eq('status', 'completed')
      .contains('domains', domains)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { marked, resolved } = diffAgainstPrevious(kept, previous?.findings || []);
    const counts = countBySeverity(marked);

    let brief = plainBrief(marked, resolved, counts);
    if (args.brief && ctx.claudeKey) {
      try {
        brief = await generateBrief(ctx, marked, resolved, counts);
      } catch (err) {
        console.error(`  brief generation failed (${err.message}); falling back to the plain brief.`);
      }
    }

    if (args.json) {
      console.log(JSON.stringify({ run_date: runDate, counts, findings: marked, resolved, muted, skipped, errored }, null, 2));
    } else {
      printReport(marked, resolved, counts, brief);
    }

    if (reportId) {
      const { error } = await supabase.from('quality_audit_reports').update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        probes_run: ran,
        probes_skipped: skipped.length,
        probes_errored: errored.length,
        // The list, not just the count: a reader has to be able to tell a
        // domain that came back clean from one that was never looked at.
        skipped,
        counts,
        findings: marked,
        resolved,
        brief,
      }).eq('id', reportId);
      if (error) console.error(`  WARNING: report write failed: ${error.message}`);
      else console.log(`  report: quality_audit_reports/${reportId}`);
    }

    if (args.failOnCritical && counts.critical > 0) process.exitCode = 1;
    return { findings: marked, counts, resolved, brief };
  } catch (err) {
    if (reportId) {
      await supabase.from('quality_audit_reports').update({
        status: 'failed', finished_at: new Date().toISOString(), error: err.message,
      }).eq('id', reportId);
    }
    throw err;
  }
}

if (require.main === module) {
  runQualityAudit()
    .then(() => { if (!process.exitCode) process.exit(0); else process.exit(process.exitCode); })
    .catch(err => { console.error('\nQuality audit failed:', err.message); process.exit(1); });
}

module.exports = { runQualityAudit, DEFAULT_CONFIG };
