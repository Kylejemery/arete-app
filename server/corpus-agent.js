// server/corpus-agent.js
//
// On-demand RAG corpus ingestion — the server-side twin of the nightly cron
// agent at academy/corpus-ingestion/corpus-agent.js. That service runs on its
// own Railway root, so the always-on server can't require it; this port exists
// so the admin "Run ingestion now" button can drain the queue immediately
// instead of waiting for the 08:00 UTC cron. KEEP THE TWO IN SYNC — same
// cleaning guards, same chunking (400 words / 50 overlap), same upsert key,
// same corpus_ingestion_runs bookkeeping, so a manual run is indistinguishable
// from a nightly one in the panel.
//
// Also runnable standalone (`node corpus-agent.js`), so the Railway cron
// service can later be re-pointed at this file to eliminate the duplication.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.
// Optional: CORPUS_AGENT_BATCH_SIZE (default 3; explicit 0 pauses ingestion).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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
const CHUNK_SIZE = 400;
const OVERLAP = 50;

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

// PerseusDL TEI XML → plaintext (minimal tag-strip, matches the cron twin).
function stripXmlTags(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Cut a translator's front matter (and any trailing apparatus) using the
// queue row's body markers: the body starts at the LAST occurrence of
// body_start_marker (a contents list often repeats the heading that opens the
// body) and ends at the first occurrence of body_end_marker after that. A
// marker that is not found never fails the source; the whole text is ingested
// and the note is written to the queue row. KEEP IN SYNC with the cron twin.
function applyBodyMarkers(text, { body_start_marker, body_end_marker } = {}) {
  const notes = [];
  let body = text;
  if (body_start_marker) {
    const at = body.lastIndexOf(body_start_marker);
    if (at === -1) {
      notes.push(`body_start_marker ${JSON.stringify(body_start_marker)} not found; ingested the whole text (translator front matter included)`);
    } else {
      body = body.slice(at);
    }
  }
  if (body_end_marker) {
    const at = body.indexOf(body_end_marker, body_start_marker ? body_start_marker.length : 0);
    if (at === -1) {
      notes.push(`body_end_marker ${JSON.stringify(body_end_marker)} not found; ingested to the end of the text`);
    } else {
      body = body.slice(0, at);
    }
  }
  return { text: body.trim(), notes };
}

// Queue language codes → rag_corpus.language values used by the pipeline.
function corpusLanguage(lang) {
  switch ((lang || 'en').toLowerCase()) {
    case 'grc': return 'ancient_greek';
    case 'lat': return 'latin';
    default: return 'english';
  }
}

async function fetchSourceText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AreteCorpusAgent/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`fetch returned ${res.status}`);

  // An honest text/html content-type is an immediate reject. (Some archives
  // mislabel HTML as text/plain, so the body sniff below is the real guard.)
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(`source is HTML (content-type: ${contentType}), not plain text`);
  }

  const body = await res.text();
  if (!body || body.length < 1000) {
    throw new Error(`fetched body too small (${body ? body.length : 0} bytes)`);
  }

  // Reject binary blobs (e.g. a PDF URL) before they get chunked into gibberish.
  if (/^\s*%PDF-/.test(body) || body.slice(0, 4096).includes(String.fromCharCode(0))) {
    throw new Error('source looks binary (e.g. a PDF) — supply the plain-text version');
  }

  // Reject HTML/markup even when it doesn't open with <!doctype>/<html>. We
  // still allow PerseusDL TEI XML (grc/lat), which opens with <?xml or <TEI.
  const head = body.slice(0, 1500).toLowerCase();
  const looksXml = /^\s*<\?xml|^\s*<tei\b/.test(head);
  const HTML_MARKERS = [
    '<!doctype html', '<html', '<head>', '<head ', '<body', '<base ', '<base>',
    '<table', '<div', '<span', '<font', '<script', '<style', '<meta ', '<link ',
    '<td>', '<td ', '<tr>', '<tr ', '<a href',
  ];
  if (!looksXml && HTML_MARKERS.some(m => head.includes(m))) {
    throw new Error('fetched an HTML/markup page, not the expected plain text');
  }
  return body;
}

// ── Chunk + embed + upsert (mirrors ingest-sources.js) ─────────────────────

function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim().length > 0) chunks.push(chunk);
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

async function embedChunk(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`embedding failed (${res.status})`);
  return (await res.json()).data[0].embedding;
}

