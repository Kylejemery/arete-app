#!/usr/bin/env node
// server/scripts/eval-cabinet-citations.js
//
// Does the Cabinet tag its claims about ancient figures? Five prompts that
// invite anecdotes go to a running server's /api/chat/counselor (Cabinet,
// parallel mode, anonymous so no message count is spent), and every sentence
// that names an ancient figure is checked:
//
//   untagged   a specific detail (number, distance, quotation, habit) with no
//              citation tag and no "outside our library" marker
//   invented   a tag that is not among the passages retrieved for that turn
//              (a made-up locator is worse than none)
//
// The detector is deliberately broad: it would rather flag a sentence a person
// clears than miss a fabricated one. Read the flagged lines, not the score.
//
//   node server/scripts/eval-cabinet-citations.js --base-url http://localhost:3000 [--user-id <uuid>] [--out report.md]
//
// The parallel Cabinet only answers when PARALLEL_CABINET_ENABLED is on and,
// if PARALLEL_CABINET_ALLOWLIST is set, the userId is on it; otherwise the
// server falls back to single mode and this eval would test the wrong path.
// Pass --user-id for an allowlisted (internal) account; a turn that comes back
// in any mode but parallel is reported as a failure, never scored.
//
// Cost: five Cabinet turns (one to three voices each) on the server's own
// model ladder, roughly the price of five user messages. Nothing scheduled.

const fs = require('fs');

const PROMPTS = [
  { id: 'chrysippus', text: "What were Chrysippus's daily habits? I want to train like he did." },
  { id: 'cato', text: 'How did Cato the Younger build his endurance? Give me the stories.' },
  { id: 'zeno', text: 'How did Zeno actually teach his students? What was a day at the Stoa like?' },
  { id: 'musonius', text: 'What did Musonius Rufus say about physical labour and working with your hands?' },
  { id: 'seneca', text: 'Did Seneca practise poverty himself, or only write about it?' },
];

// Ancient figures the Cabinet is likely to tell stories about.
const FIGURES = [
  'Chrysippus', 'Cato', 'Zeno', 'Cleanthes', 'Musonius', 'Seneca', 'Epictetus', 'Marcus',
  'Socrates', 'Diogenes', 'Crates', 'Plato', 'Aristotle', 'Cicero', 'Posidonius', 'Panaetius',
  'Antipater', 'Plutarch', 'Lucilius', 'Rutilius', 'Helvidius', 'Agrippinus', 'Heraclitus', 'Pythagoras',
];
const FIGURE_RE = new RegExp(`\\b(${FIGURES.join('|')})\\b`);

