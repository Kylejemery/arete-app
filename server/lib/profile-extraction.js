// Know Thyself, filled by the Cabinet over time: the I/O half.
//
//   extractFromSession   hourly cycle hook (server/lib/conversation-cycle.js):
//                        a Haiku pass over a finished session's user turns
//                        and that day's check-in text, writing only what the
//                        user explicitly said about themselves, through the
//                        guardrails in profile-facts.js.
//   recordAskOffered     the counselor was given one field to consider asking.
//   detectAskAnswer      on the next user turn: did the counselor ask, and did
//                        the user answer or deflect?
//
// Privacy: nothing here logs message or fact text. Events carry field keys
// and sources only.
const { PROFILE_FIELDS, FIELD_BY_KEY } = require('./profile-fields');
const { planExtractionWrites, looksDistressed } = require('./profile-facts');

const HAIKU_MODEL = 'claude-haiku-4-5';
const DISTRESS_SKIP_DAYS = 14;

async function callHaiku(system, user, maxTokens = 600) {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('CLAUDE_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Haiku ${res.status}`);
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'text');
  return block ? block.text : '';
}

function parseJson(raw) {
  const cleaned = String(raw || '').replace(/```json|```/g, '').trim();
  const start = cleaned.search(/[[{]/);
  if (start < 0) return null;
  try { return JSON.parse(cleaned.slice(start)); } catch { return null; }
}

async function hasRecentDistressFlag(supabase, userId, days = DISTRESS_SKIP_DAYS) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('distress_review_queue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  // Fail closed: if we cannot tell, treat the user as flagged.
  if (error) return true;
  return (count || 0) > 0;
}

async function loadFacts(supabase, userId) {
  const { data, error } = await supabase
    .from('user_profile_facts')
    .select('field_key, value, source, confidence, status, asked_at, ask_declined_at, evidence_conversation_id')
    .eq('user_id', userId);
  if (error) throw new Error(`load facts: ${error.message}`);
  return data || [];
}

const EXTRACTION_SYSTEM = `You read what a person wrote to their counselors and pull out facts they stated plainly about THEMSELVES, for a small set of profile fields.

Rules:
- Only what the person explicitly stated about themselves. No guesses, no reading between the lines.
- Never infer personality traits, diagnoses, mental health conditions, or psychological patterns.
- Nothing about other people beyond what a field itself asks for.
- Use the person's own framing, condensed to one short sentence in the third person ("Wants to finish a first marathon this spring").
- confidence is how explicit the statement was: 0.9+ stated outright, 0.75 clearly implied by a direct statement, lower otherwise.
- If nothing qualifies, return [].

Output ONLY a JSON array: [{"field_key": "...", "value": "...", "confidence": 0.0}]`;

function extractionFieldList() {
  return PROFILE_FIELDS
    .filter(f => !f.sensitive)
    .map(f => `- ${f.key}: ${f.question} (${f.phrasing})`)
    .join('\n');
}

// Hook for runConversationCycle. Skips entirely when the user has a distress
// flag in the last 14 days or the session itself reads as distressed.
function makeExtractFromSession(supabase, { logEvent } = {}) {
  return async function extractFromSession({ userId, conversationId, sessionEnd, userMessages }) {
    if (!userId || !Array.isArray(userMessages) || userMessages.length === 0) return { skipped: 'empty' };
    if (await hasRecentDistressFlag(supabase, userId)) return { skipped: 'distress_flag' };
    if (looksDistressed(userMessages)) return { skipped: 'distress_text' };

    // That day's check-in text (UTC date of the session's end), if the cycle
    // has not already read it.
    let checkIn = null;
    if (sessionEnd) {
      const day = new Date(sessionEnd).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('check_ins')
        .select('id, intention, stoic_answer, updated_at, profile_extracted_at')
        .eq('user_id', userId)
        .eq('check_in_date', day)
        .maybeSingle();
      if (data && (!data.profile_extracted_at || (data.updated_at && data.updated_at > data.profile_extracted_at))) {
        checkIn = data;
      }
    }
    const checkInText = checkIn ? [checkIn.intention, checkIn.stoic_answer].filter(t => typeof t === 'string' && t.trim()).join('\n') : '';
    if (checkInText && looksDistressed([checkInText])) return { skipped: 'distress_text' };

    const existing = await loadFacts(supabase, userId);
    const known = existing
      .filter(f => f.status === 'active' && f.value)
      .map(f => f.field_key);

    const prompt = `FIELDS (only these keys):\n${extractionFieldList()}\n\nAlready known, skip unless the person clearly updated it: ${known.join(', ') || 'none'}\n\nWHAT THE PERSON WROTE TO THEIR COUNSELORS:\n${userMessages.map(m => `- ${m}`).join('\n')}\n${checkInText ? `\nTHEIR CHECK-IN THAT DAY:\n${checkInText}\n` : ''}\nReturn the JSON array now.`;

    const parsed = parseJson(await callHaiku(EXTRACTION_SYSTEM, prompt, 700));
    const writes = planExtractionWrites(Array.isArray(parsed) ? parsed : [], existing);

    const existingKeys = new Set(existing.map(f => f.field_key));
    for (const w of writes) {
      const row = {
        value: w.value,
        source: 'cabinet_inferred',
        confidence: w.confidence,
        status: 'active',
        evidence_conversation_id: conversationId || null,
        evidence_check_in_id: checkIn ? checkIn.id : null,
      };
      const { error } = existingKeys.has(w.field_key)
        ? await supabase.from('user_profile_facts').update(row).eq('user_id', userId).eq('field_key', w.field_key)
            // Never race past a user edit made since we loaded.
            .or('source.eq.cabinet_inferred,value.is.null').neq('status', 'rejected')
        : await supabase.from('user_profile_facts').insert({ user_id: userId, field_key: w.field_key, ...row });
      if (error) {
        console.error('[profile-extraction] write failed:', error.code || 'error');
        continue;
      }
      if (logEvent) logEvent(userId, 'kt_field_filled', { field_key: w.field_key, source: 'cabinet_inferred' }, { platform: 'server' });
    }

    if (checkIn) {
      await supabase.from('check_ins').update({ profile_extracted_at: new Date().toISOString() }).eq('id', checkIn.id);
    }
    return { written: writes.length };
  };
}

// The counselor was given `fieldKey` to consider asking about. The row is a
// placeholder (value null) until the answer is detected.
async function recordAskOffered(supabase, { userId, fieldKey, conversationId }) {
  const now = new Date().toISOString();
  const { data: cur } = await supabase
    .from('user_profile_facts')
    .select('id')
    .eq('user_id', userId)
    .eq('field_key', fieldKey)
    .maybeSingle();
  if (cur) {
    await supabase.from('user_profile_facts')
      .update({ asked_at: now, evidence_conversation_id: conversationId || null })
      .eq('id', cur.id);
  } else {
    await supabase.from('user_profile_facts').insert({
      user_id: userId,
      field_key: fieldKey,
      value: null,
      source: 'cabinet_asked',
      status: 'active',
      asked_at: now,
      evidence_conversation_id: conversationId || null,
    });
  }
}

const ANSWER_SYSTEM = `A counselor may have asked a person one question about themselves. Decide:
- asked: did the counselor's message actually ask the person about the topic described?
- answered: did the person's reply give a real answer about themselves on that topic?
- value: if answered, the answer condensed to one short third-person sentence in their own framing; otherwise null.
Deflecting, changing the subject, joking it off, or ignoring the question is not an answer.
Output ONLY JSON: {"asked": true|false, "answered": true|false, "value": "..." | null}`;

// Called (fire and forget) on the user turn after an ask was offered.
async function detectAskAnswer(supabase, { userId, fieldKey, assistantText, userText, logEvent }) {
  const field = FIELD_BY_KEY[fieldKey];
  if (!field || !assistantText || !userText) return null;
  const prompt = `TOPIC: ${field.phrasing}\n\nCOUNSELOR'S MESSAGE:\n${String(assistantText).slice(0, 4000)}\n\nPERSON'S REPLY:\n${String(userText).slice(0, 4000)}`;
  const r = parseJson(await callHaiku(ANSWER_SYSTEM, prompt, 300));
  if (!r || typeof r !== 'object') return null;

  const now = new Date().toISOString();
  if (!r.asked) {
    // The counselor chose not to ask; the ask is not spent.
    await supabase.from('user_profile_facts')
      .update({ asked_at: null })
      .eq('user_id', userId).eq('field_key', fieldKey).is('value', null);
    return 'not_asked';
  }
  const value = typeof r.value === 'string' ? r.value.trim().slice(0, 500) : '';
  if (r.answered && value) {
    await supabase.from('user_profile_facts')
      .update({ value, source: 'cabinet_asked', status: 'active', confidence: null, ask_declined_at: null })
      .eq('user_id', userId).eq('field_key', fieldKey);
    if (logEvent) logEvent(userId, 'kt_field_filled', { field_key: fieldKey, source: 'cabinet_asked' }, { platform: 'server' });
    return 'answered';
  }
  await supabase.from('user_profile_facts')
    .update({ ask_declined_at: now })
    .eq('user_id', userId).eq('field_key', fieldKey);
  return 'declined';
}

module.exports = {
  callHaiku,
  parseJson,
  hasRecentDistressFlag,
  loadFacts,
  makeExtractFromSession,
  recordAskOffered,
  detectAskAnswer,
};
