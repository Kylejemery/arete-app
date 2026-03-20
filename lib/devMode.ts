// In-memory override for premium status during development.
// Resets to null on every app restart. Never persists.

let _premiumOverride: boolean | null = null;

export function getDevPremiumOverride(): boolean | null {
  return _premiumOverride;
}

export function setDevPremiumOverride(value: boolean | null): void {
  _premiumOverride = value;
}

export function isDevMode(): boolean {
  return process.env.EXPO_PUBLIC_DEV_MODE === 'true';
}
