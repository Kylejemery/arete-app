import AgeGate from '../components/AgeGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { breadcrumb, startBootDiagnostics } from '@/lib/crashCapture';
import { markNotificationNavigation } from '@/lib/launchIntent';
import { setupDispatchNotifications } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useRootNavigationState } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { seedFromNotification, seedMissedCounselorLines } from '@/lib/counselorLines';
import { logEvent } from '@/lib/events';
import { fetchUpdateInBackground } from '@/lib/otaUpdates';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Normally started by index.ts before anything else loads; this is a
// safety net for environments that bypass the custom entry (e.g. web).
startBootDiagnostics();

// This tells Expo Router to use our ErrorBoundary for the root route
export { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SessionContext = createContext<Session | null | undefined>(undefined);
SessionContext.displayName = 'SessionContext';

export function useSession() {
  return useContext(SessionContext);
}

/**
 * Routes the `arete://join-session?token=...` deep link (the bounce target of
 * the email invite's /api/sessions/join redirect) to the join-session screen.
 * Gated on navigation readiness; replace() keeps it idempotent if expo-router
 * has already auto-routed the same URL.
 */
function DeepLinkHandler() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const url = Linking.useURL();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!navState?.key) return; // navigation tree not mounted yet
    if (!url || handledRef.current === url) return;
    const parsed = Linking.parse(url);
    if (parsed.path === 'join-session' && parsed.queryParams?.token) {
      handledRef.current = url;
      breadcrumb('deep link: join-session');
      router.replace({ pathname: '/join-session', params: { token: String(parsed.queryParams.token) } } as any);
    }
  }, [url, navState?.key, router]);

  return null;
}

/**
 * Routes a tapped Daily Dispatch push notification to the full dispatch reader.
 * Registered once the navigation tree is mounted; also handles the cold-start
 * case where the app was launched by tapping the notification.
 */
function NotificationTapHandler() {
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return; // navigation tree not mounted yet

    // Counselor reminders, Attend nudges and broadcasts are messages FROM a
    // counselor: seed the line into the Cabinet thread (once per delivery) so
    // the notification becomes the opening of a conversation the user can
    // continue in the chat. Lines that fired while the app was closed and
    // were never tapped are recovered on every foreground (see
    // lib/counselorLines): the badge on the icon must always have its
    // message waiting in the Cabinet.
    const seed = async (notification: Notifications.Notification | null | undefined) => {
      if (await seedFromNotification(notification)) breadcrumb('notification seeded into cabinet thread');
    };
    const recover = () => {
      seedMissedCounselorLines()
        .then(n => { if (n > 0) breadcrumb(`recovered ${n} missed counselor line(s) into cabinet thread`); })
        .catch(() => {});
    };
    recover();

    // Everything below is notification plumbing, which web has none of. The
    // broadcast sweep inside recover() is not — a broadcast is owed whether or
    // not the platform can carry a notification — so it runs above this guard.
    if (Platform.OS === 'web') return;

    const route = (data: any) => {
      if (data?.type === 'daily_dispatch') {
        breadcrumb('notification tap: daily_dispatch');
        // Tell the tab layout to stand down its routine redirect (lib/launchIntent).
        markNotificationNavigation();
        router.push({ pathname: '/dispatch', params: { dispatch_id: String(data.dispatch_id || '') } } as any);
      } else if (data?.route === '/cabinet') {
        breadcrumb('notification tap: cabinet');
        markNotificationNavigation();
        router.push('/cabinet' as any);
      }
    };

    // Cold start: app opened by tapping the notification.
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        seed(response?.notification);
        const data = response?.notification?.request?.content?.data;
        if (data) route(data);
      })
      .catch(() => {});

    // Warm: notification tapped while app is running/backgrounded.
    const tapSub = Notifications.addNotificationResponseReceivedListener(response => {
      seed(response.notification);
      route(response.notification.request.content.data);
    });

    // Delivered while the app is open: seed the thread silently, no redirect.
    const receivedSub = Notifications.addNotificationReceivedListener(n => { seed(n); });

    // The icon badge means "a counselor is waiting": clear it whenever the
    // app comes to the foreground.
    Notifications.setBadgeCountAsync(0).catch(() => {});
    fetchUpdateInBackground();
    let previousAppState = AppState.currentState;
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        recover();
        Notifications.setBadgeCountAsync(0).catch(() => {});
        fetchUpdateInBackground();
        // A return from the background is an "open" for retention purposes;
        // the inactive → active flicker (Control Center, a call) is not.
        if (previousAppState === 'background') logEvent('app_opened', { via: 'foreground' });
      }
      previousAppState = s;
    });

    return () => {
      tapSub.remove();
      receivedSub.remove();
      appStateSub.remove();
    };
  }, [navState?.key, router]);

  return null;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    breadcrumb('root layout mounted');
  }, []);

  // Foreground notification presentation. Registered in an effect (after the
  // TurboModule layer is ready), never at module scope — a module-scope call
  // here was the original Build 44 iOS 26 SIGABRT.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  // Resolve the stored session before routing. A slow network used to hit a
  // 3 second timeout that forced session = null, which sent a signed in
  // member to the login screen (retention plan R12 e). Now the timeout
  // retries once, with a longer allowance, while the loading screen shows a
  // spinner; only a second failure counts as signed out.
  const [sessionSlow, setSessionSlow] = useState(false);
  useEffect(() => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settle = (s: Session | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      setSession(s);
      if (s) logEvent('app_opened', { via: 'launch' });
    };
    const attempt = (onFail: () => void) => {
      supabase.auth.getSession()
        .then(({ data: { session } }) => settle(session))
        .catch(onFail);
    };

    const retry = () => {
      if (settled) return;
      setSessionSlow(true);
      attempt(() => settle(null));
      timer = setTimeout(() => settle(null), 8000);
    };
    attempt(retry);
    timer = setTimeout(retry, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // The first auth event can land before getSession resolves; it settles
      // the launch the same way (and logs app_opened), later ones just update.
      if (!settled) settle(session);
      else setSession(session);
    });

    return () => {
      settled = true;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

 useEffect(() => {
  // A slow session lookup lifts the splash too, so the retry spinner under it
  // is visible instead of a frozen launch screen (R12 e).
  if (session !== undefined || sessionSlow) {
    breadcrumb(session !== undefined ? 'session resolved, hiding splash' : 'session slow, showing spinner');
    SplashScreen.hideAsync().catch(() => {});
  }
}, [session, sessionSlow]);

  // Register for daily-dispatch push notifications and save the device timezone
  // once per authenticated user. Best-effort and fully guarded inside the helper
  // so a denied permission or offline launch can't break boot.
  const dispatchSetupForUser = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!session?.user?.id || !session.access_token) return;
    if (dispatchSetupForUser.current === session.user.id) return;
    dispatchSetupForUser.current = session.user.id;
    setupDispatchNotifications(session).catch(() => {});
  }, [session]);

  // Render errors below are caught and logged by ErrorBoundary; a try/catch
  // here never saw them, because JSX is rendered after this function returns.
  if (session === undefined) {
    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
            {sessionSlow && <ActivityIndicator size="large" color="#c9a84c" />}
          </View>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SessionContext.Provider value={session}>
          <DeepLinkHandler />
          <NotificationTapHandler />
          <Slot />
          <AgeGate userId={session?.user?.id ?? null} />
        </SessionContext.Provider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}