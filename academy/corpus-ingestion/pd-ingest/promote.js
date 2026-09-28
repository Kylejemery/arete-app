#!/usr/bin/env node
// pd-ingest/promote.js — move one approved staged source into rag_corpus.
//
//   node pd-ingest/promote.js --slug <slug>
//
// Refuses anything whose staging status is not 'approved': Kyle approves a
// source by setting that status after reading the review report. Then:
//
//   1. inserts the body chunks into rag_corpus with embeddings
//      (text-embedding-3-small through embedder.js, the only embedding path),
//      starting after the work's highest chunk_index, deprecated rows
//      included, so no row of an earlier ingest is overwritten;
//   2. inserts translator's notes as their own rows: author the translator,
//      work "Notes to <work>", text_type 'scholarship', never quotable,
//      parent_chunks = the passage they annotate;
//   3. pairs originals and translations through paired_chunk_id;
//   4. deprecates what the source supersedes, only after the new rows are in;
//   5. registers the work against the question map;
//   6. checks the write target is the read target: each promoted source must
//      come back from match_rag_corpus for one of its own chunks, or the
//      promotion is reported as not retrievable (the source_text_chunks
//      accident of CLAUDE.md, caught at the time rather than months later).

const { SOURCES } = require('./sources');
const { db, must } = require('./db');

const WRITE_TABLE = 'rag_corpus'; // the table match_rag_corpus reads
const PROGRAM_ID = 'stoicism-phd';

const args = process.argv.slice(2);
const slug = args[args.indexOf('--slug') + 1];

async function nextChunkIndex(author, work) {
  const rows = await must(db().from(WRITE_TABLE).select('chunk_index')
    .eq('author', author).eq('work', work).eq('program_id', PROGRAM_ID)
    .order('chunk_index', { ascending: false }).limit(1), 'read max chunk_index');
  return rows.length ? rows[0].chunk_index + 1 : 0;
}

async function insertRows(rows) {
  const ids = [];
  for (let i = 0; i < rows.length; i += 100) {
    const data = await must(db().from(WRITE_TABLE).insert(rows.slice(i, i + 100)).select('id'), 'insert rag_corpus rows');
    ids.push(...data.map((r) => r.id));
  }
  return ids;
}

async function deprecateSuperseded(sup, keepIds) {
  let q = db().from(WRITE_TABLE).select('id').eq('author', sup.author).eq('work', sup.work).eq('deprecated', false);
  q = sup.translator === null ? q.is('translator', null) : q.eq('translator', sup.translator);
  if (sup.locatorLike) q = q.like('locator', sup.locatorLike);
  const live = await must(q.limit(5000), 'find superseded rows');
  const keep = new Set(keepIds);
  const ids = live.map((r) => r.id).filter((id) => !keep.has(id));
  for (let i = 0; i < ids.length; i += 100) {
    await must(db().from(WRITE_TABLE).update({ deprecated: true }).in('id', ids.slice(i, i + 100)), 'deprecate superseded rows');
  }
  return ids.length;
}

async function pairWith(source, promotedByLocator) {
  const otherSlug = source.parallelOf || SOURCES.find((s) => s.parallelOf === source.slug)?.slug;
  if (!otherSlug) return 0;
  const other = await must(db().from('corpus_staging_chunks').select('locator, promoted_rag_corpus_id')
    .eq('source_slug', otherSlug).eq('kind', 'body').not('promoted_rag_corpus_id', 'is', null), 'read parallel chunks');
  let n = 0;
  for (const o of other) {
    const mine = promotedByLocator.get(o.locator);
    if (!mine) continue;
    await must(db().from(WRITE_TABLE).update({ paired_chunk_id: o.promoted_rag_corpus_id }).eq('id', mine), 'pair');
    await must(db().from(WRITE_TABLE).update({ paired_chunk_id: mine }).eq('id', o.promoted_rag_corpus_id), 'pair back');
    n += 1;
  }
  return n;
}

async function retrievable(row) {
  const probe = await must(db().from(WRITE_TABLE).select('embedding').eq('id', row.id).single(), 'read probe embedding');
  const hits = await must(db().rpc('match_rag_corpus', {
    query_embedding: probe.embedding, match_count: 5, filter_author: row.author, filter_language: row.language,
  }), 'match_rag_corpus probe');
  return (hits || []).some((h) => h.id === row.id);
}

