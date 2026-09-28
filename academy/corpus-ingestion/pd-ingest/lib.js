// pd-ingest/lib.js — small shared helpers. No dependencies, so the parsers
// and the chunker test without an install.

const crypto = require('crypto');

function nfc(s) {
  return String(s == null ? '' : s).normalize('NFC');
}

function sha256(bufOrString) {
  return crypto.createHash('sha256').update(bufOrString).digest('hex');
}

function countWords(s) {
  const t = String(s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', shy: '', thinsp: ' ',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', aacute: 'á', agrave: 'à', acirc: 'â',
  ouml: 'ö', uuml: 'ü', auml: 'ä', iuml: 'ï', ccedil: 'ç', oelig: 'œ', aelig: 'æ',
  middot: '·', sect: '§', para: '¶', dagger: '†', laquo: '«', raquo: '»',
};

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in NAMED_ENTITIES ? NAMED_ENTITIES[n.toLowerCase()] : m));
}

// Tags out, entities decoded, whitespace collapsed, NFC. Block-level tags
// become paragraph breaks so paragraph structure survives.
function htmlToText(html) {
  const t = String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\s*(br|\/p|\/div|\/h\d|\/li|\/tr|\/blockquote)\b[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');
  return nfc(decodeEntities(t))
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

// Deterministic PRNG so an OCR sample and the report's "random" chunks are
// the same on every run of the same data.
function seededRandom(seedText) {
  let h = parseInt(sha256(String(seedText)).slice(0, 8), 16) || 1;
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}

function sample(arr, n, seedText) {
  const rnd = seededRandom(seedText);
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// OCR garble estimate: the share of sampled word tokens that cannot be a word
// in the document's script. A heuristic, not a spell-check (there is no
// dictionary for 1890 German or Teubner Latin here), so it is reported as an
// estimate and the report shows the sampled garbles for a human to judge.
const SCRIPTS = {
  german: /^[A-Za-zÄÖÜäöüßſ]+$/,
  latin: /^[A-Za-zÆæŒœëïüāēīōūĀĒĪŌŪ]+$/,
  english: /^[A-Za-z]+$/,
  ancient_greek: /^[Ͱ-Ͽἀ-῿̀-ͯ’ʼ']+$/,
};
const VOWELS = {
  german: /[aeiouyäöü]/i,
  latin: /[aeiouyæœ]/i,
  english: /[aeiouy]/i,
  ancient_greek: /[αεηιουωάέήίόύώὰὲὴὶὸὺὼᾶῆῖῦῶἀἐἠἰὀὐὠἁἑἡἱὁὑὡ]/i,
};

function isGarbled(token, language) {
  const w = token.replace(/^[„“”"'‘’«»([{]+|[.,;:!?·’'”“»)\]}\-–—]+$/g, '');
  if (w.length < 2) return false;
  if (/^\d+$/.test(w)) return false;
  const script = SCRIPTS[language] || SCRIPTS.english;
  if (!script.test(w)) return true;
  if (w.length > 3 && !(VOWELS[language] || VOWELS.english).test(w)) return true;
  if (/(.)\1\1/.test(w)) return true;
  return false;
}

function garbleEstimate(text, language, { sampleSize = 500, seed = 'ocr' } = {}) {
  const tokens = String(text).split(/\s+/).filter((t) => t.replace(/[^\p{L}\d]/gu, '').length >= 2);
  if (!tokens.length) return { rate: null, sampled: 0, garbled: [] };
  const picked = sample(tokens, sampleSize, seed);
  const garbled = picked.filter((t) => isGarbled(t, language));
  return { rate: garbled.length / picked.length, sampled: picked.length, garbled };
}

// The spec's threshold: more than about 5% of sampled words garbled is poor.
function ocrQuality(rate) {
  if (rate == null) return null;
  if (rate > 0.05) return 'poor';
  if (rate > 0.02) return 'fair';
  return 'good';
}

module.exports = {
  nfc, sha256, countWords, decodeEntities, htmlToText, seededRandom, sample,
  isGarbled, garbleEstimate, ocrQuality,
};
