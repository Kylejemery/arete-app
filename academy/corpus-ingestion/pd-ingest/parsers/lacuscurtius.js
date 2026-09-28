// pd-ingest/parsers/lacuscurtius.js — Bill Thayer's LacusCurtius pages.
//
// NOT YET CHECKED AGAINST A LIVE PAGE: the session that wrote this had no
// route to penelope.uchicago.edu. What is fixed is the method: citation
// anchors and page markers are recognised by patterns in the source
// definition (sources.js), and `node pd-ingest/stage.js --inspect <slug>`
// prints every id, name and class a cached page actually uses so the
// patterns can be set from evidence before anything is staged. A parse that
// misses the structure fails checkStructure and stages nothing.
//
// What the parser does with a page:
//   - keeps the page's own public-domain statement verbatim, for
//     license_evidence;
//   - cuts everything from the notes block on out of the body, and returns
//     each note separately with the citation of the passage that calls it;
//   - turns page markers ("p37") into printed_pages metadata, out of the text;
//   - turns note-call links into links, out of the text;
//   - drops navigation (tables, header and footer) by keeping only what
//     follows the first citation anchor.

const { htmlToText, nfc } = require('../lib');
const { CITE, PAGE, NOTE, splitMarked } = require('./common');

const DEFAULT_PATTERNS = {
  // An element whose id or name is a citation: <a id="37C">, <a name="3">.
  // The captured group is the raw citation, normalised by `cite(raw)`.
  citeAnchor: /<a\b[^>]*\b(?:id|name)\s*=\s*"([^"]+)"[^>]*>(?:\s*<\/a>)?/gi,
  citeId: /^\d+[A-F]?$/,
  // Page markers: an element classed pagenum, or an anchor id "p37".
  pageMarker: /<(\w+)\b[^>]*class="[^"]*\bpagenum\b[^"]*"[^>]*>[\s\S]*?<\/\1>|<a\b[^>]*\b(?:id|name)="p(\d+)"[^>]*>[\s\S]*?<\/a>/gi,
  // A link to a note: href="#note12" (optionally wrapped in <sup>).
  noteCall: /(?:<sup>\s*)?<a\b[^>]*href="#(note\d+|fn\d+|\d+note)"[^>]*>[\s\S]*?<\/a>(?:\s*<\/sup>)?/gi,
  // Where the notes block starts: the first element carrying a note id.
  notesStart: /<[^>]+\b(?:id|name)="(?:note1|fn1|1note)"/i,
  // One note: the element carrying the note id, to its own closing tag, so
  // the page footer after the last note never joins it.
  noteItem: /<(p|div|li|span)\b[^>]*\b(?:id|name)="(note\d+|fn\d+|\d+note)"[^>]*>([\s\S]*?)<\/\1>/gi,
};

function licenseStatements(html) {
  const text = htmlToText(html);
  const sentences = text.split(/(?<=[.!?])\s+|\n\n/);
  return [...new Set(sentences.filter((s) => /public domain/i.test(s)).map((s) => s.trim()))];
}

function pageNumberOf(markerHtml, directNumber) {
  if (directNumber) return directNumber;
  const m = htmlToText(markerHtml).match(/p\.?\s*(\d+)/i) || htmlToText(markerHtml).match(/(\d+)/);
  return m ? m[1] : null;
}

function parse(html, options = {}) {
  const pat = { ...DEFAULT_PATTERNS, ...(options.patterns || {}) };
  const cite = options.cite || ((raw) => raw);
  const src = String(html);

  const notesAt = src.search(pat.notesStart);
  const body = notesAt >= 0 ? src.slice(0, notesAt) : src;
  const notesHtml = notesAt >= 0 ? src.slice(notesAt) : '';

  const marked = body
    .replace(pat.pageMarker, (m, _tag, direct) => {
      const p = pageNumberOf(m, direct);
      return p ? PAGE(p) : ' ';
    })
    .replace(pat.noteCall, (_m, id) => NOTE(id))
    .replace(pat.citeAnchor, (m, id) => (pat.citeId.test(id) ? CITE(cite(id)) : m));

  // htmlToText strips the tags; the sentinels are plain characters and stay.
  const { front, sections } = splitMarked(htmlToText(marked), {
    parentOf: options.parentOf,
    labelOf: options.labelOf,
  });

  // Notes, each linked to the first section that calls it.
  const callers = new Map();
  for (const s of sections) for (const n of s.notes) if (!callers.has(n)) callers.set(n, s.cite);
  const notes = [];
  for (const m of notesHtml.matchAll(pat.noteItem)) {
    const text = nfc(htmlToText(m[3])).replace(/^\s*\d+\s*/, '').trim();
    if (text) notes.push({ id: m[2], text, annotates: callers.get(m[2]) || null });
  }

  return { front, sections, notes, licenseEvidence: licenseStatements(src), rawText: htmlToText(src) };
}

// For --inspect: every id/name and class on the page, with counts, and the
// first few of each, so the citation patterns can be set from what is there.
function inspect(html) {
  const ids = new Map();
  for (const m of String(html).matchAll(/\b(?:id|name)\s*=\s*"([^"]+)"/gi)) ids.set(m[1], (ids.get(m[1]) || 0) + 1);
  const classes = new Map();
  for (const m of String(html).matchAll(/\bclass\s*=\s*"([^"]+)"/gi)) {
    for (const c of m[1].split(/\s+/)) classes.set(c, (classes.get(c) || 0) + 1);
  }
  return {
    ids: [...ids.keys()],
    classes: [...classes.entries()].sort((a, b) => b[1] - a[1]),
    licenseEvidence: licenseStatements(html),
  };
}

module.exports = { parse, inspect, DEFAULT_PATTERNS, licenseStatements };
