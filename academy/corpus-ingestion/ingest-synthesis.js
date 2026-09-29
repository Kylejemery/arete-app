// academy/corpus-ingestion/ingest-synthesis.js
//
// Loads AI-assisted synthesis documents (synthesis/*.vN.md) into rag_corpus as
// the synthesis layer: text_type = 'synthesis', source_type = 'synthesis',
// author 'Arete (AI-assisted)'. See synthesis/README.md for the file format
// and the layer rules.
//
// A synthesis document is teaching material, never evidence. Three things
// keep it that way, and all three are set here, at the write path:
//
//   1. text_type = 'synthesis'. The research fence (server/lib/corpus-fence.js)
//      excludes it in the query, and the corpus MCP server returns it only to
//      a caller that asks for the synthesis layer.
//   2. The label is part of chunk_text. Every chunk opens with a header naming
//      the layer, the document, the section, and the section's
//      verification_status, so any surface that shows a model the chunk shows
//      it the label too. The embedding is computed from the section alone, so
//      the shared header does not pull every synthesis chunk toward the others.
//   3. Versions are rows, not edits. Each vN file is its own
//      corpus_synthesis_documents row; activate_synthesis_version() marks the
//      newest one active and deprecates the chunks of every other version in
//      one transaction. Nothing is deleted.
//
// Chunking: one chunk per heading (##, ###, ####), with the heading path
// ("Courage > Modern examples to strive for") in section_label. A section
// over MAX_WORDS is split at paragraph or table-row boundaries into parts that
// keep the same heading. chunk_index = version * 1000 + n, so two versions of
// a document never collide on the (author, work, program_id, chunk_index) key
// and each live version is a contiguous run.
//
// Usage:
//   node ingest-synthesis.js                  sync every synthesis/*.md, activate
//                                             the newest version of each document,
//                                             embed live chunks that lack an embedding
//   node ingest-synthesis.js --file NAME.md   sync one file
//   node ingest-synthesis.js --dry-run        parse and print chunks, touch nothing
//   node ingest-synthesis.js --emit-sql       print the same writes as SQL (no
//                                             embeddings); used to generate the
//                                             data migrations that first loaded them.
//                                             --part i/n splits one document's load
//   node ingest-synthesis.js --verify "text"  research vs teaching retrieval for a query
//
// corpus-agent.js calls syncSynthesis() each night after the concordance sync.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SYNTHESIS_DIR = path.join(__dirname, 'synthesis');
const PROGRAM_ID = 'stoicism-phd';
const AUTHOR = 'Arete (AI-assisted)';
const TEXT_TYPE = 'synthesis';
const SOURCE_TYPE = 'synthesis';
const LANGUAGE = 'english';
const DIFFICULTY = 'Intermediate';
const MAX_WORDS = 450;
const INDEX_STRIDE = 1000;
const REPO_BLOB = 'https://github.com/Kylejemery/arete-app/blob/main/academy/corpus-ingestion/synthesis/';

const STATUSES = Object.freeze({
  corpus_verified: 'written from and checked against passages in the Arete corpus.',
  via_summary: 'checked against the corpus, but the corpus source is itself a summary of a book or paper, not the text.',
  unverified: 'written from general knowledge and not checked against a corpus text.',
  interpretive: 'application or guidance, not a report of what the sources say.',
});
// Statuses whose content must never be presented as what an ancient author said.
const NOT_ATTRIBUTABLE = new Set(['unverified', 'interpretive']);

// ── Parsing ────────────────────────────────────────────────────────────────

// A deliberately small front-matter reader: `key: value` scalars and `key:`
// followed by `  - item` lists. No YAML dependency, and nothing it cannot say.
function parseFrontMatter(md, filename) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`${filename}: no front matter`);
  const meta = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*?)\s*$/);
    if (item && listKey) { meta[listKey].push(item[1]); continue; }
    const kv = line.match(/^([A-Za-z_]\w*)\s*:\s*(.*?)\s*$/);
    if (!kv) throw new Error(`${filename}: cannot read front matter line "${line}"`);
    const [, key, value] = kv;
    if (value === '') { meta[key] = []; listKey = key; }
    else { meta[key] = value; listKey = null; }
  }
  return { meta, body: md.slice(m[0].length) };
}

