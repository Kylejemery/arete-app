// server/journal-analysis-agent.js
//
// Nightly Journal Analysis Agent — the second autonomous agent in the Arete
// system. For each user active in the last 7 days it reads journal entries AND
// Cabinet conversations, identifies recurring philosophical themes + longitudinal
// patterns, grounds the dominant theme in the RAG corpus, and stores a weekly
// insight. Distress signals are queued for human review and NEVER auto-delivered.
//
// Standalone script (own Railway cron service) — does not share index.js's web
// request lifecycle. Claude + OpenAI are called via raw fetch (same as index.js;
// no SDKs). Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY, OPENAI_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { modernFenceParams } = require('./lib/corpus-fence');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DAY = 24 * 60 * 60 * 1000;

// Monday (UTC) of the current week, as YYYY-MM-DD.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

function dateOnly(s) {
  return (s || '').toString().split('T')[0];
}

// --- Data fetching ---------------------------------------------------------

async function getActiveUsers() {
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const [{ data: jUsers }, { data: cUsers }] = await Promise.all([
    supabase.from('journal_entries').select('user_id').gte('created_at', since),
    supabase.from('cabinet_conversations').select('user_id').gte('updated_at', since),
  ]);
  return [...new Set([
    ...(jUsers || []).map(r => r.user_id),
    ...(cUsers || []).map(r => r.user_id),
  ])].filter(Boolean);
}

async function getUserJournalEntries(userId, dayCount = 7) {
  const since = new Date(Date.now() - dayCount * DAY).toISOString();
  const { data } = await supabase
    .from('journal_entries')
    .select('content, type, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  return (data || []).filter(e => e.content && e.content.trim());
}

// cabinet_conversations.messages is a jsonb array of
// { role: 'user'|'assistant', content, counselorId, counselorName, timestamp }.
async function getUserCabinetMessages(userId, dayCount = 7) {
  const since = new Date(Date.now() - dayCount * DAY).toISOString();
  const { data: convos } = await supabase
    .from('cabinet_conversations')
    .select('messages, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', since)
    .order('updated_at', { ascending: true });

  const userMessages = [];
  const counselorMessages = [];
  for (const convo of convos || []) {
    const messages = Array.isArray(convo.messages) ? convo.messages : [];
    for (const m of messages) {
      const ts = (m && (m.timestamp || convo.updated_at)) || '';
      if (m && m.role === 'user' && m.content) {
        userMessages.push({ content: m.content, created_at: ts });
      } else if (m && m.role === 'assistant' && m.content) {
        // Counselor responses confirm which topics were substantive enough to engage.
        counselorMessages.push({ content: m.content, counselor: m.counselorName || '', created_at: ts });
      }
    }
  }
  return { userMessages, counselorMessages };
}

async function getLongitudinalContext(userId) {
  const { data } = await supabase
    .from('journal_analysis')
    .select('analysis_week, themes, dominant_theme, insight_text')
    .eq('user_id', userId)
    .order('analysis_week', { ascending: false })
    .limit(8);
  return data || [];
}

// --- Claude analysis -------------------------------------------------------

const SYSTEM_PROMPT = `You are a philosophical analyst for the Arete Stoic philosophy platform.
You read a user's private journal entries and Cabinet conversations and identify philosophical themes,
patterns, and insights that will help them in their practice.

Your analysis must be:
- Specific, not generic. Quote or closely reference actual content from their writing.
- Philosophically grounded. Connect themes to specific Stoic (or related) concepts.
- Honest about patterns, including difficult ones. Do not flatter.
- Attentive to gaps: what is present in journal but absent from Cabinet? What is brought to Cabinet but never journaled?
- Longitudinally aware: note when a theme has persisted across multiple weeks.

Distress signals to flag (return distress_flagged: true if any present):
- Expressions of hopelessness, worthlessness, or thoughts of self-harm
- Severe isolation language
- Crisis-level anxiety or despair
- Any direct statement of intent to harm self or others

Output ONLY valid JSON in this exact structure:
{
  "themes": [
    {
      "theme": "string — the philosophical theme, named precisely",
      "count": number,
      "sources": ["journal", "cabinet"],
      "weeksSeen": number
    }
  ],
  "journal_only_themes": ["theme1", "theme2"],
  "cabinet_only_themes": ["theme1", "theme2"],
  "dominant_theme": "string — the single most persistent or significant theme",
  "insight_text": "string — the insight delivered to the user. 150-250 words. Written in second person (you). Specific, grounded, honest. Must reference actual content from their writing. Must connect to a Stoic concept or philosopher. Must end with a single question or practice for the coming week.",
  "rag_query": "string — a 5-10 word query to retrieve the most relevant RAG passages for this user's dominant theme",
  "distress_flagged": boolean,
  "distress_notes": "string or null — if flagged, describe specifically what triggered it"
}`;

async function callClaude(system, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'text');
  return block ? block.text : '';
}

