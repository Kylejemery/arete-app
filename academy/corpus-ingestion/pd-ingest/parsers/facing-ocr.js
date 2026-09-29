// pd-ingest/parsers/facing-ocr.js — an Internet Archive OCR text (`_djvu.txt`)
// of an edition printed with the original and the translation on facing
// pages, with no form feeds between leaves. Built for Lutz's Musonius (Yale
// Classical Studies 10, 1947): Greek on the even pages under "NN CORA E.
// LUTZ", English on the odd pages under "MUSONIUS RUFUS NN", and a lecture's
// opening pair printed without running heads.
//
// Keeps the translation only. A page is the translation's from its running
// head (`translationHead`), or from a section heading (`sections[].heading`,
// taken in order) on an opening page, until the next original page: its
// running head (`originalHead`) or an opening title (`originalOpening`).
// Everything on an original page goes, Lutz's notes and apparatus included.
//
// On a translation page it drops:
//   - lines more than half Greek (the OCR runs stray Greek lines in); a
//     single Greek-read word in an English line stays for `fixes` to repair,
//   - margin line numbers and OCR crumbs: short lines with no word in them,
//   - headings and roman numerals: lines with no lower-case letter,
//   - the notes at the foot of the page: from a line that opens with a line
//     number and a capital or a Greek word ("10 Cf. Demosthenes …", "19 ἡμᾶς
//     delevit Hense") to the end of the page, or from one of the listed
//     continuations of a note carried over from an earlier page
//     (`noteContinuations`: { start, lines? }; with `lines`, only that many go).
//
// Then it joins the lines into paragraphs (a blank line or page end after a
// sentence end breaks one), rejoins words hyphenated across lines and pages
// (`keepHyphen` lists compounds that keep theirs), marks the listed gaps in
// the scan (`gaps`, the text each follows) with " […]" so nothing is joined
// across missing text, cuts a paragraph longer than `maxSectionWords` at
// sentence ends, and applies the listed OCR fixes (`fixes`, each [pattern,
// replacement, note], counted and reported). A listed fix, gap or
// continuation that no longer matches refuses the source.
//
// Printed pages run in sequence from `firstPage`, two at a time, and every
// legible running head is checked against the count; a scan where more than
// one in ten disagree is refused rather than mis-paged.

const { nfc, countWords, garbleEstimate, ocrQuality } = require('../lib');