function parseStatusList(s, where) {
  const list = s.split(',').map(x => x.trim()).filter(Boolean);
  if (!list.length) throw new Error(`${where}: empty verification status`);
  for (const v of list) {
    if (!STATUSES[v]) throw new Error(`${where}: unknown verification status "${v}" (allowed: ${Object.keys(STATUSES).join(', ')})`);
  }
  return list;
}

function scalar(meta, key) {
  const v = meta[key];
  if (Array.isArray(v)) return v.length ? v : null;
  return v === undefined || v === '' ? null : v;
}

// Emphasis carries nothing for retrieval; tables and list markers stay.
function stripEmphasis(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[\s(|"“])_([^_\n]+?)_(?=[\s).,;:!?|"”]|$)/gm, '$1$2')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wordCount(s) {
  return s.split(/\s+/).filter(w => /\w/.test(w)).length;
}

// Split a section body into parts of at most MAX_WORDS, at block boundaries.
// A table longer than the limit is split by rows with its header repeated.
function splitBody(body) {
  const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const units = [];
  for (const b of blocks) {
    const lines = b.split('\n');
    const isTable = lines.length > 2 && lines[0].startsWith('|') && /^\|[-| :]+\|$/.test(lines[1]);
    if (isTable && wordCount(b) > MAX_WORDS) {
      const head = lines.slice(0, 2);
      let rows = [];
      for (const row of lines.slice(2)) {
        if (rows.length && wordCount([...head, ...rows, row].join('\n')) > MAX_WORDS) {
          units.push([...head, ...rows].join('\n'));
          rows = [];
        }
        rows.push(row);
      }
      if (rows.length) units.push([...head, ...rows].join('\n'));
    } else {
      units.push(b);
    }
  }
  const parts = [];
  let cur = [];
  for (const u of units) {
    if (cur.length && wordCount([...cur, u].join('\n\n')) > MAX_WORDS) {
      parts.push(cur.join('\n\n'));
      cur = [];
    }
    cur.push(u);
  }
  if (cur.length) parts.push(cur.join('\n\n'));
  return parts;
}

function header({ title, version, sectionPath, statuses }) {
  const lines = [
    '[ARETE SYNTHESIS: an AI-assisted summary written for teaching. Not a primary text and not published scholarship.]',
    `Document: ${title} (version ${version}). Section: ${sectionPath}.`,
    ...statuses.map(s => `Verification: ${s}: ${STATUSES[s]}`),
  ];
  if (statuses.some(s => NOT_ATTRIBUTABLE.has(s))) {
    lines.push('Do not present this section as what any ancient author said.');
  }
  lines.push('Citing: cite the ancient or scholarly source this passage names, not this summary. Where it names none, say the point comes from an Arete synthesis.');
  return lines.join('\n');
}

/**
 * Parse one synthesis document. Throws on anything malformed: an unknown
 * status, a section_status heading that is not in the document, missing
 * required metadata. Returns { doc, chunks }.
 */
