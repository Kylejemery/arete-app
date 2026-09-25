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

// ── C2: propose_adjustment ───────────────────────────────────────────────────

const proposals = require('../lib/proposals');
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-25T12:00:00Z');
const gateBase = { verified: true, cabinetThread: true, userTurns: 3, distressedNow: false, recentProposals: [], sessionStart: NOW - 10 * 60 * 1000, now: NOW };

test('never in the first two turns, never outside the Cabinet, never in distress', () => {
  assert.equal(proposals.proposalGate({ ...gateBase, userTurns: 2 }).reason, 'too_early');
  assert.equal(proposals.proposalGate({ ...gateBase, userTurns: 3 }).allowed, true);
  assert.equal(proposals.proposalGate({ ...gateBase, cabinetThread: false }).reason, 'not_cabinet');
  assert.equal(proposals.proposalGate({ ...gateBase, distressedNow: true }).reason, 'distress');
  assert.equal(proposals.proposalGate({ ...gateBase, verified: false }).allowed, false);
});

test('one per conversation and two per week', () => {
  const inThisConversation = [{ module_key: 'habit_tracker', status: 'declined', source: 'cabinet', created_at: new Date(NOW - 5 * 60 * 1000).toISOString() }];
  assert.equal(proposals.proposalGate({ ...gateBase, recentProposals: inThisConversation }).reason, 'one_per_conversation');
  const twoThisWeek = [2, 5].map(d => ({ module_key: 'focus_timer', status: 'accepted', source: 'cabinet', created_at: new Date(NOW - d * DAY).toISOString() }));
  assert.equal(proposals.proposalGate({ ...gateBase, recentProposals: twoThisWeek }).reason, 'weekly_limit');
  const oneOld = [2, 8].map(d => ({ module_key: 'focus_timer', status: 'accepted', source: 'cabinet', created_at: new Date(NOW - d * DAY).toISOString() }));
  assert.equal(proposals.proposalGate({ ...gateBase, recentProposals: oneOld }).allowed, true);
  // A shipped-feature notice is not the Cabinet proposing, and does not count.
  const shipped = [1, 2].map(d => ({ module_key: 'focus_timer', status: 'offered', source: 'feature_shipped', created_at: new Date(NOW - d * DAY).toISOString() }));
  assert.equal(proposals.proposalGate({ ...gateBase, recentProposals: shipped }).allowed, true);
});

test('eligible modules respect exclusions, what is on, open cards and the 30-day decline cooldown', () => {
  const keys = o => proposals.eligibleModules({ now: NOW, ...o }).map(m => m.key);
  assert.deepEqual(keys({}), ['focus_timer', 'evening_review', 'premeditatio', 'habit_tracker']);
  assert.ok(!keys({ isTeen: true }).includes('premeditatio'));
  assert.ok(!keys({ recentDistress: true }).includes('premeditatio'));
  assert.ok(!keys({ rows: [{ module_key: 'focus_timer', enabled: true }] }).includes('focus_timer'));
  assert.ok(keys({ rows: [{ module_key: 'focus_timer', enabled: false }] }).includes('focus_timer'));
  const declined = d => [{ module_key: 'habit_tracker', status: 'declined', responded_at: new Date(NOW - d * DAY).toISOString(), created_at: new Date(NOW - d * DAY).toISOString() }];
  assert.ok(!keys({ recentProposals: declined(29) }).includes('habit_tracker'));
  assert.ok(keys({ recentProposals: declined(31) }).includes('habit_tracker'));
  assert.ok(!keys({ recentProposals: [{ module_key: 'habit_tracker', status: 'offered', created_at: new Date(NOW).toISOString() }] }).includes('habit_tracker'));
});

test('the marker is always stripped; unknown modules are ignored', () => {
  const ok = proposals.parseAdjustMarker('A habit might help here.\n[[ADJUST|habit_tracker|reading before bed]]');
  assert.equal(ok.text, 'A habit might help here.');
  assert.deepEqual(ok.adjust, { module_key: 'habit_tracker', note: 'reading before bed' });
  const unknown = proposals.parseAdjustMarker('Hm.\n[[ADJUST|mood_ring|x]]');
  assert.equal(unknown.text, 'Hm.');
  assert.equal(unknown.adjust, null);
  const mid = proposals.parseAdjustMarker('Before [[ADJUST|focus_timer]] after');
  assert.ok(!mid.text.includes('[['));
  assert.equal(proposals.parseAdjustMarker('[[ADJUST|focus_timer]]').adjust.note, '');
});

