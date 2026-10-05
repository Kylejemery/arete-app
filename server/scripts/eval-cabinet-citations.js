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
//   verbatim   20 or more words copied in order from a retrieved passage
//              without quotation marks and a tag (sourcing rule 9); needs
//              the passage text, read from rag_corpus with server/.env
//
// The server replaces a tag that names no retrieved passage before the reply
// leaves it (lib/citation-check.js), so "invented" should stay at zero; the
// tags it replaced come back as citationFlags and are reported and counted.
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

// The tag pattern and the retrieved-tag matcher are the server's own
// (lib/citation-check.js), so the eval and the server agree on what counts.
const { TAG_RE, isRetrieved, verbatimOverlap, MIN_RUN_WORDS } = require('../lib/citation-check');
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

// promptNamesFigure: the question named the figure, so a reply that opens
// "He practised it…" is about them from its first sentence.
// passages: [{ tag, text }] retrieved for the turn, for the verbatim check.
function checkResponse(text, retrievedTags, promptNamesFigure = false, passages = []) {
  const known = retrievedTags;
  const findings = [];
  for (const v of verbatimOverlap(text, passages)) {
    findings.push({ kind: 'verbatim', sentence: v.excerpt, tag: v.tag, words: v.words, quoted: v.quoted, tagged: v.tagged });
  }
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
  const sources = responses.flatMap(r => r.sources || []);
  const retrievedTags = [...new Set(sources.map(s => s.citation).filter(Boolean))];
  const passages = await passageTexts(sources);
  return {
    mode: body.mode,
    retrievedTags,
    passages,
    voices: responses.map(r => ({ name: r.counselorName, text: r.response, error: r.error, serverFlags: r.citationFlags || [] })),
  };
}

// The text of each retrieved passage, by id, for the verbatim check. Reads
// rag_corpus with the server's own credentials (server/.env). Without them the
// verbatim check cannot run, and the report says so rather than passing.
let supabaseClient;
async function passageTexts(sources) {
  const ids = [...new Set(sources.map(s => s.id).filter(Boolean))];
  if (ids.length === 0) return null;
  if (supabaseClient === undefined) {
    require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    supabaseClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? require('@supabase/supabase-js').createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;
  }
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from('rag_corpus').select('id, chunk_text').in('id', ids);
  if (error || !Array.isArray(data)) return null;
  const byId = new Map(data.map(d => [d.id, d.chunk_text]));
  return sources.filter(s => byId.has(s.id)).map(s => ({ tag: s.citation, text: byId.get(s.id) }));
}

function report(results) {
  const lines = ['# Cabinet citation eval', '', `Run ${new Date().toISOString()}`, ''];
  let untagged = 0; let invented = 0; let tagged = 0; let failed = 0; let verbatim = 0; let serverFlagged = 0; let verbatimUnchecked = 0;
  for (const r of results) {
    lines.push(`## ${r.prompt.id}: ${r.prompt.text}`, '');
    if (r.error) { failed++; lines.push(`**Failed:** ${r.error}`, ''); continue; }
    if (r.voices.length === 0) { failed++; lines.push('**Failed:** no counselor answered', ''); continue; }
    lines.push(`Retrieved tags: ${r.retrievedTags.length ? r.retrievedTags.join(' ') : '(none)'}`, '');
    // No passage text means the verbatim check did not run; say so, never pass it.
    if (!Array.isArray(r.passages)) { verbatimUnchecked++; lines.push('**Verbatim check did not run:** no passage text for this turn.', ''); }
    for (const v of r.voices) {
      // A voice that errored said nothing to check; it is a failed run, not a pass.
      if (v.error) failed++;
      const findings = v.error ? [] : checkResponse(v.text, r.retrievedTags, FIGURE_RE.test(r.prompt.text), r.passages || []);
      tagged += [...String(v.text || '').matchAll(TAG_RE)].length;
      untagged += findings.filter(f => f.kind === 'untagged').length;
      invented += findings.filter(f => f.kind === 'invented').length;
      verbatim += findings.filter(f => f.kind === 'verbatim').length;
      // Tags the model wrote that the server replaced before the reply left it.
      const flags = v.serverFlags || [];
      serverFlagged += flags.length;
      lines.push(`### ${v.name}${v.error ? ' (failed)' : ''}`, '', '> ' + String(v.text || '').replace(/\n+/g, '\n> '), '');
      if (findings.length === 0 && flags.length === 0) lines.push('No flags.', '');
      for (const t of flags) lines.push(`- **TAG REPLACED BY SERVER**: ${t}`);
      for (const f of findings) {
        if (f.kind === 'invented') lines.push(`- **INVENTED TAG** (${f.tag}): ${f.sentence}`);
        else if (f.kind === 'verbatim') lines.push(`- **VERBATIM, ${f.words} words, ${f.quoted ? 'quoted' : 'unquoted'}, ${f.tagged ? 'tagged' : 'untagged'}** (from ${f.tag || 'a retrieved passage'}): ${f.sentence}`);
        else lines.push(`- **UNTAGGED DETAIL**: ${f.sentence}`);
      }
      lines.push('');
    }
  }
  lines.splice(3, 0,
    `Tags cited: ${tagged}. Untagged details: ${untagged}. Tags not among retrieved passages: ${invented}. ` +
    `Tags the server replaced: ${serverFlagged}. Verbatim runs of ${MIN_RUN_WORDS}+ words not quoted and tagged: ${verbatim}` +
    `${verbatimUnchecked ? ` (check did not run for ${verbatimUnchecked} prompt(s))` : ''}. Failed prompts or voices: ${failed}.`, '');
  return { markdown: lines.join('\n'), untagged, invented, failed, verbatim, serverFlagged, verbatimUnchecked };
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
  const { markdown, untagged, invented, failed, verbatim, serverFlagged, verbatimUnchecked } = report(results);
  const out = arg('--out');
  if (out) fs.writeFileSync(out, markdown);
  console.log(markdown);
  process.exitCode = untagged + invented + failed + verbatim + serverFlagged + verbatimUnchecked > 0 ? 1 : 0;
}

if (require.main === module) main();

module.exports = { checkResponse, sentences, report, PROMPTS };
