"use client";

/**
 * Kosmopolis, the town view, drawn with PixiJS (WebGL). A preview renderer.
 *
 * The default renderer (draw() in KosmopolisWorld.tsx) paints the world with
 * Canvas 2D primitives. This one paints the same World, for the town zoom band
 * only (FIGURE_ZOOM up to STREET_ZOOM), with sprite art: Kenney's "RTS Pack:
 * Medieval" (CC0, see public/playground/kosmopolis/kenney-medieval-rts/License.txt),
 * regraded at load toward the playground's archival palette, with GPU lighting
 * laid over it: a daylight multiply, additive lantern, window and aura light, a
 * blurred light layer for bloom, and soft sun shadows.
 *
 * It reads the World and changes nothing in the simulation. The two visual
 * counters draw() advances each frame (a soul's pulse, the red flash) are
 * advanced here too, so the look of things stays the same when the views swap.
 *
 * pixi.js is imported dynamically, so it costs nothing until the preview is
 * switched on.
 */

import { useEffect, useRef, type RefObject } from "react";
import type * as PIXI from "pixi.js";
import { VIRTUES, dominantVirtue, type VirtueKey } from "@/content/playground/kosmopolis";
import { SOPHIST_REACH } from "@/content/playground/kosmopolis-polis";
import { ATLAS, ATLAS_SIZE } from "./kosmopolis-pixi-atlas";

type Pixi = typeof import("pixi.js");
type RGBt = readonly number[];

/* ------------------------------------------------ what the renderer reads */

// Structural views of the World: only the fields this renderer reads.
export type TownSoul = {
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
export type TownSettlement = { x: number; y: number; r: number; name: string };
export type TownWorld = {
  seed: number;
  souls: TownSoul[];
  settlements: readonly TownSettlement[];
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
// What the host computes for the frame from its own helpers.
export type TownFrame = {
  t: number;
  elev: number; // sun elevation, -1 midnight to +1 noon
  daylight: RGBt; // the colour daylight multiplies the scene by
  acting: boolean; // the epoch in which deeds happen
  planetR: number;
  terrain: HTMLCanvasElement | null;
  buildingZoom: number;
  portraitZoom: number;
  market: (st: TownSettlement) => { x: number; y: number };
  reach: (s: TownSoul) => number; // the radius of a soul's circle of concern
};

/* ------------------------------------------------------------- the art */

const SHEET_URL = "/playground/kosmopolis/kenney-medieval-rts/sheet.png";

// Frames whose green roofs are repainted at load: terracotta, or a browner ochre.
const ROOF_TERRACOTTA = ["structure_10", "structure_18", "structure_20", "structure_22", "structure_23"];
const ROOF_OCHRE = ["structure_17"];
const DWELLINGS = ["structure_11", "structure_01", "structure_10", "structure_17", "structure_18", "structure_11", "structure_20"];
const TREES = ["environment_01", "environment_02", "environment_21", "environment_01", "environment_03"];
const BUSHES = ["environment_12", "environment_19", "environment_06", "environment_13"];
const INST_FRAME: Record<string, string> = { school: "structure_23", court: "structure_05", granary: "structure_19" };
const SOUL_FRAME = "unit_18"; // a plain grey tunic, recoloured per virtue
const SAGE_FRAME = "unit_23"; // a white robe, for the awakened

type Frames = Record<string, { frame: { x: number; y: number; w: number; h: number } }>;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [r1 + m, g1 + m, b1 + m];
}

// The archival grade: pull saturation down, warm the whole toward parchment,
// and repaint the green roofs of the frames that are buildings.
function gradeSheet(img: HTMLImageElement, frames: Frames): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const roofs: { x: number; y: number; w: number; h: number; hue: number }[] = [];
  for (const k of ROOF_TERRACOTTA) if (frames[k]) roofs.push({ ...frames[k].frame, hue: 12 });
  for (const k of ROOF_OCHRE) if (frames[k]) roofs.push({ ...frames[k].frame, hue: 30 });
  for (const f of roofs) {
    const id = ctx.getImageData(f.x, f.y, f.w, f.h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const [h, s, l] = rgbToHsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      if (h > 80 && h < 175 && s > 0.2) {
        const [r, g, b] = hslToRgb(f.hue, s * 0.7, Math.min(0.78, l * 1.3));
        d[i] = r * 255;
        d[i + 1] = g * 255;
        d[i + 2] = b * 255;
      }
    }
    ctx.putImageData(id, f.x, f.y);
  }
  const all = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = all.data;
  const sat = 0.56;
  const lr = 0.3086 * (1 - sat);
  const lg = 0.6094 * (1 - sat);
  const lb = 0.082 * (1 - sat);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const nr = (lr + sat) * r + lg * g + lb * b;
    const ng = lr * r + (lg + sat) * g + lb * b;
    const nb = lr * r + lg * g + (lb + sat) * b;
    // warm toward parchment and soften the whites a touch
    d[i] = Math.min(255, nr * 1.02 + 6);
    d[i + 1] = Math.min(255, ng * 0.97 + 4);
    d[i + 2] = Math.min(255, nb * 0.86 + 2);
  }
  ctx.putImageData(all, 0, 0);
  return cv;
}

