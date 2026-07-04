// ---------------------------------------------------------------------------
// The Library of Arete — presentation helpers for the public reading rooms.
// Pure functions only (no I/O); the route handlers in index.js inject supabase
// and the RAG helpers. Keeps the corpus Stoic-focused while still surfacing
// every primary text for reading and discussion.
// ---------------------------------------------------------------------------

// Authors whose works form the Stoic foreground. Everything else in rag_corpus
// is still fully readable, but lives on the "wider tradition" shelf.
const STOIC_AUTHORS = new Set([
  'Marcus Aurelius',
  'Epictetus',
  'Seneca',
  'Zeno of Citium',  // founder of Stoicism
  'Cleanthes',
  'Cicero',
  'Diogenes Laërtius',
  'Musonius Rufus',  // Roman Stoic, Epictetus's teacher
  'Arnold',  // Roman Stoicism (E. V. Arnold)
  'Stock',   // A Guide to Stoicism (St. George Stock)
]);

// 'stoic' leads the rooms; 'wider' is the broader tradition; 'synthesis' is the
// corpus reflecting on itself.
function tradition(author, textType) {
  if (textType === 'synthesis') return 'synthesis';
  return STOIC_AUTHORS.has(author) ? 'stoic' : 'wider';
}

// Book-spine colors, drawn from the design's house palette.
const SPINES = {
  'Marcus Aurelius': '#2d1b4e',
  'Epictetus': '#0f2744',
  'Seneca': '#3a2415',
  'Zeno of Citium': '#0f2e1a',
  'Cleanthes': '#13324f',
  'Cicero': '#42321a',
  'Diogenes Laërtius': '#1d2c4a',
  'Musonius Rufus': '#16304a',
  'Arnold': '#0f2e1a',
  'Stock': '#24304a',
  'Adam Smith': '#33301c',
  'Aesop': '#244a3a',
  'Confucius': '#4a221a',
  'Laozi': '#1a3a3a',
  'Michel de Montaigne': '#3a1a2a',
  'Sun Tzu': '#4a1a1a',
  'Xenophon': '#2a2a4a',
  'Arete Synthesis': '#5a4a8a',
};
function spine(author) {
  return SPINES[author] || '#24304a';
}

// Cleaner display titles for terse / Latinate work names in the corpus.
const WORK_TITLES = {
  'Definibus': 'On the Ends of Good and Evil',
  'Tusculan Disputations': 'Tusculan Disputations',
  'Lives Book7': 'Lives of the Eminent Philosophers · Book VII',
  'Shortness': 'On the Shortness of Life',
  'Morals': 'Minor Dialogues & Moral Essays',
  'Clemency': 'On Clemency',
  'On Benefits': 'On Benefits',
  'Apocolocyntosis': 'Apocolocyntosis',
  'Letters': 'Letters to Lucilius',
  'Discourses': 'Discourses',
  'Enchiridion': 'Enchiridion',
  'Golden Sayings': 'The Golden Sayings',
  'Hymn To Zeus': 'Hymn to Zeus',
  'Meditations': 'Meditations',
  'Roman': 'Roman Stoicism',
  'Guide': 'A Guide to Stoicism',
  'Memorabilia': 'Memorabilia of Socrates',
  'Fables': 'Fables',
  'The Analects': 'The Analects',
  'Tao Te Ching': 'Tao Te Ching',
  'Essays': 'Essays',
  'The Art of War': 'The Art of War',
  'The Theory of Moral Sentiments': 'The Theory of Moral Sentiments',
};
function workTitle(work) {
  return WORK_TITLES[work] || work;
}

