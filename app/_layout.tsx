import { Redirect, Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch the session
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Seed initial session state as fast as possible
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch(() => {
      setSession(null);
    });

    // Keep listening for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Once session is known, hide the splash screen
  useEffect(() => {
    if (session !== undefined) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [session]);

  // Still loading — splash screen is still visible, render nothing
  if (session === undefined) {
    return null;
  }

  // Not authenticated
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Authenticated — render all child routes
  return <Slot />;
}