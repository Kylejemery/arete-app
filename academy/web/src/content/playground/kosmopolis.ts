/**
 * Kosmopolis — a simulated world whose physics reward virtue.
 *
 * This module is the pure heart of the experiment: the shape of a world and its
 * souls, the epochs it moves through, the doctrine it runs on, and small pure
 * helpers. It holds no React and no canvas — the browser component
 * (components/playground/KosmopolisWorld.tsx) imports from here, and so could a
 * test or a server route. Everything visual or stateful lives there.
 *
 * The world is a sketch of the Stoic thesis, not a proof of it: virtue is the
 * only good, the good is contagious, the sage is unshaken by fortune, and
 * character is habit. Those four claims are the physics — see LAWS and the
 * doctrine dials below, which are meant to be argued with.
 */

/* ------------------------------------------------------------------ virtues */

export type VirtueKey = "wisdom" | "justice" | "courage" | "temperance";

export type VirtueDef = {
  key: VirtueKey;
  name: string;
  /** RGB, tuned to sit in the playground's warm archival palette. */
  color: [number, number, number];
  /** Words that, appearing in an Oracle reflection, mark this virtue as the one exercised. */
  cues: string[];
};

export const VIRTUES: VirtueDef[] = [
  {
    key: "wisdom",
    name: "Wisdom",
    color: [214, 178, 106],
    cues: ["wisdom", "wise", "understand", "judg", "reason", "clear", "know", "discern", "truth", "perceive", "see clearly"],
  },
  {
    key: "justice",
    name: "Justice",
    color: [122, 156, 196],
    cues: ["justice", "just", "fair", "duty", "owe", "others", "kindness", "community", "give them their", "wrong", "honest"],
  },
  {
    key: "courage",
    name: "Courage",
    color: [184, 71, 63],
    cues: ["courage", "brave", "fear", "endure", "face", "stand", "bear", "adversity", "risk", "hold your ground"],
  },
  {
    key: "temperance",
    name: "Temperance",
    color: [122, 168, 142],
    cues: ["temperance", "moderation", "desire", "appetite", "restraint", "enough", "control", "anger", "self-command", "excess"],
  },
];

export const VIRTUE_KEYS: VirtueKey[] = VIRTUES.map((v) => v.key);

export function virtueDef(key: VirtueKey): VirtueDef {
  return VIRTUES.find((v) => v.key === key) ?? VIRTUES[0];
}

export type Virtues = Record<VirtueKey, number>;

export function arete(v: Virtues): number {
  return (v.wisdom + v.justice + v.courage + v.temperance) / 4;
}

export function dominantVirtue(v: Virtues): VirtueDef {
  let best = VIRTUES[0];
  for (const V of VIRTUES) if (v[V.key] > v[best.key]) best = V;
  return best;
}

/**
 * Which cardinal virtue does a passage of reflection most invoke? Used to read
 * an Oracle answer back into the world. Defaults to wisdom — to awaken is first
 * of all to reason.
 */
