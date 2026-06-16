// academy/corpus-ingestion/corpus-agent.js
//
// Nightly autonomous RAG corpus ingestion agent.
//
// Pulls pending sources from corpus_ingestion_queue, fetches + cleans each
// text, and ingests it into rag_corpus by REUSING the existing pipeline
// (chunkText + ingestChunks from ingest-sources.js — chunk at 400 words /
// 50-word overlap, embed via text-embedding-3-small, upsert to rag_corpus).
// Logs each run to corpus_ingestion_runs with a per-author coverage snapshot.
//
// Scope (v1): reliable scheduled ingestion of a human-approved queue + a
// coverage report. No AI gap analysis, source discovery, or quality scoring.
//
// Cost guards:
//   - Batch is hard-capped at CORPUS_AGENT_BATCH_SIZE sources per run (default 3).
//   - Giant-source handling: FULL INGEST + WARNING. If a single work would
//     produce more than CHUNK_WARN_THRESHOLD chunks we log a loud warning (so
//     the embedding cost is visible in the logs) but still ingest it fully.
//     Chosen over splitting for v1 simplicity, per the spec.
//
// Runnable two ways:
//   node corpus-agent.js                         (manual)
//   Railway nightly cron service (see railway.corpus-agent.json)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chunkText, ingestChunks } = require('./ingest-sources');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Default to 3 only when unset/invalid — an explicit 0 must mean 0 (pause),
// so don't use `|| 3` (which treats 0 as falsy).
const _parsedBatch = parseInt(process.env.CORPUS_AGENT_BATCH_SIZE, 10);
const BATCH_SIZE = Number.isFinite(_parsedBatch) && _parsedBatch >= 0 ? _parsedBatch : 3;
const CHUNK_WARN_THRESHOLD = 5000; // ~giant work (e.g. Montaigne's complete Essays)
const FETCH_TIMEOUT_MS = 60000;

// ── Text cleaning helpers ──────────────────────────────────────────────────

// Strip the Project Gutenberg header/footer boilerplate, keeping only the body
// between the *** START OF ... *** and *** END OF ... *** markers.
function stripGutenbergBoilerplate(text) {
  const startRe = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;
  const endRe = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;
  let body = text;
  const startMatch = body.match(startRe);
  if (startMatch) {
    body = body.slice(startMatch.index + startMatch[0].length);
  }
  const endMatch = body.match(endRe);
  if (endMatch) {
    body = body.slice(0, endMatch.index);
  }
  return body.trim();
}

// PerseusDL TEI XML → plaintext. v1 starter list is all English, so this is a
// minimal tag-strip placeholder.
// TODO: proper TEI handling (drop apparatus/notes, keep <l>/<p> text) when the
// queue starts carrying 'grc'/'lat' original-language sources.
function stripXmlTags(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Queue language codes → rag_corpus.language values used by the existing pipeline.
function corpusLanguage(lang) {
  switch ((lang || 'en').toLowerCase()) {
    case 'grc': return 'ancient_greek';
    case 'lat': return 'latin';
    default: return 'english';
  }
}

async function fetchSourceText(url) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch unavailable — Node 18+ required');
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AreteCorpusAgent/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`fetch returned ${res.status}`);
  const body = await res.text();
  if (!body || body.length < 1000) {
    throw new Error(`fetched body too small (${body ? body.length : 0} bytes)`);
  }
  const head = body.slice(0, 500).toLowerCase();
  if (head.includes('<!doctype html') || head.includes('<html')) {
    throw new Error('fetched an HTML page, not the expected text');
  }
  return body;
}

// ── Coverage report ─────────────────────────────────────────────────────────

