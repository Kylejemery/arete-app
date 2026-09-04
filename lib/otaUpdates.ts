import * as Updates from 'expo-updates';
import { breadcrumb } from '@/lib/crashCapture';

// expo-updates checks for a new bundle only at cold start and applies it on
// the launch after that, so a phone that is mostly backgrounded can sit on
// old JavaScript for days. This asks for an update whenever the app comes to
// the foreground and downloads it in the background; it still applies on the
// next cold start, so nothing reloads under the user. No-ops in dev builds
// and Expo Go, where the Updates API is unavailable.
let inFlight = false;

export async function fetchUpdateInBackground(): Promise<void> {
  if (__DEV__ || inFlight || !Updates.isEnabled) return;
  inFlight = true;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    breadcrumb(`updates: fetching ${check.manifest && 'id' in check.manifest ? check.manifest.id : 'new update'}`);
    const result = await Updates.fetchUpdateAsync();
    breadcrumb(`updates: ${result.isNew ? 'downloaded, applies on next launch' : 'already have it'}`);
  } catch (e) {
    breadcrumb(`updates: check failed — ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    inFlight = false;
  }
}
