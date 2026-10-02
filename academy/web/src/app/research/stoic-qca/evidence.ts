// Helpers for the per-score evidence panel and the admin export.

import { ANCHORS, type SetName, type StoicCase } from "./data";

const LEVEL = /(1|0\.67|0\.33|0): (.*?)(?= (?:1|0\.67|0\.33|0): |$)/g;

/** What a score means for a set, read from the codebook anchors in data.ts. */
export function levelMeaning(set: SetName, score: number): string | null {
  const anchor = ANCHORS.find((a) => a.set === set);
  if (!anchor) return null;
  for (const m of anchor.anchors.matchAll(LEVEL)) {
    if (Math.abs(Number(m[1]) - score) < 0.005) {
      const text = m[2].trim();
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }
  return null;
}

export const setLabel = (set: SetName) => ANCHORS.find((a) => a.set === set)?.label ?? set;

export const fmtScore = (v: number) => (v === 0 || v === 1 ? String(v) : v.toFixed(2));

/**
 * A Reading Room link to the passage itself. The chunk id is resolved to its
 * page when the link is opened (/api/library/locate), and q, the opening words
 * of the excerpt, lands the reader on the paragraph that holds them.
 */
export function readingRoomHref(chunkId: string, excerpt: string | null): string {
  const params = new URLSearchParams({ chunk: chunkId });
  if (excerpt) {
    const opening = excerpt.trim().split(/\s+/).slice(0, 8).join(" ");
    if (opening) params.set("q", opening);
  }
  return `/library?${params.toString()}`;
}

/**
 * The CASES declaration of data.ts, written from the given scoring in the
 * file's own format (JSON, two-space indent), so pasting it over the existing
 * declaration produces a diff of the changed scores only.
 */
export function casesSource(cases: StoicCase[]): string {
  return `export const CASES: StoicCase[] = ${JSON.stringify(cases, null, 2)};\n`;
}

export interface ScoreChange {
  name: string;
  set: SetName;
  from: number;
  to: number;
}

export function scoreChanges(published: StoicCase[], current: StoicCase[], sets: SetName[]): ScoreChange[] {
  const out: ScoreChange[] = [];
  current.forEach((c, i) => {
    for (const k of sets) {
      if (c.scores[k] !== published[i].scores[k]) out.push({ name: c.name, set: k, from: published[i].scores[k], to: c.scores[k] });
    }
  });
  return out;
}
