#!/usr/bin/env node
// Verifies the single-key corpus MCP server (routes/mcp.js) end to end.
//
//   ARETE_MCP_KEY=... node scripts/verify-mcp.js [base_url]
//
// base_url defaults to https://arete-app-production.up.railway.app. Runs the
// checks listed in server/MCP.md: auth, initialize, tools/list, the three
// tools, the /health comparison, and the rate limit (which spends the
// minute's 60 calls, so run it last and not twice in a row).
const BASE = (process.argv[2] || 'https://arete-app-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.ARETE_MCP_KEY;
if (!KEY) {
  console.error('Set ARETE_MCP_KEY first.');
  process.exit(2);
}

let id = 0;
async function rpc(method, params, { key = KEY, query = '' } = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${BASE}/mcp${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}
const call = (name, args) => rpc('tools/call', { name, arguments: args });
const INIT = { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify-mcp', version: '1' } };

let failed = 0;
function check(label, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`);
}

(async () => {
  const noKey = await rpc('initialize', INIT, { key: null });
  check('1. no key returns 401', noKey.status === 401, `status ${noKey.status} ${JSON.stringify(noKey.body)}`);

  const init = await rpc('initialize', INIT);
  const info = init.body?.result?.serverInfo;
  check('2. initialize names arete-corpus', info?.name === 'arete-corpus', `status ${init.status} serverInfo ${JSON.stringify(info)}`);

  const viaQuery = await rpc('initialize', INIT, { key: null, query: `?key=${encodeURIComponent(KEY)}` });
  check('2b. ?key= query string also authenticates', viaQuery.body?.result?.serverInfo?.name === 'arete-corpus', `status ${viaQuery.status}`);

  const list = await rpc('tools/list', {});
  const tools = list.body?.result?.tools || [];
  const annotated = tools.every((t) => t.annotations?.readOnlyHint === true && t.annotations?.destructiveHint === false && t.annotations?.openWorldHint === false);
  check('3. tools/list returns three annotated tools', tools.length === 3 && annotated,
    tools.map((t) => `${t.name} ${JSON.stringify(t.annotations)}`).join('\n      '));

  const search = await call('search_corpus', { query: 'anger and how to master it', author: 'Seneca', top_k: 3 });
  const results = search.body?.result?.structuredContent?.results || [];
  check('4. search_corpus returns three Seneca passages', results.length === 3 && results.every((r) => r.author === 'Seneca'),
    results.map((r) => `${r.author} | ${r.work} | ${r.section_label} | sim ${r.similarity.toFixed(2)} | ${r.id}`).join('\n      '));

  if (results[0]) {
    const passage = await call('get_passage', { id: results[0].id, context: 1 });
    const ps = passage.body?.result?.structuredContent?.passages || [];
    const ordered = ps.every((p, i) => i === 0 || p.chunk_index > ps[i - 1].chunk_index);
    check('5. get_passage context 1 returns three chunks in order', ps.length === 3 && ordered,
      ps.map((p) => `${p.requested ? '>>' : '  '} chunk_index ${p.chunk_index} ${p.id}`).join('\n      '));
  }

  const sources = await call('list_sources', {});
  const sc = sources.body?.result?.structuredContent;
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
  check('6. list_sources returns the source table', Array.isArray(sc?.sources) && sc.sources.length > 0,
    `${sc?.sources?.length} sources, ${sc?.total} passages; /health total_chunks ${health?.total_chunks} (counts deprecated rows, so it differs)`);

  // 7. Rate limit: 60 tool calls per minute. Earlier checks spent some.
  let firstLimited = null;
  for (let n = 1; n <= 61; n++) {
    const r = await call('list_sources', {});
    if (r.status !== 200) { firstLimited = { n, status: r.status }; break; }
    if (r.body?.result?.isError) { firstLimited = { n, text: r.body.result.content?.[0]?.text }; break; }
  }
  check('7. rate limit returns a tool-level error, not a 500', !!firstLimited && !firstLimited.status,
    JSON.stringify(firstLimited));

  const get = await fetch(`${BASE}/mcp`, { headers: { Authorization: `Bearer ${KEY}` } });
  check('405 for GET /mcp', get.status === 405, `status ${get.status}`);

  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
