import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '../services/claudeService';

/**
 * Landing screen for the `arete://join-session?token=...` deep link. Calls
 * /api/sessions/accept with the authenticated user, then hands the resolved
 * sessionId back to the Cabinet tab via navigation params.
 */
export default function JoinSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    const token = params.token ? String(params.token) : '';
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    (async () => {
      if (!token) {
        setError('This invite link is missing its token.');
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not signed in — send them to login; they can re-tap the link after.
          router.replace('/login' as any);
          return;
        }
        const settings = await getUserSettings();
        const partnerDisplayName = settings?.user_name || user.email || 'Partner';

        const response = await fetch(`${API_BASE_URL}/api/sessions/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, partnerUserId: user.id, partnerDisplayName }),
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.success && data?.sessionId) {
          router.replace({
            pathname: '/cabinet',
            params: { sharedSessionId: String(data.sessionId), sharedPartnerName: partnerDisplayName },
          } as any);
        } else {
          setError(data?.error || 'This invite has expired or is invalid.');
        }
      } catch (err) {
        console.error('[join-session] accept failed:', err);
        setError('Something went wrong joining the session. Please try again.');
      }
    })();
  }, [params.token, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#c9a84c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/cabinet' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Return to Cabinet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={56} color="#c9a84c" />
          <Text style={styles.loadingText}>Joining shared Cabinet session...</Text>
          <ActivityIndicator size="large" color="#c9a84c" style={{ marginTop: 8 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#e0d5b5',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#c9a84c22',
    borderWidth: 1,
    borderColor: '#c9a84c88',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: '600',
  },
});
