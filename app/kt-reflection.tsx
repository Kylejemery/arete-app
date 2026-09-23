import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import CounselorText from '../components/CounselorText';
import { logEvent } from '@/lib/events';
import { requestKtReflection, seedReflectionIntoCabinet, type KtReflection } from '@/lib/ktReflection';

// "What your Cabinet now sees" (retention plan R6). Shown once right after a
// Know Thyself save that completed the profile: the chair of the Cabinet
// names one pattern connecting two things the user wrote, the goal it
// threatens, and asks one question. Mobile twin of the web KtReflectionModal.
export default function KtReflectionScreen() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reflection, setReflection] = useState<KtReflection | null>(null);
  const [answering, setAnswering] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    (async () => {
      const r = await requestKtReflection();
      if (r) {
        setReflection(r);
        setState('ready');
        logEvent('kt_reflection_viewed', { counselor: r.counselorId });
      } else {
        setState('failed');
      }
    })();
  }, []);

  const later = () => router.replace('/(tabs)/' as any);

  const answer = async () => {
    if (!reflection || answering) return;
    setAnswering(true);
    await seedReflectionIntoCabinet(reflection);
    // cabinetSeed folds the saved line into the view and focuses the input.
    router.replace({ pathname: '/(tabs)/cabinet', params: { cabinetSeed: '1' } } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{reflection?.counselorName ?? 'Your Cabinet'}</Text>
        <Text style={styles.title}>What your Cabinet now sees.</Text>

        {state === 'loading' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#c9a84c" />
            <Text style={styles.loadingText}>The chair of your Cabinet is reading what you wrote…</Text>
          </View>
        )}
        {state === 'failed' && (
          <Text style={styles.failedText}>
            The Cabinet could not answer just now. Your profile is saved, and your counselors will use it from your next message.
          </Text>
        )}
        {state === 'ready' && reflection && (
          <View style={styles.card}>
            <CounselorText text={reflection.reflection} style={styles.reflectionText} />
          </View>
        )}

        <View style={styles.buttons}>
          {state === 'ready' && (
            <TouchableOpacity style={styles.primary} onPress={answer} disabled={answering} activeOpacity={0.8}>
              <Text style={styles.primaryText}>{answering ? 'Opening…' : 'Answer in the Cabinet'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondary} onPress={later} activeOpacity={0.8}>
            <Text style={styles.secondaryText}>Later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 25, paddingTop: 40, gap: 14 },
  kicker: { color: '#c9a84c', fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '600' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 6 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { color: '#888', fontSize: 14, fontStyle: 'italic', flex: 1 },
  failedText: { color: '#888', fontSize: 15, lineHeight: 22, paddingVertical: 10 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.33)',
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    padding: 18,
  },
  reflectionText: { color: '#e0e0e0', fontSize: 16, lineHeight: 25 },
  buttons: { gap: 10, marginTop: 10 },
  primary: { backgroundColor: '#c9a84c', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#888', fontSize: 14, fontWeight: '600' },
});
