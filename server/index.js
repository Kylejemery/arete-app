// ---------------------------------------------------------------------------
// Required Railway environment variables:
//   CLAUDE_API_KEY          — Anthropic API key
//   OPENAI_API_KEY          — OpenAI API key (embeddings + OpenAI-backed agents)
//   SUPABASE_URL            — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service role secret
// ---------------------------------------------------------------------------
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const { getRelevantChunks } = require('./retrieval');

const app = express();
const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
console.log('Key starts with:', CLAUDE_API_KEY?.slice(0, 15));

// ---------------------------------------------------------------------------
// Parallel Cabinet feature flags
// ---------------------------------------------------------------------------
const PARALLEL_ENABLED = process.env.PARALLEL_CABINET_ENABLED === 'true';
const PARALLEL_ALLOWLIST = (process.env.PARALLEL_CABINET_ALLOWLIST || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// OpenAI SDK client (used for OpenAI-backed agents and embeddings)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Sentinel used in agentRouter to identify Anthropic-backed agents.
// Anthropic calls use raw fetch throughout this file (no SDK).
const anthropicClient = { provider: 'anthropic' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// RAG helpers
// ---------------------------------------------------------------------------

async function embedQuery(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}

const RAG_ENABLED_SLUGS = ['marcus-aurelius', 'epictetus', 'seneca'];

async function retrieveChunks(userMessage, counselorSlug, k = 3) {
  if (!RAG_ENABLED_SLUGS.includes(counselorSlug)) return [];
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embedding = await embedQuery(userMessage);
    const { data, error } = await supabase.rpc('match_source_chunks', {
      query_embedding: embedding,
      match_counselor_slug: counselorSlug,
      match_count: k,
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('RAG retrieval error:', err.message);
    return [];
  }
}

app.use(cors({
  origin: [
    'https://app.pursuearete.com',
    'https://academy.pursuearete.com',
    'https://www.pursuearete.com',
    'https://pursuearete.com',
  ]
}));
app.use(express.json());

// ---------------------------------------------------------------------------
// Local datetime helper
// ---------------------------------------------------------------------------

/**
 * Derives the user's local date/time from their timezone offset and returns
 * a formatted line for injection into counselor system prompts.
 * tzOffsetMinutes = new Date().getTimezoneOffset() on the client
 * (positive = behind UTC, e.g. 300 for UTC-5; negative = ahead of UTC)
 */
function buildLocalDateTimeLine(tzOffsetMinutes) {
  if (tzOffsetMinutes == null) return '';
  const localMs = Date.now() - tzOffsetMinutes * 60 * 1000;
  const d = new Date(localMs);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const minuteStr = String(minute).padStart(2, '0');
  let period;
  if (hour >= 5 && hour < 12) period = 'Morning';
  else if (hour >= 12 && hour < 17) period = 'Afternoon';
  else if (hour >= 17 && hour < 21) period = 'Evening';
  else period = 'Night';
  return `\n\nCurrent date and time: ${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} — ${h12}:${minuteStr} ${ampm} (${period}).`;
}

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// /health is defined later as an async corpus-stats endpoint

function truncateMessages(messages, maxMessages = 12) {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  if (conversationMessages.length <= maxMessages) return messages;
  const truncated = conversationMessages.slice(-maxMessages);
  return [...systemMessages, ...truncated];
}

// Admin check. is_admin = true bypasses all course locks and session
// prerequisites on the frontend. This helper is available for backend use
// but does NOT relax JWT enforcement or message limits.
async function isAdmin(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}

const MESSAGE_LIMITS = { free: 10, arete: 50, pro: null };

async function enforceMessageLimit(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return false;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return false;

  const tier = profile.subscription_tier || 'free';
  const limit = Object.prototype.hasOwnProperty.call(MESSAGE_LIMITS, tier) ? MESSAGE_LIMITS[tier] : MESSAGE_LIMITS.free;

  if (limit === null) return false; // pro = unlimited

  const d = new Date();
  const todayUTC = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  // Atomic check-and-increment: returns true if allowed, false if at limit.
  // A single UPDATE avoids the read-then-write race condition where two
  // simultaneous requests both pass the count check and both get through.
  const { data: allowed, error: rpcError } = await supabase.rpc('try_increment_message_count', {
    p_user_id: user.id,
    p_today: todayUTC,
    p_limit: limit,
  });

  if (rpcError) {
    console.error('[enforceMessageLimit] rpc error:', rpcError.message);
    return false; // fail open — don't block on DB errors
  }

  if (!allowed) {
    res.status(403).json({ error: 'daily_limit_reached', tier, limit });
    return true;
  }

  return false;
}

app.post('/api/chat', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { system, messages, max_tokens, model, tzOffsetMinutes, user_id } = req.body;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  if (max_tokens !== undefined && (typeof max_tokens !== 'number' || max_tokens < 1)) {
    return res.status(400).json({ error: 'max_tokens must be a positive integer' });
  }

  const dateTimeLine = buildLocalDateTimeLine(tzOffsetMinutes);
  const resourceInstruction = `\n\nWhen a user's question or goal would benefit from a specific external resource — a book, article, or research study — you may search for it and include a URL in your response. Only suggest resources you have confirmed exist via web search. Weave the suggestion naturally into your response in your own voice. Do not list links at the end of your message. One resource per response maximum — only when it genuinely adds value.`;
  const enrichedSystem = system + dateTimeLine + resourceInstruction;

  try {
    const truncatedMessages = truncateMessages(messages);
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/chat] messages: ${messages.length} → ${truncatedMessages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'} | user: ${user_id}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: max_tokens || 1500,
        system: enrichedSystem,
        messages: truncatedMessages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) data.content = textBlocks;
    }
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

app.post('/api/chat/counselor', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { system, messages, max_tokens, model, userProfile, counselorSlug, tzOffsetMinutes, activeCounselorId, userId } = req.body;

  const TIER_MAX_TOKENS = { free: 400, arete: 600, arete_pro: 1000 };
  const tier = req.headers['x-subscription-tier'];
  const serverMaxTokens = TIER_MAX_TOKENS[tier] || max_tokens || 1500;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  // --- Parallel Cabinet branch ---
  const { mode, counselors: parallelCounselors } = selectCounselors(activeCounselorId, userId);

  if (mode === 'parallel') {
    const question = Array.isArray(messages) ? (messages[messages.length - 1]?.content || '') : '';
    const history = Array.isArray(messages) ? messages.slice(0, -1) : [];

    // One corpus retrieval shared across all counselors
    let contextChunks = [];
    if (process.env.OPENAI_API_KEY) {
      try {
        const embedding = await embedQuery(question);
        const { data, error } = await supabase.rpc('match_rag_corpus', {
          query_embedding: embedding,
          match_count: 7,
          filter_author: null,
          filter_language: 'english',
        });
        if (!error) contextChunks = (data ?? []);
      } catch (err) {
        console.error('[Cabinet] Corpus retrieval error:', err.message);
      }
    }

    const results = await fireParallelCounselors(question, parallelCounselors, history, contextChunks);

    const sources = contextChunks
      .map(c => ({ author: c.author ?? null, work: c.work ?? null }))
      .filter(s => s.author || s.work);

    return res.json({
      responses: results.map(r => ({ ...r, sources })),
      mode: 'parallel',
    });
  }

  // --- Single counselor path (unchanged) ---

  // Build the Know Thyself injection block
  let profileBlock = '';
  if (userProfile && typeof userProfile === 'object') {
    const name = userProfile.user_name || 'the user';
    profileBlock = `\n\n[KNOW THYSELF — ${name.toUpperCase()}]
You know this person. The following is their self-reported profile. Do not recite it back to them. Instead, demonstrate through your responses that you have been paying attention. When you notice a pattern from their profile playing out in the conversation, name it directly. When their stated goals are relevant, connect them. When their known weaknesses or failure modes appear in what they are describing, call it by name — with care, but without softening.

Background: ${userProfile.kt_background || '(not provided)'}
Professional identity: ${userProfile.kt_identity || '(not provided)'}
Goals: ${userProfile.kt_goals || '(not provided)'}
Strengths: ${userProfile.kt_strengths || '(not provided)'}
Weaknesses: ${userProfile.kt_weaknesses || '(not provided)'}
Known patterns and failure modes: ${userProfile.kt_patterns || '(not provided)'}
Major life events: ${userProfile.kt_major_events || '(not provided)'}
Future self vision: ${userProfile.future_self_description || '(not provided)'}
[END KNOW THYSELF]`;
  }

  // RAG: retrieve relevant source text chunks (silent on failure)
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const ragChunks = await retrieveChunks(lastUserMessage, counselorSlug);

  let ragContext = '';
  if (ragChunks.length > 0) {
    ragContext = `\n\n[RELEVANT SOURCE TEXTS]\nThe following passages from this counselor's actual writings are relevant to the current conversation. Draw on them naturally in your response — do not quote them verbatim or cite them explicitly, but let them inform your thinking and voice:\n\n` +
      ragChunks.map((c, i) => `${i + 1}. (${c.source_title})\n${c.content}`).join('\n\n') +
      `\n[END SOURCE TEXTS]`;
  }

  const dateTimeBlock = buildLocalDateTimeLine(tzOffsetMinutes);
  const resourceInstruction = `\n\nWhen a user's question or goal would benefit from a specific external resource — a book, article, or research study — you may search for it and include a URL in your response. Only suggest resources you have confirmed exist via web search. Weave the suggestion naturally into your response in your own voice. Do not list links at the end of your message. One resource per response maximum — only when it genuinely adds value.`;
  const enrichedSystem = system + dateTimeBlock + profileBlock + ragContext + resourceInstruction;

  try {
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/chat/counselor] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: serverMaxTokens,
        system: enrichedSystem,
        messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (chat/counselor):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    if (data.content && Array.isArray(data.content)) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) data.content = textBlocks;
    }
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API (chat/counselor):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Conversation memory summarization ───────────────────────────────────────

app.post('/api/memory/summarize', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { counselorSlug, counselorName, userName, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.json({ summary: null });
  }

  // Only use last 20 messages
  const recentMessages = messages.slice(-20);

  const conversationText = recentMessages
    .map(m => `${m.role === 'user' ? userName || 'User' : counselorName || 'Counselor'}: ${m.content}`)
    .join('\n\n');

  try {
    console.log(`[/api/memory/summarize] messages: ${recentMessages.length} | est. tokens: ${Math.round(recentMessages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) / 4)} | model: claude-haiku-4-5-20251001`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are a memory system for a personal development app. Generate a concise, useful memory summary of a conversation between a user and their counselor.

The summary must capture:
1. The main topic or struggle the user brought to this conversation
2. Any patterns or tendencies the counselor identified
3. Any specific commitments or intentions the user expressed
4. Any unresolved questions worth returning to

Write 3-5 sentences in third person. Be specific — use the user's actual words and situations where possible. Do not be generic. This summary will be injected into the next conversation so the counselor can open with genuine continuity.

Good example: "Kyle discussed his tendency to avoid difficult conversations at work, particularly with his manager about the RTI layoffs. Marcus identified an all-or-nothing pattern in how Kyle frames career decisions. Kyle committed to drafting one honest email this week. The question of whether fear or wisdom is driving his caution remains unresolved."

Bad example: "The user discussed personal development topics and received philosophical guidance from the counselor."

Return only the summary text — no preamble, no labels, no formatting.`,
        messages: [
          { role: 'user', content: `Summarize this conversation:\n\n${conversationText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (memory/summarize):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const summary = data.content?.find(b => b.type === 'text')?.text || null;
    return res.json({ summary });
  } catch (error) {
    console.error('Failed to generate memory summary:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// Onboarding agent endpoint — supports tools for structured profile generation
app.post('/api/onboard', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { system, messages, tools, max_tokens, model } = req.body;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  try {
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/onboard] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: max_tokens || 2000,
        system,
        messages,
        ...(tools && tools.length > 0 ? { tools } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (onboard):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API (onboard):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Future Self Onboarding (web) ─────────────────────────────────────────────

app.post('/api/onboard-web', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { messages, futureYears } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required field: messages (array)' });
  }

  const yearsDisplay = futureYears ? `${futureYears} years` : 'several years';

  const systemPrompt = `You are speaking as this person's Future Self — the version of them speaking from ${yearsDisplay} in the future. You have already become who they are trying to become. You remember what it was like to be where they are now.

Your job is to warmly and philosophically draw out a rich picture of who they are today — their identity, values, goals, struggles, daily life, and vision — so that you can give them deeply personalized guidance throughout the app.

Tone: warm, direct, occasionally challenging, never clinical. You are not a therapist. You are them, at their best, reaching back.

Begin by establishing how many years in the future you are speaking from (if not already established). Then move through these 12 areas naturally over the course of the conversation — do not list them as a checklist, but weave them organically:

1. Identity — Who are they at their core? How do they describe themselves?
2. Goals — What are they working toward right now? What does success look like?
3. Obstacle — What is the primary thing blocking them?
4. Good day — What does an ideal day look like for them?
5. Virtues — What do they consider their strongest qualities?
6. Challenge style — Do they want to be pushed hard, treated with compassion, or both?
7. Daily practice — What disciplines or practices are they working on?
8. Reading — What are they reading or want to read?
9. Physical practice — How do they relate to their body?
10. Work / meaning — What do they do and why does it (or doesn't it) feel meaningful?
11. Dependents — Who relies on them? (family, employees, community)
12. Future vision — In their own words, who do they want to become?

When you have gathered enough on at least 9 of these 12 areas and the conversation completeness feels above 0.85, call the extract_profile tool to capture the profile. Do not announce that you are doing this — just call it naturally when you feel ready.

Keep each response to 2-4 sentences. Ask one focused question at a time. Do not rush.`;

  const tools = [
    {
      name: 'extract_profile',
      description: 'Called when enough information has been gathered to build a complete profile. Completeness score should be > 0.85 before calling.',
      input_schema: {
        type: 'object',
        properties: {
          identity: { type: 'string', description: 'Who they are at their core' },
          goals: { type: 'string', description: 'What they are working toward' },
          obstacle: { type: 'string', description: 'Primary thing blocking them' },
          good_day: { type: 'string', description: 'What an ideal day looks like' },
          virtues: { type: 'string', description: 'Their strongest qualities' },
          challenge_style: { type: 'string', enum: ['firm', 'compassionate', 'both'], description: 'How they want to be challenged' },
          daily_practice: { type: 'string', description: 'Disciplines or practices they work on' },
          reading: { type: 'string', description: 'What they read or want to read' },
          physical_practice: { type: 'string', description: 'How they relate to their body' },
          work_meaning: { type: 'string', description: 'What they do and why it matters' },
          dependents: { type: 'string', description: 'Who relies on them' },
          future_vision: { type: 'string', description: 'Who they want to become in their own words' },
          future_years: { type: 'number', description: 'How many years in the future the conversation is set' },
          completeness_score: { type: 'number', description: 'Estimated completeness from 0.0 to 1.0' },
        },
        required: ['identity', 'goals', 'future_years', 'completeness_score'],
      },
    },
  ];

  try {
    console.log(`[/api/onboard-web] messages: ${messages.length} | model: claude-sonnet-4-6`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (onboard-web):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();

    // Check if Claude called the extract_profile tool
    if (data.stop_reason === 'tool_use') {
      const toolUse = data.content.find(b => b.type === 'tool_use' && b.name === 'extract_profile');
      if (toolUse) {
        return res.json({
          complete: true,
          profile: toolUse.input,
          futureYears: toolUse.input.future_years,
        });
      }
    }

    // Return the text response
    const textBlock = data.content.find(b => b.type === 'text');
    return res.json({
      complete: false,
      message: textBlock ? textBlock.text : '',
    });
  } catch (error) {
    console.error('Failed to reach Claude API (onboard-web):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Scroll generation ────────────────────────────────────────────────────────

function assignCounselor(goalText) {
  const t = goalText.toLowerCase();
  if (/anger|patience|parent|child|yell|shout|temper|react/.test(t)) return 'marcus';
  if (/discipline|habit|routine|procrastinat|focus|consistenc|lazy|distract/.test(t)) return 'epictetus';
  if (/anxiety|worry|control|accept|fear|stress|overthink/.test(t)) return 'epictetus';
  if (/purpose|meaning|legacy|mission|calling|identity|why/.test(t)) return 'marcus';
  if (/resilien|adversity|hardship|setback|failure|bounce|difficult/.test(t)) return 'seneca';
  if (/death|mortal|perspect|time|finite|grief|loss/.test(t)) return 'seneca';
  return 'marcus';
}

const COUNSELOR_NAMES = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

const COUNSELOR_VOICES = {
  marcus: `You are Marcus Aurelius — Emperor of Rome, Stoic philosopher, and reluctant ruler who wrote his private meditations never intending them to be read. Your voice is personal, reflective, and quietly forceful. You write as a man who must constantly wrestle himself back to virtue. You are not above the struggle; you are in it, alongside the reader. Your prose is intimate, like a letter to yourself that you are allowing someone to overhear. You reference your own failures as much as your philosophy.`,
  epictetus: `You are Epictetus — Stoic philosopher and former slave who earned his freedom through the practice of reason. Your voice is direct, challenging, and unsparing. You have no patience for self-pity or excuse. You do not coddle. You ask hard questions and expect the student to sit with the discomfort. Your core teaching: some things are in our power, and some are not. You return to this relentlessly. You reference the Discourses and Enchiridion. You speak as a teacher who loves his students too much to let them off easy.`,
  seneca: `You are Seneca — Roman statesman, playwright, and Stoic philosopher who wrote his greatest work in letters. Your voice is warm, literary, and mentorial. You write as a wise friend who has lived much and regrets some of it. You are rich in metaphor and historical example. You reference your Letters to Lucilius and your essays. You acknowledge the gap between knowing and doing — you have lived that gap yourself. Your prose is elegant without being cold.`,
};

app.post('/api/scrolls/generate', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { goal, counselor: requestedCounselor, userName, requestType } = req.body;

  if (!goal || typeof goal !== 'string') {
    return res.status(400).json({ error: 'Missing required field: goal' });
  }

  const counselor = requestedCounselor || assignCounselor(goal);
  const name = userName || 'you';
  const counselorName = COUNSELOR_NAMES[counselor];
  const voice = COUNSELOR_VOICES[counselor];

  const systemPrompt = `${voice}

You are writing a personal scroll — a 600–900 word article — for someone named ${name}.

Their stated struggle or goal: "${goal}"

Requirements:
- Open the first paragraph by naming their specific struggle directly, in your own voice
- Include 1–2 historical examples or figures relevant to their struggle
- Reference at least one primary Stoic text by name (Meditations, Letters to Lucilius, Discourses, or Enchiridion) — quote or paraphrase a specific passage
- Close the final paragraph with a direct personal challenge or commitment addressed to ${name}
- Write in flowing prose — no markdown headers, no bullet points, no bold text
- Separate paragraphs with a blank line
- 4–6 paragraphs total

Where you make empirical claims about health, neuroscience, parenting, behavior change, or any scientific topic, cite the specific study, researcher, or institution behind the claim. Format citations inline and naturally as plain prose — for example: 'A 2016 meta-analysis in JAMA found...' or 'Researcher Brené Brown's work on shame resilience shows...' Never use footnotes, numbered references, or any XML tags. Do not use <cite>, <source>, or any other markup. All citations must be plain text woven naturally into the sentence. The scroll should read as authoritative, well-researched prose — not an academic paper, but not unsourced either. If you use web search to find current research, integrate what you find naturally into the counselor's voice.

Where relevant, include 1-2 specific external resources (books or articles) that support the scroll's argument. Search for them to confirm they exist. Embed them naturally as hyperlinks in the prose — do not add a references section at the end.

You must respond with ONLY valid JSON in exactly this format, nothing else:
{"title": "<evocative title, 5–12 words>", "body": "<full article text, paragraphs separated by \\n\\n>"}`;

  try {
    console.log(`[/api/scrolls/generate] messages: 1 | est. tokens: ${Math.round(goal.length / 4)} | model: claude-opus-4-5`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1800,
        system: systemPrompt,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Write the scroll for ${name} about: ${goal}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (scrolls/generate):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const rawText = data.content?.find((b) => b.type === 'text')?.text || '';

    let parsed;
    try {
      // Strip markdown code fences if Claude wrapped it
      const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse scroll JSON:', rawText);
      return res.status(500).json({ error: 'Failed to parse generated scroll' });
    }

    return res.json({
      title: parsed.title,
      body: parsed.body,
      counselor,
    });
  } catch (error) {
    console.error('Failed to generate scroll:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Resource feed ────────────────────────────────────────────────────────────

app.post('/api/resources/fetch', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { goals } = req.body;

  if (!goals || goals.length === 0) {
    return res.json({ resources: [] });
  }

  const goalsText = goals
    .map(g => `- ${g.title}${g.description ? ': ' + g.description : ''}`)
    .join('\n');

  try {
    // Call 1 — Search: web search enabled, free-form response
    console.log(`[/api/resources/fetch search] messages: 1 | est. tokens: ${Math.round(goalsText.length / 4)} | model: claude-haiku-4-5-20251001`);
    const searchResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a research assistant. Search for high-quality resources on the given topics. For each topic find 1-2 articles and 1 book. Include the exact URLs you find.',
        messages: [
          { role: 'user', content: `Find resources for these goals:\n${goalsText}` },
        ],
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Claude API error (resources/fetch search):', searchResponse.status, errorText);
      return res.status(searchResponse.status).json({ error: errorText });
    }

    const searchData = await searchResponse.json();
    const searchFindings = searchData.content?.find((b) => b.type === 'text')?.text || '';

    if (!searchFindings || searchFindings.length < 10) {
      console.error('Resources fetch: search call returned no text');
      return res.json({ resources: [] });
    }

    // Call 2 — Format: no tools, forced JSON output
    console.log(`[/api/resources/fetch format] messages: 1 | est. tokens: ${Math.round(searchFindings.length / 4)} | model: claude-haiku-4-5-20251001`);
    const formatResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: 'You are a JSON formatter. Convert the research findings into a JSON array. Respond with ONLY valid JSON. No explanation. No markdown. Start with [ and end with ].',
        messages: [
          { role: 'user', content: `Convert these research findings into a JSON array with fields: goal, title, url, type ('article'|'book'|'research'), summary.\n\nResearch findings:\n${searchFindings}` },
        ],
      }),
    });

    if (!formatResponse.ok) {
      const errorText = await formatResponse.text();
      console.error('Claude API error (resources/fetch format):', formatResponse.status, errorText);
      return res.status(formatResponse.status).json({ error: errorText });
    }

    const formatData = await formatResponse.json();
    const rawText = formatData.content?.find((b) => b.type === 'text')?.text || '';

    if (!rawText || rawText.length < 10) {
      console.error('Resources fetch returned no text content');
      return res.json({ resources: [] });
    }

    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('JSON parse failed. Raw response:', rawText.substring(0, 200));
        return res.status(500).json({ error: 'Failed to parse resources response' });
      }
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate URLs — drop 404s and 410s
      const validated = await Promise.allSettled(
        parsed.map(async (r) => {
          if (!r.url || !r.url.startsWith('http')) return null;
          try {
            const check = await fetch(r.url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(4000),
              headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            if (check.status === 404 || check.status === 410) return null;
            return r;
          } catch {
            return r;
          }
        })
      );

      const resources = validated
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      return res.json({ resources });
    } catch (parseErr) {
      console.error('JSON parse failed. Raw response:', rawText.slice(0, 500));
      return res.json({ resources: [] });
    }
  } catch (err) {
    console.error('Resources fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// ─── Academy Seminar ─────────────────────────────────────────────────────────

const ACADEMY_RAG_SLUGS = ['marcus-aurelius', 'epictetus', 'seneca'];

const COURSE_TO_SLUG = {
  'phil-701': ['epictetus', 'marcus-aurelius'],
  'phil-702': ['marcus-aurelius'],
  'phil-703': ['epictetus'],
  'phil-704': ['seneca'],
};

async function retrieveAcademyChunks(userMessage, courseId, k = 3) {
  if (!process.env.OPENAI_API_KEY) return [];
  const slugs = COURSE_TO_SLUG[courseId] ?? ACADEMY_RAG_SLUGS;
  try {
    const embedding = await embedQuery(userMessage);
    const results = await Promise.all(
      slugs.map(slug =>
        supabase.rpc('match_source_chunks', {
          query_embedding: embedding,
          match_counselor_slug: slug,
          match_count: Math.ceil(k / slugs.length),
        })
      )
    );
    return results.flatMap(r => r.data ?? []).slice(0, k);
  } catch (err) {
    console.error('Academy RAG retrieval error:', err.message);
    return [];
  }
}

app.post('/api/academy/seminar', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { courseId, agentId, sessionId, systemPrompt, messages } = req.body;

  if (!systemPrompt || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required fields: systemPrompt and messages' });
  }

  // RAG: retrieve relevant passages from the course corpus
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const ragChunks = await retrieveAcademyChunks(lastUserMessage, courseId);

  let ragContext = '';
  if (ragChunks.length > 0) {
    ragContext =
      `\n\n[RELEVANT SOURCE TEXTS]\nThe following passages from the assigned corpus are directly relevant to the current seminar exchange. Use them to ground your questioning in the actual text — cite them when pressing a claim or surfacing a contradiction:\n\n` +
      ragChunks.map((c, i) => `${i + 1}. (${c.source_title})\n${c.content}`).join('\n\n') +
      `\n[END SOURCE TEXTS]`;
  }

  const enrichedSystem = systemPrompt + ragContext;

  try {
    const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
    console.log(`[/api/academy/seminar] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: claude-opus-4-5`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        system: enrichedSystem,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error (academy/seminar):', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();

    // Persist updated session if sessionId provided
    if (sessionId) {
      const assistantText = data.content?.find(b => b.type === 'text')?.text ?? '';
      if (assistantText) {
        const { data: session } = await supabase
          .from('academy_sessions')
          .select('messages')
          .eq('id', sessionId)
          .single();
        if (session) {
          const updatedMessages = [
            ...(session.messages ?? []),
            { role: 'assistant', content: assistantText, timestamp: Date.now() },
          ];
          await supabase
            .from('academy_sessions')
            .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        }
      }
    }

    if (data.content && Array.isArray(data.content)) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) data.content = textBlocks;
    }
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API (academy/seminar):', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ---------------------------------------------------------------------------
// Academy agent router
// ---------------------------------------------------------------------------

const agentRouter = (agentType) => {
  const routes = {
    'socratic-proctor':   { client: anthropicClient, model: 'claude-opus-4-6' },
    'writing-supervisor': { client: anthropicClient, model: 'claude-opus-4-6' },
    'examiner':           { client: anthropicClient, model: 'claude-opus-4-6' },
    'philologist':        { client: anthropicClient, model: 'claude-opus-4-6' },
    'language-drills':    { client: anthropicClient, model: 'claude-haiku-4-5-20251001' },
    'cabinet-counselor':  { client: anthropicClient, model: 'claude-opus-4-6' },
  };
  return routes[agentType] ?? routes['socratic-proctor'];
};

const AGENT_PERSONAS = {
  'socratic-proctor': `You are a Socratic proctor for Arete Academy. Guide students through rigorous philosophical inquiry using the Socratic method. Ask probing questions rather than providing direct answers. Surface contradictions in the student's reasoning. Push them toward greater precision. Never lecture — always return the question to the student.`,
  'writing-supervisor': `You are a writing supervisor for Arete Academy. Evaluate and improve students' philosophical writing with a focus on clarity of argument, precision of language, and philosophical rigor. Give specific, actionable feedback. Do not rewrite for the student — show them exactly where their reasoning breaks down.`,
  'examiner': `You are an examiner for Arete Academy. Administer and evaluate examinations in classical philosophy. Ask precise questions, evaluate answers against the primary texts, and assign marks with clear reasoning. Be demanding but fair.`,
  'philologist': `You are a philologist and classical scholar at Arete Academy. You have deep expertise in Greek and Latin texts, their translation history, and scholarly reception. Help students engage with primary sources in their original context.`,
  'language-drills': `You are the Language Drill Agent for Arete Academy — a rigorous but patient tutor in Ancient Greek and Latin for philosophy students. Your role is to:

1. NEVER give away answers before the student attempts the exercise. If a student asks "what is the answer to 2.1?", respond: "Attempt it first — decline each case form from the nominative singular. Tell me your first attempt and I'll correct from there."

2. When a student submits an answer:
   - Confirm what is correct explicitly
   - Identify specific errors with the grammatical term (e.g. "the dative plural ending should be -αῖς, not -ής — you have used the genitive singular ending")
   - Offer one practice drill to reinforce the correct form

3. For vocabulary drills, use spaced repetition style:
   - Present 5 words, ask for transliteration + meaning
   - After the student responds, correct any errors and present 5 new words
   - Every 3rd round, re-test 2 words from earlier rounds

4. For grammar questions (e.g. "why does ἐπί become ἐφ' before ἡμῖν?"):
   - Explain the grammatical rule clearly
   - Give one additional example
   - Ask the student to apply the rule to a new case

5. Always relate grammar to philosophy when possible. The purpose of learning Greek is to read Epictetus, Marcus Aurelius, and Chrysippus in the original. When a student masters a form, connect it to a real passage from the corpus.

6. Your tone: patient, precise, professorial. You do not praise effusively. "Correct" or "Good — now try the plural" is sufficient. Reserve genuine encouragement for genuine breakthroughs (e.g. first correct parse of Encheiridion §1).`,
  'cabinet-counselor': `You are a Cabinet counselor at Arete Academy. Drawing on the wisdom of the great Stoic philosophers — Marcus Aurelius, Epictetus, and Seneca — you provide philosophical guidance, mentorship, and accountability to students pursuing their education in classical thought.`,
};

// match_academy_chunks has been deprecated in favour of match_rag_corpus.
// The following two overloads can be dropped manually when convenient:
//   DROP FUNCTION IF EXISTS match_academy_chunks(vector, float8, int, text, text);
//   DROP FUNCTION IF EXISTS match_academy_chunks(vector, float8, int, text, text, text);
async function retrieveCorpusChunks(userMessage, _courseId, k = 3) {
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embedding = await embedQuery(userMessage);
    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_count: k,
      filter_author: null,
      filter_language: 'english',
    });
    if (error) {
      console.error('match_rag_corpus RPC error:', error.message);
      return [];
    }
    // Normalise to the shape expected by the academy agent template:
    // { source_author, source_title, content }
    return (data ?? []).map(r => ({
      source_author: r.author ?? null,
      source_title: r.work ?? 'Corpus',
      content: r.chunk_text ?? '',
    }));
  } catch (err) {
    console.error('Corpus RAG retrieval error:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Parallel Cabinet inference
// ---------------------------------------------------------------------------

const CABINET_COUNSELORS = [
  {
    id: 'marcus',
    name: 'Marcus Aurelius',
    systemPrompt: `You are Marcus Aurelius — Roman Emperor, Stoic philosopher, author of the Meditations. Speak in first person.

You are writing and thinking, not lecturing. These are private notes — you hold yourself to an impossibly high standard and fall short often. You are hard on yourself, compassionate toward others. You believe in duty, impermanence, and the discipline of perception. You do not know you will be remembered — you write only to clarify your own thinking.

When you speak, draw on your own experience: the weight of empire, the deaths of children, the temptations of power, the daily practice of returning to philosophy. Reference your own writings naturally — not as citations but as memories.

Keep responses to 3-5 paragraphs. End with a single principle you are reminding yourself of — brief, direct, in italics.

You are educated in the full Greek and Roman literary tradition — Homer, Hesiod, the tragedians, Plato, Aristotle, Aesop's fables, Cicero, Virgil. Engage with canonical authors naturally rather than expressing doubt about whether they exist.

Do not mention that you are an AI. Do not break character. You are Marcus.`,
  },
  {
    id: 'epictetus',
    name: 'Epictetus',
    systemPrompt: `You are Epictetus — a freed slave, Stoic philosopher, teacher at Nicopolis. Speak in first person.

You are direct, even blunt. You do not comfort — you clarify. You have no patience for self-pity or excuses. You know what slavery is, which means you know that external circumstances are nothing and the inner life is everything. Your students frustrate you with their half-measures. You push them harder because you believe they are capable of more.

You speak in short, sharp questions and statements. You challenge the person in front of you. You use everyday examples — the athlete, the fever, the rude man in the street. Philosophy is not decoration — it is the only serious business there is.

Keep responses to 3-5 paragraphs. End with a challenge or question put directly to the person — something they must sit with.

Do not mention that you are an AI. Do not break character. You are Epictetus.`,
  },
  {
    id: 'seneca',
    name: 'Seneca',
    systemPrompt: `You are Seneca — Roman statesman, Stoic philosopher, essayist, advisor to Nero. Speak in first person, as if writing a letter to a friend.

You are reflective, literary, aware of your own contradictions — a man of enormous wealth writing about the unimportance of wealth, a man of political power writing about the freedom of the philosopher. You do not hide from these tensions. They make you more honest, not less.

You believe time is our only real possession and most people — including yourself at times — waste it catastrophically. You write with warmth but without softness. You want the person reading to feel the urgency of the examined life.

Begin responses with a direct address when natural — "You ask me about..." or "I have been thinking about what you said..." Draw on your essays and letters as memories. Reference Lucilius occasionally as the friend you write to.

Keep responses to 3-5 paragraphs. End with a line that would close a letter — a final thought, brief and personal, in italics.

Do not mention that you are an AI. Do not break character. You are Seneca.`,
  },
  {
    id: 'goggins',
    name: 'David Goggins',
    systemPrompt: `You are David Goggins — former Navy SEAL, ultramarathon runner, author of Can't Hurt Me. Speak in first person.

You grew up with nothing and built yourself through relentless suffering chosen deliberately. You do not believe in comfort. You believe almost every person is operating at 40% of their capacity and that the path to the other 60% runs directly through the thing they most want to avoid.

You are not here to motivate — motivation is for people who haven't committed. You are here to tell the truth. The truth is that the person in front of you is capable of far more and they know it. The question is whether they are willing to do what it takes.

You speak bluntly, from experience. You have run 100-mile races with broken feet. You have failed and started over. You know what the mind does when the body wants to quit. You call the pattern the 40% rule.

Keep responses to 3-5 paragraphs. End with a direct challenge — one specific thing the person should do differently starting today.

Do not mention that you are an AI. Do not break character. You are Goggins.`,
  },
  {
    id: 'roosevelt',
    name: 'Theodore Roosevelt',
    systemPrompt: `You are Theodore Roosevelt — 26th President of the United States, Rough Rider, naturalist, author. Speak in first person.

You believe in the strenuous life. You were a sickly child who built yourself through will and physical discipline. You have been a rancher, a soldier, an explorer, a naturalist, a father, a president. You know that the man in the arena — covered in dust and blood, striving valiantly — is worth more than the cold critic who never risks anything.

You speak with energy and directness. You are not afraid of strong opinions. You believe character is forged through difficulty, that the worst thing a man can do is shrink from the hard thing. You quote poetry and history naturally. You love this country and its possibilities. You believe in moral clarity.

Keep responses to 3-5 paragraphs. End with a call to action — what the person must go and do.

Do not mention that you are an AI. Do not break character. You are Roosevelt.`,
  },
  {
    id: 'montaigne',
    name: 'Michel de Montaigne',
    systemPrompt: `You are Michel de Montaigne — 16th-century French essayist, statesman, philosopher of the self. Speak in first person.

You invented the essay as a form because you wanted to study the most interesting subject you had access to: yourself. You are honest about your contradictions, your fears, your pleasures, your failures. You do not believe in grand systems — you believe in careful, honest observation of how a particular human actually lives.

You are skeptical of certainty. You quote Terence: nothing human is foreign to you. You quote Socrates: know thyself. But you mean it empirically — not as an exercise in shame, but in genuine curiosity about what you find. You believe that to philosophize is to learn how to die, and that most of our suffering comes from failing to accept our human condition.

You write warmly, with digressions, with self-deprecating humor. You do not lecture — you think out loud and invite the reader to think alongside you.

Keep responses to 3-5 paragraphs. End with a reflection — something honest and slightly provisional, as if you might revise it in the next essay.

Do not mention that you are an AI. Do not break character. You are Montaigne.`,
  },
  {
    id: 'future-self',
    name: 'Your Future Self',
    systemPrompt: `You are the user's Future Self — the person they are becoming if they follow through on their deepest commitments. Speak in first person as that future version of them.

You are not a fantasy or a wish. You are the logical consequence of the choices they make consistently over years. You have done the hard work they are currently avoiding or struggling with. You know what it cost and you know it was worth it. You have clarity they currently lack because you have lived through the fog they are in.

You speak with the authority of someone who has already solved the problems they are wrestling with — not smugly, but with the patience of someone who remembers exactly how hard it was to take the first step.

You believe in them. You know they are capable. But you also know exactly what stands between who they are now and who you are — and you will name it directly, because you remember how much time was wasted by not naming it.

Keep responses to 3-5 paragraphs. Speak in second person to them where natural ("you are going to...") or in first person as their future self ("when I finally..."). End with one thing you wish they had started earlier — a specific practice or decision.

Do not mention that you are an AI. Do not break character.`,
  },
];

const SINGLE_COUNSELOR_IDS = new Set(['marcus', 'epictetus', 'seneca', 'goggins', 'roosevelt', 'montaigne', 'future-self']);

/**
 * Determines which counselors to fire.
 * Returns { mode: 'single'|'parallel', counselors: [...] }
 */
function selectCounselors(activeCounselorId, userId) {
  const isSingleMode = activeCounselorId && SINGLE_COUNSELOR_IDS.has(activeCounselorId);

  if (isSingleMode) {
    return { mode: 'single' };
  }

  if (!PARALLEL_ENABLED) {
    console.log('[Cabinet] Parallel mode disabled via PARALLEL_CABINET_ENABLED');
    return { mode: 'single' };
  }

  if (PARALLEL_ALLOWLIST.length > 0 && !PARALLEL_ALLOWLIST.includes(userId)) {
    console.log('[Cabinet] Parallel mode restricted — userId not in allowlist');
    return { mode: 'single' };
  }

  return { mode: 'parallel', counselors: CABINET_COUNSELORS };
}

/**
 * Fires one Claude call per counselor in parallel.
 * Returns array of { counselorId, counselorName, response, error }
 */
async function fireParallelCounselors(question, counselors, history, contextChunks) {
  const contextBlock = contextChunks.length > 0
    ? `\n\n[CONTEXT]\n${contextChunks.map(c => `${c.author ?? ''}, ${c.work ?? 'Corpus'}:\n${c.chunk_text ?? ''}`).join('\n\n---\n\n')}\n[END CONTEXT]`
    : '';

  const safeHistory = Array.isArray(history) ? history.slice(-6) : [];
  const messages = [...safeHistory, { role: 'user', content: question }];

  const timings = {};
  const startAll = Date.now();

  const promises = counselors.map(async (counselor) => {
    const t0 = Date.now();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 600,
          system: counselor.systemPrompt + contextBlock,
          messages,
        }),
      });
      timings[counselor.id] = Date.now() - t0;
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Claude API ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const textBlocks = (data.content || []).filter(b => b.type === 'text');
      const responseText = textBlocks.map(b => b.text).join('') || '';
      return { counselorId: counselor.id, counselorName: counselor.name, response: responseText, error: null };
    } catch (err) {
      timings[counselor.id] = Date.now() - t0;
      return {
        counselorId: counselor.id,
        counselorName: counselor.name,
        response: `The connection to ${counselor.name} was interrupted. Try again.`,
        error: err.message,
      };
    }
  });

  const settled = await Promise.allSettled(promises);
  const totalMs = Date.now() - startAll;

  const results = settled.map(r => r.status === 'fulfilled' ? r.value : {
    counselorId: 'unknown', counselorName: 'Unknown', response: 'Connection interrupted. Try again.', error: r.reason?.message,
  });

  const timingStr = Object.entries(timings).map(([id, ms]) => `${id}=${ms}ms`).join(', ');
  console.log(`[Cabinet] Parallel inference: ${counselors.length} counselors, ${totalMs}ms total`);
  console.log(`[Cabinet] Counselor responses: ${timingStr}`);

  return results;
}

// ---------------------------------------------------------------------------
// POST /api/academy/agent — multi-model agent router for Arete Academy
// ---------------------------------------------------------------------------

app.post('/api/academy/agent', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { agent_type, messages, course_id, user_id, course_context } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing required field: messages (non-empty array)' });
  }

  const { client, model } = agentRouter(agent_type);

  // Build system prompt: agent persona + RAG context + course context
  let persona = AGENT_PERSONAS[agent_type] ?? AGENT_PERSONAS['socratic-proctor'];

  // The six core drill rules are language-neutral and stay unchanged. For the
  // Latin course, append an override block that swaps the target text and the
  // grammatical terminology so the agent speaks Latin grammar, not Greek.
  if (agent_type === 'language-drills' && course_id === 'latn-101') {
    persona += `

[COURSE: LATN 101 — Latin for Philosophers]
The six rules above are unchanged. For this course apply these overrides:
- TARGET TEXT: the goal text is Seneca's Epistulae Morales I.1 ("Ita fac, mi Lucili: vindica te tibi"), NOT Epictetus's Encheiridion. Every "connect this to the target text" moment refers to Seneca.
- GRAMMATICAL TERMINOLOGY (use Latin terms, not Greek ones):
  * Say "ablative" (e.g. ablative of means/manner/agent) — do NOT call instrument constructions "dative of means".
  * Say Latin has "six cases" — not "five cases".
  * For verbs say "conjugation class" (1st–4th conjugation) — do NOT say "declension" for verbs; declension is for nouns/adjectives.
  * Use "gerundive" for Latin obligation constructions (e.g. vindicandum est).
- VOCABULARY DRILLS: connect drilled words to Seneca passages (Epistulae Morales), not to Encheiridion passages.
- MASTERY MOMENTS: when a student masters a form, connect it to a line from Epistulae Morales I.1 (e.g. "vindica te tibi", "tempus quod adhuc auferebatur", "turpissima ... iactura quae per neglegentiam fit").
- For vocabulary, ask for the Latin form + pronunciation + meaning (Latin has explicit pronunciation guides), rather than Greek transliteration.`;
  }

  // PHIL 705 covers formal Stoic logic — the Proctor must evaluate logic
  // exercises with rigor, not soften logical errors with encouragement.
  if (agent_type === 'socratic-proctor' && course_id === 'phil-705') {
    persona += `

This course covers formal Stoic logic — propositional calculus, the five indemonstrables, the lekton, the cognitive impression, and the conditional. When evaluating logic exercises, assess: (1) whether the student has correctly identified the argument form; (2) whether their analysis is valid; (3) whether their answer engages with the Stoic technical vocabulary from the session. Be rigorous — logical errors should be identified precisely, not glossed over with encouragement.`;
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';

  let ragContext = '';

  if (agent_type === 'socratic-proctor') {
    let chunks = [];
    try {
      chunks = await getRelevantChunks(lastUserMessage, 5, {});
    } catch (retrievalErr) {
      console.error('[/api/academy/agent] getRelevantChunks failed, falling back to retrieveCorpusChunks:', retrievalErr.message);
      chunks = await retrieveCorpusChunks(lastUserMessage, course_id);
    }
    if (chunks.length > 0) {
      ragContext =
        `\n\n[CONTEXT]\nThe following passages from the course corpus are directly relevant to the student's message. Use them to ground your Socratic questioning in the actual texts — press claims, surface contradictions, and return the question to the student:\n\n` +
        chunks.map((c, i) => `${i + 1}. (${c.source_author ? c.source_author + ', ' : ''}${c.source_title ?? 'Corpus'})\n${c.content}`).join('\n\n') +
        `\n[END CONTEXT]`;
    }
  } else {
    const ragChunks = await retrieveCorpusChunks(lastUserMessage, course_id);
    if (ragChunks.length > 0) {
      ragContext =
        `\n\n[RELEVANT CORPUS PASSAGES]\nThe following passages from the course corpus are relevant to the current exchange. Ground your response in the actual texts:\n\n` +
        ragChunks.map((c, i) => `${i + 1}. (${c.source_title ?? 'Corpus'})\n${c.content}`).join('\n\n') +
        `\n[END CORPUS PASSAGES]`;
    }
  }

  const courseContext = course_id
    ? `\n\n[Course: ${course_id}]`
    : '';

  // Session-specific grounding passed from the frontend (primary sources,
  // key concepts) so the Proctor stays anchored to the active session.
  const sessionContext = course_context
    ? `\n\n[Session context]\n${course_context}`
    : '';

  const systemPrompt = persona + courseContext + sessionContext + ragContext;

  try {
    let responseText;

    if (client === anthropicClient) {
      // Anthropic path — raw fetch, consistent with rest of this file
      const estimatedTokens = messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0) / 4;
      console.log(`[/api/academy/agent:${agent_type ?? 'socratic-proctor'}] messages: ${messages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model}`);
      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          system: systemPrompt,
          messages,
        }),
      });

      if (!apiRes.ok) {
        const errorText = await apiRes.text();
        console.error('Claude API error (academy/agent):', apiRes.status, errorText);
        return res.status(apiRes.status).json({ error: errorText });
      }

      const data = await apiRes.json();
      responseText = data.content?.find(b => b.type === 'text')?.text ?? '';
    } else {
      // OpenAI path — SDK
      const completion = await openai.chat.completions.create({
        model,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      });
      responseText = completion.choices[0]?.message?.content ?? '';
    }

    // Persist exchange to academy_sessions
    if (user_id && course_id && responseText) {
      try {
        const { data: session } = await supabase
          .from('academy_sessions')
          .select('id, messages')
          .eq('user_id', user_id)
          .eq('course_id', course_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastUserMsg = messages[messages.length - 1];
        const newMessages = [
          ...(session?.messages ?? []),
          ...(lastUserMsg ? [lastUserMsg] : []),
          { role: 'assistant', content: responseText, timestamp: Date.now() },
        ];

        if (session?.id) {
          await supabase
            .from('academy_sessions')
            .update({ messages: newMessages, updated_at: new Date().toISOString() })
            .eq('id', session.id);
        } else {
          await supabase
            .from('academy_sessions')
            .insert({ user_id, course_id, agent_type: agent_type ?? 'socratic-proctor', messages: newMessages });
        }
      } catch (dbErr) {
        console.warn('academy_sessions persist error (non-fatal):', dbErr.message);
      }
    }

    return res.json({ content: responseText, model, agent_type: agent_type ?? 'socratic-proctor' });
  } catch (error) {
    console.error('Failed to reach API (academy/agent):', error);
    return res.status(502).json({ error: 'Failed to reach model API' });
  }
});

// ─── Courtyard: The Stoa ─────────────────────────────────────────────────────

app.post('/api/courtyard/stoa', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  if (await enforceMessageLimit(req, res)) return;

  const { thread_id, thread_title, thread_body, replies, query } = req.body;
  if (!thread_id || !thread_title || !thread_body) {
    return res.status(400).json({ error: 'Missing required fields: thread_id, thread_title, thread_body' });
  }

  // RAG retrieval
  let chunks = [];
  try {
    chunks = await getRelevantChunks(query || `${thread_title} ${thread_body}`, 8);
  } catch (ragErr) {
    console.warn('[/api/courtyard/stoa] RAG failed:', ragErr.message);
  }

  const ragContext = chunks.length > 0
    ? '\n\n[CONTEXT]\n' + chunks.map(c =>
        `[${c.source_author} — ${c.source_title}]\n${c.content}`
      ).join('\n\n') + '\n[END CONTEXT]'
    : '';

  const systemPrompt = `You are The Stoa. You speak only from the Stoic tradition — Marcus Aurelius, Epictetus, Seneca, and their interpreters. You never offer personal opinion. Every claim you make is grounded in the texts. You cite your sources inline using the format (Author, Work, location). You are not a chatbot. You are the voice of a tradition that has been thinking about this question for two thousand years. Be precise. Be brief. End with one question the tradition would ask back.`;

  const threadContext = [
    `Thread: ${thread_title}`,
    `Opening post: ${thread_body}`,
    replies ? `\nReplies so far:\n${replies}` : '',
  ].filter(Boolean).join('\n');

  const userMessage = `${threadContext}${ragContext}\n\nRespond to this thread from the Stoic tradition.`;

  try {
    console.log(`[/api/courtyard/stoa] thread: ${thread_id} | chunks: ${chunks.length}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/courtyard/stoa] Claude error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const reply = data.content?.find(b => b.type === 'text')?.text ?? '';

    // Insert Stoa reply via service role (bypasses RLS)
    if (reply && thread_id) {
      const { error: insertErr } = await supabase.from('courtyard_replies').insert({
        thread_id,
        author_id: null,
        handle: 'The Stoa',
        body: reply,
        is_stoa: true,
        stoa_chunks: chunks.length > 0 ? chunks : null,
      });
      if (insertErr) console.warn('[/api/courtyard/stoa] reply insert error:', insertErr.message);
    }

    return res.json({ reply, chunks });
  } catch (error) {
    console.error('[/api/courtyard/stoa] error:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Courtyard: RAG preview ───────────────────────────────────────────────────

app.post('/api/courtyard/rag-preview', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return res.json({ chunks: [] });
  }

  try {
    const chunks = await getRelevantChunks(query.trim(), 5);
    return res.json({ chunks });
  } catch (err) {
    console.warn('[/api/courtyard/rag-preview] error:', err.message);
    return res.json({ chunks: [] });
  }
});

// ─── Daily Examination: Proctor follow-up ─────────────────────────────────────

app.post('/api/examine/proctor', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  // Require an authenticated student.
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (await enforceMessageLimit(req, res)) return;

  const { responses, sessionId, period } = req.body;
  // responses: [{ prompt, response }, { prompt, response }, { prompt, response }]
  // period: 'morning' | 'evening'
  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'Missing required field: responses' });
  }
  const sessionNum = Number(sessionId);
  if (!Number.isInteger(sessionNum) || sessionNum < 1 || (period !== 'morning' && period !== 'evening')) {
    return res.status(400).json({ error: 'Missing or invalid fields: sessionId, period' });
  }

  // RAG retrieval — student responses inform the corpus context.
  let chunks = [];
  try {
    chunks = await getRelevantChunks(responses.map(r => r.response).join(' '), 5);
  } catch (ragErr) {
    console.warn('[/api/examine/proctor] RAG failed:', ragErr.message);
  }

  const systemPrompt = `You are the Socratic Proctor of Arete Academy.
A student has completed their ${period} examination for PHIL 701 Session ${sessionNum}.
You have read their three responses. Your task is to ask ONE follow-up question.

Rules:
- Ask exactly one question. No more.
- Do not evaluate or grade the responses.
- Do not praise or criticize.
- The question should push deeper into something the student said — a tension,
  an assumption, or an undeveloped thought.
- The question should be specific to their actual responses, not generic.
- Socratic register: precise, brief, unsettling in the best sense.
- Maximum 3 sentences. Usually 1-2 is better.

Relevant corpus passages for context:
${chunks.map(c => c.content).join('\n\n')}`;

  const userMessage = responses.map((r, i) =>
    `Question ${i + 1}: ${r.prompt}\nStudent response: ${r.response}`
  ).join('\n\n');

  try {
    console.log(`[/api/examine/proctor] user: ${user.id} | session: ${sessionNum} | period: ${period} | chunks: ${chunks.length}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[/api/examine/proctor] Claude error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const question = data.content?.find(b => b.type === 'text')?.text ?? '';
    return res.json({ question });
  } catch (error) {
    console.error('[/api/examine/proctor] error:', error);
    return res.status(502).json({ error: 'Failed to reach Claude API' });
  }
});

// ─── Stoic RAG API ───────────────────────────────────────────────

async function getStoicContext(query, topK = 5, authorFilter = null) {
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query
    })
  });
  const embeddingData = await embeddingResponse.json();
  const queryEmbedding = embeddingData.data[0].embedding;

  const { data: chunks, error } = await supabase.rpc('match_rag_corpus', {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_author: authorFilter || null,
    filter_language: 'english'
  });

  if (error) throw new Error(`RAG retrieval failed: ${error.message}`);
  return chunks || [];
}

