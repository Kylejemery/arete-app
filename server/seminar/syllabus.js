// server/seminar/syllabus.js
//
// The Seminar Builder's syllabus step (Seminar Track spec, Part 4). Kyle sets
// a course's source works, stance and one paragraph intent; the Syllabus
// agent (Opus) proposes 6 to 10 units; Kyle edits the proposal in the
// builder; approval turns it into seminar_units and seminar_readings rows.
//
// What the agent reads:
//   * the full text of every source work held in research_sources, section
//     by section from its locator index (all 48 laws, for SEM 801), so the
//     units are built from the book and not from summaries;
//   * the corpus catalog (seminar_corpus_catalog()): every live work with its
//     section labels, so counter readings name real sections.
//
// What the agent does not decide: access and locators for indexed sources.
// Approval derives both. An indexed section's locator is its law and printed
// pages from the index; access follows licence (a research source is the
// student's own copy; a corpus primary or public domain scholarship text is
// read in full; a paper summary is the student's own copy with the summary).
// A corpus reading is resolved to chunk ids by its section labels, or, for a
// work whose chunks carry no labels, by a search inside that work, which the
// builder marks for Kyle to check.

const { callClaude, textOf, extractJson } = require('../synthesis/shared');
const { findDashes } = require('./verify');

const SYLLABUS_MODEL = 'claude-opus-5-5';
// Above this many characters of source text the agent gets each section's
// opening and Reversal instead of the whole text, and the run says so.
const MAX_SOURCE_CHARS = Number(process.env.SEMINAR_SYLLABUS_MAX_SOURCE_CHARS || 1400000);
const UNITS = { min: 6, max: 10 };
const SEARCH_CHUNKS = 6;
const FULL_TEXT_TYPES = new Set(['primary', 'scholarship', 'modern_primary']);

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

const key = (a, w) => `${String(a).toLowerCase()}|${String(w).toLowerCase()}`;

// The live research_sources rows for the course's source works, with their
// locator index.
async function loadIndexedSources(supabase, sourceWorks) {
  const out = [];
  for (const w of sourceWorks || []) {
    const rows = await must(
      supabase.from('research_sources').select('id, author, work, licence_status').eq('author', w.author).eq('work', w.work).eq('deprecated', false),
      `research source ${w.work}`
    );
    const src = rows.find(r => r.licence_status !== 'unconfirmed');
    if (!src) continue;
    const sections = await must(
      supabase.from('research_source_sections').select('key, label, title, page_start, page_end, parts, char_start, char_end, position')
        .eq('source_id', src.id).eq('deprecated', false).order('position', { ascending: true }),
      `sections of ${w.work}`
    );
    out.push({ ...src, role: w.role, sections });
  }
  return out;
}

const sectionLocator = s => `${s.label}, pp. ${s.page_start} to ${s.page_end}`;

// Each section's text, or its opening and Reversal when the whole would not
// fit. Returns {text, abridged}.
async function sourceText(supabase, sources) {
  let total = 0;
  for (const s of sources) for (const x of s.sections) total += x.char_end - x.char_start;
  const abridged = total > MAX_SOURCE_CHARS;
  const parts = [];
  for (const s of sources) {
    for (const x of s.sections) {
      const full = await must(supabase.rpc('research_source_section_text', { p_source: s.id, p_key: x.key }), `section ${x.key}`);
      let body = full || '';
      if (abridged) {
        const rev = x.parts?.reversal != null ? body.slice(x.parts.reversal - x.char_start) : '';
        body = `${body.slice(0, 6000)}\n[...]\n${rev.slice(0, 4000)}`;
      }
      parts.push(`=== ${s.author}, ${s.work}: section "${x.key}" (${sectionLocator(x)}${x.title ? `; ${x.title}` : ''}) ===\n${body}`);
    }
  }
  return { text: parts.join('\n\n'), abridged, total };
}

function catalogBlock(catalog) {
  return catalog.map(c => `${c.author}, ${c.work} [${c.text_type}, ${c.chunks} chunks]: ${c.labels.length ? c.labels.join(' | ') : '(no section labels: give a "search" phrase instead)'}`).join('\n');
}

