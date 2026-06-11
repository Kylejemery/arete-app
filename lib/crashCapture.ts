// Crash capture for diagnosing TestFlight launch crashes (Builds 47/48).
// Installed as a top-level side effect from index.ts so it runs before
// expo-router/entry evaluates — module-eval errors are caught too.
//
// On a fatal JS error this (1) persists the error to AsyncStorage and
// (2) POSTs it to the Railway server, holding the native abort back for up
// to 2.5s so the writes can flush. On the next launch, reportStoredCrash()
// re-sends anything that didn't make it out and surfaces it in an alert.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, ErrorUtils } from 'react-native';

const STORAGE_KEY = 'arete:lastFatalError';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

interface CrashRecord {
  message: string;
  name: string;
  stack: string;
  isFatal: boolean;
  at: string;
  phase: 'crash' | 'previous-launch';
}

function toRecord(error: unknown, isFatal: boolean): CrashRecord {
  const e = error as Error | undefined;
  return {
    message: e?.message ?? String(error),
    name: e?.name ?? 'Unknown',
    stack: e?.stack ?? '',
    isFatal,
    at: new Date().toISOString(),
    phase: 'crash',
  };
}

function postCrash(record: CrashRecord): Promise<unknown> {
  return fetch(`${API_BASE_URL}/api/crash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

function withTimeout(p: Promise<unknown>, ms: number): Promise<unknown> {
  return Promise.race([p, new Promise((resolve) => setTimeout(resolve, ms))]);
}

let installed = false;

export function installCrashCapture() {
  if (installed) return;
  installed = true;

  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const record = toRecord(error, !!isFatal);
    console.error('[GLOBAL ERROR CAUGHT]', 'fatal:', record.isFatal, 'message:', record.message, 'stack:', record.stack);

    const persist = AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record)).catch(() => {});
    const report = postCrash(record).catch(() => {});

    if (!record.isFatal) {
      originalHandler(error, isFatal);
      return;
    }

    // Fatal: the original handler triggers the native abort. Hold it back
    // until the storage write and crash report settle (max 2.5s).
    withTimeout(Promise.all([persist, report]), 2500).then(
      () => originalHandler(error, isFatal),
      () => originalHandler(error, isFatal),
    );
  });
}

// Call once after the root layout mounts: re-sends a crash from the previous
// launch (in case the crash-time POST was cut off by the abort) and shows it
// in an alert so it's readable directly on the TestFlight device.
export async function reportStoredCrash() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const record = JSON.parse(raw) as CrashRecord;
    console.error('[PREVIOUS LAUNCH CRASH]', raw);

    await withTimeout(
      postCrash({ ...record, phase: 'previous-launch' }).catch(() => {}),
      4000,
    );
    await AsyncStorage.removeItem(STORAGE_KEY);

    Alert.alert(
      'Previous launch crashed',
      `${record.name}: ${record.message}\n\n${record.stack.slice(0, 600)}`,
    );
  } catch {
    // Diagnostics must never take the app down.
  }
}

// Install on import so index.ts only needs `import './lib/crashCapture'`.
installCrashCapture();