test('the instruction lists only the eligible practices, and is empty when none are', () => {
  const block = proposals.proposalInstruction([registry.getModule('habit_tracker')]);
  assert.match(block, /habit_tracker/);
  assert.ok(!block.includes('premeditatio'));
  assert.equal(proposals.proposalInstruction([]), '');
});

test('proposed settings carry the note in the free-text field and nothing else', () => {
  assert.deepEqual(proposals.proposedSettings('focus_timer', 'the thesis'), { minutes: 25, intention: 'the thesis' });
  assert.deepEqual(proposals.proposedSettings('habit_tracker', ''), { habit: '', target_per_week: 7 });
});

test('undo restores the exact prior rows and removes rows that did not exist', () => {
  const prior = [
    { module_key: 'habit_tracker', row: null },
    { module_key: 'focus_timer', row: { enabled: false, pinned: false, settings: { minutes: 45, intention: 'x' }, enabled_by: 'user', proposal_id: null, updated_at: '2026-09-01T00:00:00Z' } },
  ];
  assert.deepEqual(proposals.undoPlan(prior), [
    { action: 'delete', module_key: 'habit_tracker' },
    { action: 'restore', module_key: 'focus_timer', values: { enabled: false, pinned: false, settings: { minutes: 45, intention: 'x' }, enabled_by: 'user', proposal_id: null, updated_at: '2026-09-01T00:00:00Z' } },
  ]);
  assert.deepEqual(proposals.undoPlan(null), []);
});

// ── C3: request_feature ──────────────────────────────────────────────────────

const featureRequests = require('../lib/feature-requests');

test('a feature request is asked first, and the card asks the same question', () => {
  assert.match(featureRequests.REQUEST_INSTRUCTION, /Want me to pass this idea along to the person who builds Arete\?/);
  for (const rel of ['components/ProposalCard.tsx', 'web/src/components/ProposalCard.tsx']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(src.includes(featureRequests.ASK_LINE), rel);
  }
});

test('request gate: Cabinet only, not the first turn, not in distress, one per conversation, three a week', () => {
  const base = { verified: true, cabinetThread: true, userTurns: 2, distressedNow: false, recentRequests: [], sessionStart: NOW - 60 * 1000, now: NOW };
  assert.equal(featureRequests.requestGate(base).allowed, true);
  assert.equal(featureRequests.requestGate({ ...base, userTurns: 1 }).reason, 'too_early');
  assert.equal(featureRequests.requestGate({ ...base, cabinetThread: false }).reason, 'not_cabinet');
  assert.equal(featureRequests.requestGate({ ...base, distressedNow: true }).reason, 'distress');
  assert.equal(featureRequests.requestGate({ ...base, recentRequests: [{ created_at: new Date(NOW - 30 * 1000).toISOString() }] }).reason, 'one_per_conversation');
  const three = [1, 2, 3].map(d => ({ created_at: new Date(NOW - d * DAY).toISOString() }));
  assert.equal(featureRequests.requestGate({ ...base, recentRequests: three }).reason, 'weekly_limit');
});

test('the request marker is always stripped', () => {
  const r = featureRequests.parseRequestMarker('I cannot do that yet. Want me to pass this idea along to the person who builds Arete?\n[[REQUEST|A way to track sleep alongside the journal]]');
  assert.ok(!r.text.includes('[['));
  assert.deepEqual(r.request, { need: 'A way to track sleep alongside the journal' });
  assert.equal(featureRequests.parseRequestMarker('No marker here.').request, null);
  assert.ok(!featureRequests.parseRequestMarker('x [[REQUEST|]] y').text.includes('[['));
});

test('summaries are one line, unquoted, and a non-feature is dropped', () => {
  assert.equal(featureRequests.cleanSummary('"Track sleep alongside journal entries."\nExtra chatter'), 'Track sleep alongside journal entries.');
  assert.equal(featureRequests.cleanSummary('NOT_A_FEATURE'), null);
  assert.equal(featureRequests.cleanSummary(''), null);
  assert.match(featureRequests.SUMMARY_SYSTEM, /Never include names/);
});