async function main() {
  if (!slug) throw new Error('usage: promote.js --slug <slug>');
  const source = SOURCES.find((s) => s.slug === slug);
  if (!source) throw new Error(`no source "${slug}" in sources.js`);
  const staged = await must(db().from('corpus_staging_sources').select('*').eq('slug', slug).single(), 'read staging source');
  if (staged.status !== 'approved') throw new Error(`${slug} is '${staged.status}'; only 'approved' sources are promoted`);
  if (staged.ocr_quality === 'poor') throw new Error(`${slug} has ocr_quality poor; it stays out of retrieval until reviewed and the quality re-recorded`);

  const chunks = await must(db().from('corpus_staging_chunks').select('*').eq('source_slug', slug).order('chunk_index'), 'read staged chunks');
  const body = chunks.filter((c) => c.kind === 'body');
  const notes = chunks.filter((c) => c.kind === 'note');
  const { embedChunks } = require('../embedder');

  const common = {
    program_id: PROGRAM_ID, language: staged.language, source_url: staged.source_url,
    edition: staged.edition, edition_year: staged.edition_year,
    license_status: staged.license_status, license_evidence: staged.license_evidence,
    retrieved_at: staged.retrieved_at, raw_sha256: staged.raw_sha256,
    ocr_quality: staged.ocr_quality, cited_by: staged.cited_by, deprecated: false,
  };

  console.log(`${slug}: embedding ${body.length} chunks and ${notes.length} notes…`);
  const bodyEmb = await embedChunks(body.map((c) => ({ text: c.chunk_text })));
  let idx = await nextChunkIndex(staged.author, staged.work);
  const bodyRows = body.map((c, i) => ({
    ...common, author: staged.author, work: staged.work, translator: staged.translator,
    text_type: staged.text_type, quotable_on_air: staged.quotable_on_air,
    chunk_index: idx++, chunk_text: c.chunk_text, word_count: c.word_count,
    locator: c.locator, section_label: c.section_label, printed_pages: c.printed_pages,
    embedding: bodyEmb[i].embedding,
  }));
  const bodyIds = await insertRows(bodyRows);
  const byLocator = new Map();
  for (let i = 0; i < body.length; i++) {
    await must(db().from('corpus_staging_chunks').update({ promoted_rag_corpus_id: bodyIds[i] }).eq('id', body[i].id), 'mark staged chunk');
    if (body[i].locator) byLocator.set(body[i].locator, bodyIds[i]);
  }

  let noteIds = [];
  if (notes.length) {
    const noteWork = `Notes to ${staged.work}`;
    const noteEmb = await embedChunks(notes.map((c) => ({ text: c.chunk_text })));
    let nidx = await nextChunkIndex(staged.translator, noteWork);
    noteIds = await insertRows(notes.map((c, i) => ({
      ...common, author: staged.translator, work: noteWork, translator: 'original',
      text_type: 'scholarship', quotable_on_air: false,
      chunk_index: nidx++, chunk_text: c.chunk_text, word_count: c.word_count,
      locator: null, section_label: c.section_label,
      parent_chunks: c.annotates_locator && byLocator.get(c.annotates_locator) ? [byLocator.get(c.annotates_locator)] : null,
      embedding: noteEmb[i].embedding,
    })));
    for (let i = 0; i < notes.length; i++) {
      await must(db().from('corpus_staging_chunks').update({ promoted_rag_corpus_id: noteIds[i] }).eq('id', notes[i].id), 'mark staged note');
    }
  }

  const paired = await pairWith(source, byLocator);
  const deprecated = source.supersedes ? await deprecateSuperseded(source.supersedes, bodyIds) : 0;

  for (const r of source.registrations || []) {
    await must(db().from('corpus_question_registrations').upsert({
      question_id: r.question_id, author: staged.author, work: staged.work, position: r.position, role: r.role,
      note: `Registered at promotion of ${slug} (Long 2002, ch. 2 batch).`, source: 'manual',
    }, { onConflict: 'question_id,author,work' }), 'register question');
  }

  await must(db().from('corpus_staging_sources').update({ status: 'promoted', promoted_at: new Date().toISOString() }).eq('slug', slug), 'mark promoted');

  const probeRow = { id: bodyIds[Math.floor(bodyIds.length / 2)], author: staged.author, language: staged.language };
  const ok = bodyIds.length ? await retrievable(probeRow) : false;

  console.log(`${slug}: ${bodyIds.length} rows and ${noteIds.length} notes into ${WRITE_TABLE}; ${paired} pairs; ${deprecated} superseded rows deprecated; ${(source.registrations || []).length} question registrations.`);
  console.log(ok ? 'retrievable: match_rag_corpus returns a promoted row for its own embedding.' : 'NOT RETRIEVABLE: match_rag_corpus did not return the probe row. Investigate before promoting anything else.');
  if (!ok) process.exit(2);
}

if (require.main === module) main().catch((err) => { console.error(err.message); process.exit(1); });
