// server/seminar/verify.js
//
// The Seminar Track's write-path checks (Seminar Track spec, Part 6). Every
// write of a course, unit, reading, question or transcript runs the checks
// that apply to it, and a failure refuses the save. A transcript that fails
// is never shown for review.
//
//   1. no dashes      no em dash or en dash in titles, guides, transcripts,
//                     questions or briefs (locked style constraint)
//   2. citations      every cites.chunk_id is a live rag_corpus row; every
//                     cite without a chunk_id names an assigned reading of
//                     the unit and a locator inside it
//   3. quotations     no run of more than 60 words shared with a
//                     quotation_only or own_copy source (word n-gram overlap
//                     against the source text, or its summary)
//   4. fence          counterposition courses: a classifier flags any Tutor
//                     turn that endorses the opponent's prescription. Flags
//                     do not refuse the save; they block approval until Kyle
//                     clears each one (canApprove below).
//   5. length/balance 3,000 to 4,500 words; the Student has at least 25% of
//                     the turns; at least two student_objection segments
//
// The checks here are pure or take their database and model calls as
// arguments, so the tests run without either. fence.js holds the classifier.

const DASH_RE = /[–—]/;
const SEGMENTS = Object.freeze([
  'opening', 'exposition', 'steelman', 'cross_examination',
  'worked_example', 'student_objection', 'synthesis', 'exercise',
]);
const QUOTATION_LIMIT_WORDS = 60;
const LENGTH = Object.freeze({ min: 3000, max: 4500 });
const STUDENT_TURN_SHARE = 0.25;
const MIN_STUDENT_OBJECTIONS = 2;
// Roughly 150 spoken words a minute.
const WORDS_PER_MINUTE = 150;

