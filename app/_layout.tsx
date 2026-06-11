import { ErrorBoundary } from '@/components/ErrorBoundary';
import { breadcrumb, startBootDiagnostics } from '@/lib/crashCapture';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
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

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    breadcrumb('root layout mounted');
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