test('processing: summarize, embed, cluster, and the draft is cleared', async () => {
  const updates = [];
  let rpc = null;
  const fake = {
    from: () => ({
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: { id: 'r1', status: 'submitted', need_draft: 'my private wording', need_summary: null, embedding: null }, error: null }),
      update(values) { updates.push(values); return { eq: async () => ({ error: null }) }; },
    }),
    rpc: async (name, args) => { rpc = { name, args }; return { data: 'c1', error: null }; },
  };
  const cluster = await featureRequests.processRequest(fake, 'r1', {
    summarize: async () => 'Track sleep alongside the journal.',
    embed: async () => new Array(1536).fill(0.01),
  });
  assert.equal(cluster, 'c1');
  assert.equal(updates[0].need_draft, null);
  assert.equal(updates[0].need_summary, 'Track sleep alongside the journal.');
  assert.deepEqual(rpc, { name: 'assign_feature_request_cluster', args: { p_request_id: 'r1', p_threshold: featureRequests.CLUSTER_THRESHOLD } });
});

test('the admin Requests route returns no identities and counts from measured profiles', () => {
  const src = fs.readFileSync(path.join(ROOT, 'academy/web/src/app/api/admin/requests/route.ts'), 'utf8');
  const selected = [...src.matchAll(/\.select\('([^']+)'/g)].map(m => m[1]).join(',');
  assert.ok(selected.length > 0);
  assert.ok(!/user_id|email|conversation_id|need_draft|counselor_id/.test(selected), `route selects an identifying column: ${selected}`);
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260925191937_feature_requests.sql'), 'utf8');
  assert.match(sql, /LEFT JOIN measured_profiles mp ON mp\.id = r\.user_id/);
  const nav = fs.readFileSync(path.join(ROOT, 'academy/web/src/app/admin/layout.tsx'), 'utf8');
  assert.match(nav, /\{ href: '\/admin\/email', label: 'Email' \},\s*\{ href: '\/admin\/requests', label: 'Requests' \}/);
});

// ── C4: shipping ─────────────────────────────────────────────────────────────

const shipping = require('../lib/feature-shipping');

test('shipped requires a registry module key, in SQL and on the server', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260925191937_feature_requests.sql'), 'utf8');
  assert.match(sql, /CHECK \(status <> 'shipped' OR module_key IS NOT NULL\)/);
  const server = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  const ship = server.slice(server.indexOf("app.post('/api/admin/feature-clusters/:id/ship'"));
  assert.match(ship.slice(0, 1200), /moduleRegistry\.getModule\(moduleKey\)[\s\S]*module_key_required/);
});

test('each person who asked is told once per cluster, and only if the practice is for them', () => {
  const subjects = new Map([
    ['teen', { isTeen: true }],
    ['on', { enabledModules: new Set(['premeditatio']) }],
    ['sad', { recentDistress: true }],
  ]);
  const plan = shipping.planNotifications({
    moduleKey: 'premeditatio',
    requesters: [
      { user_id: 'a', counselor_id: 'seneca' },
      { user_id: 'a', counselor_id: 'marcus' },
      { user_id: 'told' },
      { user_id: 'teen' },
      { user_id: 'on' },
      { user_id: 'sad' },
    ],
    notified: new Set(['told']),
    subjects,
  });
  assert.deepEqual(plan.map(p => [p.user_id, p.action, p.reason]), [
    ['a', 'notify', null],
    ['told', 'skip', 'already_notified'],
    ['teen', 'skip', 'teen'],
    ['on', 'skip', 'already_on'],
    ['sad', 'skip', 'recent_distress'],
  ]);
  assert.equal(plan[0].counselor_id, 'seneca');
});

test('the once-per-cluster guard is a unique index', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260925193004_feature_shipped_notices.sql'), 'utf8');
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS adjustment_proposals_one_notice_per_cluster\s+ON adjustment_proposals \(user_id, cluster_id\)/);
});

