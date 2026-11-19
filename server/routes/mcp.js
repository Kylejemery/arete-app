// ---------------------------------------------------------------------------
// Arete corpus MCP server (v1, single key): POST /mcp
//
// Lets any MCP client (a Claude.ai custom connector, Claude Code, ChatGPT
// developer mode) search rag_corpus. Read-only: every tool is a SELECT or the
// match_rag_corpus RPC. One shared secret, ARETE_MCP_KEY, sent either as
// "Authorization: Bearer <key>" or as "?key=<key>" on the URL, because the
// Claude.ai connector dialog accepts only a URL.
//
// This is separate from routes/corpus-mcp.js (POST /mcp/corpus, ARETE_MCP_TOKEN),
// which the Moltbook agent depends on and which is left unchanged. The two
// share the embedding call and the Supabase client.
//
// Transport: Streamable HTTP, stateless, JSON responses. A fresh McpServer and
// transport per request, closed in a finally.
//
// Layers: search_corpus follows the corpus fence (lib/corpus-fence.js). With
// no text_type it leaves out synthesis (Arete's own AI-assisted writing, which
// is teaching material and never evidence) and counterposition_summary (works
// the corpus holds as opponents). A caller gets either by naming it as the
// text_type. Deprecated rows are never returned: match_rag_corpus filters
// them, and every direct read below filters them too.
// ---------------------------------------------------------------------------
const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { embedQuery, db } = require('./corpus-mcp');

const router = express.Router();

const SERVER_INFO = { name: 'arete-corpus', version: '1.0.0' };
const INSTRUCTIONS =
  'The Arete corpus holds primary Stoic texts (Epictetus, Marcus Aurelius, Seneca, Musonius Rufus and others) ' +
  'in public-domain translations, with related ancient sources, scholarship, and Arete synthesis notes. ' +
  'Start with search_corpus. Use get_passage to read the passages around a result, and list_sources to see what the corpus covers.';

// Every text_type the rag_corpus_text_type_check constraint allows.
const TEXT_TYPES = [
  'primary', 'scholarship', 'paper_summary', 'synthesis', 'concordance',
  'modern_primary', 'modern_summary', 'counterposition_summary',
];
// Opt-in layers: left out of a search unless named as its text_type.
const OPT_IN_TEXT_TYPES = ['synthesis', 'counterposition_summary'];

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
if (!process.env.ARETE_MCP_KEY) {
  console.warn('[mcp] ARETE_MCP_KEY is not set: POST /mcp refuses every request with 503.');
}
function configuredKey() {
  return process.env.ARETE_MCP_KEY || null;
}

function presentedKey(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  const q = req.query && req.query.key;
  return typeof q === 'string' ? q : '';
}

