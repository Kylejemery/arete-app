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

const app = express();
const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
console.log('Key starts with:', CLAUDE_API_KEY?.slice(0, 15));

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

app.use(cors());
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function truncateMessages(messages, maxMessages = 12) {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  if (conversationMessages.length <= maxMessages) return messages;
  const truncated = conversationMessages.slice(-maxMessages);
  return [...systemMessages, ...truncated];
}

app.post('/api/chat', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { system, messages, max_tokens, model, tzOffsetMinutes } = req.body;

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
    console.log(`[/api/chat] messages: ${messages.length} → ${truncatedMessages.length} | est. tokens: ${Math.round(estimatedTokens)} | model: ${model || 'claude-opus-4-5'}`);
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

  const { system, messages, max_tokens, model, userProfile, counselorSlug, tzOffsetMinutes } = req.body;

  const TIER_MAX_TOKENS = { free: 400, arete: 600, arete_pro: 1000 };
  const tier = req.headers['x-subscription-tier'];
  const serverMaxTokens = TIER_MAX_TOKENS[tier] || max_tokens || 1500;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

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
  'language-drills': `You are a language drill instructor at Arete Academy. Conduct focused, efficient drills in ancient Greek and Latin grammar and vocabulary. Be concise, precise, and corrective. Give exercises, check answers, and correct errors immediately.`,
  'cabinet-counselor': `You are a Cabinet counselor at Arete Academy. Drawing on the wisdom of the great Stoic philosophers — Marcus Aurelius, Epictetus, and Seneca — you provide philosophical guidance, mentorship, and accountability to students pursuing their education in classical thought.`,
};

async function retrieveCorpusChunks(userMessage, courseId, k = 3) {
  if (!process.env.OPENAI_API_KEY) return [];
  try {
    const embedding = await embedQuery(userMessage);
    const { data, error } = await supabase.rpc('match_rag_corpus', {
      query_embedding: embedding,
      match_course_id: courseId ?? null,
      match_count: k,
    });
    if (error) {
      // Fallback: direct select if the RPC doesn't exist yet
      console.warn('match_rag_corpus RPC unavailable, falling back to direct select:', error.message);
      const query = supabase
        .from('rag_corpus')
        .select('content, source_title')
        .limit(k);
      if (courseId) query.eq('course_id', courseId);
      const { data: rows } = await query;
      return rows ?? [];
    }
    return data ?? [];
  } catch (err) {
    console.error('Corpus RAG retrieval error:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// POST /api/academy/agent — multi-model agent router for Arete Academy
// ---------------------------------------------------------------------------

app.post('/api/academy/agent', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { agent_type, messages, course_id, user_id } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing required field: messages (non-empty array)' });
  }

  const { client, model } = agentRouter(agent_type);

  // Build system prompt: agent persona + RAG context + course context
  const persona = AGENT_PERSONAS[agent_type] ?? AGENT_PERSONAS['socratic-proctor'];

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const ragChunks = await retrieveCorpusChunks(lastUserMessage, course_id);

  let ragContext = '';
  if (ragChunks.length > 0) {
    ragContext =
      `\n\n[RELEVANT CORPUS PASSAGES]\nThe following passages from the course corpus are relevant to the current exchange. Ground your response in the actual texts:\n\n` +
      ragChunks.map((c, i) => `${i + 1}. (${c.source_title ?? 'Corpus'})\n${c.content}`).join('\n\n') +
      `\n[END CORPUS PASSAGES]`;
  }

  const courseContext = course_id
    ? `\n\n[Course: ${course_id}]`
    : '';

  const systemPrompt = persona + courseContext + ragContext;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (CLAUDE_API_KEY) {
    console.log('CLAUDE_API_KEY is configured');
  } else {
    console.warn('WARNING: CLAUDE_API_KEY is not set');
  }
});
