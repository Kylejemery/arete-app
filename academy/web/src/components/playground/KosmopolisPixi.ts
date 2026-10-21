"use client";

/**
 * Kosmopolis drawn with PixiJS (WebGL). The preview renderer, at every zoom.
 *
 * The default renderer (draw() in KosmopolisWorld.tsx) paints the world with
 * Canvas 2D primitives. This one paints the same World, band by band:
 *
 *   globe    zoom < GLOBE_GONE     a lit sphere you can spin (KosmopolisGlobe.ts),
 *                                  handing off face on to the map as you zoom in
 *   map      to FIGURE_ZOOM        the terrain, towns as marks, souls as lights
 *   town     to STREET_ZOOM        sprite towns and people (Kenney, "RTS Pack:
 *                                  Medieval", CC0, regraded toward the archive)
 *   street   to EYE_ZOOM           the same towns close in, paved and planted
 *   eye      EYE_ZOOM and up       the hand-drawn eye-level street from draw(),
 *                                  composited here with a GPU bloom (no
 *                                  side-on sprite art yet), see present()
 *
 * The flat bands share one scene: a camera-transformed world, a daylight
 * multiply over it, an additive light layer (blurred half resolution, the
 * bloom), and screen-space labels. Towns are laid out per settlement from the
 * world seed and re-laid when a town is founded, moves, or grows, so the
 * renderer reads world.settlements fresh every frame.
 *
 * Fog of war: see setFog() and the FOG HOOK notes. One mask feeds every band.
 *
 * It reads the World and changes nothing in the simulation. The two visual
 * counters draw() advances each frame (a soul's pulse, the red flash) are
 * advanced here too, so the look of things is the same whichever draws.
 *
 * pixi.js is imported dynamically, so it costs nothing until the preview is
 * switched on.
 */

import { useEffect, useRef, type RefObject } from "react";
import type * as PIXI from "pixi.js";
import { VIRTUES, dominantVirtue, type VirtueKey } from "@/content/playground/kosmopolis";
import { SOPHIST_REACH } from "@/content/playground/kosmopolis-polis";
import { ATLAS, ATLAS_SIZE } from "./kosmopolis-pixi-atlas";
import {
  SHEET_URL,
  DWELLINGS,
  TREES,
  BUSHES,
  INST_FRAME,
  SOUL_FRAME,
  SAGE_FRAME,
  gradeSheet,
  tunicVariant,
  radialCanvas,
  plazaCanvas,
  cobbleCanvas,
  prng,
  hex,
  clamp,
  type Frames,
} from "./kosmopolis-pixi-art";
import { Globe } from "./KosmopolisGlobe";

type Pixi = typeof import("pixi.js");
type RGBt = readonly number[];

// The globe's band: fully a globe (and spinnable) below GLOBE_SPIN, easing face
// on by GLOBE_FACE, crossfading into the flat map by GLOBE_GONE.
export const GLOBE_SPIN = 0.36;
const GLOBE_FACE = 0.46;
export const GLOBE_GONE = 0.6;

/* ------------------------------------------------ what the renderer reads */

// Structural views of the World: only the fields this renderer reads.
export type ViewSoul = {
  id: number;
  name: string;
  x: number;
  y: number;
  eud: number;
  awake: boolean;
  act: 0 | 1 | 2;
  pulse: number;
  home: number;
  v: Record<VirtueKey, number>;
};
export type ViewSettlement = { x: number; y: number; r: number; name: string };
export type ViewWorld = {
  seed: number;
  souls: ViewSoul[];
  settlements: readonly ViewSettlement[];
  builtInst: readonly (readonly string[])[];
  camera: { cx: number; cy: number; zoom: number };
  selected: number | null;
  playout: { soulId: number; text: string; good: boolean; life: number } | null;
  festival: number;
  tod: number;
  harmony: number;
  fortune: { good: boolean; tint: [number, number, number] } | null;
  flash: number;
  dials: { contagion: number };
  threats: {
    sophist: { x: number; y: number; strength: number } | null;
    tyrant: { home: number; grip: number; seized: boolean } | null;
    rival: { name: string; menace: number } | null;
  };
};
// What the host computes for the frame from its own helpers and constants.
export type ViewFrame = {
  t: number;
  elev: number; // sun elevation, -1 midnight to +1 noon
  daylight: RGBt; // the colour daylight multiplies the scene by
  acting: boolean; // the epoch in which deeds happen
  planetR: number;
  terrain: HTMLCanvasElement | null;
  figureZoom: number;
  buildingZoom: number;
  portraitZoom: number;
  streetZoom: number;
  market: (st: ViewSettlement) => { x: number; y: number };
  reach: (s: ViewSoul) => number; // the radius of a soul's circle of concern
  voyages?: ViewVoyages; // exploration marks over the flat map (see kosmopolis-explore.ts)
};

/** Exploration marks in world units: routes (dashed, from and to), the sails
 *  of expeditions under way, and the lands sighted but not yet settled. */
export type ViewVoyages = {
  routes: { sx: number; sy: number; tx: number; ty: number; planned: boolean }[];
  sails: { x: number; y: number; id: number }[];
  lands: { x: number; y: number }[];
};

/* ---------------------------------------------------------- the renderer */

type Prop = { sprite: PIXI.Sprite; shadow: PIXI.Sprite | null; x: number; y: number; glow?: PIXI.Sprite; core?: PIXI.Sprite; fire: boolean };
type TownView = { key: string; ground: PIXI.Container[]; street: PIXI.Graphics; props: Prop[]; x: number; y: number; r: number };
type SoulView = { body: PIXI.Sprite; shadow: PIXI.Sprite; aura: PIXI.Sprite; lantern: PIXI.Sprite; flame: PIXI.Sprite; kind: string; seen: number };

const smooth = (a: number, b: number, x: number) => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

export class WorldRenderer {
  private P: Pixi;
  private app: PIXI.Application;
  private tex: Record<string, PIXI.Texture> = {};
  private tunic: Record<string, PIXI.Texture> = {};
  private W: number;
  private H: number;