// A soul's tunic in the colour of its strongest virtue: the grey cloth of the
// plain figure is replaced, the skin and outline kept.
function tunicVariant(sheet: HTMLCanvasElement, f: { x: number; y: number; w: number; h: number }, col: RGBt): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = f.w;
  cv.height = f.h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(sheet, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const id = ctx.getImageData(0, 0, f.w, f.h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [, s, l] = rgbToHsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    if (s < 0.16 && l > 0.3 && l < 0.9) {
      const k = l / 0.62;
      d[i] = Math.min(255, (col[0] + 24) * k);
      d[i + 1] = Math.min(255, (col[1] + 22) * k);
      d[i + 2] = Math.min(255, (col[2] + 22) * k);
    }
  }
  ctx.putImageData(id, 0, 0);
  return cv;
}

function radialCanvas(size: number, stops: [number, string][], squashY = 1): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = Math.max(2, Math.round(size * squashY));
  const ctx = cv.getContext("2d")!;
  ctx.scale(1, squashY);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

// The packed earth of a town: the pack's sand tile laid edge to edge, faded out
// at the rim so the town sits in its land rather than on a coaster.
function plazaCanvas(sheet: HTMLCanvasElement, f: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
  const size = 512;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  for (let y = 0; y < size; y += 128) for (let x = 0; x < size; x += 128) ctx.drawImage(sheet, f.x + 2, f.y + 2, f.w - 4, f.h - 4, x, y, 128, 128);
  // a little worn unevenness so the tiling does not read
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() < 0.5;
    g.addColorStop(0, dark ? "rgba(90,70,44,0.10)" : "rgba(255,244,214,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "destination-in";
  const m = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
  m.addColorStop(0, "rgba(0,0,0,0.92)");
  m.addColorStop(0.7, "rgba(0,0,0,0.6)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (c: RGBt) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/* ---------------------------------------------------------- the renderer */

type Prop = { sprite: PIXI.Sprite; shadow: PIXI.Sprite | null; x: number; y: number; glow?: PIXI.Sprite; core?: PIXI.Sprite; fire: boolean };
type SoulView = { body: PIXI.Sprite; shadow: PIXI.Sprite; aura: PIXI.Sprite; lantern: PIXI.Sprite; flame: PIXI.Sprite; kind: string; seen: number };

export class TownRenderer {
  private P: Pixi;
  private app: PIXI.Application;
  private tex: Record<string, PIXI.Texture> = {};
  private tunic: Record<string, PIXI.Texture> = {};
  private W: number;
  private H: number;

  private stage!: PIXI.Container;
  private world!: PIXI.Container; // camera-transformed scene
  private stars!: PIXI.Graphics;
  private ocean!: PIXI.Graphics;
  private terrain: PIXI.Sprite | null = null;
  private terrainSrc: HTMLCanvasElement | null = null;
  private tint!: PIXI.Graphics;
  private ground!: PIXI.Container; // plazas and roads
  private shadows!: PIXI.Container;
  private objects!: PIXI.Container; // y-sorted sprites
  private fx!: PIXI.Graphics; // rings and markers, world space
  private dark!: PIXI.Sprite; // the daylight multiply
  private lightWorld!: PIXI.Container; // camera-transformed light
  private glow!: PIXI.Container; // additive, blurred: the bloom
  private cores!: PIXI.Container; // additive, crisp
  private threads!: PIXI.Graphics;
  private screen!: PIXI.Container;
  private labels!: PIXI.Container;
  private vignette!: PIXI.Sprite;
  private flash!: PIXI.Graphics;
  private plate!: PIXI.Graphics;
  private caption!: PIXI.Text;

  private layoutKey = "";
  private props: Prop[] = [];
  private inst: { sprite: PIXI.Sprite; shadow: PIXI.Sprite }[] = [];
  private souls = new Map<number, SoulView>();
  private names = new Map<number, PIXI.Text>();
  private crowns: PIXI.Text[] = [];
  private frameNo = 0;
  private visible = false;
  private oceanDrawn = false;

  static async create(canvas: HTMLCanvasElement, width: number, height: number): Promise<TownRenderer> {
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
    return new TownRenderer(P, app, sheet, graded, frames, width, height);
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
    this.tex.vignette = P.Texture.from(
      radialCanvas(256, [[0, "rgba(6,10,26,0)"], [0.55, "rgba(6,10,26,0)"], [1, "rgba(6,10,26,1)"]])
    );
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
    this.tint = new P.Graphics();
    this.ground = new P.Container();
    this.shadows = new P.Container();
    this.objects = new P.Container();
    this.objects.sortableChildren = true;
    this.fx = new P.Graphics();
    this.world.addChild(this.ocean, this.tint, this.ground, this.shadows, this.objects, this.fx);
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
    this.app.destroy({ removeView: false }, { children: true, texture: true, textureSource: true });
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

  // Lay out the towns once per world: dwellings, trees, the market's stalls and
  // fire. Deterministic from the world seed, so a town keeps its houses.
  private layout(w: TownWorld, f: TownFrame) {
    const key = `${f.terrain ? 1 : 0}:${w.seed}:${w.settlements.length}:${w.settlements.map((s) => `${s.x | 0},${s.y | 0}`).join(";")}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    for (const p of this.props) {
      p.sprite.destroy();
      p.shadow?.destroy();
      p.glow?.destroy();
      p.core?.destroy();
    }
    this.props = [];
    this.ground.removeChildren().forEach((c) => {
      const own = c instanceof this.P.Sprite && c.texture !== this.tex.plaza;
      c.destroy(own ? { texture: true, textureSource: true } : undefined);
    });
    const P = this.P;
    // nothing is built or planted in the sea: read the terrain raster once
    const tc = f.terrain;
    const td = tc?.getContext("2d")?.getImageData(0, 0, tc.width, tc.height).data;
    const R = f.planetR;
    const wet = (x: number, y: number) => {
      if (!tc || !td) return false;
      const px = Math.floor(((x + R) / (2 * R)) * tc.width);
      const py = Math.floor(((y + R) / (2 * R)) * tc.height);
      if (px < 0 || py < 0 || px >= tc.width || py >= tc.height) return true;
      const i = (py * tc.width + px) * 4;
      return td[i + 2] > td[i] + 6;
    };
    let landMask: HTMLCanvasElement | null = null;
    if (tc && td) {
      landMask = document.createElement("canvas");
      landMask.width = tc.width;
      landMask.height = tc.height;
      const mctx = landMask.getContext("2d")!;
      const md = mctx.createImageData(tc.width, tc.height);
      for (let i = 0; i < td.length; i += 4) md.data[i + 3] = td[i + 2] > td[i] + 6 ? 0 : 255;
      mctx.putImageData(md, 0, 0);
    }

    w.settlements.forEach((st, si) => {
      const rnd = prng((w.seed ^ (si * 2654435761)) >>> 0);
      const m = f.market(st);
      const rowY = st.y - st.r * 0.55;

      const pw = st.r * 2.2;
      const ph = st.r * 2.0;
      const plaza = new P.Sprite(landMask ? P.Texture.from(this.clipToLand(landMask, st.x - pw / 2, st.y + st.r * 0.05 - ph / 2, pw, ph, R)) : this.tex.plaza);
      plaza.anchor.set(0.5);
      plaza.position.set(st.x, st.y + st.r * 0.05);
      plaza.width = pw;
      plaza.height = ph;
      plaza.alpha = 0.55;
      plaza.tint = 0xcbb894;
      this.ground.addChild(plaza);

      const roads = new P.Graphics();
      const road = (x0: number, y0: number, x1: number, y1: number, wd: number) => {
        // a road stops at the shore
        for (let k = 0; k < 10 && wet(x1, y1); k++) {
          x1 = x0 + (x1 - x0) * 0.85;
          y1 = y0 + (y1 - y0) * 0.85;
        }
        if (Math.hypot(x1 - x0, y1 - y0) < 20) return;
        const mx = (x0 + x1) / 2 + (rnd() - 0.5) * 26;
        const my = (y0 + y1) / 2 + (rnd() - 0.5) * 26;
        roads.moveTo(x0, y0).quadraticCurveTo(mx, my, x1, y1).stroke({ width: wd + 5, color: 0x6e5a3c, alpha: 0.18, cap: "round" });
        roads.moveTo(x0, y0).quadraticCurveTo(mx, my, x1, y1).stroke({ width: wd, color: 0xd9c49a, alpha: 0.55, cap: "round" });
      };
      road(st.x, rowY + 14, m.x, m.y, 12);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + rnd() * 0.6;
        road(m.x, m.y, st.x + Math.cos(a) * st.r * 1.15, st.y + Math.sin(a) * st.r * 1.0, 8);
      }
      this.ground.addChild(roads);

      const taken: { x: number; y: number; r: number }[] = [
        { x: m.x, y: m.y, r: 40 },
        { x: st.x, y: rowY, r: 70 },
      ];
      const free = (x: number, y: number, r: number) => !wet(x, y) && taken.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 > (t.r + r) ** 2);
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
        this.props.push(p);
        taken.push({ x, y, r: radius });
      };

      // the market: two stalls, the statue, and a fire that is lit at dusk
      place("structure_22", m.x - 26, m.y - 4, 0.36, 14, 26);
      place("structure_22", m.x + 28, m.y + 6, 0.36, 14, 26);
      place("structure_12", m.x, m.y - 22, 0.36, 10, 16);
      place("environment_20", m.x + 2, m.y + 22, 0.28, 8, 0, 120);

      // dwellings, set around the centre where the townsfolk sleep
      const nHouse = 9 + Math.round((st.r - 120) / 9);
      for (let k = 0, tries = 0; k < nHouse && tries < 400; tries++) {
        const a = rnd() * Math.PI * 2;
        const rr = st.r * (0.28 + rnd() * 0.72);
        const x = st.x + Math.cos(a) * rr;
        const y = st.y + Math.sin(a) * rr * 0.92;
        if (!free(x, y, 20)) continue;
        place(DWELLINGS[(rnd() * DWELLINGS.length) | 0], x, y, 0.34 + rnd() * 0.06, 20, 40, 64);
        k++;
      }
      // cypresses and scrub round the edge
      for (let k = 0, tries = 0; k < 18 && tries < 300; tries++) {
        const a = rnd() * Math.PI * 2;
        const rr = st.r * (0.9 + rnd() * 0.5);
        const x = st.x + Math.cos(a) * rr;
        const y = st.y + Math.sin(a) * rr;
        if (!free(x, y, 8)) continue;
        if (rnd() < 0.72) place(TREES[(rnd() * TREES.length) | 0], x, y, 0.3 + rnd() * 0.14, 8, 22);
        else place(BUSHES[(rnd() * BUSHES.length) | 0], x, y, 0.3 + rnd() * 0.1, 7, 16);
        this.props[this.props.length - 1].sprite.tint = 0xd9d2b8; // a dustier green
        k++;
      }
    });
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

  private soulView(s: TownSoul): SoulView {
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

  render(w: TownWorld, f: TownFrame) {
    this.frameNo++;
    this.layout(w, f);
    const P = this.P;
    const { t, elev } = f;
    const cam = w.camera;
    const zoom = cam.zoom;
    const inv = 1 / zoom;
    const R = f.planetR;
    const W = this.W;
    const H = this.H;
    const nightK = clamp((-elev - 0.05) / 0.4, 0, 1);
    const dayK = clamp(elev * 2 + 0.25, 0, 1);
    const festival = w.festival > 0;
    const portrait = zoom >= f.portraitZoom;
    const halfW = W / 2 / zoom + 60;
    const halfH = H / 2 / zoom + 60;
    const onScreen = (x: number, y: number, pad = 0) => Math.abs(x - cam.cx) < halfW + pad && Math.abs(y - cam.cy) < halfH + pad;
    const toScreen = (x: number, y: number) => ({ x: W / 2 + (x - cam.cx) * zoom, y: H / 2 + (y - cam.cy) * zoom });

    // the camera
    for (const c of [this.world, this.lightWorld]) {
      c.scale.set(zoom);
      c.position.set(W / 2 - cam.cx * zoom, H / 2 - cam.cy * zoom);
    }
    this.stars.alpha = clamp(-elev + 0.15, 0, 1) * 0.5;

    // the land: ocean, the terrain raster, and the planet's mood over it
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
      this.world.addChildAt(this.terrain, 1);
    }
    const h = w.harmony;
    this.tint.clear();
    if (w.fortune) this.tint.circle(0, 0, R).fill({ color: hex(w.fortune.tint), alpha: 0.16 });
    else if (h > 0.5) this.tint.circle(0, 0, R).fill({ color: 0xd6b26a, alpha: (h - 0.5) * 0.28 });
    else this.tint.circle(0, 0, R).fill({ color: 0x5a506e, alpha: (0.5 - h) * 0.3 });

    // the sun's shadows lean with the hour and fade with the light
    this.shadows.position.set((w.tod - 0.5) * 2 * 9, 3 + (1 - clamp(elev, 0, 1)) * 4);
    this.shadows.alpha = 0.42 * dayK + 0.12 * (1 - dayK);

    // props: cull to view, light the windows at night
    for (const p of this.props) {
      const vis = onScreen(p.x, p.y, 60);
      p.sprite.visible = vis;
      if (p.shadow) p.shadow.visible = vis;
      if (p.glow && p.core) {
        const fire = p.fire;
        const lit = fire ? Math.max(nightK, festival ? 1 : 0) : nightK * (0.5 + 0.5 * Math.sin(p.x * 0.37 + p.y));
        const flick = 0.85 + Math.sin(t * (fire ? 9 : 3) + p.x) * 0.15;
        p.glow.visible = p.core.visible = vis && lit > 0.02;
        if (fire) p.sprite.visible = vis && lit > 0.05;
        p.glow.alpha = lit * (fire ? 0.95 : 0.55) * flick;
        p.core.alpha = lit * flick;
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
        it.sprite.visible = it.shadow.visible = onScreen(bx, by, 40);
        it.shadow.position.set(bx, by - 2);
        it.shadow.width = zoom >= f.buildingZoom ? 46 : 30;
        it.shadow.height = it.shadow.width * 0.5;
        n++;
      });
    });
    for (let k = n; k < this.inst.length; k++) this.inst[k].sprite.visible = this.inst[k].shadow.visible = false;

    // souls
    const fx = this.fx;
    fx.clear();
    this.threads.clear();
    const frame = this.frameNo;
    for (const s of w.souls) {
      s.pulse += 0.03; // as draw() does: the soul's own clock, purely visual
      const v = this.soulView(s);
      v.seen = frame;
      const vis = onScreen(s.x, s.y, 30);
      const dom = dominantVirtue(s.v);
      const col = dom.color;
      const bright = 0.4 + s.eud * 0.6;
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
        for (const o of souls) {
          if (o === a || o.awake) continue;
          const dx = o.x - a.x;
          const dy = o.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 9000) g.moveTo(a.x, a.y - 8).lineTo(o.x, o.y - 4).stroke({ width: inv * 1.2, color: 0xe3c77a, alpha: (1 - d2 / 9000) * 0.5 });
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

    // the light of day, multiplied over everything but the lights themselves
    const d = f.daylight;
    this.dark.tint = hex([d[0] | 0, d[1] | 0, d[2] | 0]);
    this.vignette.alpha = elev < -0.2 ? clamp(-elev - 0.2, 0, 0.8) * 0.62 : 0;

    // names: screen-constant, read after the dark so they stay legible
    this.labels.removeChildren();
    for (const c of this.crowns) c.visible = false;
    for (const s of w.souls) {
      const sel = w.selected === s.id;
      if (!(portrait || (sel && zoom >= 1.4))) continue;
      if (!onScreen(s.x, s.y)) continue;
      let txt = this.names.get(s.id);
      if (!txt) {
        txt = new P.Text({ text: s.name, style: { fontFamily: "Newsreader, Georgia, serif", fontSize: 10, fill: 0xe4e5dc } });
        txt.anchor.set(0.5, 1);
        this.names.set(s.id, txt);
      }
      const sp = toScreen(s.x, s.y - (portrait ? 20 : 24));
      txt.position.set(sp.x, sp.y);
      if (txt.style.fontSize !== (sel ? 12 : 10)) txt.style.fontSize = sel ? 12 : 10;
      txt.alpha = sel ? 1 : 0.72;
      this.labels.addChild(txt);
    }
    if (tyrant && seat) {
      let crown = this.crowns[0];
      if (!crown) {
        crown = new P.Text({ text: "♛", style: { fontFamily: "Georgia, serif", fontSize: 22, fill: 0xec7062, stroke: { color: 0x101214, width: 2 } } });
        crown.anchor.set(0.5, 1);
        this.crowns[0] = crown;
      }
      const cy = seat.y - seat.r * 0.55 - (zoom >= f.buildingZoom ? 36 : 16);
      const sp = toScreen(seat.x, cy);
      crown.position.set(sp.x, sp.y - 14);
      if (crown.style.fontSize !== (tyrant.seized ? 30 : 22)) crown.style.fontSize = tyrant.seized ? 30 : 22;
      crown.alpha = tyrant.seized ? 1 : 0.55 + 0.45 * tyrant.grip;
      crown.visible = true;
      this.labels.addChild(crown);
    }

    // the red flash of a calamity (and its countdown, as draw() keeps it)
    this.flash.clear();
    if (w.flash > 0) {
      this.flash.rect(0, 0, W, H).fill({ color: 0xb8473f, alpha: (w.flash / 60) * 0.6 });
      w.flash--;
    }

    // the play-out caption, on a plate above the soul
    this.plate.clear();
    this.caption.visible = false;
    if (po && pSoul) {
      const sp = toScreen(pSoul.x, pSoul.y);
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
}

/**
 * Own a TownRenderer for a canvas: created the first time the preview is
 * switched on, kept until unmount. Returns a ref that holds it once ready
 * (null before, or if WebGL is unavailable).
 */
export function useTownRenderer(canvasRef: RefObject<HTMLCanvasElement | null>, enabled: boolean, width: number, height: number, onFail: () => void) {
  const ref = useRef<TownRenderer | null>(null);
  const starting = useRef(false);
  useEffect(() => {
    if (!enabled || ref.current || starting.current || !canvasRef.current) return;
    starting.current = true;
    TownRenderer.create(canvasRef.current, width, height)
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
