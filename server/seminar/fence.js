// server/seminar/fence.js
//
// Check 4 of the Seminar Track verifier (verify.js): in a counterposition
// course the Tutor examines the opponent and never adopts him. A Haiku call
// (classification, so the cheap model) reads the Tutor's turns and flags any
// turn that endorses the opponent's prescription. Flags block approval until
// Kyle clears each one; they never rewrite the transcript.
//
// What counts as endorsement is the spec's line for Greene: the Tutor may say
// where the opponent saw something true about human beings, and may state
// his case at full strength in the steelman, but never says the prescription
// is good advice or tells the student to follow it.

const { callClaude, textOf, extractJson } = require('../synthesis/shared');

const FENCE_MODEL = 'claude-haiku-5-5';

const SYSTEM = `You review the Tutor's lines in a two voice philosophy seminar transcript. The course reads a modern author as an opponent of the Stoics: his work is presented faithfully, then cross-examined against the Stoic texts. The Tutor must never adopt the opponent's prescriptions.

Flag a Tutor turn only if it endorses the opponent's prescription in the Tutor's own voice: it says the advice is good, wise, useful to follow, or right; tells the student to act on it; or presents it as compatible with virtue without qualification.

Do not flag:
- a faithful statement of the opponent's case, including in the steelman segment, where it is clearly his case ("Greene's claim is...", "on his view...");
- a statement that the opponent saw something true about human beings, followed by what the Stoic does with that truth instead;
- questions that test the student, or concessions the Tutor then examines.

Return only JSON: {"flags": [{"n": <turn number>, "reason": "<one sentence quoting the endorsing words>"}]}. Return {"flags": []} when nothing endorses.`;

/**
 * @param {{n: number, segment: string, text: string}[]} tutorTurns
 * @param {{opponent: string, work: string}} context  e.g. Robert Greene, The 48 Laws of Power
 * @returns {Promise<{n: number, reason: string}[]>}  throws when the model
 *   returns nothing parseable, so the verifier fails closed.
 */
async function classifyEndorsement(tutorTurns, context, { model = FENCE_MODEL, call = callClaude } = {}) {
  if (!tutorTurns.length) return [];
  const userPrompt = `OPPONENT: ${context.opponent}, ${context.work}

TUTOR TURNS:
${tutorTurns.map(t => `[Turn ${t.n}, ${t.segment}] ${t.text}`).join('\n\n')}`;
  const data = await call({ model, system: SYSTEM, userPrompt, maxTokens: 2000 });
  const parsed = extractJson(textOf(data));
  if (!parsed || !Array.isArray(parsed.flags)) throw new Error('the fence classifier returned no verdict');
  return parsed.flags.filter(f => Number.isInteger(f.n)).map(f => ({ n: f.n, reason: String(f.reason || '') }));
}

module.exports = { FENCE_MODEL, classifyEndorsement };
