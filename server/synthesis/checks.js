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

module.exports = { CHECK_MODEL, checkCitations, checkPolitical, passageBlock };
