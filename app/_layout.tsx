import { ErrorBoundary } from '@/components/ErrorBoundary';
import { breadcrumb, startBootDiagnostics } from '@/lib/crashCapture';
import { setupDispatchNotifications } from '@/lib/pushNotifications';
import { configurePurchases } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useRootNavigationState } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
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
    if (Platform.OS === 'web') return;
    if (!navState?.key) return; // navigation tree not mounted yet

    const route = (data: any) => {
      if (data?.type === 'daily_dispatch') {
        breadcrumb('notification tap: daily_dispatch');
        router.push({ pathname: '/dispatch', params: { dispatch_id: String(data.dispatch_id || '') } } as any);
      }
    };

    // Cold start: app opened by tapping the notification.
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        const data = response?.notification?.request?.content?.data;
        if (data) route(data);
      })
      .catch(() => {});

    // Warm: notification tapped while app is running/backgrounded.
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      route(response.notification.request.content.data);
    });
    return () => subscription.remove();
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSession(null);
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
    }).catch(() => {
      clearTimeout(timeout);
      setSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

 useEffect(() => {
  if (session !== undefined) {
    breadcrumb('session resolved, hiding splash');
    SplashScreen.hideAsync().catch(() => {});
  }
}, [session]);

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

  // Configure RevenueCat once the session resolves. appUserID must be the
  // Supabase user id — that is how the RevenueCat webhook attributes a
  // purchase back to an Arete account. configurePurchases swallows its own
  // errors; the previous integration was disabled behind a "crash isolation"
  // flag and never re-enabled, so keep this guarded but actually running.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!session?.user?.id) return;
    configurePurchases(session.user.id);
  }, [session]);

  try {
    if (session === undefined) {
      return (
        <ErrorBoundary>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />
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
          </SessionContext.Provider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  } catch (error: unknown) {
    const e = error as Error;
    console.error('[ROOT LAYOUT RENDER ERROR]', e?.message, e?.stack);
    // Re-throw so React's error boundary still catches it
    throw error;
  }
}