// academy/corpus-ingestion/ingest-concordance.js
//
// Syncs editorial concordances (concordance/*.md) into rag_corpus.
//
// One numbered "## N. Term" entry becomes exactly one chunk, embedded whole
// with text-embedding-3-small (the corpus model; see embedder.js). Entries
// never pass through the filename parser (which produced the Arnold / Roman
// and Stock / Guide defects) or the 400-word / 50-overlap chunker (which
// would split an entry mid-list and break the lexical bridge that is the
// entire point). See concordance/README.md for the file format.
//
// Idempotent and cheap to re-run: an entry is re-embedded only when its text
// changed or its row has no embedding; entries removed from the file are
// deprecated, never deleted; a re-added entry is un-deprecated.
//
// Usage:
//   node ingest-concordance.js                  sync every concordance/*.md
//   node ingest-concordance.js --file NAME.md   sync one file
//   node ingest-concordance.js --dry-run        parse and print, touch nothing
//   node ingest-concordance.js --probes         run each file's probe queries
//   node ingest-concordance.js --verify "query" top five for one query, agent
//                                               view and counselor view
//
// corpus-agent.js calls syncConcordances() at the start of each nightly run.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const CONCORDANCE_DIR = path.join(__dirname, 'concordance');
const PROGRAM_ID = 'stoicism-phd';
const DEFAULT_AUTHOR = 'Arete Concordance';
const TEXT_TYPE = 'concordance';
const LANGUAGE = 'english';
const DEFAULT_DIFFICULTY = 'Advanced';
const ENTRY_WARN_WORDS = 600;
const PROBE_K = 5;

// ── Parsing ────────────────────────────────────────────────────────────────

function parseFrontMatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: md };
  const meta = { probes: [] };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === 'probe') meta.probes.push(value);
    else meta[key] = value;
  }
  return { meta, body: md.slice(m[0].length) };
}

