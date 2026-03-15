import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/(auth)/login' as any);
      }
      setSessionChecked(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments[0] === '(auth)';
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!sessionChecked) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopWidth: 0,
          elevation: 10,
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="morning"
        options={{
          title: 'Morning',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="evening"
        options={{
          title: 'Evening',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cabinet"
        options={{
          title: 'Cabinet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(auth)"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="setup"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="home"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="counselor-chat"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="know-thyself"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="weekly-review"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="privacy"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="belief-journal"
        options={{ href: null }}
      />
    </Tabs>
  );
}