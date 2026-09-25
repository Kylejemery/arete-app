// The Cabinet's propose_adjustment tool (personalization run C, Part C2).
// The closing voice of a Cabinet turn may suggest one practice from the
// module registry, ending its reply with a marker the server strips:
//   [[ADJUST|module_key|what it would be for, in the person's words]]
// Nothing changes until the person says yes on the card, and the server
// checks every rule again at that moment. Pure rules here; the wiring is in
// server/index.js.
const registry = require('./module-registry');

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_USER_TURNS = 3;              // never in the first two turns
const WEEKLY_LIMIT = 2;                // proposals per person per 7 days
const WEEK_MS = 7 * DAY_MS;
const DECLINE_COOLDOWN_MS = 30 * DAY_MS;
const DISTRESS_LOOKBACK_DAYS = 14;

function ms(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
}

// Whether this turn may carry a proposal at all. recentProposals are this
// person's proposals from the Cabinet (source 'cabinet') in the last 30 days.
function proposalGate({ verified, cabinetThread, userTurns, distressedNow, recentProposals = [], sessionStart = null, now = Date.now() }) {
  if (!verified) return { allowed: false, reason: 'unverified' };
  if (!cabinetThread) return { allowed: false, reason: 'not_cabinet' };
  if (!(userTurns >= MIN_USER_TURNS)) return { allowed: false, reason: 'too_early' };
  if (distressedNow) return { allowed: false, reason: 'distress' };
  const fromCabinet = recentProposals.filter(p => (p.source || 'cabinet') === 'cabinet');
  const start = sessionStart != null ? sessionStart : now;
  if (fromCabinet.some(p => ms(p.created_at) != null && ms(p.created_at) >= start)) {
    return { allowed: false, reason: 'one_per_conversation' };
  }
  const thisWeek = fromCabinet.filter(p => ms(p.created_at) != null && now - ms(p.created_at) < WEEK_MS).length;
  if (thisWeek >= WEEKLY_LIMIT) return { allowed: false, reason: 'weekly_limit' };
  return { allowed: true, reason: null };
}

// The modules this person may be offered now: not already on, not excluded
// for them, not declined or undone in the last 30 days, not awaiting an
// answer on an open card.
function eligibleModules({ rows = [], recentProposals = [], isTeen = false, recentDistress = false, now = Date.now() }) {
  return registry.MODULE_KEYS.filter(key => {
    if (rows.some(r => r.module_key === key && r.enabled)) return false;
    if (registry.exclusionFor(key, { isTeen, recentDistress })) return false;
    for (const p of recentProposals) {
      if (p.module_key !== key) continue;
      if (p.status === 'offered') return false;
      if (p.status === 'declined' || p.status === 'undone') {
        const at = ms(p.responded_at || p.undone_at || p.created_at);
        if (at != null && now - at < DECLINE_COOLDOWN_MS) return false;
      }
    }
    return true;
  }).map(key => registry.getModule(key));
}

function proposalInstruction(modules) {
  if (!modules || modules.length === 0) return '';
  const list = modules.map(m => `- ${m.key}: ${m.label}. ${m.description}`).join('\n');
  return `\n\n[OFFERING A PRACTICE]\nIf, in this conversation, the person has described a need that one of these practices would genuinely serve, you may close your reply with one short sentence in your own voice suggesting it, followed on its own final line by exactly:\n[[ADJUST|<practice key>|<in their words, what it would be for, under 120 characters>]]\nPractices you may suggest:\n${list}\nThe line becomes a card they can accept or decline; they will not see the brackets. Suggest at most one, only when it plainly fits what they said, and never as a pitch. If nothing fits, leave this out entirely. Never combine it with any other offer or card. If you include it, do not also ask any other question about them.\n[END OFFERING A PRACTICE]`;
}

const ADJUST_MARKER = /\n?\s*\[\[ADJUST\|([a-z_]{1,40})(?:\|([^\]\n]{0,200}))?\]\]\s*$/;
const ANY_ADJUST_MARKER = /\[\[ADJUST\|[^\]]*\]\]/g;

// Returns { text, adjust }. text never contains a marker, even a malformed
// or unknown one.
function parseAdjustMarker(text) {
  if (typeof text !== 'string') return { text, adjust: null };
  const m = text.match(ADJUST_MARKER);
  const clean = text.replace(ANY_ADJUST_MARKER, '').replace(/\s+$/, '');
  if (!m || !registry.getModule(m[1])) return { text: clean, adjust: null };
  return { text: clean, adjust: { module_key: m[1], note: (m[2] || '').trim().slice(0, 280) } };
}

// The settings a proposal carries: the defaults, with the note in the
// module's free-text field.
function proposedSettings(key, note) {
  const mod = registry.getModule(key);
  if (!mod) return null;
  const r = registry.validateSettings(key, note ? { [mod.freeTextField]: note } : {}, { tier: 'free' });
  return r.ok ? r.settings : registry.defaultSettings(key);
}

// Undo: the rows to write back so user_app_config is exactly as it was
// before the proposal was accepted. priorState is [{ module_key, row }],
// row null when there was none.
function undoPlan(priorState) {
  return (Array.isArray(priorState) ? priorState : []).map(entry => (
    entry && entry.row
      ? { action: 'restore', module_key: entry.module_key, values: {
          enabled: entry.row.enabled,
          pinned: entry.row.pinned,
          settings: entry.row.settings,
          enabled_by: entry.row.enabled_by,
          proposal_id: entry.row.proposal_id ?? null,
          updated_at: entry.row.updated_at,
          ...(entry.row.grandfathered !== undefined ? { grandfathered: entry.row.grandfathered } : {}),
        } }
      : { action: 'delete', module_key: entry && entry.module_key }
  )).filter(p => p.module_key);
}

module.exports = {
  MIN_USER_TURNS,
  WEEKLY_LIMIT,
  DECLINE_COOLDOWN_MS,
  DISTRESS_LOOKBACK_DAYS,
  proposalGate,
  eligibleModules,
  proposalInstruction,
  parseAdjustMarker,
  proposedSettings,
  undoPlan,
};
