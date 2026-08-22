"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VIRTUES,
  VIRTUE_KEYS,
  EPOCHS,
  LAWS,
  DIAL_META,
  DEFAULT_DIALS,
  COUNSELORS,
  FORTUNES,
  GOOD_DEEDS,
  ILL_DEEDS,
  arete,
  dominantVirtue,
  makeName,
  virtueDef,
  type VirtueKey,
  type Dials,
} from "@/content/playground/kosmopolis";
import { pickDilemma, type Dilemma, type DilemmaOption } from "@/content/playground/kosmopolis-dilemmas";
import { faultyFor, type FaultyReasoning } from "@/content/playground/kosmopolis-reasonings";

/**
 * Kosmopolis — the world itself.
 *
 * A rule-based moral physics runs in the browser (free, ~60fps): souls appear,
 * act on their leanings, and brighten or dim the world around them. Two acts
 * spend the Oracle instead of instinct — awakening a soul to reason, and
 * counselling one through a Cabinet voice — and those are remembered in a shared
 * ledger. The doctrine is adjustable (the dials), and at high harmony the world
 * can pass through fire and begin again, carrying its best souls forward.
 *
 * State lives in a mutable ref (the simulation) that the animation loop reads at
 * frame rate; a throttled snapshot is mirrored into React state to paint the
 * chrome. See content/playground/kosmopolis.ts for the pure model.
 */

// Canvas backing resolution. Larger than the default display box so the world
// stays crisp when the window is expanded or taken fullscreen.
const W = 1680;
const H = 1050;
const MAX_SOULS = 150;
const REBIRTH_HARMONY = 0.82;
const REBIRTH_YEARS = 120;

// The world is a planet-face: procedural land inside a disc of this radius, in
// world units. The camera flies from the whole disc down to individual people.
const PLANET_R = 1400;
const TERRAIN_PX = 1600; // offscreen terrain raster resolution (higher = sharper map)
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 9;
const FIGURE_ZOOM = 0.9; // at/above this, souls render as little people, not dots
const PORTRAIT_ZOOM = 3.2; // at/above this, souls gain faces, posture, and names

type Virtues = Record<VirtueKey, number>;

type Settlement = { x: number; y: number; r: number; name: string };

// Institutions a town builds as its people grow virtuous — externals that make
// a virtue easier for everyone (preferred indifferents, in Stoic terms).
type InstType = "school" | "court" | "granary";
const INSTITUTIONS: { type: InstType; virtue: VirtueKey; name: string; glyph: string; note: string }[] = [
  { type: "school", virtue: "wisdom", name: "School", glyph: "🏛", note: "Teaching reaches further; the young grow wise faster." },
  { type: "court", virtue: "justice", name: "Court", glyph: "⚖", note: "Vice is restrained; a wrong done here costs less to the wronged." },
  { type: "granary", virtue: "temperance", name: "Granary", glyph: "🌾", note: "The sage's shield in stone; fortune's blows land softer." },
];
function instDef(type: InstType) {
  return INSTITUTIONS.find((i) => i.type === type) ?? INSTITUTIONS[0];
}

type Soul = {
  id: number;
  name: string;
  x: number;
  y: number;
  tx: number; // where they are walking to (daily wander)
  ty: number;
  hold: number; // frames left paused at an activity
  act: 0 | 1 | 2; // 0 walking, 1 resting, 2 working
  home: number; // settlement index
  v: Virtues;
  eud: number;
  born: number;
  awake: boolean;
  pulse: number;
  lastDeed: { virtue: VirtueKey; virtuous: boolean } | null;
  reflection: string | null;
  sources?: Source[] | null; // the corpus passages the last reflection rested on
  faulty?: FaultyReasoning | null; // the false judgment behind a recent vice
};

type Chron = { id: number; year: number; text: string; ill: boolean };

type Fortune = { name: string; good: boolean; tint: [number, number, number]; life: number };

type Camera = { cx: number; cy: number; zoom: number };

const FIT_ZOOM = (Math.min(1200, 760) * 0.92) / (2 * PLANET_R);

type World = {
  running: boolean;
  ignited: boolean;
  speed: number;
  year: number;
  epoch: number;
  harmony: number;
  generations: number;
  cycle: number;
  souls: Soul[];
  nextId: number;
  selected: number | null;
  fortune: Fortune | null;
  highRun: number;
  flash: number;
  dials: Dials;
  chron: Chron[];
  chronId: number;
  seed: number;
  settlements: Settlement[];
  camera: Camera;
  playout: Playout | null;
  maxims: Maxim[];
  maximId: number;
  builtInst: InstType[][]; // institutions per settlement, index-aligned to settlements
};

// A corpus passage the Oracle grounded a reflection in.
type Source = { author?: string | null; work?: string | null; sectionLabel?: string | null };

function formatSource(s: Source): string {
  const head = [s.author, s.work].filter(Boolean).join(" — ");
  return head + (s.sectionLabel ? ` ${s.sectionLabel}` : "");
}
function asSources(v: unknown): Source[] {
  return Array.isArray(v) ? (v as Source[]).filter((s) => s && (s.author || s.work)) : [];
}

// A saying an awakened soul reasoned its way to — the world's own growing corpus.
type Maxim = { id: number; text: string; author: string; year: number; sources?: Source[] };

// A decision playing out: the camera holds on the soul while a caption and a
// burst of light (or shadow) settle over them. Transient — never persisted.
type Playout = { soulId: number; text: string; good: boolean; life: number };

type Life = {
  id: string;
  kind: "awakening" | "counsel" | "choice";
  soul_name: string;
  epoch: string | null;
  world_year: number | null;
  virtue: VirtueKey | null;
  counselor: string | null;
  author_name: string | null;
  reflection: string;
  sources?: Source[] | null;
  created_at: string;
};

type SyncState = "off" | "local" | "saving" | "synced" | "error";

/* ------------------------------------------------------------ pure physics */

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const pick = <T,>(a: T[]): T => a[(Math.random() * a.length) | 0];

function createWorld(): World {
  return {
    running: false,
    ignited: false,
    speed: 3,
    year: 0,
    epoch: 0,
    harmony: 0.5,
    generations: 0,
    cycle: 1,
    souls: [],
    nextId: 1,
    selected: null,
    fortune: null,
    highRun: 0,
    flash: 0,
    dials: { ...DEFAULT_DIALS },
    chron: [],
    chronId: 1,
    seed: (Math.random() * 1e9) | 0,
    settlements: [],
    camera: { cx: 0, cy: 0, zoom: FIT_ZOOM },
    playout: null,
    maxims: [],
    maximId: 1,
    builtInst: [],
  };
}

/* ------------------------------------------------------ geography (terrain) */

// A tiny deterministic value-noise field, so a world's continents are stable
// across reloads — we persist only the seed and regenerate the map from it.
function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * (3 - 2 * t);
function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
/** Elevation 0..1 at a world point. High in the middle, falling to ocean at the
 *  rim, so the planet reads as land surrounded by sea. */
