'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserCabinet } from '@/lib/db';
import type { Counselor } from '@/lib/types';

export default function CabinetPreview() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserCabinet()
      .then(data => setCounselors(data ?? []))
      .catch(() => setCounselors([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-arete-surface border border-arete-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-arete-text font-semibold text-sm">Your Cabinet</span>
        <Link href="/cabinet/select" className="text-arete-gold text-sm hover:opacity-80">
          Customize →
        </Link>
      </div>

      {/* Horizontal scroll on mobile so chips never wrap into multiple rows */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 -mb-1 md:flex-wrap md:overflow-x-visible md:pb-0 md:mb-0">
        {loading ? (
          <>
            <span className="flex-shrink-0 bg-arete-border/50 animate-pulse rounded-full h-6 w-24" />
            <span className="flex-shrink-0 bg-arete-border/50 animate-pulse rounded-full h-6 w-20" />
            <span className="flex-shrink-0 bg-arete-border/50 animate-pulse rounded-full h-6 w-28" />
          </>
        ) : (
          <>
            {counselors
              .filter(c => c.slug !== 'futureSelf')
              .map(c => (
                <span
                  key={c.slug}
                  className="flex-shrink-0 bg-arete-border text-arete-muted text-xs px-2 py-1 rounded-full"
                >
                  {c.name}
                </span>
              ))}
            <span className="flex-shrink-0 bg-arete-border text-arete-muted text-xs px-2 py-1 rounded-full">
              Future Self
            </span>
          </>
        )}
      </div>
    </div>
  );
}