const words = s => (String(s || '').match(/[A-Za-z0-9À-ɏͰ-Ͽἀ-῿']+/g) || []);
const wordCount = s => words(s).length;

// ── 1. No dashes ────────────────────────────────────────────────────────────

// Walks strings, arrays and plain objects; reports the path of each string
// holding an em or en dash. `label` names the record in the problem text.
function findDashes(value, label = 'value') {
  const problems = [];
  const walk = (v, path) => {
    if (typeof v === 'string') {
      if (DASH_RE.test(v)) {
        const at = v.search(DASH_RE);
        problems.push({ check: 'no_dashes', path, detail: `dash in ${path}: "${v.slice(Math.max(0, at - 30), at + 30)}"` });
      }
    } else if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${path}[${i}]`));
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    }
  };
  walk(value, label);
  return problems;
}

// ── 2. Citations ────────────────────────────────────────────────────────────

const norm = s => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\b(the|a|an|of|on)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Same author, and the same work by normalized title (articles dropped, so
// "The 48 Laws of Power" and "48 Laws of Power" agree). A surname alone
// matches a full name ("Seneca" and "Lucius Annaeus Seneca").
function sameSource(cite, reading) {
  const ca = norm(cite.author); const ra = norm(reading.author);
  if (!ca || !ra) return false;
  const authorOk = ca === ra || ra.split(' ').includes(ca) || ca.split(' ').includes(ra);
  return authorOk && norm(cite.work) === norm(reading.work);
}

// What a locator points at: laws ("Law 15", "Laws 2, 7 and 14"), printed
// pages ("p. 109", "pp. 107 to 118", "107-118"), and dotted section numbers
// ("1.1", "2.32", "Letters 3 and 9"). Section groups exclude the numbers that
// were already read as laws or pages.
function parseLocator(raw) {
  let s = String(raw || '').replace(/[–—]/g, '-');
  const laws = new Set();
  const pages = [];
  s = s.replace(/\blaws?\s+((?:\d+\s*(?:,|and|&|to|-)?\s*)+)/gi, (_, list) => {
    const range = list.match(/(\d+)\s*(?:to|-)\s*(\d+)/i);
    if (range) for (let n = +range[1]; n <= +range[2]; n++) laws.add(n);
    for (const n of list.match(/\d+/g) || []) laws.add(+n);
    return ' ';
  });
  s = s.replace(/\bpp?(?:\.\s*|\s+)([ivxlc]+|\d+)\b(?:\s*(?:to|-)\s*([ivxlc]+|\d+)\b)?/gi, (_, a, b) => {
    pages.push([a.toLowerCase(), (b || a).toLowerCase()]);
    return ' ';
  });
  const sections = (s.match(/\d+(?:\.\d+)*/g) || []).map(x => x.split('.').map(Number));
  return { laws, pages, sections };
}

const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100 };
function pageValue(p) {
  if (/^\d+$/.test(p)) return { roman: false, n: +p };
  let n = 0;
  for (let i = 0; i < p.length; i++) {
    const v = ROMAN[p[i]]; const next = ROMAN[p[i + 1]] || 0;
    n += v < next ? -v : v;
  }
  return { roman: true, n };
}
function pageWithin(page, [a, b]) {
  const p = pageValue(page); const lo = pageValue(a); const hi = pageValue(b);
  return p.roman === lo.roman && p.roman === hi.roman && p.n >= lo.n && p.n <= hi.n;
}

// A cite's locator lies inside a reading's locator when every law it names is
// one of the reading's laws, every page it names falls in one of the
// reading's page ranges, and every section it names extends one of the
// reading's sections ("2.32" inside "2", "1.1.5" inside "1.1"). A cite that
// names nothing parseable must match the reading's locator text exactly.
function locatorWithin(citeLocator, readingLocator) {
  const c = parseLocator(citeLocator);
  const r = parseLocator(readingLocator);
  const nothing = !c.laws.size && !c.pages.length && !c.sections.length;
  if (nothing) return norm(citeLocator) !== '' && norm(citeLocator) === norm(readingLocator);
  if (c.laws.size && ![...c.laws].every(n => r.laws.has(n))) return false;
  if (c.pages.length) {
    if (!r.pages.length) return false;
    if (!c.pages.every(([a, b]) => r.pages.some(rg => pageWithin(a, rg) && pageWithin(b, rg)))) return false;
  }
  if (c.sections.length) {
    if (!r.sections.length) return false;
    const extends_ = (cs, rs) => rs.length <= cs.length && rs.every((x, i) => cs[i] === x);
    if (!c.sections.every(cs => r.sections.some(rs => extends_(cs, rs)))) return false;
  }
  return true;
}

// lookupChunks(ids) resolves to [{id, deprecated}] for the ids that exist.
async function checkCitations(turns, readings, lookupChunks) {
  const problems = [];
  const ids = new Set();
  for (const t of turns) for (const c of t.cites || []) if (c.chunk_id) ids.add(c.chunk_id);
  const rows = ids.size ? await lookupChunks([...ids]) : [];
  const live = new Map((rows || []).map(r => [r.id, r]));
  for (const t of turns) {
    for (const c of t.cites || []) {
      if (c.chunk_id) {
        const row = live.get(c.chunk_id);
        if (!row) problems.push({ check: 'citations', turn: t.n, detail: `turn ${t.n}: chunk ${c.chunk_id} does not exist` });
        else if (row.deprecated) problems.push({ check: 'citations', turn: t.n, detail: `turn ${t.n}: chunk ${c.chunk_id} is deprecated` });
        continue;
      }
      const ok = readings.some(r => sameSource(c, r) && locatorWithin(c.locator, r.locator));
      if (!ok) {
        problems.push({ check: 'citations', turn: t.n, detail: `turn ${t.n}: ${c.author || '?'}, ${c.work || '?'} ${c.locator || ''} matches no assigned reading of this unit` });
      }
    }
  }
  return problems;
}

// ── 3. Quotation limits ─────────────────────────────────────────────────────

// Lowercase letters and digits only, so OCR punctuation noise and curly
// quotes do not hide a copied run.
const qWords = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter(Boolean);

// The longest run of consecutive words `text` shares with `source`, found by
// indexing every (limit + 1)-gram of the source and extending each hit.
function longestSharedRun(text, source, limit = QUOTATION_LIMIT_WORDS) {
  const t = qWords(text); const s = qWords(source);
  const n = limit + 1;
  if (t.length < n || s.length < n) return { words: 0, excerpt: '' };
  const grams = new Map();
  for (let i = 0; i + n <= s.length; i++) {
    const g = s.slice(i, i + n).join(' ');
    if (!grams.has(g)) grams.set(g, []);
    grams.get(g).push(i);
  }
  let best = { words: 0, excerpt: '' };
  for (let i = 0; i + n <= t.length; i++) {
    const hits = grams.get(t.slice(i, i + n).join(' '));
    if (!hits) continue;
    for (const j of hits) {
      let len = n;
      while (i + len < t.length && j + len < s.length && t[i + len] === s[j + len]) len++;
      if (len > best.words) best = { words: len, excerpt: t.slice(i, i + Math.min(len, 12)).join(' ') };
    }
  }
  return best;
}

// sources: [{label, text}] for every quotation_only or own_copy source the
// unit draws on (the full text where the server holds it, else the summary).
// Each turn is checked, and so is the whole transcript read as one text, so
// a long quotation split across two turns is still caught.
function checkQuotations(turns, sources, limit = QUOTATION_LIMIT_WORDS) {
  const problems = [];
  const whole = turns.map(t => t.text).join(' ');
  for (const src of sources) {
    for (const t of turns) {
      const run = longestSharedRun(t.text, src.text, limit);
      if (run.words > limit) {
        problems.push({ check: 'quotations', turn: t.n, detail: `turn ${t.n}: ${run.words} words copied from ${src.label} ("${run.excerpt} ..."); the limit is ${limit}` });
      }
    }
    if (!problems.some(p => p.check === 'quotations')) {
      const run = longestSharedRun(whole, src.text, limit);
      if (run.words > limit) {
        problems.push({ check: 'quotations', detail: `${run.words} words copied from ${src.label} across turns ("${run.excerpt} ..."); the limit is ${limit}` });
      }
    }
  }
  return problems;
}

// ── 5. Length and balance (and the shape of turns) ──────────────────────────

function checkShape(turns, speakers) {
  const problems = [];
  const keys = new Set((speakers || []).map(s => s.key));
  if (!Array.isArray(turns) || !turns.length) return [{ check: 'shape', detail: 'the transcript has no turns' }];
  turns.forEach((t, i) => {
    if (t.n !== i + 1) problems.push({ check: 'shape', turn: t.n, detail: `turn ${i + 1} is numbered ${t.n}` });
    if (!keys.has(t.speaker)) problems.push({ check: 'shape', turn: t.n, detail: `turn ${t.n}: unknown speaker "${t.speaker}"` });
    if (!SEGMENTS.includes(t.segment)) problems.push({ check: 'shape', turn: t.n, detail: `turn ${t.n}: unknown segment "${t.segment}"` });
    if (!String(t.text || '').trim()) problems.push({ check: 'shape', turn: t.n, detail: `turn ${t.n} is empty` });
    if (t.cites !== undefined && !Array.isArray(t.cites)) problems.push({ check: 'shape', turn: t.n, detail: `turn ${t.n}: cites is not a list` });
  });
  return problems;
}

function transcriptStats(turns) {
  const wc = turns.reduce((n, t) => n + wordCount(t.text), 0);
  const student = turns.filter(t => t.speaker === 'student').length;
  const objections = new Set(turns.filter(t => t.segment === 'student_objection').map(t => t.n));
  // Consecutive student_objection turns are one objection segment.
  let segments = 0;
  turns.forEach((t, i) => {
    if (t.segment === 'student_objection' && (i === 0 || turns[i - 1].segment !== 'student_objection')) segments++;
  });
  return {
    word_count: wc,
    est_minutes: Math.round(wc / WORDS_PER_MINUTE),
    student_share: turns.length ? student / turns.length : 0,
    student_objection_segments: segments,
    student_objection_turns: objections.size,
  };
}

function checkLengthBalance(turns) {
  const s = transcriptStats(turns);
  const problems = [];
  if (s.word_count < LENGTH.min || s.word_count > LENGTH.max) {
    problems.push({ check: 'length_balance', detail: `${s.word_count} words; a transcript runs ${LENGTH.min} to ${LENGTH.max}` });
  }
  if (s.student_share < STUDENT_TURN_SHARE) {
    problems.push({ check: 'length_balance', detail: `the Student has ${Math.round(s.student_share * 100)}% of the turns; at least ${STUDENT_TURN_SHARE * 100}% is required` });
  }
  if (s.student_objection_segments < MIN_STUDENT_OBJECTIONS) {
    problems.push({ check: 'length_balance', detail: `${s.student_objection_segments} student_objection segment(s); at least ${MIN_STUDENT_OBJECTIONS} are required` });
  }
  return problems;
}

// ── 4. Fence flags and approval ─────────────────────────────────────────────

// classify(tutorTurns) resolves to [{n, reason}] for the turns that endorse
// the opponent's prescription. It runs only for counterposition and mixed
// courses. A classifier failure fails closed: the transcript is refused,
// since an unchecked counterposition transcript must never reach review.
async function runFence(turns, stance, classify) {
  if (stance !== 'counterposition' && stance !== 'mixed') return { ran: false, flags: [], problems: [] };
  const tutorTurns = turns.filter(t => t.speaker === 'tutor').map(t => ({ n: t.n, segment: t.segment, text: t.text }));
  try {
    const flagged = await classify(tutorTurns);
    const tutorNs = new Set(tutorTurns.map(t => t.n));
    const flags = (flagged || [])
      .filter(f => tutorNs.has(f.n))
      .map(f => ({ n: f.n, reason: String(f.reason || ''), cleared: false, cleared_at: null }));
    return { ran: true, flags, problems: [] };
  } catch (err) {
    return { ran: false, flags: [], problems: [{ check: 'fence', detail: `the counterposition classifier did not run (${err.message}); the transcript cannot be saved unchecked` }] };
  }
}

// A transcript can be approved only when it passed verification and every
// fence flag has been cleared.
function canApprove(checks) {
  if (!checks || checks.ok !== true) return { ok: false, reason: 'the transcript has not passed verification' };
  const open = (checks.fence?.flags || []).filter(f => !f.cleared);
  if (open.length) return { ok: false, reason: `${open.length} fence flag(s) uncleared (turns ${open.map(f => f.n).join(', ')})` };
  return { ok: true };
}

// ── All checks for one transcript ───────────────────────────────────────────

/**
 * @param {object} args
 * @param {object[]} args.turns
 * @param {object[]} args.speakers
 * @param {string}   args.stance          the course's stance
 * @param {object[]} args.readings        the unit's seminar_readings rows
 * @param {object[]} args.quotationSources [{label, text}]
 * @param {function} args.lookupChunks    ids -> [{id, deprecated}]
 * @param {function} args.classify        tutor turns -> [{n, reason}]
 * @returns {Promise<{ok: boolean, problems: object[], stats: object, fence: object, checked_at: string}>}
 */
async function verifyTranscript({ turns, speakers, stance, readings, quotationSources, lookupChunks, classify }) {
  const shape = checkShape(turns, speakers);
  if (shape.length) {
    return { ok: false, problems: shape, stats: null, fence: { ran: false, flags: [] }, checked_at: new Date().toISOString() };
  }
  const problems = [
    ...findDashes(turns.map(t => ({ text: t.text, cites: t.cites })), 'turns'),
    ...(await checkCitations(turns, readings, lookupChunks)),
    ...checkQuotations(turns, quotationSources),
    ...checkLengthBalance(turns),
  ];
  const fence = await runFence(turns, stance, classify);
  problems.push(...fence.problems);
  return {
    ok: problems.length === 0,
    problems,
    stats: transcriptStats(turns),
    fence: { ran: fence.ran, flags: fence.flags },
    checked_at: new Date().toISOString(),
  };
}

module.exports = {
  SEGMENTS,
  QUOTATION_LIMIT_WORDS,
  LENGTH,
  STUDENT_TURN_SHARE,
  MIN_STUDENT_OBJECTIONS,
  wordCount,
  findDashes,
  parseLocator,
  locatorWithin,
  sameSource,
  checkCitations,
  longestSharedRun,
  checkQuotations,
  checkShape,
  transcriptStats,
  checkLengthBalance,
  runFence,
  canApprove,
  verifyTranscript,
};
