'use client';

import Link from 'next/link';

export interface FutureSelfBannerProps {
  onDismiss: () => void;
}

/**
 * "Meet Your Future Self" — shown until Know Thyself is complete, dismissible
 * for the session only (the parent holds the sessionStorage flag).
 */
export default function FutureSelfBanner({ onDismiss }: FutureSelfBannerProps) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))',
        border: '1px solid rgba(201,168,76,0.35)',
      }}
    >
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center text-lg"
        style={{
          width: 44,
          height: 44,
          background: 'rgba(201,168,76,0.15)',
          border: '1px solid rgba(201,168,76,0.3)',
          color: '#c9a84c',
        }}
      >
        ✦
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-[9.5px] tracking-[1.6px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Personalise Your App
        </div>
        <div
          className="text-[15px] leading-snug mt-0.5"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Meet Your Future Self
        </div>
      </div>

      <Link
        href="/onboarding"
        className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] tracking-[1.2px] uppercase font-semibold"
        style={{
          background: 'linear-gradient(135deg, #e3c77a, #8a6f27)',
          color: '#0f1724',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        Begin
      </Link>

      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs"
        style={{ color: '#9aa0a6', background: 'rgba(255,255,255,0.05)' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
