"use client";

import { useMemo, useState } from "react";
import { CASES, SCALE, type Condition, type SetName, type StoicCase } from "./data";
import { PATHS, fit, neg, truthTable } from "./qca";
import styles from "./stoic-qca.module.css";

const BASE: Condition[] = ["POW", "WLTH", "ADV", "TEACH", "PROF"];
const WITH_COURT: Condition[] = [...BASE, "COURT"];
const COLUMNS: SetName[] = [...WITH_COURT, "CONS"];

const fmt = (x: number) => x.toFixed(2);

/** The conventional cutoff for calling a row or path sufficient. */
const CONVENTION = 0.8;

/**
 * What the chosen threshold does to the truth table: where it sits against
 * the 0.80 convention, how many observed rows clear it, and which row is the
 * closest call, so a reader sees what moving it would flip.
 */
function thresholdNote(cut: number, rows: { consistency: number; out: 0 | 1; cases: StoicCase[] }[]): string {
  const band =
    cut < CONVENTION
      ? `At ${cut.toFixed(2)}, more lenient than the conventional ${CONVENTION.toFixed(2)}.`
      : cut === CONVENTION
        ? `At ${cut.toFixed(2)}, the conventional cutoff.`
        : `At ${cut.toFixed(2)}, stricter than the conventional ${CONVENTION.toFixed(2)}.`;
  const passing = rows.filter((r) => r.out === 1).length;
  const count =
    passing === 0
      ? "No observed row is consistent enough to count as sufficient for CONS."
      : `${passing} of ${rows.length} observed ${rows.length === 1 ? "row clears" : "rows clear"} it and ${passing === 1 ? "counts" : "count"} as sufficient for CONS.`;
  if (rows.length === 0) return `${band} ${count}`;
  const closest = rows.reduce((a, b) => (Math.abs(b.consistency - cut) < Math.abs(a.consistency - cut) ? b : a));
  const who = closest.cases.map((c) => c.name).join(", ");
  const side = closest.out === 1 ? "just clears it" : "just misses it";
  return `${band} ${count} The closest call is the row holding ${who}, at ${fmt(closest.consistency)}, which ${side}.`;
}

/**
 * What the plotted path shows: its fit against the convention, and which
 * Stoics fall below the diagonal, the cases that break the rule.
 */
function pathNote(
  label: string,
  consistency: number,
  coverage: number,
  breakers: string[],
  negated: boolean
): string {
  const outcome = negated ? "inconsistency" : "consistency";
  const fitText =
    consistency >= CONVENTION
      ? `consistency ${fmt(consistency)}, enough to call it sufficient at the conventional ${CONVENTION.toFixed(2)}`
      : `consistency ${fmt(consistency)}, short of the conventional ${CONVENTION.toFixed(2)}`;
  const cover = `It accounts for about ${Math.round(coverage * 100)}% of the ${outcome} in the cases.`;
  const below =
    breakers.length === 0
      ? "No dot sits below the diagonal, so no case contradicts it."
      : `${breakers.length === 1 ? "One case sits" : `${breakers.length} cases sit`} below the diagonal and contradict it: ${breakers.join(", ")}.`;
  return `${label.replace(" → inconsistency", "")}: ${fitText}. ${cover} ${below}`;
}
const clone = (cs: StoicCase[]) => cs.map((c) => ({ ...c, scores: { ...c.scores } }));

