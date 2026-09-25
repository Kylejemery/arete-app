// Signup's one optional step (activation plan, Part 3b). The long Know
// Thyself form is no longer part of signup: the Cabinet learns the profile
// over time, and the full form stays available from Settings and the Know
// Thyself screen. Everything here is skippable, and both buttons go straight
// to the first Cabinet conversation.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
} from 'react-native';
import { upsertUserSettings } from '@/lib/db';
import { logEvent } from '@/lib/events';
import { markNotificationNavigation } from '@/lib/launchIntent';

export default function FirstStepScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [offLimits, setOffLimits] = useState('');
  const [saving, setSaving] = useState(false);

  // The tab layout's time-of-day redirect (Morning / Evening) stands down for
  // an explicit navigation; reuse that flag so a new member lands in the
  // Cabinet, not on a routine screen.
  const goToCabinet = () => {
    markNotificationNavigation();
    router.replace('/(tabs)/cabinet' as any);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const update: { user_name?: string; kt_off_limits?: string } = {};
    if (name.trim()) update.user_name = name.trim();
    if (offLimits.trim()) update.kt_off_limits = offLimits.trim();
    if (Object.keys(update).length > 0) {
      await upsertUserSettings(update);
      if (update.kt_off_limits) logEvent('kt_field_filled', { field_key: 'off_limits', source: 'form' });
    }
    setSaving(false);
    goToCabinet();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>Before you meet your Cabinet</Text>

          <Text style={styles.label}>What should your Cabinet call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
            maxLength={60}
          />

          <Text style={[styles.label, styles.spaced]}>Anything your Cabinet should never bring up?</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Optional. For example, a topic you would rather leave alone."
            placeholderTextColor="#555"
            value={offLimits}
            onChangeText={setOffLimits}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.note}>You can change this any time in Know Thyself.</Text>

          <TouchableOpacity style={styles.primary} onPress={save} disabled={saving}>
            <Text style={styles.primaryText}>Meet your Cabinet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skip} onPress={goToCabinet}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 48 },
  kicker: { color: '#c9a84c', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '700', marginBottom: 28 },
  label: { color: '#e0e0e0', fontSize: 16, marginBottom: 10 },
  spaced: { marginTop: 24 },
  input: {
    backgroundColor: '#16213e', color: '#e0e0e0', borderRadius: 10, padding: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#c9a84c33',
  },
  multiline: { minHeight: 90 },
  note: { color: '#888', fontSize: 12, marginTop: 8 },
  primary: { backgroundColor: '#c9a84c', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  primaryText: { color: '#1a1a2e', fontWeight: '700', fontSize: 16 },
  skip: { alignItems: 'center', padding: 14 },
  skipText: { color: '#888', fontSize: 14 },
});
