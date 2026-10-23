// server/seminar/agents.js
//
// The Outline and Draft agents of the Seminar Track transcript pipeline
// (Seminar Track spec, Part 3). Both are Opus calls over the unit context
// built by context.js. They see only that context: the unit's readings, the
// private full text of any assigned chapter, and concept neighbours on the
// modern fence. Counterposition material reaches them labelled as the object
// under examination.
//
// Neither agent writes chunk ids. They cite by the refs in the context (P3,
// R1 with a page or section), and pipeline.js resolves those refs, so every
// stored cite points at something the agent was actually given.

const { extractJson } = require('../synthesis/shared');
const { callClaudeStream, readReply, glimpse } = require('./claude');
const { LENGTH, MIN_STUDENT_OBJECTIONS, QUOTATION_LIMIT_WORDS } = require('./verify');

const OUTLINE_MODEL = 'claude-opus-5-5';
const DRAFT_MODEL = 'claude-opus-5-5';

const SHAPES = {
  aligned: ['opening', 'exposition', 'worked_example', 'student_objection', 'synthesis', 'exercise'],
  counterposition: ['opening', 'steelman', 'cross_examination', 'student_objection', 'synthesis'],
};

function shapeFor(stance) {
  return stance === 'aligned' ? SHAPES.aligned : SHAPES.counterposition;
}

const VOICE = `Voice and form, all binding:
1. ${LENGTH.min} to ${LENGTH.max} words in all, about 20 to 30 minutes spoken.
2. Two speakers, the Tutor and the Student. The Tutor knows the material cold but teaches by question as often as by statement. The Student is sharp, never a straw man: at least ${MIN_STUDENT_OBJECTIONS} real objections the Tutor has to work to answer, each in its own student_objection segment, and at least one objection the transcript leaves standing for the student to take into the Proctor session. The Student speaks in at least a third of the turns.
3. Written for the ear: short sentences, no tables, no lists, no headings, no "as shown above". A Greek term appears once with a gloss (for example prohairesis, the faculty of choice), then naturally.
4. Never use an em dash or an en dash. Use commas, colons, semicolons or parentheses.
5. Every claim about what a text says carries a cite. Cite only by the refs given in the material: {"ref": "P3"} for a passage, {"ref": "R1", "page": "109"} for a page of a reading, {"ref": "R2", "section": "2.32"} for a section of a reading. Never invent a ref, a page or a section that the material does not show.
6. Quote sparingly. At most ${QUOTATION_LIMIT_WORDS} consecutive words from any modern source or summary, always attributed in the line itself. Public domain ancient texts may be quoted more freely, still attributed.`;

const STANCE_RULES = {
  aligned: `Shape for an aligned work: opening, exposition, worked_example, student_objection, synthesis, exercise. For logic units the worked examples are actual derivations stepped through aloud ("first indemonstrable: if the first, then the second; the first; therefore the second"), and the exercise is a problem the student solves before the Proctor session.`,
  counterposition: `Shape for a work held as an opponent: opening; steelman (state the author's claim as strongly and fairly as he would, with his own historical example from the full text); cross_examination (the Stoic case against it, from the assigned counter readings); student_objection (the Student defends the author where he is strongest); synthesis (what survives, what does not, and why). The author's Reversal sections are where he admits the limits of his own law: use them in the cross examination.

The fence: the Tutor examines the opponent and never adopts him. The Tutor never says a law is good advice and never tells the student to follow it. The Tutor may say where the author saw something true about human beings, then show what the Stoic does with that truth instead. The Student may defend the author; the Tutor answers.`,
};

function materialBlock(ctx) {
  return ctx.blocks.map(b => `=== ${b.label} ===${b.text ? `\n${b.text}` : ''}`).join('\n\n');
}

function unitBlock(ctx) {
  const { course, unit } = ctx;
  return `COURSE: ${course.id}, ${course.title}${course.subtitle ? `: ${course.subtitle}` : ''}. Stance: ${course.stance}.
UNIT ${unit.unit_number}: ${unit.title}
Objectives: ${JSON.stringify(unit.objectives)}
Key concepts: ${(unit.key_concepts || []).join(', ') || 'none listed'}
Proctor brief (what the Proctor will probe next): ${unit.proctor_brief || 'none'}`;
}

