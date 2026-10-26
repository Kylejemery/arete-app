// Shared pieces for the PHIL 801 figures.
//
// The course's point is that Stoic logic survives only as reconstruction, so
// every figure separates two things visibly: what a source attests (a locus is
// given; solid gold mark) and what a modern scholar supplies (named; dashed
// gold mark). Every figure is labelled a modern diagram, set in the interface
// faces, never laid out like a page of an ancient text.

import type { ReactNode } from 'react';

export const GOLD = '#C9A84C';
export const gold = (a: number) => `rgba(201,168,76,${a})`;

export type Status = 'a' | 'r';

/** A small square swatch: solid for attested, dashed for reconstruction. */
export function Swatch({ kind }: { kind: Status }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-shrink-0"
      style={{
        width: 10,
        height: 10,
        marginTop: 3,
        background: kind === 'a' ? GOLD : 'transparent',
        border: `1.5px ${kind === 'a' ? 'solid' : 'dashed'} ${GOLD}`,
      }}
    />
  );
}

/** Inline tag for a cell or node: solid border if attested, dashed if reconstructed. */
export function Tag({ kind, children, title }: { kind: Status; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-block font-mono text-[11px] leading-none px-1.5 py-1 whitespace-nowrap"
      style={{
        color: kind === 'a' ? GOLD : '#E3C77A',
        border: `1px ${kind === 'a' ? 'solid' : 'dashed'} ${kind === 'a' ? gold(0.6) : gold(0.5)}`,
        background: kind === 'a' ? gold(0.1) : 'transparent',
      }}
    >
      {children}
    </span>
  );
}

/** A plain label pill for marks such as "contraction" or "toggle". */
export function Mark({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-block text-[10px] font-semibold uppercase tracking-wider leading-none px-1.5 py-1 whitespace-nowrap"
      style={{ color: '#0A1628', background: GOLD }}
    >
      {children}
    </span>
  );
}

export function Figure({
  n,
  title,
  attested,
  reconstructed,
  children,
}: {
  n: string;
  title: string;
  attested: string[];
  reconstructed: string[];
  children: ReactNode;
}) {
  return (
    <figure
      className="my-6 bg-academy-card border border-academy-border"
      style={{ borderRadius: 2 }}
      aria-label={`Figure ${n}: ${title}`}
    >
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-academy-border">
        <p className="text-academy-gold text-[10px] font-bold uppercase tracking-[0.2em]">
          Figure {n} · Modern diagram
        </p>
        <p className="font-serif text-academy-text text-base leading-snug mt-1">{title}</p>
      </div>
      <div className="px-4 sm:px-5 py-4 text-sm text-academy-text">{children}</div>
      <figcaption className="px-4 sm:px-5 py-3 border-t border-academy-border space-y-2 text-xs leading-relaxed">
        <p className="flex gap-2 text-academy-muted">
          <Swatch kind="a" />
          <span>
            <span className="text-academy-text font-semibold">Attested. </span>
            {attested.join('; ')}.
          </span>
        </p>
        <p className="flex gap-2 text-academy-muted">
          <Swatch kind="r" />
          <span>
            <span className="text-academy-text font-semibold">Reconstruction. </span>
            {reconstructed.join('; ')}.
          </span>
        </p>
      </figcaption>
    </figure>
  );
}

/** A compact table. Rows listed in `hot` get a gold wash. */
export function Grid({
  head,
  rows,
  hot = [],
  mono = false,
  caption,
}: {
  head: ReactNode[];
  rows: ReactNode[][];
  hot?: number[];
  mono?: boolean;
  caption?: ReactNode;
}) {
  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className={`w-full border-collapse text-xs ${mono ? 'font-mono' : ''}`}>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th
                  key={i}
                  className="text-left align-bottom text-academy-muted font-semibold uppercase tracking-wider text-[10px] px-2 py-2 border-b border-academy-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={hot.includes(ri) ? { background: gold(0.1) } : undefined}>
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    className={`align-top px-2 py-2 border-b ${ci === 0 ? 'text-academy-text' : 'text-academy-muted'}`}
                    style={{ borderColor: 'rgba(30,50,88,0.6)' }}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="text-academy-muted text-xs italic mt-2">{caption}</p>}
    </div>
  );
}

/** T and F set so the false cells stand out without a second hue. */
export function TV({ v }: { v: 'T' | 'F' | string }) {
  if (v === 'T') return <span className="font-mono text-academy-text">T</span>;
  if (v === 'F') return <span className="font-mono text-academy-gold">F</span>;
  return <span className="font-mono text-academy-muted">{v}</span>;
}

/** A labelled box used in small argument maps. */
export function Box({
  kind,
  label,
  children,
  className = '',
}: {
  kind: Status;
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-3 ${className}`}
      style={{
        border: `1px ${kind === 'a' ? 'solid' : 'dashed'} ${kind === 'a' ? gold(0.53) : gold(0.45)}`,
        background: kind === 'a' ? gold(0.06) : 'transparent',
        borderRadius: 2,
      }}
    >
      {label && (
        <p className="text-academy-gold text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">{label}</p>
      )}
      <div className="text-xs leading-relaxed text-academy-text">{children}</div>
    </div>
  );
}

export function Arrow({ dashed = false, label }: { dashed?: boolean; label?: string }) {
  return (
    <span className="inline-flex flex-col items-center justify-center px-1 text-academy-gold" aria-hidden>
      <span className="flex items-center">
        <span className="block w-5" style={{ borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} ${GOLD}` }} />
        <span className="text-[10px] leading-none -ml-0.5">▸</span>
      </span>
      {label && <span className="text-[9px] text-academy-muted mt-0.5 whitespace-nowrap">{label}</span>}
    </span>
  );
}
