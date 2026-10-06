// server/lib/citation-tag.js
//
// A short citation tag for every passage the Cabinet sees, so a counselor can
// put "(DL 7.179)" after a claim and a claim with no tag has nowhere to hide
// (server/lib/sourcing-discipline.js says what the model does with them).
//
//   Diogenes Laërtius / Lives of Eminent Philosophers / 7.179  → [DL 7.179]
//   Seneca / Letters / 104                                     → [Seneca, Ep. 104]
//   Musonius Rufus / Lectures / Lecture VI                     → [Musonius, Lecture VI]
//   Plutarch / Life of Cato the Younger / Plut. Cat. Min. 5.3  → [Plut. Cat. Min. 5.3]
//   Arete (AI-assisted) / <title> / {interpretive}             → [Arete synthesis, interpretive: <title>]
//   Cicero / De Finibus / (nothing)                            → [Cicero, De Finibus, no locator]
//
// The locator is used when present; otherwise a section_label that reads as a
// place in the work ("94", "Book VI", "Lecture VI", "pp. 161"); otherwise the
// tag says "no locator" outright rather than passing a chapter title off as
// one. The strength is returned beside the tag so the gap report and the eval
// share one definition of a weak tag.
//
// Like spoken-citation.js, the tag is generated from the row, never stored, so
// a locator backfill corrects it everywhere.

// Short forms for the authors and works the Cabinet cites most. A work entry
// of null means the author's name alone identifies it (DL has one work).
const AUTHOR_SHORT = [
  { match: /^diogenes la[eë]rtius$/i, short: 'DL', dropWork: true },
  { match: /^musonius rufus$/i, short: 'Musonius' },
  { match: /^marcus aurelius$/i, short: 'Marcus' },
  { match: /^seneca$/i, short: 'Seneca' },
  { match: /^epictetus$/i, short: 'Epictetus' },
];

const WORK_SHORT = [
  { match: /^(moral )?letters|^epistulae|^epistles/i, short: 'Ep.' },
  { match: /^meditations/i, short: 'Med.' },
  { match: /^discourses/i, short: 'Disc.' },
  { match: /^(enchiridion|handbook)/i, short: 'Ench.' },
  { match: /^lectures$/i, short: 'Lecture' },
];

// Synthesis authors (kept in step with SYNTHESIS_AUTHORS in corpus-fence.js;
// text_type is checked first, the author list covers rows without one).
const SYNTHESIS_AUTHOR = /^arete (synthesis|\(ai-assisted\))$/i;

// A section_label that names a place in the work rather than a heading.
// Mirrored in scripts/citation-tag-gaps.sql; change both together.
const LOCATOR_LIKE = /^((book|bk\.?|letter|ep\.?|epistle|lecture|chapter|ch\.?|fragment|fr\.?|section|sect\.?|§|pp?\.)\s*)?[0-9ivxlc]+[a-f]?([.,:]\s?[0-9ivxlc]+[a-f]?)*(\s?[–-]\s?[0-9ivxlc]+[a-f]?([.,:][0-9ivxlc]+[a-f]?)*)?$/i;

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// "Discourses (tr. Oldfather)" → "Discourses"; "Lives …, Book VII" → "Lives …".
function baseWork(work) {
  return clean(work)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/,\s*Book\s+[IVXLC\d]+\s*$/i, '')
    .trim();
}

// Chunkers append "(2/4)" to a label they split; it is not a locator. Some
// labels repeat the work's title ("On Clemency 1.1", "Consolation to Helvia
// 1–Consolation to Helvia 2"); the title is dropped so the number can stand.
function sectionLocator(label, work = '') {
  let s = clean(label).replace(/\s*\(\d+\/\d+\)$/, '');
  if (work) s = s.split(work).join('').replace(/\s*([–-])\s*/g, '$1').trim();
  return s && LOCATOR_LIKE.test(s) ? s : '';
}

function synthesisLabel(row) {
  const vs = Array.isArray(row.verification_status) ? row.verification_status.filter(Boolean) : [];
  const status = vs.length ? vs.map(v => String(v).replace(/_/g, ' ')).join(', ') : 'unverified';
  return `Arete synthesis, ${status}`;
}

