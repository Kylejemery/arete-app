'use client';

import Link from 'next/link';
import GlassCard from '@/components/GlassCard';

/** Shown while the Know Thyself goals field is still empty. */
export default function KnowThyselfNudge() {
  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: '#c9a84c' }}>👤</span>
          <span
            className="text-[10px] tracking-[1.6px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Complete Your Profile
          </span>
        </div>
        <p
          className="text-[14px] leading-relaxed mb-3"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
        >
          The Cabinet&apos;s responses are generic until you tell them who you are. It takes 2 minutes.
        </p>
        <Link
          href="/profile"
          className="text-[10px] tracking-[1.4px] uppercase hover:underline"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Complete Now →
        </Link>
      </div>
    </GlassCard>
  );
}
