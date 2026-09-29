#!/usr/bin/env node
// pd-ingest/stage.js — fetch (once), parse, chunk by citation, and write to
// corpus_staging_sources / corpus_staging_chunks. Never writes rag_corpus.
//
//   node pd-ingest/stage.js                     every source in the batch
//   node pd-ingest/stage.js --slug <slug>       one source
//   node pd-ingest/stage.js --batch <batch>     one batch (default: all)
//   node pd-ingest/stage.js --dry-run           fetch and build, write nothing
//   node pd-ingest/stage.js --slug <s> --sql <file>
//                                               build and write the staging
//                                               rows as SQL to run through the
//                                               Supabase connector (no key)
//   node pd-ingest/stage.js --inspect <slug>    fetch and print the page's
//                                               markers (ids, classes, number
//                                               patterns) to set a parser from
//
// Outcomes per source:
//   staged     rows written, status 'staged', waiting for Kyle's review
//   skipped    permanent refusal (HTTP 404, robots.txt, off-allowlist):
//              recorded in corpus_staging_sources with the reason
//   pending    not attempted: not located yet, a parser not written, or a
//              citation pattern not yet read off a real page. Printed, not
//              recorded, because it is work to do rather than a verdict.
//   refused    fetched but the structure check failed: printed with reasons
//              and the page's markers; nothing written. Fix the parser.
//
// A network failure (the host unreachable) stops the run: it says nothing
// about the source and must not be logged as a skip.

const { BATCH, SOURCES } = require('./sources');
const { getCached, getLocal, getRepoFile, combinedSha256, FetchRefused, NetworkUnavailable } = require('./fetch');
const { build, PARSERS } = require('./build');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

function sourceRow(source, extra) {
  return {
    slug: source.slug, batch: source.batch || BATCH, tier: source.tier, author: source.author, work: source.work,
    language: source.language, translator: source.translator, edition: source.edition || null,
    edition_year: source.edition_year, text_type: source.text_type,
    license_status: source.license_status, quotable_on_air: !!source.quotable_on_air,
    source_url: source.sourceUrl || source.urls[0],
    ...(source.citedBy ? { cited_by: source.citedBy } : {}),
    cleaning_notes: source.cleaningNote || null,
    ...extra,
  };
}

function pendingReason(source) {
  if (source.pending) return source.pending;
  if (!source.urls.length && !source.localFiles && !source.repoFiles) return `not located yet: ${source.discover || 'no URL'}`;
  if (!PARSERS[source.parser]) return `parser "${source.parser}" not written`;
  if (source.parse && source.parse.patterns && source.parse.patterns.citeId === null) {
    return 'citation pattern not yet read off a real page: run --inspect and set parse.patterns.citeId';
  }
  if ('leafRange' in source && !source.leafRange) return 'leaf range not set: run --inspect and set leafRange';
  if (source.edition_year == null) return 'edition_year not recorded';
  return null;
}

async function fetchAll(source) {
  if (source.localFiles) return source.localFiles.map((name) => getLocal(source.slug, name));
  if (source.repoFiles) return source.repoFiles.map((p) => getRepoFile(p));
  const files = [];
  for (const url of source.urls) files.push(await getCached(source.slug, url));
  return files;
}

// The staging rows for a built source: one corpus_staging_sources row and its
// chunks. Shared by the database write and --sql.
function stagingRows(source, result, files) {
  const notes = [source.cleaningNote, ...result.warnings].filter(Boolean).join('\n') || null;
  const src = sourceRow(source, {
    status: 'staged', skip_reason: null,
    license_evidence: result.licenseEvidence,
    retrieved_at: files.map((f) => f.retrieved_at).filter(Boolean).sort()[0] || null,
    raw_sha256: combinedSha256(files),
    ocr_quality: result.ocr ? result.ocr.quality : null,
    ocr_garble_rate: result.ocr ? result.ocr.rate : null,
    cleaning_notes: notes,
  });
  const chunks = result.chunks.map((c) => ({ source_slug: source.slug, ...c }));
  return { src, chunks };
}

async function writeStaging(source, result, files) {
  const { db, must } = require('./db');
  const existing = await must(db().from('corpus_staging_sources').select('status').eq('slug', source.slug).maybeSingle(), 'read staging source');
  if (existing && ['approved', 'promoted'].includes(existing.status)) {
    throw new Error(`${source.slug} is ${existing.status}; restaging would overwrite reviewed rows`);
  }
  const { src, chunks } = stagingRows(source, result, files);
  await must(db().from('corpus_staging_sources').upsert(src, { onConflict: 'slug' }), 'upsert staging source');
  await must(db().from('corpus_staging_chunks').delete().eq('source_slug', source.slug), 'clear staged chunks');
  for (let i = 0; i < chunks.length; i += 200) {
    await must(db().from('corpus_staging_chunks').insert(chunks.slice(i, i + 200)), 'insert staged chunks');
  }
}