function parseSynthesis(md, filename = 'synthesis.md') {
  const { meta, body } = parseFrontMatter(md, filename);
  for (const k of ['doc_key', 'title', 'version', 'created_at', 'generated_with', 'default_status']) {
    if (!scalar(meta, k)) throw new Error(`${filename}: front matter needs ${k}`);
  }
  const version = Number(meta.version);
  if (!Number.isInteger(version) || version < 1 || version >= 1000) throw new Error(`${filename}: version must be an integer from 1`);
  if (!/^[a-z0-9-]+$/.test(meta.doc_key)) throw new Error(`${filename}: doc_key must be kebab-case`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.created_at)) throw new Error(`${filename}: created_at must be YYYY-MM-DD`);
  const sourcesUsed = scalar(meta, 'sources_used') || [];
  const regenerateWhen = scalar(meta, 'regenerate_when') || [];
  if (!sourcesUsed.length) throw new Error(`${filename}: sources_used is empty`);

  const defaultStatus = parseStatusList(meta.default_status, `${filename} default_status`);
  const explicit = new Map();
  for (const entry of scalar(meta, 'section_status') || []) {
    const m = entry.match(/^(.+?)\s*=>\s*(.+)$/);
    if (!m) throw new Error(`${filename}: section_status entry "${entry}" needs "Heading path => status"`);
    explicit.set(m[1].trim(), parseStatusList(m[2], `${filename} "${m[1].trim()}"`));
  }

  // Walk the headings. Text before the first ## (after the # title) is the
  // introduction.
  const sections = [];
  const stack = [];
  let cur = { path: 'Introduction', lines: [] };
  for (const line of body.split('\n')) {
    const h = line.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (h && h[1].length === 1) continue;   // the document title
    if (h) {
      sections.push(cur);
      const level = h[1].length;
      const text = stripEmphasis(h[2]);
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, text });
      cur = { path: stack.map(s => s.text).join(' > '), lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  sections.push(cur);

  const seenPaths = new Set(sections.map(s => s.path));
  for (const p of explicit.keys()) {
    if (!seenPaths.has(p)) throw new Error(`${filename}: section_status names "${p}", which is not a heading in the document`);
  }
  const statusFor = (p) => {
    for (let q = p; q; q = q.includes(' > ') ? q.slice(0, q.lastIndexOf(' > ')) : '') {
      if (explicit.has(q)) return explicit.get(q);
    }
    return defaultStatus;
  };

  const chunks = [];
  for (const s of sections) {
    const text = stripEmphasis(s.lines.join('\n'));
    if (!text) continue;
    const statuses = statusFor(s.path);
    for (const part of splitBody(text)) {
      const n = chunks.length + 1;
      chunks.push({
        chunk_index: version * INDEX_STRIDE + n,
        section_label: s.path,
        verification_status: statuses,
        body: part,
        word_count: wordCount(part),
        chunk_text: `${header({ title: meta.title, version, sectionPath: s.path, statuses })}\n\n${part}`,
        embed_input: `${meta.title}: ${s.path}\n\n${part}`,
      });
    }
  }
  if (chunks.length >= INDEX_STRIDE) throw new Error(`${filename}: ${chunks.length} chunks overflows the version stride`);

  const doc = {
    doc_key: meta.doc_key,
    version,
    title: meta.title,
    author: AUTHOR,
    created_at: meta.created_at,
    generated_with: meta.generated_with,
    reviewed_by: scalar(meta, 'reviewed_by'),
    sources_used: sourcesUsed,
    regenerate_when: regenerateWhen,
    file_path: `academy/corpus-ingestion/synthesis/${path.basename(filename)}`,
    content_sha256: crypto.createHash('sha256').update(md).digest('hex'),
  };
  return { doc, chunks };
}

function listSynthesisFiles(dir = SYNTHESIS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.v\d+\.md$/i.test(f))
    .sort()
    .map(f => path.join(dir, f));
}

function loadAll(files) {
  const parsed = files.map(f => ({ file: f, ...parseSynthesis(fs.readFileSync(f, 'utf8'), path.basename(f)) }));
  const seen = new Set();
  for (const p of parsed) {
    const key = `${p.doc.doc_key}@${p.doc.version}`;
    if (seen.has(key)) throw new Error(`${key} appears in two files`);
    seen.add(key);
  }
  return parsed;
}

// The newest version on disk is the one that should be active.
function newestVersions(parsed) {
  const newest = new Map();
  for (const p of parsed) {
    const prev = newest.get(p.doc.doc_key);
    if (!prev || p.doc.version > prev.doc.version) newest.set(p.doc.doc_key, p);
  }
  return [...newest.values()];
}

