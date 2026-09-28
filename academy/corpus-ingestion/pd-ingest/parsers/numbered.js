// pd-ingest/parsers/numbered.js — plain text, wikitext or simple HTML whose
// sections are numbered inline: "[121]", "{{anchor|121}}", "<sup>121</sup>",
// "§ 16", a bold "'''121'''". Used for Wikisource (Hicks, DL Book VI, read as
// raw wikitext), The Latin Library and Gutenberg.
//
// NOT YET CHECKED AGAINST A LIVE PAGE (no route to those hosts from the
// session that wrote it). The marker form is detected rather than assumed:
// every candidate pattern is tried and the one that yields the longest run of
// consecutive section numbers wins. --inspect prints each candidate's score.
// A source definition can pin a pattern instead.

const { htmlToText, nfc } = require('../lib');
const { CITE, splitMarked } = require('./common');

const CANDIDATES = {
  anchorTemplate: /\{\{\s*(?:anchor|anchor2|section|verse|sidenote|marginnote)\s*\|\s*(\d{1,4})\s*\}\}/gi,
  bracket: /\[(\d{1,4})\]/g,
  sup: /<sup>\s*(\d{1,4})\s*<\/sup>/gi,
  section: /§\s*(\d{1,4})\b/g,
  boldNumber: /'''\s*(\d{1,4})\.?\s*'''/g,
  lineNumber: /^\s*(\d{1,4})\.\s+(?=[A-ZΑ-Ωἀ-ῼ])/gm,
};

// Longest strictly consecutive run (n, n+1, …) in a list of numbers, allowing
// skips of up to two (a lost marker) but no backward steps.
function consecutiveScore(nums) {
  let best = 0;
  let run = 0;
  for (let i = 0; i < nums.length; i++) {
    const step = i ? nums[i] - nums[i - 1] : 1;
    run = step >= 1 && step <= 3 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

function scoreCandidates(text) {
  return Object.entries(CANDIDATES).map(([name, re]) => {
    const nums = [...text.matchAll(re)].map((m) => Number(m[1]));
    return { name, matches: nums.length, score: consecutiveScore(nums), first: nums.slice(0, 8) };
  }).sort((a, b) => b.score - a.score);
}

// Wikitext to plain text: drop templates other than the markers already
// replaced, keep link labels, drop <ref> bodies (returned as notes).
function stripWikitext(s) {
  let t = String(s);
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{[^{}]*\}\}/g, ' ');
  return t
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/^=+\s*(.*?)\s*=+\s*$/gm, '\n\n$1\n\n');
}

function parse(input, options = {}) {
  const src = String(input);
  const isWikitext = options.format === 'wikitext';
  const notes = [];
  let body = src;

  if (isWikitext) {
    // <ref>…</ref> are the translator's footnotes; keep their order.
    let n = 0;
    body = body.replace(/<ref[^>/]*>([\s\S]*?)<\/ref>/gi, (_m, inner) => {
      n += 1;
      notes.push({ id: `ref${n}`, raw: inner });
      return ` \u0004ref${n}\u0004 `;
    });
  }

  const scores = scoreCandidates(body);
  const chosen = options.marker ? CANDIDATES[options.marker] : CANDIDATES[scores[0].name];
  const prefix = options.citePrefix || '';
  const marked = body.replace(chosen, (_m, n) => CITE(`${prefix}${Number(n)}`));
  const text = isWikitext
    ? nfc(stripWikitext(marked)).replace(/<[^>]+>/g, ' ')
    : (/<[a-z][\s\S]*>/i.test(marked) ? htmlToText(marked) : nfc(marked));

  const { front, sections } = splitMarked(text, { parentOf: options.parentOf, labelOf: options.labelOf });

  const callers = new Map();
  for (const s of sections) for (const id of s.notes) if (!callers.has(id)) callers.set(id, s.cite);
  const noteRows = notes
    .map((nt) => ({ id: nt.id, text: nfc(stripWikitext(nt.raw)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), annotates: callers.get(nt.id) || null }))
    .filter((nt) => nt.text);

  return {
    front, sections, notes: noteRows, rawText: src,
    marker: options.marker || scores[0].name,
    licenseEvidence: [...new Set((src.match(/[^.\n]*public domain[^.\n]*\.?/gi) || []).map((s) => s.trim()))],
  };
}

function inspect(input) {
  return { candidates: scoreCandidates(String(input)) };
}

module.exports = { parse, inspect, scoreCandidates, consecutiveScore, CANDIDATES };
