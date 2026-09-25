// Know Thyself, filled by the Cabinet: extraction guardrails and the asking
// limiter (activation plan, Part 3g). Run with `npm test` in server/.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  planExtractionWrites,
  chooseAskField,
  mergeProfile,
  buildFactsBlock,
  computeCompleteness,
  looksDistressed,
  ASK_USER_COOLDOWN_MS,
  ASK_DECLINE_COOLDOWN_MS,
} = require('../lib/profile-facts');
const { PROFILE_FIELDS } = require('../lib/profile-fields');
const { splitSessions, currentSession } = require('../lib/conversation-sessions');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-09-25T12:00:00Z');

// ── Extraction guardrails ────────────────────────────────────────────────────

test('extraction never overwrites a value the user authored', () => {
  for (const source of ['form', 'cabinet_asked', 'user_confirmed']) {
    const writes = planExtractionWrites(
      [{ field_key: 'top_goal', value: 'Run a marathon', confidence: 0.99 }],
      [{ field_key: 'top_goal', value: 'Write a book', source, status: 'active' }],
    );
    assert.deepEqual(writes, [], `source ${source} was overwritten`);
  }
});

test('extraction never writes a sensitive field', () => {
  const sensitive = PROFILE_FIELDS.filter(f => f.sensitive).map(f => f.key);
  assert.ok(sensitive.includes('life_situation') && sensitive.includes('major_events') && sensitive.includes('off_limits'));
  const writes = planExtractionWrites(sensitive.map(k => ({ field_key: k, value: 'x', confidence: 0.99 })), []);
  assert.deepEqual(writes, []);
});

test('extraction respects a field the user rejected', () => {
  const writes = planExtractionWrites(
    [{ field_key: 'main_obstacle', value: 'Procrastinates', confidence: 0.95 }],
    [{ field_key: 'main_obstacle', value: null, source: 'cabinet_inferred', status: 'rejected' }],
  );
  assert.deepEqual(writes, []);
});

test('extraction requires confidence of at least 0.75', () => {
  assert.deepEqual(planExtractionWrites([{ field_key: 'top_goal', value: 'A', confidence: 0.74 }], []), []);
  assert.equal(planExtractionWrites([{ field_key: 'top_goal', value: 'A', confidence: 0.75 }], []).length, 1);
});

test('an inferred value is only replaced with higher confidence', () => {
  const existing = [{ field_key: 'top_goal', value: 'A', source: 'cabinet_inferred', confidence: 0.85, status: 'active' }];
  assert.deepEqual(planExtractionWrites([{ field_key: 'top_goal', value: 'B', confidence: 0.85 }], existing), []);
  assert.deepEqual(planExtractionWrites([{ field_key: 'top_goal', value: 'B', confidence: 0.8 }], existing), []);
  const w = planExtractionWrites([{ field_key: 'top_goal', value: 'B', confidence: 0.9 }], existing);
  assert.equal(w.length, 1);
  assert.equal(w[0].value, 'B');
});

test('extraction ignores unknown fields and empty values, keeps the best candidate per field', () => {
  const w = planExtractionWrites([
    { field_key: 'favorite_color', value: 'blue', confidence: 0.99 },
    { field_key: 'strengths', value: '   ', confidence: 0.99 },
    { field_key: 'identity', value: 'Nurse', confidence: 0.8 },
    { field_key: 'identity', value: 'ICU nurse', confidence: 0.95 },
  ], []);
  assert.deepEqual(w, [{ field_key: 'identity', value: 'ICU nurse', confidence: 0.95 }]);
});

test('an open ask placeholder (no value yet) does not block inference', () => {
  const w = planExtractionWrites(
    [{ field_key: 'arete_reason', value: 'Wants more discipline', confidence: 0.9 }],
    [{ field_key: 'arete_reason', value: null, source: 'cabinet_asked', status: 'active', asked_at: new Date(NOW).toISOString() }],
  );
  assert.equal(w.length, 1);
});

// ── Asking limiter ───────────────────────────────────────────────────────────