function chunkRow(doc, c, documentId) {
  return {
    program_id: PROGRAM_ID,
    author: AUTHOR,
    work: doc.title,
    section_label: c.section_label,
    chunk_index: c.chunk_index,
    chunk_text: c.chunk_text,
    word_count: c.word_count,
    translator: 'original',
    source_url: REPO_BLOB + path.basename(doc.file_path),
    edition_year: Number(doc.created_at.slice(0, 4)),
    text_type: TEXT_TYPE,
    source_type: SOURCE_TYPE,
    language: LANGUAGE,
    difficulty: DIFFICULTY,
    verification_status: c.verification_status,
    synthesis_document_id: documentId,
    // Written deprecated; activate_synthesis_version() makes the active
    // version's chunks live in the same transaction that retires the old ones.
    deprecated: true,
  };
}

// ── SQL emit (no embeddings) ───────────────────────────────────────────────

function lit(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `array[${v.map(lit).join(', ')}]::text[]`;
  const s = String(v);
  let tag = 'q';
  while (s.includes(`$${tag}$`)) tag += 'q';
  return `$${tag}$${s}$${tag}$`;
}

// part/parts split a large load across several migrations: the document row
// goes in every part (on conflict do nothing), the chunks are divided evenly,
// and only the last part activates.
function emitSql(parsed, { part = 1, parts = 1 } = {}) {
  const out = [];
  for (const p of parsed) {
    const d = p.doc;
    const per = Math.ceil(p.chunks.length / parts);
    const chunks = p.chunks.slice((part - 1) * per, part * per);
    out.push(`-- ${d.title}, version ${d.version}: ${p.chunks.length} chunks` +
      (parts > 1 ? `; part ${part} of ${parts}, chunks ${chunks[0].chunk_index} to ${chunks[chunks.length - 1].chunk_index}` : ''));
    out.push(
      'insert into public.corpus_synthesis_documents\n' +
      '  (doc_key, version, title, author, created_at, generated_with, reviewed_by, sources_used, regenerate_when, file_path, content_sha256)\n' +
      `values (${[d.doc_key, d.version, d.title, d.author, d.created_at].map(lit).join(', ')}::date, ` +
      `${lit(d.generated_with)}, ${lit(d.reviewed_by)}, ${lit(d.sources_used)}, ${lit(d.regenerate_when)}, ` +
      `${lit(d.file_path)}, ${lit(d.content_sha256)})\n` +
      'on conflict (doc_key, version) do nothing;');
    const cols = Object.keys(chunkRow(d, p.chunks[0], null)).filter(c => c !== 'synthesis_document_id');
    const values = chunks.map(c => {
      const r = chunkRow(d, c, null);
      return `  (${cols.map(k => lit(r[k])).join(', ')})`;
    });
    out.push(
      `insert into public.rag_corpus (${cols.join(', ')}, synthesis_document_id)\n` +
      `select v.*, sd.id from (values\n${values.join(',\n')}\n) as v(${cols.join(', ')})\n` +
      `join public.corpus_synthesis_documents sd on sd.doc_key = ${lit(d.doc_key)} and sd.version = ${d.version}\n` +
      'on conflict (author, work, program_id, chunk_index) do nothing;');
    out.push('');
  }
  if (part < parts) return out.join('\n');
  for (const p of newestVersions(parsed)) {
    out.push(`select public.activate_synthesis_version(id) from public.corpus_synthesis_documents where doc_key = ${lit(p.doc.doc_key)} and version = ${p.doc.version};`);
  }
  return out.join('\n');
}

// ── Clients (lazy, so --dry-run and --emit-sql need no keys) ───────────────

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getEmbed() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY must be set.');
  // embedder.js pins text-embedding-3-small, the corpus model.
  const { embedChunks } = require('./embedder');
  return async text => (await embedChunks([{ text }]))[0].embedding;
}

// ── Sync ───────────────────────────────────────────────────────────────────

