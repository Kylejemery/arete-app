// server/seminar/context.js
//
// Everything the Outline and Draft agents may read for one unit, and nothing
// else (Seminar Track spec, Part 3). Material comes from three places:
//
//   readings     the unit's seminar_readings. full_text_corpus readings bring
//                their rag_corpus chunks, in order. A reading tied to a
//                research_sources section (Greene's chapters) brings that
//                section's full text, read server side through
//                research_source_section_text(); the text informs the
//                transcript and is never copied into it (the quotation check
//                in verify.js holds the line at 60 words).
//   neighbours   passages nearest the unit's key_concepts, found through each
//                concept's canonical_concepts embedding on the modern fence
//                (server/lib/corpus-fence.js), so a counterposition chunk can
//                never arrive by retrieval.
//   labels       every block says what it is. A counterposition block is
//                marked OBJECT UNDER EXAMINATION, so the agents meet the
//                opponent only as the thing being examined.
//
// The loader takes the Supabase client and the embedder as arguments; the
// tests pass fakes.

const { modernFenceParams, COUNTERPOSITION_TEXT_TYPES } = require('../lib/corpus-fence');

// Chunk text types that summarize copyrighted work. Their wording is
// checked for copied runs like a quotation_only source.
const SUMMARY_TEXT_TYPES = new Set(['paper_summary', 'modern_summary', ...COUNTERPOSITION_TEXT_TYPES]);
const NEIGHBOURS_PER_CONCEPT = 2;
const MAX_NEIGHBOURS = 12;

const parseEmbedding = e => (typeof e === 'string' ? JSON.parse(e) : e);

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/**
 * @returns {Promise<{course, unit, readings, blocks, passages, sections, quotationSources}>}
 *   blocks    [{ref, kind, label, text, counterposition}] in reading order,
 *             then neighbours; refs are R1.. for readings, P1.. for passages
 *   passages  Map ref -> {chunk_id, author, work, section_label}
 *   sections  Map ref -> the seminar_readings row the R ref stands for
 */
