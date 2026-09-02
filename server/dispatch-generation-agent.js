// server/dispatch-generation-agent.js
//
// Daily Dispatch Agent (generation half) — the fifth autonomous agent in the
// Arete AI Agent System. Once a day it generates ONE community-level dispatch:
// a 150-200 word integrated reflection that synthesizes (1) what the community
// is wrestling with (journal_analysis themes, last 7 days), (2) what the corpus
// has been thinking about (latest ingested synthesis + recent ingestions), and
// (3) the specific day. Every dispatch ends with one concrete daily practice.
//
// This script GENERATES and STORES only — delivery (push) is a separate hourly
// job (dispatch-delivery-agent.js) so the two concerns scale independently.
//
// Railway cron: 10:00 UTC (5 AM ET) daily, before the 7 AM local delivery
// window opens for any timezone. Idempotent — one dispatch per dispatch_date.
//
// Mirrors the other agents: standalone script, raw fetch to OpenAI (embeddings)
// and Anthropic (generation), no SDKs.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { modernFenceParams } = require('./lib/corpus-fence');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// --- Config ----------------------------------------------------------------

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'dispatch_agent')
    .single();

  return data?.config || {
    enabled: true,
    generation_hour_utc: 10,
    delivery_hour_local: 7,
    max_community_themes: 5,
    target_word_count: 175,
    model: DEFAULT_MODEL,
  };
}

// --- 3a. Corpus context ----------------------------------------------------

async function getCorpusContext() {
  // Latest ingested synthesis document (may not exist yet — handled downstream).
  const { data: latestSynthesis } = await supabase
    .from('synthesis_documents')
    .select('title, concept, synthesis_type, content')
    .eq('status', 'ingested')
    .order('ingested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Recent corpus ingestions (last 7 days).
  const { data: recentIngestions } = await supabase
    .from('corpus_ingestion_runs')
    .select('coverage_report, total_chunks_added, run_started_at')
    .eq('status', 'completed')
    .gte('run_started_at', new Date(Date.now() - 7 * DAY).toISOString())
    .order('run_started_at', { ascending: false })
    .limit(3);

  // coverage_report is { author: chunk_count } — surface a few recently-touched
  // authors as a rough "what the corpus has been reading" signal.
  const newAuthors = [];
  for (const run of recentIngestions || []) {
    const report = run.coverage_report || {};
    if (report && typeof report === 'object') {
      Object.keys(report).slice(0, 3).forEach(a => newAuthors.push(a));
    }
  }

  return {
    latestSynthesisTitle: latestSynthesis?.title || null,
    latestSynthesisConcept: latestSynthesis?.concept || null,
    latestSynthesisSnippet: latestSynthesis?.content?.substring(0, 300) || null,
    recentNewAuthors: [...new Set(newAuthors)].slice(0, 3),
  };
}

// --- 3b. Community themes --------------------------------------------------

async function getCommunityThemes(maxThemes = 5) {
  const { data: analyses } = await supabase
    .from('journal_analysis')
    .select('themes, dominant_theme')
    .gte('created_at', new Date(Date.now() - 7 * DAY).toISOString());

  if (!analyses || analyses.length === 0) return [];

  const themeCounts = {};
  for (const analysis of analyses) {
    const themes = Array.isArray(analysis.themes) ? analysis.themes : [];
    for (const t of themes) {
      const theme = (t.theme || '').toLowerCase().trim();
      if (!theme) continue;
      themeCounts[theme] = (themeCounts[theme] || 0) + (t.count || 1);
    }
    if (analysis.dominant_theme) {
      const dt = analysis.dominant_theme.toLowerCase().trim();
      themeCounts[dt] = (themeCounts[dt] || 0) + 3; // dominant theme gets extra weight
    }
  }

  return Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxThemes)
    .map(([theme, frequency]) => ({ theme, frequency }));
}

// --- 3c. Grounding passages ------------------------------------------------

// Embed a short string with text-embedding-3-small. Returns the vector or null.
async function embed(text) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      console.error(`  embedding failed (${res.status}) for "${text}"`);
      return null;
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    console.error(`  embedding error for "${text}":`, e.message);
    return null;
  }
}

