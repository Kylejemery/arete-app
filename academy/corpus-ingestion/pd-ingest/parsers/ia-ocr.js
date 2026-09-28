// pd-ingest/parsers/ia-ocr.js — Internet Archive OCR text (`_djvu.txt`) for
// the Tier 2 scans (Bonhöffer 1890, Halbauer 1911, Schenkl 1916) and the
// Oldfather Loeb volumes.
//
// There is no canonical citation, so the unit is the printed page (spec,
// Chunking 6). The djvu text separates scan leaves with a form feed; a
// leaf's printed page number is read from a short numeric first or last
// line, and a leaf with none (plates, blanks) keeps its leaf number marked
// "leaf N" so it is never mistaken for a printed page.
//
// NOT YET CHECKED AGAINST A LIVE FILE: if a file has no form feeds the parse
// fails its structure check rather than guessing page breaks.

const { nfc, garbleEstimate, ocrQuality } = require('../lib');

const PAGE_LINE = /^\s*[-–—]?\s*(\d{1,4})\s*[-–—]?\s*$/;

function parse(text, options = {}) {
  const src = nfc(text);
  const leaves = src.split('\f');
  const sections = [];
  const reasons = [];
  if (leaves.length < 3) reasons.push('no form-feed leaf breaks in the OCR text; page units cannot be recovered');

  leaves.forEach((leaf, i) => {
    const lines = leaf.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    let page = null;
    if (PAGE_LINE.test(lines[0])) page = lines.shift().match(PAGE_LINE)[1];
    else if (PAGE_LINE.test(lines[lines.length - 1])) page = lines.pop().match(PAGE_LINE)[1];
    const body = lines.join('\n')
      .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2') // rejoin words hyphenated across lines
      .replace(/\n(?!\n)/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (!body) return;
    const cite = page ? `p. ${page}` : `leaf ${i + 1}`;
    sections.push({ cite, parent: options.parent || 'volume', label: cite, text: body, pages: page ? [page] : [], notes: [] });
  });

  const language = options.language || 'english';
  const est = garbleEstimate(sections.map((s) => s.text).join(' '), language, { seed: options.seed || 'ocr' });
  return {
    front: '',
    sections,
    notes: [],
    rawText: src,
    reasons,
    ocr: { rate: est.rate, sampled: est.sampled, quality: ocrQuality(est.rate), examples: est.garbled.slice(0, 25) },
  };
}

module.exports = { parse };