  private stage!: PIXI.Container;
  private stars!: PIXI.Graphics;
  private world!: PIXI.Container; // camera-transformed scene
  private ocean!: PIXI.Graphics;
  private terrainLayer!: PIXI.Container; // the terrain raster lives here
  private terrain: PIXI.Sprite | null = null;
  private terrainSrc: HTMLCanvasElement | null = null;
  private tint!: PIXI.Graphics;
  private ground!: PIXI.Container; // town earth, roads, paving
  private shadows!: PIXI.Container;
  private objects!: PIXI.Container; // y-sorted sprites
  private fx!: PIXI.Graphics; // rings and markers, world space
  /**
   * FOG HOOK (map, town, street). A world-space layer above the land, the
   * towns and the people, below the daylight and the light layer. setFog()
   * puts a veil sprite here; anything else drawn in world units can go here
   * too.
   */
  readonly fogWorld: PIXI.Container;
  private fogVeil: PIXI.Sprite | null = null;
  private dark!: PIXI.Sprite; // the daylight multiply
  private lightWorld!: PIXI.Container; // camera-transformed light
  private glow!: PIXI.Container; // additive, blurred: the bloom
  private cores!: PIXI.Container; // additive, crisp
  private threads!: PIXI.Graphics;
  private globe!: Globe;
  private composite!: PIXI.Container; // the eye-level pass
  private compBase!: PIXI.Sprite;
  private compBloom!: PIXI.Sprite;
  private compSrc: HTMLCanvasElement | null = null;
  private screen!: PIXI.Container;
  private labels!: PIXI.Container;
  private vignette!: PIXI.Sprite;
  private flash!: PIXI.Graphics;
  private plate!: PIXI.Graphics;
  private caption!: PIXI.Text;

  private towns: TownView[] = [];
  private landSrc: HTMLCanvasElement | null = null;
  private landData: Uint8ClampedArray | null = null;
  private landMask: HTMLCanvasElement | null = null;
  private inst: { sprite: PIXI.Sprite; shadow: PIXI.Sprite }[] = [];
  private souls = new Map<number, SoulView>();
  private names = new Map<number, PIXI.Text>();
  private townNames: PIXI.Text[] = [];
  private crowns: PIXI.Text[] = [];
  private frameNo = 0;
  private visible = false;
  private oceanDrawn = false;

