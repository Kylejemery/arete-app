"use client";

/**
 * Kosmopolis, the whole world as a globe. Part of the preview renderer (see
 * KosmopolisPixi.ts, which owns one of these and decides when it shows).
 *
 * The world is a planet face: a disc of land and sea in world units (x, y),
 * radius R. The globe treats that disc as the near hemisphere of a sphere seen
 * straight on, so with no spin the globe is pixel for pixel the flat overview
 * map: world (x, y) sits at (x / R, y / R, z) on the unit sphere. Spinning turns
 * the sphere; the far hemisphere is the land beyond the known world, drawn
 * veiled. The simulation never sees any of this: the globe is only a view.
 *
 * One fragment shader draws the sphere: the terrain raster, the mood tint the
 * flat map lays over the land, a fog mask (white revealed, black hidden), the
 * daylight colour per pixel from the sun's angle (so day and night sweep
 * across it with the hour, and at the centre it matches the flat map's
 * daylight), drifting cloud, a glint on the sea, and the atmosphere's rim.
 * Town lights, souls and markers are projected onto it in screen space.
 */

import type * as PIXI from "pixi.js";
import { dominantVirtue, type VirtueKey } from "@/content/playground/kosmopolis";

type Pixi = typeof import("pixi.js");

export type GlobeSoul = { id: number; x: number; y: number; eud: number; awake: boolean; v: Record<VirtueKey, number> };
export type GlobeWorld = {
  souls: GlobeSoul[];
  settlements: readonly { x: number; y: number; r: number; name: string }[];
  builtInst: readonly (readonly string[])[];
  camera: { cx: number; cy: number; zoom: number };
  selected: number | null;
  tod: number;
  harmony: number;
  fortune: { tint: [number, number, number] } | null;
  threats: { sophist: { x: number; y: number } | null; tyrant: { home: number; seized: boolean } | null };
};

const A = 1.09; // the quad's half-size in sphere radii: the sphere plus its atmosphere

const VERT = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;

const FRAG = `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uTerrain;
uniform sampler2D uFog;
uniform float uYaw;
uniform float uPitch;
uniform float uSun;
uniform float uTime;
uniform float uAlpha;
uniform float uCloud;
uniform vec4 uMood;

const vec3 OCEAN = vec3(0.078, 0.125, 0.18);
const vec3 VEIL = vec3(0.075, 0.082, 0.10);

// view space to world space: undo the pitch, then the yaw
vec3 toWorld(vec3 v) {
  float cp = cos(uPitch), sp = sin(uPitch);
  vec3 a = vec3(v.x, v.y * cp + v.z * sp, -v.y * sp + v.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw);
  return vec3(a.x * cy - a.z * sy, a.y, a.x * sy + a.z * cy);
}
vec3 toView(vec3 w) {
  float cy = cos(uYaw), sy = sin(uYaw);
  vec3 a = vec3(w.x * cy + w.z * sy, w.y, -w.x * sy + w.z * cy);
  float cp = cos(uPitch), sp = sin(uPitch);
  return vec3(a.x, a.y * cp - a.z * sp, a.y * sp + a.z * cp);
}
// the flat renderer's daylightTint(), divided by 255. It steps at sunrise
// (the night branch starts a little darker), which a whole-screen tint never
// shows but a sphere would, so the two branches are blended across it.
vec3 dayBranch(float e) { return vec3(255.0, mix(216.0, 250.0, e), mix(172.0, 240.0, e)) / 255.0; }
vec3 nightBranch(float e) {
  float k = min(1.0, -e);
  return vec3(mix(255.0, 58.0, k), mix(200.0, 74.0, k), mix(150.0, 116.0, k)) / 255.0;
}
vec3 daylight(float e) {
  return mix(nightBranch(min(e, 0.0)), dayBranch(max(e, 0.0)), smoothstep(-0.12, 0.12, e));
}
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

void main() {
  vec2 p = vUV;
  float r2 = dot(p, p);
  vec3 L = vec3(-sin(uSun), 0.0, cos(uSun)); // the sun, in world space
  if (r2 > 1.0) {
    // the atmosphere: a thin rim, bright on the day side
    float d = sqrt(r2) - 1.0;
    float a = clamp(1.0 - d / (${(A - 1).toFixed(3)}), 0.0, 1.0);
    a = a * a * a;
    vec3 nw = toWorld(vec3(normalize(p), 0.0));
    float lit = clamp(dot(nw, L) * 0.8 + 0.35, 0.06, 1.0);
    float k = a * 0.5 * uAlpha;
    finalColor = vec4(vec3(0.42, 0.56, 0.72) * lit * k, k);
    return;
  }
  float z = sqrt(1.0 - r2);
  vec3 nv = vec3(p, z);
  vec3 nw = toWorld(nv);
  vec2 tuv = nw.xy * 0.5 + 0.5;
  vec4 tx = texture(uTerrain, tuv);
  vec3 col = mix(OCEAN, tx.rgb / max(tx.a, 0.001), tx.a);
  // the raster's rim meets the open sea softly, so the sphere shows no seam
  col = mix(col, OCEAN, smoothstep(0.9, 1.0, length(nw.xy)));
  float water = clamp((col.b - col.r) * 6.0, 0.0, 1.0);
  col = mix(col, uMood.rgb, uMood.a);
  // fog: hidden land is veiled; the far side is all beyond the known world
  float seen = texture(uFog, tuv).r;
  float beyond = smoothstep(0.12, -0.3, nw.z);
  float cl = fbm(nw * 3.2 + vec3(uTime * 0.012, 0.0, uTime * 0.004));
  vec3 veil = VEIL + vec3(0.05) * cl;
  col = mix(col, mix(veil, mix(col, OCEAN, 0.5), 0.25), max((1.0 - seen) * 0.92, beyond * 0.85));
  // the light of the hour, per point: the flat map's daylight at the centre
  float lam = dot(nw, L);
  col *= daylight(lam);
  // a glint of sun on the sea
  vec3 Lv = toView(L);
  vec3 h = normalize(Lv + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(nv, h), 0.0), 90.0) * water * step(0.0, lam);
  col += vec3(1.0, 0.9, 0.72) * spec * 0.22;
  // drifting cloud, lit by the same sun
  float cloud = smoothstep(0.56, 0.78, cl) * uCloud;
  vec3 cloudCol = vec3(0.9, 0.88, 0.84) * clamp(lam * 0.9 + 0.12, 0.05, 1.0);
  col = mix(col, cloudCol, cloud * 0.6);
  // a soft limb, and the atmosphere's edge
  col *= mix(0.62, 1.0, pow(z, 0.45));
  col += vec3(0.30, 0.42, 0.58) * pow(1.0 - z, 3.0) * clamp(lam + 0.4, 0.0, 1.0) * 0.5;
  finalColor = vec4(col * uAlpha, uAlpha);
}`;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const hex = (c: readonly number[]) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

