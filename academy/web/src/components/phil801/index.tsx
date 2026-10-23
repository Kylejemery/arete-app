// PHIL 801 figures, keyed by session id and the title of the part they follow.
// The session text files are not touched; a figure whose part title stops
// matching simply does not render, so keep titles in step when editing them.

import { FIGURES_1_TO_6, type FigureEntry } from './figures1to6';
import { FIGURES_7_TO_12 } from './figures7to12';

export const PHIL801_FIGURES: Record<number, FigureEntry[]> = { ...FIGURES_1_TO_6, ...FIGURES_7_TO_12 };

export function Phil801PartFigures({ sessionId, partTitle }: { sessionId: number; partTitle: string }) {
  const entries = (PHIL801_FIGURES[sessionId] ?? []).filter(f => f.part === partTitle);
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map((f, i) => (
        <div key={i}>{f.render()}</div>
      ))}
    </>
  );
}
