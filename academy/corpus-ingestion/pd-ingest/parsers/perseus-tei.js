// pd-ingest/parsers/perseus-tei.js — a Perseus Digital Library TEI (EpiDoc,
// CTS) translation: <div subtype="chapter" n="5"> holding
// <div subtype="section" n="3">, as in PerseusDL/canonical-greekLit.
// Written for Perrin's Cato the Younger (tlg0007.tlg050.perseus-eng2) and read
// against that file, not against a synthetic fixture.
//
// What it does with the file:
//   - one section per <div subtype="section">, cited "<chapter>.<section>",
//     with the chapter as the parent a chunk never crosses;
//   - <note> (the translator's footnotes, inline in the TEI) leaves the body
//     and is returned as a note linked to the section that holds it, as the
//     LacusCurtius parser does with its notes block. An empty <note/> is
//     dropped and counted;
//   - <q> is printed with quotation marks, since the TEI keeps the quotation
//     as markup and drops the printed marks: “…”, and ‘…’ inside a quotation.
//     A quotation that runs on into the next section is marked there with
//     rend="merge"; the earlier part is then left open, as a printed speech
//     that runs over a paragraph break is;
//   - verse lines (<l>) are joined with " / ";
//   - `fixes` ([pattern, replacement, label]) are applied to the raw XML
//     first. Each must match, or the source is refused: a fix that no longer
//     matches means the file changed under it.

const { htmlToText, nfc } = require('../lib');
const { CITE, NOTE, splitMarked } = require('./common');

const CHAPTER = /<div\b[^>]*\bsubtype="chapter"[^>]*\bn="([^"]+)"[^>]*>/g;
const SECTION = /<div\b[^>]*\bsubtype="section"[^>]*\bn="([^"]+)"[^>]*>/g;

// Quotation marks from <q> nesting. `</q data-open>` closes without a mark.
function renderQuotes(html) {
  let depth = 0;
  return html.replace(/<q\b[^>]*>|<\/q( data-open)?>/g, (tag, open) => {
    if (tag.startsWith('<q')) {
      depth += 1;
      return depth % 2 ? '“' : '‘';
    }
    const mark = depth % 2 ? '”' : '’';
    depth = Math.max(0, depth - 1);
    return open ? '' : mark;
  });
}

// Inline markup (a Latin word, a gloss, a cited title) leaves no space of its
// own, so "(<gloss>soul</gloss>)" reads "(soul)".
function inline(html) {
  return renderQuotes(String(html))
    .replace(/<\/?(foreign|gloss|title|bibl|hi|emph|name)\b[^>]*>/g, '')
    .replace(/<\/l>\s*<l>/g, ' / ')
    .replace(/<\/?(l|quote|lg)\b[^>]*>/g, ' ');
}

function parse(xml, options = {}) {
  const reasons = [];
  const warnings = [];
  let src = String(xml);

  for (const [re, to, label] of options.fixes || []) {
    const n = (src.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)) || []).length;
    if (!n) reasons.push(`fix no longer matches: ${label}`);
    else warnings.push(`fix: ${label} (${n}×)`);
    src = src.replace(re, to);
  }

  const bodyAt = src.search(/<body\b/);
  const bodyEnd = src.lastIndexOf('</body>');
  if (bodyAt < 0 || bodyEnd < 0) return { front: '', sections: [], notes: [], reasons: ['no <body> in the TEI'], warnings, rawText: src };
  const body = src.slice(bodyAt, bodyEnd).replace(/<head\b[^>]*>[\s\S]*?<\/head>/g, ' ');

  // Sections in reading order, each with its chapter.
  const opens = [];
  for (const m of body.matchAll(CHAPTER)) opens.push({ at: m.index, end: m.index + m[0].length, chapter: m[1] });
  for (const m of body.matchAll(SECTION)) opens.push({ at: m.index, end: m.index + m[0].length, section: m[1] });
  opens.sort((a, b) => a.at - b.at);
  const raw = [];
  let chapter = null;
  for (let i = 0; i < opens.length; i++) {
    const o = opens[i];
    if (o.chapter != null) { chapter = o.chapter; continue; }
    const next = opens[i + 1] ? opens[i + 1].at : body.length;
    raw.push({ cite: `${chapter}.${o.section}`, html: body.slice(o.end, next) });
  }

  // A quotation continued in the next section stays open in this one.
  for (let i = 1; i < raw.length; i++) {
    if (/^\s*<p>\s*<q\b[^>]*\brend="merge"/.test(raw[i].html)) {
      const k = raw[i - 1].html.lastIndexOf('</q>');
      if (k < 0) { reasons.push(`${raw[i].cite} continues a quotation that ${raw[i - 1].cite} does not hold`); continue; }
      raw[i - 1].html = `${raw[i - 1].html.slice(0, k)}</q data-open>${raw[i - 1].html.slice(k + 4)}`;
    }
  }

  // Notes out of the body, in order; an empty one is dropped.
  const notes = [];
  let emptyNotes = 0;
  let marked = '';
  for (const s of raw) {
    const html = s.html
      .replace(/<note\b[^>]*\/>/g, () => { emptyNotes += 1; return ''; })
      .replace(/<note\b[^>]*>([\s\S]*?)<\/note>/g, (_m, inner) => {
        const id = `note${notes.length + 1}`;
        notes.push({ id, text: nfc(htmlToText(inline(inner))).replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim(), annotates: s.cite });
        return NOTE(id);
      });
    marked += `${CITE(s.cite)}${htmlToText(inline(html))}\n\n`;
  }
  if (emptyNotes) warnings.push(`${emptyNotes} empty <note/> dropped (no note text in the TEI)`);

  const { front, sections } = splitMarked(marked, {
    parentOf: (c) => String(c).split('.')[0],
    labelOf: options.labelOf,
  });

  return {
    front, sections, notes: notes.filter((n) => n.text), reasons, warnings,
    licenseEvidence: [],
    rawText: htmlToText(src),
  };
}

function inspect(xml) {
  const src = String(xml);
  const tags = new Map();
  for (const m of src.matchAll(/<([A-Za-z]+)\b/g)) tags.set(m[1], (tags.get(m[1]) || 0) + 1);
  return {
    chapters: [...src.matchAll(CHAPTER)].length,
    sections: [...src.matchAll(SECTION)].length,
    tags: [...tags.entries()].sort((a, b) => b[1] - a[1]),
  };
}

module.exports = { parse, inspect, renderQuotes };