async function analyzeUser(journalEntries, cabinet, priorAnalysis) {
  const journalText = journalEntries.length
    ? journalEntries.map(e => `[${dateOnly(e.created_at)}${e.type ? ' · ' + e.type : ''}] ${e.content}`).join('\n\n')
    : 'No journal entries this week.';

  const cabinetText = cabinet.userMessages.length
    ? cabinet.userMessages.map(m => `[${dateOnly(m.created_at)}] ${m.content}`).join('\n\n')
    : 'No Cabinet conversations this week.';

  const counselorText = cabinet.counselorMessages.length
    ? cabinet.counselorMessages.slice(0, 8).map(m => `[${m.counselor}] ${m.content}`).join('\n\n')
    : 'None.';

  const historicalThemes = priorAnalysis.length
    ? priorAnalysis.map(a => `Week of ${a.analysis_week}: dominant theme — ${a.dominant_theme}`).join('\n')
    : 'No prior analysis available.';

  const userPrompt = `Analyze this user's philosophical activity from the past 7 days.

JOURNAL ENTRIES:
${journalText}

CABINET CONVERSATIONS (user messages):
${cabinetText}

NOTABLE COUNSELOR RESPONSES (context on which topics were substantive):
${counselorText}

HISTORICAL THEME CONTEXT (prior weeks):
${historicalThemes}

Produce the JSON analysis now.`;

  const raw = await callClaude(SYSTEM_PROMPT, userPrompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// --- RAG grounding ---------------------------------------------------------

async function getGroundingPassages(query, limit = 3) {
  if (!query || !OPENAI_API_KEY) return [];
  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
    });
    if (!embRes.ok) return [];
    const embedding = (await embRes.json()).data[0].embedding;

    // match_rag_corpus(query_embedding, match_count DEFAULT 5, filter_author,
    // filter_language, exclude_text_types). No match_threshold parameter.
    // Journal analysis is a user-facing therapeutic surface: the modern
    // philosophy of mind layer is fenced (server/lib/corpus-fence.js).
    const { data } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: limit,
      ...modernFenceParams(),
    });
    return (data || []).map(c => ({
      author: c.author,
      work: c.work,
      chunk_text: c.chunk_text,
      relevance: 'Retrieved for theme: ' + query,
    }));
  } catch (e) {
    console.error('  grounding passages failed:', e.message);
    return [];
  }
}

// --- Storage ---------------------------------------------------------------

// A week's analysis is upserted every morning. Once any run that week has
// flagged distress, a later run can no longer clear the flag: the analysis is
// in (or headed for) the human review queue, and clearing the flag would make
// it deliverable as an insight the next morning.
async function storeAnalysis(userId, analysis, groundingPassages) {
  const analysisWeek = getMondayOfCurrentWeek();
  const { data: existing } = await supabase
    .from('journal_analysis')
    .select('id, distress_flagged, distress_notes, delivered')
    .eq('user_id', userId)
    .eq('analysis_week', analysisWeek)
    .maybeSingle();

  const wasFlagged = !!(existing && existing.distress_flagged);
  const flaggedNow = !!analysis.distress_flagged;
  const distressFlagged = wasFlagged || flaggedNow;
  const distressNotes = flaggedNow
    ? (analysis.distress_notes || null)
    : (wasFlagged ? existing.distress_notes : null);

  // Once the week's insight has been delivered, the person has read it: a
  // re-run no longer rewrites it or marks it undelivered (11 delivered
  // insights had been reset that way). A new distress flag still lands.
  if (existing && existing.delivered) {
    if (flaggedNow && !wasFlagged) {
      const { data, error } = await supabase
        .from('journal_analysis')
        .update({ distress_flagged: true, distress_notes: distressNotes })
        .eq('id', existing.id)
        .select('id, distress_flagged, distress_notes');
      if (error) throw new Error(`flag delivered analysis: ${error.message}`);
      return data;
    }
    return [{ id: existing.id, distress_flagged: existing.distress_flagged, distress_notes: existing.distress_notes }];
  }

  const { data, error } = await supabase
    .from('journal_analysis')
    .upsert({
      user_id: userId,
      analysis_week: analysisWeek,
      themes: analysis.themes || [],
      journal_only_themes: analysis.journal_only_themes || [],
      cabinet_only_themes: analysis.cabinet_only_themes || [],
      dominant_theme: analysis.dominant_theme || null,
      insight_text: analysis.insight_text,
      grounding_passages: groundingPassages,
      weeks_analyzed: (analysis.themes && analysis.themes[0] && analysis.themes[0].weeksSeen) || 1,
      distress_flagged: distressFlagged,
      distress_notes: distressNotes,
      delivered: false,
    }, { onConflict: 'user_id,analysis_week' })
    .select('id, distress_flagged, distress_notes');
  if (error) throw new Error(`store analysis: ${error.message}`);
  return data;
}

