// library.synthesis_unexported: approved drafts that never reached readers.
const test = require('node:test');
const assert = require('node:assert');
const { probes } = require('../lib/quality-audit/probes-library');

const probe = probes.find(p => p.id === 'library.synthesis_unexported');
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

function ctxWith(rows, config = {}) {
  const q = {
    select() { return q; },
    in(_col, statuses) { return Promise.resolve({ data: rows.filter(r => statuses.includes(r.status)), error: null }); },
  };
  return { config, supabase: { from: () => q } };
}

test('a Stoic Life draft approved long ago is a warning keyed by id', async () => {
  const out = await probe.run(ctxWith([
    { id: 'a1', mode: 'stoic_life', title: 'Fear', status: 'approved', reviewed_at: daysAgo(10) },
    { id: 'a2', mode: 'stoic_life', title: 'Fresh', status: 'approved', reviewed_at: daysAgo(1) },
  ]));
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'warning');
  assert.equal(out[0].fingerprint, 'library.synthesis_unexported:approved:a1');
  assert.doesNotMatch(out[0].fingerprint, /\d{4}-\d{2}/);
});

test('other modes are info; a long-exported draft not yet ingested is info', async () => {
  const out = await probe.run(ctxWith([
    { id: 'b1', mode: 'canon', title: 'X', status: 'approved', reviewed_at: daysAgo(10) },
    { id: 'c1', mode: 'stoic_life', title: 'Y', status: 'exported', reviewed_at: daysAgo(30), exported_at: daysAgo(20) },
    { id: 'c2', mode: 'stoic_life', title: 'Z', status: 'exported', reviewed_at: daysAgo(30), exported_at: daysAgo(2) },
    { id: 'd1', mode: 'stoic_life', title: 'W', status: 'ingested', reviewed_at: daysAgo(60) },
  ]));
  assert.deepEqual(out.map(f => [f.fingerprint, f.severity]), [
    ['library.synthesis_unexported:approved:b1', 'info'],
    ['library.synthesis_unexported:exported:c1', 'info'],
  ]);
});

test('thresholds come from config', async () => {
  const out = await probe.run(ctxWith(
    [{ id: 'a1', mode: 'stoic_life', title: 'Fear', status: 'approved', reviewed_at: daysAgo(10) }],
    { synthesis_export_stale_days: 30 },
  ));
  assert.equal(out.length, 0);
});