async function ingestChunks(chunks, meta) {
  let ingested = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await embedChunk(chunks[i]);
      const { error } = await supabase.from('rag_corpus').upsert({
        chunk_text: chunks[i],
        author: meta.author,
        work: meta.work,
        section_label: meta.section_label,
        language: meta.language,
        program_id: meta.program_id,
        course_relevance: meta.course_relevance,
        difficulty: meta.difficulty,
        text_type: meta.text_type,
        translator: meta.translator ?? null,
        source_url: meta.source_url ?? null,
        chunk_index: i,
        word_count: chunks[i].split(/\s+/).filter(Boolean).length,
        embedding,
      }, {
        onConflict: 'author,work,program_id,chunk_index',
      });
      if (error) {
        console.error(`  [${i}] ERROR:`, error.message);
        errors++;
      } else {
        ingested++;
      }
    } catch (err) {
      console.error(`  [${i}] ERROR:`, err.message);
      errors++;
    }
  }

  return { ingested, errors };
}

// ── Coverage report ─────────────────────────────────────────────────────────

// Tally chunk counts per author across the whole corpus (paged past the
// 1000-row default cap).
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

  let cleaned;
  const looksXml = raw.trimStart().startsWith('<');
  if ((src.language === 'grc' || src.language === 'lat') && looksXml) {
    cleaned = stripXmlTags(raw);
  } else {
    cleaned = stripGutenbergBoilerplate(raw);
  }

  const marked = applyBodyMarkers(cleaned, src);
  cleaned = marked.text;
  for (const note of marked.notes) console.warn(`[corpus-agent]   ⚠ ${note}`);
  if (marked.notes.length > 0) {
    const stamp = `[corpus-agent ${new Date().toISOString().slice(0, 10)}] ${marked.notes.join('; ')}`;
    await supabase
      .from('corpus_ingestion_queue')
      .update({ notes: src.notes ? `${src.notes}\n${stamp}` : stamp })
      .eq('id', src.id);
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
    text_type: src.text_type || 'primary',
    translator: src.translator ?? null,
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

// Drains up to BATCH_SIZE pending queue sources and logs the run to
// corpus_ingestion_runs — identical bookkeeping to the nightly cron, so the
// admin panel renders manual and scheduled runs the same way. Throws on setup
// failure; per-source failures are recorded and never abort the run.
async function runCorpusIngestion() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY must be set');
  }

  const { data: runRow, error: runErr } = await supabase
    .from('corpus_ingestion_runs')
    .insert({ status: 'running' })
    .select()
    .single();
  if (runErr) throw new Error(`Failed to create run row: ${runErr.message}`);

  const { data: pending, error: queueErr } = await supabase
    .from('corpus_ingestion_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (queueErr) {
    await supabase.from('corpus_ingestion_runs')
      .update({ status: 'failed', run_completed_at: new Date().toISOString() })
      .eq('id', runRow.id);
    throw new Error(`Failed to read queue: ${queueErr.message}`);
  }

  const sources = pending || [];
  let succeeded = 0, failed = 0, totalChunks = 0;
  const failures = [];

  for (const src of sources) {
    console.log(`[corpus-agent] --- ${src.author} / ${src.work} ---`);
    try {
      const ingested = await processSource(src);
      succeeded++;
      totalChunks += ingested;
      console.log(`[corpus-agent]   ✓ ${ingested} chunks ingested`);
    } catch (err) {
      // One failure never aborts the run.
      failed++;
      const msg = err.message || String(err);
      failures.push(`${src.author} / ${src.work} — ${msg}`);
      console.error(`[corpus-agent]   ✗ ${msg}`);
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
    console.error('[corpus-agent] coverage report failed:', err.message);
  }

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

  console.log(
    `[corpus-agent] run complete — processed ${sources.length} | ` +
    `succeeded ${succeeded} | failed ${failed} | chunks added ${totalChunks}`
  );
  return { processed: sources.length, succeeded, failed, totalChunks, failures };
}

// Concordance sync (academy/corpus-ingestion/ingest-concordance.js) runs only
// on the nightly cron twin: the concordance files live in that service's root
// and are not deployed with the API server.
module.exports = { runCorpusIngestion, chunkText, fetchSourceText, applyBodyMarkers };

if (require.main === module) {
  runCorpusIngestion().catch(err => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
  });
}
