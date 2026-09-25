// A cabinet_conversations row is a whole thread, kept forever (one row per
// user per thread). A "conversation" in the product sense is a session inside
// it: a run of messages with no gap longer than SESSION_GAP_MS. These helpers
// split a thread's messages into sessions. Pure functions, no I/O.

const SESSION_GAP_MS = 30 * 60 * 1000;

// messages[].timestamp is Unix ms from the apps, occasionally Unix seconds
// from old builds, or an ISO string from the web structured page.
function messageTime(m) {
  const t = m && m.timestamp;
  if (t == null || t === '') return null;
  if (typeof t === 'number' || /^\d+(\.\d+)?$/.test(String(t))) {
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return n < 1e12 ? n * 1000 : n;
  }
  const parsed = Date.parse(String(t));
  return Number.isFinite(parsed) ? parsed : null;
}

// A real user turn: not the synthetic check-in chip, and has text.
function isUserTurn(m) {
  return !!m && m.role === 'user' && m.kind !== 'checkin' && typeof m.content === 'string' && m.content.trim() !== '';
}

function splitSessions(messages, gapMs = SESSION_GAP_MS) {
  const sessions = [];
  let current = null;
  let lastTs = null;
  for (const m of Array.isArray(messages) ? messages : []) {
    const ts = messageTime(m);
    const startNew = !current || (ts != null && lastTs != null && ts - lastTs > gapMs);
    if (startNew) {
      current = { messages: [], start: ts, end: ts };
      sessions.push(current);
    }
    current.messages.push(m);
    if (ts != null) {
      if (current.start == null) current.start = ts;
      current.end = ts;
      lastTs = ts;
    }
  }
  return sessions;
}

// The session a new turn belongs to: the last one, if its last message is
// within the gap of `now`; otherwise a fresh (empty) session.
function currentSession(messages, now = Date.now(), gapMs = SESSION_GAP_MS) {
  const sessions = splitSessions(messages, gapMs);
  const last = sessions[sessions.length - 1];
  if (last && last.end != null && now - last.end <= gapMs) return last;
  return { messages: [], start: null, end: null };
}

// How a session began, with the same rules as the database's
// cabinet_message_origin(): user | check_in | daily_question | escalation.
// Conversation-start metrics count origin = 'user' only.
function messageOrigin(m) {
  if (!m) return null;
  if (m.role === 'assistant') return 'daily_question';
  const text = typeof m.content === 'string' ? m.content : '';
  if (m.kind === 'checkin' || /^\s*\[(morning|evening) check-in\]/i.test(text)) return 'check_in';
  if (/^\s*\[escalated from private/i.test(text)) return 'escalation';
  return 'user';
}

function countUserTurns(messages) {
  return (messages || []).filter(isUserTurn).length;
}

module.exports = {
  SESSION_GAP_MS,
  messageTime,
  isUserTurn,
  splitSessions,
  currentSession,
  countUserTurns,
  messageOrigin,
};