async function syncOne(p, { supabase, log }) {
  const d = p.doc;
  const { data: existing, error: exErr } = await supabase
    .from('corpus_synthesis_documents')
    .select('id, content_sha256')
    .eq('doc_key', d.doc_key).eq('version', d.version)
    .maybeSingle();
  if (exErr) throw new Error(`reading ${d.doc_key} v${d.version}: ${exErr.message}`);

  let id = existing && existing.id;
  if (existing && existing.content_sha256 !== d.content_sha256) {
    // A loaded version is a record of what was admitted. A change is a new
    // version, so the old one stays auditable.
    throw new Error(`${path.basename(p.file)} changed after version ${d.version} was loaded; save the edit as version ${d.version + 1} instead`);
  }
  if (!existing) {
    const { data, error } = await supabase.from('corpus_synthesis_documents').insert({
      doc_key: d.doc_key, version: d.version, title: d.title, author: d.author, created_at: d.created_at,
      generated_with: d.generated_with, reviewed_by: d.reviewed_by, sources_used: d.sources_used,
      regenerate_when: d.regenerate_when, file_path: d.file_path, content_sha256: d.content_sha256,
    }).select('id').single();
    if (error) throw new Error(`inserting ${d.doc_key} v${d.version}: ${error.message}`);
    id = data.id;
    log(`  + ${d.title} v${d.version} registered`);
  }

  const { count, error: cErr } = await supabase
    .from('rag_corpus').select('id', { count: 'exact', head: true })
    .eq('synthesis_document_id', id);
  if (cErr) throw new Error(`counting chunks of ${d.doc_key} v${d.version}: ${cErr.message}`);
  if (!count) {
    const { error } = await supabase.from('rag_corpus').insert(p.chunks.map(c => chunkRow(d, c, id)));
    if (error) throw new Error(`inserting chunks of ${d.doc_key} v${d.version}: ${error.message}`);
    log(`  + ${p.chunks.length} chunks written`);
  } else if (count !== p.chunks.length) {
    throw new Error(`${d.doc_key} v${d.version} has ${count} chunks in rag_corpus, the file makes ${p.chunks.length}`);
  }
  return id;
}

async function syncSynthesis(opts = {}) {
  const log = opts.log || console.log;
  const files = opts.file ? [path.isAbsolute(opts.file) ? opts.file : path.join(opts.dir || SYNTHESIS_DIR, opts.file)]
                          : listSynthesisFiles(opts.dir || SYNTHESIS_DIR);
  if (!files.length) { log('No synthesis documents found.'); return { documents: 0, embedded: 0, errors: 0 }; }
  const parsed = loadAll(files);
  const supabase = opts.supabase || getSupabase();
  const embed = opts.embed || getEmbed();
  const result = { documents: parsed.length, embedded: 0, errors: 0 };

  const ids = new Map();
  for (const p of parsed) {
    log(`\n--- synthesis: ${path.basename(p.file)} ---`);
    try { ids.set(p, await syncOne(p, { supabase, log })); }
    catch (err) { result.errors++; log(`  ✗ ${err.message}`); }
  }

  for (const p of newestVersions(parsed)) {
    const id = ids.get(p);
    if (!id) continue;
    const { error } = await supabase.rpc('activate_synthesis_version', { p_document_id: id });
    if (error) { result.errors++; log(`  ✗ activating ${p.doc.doc_key} v${p.doc.version}: ${error.message}`); continue; }

    // Embed the live chunks that have none. Inactive versions are not embedded:
    // they are history, and deprecated rows never retrieve.
    const { data: rows, error: rErr } = await supabase
      .from('rag_corpus').select('id, chunk_index')
      .eq('synthesis_document_id', id).eq('deprecated', false).is('embedding', null);
    if (rErr) { result.errors++; log(`  ✗ reading unembedded chunks: ${rErr.message}`); continue; }
    const byIndex = new Map(p.chunks.map(c => [c.chunk_index, c]));
    for (const r of rows || []) {
      try {
        const embedding = await embed(byIndex.get(r.chunk_index).embed_input);
        const { error } = await supabase.from('rag_corpus').update({ embedding }).eq('id', r.id);
        if (error) throw new Error(error.message);
        result.embedded++;
      } catch (err) {
        result.errors++;
        log(`  ✗ embedding chunk ${r.chunk_index}: ${err.message}`);
      }
    }
    log(`  ${p.doc.doc_key}: v${p.doc.version} active, ${(rows || []).length} chunk(s) needed an embedding`);
  }
  return result;
}

