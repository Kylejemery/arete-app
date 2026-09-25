// Goal and scroll offers (activation plan, Parts 6 and 9).
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseGoalMarker, canOfferGoal, canOfferScroll, pickScrollCounselor, SCROLL_OFFER_COOLDOWN_MS,
} = require('../lib/cabinet-offers');

const NOW = Date.parse('2026-09-25T12:00:00Z');

test('a goal marker is parsed and always stripped from the text', () => {
  const r = parseGoalMarker('Good.\nWant me to hold you to that?\n[[GOAL|Write 500 words a day|career|2026-11-01]]', NOW);
  assert.equal(r.text, 'Good.\nWant me to hold you to that?');
  assert.deepEqual(r.goal, { title: 'Write 500 words a day', category: 'CAREER', target_date: '2026-11-01' });
  const bad = parseGoalMarker('Hi [[GOAL|x]] there', NOW);
  assert.equal(bad.text.includes('[['), false);
  assert.equal(bad.goal, null);
  assert.deepEqual(parseGoalMarker('No offer here.', NOW), { text: 'No offer here.', goal: null });
});

test('an unknown category becomes GENERAL; a past date becomes 30 days out', () => {
  const r = parseGoalMarker('x\n[[GOAL|Run|SPORTS|2020-01-01]]', NOW);
  assert.equal(r.goal.category, 'GENERAL');
  assert.equal(r.goal.target_date, '2026-10-25');
});

test('at most one goal offer per conversation, never on the first turn or in distress', () => {
  const ok = { verified: true, isFirstTurn: false, distressed: false, goalOfferedThisConversation: false };
  assert.equal(canOfferGoal(ok), true);
  assert.equal(canOfferGoal({ ...ok, goalOfferedThisConversation: true }), false);
  assert.equal(canOfferGoal({ ...ok, isFirstTurn: true }), false);
  assert.equal(canOfferGoal({ ...ok, distressed: true }), false);
  assert.equal(canOfferGoal({ ...ok, verified: false }), false);
});

test('scroll offers need six messages and a 72 hour gap', () => {
  const ok = { verified: true, distressed: false, messageCount: 6, lastScrollOfferAt: null, goalOfferedThisTurn: false, now: NOW };
  assert.equal(canOfferScroll(ok), true);
  assert.equal(canOfferScroll({ ...ok, messageCount: 5 }), false);
  assert.equal(canOfferScroll({ ...ok, lastScrollOfferAt: new Date(NOW - SCROLL_OFFER_COOLDOWN_MS + 60000).toISOString() }), false);
  assert.equal(canOfferScroll({ ...ok, lastScrollOfferAt: new Date(NOW - SCROLL_OFFER_COOLDOWN_MS - 60000).toISOString() }), true);
  assert.equal(canOfferScroll({ ...ok, goalOfferedThisTurn: true }), false);
  assert.equal(canOfferScroll({ ...ok, distressed: true }), false);
});

test('the scroll goes to the scroll voice who spoke most', () => {
  assert.equal(pickScrollCounselor({ goggins: 5, seneca: 2, marcus: 1 }), 'seneca');
  assert.equal(pickScrollCounselor({ 'marcus-aurelius': 3, epictetus: 2 }), 'marcus');
  assert.equal(pickScrollCounselor({ goggins: 4 }), null);
});

test('first-week task offer: parsed, stripped, and offered once in the first week only', () => {
  const { parseTaskMarker, canOfferTask } = require('../lib/cabinet-offers');
  const r = parseTaskMarker('Try this.\n[[TASK|Write 200 words|Morning]]');
  assert.equal(r.text, 'Try this.');
  assert.deepEqual(r.task, { title: 'Write 200 words', routine: 'morning' });
  const ok = { verified: true, isFirstTurn: false, distressed: false, accountCreatedAt: new Date(NOW - 3 * 86400000).toISOString(), taskOfferedEver: false, goalText: 'Run a marathon', now: NOW };
  assert.equal(canOfferTask(ok), true);
  assert.equal(canOfferTask({ ...ok, taskOfferedEver: true }), false);
  assert.equal(canOfferTask({ ...ok, accountCreatedAt: new Date(NOW - 8 * 86400000).toISOString() }), false);
  assert.equal(canOfferTask({ ...ok, goalText: '' }), false);
  assert.equal(canOfferTask({ ...ok, distressed: true }), false);
});
