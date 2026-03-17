import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)/' as any);
      } else {
        router.replace('/(auth)/login' as any);
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments[0] === '(auth)';
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a dark background while the session check is in progress
  // so the screen is never white on first load
  if (!sessionChecked) {
    return <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;
  }

  return <Slot />;
}