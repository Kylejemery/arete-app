// pd-ingest/parsers/common.js — what every parser shares: marker sentinels,
// splitting text into cited sections, and the structure checks that refuse
// a misread parse before anything is staged.

const { countWords, nfc } = require('../lib');

// Sentinels survive htmlToText (control characters, no tags) and cannot occur
// in the texts themselves.
const CITE = (c) => ` \u0002${c}\u0002 `;
const PAGE = (p) => ` \u0003${p}\u0003 `;
const NOTE = (n) => ` \u0004${n}\u0004 `;
const SENTINELS = /\u0002([^\u0002]*)\u0002|\u0003([^\u0003]*)\u0003|\u0004([^\u0004]*)\u0004/g;

// Walk sentinel-marked text into sections. Text before the first citation is
// front matter and is returned separately (counted, never staged).
function splitMarked(marked, { parentOf = () => null, labelOf = () => null } = {}) {
  const sections = [];
  let front = '';
  let cur = null;
  let page = null;
  let last = 0;
  const pushText = (t) => {
    if (cur) cur.parts.push(t);
    else front += t;
  };
  for (const m of marked.matchAll(SENTINELS)) {
    pushText(marked.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] != null) {
      cur = { cite: m[1], parent: parentOf(m[1]), label: labelOf(m[1]), parts: [], pages: page ? [page] : [], notes: [] };
      sections.push(cur);
    } else if (m[2] != null) {
      page = m[2];
      if (cur && !cur.pages.includes(page)) cur.pages.push(page);
    } else if (m[3] != null && cur) {
      cur.notes.push(m[3]);
    }
  }
  pushText(marked.slice(last));
  const tidy = (s) => nfc(s)
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t\r\f\v]+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim())
    .filter(Boolean)
    .join('\n\n');
  return {
    front: tidy(front),
    sections: sections
      .map(({ parts, ...s }) => ({ ...s, text: tidy(parts.join('')) }))
      .filter((s) => s.text),
  };
}

// Structure checks. Each failure is a reason; any reason blocks staging.
function checkStructure({ sections, front, rawText = '', expect = [], order = null, maxWordsPerCite = 900, maxFrontShare = 0.05 }) {
  const reasons = [];
  if (!sections.length) reasons.push('no citation markers recognised');
  const bodyWords = sections.reduce((n, s) => n + countWords(s.text), 0);
  const frontWords = countWords(front);
  if (bodyWords && frontWords / (bodyWords + frontWords) > maxFrontShare) {
    reasons.push(`${frontWords} words (${Math.round((100 * frontWords) / (bodyWords + frontWords))}%) precede the first citation marker; markers are probably being missed`);
  }
  const seen = new Set();
  for (const s of sections) {
    if (seen.has(s.cite)) { reasons.push(`citation ${s.cite} appears twice`); break; }
    seen.add(s.cite);
  }
  if (order) {
    for (let i = 1; i < sections.length; i++) {
      if (order(sections[i - 1].cite, sections[i].cite) >= 0) {
        reasons.push(`citations out of order: ${sections[i - 1].cite} then ${sections[i].cite}`);
        break;
      }
    }
  }
  if (sections.length && bodyWords / sections.length > maxWordsPerCite) {
    reasons.push(`${Math.round(bodyWords / sections.length)} words per citation on average; divisions are probably being missed`);
  }
  for (const e of expect) {
    if (!rawText.includes(e)) reasons.push(`expected "${e}" in the source (translator or edition check) and did not find it`);
  }
  return { ok: reasons.length === 0, reasons, bodyWords, frontWords };
}

// Order for dotted citations ("3.22.4") and Moralia page-letters ("37C").
function citeKey(c) {
  const m = String(c).match(/^(\d+)([A-F])$/);
  if (m) return [Number(m[1]), m[2].charCodeAt(0)];
  return String(c).split('.').map(Number);
}
function compareCites(a, b) {
  const x = citeKey(a);
  const y = citeKey(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

module.exports = { CITE, PAGE, NOTE, splitMarked, checkStructure, compareCites };
