import { useSubscription } from '@/lib/useSubscription';
import type { SubscriptionTier } from '@/lib/types';

// Only free tier enforces a local daily message cap.
// Paid tiers are gated server-side and show no counter.
const MAX_MESSAGES_BY_TIER: Record<SubscriptionTier, number | null> = {
  free: 10,
  premium: null,
  pro: null,
};

// Thin view over the shared tier store in lib/useSubscription, so the Cabinet
// tab, counselor chat, and journal pick up a web purchase on foreground or
// when the checkout browser closes — the old one-shot read left them on the
// free tier until the app restarted.
export function useTierLimits(): { tier: SubscriptionTier; maxMessages: number | null } {
  const { tier } = useSubscription();
  return { tier, maxMessages: MAX_MESSAGES_BY_TIER[tier] ?? null };
}
