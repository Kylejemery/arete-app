// server/synthesis/checks.js
//
// The two checks a synthesis draft passes through before it reaches Kyle's
// review queue. Both are Haiku calls (classification, so the cheap model),
// both run on the finished draft, and both only ever lower what a draft
// claims or flag it; neither rewrites prose.
//
//   checkCitations  For each section that reports what the sources say, is
//                   every claim supported by the passages the agent was
//                   given? A section that fails is marked unverified in the
//                   document instead of corpus_verified.
//   checkPolitical  Does the draft name a contemporary political actor,
//                   party, election, war or policy fight that is not in the
//                   world observation Kyle approved? The agent's own
//                   background knowledge is unreviewed, so anything it adds
//                   there is flagged.

const { callClaude, textOf, extractJson } = require('./shared');

const CHECK_MODEL = 'claude-haiku-4-5-20251001';

function passageBlock(passages) {
  return passages.map(p => `[Source ${p.n}] ${p.author}, ${p.work}${p.section_label ? `, ${p.section_label}` : ''}\n"${p.chunk_text}"`).join('\n\n');
}

/**
 * @param {{heading: string, body: string}[]} sections  the sections to check
 * @param {{n: number, author: string, work: string, section_label?: string, chunk_text: string}[]} passages
 * @returns {Promise<{heading: string, supported: boolean, sources: number[], problem: string}[]>}
 *   one entry per section, in order. A section the checker did not return is
 *   treated as unsupported: the check fails closed.
 */
async function checkCitations(sections, passages, { model = CHECK_MODEL } = {}) {
  if (!sections.length) return [];
  const system = `You check a philosophy document against the source passages it was written from. You do not judge style or interpretation. For each section, decide whether every factual claim about what an author said or held is supported by the passages provided. A claim attributed to an author who does not appear in the passages, a quotation that is not in a passage, or a doctrine the passages do not state is unsupported. General framing that makes no claim about a source is fine.

Return only JSON:
{"sections": [{"index": <number>, "supported": true|false, "sources": [<source numbers the section relies on>], "problem": "<one sentence naming the unsupported claim, or empty>"}]}`;
  const userPrompt = `SOURCE PASSAGES:
${passageBlock(passages)}

SECTIONS TO CHECK:
${sections.map((s, i) => `[Section ${i}] ${s.heading}\n${s.body}`).join('\n\n')}`;

  const data = await callClaude({ model, system, userPrompt, maxTokens: 2000 });
  const parsed = extractJson(textOf(data));
  const byIndex = new Map();
  for (const r of (parsed && Array.isArray(parsed.sections)) ? parsed.sections : []) {
    if (Number.isInteger(r.index)) byIndex.set(r.index, r);
  }
  return sections.map((s, i) => {
    const r = byIndex.get(i);
    if (!r) return { heading: s.heading, supported: false, sources: [], problem: 'the citation check returned no verdict for this section' };
    return {
      heading: s.heading,
      supported: r.supported === true,
      sources: Array.isArray(r.sources) ? r.sources.filter(Number.isInteger) : [],
      problem: String(r.problem || ''),
    };
  });
}

/**
 * @param {string} text            the whole draft
 * @param {string|null} approvedContext  the approved world observation the draft may draw on
 * @returns {Promise<{flagged: boolean, items: string[], error?: string}>}
 *   Fails closed: an unreadable verdict counts as flagged.
 */
async function checkPolitical(text, approvedContext, { model = CHECK_MODEL } = {}) {
  const system = `You screen a philosophy essay before a human reviews it. List every contemporary political reference in it: a named living politician or head of state, a political party, a current election, a current war or armed conflict, a current government policy dispute, or a specific recent news event. Historical references (ancient Rome, the Stoics' own times, events before 1950) are not contemporary. Generic phrases ("political polarization", "public life", "the news") are not specific references.

Then remove from your list anything that also appears in the APPROVED CONTEXT, which a human has already reviewed.

Return only JSON: {"items": ["<each remaining specific reference, quoted briefly>"]}`;
  const userPrompt = `APPROVED CONTEXT:
${approvedContext || '(none: no approved world observation was given to the writer, so every specific contemporary political reference counts)'}

ESSAY:
${text}`;
  try {
    const data = await callClaude({ model, system, userPrompt, maxTokens: 800 });
    const parsed = extractJson(textOf(data));
    if (!parsed || !Array.isArray(parsed.items)) return { flagged: true, items: [], error: 'unreadable verdict' };
    const items = parsed.items.map(String).map(s => s.trim()).filter(Boolean);
    return { flagged: items.length > 0, items };
  } catch (err) {
    return { flagged: true, items: [], error: err.message };
  }
}

// The tells, from docs/machine-tells.md (canonical list:
// academy/web/src/lib/machine-tells.ts, which the server cannot import).
const TELLS = Object.freeze([
  'dash: an em dash, an en dash used as one, or a spaced hyphen used as one',
  'negation-first frame: denying a reading nobody offered, then correcting it ("This is not X. It is Y.", "not X but Y" used for effect)',
  'announcing importance instead of showing it ("worth sitting with", "This is the crux", "This is a striking claim", "This is not incidental")',
  'hyperbole or over-the-top comparison',
  'signposting ("firstly", "in conclusion", "it is important to note", "in other words")',
  'thesaurus diction (delve, tapestry, navigate, crucial, pivotal, profound, nuanced, landscape, realm, underscore)',
  'the hedge stack ("While X is true, it is also worth noting that Y")',
  'the rhetorical question that answers itself',
  'the manufactured punchline ("The answer: discipline.")',
  'the summarizing ending or tidy moral',
  'talking to the reader about the writing ("Stay with me here")',
  'the sweeping claim about people ("Most people never ask this")',
]);

const DASH_RE = /[^\n.!?]*(?:\u2014|\s\u2013\s|\s-\s)[^\n.!?]*[.!?]?/g;

function squash(s) {
  return String(s || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * @param {string} text  the draft's prose
 * @returns {Promise<{tell: string, sentence: string}[]>}
 *   Only sentences that occur in the text. On a failed call, the dash
 *   findings alone, with an error entry so the review page says so.
 */
async function checkTells(text, { model = CHECK_MODEL } = {}) {
  const found = [];
  for (const m of String(text || '').match(DASH_RE) || []) {
    if (m.trim()) found.push({ tell: 'dash', sentence: m.trim() });
  }
  const system = `You find machine-writing tells in an essay so a human editor can fix them. The tells:
${TELLS.map((t, i) => `${i + 1}. ${t}`).join('\n')}

A philosophical contrast the argument needs ("preferred but not good") is not a tell. Quote each offending sentence exactly as it appears, one entry per sentence, at most 20.

Return only JSON: {"tells": [{"tell": "<short name>", "sentence": "<the exact sentence>"}]}`;
  try {
    const data = await callClaude({ model, system, userPrompt: text, maxTokens: 2000 });
    const parsed = extractJson(textOf(data));
    const hay = squash(text);
    for (const t of (parsed && Array.isArray(parsed.tells)) ? parsed.tells : []) {
      const sentence = String(t.sentence || '').trim();
      if (!sentence || !hay.includes(squash(sentence))) continue;   // invented or reworded
      if (found.some(f => squash(f.sentence) === squash(sentence))) continue;
      found.push({ tell: String(t.tell || 'tell').trim(), sentence });
    }
  } catch (err) {
    found.push({ tell: 'check failed', sentence: err.message });
  }
  return found.slice(0, 25);
}

module.exports = { CHECK_MODEL, TELLS, checkCitations, checkPolitical, checkTells, passageBlock };
