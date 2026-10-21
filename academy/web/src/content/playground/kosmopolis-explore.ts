/**
 * Kosmopolis exploration: the fog over the world, the expeditions that lift it,
 * and the land masses beyond the home shore that a cycle can settle.
 *
 * The planet is larger than its first towns know. Most of it begins under fog;
 * the founding towns can see only their own country. A visitor spends pneuma to
 * send an expedition, led by the bravest soul of the nearest town, toward a
 * point in the fog. It takes years to arrive, lifts the fog along its way, and
 * may not come back. Land it finds can be settled as a colony, at a price in
 * settlers, grain, and coin from the town that sends them.
 *
 * Pure rules and geometry only. The component owns the noise, the drawing, and
 * the world. All distances are in world units; R is the planet's radius.
 */

import type { Stores } from "@/content/playground/kosmopolis-polis";

/* ------------------------------------------------------------------ the fog */

/** The fog is a FOG_N by FOG_N grid laid over the planet's bounding square. */
export const FOG_N = 48;
/** Each founding town can see this far around it, as a fraction of R. */
export const SIGHT_START = 0.3;

export type Fog = Uint8Array; // 1 revealed, 0 hidden; length FOG_N * FOG_N

export function emptyFog(): Fog {
  return new Uint8Array(FOG_N * FOG_N);
}

function cellIndex(x: number, y: number, R: number): number {
  const i = Math.floor(((x + R) / (2 * R)) * FOG_N);
  const j = Math.floor(((y + R) / (2 * R)) * FOG_N);
  if (i < 0 || j < 0 || i >= FOG_N || j >= FOG_N) return -1;
  return j * FOG_N + i;
}

/** Whether the point (x, y) lies under lifted fog. Points off the grid count as hidden. */
export function isRevealed(fog: Fog, x: number, y: number, R: number): boolean {
  const c = cellIndex(x, y, R);
  return c >= 0 && fog[c] === 1;
}

/** Lift the fog in a circle. Returns how many cells were newly revealed. */
export function reveal(fog: Fog, x: number, y: number, radius: number, R: number): number {
  const cell = (2 * R) / FOG_N;
  const i0 = Math.max(0, Math.floor((x - radius + R) / cell));
  const i1 = Math.min(FOG_N - 1, Math.floor((x + radius + R) / cell));
  const j0 = Math.max(0, Math.floor((y - radius + R) / cell));
  const j1 = Math.min(FOG_N - 1, Math.floor((y + radius + R) / cell));
  let n = 0;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const cx = -R + (i + 0.5) * cell;
      const cy = -R + (j + 0.5) * cell;
      if (Math.hypot(cx - x, cy - y) > radius) continue;
      const k = j * FOG_N + i;
      if (fog[k] === 0) {
        fog[k] = 1;
        n++;
      }
    }
  }
  return n;
}

/** The share of the planet's disc that has been revealed, 0..1. */
export function revealedShare(fog: Fog, R: number): number {
  const cell = (2 * R) / FOG_N;
  let disc = 0;
  let seen = 0;
  for (let j = 0; j < FOG_N; j++) {
    for (let i = 0; i < FOG_N; i++) {
      const cx = -R + (i + 0.5) * cell;
      const cy = -R + (j + 0.5) * cell;
      if (Math.hypot(cx, cy) > R) continue;
      disc++;
      if (fog[j * FOG_N + i] === 1) seen++;
    }
  }
  return disc ? seen / disc : 0;
}

/** Pack the fog for a save: one character per cell. */
export function packFog(fog: Fog): string {
  let s = "";
  for (let k = 0; k < fog.length; k++) s += fog[k] ? "1" : "0";
  return s;
}

/** Unpack a saved fog, or null if it is not one. */
export function unpackFog(v: unknown): Fog | null {
  if (typeof v !== "string" || v.length !== FOG_N * FOG_N) return null;
  const fog = emptyFog();
  for (let k = 0; k < v.length; k++) fog[k] = v.charCodeAt(k) === 49 ? 1 : 0;
  return fog;
}

/* -------------------------------------------------------- the land beyond */

/** A land mass beyond the home shore: a centre, a radius, and a name. */
export type Landmass = { x: number; y: number; r: number; name: string };

