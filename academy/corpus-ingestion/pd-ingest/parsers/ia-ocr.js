// pd-ingest/parsers/ia-ocr.js — Internet Archive OCR text (`_djvu.txt`) for
// the Tier 2 scans (Bonhöffer 1890, Halbauer 1911, Schenkl 1916) and the
// Oldfather Loeb volumes, and a PDF's text layer as extract-pdf.py writes it.
//
// There is no canonical citation, so the unit is the printed page (spec,
// Chunking 6). The text separates scan leaves with a form feed; a leaf's
// printed page number is read from a short numeric first or last line, and a
// leaf with none (plates, blanks) keeps its leaf number marked "leaf N" so it
// is never mistaken for a printed page.
//
// Two options for scans whose pages open with a running head ("14 STOIC AND
// EPICUREAN", "Seneca and Kant. 55") rather than a bare number:
//
//   stripRunningHeads  drop a first line that is a running head: a short line
//                      with a page number at one end, or one matching
//                      `runningHead`. A signature mark at the foot of a leaf
//                      ("CHRYSIPPE. 10") goes the same way.
//   pageOffset         printed page = leaf number - pageOffset. OCR mangles
//                      the numerals in running heads ("8o", "loi"), and a
//                      scan counts blank leaves, so the offset is the reliable
//                      source; it is checked against every head whose number
//                      does read cleanly, and a scan where more than one in
//                      ten disagree is refused rather than mis-paged.
//   chapterBreak       a pattern for a leaf's opening lines that starts a new
//                      chapter ("CHAPTER IV"). Each chapter is its own parent,
//                      so no page chunk runs from one chapter into the next.
//
// NOT YET CHECKED AGAINST A LIVE djvu FILE: if a file has no form feeds the
// parse fails its structure check rather than guessing page breaks.

const { nfc, garbleEstimate, ocrQuality } = require('../lib');

const PAGE_LINE = /^\s*[-–—]?\s*(\d{1,4})\s*[-–—]?\s*$/;
// A page number as OCR renders it at the edge of a running head: digits, or
// digits with the usual confusions (o for 0, l/I/i/n for 1, S for 8, ^ or /
// for a digit it could not read).
const NUMBERISH = /^[-–—]?[\dlIinoOSyx^/()]{1,4}[.,]?$/;

function upperShare(s) {
  const letters = s.replace(/[^\p{L}]/gu, '');
  if (!letters) return 0;
  return letters.replace(/[^\p{Lu}]/gu, '').length / letters.length;
}

const DIVISION = /^(CHAPTER|CHAPITRE|LIVRE|BOOK|SECTION|PART)\b/i;

function isRunningHead(line, runningHead) {
  const words = line.split(' ');
  if (words.length > 9 || DIVISION.test(line)) return false;
  if (runningHead && runningHead.test(line)) return true;
  const edges = [words[0], words[words.length - 1]];
  if (edges.some((w) => /\d/.test(w) && NUMBERISH.test(w))) return true;
  return edges.some((w) => NUMBERISH.test(w)) && upperShare(line) >= 0.7;
}

function readNumber(line) {
  const words = line.split(' ');
  for (const w of [words[0], words[words.length - 1]]) {
    const m = w.match(/^[-–—]?(\d{1,4})[.,]?$/);
    if (m) return Number(m[1]);
  }
  return null;
}

// A signature mark or stray OCR at the foot of a leaf: two words at most,
// either one or two characters long, or upper case with a small number.
function isFootMark(line) {
  const words = line.split(' ');
  if (words.length > 2) return false;
  if (line.replace(/\s/g, '').length <= 2 && !/^\d+$/.test(line)) return true;
  return words.length === 2 && /^\d{1,2}$/.test(words[1]) && upperShare(words[0]) >= 0.7 && words[0].length > 3;
}

function parse(text, options = {}) {
  const src = nfc(text);
  const leaves = src.split('\f');
  const sections = [];
  const reasons = [];
  const warnings = [];
  if (leaves.length < 3) reasons.push('no form-feed leaf breaks in the OCR text; page units cannot be recovered');

  let chapter = 0;
  let headsRead = 0;
  let headsAgree = 0;
  leaves.forEach((leaf, i) => {
    const n = i + 1;
    if (options.leafRange && (n < options.leafRange[0] || n > options.leafRange[1])) return;
    const lines = leaf.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!lines.length) return;
    let page = null;
    if (options.stripRunningHeads) {
      // A head OCR has broken up ("1" / "6" / "Seneca and Kant.") or with a
      // stray mark above it: fragments of one or two characters go first.
      while (lines.length > 1 && lines[0].replace(/\s/g, '').length <= 2) lines.shift();
      if (isRunningHead(lines[0], options.runningHead)) {
        const read = readNumber(lines.shift());
        if (read != null) page = String(read);
      }
      // The foot of a leaf is a footnote or a signature mark, never a page
      // number, in a scan whose numbers sit in the running head.
      if (lines.length && isFootMark(lines[lines.length - 1])) lines.pop();
    } else if (PAGE_LINE.test(lines[0])) page = lines.shift().match(PAGE_LINE)[1];
    else if (PAGE_LINE.test(lines[lines.length - 1])) page = lines.pop().match(PAGE_LINE)[1];
    if (!lines.length) return;
    // A chapter opening may sit under a book title or a part heading.
    if (options.chapterBreak && lines.slice(0, 3).some((l) => options.chapterBreak.test(l))) chapter += 1;
    if (options.pageOffset != null) {
      const expected = String(n - options.pageOffset);
      if (page != null) {
        headsRead += 1;
        if (page === expected) headsAgree += 1;
      }
      page = expected;
    }
    const body = lines.join('\n')
      .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2') // rejoin words hyphenated across lines
      .replace(/\n(?!\n)/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (!body) return;
    // A title or plate leaf ("CHAPTER IV" alone on its page) is not a page of
    // text: the heading reappears where the chapter begins.
    if (options.stripRunningHeads && body.split(' ').length < 5) return;
    const cite = page ? `p. ${page}` : `leaf ${n}`;
    const parent = options.chapterBreak ? `chapter ${chapter}` : (options.parent || 'volume');
    sections.push({ cite, parent, label: cite, text: body, pages: page ? [page] : [], notes: [], leaf: n });
  });

  if (options.pageOffset != null) {
    if (headsRead && headsAgree / headsRead < 0.9) {
      reasons.push(`page offset ${options.pageOffset} disagrees with the running heads: ${headsAgree} of ${headsRead} legible page numbers match`);
    } else if (headsRead) {
      warnings.push(`printed pages from leaf offset ${options.pageOffset}; ${headsAgree} of ${headsRead} legible running-head numbers agree (the rest are OCR misreadings)`);
    }
  }

  const language = options.language || 'english';
  const est = garbleEstimate(sections.map((s) => s.text).join(' '), language, { seed: options.seed || 'ocr' });
  return {
    front: '',
    sections,
    notes: [],
    rawText: src,
    reasons,
    warnings,
    ocr: { rate: est.rate, sampled: est.sampled, quality: ocrQuality(est.rate), examples: est.garbled.slice(0, 25) },
  };
}

module.exports = { parse, isRunningHead, isFootMark };
