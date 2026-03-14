import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
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