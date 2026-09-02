'use client';

import type { ReactNode } from 'react';
import { EVENING_COLOR, MORNING_COLOR } from './types';

/** A titled card. The one container every Progress section sits in. */
export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 gap-3">
          {title && (
            <h2 className="text-[13px] tracking-[1.4px] uppercase" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Big gold number over a two-line mono label. */
export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div
      className="rounded-xl px-2 py-4 text-center"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="text-[22px] font-semibold leading-none" style={{ color: '#c9a84c' }}>
        {value}
      </div>
      <div
        className="text-[9.5px] tracking-[1.2px] uppercase mt-2 leading-[1.4] whitespace-pre-line"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
      >
        {label}
      </div>
    </div>
  );
}

/** The streak / books-finished hero: emoji, a very large gold number, a label. */
export function HeroCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: ReactNode;
  label: string;
}) {
  return (
    <div
      className="rounded-xl py-7 text-center"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(201,168,76,0.22)',
      }}
    >
      <div className="text-[26px] leading-none mb-2">{emoji}</div>
      <div className="text-[52px] font-semibold leading-none" style={{ color: '#c9a84c' }}>
        {value}
      </div>
      <div
        className="text-[10px] tracking-[2px] uppercase mt-3"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
      >
        {label}
      </div>
    </div>
  );
}

/** Morning ☀️ / Evening 🌙 dot legend, repeated under both grids as on mobile. */
export function DotLegend() {
  return (
    <div className="flex gap-5 justify-center mt-4">
      {[
        { color: MORNING_COLOR, label: 'Morning ☀️' },
        { color: EVENING_COLOR, label: 'Evening 🌙' },
      ].map(item => (
        <span key={item.label} className="flex items-center gap-2 text-[11px]" style={{ color: '#9aa0a6' }}>
          <span className="inline-block w-[7px] h-[7px] rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** The two routine dots, filled when that routine was completed. */
export function RoutineDots({ morning, evening }: { morning: boolean; evening: boolean }) {
  return (
    <div className="flex gap-[3px] justify-center">
      <span
        className="inline-block w-[6px] h-[6px] rounded-full"
        style={{ background: morning ? MORNING_COLOR : 'rgba(255,255,255,0.10)' }}
      />
      <span
        className="inline-block w-[6px] h-[6px] rounded-full"
        style={{ background: evening ? EVENING_COLOR : 'rgba(255,255,255,0.10)' }}
      />
    </div>
  );
}

/** The uppercase mono eyebrow + serif headline every v2 page opens with. */
export function PageTitle({
  eyebrow,
  line1,
  line2,
}: {
  eyebrow: string;
  line1: string;
  line2: string;
}) {
  return (
    <div className="px-5 pt-3 pb-5">
      <div
        className="text-[10px] tracking-[1.8px] uppercase mb-1"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        {eyebrow}
      </div>
      <h1
        className="text-[32px] font-medium leading-none tracking-tight"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
      >
        {line1}
        <br />
        <em style={{ color: '#c9a84c' }}>{line2}</em>
      </h1>
    </div>
  );
}
