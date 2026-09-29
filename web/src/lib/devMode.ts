// In-memory override for premium status during development.
// Resets to null on every page reload. Never persists.

let _premiumOverride: boolean | null = null;
const _listeners = new Set<(value: boolean | null) => void>();

export function getDevPremiumOverride(): boolean | null {
  return _premiumOverride;
}

export function setDevPremiumOverride(value: boolean | null): void {
  _premiumOverride = value;
  _listeners.forEach(fn => fn(value));
}

// Lets the chrome show that the override is on, so a simulated free tier is
// never mistaken for a real one. Returns the unsubscribe function.
export function subscribeDevPremiumOverride(fn: (value: boolean | null) => void): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true';
}
