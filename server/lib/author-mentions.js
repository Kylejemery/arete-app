// server/lib/author-mentions.js
//
// When a question names an ancient author, keep some of the author's own
// words in the context. An unfiltered match_rag_corpus search for "What does
// Marcus Aurelius say about the present moment?" returns five rows about
// Marcus (Pigliucci's summary, an Arete synthesis, Joy, Davidson) and none of
// the Meditations: commentary names him and matches on the name, while his own
// text never does. His best passage scores 0.53 against 0.57 for the fifth
// commentary row. Filtered to his name, the same query returns only the
// Meditations. So the caller runs one author-filtered search per named author
// beside its general search and reserves slots for what comes back.
//
// Names come from the corpus, not a hand list: every author with primary text
// on library_shelf(). A newly promoted author is recognised within the cache
// window without a code change.

const SHELF_TTL_MS = 10 * 60 * 1000;

// Rows the reservation may bring in must clear the floor the rest of
// retrieval uses (server/retrieval.js MATCH_THRESHOLD), so a passing mention
// ("Smith said...") does not force a weak passage into the prompt.
const RESERVED_MIN_SIMILARITY = 0.4;

// Spellings a reader uses that the shelf label does not contain. Accents are
// folded before matching, so "Laertius" already finds "Diogenes Laërtius".
const NAME_VARIANTS = {
  Laozi: ['lao tzu', 'lao-tzu', 'laotzu', 'lao tse'],
};

// Words never matched on their own: particles, and given names too common
// to mean the author ("Adam" is not a reference to Adam Smith).
const NAME_WORD_STOP = new Set(['of', 'the', 'de', 'von', 'van', 'adam']);

function fold(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Full name always; each name word of four letters or more too, so "Marcus"
// and "Aurelius" each find Marcus Aurelius and "Zeno" finds Zeno of Citium.
// "Sun Tzu" matches only in full.
function buildNameRegex(author) {
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const full = fold(author).trim();
  if (!full) return null;
  const alts = new Set([full, ...(NAME_VARIANTS[author] || [])]);
  const words = full.split(/\s+/);
  if (words.length > 1) {
    for (const w of words) if (w.length >= 4 && !NAME_WORD_STOP.has(w)) alts.add(w);
  }
  return new RegExp([...alts].map(a => `\\b${esc(a)}\\b`).join('|'), 'i');
}

/**
 * Authors the question names, in the order it names them, at most `max`.
 * @param {string} text
 * @param {string[]} authors rag_corpus author labels
 */
function detectNamedAuthors(text, authors, max = 2) {
  const folded = fold(text);
  if (!folded || !Array.isArray(authors)) return [];
  const hits = [];
  for (const author of authors) {
    const re = buildNameRegex(author);
    const m = re && folded.match(re);
    if (m) hits.push({ author, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits.slice(0, max).map(h => h.author);
}

// The author-filtered search runs beside the general one, so it adds nothing
// while warm (~120 ms each). Cold, a common author's first search took 0.6 s
// (Marcus Aurelius), 2.1 s (Seneca) and 2.4 s (Plutarch) on 2026-09-30. Past
// this cap the reply goes out on the general rows alone rather than wait.
const AUTHOR_SEARCH_TIMEOUT_MS = 1000;

/**
 * Settle `promise` within `ms`. A slow or rejected search resolves to
 * `{ data: [], error }` instead, so it is dropped like a failed one and can
 * never take the general search down with it in a Promise.all.
 */
function withinTimeout(promise, ms = AUTHOR_SEARCH_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ data: [], error: { message: 'timeout' } }), ms);
  });
  const settled = Promise.resolve(promise).catch((err) => ({ data: [], error: { message: err?.message || String(err) } }));
  return Promise.race([settled, timeout]).finally(() => clearTimeout(timer));
}

let shelfCache = { authors: null, at: 0, pending: null };

async function loadPrimaryAuthors(supabase) {
  const { data, error } = await supabase.rpc('library_shelf');
  if (error) throw new Error(error.message);
  const authors = [...new Set((data || []).filter(r => r.text_type === 'primary').map(r => r.author))];
  shelfCache = { authors, at: Date.now(), pending: null };
  return authors;
}

/**
 * Every author with primary text on the shelf. Serves the cached list and
 * refreshes it in the background once stale, so only a cold start waits on
 * library_shelf(). Fails open: no list means no reservation, never an error.
 */
async function getPrimaryAuthors(supabase) {
  const fresh = Date.now() - shelfCache.at < SHELF_TTL_MS;
  if (shelfCache.authors && fresh) return shelfCache.authors;
  if (!shelfCache.pending) {
    shelfCache.pending = loadPrimaryAuthors(supabase).catch((err) => {
      console.error('[author-mentions] library_shelf failed:', err.message);
      shelfCache.pending = null;
      return shelfCache.authors || [];
    });
  }
  return shelfCache.authors || shelfCache.pending;
}

/**
 * Make room in `rows` for the named authors' primary passages.
 *
 * `named` holds the author-filtered results. Up to `perAuthor` primary rows
 * per author are kept, counting any that `rows` already holds; the rest of
 * `rows` keeps its order and gives up its lowest-ranked entries to make
 * room. The result never exceeds `total` rows. Rows below the similarity
 * floor, or that the caller's fence rejects, are not reserved.
 *
 * @param {Array} rows the general search, already expanded and fenced
 * @param {Array} named rows from the author-filtered searches
 * @param {number} total the slot count the caller had before
 * @param {object} [opts]
 * @param {(row: object) => boolean} [opts.fence]
 * @param {number} [opts.perAuthor]
 */
function reserveNamedPrimary(rows, named, total, opts = {}) {
  const fence = typeof opts.fence === 'function' ? opts.fence : () => true;
  const perAuthor = opts.perAuthor ?? 2;
  const base = (Array.isArray(rows) ? rows : []).slice(0, total);
  const held = new Set(base.map(r => r.id));
  const count = new Map();
  for (const r of base) {
    if (r.text_type === 'primary') count.set(r.author, (count.get(r.author) || 0) + 1);
  }
  const extra = [];
  const candidates = (Array.isArray(named) ? named : [])
    .filter(r => r && r.id && r.text_type === 'primary' && (r.similarity ?? 0) >= RESERVED_MIN_SIMILARITY && fence(r))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
  for (const r of candidates) {
    if (held.has(r.id)) continue;
    const n = count.get(r.author) || 0;
    if (n >= perAuthor) continue;
    count.set(r.author, n + 1);
    held.add(r.id);
    extra.push(r);
  }
  if (extra.length === 0) return base;
  // Trim from the bottom of the general rows, sparing the named authors'
  // own primary rows, which were counted toward the reservation above.
  const namedAuthors = new Set(candidates.map(r => r.author));
  const spared = (r) => r.text_type === 'primary' && namedAuthors.has(r.author);
  const kept = [...base];
  let over = kept.length + extra.length - total;
  for (let i = kept.length - 1; i >= 0 && over > 0; i--) {
    if (spared(kept[i])) continue;
    kept.splice(i, 1);
    over--;
  }
  return [...kept, ...extra].slice(0, total);
}

module.exports = {
  AUTHOR_SEARCH_TIMEOUT_MS,
  RESERVED_MIN_SIMILARITY,
  withinTimeout,
  buildNameRegex,
  detectNamedAuthors,
  getPrimaryAuthors,
  reserveNamedPrimary,
};