// Hash both sides first so the comparison is constant-time whatever the length.
function keyMatches(presented, expected) {
  const a = crypto.createHash('sha256').update(String(presented)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Rate limit: 60 tool calls per rolling minute per key, in memory. A guard
// against a runaway agent loop, not a security boundary.
// ---------------------------------------------------------------------------
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;
const callLog = new Map(); // key hash -> timestamps

function takeToken(keyHash) {
  const now = Date.now();
  const recent = (callLog.get(keyHash) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    callLog.set(keyHash, recent);
    return false;
  }
  recent.push(now);
  callLog.set(keyHash, recent);
  return true;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const EXTRA_COLUMNS = 'id, chunk_index, language, paired_chunk_id, translator, edition_year, locator, verification_status';
const PASSAGE_COLUMNS =
  'id, author, work, section_label, language, chunk_index, chunk_text, text_type, paired_chunk_id, translator, edition_year, locator, verification_status';

// An error whose message is safe and useful to show the client as is.
class UserFacingError extends Error {}

function clean(s) {
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

async function searchCorpus({ query, author, work, language, text_type, top_k }) {
  const k = Math.min(Math.max(Number.isInteger(top_k) ? top_k : 5, 1), 10);
  const workFilter = clean(work);
  const exclude = text_type
    ? TEXT_TYPES.filter((t) => t !== text_type)
    : OPT_IN_TEXT_TYPES;

  const embedding = await embedQuery(query.slice(0, 1000));
  const params = {
    query_embedding: embedding,
    // text_type is excluded inside the query, so only the work filter can
    // thin the results; ask for more when it is present.
    match_count: workFilter ? k * 3 : k,
    filter_author: clean(author),
    // match_rag_corpus matches language by equality, so null would match
    // nothing; English is the default every other caller uses.
    filter_language: clean(language) || 'english',
    exclude_text_types: exclude,
  };
  let { data, error } = await db().rpc('match_rag_corpus', params);
  // A search restricted to a small layer (paper_summary, synthesis,
  // counterposition_summary) with no author makes the HNSW scan walk far for
  // matching rows, and on a cold cache that can pass the 8s statement
  // timeout. The second attempt runs on a warm cache and has answered in
  // under a second in testing. Same embedding, so no second OpenAI call.
  if (error && error.code === '57014') {
    console.warn('[mcp] match_rag_corpus timed out; retrying once');
    ({ data, error } = await db().rpc('match_rag_corpus', params));
    if (error && error.code === '57014') {
      throw new UserFacingError('The corpus search timed out. Try again, or add an author filter to narrow it.');
    }
  }
  if (error) throw new Error(`match_rag_corpus: ${error.message}`);

  let rows = data || [];
  if (workFilter) rows = rows.filter((r) => r.work === workFilter);
  if (text_type) rows = rows.filter((r) => r.text_type === text_type);
  rows = rows.slice(0, k);
  if (!rows.length) return [];

  // match_rag_corpus returns a fixed column set (no chunk_index or
  // paired_chunk_id), so the rest is read by id rather than by widening the RPC.
  const { data: extra, error: extraErr } = await db()
    .from('rag_corpus')
    .select(EXTRA_COLUMNS)
    .in('id', rows.map((r) => r.id))
    .not('deprecated', 'is', true);
  if (extraErr) throw new Error(`rag_corpus extra columns: ${extraErr.message}`);
  const byId = new Map((extra || []).map((r) => [r.id, r]));

  return rows
    .filter((r) => byId.has(r.id)) // drops anything deprecated since the match
    .map((r) => {
      const x = byId.get(r.id);
      return {
        id: r.id,
        author: r.author,
        work: r.work,
        section_label: r.section_label,
        locator: x.locator || null,
        language: x.language || r.language,
        chunk_index: x.chunk_index,
        text_type: r.text_type,
        translator: x.translator || null,
        edition_year: x.edition_year || null,
        verification_status: x.verification_status || null,
        paired_chunk_id: x.paired_chunk_id || null,
        similarity: Number(r.similarity),
        chunk_text: r.chunk_text,
      };
    });
}

async function getPassage({ id, context }) {
  const span = Math.min(Math.max(Number.isInteger(context) ? context : 0, 0), 3);
  const { data: row, error } = await db()
    .from('rag_corpus')
    .select(PASSAGE_COLUMNS)
    .eq('id', id)
    .not('deprecated', 'is', true)
    .maybeSingle();
  if (error) throw new Error(`rag_corpus get: ${error.message}`);
  if (!row) return null;

  let passages = [row];
  if (span > 0 && Number.isInteger(row.chunk_index)) {
    const { data: around, error: aroundErr } = await db()
      .from('rag_corpus')
      .select(PASSAGE_COLUMNS)
      .eq('author', row.author)
      .eq('work', row.work)
      .eq('language', row.language)
      .gte('chunk_index', row.chunk_index - span)
      .lte('chunk_index', row.chunk_index + span)
      .not('deprecated', 'is', true)
      .order('chunk_index', { ascending: true });
    if (aroundErr) throw new Error(`rag_corpus neighbors: ${aroundErr.message}`);
    if (around && around.length) passages = around;
  }

  let paired = null;
  if (row.paired_chunk_id) {
    const { data: p, error: pErr } = await db()
      .from('rag_corpus')
      .select('id, language')
      .eq('id', row.paired_chunk_id)
      .not('deprecated', 'is', true)
      .maybeSingle();
    if (pErr) console.error('[mcp] paired chunk lookup failed:', pErr.message);
    if (p) paired = { id: p.id, language: p.language };
  }

  return {
    requested_id: row.id,
    paired,
    passages: passages.map((p) => ({ ...p, requested: p.id === row.id })),
  };
}

// Grouped counts, read in pages because PostgREST caps a single response.
// The corpus changes nightly at most, so the result is cached for ten minutes.
const SOURCES_TTL_MS = 10 * 60 * 1000;
let sourcesCache = { at: 0, rows: null };

async function allSources() {
  if (sourcesCache.rows && Date.now() - sourcesCache.at < SOURCES_TTL_MS) return sourcesCache.rows;
  const PAGE = 1000;
  const counts = new Map();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from('rag_corpus')
      .select('author, work, language, text_type')
      .not('deprecated', 'is', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`rag_corpus sources: ${error.message}`);
    for (const r of data || []) {
      const key = JSON.stringify([r.author, r.work, r.language, r.text_type]);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    if (!data || data.length < PAGE) break;
  }
  const rows = [...counts.entries()]
    .map(([key, count]) => {
      const [author, work, language, text_type] = JSON.parse(key);
      return { author, work, language, text_type, count };
    })
    .sort((a, b) =>
      String(a.author).localeCompare(String(b.author)) ||
      String(a.work).localeCompare(String(b.work)) ||
      String(a.language).localeCompare(String(b.language)) ||
      String(a.text_type).localeCompare(String(b.text_type)));
  sourcesCache = { at: Date.now(), rows };
  return rows;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function header(r) {
  const where = [r.work, r.locator || r.section_label].filter(Boolean).join(', ');
  const tr = r.translator && r.translator !== 'original'
    ? ` (tr. ${r.translator}${r.edition_year ? `, ${r.edition_year}` : ''})`
    : '';
  return `${r.author}${where ? `, ${where}` : ''}${tr} [${r.language}, ${r.text_type}]`;
}

function layerNote(r) {
  if (r.text_type === 'synthesis') {
    const vs = (r.verification_status || []).join(', ') || 'not recorded';
    return `Note: Arete synthesis (AI-assisted teaching material, not evidence of what an ancient author said); verification_status: ${vs}\n`;
  }
  if (r.text_type === 'counterposition_summary') {
    return 'Note: counterposition (a position the corpus holds in order to examine and argue against, never advice)\n';
  }
  return '';
}

function renderSearch(results) {
  return results
    .map((r, i) => {
      const pair = r.paired_chunk_id ? `; paired chunk ${r.paired_chunk_id}` : '';
      return `${i + 1}. ${header(r)}\n` +
        `similarity ${r.similarity.toFixed(2)}; id ${r.id}; chunk_index ${r.chunk_index}${pair}\n` +
        layerNote(r) +
        r.chunk_text;
    })
    .join('\n\n');
}

function renderPassage(out) {
  const blocks = out.passages.map((p) => {
    const mark = p.requested ? '>>> REQUESTED PASSAGE' : 'context';
    return `[${mark}] ${header(p)}\nid ${p.id}; chunk_index ${p.chunk_index}\n${layerNote(p)}${p.chunk_text}`;
  });
  const pair = out.paired
    ? `\n\nPaired chunk: id ${out.paired.id} (${out.paired.language}). Call get_passage with that id to read it.`
    : '';
  return blocks.join('\n\n') + pair;
}

function renderSources(rows) {
  const total = rows.reduce((n, r) => n + r.count, 0);
  const lines = rows.map((r) => `${r.author} | ${r.work} | ${r.language} | ${r.text_type} | ${r.count}`);
  return `author | work | language | text_type | passages\n${lines.join('\n')}\n\n${rows.length} sources, ${total} passages (deprecated rows excluded).`;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
function toolError(message) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

// Wraps a handler with the rate limit and the catch-all error policy: the
// client sees a plain message, the full error goes to the server log.
function guarded(name, ctx, fn) {
  return async (args) => {
    if (!takeToken(ctx.keyHash)) {
      return toolError(`Rate limit reached: at most ${RATE_LIMIT} tool calls per minute. Wait a minute and try again.`);
    }
    try {
      return await fn(args);
    } catch (err) {
      console.error(`[mcp] ${name} failed:`, err);
      if (err instanceof UserFacingError) return toolError(err.message);
      return toolError(`${name} failed because of a server error. Try again shortly.`);
    }
  };
}

function buildServer(ctx) {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });

  server.registerTool(
    'search_corpus',
    {
      title: 'Search the Arete corpus',
      description:
        'Finds the passages in the Arete corpus most relevant to an idea or question, by meaning rather than keywords. ' +
        'The corpus holds Stoic primary texts in translation (Epictetus, Marcus Aurelius, Seneca, Musonius Rufus and others), ' +
        'related ancient sources, published scholarship, and summaries. Phrase the query as a philosophical idea or question. ' +
        'Each result gives the author, work, section, language, similarity score, passage id, and full text. ' +
        'Pass a result id to get_passage to read the surrounding text. ' +
        'By default results exclude Arete synthesis notes and counterposition summaries; ask for either by setting text_type.',
      inputSchema: {
        query: z.string().min(1).max(1000).describe('The idea, question, or claim to find passages about.'),
        author: z.string().optional().describe('Exact author name as shown by list_sources, for example "Seneca" or "Epictetus".'),
        work: z.string().optional().describe('Exact work title as shown by list_sources.'),
        language: z.string().optional().describe('Language of the text: "english" (the default), "ancient_greek", or "french". One language is searched per call.'),
        text_type: z.enum(TEXT_TYPES).optional().describe(
          'Restrict to one layer. primary: the ancient texts themselves. scholarship: public-domain secondary scholarship. ' +
          'paper_summary: summaries of modern scholarship. synthesis: Arete synthesis notes (teaching material, not evidence). ' +
          'concordance: editorial notes on technical vocabulary. counterposition_summary: summaries of works the corpus argues against. ' +
          'modern_primary and modern_summary: modern philosophy of mind (currently empty).'),
        top_k: z.number().int().min(1).max(10).optional().describe('Number of passages to return, 1 to 10. Default 5.'),
      },
      annotations: { title: 'Search the Arete corpus', ...READ_ONLY },
    },
    guarded('search_corpus', ctx, async (args) => {
      const results = await searchCorpus(args);
      ctx.log('search_corpus', { query: args.query, author: args.author, top_k: args.top_k ?? 5, ids: results.map((r) => r.id) });
      if (!results.length) {
        return {
          content: [{ type: 'text', text: 'No passages matched this search and its filters. Call list_sources to see which authors, works, and languages the corpus covers.' }],
          structuredContent: { results: [] },
        };
      }
      return { content: [{ type: 'text', text: renderSearch(results) }], structuredContent: { results } };
    }),
  );

  server.registerTool(
    'get_passage',
    {
      title: 'Read a corpus passage',
      description:
        'Returns one passage from the Arete corpus by its id, optionally with the neighboring passages on each side from the same work, in reading order. ' +
        'Use it after search_corpus to read a result in context. ' +
        'If the passage has a counterpart in another language (for example the Greek or Latin of an English passage), the output names that counterpart\'s id.',
      inputSchema: {
        id: z.string().uuid().describe('The passage id, as returned by search_corpus.'),
        context: z.number().int().min(0).max(3).optional().describe('Neighboring passages to include on each side, 0 to 3. Default 0.'),
      },
      annotations: { title: 'Read a corpus passage', ...READ_ONLY },
    },
    guarded('get_passage', ctx, async (args) => {
      const out = await getPassage(args);
      ctx.log('get_passage', { query: null, author: null, top_k: null, ids: out ? out.passages.map((p) => p.id) : [] });
      if (!out) return toolError(`No passage with id ${args.id} is in the corpus.`);
      return { content: [{ type: 'text', text: renderPassage(out) }], structuredContent: out };
    }),
  );

  server.registerTool(
    'list_sources',
    {
      title: 'List corpus sources',
      description:
        'Lists what the Arete corpus contains: each author and work, with its language, layer (text_type), and number of passages. ' +
        'Use it to find the exact author and work names that search_corpus filters on, or to check whether a text is covered.',
      inputSchema: {
        author: z.string().optional().describe('Only list works by this exact author.'),
      },
      annotations: { title: 'List corpus sources', ...READ_ONLY },
    },
    guarded('list_sources', ctx, async (args) => {
      const all = await allSources();
      const name = clean(args.author);
      const rows = name ? all.filter((r) => r.author === name) : all;
      if (!rows.length) {
        return toolError(`No author named "${name}" is in the corpus. Call list_sources with no author to see every name.`);
      }
      const total = rows.reduce((n, r) => n + r.count, 0);
      return { content: [{ type: 'text', text: renderSources(rows) }], structuredContent: { sources: rows, total } };
    }),
  );

  return server;
}

// ---------------------------------------------------------------------------
// Query log hook. A no-op until the mcp_query_log table exists (Task 4).
// ---------------------------------------------------------------------------
function queryLogger(_req) {
  return () => {};
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
router.post('/mcp', async (req, res) => {
  const expected = configuredKey();
  if (!expected) return res.status(503).json({ error: 'mcp endpoint is not configured' });
  const presented = presentedKey(req);
  if (!presented || !keyMatches(presented, expected)) return res.status(401).json({ error: 'unauthorized' });

  // Every response is plain JSON, so a client that accepts only JSON (or sends
  // no Accept header) is served the same as one that also accepts SSE.
  req.headers.accept = 'application/json, text/event-stream';

  const ctx = {
    keyHash: crypto.createHash('sha256').update(presented).digest('hex'),
    log: queryLogger(req),
  };
  let server;
  let transport;
  try {
    server = buildServer(ctx);
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[mcp] request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', id: req.body?.id ?? null, error: { code: -32603, message: 'internal error' } });
    }
  } finally {
    // Close after the response has been written, never before.
    const close = () => {
      if (transport) transport.close().catch(() => {});
      if (server) server.close().catch(() => {});
    };
    if (res.writableFinished) close();
    else res.on('close', close);
  }
});

const notAllowed = (_req, res) =>
  res.status(405).json({ error: 'method not allowed: this MCP server is stateless and accepts POST only' });
router.get('/mcp', notAllowed);
router.delete('/mcp', notAllowed);

module.exports = { router, _test: { keyMatches, takeToken, renderSearch, renderSources, TEXT_TYPES, OPT_IN_TEXT_TYPES } };