// ── Verification ───────────────────────────────────────────────────────────

/**
 * The two retrieval profiles side by side for one query: research (synthesis
 * excluded in the RPC) and teaching (no layer excluded). Returns both lists.
 */
async function verifyQuery(query, { supabase, embed, log = console.log, k = 5 } = {}) {
  supabase = supabase || getSupabase();
  embed = embed || getEmbed();
  const embedding = await embed(query);
  const call = extra => supabase.rpc('match_rag_corpus', {
    query_embedding: embedding, match_count: k, filter_author: null, filter_language: LANGUAGE, ...extra,
  });
  // The research profile, as server/lib/corpus-fence.js researchRetrievalParams()
  // builds it. Written out because this package deploys without server/.
  const [research, teaching] = await Promise.all([call({ exclude_text_types: [TEXT_TYPE] }), call({})]);
  if (research.error) throw new Error(research.error.message);
  if (teaching.error) throw new Error(teaching.error.message);
  const show = (label, rows) => {
    log(`  ${label}:`);
    rows.forEach((r, i) => log(`    ${i + 1}. ${r.author}, ${r.work}, ${r.section_label || ''} (${r.text_type}, ${Number(r.similarity).toFixed(3)})`));
  };
  log(`\nQuery: "${query}"`);
  show('research profile', research.data || []);
  show('teaching profile', teaching.data || []);
  const leaked = (research.data || []).some(r => r.text_type === TEXT_TYPE);
  if (leaked) log('  ✗ FENCE FAILURE: a synthesis chunk reached the research profile');
  return { research: research.data || [], teaching: teaching.data || [], leaked };
}

// ── CLI ────────────────────────────────────────────────────────────────────

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const file = getArg('--file');
  const dir = getArg('--dir') || SYNTHESIS_DIR;
  const files = file ? [path.join(dir, file)] : listSynthesisFiles(dir);

  if (args.includes('--dry-run')) {
    for (const p of loadAll(files)) {
      const counts = {};
      for (const c of p.chunks) for (const s of c.verification_status) counts[s] = (counts[s] || 0) + 1;
      console.log(`\n${path.basename(p.file)} → ${p.doc.title} v${p.doc.version}: ${p.chunks.length} chunks ${JSON.stringify(counts)}`);
      for (const c of p.chunks) console.log(`  [${c.chunk_index}] ${c.section_label} (${c.verification_status.join(', ')}; ${c.word_count} words)`);
    }
    return;
  }
  if (args.includes('--emit-sql')) {
    const [part, parts] = (getArg('--part') || '1/1').split('/').map(Number);
    if (!(part >= 1 && parts >= part)) throw new Error('--part takes i/n, e.g. 1/3');
    console.log(emitSql(loadAll(files), { part, parts }));
    return;
  }
  if (args.includes('--verify')) {
    const q = getArg('--verify');
    if (!q) throw new Error('--verify needs a query string');
    await verifyQuery(q);
    return;
  }
  const r = await syncSynthesis({ file, dir });
  console.log(`\nSynthesis: ${r.documents} document version(s), ${r.embedded} chunks embedded, ${r.errors} errors`);
  if (r.errors) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
  });
}

module.exports = {
  SYNTHESIS_DIR, AUTHOR, TEXT_TYPE, STATUSES, MAX_WORDS, INDEX_STRIDE,
  parseSynthesis, listSynthesisFiles, loadAll, newestVersions, emitSql, syncSynthesis, verifyQuery,
};