async function loadUnitContext(supabase, unitId) {
  const unit = await must(supabase.from('seminar_units').select('*').eq('id', unitId).single(), 'unit');
  const course = await must(supabase.from('seminar_courses').select('*').eq('id', unit.course_id).single(), 'course');
  const readings = await must(
    supabase.from('seminar_readings').select('*').eq('unit_id', unitId).order('position', { ascending: true }),
    'readings'
  );

  const blocks = [];
  const passages = new Map();
  const sections = new Map();
  const quotationSources = [];
  let p = 0;

  const chunkIds = [...new Set(readings.flatMap(r => r.rag_chunk_ids || []))];
  const chunks = chunkIds.length
    ? await must(
      supabase.from('rag_corpus').select('id, author, work, section_label, chunk_text, text_type, deprecated').in('id', chunkIds),
      'reading chunks'
    )
    : [];
  const chunkById = new Map(chunks.map(c => [c.id, c]));

  for (const [i, r] of readings.entries()) {
    const ref = `R${i + 1}`;
    sections.set(ref, r);
    const head = `${r.author}, ${r.work}, ${r.locator} (${r.role}${r.reading_guide ? `; guide: ${r.reading_guide}` : ''})`;

    if (r.research_source_id && r.research_section_key) {
      const text = await must(
        supabase.rpc('research_source_section_text', { p_source: r.research_source_id, p_key: r.research_section_key }),
        `research section ${r.research_section_key}`
      );
      if (!text) throw new Error(`reading ${ref}: research section ${r.research_section_key} is not readable`);
      const counter = course.stance !== 'aligned' && r.role === 'assigned';
      blocks.push({
        ref, kind: 'full_text', counterposition: counter,
        label: `${ref} ${counter ? 'OBJECT UNDER EXAMINATION. ' : ''}FULL TEXT, PRIVATE COPY: ${head}. Pages are marked [p. N]. Read it, do not copy it: at most 60 words of it may appear in the transcript, attributed.`,
        text,
      });
      quotationSources.push({ label: `${r.author}, ${r.work}, ${r.locator}`, text });
    } else {
      blocks.push({ ref, kind: 'reading', counterposition: false, label: `${ref} READING: ${head}`, text: '' });
    }

    for (const id of r.rag_chunk_ids || []) {
      const c = chunkById.get(id);
      if (!c || c.deprecated) throw new Error(`reading ${ref}: chunk ${id} is missing or deprecated`);
      const pref = `P${++p}`;
      const counter = COUNTERPOSITION_TEXT_TYPES.includes(c.text_type);
      passages.set(pref, { chunk_id: c.id, author: c.author, work: c.work, section_label: c.section_label });
      blocks.push({
        ref: pref, kind: 'passage', counterposition: counter,
        label: `${pref} ${counter ? 'OBJECT UNDER EXAMINATION. ' : ''}${c.text_type.toUpperCase()} (for ${ref}): ${c.author}, ${c.work}${c.section_label ? `, ${c.section_label}` : ''}`,
        text: c.chunk_text,
      });
      if (SUMMARY_TEXT_TYPES.has(c.text_type)) {
        quotationSources.push({ label: `${c.author}, ${c.work} (summary)`, text: c.chunk_text });
      }
    }
  }

  // Canonical concept neighbours, on the modern fence.
  const concepts = (unit.key_concepts || []).filter(Boolean);
  if (concepts.length) {
    const rows = await must(supabase.from('canonical_concepts').select('name, embedding').in('name', concepts), 'concepts');
    const seen = new Set(chunkIds);
    for (const row of rows) {
      if (passages.size - chunkIds.length >= MAX_NEIGHBOURS) break;
      const hits = await must(supabase.rpc('match_rag_corpus', {
        query_embedding: parseEmbedding(row.embedding),
        match_count: NEIGHBOURS_PER_CONCEPT,
        ...modernFenceParams(),
      }), `neighbours of ${row.name}`);
      for (const h of hits || []) {
        if (seen.has(h.id) || COUNTERPOSITION_TEXT_TYPES.includes(h.text_type)) continue;
        seen.add(h.id);
        const pref = `P${++p}`;
        passages.set(pref, { chunk_id: h.id, author: h.author, work: h.work, section_label: h.section_label });
        blocks.push({
          ref: pref, kind: 'neighbour', counterposition: false,
          label: `${pref} NEIGHBOUR of the concept "${row.name}": ${h.author}, ${h.work}${h.section_label ? `, ${h.section_label}` : ''}`,
          text: h.chunk_text,
        });
        if (SUMMARY_TEXT_TYPES.has(h.text_type)) quotationSources.push({ label: `${h.author}, ${h.work} (summary)`, text: h.chunk_text });
      }
    }
  }

  return { course, unit, readings, blocks, passages, sections, quotationSources };
}

// Turns an agent's cite refs into stored cites. {ref: "P3"} is a corpus
// chunk; {ref: "R1", page: "109"} or {ref: "R2", section: "2.32"} points
// inside a reading. An unknown ref becomes a cite the verifier will reject,
// so a model can never invent a chunk id.
function resolveCite(c, ctx) {
  const ref = typeof c === 'string' ? c : c && c.ref;
  if (ctx.passages.has(ref)) {
    const x = ctx.passages.get(ref);
    return { author: x.author, work: x.work, locator: x.section_label || '', chunk_id: x.chunk_id };
  }
  const r = ctx.sections.get(ref);
  if (!r) return { author: '?', work: '?', locator: `unknown reference ${ref}` };
  const law = (String(r.locator).match(/\bLaws?\s+\d+|Preface/i) || [])[0];
  let locator = r.locator;
  if (c.page) locator = `${law ? `${law}, ` : ''}p. ${c.page}`;
  else if (c.section) locator = String(c.section);
  return { author: r.author, work: r.work, locator };
}

module.exports = { loadUnitContext, resolveCite, SUMMARY_TEXT_TYPES };
