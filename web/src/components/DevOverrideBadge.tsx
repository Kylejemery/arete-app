'use client';

import { useEffect, useState } from 'react';
import { getDevPremiumOverride, setDevPremiumOverride, subscribeDevPremiumOverride } from '@/lib/devMode';

// A fixed pill shown while the admin "Simulate free tier" override is on.
// The override lives in memory and is otherwise invisible outside Settings,
// so without this a premium admin sees free-tier limits and locks with no
// hint why. Clicking it clears the override.
export default function DevOverrideBadge() {
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    setOverride(getDevPremiumOverride());
    return subscribeDevPremiumOverride(setOverride);
  }, []);

  if (override === null) return null;

  return (
    <button
      onClick={() => setDevPremiumOverride(null)}
      title="Developer override is on. Click to return to your real tier."
      className="fixed top-3 right-3 z-50 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
      style={{
        background: 'rgba(239,68,68,0.9)',
        color: '#fff',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {override ? 'Simulating premium' : 'Simulating free tier'} · ✕
    </button>
  );
}
