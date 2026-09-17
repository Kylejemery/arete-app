// server/lib/quality-audit/framework.js
//
// The shape a quality probe has, and the machinery that runs a set of them.
//
// A probe is a named check that knows one thing about the system and returns
// findings — never throws for a normal negative result, never writes anything.
// The runner is what makes a nightly report readable: it catches a probe that
// breaks (a broken probe is itself a finding, not a dead run), applies the
// mute list, and diffs this run's fingerprints against the last one so the
// morning report leads with what changed rather than with the standing backlog.
//
//   { id, domain, title, needs, run(ctx) -> finding[] }
//
// `needs` declares what the probe cannot run without: 'db' (Supabase),
// 'repo' (a checkout on disk — absent on a Railway service rooted at server/),
// 'claude' (CLAUDE_API_KEY). A probe whose needs are unmet is skipped and says
// so, which is different from passing.

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

// A finding is one specific, actionable statement about one defect.
//
// `key` distinguishes findings the same probe can emit more than once (one per
// offending work, say). Together with the probe id it forms the fingerprint,
// which must stay stable across runs — it is what the diff and the mute list
// are keyed on, so it may never contain a count, a date, or anything else that
// changes while the underlying problem is the same problem.
function finding({ probe, domain, severity, title, detail, action, count = null, evidence = [], key = null }) {
  if (!SEVERITY_ORDER.hasOwnProperty(severity)) {
    throw new Error(`finding(${probe}): unknown severity "${severity}"`);
  }
  return {
    probe,
    domain,
    severity,
    title,
    detail,
    action,
    count,
    evidence: evidence.slice(0, 10),
    fingerprint: key ? `${probe}:${key}` : probe,
  };
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    if (a.domain !== b.domain) return a.domain < b.domain ? -1 : 1;
    return a.fingerprint < b.fingerprint ? -1 : 1;
  });
}

// Which of a probe's declared needs the environment cannot supply.
function unmetNeeds(probe, ctx) {
  const have = {
    db: !!ctx.supabase,
    repo: !!ctx.repoRoot,
    claude: !!ctx.claudeKey,
    openai: !!ctx.openaiKey,
  };
  return (probe.needs || []).filter(n => !have[n]);
}

// Run every probe in `probes`, in order, isolated from one another.
async function runProbes(probes, ctx) {
  const findings = [];
  const skipped = [];
  const errored = [];
  let ran = 0;

  for (const probe of probes) {
    const missing = unmetNeeds(probe, ctx);
    if (missing.length) {
      skipped.push({ id: probe.id, reason: `needs ${missing.join(', ')}` });
      ctx.log(`  - ${probe.id}: skipped (needs ${missing.join(', ')})`);
      continue;
    }

    const startedAt = Date.now();
    try {
      const result = (await probe.run(ctx)) || [];
      ran++;
      findings.push(...result);
      const ms = Date.now() - startedAt;
      ctx.log(`  ${result.length ? '!' : '+'} ${probe.id}: ${result.length} finding(s) (${ms}ms)`);
    } catch (err) {
      errored.push({ id: probe.id, error: err.message });
      ctx.log(`  x ${probe.id}: ERRORED — ${err.message}`);
      // A probe that cannot run is a hole in the audit, so report it as one
      // rather than letting the run look clean in that corner.
      findings.push(finding({
        probe: probe.id,
        domain: probe.domain,
        severity: 'warning',
        title: `Probe ${probe.id} failed to run`,
        detail: `The probe threw: ${err.message}. Whatever it checks went unchecked tonight.`,
        action: `Run \`node quality-audit-agent.js --probe ${probe.id}\` and fix the probe.`,
        key: 'probe-error',
      }));
    }
  }

  return { findings: sortFindings(findings), ran, skipped, errored };
}

// Drop findings whose fingerprint is muted and whose mute has not expired.
function applyMutes(findings, mutes) {
  const now = Date.now();
  const live = new Map();
  for (const m of mutes || []) {
    if (m.expires_at && new Date(m.expires_at).getTime() < now) continue;
    live.set(m.fingerprint, m);
  }
  const kept = [];
  const muted = [];
  for (const f of findings) {
    if (live.has(f.fingerprint)) muted.push({ ...f, muted_reason: live.get(f.fingerprint).reason });
    else kept.push(f);
  }
  return { kept, muted };
}

// Mark each finding new or ongoing against the previous run, and list the
// fingerprints that were there last night and are not there now.
function diffAgainstPrevious(findings, previousFindings) {
  const before = new Set((previousFindings || []).map(f => f.fingerprint));
  const now = new Set(findings.map(f => f.fingerprint));

  const marked = findings.map(f => ({ ...f, state: before.has(f.fingerprint) ? 'ongoing' : 'new' }));
  const resolved = (previousFindings || [])
    .filter(f => !now.has(f.fingerprint))
    .map(f => ({ fingerprint: f.fingerprint, title: f.title, severity: f.severity, domain: f.domain }));

  return { marked, resolved };
}

function countBySeverity(findings) {
  const counts = { critical: 0, warning: 0, info: 0, new: 0, ongoing: 0 };
  for (const f of findings) {
    counts[f.severity]++;
    if (f.state) counts[f.state]++;
  }
  return counts;
}

module.exports = {
  finding,
  sortFindings,
  runProbes,
  applyMutes,
  diffAgainstPrevious,
  countBySeverity,
  SEVERITY_ORDER,
};
