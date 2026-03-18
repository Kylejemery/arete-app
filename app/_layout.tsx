import { Redirect, Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Seed with getSession() first so we don't wait for the async INITIAL_SESSION event
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch(() => {
      setSession(null);
    });

    // Then keep listening for future auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Slot />;
}