// insert ... on conflict (analysis_id) do nothing, through an RPC because the
// unique index is partial. An analysis that already has a queue row, in any
// status, is never enqueued again, so a reviewed or escalated case cannot
// come back as pending. Returns true only when a new row was written.
async function queueDistressReview(userId, analysisId, notes) {
  const { data, error } = await supabase.rpc('enqueue_distress_review', {
    p_user_id: userId,
    p_analysis_id: analysisId,
    p_notes: notes || null,
  });
  if (error) throw new Error(`enqueue distress review: ${error.message}`);
  if (data === true) console.error(`⚠️  DISTRESS FLAG — analysis ${analysisId} queued for review`);
  return data === true;
}

// Flagged analyses created since the last successful run that have no queue
// row: catches a run that stored a flagged analysis and then died before the
// enqueue. With no successful run on record, look back one week.
async function sweepUnqueuedFlags(sinceIso) {
  const { data: flagged, error } = await supabase
    .from('journal_analysis')
    .select('id, user_id, distress_notes')
    .eq('distress_flagged', true)
    .gte('created_at', sinceIso);
  if (error) throw new Error(`sweep flagged analyses: ${error.message}`);
  let queued = 0;
  for (const a of flagged || []) {
    if (await queueDistressReview(a.user_id, a.id, a.distress_notes)) queued++;
  }
  return queued;
}

const AGENT_NAME = 'journal-analysis';

async function lastSuccessfulRunAt() {
  const { data } = await supabase
    .from('agent_runs')
    .select('started_at')
    .eq('agent', AGENT_NAME)
    .eq('status', 'succeeded')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? data.started_at : null;
}

// --- Main loop -------------------------------------------------------------

// options.manual: the admin "run now" button. A manual run skips the
// once-a-day window but still refuses to overlap a run in progress. The
// scheduled run claims a 20 hour window, so if two schedulers fire the same
// morning (as the coverage-gap-agent service did until 2026-09-25, when its
// config-as-code path pointed at this file's railway.agent.json) the second
// one exits without touching anything.
async function runJournalAnalysis(options = {}) {
  console.log(`=== Journal Analysis Agent — ${new Date().toISOString()} ===`);
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }

  const since = (await lastSuccessfulRunAt()) || new Date(Date.now() - 7 * DAY).toISOString();

  const { data: runId, error: claimError } = await supabase.rpc('claim_agent_run', {
    p_agent: AGENT_NAME,
    p_min_interval: options.manual ? '0 seconds' : '20 hours',
  });
  if (claimError) throw new Error(`claim run: ${claimError.message}`);
  if (!runId) {
    console.log('Another journal analysis run is in progress or already succeeded in this window — exiting.');
    return { skipped: true };
  }

  const userIds = await getActiveUsers();
  console.log(`Analyzing ${userIds.length} active users`);

  let succeeded = 0, failed = 0, distressFlagged = 0, distressQueued = 0;

  try {
    for (const userId of userIds) {
      try {
        const [journalEntries, cabinet, priorAnalysis] = await Promise.all([
          getUserJournalEntries(userId),
          getUserCabinetMessages(userId),
          getLongitudinalContext(userId),
        ]);

        if (journalEntries.length === 0 && cabinet.userMessages.length === 0) {
          console.log(`Skipping ${userId} — no content this week`);
          continue;
        }

        const analysis = await analyzeUser(journalEntries, cabinet, priorAnalysis);
        const groundingPassages = await getGroundingPassages(analysis.rag_query);
        const stored = await storeAnalysis(userId, analysis, groundingPassages);
        const row = stored && stored[0];

        if (row && row.distress_flagged) {
          // Held for human review — never marked delivered here.
          distressFlagged++;
          if (await queueDistressReview(userId, row.id, row.distress_notes)) distressQueued++;
        }

        succeeded++;
        await new Promise(resolve => setTimeout(resolve, 500)); // rate limit
      } catch (err) {
        console.error(`Failed for user ${userId}:`, err.message);
        failed++;
      }
    }

    distressQueued += await sweepUnqueuedFlags(since);
  } catch (err) {
    await supabase.rpc('finish_agent_run', { p_id: runId, p_status: 'failed', p_summary: { error: 'run aborted' } });
    throw err;
  }

  const summary = { users: userIds.length, succeeded, failed, distressFlagged, distressQueued };
  await supabase.rpc('finish_agent_run', { p_id: runId, p_status: 'succeeded', p_summary: summary });

  console.log(`\n=== Run Complete ===`);
  console.log(`Succeeded: ${succeeded} | Failed: ${failed} | Distress flagged: ${distressFlagged} | Newly queued: ${distressQueued}`);
  console.log('===================');

  return summary;
}

// Exported for the on-demand admin trigger in index.js (POST
// /api/admin/journal/run); the Railway cron still runs this file directly.
module.exports = { runJournalAnalysis };

if (require.main === module) {
  runJournalAnalysis().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
