// academy/corpus-ingestion/reingest-papers.js
//
// Re-ingest already-ingested paper summaries under the current pipeline:
// paragraph chunking, edition_year, source_url, venue in the section label,
// and the question-map registrations held on the submission. Equivalent to
// pressing "Remove from corpus" then "Approve & ingest" on the admin papers
// page for each paper, without the browser session, for the case where the
// summaries were ingested before the pipeline changed.
//
// Usage: node reingest-papers.js --since 2026-09-14     every paper ingested on or after
//        node reingest-papers.js --id <uuid> [--id ...]  specific submissions
//        add --dry-run to print the plan without writing
//
// Needs OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the .env here).
//
// Mirrors academy/web/src/lib/papers/ingest.ts (chunkSummary, the row shape,
// the author/work/program_id/chunk_index conflict key) and the ingest and
// de-ingest routes under academy/web/src/app/api/admin/papers/[id]/. Author
// and work are taken from the submission as stored; the review card and the
// ingest route normalise them, so run those first if a citation still needs
// tidying. Deprecate-never-delete does not apply here: a paper's chunks are
// replaced by the same summary re-chunked, and the recorded chunk ids are the
// audit trail, exactly as the de-ingest route does.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const PROGRAM_ID = 'stoicism-phd';
const CHUNK_SIZE = 400;
const OVERLAP = 50;
const MIN_PARAGRAPH_WORDS = 80;
const MAX_PARAGRAPH_WORDS = 500;
const ROLES = new Set(['states', 'defends', 'attacks', 'complicates']);

function wordCount(t) { return t.split(/\s+/).filter(Boolean).length; }

function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE - OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}

// Same as chunkSummary in academy/web/src/lib/papers/ingest.ts.
function chunkSummary(text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const merged = [];
  for (const p of paragraphs) {
    const prev = merged[merged.length - 1];
    if (prev !== undefined && (wordCount(p) < MIN_PARAGRAPH_WORDS || wordCount(prev) < MIN_PARAGRAPH_WORDS)) {
      merged[merged.length - 1] = `${prev} ${p}`;
    } else {
      merged.push(p);
    }
  }
  const out = [];
  for (const p of merged) {
    if (wordCount(p) > MAX_PARAGRAPH_WORDS) out.push(...chunkText(p)); else out.push(p);
  }
  return out;
}

function parseEditionYear(year) {
  const m = year ? String(year).match(/\b(1[5-9]\d\d|20\d\d)\b/) : null;
  return m ? Number(m[1]) : null;
}

function sourceUrl(p) {
  if (p.source_url) return p.source_url;
  if (p.storage_path) return `storage:papers/${p.storage_path}`;
  return null;
}

function registrations(p) {
  const raw = Array.isArray(p.question_registrations) ? p.question_registrations : [];
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    const id = String(r?.question_id || '').trim().toUpperCase();
    const role = String(r?.role || '').trim().toLowerCase();
    const position = String(r?.position || '').trim();
    if (!/^Q\d{2}$/.test(id) || !ROLES.has(role) || !position || seen.has(id)) continue;
    seen.add(id);
    out.push({ question_id: id, position: position.slice(0, 500), role, note: r.note || null });
  }
  return out;
}

