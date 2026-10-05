// server/lib/citation-check.js
//
// Checks a Cabinet reply against the passages retrieved for its turn.
//
//   checkCitations   every tag in the reply must name a retrieved passage
//                    (sourcing rules 3 and 8); a tag that does not is replaced,
//                    visibly, with "(outside our library)", and returned so the
//                    caller can log it. The server runs this on every reply.
//   verbatimOverlap  long word-for-word runs shared with a retrieved passage
//                    that are not quoted and tagged (rule 9). The citation
//                    eval runs this to measure the model.
//   enforceSourcing  what the server runs on every reply: copied runs are put
//                    in quotation marks with their passage's tag
//                    (quoteVerbatim), then checkCitations.
//
// The eval (scripts/eval-cabinet-citations.js) uses the same matcher, so the
// server and the eval agree on what counts as a retrieved tag.

// A tag after a claim: (DL 7.179) as the sourcing discipline asks, or
// [DL 7.179] as the passages print it. Broad on purpose: the eval would rather
// flag a parenthesis a person clears than miss a made-up locator.
const TAG_RE = /[([]([^()[\]]*?(?:\d|\b[IVXLC]+\b|no locator|synthesis)[^()[\]]*)[)\]]/g;

// The narrower form the server rewrites. A bracketed tag always counts; a
// parenthesis counts only when it reads like a citation (opens with a capital,
// names a place) and is not a date, so "(AD 65)" or "(born 4 BC)" in a
// reply is never touched.
function looksLikeCitation(open, inner) {
  if (open === '[') return true;
  if (!/^[A-Z]/.test(inner)) return false;
  if (/\b(BC|BCE|AD|CE)\b|\bc\.\s?\d/.test(inner)) return false;
  return /\d|\b[IVXLC]+\b|no locator|synthesis/.test(inner);
}

const OUTSIDE_MARK = '(outside our library)';

