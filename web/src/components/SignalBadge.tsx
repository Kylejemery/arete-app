import type { MarketSignal } from '@/lib/types';

interface SignalBadgeProps {
  signal: MarketSignal;
}

/**
 * SignalBadge — displays a single insider-trading signal as a compact badge.
 * Only rendered when the signal is firing (score ≥ 60). The badge colour
 * reflects the signal intensity: red for high (≥80), yellow for moderate (60–79).
 */
export default function SignalBadge({ signal }: SignalBadgeProps) {
  if (!signal.firing) return null;

  const isHigh = signal.score >= 80;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
        isHigh
          ? 'bg-red-900/60 text-red-300 border border-red-700'
          : 'bg-yellow-900/60 text-yellow-300 border border-yellow-700'
      }`}
    >
      <span>{isHigh ? '🔴' : '🟡'}</span>
      {signal.label}
    </span>
  );
}
