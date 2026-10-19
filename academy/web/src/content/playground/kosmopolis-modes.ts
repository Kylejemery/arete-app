/**
 * Kosmopolis as a game, part three: worlds worth comparing, and what a cycle
 * leaves behind.
 *
 *   1. The daily world. Every visitor on a given UTC date gets the same planet,
 *      the same towns, the same founding souls, and the same School. Its first
 *      cycle is ranked; one score per visitor goes to the day's board.
 *   2. Scenarios. Authored starts (a tyranny already seated, a plague already
 *      raging), each under a fixed School so its board compares like with like.
 *      Their first cycle is ranked too, best score per visitor.
 *   3. Legacy cards. A closed cycle leaves cards for what it achieved: a sage,
 *      a concord, a tyrant overthrown. One can be carried into a later cycle
 *      as a small boon, and is spent in the carrying.
 *
 * Pure data and rules, as in kosmopolis-run.ts and kosmopolis-polis.ts.
 */

import type { VirtueKey, Virtues } from "@/content/playground/kosmopolis";
import { SCHOOL_KEYS, type SchoolKey, type Stores } from "@/content/playground/kosmopolis-polis";

/* ------------------------------------------------------------ ranked modes */

/** A world whose first cycle is ranked on a board. */
export type RankedMode = {
  kind: "daily" | "scenario";
  /** The date (YYYY-MM-DD, UTC) or the scenario id. */
  key: string;
  /** The board this world posts to: "daily:2026-10-19" or "scenario:the-thirty". */
  board: string;
  /** Which cycle of the world is ranked (always the first). */
  cycle: number;
  /** Set once the ranked cycle's score has been sent (or refused). */
  posted?: boolean;
};

export const BOARD_RE = /^(daily:[0-9]{4}-[0-9]{2}-[0-9]{2}|scenario:[a-z0-9-]{1,40})$/;

/** Today's date in UTC, YYYY-MM-DD. */
export function utcDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** A stable 31-bit seed from a string (FNV-1a). */
export function seedFrom(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) & 0x7fffffff;
}

/** The School of the day: the four take turns, one per UTC day. */
export function dailySchool(date: string): SchoolKey {
  const day = Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
  return SCHOOL_KEYS[((day % 4) + 4) % 4];
}

/**
 * Run fn with Math.random replaced by a seeded generator, then restore it.
 * The setup of a ranked world (towns, founding souls, a scenario's opening)
 * goes through the same rand/pick/makeName calls as any world, so seeding
 * Math.random for that one synchronous stretch makes it identical for everyone
 * without threading a generator through every helper. After setup the world
 * runs on ordinary randomness: from the first act on, each visitor's world is
 * their own.
 */
export function withSeed<T>(seed: number, fn: () => T): T {
  let a = seed | 0;
  const seeded = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const original = Math.random;
  Math.random = seeded;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

/* ---------------------------------------------------------------- scenarios */

export type ScenarioKey = "the-thirty" | "the-plague" | "the-sophists" | "lean-years" | "the-border";

export type Scenario = {
  id: ScenarioKey;
  title: string;
  /** Where and when the story is drawn from, in a few words. */
  after: string;
  body: string;
  school: SchoolKey;
  /** Every town starts with these stores. */
  stores?: Partial<Stores>;
  /** Shifts to every founding soul's virtues. */
  virtues?: Partial<Virtues>;
  /** A visitation of fortune already underway, by name (see FORTUNES). */
  fortune?: string;
  /** Threats present from the first year. */
  sophist?: number; // strength
  tyrant?: { grip: number; seized: boolean };
  rival?: number; // menace
  /** Breath held at the start, in place of PNEUMA_START. */
  pneuma?: number;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "the-thirty",
    title: "The Thirty",
    after: "Athens, 404 BC",
    body: "A faction already holds the assembly. Its laws are suspended and no vote will sit until the citizens take it back. Justice is thin.",
    school: "stoa",
    tyrant: { grip: 1, seized: true },
    virtues: { justice: -0.1 },
  },
  {
    id: "the-plague",
    title: "The Plague",
    after: "Athens, 430 BC",
    body: "A plague is already in the streets, and repute has gone with the dead. The Garden counsels calm; it will need it.",
    school: "garden",
    fortune: "a plague",
    stores: { standing: 0.3 },
  },
  {
    id: "the-sophists",
    title: "The Sophists Come to Town",
    after: "after Plato’s Protagoras",
    body: "A sophist at the height of fashion holds the largest town, and the people are not wise enough to answer. The Lyceum makes every store count double.",
    school: "lyceum",
    sophist: 1,
    virtues: { wisdom: -0.1 },
  },
  {
    id: "lean-years",
    title: "Lean Years",
    after: "a famine, anywhere",
    body: "The granaries are near empty and the coffers are not much better. Bread first, or virtue first? The Stoa says they are not rivals.",
    school: "stoa",
    fortune: "a famine",
    stores: { grain: 0.18, coin: 0.2 },
  },
  {
    id: "the-border",
    title: "The Border War",
    after: "Thebes and Sparta, 371 BC",
    body: "A strong rival is already at the frontier and will raid soon. The Cynics have nothing to lose and no walls to build.",
    school: "cynic",
    rival: 0.75,
  },
];

export const SCENARIO_KEYS = SCENARIOS.map((s) => s.id);

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** A human label for a board. */
export function boardLabel(board: string): string {
  if (board.startsWith("daily:")) return `The world of ${board.slice(6)}`;
  const sc = scenarioById(board.slice(9));
  return sc ? sc.title : board;
}

/* ------------------------------------------------------------ legacy cards */

export type LegacyKind = "sage" | "concord" | "refutation" | "tyrannicide" | "peace" | "law" | "plenty";

export type LegacyCard = {
  id: string;
  kind: LegacyKind;
  title: string;
  /** The cycle that earned it. */
  cycle: number;
  /** sage: the sage's name and virtues, to seed a soul with. */
  name?: string;
  virtues?: Virtues;
  /** law: the law to begin with. */
  law?: VirtueKey;
};

export const LEGACY_META: Record<LegacyKind, { glyph: string; earned: string; effect: string }> = {
  sage: { glyph: "✦", earned: "A sage lived at the close.", effect: "A soul of that sage's character is born in the first year." },
  concord: { glyph: "⟳", earned: "The cycle closed in concord.", effect: "Begin with 2 more pneuma." },
  refutation: { glyph: "§", earned: "A sophist was refuted.", effect: "A sophist arrives at half its sway." },
  tyrannicide: { glyph: "♛", earned: "A tyrant fell.", effect: "A would-be tyrant's grip grows 30% slower." },
  peace: { glyph: "⚑", earned: "A rival was brought to peace.", effect: "A rival arrives weaker and its menace grows slower." },
  law: { glyph: "⚖", earned: "The assembly enacted a law.", effect: "Begin with that law already enacted." },
  plenty: { glyph: "🌾", earned: "The towns closed well stocked.", effect: "Every town begins with 15 more of each store." },
};

/** The most cards a world keeps, newest first; the most a single cycle earns. */
export const LEGACY_MAX = 12;
export const LEGACY_PER_CYCLE = 3;