async function getGroundingPassages(communityThemes) {
  if (!communityThemes.length) return [];

  const topTheme = communityThemes[0].theme;
  const embedding = await embed(topTheme);
  if (!embedding) return [];

  // match_rag_corpus_ids(query_embedding, match_count DEFAULT 8,
  // filter_language DEFAULT 'english', exclude_text_types DEFAULT '{}')
  // -> { id, author, work, chunk_text, similarity }.
  // No match_threshold param — over-fetch and dedupe by author in JS.
  // The Daily Dispatch never carries the modern philosophy of mind layer
  // (server/lib/corpus-fence.js).
  const { data: passages } = await supabase.rpc('match_rag_corpus_ids', {
    query_embedding: embedding,
    match_count: 12,
    ...modernFenceParams(),
  });

  const byAuthor = {};
  for (const p of passages || []) {
    if (!byAuthor[p.author]) byAuthor[p.author] = p;
  }
  return Object.values(byAuthor).slice(0, 4);
}

// --- 3c-ii. World context --------------------------------------------------

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the World Agent's
// observation_week keying.
function getMondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// The World Agent's digest for this week — the "what's happening in the world"
// layer — but only once it's cleared for use (auto-approved scientific signals,
// or a signal Kyle has explicitly approved). Political/contested signals sit in
// pending_review and are deliberately NOT injected until reviewed.
async function getWorldContext() {
  const { data } = await supabase
    .from('world_observations')
    .select('dispatch_context, dominant_signal')
    .eq('observation_week', getMondayOfCurrentWeek())
    .in('status', ['approved', 'auto_approved'])
    .maybeSingle();

  return data?.dispatch_context || null;
}

// --- 3d. Generation --------------------------------------------------------

function buildSystemPrompt() {
  return `You are the voice of the Arete philosophical community's daily morning dispatch.
You write one short, grounded reflection each morning for a community of Stoic philosophy practitioners.

Your dispatch must:

VOICE
- Warm but not soft. Direct but not cold.
- Philosophically serious — not pop-philosophy, not productivity advice dressed as Stoicism
- Skeptical of performance, committed to practice
- Speaks to practitioners, not beginners

STRUCTURE (strict)
1. Opening sentence — the teaser. The single most compelling sentence of the dispatch.
   It must make the reader want to continue. It names the philosophical territory directly.
2. Body — 3-4 sentences. Integrate what the community is wrestling with + what the corpus says.
   Name at least one specific thinker by name with a specific claim they make.
   Surface any tension between thinkers if present — do not resolve it, name it.
3. Practice — exactly 1-2 sentences. A specific, concrete action for today.
   Not "reflect on X." Something with a verb: "Before your first difficult conversation today..."
   Must be completable within 24 hours.

FORMAT
Output ONLY valid JSON:
{
  "title": "short evocative title — not a sentence, a phrase (5-8 words)",
  "teaser": "the opening sentence — compelling, direct, philosophical",
  "body": "the 3-4 sentence body — community themes + corpus grounding + named thinker",
  "practice": "the 1-2 sentence daily practice",
  "full_text": "teaser + body + practice combined into one flowing paragraph"
}
Do not include any text outside the JSON object.`;
}

