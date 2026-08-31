import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../services/claudeService';
import { supabase } from '@/lib/supabase';

/**
 * App-wide popup for shared-session invites the user never saw in email:
 * "{Name} has invited you to a shared Cabinet session." Join hands the token
 * to the existing join-session screen (which accepts and routes to the
 * Cabinet); Not now dismisses that token permanently on this device.
 * Checks on mount and whenever the app returns to the foreground.
 */
export default function PendingInviteModal() {
  const router = useRouter();
  const [invite, setInvite] = useState<{ token: string; inviterName: string } | null>(null);
  const checkingRef = useRef(false);

  const checkForInvite = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch(`${API_BASE_URL}/api/sessions/pending-invite`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      const found = data?.invite;
      if (!found?.token) return;
      const dismissed = await AsyncStorage.getItem(`dismissed_invite_${found.token}`);
      if (dismissed) return;
      setInvite({ token: found.token, inviterName: found.inviterName || 'Someone' });
    } catch {
      /* best-effort — never block the app over an invite check */
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    checkForInvite();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForInvite();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = () => {
    const token = invite?.token;
    setInvite(null);
    if (token) {
      router.push({ pathname: '/join-session', params: { token } } as any);
    }
  };

  const handleDismiss = async () => {
    const token = invite?.token;
    setInvite(null);
    if (token) {
      try { await AsyncStorage.setItem(`dismissed_invite_${token}`, '1'); } catch { /* ignore */ }
    }
  };

  return (
    <Modal visible={!!invite} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="people-outline" size={40} color="#c9a84c" style={{ alignSelf: 'center' }} />
          <Text style={styles.title}>
            {invite?.inviterName} has invited you to a shared Cabinet session
          </Text>
          <Text style={styles.subtitle}>
            In a shared session, you each bring your philosophical profile and your
            counselors respond to both of you together.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
              <Text style={styles.dismissText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
              <Text style={styles.joinText}>Join Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#c9a84c55',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  title: {
    color: '#e0d5b5',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffffff22',
    alignItems: 'center',
  },
  dismissText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#c9a84c',
    alignItems: 'center',
  },
  joinText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '700',
  },
});
