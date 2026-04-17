require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
console.log('Key starts with:', CLAUDE_API_KEY?.slice(0, 15));

app.use(cors());
app.use(express.json());

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

app.post('/api/chat', async (req, res) => {
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: CLAUDE_API_KEY not set' });
  }

  const { system, messages, max_tokens, model } = req.body;

  if (!system || !messages) {
    return res.status(400).json({ error: 'Missing required fields: system and messages' });
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  if (max_tokens !== undefined && (typeof max_tokens !== 'number' || max_tokens < 1)) {
    return res.status(400).json({ error: 'max_tokens must be a positive integer' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-5',
        max_tokens: max_tokens || 1500,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Failed to reach Claude API:', error);
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

Where you make empirical claims about health, neuroscience, parenting, behavior change, or any scientific topic, cite the specific study, researcher, or institution behind the claim. Format citations inline and naturally — for example: 'A 2016 meta-analysis in JAMA found...' or 'Researcher Brené Brown's work on shame resilience shows...' Never use footnotes or numbered references. The scroll should read as authoritative, well-researched prose — not an academic paper, but not unsourced either. If you use web search to find current research, integrate what you find naturally into the counselor's voice.

You must respond with ONLY valid JSON in exactly this format, nothing else:
{"title": "<evocative title, 5–12 words>", "body": "<full article text, paragraphs separated by \\n\\n>"}`;

  try {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (CLAUDE_API_KEY) {
    console.log('CLAUDE_API_KEY is configured');
  } else {
    console.warn('WARNING: CLAUDE_API_KEY is not set');
  }
});
