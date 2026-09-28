// pd-ingest/parsers/summary-md.js — an English summary written in the repo,
// for a work the corpus holds only in a language English retrieval does not
// reach (Bréhier's Chrysippe, French). Mode 2 in form: the summary is our own
// words, and it enters as text_type 'paper_summary'.
//
// The file is Markdown. Everything before the first `## ` heading is front
// matter and is not staged. Each `## ` section becomes exactly one chunk, so
// a section is written to stand alone at retrieval (about 250–400 words):
//
//   ## Fate and responsibility (pp. 187–199)
//   Paragraphs…
//
// The page range in the heading is the part of the original the section
// summarises; it becomes printed_pages and stays in the label. A heading
// without a page range, or a section over 700 words, is refused rather than
// guessed around.

const { nfc, countWords } = require('../lib');

const HEADING = /^##\s+(.+?)\s*\(pp?\.\s*(\d+)(?:\s*[-–]\s*(\d+))?\)\s*$/;

function parse(text) {
  const src = nfc(text);
  const sections = [];
  const reasons = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const body = cur.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const words = countWords(body);
    if (!words) reasons.push(`section "${cur.title}" is empty`);
    if (words > 700) reasons.push(`section "${cur.title}" has ${words} words; split it (one section is one chunk)`);
    const pages = cur.last && cur.last !== cur.first ? [cur.first, cur.last] : [cur.first];
    sections.push({
      cite: `pp. ${pages.join('–')}`,
      parent: `section ${sections.length + 1}`, // one section, one chunk: never merged
      label: `${cur.title} (pp. ${pages.join('–')})`,
      text: body,
      pages,
      notes: [],
    });
    cur = null;
  };

  for (const line of src.split('\n')) {
    if (line.startsWith('## ')) {
      flush();
      const m = line.match(HEADING);
      if (!m) {
        reasons.push(`heading without a page range: "${line.trim()}"`);
        cur = { title: line.slice(3).trim(), first: '?', last: null, lines: [] };
      } else {
        cur = { title: m[1], first: m[2], last: m[3] || null, lines: [] };
      }
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  flush();
  if (!sections.length) reasons.push('no `## ` sections found');

  return { front: '', sections, notes: [], rawText: src, reasons, warnings: [], ocr: null };
}

module.exports = { parse };
