/**
 * Kosmopolis as a game: the rules of a run.
 *
 * A run is one cosmic cycle, from the first year souls act until the world
 * passes into fire. Three things turn the sandbox into a game, and all three
 * live here as pure rules so a test or a server route could read them:
 *
 *   1. Pneuma, the breath the visitor acts through. Every intervention spends
 *      it, it returns slowly while time runs, and it never banks past a cap.
 *      A visitor cannot tend every soul, so tending becomes a choice.
 *   2. An arc with an ending. The cycle closes one of three ways: the visitor
 *      kindles the rebirth from a world in concord (the win), the city falls
 *      into stasis, civil strife, after too long below the floor of harmony
 *      (the loss), or the Great Year runs out first.
 *   3. A score, so one cycle can be weighed against another.
 *
 * No React here; the component imports these and does the drawing.
 */

/* ------------------------------------------------------------------ pneuma */

/** The most breath a visitor can hold at once. */
export const PNEUMA_MAX = 10;
/** Breath held when a cycle begins. */
export const PNEUMA_START = 6;
/** One breath returns every this many acting years. */
export const PNEUMA_EVERY = 12;

/** What each intervention costs, in pneuma. */
export const COSTS = {
  decide: 2, // help a soul through a dilemma
  rehearse: 1, // premeditatio malorum
  counsel: 1, // a voice of the tradition (also spends the Oracle)
  awaken: 2, // kindle reason (also spends the Oracle)
  seed: 2, // breathe a new soul into being
  vote: 3, // call the Assembly to bend the doctrine one step
  refute: 2, // answer a sophist
  rally: 2, // rally the citizens against a tyrant
  embassy: 2, // treat with the rival polis (and a little coin)
} as const;

export type CostKey = keyof typeof COSTS;

/* ------------------------------------------------------------- the arc */

/** How many acting years the Great Year lasts before the cycle closes regardless. */
export const RUN_YEARS = 600;
/** Harmony below this is discord. */
export const STASIS_FLOOR = 0.36;
/** Years of sustained discord before the city falls into stasis. */
export const STASIS_YEARS = 40;
/** Harmony the world must hold for the visitor to kindle the rebirth. */
export const CONCORD_HARMONY = 0.82;

/**
 * The Wheel: fortune turns faster and bites harder as a cycle ages. Left alone,
 * a world drifts toward concord on its own (habit compounds), which would make
 * the win a matter of waiting. The Wheel makes the late cycle the dangerous
 * one, so there is a window to build in and a real choice about when to kindle.
 * Returns multipliers on the doctrine's fortune frequency and on ill fortune's blow.
 */
export function wheel(runYears: number): { freq: number; harm: number } {
  const t = Math.min(1, Math.max(0, runYears / RUN_YEARS));
  return { freq: 1 + WHEEL_FREQ * t, harm: 1 + WHEEL_HARM * t };
}
export const WHEEL_FREQ = 2;
export const WHEEL_HARM = 1;

/**
 * Backsliding: each acting year an unawakened soul's virtues drift this
 * fraction of the way back toward BACKSLIDE_TO. Progress has to be tended; a
 * soul left alone slides back toward the ordinary. Awakened souls are exempt,
 * since reason, once kindled, holds them. Tuned by simulation (50 cycles each,
 * default doctrine): an untended world reached concord in 20 and fell into
 * stasis in 8; one tended with every dilemma it could afford won 38 and fell in 5.
 */
export const BACKSLIDE = 0.0015;
export const BACKSLIDE_TO = 0.45;

export type RunEnd = "concord" | "stasis" | "great-year";

export const RUN_END_META: Record<RunEnd, { title: string; kicker: string; body: string }> = {
  concord: {
    kicker: "The cycle closes in concord",
    title: "The world passes into fire, whole",
    body: "Harmony held, and you chose the moment. The conflagration takes a world that was ready, and its best souls seed the next.",
  },
  stasis: {
    kicker: "The cycle closes in stasis",
    title: "The city turned on itself",
    body: "Discord ran too long. Faction, then strife, then nothing left to govern. The fire comes for a world that had already come apart.",
  },
  "great-year": {
    kicker: "The Great Year is spent",
    title: "The fire comes on its own time",
    body: "The world never reached concord, nor fell into strife. The cycle ran its course, and the conflagration came as it always does.",
  },
};

/* ------------------------------------------------------------- the score */

/** What the score is computed from, gathered at the end of a run (or live, for the running tally). */
export type RunTally = {
  peakHarmony: number; // 0..1, the highest harmony the cycle reached
  goodDeaths: number; // souls who died well this cycle
  institutions: number; // institutions standing
  laws: number; // laws the assembly has enacted
  awake: number; // awakened souls alive
  sages: number; // awakened souls of the highest virtue alive
  pneuma: number; // breath unspent
  yearsLeft: number; // acting years left in the Great Year
  threatsMet?: number; // sophists refuted, tyrants overthrown, rivals brought to peace
  seized?: boolean; // a tyrant holds the assembly at the close: its laws do not count
};

export type ScoreLine = { label: string; points: number };

/**
 * Weigh a cycle. Concord earns a bonus and pays for time and breath left
 * unspent (a world brought to harmony sooner, by a lighter hand). Stasis halves
 * everything: what was built does not count for much once the city has fallen.
 */
export function scoreRun(t: RunTally, end: RunEnd | null): { total: number; lines: ScoreLine[] } {
  const lines: ScoreLine[] = [
    { label: "Peak harmony", points: Math.round(t.peakHarmony * 100) * 4 },
    { label: "Souls who died well", points: t.goodDeaths * 8 },
    { label: "Institutions standing", points: t.institutions * 20 },
    { label: t.seized ? "Laws enacted (the assembly is seized)" : "Laws enacted", points: t.seized ? 0 : t.laws * 35 },
    { label: "Souls awakened", points: t.awake * 12 },
    { label: "Sages", points: t.sages * 60 },
  ];
  if (t.threatsMet) lines.push({ label: "Threats overcome", points: t.threatsMet * 40 });
  if (end === "concord") {
    lines.push({ label: "Concord", points: 300 });
    lines.push({ label: "Years to spare", points: Math.max(0, Math.round(t.yearsLeft / 2)) });
    lines.push({ label: "Breath unspent", points: t.pneuma * 5 });
  }
  let total = lines.reduce((a, l) => a + l.points, 0);
  if (end === "stasis") {
    const lost = Math.round(total / 2);
    lines.push({ label: "Stasis", points: -lost });
    total -= lost;
  }
  return { total, lines };
}

/** A closed cycle, kept with the world so a visitor can see how they did before. */
export type RunRecord = { cycle: number; end: RunEnd; score: number; year: number };

/* ---------------------------------------------------------- shuffling */

/** Fisher-Yates, returning a new array. Used so the counselled course is never in a fixed place. */
export function shuffled<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
