// Minimum supported build. The server names the oldest iOS build it still
// supports (GET /api/app/min-build, set by MIN_IOS_BUILD on Railway); a build
// below it shows the mandatory update screen (components/UpdateGate.tsx).
//
// Fails open: no answer, a slow answer, or a build number that cannot be read
// lets the user in. A wrong gate locks people out of the app, which is worse
// than an old build hitting an error.
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_STORE_URL = 'https://apps.apple.com/us/app/arete-know-thyself/id6762371595';
const TIMEOUT_MS = 5000;

export interface UpdateRequirement {
  currentBuild: number;
  minBuild: number;
  storeUrl: string;
}

// The build compiled into this binary (CFBundleVersion, the EAS build number).
// Not app.json's ios.buildNumber, which EAS remote versioning leaves stale.
export function currentIosBuild(): number | null {
  const n = Number(Application.nativeBuildVersion);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function isBelowMinimum(currentBuild: number | null, minBuild: unknown): boolean {
  if (currentBuild == null) return false;
  if (typeof minBuild !== 'number' || !Number.isInteger(minBuild) || minBuild <= 0) return false;
  return currentBuild < minBuild;
}

// Resolves to the requirement when this build must update, else null.
export async function checkUpdateRequired(): Promise<UpdateRequirement | null> {
  if (Platform.OS !== 'ios') return null;
  const currentBuild = currentIosBuild();
  if (currentBuild == null) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/app/min-build`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const minBuild = data?.ios?.minBuild;
    if (!isBelowMinimum(currentBuild, minBuild)) return null;
    const storeUrl = typeof data?.ios?.storeUrl === 'string' && data.ios.storeUrl.startsWith('https://')
      ? data.ios.storeUrl
      : FALLBACK_STORE_URL;
    return { currentBuild, minBuild, storeUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