const baseAsk = { facts: [], settings: null, userMessage: 'I keep procrastinating on my goal', sessionUserTurns: 3, sessionStart: NOW - HOUR, distress: false, now: NOW };

test('never asks in the first two user turns', () => {
  assert.equal(chooseAskField({ ...baseAsk, sessionUserTurns: 1 }), null);
  assert.equal(chooseAskField({ ...baseAsk, sessionUserTurns: 2 }), null);
  assert.ok(chooseAskField({ ...baseAsk, sessionUserTurns: 3 }));
});

test('never asks when the conversation shows distress', () => {
  assert.equal(chooseAskField({ ...baseAsk, distress: true }), null);
  assert.ok(looksDistressed(['honestly I feel hopeless']));
  assert.ok(!looksDistressed(['I feel stuck on my project']));
});

test('at most one ask per conversation', () => {
  const facts = [{ field_key: 'strengths', value: null, source: 'cabinet_asked', status: 'active', asked_at: new Date(NOW - 50 * 60 * 1000).toISOString() }];
  // Asked 50 minutes ago, inside a session that started an hour ago.
  assert.equal(chooseAskField({ ...baseAsk, facts, now: NOW + 49 * HOUR, sessionStart: NOW - HOUR }), null);
});

test('at most one ask per user per 48 hours', () => {
  const askedAt = NOW - 47 * HOUR;
  const facts = [{ field_key: 'strengths', value: null, source: 'cabinet_asked', status: 'active', asked_at: new Date(askedAt).toISOString() }];
  assert.equal(chooseAskField({ ...baseAsk, facts, sessionStart: NOW - 10 * 60 * 1000 }), null);
  assert.ok(chooseAskField({ ...baseAsk, facts, now: askedAt + ASK_USER_COOLDOWN_MS + 1, sessionStart: askedAt + ASK_USER_COOLDOWN_MS }));
});

test('a declined field is not asked again for 14 days', () => {
  const declinedAt = NOW - 13 * DAY;
  const facts = PROFILE_FIELDS.filter(f => f.askable && !f.sensitive && f.key !== 'feedback_style')
    .map(f => ({ field_key: f.key, value: 'known', source: 'form', status: 'active' }));
  facts.push({ field_key: 'feedback_style', value: null, source: 'cabinet_asked', status: 'active', asked_at: new Date(declinedAt - HOUR).toISOString(), ask_declined_at: new Date(declinedAt).toISOString() });
  const msg = 'tell me honestly, be blunt';
  assert.equal(chooseAskField({ ...baseAsk, facts, userMessage: msg })?.key ?? null, null);
  const later = declinedAt + ASK_DECLINE_COOLDOWN_MS + 1;
  assert.equal(chooseAskField({ ...baseAsk, facts, userMessage: msg, now: later, sessionStart: later - HOUR })?.key, 'feedback_style');
});

test('never asks about a rejected or filled field, or off_limits', () => {
  const facts = PROFILE_FIELDS.map(f => ({ field_key: f.key, value: f.key === 'top_goal' ? null : 'x', source: f.key === 'top_goal' ? 'cabinet_inferred' : 'form', status: f.key === 'top_goal' ? 'rejected' : 'active' }));
  assert.equal(chooseAskField({ ...baseAsk, facts }), null);
});

test('prefers the field relevant to the topic, then priority; sensitive only when relevant', () => {
  assert.equal(chooseAskField({ ...baseAsk, userMessage: 'nothing in particular' })?.key, 'feedback_style');
  assert.equal(chooseAskField({ ...baseAsk, userMessage: 'my job is wearing me down' })?.key, 'life_situation');
  const noLife = chooseAskField({ ...baseAsk, userMessage: 'hmm' });
  assert.notEqual(noLife?.key, 'life_situation');
});

// ── Prompt block and completeness ───────────────────────────────────────────

