import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

function getRoutineTab(): string | null {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '/morning';
  if (hour >= 17) return '/evening';
  return null;
}

export default function TabsLayout() {
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (hasNavigated.current) return;
    const target = getRoutineTab();
    if (!target) return;
    hasNavigated.current = true;
    router.navigate(target as any);
  }, []);

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
        animation: 'none',
        lazy: false,
        sceneContainerStyle: { backgroundColor: '#1a1a2e' },
        contentStyle: { backgroundColor: '#1a1a2e' },
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
        name="scrolls"
        options={{
          title: 'Scrolls',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" color={color} size={size} />
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
    </Tabs>
  );
}