/**
 * Outline: a segment plan naming the passages each segment will use.
 * @returns {Promise<{segments: object[], open_objection: string}>}
 */
async function outlineUnit(ctx, { notes = '', call = callClaudeStream, model = OUTLINE_MODEL } = {}) {
  const stance = ctx.course.stance === 'aligned' ? 'aligned' : 'counterposition';
  const system = `You plan a seminar transcript for the Arete Academy: a two voice dialogue between a Tutor and a Student working through one unit's reading. You plan; you do not write the dialogue.

${STANCE_RULES[stance]}

${VOICE}

Plan the transcript as an ordered list of segments in the shape above (a segment kind may recur; student_objection must occur at least ${MIN_STUDENT_OBJECTIONS} times). For each segment give its purpose, the specific passages it will use (by ref, with the page or section), and a word target. Name the objection the transcript leaves standing.

Return only JSON:
{"segments": [{"segment": "<kind>", "purpose": "<one or two sentences>", "uses": [{"ref": "R1", "page": "109", "why": "<what it supplies>"}], "target_words": <number>}], "open_objection": "<the objection left standing>"}`;
  const userPrompt = `${unitBlock(ctx)}
${notes ? `\nREVIEWER NOTES FOR THIS VERSION (Kyle):\n${notes}\n` : ''}
MATERIAL:
${materialBlock(ctx)}`;
  const data = await call({ model, system, userPrompt, maxTokens: 32000, effort: 'high' });
  const text = readReply(data, 'the outline agent');
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.segments) || !parsed.segments.length) throw new Error(`the outline agent returned no segment plan.${glimpse(text)}`);
  return { segments: parsed.segments, open_objection: String(parsed.open_objection || '') };
}

/**
 * Draft: the turns, written from the outline.
 * @param {object} opts.previous  {turns, problems} of a failed attempt to repair
 * @param {object[]} opts.prior   turns of the version Kyle sent back with notes
 * @returns {Promise<{speaker, segment, text, cites, pause_after_ms}[]>}
 */
async function draftUnit(ctx, outline, { notes = '', previous = null, prior = null, call = callClaudeStream, model = DRAFT_MODEL } = {}) {
  const stance = ctx.course.stance === 'aligned' ? 'aligned' : 'counterposition';
  const system = `You write seminar transcripts for the Arete Academy: a two voice dialogue, the Tutor and the Student, that a student reads now and that will later be read aloud by two voices. You write from a segment plan and from the material given, and from nothing else: no recalled quotations, no facts about a text that the material does not show.

${STANCE_RULES[stance]}

${VOICE}

Return only JSON:
{"turns": [{"speaker": "tutor" | "student", "segment": "<${shapeFor(stance).join(' | ')}>", "text": "<what is said>", "cites": [{"ref": "P3"} | {"ref": "R1", "page": "109"} | {"ref": "R2", "section": "2.32"}], "pause_after_ms": <300 to 1500>}]}`;
  const repair = previous
    ? `\nYOUR LAST DRAFT FAILED VERIFICATION. Fix every problem below and return the whole transcript again.\nPROBLEMS:\n${previous.problems.map(p => `- ${p.detail}`).join('\n')}\nLAST DRAFT:\n${JSON.stringify({ turns: previous.turns.map(({ speaker, segment, text, cites }) => ({ speaker, segment, text, cites })) })}\n`
    : '';
  const revising = prior
    ? `\nPREVIOUS VERSION, sent back with the reviewer notes above. Keep what the notes do not touch:\n${JSON.stringify({ turns: prior.map(({ speaker, segment, text }) => ({ speaker, segment, text })) })}\n`
    : '';
  const userPrompt = `${unitBlock(ctx)}
${notes ? `\nREVIEWER NOTES FOR THIS VERSION (Kyle):\n${notes}\n` : ''}${revising}
SEGMENT PLAN:
${JSON.stringify(outline)}
${repair}
MATERIAL:
${materialBlock(ctx)}`;
  const data = await call({ model, system, userPrompt, maxTokens: 64000, effort: 'high' });
  const text = readReply(data, 'the draft agent');
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.turns) || !parsed.turns.length) throw new Error(`the draft agent returned no turns.${glimpse(text)}`);
  return parsed.turns;
}

module.exports = { OUTLINE_MODEL, DRAFT_MODEL, SHAPES, shapeFor, outlineUnit, draftUnit, materialBlock };
