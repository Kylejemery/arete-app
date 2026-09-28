// server/lib/spoken-citation.js
//
// A citation the Examiner can say aloud, generated from author, work and
// locator rather than stored, so a locator fix corrects it everywhere
// (docs/corpus/PUBLIC_DOMAIN_INGESTION_PROPOSAL.md, section 5).
//
//   Epictetus / Discourses / 3.22.1–3.22.8
//     → "Epictetus, Discourses, book three, chapter twenty two, sections one to eight"
//   Diogenes Laërtius / Lives of Eminent Philosophers, Book VII / 7.121–7.123
//     → "Diogenes Laertius, Lives of Eminent Philosophers, book seven, sections one hundred twenty one to one hundred twenty three"
//   Plutarch / On Listening to Lectures / 37C–38A
//     → "Plutarch, On Listening to Lectures, Moralia page thirty seven C to page thirty eight A"
//
// The division names come from the work: a dotted locator is book.section by
// default, book.chapter.section with three parts, and a work named below can
// say otherwise (Gellius numbers book.chapter.paragraph, the Enchiridion has
// chapters only). A locator this cannot read yields the citation without it,
// never a wrong one.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberWords(n) {
  if (!Number.isInteger(n) || n < 0 || n > 9999) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '');
  if (n < 1000) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${numberWords(rest)}` : ''}`;
  }
  const rest = n % 1000;
  return `${numberWords(Math.floor(n / 1000))} thousand${rest ? ` ${numberWords(rest)}` : ''}`;
}

// Division names by the number of parts in a locator, per work.
const SCHEMES = [
  { match: (a, w) => /gellius/i.test(a), divisions: { 2: ['book', 'chapter'], 3: ['book', 'chapter', 'paragraph'] } },
  { match: (a, w) => /^discourses/i.test(w), divisions: { 2: ['book', 'chapter'], 3: ['book', 'chapter', 'section'] } },
  { match: (a, w) => /enchiridion|handbook/i.test(w), divisions: { 1: ['chapter'], 2: ['chapter', 'section'] } },
];
const DEFAULT_DIVISIONS = { 1: ['section'], 2: ['book', 'section'], 3: ['book', 'chapter', 'section'] };

function divisionsFor(author, work, parts) {
  const scheme = SCHEMES.find((s) => s.match(author || '', work || ''));
  return (scheme && scheme.divisions[parts]) || DEFAULT_DIVISIONS[parts] || null;
}

function plural(word) {
  return word.endsWith('s') ? word : `${word}s`;
}

// "Diogenes Laërtius" → "Diogenes Laertius": speech wants no diacritics.
function speakable(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Drop the identity suffixes the corpus uses to keep two renderings apart:
// "Discourses (tr. Oldfather)", "Lives of Eminent Philosophers, Book VII".
function spokenWork(work) {
  return speakable(work)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/,\s*Book\s+[IVXLC\d]+\s*$/i, '')
    .trim();
}

// Moralia (Stephanus-style) page and letter: "37C", "37C–38A", "37C–E".
const MORALIA = /^(\d+)([A-F])(?:\s*[–-]\s*(?:(\d+))?([A-F]))?$/;

function moraliaCitation(locator) {
  const m = locator.match(MORALIA);
  if (!m) return null;
  const [, p1, l1, p2, l2] = m;
  const start = `page ${numberWords(Number(p1))} ${l1}`;
  if (!l2) return `Moralia ${start}`;
  if (!p2 || p2 === p1) return `Moralia ${start} to ${l2}`;
  return `Moralia ${start} to page ${numberWords(Number(p2))} ${l2}`;
}

function parseDotted(s) {
  if (!/^\d+(\.\d+)*$/.test(s)) return null;
  return s.split('.').map(Number);
}

function dottedCitation(author, work, locator) {
  const [from, to] = locator.split(/\s*[–-]\s*/);
  const a = parseDotted(from);
  if (!a) return null;
  const b = to ? parseDotted(to) : null;
  if (to && (!b || b.length !== a.length)) return null;
  const names = divisionsFor(author, work, a.length);
  if (!names) return null;

  // Shared leading divisions are said once; the first that differs becomes
  // a range in the plural ("sections one to eight").
  const out = [];
  for (let i = 0; i < a.length; i++) {
    if (!b || a[i] === b[i]) {
      out.push(`${names[i]} ${numberWords(a[i])}`);
      continue;
    }
    const rest = a.slice(i + 1).every((v, j) => v === b[i + 1 + j]);
    if (!rest && i < a.length - 1) {
      // A range across a higher division (3.22.40–3.23.2): say both ends in full.
      const full = (arr) => arr.slice(i).map((v, j) => `${names[i + j]} ${numberWords(v)}`).join(', ');
      out.push(`${full(a)} to ${full(b)}`);
      return out.join(', ');
    }
    out.push(`${plural(names[i])} ${numberWords(a[i])} to ${numberWords(b[i])}`);
    for (let j = i + 1; j < a.length; j++) out.push(`${names[j]} ${numberWords(a[j])}`);
    return out.join(', ');
  }
  return out.join(', ');
}

function spokenCitation({ author, work, locator } = {}) {
  const head = [speakable(author), spokenWork(work)].filter(Boolean).join(', ');
  const loc = typeof locator === 'string' ? locator.trim() : '';
  if (!loc) return head;
  const said = moraliaCitation(loc) || dottedCitation(author, work, loc);
  return said ? `${head}, ${said}` : head;
}

module.exports = { spokenCitation, numberWords };
