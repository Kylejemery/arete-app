const test = require('node:test');
const assert = require('node:assert');

// The agent builds its Supabase client at load; these tests never call it.
process.env.SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test';
const { attachAnomalyFixes } = require('../weekly-self-reflection-agent');

const anomalies = [
  { severity: 'critical', domain: 'corpus', message: 'a' },
  { severity: 'warning', domain: 'agents', message: 'b' },
  { severity: 'warning', domain: 'corpus', message: 'c' },
];

test('each fix prompt lands on the anomaly its index names', () => {
  const out = attachAnomalyFixes(anomalies, [
    { index: 2, fix_prompt: 'fix c' },
    { index: 0, fix_prompt: ' fix a ' },
  ]);
  assert.strictEqual(out[0].fix_prompt, 'fix a');
  assert.strictEqual(out[1].fix_prompt, undefined);
  assert.strictEqual(out[2].fix_prompt, 'fix c');
  assert.strictEqual(out[0].message, 'a');
});

test('bad entries are dropped, never shifted onto a neighbour', () => {
  const out = attachAnomalyFixes(anomalies, [
    { index: 7, fix_prompt: 'out of range' },
    { index: -1, fix_prompt: 'negative' },
    { index: '1', fix_prompt: '' },
    { fix_prompt: 'no index' },
    { index: 1.5, fix_prompt: 'fractional' },
  ]);
  assert.ok(out.every(a => a.fix_prompt === undefined));
});

test('the first prompt for an index wins', () => {
  const out = attachAnomalyFixes(anomalies, [
    { index: 1, fix_prompt: 'first' },
    { index: 1, fix_prompt: 'second' },
  ]);
  assert.strictEqual(out[1].fix_prompt, 'first');
});

test('a reply without anomaly_fixes leaves the anomalies as they were', () => {
  assert.deepStrictEqual(attachAnomalyFixes(anomalies, undefined), anomalies);
  assert.deepStrictEqual(attachAnomalyFixes([], [{ index: 0, fix_prompt: 'x' }]), []);
});
