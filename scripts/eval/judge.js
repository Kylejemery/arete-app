// Blind judging interface for the retrieval eval harness.
//
// Local only Express server on port 3999. Not part of the Next.js app and
// never deployed. Shows one query at a time with its pooled candidates in
// random order, with no indication of which retriever produced a candidate
// or at what rank. Unblinded judging would just ratify the current ranking.
//
// Keys: 0, 1, 2 judge the highlighted candidate and advance. j and k move
// down and up. s skips to the next query. Every judgment is written to
// eval.eval_judgments on keypress, so the session is resumable at any time.
//
// Usage:
//   node scripts/eval/judge.js
//   then open http://localhost:3999

const path = require('path');
const { supabaseClient } = require('./lib');

// Express lives in server/node_modules, not the repo root. Resolve it from
// there so this script needs no install step of its own.
let express;
try {
  express = require('express');
} catch (err) {
  express = require(path.join(__dirname, '..', '..', 'server', 'node_modules', 'express'));
}

const PORT = 3999;
const supabase = supabaseClient();
const evalDb = supabase.schema('eval');
const app = express();
app.use(express.json());

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchAll(table, columns) {
  // PostgREST caps responses at 1000 rows, so page through.
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await evalDb.from(table).select(columns).range(from, from + page - 1);
    if (error) throw new Error(table + ' fetch failed: ' + error.message);
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

// Query list plus judging progress. A query counts as fully judged when every
// pooled candidate has a judgment.
app.get('/api/state', async (req, res) => {
  try {
    const [queries, candidates, judgments] = await Promise.all([
      fetchAll('eval_queries', 'id, query_text, register, doctrine'),
      fetchAll('eval_candidates', 'query_id, chunk_id'),
      fetchAll('eval_judgments', 'query_id, chunk_id'),
    ]);
    const candCount = {};
    for (const c of candidates) candCount[c.query_id] = (candCount[c.query_id] || 0) + 1;
    const judgedCount = {};
    for (const j of judgments) judgedCount[j.query_id] = (judgedCount[j.query_id] || 0) + 1;
    const list = queries.map((q) => ({
      id: q.id,
      query_text: q.query_text,
      candidates: candCount[q.id] || 0,
      judged: judgedCount[q.id] || 0,
      complete: (candCount[q.id] || 0) > 0 && (judgedCount[q.id] || 0) >= (candCount[q.id] || 0),
    }));
    res.json({
      total: list.length,
      completed: list.filter((q) => q.complete).length,
      queries: list,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One query with its candidates, shuffled server side, retriever and rank
// withheld. Existing judgments ride along so a resumed session shows them.
app.get('/api/query/:id', async (req, res) => {
  try {
    const { data: queries, error: qErr } = await evalDb
      .from('eval_queries')
      .select('id, query_text, register, doctrine, notes')
      .eq('id', req.params.id);
    if (qErr) throw new Error(qErr.message);
    if (!queries.length) return res.status(404).json({ error: 'query not found' });
    const query = queries[0];

    const { data: candidates, error: cErr } = await evalDb
      .from('eval_candidates')
      .select('chunk_id')
      .eq('query_id', query.id);
    if (cErr) throw new Error(cErr.message);

    const chunkIds = candidates.map((c) => c.chunk_id);
    const chunks = [];
    for (let i = 0; i < chunkIds.length; i += 100) {
      const { data, error } = await supabase
        .from('rag_corpus')
        .select('id, chunk_text, author, work, section_label, translator, text_type, source_url, language')
        .in('id', chunkIds.slice(i, i + 100));
      if (error) throw new Error(error.message);
      chunks.push(...data);
    }
    const byId = new Map(chunks.map((c) => [c.id, c]));

    const { data: judgments, error: jErr } = await evalDb
      .from('eval_judgments')
      .select('chunk_id, relevance')
      .eq('query_id', query.id);
    if (jErr) throw new Error(jErr.message);
    const judged = new Map(judgments.map((j) => [j.chunk_id, j.relevance]));

    const items = shuffle(chunkIds).map((chunkId) => {
      const chunk = byId.get(chunkId);
      return {
        chunk_id: chunkId,
        chunk_text: chunk ? chunk.chunk_text : '(chunk no longer in rag_corpus)',
        author: chunk ? chunk.author : null,
        work: chunk ? chunk.work : null,
        section_label: chunk ? chunk.section_label : null,
        translator: chunk ? chunk.translator : null,
        text_type: chunk ? chunk.text_type : null,
        source_url: chunk ? chunk.source_url : null,
        relevance: judged.has(chunkId) ? judged.get(chunkId) : null,
      };
    });

    res.json({ query, candidates: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/judge', async (req, res) => {
  try {
    const { query_id, chunk_id, relevance } = req.body || {};
    if (!query_id || !chunk_id || ![0, 1, 2].includes(relevance)) {
      return res.status(400).json({ error: 'need query_id, chunk_id, relevance in {0,1,2}' });
    }
    const { error } = await evalDb
      .from('eval_judgments')
      .upsert(
        { query_id, chunk_id, relevance, judged_at: new Date().toISOString() },
        { onConflict: 'query_id,chunk_id' }
      );
    if (error) throw new Error(error.message);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.type('html').send(PAGE);
});

const PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Arete retrieval judging</title>
<style>
  body { font-family: Georgia, serif; margin: 0; background: #f5f2ea; color: #222; }
  #bar { position: sticky; top: 0; background: #2b2620; color: #f5f2ea; padding: 10px 18px;
         font-family: monospace; font-size: 14px; display: flex; justify-content: space-between; }
  #wrap { max-width: 860px; margin: 0 auto; padding: 18px; }
  #query { font-size: 20px; line-height: 1.4; padding: 14px 16px; background: #fff;
           border-left: 5px solid #8a6d3b; margin-bottom: 6px; }
  #qmeta { font-family: monospace; font-size: 12px; color: #777; margin-bottom: 14px; }
  .cand { background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 12px 14px;
          margin-bottom: 10px; }
  .cand.current { border: 2px solid #8a6d3b; box-shadow: 0 0 0 3px rgba(138,109,59,0.15); }
  .cand .meta { font-family: monospace; font-size: 12px; color: #666; margin-bottom: 6px; }
  .cand .text { white-space: pre-wrap; line-height: 1.45; font-size: 15px; }
  .badge { display: inline-block; font-family: monospace; font-size: 12px; padding: 1px 8px;
           border-radius: 10px; margin-left: 8px; color: #fff; }
  .b2 { background: #2e7d32; } .b1 { background: #b58900; } .b0 { background: #9e3b3b; }
  #help { font-family: monospace; font-size: 12px; color: #666; padding: 8px 0 24px; }
  #done { font-size: 22px; padding: 40px; text-align: center; }
</style>
</head>
<body>
<div id="bar"><span id="progress">loading</span><span>0 1 2 judge / j k move / s skip query</span></div>
<div id="wrap">
  <div id="query"></div>
  <div id="qmeta"></div>
  <div id="cands"></div>
  <div id="help">Relevance: 2 = a counselor could quote or paraphrase this and it directly addresses the query. 1 = related, would enrich an answer, but not the passage you would reach for. 0 = not useful here.</div>
</div>
<script>
let state = null;
let queryIds = [];
let queryIdx = -1;
let current = null;
let candIdx = 0;

async function loadState() {
  state = await (await fetch('/api/state')).json();
  queryIds = state.queries.map(q => q.id);
  document.getElementById('progress').textContent =
    state.completed + ' / ' + state.total + ' queries fully judged';
}

function nextUnfinishedIdx(fromIdx) {
  for (let i = 0; i < queryIds.length; i++) {
    const idx = (fromIdx + 1 + i) % queryIds.length;
    const q = state.queries[idx];
    if (q.candidates > 0 && !q.complete) return idx;
  }
  return -1;
}

async function loadQuery(idx) {
  queryIdx = idx;
  if (idx < 0) {
    document.getElementById('wrap').innerHTML =
      '<div id="done">All pooled candidates are judged. Run score.js.</div>';
    return;
  }
  current = await (await fetch('/api/query/' + queryIds[idx])).json();
  candIdx = current.candidates.findIndex(c => c.relevance === null);
  if (candIdx < 0) candIdx = 0;
  render();
}

function render() {
  const q = current.query;
  document.getElementById('query').textContent = q.query_text;
  document.getElementById('qmeta').textContent =
    'register: ' + q.register + '   doctrine: ' + (q.doctrine || 'none') +
    '   candidates: ' + current.candidates.length;
  const holder = document.getElementById('cands');
  holder.innerHTML = '';
  current.candidates.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'cand' + (i === candIdx ? ' current' : '');
    const cite = [c.author, c.work, c.section_label].filter(Boolean).join(', ');
    const extra = [c.translator ? 'tr. ' + c.translator : null, c.text_type]
      .filter(Boolean).join(' / ');
    const badge = c.relevance === null ? '' :
      '<span class="badge b' + c.relevance + '">' + c.relevance + '</span>';
    div.innerHTML =
      '<div class="meta">' + escapeHtml(cite || 'unknown source') +
      (extra ? ' (' + escapeHtml(extra) + ')' : '') + badge + '</div>' +
      '<div class="text">' + escapeHtml(c.chunk_text) + '</div>';
    holder.appendChild(div);
  });
  const cur = holder.children[candIdx];
  if (cur) cur.scrollIntoView({ block: 'center' });
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function judge(rel) {
  const c = current.candidates[candIdx];
  if (!c) return;
  c.relevance = rel;
  fetch('/api/judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_id: current.query.id, chunk_id: c.chunk_id, relevance: rel }),
  });
  const next = current.candidates.findIndex((x, i) => i > candIdx && x.relevance === null);
  if (next >= 0) {
    candIdx = next;
    render();
  } else if (current.candidates.every(x => x.relevance !== null)) {
    await loadState();
    await loadQuery(nextUnfinishedIdx(queryIdx));
  } else {
    const first = current.candidates.findIndex(x => x.relevance === null);
    candIdx = first >= 0 ? first : candIdx;
    render();
  }
}

document.addEventListener('keydown', async (e) => {
  if (!current) return;
  if (e.key === 'j') { candIdx = Math.min(candIdx + 1, current.candidates.length - 1); render(); }
  else if (e.key === 'k') { candIdx = Math.max(candIdx - 1, 0); render(); }
  else if (e.key === 's') { await loadState(); await loadQuery(nextUnfinishedIdx(queryIdx)); }
  else if (['0', '1', '2'].includes(e.key)) { await judge(parseInt(e.key, 10)); }
});

(async () => {
  await loadState();
  await loadQuery(nextUnfinishedIdx(-1));
})();
</script>
</body>
</html>`;

app.listen(PORT, '127.0.0.1', () => {
  console.log('Judging interface on http://localhost:' + PORT + ' (local only)');
});