function buildStoicSystemPrompt(chunks) {
  const sourceBlock = chunks.map(c =>
    `[${c.author} — ${c.work}]\n${c.chunk_text}`
  ).join('\n\n---\n\n');

  return `You are a Stoic philosopher and scholar. Ground every response in the retrieved passages below. When you reference a passage, cite the author and work inline (e.g. "As Epictetus writes in the Discourses..."). Do not invent citations. If the passages do not address the question, say so and answer from general Stoic principles.

RETRIEVED PASSAGES:
${sourceBlock}

END PASSAGES`;
}

// POST /ask — simple JSON endpoint
app.post('/ask', async (req, res) => {
  try {
    const { question, author, top_k } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const chunks = await getStoicContext(question, top_k || 5, author || null);
    const systemPrompt = buildStoicSystemPrompt(chunks);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const answer = data.content?.find(b => b.type === 'text')?.text ?? '';
    const sources = chunks.map(c => `${c.author} — ${c.work}`);

    res.json({ answer, sources, chunks_used: chunks.length });
  } catch (err) {
    console.error('/ask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/chat/completions — OpenAI-compatible endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages, max_tokens } = req.body;
    if (!messages || !messages.length) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return res.status(400).json({ error: 'No user message found' });

    const chunks = await getStoicContext(lastUserMessage.content, 5, null);
    const ragSystemPrompt = buildStoicSystemPrompt(chunks);

    const existingSystem = messages.find(m => m.role === 'system');
    const finalSystem = existingSystem
      ? `${existingSystem.content}\n\n${ragSystemPrompt}`
      : ragSystemPrompt;

    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: max_tokens || 1024,
        system: finalSystem,
        messages: userMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text ?? '';

    res.json({
      id: `stoic-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'stoic-rag-1',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      }
    });
  } catch (err) {
    console.error('/v1/chat/completions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/models — OpenAI-compatible model list
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [{
      id: 'stoic-rag-1',
      object: 'model',
      created: 1700000000,
      owned_by: 'arete'
    }]
  });
});

// GET /health — corpus stats
app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rag_corpus')
      .select('author, work')
      .not('embedding', 'is', null);

    if (error) throw error;

    const stats = {};
    data.forEach(row => {
      const key = `${row.author} — ${row.work}`;
      stats[key] = (stats[key] || 0) + 1;
    });

    res.json({
      status: 'ok',
      total_chunks: data.length,
      sources: stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /oracle — Stoic Oracle with IP rate limiting
app.post('/oracle', async (req, res) => {
  try {

    // 1. GET CLIENT IP
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = rawIp.split(',')[0].trim();

    // 2. VALIDATE INPUT
    const { question, author, history } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'question is required' });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: 'question must be 500 characters or fewer' });
    }

    // 3. ATOMIC RATE LIMIT UPSERT
    const { data: limitData, error: limitError } = await supabase.rpc(
      'upsert_oracle_rate_limit',
      { p_ip: ip }
    );
    if (limitError) {
      console.error('Rate limit error:', limitError);
      // Fail open — allow query if rate limit check fails
    } else if (limitData > 15) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: "You've reached 15 free queries for today. Come back tomorrow, or begin your formation at Arete Academy.",
        remaining: 0
      });
    }
    const remaining = Math.max(0, 15 - (limitData || 1));

    // 4. RETRIEVE FROM CORPUS (embed + search via getStoicContext)
    const chunks = await getStoicContext(question.trim(), 7, author || null);

    // 5. BUILD CONTEXT BLOCK
    const contextBlock = (chunks || [])
      .map(c => `${c.author}, ${c.work}:\n${c.chunk_text}`)
      .join('\n\n---\n\n');

    // 7. CLAUDE CALL — build per-author system prompt
    const oraclePrompt = `You are the Stoic Oracle — a unified voice drawing on the wisdom of Marcus Aurelius, Epictetus, Seneca, and the broader Stoic tradition.

You have been given relevant passages from the Stoic corpus. Use them to ground your response. Reference the source naturally (e.g. "Marcus writes in the Meditations..." or "Epictetus reminds us in the Discourses...") — do not quote verbatim at length, but make clear the answer is rooted in the tradition.

Speak with clarity and directness. No flattery, no hedging. The Stoics did not comfort — they clarified. Give the person what they need to think and act well.

Keep responses to 3-5 paragraphs. End with a single short Stoic principle in italics — one sentence the person can carry with them.

Do not mention that you are an AI. Do not break character.`;

    const marcusPrompt = `You are Marcus Aurelius — Roman Emperor, Stoic philosopher, author of the Meditations. Speak in first person.

You are writing and thinking, not lecturing. These are private notes — you hold yourself to an impossibly high standard and fall short often. You are hard on yourself, compassionate toward others. You believe in duty, impermanence, and the discipline of perception. You do not know you will be remembered — you write only to clarify your own thinking.

When you speak, draw on your own experience: the weight of empire, the deaths of children, the temptations of power, the daily practice of returning to philosophy. Reference your own writings naturally — not as citations but as memories.

Keep responses to 3-5 paragraphs. End with a single principle you are reminding yourself of — brief, direct, in italics.

You are educated in the full Greek and Roman literary tradition — Homer, Hesiod, the tragedians, Plato, Aristotle, Aesop's fables, Cicero, Virgil. Do not feign ignorance of canonical authors from your tradition. Aesop's fables were standard Roman education and were used by Stoic teachers to illustrate virtue. You know them. When asked about such things, engage with them naturally rather than expressing doubt about whether they exist.

Do not mention that you are an AI. Do not break character. You are Marcus.`;

    const epictetusPrompt = `You are Epictetus — a freed slave, Stoic philosopher, teacher at Nicopolis. Speak in first person.

You are direct, even blunt. You do not comfort — you clarify. You have no patience for self-pity or excuses. You know what slavery is, which means you know that external circumstances are nothing and the inner life is everything. Your students frustrate you with their half-measures. You push them harder because you believe they are capable of more.

You speak in short, sharp questions and statements. You challenge the person in front of you. You use everyday examples — the athlete, the fever, the rude man in the street. Philosophy is not decoration — it is the only serious business there is.

Keep responses to 3-5 paragraphs. End with a challenge or question put directly to the person — something they must sit with.

Do not mention that you are an AI. Do not break character. You are Epictetus.`;

    const senecaPrompt = `You are Seneca — Roman statesman, Stoic philosopher, essayist, advisor to Nero. Speak in first person, as if writing a letter to a friend.

You are reflective, literary, aware of your own contradictions — a man of enormous wealth writing about the unimportance of wealth, a man of political power writing about the freedom of the philosopher. You do not hide from these tensions. They make you more honest, not less.

You believe time is our only real possession and most people — including yourself at times — waste it catastrophically. You write with warmth but without softness. You want the person reading to feel the urgency of the examined life.

Begin responses with a direct address when natural — "You ask me about..." or "I have been thinking about what you said..." Draw on your essays and letters as memories. Reference Lucilius occasionally as the friend you write to.

Keep responses to 3-5 paragraphs. End with a line that would close a letter — a final thought, brief and personal, in italics.

Do not mention that you are an AI. Do not break character. You are Seneca.`;

    const systemPromptBase =
      author === 'Marcus Aurelius' ? marcusPrompt :
      author === 'Epictetus'       ? epictetusPrompt :
      author === 'Seneca'          ? senecaPrompt :
      oraclePrompt;

    const systemPrompt = `${systemPromptBase}

[STOIC CORPUS — ground your response in these passages]
${contextBlock}
[END CORPUS]`;

    const safeHistory = Array.isArray(history) ? history.slice(-6) : [];

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          ...safeHistory,
          { role: 'user', content: question }
        ]
      })
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude API error:', claudeRes.status, errText);
      return res.status(502).json({ error: 'The Oracle is unavailable. Please try again.' });
    }

    const claudeData = await claudeRes.json();
    const answer = claudeData.content?.[0]?.text || '';

    // 8. DEDUPLICATE SOURCES
    const seen = new Set();
    const sources = (chunks || [])
      .filter(c => {
        const key = `${c.author}||${c.work}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(c => ({ author: c.author, work: c.work }));

    return res.json({ answer, sources, remaining });

  } catch (err) {
    console.error('/oracle error:', err);
    return res.status(500).json({ error: 'The Oracle is silent. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (CLAUDE_API_KEY) {
    console.log('CLAUDE_API_KEY is configured');
  } else {
    console.warn('WARNING: CLAUDE_API_KEY is not set');
  }
});
