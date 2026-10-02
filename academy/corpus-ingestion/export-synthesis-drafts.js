// academy/corpus-ingestion/export-synthesis-drafts.js
//
// Takes the synthesis drafts Kyle has approved (synthesis_drafts, status
// 'approved') and writes each one into synthesis/ as <doc_key>.v<N>.md, the
// file the nightly sync loads. Run it in a session, commit the files it
// writes, and open a PR: the commit is the record of what was admitted, and
// nothing reaches rag_corpus without one (synthesis/README.md).
//
// For each approved draft it:
//   1. sets reviewed_by: Kyle in the front matter (the approval is his),
//   2. parses the result with parseSynthesis, so a draft the sync would
//      reject fails here instead of at night,
//   3. refuses a doc_key and version that is already loaded or on disk with
//      different content,
//   4. writes the file, adds its row to the README's Documents table, and
//      marks the draft 'exported'.
//
// Every run first reconciles: an 'exported' draft whose file the sync has
// loaded (same doc_key, version and content hash) is marked 'ingested'.
//
// Usage:
//   node export-synthesis-drafts.js              reconcile, then export approved drafts
//   node export-synthesis-drafts.js --dry-run    show what would be written, touch nothing
//   node export-synthesis-drafts.js --reconcile  only mark loaded drafts ingested

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parseSynthesis, SYNTHESIS_DIR } = require('./ingest-synthesis');

const README = path.join(SYNTHESIS_DIR, 'README.md');
const REVIEWER = 'Kyle';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Sets (or replaces) reviewed_by in the front matter, after generated_with.
function withReviewedBy(md, reviewer) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error('no front matter');
  const lines = m[1].split(/\r?\n/).filter(l => !/^reviewed_by\s*:/.test(l));
  const at = lines.findIndex(l => /^generated_with\s*:/.test(l));
  lines.splice(at === -1 ? lines.length : at + 1, 0, `reviewed_by: ${reviewer}`);
  return `---\n${lines.join('\n')}\n---${md.slice(m[0].length)}`;
}

// "43 corpus_verified, 22 interpretive" — the README's Status column.
function statusSummary(chunks) {
  const counts = new Map();
  for (const c of chunks) {
    const k = c.verification_status.join(' + ');
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', ');
}

// Adds a row to the Documents table, after its last row.
function addReadmeRow(readme, row) {
  const lines = readme.split('\n');
  const head = lines.findIndex(l => /^\|\s*File\s*\|\s*Chunks\s*\|\s*Status\s*\|/.test(l));
  if (head === -1) throw new Error('README has no Documents table (| File | Chunks | Status |)');
  let end = head + 1;
  while (end + 1 < lines.length && lines[end + 1].startsWith('|')) end++;
  lines.splice(end + 1, 0, row);
  return lines.join('\n');
}

async function reconcile(supabase, log) {
  const { data: exported, error } = await supabase
    .from('synthesis_drafts')
    .select('id, doc_key, version, export_sha256')
    .eq('status', 'exported');
  if (error) throw new Error(`reading exported drafts: ${error.message}`);
  let n = 0;
  for (const d of exported || []) {
    const { data: doc, error: dErr } = await supabase
      .from('corpus_synthesis_documents')
      .select('content_sha256, loaded_at')
      .eq('doc_key', d.doc_key).eq('version', d.version)
      .maybeSingle();
    if (dErr) throw new Error(`reading ${d.doc_key} v${d.version}: ${dErr.message}`);
    if (!doc) continue;
    if (doc.content_sha256 !== d.export_sha256) {
      log(`  ! ${d.doc_key} v${d.version} is loaded, but not from the exported file (hash differs); left as exported`);
      continue;
    }
    const { error: uErr } = await supabase.from('synthesis_drafts')
      .update({ status: 'ingested', ingested_at: doc.loaded_at, updated_at: new Date().toISOString() })
      .eq('id', d.id);
    if (uErr) throw new Error(`marking ${d.doc_key} ingested: ${uErr.message}`);
    log(`  ✓ ${d.doc_key} v${d.version} is in the corpus; marked ingested`);
    n++;
  }
  return n;
}

async function exportApproved(supabase, { dryRun, log, dir = SYNTHESIS_DIR, readmePath = README }) {
  const { data: drafts, error } = await supabase
    .from('synthesis_drafts')
    .select('id, doc_key, version, title, markdown')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: true });
  if (error) throw new Error(`reading approved drafts: ${error.message}`);
  if (!drafts || !drafts.length) { log('No approved drafts to export.'); return { exported: 0, errors: 0 }; }

  let readme = fs.readFileSync(readmePath, 'utf8');
  const result = { exported: 0, errors: 0, files: [] };
  for (const d of drafts) {
    const file = `${d.doc_key}.v${d.version}.md`;
    try {
      const md = withReviewedBy(d.markdown, REVIEWER);
      const { doc, chunks } = parseSynthesis(md, file);
      if (doc.doc_key !== d.doc_key || doc.version !== d.version) {
        throw new Error(`front matter says ${doc.doc_key} v${doc.version}, the draft row says ${d.doc_key} v${d.version}`);
      }
      const target = path.join(dir, file);
      if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') !== md) {
        throw new Error(`${file} already exists with different content`);
      }
      const { data: loaded, error: lErr } = await supabase
        .from('corpus_synthesis_documents').select('id')
        .eq('doc_key', doc.doc_key).eq('version', doc.version).maybeSingle();
      if (lErr) throw new Error(`checking the corpus: ${lErr.message}`);
      if (loaded) throw new Error(`${doc.doc_key} v${doc.version} is already loaded; an edit has to be a new version`);

      const row = `| \`${file}\` | ${chunks.length} | ${statusSummary(chunks)} |`;
      log(`  ${dryRun ? '(dry run) ' : ''}${file}: "${doc.title}", ${chunks.length} chunks (${statusSummary(chunks)})`);
      if (dryRun) continue;

      fs.writeFileSync(target, md);
      if (!readme.includes(`\`${file}\``)) readme = addReadmeRow(readme, row);
      const { error: uErr } = await supabase.from('synthesis_drafts').update({
        status: 'exported',
        markdown: md,
        exported_at: new Date().toISOString(),
        export_file_path: `academy/corpus-ingestion/synthesis/${file}`,
        export_sha256: doc.content_sha256,
        updated_at: new Date().toISOString(),
      }).eq('id', d.id);
      if (uErr) throw new Error(`marking exported: ${uErr.message}`);
      result.exported++;
      result.files.push(file);
    } catch (err) {
      result.errors++;
      log(`  ✗ ${file}: ${err.message}`);
    }
  }
  if (!dryRun && result.exported) fs.writeFileSync(readmePath, readme);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const log = console.log;
  const supabase = getSupabase();

  if (!dryRun) {
    log('--- reconcile ---');
    const n = await reconcile(supabase, log);
    log(`${n} draft(s) marked ingested`);
  }
  if (args.includes('--reconcile')) return;

  log('\n--- export ---');
  const r = await exportApproved(supabase, { dryRun, log });
  if (r.files && r.files.length) {
    log(`\nWrote ${r.files.length} file(s). Commit them with the README and open a PR; the nightly sync loads them after merge.`);
  }
  if (r.errors) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
  });
}

module.exports = { withReviewedBy, statusSummary, addReadmeRow, exportApproved, reconcile };
