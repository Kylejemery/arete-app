import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPushPermissionStatus, promptAndRegisterForDispatch } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';

const DISMISS_KEY = 'dispatch_nudge_dismissed_at';
const REASK_DAYS = 7;

/**
 * The primed notification ask for the Daily Dispatch. iOS grants exactly one
 * system prompt, so it fires from here — after this card has explained what
 * the user gets — instead of cold at boot. Dismissal re-offers after a week;
 * once permission is granted or hard-denied the card never returns
 * (registration for granted users happens silently at boot).
 */
export default function DispatchNudge() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const status = await getPushPermissionStatus();
        if (status !== 'undetermined') return;
        const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < REASK_DAYS * 24 * 60 * 60 * 1000) {
          return;
        }
        setVisible(true);
      } catch { /* never block Home over a nudge */ }
    })();
  }, []);

  if (!visible) return null;

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await promptAndRegisterForDispatch(session);
    } finally {
      setBusy(false);
      setVisible(false);
    }
  };

  const later = async () => {
    try { await AsyncStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="sunny-outline" size={20} color="#c9a84c" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Your Daily Dispatch</Text>
        <Text style={styles.text}>
          One line from your counselors each morning — a thought to carry into the day.
          Allow notifications to receive it.
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={later} style={styles.laterButton} disabled={busy}>
            <Text style={styles.laterText}>Not now</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={enable} style={styles.enableButton} disabled={busy}>
            <Text style={styles.enableText}>{busy ? 'Enabling…' : 'Enable'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    padding: 16,
    marginBottom: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#c9a84c15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { color: '#e0d5b5', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  text: { color: '#888', fontSize: 13, lineHeight: 19 },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  laterButton: { paddingVertical: 8, paddingHorizontal: 12 },
  laterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  enableButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  enableText: { color: '#1a1a2e', fontSize: 13, fontWeight: '700' },
});