const SYSTEM = `You design a seminar course for the Arete Academy, a doctoral programme in Stoic philosophy. Each unit pairs an assigned reading from the course's source works with counter readings from the Stoic corpus, and ends in a Socratic Proctor session.

Rules, all binding:
1. ${UNITS.min} to ${UNITS.max} units, in teaching order. Each unit: a title, 2 to 4 objectives (what the student can do after it), key concepts (single Stoic terms where possible, such as assent, prohairesis, the indifferents, oikeiosis), and a proctor brief (what the Proctor should probe and what mastery looks like, in two to four sentences).
2. Readings. An assigned reading from an indexed source names its section by key (for example "law-15"); each such reading is the complete section. Counter readings come only from the corpus catalog given, by exact section labels copied from it. For a catalog work without section labels, give a short "search" phrase naming the passage (for example "the honourable and the useful, Book 3") instead of labels. Never name a work or a label that is not in the material.
3. Every reading has a reading guide: two or three sentences on what to look for before reading.
4. When the course reads a work as an opponent (stance counterposition), the units cross-examine it from the Stoic texts. Place every section of the source somewhere, grouped where the text argues for it; you may regroup any units the intent suggests. The Reversal parts of each section matter most, because there the author admits the limits of his own rule.
5. Never use an em dash or an en dash anywhere. Use commas, colons, semicolons or parentheses.

Return only JSON:
{"objectives": ["<course objective>"], "units": [{"unit_number": 1, "title": "...", "objectives": ["..."], "key_concepts": ["..."], "proctor_brief": "...", "readings": [{"source": "indexed", "author": "...", "work": "...", "section_key": "law-15", "role": "assigned", "reading_guide": "..."}, {"source": "corpus", "author": "...", "work": "...", "section_labels": ["..."], "role": "counter_reading", "reading_guide": "..."}, {"source": "corpus", "author": "...", "work": "...", "search": "...", "locator": "<how a reader finds it, e.g. Book 3>", "role": "counter_reading", "reading_guide": "..."}]}]}`;

/**
 * @returns {Promise<{draft: object, abridged: boolean, source_chars: number}>}
 */
