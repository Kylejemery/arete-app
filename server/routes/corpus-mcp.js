// ---------------------------------------------------------------------------
// Read-only MCP server over rag_corpus — POST /mcp/corpus
//
// Serves the Moltbook agent (moltbook-agent/) and any future external agent
// that should ground its reasoning in the corpus without holding database
// credentials. Speaks the MCP Streamable HTTP transport in its stateless
// form: every request is a single JSON-RPC message answered with a single
// JSON response; no sessions, no SSE, no state.
//
// Security model: bearer token (ARETE_MCP_TOKEN) checked on every call, and
// the two tools are read-only retrieval over match_rag_corpus — the same RPC
// the Cabinet and Oracle already use. The endpoint is disabled (503) until
// ARETE_MCP_TOKEN is set. Queries arrive from a model reading a public
// forum, so treat them as untrusted input: they are only ever embedded and
// matched, never interpolated into SQL.
// ---------------------------------------------------------------------------
const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const PROTOCOL_FALLBACK = '2025-03-26';
const SERVER_INFO = { name: 'arete-corpus', version: '1.0.0' };

const TOOLS = [
  {
    name: 'search_corpus',
    description:
      'Semantic search over the Arete corpus: Stoic primary texts (Epictetus, Marcus Aurelius, Seneca, Musonius Rufus and others) plus related sources. Returns the most relevant passages with author, work, and section for citation. Query with a philosophical idea or question, not keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The idea, question, or claim to find passages about.' },
        author: { type: 'string', description: 'Optional exact author filter (as returned by list_authors).' },
        k: { type: 'integer', description: 'Number of passages to return (1-8, default 5).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_authors',
    description: 'List the authors present in the Arete corpus with their chunk counts.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function authorized(req) {
  const token = process.env.ARETE_MCP_TOKEN;
  if (!token) return false;
  const header = req.headers.authorization || '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function embedQuery(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`embedding request failed (${res.status})`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function searchCorpus({ query, author, k }) {
  if (!query || typeof query !== 'string') throw new Error('query (string) is required');
  const count = Math.min(Math.max(Number.isInteger(k) ? k : 5, 1), 8);
  const embedding = await embedQuery(query.slice(0, 2000));
  const { data, error } = await db().rpc('match_rag_corpus', {
    query_embedding: embedding,
    match_count: count,
    filter_author: typeof author === 'string' && author.trim() ? author.trim() : null,
    filter_language: 'english',
  });
  if (error) throw new Error(`retrieval failed: ${error.message}`);
  if (!data || !data.length) return 'No relevant passages found in the corpus for this query.';
  return data
    .map((row, i) => {
      const where = [row.work, row.section_label].filter(Boolean).join(', ');
      return `[${i + 1}] ${row.author}${where ? ` — ${where}` : ''} (similarity ${row.similarity.toFixed(2)})\n${row.chunk_text}`;
    })
    .join('\n\n');
}

async function listAuthors() {
  const { data, error } = await db()
    .from('rag_corpus')
    .select('author')
    .not('embedding', 'is', null)
    .limit(10000);
  if (error) throw new Error(`author listing failed: ${error.message}`);
  const counts = new Map();
  for (const row of data || []) {
    if (row.author) counts.set(row.author, (counts.get(row.author) || 0) + 1);
  }
  return (
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `${name} (${n} passages)`)
      .join('\n') || 'The corpus is empty.'
  );
}

async function handleMessage(msg) {
  const { id, method, params } = msg || {};
  // Notifications (no id) get no JSON-RPC response.
  if (id === undefined || id === null) return null;

  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: params?.protocolVersion || PROTOCOL_FALLBACK,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments || {};
      try {
        let text;
        if (name === 'search_corpus') text = await searchCorpus(args);
        else if (name === 'list_authors') text = await listAuthors();
        else return fail(-32602, `Unknown tool: ${name}`);
        return reply({ content: [{ type: 'text', text }] });
      } catch (err) {
        // Tool-level failures are results, not protocol errors, per MCP spec.
        return reply({ content: [{ type: 'text', text: `Tool error: ${err.message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

router.post('/mcp/corpus', async (req, res) => {
  if (!process.env.ARETE_MCP_TOKEN) {
    return res.status(503).json({ error: 'corpus MCP endpoint is not configured' });
  }
  if (!authorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const body = req.body;
    if (Array.isArray(body)) {
      const replies = (await Promise.all(body.map(handleMessage))).filter(Boolean);
      return replies.length ? res.json(replies) : res.status(202).end();
    }
    const reply = await handleMessage(body);
    return reply ? res.json(reply) : res.status(202).end();
  } catch (err) {
    console.error('[corpus-mcp] error:', err.message);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      error: { code: -32603, message: 'internal error' },
    });
  }
});

// The streamable HTTP transport allows servers that don't offer a standalone
// SSE stream to refuse GET with 405.
router.get('/mcp/corpus', (_req, res) => res.status(405).end());

module.exports = { router };
