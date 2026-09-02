'use client';

import StreakArc from '@/components/StreakArc';

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export function numberToWords(n: number): string {
  if (n <= 0) return 'Zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10].toLowerCase() : '');
  return n.toString();
}

export interface StreakCardProps {
  streak: number;
  /** Nothing painted yet (no cache, no fetch) — show the skeleton. */
  loading?: boolean;
}

export default function StreakCard({ streak, loading = false }: StreakCardProps) {
  if (loading) {
    return (
      <div
        className="rounded-xl"
        style={{
          height: 104,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          opacity: 0.4,
        }}
      />
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <StreakArc day={streak} />
      <div className="flex-1 min-w-0">
        <div
          className="text-[9.5px] tracking-[1.6px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Days of Discipline
        </div>
        <div
          className="text-[19px] mt-1 leading-snug tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          {streak <= 0
            ? 'Begin today.'
            : streak === 1
              ? 'One day in a row.'
              : `${numberToWords(streak)} days in a row.`}
        </div>
        <div
          className="italic text-[13px] mt-1"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
        >
          Keep the chain unbroken.
        </div>
      </div>
    </div>
  );
}
