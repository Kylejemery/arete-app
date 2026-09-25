// Offers the Cabinet makes at the end of a reply (activation plan, Parts 6
// and 9). Pure rules here; the endpoint wiring is in server/index.js.
//
//   goal    When the person has stated a concrete intention, the closing
//           voice may offer to save it as a goal, ending its reply with a
//           marker the server strips: [[GOAL|title|CATEGORY|YYYY-MM-DD]].
//           At most one goal offer per conversation. Nothing is created
//           until the person accepts on the card.
//   scroll  After a conversation of at least six messages, one "Would you
//           like a scroll on this?" card, at most once per user per 72 hours,
//           attributed to the scroll voice who spoke most.

const GOAL_CATEGORIES = ['GENERAL', 'PHYSICAL', 'BEHAVIORAL', 'HEALTH', 'FINANCIAL', 'MENTAL', 'CAREER', 'RELATIONSHIPS'];
const SCROLL_MIN_MESSAGES = 6;
const SCROLL_OFFER_COOLDOWN_MS = 72 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Only these voices exist in the scroll pipeline (/api/scrolls/generate).
const SCROLL_VOICES = ['marcus', 'epictetus', 'seneca'];
const SCROLL_ALIASES = { 'marcus-aurelius': 'marcus' };

const GOAL_OFFER_INSTRUCTION = `\n\n[OFFERING A GOAL]\nIf, in this conversation, the person has stated a concrete intention of their own (something specific they mean to do, not a vague wish), you may close your reply with one short sentence in your own voice offering to save it as a goal, followed on its own final line by exactly:\n[[GOAL|<the goal in their terms, under 60 characters>|<one of ${GOAL_CATEGORIES.join(', ')}>|<a sensible target date, YYYY-MM-DD>]]\nThe line is turned into a card they can accept or dismiss; they will not see the brackets. Never invent an intention they did not state. If there is no concrete intention, leave this out entirely. If you include it, do not also ask any other question about them.\n[END OFFERING A GOAL]`;

// Run B, Part B4: in a person's first week, once ever, the closing voice may
// suggest one small check-in task tied to their stated goal.
const FIRST_WEEK_MS = 7 * DAY_MS;
function taskOfferInstruction(goalText) {
  return `\n\n[SUGGESTING ONE CHECK-IN TASK]\nThis person is in their first week. Their stated goal: "${String(goalText).slice(0, 300)}". If it fits what they are talking about, you may close your reply with one short sentence in your own voice suggesting ONE small daily task for their check-in that serves that goal (concrete, doable in under 30 minutes), followed on its own final line by exactly:\n[[TASK|<the task, under 50 characters>|<morning or evening>]]\nThe line becomes a card they can accept or dismiss; they will not see the brackets. If it does not fit this conversation, leave it out entirely. If you include it, do not also ask any other question about them.\n[END SUGGESTING ONE CHECK-IN TASK]`;
}

const TASK_MARKER = /\n?\s*\[\[TASK\|([^|\]\n]{1,80})\|(morning|evening)\]\]\s*$/i;
const ANY_TASK_MARKER = /\[\[TASK\|[^\]]*\]\]/g;

function parseTaskMarker(text) {
  if (typeof text !== 'string') return { text, task: null };
  const m = text.match(TASK_MARKER);
  const clean = text.replace(ANY_TASK_MARKER, '').replace(/\s+$/, '');
  if (!m || !m[1].trim()) return { text: clean, task: null };
  return { text: clean, task: { title: m[1].trim().slice(0, 60), routine: m[2].toLowerCase() } };
}

function canOfferTask({ verified, isFirstTurn, distressed, accountCreatedAt, taskOfferedEver, goalText, now = Date.now() }) {
  if (!verified || isFirstTurn || distressed || taskOfferedEver) return false;
  if (!goalText || !String(goalText).trim()) return false;
  const created = accountCreatedAt ? Date.parse(accountCreatedAt) : NaN;
  return Number.isFinite(created) && now - created <= FIRST_WEEK_MS;
}

const GOAL_MARKER = /\n?\s*\[\[GOAL\|([^|\]\n]{1,120})\|([A-Za-z_ ]{1,20})\|(\d{4}-\d{2}-\d{2})\]\]\s*$/;
const ANY_GOAL_MARKER = /\[\[GOAL\|[^\]]*\]\]/g;

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Returns { text, goal }. text never contains a marker, even a malformed one.
function parseGoalMarker(text, now = Date.now()) {
  if (typeof text !== 'string') return { text, goal: null };
  const m = text.match(GOAL_MARKER);
  const clean = text.replace(ANY_GOAL_MARKER, '').replace(/\s+$/, '');
  if (!m) return { text: clean, goal: null };
  const title = m[1].trim().slice(0, 80);
  if (!title) return { text: clean, goal: null };
  const category = GOAL_CATEGORIES.includes(m[2].trim().toUpperCase()) ? m[2].trim().toUpperCase() : 'GENERAL';
  const parsed = Date.parse(`${m[3]}T12:00:00Z`);
  // A date in the past, unparseable, or more than two years out becomes 30
  // days from now; the person can edit it on the card either way.
  const targetDate = Number.isFinite(parsed) && parsed > now && parsed < now + 730 * DAY_MS
    ? m[3]
    : isoDate(now + 30 * DAY_MS);
  return { text: clean, goal: { title, category, target_date: targetDate } };
}

function canOfferGoal({ verified, isFirstTurn, distressed, goalOfferedThisConversation }) {
  return !!verified && !isFirstTurn && !distressed && !goalOfferedThisConversation;
}

function canOfferScroll({ verified, distressed, messageCount, lastScrollOfferAt, goalOfferedThisTurn, now = Date.now() }) {
  if (!verified || distressed || goalOfferedThisTurn) return false;
  if (!(messageCount >= SCROLL_MIN_MESSAGES)) return false;
  if (lastScrollOfferAt) {
    const t = Date.parse(lastScrollOfferAt);
    if (Number.isFinite(t) && now - t < SCROLL_OFFER_COOLDOWN_MS) return false;
  }
  return true;
}

// counts: { counselorId: replies }. The scroll voice that spoke most; if no
// scroll voice spoke, null (the pipeline then assigns one from the topic).
function pickScrollCounselor(counts) {
  let best = null;
  for (const [rawId, n] of Object.entries(counts || {})) {
    const id = SCROLL_ALIASES[rawId] || rawId;
    if (!SCROLL_VOICES.includes(id) || !(n > 0)) continue;
    if (!best || n > best.n) best = { id, n };
  }
  return best ? best.id : null;
}

module.exports = {
  GOAL_CATEGORIES,
  SCROLL_MIN_MESSAGES,
  SCROLL_OFFER_COOLDOWN_MS,
  GOAL_OFFER_INSTRUCTION,
  parseGoalMarker,
  canOfferGoal,
  taskOfferInstruction,
  parseTaskMarker,
  canOfferTask,
  canOfferScroll,
  pickScrollCounselor,
};