test('the counselor line names the practice and asks before turning anything on', () => {
  const line = shipping.shippedLine({ summary: 'Rehearse hard conversations before they happen.', moduleKey: 'premeditatio' });
  assert.match(line, /premeditatio/);
  assert.match(line, /Would you like me to turn it on/);
  assert.ok(!line.includes('..'));
  assert.ok(!/\[\[/.test(line));
});

// ── C5: an unpersonalized Home is exactly what it was ───────────────────────

const crypto = require('crypto');
const { spawnSync } = require('child_process');

// sha256 of both Home screens as they were before run C (commit cf0246a).
// Stripping exactly the lines run C added must give these back, which proves
// run C changed nothing else on Home. If Home is changed on purpose later,
// recompute these from the new file with the same stripping.
const HOME_BEFORE_RUN_C = {
  'app/(tabs)/index.tsx': '8a5a3da461fd67f16a54372fd75cc378a38c1b6bb2700842773f03ec16db9ac3',
  'web/src/app/page.tsx': '7f7b939ee901861ce754f2d72781cac43a329240b64e3aa052e156f7fd50aff8',
};

test('Home minus the Your practices lines is byte-for-byte the Home from before run C', () => {
  const sha = s => crypto.createHash('sha256').update(s).digest('hex');
  const mobile = fs.readFileSync(path.join(ROOT, 'app/(tabs)/index.tsx'), 'utf8')
    .replace("import YourPractices from '../../components/YourPractices';\n", '')
    .replace(/      \{\/\* Your practices \(run C\)[^\n]*\n      <YourPractices \/>\n\n/, '');
  const web = fs.readFileSync(path.join(ROOT, 'web/src/app/page.tsx'), 'utf8')
    .replace("import YourPractices from '@/components/YourPractices';\n", '')
    .replace(/      \{\/\* Your practices \(run C\)[^\n]*\n      <YourPractices \/>\n/, '');
  assert.equal(sha(mobile), HOME_BEFORE_RUN_C['app/(tabs)/index.tsx'], 'mobile Home changed beyond the Your practices lines');
  assert.equal(sha(web), HOME_BEFORE_RUN_C['web/src/app/page.tsx'], 'web Home changed beyond the Your practices lines');
});

// The client's own visiblePractices, run as TypeScript (Node 22.6+ strips
// types). Skips, and says so, on an older Node.
function runClientModules(rel, expr) {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e',
    `const m = await import(${JSON.stringify(path.join(ROOT, rel))}); console.log(JSON.stringify(${expr}));`], { encoding: 'utf8' });
  if (r.status !== 0) return { skipped: r.stderr.split('\n')[0] };
  return { value: JSON.parse(r.stdout) };
}

for (const rel of ['lib/modules.ts', 'web/src/lib/modules.ts']) {
  test(`${rel}: nothing on means nothing shown; only enabled, pinned, known practices show, in registry order`, t => {
    const rows = JSON.stringify([
      { module_key: 'habit_tracker', enabled: true, pinned: true, settings: {}, enabled_by: 'cabinet' },
      { module_key: 'focus_timer', enabled: true, pinned: true, settings: {}, enabled_by: 'user' },
      { module_key: 'evening_review', enabled: true, pinned: false, settings: {}, enabled_by: 'user' },
      { module_key: 'premeditatio', enabled: false, pinned: true, settings: {}, enabled_by: 'user' },
      { module_key: 'retired_module', enabled: true, pinned: true, settings: {}, enabled_by: 'user' },
    ]);
    const r = runClientModules(rel, `[m.visiblePractices([]).length, m.visiblePractices(null).length, m.visiblePractices(${rows}).map(x => x.module_key)]`);
    if (r.skipped) return t.skip(`TypeScript import unavailable: ${r.skipped}`);
    assert.deepEqual(r.value, [0, 0, ['focus_timer', 'habit_tracker']]);
  });
}

// ── C6: the free-tier practice limit ────────────────────────────────────────

test('the limit is configuration: agent_config first, then the config file, never a literal in code', () => {
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/config/personalization.json'), 'utf8'));
  assert.equal(file.FREE_ACTIVE_MODULE_LIMIT, 1);
  assert.equal(practices.limitFromConfig({ free_active_module_limit: 3 }), 3);
  assert.equal(practices.limitFromConfig({ free_active_module_limit: 0 }), 0);
  assert.equal(practices.limitFromConfig({ free_active_module_limit: 'two' }), file.FREE_ACTIVE_MODULE_LIMIT);
  assert.equal(practices.limitFromConfig(null), file.FREE_ACTIVE_MODULE_LIMIT);
  for (const rel of ['server/index.js', 'server/lib/practices.js']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(!/FREE_ACTIVE_MODULE_LIMIT\s*=\s*\d/.test(src), rel);
    assert.ok(!/limit\s*[:=]\s*1\b/.test(src.slice(src.indexOf('moduleLimitCheck'))), `${rel}: a literal limit`);
  }
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260925193443_free_module_limit.sql'), 'utf8');
  assert.match(sql, /'personalization', '\{"free_active_module_limit": 1\}'/);
});

test('free at the limit must swap or upgrade; paid has no limit', () => {
  const rows = [{ module_key: 'focus_timer', enabled: true }];
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'free', rows, moduleKey: 'habit_tracker', limit: 1 }), { ok: false, active: ['focus_timer'] });
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'free', rows, moduleKey: 'habit_tracker', limit: 1, swapOut: 'focus_timer' }), { ok: true, swap: 'focus_timer' });
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'free', rows, moduleKey: 'habit_tracker', limit: 1, swapOut: 'evening_review' }).ok, false);
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'premium', rows, moduleKey: 'habit_tracker', limit: 1 }), { ok: true, swap: null });
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'pro', rows, moduleKey: 'habit_tracker', limit: 0 }), { ok: true, swap: null });
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'free', rows: [], moduleKey: 'habit_tracker', limit: 1 }), { ok: true, swap: null });
});

