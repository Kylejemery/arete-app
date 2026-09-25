// The Cabinet's request_feature tool (personalization run C, Part C3). When
// the person wishes Arete did something it does not, the closing voice asks
// "Want me to pass this idea along to the person who builds Arete?" and ends
// its reply with a marker the server strips:
//   [[REQUEST|what they wish Arete did]]
// The card asks the same question. Only on Yes is the idea kept: Haiku
// rewrites it as one neutral sentence with no personal details, it is
// embedded, and it joins the nearest cluster of similar needs. The admin
// Requests tab shows clusters and summaries, never who asked.
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_USER_TURNS = 2;
const WEEKLY_LIMIT = 3;
const CLUSTER_THRESHOLD = 0.82;
const ASK_LINE = 'Want me to pass this idea along to the person who builds Arete?';

function ms(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
}

function requestGate({ verified, cabinetThread, userTurns, distressedNow, recentRequests = [], sessionStart = null, now = Date.now() }) {
  if (!verified) return { allowed: false, reason: 'unverified' };
  if (!cabinetThread) return { allowed: false, reason: 'not_cabinet' };
  if (!(userTurns >= MIN_USER_TURNS)) return { allowed: false, reason: 'too_early' };
  if (distressedNow) return { allowed: false, reason: 'distress' };
  const start = sessionStart != null ? sessionStart : now;
  if (recentRequests.some(r => ms(r.created_at) != null && ms(r.created_at) >= start)) {
    return { allowed: false, reason: 'one_per_conversation' };
  }
  const week = recentRequests.filter(r => ms(r.created_at) != null && now - ms(r.created_at) < 7 * DAY_MS).length;
  if (week >= WEEKLY_LIMIT) return { allowed: false, reason: 'weekly_limit' };
  return { allowed: true, reason: null };
}

const REQUEST_INSTRUCTION = `\n\n[PASSING AN IDEA ALONG]\nIf the person plainly wishes Arete itself could do something it cannot do now (a feature of the app, not a feeling about their life), and none of the practices you may suggest covers it, you may end your reply by asking, in your own voice: "${ASK_LINE}" followed on its own final line by exactly:\n[[REQUEST|<what they wish Arete did, in plain words, under 160 characters, with no names or personal details>]]\nThe line becomes a Yes / Not now card; nothing is passed along unless they say yes. Only when they have wished for something the app does not do. Never combine it with any other offer or card.\n[END PASSING AN IDEA ALONG]`;

const REQUEST_MARKER = /\n?\s*\[\[REQUEST\|([^\]\n]{3,300})\]\]\s*$/;
const ANY_REQUEST_MARKER = /\[\[REQUEST\|[^\]]*\]\]/g;

function parseRequestMarker(text) {
  if (typeof text !== 'string') return { text, request: null };
  const m = text.match(REQUEST_MARKER);
  const clean = text.replace(ANY_REQUEST_MARKER, '').replace(/\s+$/, '');
  if (!m || !m[1].trim()) return { text: clean, request: null };
  return { text: clean, request: { need: m[1].trim().slice(0, 300) } };
}

const SUMMARY_SYSTEM = `You rewrite a product wish for the person who builds a journaling and counsel app called Arete.
Return exactly one neutral sentence, under 20 words, that names what the app would do.
Never include names, places, relationships, health details, events or anything else about the person.
If the wish is not about the app at all, return exactly: NOT_A_FEATURE`;

// One neutral sentence, or null when Haiku says it is not a feature. Strips
// quotes and trailing chatter; caps the length.
function cleanSummary(raw) {
  const line = String(raw || '').split('\n').map(s => s.trim()).find(Boolean) || '';
  if (!line || /NOT_A_FEATURE/i.test(line)) return null;
  return line.replace(/^["'“”]+|["'“”]+$/g, '').slice(0, 200) || null;
}

// Summarizes, embeds and clusters one submitted request, then clears the
// draft. summarize(text) -> string; embed(text) -> number[]. Returns the
// cluster id, or null when it could not be processed yet.
async function processRequest(supabase, requestId, { summarize, embed }) {
  const { data: row, error } = await supabase.from('feature_requests')
    .select('id, status, need_draft, need_summary, embedding')
    .eq('id', requestId).maybeSingle();
  if (error || !row || row.status !== 'submitted') return null;
  let summary = row.need_summary;
  if (!summary) {
    if (!row.need_draft) return null;
    summary = cleanSummary(await summarize(row.need_draft));
    if (!summary) {
      await supabase.from('feature_requests').update({ need_summary: 'Not a feature request', need_draft: null, summarized_at: new Date().toISOString() }).eq('id', row.id);
      return null;
    }
  }
  const vector = await embed(summary);
  if (!Array.isArray(vector) || vector.length !== 1536) return null;
  const { error: upError } = await supabase.from('feature_requests').update({
    need_summary: summary,
    embedding: JSON.stringify(vector),
    need_draft: null,
    summarized_at: new Date().toISOString(),
  }).eq('id', row.id);
  if (upError) return null;
  const { data: clusterId, error: rpcError } = await supabase.rpc('assign_feature_request_cluster', { p_request_id: row.id, p_threshold: CLUSTER_THRESHOLD });
  if (rpcError) return null;
  return clusterId || null;
}

module.exports = {
  ASK_LINE,
  MIN_USER_TURNS,
  WEEKLY_LIMIT,
  CLUSTER_THRESHOLD,
  SUMMARY_SYSTEM,
  REQUEST_INSTRUCTION,
  requestGate,
  parseRequestMarker,
  cleanSummary,
  processRequest,
};
