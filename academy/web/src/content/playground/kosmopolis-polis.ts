/**
 * Kosmopolis as a game, part two: the polis and what presses on it.
 *
 * Phase 1 gave a run a budget and an ending. This module holds the rules that
 * make a run a matter of judgement rather than tending:
 *
 *   1. The indifferents. Each town keeps grain, coin, and standing. The Stoics
 *      called such things preferred indifferents: not goods, but not nothing
 *      either, and a town that runs out of them suffers, however virtuous its
 *      people. Institutions cost them, fortune drains them, and the counselled
 *      course in a dilemma often spends them.
 *   2. The Schools. A cycle begins by choosing one, and the School sets the
 *      doctrine (the dials). The dials are locked for the run; only an Assembly
 *      vote, which costs pneuma and can fail, moves one a step.
 *   3. The threats. A sophist who spreads vice, a tyrant who reaches for the
 *      assembly, and a rival polis on the border.
 *
 * Pure rules only, as in kosmopolis-run.ts; the component applies them.
 */

import type { Dials } from "@/content/playground/kosmopolis";

/* ------------------------------------------------------------ indifferents */

export type IndiffKey = "grain" | "coin" | "standing";
export type Stores = Record<IndiffKey, number>;

export const INDIFF_KEYS: IndiffKey[] = ["grain", "coin", "standing"];

export const INDIFF_META: Record<IndiffKey, { name: string; glyph: string; note: string }> = {
  grain: { name: "Grain", glyph: "🌾", note: "Bread. Grown by temperate, steady hands; famine and war take it." },
  coin: { name: "Coin", glyph: "◎", note: "Wealth. Fair dealing earns it; institutions and embassies spend it." },
  standing: { name: "Standing", glyph: "❦", note: "Repute among men. Justice and courage earn it; plague and tyranny wear it away." },
};

/** What a town holds when a cycle begins, each 0..1. */
export const STORES_START: Stores = { grain: 0.55, coin: 0.45, standing: 0.45 };

/** Below this a store has collapsed, and the town's souls suffer whatever their virtue. */
export const COLLAPSE = 0.15;

/** How fast a store moves toward what its people can sustain, per acting year. */
export const STORE_RATE = 0.02;

export function emptyStores(): Stores {
  return { ...STORES_START };
}

/** A town's comfort: the mean of what it holds. */
export function comfortOf(s: Stores): number {
  return (s.grain + s.coin + s.standing) / 3;
}

export function canPay(s: Stores, cost: Partial<Stores>): boolean {
  for (const k of INDIFF_KEYS) if ((cost[k] ?? 0) > s[k]) return false;
  return true;
}

/** Add signed deltas to a store, clamped to 0..1. */
export function addStores(s: Stores, delta: Partial<Stores>, scale = 1): void {
  for (const k of INDIFF_KEYS) {
    const d = delta[k];
    if (d) s[k] = Math.min(1, Math.max(0, s[k] + d * scale));
  }
}

/** A short signed label for a set of deltas, e.g. "−8 coin, +5 standing". */
export function storesLabel(delta: Partial<Stores>): string {
  return INDIFF_KEYS.filter((k) => delta[k])
    .map((k) => `${delta[k]! > 0 ? "+" : "−"}${Math.round(Math.abs(delta[k]!) * 100)} ${INDIFF_META[k].name.toLowerCase()}`)
    .join(", ");
}

/** A cost, unsigned: "20 coin, 5 standing". */
export function costLabel(cost: Partial<Stores>): string {
  return INDIFF_KEYS.filter((k) => cost[k])
    .map((k) => `${Math.round(cost[k]! * 100)} ${INDIFF_META[k].name.toLowerCase()}`)
    .join(", ");
}

/** What raising each institution costs the town. A town that cannot pay does not build. */
export const INST_COST: Record<"school" | "court" | "granary", Partial<Stores>> = {
  school: { coin: 0.2, standing: 0.05 },
  court: { coin: 0.15, standing: 0.1 },
  granary: { grain: 0.2, coin: 0.1 },
};

/** What each visitation of fortune does to every town's stores, on arrival. */
export const FORTUNE_STORES: Record<string, Partial<Stores>> = {
  "a plague": { grain: -0.08, standing: -0.12 },
  "a famine": { grain: -0.32 },
  "a war": { grain: -0.1, coin: -0.2, standing: -0.06 },
  "a season of plenty": { grain: 0.22, coin: 0.08 },
  "a great calm": { coin: 0.1, standing: 0.1 },
};

/* ------------------------------------------------------------- the Schools */

export type SchoolKey = "stoa" | "garden" | "lyceum" | "cynic";

export type School = {
  key: SchoolKey;
  name: string;
  founder: string;
  motto: string;
  /** What the School bends, in a line. */
  bends: string;
  /** The doctrine it sets, locked for the run. */
  dials: Dials;
  /** How much a town's comfort moves its souls: 1 is ordinary; 0 means the stores are not kept at all. */
  weight: number;
  /** Whether the School's towns keep stores at all (the Cynics do not). */
  stores: boolean;
  /** Resolve every soul holds at least, rehearsed or not. */
  resolveFloor: number;
  /** Whether towns raise institutions. */
  builds: boolean;
};

