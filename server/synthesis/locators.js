// server/synthesis/locators.js
//
// Checks every quotation in a draft against the passages the agent was
// given, with no model call:
//
//   not_found         The quoted words are in none of the passages. A
//                     translation may differ by a word, so this is a flag
//                     for Kyle, not proof of invention.
//   wrong_author      The citation after the quote names a different author
//                     from the passage that holds the words.
//   wrong_locator     The citation's section (Meditations 8.22) falls outside
//                     the section label of every passage holding the words
//                     (10.12). The citation check (checks.js) asks whether a
//                     claim is supported; it does not compare numbers, which
//                     is how the first draft cited 8.22 for 10.12.
//   prose_attribution The sentence introduces the quote with another
//                     author's name ("Epictetus's instruction: ...") than the
//                     one whose passage holds it.
//
// A label or citation that cannot be parsed is skipped, never flagged.

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romanToInt(s) {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]], next = ROMAN[s[i + 1]];
    if (!v) return null;
    total += next > v ? -v : v;
  }
  return total;
}

// "VII.92" → [7, 92]; "8.22" → [8, 22]; "VI" → [6]; "46" → [46]. Null if the
// token is not a locator.
function parseLocatorToken(tok) {
  if (!tok) return null;
  const parts = String(tok).split('.');
  const out = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) out.push(Number(p));
    else if (/^[IVXLCDM]+$/.test(p)) { const n = romanToInt(p); if (n == null) return null; out.push(n); }
    else return null;
  }
  return out.length ? out : null;
}

const LOCATOR_RE = /(?:^|[\s,(])((?:\d+|[IVXLCDM]+)(?:\.\d+)*)(?=$|[\s,;)–-])/g;

// The last locator-looking token in a string ("On Clemency 1.10" → [1, 10]).
function lastLocator(s) {
  let m, last = null;
  LOCATOR_RE.lastIndex = 0;
  while ((m = LOCATOR_RE.exec(String(s || ''))) !== null) last = m[1];
  return parseLocatorToken(last);
}

// The first locator-looking token: a citation's section ("Lives VII.104-105"
// → [7, 104], the start of the cited range).
function firstLocator(s) {
  LOCATOR_RE.lastIndex = 0;
  const m = LOCATOR_RE.exec(String(s || ''));
  return m ? parseLocatorToken(m[1]) : null;
}

// The locator of a citation "(Author, Work 8.22, extra)": the first locator
// after the author, read from the segment that names the work.
function citationLocator(cite) {
  const segs = String(cite || '').split(',').map(x => x.trim());
  const workSeg = segs.length > 1 ? segs[1] : segs[0];
  return firstLocator(workSeg);
}

// A section label as a range: "7.103–7.106" → {start:[7,103], end:[7,106]};
// "On Clemency 1.1–On Clemency 1.2" → {start:[1,1], end:[1,2]}; "94" →
// {start:[94], end:[94]}. Null when unparseable or empty.
function parseLabelRange(label) {
  const s = String(label || '').trim();
  if (!s) return null;
  const [a, b] = s.split(/\s*[–-]\s*/);
  const start = lastLocator(a);
  if (!start) return null;
  const end = b ? lastLocator(b) || start : start;
  return { start, end };
}

// Compare on the shorter common prefix: a citation to Letter 109.14 is
// inside a passage labelled "109"; 7.104 is inside 7.103–7.106.
function cmpPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}
function locatorInLabel(loc, label) {
  const r = parseLabelRange(label);
  if (!r || !loc) return null;   // unknown, not a mismatch
  return cmpPrefix(loc, r.start) >= 0 && cmpPrefix(loc, r.end) <= 0;
}

