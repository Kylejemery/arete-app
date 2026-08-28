// server/agents/stoic-reply-agent.js
//
// Stoic Reply Pipeline — orchestrator. Scout (fetch + regex, no LLM) →
// Triage (Haiku hard safety gate, then Sonnet scoring) → Drafter (Opus,
// corpus-grounded). Output is a review queue at /admin/stoic-replies; every
// reply is approved, possibly edited, and manually posted by Kyle. Nothing in
// this pipeline posts anywhere, ever.
//
// Intended cadence: every 6 hours (railway.stoic-reply-agent.json), plus a
// "Run now" endpoint on the always-on server (Railway crons deploy ≠ run).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { runStoicScout, loadConfig } = require('./stoic-scout');
const { runStoicTriage } = require('./stoic-triage');
const { runStoicDrafter } = require('./stoic-drafter');

async function runStoicReplyAgent() {
  const startedAt = new Date().toISOString();
  const config = loadConfig();
  const summary = { startedAt, scout: null, triage: null, drafter: null, errors: [] };

  try {
    summary.scout = await runStoicScout(config);
  } catch (err) {
    console.error('[stoic-reply-agent] scout failed:', err.message);
    summary.errors.push(`scout: ${err.message}`);
  }

  try {
    summary.triage = await runStoicTriage(config.limits.max_triage_per_run);
  } catch (err) {
    console.error('[stoic-reply-agent] triage failed:', err.message);
    summary.errors.push(`triage: ${err.message}`);
  }

  try {
    summary.drafter = await runStoicDrafter(config.limits.max_drafts_per_run);
  } catch (err) {
    console.error('[stoic-reply-agent] drafter failed:', err.message);
    summary.errors.push(`drafter: ${err.message}`);
  }

  summary.finishedAt = new Date().toISOString();
  console.log('[stoic-reply-agent] done:', JSON.stringify({
    inserted: summary.scout?.inserted ?? 0,
    triaged: summary.triage?.triaged ?? 0,
    promoted: summary.triage?.promoted ?? 0,
    drafted: summary.drafter?.drafted ?? 0,
    declined: summary.drafter?.declined ?? 0,
    errors: summary.errors.length,
  }));
  return summary;
}

module.exports = { runStoicReplyAgent };

// Railway cron entrypoint: node agents/stoic-reply-agent.js
if (require.main === module) {
  runStoicReplyAgent()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[stoic-reply-agent] fatal:', err);
      process.exit(1);
    });
}
