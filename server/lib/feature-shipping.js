// Telling the people who asked when their idea ships (personalization run
// C, Part C4). A cluster is marked shipped only with a module registry key.
// Each person who asked is told once per cluster: a counselor line in their
// Cabinet thread, a push, and a proposal card to turn the practice on. Pure
// planning here; the endpoint in server/index.js does the writes.
const registry = require('./module-registry');

// Who is told, and why anyone is not. requesters: [{ user_id, counselor_id }]
// (one per person), notified: Set of user ids already told for this cluster,
// subjects: Map user_id -> { isTeen, recentDistress, enabledModules: Set }.
function planNotifications({ moduleKey, requesters = [], notified = new Set(), subjects = new Map() }) {
  const seen = new Set();
  const plan = [];
  for (const r of requesters) {
    if (!r || !r.user_id || seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    const subject = subjects.get(r.user_id) || {};
    let reason = null;
    if (notified.has(r.user_id)) reason = 'already_notified';
    else if (subject.enabledModules && subject.enabledModules.has(moduleKey)) reason = 'already_on';
    else reason = registry.exclusionFor(moduleKey, { isTeen: !!subject.isTeen, recentDistress: !!subject.recentDistress });
    plan.push({ user_id: r.user_id, counselor_id: r.counselor_id || null, action: reason ? 'skip' : 'notify', reason });
  }
  return plan;
}

// The counselor's line in the Cabinet thread. The summary is the neutral,
// anonymized sentence the person agreed to pass along.
function shippedLine({ summary, moduleKey }) {
  const mod = registry.getModule(moduleKey);
  const label = mod ? mod.label.toLowerCase() : 'it';
  const what = summary ? ` You asked whether Arete could do this: "${String(summary).replace(/\.$/, '')}".` : '';
  return `Some time ago you asked for something, and I passed it along.${what} It is here now, as the ${label}. Would you like me to turn it on for you?`;
}

const PUSH_BODY = 'Something you asked for is here.';

module.exports = { planNotifications, shippedLine, PUSH_BODY };
