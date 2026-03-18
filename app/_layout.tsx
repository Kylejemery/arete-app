import { Redirect, Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Hard timeout — if session check takes >3s, give up and show login
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


  // Still loading — splash is showing, but render dark background as safety net
 if (session === undefined) {
  return (
    <View 
      style={{ flex: 1, backgroundColor: '#1a1a2e' }}
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
    />
  );
}

  // Not authenticated
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Authenticated — render all child routes
  return <Slot />;
}
