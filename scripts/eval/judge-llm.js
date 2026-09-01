// LLM judge for the retrieval eval harness.
//
// Judges every unjudged (query, candidate) pair with Claude, using the same
// rubric and the same blinding as the human judging UI (judge.js): candidates
// are shuffled and carry no retriever or rank information, so the judge cannot
// ratify the current ranking. Existing judgments (including human ones from
// judge.js, judge = NULL) are never overwritten — the script only fills gaps,
// so it is resumable and a human can pre-judge or spot-check any subset.
//
// Rows written here carry judge = JUDGE_MODEL so human and LLM judgments stay
// distinguishable (validate the LLM by hand-judging a sample and comparing).
//
// Usage:
//   node scripts/eval/judge-llm.js            # judge everything unjudged
//   node scripts/eval/judge-llm.js --limit 5  # first 5 queries only (smoke)

const { supabaseClient } = require('./lib');

const JUDGE_MODEL = 'claude-sonnet-4-6';
const BATCH_SIZE = 12;      // candidates per API call
const CONCURRENCY = 3;      // queries in flight at once

const supabase = supabaseClient();
const evalDb = supabase.schema('eval');

// Claude keys are scattered across repo env files and some are stale; gather
// every candidate and preflight until one authenticates.
const fs = require('fs');
const path = require('path');
function keyFromFile(file, name) {
  try {
    const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(name + '='));
    return line ? line.slice(name.length + 1).replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}
const KEY_CANDIDATES = [
  process.env.CLAUDE_API_KEY,
  keyFromFile(path.resolve(__dirname, '..', '..', 'academy', 'web', '.env.local'), 'ANTHROPIC_API_KEY'),
  process.env.ANTHROPIC_API_KEY,
  process.env.EXPO_PUBLIC_CLAUDE_API_KEY,
].filter(Boolean);
let API_KEY = null;
async function resolveApiKey() {
  for (const key of KEY_CANDIDATES) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: JUDGE_MODEL, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    });
    if (res.ok) { API_KEY = key; return; }
  }
  console.error('No working Claude API key found across repo env files.');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are judging retrieval quality for Arete, an app where philosophical counselors (Marcus Aurelius, Epictetus, Seneca, and others) answer users' real-life questions by drawing on a corpus of primary texts.

For each passage, judge how useful it would be to a counselor answering the given query:

2 = a counselor could quote or paraphrase this passage and it directly addresses the query
1 = related — it would enrich an answer, but it is not the passage you would reach for
0 = not useful for this query

Judge each passage independently on its own text. Do not reward mere topical word overlap; the standard is whether the passage actually serves an answer to this query.

