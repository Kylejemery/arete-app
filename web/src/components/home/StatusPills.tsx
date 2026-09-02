'use client';

import Link from 'next/link';

export interface StatusPillsProps {
  morningDone: boolean;
  eveningDone: boolean;
}

const PILL_BASE =
  'flex-1 flex flex-col items-center gap-1 py-3 rounded-full transition-colors';

function pillStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: 'rgba(201,168,76,0.10)', border: '1px solid #c9a84c' }
    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' };
}

function labelStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-mono, monospace)',
    color: active ? '#c9a84c' : '#5a6270',
  };
}

/**
 * Morning / Cabinet / Evening. The Cabinet pill is always rendered active —
 * it is always open, there is nothing to complete.
 */
export default function StatusPills({ morningDone, eveningDone }: StatusPillsProps) {
  const pills: { href: string; emoji: string; label: string; active: boolean }[] = [
    { href: '/morning', emoji: '☀️', label: 'Morning', active: morningDone },
    { href: '/cabinet', emoji: '🏛️', label: 'Cabinet', active: true },
    { href: '/evening', emoji: '🌙', label: 'Evening', active: eveningDone },
  ];

  return (
    <div className="flex gap-2.5">
      {pills.map((p) => (
        <Link key={p.href} href={p.href} className={PILL_BASE} style={pillStyle(p.active)}>
          <span className="text-[18px] leading-none">{p.emoji}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.6px]"
            style={labelStyle(p.active)}
          >
            {p.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
