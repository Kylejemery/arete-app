// academy/corpus-ingestion/verify-queue.js
//
// Check a source before (or after) queueing it: fetch the URL through the
// same guards the nightly agent uses (plain text only, no HTML, no PDF),
// strip Gutenberg boilerplate, apply the body markers, and report what the
// agent would ingest. Run it from a machine with open egress; the nightly
// agent's Railway service has it, sandboxes usually do not.
//
// Usage:
//   node verify-queue.js --url URL [--start-marker "..."] [--end-marker "..."] [--strategy headed]
//   node verify-queue.js                 every pending queue row (needs SUPABASE env)
//   node verify-queue.js --id QUEUE_ID   one queue row
//   node verify-queue.js --pending --mark-failed
//                                        rows whose fetch fails are set to
//                                        status failed with the reason
//
// Exit code 1 when any checked source fails a guard, so it can gate a queue.
require('dotenv').config();
const {
  fetchSourceText, stripGutenbergBoilerplate, applyBodyMarkers, chunkText,
} = require('./corpus-agent');
const { chunkRaw, planHeaded, QUEUE_STRATEGIES } = require('./chunker');

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function occurrences(haystack, needle, max = 12) {
  const out = [];
  if (!needle) return out;
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(needle, from);
    if (i === -1 || out.length >= max) break;
    out.push(i);
    from = i + needle.length;
  }
  return out;
}

function snippet(text, at, len = 140) {
  return text.slice(at, at + len).replace(/\s+/g, ' ').trim();
}

// Upper-case lines near the front of a text are the usual translator
// front-matter headings (INTRODUCTION AND ANALYSIS, PERSONS OF THE DIALOGUE),
// listed so a start marker can be chosen without opening the file.
function frontMatterHeadings(body, limit = 25) {
  const head = body.slice(0, Math.max(20000, Math.floor(body.length * 0.15)));
  const seen = new Set();
  const out = [];
  for (const raw of head.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length < 6 || line.length > 80) continue;
    if (line !== line.toUpperCase() || !/[A-Z]{3}/.test(line)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= limit) break;
  }
  return out;
}

// What a chunker strategy would make of the body: for 'headed', the books
// found with their section counts and first headings (a contents list or a
// preface that leaked shows up here as a wrong book count or a section 0
// titled by front matter); for every strategy, the row count and how many
// rows carry a locator, with the first and last rows' labels.
function reportStrategy(body, strategy, author, work) {
  if (!strategy || strategy === 'paragraph') return;
  if (!QUEUE_STRATEGIES.includes(strategy)) {
    console.log(`  ✗ unknown chunk_strategy ${JSON.stringify(strategy)} (one of ${QUEUE_STRATEGIES.join(', ')})`);
    return;
  }
  if (strategy === 'headed') {
    const plan = planHeaded(body);
    if (!plan) { console.log('  ✗ headed: no BOOK heading found; the agent would fall back to paragraph windows'); return; }
    console.log(`  headed: ${plan.books.length} book(s)`);
    for (const b of plan.books) {
      console.log(`    book ${b.number}: ${b.sections} section(s), ${b.paragraphs} paragraphs, ${b.words.toLocaleString()} words`);
      for (const h of b.firstSections) console.log(`      ${h}`);
    }
  }
  const rows = chunkRaw(body, strategy, { author: author || 'x', work: work || 'y' });
  const withLocator = rows.filter(r => r.locator).length;
  console.log(`  strategy ${strategy}: ${rows.length} rows, ${withLocator} with a locator`);
  if (rows.length) {
    const f = rows[0]; const l = rows[rows.length - 1];
    console.log(`    first: ${f.locator ?? '—'} · ${f.section_label} · ${f.word_count} words`);
    console.log(`    last:  ${l.locator ?? '—'} · ${l.section_label} · ${l.word_count} words`);
  }
  if (withLocator === 0) console.log('  ⚠ no row carries a locator; check the headings or use --start-marker');
}

async function checkSource({ url, author, work, language, body_start_marker, body_end_marker, chunk_strategy }) {
  const label = author && work ? `${author} / ${work}` : url;
  console.log(`\n--- ${label} ---\n  ${url}`);
  const raw = await fetchSourceText(url);
  console.log(`  fetched ${raw.length.toLocaleString()} bytes`);

  const looksXml = raw.trimStart().startsWith('<');
  if ((language === 'grc' || language === 'lat') && looksXml) {
    console.log('  XML source (grc/lat): markers are applied after tag stripping');
  }
  const hasStart = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.test(raw);
  const hasEnd = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.test(raw);
  console.log(`  Gutenberg markers: start ${hasStart ? 'found' : 'absent'}, end ${hasEnd ? 'found' : 'absent'}`);
  const stripped = stripGutenbergBoilerplate(raw);

  const headings = frontMatterHeadings(stripped);
  if (headings.length) {
    console.log('  front-matter headings (candidates for --start-marker):');
    for (const h of headings) console.log(`    ${h}`);
  }

  for (const [name, marker] of [['start', body_start_marker], ['end', body_end_marker]]) {
    if (!marker) continue;
    const hits = occurrences(stripped, marker);
    console.log(`  ${name} marker ${JSON.stringify(marker)}: ${hits.length} occurrence(s)`);
    for (const at of hits) console.log(`    @${at}: ${snippet(stripped, at)}`);
  }

  const { text: body, notes } = applyBodyMarkers(stripped, { body_start_marker, body_end_marker });
  for (const n of notes) console.log(`  ⚠ ${n}`);
  const words = body.split(/\s+/).filter(Boolean).length;
  const chunks = chunkText(body).length;
  console.log(`  body after markers: ${words.toLocaleString()} words → ${chunks} chunks (400 / 50 overlap)`);
  console.log(`  body opens: ${snippet(body, 0, 300)}`);
  console.log(`  body closes: ${snippet(body, Math.max(0, body.length - 300), 300)}`);
  reportStrategy(body, chunk_strategy, author, work);
  return { words, chunks, notes };
}

async function main() {
  const url = getArg('--url');
  if (url) {
    await checkSource({
      url,
      language: getArg('--language') ?? 'en',
      body_start_marker: getArg('--start-marker') ?? null,
      body_end_marker: getArg('--end-marker') ?? null,
      chunk_strategy: getArg('--strategy') ?? null,
    });
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Pass --url URL, or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to check queue rows.');
    process.exit(1);
  }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const id = getArg('--id');
  let q = supabase.from('corpus_ingestion_queue').select('*');
  q = id ? q.eq('id', id) : q.eq('status', 'pending').order('priority', { ascending: true });
  const { data: rows, error } = await q;
  if (error) throw new Error(`queue read failed: ${error.message}`);
  if (!rows || rows.length === 0) {
    console.log('Nothing to check.');
    return;
  }

  let failures = 0;
  for (const row of rows) {
    if (!row.source_url) {
      console.log(`\n--- ${row.author} / ${row.work} ---\n  ✗ no source_url`);
      failures++;
      continue;
    }
    try {
      await checkSource({ url: row.source_url, ...row });
    } catch (err) {
      failures++;
      console.log(`  ✗ ${err.message}`);
      if (process.argv.includes('--mark-failed')) {
        await supabase.from('corpus_ingestion_queue')
          .update({ status: 'failed', error_message: `verify-queue: ${err.message}`, processed_at: new Date().toISOString() })
          .eq('id', row.id);
        console.log('  row marked failed');
      }
    }
  }
  if (failures > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