function heightAt(wx: number, wy: number, seed: number): number {
  const nx = (wx / PLANET_R) * 3.1;
  const ny = (wy / PLANET_R) * 3.1;
  let h = 0;
  let amp = 0.55;
  let freq = 1;
  for (let o = 0; o < 5; o++) {
    h += valueNoise(nx * freq + 11.3, ny * freq + 7.7, seed + o * 101) * amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  const dist = Math.hypot(wx, wy) / PLANET_R; // 0 center → 1 rim
  return clamp(h - dist * dist * 0.9, 0, 1);
}

type Geography = { canvas: HTMLCanvasElement; settlements: Settlement[] };

// Biome palette, warm archival tones to match the playground.
function biomeColor(h: number): [number, number, number] {
  if (h < 0.34) return [18, 30, 46]; // deep ocean
  if (h < 0.46) return [26, 44, 62]; // ocean
  if (h < 0.5) return [40, 66, 82]; // shallows
  if (h < 0.535) return [120, 108, 78]; // sand
  if (h < 0.63) return [78, 96, 62]; // grass
  if (h < 0.74) return [58, 78, 52]; // forest
  if (h < 0.85) return [92, 84, 70]; // rock
  return [176, 170, 150]; // snow
}

function buildGeography(seed: number): Geography {
  const px = TERRAIN_PX;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  const img = ctx!.createImageData(px, px);
  const data = img.data;
  const R = PLANET_R;
  for (let j = 0; j < px; j++) {
    for (let i = 0; i < px; i++) {
      const wx = (i / px) * 2 * R - R;
      const wy = (j / px) * 2 * R - R;
      const idx = (j * px + i) * 4;
      if (Math.hypot(wx, wy) > R) {
        data[idx + 3] = 0; // outside the disc → space shows through
        continue;
      }
      const h = heightAt(wx, wy, seed);
      const [r, g, b] = biomeColor(h);
      // gentle relief shading from the local slope
      const s = 1 + (heightAt(wx + 12, wy, seed) - heightAt(wx - 12, wy, seed)) * 1.4;
      data[idx] = clamp(r * s, 0, 255);
      data[idx + 1] = clamp(g * s, 0, 255);
      data[idx + 2] = clamp(b * s, 0, 255);
      data[idx + 3] = 255;
    }
  }
  ctx!.putImageData(img, 0, 0);

  // Seat settlements on habitable land (grass/forest), spread apart.
  const settlements: Settlement[] = [];
  let attempts = 0;
  const target = 7;
  const prng = mulberry(seed ^ 0x9e3779b9);
  while (settlements.length < target && attempts < 4000) {
    attempts++;
    const ang = prng() * Math.PI * 2;
    const rad = Math.sqrt(prng()) * R * 0.86;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    const h = heightAt(x, y, seed);
    if (h < 0.54 || h > 0.75) continue; // not water, not mountain
    if (settlements.some((s) => Math.hypot(s.x - x, s.y - y) < R * 0.34)) continue;
    settlements.push({ x, y, r: 120 + prng() * 60, name: placeName(prng) });
  }
  return { canvas, settlements };
}

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLACE_A = ["Thes", "Kor", "Aul", "Myr", "Del", "Per", "Hal", "Ther", "Kal", "Xan", "Erin", "Dor", "Pyth", "Lyk"];
const PLACE_B = ["ia", "os", "on", "aia", "enai", "andros", "opolis", "ythos", "ara", "essa", "yrne"];
function placeName(prng: () => number): string {
  const a = PLACE_A[(prng() * PLACE_A.length) | 0];
  const b = PLACE_B[(prng() * PLACE_B.length) | 0];
  return a + b;
}

/* ---- persistence: a world is plain data, so it serializes as-is ---- */

const SAVE_VERSION = 2;

type SavedWorld = {
  version: number;
  ignited: boolean;
  speed: number;
  year: number;
  epoch: number;
  harmony: number;
  generations: number;
  cycle: number;
  nextId: number;
  chronId: number;
  selected: number | null;
  fortune: Fortune | null;
  highRun: number;
  dials: Dials;
  souls: Soul[];
  chron: Chron[];
  seed: number;
  camera: Camera;
  maxims: Maxim[];
  maximId: number;
  builtInst: InstType[][];
};

function serialize(w: World): SavedWorld {
  return {
    version: SAVE_VERSION,
    ignited: w.ignited,
    speed: w.speed,
    year: w.year,
    epoch: w.epoch,
    harmony: w.harmony,
    generations: w.generations,
    cycle: w.cycle,
    nextId: w.nextId,
    chronId: w.chronId,
    selected: w.selected,
    fortune: w.fortune,
    highRun: w.highRun,
    dials: w.dials,
    souls: w.souls,
    chron: w.chron.slice(0, 80),
    seed: w.seed,
    camera: w.camera,
    maxims: w.maxims.slice(0, 40),
    maximId: w.maximId,
    builtInst: w.builtInst,
  };
}

const numOr = (v: unknown, f: number) => (typeof v === "number" && isFinite(v) ? v : f);

function validSoul(s: unknown): s is Soul {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (typeof o.id !== "number" || !o.v || typeof o.v !== "object") return false;
  const v = o.v as Record<string, unknown>;
  return VIRTUE_KEYS.every((k) => typeof v[k] === "number");
}

/** Load saved data into an existing world. Returns false (leaving it untouched)
 *  if the payload is missing, malformed, or from an older save version. */
function hydrate(w: World, data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<SavedWorld>;
  if (d.version !== SAVE_VERSION || !Array.isArray(d.souls) || !Array.isArray(d.chron)) return false;

  w.ignited = !!d.ignited;
  w.running = false; // never auto-run a restored world
  w.speed = numOr(d.speed, 3);
  w.year = Math.max(0, Math.round(numOr(d.year, 0)));
  w.epoch = Math.min(EPOCHS.length - 1, Math.max(0, Math.round(numOr(d.epoch, 0))));
  w.harmony = clamp(numOr(d.harmony, 0.5), 0, 1);
  w.generations = Math.max(0, Math.round(numOr(d.generations, 0)));
  w.cycle = Math.max(1, Math.round(numOr(d.cycle, 1)));
  w.nextId = Math.max(1, Math.round(numOr(d.nextId, 1)));
  w.chronId = Math.max(1, Math.round(numOr(d.chronId, 1)));
  w.selected = typeof d.selected === "number" ? d.selected : null;
  w.fortune = d.fortune && typeof d.fortune === "object" ? (d.fortune as Fortune) : null;
  w.highRun = Math.max(0, Math.round(numOr(d.highRun, 0)));
  w.dials = { ...DEFAULT_DIALS, ...(d.dials && typeof d.dials === "object" ? d.dials : {}) };
  w.flash = 0;
  w.seed = Math.round(numOr(d.seed, (Math.random() * 1e9) | 0));
  w.settlements = []; // regenerated from the seed by ensureGeography on load
  w.camera =
    d.camera && typeof d.camera === "object"
      ? {
          cx: numOr((d.camera as Camera).cx, 0),
          cy: numOr((d.camera as Camera).cy, 0),
          zoom: clamp(numOr((d.camera as Camera).zoom, FIT_ZOOM), ZOOM_MIN, ZOOM_MAX),
        }
      : { cx: 0, cy: 0, zoom: FIT_ZOOM };

  w.souls = (d.souls as unknown[])
    .filter(validSoul)
    .slice(0, MAX_SOULS)
    .map((s) => {
      const v = {} as Virtues;
      for (const k of VIRTUE_KEYS) v[k] = clamp(s.v[k], 0.02, 0.99);
      const x = numOr(s.x, 0);
      const y = numOr(s.y, 0);
      return {
        ...s,
        x,
        y,
        tx: numOr(s.tx, x),
        ty: numOr(s.ty, y),
        hold: Math.max(0, Math.round(numOr(s.hold, 0))),
        act: (s.act === 1 || s.act === 2 ? s.act : 0) as 0 | 1 | 2,
        home: Math.max(0, Math.round(numOr(s.home, 0))),
        v,
        eud: clamp(numOr(s.eud, 0.5), 0.02, 1),
        pulse: numOr(s.pulse, 0),
        awake: !!s.awake,
      };
    });
  w.chron = (d.chron as Chron[]).filter((c) => c && typeof c.text === "string").slice(0, 80);
  w.maxims = Array.isArray(d.maxims)
    ? (d.maxims as Maxim[]).filter((m) => m && typeof m.text === "string").slice(0, 40)
    : [];
  w.maximId = Math.max(1, Math.round(numOr(d.maximId, 1)));
  w.builtInst = Array.isArray(d.builtInst)
    ? (d.builtInst as unknown[]).map((row) => (Array.isArray(row) ? (row.filter((x) => x === "school" || x === "court" || x === "granary") as InstType[]) : []))
    : [];
  // Keep id counters ahead of anything restored.
  for (const s of w.souls) if (s.id >= w.nextId) w.nextId = s.id + 1;
  for (const c of w.chron) if (c.id >= w.chronId) w.chronId = c.id + 1;
  for (const m of w.maxims) if (m.id >= w.maximId) w.maximId = m.id + 1;
  return true;
}

/* Multiple worlds live in localStorage under an index plus one blob each. This
 * is the whole store for anonymous visitors, and an offline cache for signed-in
 * ones (whose worlds also live in kosmopolis_saves). */
const INDEX_KEY = "kosmopolis:index:v2";
const ACTIVE_KEY = "kosmopolis:active:v2";
const stateKey = (id: string) => `kosmopolis:save:${id}`;

export type SaveMeta = { id: string; name: string; updated: number };

function readIndex(): SaveMeta[] {
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((m) => m && typeof m.id === "string" && typeof m.name === "string") : [];
  } catch {
    return [];
  }
}
function writeIndex(list: SaveMeta[]) {
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
function readState(id: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(stateKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeState(id: string, w: World) {
  try {
    window.localStorage.setItem(stateKey(id), JSON.stringify(serialize(w)));
  } catch {
    /* private mode / quota — the world still runs, just not cached locally */
  }
}
function removeState(id: string) {
  try {
    window.localStorage.removeItem(stateKey(id));
  } catch {
    /* ignore */
  }
}
function upsertIndex(list: SaveMeta[], meta: SaveMeta): SaveMeta[] {
  const next = list.filter((m) => m.id !== meta.id);
  next.unshift(meta);
  return next;
}
function getActiveId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function setActiveId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "w-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

function makeSoul(world: World, home: number, base?: Virtues): Soul {
  const v = {} as Virtues;
  for (const key of VIRTUE_KEYS) {
    v[key] = base
      ? clamp(base[key] + rand(-0.18, 0.18), 0.05, 0.98)
      : clamp(rand(0.28, 0.66) + rand(-0.14, 0.14), 0.05, 0.95);
  }
  const seat = world.settlements[home];
  const px = seat ? seat.x + rand(-seat.r, seat.r) : rand(-PLANET_R * 0.5, PLANET_R * 0.5);
  const py = seat ? seat.y + rand(-seat.r, seat.r) : rand(-PLANET_R * 0.5, PLANET_R * 0.5);
  return {
    id: world.nextId++,
    name: makeName(),
    x: px,
    y: py,
    tx: px,
    ty: py,
    hold: (Math.random() * 60) | 0,
    act: 0,
    home,
    v,
    eud: 0.5,
    born: world.year,
    awake: false,
    pulse: Math.random() * Math.PI * 2,
    lastDeed: null,
    reflection: null,
  };
}

function seedSouls(world: World, n: number, base?: Virtues, home?: number) {
  const count = world.settlements.length;
  for (let i = 0; i < n && world.souls.length < MAX_SOULS; i++) {
    const seat = home != null ? home : count ? (Math.random() * count) | 0 : 0;
    world.souls.push(makeSoul(world, seat, base));
  }
}

const ordSuffix = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function log(world: World, text: string, ill = false) {
  world.chron.unshift({ id: world.chronId++, year: world.year, text, ill });
  if (world.chron.length > 80) world.chron.pop();
}

function meanArete(world: World) {
  if (!world.souls.length) return 0.5;
  let t = 0;
  for (const s of world.souls) t += arete(s.v);
  return t / world.souls.length;
}
function meanEud(world: World) {
  if (!world.souls.length) return 0.5;
  let t = 0;
  for (const s of world.souls) t += s.eud;
  return t / world.souls.length;
}

function advanceEpoch(world: World) {
  while (world.epoch < EPOCHS.length - 1 && world.year >= EPOCHS[world.epoch + 1].at) {
    world.epoch++;
    const e = EPOCHS[world.epoch];
    if (e.seed) {
      seedSouls(world, e.seed);
      log(world, `In the ${ordSuffix(world.year)} year the first souls stirred — dormant, without yet a will of their own.`);
    } else {
      log(world, `The world turned into a new age: ${e.name}.`);
    }
  }
}

function weightedVirtue(s: Soul): VirtueKey {
  let total = 0;
  for (const key of VIRTUE_KEYS) total += 0.5 + s.v[key];
  let r = Math.random() * total;
  for (const key of VIRTUE_KEYS) {
    r -= 0.5 + s.v[key];
    if (r <= 0) return key;
  }
  return "wisdom";
}

function instAt(world: World, home: number): InstType[] {
  return world.builtInst[home] ?? [];
}
function hasInst(world: World, home: number, type: InstType): boolean {
  return instAt(world, home).includes(type);
}
function padInst(world: World) {
  while (world.builtInst.length < world.settlements.length) world.builtInst.push([]);
}

// Emergent building: a town whose residents have grown strong in a virtue raises
// the institution that embodies it — externals that make the virtue easier for
// everyone thereafter.
function maybeBuild(world: World) {
  const n = world.settlements.length;
  if (!n) return;
  padInst(world);
  if (Math.random() > 0.03) return; // building is rare and momentous

  const sum: Virtues[] = [];
  const max: Virtues[] = [];
  const cnt = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    sum.push({ wisdom: 0, justice: 0, courage: 0, temperance: 0 });
    max.push({ wisdom: 0, justice: 0, courage: 0, temperance: 0 });
  }
  for (const s of world.souls) {
    const h = s.home;
    if (h < 0 || h >= n) continue;
    cnt[h]++;
    for (const k of VIRTUE_KEYS) {
      sum[h][k] += s.v[k];
      if (s.v[k] > max[h][k]) max[h][k] = s.v[k];
    }
  }
  const candidates: { home: number; type: InstType }[] = [];
  for (let i = 0; i < n; i++) {
    if (cnt[i] < 3) continue;
    for (const inst of INSTITUTIONS) {
      if (hasInst(world, i, inst.type)) continue;
      // a town builds when its people are broadly strong in the virtue, or when
      // one exemplar among them stands out enough to inspire it.
      if (sum[i][inst.virtue] / cnt[i] >= 0.58 || max[i][inst.virtue] >= 0.82) {
        candidates.push({ home: i, type: inst.type });
      }
    }
  }
  if (!candidates.length) return;
  const c = candidates[(Math.random() * candidates.length) | 0];
  world.builtInst[c.home].push(c.type);
  const def = instDef(c.type);
  log(world, `The people of ${world.settlements[c.home].name} raised a ${def.name.toLowerCase()} — ${def.note}`);
}

function act(world: World, s: Soul) {
  const d = world.dials;
  // A court in the soul's town restrains the harm a vicious act does.
  const viceScale = hasInst(world, s.home, "court") ? 0.5 : 1;
  const key = weightedVirtue(s);
  const strength = clamp(s.v[key] + rand(-0.4, 0.4), 0, 1);
  const virtuous = strength > 0.5;
  const magnitude = Math.abs(strength - 0.5) * 2;

  const scale = virtuous ? 1 : viceScale;
  s.eud = clamp(s.eud + (virtuous ? 1 : -1) * magnitude * 0.05 * scale, 0.02, 1);
  s.lastDeed = { virtue: key, virtuous };
  // Vice is a false judgment: a clear misstep leaves its faulty reasoning on the
  // soul; a clear virtuous act, or awakening, mends it. (Awakened souls reason
  // rightly and are left alone.)
  if (!s.awake && magnitude > 0.5) {
    if (virtuous) s.faulty = null;
    else s.faulty = faultyFor(key);
  }
  // Character is habit — the practised virtue strengthens, the indulged vice erodes.
  s.v[key] = clamp(s.v[key] + (virtuous ? 1 : -1) * d.habituation * magnitude * scale, 0.02, 0.99);

  // The good is contagious — a strong deed radiates to nearby souls.
  if (magnitude > 0.55 && d.contagion > 0) {
    const r2 = d.contagion * d.contagion;
    for (const o of world.souls) {
      if (o === s) continue;
      const dx = o.x - s.x;
      const dy = o.y - s.y;
      if (dx * dx + dy * dy < r2) {
        o.eud = clamp(o.eud + (virtuous ? 1 : -1) * magnitude * 0.012 * scale, 0.02, 1);
      }
    }
  }

  if (magnitude > 0.82 && Math.random() < 0.13) {
    const verb = pick((virtuous ? GOOD_DEEDS : ILL_DEEDS)[key]);
    log(world, `${s.name} ${verb} — the field grew ${virtuous ? "brighter" : "dimmer"}.`, !virtuous);
  }
}

function applyFortune(world: World, f: { good: boolean }) {
  // The sage is unshaken: impact scales with (1 − virtue × shield).
  const shield = world.dials.sageShield;
  for (const s of world.souls) {
    const exposure = 1 - arete(s.v) * shield;
    let hit = (f.good ? 0.09 : -0.13) * (0.12 + exposure * 0.88);
    // A granary softens fortune's blows for the town it stands in.
    if (!f.good && hasInst(world, s.home, "granary")) hit *= 0.5;
    s.eud = clamp(s.eud + hit, 0.02, 1);
  }
}

function beget(world: World) {
  const flourishing = world.souls.filter((s) => s.eud > 0.55);
  if (flourishing.length < 2) return;
  const a = pick(flourishing);
  const b = pick(flourishing);
  if (a === b) return;
  const base = {} as Virtues;
  for (const key of VIRTUE_KEYS) base[key] = (a.v[key] + b.v[key]) / 2;
  const child = makeSoul(world, a.home, base); // born into a parent's town
  world.souls.push(child);
  world.generations++;
  if (Math.random() < 0.4) log(world, `${child.name} was born into the world, carrying something of those before them.`);
}

function ekpyrosis(world: World) {
  // The conflagration: the world passes into fire and begins again, seeded from
  // the virtue of its most excellent souls — Stoic eternal recurrence.
  const elite = [...world.souls].sort((x, y) => arete(y.v) - arete(x.v)).slice(0, 4).map((s) => ({ ...s.v }));
  world.souls = [];
  world.selected = null;
  world.fortune = null;
  world.highRun = 0;
  world.flash = 60;
  world.cycle++;
  world.harmony = 0.55;
  const seeds = elite.length ? elite : [undefined];
  for (let i = 0; i < 10; i++) {
    seedSouls(world, 1, seeds[i % seeds.length]);
  }
  log(world, `The world passed into fire and began again — the ${ordSuffix(world.cycle)} cycle — carrying forward the virtue of its best souls.`);
}

function tick(world: World) {
  world.year++;
  advanceEpoch(world);
  const e = EPOCHS[world.epoch];

  if (world.fortune) {
    world.fortune.life--;
    if (world.fortune.life <= 0) world.fortune = null;
  }

  if (e.act && !world.fortune && Math.random() < world.dials.fortuneFreq) {
    const f = pick(FORTUNES);
    world.fortune = { name: f.name, good: f.good, tint: f.tint, life: 18 + ((Math.random() * 22) | 0) };
    applyFortune(world, f);
    log(world, `Fortune sent ${f.name} upon the world. Each soul was moved as much as its character allowed.`);
  }

  if (e.act) {
    for (const s of world.souls) act(world, s);
    teach(world);
    maybeBuild(world);
    if (e.breed && world.souls.length < MAX_SOULS && Math.random() < 0.05 + meanEud(world) * 0.08) beget(world);

    const target = world.souls.length ? meanArete(world) * 0.6 + meanEud(world) * 0.4 : 0.5;
    world.harmony += (target - world.harmony) * 0.06;

    // Track sustained concord for the rebirth.
    if (world.harmony >= REBIRTH_HARMONY) world.highRun++;
    else world.highRun = Math.max(0, world.highRun - 2);
    if (world.highRun >= REBIRTH_YEARS) ekpyrosis(world);
  }
}

/** Daily life: souls walk to a spot in their town, pause to rest or work, then
 *  choose somewhere new. Frame-based so movement stays smooth at any speed. */
// An awakened soul is a teacher: it draws those nearby toward the virtue it is
// strongest in, and lifts their flourishing a little. This is how wisdom, once
// kindled, spreads on its own — the corpus made local.
function teach(world: World) {
  // A school lifts the wisdom of its townsfolk on its own, teacher or no.
  for (const s of world.souls) {
    if (!s.awake && hasInst(world, s.home, "school")) s.v.wisdom = clamp(s.v.wisdom + 0.0006, 0.02, 0.99);
  }
  const teachers = world.souls.filter((s) => s.awake);
  if (!teachers.length) return;
  for (const t of teachers) {
    const school = hasInst(world, t.home, "school"); // a school extends a teacher's reach
    const reach2 = school ? 14000 : 9000;
    const boost = school ? 1.6 : 1;
    const key = dominantVirtue(t.v).key;
    const a = arete(t.v);
    for (const o of world.souls) {
      if (o === t || o.awake) continue;
      const dx = o.x - t.x;
      const dy = o.y - t.y;
      if (dx * dx + dy * dy < reach2) {
        o.v[key] = clamp(o.v[key] + 0.0018 * a * boost, 0.02, 0.99);
        o.eud = clamp(o.eud + 0.0009 * a * boost, 0.02, 1);
      }
    }
  }
  if (Math.random() < 0.01) {
    const t = pick(teachers);
    log(world, `${t.name}, awakened, drew others toward ${dominantVirtue(t.v).name.toLowerCase()}.`);
  }
}

// Pull the carried principle out of an Oracle reflection — the last sentence,
// which is where the Oracle leaves the one line to carry away.
function extractMaxim(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(/(?<=[.!?])\s+/);
  let last = (parts[parts.length - 1] || clean).replace(/^["“'*]+|["”'*]+$/g, "").trim();
  if (last.length < 12 && parts.length > 1) last = parts.slice(-2).join(" ").trim();
  if (last.length > 160) last = last.slice(0, 158).trimEnd() + "…";
  return last;
}

function life(world: World) {
  const sp = 0.95;
  for (const s of world.souls) {
    if (s.hold > 0) {
      s.hold--;
      continue;
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      if (Math.random() < 0.55) {
        s.hold = 30 + ((Math.random() * 150) | 0);
        s.act = Math.random() < 0.5 ? 1 : 2; // rest or work
      } else {
        const seat = world.settlements[s.home];
        if (seat) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * seat.r;
          s.tx = seat.x + Math.cos(a) * r;
          s.ty = seat.y + Math.sin(a) * r;
        }
        s.act = 0;
      }
    } else {
      s.x += (dx / d) * sp;
      s.y += (dy / d) * sp;
      s.act = 0;
    }
  }
}

/* --------------------------------------------------------------- component */

type UiState = {
  ignited: boolean;
  running: boolean;
  year: number;
  epochName: string;
  epochKicker: string;
  pop: number;
  arete: number | null;
  eud: number | null;
  harmony: number;
  generations: number;
  cycle: number;
  fortune: string | null;
  canRebirth: boolean;
};

const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export default function KosmopolisWorld() {
  const worldRef = useRef<World>(createWorld());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cosmosRef = useRef<HTMLElement | null>(null);
  const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>([]);
  const terrainRef = useRef<HTMLCanvasElement | null>(null);
  const terrainSeedRef = useRef<number>(-1);

  // Build (or rebuild) the planet's terrain + settlements from the world's seed.
  // Cached by seed so it runs once per world, not per frame.
  const ensureGeography = useCallback(() => {
    const w = worldRef.current;
    if (terrainSeedRef.current === w.seed && terrainRef.current) return;
    const geo = buildGeography(w.seed);
    terrainRef.current = geo.canvas;
    terrainSeedRef.current = w.seed;
    w.settlements = geo.settlements;
    padInst(w); // keep the institutions array aligned to the settlements
  }, []);

  const [ui, setUi] = useState<UiState>({
    ignited: false,
    running: false,
    year: 0,
    epochName: EPOCHS[0].name,
    epochKicker: EPOCHS[0].kicker,
    pop: 0,
    arete: null,
    eud: null,
    harmony: 0.5,
    generations: 0,
    cycle: 1,
    fortune: null,
    canRebirth: false,
  });
  const [chron, setChron] = useState<Chron[]>([]);
  const [maxims, setMaxims] = useState<Maxim[]>([]);
  const [insts, setInsts] = useState<Record<InstType, number>>({ school: 0, court: 0, granary: 0 });
  const [selected, setSelected] = useState<Soul | null>(null);
  const [dials, setDials] = useState<Dials>({ ...DEFAULT_DIALS });

  const [awakening, setAwakening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [counselOpen, setCounselOpen] = useState(false);
  const [counselorId, setCounselorId] = useState(COUNSELORS[0].id);
  const [advice, setAdvice] = useState("");
  const [counseling, setCounseling] = useState(false);

  const [dilemmaOpen, setDilemmaOpen] = useState(false);
  const [dilemma, setDilemma] = useState<Dilemma | null>(null);
  const lastDilemmaRef = useRef<string | undefined>(undefined);

  const [lives, setLives] = useState<Life[]>([]);

  const [authed, setAuthed] = useState(false);
  const [sync, setSync] = useState<SyncState>("off");
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const authedRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const savingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);

  // Keep the simulation reading the latest dials, and remember the change.
  useEffect(() => {
    worldRef.current.dials = { ...dials };
    if (loadedRef.current) dirtyRef.current = true;
  }, [dials]);

  const snapshotSelected = useCallback(() => {
    const w = worldRef.current;
    if (w.selected == null) return null;
    const s = w.souls.find((x) => x.id === w.selected);
    return s ? { ...s, v: { ...s.v } } : null;
  }, []);

  const refresh = useCallback(() => {
    const w = worldRef.current;
    setUi({
      ignited: w.ignited,
      running: w.running,
      year: w.year,
      epochName: EPOCHS[w.epoch].name,
      epochKicker: EPOCHS[w.epoch].kicker,
      pop: w.souls.length,
      arete: w.souls.length ? meanArete(w) : null,
      eud: w.souls.length ? meanEud(w) : null,
      harmony: w.harmony,
      generations: w.generations,
      cycle: w.cycle,
      fortune: w.fortune ? w.fortune.name : null,
      canRebirth: EPOCHS[w.epoch].act === true && w.harmony >= REBIRTH_HARMONY && w.souls.length > 0,
    });
    setChron(w.chron.slice(0, 48));
    setMaxims(w.maxims.slice(0, 12));
    const counts: Record<InstType, number> = { school: 0, court: 0, granary: 0 };
    for (const row of w.builtInst) for (const type of row) counts[type]++;
    setInsts(counts);
    setSelected(snapshotSelected());
  }, [snapshotSelected]);

  const loadLedger = useCallback(async () => {
    try {
      const res = await fetch("/api/playground/kosmopolis/ledger");
      const data = await res.json();
      if (Array.isArray(data.lives)) setLives(data.lives);
    } catch {
      /* the ledger is a grace note; the world runs without it */
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  /* ---- persistence: multiple worlds, localStorage for all + cloud when signed in ---- */

  // Save the active world: always to localStorage, and to the cloud row when signed in.
  const flush = useCallback(async (force = false) => {
    if (!loadedRef.current) return;
    if (!dirtyRef.current && !force) return;
    dirtyRef.current = false;
    const w = worldRef.current;
    const id = activeIdRef.current;
    if (!id) return;
    writeState(id, w);
    // keep the local index's "updated" fresh so the list stays ordered
    const nm = readIndex().find((m) => m.id === id)?.name ?? "A world";
    writeIndex(upsertIndex(readIndex().filter((m) => m.id !== id), { id, name: nm, updated: Date.now() }));
    if (!authedRef.current) {
      setSync("local");
      return;
    }
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }
    savingRef.current = true;
    setSync("saving");
    try {
      const res = await fetch("/api/playground/kosmopolis/saves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, state: serialize(w) }),
      });
      setSync(res.ok ? "synced" : "error");
    } catch {
      setSync("error");
    } finally {
      savingRef.current = false;
    }
  }, []);

  const activeName = useCallback(
    (id: string | null) => saves.find((m) => m.id === id)?.name ?? "A world",
    [saves]
  );

  // Adopt a state blob into the running world under a given id.
  const adopt = useCallback(
    (id: string, state: unknown) => {
      worldRef.current = createWorld();
      hydrate(worldRef.current, state); // false leaves a fresh Void, which is fine
      activeIdRef.current = id;
      setActiveIdState(id);
      setActiveId(id);
      if (worldRef.current.ignited) ensureGeography();
      setDials({ ...worldRef.current.dials });
      setSelected(null);
      loadedRef.current = true;
      dirtyRef.current = false;
      refresh();
    },
    [ensureGeography, refresh]
  );

  const switchTo = useCallback(
    async (id: string) => {
      if (id === activeIdRef.current) return;
      await flush(true);
      setSync(authedRef.current ? "saving" : "local");
      let data: unknown = null;
      if (authedRef.current) {
        try {
          const r = await fetch(`/api/playground/kosmopolis/saves?id=${encodeURIComponent(id)}`);
          const j = await r.json();
          data = j.save?.state ?? null;
        } catch {
          /* fall back to local cache */
        }
      }
      if (!data) data = readState(id);
      adopt(id, data);
      setSync(authedRef.current ? "synced" : "local");
    },
    [flush, adopt]
  );

  const newWorld = useCallback(async () => {
    await flush(true);
    const w = createWorld();
    worldRef.current = w;
    const name = `World ${saves.length + 1}`;
    let id: string | undefined;
    if (authedRef.current) {
      try {
        const r = await fetch("/api/playground/kosmopolis/saves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, state: serialize(w) }),
        });
        const j = await r.json();
        id = j.id;
      } catch {
        /* fall back to a local id */
      }
    }
    if (!id) id = newId();
    writeState(id, w);
    const meta: SaveMeta = { id, name, updated: Date.now() };
    setSaves((prev) => upsertIndex(prev, meta));
    writeIndex(upsertIndex(readIndex(), meta));
    activeIdRef.current = id;
    setActiveIdState(id);
    setActiveId(id);
    loadedRef.current = true;
    dirtyRef.current = false;
    setDials({ ...w.dials });
    setSelected(null);
    setSync(authedRef.current ? "synced" : "local");
    refresh();
  }, [flush, saves.length, refresh]);

  const renameActive = useCallback(() => {
    const id = activeIdRef.current;
    if (!id) return;
    const current = saves.find((m) => m.id === id)?.name ?? "";
    const name = window.prompt("Name this world", current)?.trim().slice(0, 80);
    if (!name) return;
    setSaves((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));
    writeIndex(readIndex().map((m) => (m.id === id ? { ...m, name } : m)));
    if (authedRef.current) {
      fetch("/api/playground/kosmopolis/saves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      }).catch(() => {});
    }
  }, [saves]);

  const deleteWorld = useCallback(
    async (id: string) => {
      if (saves.length <= 1) {
        setNotice("This is your only world — begin it again from the Void instead.");
        return;
      }
      if (!window.confirm(`Forget "${activeName(id)}"? This cannot be undone.`)) return;
      removeState(id);
      const remaining = saves.filter((m) => m.id !== id);
      setSaves(remaining);
      writeIndex(readIndex().filter((m) => m.id !== id));
      if (authedRef.current) {
        fetch(`/api/playground/kosmopolis/saves?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
      }
      if (id === activeIdRef.current && remaining.length) switchTo(remaining[0].id);
    },
    [saves, activeName, switchTo]
  );

  // On mount: list the worlds (cloud when signed in, else local), then load the
  // last active one — creating a first world if there are none.
  useEffect(() => {
    let alive = true;
    (async () => {
      let isAuthed = false;
      let cloud: { id: string; name: string; updated_at?: string }[] = [];
      try {
        const res = await fetch("/api/playground/kosmopolis/saves");
        const data = await res.json();
        isAuthed = !!data.authenticated;
        if (Array.isArray(data.saves)) cloud = data.saves;
      } catch {
        /* offline / anon → local */
      }
      if (!alive) return;
      authedRef.current = isAuthed;
      setAuthed(isAuthed);

      let list: SaveMeta[] = isAuthed
        ? cloud.map((s) => ({ id: s.id, name: s.name, updated: (s.updated_at && Date.parse(s.updated_at)) || Date.now() }))
        : readIndex();
      if (isAuthed) writeIndex(list);

      let active = getActiveId();
      if (!active || !list.some((m) => m.id === active)) active = list[0]?.id ?? null;

      if (active) {
        let data: unknown = null;
        if (isAuthed) {
          try {
            const r = await fetch(`/api/playground/kosmopolis/saves?id=${encodeURIComponent(active)}`);
            const j = await r.json();
            data = j.save?.state ?? null;
          } catch {
            /* local cache */
          }
        }
        if (!data) data = readState(active);
        setSaves(list);
        adopt(active, data);
        setSync(isAuthed ? "synced" : "local");
      } else {
        // no worlds yet — create the first
        const w = createWorld();
        worldRef.current = w;
        let id: string | undefined;
        if (isAuthed) {
          try {
            const r = await fetch("/api/playground/kosmopolis/saves", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "World 1", state: serialize(w) }),
            });
            id = (await r.json()).id;
          } catch {
            /* local id */
          }
        }
        if (!id) id = newId();
        writeState(id, w);
        const meta: SaveMeta = { id, name: "World 1", updated: Date.now() };
        list = [meta];
        setSaves(list);
        writeIndex(list);
        activeIdRef.current = id;
        setActiveIdState(id);
        setActiveId(id);
        loadedRef.current = true;
        setDials({ ...w.dials });
        setSync(isAuthed ? "synced" : "off");
        refresh();
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave loop: coalesce changes and persist at most every few seconds, plus
  // a final save when the tab is hidden.
  useEffect(() => {
    const id = window.setInterval(() => {
      flush(false);
    }, 4000);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  /* ---- render + tick loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!starsRef.current.length) {
      const stars = [];
      for (let i = 0; i < 200; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.2, tw: Math.random() * Math.PI * 2 });
      starsRef.current = stars;
    }

    let raf = 0;
    let acc = 0;
    let last = performance.now();
    let t = 0;
    let sinceRefresh = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      const w = worldRef.current;

      if (w.running) {
        acc += dt * w.speed;
        let guard = 0;
        while (acc >= 1 && guard < 30) {
          tick(w);
          acc -= 1;
          guard++;
        }
        if (guard > 0) dirtyRef.current = true;
        if (!reduce) life(w);
      }

      // While a decision plays out, hold the camera on the soul.
      if (w.playout) {
        const s = w.souls.find((x) => x.id === w.playout!.soulId);
        if (s) {
          w.camera.cx += (s.x - w.camera.cx) * 0.09;
          w.camera.cy += (s.y - w.camera.cy) * 0.09;
          const targetZoom = Math.max(w.camera.zoom, 2.8);
          w.camera.zoom += (targetZoom - w.camera.zoom) * 0.06;
        }
        w.playout.life -= 1;
        if (w.playout.life <= 0) w.playout = null;
      }

      draw(ctx, w, t);

      sinceRefresh += dt;
      if (sinceRefresh >= 0.28) {
        sinceRefresh = 0;
        refresh();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // draw/life read live refs; the loop is set up once and intentionally not
    // torn down when they change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  /* ---- drawing: a planet you fly into ---- */
  function draw(ctx: CanvasRenderingContext2D, w: World, t: number) {
    const cam = w.camera;
    const R = PLANET_R;

    // 1. space + starfield, in screen space (identity transform)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#08060a";
    ctx.fillRect(0, 0, W, H);
    for (const st of starsRef.current) {
      const a = 0.18 + 0.3 * Math.sin(t * 0.7 + st.tw);
      ctx.globalAlpha = clamp(a, 0, 0.6);
      ctx.fillStyle = "#d8d2c0";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. world transform: everything below is in world units
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom, W / 2 - cam.cx * cam.zoom, H / 2 - cam.cy * cam.zoom);

    // Before ignition there is nothing but the void — no planet at all.
    if (w.ignited) {
      // atmosphere halo + ocean disc under the land
      ctx.beginPath();
      ctx.arc(0, 0, R + 26, 0, 6.283);
      ctx.fillStyle = "rgba(90,120,150,0.10)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, 6.283);
      ctx.fillStyle = "#14202e";
      ctx.fill();

      // terrain (a static raster, blit once per frame) — only when it matches this world
      if (terrainRef.current && terrainSeedRef.current === w.seed) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(terrainRef.current, -R, -R, 2 * R, 2 * R);
      }
      // harmony tints the whole planet warm or cold
      const h = w.harmony;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, 6.283);
      ctx.fillStyle = w.fortune
        ? `rgba(${w.fortune.tint[0]},${w.fortune.tint[1]},${w.fortune.tint[2]},0.16)`
        : h > 0.5
        ? `rgba(214,178,106,${((h - 0.5) * 0.28).toFixed(3)})`
        : `rgba(90,80,110,${((0.5 - h) * 0.3).toFixed(3)})`;
      ctx.fill();
    }

    const zoom = cam.zoom;
    const acting = EPOCHS[w.epoch].act === true;
    const figures = zoom >= FIGURE_ZOOM;
    const portrait = zoom >= PORTRAIT_ZOOM;
    const inv = 1 / zoom; // screen-constant sizes divide by zoom
    const halfW = W / 2 / zoom + 40; // for culling name labels to the viewport
    const halfH = H / 2 / zoom + 40;

    // 3. settlements (and the institutions their people have built)
    for (let si = 0; si < w.settlements.length; si++) {
      const st = w.settlements[si];
      const inst = w.builtInst[si] ?? [];
      if (figures) {
        // a little cluster of dwellings
        ctx.fillStyle = "rgba(38,30,22,0.9)";
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * 6.283;
          const bx = st.x + Math.cos(a) * st.r * 0.4;
          const by = st.y + Math.sin(a) * st.r * 0.4;
          ctx.fillRect(bx - 5, by - 5, 10, 9);
        }
        // institutions, set in a row above the town centre
        inst.forEach((type, k) => {
          const col = virtueDef(instDef(type).virtue).color;
          const bx = st.x + (k - (inst.length - 1) / 2) * 26;
          const by = st.y - st.r * 0.55;
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          if (type === "granary") {
            ctx.beginPath();
            ctx.arc(bx, by, 8, 0, 6.283);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx - 8, by - 3);
            ctx.lineTo(bx, by - 13);
            ctx.lineTo(bx + 8, by - 3);
            ctx.closePath();
            ctx.fill();
          } else {
            // a temple: columned base + pediment (court a touch grander)
            const wdt = type === "court" ? 13 : 10;
            ctx.fillRect(bx - wdt, by - 2, wdt * 2, 10);
            ctx.beginPath();
            ctx.moveTo(bx - wdt - 2, by - 2);
            ctx.lineTo(bx, by - 13);
            ctx.lineTo(bx + wdt + 2, by - 2);
            ctx.closePath();
            ctx.fill();
          }
        });
      } else {
        ctx.beginPath();
        ctx.arc(st.x, st.y, 5 * inv, 0, 6.283);
        ctx.fillStyle = "#e3c77a";
        ctx.fill();
        // institution pips beside the marker at overview
        inst.forEach((type, k) => {
          const col = virtueDef(instDef(type).virtue).color;
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
          ctx.beginPath();
          ctx.arc(st.x + (k + 1) * 7 * inv, st.y, 2.5 * inv, 0, 6.283);
          ctx.fill();
        });
        if (zoom > 0.34) {
          ctx.font = `${18 * inv}px var(--font-newsreader, Georgia, serif)`;
          ctx.fillStyle = "rgba(228,229,220,0.8)";
          ctx.textAlign = "center";
          ctx.fillText(st.name, st.x, st.y - 12 * inv);
        }
      }
    }

    // 4. sympatheia threads (only close in, within a town)
    if (acting && zoom >= 1.1) {
      ctx.lineWidth = inv;
      const souls = w.souls;
      for (let i = 0; i < souls.length; i++) {
        const s1 = souls[i];
        for (let j = i + 1; j < souls.length; j++) {
          const s2 = souls[j];
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 6000) {
            const strength = (1 - d2 / 6000) * Math.min(s1.eud, s2.eud);
            if (strength > 0.14) {
              ctx.strokeStyle = `rgba(212,178,106,${(strength * 0.4).toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(s1.x, s1.y);
              ctx.lineTo(s2.x, s2.y);
              ctx.stroke();
            }
          }
        }
      }
    }

    // 4b. teaching threads — brighter gold, from each awakened teacher to those
    // it is drawing along.
    if (acting && zoom >= 1.1) {
      ctx.lineWidth = inv;
      for (const t of w.souls) {
        if (!t.awake) continue;
        for (const o of w.souls) {
          if (o === t || o.awake) continue;
          const dx = o.x - t.x;
          const dy = o.y - t.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 9000) {
            const strength = (1 - d2 / 9000) * (0.4 + arete(t.v) * 0.6);
            ctx.strokeStyle = `rgba(227,199,122,${(strength * 0.45).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y - 6);
            ctx.lineTo(o.x, o.y);
            ctx.stroke();
          }
        }
      }
    }

    // 5. souls
    for (const s of w.souls) {
      s.pulse += 0.03;
      const col = dominantVirtue(s.v).color;
      const bright = 0.4 + s.eud * 0.6;
      const struggling = acting && s.eud < 0.33;

      if (!figures) {
        // a point of light
        const rad = (1.8 + s.eud * 2.2) * inv;
        ctx.fillStyle = `rgba(${Math.min(255, col[0] + 50)},${Math.min(255, col[1] + 48)},${Math.min(255, col[2] + 48)},${bright.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, 6.283);
        ctx.fill();
      } else if (!portrait) {
        // a little person: head + body, coloured by dominant virtue
        const bob = s.act === 2 ? Math.sin(s.pulse * 2) * 1.2 : 0;
        const bx = s.x;
        const by = s.y + bob;
        const cr = `rgb(${Math.min(255, col[0] + 40)},${Math.min(255, col[1] + 38)},${Math.min(255, col[2] + 38)})`;
        // soft aura by flourishing
        const gg = ctx.createRadialGradient(bx, by - 6, 0, bx, by - 6, 22);
        gg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(bright * 0.32).toFixed(3)})`);
        gg.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(bx, by - 6, 22, 0, 6.283);
        ctx.fill();
        // body
        ctx.fillStyle = cr;
        ctx.beginPath();
        ctx.moveTo(bx, by - 9);
        ctx.lineTo(bx + 5, by + 6);
        ctx.lineTo(bx - 5, by + 6);
        ctx.closePath();
        ctx.fill();
        // head
        ctx.beginPath();
        ctx.arc(bx, by - 12, 3.6, 0, 6.283);
        ctx.fill();
      } else {
        // up close: a real little person, whose face and posture read their state
        const mood = s.eud > 0.6 ? 1 : s.eud < 0.34 ? -1 : 0; // content / neutral / troubled
        const seated = s.act === 1;
        const bob = s.act === 2 ? Math.sin(s.pulse * 2) * 0.7 : 0; // working sway
        const hunch = mood < 0 ? 3 : 0; // the troubled stoop
        const bx = s.x;
        const feetY = s.y + 7 - (seated ? 3 : 0);
        const shoulderY = s.y - 5 + hunch + bob + (seated ? 3 : 0);
        const headY = shoulderY - 6;
        const robe = `rgb(${Math.min(255, col[0] + 30)},${Math.min(255, col[1] + 28)},${Math.min(255, col[2] + 28)})`;
        const skinL = 150 + s.eud * 70;
        // aura by flourishing
        const gg = ctx.createRadialGradient(bx, headY, 0, bx, headY, 26);
        gg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(bright * 0.28).toFixed(3)})`);
        gg.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(bx, headY, 26, 0, 6.283);
        ctx.fill();
        // robe (shoulders → hem)
        ctx.fillStyle = robe;
        ctx.beginPath();
        ctx.moveTo(bx - 3.2, shoulderY);
        ctx.lineTo(bx + 3.2, shoulderY);
        ctx.lineTo(bx + 6, feetY);
        ctx.lineTo(bx - 6, feetY);
        ctx.closePath();
        ctx.fill();
        // an arm at work
        if (s.act === 2) {
          ctx.strokeStyle = robe;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(bx + 2.5, shoulderY + 1);
          ctx.lineTo(bx + 7, shoulderY + 4 + bob);
          ctx.stroke();
        }
        // head
        ctx.fillStyle = `rgb(${skinL | 0},${(skinL - 18) | 0},${(skinL - 40) | 0})`;
        ctx.beginPath();
        ctx.arc(bx, headY, 4.1, 0, 6.283);
        ctx.fill();
        // face
        ctx.fillStyle = "rgba(38,30,24,0.9)";
        ctx.beginPath();
        ctx.arc(bx - 1.5, headY - 0.6, 0.7, 0, 6.283);
        ctx.arc(bx + 1.5, headY - 0.6, 0.7, 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = "rgba(38,30,24,0.9)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        if (mood > 0) ctx.arc(bx, headY + 0.8, 1.7, 0.2 * Math.PI, 0.8 * Math.PI); // smile
        else if (mood < 0) ctx.arc(bx, headY + 3, 1.7, 1.2 * Math.PI, 1.8 * Math.PI); // frown
        else {
          ctx.moveTo(bx - 1.4, headY + 1.8);
          ctx.lineTo(bx + 1.4, headY + 1.8);
        }
        ctx.stroke();
        // name, for those in view
        if (Math.abs(s.x - cam.cx) < halfW && Math.abs(s.y - cam.cy) < halfH) {
          ctx.font = `${9 * inv}px var(--font-newsreader, Georgia, serif)`;
          ctx.fillStyle = "rgba(228,229,220,0.7)";
          ctx.textAlign = "center";
          ctx.fillText(s.name, bx, headY - 7);
        }
      }

      // awakened: a warm aura of influence + a steady ring of reason
      if (s.awake) {
        const cy2 = s.y - (figures ? 6 : 0);
        if (figures) {
          const halo = 18 + Math.sin(t * 1.5 + s.pulse) * 2;
          const ga = ctx.createRadialGradient(s.x, cy2, 0, s.x, cy2, halo);
          ga.addColorStop(0, "rgba(227,199,122,0.16)");
          ga.addColorStop(1, "rgba(227,199,122,0)");
          ctx.fillStyle = ga;
          ctx.beginPath();
          ctx.arc(s.x, cy2, halo, 0, 6.283);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(240,232,214,0.85)";
        ctx.lineWidth = 1.2 * inv;
        ctx.beginPath();
        ctx.arc(s.x, cy2, figures ? 15 : 6 * inv, 0, 6.283);
        ctx.stroke();
      }
      // needs help: a pulsing amber marker so the struggling can be found
      if (struggling) {
        const p = 0.5 + 0.5 * Math.sin(t * 3 + s.pulse);
        ctx.strokeStyle = `rgba(211,112,106,${(0.5 + p * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1.4 * inv;
        ctx.beginPath();
        ctx.arc(s.x, s.y - (figures ? 6 : 0), (10 + p * 4) * (figures ? 1 : inv), 0, 6.283);
        ctx.stroke();
      }
      // selection
      if (w.selected === s.id) {
        ctx.strokeStyle = "#f0e8d6";
        ctx.lineWidth = 1.6 * inv;
        const rr = (figures ? 17 : 9 * inv) + Math.sin(t * 2) * 1.5 * inv;
        ctx.beginPath();
        ctx.arc(s.x, s.y - (figures ? 6 : 0), rr, 0, 6.283);
        ctx.stroke();
        if (figures && !portrait && zoom >= 1.4) {
          ctx.font = `${12 * inv}px var(--font-newsreader, Georgia, serif)`;
          ctx.fillStyle = "#f4ead5";
          ctx.textAlign = "center";
          ctx.fillText(s.name, s.x, s.y - 22);
        }
      }
    }

    // 6. a decision playing out — a burst around the soul (world space)
    if (w.playout) {
      const s = w.souls.find((x) => x.id === w.playout!.soulId);
      if (s) {
        const p = 1 - w.playout.life / 240; // 0 → 1 over the play-out
        const col = w.playout.good ? "212,178,106" : "184,71,63";
        const ringR = 8 + p * 48;
        ctx.strokeStyle = `rgba(${col},${(0.7 * (1 - p)).toFixed(3)})`;
        ctx.lineWidth = 2 * inv;
        ctx.beginPath();
        ctx.arc(s.x, s.y - 6, ringR, 0, 6.283);
        ctx.stroke();
        const gg2 = ctx.createRadialGradient(s.x, s.y - 6, 0, s.x, s.y - 6, 34);
        gg2.addColorStop(0, `rgba(${col},${(0.28 * (1 - p)).toFixed(3)})`);
        gg2.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gg2;
        ctx.beginPath();
        ctx.arc(s.x, s.y - 6, 34, 0, 6.283);
        ctx.fill();
      }
    }

    // 7. overlays, back in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (w.flash > 0) {
      const a = w.flash / 60;
      ctx.fillStyle = `rgba(184,71,63,${(a * 0.6).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      w.flash--;
    }
    // the play-out caption, wrapped in a plate above the soul
    if (w.playout) {
      const s = w.souls.find((x) => x.id === w.playout!.soulId);
      if (s) {
        const sx = W / 2 + (s.x - cam.cx) * cam.zoom;
        const sy = H / 2 + (s.y - cam.cy) * cam.zoom;
        drawCaption(ctx, w.playout.text, sx, clamp(sy - 60, 40, H - 120), w.playout.good);
      }
    }
  }

  // A soft plate of wrapped text centred on (x, y) in screen space.
  function drawCaption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, good: boolean) {
    ctx.font = "16px var(--font-newsreader, Georgia, serif)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const maxW = 340;
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lh = 21;
    const padX = 16;
    const padY = 12;
    const boxW = maxW + padX * 2;
    const boxH = lines.length * lh + padY * 2;
    const bx = clamp(x - boxW / 2, 8, W - boxW - 8);
    ctx.fillStyle = "rgba(16,14,10,0.86)";
    ctx.fillRect(bx, y, boxW, boxH);
    ctx.fillStyle = good ? "#d6b26a" : "#cf7b74";
    ctx.fillRect(bx, y, 3, boxH);
    ctx.fillStyle = "#efe7d4";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + boxW / 2 + 1.5, y + padY + i * lh);
    }
    ctx.textBaseline = "alphabetic";
  }

  /* ---- controls ---- */
  const ignite = useCallback(() => {
    const w = worldRef.current;
    if (!w.ignited) {
      w.ignited = true;
      w.year = 1;
      ensureGeography(); // the planet condenses out of the fire
      advanceEpoch(w);
      log(w, "The creative fire was struck. Out of the formless field a world began to condense.");
    }
    w.running = true;
    dirtyRef.current = true;
    refresh();
  }, [refresh, ensureGeography]);

  const togglePlay = useCallback(() => {
    const w = worldRef.current;
    if (!w.ignited) {
      ignite();
      return;
    }
    w.running = !w.running;
    dirtyRef.current = true;
    if (!w.running) flush(true); // save on pause
    refresh();
  }, [ignite, refresh, flush]);

  const step = useCallback(() => {
    const w = worldRef.current;
    if (!w.ignited) {
      ignite();
      w.running = false;
      refresh();
      return;
    }
    w.running = false;
    tick(w);
    dirtyRef.current = true;
    refresh();
  }, [ignite, refresh]);

  const setSpeed = useCallback(
    (sp: number) => {
      worldRef.current.speed = sp;
      dirtyRef.current = true;
      refresh();
    },
    [refresh]
  );

  const seedOne = useCallback(() => {
    const w = worldRef.current;
    if (!w.ignited) ignite();
    if (w.souls.length >= MAX_SOULS) {
      setNotice("The world is as full as it can hold.");
      return;
    }
    const home = w.settlements.length ? (Math.random() * w.settlements.length) | 0 : 0;
    const s = makeSoul(w, home);
    w.souls.push(s);
    w.selected = s.id;
    log(w, `A soul — ${s.name} — was breathed into being by a hand outside the world.`);
    dirtyRef.current = true;
    refresh();
  }, [ignite, refresh]);

  const rebirth = useCallback(() => {
    const w = worldRef.current;
    if (!(EPOCHS[w.epoch].act === true && w.harmony >= REBIRTH_HARMONY && w.souls.length)) return;
    ekpyrosis(w);
    dirtyRef.current = true;
    flush(true);
    refresh();
  }, [refresh, flush]);

  // Wipe the CURRENT world back to the Void, keeping its slot (id + name).
  const beginAgain = useCallback(() => {
    if (!window.confirm("Begin this world again from the Void? Its progress will be lost.")) return;
    worldRef.current = createWorld();
    worldRef.current.dials = { ...dials };
    dirtyRef.current = true;
    setSelected(null);
    setNotice(null);
    setDials({ ...worldRef.current.dials });
    refresh();
    flush(true); // overwrite the saved slot with the fresh Void
  }, [dials, refresh, flush]);

  // Camera: drag to pan, wheel to zoom toward the cursor, click to select a soul.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toCanvas = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
    };
    const toWorld = (sx: number, sy: number) => {
      const cam = worldRef.current.camera;
      return { x: cam.cx + (sx - W / 2) / cam.zoom, y: cam.cy + (sy - H / 2) / cam.zoom };
    };
    const clampCam = () => {
      const cam = worldRef.current.camera;
      cam.zoom = clamp(cam.zoom, ZOOM_MIN, ZOOM_MAX);
      const m = PLANET_R * 1.05;
      cam.cx = clamp(cam.cx, -m, m);
      cam.cy = clamp(cam.cy, -m, m);
    };

    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      const c = toCanvas(e.clientX, e.clientY);
      lastX = c.x;
      lastY = c.y;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const c = toCanvas(e.clientX, e.clientY);
      const dx = c.x - lastX;
      const dy = c.y - lastY;
      lastX = c.x;
      lastY = c.y;
      moved += Math.abs(dx) + Math.abs(dy);
      const cam = worldRef.current.camera;
      cam.cx -= dx / cam.zoom;
      cam.cy -= dy / cam.zoom;
      clampCam();
      dirtyRef.current = true;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved > 6) return; // a pan, not a click
      const c = toCanvas(e.clientX, e.clientY);
      const wp = toWorld(c.x, c.y);
      const w = worldRef.current;
      let best: Soul | null = null;
      let bd = Infinity;
      for (const s of w.souls) {
        const dx = s.x - wp.x;
        const dy = s.y - wp.y;
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      const thr = Math.max(16, 22 / w.camera.zoom);
      if (best && bd < thr * thr) {
        w.selected = best.id;
        setNotice(null);
        refresh();
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = toCanvas(e.clientX, e.clientY);
      const before = toWorld(c.x, c.y);
      const cam = worldRef.current.camera;
      cam.zoom = clamp(cam.zoom * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
      cam.cx = before.x - (c.x - W / 2) / cam.zoom;
      cam.cy = before.y - (c.y - H / 2) / cam.zoom;
      clampCam();
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [refresh]);

  const zoomBy = useCallback((factor: number) => {
    const cam = worldRef.current.camera;
    cam.zoom = clamp(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  }, []);
  const viewWorld = useCallback(() => {
    worldRef.current.camera = { cx: 0, cy: 0, zoom: FIT_ZOOM };
  }, []);
  const followSelected = useCallback(() => {
    const w = worldRef.current;
    const s = w.selected != null ? w.souls.find((x) => x.id === w.selected) : null;
    if (!s) return;
    w.camera.cx = s.x;
    w.camera.cy = s.y;
    w.camera.zoom = clamp(Math.max(w.camera.zoom, 2.6), ZOOM_MIN, ZOOM_MAX);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = cosmosRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  /* ---- the Oracle: awaken ---- */
  const awaken = useCallback(async () => {
    const w = worldRef.current;
    const s = w.selected != null ? w.souls.find((x) => x.id === w.selected) : null;
    if (!s || awakening) return;
    setAwakening(true);
    setNotice(null);
    try {
      const res = await fetch("/api/playground/kosmopolis/mind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul: { name: s.name, virtues: s.v },
          epoch: EPOCHS[w.epoch].name,
          year: w.year,
          harmony: w.harmony,
          fortune: w.fortune?.name ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "The Oracle was silent.");
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }
      const key = (data.virtue as VirtueKey) ?? "wisdom";
      // Awakening gives reason: the exercised virtue strengthens durably, the
      // soul flourishes, and it now wears the ring of reason.
      s.awake = true;
      s.faulty = null; // reason mended
      s.v[key] = clamp(s.v[key] + 0.12, 0.05, 0.99);
      s.eud = clamp(s.eud + 0.14, 0.02, 1);
      s.lastDeed = { virtue: key, virtuous: true };
      s.reflection = data.reflection;
      const srcs = asSources(data.sources);
      s.sources = srcs;
      log(w, `${s.name} awakened to reason, and chose — drawing on ${virtueDef(key).name.toLowerCase()}.`);
      // The line it reasoned its way to enters the world's own corpus.
      const maxim = extractMaxim(data.reflection || "");
      if (maxim) {
        w.maxims.unshift({ id: w.maximId++, text: maxim, author: s.name, year: w.year, sources: srcs });
        if (w.maxims.length > 40) w.maxims.pop();
        log(w, `${s.name} left a saying: “${maxim}”`);
      }
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      dirtyRef.current = true;
      flush(true);
      refresh();
      loadLedger();
    } catch {
      setNotice("The Oracle could not be reached.");
    } finally {
      setAwakening(false);
    }
  }, [awakening, refresh, loadLedger, flush]);

  /* ---- the Oracle: counsel ---- */
  const submitCounsel = useCallback(async () => {
    const w = worldRef.current;
    const s = w.selected != null ? w.souls.find((x) => x.id === w.selected) : null;
    const text = advice.trim();
    if (!s || !text || counseling) return;
    setCounseling(true);
    setNotice(null);
    try {
      const res = await fetch("/api/playground/kosmopolis/counsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul: { name: s.name, virtues: s.v },
          counselor: counselorId,
          advice: text,
          epoch: EPOCHS[w.epoch].name,
          year: w.year,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "The voice was silent.");
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }
      const key = (data.virtue as VirtueKey) ?? "wisdom";
      s.v[key] = clamp(s.v[key] + 0.08, 0.05, 0.99);
      s.eud = clamp(s.eud + 0.08, 0.02, 1);
      s.reflection = data.reply;
      s.sources = asSources(data.sources);
      log(w, `${data.counselor} counselled ${s.name}, who took it up — ${virtueDef(key).name.toLowerCase()} strengthened in them.`);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setAdvice("");
      setCounselOpen(false);
      dirtyRef.current = true;
      flush(true);
      refresh();
      loadLedger();
    } catch {
      setNotice("The counsel could not reach the world.");
    } finally {
      setCounseling(false);
    }
  }, [advice, counselorId, counseling, refresh, loadLedger, flush]);

  /* ---- decisions: a soul faces a dilemma, you help it choose ---- */
  const openDilemma = useCallback(() => {
    const w = worldRef.current;
    const s = w.selected != null ? w.souls.find((x) => x.id === w.selected) : null;
    if (!s) return;
    const d = pickDilemma(s.v, lastDilemmaRef.current);
    lastDilemmaRef.current = d.id;
    setDilemma(d);
    setDilemmaOpen(true);
    setNotice(null);
  }, []);

  const chooseOption = useCallback(
    (opt: DilemmaOption) => {
      const w = worldRef.current;
      const s = w.selected != null ? w.souls.find((x) => x.id === w.selected) : null;
      if (!s) return;
      const mag = opt.good ? 1 : -1;
      s.v[opt.virtue] = clamp(s.v[opt.virtue] + mag * 0.1, 0.02, 0.99);
      s.eud = clamp(s.eud + mag * 0.16, 0.02, 1);
      s.lastDeed = { virtue: opt.virtue, virtuous: opt.good };
      const text = opt.outcome(s.name);
      s.reflection = text;
      // the choice ripples to those nearby, for good or ill
      for (const o of w.souls) {
        if (o === s) continue;
        const dx = o.x - s.x;
        const dy = o.y - s.y;
        if (dx * dx + dy * dy < 6000) o.eud = clamp(o.eud + mag * 0.03, 0.02, 1);
      }
      w.playout = { soulId: s.id, text, good: opt.good, life: 240 };
      log(
        w,
        `${s.name} faced a choice and ${opt.good ? "chose well" : "chose poorly"} — ${virtueDef(opt.virtue).name.toLowerCase()} ${opt.good ? "strengthened" : "faltered"} in them.`,
        !opt.good
      );
      setDilemmaOpen(false);
      dirtyRef.current = true;
      flush(true);
      refresh();
      // remember notable choices in the shared annals (no Oracle spent)
      fetch("/api/playground/kosmopolis/choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soul: { name: s.name, virtues: s.v },
          virtue: opt.virtue,
          outcome: text,
          epoch: EPOCHS[w.epoch].name,
          year: w.year,
        }),
      })
        .then(() => loadLedger())
        .catch(() => {});
    },
    [flush, refresh, loadLedger]
  );

  /* ---------------------------------------------------------------- view */

  const harmonyPct = Math.round(ui.harmony * 100);
  const playLabel = ui.running ? "❚❚ Pause" : ui.ignited ? "▶ Resume" : "Ignite";

  const syncLabel =
    sync === "saving"
      ? "Saving…"
      : sync === "synced"
      ? "Synced to your account"
      : sync === "local"
      ? "Saved to this browser"
      : sync === "error"
      ? "Sync failed — saved to this browser"
      : authed
      ? "Will sync as your world changes"
      : "Saved to this browser as you go";

  return (
    <div className={`kp${expanded ? " kp-expanded" : ""}`}>
      <div className="kp-stage">
        {/* the cosmos */}
        <section className="kp-cosmos" aria-label="The simulated world" ref={cosmosRef}>
          <canvas ref={canvasRef} width={W} height={H} />
          <div className="kp-cam" role="group" aria-label="View">
            <button className="kp-cam-btn" onClick={() => setExpanded((x) => !x)} aria-label={expanded ? "Shrink the map" : "Enlarge the map"} title={expanded ? "Shrink the map" : "Enlarge the map"}>
              {expanded ? "⤡" : "⤢"}
            </button>
            <button className="kp-cam-btn" onClick={toggleFullscreen} aria-label="Fullscreen" title="Fullscreen">
              ⛶
            </button>
            {ui.ignited && (
              <>
                <button className="kp-cam-btn" onClick={() => zoomBy(1.4)} aria-label="Zoom in" title="Zoom in">
                  +
                </button>
                <button className="kp-cam-btn" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out" title="Zoom out">
                  −
                </button>
                <button className="kp-cam-btn" onClick={viewWorld} aria-label="View the whole world" title="View the whole world">
                  ◯
                </button>
                <button className="kp-cam-btn" onClick={followSelected} aria-label="Follow the selected soul" title="Follow the selected soul" disabled={!selected}>
                  ✦
                </button>
              </>
            )}
          </div>
          {ui.ignited && <p className="kp-zoomhint">Scroll to zoom · drag to pan</p>}
          <div className="kp-ov">
            <div className="kp-ov-top">
              <div>
                <p className="kp-epoch-kicker">{ui.epochKicker}</p>
                <p className="kp-epoch-name">{ui.epochName}</p>
              </div>
              <div className="kp-clock">
                <span className="kp-yr">{ui.year.toLocaleString()}</span>
                <span className="kp-yr-lbl">Year of the World{ui.cycle > 1 ? ` · Cycle ${ui.cycle}` : ""}</span>
              </div>
            </div>
            <div className="kp-ov-bottom">
              <div className="kp-harmony-read">
                Harmony of the whole · <b>{ui.ignited ? `${harmonyPct}%` : "—"}</b>
                {ui.fortune ? <span className="kp-fortune"> · {ui.fortune}</span> : null}
              </div>
              <div className="kp-legend">
                {VIRTUES.map((v) => (
                  <span key={v.key}>
                    <i style={{ background: rgb(v.color) }} />
                    {v.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {!ui.ignited && (
            <div className="kp-veil">
              <div className="kp-veil-inner">
                <h2>Nothing is, yet.</h2>
                <p>A cold, formless field. Strike the creative fire and let a world condense out of it.</p>
                <button className="kp-btn kp-btn-primary" onClick={ignite}>
                  Ignite the world
                </button>
              </div>
            </div>
          )}
        </section>

        {/* instruments */}
        <aside className="kp-rail">
          <div className="kp-card">
            <h3>Your worlds</h3>
            <ul className="kp-worlds">
              {saves.map((s) => (
                <li key={s.id} className={s.id === activeId ? "kp-world kp-world-on" : "kp-world"}>
                  <button className="kp-world-pick" onClick={() => switchTo(s.id)} title={s.id === activeId ? "Current world" : "Open this world"}>
                    <span className="kp-world-dot" />
                    {s.name}
                  </button>
                  {saves.length > 1 && (
                    <button className="kp-world-x" onClick={() => deleteWorld(s.id)} aria-label={`Forget ${s.name}`} title="Forget this world">
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="kp-world-actions">
              <button className="kp-btn" onClick={newWorld}>
                + New world
              </button>
              <button className="kp-btn" onClick={renameActive} disabled={!activeId}>
                Rename
              </button>
            </div>
          </div>

          <div className="kp-card">
            <h3>The world</h3>
            <div className="kp-metrics">
              <div className="kp-metric">
                <span className="kp-k">Souls</span>
                <span className="kp-v">{ui.pop}</span>
              </div>
              <div className="kp-metric">
                <span className="kp-k">Mean virtue</span>
                <span className="kp-v">{ui.arete == null ? "—" : `${Math.round(ui.arete * 100)}`}<small>%</small></span>
              </div>
              <div className="kp-metric">
                <span className="kp-k">Flourishing</span>
                <span className="kp-v">{ui.eud == null ? "—" : `${Math.round(ui.eud * 100)}`}<small>%</small></span>
              </div>
              <div className="kp-metric">
                <span className="kp-k">Generations</span>
                <span className="kp-v">{ui.generations}</span>
              </div>
            </div>
            <div className="kp-bar">
              <i
                style={{
                  width: `${ui.ignited ? harmonyPct : 0}%`,
                  background: ui.harmony > 0.5 ? "linear-gradient(90deg,#7aa88e,#d6b26a)" : "linear-gradient(90deg,#5b635e,#b8473f)",
                }}
              />
            </div>
            <div className="kp-sync">
              <span className={`kp-sync-dot kp-sync-${sync}`} />
              <span>{syncLabel}</span>
              {!authed && (
                <a className="kp-sync-link" href="/login?redirectTo=/playground/kosmopolis">
                  Sign in to sync
                </a>
              )}
            </div>
          </div>

          <div className="kp-card">
            <h3>Providence</h3>
            <div className="kp-controls">
              <div className="kp-btn-row">
                <button className={`kp-btn ${ui.running ? "" : "kp-btn-primary"}`} onClick={togglePlay}>
                  {playLabel}
                </button>
                <button className="kp-btn" onClick={step}>
                  Step ›
                </button>
              </div>
              <div className="kp-speeds" role="group" aria-label="Speed of time">
                {[
                  { s: 1, l: "Slow" },
                  { s: 3, l: "Flowing" },
                  { s: 8, l: "Ages" },
                ].map(({ s, l }) => (
                  <button key={s} className={`kp-btn ${worldRef.current.speed === s ? "kp-on" : ""}`} onClick={() => setSpeed(s)}>
                    {l}
                  </button>
                ))}
              </div>
              <button className="kp-btn kp-wide" onClick={seedOne}>
                ✦ Breathe a soul into being
              </button>
              <button className="kp-btn kp-wide kp-btn-fire" onClick={rebirth} disabled={!ui.canRebirth}>
                ⟳ Kindle the rebirth
              </button>
              <p className="kp-hint">
                {ui.canRebirth
                  ? "Harmony is high enough to pass the world through fire — it will begin again from its best souls."
                  : "Ignite, then let time flow. Click any point of light to look into a soul."}
              </p>
            </div>
          </div>

          {/* inspector */}
          <div className="kp-card kp-inspector" aria-live="polite">
            <h3>The soul in view</h3>
            {!selected ? (
              <p className="kp-empty">No soul selected. Click a point of light in the world.</p>
            ) : (
              <SoulCard
                soul={selected}
                townName={worldRef.current.settlements[selected.home]?.name ?? null}
                townInst={worldRef.current.builtInst[selected.home] ?? []}
                onAwaken={awaken}
                awakening={awakening}
                onCounsel={() => setCounselOpen(true)}
                onDecide={openDilemma}
                acting={EPOCHS[worldRef.current.epoch].act === true}
              />
            )}
            {notice && <p className="kp-notice">{notice}</p>}
            {remaining != null && <p className="kp-remaining">Reasoned acts left today: {remaining}</p>}
          </div>

          {/* doctrine dials */}
          <div className="kp-card">
            <h3>Doctrine — argue the model</h3>
            <div className="kp-dials">
              {DIAL_META.map((d) => (
                <label key={d.key} className="kp-dial">
                  <span className="kp-dial-top">
                    <span className="kp-dial-label">{d.label}</span>
                    <span className="kp-dial-val">{d.format(dials[d.key])}</span>
                  </span>
                  <input
                    type="range"
                    min={d.min}
                    max={d.max}
                    step={d.step}
                    value={dials[d.key]}
                    onChange={(e) => setDials((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))}
                  />
                  <span className="kp-dial-note">{d.note}</span>
                </label>
              ))}
              <button className="kp-btn kp-wide" onClick={() => setDials({ ...DEFAULT_DIALS })}>
                Restore the doctrine
              </button>
            </div>
          </div>

          <div className="kp-card">
            <h3>Laws of this world</h3>
            <ul className="kp-laws">
              {LAWS.map((law) => (
                <li key={law.title}>
                  <span className="kp-glyph">{law.glyph}</span>
                  <span>
                    <b>{law.title}</b> {law.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* what the people have built */}
          <div className="kp-card">
            <h3>Institutions — what the people build</h3>
            <ul className="kp-insts">
              {INSTITUTIONS.map((inst) => (
                <li key={inst.type} className={insts[inst.type] ? "kp-inst kp-inst-on" : "kp-inst"}>
                  <span className="kp-inst-dot" style={{ background: rgb(virtueDef(inst.virtue).color) }} />
                  <span className="kp-inst-body">
                    <b>
                      {inst.name}
                      {insts[inst.type] > 0 ? ` ×${insts[inst.type]}` : ""}
                    </b>
                    <span className="kp-inst-note">{inst.note}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="kp-hint">A town raises these on its own as its people grow strong in the virtue each serves.</p>
          </div>

          {/* the world's own corpus */}
          <div className="kp-card">
            <h3>Maxims — what this world has learned</h3>
            {maxims.length === 0 ? (
              <p className="kp-empty">
                When you awaken a soul, the saying it reasons its way to is kept here — this world writing its own corpus.
              </p>
            ) : (
              <ul className="kp-maxims">
                {maxims.map((m) => (
                  <li key={m.id}>
                    <p className="kp-maxim-text">“{m.text}”</p>
                    <p className="kp-maxim-by">
                      — {m.author}, yr {m.year.toLocaleString()}
                    </p>
                    <SourceCite sources={m.sources} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* the ledger */}
          <div className="kp-card">
            <h3>The annals — a shared mythology</h3>
            {lives.length === 0 ? (
              <p className="kp-empty">No lives remembered yet. Awaken a soul, and it enters the annals for every visitor.</p>
            ) : (
              <ul className="kp-ledger">
                {lives.slice(0, 8).map((l) => (
                  <li key={l.id}>
                    <span className="kp-ledger-mark" style={{ background: l.virtue ? rgb(virtueDef(l.virtue).color) : "#7c7565" }} />
                    <span className="kp-ledger-body">
                      <b>{l.soul_name}</b>
                      {l.kind === "counsel" && l.counselor
                        ? ` — counselled by ${l.counselor}`
                        : l.kind === "choice"
                        ? " — helped through a choice"
                        : " — awakened"}
                      {l.author_name ? <span className="kp-ledger-epoch"> · by {l.author_name}</span> : null}
                      {l.epoch ? <span className="kp-ledger-epoch"> · {l.epoch}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button className="kp-reset" onClick={beginAgain}>
            Begin again from the Void
          </button>
        </aside>
      </div>

      {/* the Chronicle */}
      <div className="kp-card kp-chronicle-card">
        <h3>The Chronicle</h3>
        <div className="kp-chronicle">
          {chron.length === 0 ? (
            <p className="kp-empty">The annals are empty. Nothing has happened.</p>
          ) : (
            chron.map((c) => (
              <div className={`kp-entry ${c.ill ? "kp-entry-ill" : ""}`} key={c.id}>
                <span className="kp-when">Yr {c.year.toLocaleString()}</span>
                <span className="kp-what">{c.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* counsel modal */}
      {counselOpen && selected && (
        <div className="kp-modal" role="dialog" aria-modal="true" aria-label={`Counsel ${selected.name}`}>
          <div className="kp-modal-scrim" onClick={() => setCounselOpen(false)} />
          <div className="kp-modal-body">
            <button className="kp-modal-x" onClick={() => setCounselOpen(false)} aria-label="Close">
              ×
            </button>
            <p className="kp-modal-kicker">Counsel a soul</p>
            <h2 className="kp-modal-h">Speak to {selected.name}</h2>
            <p className="kp-modal-lede">
              Choose a voice from the Cabinet and give your counsel. It will answer {selected.name} in character, from the corpus — and what it presses on will strengthen in the soul.
            </p>
            <div className="kp-voice-row">
              {COUNSELORS.map((c) => (
                <button key={c.id} className={`kp-voice ${counselorId === c.id ? "kp-voice-on" : ""}`} onClick={() => setCounselorId(c.id)} title={c.note}>
                  {c.name}
                </button>
              ))}
            </div>
            <textarea
              className="kp-advice"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder={`What would you have ${selected.name} understand?`}
              rows={4}
              maxLength={2000}
            />
            <div className="kp-modal-actions">
              <button className="kp-btn" onClick={() => setCounselOpen(false)}>
                Cancel
              </button>
              <button className="kp-btn kp-btn-primary" onClick={submitCounsel} disabled={counseling || !advice.trim()}>
                {counseling ? "The voice is considering…" : "Give counsel"}
              </button>
            </div>
            {notice && <p className="kp-notice">{notice}</p>}
          </div>
        </div>
      )}

      {/* decision modal */}
      {dilemmaOpen && dilemma && selected && (
        <div className="kp-modal" role="dialog" aria-modal="true" aria-label={`A choice for ${selected.name}`}>
          <div className="kp-modal-scrim" onClick={() => setDilemmaOpen(false)} />
          <div className="kp-modal-body">
            <button className="kp-modal-x" onClick={() => setDilemmaOpen(false)} aria-label="Close">
              ×
            </button>
            <p className="kp-modal-kicker">A choice · {dilemma.tag}</p>
            <h2 className="kp-modal-h">{selected.name} must decide</h2>
            <p className="kp-modal-scene">{dilemma.scene(selected.name)}</p>
            <div className="kp-options">
              {dilemma.options.map((opt, i) => (
                <button key={i} className="kp-option" onClick={() => chooseOption(opt)}>
                  <span className="kp-option-label">{opt.label}</span>
                  <span className="kp-option-virtue" style={{ color: rgb(virtueDef(opt.virtue).color) }}>
                    {virtueDef(opt.virtue).name}
                  </span>
                </button>
              ))}
            </div>
            <p className="kp-modal-foot">Choose the course you would have them take, and watch it play out.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- the selected soul ---- */
// "Grounded in ..." — the corpus passages the Oracle drew on.
function SourceCite({ sources }: { sources?: Source[] | null }) {
  const list = asSources(sources).slice(0, 4);
  if (!list.length) return null;
  return (
    <p className="kp-cite">
      <span className="kp-cite-k">Grounded in</span> {list.map(formatSource).filter(Boolean).join(" · ")}
    </p>
  );
}

function SoulCard({
  soul,
  townName,
  townInst,
  onAwaken,
  awakening,
  onCounsel,
  onDecide,
  acting,
}: {
  soul: Soul;
  townName?: string | null;
  townInst?: InstType[];
  onAwaken: () => void;
  awakening: boolean;
  onCounsel: () => void;
  onDecide: () => void;
  acting: boolean;
}) {
  const dom = dominantVirtue(soul.v);
  const troubled = acting && soul.eud < 0.34;
  const inst = townInst ?? [];
  return (
    <div>
      <p className="kp-soul-name">
        {soul.name}
        {soul.awake && <span className="kp-awake-tag">awake</span>}
        {troubled && <span className="kp-trouble-tag">troubled</span>}
      </p>
      <p className="kp-soul-sub">
        {townName ? `Of ${townName} · ` : ""}Born year {soul.born.toLocaleString()} · leans {dom.name.toLowerCase()}
      </p>
      {inst.length > 0 && (
        <p className="kp-soul-town">
          Their town has {inst.map((t) => instDef(t).name.toLowerCase()).join(", ")}.
        </p>
      )}
      <div className="kp-virtues">
        {VIRTUES.map((v) => {
          const pct = Math.round(soul.v[v.key] * 100);
          return (
            <div className="kp-virtue" key={v.key}>
              <span className="kp-vn">{v.name}</span>
              <span className="kp-vbar">
                <i style={{ width: `${pct}%`, background: rgb(v.color) }} />
              </span>
              <span className="kp-vv">{pct}</span>
            </div>
          );
        })}
      </div>
      <div className="kp-flourish">
        <span className="kp-k">Flourishing</span>
        <span className="kp-flourish-v">
          {Math.round(soul.eud * 100)}
          <small>%</small>
        </span>
      </div>
      {soul.reflection ? (
        <>
          <blockquote className="kp-reflection">{soul.reflection}</blockquote>
          <SourceCite sources={soul.sources} />
        </>
      ) : (
        <p className="kp-soul-note">
          {troubled ? `${soul.name} is struggling, and faces a hard choice.` : "Acts on simple leanings, not yet on thought."}
        </p>
      )}
      {!soul.awake && soul.faulty && (
        <div className="kp-faulty">
          <p className="kp-faulty-k">Their misjudgement</p>
          <p className="kp-faulty-premise">“{soul.faulty.premise}”</p>
          <p className="kp-faulty-error">
            <b>The false step —</b> {soul.faulty.error}
          </p>
        </div>
      )}
      <button className={`kp-btn kp-wide kp-decide ${troubled ? "kp-btn-primary" : ""}`} onClick={onDecide}>
        ⚖ Help {soul.name} decide
      </button>
      <div className="kp-soul-actions">
        <button className="kp-btn" onClick={onAwaken} disabled={awakening || soul.awake}>
          {soul.awake ? "Reason kindled" : awakening ? "The Oracle reasons…" : "✦ Awaken"}
        </button>
        <button className="kp-btn" onClick={onCounsel}>
          Counsel
        </button>
      </div>
    </div>
  );
}
