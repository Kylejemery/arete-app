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

const W = 1200;
const H = 760;
const MAX_SOULS = 150;
const REBIRTH_HARMONY = 0.82;
const REBIRTH_YEARS = 120;

type Virtues = Record<VirtueKey, number>;

type Soul = {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  v: Virtues;
  eud: number;
  born: number;
  awake: boolean;
  pulse: number;
  lastDeed: { virtue: VirtueKey; virtuous: boolean } | null;
  reflection: string | null;
};

type Chron = { id: number; year: number; text: string; ill: boolean };

type Fortune = { name: string; good: boolean; tint: [number, number, number]; life: number };

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
};

type Life = {
  id: string;
  kind: "awakening" | "counsel";
  soul_name: string;
  epoch: string | null;
  world_year: number | null;
  virtue: VirtueKey | null;
  counselor: string | null;
  reflection: string;
  created_at: string;
};

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
  };
}

function makeSoul(world: World, x: number, y: number, base?: Virtues): Soul {
  const v = {} as Virtues;
  for (const key of VIRTUE_KEYS) {
    v[key] = base
      ? clamp(base[key] + rand(-0.18, 0.18), 0.05, 0.98)
      : clamp(rand(0.28, 0.66) + rand(-0.14, 0.14), 0.05, 0.95);
  }
  return {
    id: world.nextId++,
    name: makeName(),
    x,
    y,
    vx: rand(-0.15, 0.15),
    vy: rand(-0.15, 0.15),
    v,
    eud: 0.5,
    born: world.year,
    awake: false,
    pulse: Math.random() * Math.PI * 2,
    lastDeed: null,
    reflection: null,
  };
}

