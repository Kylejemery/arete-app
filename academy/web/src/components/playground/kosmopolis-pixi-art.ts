"use client";

// The art of the preview renderer: the Kenney sheet's frames as the renderer
// uses them, the archival regrade, and the small canvases it draws once at load.

type RGBt = readonly number[];

/* ------------------------------------------------------------- the art */

export const SHEET_URL = "/playground/kosmopolis/kenney-medieval-rts/sheet.png";

// Frames whose green roofs are repainted at load: terracotta, or a browner ochre.
export const ROOF_TERRACOTTA = ["structure_10", "structure_18", "structure_20", "structure_22", "structure_23"];
export const ROOF_OCHRE = ["structure_17"];
export const DWELLINGS = ["structure_11", "structure_01", "structure_10", "structure_17", "structure_18", "structure_11", "structure_20"];
export const TREES = ["environment_01", "environment_02", "environment_21", "environment_01", "environment_03"];
export const BUSHES = ["environment_12", "environment_19", "environment_06", "environment_13"];
export const INST_FRAME: Record<string, string> = { school: "structure_23", court: "structure_05", granary: "structure_19" };
export const SOUL_FRAME = "unit_18"; // a plain grey tunic, recoloured per virtue
export const SAGE_FRAME = "unit_23"; // a white robe, for the awakened

export type Frames = Record<string, { frame: { x: number; y: number; w: number; h: number } }>;

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
export function gradeSheet(img: HTMLImageElement, frames: Frames): HTMLCanvasElement {
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
export function tunicVariant(sheet: HTMLCanvasElement, f: { x: number; y: number; w: number; h: number }, col: RGBt): HTMLCanvasElement {
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

export function radialCanvas(size: number, stops: [number, string][], squashY = 1): HTMLCanvasElement {
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
export function plazaCanvas(sheet: HTMLCanvasElement, f: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
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

export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hex = (c: RGBt) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// Cobbles for the streets close in: rounded setts in warm greys, tiling.
export function cobbleCanvas(): HTMLCanvasElement {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgb(112,100,84)";
  ctx.fillRect(0, 0, size, size);
  const rnd = prng(11);
  const row = 16;
  for (let y = 0, r = 0; y < size; y += row, r++) {
    for (let x = (r % 2) * 9 - 9; x < size; x += 18) {
      const l = 150 + rnd() * 40;
      ctx.fillStyle = `rgb(${l | 0},${(l - 10) | 0},${(l - 26) | 0})`;
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, 15, row - 3, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,248,230,0.16)";
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 2.5, 9, 4, 2);
      ctx.fill();
    }
  }
  return cv;
}
