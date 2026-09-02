'use client';

import { SectionCard } from './primitives';

const MILESTONES = [
  { days: 7, label: '7 Day Streak', icon: '🔥' },
  { days: 30, label: '30 Day Streak', icon: '⚡' },
  { days: 60, label: '60 Day Streak', icon: '💎' },
  { days: 100, label: '100 Day Streak', icon: '👑' },
  { days: 365, label: '365 Day Streak', icon: '🏆' },
];

export default function MilestonesCard({ streak }: { streak: number }) {
  return (
    <SectionCard title="Milestones">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MILESTONES.map(m => {
          const earned = streak >= m.days;
          return (
            <div
              key={m.days}
              className="rounded-xl px-3 py-3 flex items-center gap-2"
              style={{
                background: earned ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)',
                border: earned ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-[18px] leading-none">{m.icon}</span>
              <span className="text-[12px] leading-tight flex-1" style={{ color: earned ? '#c9a84c' : '#9aa0a6' }}>
                {m.label}
              </span>
              {earned && (
                <span aria-hidden className="text-[13px]" style={{ color: '#c9a84c' }}>
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