// Short era / provenance line per work, shown in the reader header.
const ERAS = {
  'Marcus Aurelius|Meditations': 'Rome · c. 170–180 AD',
  'Epictetus|Discourses': 'Nicopolis · c. 108 AD',
  'Epictetus|Enchiridion': 'The Handbook · c. 125 AD',
  'Epictetus|Golden Sayings': 'Nicopolis · 2nd century AD',
  'Zeno of Citium|Letter to King Antigonus': 'Athens · 3rd century BC',
  'Seneca|Letters': 'Rome · c. 65 AD',
  'Seneca|Shortness': 'Rome · c. 49 AD',
  'Seneca|Clemency': 'Rome · c. 55–56 AD',
  'Seneca|On Benefits': 'Rome · c. 60 AD',
  'Seneca|Morals': 'Rome · 1st century AD',
  'Seneca|Apocolocyntosis': 'Rome · c. 54 AD',
  'Cleanthes|Hymn To Zeus': 'Athens · 3rd century BC',
  'Cicero|Definibus': 'Rome · 45 BC',
  'Cicero|Tusculan Disputations': 'Rome · 45 BC',
  'Diogenes Laërtius|Lives Book7': 'c. 3rd century AD',
};
function era(author, work) {
  return ERAS[`${author}|${work}`] || '';
}

// --- Project Gutenberg cleaning ------------------------------------------------
// Most public-domain works carry a license header and footer. When a fetched
// page contains the START/END markers we trim everything outside them.
const GUT_START = /\*\*\*\s*START OF TH(?:E|IS) PROJECT GUTENBERG[^*]*\*\*\*/i;
const GUT_END = /\*\*\*\s*END OF TH(?:E|IS) PROJECT GUTENBERG[^*]*\*\*\*/i;

function stripGutenberg(text) {
  let t = text || '';
  const s = t.match(GUT_START);
  if (s) t = t.slice(s.index + s[0].length);
  const e = t.match(GUT_END);
  if (e) t = t.slice(0, e.index);
  return t.trim();
}

// --- Reader assembly ------------------------------------------------------
// rag_corpus chunks were cut for retrieval, not reading: consecutive chunks
// overlap by a few hundred characters, carry no paragraph breaks, and keep
// the source transcription's markup (_emphasis_, [12] footnote refs,
// [Sidenote: …]). These helpers turn a run of chunks back into a readable
// text: dedupe the overlaps, scrub the artifacts, and re-paragraph.

// Drop the prefix of `next` that repeats the tail of `prev` (the RAG overlap
// window). Probe with the first characters of `next`; if that probe appears
// in prev's tail and the full suffix/prefix match verifies, cut it.
const OVERLAP_PROBE = 32;
function dedupeOverlap(prev, next) {
  if (!prev || next.length < OVERLAP_PROBE) return next;
  const tail = prev.slice(-1600);
  const p = tail.lastIndexOf(next.slice(0, OVERLAP_PROBE));
  if (p === -1) return next;
  const overlap = tail.length - p;
  if (overlap >= next.length) return tail.endsWith(next) ? '' : next;
  return tail.endsWith(next.slice(0, overlap)) ? next.slice(overlap) : next;
}

// Join consecutive chunks into one flowing text, cutting each chunk's
// duplicated overlap against the chunk before it. `context` is the chunk just
// before the first one shown (the previous page's last chunk): it is used to
// trim the first chunk's leading overlap but is not itself included.
function stitchChunks(chunks, context = null) {
  let out = '';
  let prev = (context || '').trim();
  for (const raw of chunks) {
    const t = (raw || '').trim();
    if (!t) continue;
    const add = dedupeOverlap(prev, t).trim();
    prev = t;
    if (!add) continue;
    out = out ? `${out} ${add}` : add;
  }
  return out;
}

// Common abbreviations that end with a period mid-sentence; never treat them
// as sentence boundaries when re-paragraphing.
const ABBREVS = new Set([
  'mr', 'mrs', 'dr', 'st', 'jr', 'sr', 'prof', 'rev', 'hon',
  'etc', 'viz', 'cf', 'vs', 'ib', 'ibid', 'seq', 'al',
  'i.e', 'e.g', 'chap', 'ch', 'sec', 'vol', 'no', 'nos', 'p', 'pp', 'fl',
]);

