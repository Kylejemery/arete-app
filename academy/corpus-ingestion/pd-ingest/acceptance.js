#!/usr/bin/env node
// pd-ingest/acceptance.js — the spec's two retrieval tests, run through the
// same path the corpus MCP server uses (match_rag_corpus, English, top 5),
// with quotable_on_air and the spoken citation read as the MCP prints them.
//
//   node pd-ingest/acceptance.js
//
// 1. "short cut to virtue" returns Diogenes Laertius 7.121 with a correct
//    spoken citation.
// 2. "whether the listener has been improved" returns Plutarch, On Listening
//    to Lectures.

const OpenAI = require('openai');
const { db, must } = require('./db');
const { spokenCitation } = require('../../../server/lib/spoken-citation');

const TESTS = [
  {
    query: 'short cut to virtue',
    pass: (r) => r.author === 'Diogenes Laërtius' && covers(r.locator, 7, 121),
    want: 'Diogenes Laërtius, a chunk whose locator covers 7.121',
  },
  {
    query: 'whether the listener has been improved',
    pass: (r) => r.author === 'Plutarch' && r.work === 'On Listening to Lectures',
    want: 'Plutarch, On Listening to Lectures',
  },
];

function covers(locator, book, section) {
  const [a, b] = String(locator).split('–').map((x) => x.split('.').map(Number));
  const lo = a; const hi = b || a;
  return lo[0] === book && hi[0] === book && lo[1] <= section && section <= hi[1];
}

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let failed = 0;
  for (const t of TESTS) {
    const emb = (await openai.embeddings.create({ model: 'text-embedding-3-small', input: t.query })).data[0].embedding;
    const hits = await must(db().rpc('match_rag_corpus', { query_embedding: emb, match_count: 5, filter_language: 'english' }), 'match_rag_corpus');
    const prov = await must(db().from('rag_corpus').select('id, locator, quotable_on_air').in('id', hits.map((h) => h.id)), 'provenance');
    const byId = new Map(prov.map((p) => [p.id, p]));
    const rows = hits.map((h) => ({ ...h, ...byId.get(h.id) }));
    const hit = rows.find(t.pass);
    console.log(`\n"${t.query}"`);
    rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.author}, ${r.work}, ${r.locator || r.section_label || '—'} (sim ${r.similarity.toFixed(3)}, quotable_on_air ${r.quotable_on_air})`));
    if (hit) {
      console.log(`  PASS: ${spokenCitation(hit)} — quotable_on_air ${hit.quotable_on_air}`);
    } else {
      failed += 1;
      console.log(`  FAIL: wanted ${t.want} in the top 5`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main().catch((err) => { console.error(err.message); process.exit(1); });

module.exports = { covers };