export default function StoicQCA() {
  const [cases, setCases] = useState<StoicCase[]>(() => clone(CASES));
  const [useCourt, setUseCourt] = useState(true);
  const [inclCut, setInclCut] = useState(0.8);
  const [open, setOpen] = useState<string | null>(null);
  const [plotPath, setPlotPath] = useState(PATHS[1].id);

  const edited = useMemo(
    () => cases.some((c, i) => COLUMNS.some((k) => c.scores[k] !== CASES[i].scores[k])),
    [cases]
  );

  const conds = useCourt ? WITH_COURT : BASE;
  const rows = useMemo(() => truthTable(cases, conds, inclCut), [cases, conds, inclCut]);

  const pathFits = useMemo(() => {
    const y = cases.map((c) => c.scores.CONS);
    const notY = y.map(neg);
    return PATHS.map((p) => {
      const xs = cases.map(p.membership);
      return { ...p, ...fit(xs, p.id === "adv-court" ? notY : y) };
    });
  }, [cases]);

  // The plotted path's fit, and the Stoics below its diagonal: membership in
  // the path above membership in the outcome, the same dots the plot shades.
  const plotted = pathFits.find((p) => p.id === plotPath);
  const plottedBreakers = plotted
    ? cases
        .filter((c) => {
          const y = plotted.id === "adv-court" ? neg(c.scores.CONS) : c.scores.CONS;
          return plotted.membership(c) - y > 0.005;
        })
        .map((c) => c.name)
    : [];

  const setScore = (i: number, k: SetName, v: number) =>
    setCases((prev) => prev.map((c, j) => (j === i ? { ...c, scores: { ...c.scores, [k]: v } } : c)));

  return (
    <div className={styles.lab}>
      <section>
        <h2>The cases</h2>
        <p className={styles.help}>
          Every score is editable. Change one and the truth table and path fits below recalculate.
          Tap a name to see the sources and the reasoning behind the scores.
        </p>
        {edited && (
          <p className={styles.editedNote}>
            You are viewing your own scoring, not the published one.{" "}
            <button className={styles.linkButton} onClick={() => setCases(clone(CASES))}>
              Reset to published scores
            </button>
          </p>
        )}
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sticky}>Case</th>
                {COLUMNS.map((k) => (
                  <th key={k} className={k === "CONS" ? styles.outcomeCol : undefined}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <FragmentRow
                  key={c.name}
                  c={c}
                  isOpen={open === c.name}
                  onToggle={() => setOpen(open === c.name ? null : c.name)}
                  onChange={(k, v) => setScore(i, k, v)}
                  changed={(k) => c.scores[k] !== CASES[i].scores[k]}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Truth table</h2>
        <div className={styles.controls}>
          <label className={styles.toggle}>
            <input type="checkbox" checked={useCourt} onChange={(e) => setUseCourt(e.target.checked)} />
            Include COURT
          </label>
          <label>
            Consistency threshold{" "}
            <select
              value={inclCut}
              onChange={(e) => setInclCut(Number(e.target.value))}
              aria-describedby="qca-threshold-note"
            >
              {[0.75, 0.8, 0.85, 0.9].map((v) => (
                <option key={v} value={v}>{v.toFixed(2)}</option>
              ))}
            </select>
          </label>
        </div>
        <p className={styles.liveNote} id="qca-threshold-note" aria-live="polite">
          {thresholdNote(inclCut, rows)}
        </p>
        <p className={styles.help}>
          Each row is a combination of conditions that at least one Stoic actually lived. A case sits in the
          row where his scores are above 0.5. Consistency is the fuzzy measure: how far membership in the row
          is a subset of membership in CONS, counted across all {cases.length} cases. Of the{" "}
          {2 ** conds.length} combinations that are logically possible, only {rows.length} are observed.
        </p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {conds.map((k) => <th key={k}>{k}</th>)}
                <th>Cases</th>
                <th>CONS in</th>
                <th>Consistency</th>
                <th>Out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={r.out ? styles.rowIn : styles.rowOut}>
                  {r.config.map((v, j) => <td key={j} className={styles.num}>{v}</td>)}
                  <td className={styles.caseList}>{r.cases.map((c) => c.name).join(", ")}</td>
                  <td className={styles.num}>{r.crispHits} of {r.cases.length}</td>
                  <td className={styles.num}>{fmt(r.consistency)}</td>
                  <td className={styles.num}>{r.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>How well the candidate paths fit</h2>
        <p className={styles.help}>
          Consistency asks how reliably the path leads to the outcome. Coverage asks how much of the outcome
          the path accounts for. A path is usually treated as sufficient at a consistency of 0.80 or higher.
        </p>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Path</th>
                <th>Consistency</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {pathFits.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.label}</strong>
                    <div className={styles.help}>{p.note}</div>
                  </td>
                  <td className={`${styles.num} ${p.consistency >= 0.8 ? styles.good : styles.weak}`}>
                    {fmt(p.consistency)}
                  </td>
                  <td className={styles.num}>{fmt(p.coverage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Seeing a path</h2>
        <p className={styles.help}>
          Each dot is a Stoic. The horizontal axis is his membership in the path, the vertical axis his
          membership in the outcome. If a path is sufficient, the dots sit on or above the diagonal. Dots below
          it are the cases that break the rule. Hover or tap a dot to see who it is.
        </p>
        <div className={styles.controls}>
          <label>
            Path{" "}
            <select
              value={plotPath}
              onChange={(e) => setPlotPath(e.target.value)}
              aria-describedby="qca-path-note"
            >
              {PATHS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
        <p className={styles.liveNote} id="qca-path-note" aria-live="polite">
          {plotted &&
            pathNote(plotted.label, plotted.consistency, plotted.coverage, plottedBreakers, plotted.id === "adv-court")}
        </p>
        <XYPlot cases={cases} pathId={plotPath} />
      </section>
    </div>
  );
}

function XYPlot({ cases, pathId }: { cases: StoicCase[]; pathId: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const path = PATHS.find((p) => p.id === pathId)!;
  const negated = path.id === "adv-court";
  const S = 320, M = 40, W = S - 2 * M;
  const sx = (v: number) => M + v * W;
  const sy = (v: number) => S - M - v * W;
  const seen = new Map<string, number>();
  const pts = cases.map((c) => {
    const x = path.membership(c);
    const y = negated ? neg(c.scores.CONS) : c.scores.CONS;
    const k = `${x.toFixed(2)}|${y.toFixed(2)}`;
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    const angle = n * 2.4, r = n === 0 ? 0 : 6 + 2 * n;
    return { c, x, y, px: sx(x) + r * Math.cos(angle), py: sy(y) + r * Math.sin(angle) };
  });
  const active = pts.find((p) => p.c.name === hover);
  return (
    <div className={styles.plotWrap}>
      <svg viewBox={`0 0 ${S} ${S}`} className={styles.plot} role="img" aria-label={`XY plot for ${path.label}`}>
        <rect x={M} y={M} width={W} height={W} className={styles.plotFrame} />
        <polygon points={`${sx(0)},${sy(0)} ${sx(1)},${sy(1)} ${sx(1)},${sy(0)}`} className={styles.plotBelow} />
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} className={styles.plotDiag} />
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <text x={sx(t)} y={S - M + 16} textAnchor="middle" className={styles.plotTick}>{t}</text>
            <text x={M - 8} y={sy(t) + 4} textAnchor="end" className={styles.plotTick}>{t}</text>
          </g>
        ))}
        <text x={S / 2} y={S - 6} textAnchor="middle" className={styles.plotAxis}>{path.label.replace(" → inconsistency", "")}</text>
        <text x={12} y={S / 2} textAnchor="middle" transform={`rotate(-90 12 ${S / 2})`} className={styles.plotAxis}>
          {negated ? "~CONS" : "CONS"}
        </text>
        {pts.map((p) => (
          <circle
            key={p.c.name}
            cx={p.px}
            cy={p.py}
            r={hover === p.c.name ? 7 : 5}
            className={p.x > p.y + 1e-9 ? styles.dotBreak : styles.dot}
            onMouseEnter={() => setHover(p.c.name)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(hover === p.c.name ? null : p.c.name)}
          >
            <title>{p.c.name}</title>
          </circle>
        ))}
      </svg>
      <p className={styles.plotCaption}>
        {active
          ? `${active.c.name}: path ${active.x.toFixed(2)}, ${negated ? "~CONS" : "CONS"} ${active.y.toFixed(2)}`
          : "Shaded area: cases that contradict the path."}
      </p>
    </div>
  );
}

function FragmentRow({
  c,
  isOpen,
  onToggle,
  onChange,
  changed,
}: {
  c: StoicCase;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (k: SetName, v: number) => void;
  changed: (k: SetName) => boolean;
}) {
  return (
    <>
      <tr>
        <th scope="row" className={styles.sticky}>
          <button className={styles.caseButton} onClick={onToggle} aria-expanded={isOpen}>
            {c.name}
          </button>
          <div className={styles.period}>{c.period}</div>
        </th>
        {COLUMNS.map((k) => (
          <td key={k} className={k === "CONS" ? styles.outcomeCol : undefined}>
            <select
              aria-label={`${c.name} ${k}`}
              className={`${styles.scoreSelect} ${changed(k) ? styles.changed : ""}`}
              value={c.scores[k]}
              onChange={(e) => onChange(k, Number(e.target.value))}
            >
              {(k === "PROF" ? [0, 1] : SCALE).map((v) => (
                <option key={v} value={v}>{v === 0 || v === 1 ? v : v.toFixed(2)}</option>
              ))}
            </select>
          </td>
        ))}
      </tr>
      {isOpen && (
        <tr className={styles.detailRow}>
          <td colSpan={COLUMNS.length + 1}>
            <p><strong>Sources.</strong> {c.sources}</p>
            <p><strong>Coding notes.</strong> {c.notes}</p>
            <p className={styles.flags}>
              Teacher known: {c.teachKnown ? "yes" : "no"} · Conduct under a specific test recorded:{" "}
              {c.consTested ? "yes" : "no"}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
