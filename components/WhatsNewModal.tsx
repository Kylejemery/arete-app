import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSubscription } from '@/lib/useSubscription';

// One-time "What's New" announcement, shown on the first launch of a version
// that has something worth announcing. Self-contained: mount it anywhere on
// the home screen; it decides for itself whether to appear.
//
// To announce a future release, add its version to WHATS_NEW. Versions not
// listed never show anything (so patch releases stay quiet).

const SEEN_KEY = 'whats_new_seen_version';

interface WhatsNewContent {
  title: string;
  intro: string;
  rows: { icon: string; title: string; body: string }[];
}

const WHATS_NEW: Record<string, WhatsNewContent> = {
  '1.4.0': {
    title: 'The Cabinet Sees More',
    intro: 'Your counselors can now speak to the day you actually lived — each one only if you choose to show them.',
    rows: [
      { icon: '👁', title: 'Screen time, held to your limit', body: 'Ask "how\'s my screen time?" and get a straight answer — including late nights past 11pm.' },
      { icon: '❤️', title: 'Sleep and movement', body: 'Last night\'s sleep, today\'s steps and training, from Apple Health. Read-only.' },
      { icon: '🗓️', title: 'The shape of your day', body: 'Today\'s calendar and tomorrow\'s first event, held beside what you said matters.' },
    ],
  },
};

export default function WhatsNewModal() {
  const router = useRouter();
  const { tier } = useSubscription();
  const [content, setContent] = useState<WhatsNewContent | null>(null);

  const version = Constants.expoConfig?.version ?? '';

  useEffect(() => {
    (async () => {
      try {
        if (!WHATS_NEW[version]) return;
        const seen = await AsyncStorage.getItem(SEEN_KEY);
        if (seen === version) return;
        setContent(WHATS_NEW[version]);
      } catch { /* stay hidden */ }
    })();
  }, [version]);

  const dismiss = async (then?: () => void) => {
    setContent(null);
    try { await AsyncStorage.setItem(SEEN_KEY, version); } catch { /* best effort */ }
    then?.();
  };

  if (!content) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={() => dismiss()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>New in Arete</Text>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.intro}>{content.intro}</Text>

          {content.rows.map((row) => (
            <View key={row.title} style={styles.row}>
              <Text style={styles.rowIcon}>{row.icon}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowBody}>{row.body}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() =>
              dismiss(() => {
                if (tier === 'free') {
                  router.push({ pathname: '/paywall', params: { src: 'whats_new_cabinet_sight' } } as any);
                } else {
                  router.push('/settings' as any);
                }
              })
            }
          >
            <Text style={styles.primaryButtonText}>
              {tier === 'free' ? 'See what Premium unlocks' : 'Set it up in Settings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => dismiss()} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    padding: 24,
  },
  eyebrow: {
    color: '#c9a84c',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#E0D5B5',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  intro: {
    color: '#8A9BB0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  rowIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 1,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: '#E0D5B5',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowBody: {
    color: '#8A9BB0',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#8A9BB0',
    fontSize: 14,
  },
});