// A note opens with its line number(s) and then a capital, a quotation mark
// or a Greek word ("10 Cf.", "24f. Frag.", "27,29 Phoenissae", "19 ἡμᾶς
// delevit Hense"). A body line OCR begins with "1" reads "1 am" or "1 tell":
// a digit and a lower-case word, which this never matches.
const NOTE_START = /^\d{1,3}(\s*[-–,]\s*\d{1,3})*\s*(f{1,2}\.?)?,?\s+(?:[A-Z‘“"(]|[\u0370-\u03ff\u1f00-\u1fff])/u;
const SENTENCE_END = /[.?!:;”’"')]$/;

function isCrumb(line) {
  return line.length <= 5 && !/[a-z]{3,}/.test(line);
}

function isHeadingLine(line) {
  return !/[a-z]/.test(line) && /[A-Z]{2,}|^[IVXL]{1,6}[AB]?[.,]?$/.test(line);
}

function readHeadNumber(line) {
  const m = line.match(/(\d{1,3})\s*$/);
  return m ? Number(m[1]) : null;
}

// Split a source into translation pages: [{ page, section, lines }].
function translationPages(lines, options) {
  const pages = [];
  let mode = 'original';
  let section = null;
  let page = null;
  let lastPage = options.firstPage - 2;
  let headsRead = 0;
  let headsAgree = 0;
  const mismatches = [];
  const sectionsSeen = new Set();

  const openPage = () => {
    page = { page: lastPage + 2, section, lines: [] };
    lastPage = page.page;
    pages.push(page);
    mode = 'translation';
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+/g, ' ').trim();
    // Headings are taken in order, so two sections may share one ("ON FOOD").
    const heading = options.sections.find((s) => !sectionsSeen.has(s.cite) && s.heading.test(line));
    if (heading) {
      sectionsSeen.add(heading.cite);
      section = heading.cite;
      if (mode === 'original') openPage();
      page.lines.push({ text: line, section, heading: true });
      continue;
    }
    if (options.translationHead.test(line)) {
      openPage();
      const read = readHeadNumber(line);
      if (read != null) {
        headsRead += 1;
        if (read === page.page) headsAgree += 1;
        else mismatches.push(`p. ${page.page} head reads "${line}"`);
      }
      continue;
    }
    if (options.originalHead.test(line) || options.originalOpening.test(line)) {
      mode = 'original';
      continue;
    }
    if (mode === 'translation') page.lines.push({ text: line, section });
  }
  return { pages, headsRead, headsAgree, mismatches, sectionsSeen };
}

// One translation page's body lines, notes and crumbs removed. Blank lines
// are kept as '' so paragraph breaks can be read. Lutz's notes stand at the
// foot of the page, so a note runs from its first line to the page end: a
// numbered line, or one of the listed continuations of a note carried over
// from the page before (`noteContinuations`: { start, lines? }; with `lines`
// only that many lines go and the body resumes, for a note the OCR set at the
// head of a page).
function cleanPage(page, options = {}, dropped = []) {
  const out = [];
  let noteLeft = 0;
  const continuations = options.noteContinuations || [];
  for (const l of page.lines) {
    const t = l.text;
    if (!t) { out.push({ ...l, text: '' }); continue; }
    if (l.heading) continue;
    // A Greek line the OCR ran onto the page goes alone, even one opening
    // with a margin number: it is not a note, and the page's English goes on.
    if (!noteLeft && greekShare(t) > 0.5) { dropped.push({ page: page.page, kind: 'greek', text: t }); continue; }
    if (!noteLeft) {
      const cont = continuations.find((c) => t.startsWith(c.start));
      if (cont) { noteLeft = cont.lines || Infinity; if (options.usedContinuations) options.usedContinuations.add(cont.start); }
      else if (NOTE_START.test(t)) noteLeft = Infinity;
      if (noteLeft) dropped.push({ page: page.page, kind: 'note-start', text: t });
    }
    if (noteLeft) { noteLeft -= 1; dropped.push({ page: page.page, kind: 'note', text: t }); continue; }
    if (isCrumb(t) || isHeadingLine(t)) continue;
    out.push(l);
  }
  return out;
}

function greekShare(s) {
  const letters = s.replace(/[^\p{L}]/gu, '');
  if (!letters) return 0;
  return (letters.match(/[\u0370-\u03ff\u1f00-\u1fff]/g) || []).length / letters.length;
}

function parse(text, options = {}) {
  const src = nfc(text);
  const reasons = [];
  const warnings = [];
  const fixLog = [];
  const { pages, headsRead, headsAgree, mismatches, sectionsSeen } = translationPages(src.split('\n'), options);

  const missing = options.sections.filter((s) => !sectionsSeen.has(s.cite)).map((s) => s.cite);
  if (missing.length) reasons.push(`section headings not found: ${missing.join(', ')}`);
  if (headsRead && headsAgree / headsRead < 0.9) {
    reasons.push(`page count disagrees with the running heads: ${headsAgree} of ${headsRead} legible page numbers match`);
  } else if (headsRead) {
    warnings.push(`printed pages counted from p. ${options.firstPage}; ${headsAgree} of ${headsRead} legible running-head numbers agree (${mismatches.join('; ')})`);
  }

  // A stream of lines tagged with page and section, blank lines kept.
  const stream = [];
  const dropped = [];
  const usedGaps = new Set();
  const usedContinuations = new Set();
  for (const p of pages) {
    for (const l of cleanPage(p, { ...options, usedContinuations }, dropped)) {
      let text = l.text;
      let gap = null;
      // A gap in the scan: the line it follows ends the text, " […]" marks
      // it, and nothing is rejoined across it.
      const g = (options.gaps || []).find((x) => text.endsWith(x.after));
      if (g) { text = `${text.replace(/-$/, '')} […]`; gap = g.note; usedGaps.add(g.note); }
      stream.push({ text, gap, section: l.section, page: String(p.page) });
    }
    stream.push({ text: '', pageEnd: true, page: String(p.page) });
  }

  // Paragraphs: join lines, rejoin hyphenation, break at a blank line or page
  // end after a sentence end, and always at a section change. Each line's
  // offset in the paragraph is kept with its page and any gap after it.
  const paragraphs = [];
  let cur = null;
  const flush = () => { if (cur && cur.text.trim()) paragraphs.push(cur); cur = null; };
  let pendingBreak = false;
  const joins = [];
  for (const l of stream) {
    if (!l.text) { pendingBreak = true; continue; }
    if (cur && cur.section !== l.section) flush();
    if (cur && pendingBreak && SENTENCE_END.test(cur.text) && /^[A-Z‘“"(]/.test(l.text)) flush();
    if (cur && pendingBreak && !SENTENCE_END.test(cur.text)) joins.push({ page: l.page, section: l.section, before: cur.text.slice(-50), after: l.text.slice(0, 50) });
    pendingBreak = false;
    if (!cur) { cur = { section: l.section, text: l.text, lines: [{ at: 0, page: l.page, gap: l.gap }] }; continue; }
    // A word broken at the line end is rejoined; a compound whose first part
    // is listed (`keepHyphen`: "self-control", "ill-repute") keeps its hyphen.
    const broken = cur.text.match(/(\p{L}+)-$/u);
    if (broken && /^\p{Ll}/u.test(l.text)) {
      if (!(options.keepHyphen || []).includes(broken[1].toLowerCase())) cur.text = cur.text.slice(0, -1);
    } else cur.text += ' ';
    cur.lines.push({ at: cur.text.length, page: l.page, gap: l.gap });
    cur.text += l.text;
  }
  flush();

  // A paragraph longer than `maxSectionWords` is cut at sentence ends into
  // pieces of about that size, so a long lecture paragraph does not become one
  // oversized chunk. Pages and gaps come from the lines each piece covers.
  const maxWords = options.maxSectionWords || Infinity;
  const pieces = [];
  for (const p of paragraphs) {
    const cuts = [0];
    if (countWords(p.text) > maxWords) {
      const ends = [...p.text.matchAll(/[.?!][”’"»)]?\s+(?=[“‘"(<]?\s?[A-Z])/g)].map((m) => m.index + m[0].length);
      let from = 0;
      let last = 0;
      // The paragraph's own end is the last candidate, so the final piece is
      // held to the same size as the rest.
      for (const e of [...ends, p.text.length]) {
        if (countWords(p.text.slice(from, e)) > maxWords && last > from) { cuts.push(last); from = last; }
        last = e;
      }
    }
    cuts.push(p.text.length);
    for (let i = 0; i < cuts.length - 1; i++) {
      const [a, b] = [cuts[i], cuts[i + 1]];
      const covered = p.lines.filter((l, j) => l.at < b && (j + 1 < p.lines.length ? p.lines[j + 1].at : Infinity) > a);
      pieces.push({
        section: p.section,
        text: p.text.slice(a, b),
        pages: [...new Set(covered.map((l) => l.page))],
        gap: covered.map((l) => l.gap).filter(Boolean).join('; ') || null,
      });
    }
  }

  const counts = new Map();
  const bump = (key, n) => counts.set(key, (counts.get(key) || 0) + n);
  for (const p of pieces) {
    for (const [pattern, replacement, note] of options.fixes || []) {
      const n = (p.text.match(pattern) || []).length; // patterns are global
      if (n) { p.text = p.text.replace(pattern, replacement); bump(note, n); }
    }
    p.text = p.text.replace(/\s+/g, ' ').trim();
  }
  for (const [what, n] of counts) fixLog.push(`fix: ${what} (${n}×)`);
  for (const f of options.fixes || []) if (!counts.has(f[2])) reasons.push(`listed OCR fix never applied: ${f[2]}`);
  for (const c of options.noteContinuations || []) if (!usedContinuations.has(c.start)) reasons.push(`listed note continuation not found: ${c.start}`);
  for (const g of options.gaps || []) {
    if (usedGaps.has(g.note)) fixLog.push(`gap marked: ${g.note}`);
    else reasons.push(`listed gap not found: ${g.note}`);
  }

  const labelOf = Object.fromEntries(options.sections.map((s) => [s.cite, s.label]));
  const seq = new Map();
  const sections = pieces.map((p) => {
    const n = (seq.get(p.section) || 0) + 1;
    seq.set(p.section, n);
    return {
      cite: `${p.section}.${n}`, parent: p.section, label: labelOf[p.section] || p.section,
      text: p.text, pages: p.pages, gap: p.gap,
      // A clipped margin leaves a "[…]" of its own in the text (see fixes).
      damaged: !p.gap && p.text.includes('[…]'),
    };
  });

  const language = options.language || 'english';
  const est = garbleEstimate(sections.map((s) => s.text).join(' '), language, { seed: options.seed || 'ocr' });
  return {
    front: '',
    sections,
    notes: [],
    rawText: src,
    reasons,
    warnings: [...warnings, ...fixLog],
    fixLog,
    dropped,
    joins,
    ocr: { rate: est.rate, sampled: est.sampled, quality: ocrQuality(est.rate), examples: est.garbled.slice(0, 25) },
  };
}

module.exports = { parse, translationPages, cleanPage, isCrumb, isHeadingLine, greekShare };
