// Crash + boot diagnostics for the TestFlight launch failures (Builds 47-52).
//
// Lessons so far:
//   - Build 51: at early boot, AsyncStorage/fetch/setTimeout callbacks may
//     never complete, so a one-shot report is lost.
//   - Build 52: even a native Alert + 10 fetch retries produced silence, so
//     channels can stay dead for a while (or forever) after a boot fatal.
//
// This version assumes NOTHING works reliably and brute-forces every
// channel, forever:
//   - index.ts catches module-graph errors SYNCHRONOUSLY (require in
//     try/catch) and hands them to reportBootFatal — no ErrorUtils needed.
//   - reportBootFatal fires the first Alert/POST/persist dispatches
//     synchronously, hides the splash screen (a visible signal that the
//     fatal path ran, even if every other channel fails), then retries the
//     POST every 3s indefinitely and re-alerts at ~9s and ~27s.
//   - heartbeats every 5s for 2 minutes tell us whether the event loop and
//     network are alive at all, independent of any error.
//   - a crash persisted by a previous launch is replayed at entry, with
//     retries until the server confirms receipt.
// NOTE: no imports at module scope, on purpose. In particular, ErrorUtils is
// a runtime GLOBAL installed by RN's polyfills — it is NOT an export of the
// 'react-native' package in RN 0.85. `import { ErrorUtils } from
// 'react-native'` quietly yields undefined, and calling .getGlobalHandler()
// on it at module scope WAS the launch crash from Build 43 through Build 54
// ("[runtime not ready]: TypeError: Cannot read property 'getGlobalHandler'
// of undefined" in the device syslog).
type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsGlobal {
  getGlobalHandler: () => GlobalErrorHandler;
  setGlobalHandler: (handler: GlobalErrorHandler) => void;
}

const STORAGE_KEY = 'arete:lastFatalError';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const LAUNCH_WINDOW_MS = 20000;
const moduleLoadedAt = Date.now();
// Groups all reports from one process launch when reading the server log.
const launchId = Math.random().toString(36).slice(2, 8);

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
    body: JSON.stringify({ ...record, launchId }),
  });
}

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
  } catch {}
}

function toRecord(error: unknown, isFatal: boolean, phase: string): CrashRecord {
  const e = error as Error | undefined;
  return {
    message: e?.message ?? String(error),
    name: e?.name ?? 'Unknown',
    stack: e?.stack ?? '',
    isFatal,
    at: new Date().toISOString(),
    phase,
  };
}

function showAlert(title: string, record: CrashRecord) {
  try {
    // Lazy require: Alert talks straight to native and works without React.
    const { Alert } = require('react-native');
    Alert.alert(title, `${record.name}: ${record.message}\n\n${record.stack.slice(0, 800)}`);
  } catch {}
}

function persist(record: CrashRecord) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record)).catch(() => {});
  } catch {}
}

function hideSplash() {
  try {
    // Visible signal that the fatal path executed: the splash vanishing to a
    // blank screen means "boot fatal fired" even if no other channel works.
    const SplashScreen = require('expo-splash-screen');
    SplashScreen.hideAsync().catch(() => {});
  } catch {}
}

// POST until the server confirms receipt. Never gives up: if the network
// stack revives minutes later, the report still escapes.
function postUntilDelivered(record: CrashRecord, onDelivered?: () => void, attempt = 1) {
  try {
    post(record).then(
      () => onDelivered?.(),
      () => {
        try {
          setTimeout(() => postUntilDelivered(record, onDelivered, attempt + 1), 3000);
        } catch {}
      },
    );
  } catch {
    try {
      setTimeout(() => postUntilDelivered(record, onDelivered, attempt + 1), 3000);
    } catch {}
  }
}

// Synchronous handler for module-graph evaluation errors (called from the
// try/catch in index.ts). Everything here that CAN run synchronously does,
// before any reliance on the event loop.
export function reportBootFatal(error: unknown) {
  const record = toRecord(error, true, 'boot-fatal');
  console.error('[BOOT FATAL]', record.message, record.stack);

  persist(record);
  showAlert('Fatal boot error', record);
  hideSplash();
  postUntilDelivered(record);

  // Re-alert later in case the first dialog fired before native could
  // present it. Same content; whichever lands first is readable.
  try {
    setTimeout(() => showAlert('Fatal boot error (retry)', record), 9000);
    setTimeout(() => showAlert('Fatal boot error (retry 2)', record), 27000);
  } catch {}
}

function replayStoredCrash() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem(STORAGE_KEY).then((raw: string | null) => {
      if (!raw) return;
      const record = JSON.parse(raw) as CrashRecord;
      console.error('[PREVIOUS LAUNCH CRASH]', raw);
      postUntilDelivered({ ...record, phase: 'previous-launch' }, () => {
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      });
      showAlert('Previous launch crashed', record);
    }).catch(() => {});
  } catch {}
}

function startHeartbeats() {
  let seq = 0;
  try {
    const interval = setInterval(() => {
      seq += 1;
      breadcrumb(`heartbeat ${seq} (uptime ${Date.now() - moduleLoadedAt}ms)`);
      if (seq >= 24) clearInterval(interval); // 2 minutes, then stop
    }, 5000);
  } catch {}
}

let bootDiagnosticsStarted = false;

// Which JavaScript is actually running: the bundle embedded in the build, or
// an over-the-air update (and which one). Written as a breadcrumb so the
// crash_reports table answers "did the update land on that phone?" without
// guessing from behaviour. Wrapped because expo-updates throws in Expo Go
// and dev builds.
function updateIdentity(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates') as {
      isEmbeddedLaunch?: boolean; updateId?: string | null;
      runtimeVersion?: string | null; channel?: string | null; createdAt?: Date | null;
    };
    const which = Updates.isEmbeddedLaunch
      ? 'embedded bundle'
      : `update ${Updates.updateId ?? '?'}${Updates.createdAt ? ` published ${Updates.createdAt.toISOString()}` : ''}`;
    return `updates: ${which} · runtime ${Updates.runtimeVersion ?? '?'} · channel ${Updates.channel ?? '?'}`;
  } catch {
    return 'updates: expo-updates unavailable';
  }
}

export function startBootDiagnostics() {
  if (bootDiagnosticsStarted) return;
  bootDiagnosticsStarted = true;
  installCrashCapture();
  breadcrumb('entry: crashCapture loaded, app graph next');
  breadcrumb(updateIdentity());
  replayStoredCrash();
  startHeartbeats();
}

let installed = false;

// ErrorUtils path for fatals OUTSIDE module-graph eval (after boot, or
// thrown from async callbacks during boot).
export function installCrashCapture() {
  if (installed) return;
  installed = true;

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsGlobal }).ErrorUtils;
  if (!errorUtils) {
    breadcrumb('ErrorUtils global missing; global handler not installed');
    return;
  }

  const originalHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error, isFatal) => {
    const record = toRecord(error, !!isFatal, 'crash');
    console.error('[GLOBAL ERROR CAUGHT]', 'fatal:', record.isFatal, 'message:', record.message, 'stack:', record.stack);

    persist(record);
    postUntilDelivered(record);

    if (!record.isFatal) {
      originalHandler(error, isFatal);
      return;
    }

    showAlert('Fatal JS error', record);

    // Diagnostic build: swallow the abort during the launch window so the
    // alert stays readable and the POST retries keep running.
    if (Date.now() - moduleLoadedAt < LAUNCH_WINDOW_MS) return;
    try {
      setTimeout(() => originalHandler(error, isFatal), 2500);
    } catch {
      originalHandler(error, isFatal);
    }
  });
}