function normalize(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Name forms a writer uses for an author in prose and in citations.
function nameForms(author) {
  const n = normalize(author);
  const words = n.split(' ').filter(w => w.length > 2);
  return [...new Set([n, ...words])];
}
function mentionsAuthor(text, author) {
  const t = ` ${normalize(text)} `;
  return nameForms(author).some(f => t.includes(` ${f} `) || t.includes(` ${f}'s `) || t.includes(` ${f}s `));
}

// Quotations of four words or more. An ellipsis splits a quotation into
// fragments that must each be found.
//
// Quotation marks are paired in order within each paragraph (curly marks by
// direction, straight marks alternately), and only then is a pair judged
// long enough to be a quotation. Matching quotations with a length-limited
// pattern instead lets a short quoted term ("preferred") be skipped, so its
// closing mark opens the next "quotation" and every pair after it is the
// prose between two real ones.
function extractQuotes(text) {
  const out = [];
  const src = String(text || '');
  const paraBreak = /\n\s*\n/g;
  let paraStart = 0;
  const paragraphs = [];
  let b;
  while ((b = paraBreak.exec(src)) !== null) {
    paragraphs.push([paraStart, b.index]);
    paraStart = b.index + b[0].length;
  }
  paragraphs.push([paraStart, src.length]);

  for (const [from, to] of paragraphs) {
    let open = -1;
    for (let i = from; i < to; i++) {
      const c = src[i];
      if (c === '“') { open = i; continue; }
      const closes = c === '”' || (c === '"' && open !== -1);
      if (c === '"' && open === -1) { open = i; continue; }
      if (!closes || open === -1) continue;
      const quote = src.slice(open + 1, i);
      if (quote.length >= 12 && quote.length <= 800) {
        const fragments = quote.split(/\.\.\.|…/).map(f => f.trim()).filter(f => normalize(f).split(' ').length >= 4);
        if (fragments.length) out.push({ quote, fragments, start: open, end: i + 1 });
      }
      open = -1;
    }
  }
  return out;
}

// The first parenthetical after the quote, in the same paragraph, that names
// an author or ends in a locator: "(Marcus Aurelius, Meditations 8.22)".
function citationAfter(text, end) {
  const rest = text.slice(end, end + 200).split(/\n\s*\n/)[0];
  const m = rest.match(/^[^()]{0,120}?\(([^()]{3,160})\)/);
  return m ? m[1] : null;
}

// The words between the sentence's start and the quote.
function leadIn(text, start) {
  const before = text.slice(Math.max(0, start - 300), start).replace(/\([^()]*\)/g, ' ');
  const parts = before.split(/(?<=[.!?])\s+(?=[A-Z])|\n/);
  return parts[parts.length - 1] || '';
}

/**
 * @param {string} text  the draft's prose (any sections)
 * @param {{author: string, work: string, section_label?: string, chunk_text: string}[]} passages
 * @returns {{quote: string, problem: string, detail: string}[]}
 */
// Names a writer may wrongly hang a quotation on, beyond the passages' own
// authors.
const KNOWN_NAMES = Object.freeze([
  'Seneca', 'Epictetus', 'Marcus Aurelius', 'Musonius Rufus', 'Diogenes Laërtius',
  'Zeno', 'Cleanthes', 'Chrysippus', 'Posidonius', 'Panaetius', 'Hecato',
  'Cicero', 'Plato', 'Xenophon', 'Socrates', 'Epicurus', 'Aristotle',
]);

function checkQuotations(text, passages) {
  const normed = passages.map(p => ({ ...p, norm: normalize(p.chunk_text) }));
  const authors = [...new Set(passages.map(p => p.author))];
  const names = [...new Set([...authors, ...KNOWN_NAMES])];
  const findings = [];
  for (const q of extractQuotes(text)) {
    const short = q.quote.length > 90 ? `${q.quote.slice(0, 87)}...` : q.quote;
    const holders = normed.filter(p => q.fragments.every(f => p.norm.includes(normalize(f))));
    if (!holders.length) {
      findings.push({ quote: short, problem: 'not_found', detail: 'these words are in none of the passages the draft was given' });
      continue;
    }
    const holderAuthors = [...new Set(holders.map(h => h.author))];
    const cite = citationAfter(text, q.end);
    if (cite) {
      const citedAuthors = authors.filter(a => mentionsAuthor(cite, a));
      if (citedAuthors.length && !citedAuthors.some(a => holderAuthors.includes(a))) {
        findings.push({ quote: short, problem: 'wrong_author', detail: `cited to ${citedAuthors.join(', ')}, but the words are in ${holderAuthors.join(', ')}` });
        continue;
      }
      const loc = citationLocator(cite);
      const verdicts = holders.map(h => locatorInLabel(loc, h.section_label));
      if (loc && verdicts.every(v => v === false)) {
        const where = holders.map(h => `${h.work} ${h.section_label}`).join('; ');
        findings.push({ quote: short, problem: 'wrong_locator', detail: `cited as (${cite}), but the words are in ${where}` });
        continue;
      }
    }
    // A name the holding passage itself mentions is a report, not a
    // misattribution: Diogenes Laertius giving Posidonius's view, Seneca
    // quoting Epicurus.
    const named = names.filter(a => mentionsAuthor(leadIn(text, q.start), a));
    const reported = n => holders.some(h => mentionsAuthor(h.chunk_text, n));
    if (named.length && !named.some(a => holderAuthors.includes(a) || reported(a))) {
      findings.push({ quote: short, problem: 'prose_attribution', detail: `introduced as ${named.join(', ')}, but the words are in ${holderAuthors.join(', ')}` });
    }
  }
  return findings;
}

module.exports = {
  romanToInt, parseLocatorToken, lastLocator, firstLocator, citationLocator, parseLabelRange, locatorInLabel,
  normalize, extractQuotes, citationAfter, leadIn, mentionsAuthor, checkQuotations,
};
