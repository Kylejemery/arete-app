// Crash + boot diagnostics for the TestFlight launch failures (Builds 47-51).
//
// Build 51 taught us that at crash time during early boot, async I/O
// (AsyncStorage, fetch, even setTimeout) may never complete — the app froze
// on the splash screen and no report escaped. So this version:
//   - shows the error in a native Alert immediately (no React tree needed)
//   - retries the server POST on a loop while the app sits there
//   - suppresses the native abort for fatal errors in the launch window so
//     the alert stays readable and the retries get a chance to run
//   - sends boot breadcrumbs so a silent hang (no JS error at all) still
//     tells us where boot stopped
//
// Module-eval footprint is deliberately tiny: only ErrorUtils is touched at
// import time; AsyncStorage and Alert are require()d lazily at use time so
// this file can load before expo initializes without side effects.
import { ErrorUtils } from 'react-native';

const STORAGE_KEY = 'arete:lastFatalError';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const LAUNCH_WINDOW_MS = 20000;
const moduleLoadedAt = Date.now();

interface CrashRecord {
  message: string;
  name: string;
  stack: string;
  isFatal: boolean;
  at: string;
  phase: string;
}

function post(record: CrashRecord): Promise<unknown> {
  return fetch(`${API_BASE_URL}/api/crash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
}

// Fire-and-forget boot marker. If boot hangs with no JS error, the last
// breadcrumb that reaches the server tells us where it stopped.
export function breadcrumb(label: string) {
  try {
    post({
      message: label,
      name: 'Breadcrumb',
      stack: '',
      isFatal: false,
      at: new Date().toISOString(),
      phase: 'boot',
    }).catch(() => {});
  } catch {
    // fetch may not exist yet in exotic environments; never let
    // diagnostics break boot.
  }
}

function showAlert(record: CrashRecord) {
  try {
    // Lazy require: Alert talks straight to native and works without React.
    const { Alert } = require('react-native');
    Alert.alert(
      'Fatal JS error',
      `${record.name}: ${record.message}\n\n${record.stack.slice(0, 800)}`,
    );
  } catch {}
}

function persist(record: CrashRecord) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record)).catch(() => {});
  } catch {}
}

// Keep trying to get the report out while the app sits on the splash
// screen — the network stack may come up seconds after the error fired.
function reportWithRetries(record: CrashRecord, attemptsLeft: number) {
  if (attemptsLeft <= 0) return;
  try {
    post(record).catch(() => {
      try {
        setTimeout(() => reportWithRetries(record, attemptsLeft - 1), 3000);
      } catch {}
    });
  } catch {
    try {
      setTimeout(() => reportWithRetries(record, attemptsLeft - 1), 3000);
    } catch {}
  }
}

let installed = false;

export function installCrashCapture() {
  if (installed) return;
  installed = true;

  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const e = error as Error | undefined;
    const record: CrashRecord = {
      message: e?.message ?? String(error),
      name: e?.name ?? 'Unknown',
      stack: e?.stack ?? '',
      isFatal: !!isFatal,
      at: new Date().toISOString(),
      phase: 'crash',
    };
    console.error('[GLOBAL ERROR CAUGHT]', 'fatal:', record.isFatal, 'message:', record.message, 'stack:', record.stack);

    persist(record);
    reportWithRetries(record, 10);

    if (!record.isFatal) {
      originalHandler(error, isFatal);
      return;
    }

    showAlert(record);

    // Diagnostic build: a fatal error in the launch window would normally
    // abort before any of the above flushes. Swallow the abort so the alert
    // is readable on-device and the POST retries can run. Fatal errors
    // after launch still abort (delayed so the report can flush first).
    if (Date.now() - moduleLoadedAt < LAUNCH_WINDOW_MS) return;
    try {
      setTimeout(() => originalHandler(error, isFatal), 2500);
    } catch {
      originalHandler(error, isFatal);
    }
  });
}

// Call once after the root layout mounts: re-sends a crash from the previous
// launch and shows it in an alert so it's readable on the TestFlight device.
export async function reportStoredCrash() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const record = JSON.parse(raw) as CrashRecord;
    console.error('[PREVIOUS LAUNCH CRASH]', raw);

    await post({ ...record, phase: 'previous-launch' }).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY);

    const { Alert } = require('react-native');
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
breadcrumb('entry: crashCapture loaded, expo-router/entry next');