async function proposeSyllabus(supabase, course, { call = callClaude, model = SYLLABUS_MODEL } = {}) {
  const sources = await loadIndexedSources(supabase, course.source_works);
  const { text, abridged, total } = await sourceText(supabase, sources);
  const catalog = await must(supabase.rpc('seminar_corpus_catalog'), 'corpus catalog');
  const userPrompt = `COURSE: ${course.id}, ${course.title}${course.subtitle ? `: ${course.subtitle}` : ''}
Stance: ${course.stance}. Tier: ${course.tier_required}.
Source works: ${JSON.stringify(course.source_works)}
Kyle's intent: ${course.intent || '(none given)'}
${course.description ? `Description: ${course.description}\n` : ''}${course.syllabus_draft?.notes ? `Kyle's notes on the last proposal: ${course.syllabus_draft.notes}\n` : ''}
INDEXED SOURCES${abridged ? ' (ABRIDGED: each section is given as its opening and its Reversal, because the whole exceeds the reading budget)' : ' (FULL TEXT)'}:
${sources.length ? sources.map(s => `${s.author}, ${s.work}: sections ${s.sections.map(x => `${x.key} (${sectionLocator(x)})`).join('; ')}`).join('\n') : '(none)'}

${text}

CORPUS CATALOG (author, work [layer, size]: section labels in reading order):
${catalogBlock(catalog)}`;
  const data = await call({ model, system: SYSTEM, userPrompt, maxTokens: 16000 });
  const draft = extractJson(textOf(data));
  if (!draft || !Array.isArray(draft.units) || !draft.units.length) throw new Error('the syllabus agent returned no units');
  return { draft, abridged, source_chars: total };
}

// Structural problems in a (possibly hand edited) draft, before approval.
function validateSyllabus(draft) {
  const problems = [...findDashes(draft, 'syllabus').map(p => p.detail)];
  const units = Array.isArray(draft?.units) ? draft.units : [];
  if (units.length < UNITS.min || units.length > UNITS.max) problems.push(`${units.length} units; a syllabus has ${UNITS.min} to ${UNITS.max}`);
  units.forEach((u, i) => {
    const at = `unit ${i + 1}`;
    if (u.unit_number !== i + 1) problems.push(`${at} is numbered ${u.unit_number}`);
    if (!String(u.title || '').trim()) problems.push(`${at} has no title`);
    if (!Array.isArray(u.objectives) || !u.objectives.length) problems.push(`${at} has no objectives`);
    if (!String(u.proctor_brief || '').trim()) problems.push(`${at} has no proctor brief`);
    if (!Array.isArray(u.readings) || !u.readings.some(r => r.role === 'assigned')) problems.push(`${at} has no assigned reading`);
    (u.readings || []).forEach((r, j) => {
      const rat = `${at}, reading ${j + 1}`;
      if (!['assigned', 'counter_reading', 'optional'].includes(r.role)) problems.push(`${rat}: role "${r.role}"`);
      if (r.source === 'indexed' && !r.section_key) problems.push(`${rat}: an indexed reading needs a section_key`);
      if (r.source === 'corpus' && !(r.section_labels?.length || r.search)) problems.push(`${rat}: a corpus reading needs section_labels or a search phrase`);
      if (r.source !== 'indexed' && r.source !== 'corpus') problems.push(`${rat}: source "${r.source}"`);
    });
  });
  return problems;
}

// Greene's summaries are grouped by law ranges ("Laws 13-16 (...)"); these
// are the summary chunks covering one law.
function summaryCoversLaw(sectionLabel, law) {
  const m = String(sectionLabel || '').match(/Laws?\s+(\d+)\s*[-to]+\s*(\d+)/i);
  if (m) return law >= +m[1] && law <= +m[2];
  const one = String(sectionLabel || '').match(/^Law\s+(\d+)\b/i);
  return !!one && +one[1] === law;
}

/**
 * Resolves every reading of an approved draft to a seminar_readings row.
 * @param {function} search  (author, work, phrase) -> chunk rows, for
 *                           unlabelled works
 * @returns {Promise<{rows: object[][], problems: string[], searched: string[]}>}
 */
async function resolveReadings(supabase, course, draft, search) {
  const sources = await loadIndexedSources(supabase, course.source_works);
  const byWork = new Map(sources.map(s => [key(s.author, s.work), s]));
  const problems = [];
  const searched = [];
  const rows = [];
  for (const u of draft.units) {
    const unitRows = [];
    for (const [j, r] of (u.readings || []).entries()) {
      const at = `unit ${u.unit_number}, reading ${j + 1} (${r.author}, ${r.work})`;
      const base = { position: j + 1, author: r.author, work: r.work, role: r.role, reading_guide: r.reading_guide || null };
      if (r.source === 'indexed') {
        const src = byWork.get(key(r.author, r.work));
        const sec = src?.sections.find(x => x.key === r.section_key);
        if (!sec) { problems.push(`${at}: no indexed section "${r.section_key}"`); continue; }
        const law = Number((sec.key.match(/^law-(\d+)$/) || [])[1]);
        let summaryIds = [];
        if (law) {
          const sums = await must(
            supabase.from('rag_corpus').select('id, section_label, chunk_index').eq('author', r.author).eq('work', r.work).eq('deprecated', false),
            `summaries of ${r.work}`
          );
          summaryIds = sums.filter(s => summaryCoversLaw(s.section_label, law)).sort((a, b) => a.chunk_index - b.chunk_index).map(s => s.id);
        }
        unitRows.push({ ...base, locator: sectionLocator(sec), access: 'own_copy', rag_chunk_ids: summaryIds, research_source_id: src.id, research_section_key: sec.key });
        continue;
      }
      let chunks;
      if (r.section_labels?.length) {
        chunks = await must(
          supabase.from('rag_corpus').select('id, section_label, chunk_index, text_type').eq('author', r.author).eq('work', r.work).eq('deprecated', false).in('section_label', r.section_labels),
          `chunks of ${r.work}`
        );
        const found = new Set(chunks.map(c => c.section_label));
        const missing = r.section_labels.filter(l => !found.has(l));
        if (missing.length) problems.push(`${at}: no live chunks labelled ${missing.map(l => `"${l}"`).join(', ')}`);
      } else {
        chunks = await search(r.author, r.work, r.search);
        searched.push(`${at}: located by searching "${r.search}"; check the passage`);
      }
      if (!chunks.length) { problems.push(`${at}: nothing found`); continue; }
      chunks.sort((a, b) => a.chunk_index - b.chunk_index);
      const layer = chunks[0].text_type;
      const locator = r.section_labels?.length
        ? (r.section_labels.length === 1 ? r.section_labels[0] : `${r.section_labels[0]} to ${r.section_labels[r.section_labels.length - 1]}`)
        : (r.locator || r.search);
      unitRows.push({ ...base, locator, access: FULL_TEXT_TYPES.has(layer) ? 'full_text_corpus' : 'own_copy', rag_chunk_ids: chunks.map(c => c.id) });
    }
    rows.push(unitRows);
  }
  return { rows, problems, searched };
}

/**
 * Approval: the draft becomes units and readings. Refused when the draft
 * has problems, when any reading cannot be resolved, or when the course
 * already has units (approval happens once; later changes edit units).
 */
async function approveSyllabus(supabase, courseId, { search }) {
  const course = await must(supabase.from('seminar_courses').select('*').eq('id', courseId).single(), 'course');
  const draft = course.syllabus_draft?.proposal;
  if (!draft) return { ok: false, problems: ['there is no syllabus proposal to approve'] };
  const existing = await must(supabase.from('seminar_units').select('id').eq('course_id', courseId), 'existing units');
  if (existing.length) return { ok: false, problems: ['this course already has units; edit them instead of approving a new syllabus'] };
  const problems = validateSyllabus(draft);
  if (problems.length) return { ok: false, problems };
  const resolved = await resolveReadings(supabase, course, draft, search);
  if (resolved.problems.length) return { ok: false, problems: resolved.problems };

  const units = [];
  for (const [i, u] of draft.units.entries()) {
    const unit = await must(supabase.from('seminar_units').insert({
      course_id: courseId,
      unit_number: u.unit_number,
      title: u.title,
      objectives: u.objectives,
      key_concepts: u.key_concepts || [],
      proctor_brief: u.proctor_brief,
      status: 'draft',
    }).select().single(), `unit ${u.unit_number}`);
    for (const r of resolved.rows[i]) {
      await must(supabase.from('seminar_readings').insert({ ...r, unit_id: unit.id }).select().single(), `reading for unit ${u.unit_number}`);
    }
    units.push(unit);
  }
  await must(supabase.from('seminar_courses').update({
    objectives: draft.objectives || course.objectives,
    status: 'in_review',
    syllabus_draft: { ...course.syllabus_draft, approved_at: new Date().toISOString(), searched: resolved.searched },
  }).eq('id', courseId).select().single(), 'course');
  return { ok: true, units: units.length, searched: resolved.searched };
}

// A unit can be published once it has an approved, active transcript.
async function publishUnit(supabase, unitId) {
  const active = await must(supabase.from('seminar_transcripts').select('id').eq('unit_id', unitId).eq('is_active', true), 'active transcript');
  if (!active.length) return { ok: false, reason: 'the unit has no approved transcript' };
  const unit = await must(supabase.from('seminar_units').update({ status: 'published' }).eq('id', unitId).select().single(), 'publish unit');
  return { ok: true, unit };
}

// A course goes live once every unit is published.
async function publishCourse(supabase, courseId) {
  const units = await must(supabase.from('seminar_units').select('id, unit_number, status').eq('course_id', courseId), 'units');
  if (!units.length) return { ok: false, reason: 'the course has no units' };
  const open = units.filter(u => u.status !== 'published').map(u => u.unit_number).sort((a, b) => a - b);
  if (open.length) return { ok: false, reason: `units not yet published: ${open.join(', ')}` };
  const course = await must(supabase.from('seminar_courses').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', courseId).select().single(), 'publish course');
  return { ok: true, course };
}

module.exports = {
  SYLLABUS_MODEL, UNITS, SEARCH_CHUNKS,
  loadIndexedSources, proposeSyllabus, validateSyllabus, summaryCoversLaw, resolveReadings,
  approveSyllabus, publishUnit, publishCourse,
};