function parseArgs(argv) {
  const args = { ids: [], since: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--id') args.ids.push(argv[++i]);
    else if (argv[i] === '--since') args.since = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  if (args.ids.length === 0 && !args.since) {
    console.error('Usage: node reingest-papers.js (--since YYYY-MM-DD | --id <uuid> ...) [--dry-run]');
    process.exit(1);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY']) {
    if (!process.env[k]) { console.error(`${k} must be set`); process.exit(1); }
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let q = supabase.from('paper_submissions').select('*').eq('status', 'ingested').order('ingested_at');
  q = args.ids.length ? q.in('id', args.ids) : q.gte('ingested_at', args.since);
  const { data: papers, error } = await q;
  if (error) throw new Error(`read submissions: ${error.message}`);
  if (!papers || papers.length === 0) { console.log('nothing to re-ingest'); return; }

  for (const p of papers) {
    const chunks = chunkSummary(p.summary_text || '');
    const regs = registrations(p);
    console.log(`\n--- ${p.author} — ${p.work}`);
    console.log(`    ${(p.rag_chunk_ids || []).length} chunk(s) now → ${chunks.length} paragraph chunk(s) [${chunks.map(wordCount).join(', ')} words]`);
    console.log(`    registrations: ${regs.length ? regs.map(r => `${r.question_id} ${r.role}`).join(', ') : 'none'}`);
    if (chunks.length === 0) { console.log('    skipped: no chunkable summary'); continue; }
    if (args.dryRun) continue;

    // De-ingest: the recorded chunk ids, then the registrations (mirrors the
    // de-ingest route). concept_passage_map rows cascade on the chunk FK.
    const oldIds = p.rag_chunk_ids || [];
    if (oldIds.length) {
      const { error: delErr } = await supabase.from('rag_corpus').delete().in('id', oldIds);
      if (delErr) throw new Error(`delete chunks: ${delErr.message}`);
    }
    const { error: regDel } = await supabase.from('corpus_question_registrations')
      .delete().eq('author', p.author).eq('work', p.work).eq('source', 'paper_agent');
    if (regDel) throw new Error(`delete registrations: ${regDel.message}`);

    // Re-ingest (mirrors ingestPaperSummary).
    const sectionBits = ['scholarly summary', p.venue, p.year].filter(Boolean);
    const ids = [];
    for (let i = 0; i < chunks.length; i++) {
      const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks[i] });
      const { data, error: upErr } = await supabase.from('rag_corpus').upsert({
        chunk_text: chunks[i],
        author: p.author,
        work: p.work,
        section_label: sectionBits.join(' — '),
        language: 'english',
        program_id: PROGRAM_ID,
        course_relevance: null,
        difficulty: 'Advanced',
        text_type: 'paper_summary',
        source_url: sourceUrl(p),
        edition_year: parseEditionYear(p.year),
        chunk_index: i,
        word_count: wordCount(chunks[i]),
        embedding: emb.data[0].embedding,
      }, { onConflict: 'author,work,program_id,chunk_index' }).select('id').single();
      if (upErr) throw new Error(`upsert chunk ${i}: ${upErr.message}`);
      ids.push(data.id);
    }

    // Concepts on the first chunk (mirrors the ingest route).
    const labels = (p.key_concepts || []).map(k => String(k).trim().toLowerCase()).filter(k => k.length > 1).slice(0, 6);
    if (labels.length) {
      const { error: cpmErr } = await supabase.from('concept_passage_map').upsert(
        labels.map(concept => ({ concept, chunk_id: ids[0], author: p.author, work: p.work, chunk_text: chunks[0], approved: true, approved_at: new Date().toISOString() })),
        { onConflict: 'concept,chunk_id' });
      if (cpmErr) console.warn(`    concept planting failed: ${cpmErr.message}`);
    }

    if (regs.length) {
      const { error: regErr } = await supabase.from('corpus_question_registrations').upsert(
        regs.map(r => ({ question_id: r.question_id, author: p.author, work: p.work, position: r.position, role: r.role, note: r.note, source: 'paper_agent' })),
        { onConflict: 'question_id,author,work' });
      if (regErr) console.warn(`    registration failed: ${regErr.message}`);
    }

    const { error: updErr } = await supabase.from('paper_submissions').update({
      rag_chunk_ids: ids,
      question_registrations: regs,
      ingested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', p.id);
    if (updErr) throw new Error(`update submission: ${updErr.message}`);
    console.log(`    ✓ re-ingested as ${ids.length} chunk(s)`);
  }
}

main().catch(err => { console.error('Fatal:', err.message || err); process.exit(1); });
