import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// This tells Expo Router to use our ErrorBoundary for the root route
export { ErrorBoundary } from '@/components/ErrorBoundary';

let Purchases: any;
try {
  Purchases = require('react-native-purchases').default;
} catch {
  Purchases = require('@/lib/purchases-mock').default;
}

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

 useEffect(() => {
  if (Platform.OS === 'ios' && session !== undefined && session !== null) {
    // DIAGNOSTIC: Purchases.configure() commented out to isolate TurboModule crash (Thread 3).
    // If the crash disappears, RevenueCat is confirmed as the source.
    // Root cause: react-native-purchases plugin missing from app.json plugins array.
    // To re-enable: add "react-native-purchases" to plugins in app.json, then rebuild.
    console.log('[DIAGNOSTIC] RevenueCat configure skipped — crash isolation mode');
    // try {
    //   Purchases.configure({
    //     apiKey: 'appl_BOqigtoHGcsODcjxfsTPwWgqnOK',
    //     appUserID: session.user.id
    //   });
    //   console.log('RevenueCat initialized');
    // } catch (e) {
    //   console.error('RevenueCat configure failed:', e);
    // }
  }
}, [session]);

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
}