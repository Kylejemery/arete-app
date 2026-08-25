import { Platform } from 'react-native';
import type { SubscriptionTier } from '@/lib/types';

/**
 * RevenueCat integration — core SDK only.
 *
 * Deliberately does NOT use react-native-purchases-ui. That package is what
 * actually broke the New Architecture build in May 2026 (see d64b58d); the
 * paywall screen here is hand-built, so it was never needed. Do not add it.
 *
 * Every entry point is defensive: the SDK is required lazily and each call is
 * wrapped, so a misconfigured or unavailable RevenueCat degrades to "no
 * products, free tier" rather than taking down app launch.
 */

// Lazy require — keeps web and any environment without the native module
// from throwing at import time.
let Purchases: any = null;
let loadAttempted = false;

function getPurchases(): any | null {
  if (!loadAttempted) {
    loadAttempted = true;
    try {
      Purchases = require('react-native-purchases').default;
    } catch {
      console.log('[purchases] native module unavailable — IAP disabled');
      Purchases = null;
    }
  }
  return Purchases;
}

/** RevenueCat entitlement identifier → canonical Arete tier. */
const ENTITLEMENT_TIERS: { entitlement: string; tier: SubscriptionTier }[] = [
  { entitlement: 'arete_pro', tier: 'pro' },
  { entitlement: 'arete', tier: 'premium' },
];

function apiKey(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
}

export function isPurchasesAvailable(): boolean {
  return Platform.OS !== 'web' && !!getPurchases() && !!apiKey();
}

let configuredFor: string | null = null;

/**
 * Configure the SDK against the Supabase user id. appUserID is what lets the
 * RevenueCat webhook attribute a purchase back to an Arete account, so it
 * must be the Supabase id and nothing else. Safe to call repeatedly; only
 * reconfigures when the user actually changes.
 */
export function configurePurchases(userId: string): void {
  if (configuredFor === userId) return;
  const sdk = getPurchases();
  const key = apiKey();
  if (!sdk || !key) {
    console.log('[purchases] configure skipped — SDK or API key missing');
    return;
  }
  try {
    sdk.configure({ apiKey: key, appUserID: userId });
    configuredFor = userId;
    console.log('[purchases] configured');
  } catch (e) {
    // Never fatal: a failure here must not block launch.
    console.error('[purchases] configure failed:', e);
  }
}

/** Highest tier the user currently holds according to RevenueCat. */
export function tierFromCustomerInfo(customerInfo: any): SubscriptionTier {
  const active = customerInfo?.entitlements?.active ?? {};
  for (const { entitlement, tier } of ENTITLEMENT_TIERS) {
    if (active[entitlement]) return tier;
  }
  return 'free';
}

export interface PurchasePackage {
  identifier: string;
  productId: string;
  priceString: string;
  rcPackage: any;
}

/**
 * Flatten the current offering into the packages the paywall renders.
 * Returns [] when RevenueCat is unavailable — the paywall falls back to its
 * static price display and disables the Subscribe button.
 */
export async function getAvailablePackages(): Promise<PurchasePackage[]> {
  const sdk = getPurchases();
  if (!sdk) return [];
  try {
    const offerings = await sdk.getOfferings();
    const packages = offerings?.current?.availablePackages ?? [];
    return packages.map((p: any) => ({
      identifier: p.identifier,
      productId: p.product?.identifier ?? '',
      priceString: p.product?.priceString ?? '',
      rcPackage: p,
    }));
  } catch (e) {
    console.warn('[purchases] getOfferings failed:', e);
    return [];
  }
}

export class PurchaseCancelledError extends Error {}

/**
 * Buy a package. Throws PurchaseCancelledError when the user backs out so the
 * caller can stay silent instead of showing an error.
 */
export async function purchasePackage(pkg: PurchasePackage): Promise<SubscriptionTier> {
  const sdk = getPurchases();
  if (!sdk) throw new Error('In-app purchases are unavailable.');
  try {
    const { customerInfo } = await sdk.purchasePackage(pkg.rcPackage);
    return tierFromCustomerInfo(customerInfo);
  } catch (e: any) {
    if (e?.userCancelled || e?.code === 'PURCHASE_CANCELLED') {
      throw new PurchaseCancelledError('cancelled');
    }
    throw e;
  }
}

export async function restorePurchases(): Promise<SubscriptionTier> {
  const sdk = getPurchases();
  if (!sdk) throw new Error('In-app purchases are unavailable.');
  const customerInfo = await sdk.restorePurchases();
  return tierFromCustomerInfo(customerInfo);
}

/** Current entitlement straight from RevenueCat, without a purchase. */
export async function getCurrentTier(): Promise<SubscriptionTier> {
  const sdk = getPurchases();
  if (!sdk) return 'free';
  try {
    return tierFromCustomerInfo(await sdk.getCustomerInfo());
  } catch {
    return 'free';
  }
}
