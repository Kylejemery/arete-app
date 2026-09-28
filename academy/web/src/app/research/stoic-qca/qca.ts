// Minimal fuzzy-set QCA helpers for the interactive page.
// These reproduce the sufficiency inclusion (consistency) and coverage
// measures used by the R QCA package (Ragin's formulas).

import type { Condition, StoicCase } from "./data";

export const neg = (x: number) => 1 - x;

/** Fuzzy membership of a case in one truth table row (a corner of the property space). */
export function rowMembership(c: StoicCase, conds: Condition[], config: number[]): number {
  return Math.min(...conds.map((k, i) => (config[i] === 1 ? c.scores[k] : neg(c.scores[k]))));
}

/** Sufficiency fit of a set X for outcome Y across cases. */
export function fit(xs: number[], ys: number[]) {
  let sumX = 0, sumY = 0, sumXY = 0;
  xs.forEach((x, i) => {
    sumX += x;
    sumY += ys[i];
    sumXY += Math.min(x, ys[i]);
  });
  return {
    consistency: sumX === 0 ? 0 : sumXY / sumX,
    coverage: sumY === 0 ? 0 : sumXY / sumY,
  };
}

export interface TruthRow {
  key: string;
  config: number[];
  cases: StoicCase[];
  crispHits: number;
  consistency: number;
  out: 0 | 1;
}

/** Build the truth table from observed configurations only (logical remainders are omitted). */
export function truthTable(cases: StoicCase[], conds: Condition[], inclCut: number): TruthRow[] {
  const groups = new Map<string, StoicCase[]>();
  for (const c of cases) {
    const key = conds.map((k) => (c.scores[k] > 0.5 ? 1 : 0)).join("");
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const ys = cases.map((c) => c.scores.CONS);
  const rows: TruthRow[] = [];
  groups.forEach((members, key) => {
    const config = key.split("").map(Number);
    const xs = cases.map((c) => rowMembership(c, conds, config));
    const { consistency } = fit(xs, ys);
    rows.push({
      key,
      config,
      cases: members,
      crispHits: members.filter((c) => c.scores.CONS > 0.5).length,
      consistency,
      out: consistency >= inclCut ? 1 : 0,
    });
  });
  return rows.sort((a, b) => b.consistency - a.consistency);
}

export interface PathDef {
  id: string;
  label: string;
  note: string;
  membership: (c: StoicCase) => number;
}

export const PATHS: PathDef[] = [
  {
    id: "teach-prof",
    label: "TEACH × PROF",
    note: "Trained in the lineage and taught philosophy for a living.",
    membership: (c) => Math.min(c.scores.TEACH, c.scores.PROF),
  },
  {
    id: "adv-notcourt",
    label: "ADV × ~COURT",
    note: "Faced severe adversity while not serving at a monarch's pleasure.",
    membership: (c) => Math.min(c.scores.ADV, neg(c.scores.COURT)),
  },
  {
    id: "pow-adv-notcourt-notprof",
    label: "POW × ADV × ~COURT × ~PROF",
    note: "The statesman's path: real office, real adversity, no court.",
    membership: (c) => Math.min(c.scores.POW, c.scores.ADV, neg(c.scores.COURT), neg(c.scores.PROF)),
  },
  {
    id: "adv-court",
    label: "ADV × COURT → inconsistency",
    note: "Adversity while serving an autocrat. Fit is measured against ~CONS.",
    membership: (c) => Math.min(c.scores.ADV, c.scores.COURT),
  },
];