// --sql: the same writes as one SQL transaction, for a session with the
// Supabase connector but no service-role key. It refuses, as writeStaging
// does, to restage a source already approved or promoted.
function sqlLiteral(v) {
  if (v == null) return 'null';
  if (Array.isArray(v)) return v.length ? `array[${v.map(sqlLiteral).join(', ')}]::text[]` : 'array[]::text[]';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function stagingSql(source, result, files) {
  const { src, chunks } = stagingRows(source, result, files);
  const slug = sqlLiteral(source.slug);
  const srcCols = Object.keys(src);
  const chunkCols = [...new Set(chunks.flatMap((c) => Object.keys(c)))];
  return [
    `-- Staging for ${source.slug}, written by pd-ingest/stage.js --sql. Never touches rag_corpus.`,
    'begin;',
    `do $$ begin if exists (select 1 from public.corpus_staging_sources where slug = ${slug} and status in ('approved', 'promoted')) then raise exception '${source.slug} is approved or promoted; restaging would overwrite reviewed rows'; end if; end $$;`,
    `insert into public.corpus_staging_sources (${srcCols.join(', ')})`,
    `values (${srcCols.map((k) => sqlLiteral(src[k])).join(', ')})`,
    `on conflict (slug) do update set ${srcCols.filter((k) => k !== 'slug').map((k) => `${k} = excluded.${k}`).join(', ')};`,
    `delete from public.corpus_staging_chunks where source_slug = ${slug};`,
    `insert into public.corpus_staging_chunks (${chunkCols.join(', ')}) values`,
    chunks.map((c) => `(${chunkCols.map((k) => sqlLiteral(c[k])).join(', ')})`).join(',\n') + ';',
    'commit;',
    '',
  ].join('\n');
}

async function recordSkip(source, reason) {
  const { db, must } = require('./db');
  await must(db().from('corpus_staging_sources').upsert(sourceRow(source, {
    status: 'skipped', skip_reason: reason,
    // A skip row still needs the required columns; nothing was fetched.
    license_status: source.license_status,
  }), { onConflict: 'slug' }), 'record skip');
}

async function translationLocators(source) {
  if (!source.parallelOf) return null;
  const { db, must } = require('./db');
  const rows = await must(db().from('corpus_staging_chunks').select('locator')
    .eq('source_slug', source.parallelOf).eq('kind', 'body').order('chunk_index'), 'read translation chunks');
  if (!rows.length) throw new Error(`stage ${source.parallelOf} before ${source.slug}: the original is chunked to match it`);
  return rows.map((r) => r.locator).filter(Boolean);
}

function printInspect(source, files) {
  const parser = PARSERS[source.parser];
  for (const f of files) {
    console.log(`\n--- ${f.url} (${f.body.length} bytes, sha256 ${f.sha256.slice(0, 12)}…)`);
    if (parser.inspect) console.dir(parser.inspect(f.body.toString('utf8')), { depth: 4, maxArrayLength: 60 });
    else console.log(f.body.toString('utf8').slice(0, 2000));
  }
}

async function main() {
  const inspectSlug = opt('--inspect');
  const only = inspectSlug || opt('--slug');
  const batch = opt('--batch');
  const sqlOut = opt('--sql');
  const dryRun = flag('--dry-run') || !!sqlOut;
  const sql = [];
  const selected = SOURCES.filter((s) => (!only || s.slug === only) && (!batch || (s.batch || BATCH) === batch));
  if (!selected.length) throw new Error(`no source "${only}"`);
  // Translations before the originals aligned to them.
  selected.sort((a, b) => (a.parallelOf ? 1 : 0) - (b.parallelOf ? 1 : 0));

  const summary = [];
  for (const source of selected) {
    if (inspectSlug) {
      printInspect(source, await fetchAll(source));
      continue;
    }
    const pending = pendingReason(source);
    if (pending) { summary.push([source.slug, 'pending', pending]); continue; }

    let files;
    try {
      files = await fetchAll(source);
    } catch (err) {
      if (err instanceof NetworkUnavailable) {
        console.error(`network unavailable, stopping: ${err.message}`);
        break;
      }
      if (err instanceof FetchRefused) {
        if (!dryRun) await recordSkip(source, err.message);
        summary.push([source.slug, 'skipped', err.message]);
        continue;
      }
      throw err;
    }

    const result = build(source, files, { translationChunks: dryRun ? null : await translationLocators(source) });
    if (!result.ok) {
      summary.push([source.slug, 'refused', result.reasons.join('; ')]);
      printInspect(source, files.slice(0, 1));
      continue;
    }
    if (sqlOut) sql.push(stagingSql(source, result, files));
    else if (!dryRun) await writeStaging(source, result, files);
    summary.push([source.slug, sqlOut ? 'built (sql)' : dryRun ? 'built (dry run)' : 'staged',
      `${result.stats.words} words, ${result.stats.bodyChunks} chunks, ${result.stats.noteChunks} notes${result.ocr ? `, OCR ${result.ocr.quality} (${(100 * result.ocr.rate).toFixed(1)}%)` : ''}`]);
  }

  if (sqlOut) {
    require('fs').writeFileSync(sqlOut, sql.join('\n'));
    console.log(`staging SQL for ${sql.length} source(s) written to ${sqlOut}`);
  }
  if (!inspectSlug) {
    console.log('\nsource'.padEnd(48) + 'outcome   detail');
    for (const [slug, outcome, detail] of summary) console.log(`${slug.padEnd(47)} ${outcome.padEnd(9)} ${detail}`);
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { pendingReason, sourceRow, stagingRows, stagingSql, sqlLiteral };
