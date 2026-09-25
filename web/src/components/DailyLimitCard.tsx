'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logEvent } from '@/lib/events';
import { upgradeHref, type PaywallSource } from '@/lib/paywall';

// The free tier's daily message cap, said plainly, with the offer attached.
// Rendered above the composer when the server refuses a message with
// 403 daily_limit_reached (or the user arrives with none left). The user's
// unsent text stays in the box underneath. Web port of the limit card in
// app/(tabs)/cabinet.tsx; copy from the conversion audit, section 5.2.
// Activation 7.1: counselorName makes it "Keep talking with Marcus", and
// onContinue lets the page keep the unsent message and remember where to
// come back to before it leaves for /upgrade.
export default function DailyLimitCard({ source, limit = 10, counselorName = null, onContinue }: {
  source: PaywallSource;
  limit?: number;
  counselorName?: string | null;
  onContinue?: () => void;
}) {
  // One gate_hit and one paywall_viewed per time the card appears. The server
  // logs its own gate_hit for the refused request (origin: 'server'); this one
  // records that the user actually saw the explanation.
  useEffect(() => {
    logEvent('gate_hit', { source, reason: 'daily_limit_reached', blocked: true, origin: 'client' });
    logEvent('paywall_viewed', { source, surface: 'limit_card', tier_at_view: 'free' });
  }, [source]);

  return (
    <div
      className="mx-4 mb-2 px-5 py-4 flex-shrink-0 text-center"
      role="status"
      style={{
        background: 'rgba(201,168,76,0.08)',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: 16,
      }}
    >
      <p
        className="text-[18px] leading-snug mb-1"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
      >
        Keep talking with {counselorName || 'your Cabinet'}.
      </p>
      <p className="text-[13px] leading-relaxed mb-2" style={{ color: '#9aa0a6' }}>
        You&apos;ve used today&apos;s {limit} free messages, and this conversation isn&apos;t finished. It&apos;s
        saved exactly where you left off, your unsent message included. Premium picks it up from here.
      </p>
      <p className="text-[13px] font-semibold mb-3" style={{ color: '#c9a84c' }}>
        Try it free for 7 days. Cancel any time.
      </p>
      <Link
        href={upgradeHref(source)}
        onClick={() => onContinue?.()}
        className="inline-block w-full font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        style={{ background: '#c9a84c', color: '#0f1724' }}
      >
        Continue this conversation
      </Link>
      <p className="text-[11px] mt-2" style={{ color: '#6b7280' }}>
        Resets at midnight.
      </p>
    </div>
  );
}
