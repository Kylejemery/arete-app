import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getUserSettings, getTodayCheckin, getRandomCabinetQuote, checkAndResetStreakIfMissed } from '@/lib/db';
import { normalizeCounselorId } from '../../services/threadService';
import { prefetchDailyQuestion } from '../../services/claudeService';

const QUOTE_CACHE_KEY = 'home_quote_cache';

function getSlotKey(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const slot = now.getHours() < 18 ? 'morning' : 'evening';
  return `${dateStr}-${slot}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getPrimaryCTA(): { label: string; route: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { label: 'Begin Morning Routine', route: '/morning' };
  if (hour < 17) return { label: 'Open the Cabinet', route: '/cabinet' };
  return { label: 'Evening Reflection', route: '/evening' };
}

const DEFAULT_CABINET_SLUGS = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt'];

const DAILY_PROMPTS = [
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'What is the one thing you are avoiding today, and why?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'What are you treating as necessary that is actually just comfortable?' },
  { counselorSlug: 'david-goggins', counselorName: 'David Goggins', prompt: 'What are you comfortable with that you should not be?' },
  { counselorSlug: 'theodore-roosevelt', counselorName: 'Theodore Roosevelt', prompt: 'What bold thing have you been putting off, and what is the real reason?' },
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'Where did you act from fear instead of reason this week?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'Name one opinion you are holding that is making you miserable.' },
  { counselorSlug: 'david-goggins', counselorName: 'David Goggins', prompt: 'When did you stop short of your actual limit this week?' },
  { counselorSlug: 'theodore-roosevelt', counselorName: 'Theodore Roosevelt', prompt: 'What would you attempt if you were certain you would not fail?' },
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'What external thing are you depending on for your peace today?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'Is the thing troubling you in your control, or not? Act accordingly.' },
  { counselorSlug: 'david-goggins', counselorName: 'David Goggins', prompt: 'Name one thing you did today that Future You would respect.' },
  { counselorSlug: 'theodore-roosevelt', counselorName: 'Theodore Roosevelt', prompt: 'Are you in the arena, or watching from the stands?' },
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'How much of your suffering today was in the event itself, and how much in your judgment of it?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'What role are you playing right now — and are you playing it well?' },
];

function getDailyPrompt() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    // Step 1: paint from cache immediately so no flash of zero
    try {
      const cached = await AsyncStorage.getItem('arete:home_stats');
      if (cached) {
        const c = JSON.parse(cached);
        setStreak(c.streak ?? 0);
        setMorningDone(c.morningDone ?? false);
        setEveningDone(c.eveningDone ?? false);
      }
      setCacheLoaded(true);
    } catch {}

    // Step 2: fresh fetch
    const settings = await getUserSettings();
    if (!settings?.user_name) {
      router.replace('/(onboarding)/setup');
      return;
    }
    setUserName(settings.user_name);
    setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);

    const [checkin, freshStreak] = await Promise.all([
      getTodayCheckin(),
      checkAndResetStreakIfMissed(),
    ]);
    const freshMorning = checkin?.morning_done ?? false;
    const freshEvening = checkin?.evening_done ?? false;
    setStreak(freshStreak);
    setMorningDone(freshMorning);
    setEveningDone(freshEvening);
    setCacheLoaded(true);

    // Step 3: write cache for next load
    try {
      await AsyncStorage.setItem('arete:home_stats', JSON.stringify({
        streak: freshStreak,
        morningDone: freshMorning,
        eveningDone: freshEvening,
      }));
    } catch {}

    // Step 4: pre-generate today's question response in the background
    const dp = getDailyPrompt();
    prefetchDailyQuestion(normalizeCounselorId(dp.counselorSlug), dp.prompt).catch(() => {});
  };

  useEffect(() => {
    (async () => {
      try {
        const slotKey = getSlotKey();
        const cached = await AsyncStorage.getItem(QUOTE_CACHE_KEY);
        if (cached) {
          const { slot, quote } = JSON.parse(cached);
          if (slot === slotKey) {
            setQuote(quote);
            return;
          }
        }
        // New slot — fetch a fresh quote and cache it
        const settings = await getUserSettings();
        const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS;
        const cabinetSlugs = members.filter(s => s !== 'futureSelf');
        const result = await getRandomCabinetQuote(cabinetSlugs);
        if (result) {
          const q = { text: result.quote, author: result.counselor };
          setQuote(q);
          await AsyncStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify({ slot: slotKey, quote: q }));
        }
      } catch (e) {
        console.error('loadQuote error:', e);
      }
    })();
  }, []);

  const cta = getPrimaryCTA();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} {...swipeHandlers}>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, {userName.split(' ')[0]}</Text>
          <Text style={styles.name}>{userName} ⚔️</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings' as any)}
        >
          <Ionicons name="settings-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      {/* Quote Card */}
      {quote ? (
        <View style={styles.quoteCard}>
          <Text style={styles.quoteGlyph}>"</Text>
          <View style={styles.quoteBody}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.quoteSkeleton} />
      )}

      {/* Know Thyself Banner */}
      {knowThyselfIncomplete && (
        <View style={styles.ktBanner}>
          <View style={styles.ktBannerHeader}>
            <Ionicons name="person-circle-outline" size={24} color="#c9a84c" />
            <Text style={styles.ktBannerTitle}>Complete Your Profile</Text>
          </View>
          <Text style={styles.ktBannerSubtitle}>
            {"The Cabinet's responses are generic until you tell them who you are. It takes 2 minutes."}
          </Text>
          <TouchableOpacity onPress={() => router.push('/know-thyself' as any)}>
            <Text style={styles.ktBannerLink}>Complete Now →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Pills */}
      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[styles.pill, morningDone && styles.pillActive]}
          onPress={() => router.push('/morning' as any)}
        >
          <Text style={styles.pillEmoji}>☀️</Text>
          <Text style={[styles.pillLabel, morningDone && styles.pillLabelActive]}>Morning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, styles.pillActive]}
          onPress={() => router.push('/cabinet' as any)}
        >
          <Text style={styles.pillEmoji}>🏛️</Text>
          <Text style={[styles.pillLabel, styles.pillLabelActive]}>Cabinet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, eveningDone && styles.pillActive]}
          onPress={() => router.push('/evening' as any)}
        >
          <Text style={styles.pillEmoji}>🌙</Text>
          <Text style={[styles.pillLabel, eveningDone && styles.pillLabelActive]}>Evening</Text>
        </TouchableOpacity>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push(cta.route as any)}
      >
        <Text style={styles.ctaLabel}>{cta.label}</Text>
        <Ionicons name="arrow-forward" size={18} color="#1a1a2e" />
      </TouchableOpacity>

      {/* Streak Card */}
      {!cacheLoaded ? (
        <View style={styles.streakSkeleton} />
      ) : (
        <View style={styles.streakCard}>
          <Text style={styles.streakCount}>{streak}</Text>
          <View style={styles.streakMeta}>
            <Text style={styles.streakLabel}>Days of Discipline</Text>
            <Text style={styles.streakSub}>Keep the chain unbroken.</Text>
          </View>
          <Ionicons name="flame" size={32} color="#c9a84c" />
        </View>
      )}

      {/* Daily Counselor Prompt */}
      {(() => {
        const dp = getDailyPrompt();
        return (
          <TouchableOpacity
            style={styles.promptCard}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/counselor-chat', params: { id: dp.counselorSlug, initialMessage: dp.prompt } } as any)}
          >
            <View style={styles.promptBody}>
              <Text style={styles.promptLabel}>TODAY'S QUESTION</Text>
              <Text style={styles.promptText}>{dp.prompt}</Text>
              <Text style={styles.promptAttribution}>— {dp.counselorName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#c9a84c" />
          </TouchableOpacity>
        );
      })()}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  greeting: {
    fontSize: 20,
    color: '#888',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    marginTop: 5,
  },
  quoteCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
  },
  quoteGlyph: {
    fontSize: 44,
    lineHeight: 44,
    color: '#c9a84c',
    fontWeight: 'bold',
    marginTop: -4,
  },
  quoteBody: {
    flex: 1,
  },
  quoteText: {
    color: '#e8e0d0',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    color: '#c9a84c',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  quoteSkeleton: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    height: 90,
    marginBottom: 20,
    opacity: 0.4,
  },
  ktBanner: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c',
  },
  ktBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ktBannerTitle: {
    color: '#c9a84c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ktBannerSubtitle: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  ktBannerLink: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  pill: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 50,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    gap: 4,
  },
  pillActive: {
    backgroundColor: '#c9a84c18',
    borderColor: '#c9a84c',
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pillLabelActive: {
    color: '#c9a84c',
  },
  ctaButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  ctaLabel: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  streakSkeleton: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    height: 104,
    opacity: 0.4,
    marginBottom: 0,
  },
  streakCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  streakCount: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#c9a84c',
    lineHeight: 56,
  },
  streakMeta: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  streakSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
    fontStyle: 'italic',
  },
  promptCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    padding: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  promptBody: {
    flex: 1,
    gap: 6,
  },
  promptLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c9a84c88',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  promptText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  promptAttribution: {
    color: '#c9a84c',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
