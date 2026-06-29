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

module.exports = {
  STOIC_AUTHORS,
  tradition,
  spine,
  workTitle,
  era,
  stripGutenberg,
};