test('grandfathered and turned-off practices do not count; nothing on is turned off except a chosen swap', () => {
  const rows = [
    { module_key: 'focus_timer', enabled: true, grandfathered: true },
    { module_key: 'evening_review', enabled: false },
  ];
  assert.deepEqual(practices.moduleLimitCheck({ tier: 'free', rows, moduleKey: 'habit_tracker', limit: 1 }), { ok: true, swap: null });
  // A grandfathered practice cannot be the one swapped out: it was never counted.
  const two = [{ module_key: 'focus_timer', enabled: true, grandfathered: true }, { module_key: 'premeditatio', enabled: true }];
  assert.equal(practices.moduleLimitCheck({ tier: 'free', rows: two, moduleKey: 'habit_tracker', limit: 1, swapOut: 'focus_timer' }).ok, false);
  // A downgraded account over the limit keeps everything; one swap cannot
  // bring three under one, so it is refused rather than turning off more.
  const three = ['focus_timer', 'evening_review', 'premeditatio'].map(k => ({ module_key: k, enabled: true }));
  assert.equal(practices.moduleLimitCheck({ tier: 'free', rows: three, moduleKey: 'habit_tracker', limit: 1, swapOut: 'focus_timer' }).ok, false);
});

test('teens get Swap only: the server withholds Premium, and the card only offers it when allowed', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  assert.match(server, /error: 'module_limit',[\s\S]{0,200}canUpgrade: !subject\.isTeen/);
  for (const rel of ['components/ProposalCard.tsx', 'web/src/components/ProposalCard.tsx']) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(src, /\{limitInfo\.canUpgrade && \(/, rel);
    assert.match(src, /Swap out \{a\.label\}/, rel);
    assert.match(src, /logEvent\('module_limit_upgrade_click'/, rel);
    assert.match(src, /'module_limit'\)/, rel);
  }
});

test('module_limit is a paywall source on both clients; the three events are wired', () => {
  for (const rel of ['lib/paywall.ts', 'web/src/lib/paywall.ts']) {
    assert.match(fs.readFileSync(path.join(ROOT, rel), 'utf8'), /'module_limit',/, rel);
  }
  for (const rel of ['lib/events.ts', 'web/src/lib/events.ts']) {
    assert.match(fs.readFileSync(path.join(ROOT, rel), 'utf8'), /'module_limit_upgrade_click'/, rel);
  }
  const server = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  assert.match(server, /'module_limit_shown'/);
  assert.match(server, /'module_limit_swap'/);
});

test('undo after a swap restores both practices exactly', () => {
  const plan = proposals.undoPlan([
    { module_key: 'habit_tracker', row: null },
    { module_key: 'focus_timer', row: { enabled: true, pinned: true, settings: { minutes: 25, intention: '' }, enabled_by: 'cabinet', proposal_id: 'p0', grandfathered: false, updated_at: '2026-09-20T00:00:00Z' } },
  ]);
  assert.equal(plan[0].action, 'delete');
  assert.deepEqual(plan[1].values, { enabled: true, pinned: true, settings: { minutes: 25, intention: '' }, enabled_by: 'cabinet', proposal_id: 'p0', updated_at: '2026-09-20T00:00:00Z', grandfathered: false });
});

test('only a client that can show the card is offered one', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  assert.match(server, /const cabinetThread = clientShowsCards && sessionType !== 'shared'/);
  for (const rel of ['services/claudeService.ts', 'web/src/lib/claudeService.ts']) {
    assert.match(fs.readFileSync(path.join(ROOT, rel), 'utf8'), /clientCards: \['proposal'\]/, rel);
  }
});