/**
 * Where the land masses lie, from the world's seed: four to six islands in the
 * outer seas, clear of each other and inside the planet's rim. Deterministic,
 * so a world's islands are the same every time it loads, and every visitor on
 * a ranked board finds the same ones.
 */
export function landmasses(seed: number, R: number, name: (rnd: () => number) => string): Landmass[] {
  const rnd = mulberry((seed ^ 0x51ed270b) >>> 0);
  const count = 4 + ((rnd() * 3) | 0);
  const lands: Landmass[] = [];
  let tries = 0;
  while (lands.length < count && tries < 600) {
    tries++;
    const r = R * (0.1 + rnd() * 0.09);
    const ang = rnd() * Math.PI * 2;
    const dist = R * 0.66 + rnd() * (R * 0.94 - r - R * 0.66);
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist;
    if (lands.some((l) => Math.hypot(l.x - x, l.y - y) < l.r + r + R * 0.06)) continue;
    let n = name(rnd);
    for (let k = 0; k < 12 && lands.some((l) => l.name === n); k++) n = name(rnd);
    lands.push({ x, y, r, name: n });
  }
  return lands;
}

/** Which land mass, if any, a point lies on (by distance from its centre). */
export function landAt(lands: readonly Landmass[], x: number, y: number): number {
  for (let i = 0; i < lands.length; i++) if (Math.hypot(lands[i].x - x, lands[i].y - y) < lands[i].r * 0.8) return i;
  return -1;
}

/** A land mass counts as discovered once the fog over its centre has lifted. */
export function isDiscovered(fog: Fog, land: Landmass, R: number): boolean {
  return isRevealed(fog, land.x, land.y, R);
}

/* -------------------------------------------------------------- expeditions */

/** What an expedition costs, in pneuma. */
export const EXPEDITION_COST = 3;
/** How far an expedition travels in an acting year, as a fraction of R. */
export const EXPEDITION_PACE = 0.03;
/** How far the fog lifts around the expedition as it travels, and at its goal. */
export const SIGHT_ROUTE = 0.09;
export const SIGHT_GOAL = 0.2;
/** No more than this many expeditions abroad at once. */
export const EXPEDITIONS_MAX = 2;

/**
 * The chance an expedition is lost: it grows with the distance sailed and
 * shrinks with its leader's courage. Shown before it is sent, so the visitor
 * decides with the risk in view.
 */
export function expeditionRisk(distance: number, courage: number, R: number): number {
  const r = 0.1 + 0.22 * (distance / R) - 0.3 * (courage - 0.5);
  return Math.min(0.6, Math.max(0.04, r));
}

/** How many acting years an expedition takes to reach its goal. */
export function expeditionYears(distance: number, R: number): number {
  return Math.max(4, Math.ceil(distance / (R * EXPEDITION_PACE)));
}

/** An expedition abroad. The leader travels with it and is out of the world until it ends. */
export type Expedition = {
  id: number;
  from: number; // settlement index it set out from
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  depart: number; // runYears it set out
  years: number; // how long it takes
  risk: number; // chance it is lost, rolled on arrival
  leaderId: number; // the soul who leads it (held in `leader` while away)
};

/** Where an expedition is along its way, at a given acting year. */
export function expeditionAt(e: Expedition, runYears: number): { x: number; y: number; t: number } {
  const t = Math.min(1, Math.max(0, (runYears - e.depart) / e.years));
  return { x: e.sx + (e.tx - e.sx) * t, y: e.sy + (e.ty - e.sy) * t, t };
}

/* ------------------------------------------------------------------ colonies */

/** What founding a colony costs the town that sends it. */
export const COLONY_PNEUMA = 3;
export const COLONY_STORES: Partial<Stores> = { grain: 0.12, coin: 0.12 };
/** How many settlers go, and how many the sending town must have to spare them. */
export const COLONY_SETTLERS = 3;
export const COLONY_MIN_TOWN = 6;

/* ------------------------------------------------------------------- score */

/** Points for a cycle's discoveries, folded into scoreRun via RunTally. */
export const POINTS_PER_LAND = 25;
export const POINTS_PER_COLONY = 40;

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
