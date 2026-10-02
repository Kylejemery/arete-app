// server/synthesis/shared.js
//
// Plumbing the Synthesis Agent's modes share: the Supabase client, embeddings,
// the Anthropic call, JSON extraction, and the agent_config read. A mode
// (synthesis-agent.js's journal-demand run, synthesis/modes/stoic-life.js)
// owns its own prompts and selection logic and calls into this.
//
// Raw fetch to OpenAI and Anthropic, no SDKs, like every other agent.
// Nothing here calls process.exit: these functions also run inside the API
// server through the admin run endpoints.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

const DAY = 24 * 60 * 60 * 1000;

// Monday (UTC) of the current week, as YYYY-MM-DD — matches the other agents.
function getMondayOfCurrentWeek(now = new Date()) {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun .. 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// Embed a short string with text-embedding-3-small, the corpus model.
// Returns the vector or null (logged), never throws.
async function embed(text) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      console.error(`  embedding failed (${res.status}) for "${String(text).slice(0, 80)}"`);
      return null;
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    console.error(`  embedding error for "${String(text).slice(0, 80)}":`, e.message);
    return null;
  }
}

// Embed many strings, 100 per request. Returns vectors in input order, with
// null where a batch failed.
async function embedMany(texts) {
  const out = new Array(texts.length).fill(null);
  if (!process.env.OPENAI_API_KEY) return out;
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100).map(t => String(t || '').slice(0, 8000) || ' ');
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
      });
      if (!res.ok) { console.error(`  batch embedding failed (${res.status})`); continue; }
      for (const d of (await res.json()).data) out[i + d.index] = d.embedding;
    } catch (e) {
      console.error('  batch embedding error:', e.message);
    }
  }
  return out;
}

// Cosine similarity between two equal-length embedding vectors.
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

// pgvector values arrive over PostgREST as the text "[0.1,0.2,...]".
function parseVector(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.startsWith('[')) {
    try { return JSON.parse(v); } catch { return null; }
  }
  return null;
}

// One Messages API call. Returns the parsed response; throws on HTTP errors.
async function callClaude({ model, system, userPrompt, maxTokens = 8000 }) {
  if (!process.env.CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.stop_reason === 'max_tokens') {
    console.warn(`  ⚠ ${model} hit max_tokens — output may be truncated`);
  }
  return json;
}

function textOf(response) {
  return (response?.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

// Pull the last JSON value (object or array) out of model output. Handles
// ```json fences and narration around the payload. Same rule as world-agent.
function extractJson(raw) {
  if (!raw) return null;
  const fenced = raw.match(/```json\s*([\s\S]*?)```/gi);
  if (fenced && fenced.length) {
    const body = fenced[fenced.length - 1].replace(/```json|```/gi, '').trim();
    try { return JSON.parse(body); } catch { /* fall through */ }
  }
  for (const [open, close] of [['{', '}'], ['[', ']']]) {
    const start = raw.indexOf(open);
    const end = raw.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* try next */ }
    }
  }
  return null;
}

// agent_config row merged over defaults, so a key missing from the stored
// row falls back instead of reading as undefined.
async function getAgentConfig(agentName, defaults = {}) {
  const { data } = await getSupabase()
    .from('agent_config')
    .select('config')
    .eq('agent_name', agentName)
    .maybeSingle();
  return { ...defaults, ...(data?.config || {}) };
}

module.exports = {
  DAY,
  getSupabase,
  getMondayOfCurrentWeek,
  embed,
  embedMany,
  cosineSim,
  parseVector,
  callClaude,
  textOf,
  extractJson,
  getAgentConfig,
};