// Split flowing prose into sentences, conservatively: break after .!?… (plus
// closing quotes/parens) followed by whitespace and a capital or opening
// quote — unless the word before the period is a known abbreviation or a
// single-letter initial ("M. Antoninus").
function splitSentences(text) {
  const out = [];
  const re = /[.!?…]["'”’)\]]*\s+(?=[“"'‘(\[]?[A-Z0-9])/g;
  let start = 0, m;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    const before = text.slice(start, m.index);
    const lastWord = (before.match(/([A-Za-z.]+)$/) || [])[1] || '';
    const w = lastWord.replace(/\.+$/, '').toLowerCase();
    if (ABBREVS.has(w) || /^[a-z]$/.test(w)) continue;
    out.push(text.slice(start, end).trimEnd());
    start = end;
  }
  if (start < text.length) out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

// Group sentences into paragraphs of a comfortable reading size.
const PARA_TARGET = 550;
function paragraphize(text) {
  if (text.length <= PARA_TARGET * 1.5) return [text];
  const sentences = splitSentences(text);
  const paras = [];
  let cur = '';
  for (const s of sentences) {
    cur = cur ? `${cur} ${s}` : s;
    if (cur.length >= PARA_TARGET) { paras.push(cur); cur = ''; }
  }
  if (cur) {
    // never leave a stub paragraph at the end
    if (cur.length < 140 && paras.length) paras[paras.length - 1] += ` ${cur}`;
    else paras.push(cur);
  }
  return paras;
}

// Make one stitched, flat text readable: scrub transcription artifacts, open
// paragraph breaks at the source's own section markers (CHAP. II., LETTER
// XLIV., numbered aphorisms, bare roman numerals), then split what remains
// into paragraph-sized groups of sentences.
function formatReadable(text) {
  let t = text || '';

  // transcription artifacts
  t = t.replace(/\[Sidenote:[^\]]*\]/gi, ' ');
  t = t.replace(/\[Illustration[^\]]*\]/gi, ' ');
  t = t.replace(/\[\d+\]/g, '');
  t = t.replace(/\{\d+\}/g, '');
  t = t.replace(/_([^_]{1,240}?)_/g, '$1'); // _emphasis_ → plain
  t = t.replace(/_/g, '');                  // stray unpaired underscores
  t = t.replace(/\s+/g, ' ').replace(/ ([,.;:!?])/g, '$1').trim();

  // section markers → paragraph breaks. All require a sentence end just
  // before, so numbers and numerals inside running prose are left alone.
  const SENT_END = `(?<=[^\\d][.!?…]["'”’]*) `;
  t = t.replace(new RegExp(`${SENT_END}(CHAP\\.\\s+[IVXLCDM]+\\.)`, 'g'), '\n\n$1');
  t = t.replace(new RegExp(`${SENT_END}((?:CHAPTER|LETTER|BOOK|PART|SECTION)\\s+(?:THE\\s+)?[IVXLCDM0-9]+\\.?)(?= ?[A-Z“"'])`, 'g'), '\n\n$1');
  // all-caps source headings ("OF SENECA’S WRITINGS.") stand on their own line
  t = t.replace(new RegExp(`${SENT_END}([A-Z][A-Z’']+(?: [A-Z][A-Z’']+){1,5}\\.)(?= [“"']?[A-Z])`, 'g'), '\n\n$1\n\n');
  t = t.replace(new RegExp(`${SENT_END}(?<!(?:CHAP|CHAPTER|LETTER|BOOK|PART|SECTION)\\. )([IVXLCDM]{2,}\\.?)(?= [“"']?[A-Z])`, 'g'), '\n\n$1');
  // numbered aphorisms/verses: "29. As thou…", "10. 1. When…" — but not
  // numbers in citations ("v. 197.", "p. 12.", "vol. 3.")
  t = t.replace(new RegExp(`${SENT_END}(?<!\\b(?:v|p|pp|No|no|vol|Vol|ch|sec)\\. )(\\d{1,3}\\.(?: \\d{1,3}\\.)?)(?= [“"']?[A-Z])`, 'g'), '\n\n$1');

  // re-paragraph each block to reading size
  return t.split(/\n\n+/)
    .map(b => b.trim()).filter(Boolean)
    .flatMap(paragraphize)
    .join('\n\n');
}

module.exports = {
  STOIC_AUTHORS,
  tradition,
  spine,
  workTitle,
  era,
  stripGutenberg,
  stitchChunks,
  formatReadable,
};