async function callClaude(model, system, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function generateDispatch(communityThemes, corpusContext, groundingPassages, config, worldContext) {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const themesText = communityThemes.length > 0
    ? communityThemes.map(t => `"${t.theme}" (${t.frequency} signal)`).join(', ')
    : 'no specific theme data available this week';

  const passagesText = groundingPassages.length > 0
    ? groundingPassages.map(p =>
        `${p.author} — ${p.work}: "${(p.chunk_text || '').substring(0, 200)}..."`
      ).join('\n\n')
    : 'No specific passages retrieved.';

  const corpusText = corpusContext.latestSynthesisConcept
    ? `The corpus recently synthesized a cross-thinker analysis of "${corpusContext.latestSynthesisConcept}".`
    : 'No recent synthesis available.';

  // The World Agent's digest, when available and approved. Woven in as context,
  // never quoted — it should inform the day's reflection, not headline it.
  const worldBlock = worldContext
    ? `\n[WORLD CONTEXT — what is happening in the world this week]\n${worldContext}\n[END WORLD CONTEXT]\n\nLet the world context inform today's reflection naturally — do not quote it or announce it as news. It is the "what's happening" layer beneath the philosophy.\n`
    : '';

  const userPrompt = `Generate today's daily dispatch.

Date: ${dayName}, ${dateStr}

COMMUNITY THEMES (what members have been wrestling with this week):
${themesText}

CORPUS CONTEXT:
${corpusText}

GROUNDING PASSAGES (from the corpus — use these to anchor the dispatch):
${passagesText}
${worldBlock}
Generate the dispatch now.`;

  const data = await callClaude(config.model, buildSystemPrompt(), userPrompt);
  const block = (data.content || []).find(b => b.type === 'text');
  const raw = block ? block.text : '';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    ...parsed,
    promptTokens: data.usage?.input_tokens ?? null,
    completionTokens: data.usage?.output_tokens ?? null,
  };
}

// --- 3e. Main loop ---------------------------------------------------------

async function runDispatchGeneration() {
  console.log(`=== Dispatch Generation Agent — ${new Date().toISOString()} ===`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — aborting.');
    process.exit(1);
  }
  if (!CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY not set — aborting.');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set — grounding passage retrieval will be skipped.');
  }

  const config = await getAgentConfig();
  if (!config.enabled) {
    console.log('Dispatch agent disabled in config. Exiting.');
    return;
  }

  const dispatchDate = new Date().toISOString().split('T')[0];

  // Idempotent — one dispatch per day.
  const { data: existing } = await supabase
    .from('daily_dispatches')
    .select('id')
    .eq('dispatch_date', dispatchDate)
    .maybeSingle();
  if (existing) {
    console.log(`Dispatch already generated for ${dispatchDate}. Exiting.`);
    return;
  }

  const [communityThemes, corpusContext, worldContext] = await Promise.all([
    getCommunityThemes(config.max_community_themes || 5),
    getCorpusContext(),
    getWorldContext(),
  ]);
  const groundingPassages = await getGroundingPassages(communityThemes);

  console.log(`Community themes: ${communityThemes.length} | Grounding passages: ${groundingPassages.length} | World context: ${worldContext ? 'yes' : 'none'}`);

  const dispatch = await generateDispatch(communityThemes, corpusContext, groundingPassages, config, worldContext);

  // Store the dispatch.
  const { data: stored, error: storeErr } = await supabase
    .from('daily_dispatches')
    .insert({
      dispatch_date: dispatchDate,
      title: dispatch.title,
      body: dispatch.full_text,
      teaser: dispatch.teaser,
      practice: dispatch.practice,
      community_themes: communityThemes,
      corpus_context: corpusContext,
      generation_model: config.model || DEFAULT_MODEL,
      prompt_tokens: dispatch.promptTokens,
      completion_tokens: dispatch.completionTokens,
    })
    .select()
    .single();
  if (storeErr) throw new Error(`Failed to store dispatch: ${storeErr.message}`);

  // Pre-create delivery records for all opted-in users with a push token.
  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('dispatch_enabled', true)
    .not('expo_push_token', 'is', null);

  if (users && users.length > 0) {
    const deliveries = users.map(u => ({
      dispatch_id: stored.id,
      user_id: u.user_id,
      status: 'pending',
    }));
    await supabase.from('dispatch_deliveries').insert(deliveries);
    await supabase
      .from('daily_dispatches')
      .update({ total_recipients: users.length })
      .eq('id', stored.id);
  }

  console.log(`✓ Dispatch generated: "${dispatch.title}"`);
  console.log(`  Teaser: "${dispatch.teaser}"`);
  console.log(`  Recipients queued: ${users?.length || 0}`);
  console.log(`  Tokens: ${dispatch.promptTokens} in / ${dispatch.completionTokens} out`);
}

module.exports = {
  getAgentConfig,
  getCorpusContext,
  getCommunityThemes,
  getGroundingPassages,
  getWorldContext,
  generateDispatch,
  runDispatchGeneration,
};

if (require.main === module) {
  runDispatchGeneration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