  static async create(canvas: HTMLCanvasElement, width: number, height: number): Promise<WorldRenderer> {
    const P = await import("pixi.js");
    const app = new P.Application();
    await app.init({
      canvas,
      width,
      height,
      antialias: true,
      background: 0x08060a,
      autoStart: false,
      autoDensity: false,
      resolution: 1,
      preference: "webgl",
    });
    const frames: Frames = {};
    for (const [k, [x, y, w, h]] of Object.entries(ATLAS)) frames[k] = { frame: { x, y, w, h } };
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = SHEET_URL;
    });
    const graded = gradeSheet(img, frames);
    const data = { frames, meta: { scale: 1, size: ATLAS_SIZE } } as unknown as PIXI.SpritesheetData;
    const sheet = new P.Spritesheet(P.Texture.from(graded), data);
    await sheet.parse();
    return new WorldRenderer(P, app, sheet, graded, frames, width, height);
  }

  private constructor(P: Pixi, app: PIXI.Application, sheet: PIXI.Spritesheet, graded: HTMLCanvasElement, frames: Frames, W: number, H: number) {
    this.P = P;
    this.app = app;
    this.W = W;
    this.H = H;
    for (const [k, t] of Object.entries(sheet.textures)) this.tex[k] = t;
    for (const v of VIRTUES) this.tunic[v.key] = P.Texture.from(tunicVariant(graded, frames[SOUL_FRAME].frame, v.color));
    this.tex.glow = P.Texture.from(radialCanvas(128, [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]));
    this.tex.shadow = P.Texture.from(radialCanvas(96, [[0, "rgba(0,0,0,0.85)"], [0.55, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]], 0.55));
    this.tex.plaza = P.Texture.from(plazaCanvas(graded, frames.tile_01.frame));
    this.tex.cobble = P.Texture.from(cobbleCanvas());
    this.tex.cobble.source.addressMode = "repeat";
    this.tex.vignette = P.Texture.from(radialCanvas(256, [[0, "rgba(6,10,26,0)"], [0.55, "rgba(6,10,26,0)"], [1, "rgba(6,10,26,1)"]]));
    this.fogWorld = new P.Container();
    this.build();
  }

  private build() {
    const P = this.P;
    this.stage = this.app.stage;

    this.stars = new P.Graphics();
    const r = prng(7);
    for (let i = 0; i < 200; i++) this.stars.circle(r() * this.W, r() * this.H, r() * 1.3 + 0.2).fill({ color: 0xd8d2c0, alpha: 0.4 + r() * 0.6 });
    this.stage.addChild(this.stars);

    this.world = new P.Container();
    this.ocean = new P.Graphics();
    this.terrainLayer = new P.Container();
    this.tint = new P.Graphics();
    this.ground = new P.Container();
    this.shadows = new P.Container();
    this.objects = new P.Container();
    this.objects.sortableChildren = true;
    this.fx = new P.Graphics();
    this.world.addChild(this.ocean, this.terrainLayer, this.tint, this.ground, this.shadows, this.objects, this.fogWorld, this.fx);
    this.stage.addChild(this.world);

    this.dark = new P.Sprite(P.Texture.WHITE);
    this.dark.width = this.W;
    this.dark.height = this.H;
    this.dark.blendMode = "multiply";
    this.stage.addChild(this.dark);

    this.lightWorld = new P.Container();
    this.glow = new P.Container();
    this.glow.blendMode = "add";
    this.glow.filters = [new P.BlurFilter({ strength: 10, quality: 3, resolution: 0.5 })];
    this.cores = new P.Container();
    this.cores.blendMode = "add";
    this.threads = new P.Graphics();
    this.cores.addChild(this.threads);
    this.lightWorld.addChild(this.glow, this.cores);
    this.stage.addChild(this.lightWorld);

    this.globe = new Globe(P, this.tex.glow);
    this.stage.addChild(this.globe.container);

    // the eye-level pass: the 2D canvas, and its brightest parts blurred back
    // over it for a bloom
    this.composite = new P.Container();
    this.compBase = new P.Sprite(P.Texture.EMPTY);
    this.compBloom = new P.Sprite(P.Texture.EMPTY);
    this.compBloom.blendMode = "add";
    const bright = new P.ColorMatrixFilter();
    const k = 2.6;
    const o = -0.62 * k;
    bright.matrix = [k, 0, 0, 0, o, 0, k, 0, 0, o, 0, 0, k, 0, o, 0, 0, 0, 1, 0];
    // a filtered sprite is composited with its last filter's blend mode
    const bloomBlur = new P.BlurFilter({ strength: 12, quality: 3, resolution: 0.5 });
    bloomBlur.blendMode = "add";
    this.compBloom.filters = [bright, bloomBlur];
    this.compBloom.alpha = 0.7;
    this.composite.addChild(this.compBase, this.compBloom);
    this.composite.visible = false;
    this.stage.addChild(this.composite);

    this.screen = new P.Container();
    this.vignette = new P.Sprite(this.tex.vignette);
    this.vignette.anchor.set(0.5);
    this.vignette.position.set(this.W / 2, this.H / 2);
    this.vignette.width = Math.max(this.W, this.H) * 1.45;
    this.vignette.height = Math.max(this.W, this.H) * 1.45;
    this.labels = new P.Container();
    this.flash = new P.Graphics();
    this.plate = new P.Graphics();
    this.caption = new P.Text({
      text: "",
      style: { fontFamily: "Newsreader, Georgia, serif", fontSize: 16, fill: 0xefe7d4, wordWrap: true, wordWrapWidth: 340, align: "center", lineHeight: 21 },
    });
    this.caption.anchor.set(0.5, 0);
    this.screen.addChild(this.vignette, this.labels, this.flash, this.plate, this.caption);
    this.stage.addChild(this.screen);
  }

  /** Show or hide the WebGL canvas (the 2D canvas stays underneath). */
  setVisible(on: boolean) {
    if (on === this.visible) return;
    this.visible = on;
    const c = this.app.canvas as HTMLCanvasElement;
    c.style.visibility = on ? "visible" : "hidden";
  }

  destroy() {
    this.globe.destroy();
    this.app.destroy({ removeView: false }, { children: true, texture: true, textureSource: true });
  }

  /**
   * FOG HOOK (every band). A mask in terrain-raster space, covering world
   * [-R, R] on both axes: white revealed, black hidden. The globe veils hidden
   * land in its shader; the flat bands lay a veil sprite in fogWorld. Null
   * reveals everything. Call when the fog changes, not every frame. The
   * eye-level band is drawn by draw(), so its fog belongs there.
   */
  setFog(mask: HTMLCanvasElement | null, planetR: number) {
    this.globe.setFog(mask);
    if (this.fogVeil) {
      this.fogVeil.destroy({ texture: true, textureSource: true });
      this.fogVeil = null;
    }
    if (!mask) return;
    const cv = document.createElement("canvas");
    cv.width = mask.width;
    cv.height = mask.height;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(mask, 0, 0);
    const id = ctx.getImageData(0, 0, cv.width, cv.height);
    for (let i = 0; i < id.data.length; i += 4) {
      const seen = id.data[i] / 255;
      id.data[i] = 22;
      id.data[i + 1] = 24;
      id.data[i + 2] = 30;
      id.data[i + 3] = (1 - seen) * 235;
    }
    ctx.putImageData(id, 0, 0);
    this.fogVeil = new this.P.Sprite(this.P.Texture.from(cv));
    this.fogVeil.position.set(-planetR, -planetR);
    this.fogVeil.width = this.fogVeil.height = 2 * planetR;
    this.fogWorld.addChildAt(this.fogVeil, 0);
  }

  /** In the globe's band, turn it by a drag; false when the drag should pan. */
  spinBy(dx: number, dy: number, zoom: number): boolean {
    if (zoom >= GLOBE_SPIN) return false;
    this.globe.spinBy(dx, dy);
    return true;
  }

  /** In the globe's band, the world point under a canvas pixel (NaN for a miss); null outside it. */
  pick(sx: number, sy: number, zoom: number): { x: number; y: number } | null {
    return zoom < GLOBE_FACE ? this.globe.pick(sx, sy) : null;
  }

  resetSpin() {
    this.globe.resetSpin();
  }

  /**
   * The eye-level band (and the Void before the world): draw() has painted the
   * 2D canvas; show it through WebGL with its lights bloomed.
   */
  present(canvas: HTMLCanvasElement) {
    if (canvas !== this.compSrc) {
      this.compSrc = canvas;
      const tx = this.P.Texture.from(canvas);
      this.compBase.texture = tx;
      this.compBloom.texture = tx;
    } else {
      this.compBase.texture.source.update();
    }
    this.compBase.width = this.compBloom.width = this.W;
    this.compBase.height = this.compBloom.height = this.H;
    for (const c of this.stage.children) c.visible = c === this.composite;
    this.app.render();
  }

  private sprite(frame: string, ax = 0.5, ay = 0.8): PIXI.Sprite {
    const s = new this.P.Sprite(this.tex[frame] ?? this.P.Texture.EMPTY);
    s.anchor.set(ax, ay);
    return s;
  }
  private shadowFor(x: number, y: number, w: number): PIXI.Sprite {
    const s = new this.P.Sprite(this.tex.shadow);
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.width = w;
    s.height = w * 0.5;
    this.shadows.addChild(s);
    return s;
  }
  private light(container: PIXI.Container, color: number, size: number): PIXI.Sprite {
    const s = new this.P.Sprite(this.tex.glow);
    s.anchor.set(0.5);
    s.tint = color;
    s.width = size;
    s.height = size;
    s.alpha = 0;
    container.addChild(s);
    return s;
  }

  // The land, read once per terrain raster: what is sea, and a mask of the land.
  private readLand(tc: HTMLCanvasElement | null) {
    if (!tc || tc === this.landSrc) return;
    this.landSrc = tc;
    const td = tc.getContext("2d")?.getImageData(0, 0, tc.width, tc.height).data ?? null;
    this.landData = td;
    this.landMask = null;
    if (!td) return;
    const m = document.createElement("canvas");
    m.width = tc.width;
    m.height = tc.height;
    const mctx = m.getContext("2d")!;
    const md = mctx.createImageData(tc.width, tc.height);
    for (let i = 0; i < td.length; i += 4) md.data[i + 3] = td[i + 2] > td[i] + 6 ? 0 : 255;
    mctx.putImageData(md, 0, 0);
    this.landMask = m;
    for (const v of this.towns) v.key = ""; // re-lay every town on the new land
  }
  private wet(x: number, y: number, R: number): boolean {
    const tc = this.landSrc;
    const td = this.landData;
    if (!tc || !td) return false;
    const px = Math.floor(((x + R) / (2 * R)) * tc.width);
    const py = Math.floor(((y + R) / (2 * R)) * tc.height);
    if (px < 0 || py < 0 || px >= tc.width || py >= tc.height) return true;
    const i = (py * tc.width + px) * 4;
    return td[i + 2] > td[i] + 6;
  }

  private dropTown(v: TownView) {
    for (const p of v.props) {
      p.sprite.destroy();
      p.shadow?.destroy();
      p.glow?.destroy();
      p.core?.destroy();
    }
    for (const c of v.ground) {
      const own = c instanceof this.P.Sprite && c.texture !== this.tex.plaza;
      c.destroy(own ? { texture: true, textureSource: true } : undefined);
    }
    v.street.destroy();
  }

  // Lay out every town whose place or size changed since the last frame. A
  // town's layout is deterministic from the world seed, its index and its
  // radius, so a town keeps its houses until it grows (in steps of 12 units).
  private layout(w: ViewWorld, f: ViewFrame) {
    this.readLand(f.terrain);
    const n = w.settlements.length;
    for (let si = n; si < this.towns.length; si++) this.dropTown(this.towns[si]);
    this.towns.length = Math.min(this.towns.length, n);
    for (let si = 0; si < n; si++) {
      const st = w.settlements[si];
      const key = `${f.terrain ? 1 : 0}:${w.seed}:${st.x | 0},${st.y | 0}:${Math.round(st.r / 12)}`;
      const old = this.towns[si];
      if (old && old.key === key) continue;
      if (old) this.dropTown(old);
      this.towns[si] = this.layTown(w, f, st, si, key);
    }
  }

  private layTown(w: ViewWorld, f: ViewFrame, st: ViewSettlement, si: number, key: string): TownView {
    const P = this.P;
    const R = f.planetR;
    const rnd = prng((w.seed ^ (si * 2654435761)) >>> 0);
    const m = f.market(st);
    const rowY = st.y - st.r * 0.55;
    const view: TownView = { key, ground: [], street: new P.Graphics(), props: [], x: st.x, y: st.y, r: st.r };

    const pw = st.r * 2.2;
    const ph = st.r * 2.0;
    const plaza = new P.Sprite(this.landMask ? P.Texture.from(this.clipToLand(this.landMask, st.x - pw / 2, st.y + st.r * 0.05 - ph / 2, pw, ph, R)) : this.tex.plaza);
    plaza.anchor.set(0.5);
    plaza.position.set(st.x, st.y + st.r * 0.05);
    plaza.width = pw;
    plaza.height = ph;
    plaza.alpha = 0.55;
    plaza.tint = 0xcbb894;
    this.ground.addChild(plaza);
    view.ground.push(plaza);

    // roads: packed earth, and (close in) the same courses laid with setts
    const roads = new P.Graphics();
    const street = view.street;
    const road = (x0: number, y0: number, x1: number, y1: number, wd: number) => {
      for (let k = 0; k < 10 && this.wet(x1, y1, R); k++) {
        x1 = x0 + (x1 - x0) * 0.85;
        y1 = y0 + (y1 - y0) * 0.85;
      }
      if (Math.hypot(x1 - x0, y1 - y0) < 20) return;
      const mx = (x0 + x1) / 2 + (rnd() - 0.5) * 26;
      const my = (y0 + y1) / 2 + (rnd() - 0.5) * 26;
      roads.moveTo(x0, y0).quadraticCurveTo(mx, my, x1, y1).stroke({ width: wd + 5, color: 0x6e5a3c, alpha: 0.18, cap: "round" });
      roads.moveTo(x0, y0).quadraticCurveTo(mx, my, x1, y1).stroke({ width: wd, color: 0xd9c49a, alpha: 0.55, cap: "round" });
      street.moveTo(x0, y0).quadraticCurveTo(mx, my, x1, y1).stroke({ width: wd + 2.2, color: 0x5e5244, alpha: 0.9, cap: "round" });
      street
        .moveTo(x0, y0)
        .quadraticCurveTo(mx, my, x1, y1)
        .stroke({ width: wd, texture: this.tex.cobble, matrix: new P.Matrix().scale(0.18, 0.18), color: 0xffffff, cap: "round" });
    };
    road(st.x, rowY + 14, m.x, m.y, 12);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + rnd() * 0.6;
      road(m.x, m.y, st.x + Math.cos(a) * st.r * 1.15, st.y + Math.sin(a) * st.r * 1.0, 8);
    }
    // the market square, paved
    let dry = true;
    for (let k = 0; k < 8; k++) if (this.wet(m.x + Math.cos(k * 0.785) * 30, m.y + Math.sin(k * 0.785) * 30, R)) dry = false;
    if (dry) {
      street.circle(m.x, m.y, 30).fill({ color: 0x5e5244, alpha: 0.9 });
      street.circle(m.x, m.y, 28.5).fill({ texture: this.tex.cobble, matrix: new P.Matrix().scale(0.18, 0.18), color: 0xffffff });
    }
    this.ground.addChild(roads, street);
    view.ground.push(roads);

    const taken: { x: number; y: number; r: number }[] = [
      { x: m.x, y: m.y, r: 40 },
      { x: st.x, y: rowY, r: 70 },
    ];
    const free = (x: number, y: number, r: number) => !this.wet(x, y, R) && taken.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 > (t.r + r) ** 2);
    const place = (frame: string, x: number, y: number, scale: number, radius: number, shadowW: number, light = 0) => {
      const s = this.sprite(frame, 0.5, 0.82);
      s.position.set(x, y);
      s.scale.set(scale * (rnd() < 0.5 ? -1 : 1), scale);
      s.zIndex = y;
      this.objects.addChild(s);
      const sh = shadowW > 0 ? this.shadowFor(x, y - 2, shadowW) : null;
      const p: Prop = { sprite: s, shadow: sh, x, y, fire: frame === "environment_20" };
      if (light) {
        p.glow = this.light(this.glow, 0xffbe6a, light);
        p.glow.position.set(x, y - 8);
        p.core = this.light(this.cores, 0xffd99a, light * 0.22);
        p.core.position.set(x + (rnd() - 0.5) * 8, y - 6);
      }
      view.props.push(p);
      taken.push({ x, y, r: radius });
      return p;
    };

    // the market: two stalls, the statue, and a fire that is lit at dusk
    place("structure_22", m.x - 26, m.y - 4, 0.36, 14, 26);
    place("structure_22", m.x + 28, m.y + 6, 0.36, 14, 26);
    place("structure_12", m.x, m.y - 22, 0.36, 10, 16);
    place("environment_20", m.x + 2, m.y + 22, 0.28, 8, 0, 120);

    // dwellings, set around the centre where the townsfolk sleep, each with a
    // kitchen garden behind it that shows close in
    const nHouse = 9 + Math.round((st.r - 120) / 9);
    for (let k = 0, tries = 0; k < nHouse && tries < 400; tries++) {
      const a = rnd() * Math.PI * 2;
      const rr = st.r * (0.28 + rnd() * 0.72);
      const x = st.x + Math.cos(a) * rr;
      const y = st.y + Math.sin(a) * rr * 0.92;
      if (!free(x, y, 20)) continue;
      place(DWELLINGS[(rnd() * DWELLINGS.length) | 0], x, y, 0.34 + rnd() * 0.06, 20, 40, 64);
      const gx = x + (rnd() < 0.5 ? -1 : 1) * 24;
      const gy = y - 6;
      if (!this.wet(gx, gy, R) && rnd() < 0.6) {
        street.roundRect(gx - 9, gy - 7, 18, 13, 2).fill({ color: 0x6a5134, alpha: 0.85 });
        for (let row = 0; row < 4; row++) street.rect(gx - 8, gy - 5.5 + row * 3, 16, 1.2).fill({ color: 0x7f8f52, alpha: 0.9 });
        street.roundRect(gx - 9, gy - 7, 18, 13, 2).stroke({ width: 0.8, color: 0x8a6d46, alpha: 0.9 });
      }
      k++;
    }
    // cypresses and scrub round the edge
    for (let k = 0, tries = 0; k < 18 && tries < 300; tries++) {
      const a = rnd() * Math.PI * 2;
      const rr = st.r * (0.9 + rnd() * 0.5);
      const x = st.x + Math.cos(a) * rr;
      const y = st.y + Math.sin(a) * rr;
      if (!free(x, y, 8)) continue;
      const p =
        rnd() < 0.72
          ? place(TREES[(rnd() * TREES.length) | 0], x, y, 0.3 + rnd() * 0.14, 8, 22)
          : place(BUSHES[(rnd() * BUSHES.length) | 0], x, y, 0.3 + rnd() * 0.1, 7, 16);
      p.sprite.tint = 0xd9d2b8; // a dustier green
      k++;
    }
    // flowers and stones in the grass, close in
    for (let k = 0; k < 40; k++) {
      const a = rnd() * Math.PI * 2;
      const rr = st.r * (0.2 + rnd() * 1.05);
      const x = st.x + Math.cos(a) * rr;
      const y = st.y + Math.sin(a) * rr;
      if (!free(x, y, 2)) continue;
      const c = [0xe8dcb4, 0xc98a6a, 0xd8c070, 0xb0a8c8][(rnd() * 4) | 0];
      for (let j = 0; j < 4; j++) street.circle(x + (rnd() - 0.5) * 6, y + (rnd() - 0.5) * 4, 0.9).fill({ color: c, alpha: 0.9 });
    }
    return view;
  }

  // The town earth, cut to the shape of the land it stands on.
  private clipToLand(mask: HTMLCanvasElement, x: number, y: number, w: number, h: number, R: number): HTMLCanvasElement {
    const src = this.tex.plaza.source.resource as HTMLCanvasElement;
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = Math.round((512 * h) / w);
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "destination-in";
    const k = mask.width / (2 * R);
    ctx.drawImage(mask, (x + R) * k, (y + R) * k, w * k, h * k, 0, 0, cv.width, cv.height);
    return cv;
  }

  private soulView(s: ViewSoul): SoulView {
    let v = this.souls.get(s.id);
    if (!v) {
      const P = this.P;
      const body = new P.Sprite(P.Texture.EMPTY);
      body.anchor.set(0.5, 0.72);
      this.objects.addChild(body);
      v = {
        body,
        shadow: this.shadowFor(s.x, s.y, 14),
        aura: this.light(this.glow, 0xffffff, 46),
        lantern: this.light(this.glow, 0xffc070, 44),
        flame: this.light(this.cores, 0xffe8b2, 5),
        kind: "",
        seen: 0,
      };
      this.souls.set(s.id, v);
    }
    return v;
  }

  // Exploration marks, in fx over the flat map: dashed routes, little sails,
  // and a gold ring at the heart of each land sighted but not settled.
  private drawVoyages(v: ViewVoyages, inv: number, t: number) {
    const fx = this.fx;
    const dash = 6 * inv;
    for (const r of v.routes) {
      const len = Math.hypot(r.tx - r.sx, r.ty - r.sy);
      const n = Math.max(1, Math.floor(len / (dash * 2)));
      const color = r.planned ? 0xe2c787 : 0x7a9cc4;
      for (let k = 0; k < n; k++) {
        const a = (k * 2 * dash) / len;
        const b = Math.min(1, ((k * 2 + 1) * dash) / len);
        fx.moveTo(r.sx + (r.tx - r.sx) * a, r.sy + (r.ty - r.sy) * a).lineTo(r.sx + (r.tx - r.sx) * b, r.sy + (r.ty - r.sy) * b);
      }
      fx.stroke({ width: 1.6 * inv, color, alpha: r.planned ? 0.95 : 0.75 });
      fx.circle(r.tx, r.ty, 6 * inv).stroke({ width: 1.6 * inv, color, alpha: 0.9 });
    }
    for (const s of v.sails) {
      const bob = Math.sin(t * 3 + s.id) * 2 * inv;
      fx.poly([s.x, s.y - 10 * inv + bob, s.x + 7 * inv, s.y + 3 * inv + bob, s.x - 7 * inv, s.y + 3 * inv + bob]).fill({ color: 0xe2c787 });
    }
    for (const l of v.lands) fx.circle(l.x, l.y, 9 * inv).stroke({ width: 1.6 * inv, color: 0xd6b26a, alpha: 0.9 });
  }

  render(w: ViewWorld, f: ViewFrame) {
    this.frameNo++;
    const { t, elev } = f;
    const cam = w.camera;
    const zoom = cam.zoom;
    const inv = 1 / zoom;
    const R = f.planetR;
    const W = this.W;
    const H = this.H;

    // which bands are showing, and how much of each
    const globeA = 1 - smooth(GLOBE_FACE, GLOBE_GONE, zoom); // the globe over the map
    const spinK = 1 - smooth(GLOBE_SPIN, GLOBE_FACE, zoom); // the spin it carries
    const flat = globeA < 1; // the flat scene shows at all
    const figures = zoom >= f.figureZoom;
    const townA = smooth(0.62, f.figureZoom, zoom); // sprite towns emerge from the map
    const streetA = smooth(f.streetZoom - 0.9, f.streetZoom + 0.2, zoom); // paving and gardens close in

    for (const c of this.stage.children) c.visible = c !== this.composite;
    this.world.visible = this.dark.visible = this.lightWorld.visible = flat;
    this.globe.container.visible = globeA > 0;
    this.globe.setTerrain(f.terrain);
    if (globeA > 0) this.globe.render(w, { W, H, R, t, alpha: globeA, spinK, acting: f.acting });

    const nightK = clamp((-elev - 0.05) / 0.4, 0, 1);
    const dayK = clamp(elev * 2 + 0.25, 0, 1);
    const festival = w.festival > 0;
    const portrait = zoom >= f.portraitZoom;
    const halfW = W / 2 / zoom + 60;
    const halfH = H / 2 / zoom + 60;
    const onScreen = (x: number, y: number, pad = 0) => Math.abs(x - cam.cx) < halfW + pad && Math.abs(y - cam.cy) < halfH + pad;
    const toScreen = (x: number, y: number) => ({ x: W / 2 + (x - cam.cx) * zoom, y: H / 2 + (y - cam.cy) * zoom });
    this.stars.alpha = clamp(-elev + 0.15, 0, 1) * 0.5 + (1 - townA) * 0.15;

    // souls advance their own clock whichever band shows, as draw() does
    for (const s of w.souls) s.pulse += 0.03;
    this.labels.removeChildren();
    this.fx.clear();
    this.threads.clear();
    this.plate.clear();
    this.caption.visible = false;
    for (const c of this.crowns) c.visible = false;

    if (flat) {
      this.renderFlat(w, f, { zoom, inv, R, W, H, nightK, dayK, festival, portrait, figures, townA, streetA, onScreen, toScreen });
      if (f.voyages) this.drawVoyages(f.voyages, inv, t);
    } else for (const [, v] of this.souls) v.body.visible = v.shadow.visible = v.aura.visible = v.lantern.visible = v.flame.visible = false;

    // the light of day, multiplied over the flat scene (the globe lights itself)
    const d = f.daylight;
    this.dark.tint = hex([d[0] | 0, d[1] | 0, d[2] | 0]);
    this.vignette.alpha = elev < -0.2 ? clamp(-elev - 0.2, 0, 0.8) * 0.62 * (flat ? 1 - globeA : 0) : 0;

    // the red flash of a calamity (and its countdown, as draw() keeps it)
    this.flash.clear();
    if (w.flash > 0) {
      this.flash.rect(0, 0, W, H).fill({ color: 0xb8473f, alpha: (w.flash / 60) * 0.6 });
      w.flash--;
    }

    // the play-out caption, on a plate above the soul
    const po = w.playout;
    const pSoul = po ? w.souls.find((x) => x.id === po.soulId) : undefined;
    if (po && pSoul) {
      const sp = globeA >= 1 ? this.globe.project(pSoul.x, pSoul.y) : toScreen(pSoul.x, pSoul.y);
      const y = clamp(sp.y - 60, 40, H - 120);
      this.caption.text = po.text;
      const boxW = 340 + 32;
      const boxH = this.caption.height + 24;
      const bx = clamp(sp.x - boxW / 2, 8, W - boxW - 8);
      this.plate.rect(bx, y, boxW, boxH).fill({ color: 0x100e0a, alpha: 0.86 });
      this.plate.rect(bx, y, 3, boxH).fill({ color: po.good ? 0xd6b26a : 0xcf7b74 });
      this.caption.position.set(bx + boxW / 2 + 1.5, y + 12);
      this.caption.visible = true;
    }

    this.app.render();
  }

  private renderFlat(
    w: ViewWorld,
    f: ViewFrame,
    o: {
      zoom: number;
      inv: number;
      R: number;
      W: number;
      H: number;
      nightK: number;
      dayK: number;
      festival: boolean;
      portrait: boolean;
      figures: boolean;
      townA: number;
      streetA: number;
      onScreen: (x: number, y: number, pad?: number) => boolean;
      toScreen: (x: number, y: number) => { x: number; y: number };
    }
  ) {
    const P = this.P;
    const { zoom, inv, R, nightK, dayK, festival, portrait, figures, townA, streetA, onScreen, toScreen } = o;
    const { t, elev } = f;
    const cam = w.camera;
    this.layout(w, f);

    // the camera
    for (const c of [this.world, this.lightWorld]) {
      c.scale.set(zoom);
      c.position.set(o.W / 2 - cam.cx * zoom, o.H / 2 - cam.cy * zoom);
    }

    // TERRAIN (map, town, street): the ocean disc, the terrain raster in
    // terrainLayer, then the planet's mood over it. Fog goes in fogWorld.
    if (!this.oceanDrawn) {
      this.oceanDrawn = true;
      this.ocean.circle(0, 0, R + 26).fill({ color: 0x5a7896, alpha: 0.1 });
      this.ocean.circle(0, 0, R).fill({ color: 0x14202e });
    }
    if (f.terrain && f.terrain !== this.terrainSrc) {
      this.terrain?.destroy({ texture: true, textureSource: true });
      this.terrainSrc = f.terrain;
      this.terrain = new P.Sprite(P.Texture.from(f.terrain));
      this.terrain.position.set(-R, -R);
      this.terrain.width = 2 * R;
      this.terrain.height = 2 * R;
      this.terrainLayer.addChild(this.terrain);
    }
    const h = w.harmony;
    this.tint.clear();
    if (w.fortune) this.tint.circle(0, 0, R).fill({ color: hex(w.fortune.tint), alpha: 0.16 });
    else if (h > 0.5) this.tint.circle(0, 0, R).fill({ color: 0xd6b26a, alpha: (h - 0.5) * 0.28 });
    else this.tint.circle(0, 0, R).fill({ color: 0x5a506e, alpha: (0.5 - h) * 0.3 });

    // the towns emerge as the map gives way to them; paving shows close in
    this.ground.alpha = townA;
    this.objects.alpha = townA;
    this.shadows.position.set((w.tod - 0.5) * 2 * 9, 3 + (1 - clamp(elev, 0, 1)) * 4);
    this.shadows.alpha = (0.42 * dayK + 0.12 * (1 - dayK)) * townA;
    const townsOn = townA > 0.01;
    for (const v of this.towns) {
      const near = townsOn && onScreen(v.x, v.y, v.r * 1.6);
      v.street.visible = near && streetA > 0.01;
      v.street.alpha = streetA;
      for (const g of v.ground) g.visible = near;
      for (const p of v.props) {
        const vis = near && onScreen(p.x, p.y, 60);
        p.sprite.visible = vis;
        if (p.shadow) p.shadow.visible = vis;
        if (p.glow && p.core) {
          const lit = p.fire ? Math.max(nightK, festival ? 1 : 0) : nightK * (0.5 + 0.5 * Math.sin(p.x * 0.37 + p.y));
          const flick = 0.85 + Math.sin(t * (p.fire ? 9 : 3) + p.x) * 0.15;
          p.glow.visible = p.core.visible = vis && lit > 0.02;
          if (p.fire) p.sprite.visible = vis && lit > 0.05;
          p.glow.alpha = lit * (p.fire ? 0.95 : 0.55) * flick * townA;
          p.core.alpha = lit * flick * townA;
        }
      }
    }

    // institutions, in the row the hover tooltips expect
    const spacing = zoom >= f.buildingZoom ? 42 : 26;
    let n = 0;
    w.settlements.forEach((st, si) => {
      const inst = w.builtInst[si] ?? [];
      inst.forEach((type, k) => {
        const bx = st.x + (k - (inst.length - 1) / 2) * spacing;
        const by = st.y - st.r * 0.55 + 10;
        let it = this.inst[n];
        if (!it) {
          it = { sprite: this.sprite(INST_FRAME.school, 0.5, 0.8), shadow: this.shadowFor(0, 0, 40) };
          this.objects.addChild(it.sprite);
          this.inst[n] = it;
        }
        it.sprite.texture = this.tex[INST_FRAME[type] ?? INST_FRAME.school];
        it.sprite.scale.set(zoom >= f.buildingZoom ? 0.44 : 0.28);
        it.sprite.position.set(bx, by);
        it.sprite.zIndex = by;
        it.sprite.visible = it.shadow.visible = townsOn && onScreen(bx, by, 40);
        it.shadow.position.set(bx, by - 2);
        it.shadow.width = zoom >= f.buildingZoom ? 46 : 30;
        it.shadow.height = it.shadow.width * 0.5;
        n++;
      });
    });
    for (let k = n; k < this.inst.length; k++) this.inst[k].sprite.visible = this.inst[k].shadow.visible = false;

    // the map's own marks for a town, fading as the town itself appears
    const fx = this.fx;
    const markA = 1 - townA;
    if (markA > 0.01) {
      w.settlements.forEach((st, si) => {
        fx.circle(st.x, st.y, 5 * inv).fill({ color: 0xe3c77a, alpha: markA });
        (w.builtInst[si] ?? []).forEach((_, k) => fx.circle(st.x + (k + 1) * 7 * inv, st.y, 2.5 * inv).fill({ color: 0xd6b26a, alpha: markA }));
        if (zoom > 0.34 && onScreen(st.x, st.y)) {
          let txt = this.townNames[si];
          if (!txt) {
            txt = new P.Text({ text: st.name, style: { fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fill: 0xe4e5dc } });
            txt.anchor.set(0.5, 1);
            this.townNames[si] = txt;
          }
          if (txt.text !== st.name) txt.text = st.name;
          const sp = toScreen(st.x, st.y);
          txt.position.set(sp.x, sp.y - 12);
          txt.alpha = 0.8 * markA;
          this.labels.addChild(txt);
        }
      });
    }

    // souls: figures from FIGURE_ZOOM, points of light below it
    const frame = this.frameNo;
    for (const s of w.souls) {
      const v = this.soulView(s);
      v.seen = frame;
      const vis = onScreen(s.x, s.y, 30);
      const dom = dominantVirtue(s.v);
      const col = dom.color;
      const bright = 0.4 + s.eud * 0.6;
      if (!figures) {
        v.body.visible = v.shadow.visible = v.lantern.visible = v.flame.visible = false;
        v.aura.visible = vis;
        v.aura.position.set(s.x, s.y);
        v.aura.tint = hex(col);
        v.aura.alpha = bright * 0.5;
        v.aura.width = v.aura.height = 26 * inv;
        if (vis) {
          const lit = [Math.min(255, col[0] + 50), Math.min(255, col[1] + 48), Math.min(255, col[2] + 48)];
          fx.circle(s.x, s.y, (1.8 + s.eud * 2.2) * inv).fill({ color: hex(lit), alpha: bright });
          if (s.awake) fx.circle(s.x, s.y, 6 * inv).stroke({ width: 1.2 * inv, color: 0xf0e8d6, alpha: 0.85 });
          if (w.selected === s.id) fx.circle(s.x, s.y, (9 + Math.sin(t * 2) * 1.5) * inv).stroke({ width: 1.6 * inv, color: 0xf0e8d6 });
          if (f.acting && s.eud < 0.33) {
            const p = 0.5 + 0.5 * Math.sin(t * 3 + s.pulse);
            fx.circle(s.x, s.y, (10 + p * 4) * inv).stroke({ width: 1.4 * inv, color: 0xd3706a, alpha: 0.5 + p * 0.5 });
          }
        }
        continue;
      }
      const kind = s.awake ? "sage" : dom.key;
      if (kind !== v.kind) {
        v.kind = kind;
        v.body.texture = s.awake ? this.tex[SAGE_FRAME] : this.tunic[dom.key];
      }
      const bob = s.act === 2 ? Math.sin(s.pulse * 2) * 1.1 : s.act === 0 ? Math.abs(Math.sin(s.pulse * 6)) * -0.8 : 0;
      v.body.position.set(s.x, s.y + 4 + bob);
      v.body.scale.set(0.42, s.act === 1 ? 0.38 : 0.42);
      v.body.zIndex = s.y + 4;
      v.body.visible = v.shadow.visible = vis;
      v.shadow.position.set(s.x, s.y + 6);
      v.aura.visible = vis;
      v.aura.position.set(s.x, s.y - 6);
      v.aura.tint = hex(col);
      v.aura.alpha = Math.min(1, bright * (0.22 + 0.25 * nightK) + (s.awake ? 0.25 : 0));
      v.aura.width = v.aura.height = s.awake ? 58 + Math.sin(t * 1.5 + s.pulse) * 4 : 44;
      // a lantern for those still abroad after dark
      const lantern = vis && elev < -0.18 && !festival && s.act === 0;
      v.lantern.visible = v.flame.visible = lantern;
      if (lantern) {
        const flick = 0.85 + Math.sin(t * 6 + s.pulse) * 0.15;
        v.lantern.position.set(s.x + 6, s.y - 2);
        v.lantern.alpha = 0.8 * flick;
        v.flame.position.set(s.x + 6, s.y - 2);
        v.flame.alpha = flick;
      }
      if (!vis) continue;
      const cy = s.y - 6;
      if (s.awake) fx.circle(s.x, cy, 15).stroke({ width: 1.2 * inv, color: 0xf0e8d6, alpha: 0.85 });
      if (f.acting && s.eud < 0.33) {
        const p = 0.5 + 0.5 * Math.sin(t * 3 + s.pulse);
        fx.circle(s.x, cy, 10 + p * 4).stroke({ width: 1.4 * inv, color: 0xd3706a, alpha: 0.5 + p * 0.5 });
      }
      if (w.selected === s.id) {
        if (f.acting && w.dials.contagion > 0) {
          const cr = f.reach(s);
          const segs = Math.max(24, Math.round(cr / 6));
          for (let i = 0; i < segs; i += 2) {
            const a0 = (i / segs) * Math.PI * 2;
            const a1 = ((i + 1) / segs) * Math.PI * 2;
            fx.moveTo(s.x + Math.cos(a0) * cr, cy + Math.sin(a0) * cr).arc(s.x, cy, cr, a0, a1);
          }
          fx.stroke({ width: 1.2 * inv, color: 0xe3c77a, alpha: 0.4 });
        }
        fx.circle(s.x, cy, 17 + Math.sin(t * 2) * 1.5 * inv).stroke({ width: 1.6 * inv, color: 0xf0e8d6 });
      }
    }
    // retire the views of souls that are gone
    for (const [id, v] of this.souls) {
      if (v.seen === frame) continue;
      v.body.destroy();
      v.shadow.destroy();
      v.aura.destroy();
      v.lantern.destroy();
      v.flame.destroy();
      this.souls.delete(id);
      this.names.get(id)?.destroy();
      this.names.delete(id);
    }

    // sympatheia and teaching: threads of light between souls, close in
    if (f.acting && zoom >= 1.1) {
      const souls = w.souls;
      const g = this.threads;
      for (let i = 0; i < souls.length; i++) {
        const s1 = souls[i];
        for (let j = i + 1; j < souls.length; j++) {
          const s2 = souls[j];
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 6000) {
            const strength = (1 - d2 / 6000) * Math.min(s1.eud, s2.eud);
            if (strength > 0.14) g.moveTo(s1.x, s1.y - 4).lineTo(s2.x, s2.y - 4).stroke({ width: inv * 1.2, color: 0xd4b26a, alpha: strength * 0.5 });
          }
        }
      }
      for (const a of souls) {
        if (!a.awake) continue;
        for (const o2 of souls) {
          if (o2 === a || o2.awake) continue;
          const dx = o2.x - a.x;
          const dy = o2.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 9000) g.moveTo(a.x, a.y - 8).lineTo(o2.x, o2.y - 4).stroke({ width: inv * 1.2, color: 0xe3c77a, alpha: (1 - d2 / 9000) * 0.5 });
        }
      }
    }

    // the threats
    const { sophist, tyrant, rival } = w.threats;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    if (sophist) {
      const segs = 64;
      for (let i = 0; i < segs; i += 2) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        fx.moveTo(sophist.x + Math.cos(a0) * SOPHIST_REACH, sophist.y + Math.sin(a0) * SOPHIST_REACH).arc(sophist.x, sophist.y, SOPHIST_REACH, a0, a1);
      }
      fx.stroke({ width: 2 * inv, color: 0x9660be, alpha: (0.35 + 0.35 * pulse) * Math.max(0.3, sophist.strength) });
      fx.circle(sophist.x, sophist.y, 6 * inv).fill({ color: 0x9660be, alpha: 0.9 });
    }
    const seat = tyrant ? w.settlements[tyrant.home] : null;
    if (tyrant?.seized && seat) fx.circle(seat.x, seat.y, seat.r * 1.1).stroke({ width: 3 * inv, color: 0xb8473f, alpha: 0.3 + 0.3 * pulse });
    if (rival) {
      let hh = 0;
      for (let i = 0; i < rival.name.length; i++) hh = (hh * 31 + rival.name.charCodeAt(i)) | 0;
      const a = ((hh >>> 0) % 628) / 100;
      const rx = Math.cos(a) * R * 0.97;
      const ry = Math.sin(a) * R * 0.97;
      const sz = 14 * inv;
      fx.moveTo(rx, ry + sz).lineTo(rx, ry - sz * 1.6).stroke({ width: 2 * inv, color: 0xe4e5dc, alpha: 0.8 });
      fx.poly([rx, ry - sz * 1.6, rx + sz * 1.6, ry - sz * 1.1, rx, ry - sz * 0.6]).fill({ color: 0xb8473f, alpha: 0.55 + 0.4 * rival.menace });
    }

    // a decision playing out: a ring and a bloom of light (or shadow)
    const po = w.playout;
    const pSoul = po ? w.souls.find((x) => x.id === po.soulId) : undefined;
    if (po && pSoul) {
      const p = 1 - po.life / 240;
      const col = po.good ? 0xd4b26a : 0xb8473f;
      fx.circle(pSoul.x, pSoul.y - 6, 8 + p * 48).stroke({ width: 2 * inv, color: col, alpha: 0.7 * (1 - p) });
      const burst = this.souls.get(pSoul.id)?.aura;
      if (burst) {
        burst.tint = col;
        burst.alpha = Math.max(burst.alpha, (po.good ? 0.95 : 0.7) * (1 - p));
        burst.width = burst.height = 70 + p * 60;
      }
    }

    // names: screen-constant, read after the dark so they stay legible
    for (const s of w.souls) {
      const sel = w.selected === s.id;
      if (!(portrait || (sel && zoom >= 1.4))) continue;
      if (!onScreen(s.x, s.y)) continue;
      let txt = this.names.get(s.id);
      if (!txt) {
        txt = new P.Text({ text: s.name, style: { fontFamily: "Newsreader, Georgia, serif", fontSize: 13, fill: 0xe4e5dc } });
        txt.anchor.set(0.5, 1);
        this.names.set(s.id, txt);
      }
      const sp = toScreen(s.x, s.y - (portrait ? 20 : 24));
      txt.position.set(sp.x, sp.y);
      if (txt.style.fontSize !== (sel ? 15 : 13)) txt.style.fontSize = sel ? 15 : 13;
      txt.alpha = sel ? 1 : 0.75;
      this.labels.addChild(txt);
    }
    if (tyrant && seat) {
      let crown = this.crowns[0];
      if (!crown) {
        crown = new P.Text({ text: "♛", style: { fontFamily: "Georgia, serif", fontSize: 22, fill: 0xec7062, stroke: { color: 0x101214, width: 2 } } });
        crown.anchor.set(0.5, 1);
        this.crowns[0] = crown;
      }
      const cy = seat.y - seat.r * 0.55 - (zoom >= f.buildingZoom ? 36 : figures ? 16 : 0);
      const sp = toScreen(seat.x, cy);
      crown.position.set(sp.x, sp.y - 14);
      if (crown.style.fontSize !== (tyrant.seized ? 30 : 22)) crown.style.fontSize = tyrant.seized ? 30 : 22;
      crown.alpha = tyrant.seized ? 1 : 0.55 + 0.45 * tyrant.grip;
      crown.visible = true;
      this.labels.addChild(crown);
    }
  }
}

/**
 * Own a WorldRenderer for a canvas: created the first time the preview is
 * switched on, kept until unmount. Returns a ref that holds it once ready
 * (null before, or if WebGL is unavailable).
 */
export function useWorldRenderer(canvasRef: RefObject<HTMLCanvasElement | null>, enabled: boolean, width: number, height: number, onFail: () => void) {
  const ref = useRef<WorldRenderer | null>(null);
  const starting = useRef(false);
  useEffect(() => {
    if (!enabled || ref.current || starting.current || !canvasRef.current) return;
    starting.current = true;
    WorldRenderer.create(canvasRef.current, width, height)
      .then((r) => {
        ref.current = r;
      })
      .catch((e) => {
        console.warn("Kosmopolis preview renderer failed to start", e);
        onFail();
      })
      .finally(() => {
        starting.current = false;
      });
  }, [enabled, canvasRef, width, height, onFail]);
  useEffect(
    () => () => {
      ref.current?.destroy();
      ref.current = null;
    },
    []
  );
  return ref;
}
