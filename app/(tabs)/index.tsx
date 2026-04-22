import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getUserSettings, getTodayCheckin, getRandomCabinetQuote } from '@/lib/db';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const DEFAULT_CABINET_SLUGS = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt'];

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/');

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadQuote();
    }, [])
  );

  const loadData = async () => {
    console.log('loadData started');
    const settings = await getUserSettings();
    console.log('getUserSettings result:', settings);
    if (!settings?.user_name) {
      console.log('Redirecting to setup');
      router.replace('/(onboarding)/setup');
      return;
    }
    setUserName(settings.user_name);
    setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);

    const checkin = await getTodayCheckin();
    setMorningDone(checkin?.morning_done ?? false);
    setEveningDone(checkin?.evening_done ?? false);
    setStreak(checkin?.streak ?? 0);
  };

  const loadQuote = async () => {
    try {
      const settings = await getUserSettings();
      const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS;
      const cabinetSlugs = members.filter(s => s !== 'futureSelf');
      const result = await getRandomCabinetQuote(cabinetSlugs);
      if (result) {
        setQuote({ text: result.quote, author: result.counselor });
      }
    } catch (e) {
      console.error('loadQuote error:', e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} {...swipeHandlers}>

      {/* Top Bar with Settings */}
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

      {/* Daily Quote */}
      {quote && (
      <View style={styles.quoteContainer}>
        <Ionicons name="flame-outline" size={20} color="#c9a84c" />
        <View style={{ flex: 1 }}>
          <Text style={styles.quote}>"{quote.text}"</Text>
          <Text style={styles.quoteAttribution}>— {quote.author}</Text>
        </View>
      </View>
      )}

      {/* Streak */}
      <View style={styles.streakContainer}>
        <Ionicons name="trophy-outline" size={28} color="#c9a84c" />
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>Days of Discipline 🕯️</Text>
      </View>

      {/* Know Thyself Incomplete Banner */}
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

      {/* Today's Progress */}
      <TouchableOpacity onPress={() => router.push('/progress')}>
        <Text style={styles.sectionTitle}>Today's Disciplines</Text>
      </TouchableOpacity>
      <View style={styles.progressContainer}>
        <TouchableOpacity style={[styles.progressCard, morningDone && styles.progressCardDone]} onPress={() => router.push('/morning')}>
          <Ionicons name="sunny-outline" size={24} color={morningDone ? '#1a1a2e' : '#c9a84c'} />
          <Text style={[styles.progressText, morningDone && styles.progressTextDone]}>
            Morning Routine
          </Text>
          {morningDone && <Ionicons name="checkmark-circle" size={20} color="#1a1a2e" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.progressCard, eveningDone && styles.progressCardDone]} onPress={() => router.push('/evening')}>
          <Ionicons name="moon-outline" size={24} color={eveningDone ? '#1a1a2e' : '#c9a84c'} />
          <Text style={[styles.progressText, eveningDone && styles.progressTextDone]}>
            Evening Routine
          </Text>
          {eveningDone && <Ionicons name="checkmark-circle" size={20} color="#1a1a2e" />}
        </TouchableOpacity>
      </View>

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
  greetingSubtitle: {
    fontSize: 13,
    color: '#c9a84c',
    fontStyle: 'italic',
    marginTop: 2,
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
  quoteContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  quote: {
    color: '#c9a84c',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAttribution: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
  streakContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#c9a84c',
  },
  streakLabel: {
    fontSize: 16,
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  progressContainer: {
    gap: 12,
    marginBottom: 25,
  },
  progressCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  progressCardDone: {
    backgroundColor: '#c9a84c',
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  progressTextDone: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  ktBanner: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
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
});