test('known and tentative facts are separated; off-limits is a hard constraint', () => {
  const merged = mergeProfile([
    { field_key: 'top_goal', value: 'Finish the book', source: 'form', status: 'active' },
    { field_key: 'identity', value: 'Teacher', source: 'cabinet_inferred', status: 'active', confidence: 0.8 },
    { field_key: 'strengths', value: null, source: 'cabinet_inferred', status: 'rejected' },
  ], { kt_strengths: 'should not appear', kt_off_limits: 'my divorce' });
  assert.deepEqual(merged.known.map(e => e.field.key), ['top_goal']);
  assert.deepEqual(merged.tentative.map(e => e.field.key), ['identity']);
  assert.equal(merged.offLimits, 'my divorce');
  const block = buildFactsBlock(merged, { name: 'Sam' });
  assert.match(block, /KNOWN/);
  assert.match(block, /TENTATIVE/);
  assert.match(block, /never state them back as certain/i);
  assert.match(block, /HARD CONSTRAINT: OFF-LIMITS/);
});

test('completeness is weighted and the settings columns count as the form', () => {
  assert.equal(computeCompleteness([], null), 0);
  const all = Object.fromEntries(PROFILE_FIELDS.map(f => [f.column, 'x']));
  assert.equal(computeCompleteness([], all), 1);
  const topOnly = computeCompleteness([{ field_key: 'feedback_style', value: 'firm', source: 'form', status: 'active' }], null);
  const lowOnly = computeCompleteness([{ field_key: 'major_events', value: 'x', source: 'form', status: 'active' }], null);
  assert.ok(topOnly > lowOnly);
});

// ── Sessions ────────────────────────────────────────────────────────────────

test('sessions split on a 30 minute gap; seconds and ISO timestamps are read', () => {
  const t = NOW / 1000;
  const msgs = [
    { role: 'user', content: 'a', timestamp: t },
    { role: 'assistant', content: 'b', timestamp: new Date(NOW + 60 * 1000).toISOString() },
    { role: 'user', content: 'c', timestamp: NOW + 2 * HOUR },
  ];
  assert.equal(splitSessions(msgs).length, 2);
  assert.equal(currentSession(msgs, NOW + 2 * HOUR + 60 * 1000).messages.length, 1);
  assert.equal(currentSession(msgs, NOW + 5 * HOUR).messages.length, 0);
});

// ── Registry parity ──────────────────────────────────────────────────────────

test('the client registries and the SQL mapping carry the same keys and columns', () => {
  const root = path.join(__dirname, '..', '..');
  const pairs = PROFILE_FIELDS.map(f => `${f.key}:${f.column}`).sort();
  for (const rel of ['lib/profileFields.ts', 'web/src/lib/profileFields.ts']) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    const found = [...src.matchAll(/key: '([a-z_]+)', column: '([a-z_]+)'/g)].map(m => `${m[1]}:${m[2]}`).sort();
    assert.deepEqual(found, pairs, rel);
  }
  const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter(f => f.endsWith('_user_profile_facts.sql'));
  assert.equal(migrations.length, 1);
  const sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', migrations[0]), 'utf8');
  const body = sql.slice(sql.indexOf('FUNCTION public.profile_field_columns()'));
  const values = body.slice(0, body.indexOf('$$;'));
  const sqlPairs = [...values.matchAll(/\('([a-z_]+)',\s+'([a-z_]+)'\)/g)].map(m => `${m[1]}:${m[2]}`).sort();
  assert.deepEqual(sqlPairs, pairs);
});

test('session origin mirrors the database rule', () => {
  const { messageOrigin } = require('../lib/conversation-sessions');
  assert.equal(messageOrigin({ role: 'user', content: '[Morning check-in] Sam has just completed...' }), 'check_in');
  assert.equal(messageOrigin({ role: 'user', content: 'x', kind: 'checkin' }), 'check_in');
  assert.equal(messageOrigin({ role: 'user', content: '[Escalated from private session] ...' }), 'escalation');
  assert.equal(messageOrigin({ role: 'assistant', content: 'What would make today count?' }), 'daily_question');
  assert.equal(messageOrigin({ role: 'user', content: 'I keep putting things off' }), 'user');
});