export const SCHOOLS: Record<SchoolKey, School> = {
  stoa: {
    key: "stoa",
    name: "The Stoa",
    founder: "Zeno of Citium",
    motto: "Virtue is sufficient for happiness.",
    bends: "A strong sage's shield: fortune barely moves the virtuous. Stores still matter when they fail.",
    dials: { contagion: 130, sageShield: 0.95, habituation: 0.006, fortuneFreq: 0.008 },
    weight: 0.6,
    stores: true,
    resolveFloor: 0,
    builds: true,
  },
  garden: {
    key: "garden",
    name: "The Garden",
    founder: "Epicurus",
    motto: "Live unnoticed.",
    bends: "Calm: fortune comes half as often and comfort steadies. But the good spreads weakly, friend to friend.",
    dials: { contagion: 60, sageShield: 0.75, habituation: 0.006, fortuneFreq: 0.004 },
    weight: 0.8,
    stores: true,
    resolveFloor: 0,
    builds: true,
  },
  lyceum: {
    key: "lyceum",
    name: "The Lyceum",
    founder: "Aristotle",
    motto: "Happiness needs external goods as well.",
    bends: "The indifferents count for double: full stores lift souls, empty ones crush them. Virtue shields less.",
    dials: { contagion: 130, sageShield: 0.7, habituation: 0.007, fortuneFreq: 0.008 },
    weight: 2,
    stores: true,
    resolveFloor: 0,
    builds: true,
  },
  cynic: {
    key: "cynic",
    name: "The Cynics",
    founder: "Diogenes of Sinope",
    motto: "Deface the currency.",
    bends: "No stores: nothing to drain and nothing to lose. Every soul holds high resolve. But towns raise no institutions.",
    dials: { contagion: 150, sageShield: 0.8, habituation: 0.008, fortuneFreq: 0.01 },
    weight: 0,
    stores: false,
    resolveFloor: 0.4,
    builds: false,
  },
};

export const SCHOOL_KEYS: SchoolKey[] = ["stoa", "garden", "lyceum", "cynic"];

export function isSchool(v: unknown): v is SchoolKey {
  return typeof v === "string" && (SCHOOL_KEYS as string[]).includes(v);
}

/* ----------------------------------------------------- the Assembly vote */

/** A vote can be called once in this many acting years. */
export const VOTE_EVERY = 40;
/** How far one vote moves a dial. */
export const VOTE_STEP: Dials = { contagion: 20, sageShield: 0.05, habituation: 0.001, fortuneFreq: 0.002 };
/** How many steps a School's doctrine can be bent, either way, over a whole run. */
export const VOTE_REACH = 2;

/** Whether the Assembly is persuaded: the wiser and better regarded the people, the likelier. */
export function voteChance(meanWisdom: number, meanStanding: number): number {
  return Math.min(0.95, Math.max(0.1, 0.25 + meanWisdom * 0.5 + meanStanding * 0.3));
}

/**
 * No vote takes a School past these: a sage never wholly unmoved, a world never
 * wholly out of fortune's reach. (Phase 1's free dials allowed both, and a
 * world at full shield with no fortune scored without trying.)
 */
export const VOTE_LIMITS: Partial<Record<keyof Dials, [number, number]>> = {
  sageShield: [0, 0.95],
  fortuneFreq: [0.002, 1],
};

/** The bounds a School's doctrine can be bent to by vote. */
export function voteBounds(school: SchoolKey, key: keyof Dials, min: number, max: number): [number, number] {
  const base = SCHOOLS[school].dials[key];
  const reach = VOTE_STEP[key] * VOTE_REACH;
  const [lo, hi] = VOTE_LIMITS[key] ?? [min, max];
  return [Math.max(min, lo, Math.min(base, base - reach)), Math.min(max, hi, Math.max(base, base + reach))];
}

/* ------------------------------------------------------------- the threats */

export type ThreatKey = "sophist" | "tyrant" | "rival";

/** A sophist walks a town, flattering souls out of their virtue. */
export type Sophist = { home: number; x: number; y: number; strength: number; since: number };
/** A tyrant reaches for the assembly; at full grip it has seized it. */
export type Tyrant = { name: string; home: number; grip: number; seized: boolean; since: number };
/** A rival polis on the border, whose menace grows until it is met. */
export type Rival = { name: string; menace: number; nextRaid: number; since: number };

export type Threats = { sophist: Sophist | null; tyrant: Tyrant | null; rival: Rival | null };

export function noThreats(): Threats {
  return { sophist: null, tyrant: null, rival: null };
}

export const THREAT_META: Record<ThreatKey, { title: string; body: string; counter: string; counterNote: string }> = {
  sophist: {
    title: "A sophist",
    body: "Clever, pleasant, and wrong. Souls near the sophist feel better and grow worse, and their vice spreads as vice does.",
    counter: "Refute the sophist",
    counterNote: "Strongest where a wise soul lives; awakened souls refute on their own, slowly.",
  },
  tyrant: {
    title: "A would-be tyrant",
    body: "Reaching for the assembly. Grip grows where justice and courage are thin. At full grip the assembly is seized: laws lapse, no vote is called, and standing drains.",
    counter: "Rally the citizens",
    counterNote: "As strong as the people's courage.",
  },
  rival: {
    title: "A rival polis",
    body: "Raids a town from time to time. Courage and standing turn a raid back; a town that fails loses grain and coin.",
    counter: "Send an embassy",
    counterNote: "Costs a little coin from the richest town. Menace driven low makes peace.",
  },
};

/** Sophist: how far its talk carries, in world units, and how hard it bites per year at full strength. */
export const SOPHIST_REACH = 160;
export const SOPHIST_BITE = 0.0025;
/** Tyrant: grip growth per year where justice and courage are both at zero. */
export const TYRANT_GROWTH = 0.016;
/** Rival: years between raids, and menace gained each year. */
export const RAID_EVERY = 45;
export const RIVAL_GROWTH = 0.002;

const RIVAL_NAMES = ["Sparta of the North", "the Thalassocracy", "Old Persis", "the League of Pella", "Carthage-over-the-Sea"];
export function rivalName(): string {
  return RIVAL_NAMES[(Math.random() * RIVAL_NAMES.length) | 0];
}