export function virtueFromText(text: string): VirtueKey {
  const lower = text.toLowerCase();
  let best: VirtueKey = "wisdom";
  let bestScore = 0;
  for (const V of VIRTUES) {
    let score = 0;
    for (const cue of V.cues) {
      let i = lower.indexOf(cue);
      while (i !== -1) {
        score++;
        i = lower.indexOf(cue, i + cue.length);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = V.key;
    }
  }
  return best;
}

/* ------------------------------------------------------------------- epochs */

export type Epoch = {
  /** Year of the World at which this age begins. */
  at: number;
  kicker: string;
  name: string;
  /** How brightly the background starfield burns (0..1). */
  stars: number;
  /** Souls seeded on entering this age. */
  seed?: number;
  /** Whether the moral physics run — souls act and are answerable. */
  act?: boolean;
  /** Whether flourishing souls beget children. */
  breed?: boolean;
};

/**
 * The world mirrors an Earth: it condenses out of fire, cools to seas, stirs
 * with dormant souls, then quickens into agency and society. Consciousness — a
 * soul that truly reasons — is not on this list. It arrives only when a visitor
 * spends the Oracle to awaken one.
 */
export const EPOCHS: Epoch[] = [
  { at: 0, kicker: "Before the first spark", name: "The Void", stars: 0 },
  { at: 1, kicker: "The creative fire, cooling", name: "Coalescence", stars: 0.5 },
  { at: 60, kicker: "Warm seas, first stirrings", name: "The Waters", stars: 0.8 },
  { at: 140, kicker: "Souls appear, still dormant", name: "The Stirring", stars: 1, seed: 8 },
  { at: 260, kicker: "The moral physics awaken", name: "The Kindling", stars: 1, act: true },
  { at: 460, kicker: "Souls gather and multiply", name: "The Polis", stars: 1, act: true, breed: true },
];

/* --------------------------------------------------------------- doctrine */

/**
 * The physics constants — the doctrine, made adjustable. Each is a real Stoic
 * question you can argue by moving it: should fortune move the sage at all
 * (sageShield → 1)? Is virtue truly contagious, or does each soul stand alone
 * (contagion → 0)?
 */
export type Dials = {
  /** How far a strong deed radiates to neighbours, in world units. 0 = souls stand alone. */
  contagion: number;
  /** How much virtue blunts fortune. 0 = fortune hits all equally; 1 = the sage is untouched. */
  sageShield: number;
  /** How fast a practised virtue strengthens (or an indulged vice erodes). */
  habituation: number;
  /** How often fortune — plague, war, plenty — visits the world. */
  fortuneFreq: number;
};

export const DEFAULT_DIALS: Dials = {
  contagion: 130,
  sageShield: 0.85,
  habituation: 0.006,
  fortuneFreq: 0.008,
};

export const DIAL_META: {
  key: keyof Dials;
  label: string;
  min: number;
  max: number;
  step: number;
  note: string;
  format: (v: number) => string;
}[] = [
  { key: "contagion", label: "Contagion of the good", min: 0, max: 220, step: 5, note: "How far a deed reaches its neighbours.", format: (v) => (v === 0 ? "none" : Math.round(v).toString()) },
  { key: "sageShield", label: "The sage's shield", min: 0, max: 1, step: 0.05, note: "How much virtue blunts fortune.", format: (v) => Math.round(v * 100) + "%" },
  { key: "habituation", label: "Force of habit", min: 0, max: 0.02, step: 0.001, note: "How fast acts become character.", format: (v) => v.toFixed(3) },
  { key: "fortuneFreq", label: "Reach of fortune", min: 0, max: 0.03, step: 0.002, note: "How often plague, war, or plenty visit.", format: (v) => (v === 0 ? "never" : (v * 100).toFixed(1) + "%") },
];

/* --------------------------------------------------------------- the laws */

export const LAWS: { glyph: string; title: string; body: string }[] = [
  { glyph: "✦", title: "Virtue is the only good.", body: "A virtuous act raises a soul's flourishing; a vicious one lowers it. Directly, every time." },
  { glyph: "≈", title: "The good is contagious.", body: "A just soul lifts its neighbours; cruelty spreads outward too. Souls are threads in one fabric." },
  { glyph: "⟳", title: "The sage is unshaken.", body: "Fortune strikes all. But the more virtuous the soul, the less it is moved." },
  { glyph: "↑", title: "Character is habit.", body: "Each act practised makes its virtue easier next time. Souls become what they repeatedly do." },
];

/* ------------------------------------------------------------------ deeds */

export const GOOD_DEEDS: Record<VirtueKey, string[]> = {
  wisdom: ["saw the matter clearly where others were confused", "set down a true judgement and lived by it", "refused a comforting lie"],
  justice: ["dealt fairly with one who could not repay", "gave another their due without being asked", "stood between the strong and the wronged"],
  courage: ["held their ground when it would have been easy to flee", "bore a hard loss without complaint", "spoke the needed word into a hostile room"],
  temperance: ["turned away from excess within reach", "mastered an anger before it spoke", "took only what was enough"],
};

export const ILL_DEEDS: Record<VirtueKey, string[]> = {
  wisdom: ["clung to a flattering error", "mistook noise for knowledge", "judged in haste and would not revisit it"],
  justice: ["took what was owed to another", "let a wrong stand to keep the peace of comfort", "weighed a friend and a stranger by different scales"],
  courage: ["fled the thing that had to be faced", "let fear choose for them", "abandoned a post that was theirs to keep"],
  temperance: ["gave way to appetite and called it need", "let anger run the day", "grasped past the point of enough"],
};

export type Fortune = { name: string; good: boolean; tint: [number, number, number] };

export const FORTUNES: Fortune[] = [
  { name: "a plague", good: false, tint: [70, 48, 60] },
  { name: "a famine", good: false, tint: [66, 56, 42] },
  { name: "a war", good: false, tint: [92, 44, 42] },
  { name: "a season of plenty", good: true, tint: [70, 74, 56] },
  { name: "a great calm", good: true, tint: [56, 70, 78] },
];

/* --------------------------------------------------------------- counsel */

/**
 * The voices a visitor can counsel a soul through. Only these carry a distinct,
 * corpus-grounded system prompt on the public Oracle; every other Cabinet name
 * would fall back to the unified voice, so we do not offer them here and pretend
 * otherwise. `author` is the exact string the Oracle route keys on (null = the
 * whole tradition at once).
 */
export type Counselor = { id: string; name: string; author: string | null; era: string; note: string };

export const COUNSELORS: Counselor[] = [
  { id: "corpus", name: "The Corpus", author: null, era: "The whole tradition", note: "Every Stoic voice answering at once." },
  { id: "marcus", name: "Marcus Aurelius", author: "Marcus Aurelius", era: "121–180", note: "The emperor who wrote to hold himself to account." },
  { id: "epictetus", name: "Epictetus", author: "Epictetus", era: "50–135", note: "The freed slave who had no patience for excuses." },
  { id: "seneca", name: "Seneca", author: "Seneca", era: "4 BC–65 AD", note: "The statesman on anger, time, and fortune." },
  { id: "montaigne", name: "Montaigne", author: "Michel de Montaigne", era: "1533–1592", note: "The essayist, weighing himself without flinching." },
];

export function counselorById(id: string): Counselor | undefined {
  return COUNSELORS.find((c) => c.id === id);
}

/* ------------------------------------------------------------------- names */

const ONSET = ["K", "Kl", "L", "M", "N", "P", "Ph", "R", "S", "T", "Th", "Tr", "D", "Ar", "Andr", "Kal", "Dor", "Xen", "Hel", "Ther", "Nik", "Sos", "Kle", "Lys", "Eur", "Prot", "Amph"];
const NUCLEUS = ["a", "e", "o", "i", "ae", "ei", "y", "au"];
const CODA = ["n", "s", "r", "on", "os", "es", "is", "ia", "ios", "ander", "ippos", "ekles", "anor", "ynne", "ope", "arete", "odike", "ora", "ias"];

function pick<T>(a: T[]): T {
  return a[(Math.random() * a.length) | 0];
}

export function makeName(): string {
  const s = pick(ONSET) + pick(NUCLEUS) + pick(CODA);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