/**
 * @param {object} row  a rag_corpus row (author, work, section_label, locator,
 *                      text_type, verification_status) or a legacy source
 *                      chunk (source_title)
 * @returns {{ tag: string, strength: 'locator'|'section'|'weak'|'empty'|'synthesis' }}
 */
function citationTag(row = {}) {
  const author = clean(row.author);
  const work = baseWork(row.work);

  if (row.text_type === 'synthesis' || SYNTHESIS_AUTHOR.test(author)) {
    return { tag: `[${synthesisLabel(row)}${work ? `: ${work}` : ''}]`, strength: 'synthesis' };
  }

  // Legacy per-counselor source chunks carry a title and nothing else.
  if (!author && !work && row.source_title) {
    return { tag: `[${clean(row.source_title)}, no locator]`, strength: 'weak' };
  }
  if (!author || !work) {
    const who = author || work;
    return { tag: who ? `[${who}, no locator]` : '[unattributed passage]', strength: 'empty' };
  }

  const locator = clean(row.locator);
  // A locator written as a full citation ("Plut. Cat. Min. 5.3") stands alone.
  if (locator && /^[A-Z][a-z]*\.\s/.test(locator)) return { tag: `[${locator}]`, strength: 'locator' };

  const a = AUTHOR_SHORT.find(x => x.match.test(author));
  const w = WORK_SHORT.find(x => x.match.test(work));
  const who = a ? a.short : author;
  const what = a?.dropWork ? '' : (w ? w.short : work);
  const head = what ? `${who}, ${what}` : who;
  // "Ep. 104" and "DL 7.179" read with a space; "Cicero, De Finibus, 2.4" with a comma.
  const join = (place) => (w || a?.dropWork ? `${head} ${place}` : `${head}, ${place}`);

  if (locator) return { tag: `[${join(locator)}]`, strength: 'locator' };
  const section = sectionLocator(row.section_label, work);
  if (section) return { tag: `[${join(section)}]`, strength: 'section' };
  return { tag: `[${head}, no locator]`, strength: 'weak' };
}

// The kind of evidence a passage is, said beside the tag so a counselor never
// quotes a modern summary as the ancient author (sourcing rules 5 and 6).
// The label names the scholar, because a bare "(modern scholarship)" was not
// enough: the 2026-10-05 eval had the Cabinet quote Arnold's paraphrase as
// Seneca's own words even with sourcing rule 9 in the prompt.
function layerNote(row = {}) {
  const who = clean(row.author) || 'the scholar';
  switch (row.text_type) {
    case 'scholarship':
      return ` — modern scholarship: these are ${who}'s words, not an ancient author's. Attribute any quotation to ${who}.`;
    case 'paper_summary':
      return ` — an Arete summary of ${who}'s modern scholarship: not a quotation of ${who} or of any ancient author.`;
    case 'synthesis':
      return ' — Arete teaching material, not ancient testimony.';
    default: return '';
  }
}

// match_rag_corpus does not return locator or verification_status, and
// retrieval is tuned and left alone, so the citation fields come from one
// lookup by id after ranking. Order and membership never change; a failed
// lookup leaves the rows as they were and the tags fall back to section_label.
async function attachCitationFields(supabase, rows) {
  const ids = [...new Set((rows || []).map(r => r?.id).filter(Boolean))];
  if (!supabase || ids.length === 0) return rows || [];
  try {
    const { data, error } = await supabase
      .from('rag_corpus')
      .select('id, locator, verification_status')
      .in('id', ids);
    if (error || !Array.isArray(data)) return rows;
    const byId = new Map(data.map(d => [d.id, d]));
    return rows.map(r => {
      const d = byId.get(r?.id);
      return d ? { ...r, locator: d.locator ?? r.locator ?? null, verification_status: d.verification_status ?? r.verification_status ?? null } : r;
    });
  } catch (err) {
    console.error('[citation-tag] locator lookup failed:', err.message || err);
    return rows;
  }
}

// One passage as the model sees it: tag first, then the text.
function formatTaggedPassage(row) {
  const { tag } = citationTag(row);
  return `${tag}${layerNote(row)}\n${row.chunk_text ?? row.content ?? ''}`;
}

module.exports = { citationTag, layerNote, attachCitationFields, formatTaggedPassage, LOCATOR_LIKE };
