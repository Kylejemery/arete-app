'use client';

import Link from 'next/link';
import { useEntitlement } from '@/lib/entitlement';
import { Card, CardLabel } from '@/components/ui/Card';

// What the free standing includes, so the locked card can say precisely what
// is open rather than only what is closed.
const FREE_INCLUDES = [
  'PHIL 701 — The Art of Living',
  'The Lexicon and the Vocab Drill',
  'The Daily Examination',
  'The Courtyard',
  'The Library — every primary text, in full',
];

interface PremiumGateProps {
  /** What the reader was reaching for, e.g. "PHIL 702". */
  feature: string;
  /** One line on what it is. */
  description?: string;
  children: React.ReactNode;
}

/**
 * Wraps a premium surface. Renders the children for Premium, Pro, and admin;
 * everyone else sees a locked card that names the feature and what the free
 * standing already includes, with the upgrade path on the profile page.
 */
export function PremiumGate({ feature, description, children }: PremiumGateProps) {
  const { isPremium, isAdmin, loading } = useEntitlement();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-academy-muted italic text-sm">Checking your standing…</p>
      </div>
    );
  }

  if (isPremium || isAdmin) return <>{children}</>;

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Card gold>
        <CardLabel>Premium standing</CardLabel>
        <h1 className="font-serif text-3xl text-academy-text mb-2">{feature}</h1>
        {description && (
          <p className="text-academy-muted text-sm leading-relaxed mb-5">{description}</p>
        )}
        <p className="text-academy-text text-sm leading-relaxed mb-5">
          This part of the Academy is for Arete Premium members. Your free standing already includes:
        </p>
        <ul className="text-academy-muted text-sm space-y-1.5 mb-6">
          {FREE_INCLUDES.map(line => (
            <li key={line} className="flex gap-2"><span className="text-academy-gold">✓</span><span>{line}</span></li>
          ))}
        </ul>
        <Link
          href="/dashboard/profile#upgrade"
          className="inline-block bg-academy-gold text-academy-bg font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          Upgrade to Premium
        </Link>
        <p className="text-academy-muted text-xs mt-3 italic">
          New members start with a 7-day free trial. Cancel anytime.
        </p>
      </Card>
    </div>
  );
}