export class Globe {
  /** Screen-space layer the owner adds to its stage. */
  readonly container: PIXI.Container;
  private P: Pixi;
  private mesh: PIXI.Mesh<PIXI.Geometry, PIXI.Shader>;
  private uniforms: Record<string, unknown>;
  private lights: PIXI.Container; // additive, blurred: towns at night
  private marks: PIXI.Graphics;
  private labels: PIXI.Container;
  private names: PIXI.Text[] = [];
  private glowTex: PIXI.Texture;
  private glows: PIXI.Sprite[] = [];
  private terrainSrc: HTMLCanvasElement | null = null;
  private fogTex: PIXI.Texture | null = null;

  // spin, in radians, and its momentum
  private yaw = 0;
  private pitch = 0;
  private vYaw = 0;
  private vPitch = 0;
  private spunThisFrame = false;
  // what the last frame drew, for picking and projection
  private cx = 0;
  private cy = 0;
  private rpx = 1;
  private ey = 0; // the spin actually applied (eased to zero near the hand-off)
  private ep = 0;
  private R = 1;

  constructor(P: Pixi, glowTex: PIXI.Texture) {
    this.P = P;
    this.glowTex = glowTex;
    this.container = new P.Container();
    const q = [-A, -A, A, -A, A, A, -A, A];
    const geometry = new P.Geometry({
      attributes: { aPosition: q, aUV: q },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    const shader = P.Shader.from({
      gl: { vertex: VERT, fragment: FRAG, name: "kosmopolis-globe" },
      resources: {
        uTerrain: P.Texture.WHITE.source,
        uFog: P.Texture.WHITE.source,
        globeUniforms: {
          uYaw: { value: 0, type: "f32" },
          uPitch: { value: 0, type: "f32" },
          uSun: { value: 0, type: "f32" },
          uTime: { value: 0, type: "f32" },
          uAlpha: { value: 1, type: "f32" },
          uCloud: { value: 1, type: "f32" },
          uMood: { value: new Float32Array([0, 0, 0, 0]), type: "vec4<f32>" },
        },
      },
    });
    this.mesh = new P.Mesh({ geometry, shader });
    this.uniforms = (shader.resources.globeUniforms as { uniforms: Record<string, unknown> }).uniforms;
    this.lights = new P.Container();
    this.lights.blendMode = "add";
    this.lights.filters = [new P.BlurFilter({ strength: 6, quality: 2, resolution: 0.5 })];
    this.marks = new P.Graphics();
    this.labels = new P.Container();
    this.container.addChild(this.mesh, this.lights, this.marks, this.labels);
  }

  /** The terrain raster the flat map draws, wrapped onto the sphere. */
  setTerrain(canvas: HTMLCanvasElement | null) {
    if (!canvas || canvas === this.terrainSrc) return;
    this.terrainSrc = canvas;
    (this.mesh.shader!.resources as Record<string, unknown>).uTerrain = this.P.Texture.from(canvas).source;
  }

  /**
   * FOG HOOK (globe). A mask in terrain-raster space, covering world
   * [-R, R] on both axes: white is revealed, black hidden. The shader veils
   * hidden land. Null reveals everything. Call it when the fog changes, not
   * every frame; a coarse mask is fine, it is filtered on the GPU.
   */
  setFog(mask: HTMLCanvasElement | null) {
    this.fogTex?.destroy(true);
    this.fogTex = mask ? this.P.Texture.from(mask) : null;
    (this.mesh.shader!.resources as Record<string, unknown>).uFog = (this.fogTex ?? this.P.Texture.WHITE).source;
  }

  /** Turn the globe by a drag of (dx, dy) canvas pixels. */
  spinBy(dx: number, dy: number) {
    const k = 1 / Math.max(60, this.rpx);
    this.vYaw = dx * k;
    this.vPitch = dy * k;
    this.yaw += this.vYaw;
    this.pitch = clamp(this.pitch - this.vPitch, -1.25, 1.25);
    this.spunThisFrame = true;
  }

  /** Put the globe back face on (the View-the-whole-world button). */
  resetSpin() {
    this.yaw = this.pitch = this.vYaw = this.vPitch = 0;
  }

  /** The world point under a canvas pixel, or NaN when it misses the known world. */
  pick(sx: number, sy: number): { x: number; y: number } {
    const px = (sx - this.cx) / this.rpx;
    const py = (sy - this.cy) / this.rpx;
    const r2 = px * px + py * py;
    if (r2 > 1) return { x: NaN, y: NaN };
    const w = this.toWorld(px, py, Math.sqrt(1 - r2));
    if (w[2] < 0) return { x: NaN, y: NaN };
    return { x: w[0] * this.R, y: w[1] * this.R };
  }

  /** Where a world point lands on screen, and whether it faces the viewer. */
  project(x: number, y: number): { x: number; y: number; z: number } {
    const nx = x / this.R;
    const ny = y / this.R;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const cy = Math.cos(this.ey);
    const sy = Math.sin(this.ey);
    const x1 = nx * cy + nz * sy;
    const z1 = -nx * sy + nz * cy;
    const cp = Math.cos(this.ep);
    const sp = Math.sin(this.ep);
    const y2 = ny * cp - z1 * sp;
    const z2 = ny * sp + z1 * cp;
    return { x: this.cx + x1 * this.rpx, y: this.cy + y2 * this.rpx, z: z2 };
  }

  private toWorld(vx: number, vy: number, vz: number): [number, number, number] {
    const cp = Math.cos(this.ep);
    const sp = Math.sin(this.ep);
    const ay = vy * cp + vz * sp;
    const az = -vy * sp + vz * cp;
    const cy = Math.cos(this.ey);
    const sy = Math.sin(this.ey);
    return [vx * cy - az * sy, ay, vx * sy + az * cy];
  }

  /**
   * Draw a frame. `alpha` fades the whole globe (the hand-off to the flat
   * map); `spinK` scales the spin, 1 while zoomed out, easing to 0 as the view
   * closes on the map, so the globe arrives face on, exactly over the map.
   */
  render(w: GlobeWorld, o: { W: number; H: number; R: number; t: number; alpha: number; spinK: number; acting: boolean }) {
    const { W, H, R, t, alpha, spinK } = o;
    const cam = w.camera;
    this.R = R;
    // momentum after a drag is let go
    if (!this.spunThisFrame) {
      this.vYaw *= 0.94;
      this.vPitch *= 0.94;
      if (Math.abs(this.vYaw) + Math.abs(this.vPitch) > 1e-5) {
        this.yaw += this.vYaw;
        this.pitch = clamp(this.pitch - this.vPitch, -1.25, 1.25);
      }
    }
    this.spunThisFrame = false;
    this.ey = this.yaw * spinK;
    this.ep = this.pitch * spinK;
    // the sphere sits exactly where the flat map's disc does
    this.cx = W / 2 - cam.cx * cam.zoom;
    this.cy = H / 2 - cam.cy * cam.zoom;
    this.rpx = R * cam.zoom;
    this.mesh.position.set(this.cx, this.cy);
    this.mesh.scale.set(this.rpx);
    this.container.alpha = 1;
    const u = this.uniforms;
    u.uYaw = this.ey;
    u.uPitch = this.ep;
    u.uSun = (w.tod - 0.5) * Math.PI * 2;
    u.uTime = t;
    u.uAlpha = alpha;
    u.uCloud = spinK;
    const mood = u.uMood as Float32Array;
    const h = w.harmony;
    if (w.fortune) mood.set([w.fortune.tint[0] / 255, w.fortune.tint[1] / 255, w.fortune.tint[2] / 255, 0.16]);
    else if (h > 0.5) mood.set([214 / 255, 178 / 255, 106 / 255, (h - 0.5) * 0.28]);
    else mood.set([90 / 255, 80 / 255, 110 / 255, (0.5 - h) * 0.3]);

    // the sun, in world space, to light markers as the shader lights land
    const sun = (w.tod - 0.5) * Math.PI * 2;
    const Lx = -Math.sin(sun);
    const Lz = Math.cos(sun);
    const lamAt = (x: number, y: number) => {
      const nx = x / R;
      const ny = y / R;
      return nx * Lx + Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) * Lz;
    };

    // towns: a gold mark by day, a warm glow by night, and their names
    const P = this.P;
    const g = this.marks;
    g.clear();
    while (this.glows.length < w.settlements.length * 2) {
      const s = new P.Sprite(this.glowTex);
      s.anchor.set(0.5);
      s.tint = 0xffbe6a;
      this.lights.addChild(s);
      this.glows.push(s);
    }
    this.glows.forEach((s) => (s.visible = false));
    this.labels.removeChildren();
    const scale = this.rpx / R; // screen px per world unit at the globe's centre
    w.settlements.forEach((st, si) => {
      const p = this.project(st.x, st.y);
      if (p.z <= 0.02) return;
      const face = clamp(p.z * 3, 0, 1);
      const night = clamp((-lamAt(st.x, st.y) + 0.05) / 0.3, 0, 1);
      const glow = this.glows[si * 2];
      glow.visible = night > 0.02;
      glow.position.set(p.x, p.y);
      glow.width = glow.height = Math.max(26, st.r * scale * 2.2);
      glow.alpha = night * 0.85 * face * alpha;
      const core = this.glows[si * 2 + 1];
      core.visible = glow.visible;
      core.position.set(p.x, p.y);
      core.width = core.height = Math.max(8, st.r * scale * 0.5);
      core.alpha = night * face * alpha;
      g.circle(p.x, p.y, 5).fill({ color: 0xe3c77a, alpha: face * alpha * (1 - night * 0.5) });
      (w.builtInst[si] ?? []).forEach((_, k) => g.circle(p.x + (k + 1) * 7, p.y, 2.5).fill({ color: 0xd6b26a, alpha: face * alpha }));
      if (cam.zoom > 0.34 || spinK < 1) {
        let txt = this.names[si];
        if (!txt) {
          txt = new P.Text({ text: st.name, style: { fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fill: 0xe4e5dc } });
          txt.anchor.set(0.5, 1);
          this.names[si] = txt;
        }
        if (txt.text !== st.name) txt.text = st.name;
        txt.position.set(p.x, p.y - 12);
        txt.alpha = 0.8 * face * alpha;
        this.labels.addChild(txt);
      }
    });

    // souls: points of light on the face of the world
    for (const s of w.souls) {
      const p = this.project(s.x, s.y);
      if (p.z <= 0.02) continue;
      const col = dominantVirtue(s.v).color;
      const lit = [Math.min(255, col[0] + 50), Math.min(255, col[1] + 48), Math.min(255, col[2] + 48)];
      const face = clamp(p.z * 3, 0, 1);
      g.circle(p.x, p.y, 1.8 + s.eud * 2.2).fill({ color: hex(lit), alpha: (0.4 + s.eud * 0.6) * face * alpha });
      if (s.awake) g.circle(p.x, p.y, 6).stroke({ width: 1.2, color: 0xf0e8d6, alpha: 0.85 * face * alpha });
      if (w.selected === s.id) g.circle(p.x, p.y, 9 + Math.sin(t * 2) * 1.5).stroke({ width: 1.6, color: 0xf0e8d6, alpha: face * alpha });
    }

    // the threats that have a place: the sophist, the tyrant's seat
    const so = w.threats.sophist;
    if (so) {
      const p = this.project(so.x, so.y);
      if (p.z > 0.02) g.circle(p.x, p.y, 6).fill({ color: 0x9660be, alpha: 0.9 * alpha });
    }
    const ty = w.threats.tyrant;
    const seat = ty ? w.settlements[ty.home] : null;
    if (ty && seat) {
      const p = this.project(seat.x, seat.y);
      if (p.z > 0.02) g.circle(p.x, p.y, 11).stroke({ width: 2, color: 0xec7062, alpha: (ty.seized ? 1 : 0.6) * alpha });
    }
  }

  destroy() {
    this.fogTex?.destroy(true);
    this.container.destroy({ children: true });
  }
}
