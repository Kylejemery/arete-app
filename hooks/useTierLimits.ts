import { useEffect, useState } from 'react';
import { getSubscriptionTier } from '@/lib/db';
import type { SubscriptionTier } from '@/lib/types';

// Only free tier enforces a local daily message cap.
// Paid tiers are gated server-side and show no counter.
const MAX_MESSAGES_BY_TIER: Record<SubscriptionTier, number | null> = {
  free: 3,
  arete: null,
  pro: null,
};

export function useTierLimits(): { tier: SubscriptionTier; maxMessages: number | null } {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [maxMessages, setMaxMessages] = useState<number | null>(3);

  useEffect(() => {
    getSubscriptionTier().then(t => {
      setTier(t);
      setMaxMessages(MAX_MESSAGES_BY_TIER[t] ?? null);
    });
  }, []);

  return { tier, maxMessages };
}
