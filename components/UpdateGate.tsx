// Mandatory update screen. Shown over everything when this build is older
// than the oldest one the server supports (lib/updateGate.ts). It cannot be
// dismissed: the only way on is the App Store. Checked at launch and again on
// every return to the foreground, so a floor raised while the app sat in the
// background still applies.
import { useEffect, useState } from 'react';
import { AppState, Linking, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { breadcrumb } from '@/lib/crashCapture';
import { checkUpdateRequired, type UpdateRequirement } from '@/lib/updateGate';

export default function UpdateGate() {
  const [requirement, setRequirement] = useState<UpdateRequirement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      checkUpdateRequired().then((r) => {
        if (cancelled) return;
        // Only ever raise the gate from here. A failed check (offline) must
        // not lower one already shown.
        if (r) {
          breadcrumb(`update required: build ${r.currentBuild} < ${r.minBuild}`);
          setRequirement(r);
        }
      });
    };
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { cancelled = true; sub.remove(); };
  }, []);

  if (!requirement) return null;

  return (
    <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Text style={styles.kicker}>ARETE</Text>
          <Text style={styles.title}>A newer version is needed</Text>
          <Text style={styles.text}>
            This version of Arete can no longer reach your Cabinet. Update from the App Store to continue.
            Your journal, Scrolls and counselors are kept with your account.
          </Text>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => { Linking.openURL(requirement.storeUrl).catch(() => {}); }}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Update in the App Store</Text>
          </TouchableOpacity>
          <Text style={styles.meta}>Build {requirement.currentBuild} · {requirement.minBuild} or later needed</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a2e' },
  body: { flex: 1, padding: 28, justifyContent: 'center', gap: 12 },
  kicker: { color: '#c9a84c', fontSize: 11, fontWeight: '700', letterSpacing: 3 },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  text: { color: '#e0e0e0', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  primary: { backgroundColor: '#c9a84c', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#1a1a2e', fontSize: 17, fontWeight: '700' },
  meta: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
