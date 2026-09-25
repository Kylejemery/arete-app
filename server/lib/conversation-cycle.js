// The hourly conversation cycle. Runs at the end of the existing hourly
// broadcast-delivery cron (no new Railway service), over every Cabinet thread
// that has been idle for at least 30 minutes and has messages the cycle has
// not seen yet (cabinet_conversations.cycle_processed_through, Unix ms).
//
// For each finished session it:
//   - logs conversation_ended { user_turns, thread } and, when the user wrote
//     exactly one message and got a reply, conversation_ended_one_exchange.
//     Props carry counts and the thread kind only, never content.
//   - hands the session's user turns to the optional onSession hook (the Know
//     Thyself extraction, server/lib/profile-extraction.js).
//
// A thread is only processed once idle, so every session it sees is complete,
// and a later message always starts a new session.
const { SESSION_GAP_MS, messageTime, splitSessions, countUserTurns, isUserTurn, messageOrigin } = require('./conversation-sessions');

const LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;   // threads touched in the last 3 days
const FIRST_SEEN_MS = 24 * 60 * 60 * 1000;     // a thread never processed: its last day only
const BATCH = 500;

async function runConversationCycle(supabase, { logEvent, onSession = null, now = Date.now() } = {}) {
  const idleBefore = now - SESSION_GAP_MS;
  const { data: rows, error } = await supabase
    .from('cabinet_conversations')
    .select('id, user_id, counselor_slugs, messages, cycle_processed_through, updated_at')
    .gte('updated_at', new Date(now - LOOKBACK_MS).toISOString())
    .lte('updated_at', new Date(idleBefore).toISOString())
    .order('updated_at', { ascending: true })
    .limit(BATCH);
  if (error) throw new Error(`conversation cycle select: ${error.message}`);

  const tally = { threads: 0, sessions: 0, oneExchange: 0, hookFailures: 0 };

  for (const row of rows || []) {
    const messages = Array.isArray(row.messages) ? row.messages : [];
    let lastTs = null;
    for (const m of messages) {
      const ts = messageTime(m);
      if (ts != null && (lastTs == null || ts > lastTs)) lastTs = ts;
    }
    if (lastTs == null || lastTs > idleBefore) continue;

    const through = row.cycle_processed_through != null
      ? Number(row.cycle_processed_through)
      : now - FIRST_SEEN_MS;
    if (lastTs <= through) {
      if (row.cycle_processed_through == null) {
        await supabase.from('cabinet_conversations').update({ cycle_processed_through: lastTs }).eq('id', row.id);
      }
      continue;
    }

    const fresh = messages.filter(m => {
      const ts = messageTime(m);
      return ts != null && ts > through;
    });
    const thread = row.counselor_slugs && row.counselor_slugs.length ? 'counselor' : 'cabinet';
    tally.threads++;

    for (const session of splitSessions(fresh)) {
      const userTurns = countUserTurns(session.messages);
      if (userTurns === 0) continue;
      const replied = session.messages.some(m => m && m.role === 'assistant');
      tally.sessions++;
      if (logEvent) {
        // origin (run B, Part B2): conversation-start metrics count 'user' only.
        const origin = messageOrigin(session.messages[0]);
        logEvent(row.user_id, 'conversation_ended', { user_turns: userTurns, thread, origin }, { platform: 'server' });
        if (userTurns === 1 && replied) {
          tally.oneExchange++;
          logEvent(row.user_id, 'conversation_ended_one_exchange', { thread, origin }, { platform: 'server' });
        }
      }
      if (onSession) {
        try {
          await onSession({
            userId: row.user_id,
            conversationId: row.id,
            sessionStart: session.start,
            sessionEnd: session.end,
            userMessages: session.messages.filter(isUserTurn).map(m => m.content),
          });
        } catch (e) {
          tally.hookFailures++;
          console.error('[conversation-cycle] session hook failed:', e.message);
        }
      }
    }

    await supabase.from('cabinet_conversations').update({ cycle_processed_through: lastTs }).eq('id', row.id);
  }

  return tally;
}

module.exports = { runConversationCycle };
