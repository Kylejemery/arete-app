#!/usr/bin/env node
// pd-ingest/report.js — the review report Kyle approves from.
//
//   node pd-ingest/report.js     writes docs/corpus/staging/long2002-ch2.md
//
// Per staged source: word count, chunk count, three chunks chosen at random
// (seeded by the slug, so the same three on every run of the same data),
// cleaning problems, license evidence, OCR estimate, question registrations.
// Then every source not staged, and why: skipped (recorded verdicts) and
// pending (work still to do). Approving a source is setting its status to
// 'approved' in corpus_staging_sources; promote.js does the rest.

const fs = require('fs');
const path = require('path');
const { BATCH, SOURCES } = require('./sources');
const { pendingReason } = require('./stage');
const { sample } = require('./lib');

const OUT = path.resolve(__dirname, '../../../docs/corpus/staging/long2002-ch2.md');

function renderSource(src, def, chunks) {
  const body = chunks.filter((c) => c.kind === 'body');
  const notes = chunks.filter((c) => c.kind === 'note');
  const words = body.reduce((n, c) => n + c.word_count, 0);
  const picks = sample(body, 3, src.slug);
  const lines = [
    `### ${src.author}, *${src.work}* — \`${src.slug}\``,
    '',
    `| | |`,
    `| --- | --- |`,
    `| Status | **${src.status}** |`,
    `| Tier / text_type / language | ${src.tier} / ${src.text_type} / ${src.language} |`,
    `| Translator, edition | ${src.translator}; ${src.edition || '—'} (${src.edition_year}) |`,
    `| quotable_on_air | ${src.quotable_on_air} |`,
    `| Source | ${src.source_url} |`,
    `| Retrieved / raw sha256 | ${src.retrieved_at || '—'} / \`${(src.raw_sha256 || '').slice(0, 16)}…\` |`,
    `| Words / chunks / notes | ${words.toLocaleString('en-US')} / ${body.length} / ${notes.length} |`,
  ];
  if (src.ocr_quality) lines.push(`| OCR | ${src.ocr_quality} (estimated ${(100 * src.ocr_garble_rate).toFixed(1)}% of sampled words garbled) |`);
  lines.push('', '**License evidence**', '', ...String(src.license_evidence || '—').split('\n').map((l) => `> ${l}`), '');
  lines.push('**Cleaning problems**', '', src.cleaning_notes ? src.cleaning_notes.split('\n').map((l) => `- ${l}`).join('\n') : '- none recorded', '');
  const regs = (def && def.registrations) || [];
  lines.push('**Question map on promotion**', '', regs.length ? regs.map((r) => `- ${r.question_id} (${r.role}): ${r.position}`).join('\n') : '- none (an original aligned to its translation, or no cell: see cleaning notes)', '');
  if (def && def.supersedes) lines.push(`**Supersedes on promotion:** live rows of ${def.supersedes.author}, *${def.supersedes.work}*, translator ${def.supersedes.translator ?? 'null'}${def.supersedes.locatorLike ? `, locator ${def.supersedes.locatorLike}` : ''}.`, '');
  lines.push('**Three chunks at random**', '');
  for (const c of picks) {
    lines.push(`*${c.locator || c.section_label || `chunk ${c.chunk_index}`}*${c.printed_pages ? ` (p. ${c.printed_pages})` : ''}, ${c.word_count} words:`, '', ...c.chunk_text.split('\n').map((l) => `> ${l}`), '');
  }
  return lines.join('\n');
}

async function main() {
  const { db, must } = require('./db');
  const staged = await must(db().from('corpus_staging_sources').select('*').eq('batch', BATCH).order('tier').order('slug'), 'read staging sources');
  const bySlug = new Map(staged.map((s) => [s.slug, s]));
  const parts = [
    `# Staging review: ${BATCH}`,
    '',
    `Generated ${new Date().toISOString()} by \`academy/corpus-ingestion/pd-ingest/report.js\`. Approve a source by setting its`,
    '`corpus_staging_sources.status` to `approved`; `node pd-ingest/promote.js --slug <slug>` then moves it into `rag_corpus`.',
    '',
  ];

  const reviewable = staged.filter((s) => s.status !== 'skipped');
  parts.push('## Staged', '');
  if (!reviewable.length) parts.push('Nothing staged yet.', '');
  for (const s of reviewable) {
    const chunks = await must(db().from('corpus_staging_chunks').select('*').eq('source_slug', s.slug).order('chunk_index'), 'read chunks');
    parts.push(renderSource(s, SOURCES.find((d) => d.slug === s.slug), chunks), '');
  }

  parts.push('## Skipped (recorded)', '', '| Source | Reason |', '| --- | --- |');
  const skipped = staged.filter((s) => s.status === 'skipped');
  parts.push(...(skipped.length ? skipped.map((s) => `| \`${s.slug}\` | ${s.skip_reason} |`) : ['| — | none |']), '');

  parts.push('## Not yet attempted', '', '| Source | Why |', '| --- | --- |');
  const pending = SOURCES.filter((d) => !bySlug.has(d.slug)).map((d) => [d.slug, pendingReason(d) || 'ready to stage: run stage.js']);
  parts.push(...(pending.length ? pending.map(([slug, why]) => `| \`${slug}\` | ${why} |`) : ['| — | none |']), '');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, parts.join('\n'));
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
}

if (require.main === module) main().catch((err) => { console.error(err.message); process.exit(1); });

module.exports = { renderSource };