// Tally chunk counts per author across the whole corpus (paged to get an exact
// count past the 1000-row default cap).
async function buildCoverageReport() {
  const counts = {};
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('rag_corpus')
      .select('author')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`coverage query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const a = row.author || 'Unknown';
      counts[a] = (counts[a] || 0) + 1;
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return counts;
}

// ── Per-source ingestion ──────────────────────────────────────────────────

async function processSource(src) {
  await supabase
    .from('corpus_ingestion_queue')
    .update({ status: 'processing' })
    .eq('id', src.id);

  const raw = await fetchSourceText(src.source_url);

  // Clean based on shape: Gutenberg plaintext vs. PerseusDL XML.
  let cleaned;
  const looksXml = raw.trimStart().startsWith('<');
  if ((src.language === 'grc' || src.language === 'lat') && looksXml) {
    cleaned = stripXmlTags(raw);
  } else {
    cleaned = stripGutenbergBoilerplate(raw);
  }

  const chunks = chunkText(cleaned);
  if (chunks.length === 0) {
    throw new Error('cleaning produced 0 chunks — check source format');
  }
  if (chunks.length > CHUNK_WARN_THRESHOLD) {
    console.warn(
      `  ⚠ COST WARNING: "${src.author} / ${src.work}" produced ${chunks.length} chunks ` +
      `(> ${CHUNK_WARN_THRESHOLD}). Ingesting fully this run — watch the embedding bill.`
    );
  }

  const meta = {
    author: src.author,
    work: src.work,
    section_label: '',
    language: corpusLanguage(src.language),
    program_id: 'stoicism-phd',
    course_relevance: src.course_relevance ?? null,
    difficulty: src.difficulty ?? null,
    text_type: 'primary',
    source_url: src.source_url ?? null,
  };

  const { ingested, errors } = await ingestChunks(chunks, meta);
  if (ingested === 0) {
    throw new Error(`no chunks ingested (${errors} upsert errors)`);
  }

  await supabase
    .from('corpus_ingestion_queue')
    .update({ status: 'done', chunks_ingested: ingested, processed_at: new Date().toISOString() })
    .eq('id', src.id);

  return ingested;
}

// ── Main run ─────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY must be set.');
    process.exit(1);
  }

  const { data: runRow, error: runErr } = await supabase
    .from('corpus_ingestion_runs')
    .insert({ status: 'running' })
    .select()
    .single();
  if (runErr) {
    console.error('Failed to create run row:', runErr.message);
    process.exit(1);
  }

  const { data: pending, error: queueErr } = await supabase
    .from('corpus_ingestion_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (queueErr) {
    console.error('Failed to read queue:', queueErr.message);
    await supabase.from('corpus_ingestion_runs')
      .update({ status: 'failed', run_completed_at: new Date().toISOString() })
      .eq('id', runRow.id);
    process.exit(1);
  }

  const sources = pending || [];
  let succeeded = 0, failed = 0, totalChunks = 0;
  const failures = [];

  for (const src of sources) {
    console.log(`\n--- ${src.author} / ${src.work} ---`);
    try {
      const ingested = await processSource(src);
      succeeded++;
      totalChunks += ingested;
      console.log(`  ✓ ${ingested} chunks ingested`);
    } catch (err) {
      // One failure never aborts the run.
      failed++;
      const msg = err.message || String(err);
      failures.push(`${src.author} / ${src.work} — ${msg}`);
      console.error(`  ✗ ${msg}`);
      await supabase
        .from('corpus_ingestion_queue')
        .update({ status: 'failed', error_message: msg, processed_at: new Date().toISOString() })
        .eq('id', src.id);
    }
  }

  // Coverage snapshot (best-effort — never fail the run over the report).
  let coverage = {};
  try {
    coverage = await buildCoverageReport();
  } catch (err) {
    console.error('Coverage report failed:', err.message);
  }
  const totalCorpusChunks = Object.values(coverage).reduce((s, n) => s + n, 0);
  const authorCount = Object.keys(coverage).length;
  const thinnest = Object.entries(coverage)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([author, n]) => `${author} (${n})`);

  await supabase
    .from('corpus_ingestion_runs')
    .update({
      status: 'completed',
      run_completed_at: new Date().toISOString(),
      sources_processed: sources.length,
      sources_succeeded: succeeded,
      sources_failed: failed,
      total_chunks_added: totalChunks,
      coverage_report: coverage,
    })
    .eq('id', runRow.id);

  // Human-readable summary → stdout → Railway logs → morning report.
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n=== Corpus Agent Run ${today} ===`);
  console.log(`Processed: ${sources.length} | Succeeded: ${succeeded} | Failed: ${failed} | Chunks added: ${totalChunks}`);
  for (const f of failures) console.log(`Failed: ${f}`);
  console.log(`Corpus now: ${totalCorpusChunks.toLocaleString()} chunks across ${authorCount} authors`);
  if (thinnest.length > 0) console.log(`Thinnest coverage: ${thinnest.join(', ')}`);
  console.log('================================');
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
