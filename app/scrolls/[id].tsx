import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { getScroll, logScrollRead, type Scroll } from '@/lib/scrolls';

const COUNSELOR_LABELS: Record<string, string> = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

const MILESTONES: Record<number, string> = {
  3: 'You\'ve read this 3 times. The words are starting to root.',
  7: 'You\'ve read this 7 times. The words are becoming yours.',
  10: 'You\'ve read this 10 times. This is now part of you.',
  21: '21 readings. The philosopher would be proud.',
};

const READ_THRESHOLD_MS = 60_000;

export default function ScrollDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const readLoggedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadScroll();
    startReadTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id]);

  const loadScroll = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userIdRef.current = user.id;
      const data = await getScroll(id!);
      setScroll(data);
    } catch (e) {
      console.error('loadScroll error:', e);
    } finally {
      setLoading(false);
    }
  };

  const startReadTimer = () => {
    timerRef.current = setTimeout(() => {
      recordRead();
    }, READ_THRESHOLD_MS);
  };

  const recordRead = async () => {
    if (readLoggedRef.current) return;
    readLoggedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!id || !userIdRef.current) return;
    try {
      const newCount = await logScrollRead(id, userIdRef.current);
      const milestone = MILESTONES[newCount];
      if (milestone) showToast(milestone);
      // Update local state
      setScroll(prev => prev ? { ...prev, read_count: newCount } : prev);
    } catch (e) {
      console.error('recordRead error:', e);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (readLoggedRef.current) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom) recordRead();
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  const readCount = scroll?.read_count ?? 0;

  // Match full URLs; trailing punctuation stripped separately in render
  const URL_REGEX = /(https?:\/\/[^\s<>"'()]+)/g;

  const normalizeUrl = (url: string): string => {
    // Convert any Amazon product URL to the stable /dp/ASIN form
    const asin = url.match(/amazon\.com(?:\/[^/]+)*\/dp\/([A-Z0-9]{10})/i)?.[1];
    if (asin) return `https://www.amazon.com/dp/${asin}`;
    return url;
  };

  const renderParagraph = (text: string, i: number) => {
    const parts = text.split(URL_REGEX);
    const hasLinks = parts.some(p => /^https?:\/\//.test(p));
    if (!hasLinks) {
      return <Text key={i} style={styles.body} selectable>{text}</Text>;
    }
    return (
      <Text key={i} style={styles.body} selectable>
        {parts.map((part, j) => {
          if (!/^https?:\/\//.test(part)) return part;
          // Strip trailing punctuation that prose wraps URLs with
          const cleanUrl = part.replace(/[.,;:)]+$/, '');
          const trailing = part.slice(cleanUrl.length);
          return (
            <Text key={j}>
              <Text style={styles.link} onPress={() => Linking.openURL(normalizeUrl(cleanUrl))}>
                {cleanUrl}
              </Text>
              {trailing}
            </Text>
          );
        })}
      </Text>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/scrolls' as any)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#c9a84c" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading scroll...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!scroll) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/scrolls' as any)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#c9a84c" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Scroll not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/scrolls' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#c9a84c" />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        <Text style={styles.counselorLabel} selectable>{COUNSELOR_LABELS[scroll.counselor]}</Text>
        <Text style={styles.title} selectable>{scroll.title}</Text>
        <Text style={styles.byline} selectable>
          Written for you by {COUNSELOR_LABELS[scroll.counselor]}
        </Text>

        <View style={styles.divider} />

        {scroll.body.split('\n\n').map((paragraph, i) => renderParagraph(paragraph, i))}

        <View style={styles.readFooter}>
          {readCount > 0 ? (
            <View style={styles.readCountRow}>
              <Ionicons name="flame" size={15} color="#c9a84c55" />
              <Text style={styles.readCountText}>
                You've read this {readCount} {readCount === 1 ? 'time' : 'times'}
              </Text>
            </View>
          ) : (
            <Text style={styles.readCountText}>Reading now...</Text>
          )}
        </View>
      </ScrollView>

      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  backButton: { padding: 4, width: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#555', fontSize: 15 },
  content: { padding: 28, paddingBottom: 80 },
  counselorLabel: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  byline: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#c9a84c22',
    marginBottom: 28,
  },
  body: {
    color: '#ddd',
    fontSize: 17,
    lineHeight: 30,
    marginBottom: 20,
  },
  link: {
    color: '#c9a84c',
    textDecorationLine: 'underline',
  },
  readFooter: {
    marginTop: 24,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c11',
  },
  readCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readCountText: {
    color: '#444',
    fontSize: 13,
    fontStyle: 'italic',
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    alignItems: 'center',
  },
  toastText: {
    color: '#c9a84c',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
