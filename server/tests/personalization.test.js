// Personalization run C: module registry, practices, proposals, feature
// requests and the free-tier module limit. Run with `npm test` in server/.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const registry = require('../lib/module-registry');
const practices = require('../lib/practices');

const ROOT = path.join(__dirname, '..', '..');

// ── C1: registry ─────────────────────────────────────────────────────────────

test('the registry holds the four modules with a tier, exclusions and a free-text field', () => {
  assert.deepEqual(registry.MODULE_KEYS, ['focus_timer', 'evening_review', 'premeditatio', 'habit_tracker']);
  for (const key of registry.MODULE_KEYS) {
    const m = registry.getModule(key);
    assert.ok(registry.TIERS.includes(m.tier), key);
    assert.ok(Array.isArray(m.excludedFor), key);
    assert.equal(m.tier === 'surface_existing', !!m.existingFeature, `${key}: existing_feature iff surface_existing`);
    assert.ok(Object.keys(registry.defaultSettings(key)).includes(m.freeTextField), key);
  }
  assert.equal(registry.getModule('toString'), null);
  assert.equal(registry.getModule('nope'), null);
});

test('settings are validated: free text is capped at 280 characters, unknown keys are refused', () => {
  assert.equal(registry.validateSettings('habit_tracker', { habit: 'x'.repeat(280) }, { tier: 'premium' }).ok, true);
  const long = registry.validateSettings('habit_tracker', { habit: 'x'.repeat(281) }, { tier: 'premium' });
  assert.equal(long.ok, false);
  assert.equal(long.error, 'invalid_setting:habit');
  assert.equal(registry.validateSettings('focus_timer', { minutes: 25, colour: 'red' }, { tier: 'premium' }).ok, false);
  assert.equal(registry.validateSettings('focus_timer', { minutes: 500 }, { tier: 'premium' }).ok, false);
  assert.equal(registry.validateSettings('nope', {}).ok, false);
});

test('the validation error never echoes the value', () => {
  const r = registry.validateSettings('premeditatio', { focus: 'my private worry '.repeat(30) }, { tier: 'premium' });
  assert.equal(r.ok, false);
  assert.ok(!r.error.includes('private'));
});

test('exclusions: premeditatio is never offered to teens or after recent distress', () => {
  assert.equal(registry.exclusionFor('premeditatio', { isTeen: true }), 'teen');
  assert.equal(registry.exclusionFor('premeditatio', { recentDistress: true }), 'recent_distress');
  assert.equal(registry.exclusionFor('premeditatio', {}), null);
  assert.equal(registry.exclusionFor('habit_tracker', { isTeen: true, recentDistress: true }), null);
});

test('the client registries carry the same keys, tiers and free-text fields as the server', () => {
  const server = registry.MODULE_KEYS.map(k => `${k}:${registry.getModule(k).tier}:${registry.getModule(k).freeTextField}`);
  for (const rel of ['lib/modules.ts', 'web/src/lib/modules.ts']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const found = [...src.matchAll(/key: '([a-z_]+)', label: '[^']+', tier: '([a-z_]+)', freeTextField: '([a-z_]+)'/g)]
      .map(m => `${m[1]}:${m[2]}:${m[3]}`);
    assert.deepEqual(found, server, rel);
  }
});

// ── C1: practices ────────────────────────────────────────────────────────────

test('free edits change only the free-text field and keep every other stored setting', () => {
  const r = practices.mergeSettings('focus_timer', { minutes: 45, intention: 'old' }, { minutes: 10, intention: 'new' }, { tier: 'free' });
  assert.deepEqual(r, { ok: true, settings: { minutes: 45, intention: 'new' } });
});

test('paid edits may change any setting, still validated', () => {
  assert.deepEqual(
    practices.mergeSettings('focus_timer', { minutes: 25, intention: '' }, { minutes: 50 }, { tier: 'premium' }).settings,
    { minutes: 50, intention: '' },
  );
  assert.equal(practices.mergeSettings('focus_timer', {}, { minutes: 3 }, { tier: 'pro' }).ok, false);
});

test('user_app_config: only the backend writes, so only the backend can set enabled_by cabinet', () => {
  const file = fs.readdirSync(path.join(ROOT, 'supabase', 'migrations')).find(f => f.endsWith('_user_app_config.sql'));
  assert.ok(file);
  const sql = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', file), 'utf8');
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON user_app_config FROM anon, authenticated/);
  const policies = [...sql.matchAll(/CREATE POLICY [^\n]+ ON user_app_config\s+FOR (\w+)/g)].map(m => m[1]);
  assert.deepEqual(policies, ['SELECT']);
});

// ── C5: an unpersonalized Home is what it was ───────────────────────────────

test('Your practices is the last thing on both Home screens and renders nothing with no practices', () => {
  const mobile = fs.readFileSync(path.join(ROOT, 'app/(tabs)/index.tsx'), 'utf8');
  assert.match(mobile, /<YourPractices \/>\s*<\/ScrollView>\s*\);\s*}\n/);
  const web = fs.readFileSync(path.join(ROOT, 'web/src/app/page.tsx'), 'utf8');
  assert.match(web, /<YourPractices \/>\s*<\/div>\s*\);\s*}\n/);
  for (const rel of ['components/YourPractices.tsx', 'web/src/components/YourPractices.tsx']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(src, /if \(rows\.length === 0\) return null;/, rel);
  }
  for (const rel of ['lib/modules.ts', 'web/src/lib/modules.ts']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(src, /\.filter\(r => r && r\.enabled && r\.pinned && moduleInfo\(r\.module_key\)\)/, rel);
  }
});