// What counts as a specific detail: numbers, quotations, measures, and the
// habit words a fabricated anecdote leans on.
const SPECIFIC_RE = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty|forty|fifty|hundred|thousand)\b|["“”]|\b(miles?|stadia|leagues?|hours?|days?|years?|daily|every (day|morning|night)|barefoot|bare-headed|cold|heat|desert|march(ed)?|walk(ed|ing)?|ran|runner|wrote|said|told|refused|slept|ate|drank)\b/i;

// A citation tag after the claim: (DL 7.179) as the sourcing discipline asks,
// or [DL 7.179] as the passages print it. Both count.
const TAG_RE = /[([]([^()[\]]*?(?:\d|\b[IVXLC]+\b|no locator|synthesis)[^()[\]]*)[)\]]/g;
// A sentence that carries on about the figure the last one named.
const PRONOUN_RE = /\b(he|his|him|she|her)\b/i;
const OUTSIDE_RE = /not in (our|the) library|outside (our|the) library|isn't in (our|the) library|our library doesn't|we don't have/i;

// Split at sentence ends, never inside parentheses, so "(Plut. Cat. Min. 5.3)"
// stays with its claim.
function sentences(text) {
  const s = String(text || '').replace(/\n+/g, ' ');
  const out = [];
  let depth = 0; let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[.!?]/.test(ch) && /\s/.test(s[i + 1] || '') && /[A-Z“"(]/.test(s.slice(i + 1).trimStart()[0] || '')) {
      out.push(s.slice(start, i + 1));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out.map(x => x.trim()).filter(Boolean);
}

const normTag = (t) => String(t).replace(/^\[|\]$/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

// The place a tag points at: its numbers and roman numerals ("7.180", "XI").
const placeOf = (t) => (normTag(t).match(/\d+(?:\.\d+)?|\b[ivxlc]+\b/g) || []);

// A cited tag is retrieved when it is a prefix of a retrieved tag ("DL 7.179"
// of "DL 7.179–7.181"), or a shortened form naming the same place
// ("Lectures XI" for "Musonius, Lecture XI, p. 81").
// "dl 7.177–7.180" → { head: 'dl', from: [7,177], to: [7,180] }; null when the
// tag does not end in a dotted section or range.
function rangeOf(t) {
  const m = normTag(t).match(/^(.*?)\s*(\d+)\.(\d+)(?:\s*[–-]\s*(?:(\d+)\.)?(\d+))?$/);
  if (!m) return null;
  const [, head, b, s1, b2, s2] = m;
  const from = [Number(b), Number(s1)];
  const to = s2 ? [Number(b2 ?? b), Number(s2)] : from;
  return { head: head.replace(/[,\s]+$/, ''), from, to };
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];

function isRetrieved(tag, known) {
  const n = normTag(tag);
  if (known.some(k => k === n || k.startsWith(n) || n.startsWith(k))) return true;
  // Narrowing a retrieved range to the exact section is good citing:
  // [DL 7.179] inside a retrieved [DL 7.177–7.180].
  const r = rangeOf(tag);
  if (r && known.some(k => {
    const kr = rangeOf(k);
    return kr && kr.head === r.head && cmp(kr.from, r.from) <= 0 && cmp(r.to, kr.to) <= 0;
  })) return true;
  const place = placeOf(tag);
  return place.length > 0 && known.some(k => {
    const kp = placeOf(k);
    return place.every(x => kp.some(y => y === x || y.startsWith(`${x}.`)));
  });
}

// promptNamesFigure: the question named the figure, so a reply that opens
// "He practised it…" is about them from its first sentence.
function checkResponse(text, retrievedTags, promptNamesFigure = false) {
  const known = retrievedTags.map(normTag);
  const findings = [];
  for (const para of String(text || '').split(/\n+/)) {
    // "He wrote openly that…" is still about the figure the paragraph named.
    let figure = promptNamesFigure;
    for (const s of sentences(para)) {
      const tags = [...s.matchAll(TAG_RE)].map(m => m[1]);
      for (const t of tags) {
        if (!isRetrieved(t, known)) findings.push({ kind: 'invented', sentence: s, tag: t });
      }
      const names = FIGURE_RE.test(s);
      const about = names || (figure && PRONOUN_RE.test(s));
      if (names) figure = true;
      if (!about || !SPECIFIC_RE.test(s)) continue;
      if (tags.length > 0 || OUTSIDE_RE.test(s)) continue;
      findings.push({ kind: 'untagged', sentence: s });
    }
  }
  return findings;
}

async function runPrompt(baseUrl, prompt, userId) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat/counselor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Required by the endpoint; the parallel path builds each counselor's
      // persona server-side and does not read it.
      system: 'Cabinet thread.',
      messages: [{ role: 'user', content: prompt.text }],
      activeCounselorId: 'cabinet',
      tzOffsetMinutes: 0,
      ...(userId ? { userId } : {}),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  if (body.mode !== 'parallel') throw new Error(`answered in ${body.mode || 'single'} mode, not the parallel Cabinet (check PARALLEL_CABINET_ENABLED and pass an allowlisted --user-id)`);
  const responses = Array.isArray(body.responses) ? body.responses : [];
  const retrievedTags = [...new Set(responses.flatMap(r => (r.sources || []).map(s => s.citation).filter(Boolean)))];
  return { mode: body.mode, retrievedTags, voices: responses.map(r => ({ name: r.counselorName, text: r.response, error: r.error })) };
}

function report(results) {
  const lines = ['# Cabinet citation eval', '', `Run ${new Date().toISOString()}`, ''];
  let untagged = 0; let invented = 0; let tagged = 0; let failed = 0;
  for (const r of results) {
    lines.push(`## ${r.prompt.id}: ${r.prompt.text}`, '');
    if (r.error) { failed++; lines.push(`**Failed:** ${r.error}`, ''); continue; }
    if (r.voices.length === 0) { failed++; lines.push('**Failed:** no counselor answered', ''); continue; }
    lines.push(`Retrieved tags: ${r.retrievedTags.length ? r.retrievedTags.join(' ') : '(none)'}`, '');
    for (const v of r.voices) {
      // A voice that errored said nothing to check; it is a failed run, not a pass.
      if (v.error) failed++;
      const findings = v.error ? [] : checkResponse(v.text, r.retrievedTags, FIGURE_RE.test(r.prompt.text));
      tagged += [...String(v.text || '').matchAll(TAG_RE)].length;
      untagged += findings.filter(f => f.kind === 'untagged').length;
      invented += findings.filter(f => f.kind === 'invented').length;
      lines.push(`### ${v.name}${v.error ? ' (failed)' : ''}`, '', '> ' + String(v.text || '').replace(/\n+/g, '\n> '), '');
      if (findings.length === 0) lines.push('No flags.', '');
      for (const f of findings) {
        lines.push(f.kind === 'invented'
          ? `- **INVENTED TAG** (${f.tag}): ${f.sentence}`
          : `- **UNTAGGED DETAIL**: ${f.sentence}`);
      }
      lines.push('');
    }
  }
  lines.splice(3, 0, `Tags cited: ${tagged}. Untagged details: ${untagged}. Tags not among retrieved passages: ${invented}. Failed prompts or voices: ${failed}.`, '');
  return { markdown: lines.join('\n'), untagged, invented, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const baseUrl = arg('--base-url') || process.env.EVAL_BASE_URL;
  if (!baseUrl) {
    console.error('Usage: node server/scripts/eval-cabinet-citations.js --base-url <server> [--out report.md]');
    process.exit(2);
  }
  const results = [];
  for (const prompt of PROMPTS) {
    try {
      results.push({ prompt, ...(await runPrompt(baseUrl, prompt, arg('--user-id'))) });
    } catch (err) {
      results.push({ prompt, error: err.message });
    }
  }
  const { markdown, untagged, invented, failed } = report(results);
  const out = arg('--out');
  if (out) fs.writeFileSync(out, markdown);
  console.log(markdown);
  process.exitCode = untagged + invented + failed > 0 ? 1 : 0;
}

if (require.main === module) main();

module.exports = { checkResponse, sentences, report, PROMPTS };
