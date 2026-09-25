// "Your practices": the modules a person has on (personalization run C).
// The rules are pure functions over plain data so they can be tested; the
// few database helpers take the service-role client as an argument.
const registry = require('./module-registry');

const TEEN_BANDS = ['13_15', '16_17'];

function isPaidTier(tier) {
  return tier === 'premium' || tier === 'pro';
}

// The settings to store when a person edits a practice. Free keeps every
// stored setting and changes only the free-text field; paid tiers may change
// any setting. Either way the result is validated against the registry, and
// nothing the person set earlier is dropped (a downgrade keeps what a paid
// month configured).
function mergeSettings(key, existing, input, { tier = 'free' } = {}) {
  const mod = registry.getModule(key);
  if (!mod) return { ok: false, error: 'unknown_module' };
  const base = registry.validateSettings(key, existing || {}, { tier: 'premium' });
  const current = base.ok ? base.settings : registry.defaultSettings(key);
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const changes = isPaidTier(tier)
    ? raw
    : (raw[mod.freeTextField] !== undefined ? { [mod.freeTextField]: raw[mod.freeTextField] } : {});
  return registry.validateSettings(key, { ...current, ...changes }, { tier: 'premium' });
}

async function loadRow(supabase, userId, key) {
  const { data, error } = await supabase
    .from('user_app_config')
    .select('id, user_id, module_key, enabled, pinned, settings, enabled_by, proposal_id, created_at, updated_at')
    .eq('user_id', userId)
    .eq('module_key', key)
    .maybeSingle();
  if (error) throw new Error('practice lookup failed');
  return data;
}

async function loadRows(supabase, userId) {
  const { data, error } = await supabase
    .from('user_app_config')
    .select('id, user_id, module_key, enabled, pinned, settings, enabled_by, proposal_id, created_at, updated_at')
    .eq('user_id', userId);
  if (error) throw new Error('practice lookup failed');
  return data || [];
}

module.exports = {
  TEEN_BANDS,
  isPaidTier,
  mergeSettings,
  loadRow,
  loadRows,
};
