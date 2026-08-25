import type { SubscriptionTier } from '@/lib/types';

/**
 * Deliberately does not write entitlement columns.
 *
 * This used to upsert { tier, is_premium } into profiles straight from the
 * client, which meant the app was granting its own subscription — anyone
 * with the anon key could do the same and hand themselves a paid tier.
 * profiles.tier and profiles.is_premium are now service-role-only.
 *
 * Entitlement is granted server-side: the Stripe webhook
 * (web/src/app/api/stripe-webhook/route.ts) today, and the RevenueCat
 * webhook once mobile purchases land. At that point this call site should
 * become "re-read entitlement from Supabase" rather than "write it".
 */
export async function syncTierToSupabase(tier: SubscriptionTier): Promise<void> {
  console.log(
    `[syncTierToSupabase] no-op for tier "${tier}" — entitlement is granted server-side by webhook.`
  );
}