function seedSouls(world: World, n: number, base?: Virtues) {
  for (let i = 0; i < n && world.souls.length < MAX_SOULS; i++) {
    world.souls.push(makeSoul(world, rand(W * 0.2, W * 0.8), rand(H * 0.25, H * 0.8), base));
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

function act(world: World, s: Soul) {
  const d = world.dials;
  const key = weightedVirtue(s);
  const strength = clamp(s.v[key] + rand(-0.4, 0.4), 0, 1);
  const virtuous = strength > 0.5;
  const magnitude = Math.abs(strength - 0.5) * 2;

  s.eud = clamp(s.eud + (virtuous ? 1 : -1) * magnitude * 0.05, 0.02, 1);
  s.lastDeed = { virtue: key, virtuous };
  // Character is habit — the practised virtue strengthens, the indulged vice erodes.
  s.v[key] = clamp(s.v[key] + (virtuous ? 1 : -1) * d.habituation * magnitude, 0.02, 0.99);

  // The good is contagious — a strong deed radiates to nearby souls.
  if (magnitude > 0.55 && d.contagion > 0) {
    const r2 = d.contagion * d.contagion;
    for (const o of world.souls) {
      if (o === s) continue;
      const dx = o.x - s.x;
      const dy = o.y - s.y;
      if (dx * dx + dy * dy < r2) {
        o.eud = clamp(o.eud + (virtuous ? 1 : -1) * magnitude * 0.012, 0.02, 1);
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
    s.eud = clamp(s.eud + (f.good ? 0.09 : -0.13) * (0.12 + exposure * 0.88), 0.02, 1);
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
  const child = makeSoul(world, (a.x + b.x) / 2 + rand(-30, 30), (a.y + b.y) / 2 + rand(-30, 30), base);
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
    if (e.breed && world.souls.length < MAX_SOULS && Math.random() < 0.05 + meanEud(world) * 0.08) beget(world);

    const target = world.souls.length ? meanArete(world) * 0.6 + meanEud(world) * 0.4 : 0.5;
    world.harmony += (target - world.harmony) * 0.06;

    // Track sustained concord for the rebirth.
    if (world.harmony >= REBIRTH_HARMONY) world.highRun++;
    else world.highRun = Math.max(0, world.highRun - 2);
    if (world.highRun >= REBIRTH_YEARS) ekpyrosis(world);
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
  const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>([]);

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
  const [selected, setSelected] = useState<Soul | null>(null);
  const [dials, setDials] = useState<Dials>({ ...DEFAULT_DIALS });

  const [awakening, setAwakening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [counselOpen, setCounselOpen] = useState(false);
  const [counselorId, setCounselorId] = useState(COUNSELORS[0].id);
  const [advice, setAdvice] = useState("");
  const [counseling, setCounseling] = useState(false);

  const [lives, setLives] = useState<Life[]>([]);

  // Keep the simulation reading the latest dials.
  useEffect(() => {
    worldRef.current.dials = { ...dials };
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
      }

      draw(ctx, w, t, reduce);

      sinceRefresh += dt;
      if (sinceRefresh >= 0.28) {
        sinceRefresh = 0;
        refresh();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [refresh]);

  /* ---- drawing ---- */
  function draw(ctx: CanvasRenderingContext2D, w: World, t: number, reduce: boolean) {
    const h = w.harmony;
    // Ground: warm amber when concordant, cold slate-violet when not — over the tape-dark base.
    const base: [number, number, number] = w.fortune
      ? w.fortune.tint
      : h > 0.5
      ? [26 + (h - 0.5) * 40, 24 + (h - 0.5) * 30, 16]
      : [26, 22, 30 + (0.5 - h) * 30];
    const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 40, W * 0.5, H * 0.5, H * 0.98);
    g.addColorStop(0, rgb([base[0] + 6, base[1] + 6, base[2] + 8]));
    g.addColorStop(1, "#100e0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // starfield
    const starGlow = EPOCHS[w.epoch].stars;
    if (starGlow > 0) {
      for (const st of starsRef.current) {
        const a = (0.22 + 0.32 * Math.sin(t * 0.7 + st.tw)) * starGlow;
        ctx.globalAlpha = clamp(a, 0, 0.65);
        ctx.fillStyle = "#d8d2c0";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const acting = EPOCHS[w.epoch].act === true;

    // sympatheia threads — faint links between near, flourishing souls
    if (acting) {
      ctx.lineWidth = 1;
      const souls = w.souls;
      for (let i = 0; i < souls.length; i++) {
        const s1 = souls[i];
        for (let j = i + 1; j < souls.length; j++) {
          const s2 = souls[j];
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 15000) {
            const strength = (1 - d2 / 15000) * Math.min(s1.eud, s2.eud);
            if (strength > 0.12) {
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

    // souls
    for (const s of w.souls) {
      if (!reduce && w.running) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 26 || s.x > W - 26) s.vx *= -1;
        if (s.y < 34 || s.y > H - 26) s.vy *= -1;
        s.vx = clamp(s.vx + rand(-0.01, 0.01), -0.28, 0.28);
        s.vy = clamp(s.vy + rand(-0.01, 0.01), -0.28, 0.28);
      }
      s.pulse += 0.03;
      const col = dominantVirtue(s.v).color;
      const bright = 0.35 + s.eud * 0.65;
      const rad = 2.2 + s.eud * 5 + Math.sin(s.pulse) * 0.5;

      const gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad * 4.6);
      gg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(bright * 0.5).toFixed(3)})`);
      gg.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad * 4.6, 0, 6.283);
      ctx.fill();

      ctx.fillStyle = `rgba(${Math.min(255, col[0] + 55)},${Math.min(255, col[1] + 52)},${Math.min(255, col[2] + 52)},${bright.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad, 0, 6.283);
      ctx.fill();

      // an awakened soul wears a steady ring of reason
      if (s.awake) {
        ctx.strokeStyle = "rgba(240,232,214,0.75)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad + 4, 0, 6.283);
        ctx.stroke();
      }
      if (w.selected === s.id) {
        ctx.strokeStyle = "#f0e8d6";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad + 8 + Math.sin(t * 2) * 1.5, 0, 6.283);
        ctx.stroke();
      }
    }

    // the conflagration
    if (w.flash > 0) {
      const a = w.flash / 60;
      ctx.fillStyle = `rgba(184,71,63,${(a * 0.6).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      w.flash--;
    }
  }

  /* ---- controls ---- */
  const ignite = useCallback(() => {
    const w = worldRef.current;
    if (!w.ignited) {
      w.ignited = true;
      w.year = 1;
      advanceEpoch(w);
      log(w, "The creative fire was struck. Out of the formless field a world began to condense.");
    }
    w.running = true;
    refresh();
  }, [refresh]);

  const togglePlay = useCallback(() => {
    const w = worldRef.current;
    if (!w.ignited) {
      ignite();
      return;
    }
    w.running = !w.running;
    refresh();
  }, [ignite, refresh]);

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
    refresh();
  }, [ignite, refresh]);

  const setSpeed = useCallback(
    (sp: number) => {
      worldRef.current.speed = sp;
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
    const s = makeSoul(w, rand(W * 0.25, W * 0.75), rand(H * 0.3, H * 0.75));
    w.souls.push(s);
    w.selected = s.id;
    log(w, `A soul — ${s.name} — was breathed into being by a hand outside the world.`);
    refresh();
  }, [ignite, refresh]);

  const rebirth = useCallback(() => {
    const w = worldRef.current;
    if (!(EPOCHS[w.epoch].act === true && w.harmony >= REBIRTH_HARMONY && w.souls.length)) return;
    ekpyrosis(w);
    refresh();
  }, [refresh]);

  const beginAgain = useCallback(() => {
    worldRef.current = createWorld();
    worldRef.current.dials = { ...dials };
    setSelected(null);
    setNotice(null);
    refresh();
  }, [dials, refresh]);

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (W / r.width);
      const y = (e.clientY - r.top) * (H / r.height);
      const w = worldRef.current;
      let best: Soul | null = null;
      let bd = Infinity;
      for (const s of w.souls) {
        const dx = s.x - x;
        const dy = s.y - y;
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (best && bd < 2600) {
        w.selected = best.id;
        setNotice(null);
        refresh();
      }
    },
    [refresh]
  );

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
      s.v[key] = clamp(s.v[key] + 0.12, 0.05, 0.99);
      s.eud = clamp(s.eud + 0.14, 0.02, 1);
      s.lastDeed = { virtue: key, virtuous: true };
      s.reflection = data.reflection;
      log(w, `${s.name} awakened to reason, and chose — drawing on ${virtueDef(key).name.toLowerCase()}.`);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      refresh();
      loadLedger();
    } catch {
      setNotice("The Oracle could not be reached.");
    } finally {
      setAwakening(false);
    }
  }, [awakening, refresh, loadLedger]);

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
      log(w, `${data.counselor} counselled ${s.name}, who took it up — ${virtueDef(key).name.toLowerCase()} strengthened in them.`);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setAdvice("");
      setCounselOpen(false);
      refresh();
      loadLedger();
    } catch {
      setNotice("The counsel could not reach the world.");
    } finally {
      setCounseling(false);
    }
  }, [advice, counselorId, counseling, refresh, loadLedger]);

  /* ---------------------------------------------------------------- view */

  const harmonyPct = Math.round(ui.harmony * 100);
  const playLabel = ui.running ? "❚❚ Pause" : ui.ignited ? "▶ Resume" : "Ignite";

  return (
    <div className="kp">
      <div className="kp-stage">
        {/* the cosmos */}
        <section className="kp-cosmos" aria-label="The simulated world">
          <canvas ref={canvasRef} width={W} height={H} onClick={onCanvasClick} />
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
                year={ui.year}
                onAwaken={awaken}
                awakening={awakening}
                onCounsel={() => setCounselOpen(true)}
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
                      {l.kind === "counsel" && l.counselor ? ` — counselled by ${l.counselor}` : " — awakened"}
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
    </div>
  );
}

/* ---- the selected soul ---- */
function SoulCard({
  soul,
  year,
  onAwaken,
  awakening,
  onCounsel,
  acting,
}: {
  soul: Soul;
  year: number;
  onAwaken: () => void;
  awakening: boolean;
  onCounsel: () => void;
  acting: boolean;
}) {
  const dom = dominantVirtue(soul.v);
  const age = year - soul.born;
  return (
    <div>
      <p className="kp-soul-name">
        {soul.name}
        {soul.awake && <span className="kp-awake-tag">awake</span>}
      </p>
      <p className="kp-soul-sub">
        Born year {soul.born.toLocaleString()} · {age.toLocaleString()} yrs · leans {dom.name.toLowerCase()}
      </p>
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
        <blockquote className="kp-reflection">{soul.reflection}</blockquote>
      ) : (
        <p className="kp-soul-note">
          {acting ? "Acts on simple leanings, not yet on thought." : "Dormant — the age of deeds has not begun."}
        </p>
      )}
      {acting && (
        <div className="kp-soul-actions">
          <button className="kp-btn kp-btn-primary" onClick={onAwaken} disabled={awakening || soul.awake}>
            {soul.awake ? "Reason kindled" : awakening ? "The Oracle reasons…" : "✦ Awaken this soul"}
          </button>
          <button className="kp-btn" onClick={onCounsel}>
            Counsel
          </button>
        </div>
      )}
    </div>
  );
}