const normTag = (t) => String(t).replace(/^[[(]|[\])]$/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

// The place a tag points at: its numbers and roman numerals ("7.180", "XI").
const placeOf = (t) => (normTag(t).match(/\d+(?:\.\d+)?|\b[ivxlc]+\b/g) || []);

// "7.180" → [7, 180]; "104" → [104].
const parts = (p) => p.split('.').map(Number);
const cmp = (a, b) => (a[0] - b[0]) || ((a[1] ?? 0) - (b[1] ?? 0));

// The words before a tag's first number: "dl", "seneca, ep.".
const headOf = (t) => normTag(t).split(/\d/)[0].replace(/[^a-z]/g, '');

// A retrieved range ("DL 7.180–7.183") holds a cited place or narrower range
// ("DL 7.180–7.181", "DL 7.182") in the same work.
function withinRange(tag, known) {
  const m = normTag(known).match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (!m || headOf(tag) !== headOf(known)) return false;
  const lo = parts(m[1]); const hi = parts(m[2]);
  const cited = (normTag(tag).match(/\d+(?:\.\d+)?/g) || []).map(parts);
  return cited.length > 0 && cited.every(c => cmp(c, lo) >= 0 && cmp(c, hi) <= 0);
}

// A cited tag is retrieved when it is a prefix of a retrieved tag ("DL 7.179"
// of "DL 7.179–7.181"), a place inside a retrieved range ("DL 7.180–7.181" of
// "DL 7.180–7.183"), or a shortened form naming the same place ("Lectures XI"
// for "Musonius, Lecture XI, p. 81").
function isRetrieved(tag, retrievedTags) {
  const known = retrievedTags.map(normTag);
  const n = normTag(tag);
  if (known.some(k => k === n || k.startsWith(n) || n.startsWith(k))) return true;
  if (known.some(k => withinRange(tag, k))) return true;
  const place = placeOf(tag);
  return place.length > 0 && known.some(k => {
    const kp = placeOf(k);
    return place.every(x => kp.some(y => y === x || y.startsWith(`${x}.`)));
  });
}

/**
 * @param {string} text           the reply
 * @param {string[]} retrievedTags tags of the passages the model was given
 * @returns {{ text: string, unmatched: string[] }}
 */
function checkCitations(text, retrievedTags) {
  if (typeof text !== 'string' || !text) return { text, unmatched: [] };
  const unmatched = [];
  const out = text.replace(TAG_RE, (whole, inner) => {
    if (!looksLikeCitation(whole[0], inner)) return whole;
    if (isRetrieved(inner, retrievedTags || [])) return whole;
    unmatched.push(whole);
    return OUTSIDE_MARK;
  });
  return { text: out, unmatched };
}

// --- Verbatim overlap -------------------------------------------------------

const SHINGLE = 8;        // words per comparison window
const MIN_RUN_WORDS = 20; // about one long sentence copied word for word

function words(text) {
  const out = [];
  const re = /[\p{L}\p{N}']+/gu;
  let m;
  while ((m = re.exec(String(text || '')))) out.push({ w: m[0].toLowerCase().replace(/'/g, ''), start: m.index, end: m.index + m[0].length });
  return out;
}

// Inside quotation marks at offset i: an odd count of straight quotes before
// it, or more opening curly quotes than closing ones.
function quotedAt(text, i) {
  const before = text.slice(0, i);
  const straight = (before.match(/"/g) || []).length;
  const open = (before.match(/“/g) || []).length;
  const close = (before.match(/”/g) || []).length;
  return straight % 2 === 1 || open > close;
}

/**
 * Runs of at least MIN_RUN_WORDS words a reply shares, in order, with one of
 * the passages, that are not both in quotation marks and followed closely by a
 * tag.
 *
 * @param {string} text
 * @param {{ tag?: string, text: string }[]} passages
 * @returns {{ words: number, excerpt: string, tag: string|null, quoted: boolean, tagged: boolean }[]}
 */
function verbatimOverlap(text, passages) {
  const reply = String(text || '');
  const rw = words(reply);
  const findings = [];
  for (const p of passages || []) {
    const pw = words(p.text).map(x => x.w);
    if (pw.length < SHINGLE || rw.length < SHINGLE) continue;
    const grams = new Set();
    for (let i = 0; i + SHINGLE <= pw.length; i++) grams.add(pw.slice(i, i + SHINGLE).join(' '));
    let i = 0;
    while (i + SHINGLE <= rw.length) {
      if (!grams.has(rw.slice(i, i + SHINGLE).map(x => x.w).join(' '))) { i++; continue; }
      let j = i;
      while (j + 1 + SHINGLE <= rw.length && grams.has(rw.slice(j + 1, j + 1 + SHINGLE).map(x => x.w).join(' '))) j++;
      const count = j - i + SHINGLE;
      if (count >= MIN_RUN_WORDS) {
        const start = rw[i].start;
        const end = rw[j + SHINGLE - 1].end;
        const paraEnd = (() => { const k = reply.indexOf('\n', end); return k < 0 ? reply.length : k; })();
        // A run can open with the tail of the sentence before its quotation
        // ("discipline. “He built…"); judge the quoting where the copy begins.
        const lead = reply.slice(start, Math.min(end, start + 40)).match(/^[^.!?]*[.!?]\s+/);
        const from = lead ? start + lead[0].length : start;
        const quoted = quotedAt(reply, from) || (lead !== null && /^[“"]/.test(reply.slice(from)));
        // The tag belongs right after the quotation, not somewhere later on.
        const tagged = new RegExp(TAG_RE.source).test(reply.slice(end, Math.min(paraEnd, end + 120)));
        if (!(quoted && tagged)) {
          findings.push({ words: count, start, end, excerpt: reply.slice(start, end), tag: p.tag || null, quoted, tagged });
        }
      }
      i = j + SHINGLE;
    }
  }
  return findings;
}

// Rule 9, enforced: a run copied from a passage without quotation marks and a
// tag gets both. A run that starts with the tail of an earlier sentence
// ("discipline. He built up…") is quoted from the sentence it copies.
function quoteVerbatim(text, passages) {
  if (typeof text !== 'string' || !text) return { text, quoted: [] };
  const found = verbatimOverlap(text, passages).filter(f => f.tag);
  // One fix per stretch of the reply: the longest run wins where two passages
  // share the same words.
  found.sort((a, b) => b.words - a.words);
  const keep = [];
  for (const f of found) if (!keep.some(k => f.start < k.end && k.start < f.end)) keep.push(f);
  keep.sort((a, b) => b.start - a.start);
  let out = text;
  for (const f of keep) {
    let start = f.start;
    const lead = out.slice(start, Math.min(f.end, start + 40)).match(/^[^.!?]*[.!?]\s+/);
    if (lead && !f.quoted) start += lead[0].length;
    let end = f.end;
    let insert = '';
    if (!f.quoted) {
      // Close the quotation after the run's own sentence-ending mark, if any.
      const tail = out.slice(end).match(/^[.!?]/);
      if (tail) end += 1;
      // A quotation the reply opened inside the run ("said: "What a…") is
      // closed by the reply's own mark; the outer quotation ends after it.
      const span = out.slice(start, end);
      const straightOpen = (span.match(/"/g) || []).length % 2 === 1;
      const curlyOpen = (span.match(/“/g) || []).length > (span.match(/”/g) || []).length;
      if (straightOpen || curlyOpen) {
        const close = out.slice(end, end + 40).search(straightOpen ? /"/ : /”/);
        if (close >= 0) end += close + 1;
      }
      insert = `”${f.tagged ? '' : ` ${f.tag}`}`;
      out = `${out.slice(0, start)}“${out.slice(start, end)}${insert}${out.slice(end)}`;
    } else {
      // Already quoted: put the tag just after the closing quotation mark.
      const close = out.slice(end, end + 40).search(/[”"]/);
      const at = close >= 0 ? end + close + 1 : end;
      out = `${out.slice(0, at)} ${f.tag}${out.slice(at)}`;
    }
  }
  return { text: out, quoted: keep.map(f => ({ tag: f.tag, words: f.words, wasQuoted: f.quoted, wasTagged: f.tagged })) };
}

/**
 * Both rules a reply is held to before it leaves the server: copied runs are
 * quoted and tagged (rule 9), then every tag must name a retrieved passage
 * (rule 8).
 *
 * @param {string} text
 * @param {{ tag: string, text: string }[]} passages  the turn's passages
 */
function enforceSourcing(text, passages) {
  const q = quoteVerbatim(text, passages);
  const c = checkCitations(q.text, (passages || []).map(p => p.tag));
  return { text: c.text, unmatched: c.unmatched, quoted: q.quoted };
}

module.exports = { TAG_RE, OUTSIDE_MARK, normTag, isRetrieved, checkCitations, verbatimOverlap, quoteVerbatim, enforceSourcing, MIN_RUN_WORDS };
