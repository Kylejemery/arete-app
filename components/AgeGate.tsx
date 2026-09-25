// Blocks the app until a signed-in person has answered the age question
// once, and shows a kind locked screen for under-13 accounts (activation run
// B, Part B5). A band chosen at signup before the session existed is applied
// here first, so nobody is asked twice.
import { useEffect, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  AGE_BANDS, UNDER_13_MESSAGE, fetchAgeStatus, setMyAgeBand, takePendingAgeBand, type AgeBand, type AgeStatus,
} from '@/lib/ageBand';
import { useAgeStatus } from '../hooks/useAgeStatus';

export default function AgeGate({ userId }: { userId: string | null }) {
  const { status } = useAgeStatus();
  // The user the startup check has finished for, so a new sign-in checks again.
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      let s: AgeStatus | null = await fetchAgeStatus();
      if (s && !s.ageBand) {
        const pending = await takePendingAgeBand();
        if (pending) s = await setMyAgeBand(pending);
      }
      if (!cancelled) setCheckedFor(userId);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!userId || checkedFor !== userId || !status) return null;

  if (status.locked) {
    return (
      <Modal visible animationType="none" presentationStyle="fullScreen">
        <SafeAreaView style={styles.screen}>
          <View style={styles.body}>
            <Text style={styles.title}>Thank you for coming to Arete</Text>
            <Text style={styles.text}>{UNDER_13_MESSAGE}</Text>
            <TouchableOpacity style={styles.secondary} onPress={() => supabase.auth.signOut()}>
              <Text style={styles.secondaryText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (status.ageBand) return null;

  const choose = async (band: AgeBand) => {
    if (saving) return;
    setSaving(true);
    await setMyAgeBand(band);
    setSaving(false);
  };

  return (
    <Modal visible animationType="none" presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Text style={styles.title}>How old are you?</Text>
          <Text style={styles.text}>We ask once, so the Cabinet can speak to you in the right way. We only keep the range you choose.</Text>
          {AGE_BANDS.map(b => (
            <TouchableOpacity key={b.value} style={styles.option} onPress={() => choose(b.value)} disabled={saving}>
              <Text style={styles.optionText}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  body: { flex: 1, padding: 28, justifyContent: 'center', gap: 12 },
  title: { color: '#c9a84c', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  text: { color: '#ccc', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  option: { borderWidth: 1, borderColor: '#c9a84c77', borderRadius: 12, padding: 16 },
  optionText: { color: '#e0e0e0', fontSize: 16, textAlign: 'center' },
  secondary: { alignItems: 'center', padding: 14, marginTop: 12 },
  secondaryText: { color: '#888', fontSize: 14 },
});
