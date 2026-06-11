import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { ErrorUtils, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

// iOS 26 workaround: disables RNSTabBarController to prevent SIGABRT via
// ObjCTurboModule::performVoidMethodInvocation on iOS 26. Both Build 47 and
// Build 48 crash logs confirm RNScreens is in the binary and the crash fires
// on the TurboModule manager queue at launch. Remove when react-native-screens
// ships a fix for RNSTabBarController::updateTabBarAppearance on iOS 26.
// Reference: github.com/software-mansion/react-native-screens/issues/3940
if (Platform.OS === 'ios') {
  enableScreens(false);
}

// ── Global JS error handler — catches errors BEFORE RCTExceptionsManager ──────
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GLOBAL ERROR CAUGHT]', 'fatal:', isFatal, 'message:', error?.message, 'stack:', error?.stack);
  originalHandler(error, isFatal);
});

// This tells Expo Router to use our ErrorBoundary for the root route
export { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SessionContext = createContext<Session | null | undefined>(undefined);
SessionContext.displayName = 'SessionContext';

export function useSession() {
  return useContext(SessionContext);
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

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
    SplashScreen.hideAsync().catch(() => {});
  }
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