// Markdown emphasis and rules carry nothing for retrieval and clutter what an
// agent is shown. Links keep their text.
function stripMarkdown(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Parse one concordance markdown document.
 * Returns { meta, work, author, difficulty, probes, title, entries, notes, warnings }.
 * entries: [{ number, title, section_label, text, word_count }]
 */
function parseConcordance(md, filename = 'concordance.md') {
  const { meta, body } = parseFrontMatter(md);
  const warnings = [];

  const h1 = body.match(/^#\s+(.+?)\s*$/m);
  const title = h1 ? h1[1].trim() : path.basename(filename, '.md');
  const work = (meta.work || '').trim() || title;
  if (!meta.work) warnings.push(`${filename}: no "work:" in front matter; using the H1 title "${title}"`);

  const sections = body.split(/^(?=## )/m).slice(1);
  const entries = [];
  const notes = [];
  const seen = new Set();

  for (const section of sections) {
    const nl = section.indexOf('\n');
    const heading = (nl === -1 ? section : section.slice(0, nl)).replace(/^##\s*/, '').trim();
    const rawBody = nl === -1 ? '' : section.slice(nl + 1);
    const numbered = heading.match(/^(\d+)\.\s+(.+)$/);
    if (!numbered) {
      notes.push(heading);
      continue;
    }
    const number = parseInt(numbered[1], 10);
    const entryTitle = stripMarkdown(numbered[2]).trim();
    if (seen.has(number)) {
      warnings.push(`${filename}: entry number ${number} appears twice ("${entryTitle}"); the second is skipped`);
      continue;
    }
    seen.add(number);
    const cleaned = stripMarkdown(rawBody);
    if (!cleaned) {
      warnings.push(`${filename}: entry ${number} "${entryTitle}" has no body; skipped`);
      continue;
    }
    const text = `${entryTitle}\n\n${cleaned}`;
    const wc = wordCount(text);
    if (wc > ENTRY_WARN_WORDS) {
      warnings.push(`${filename}: entry ${number} "${entryTitle}" is ${wc} words; split it, a concordance entry should stay under about 400`);
    }
    entries.push({ number, title: entryTitle, section_label: entryTitle, text, word_count: wc });
  }

  entries.sort((a, b) => a.number - b.number);
  return {
    meta,
    title,
    work,
    author: (meta.author || '').trim() || DEFAULT_AUTHOR,
    difficulty: (meta.difficulty || '').trim() || DEFAULT_DIFFICULTY,
    probes: meta.probes || [],
    entries,
    notes,
    warnings,
  };
}

function listConcordanceFiles(dir = CONCORDANCE_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort()
    .map(f => path.join(dir, f));
}

// ── Clients (lazy, so --dry-run needs no keys) ─────────────────────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getEmbed() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY must be set.');
  // embedder.js pins text-embedding-3-small; a mismatched model produces
  // chunks that never retrieve, so the model is never chosen here.
  const { embedChunks } = require('./embedder');
  return async text => (await embedChunks([{ text }]))[0].embedding;
}

// ── Sync ───────────────────────────────────────────────────────────────────

async function syncConcordanceFile(file, { supabase, embed, log = console.log } = {}) {
  const parsed = parseConcordance(fs.readFileSync(file, 'utf8'), path.basename(file));
  for (const w of parsed.warnings) log(`  ⚠ ${w}`);
  const { author, work, difficulty, entries } = parsed;
  const result = { file: path.basename(file), author, work, entries: entries.length,
                   embedded: 0, relabelled: 0, unchanged: 0, deprecated: 0, restored: 0, errors: 0 };
  if (entries.length === 0) {
    log(`  ${result.file}: no numbered entries, nothing to sync`);
    return result;
  }

  const { data: existingRows, error: exErr } = await supabase
    .from('rag_corpus')
    .select('id, chunk_index, section_label, chunk_text, deprecated')
    .eq('author', author).eq('work', work).eq('program_id', PROGRAM_ID);
  if (exErr) throw new Error(`reading existing concordance rows: ${exErr.message}`);
  const { data: unembedded, error: unErr } = await supabase
    .from('rag_corpus')
    .select('id')
    .eq('author', author).eq('work', work).eq('program_id', PROGRAM_ID)
    .is('embedding', null);
  if (unErr) throw new Error(`reading unembedded concordance rows: ${unErr.message}`);
  const noEmbedding = new Set((unembedded || []).map(r => r.id));
  const byIndex = new Map((existingRows || []).map(r => [r.chunk_index, r]));

  for (const entry of entries) {
    const existing = byIndex.get(entry.number);
    const needsEmbed = !existing || existing.chunk_text !== entry.text || noEmbedding.has(existing.id);
    try {
      if (needsEmbed) {
        const embedding = await embed(entry.text);
        const { error } = await supabase.from('rag_corpus').upsert({
          program_id: PROGRAM_ID,
          author,
          work,
          section_label: entry.section_label,
          chunk_index: entry.number,
          chunk_text: entry.text,
          word_count: entry.word_count,
          translator: null,
          source_url: null,
          text_type: TEXT_TYPE,
          language: LANGUAGE,
          difficulty,
          deprecated: false,
          embedding,
        }, { onConflict: 'author,work,program_id,chunk_index' });
        if (error) throw new Error(error.message);
        result.embedded++;
        log(`  ✓ [${entry.number}] ${entry.title} (${entry.word_count} words) embedded`);
      } else if (existing.deprecated || existing.section_label !== entry.section_label) {
        const { error } = await supabase.from('rag_corpus')
          .update({ deprecated: false, section_label: entry.section_label, difficulty })
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
        if (existing.deprecated) result.restored++; else result.relabelled++;
        log(`  ✓ [${entry.number}] ${entry.title} ${existing.deprecated ? 'restored' : 'relabelled'}`);
      } else {
        result.unchanged++;
      }
    } catch (err) {
      result.errors++;
      log(`  ✗ [${entry.number}] ${entry.title}: ${err.message}`);
    }
  }

  const live = new Set(entries.map(e => e.number));
  for (const row of existingRows || []) {
    if (live.has(row.chunk_index) || row.deprecated) continue;
    const { error } = await supabase.from('rag_corpus').update({ deprecated: true }).eq('id', row.id);
    if (error) { result.errors++; log(`  ✗ deprecating stale entry ${row.chunk_index}: ${error.message}`); }
    else { result.deprecated++; log(`  − [${row.chunk_index}] ${row.section_label || ''} no longer in file; deprecated`); }
  }

  log(`  ${result.file}: ${result.entries} entries — ${result.embedded} embedded, ${result.relabelled} relabelled, ` +
      `${result.restored} restored, ${result.unchanged} unchanged, ${result.deprecated} deprecated, ${result.errors} errors`);
  return result;
}

/**
 * Sync every concordance file (or one, via opts.file). Clients are created
 * lazily from env unless injected. Throws only on setup failure; per-entry
 * failures are counted and logged.
 */
async function syncConcordances(opts = {}) {
  const log = opts.log || console.log;
  const files = opts.file ? [path.isAbsolute(opts.file) ? opts.file : path.join(opts.dir || CONCORDANCE_DIR, opts.file)]
                          : listConcordanceFiles(opts.dir || CONCORDANCE_DIR);
  if (files.length === 0) {
    log('No concordance files found.');
    return [];
  }
  const supabase = opts.supabase || getSupabase();
  const embed = opts.embed || getEmbed();
  const results = [];
  for (const file of files) {
    log(`\n--- concordance: ${path.basename(file)} ---`);
    results.push(await syncConcordanceFile(file, { supabase, embed, log }));
  }
  return results;
}

// ── Retrieval probes ───────────────────────────────────────────────────────

function formatHit(r, i) {
  const where = [r.work, r.section_label].filter(Boolean).join(', ');
  return `  ${i + 1}. ${r.author} — ${where} (${r.text_type}, similarity ${Number(r.similarity).toFixed(3)})`;
}

/**
 * Embed a query and print the top five from match_rag_corpus twice: the
 * agent view (everything) and the counselor view (concordance excluded).
 * Returns { agent, counselor, bridged } where bridged is true when the agent
 * view holds both a concordance entry and a non-concordance passage.
 */
async function verifyQuery(query, { supabase, embed, log = console.log } = {}) {
  supabase = supabase || getSupabase();
  embed = embed || getEmbed();
  const embedding = await embed(query);
  const call = exclude => supabase.rpc('match_rag_corpus', {
    query_embedding: embedding,
    match_count: PROBE_K,
    filter_author: null,
    filter_language: LANGUAGE,
    exclude_text_types: exclude,
  });
  const [agentRes, counselorRes] = await Promise.all([call([]), call([TEXT_TYPE])]);
  if (agentRes.error) throw new Error(`match_rag_corpus: ${agentRes.error.message}`);
  if (counselorRes.error) throw new Error(`match_rag_corpus (counselor view): ${counselorRes.error.message}`);
  const agent = agentRes.data || [];
  const counselor = counselorRes.data || [];
  const hasConcordance = agent.some(r => r.text_type === TEXT_TYPE);
  const hasPassage = agent.some(r => r.text_type !== TEXT_TYPE);
  const leaked = counselor.some(r => r.text_type === TEXT_TYPE);

  log(`\nProbe: "${query}"`);
  log('  Agent view (match_rag_corpus, no exclusions):');
  agent.forEach((r, i) => log(formatHit(r, i)));
  log('  Counselor view (exclude_text_types = [concordance]):');
  counselor.forEach((r, i) => log(formatHit(r, i)));
  if (hasConcordance && hasPassage) log('  ✓ bridge holds: a concordance entry and an ancient passage both in the top five');
  else if (hasConcordance) log('  ✗ concordance entries return but the ancient passages do not; the bridge is not yet reaching the sources');
  else if (hasPassage) log('  ✗ no concordance entry in the top five; the entries are not embedded or not matching this query');
  else log('  ✗ nothing returned');
  if (leaked) log('  ✗ FENCE FAILURE: a concordance row reached the counselor view');
  return { agent, counselor, bridged: hasConcordance && hasPassage, leaked };
}

async function runProbes(opts = {}) {
  const log = opts.log || console.log;
  const files = opts.file ? [path.join(opts.dir || CONCORDANCE_DIR, opts.file)] : listConcordanceFiles(opts.dir || CONCORDANCE_DIR);
  const supabase = opts.supabase || getSupabase();
  const embed = opts.embed || getEmbed();
  const out = [];
  for (const file of files) {
    const parsed = parseConcordance(fs.readFileSync(file, 'utf8'), path.basename(file));
    for (const q of parsed.probes) {
      try {
        out.push({ file: path.basename(file), query: q, ...(await verifyQuery(q, { supabase, embed, log })) });
      } catch (err) {
        log(`  ✗ probe "${q}" failed: ${err.message}`);
        out.push({ file: path.basename(file), query: q, error: err.message });
      }
    }
  }
  return out;
}

// ── CLI ────────────────────────────────────────────────────────────────────

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const file = getArg('--file');
  const dir = getArg('--dir');

  if (args.includes('--dry-run')) {
    const files = file ? [path.join(dir || CONCORDANCE_DIR, file)] : listConcordanceFiles(dir || CONCORDANCE_DIR);
    for (const f of files) {
      const parsed = parseConcordance(fs.readFileSync(f, 'utf8'), path.basename(f));
      console.log(`\n${path.basename(f)} → ${parsed.author} / ${parsed.work} (${parsed.difficulty})`);
      for (const e of parsed.entries) console.log(`  [${e.number}] ${e.section_label} — ${e.word_count} words`);
      for (const n of parsed.notes) console.log(`  (note, not ingested) ${n}`);
      for (const p of parsed.probes) console.log(`  probe: ${p}`);
      for (const w of parsed.warnings) console.log(`  ⚠ ${w}`);
      if (args.includes('--json')) console.log(JSON.stringify(parsed.entries, null, 2));
    }
    return;
  }
  if (args.includes('--verify')) {
    const q = getArg('--verify');
    if (!q) throw new Error('--verify needs a query string');
    await verifyQuery(q);
    return;
  }
  if (args.includes('--probes')) {
    await runProbes({ file, dir });
    return;
  }
  await syncConcordances({ file, dir });
  if (!args.includes('--no-probes')) await runProbes({ file, dir });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
  });
}

module.exports = {
  CONCORDANCE_DIR, TEXT_TYPE, DEFAULT_AUTHOR,
  parseConcordance, listConcordanceFiles, syncConcordances, verifyQuery, runProbes,
};