Respond with ONLY a JSON array, one object per passage, in the same order presented: [{"n": <passage number>, "r": <0|1|2>}, ...]. No other text.`;

async function fetchAll(table, columns) {
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function callClaude(messages, attempt = 0) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  if (res.status === 429 || res.status === 529) {
    if (attempt >= 5) throw new Error('rate limited after 5 retries');
    const wait = Math.min(30000, 2000 * 2 ** attempt);
    await new Promise((r) => setTimeout(r, wait));
    return callClaude(messages, attempt + 1);
  }
  const data = await res.json();
  if (!res.ok) throw new Error('Claude API error: ' + JSON.stringify(data.error || data));
  return data.content?.[0]?.text || '';
}

function parseJudgments(text, expected) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('no JSON array in response');
  const arr = JSON.parse(match[0]);
  if (!Array.isArray(arr)) throw new Error('response is not an array');
  const out = new Map();
  for (const item of arr) {
    const n = Number(item.n);
    const r = Number(item.r);
    if (Number.isInteger(n) && [0, 1, 2].includes(r)) out.set(n, r);
  }
  if (out.size !== expected) {
    throw new Error(`expected ${expected} judgments, parsed ${out.size}`);
  }
  return out;
}

async function judgeQuery(query, chunkIds, chunkById) {
  const pending = shuffle(chunkIds);
  let written = 0;

  // Chunks that vanished from rag_corpus can never be retrieved or quoted:
  // judge them 0 mechanically so the query can reach completion.
  const missing = pending.filter((id) => !chunkById.has(id));
  const present = pending.filter((id) => chunkById.has(id));
  if (missing.length) {
    const rows = missing.map((chunk_id) => ({
      query_id: query.id,
      chunk_id,
      relevance: 0,
      judge: 'missing-chunk',
      judged_at: new Date().toISOString(),
    }));
    const { error } = await evalDb.from('eval_judgments').upsert(rows, { onConflict: 'query_id,chunk_id' });
    if (error) throw new Error('upsert failed: ' + error.message);
    written += rows.length;
  }

  for (let i = 0; i < present.length; i += BATCH_SIZE) {
    const batch = present.slice(i, i + BATCH_SIZE);
    const passages = batch
      .map((id, idx) => {
        const c = chunkById.get(id);
        const cite = [c.author, c.work, c.section_label].filter(Boolean).join(', ');
        // Cap very long chunks; judging does not need more than this.
        const text = (c.chunk_text || '').slice(0, 2400);
        return `--- Passage ${idx + 1} (${cite || 'unknown source'}) ---\n${text}`;
      })
      .join('\n\n');
    const user = `Query (register: ${query.register || 'n/a'}${query.doctrine ? ', doctrine: ' + query.doctrine : ''}):\n"${query.query_text}"\n\nJudge these ${batch.length} passages:\n\n${passages}`;

    let judged;
    try {
      judged = parseJudgments(await callClaude([{ role: 'user', content: user }]), batch.length);
    } catch (err) {
      // One retry with the error surfaced; a second failure skips the batch
      // (resumable — rerun picks it up).
      try {
        judged = parseJudgments(
          await callClaude([{ role: 'user', content: user + '\n\nYour previous reply failed to parse (' + err.message + '). Reply with ONLY the JSON array.' }]),
          batch.length
        );
      } catch (err2) {
        console.error(`  batch failed twice (${err2.message}) — skipping ${batch.length} pairs`);
        continue;
      }
    }

    const rows = batch.map((chunk_id, idx) => ({
      query_id: query.id,
      chunk_id,
      relevance: judged.get(idx + 1),
      judge: JUDGE_MODEL,
      judged_at: new Date().toISOString(),
    }));
    const { error } = await evalDb.from('eval_judgments').upsert(rows, { onConflict: 'query_id,chunk_id' });
    if (error) throw new Error('upsert failed: ' + error.message);
    written += rows.length;
  }
  return written;
}

(async () => {
  await resolveApiKey();
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

  const [queries, candidates, judgments] = await Promise.all([
    fetchAll('eval_queries', 'id, query_text, register, doctrine'),
    fetchAll('eval_candidates', 'query_id, chunk_id'),
    fetchAll('eval_judgments', 'query_id, chunk_id'),
  ]);

  const judged = new Set(judgments.map((j) => j.query_id + '|' + j.chunk_id));
  const byQuery = new Map();
  for (const c of candidates) {
    if (judged.has(c.query_id + '|' + c.chunk_id)) continue;
    if (!byQuery.has(c.query_id)) byQuery.set(c.query_id, []);
    byQuery.get(c.query_id).push(c.chunk_id);
  }

  const work = queries.filter((q) => (byQuery.get(q.id) || []).length > 0).slice(0, limit);
  const totalPairs = work.reduce((s, q) => s + byQuery.get(q.id).length, 0);
  console.log(`${work.length} queries, ${totalPairs} unjudged pairs, judge = ${JUDGE_MODEL}`);

  // Fetch every needed chunk once, in pages of 100.
  const neededIds = [...new Set(work.flatMap((q) => byQuery.get(q.id)))];
  const chunkById = new Map();
  for (let i = 0; i < neededIds.length; i += 100) {
    const { data, error } = await supabase
      .from('rag_corpus')
      .select('id, chunk_text, author, work, section_label')
      .in('id', neededIds.slice(i, i + 100));
    if (error) throw new Error('chunk fetch failed: ' + error.message);
    for (const c of data) chunkById.set(c.id, c);
  }
  console.log(`${chunkById.size} of ${neededIds.length} chunks present in rag_corpus`);

  let done = 0;
  let pairsDone = 0;
  const queue = [...work];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const query = queue.shift();
      if (!query) return;
      const n = await judgeQuery(query, byQuery.get(query.id), chunkById);
      done += 1;
      pairsDone += n;
      console.log(`[${done}/${work.length}] "${query.query_text.slice(0, 60)}" — ${n} pairs (${pairsDone}/${totalPairs} total)`);
    }
  });
  await Promise.all(workers);
  console.log(`Done: ${pairsDone} judgments written. Run node scripts/eval/score.js for the baseline.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
