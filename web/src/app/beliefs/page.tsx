'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

/**
 * Placeholder. The Belief Journal is being rebuilt as the three-stage
 * Socratic dialogue the mobile app runs (raw thought → questioning →
 * refined statement + Stoic virtue check → encoded belief, stored in
 * journal_entries with type='belief'). The old CRUD page wrote columns the
 * `beliefs` table does not have, so it has been removed rather than left
 * silently failing.
 */
export default function BeliefsPage() {
  return (
    <div className="min-h-screen p-6 md:p-8">
      <PageHeader title="Belief Journal" subtitle="Articulate what you actually believe." />
      <div
        className="mt-8 max-w-xl rounded-xl p-8"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p
          className="text-[11px] tracking-[2px] uppercase mb-3"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          In progress
        </p>
        <p
          className="text-[17px] leading-relaxed"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          The Belief Journal is being rebuilt.
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: '#9aa0a6' }}>
          It is returning as the three-stage Socratic dialogue: you bring a half-formed belief,
          the Cabinet questions it, and what survives is written down and checked against the
          four cardinal virtues. Nothing you have written has been lost.
        </p>
        <Link
          href="/journal"
          className="inline-block mt-6 text-sm underline underline-offset-4"
          style={{ color: '#c9a84c' }}
        >
          Go to the Journal
        </Link>
      </div>
    </div>
  );
}
