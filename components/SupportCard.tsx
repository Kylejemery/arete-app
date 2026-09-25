// A quiet support card for the Journal tab. The server decides whether it
// shows (GET /api/user/support-card: a 7 day window, a key, nothing else);
// the card never says why it is showing and makes no promises about privacy.
// Dismissal is remembered per key, so a dismissed card stays dismissed.
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '../services/claudeService';

const DISMISS_KEY = 'support_card_dismissed_key';

export default function SupportCard() {
  const [cardKey, setCardKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) return;
          const res = await fetch(`${API_BASE_URL}/api/user/support-card`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (!data?.show || !data?.key || (data.until && Date.parse(data.until) < Date.now())) {
            setCardKey(null);
            return;
          }
          const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
          if (!cancelled) setCardKey(dismissed === data.key ? null : data.key);
        } catch {
          if (!cancelled) setCardKey(null);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  if (!cardKey) return null;

  const dismiss = async () => {
    try { await AsyncStorage.setItem(DISMISS_KEY, cardKey); } catch {}
    setCardKey(null);
  };

  return <SupportCardBody onDismiss={dismiss} />;
}

// Run B, Part B5: the same card, shown at once inside a conversation or after
// a journal entry when a teen's words read as distress, with a line about
// talking to a trusted adult. It never says why it appeared.
export function ImmediateSupportCard({ onDismiss }: { onDismiss: () => void }) {
  return <SupportCardBody onDismiss={onDismiss} trustedAdult />;
}

function SupportCardBody({ onDismiss, trustedAdult = false }: { onDismiss: () => void; trustedAdult?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{"If things feel heavy right now, you don't have to carry it alone."}</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={16} color="#888" />
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>
        {trustedAdult
          ? 'Talking to a trusted adult, like a parent, a teacher, or a school counselor, can really help. In the US you can also call or text 988 any time.'
          : 'Talking with someone can help. In the US you can call or text 988 any time.'}
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL('tel:988')}>
          <Text style={styles.buttonText}>Call 988</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL('sms:988')}>
          <Text style={styles.buttonText}>Text 988</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL('https://findahelpline.com')}>
        <Text style={styles.link}>Outside the US? Find a helpline at findahelpline.com</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1d2733', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#8fb3c955',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 21, flex: 1 },
  body: { color: '#ccc', fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: {
    borderRadius: 10, borderWidth: 1, borderColor: '#8fb3c9',
    paddingVertical: 8, paddingHorizontal: 14,
  },
  buttonText: { color: '#cfe3ef', fontSize: 14, fontWeight: '600' },
  link: { color: '#8fb3c9', fontSize: 13, marginTop: 12, textDecorationLine: 'underline' },
});
