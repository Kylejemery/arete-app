import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getUserSettings, getTodayCheckin } from '@/lib/db';

const dailyQuotes = [
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "He who fears death will never do anything worthy of a living man.", author: "Seneca" },
  { text: "You have power over your mind, not outside events. Realise this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labour does the body.", author: "Seneca" },
  { text: "First, say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "Excellence is not a gift, but a skill that takes practice.", author: "Plato" },
];

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState<{ salutation: string; subtitle: string }>({ salutation: '', subtitle: '' });
  const [quote, setQuote] = useState<{ text: string; author: string }>({ text: '', author: '' });
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/');

  useFocusEffect(
    useCallback(() => {
      loadData();
      setGreeting(getGreeting());
      setQuote(getDailyQuote());
    }, [])
  );

  const loadData = async () => {
    const settings = await getUserSettings();
    if (!settings?.user_name) {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { salutation: 'Good morning,', subtitle: 'Rise and pursue virtue' };
    if (hour < 18) return { salutation: 'Keep going,', subtitle: 'Continue with excellence' };
    return { salutation: 'Good evening,', subtitle: 'Reflect on this day' };
  };

  const getDailyQuote = () => {
    const day = new Date().getDay();
    return dailyQuotes[day];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} {...swipeHandlers}>

      {/* Top Bar with Settings */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>{greeting.salutation}</Text>
          <Text style={styles.greetingSubtitle}>{greeting.subtitle}</Text>
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
      <View style={styles.quoteContainer}>
        <Ionicons name="flame-outline" size={20} color="#c9a84c" />
        <View style={{ flex: 1 }}>
          <Text style={styles.quote}>"{quote.text}"</Text>
          <Text style={styles.quoteAttribution}>— {quote.author}</Text>
        </View>
      </View>

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

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/cabinet')}>
          <Ionicons name="mic-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Cabinet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/timer')}>
          <Ionicons name="timer-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/journal')}>
          <Ionicons name="book-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/progress')}>
          <Ionicons name="podium-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/know-thyself' as any)}>
          <Ionicons name="person-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Know Thyself</Text>
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
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: '#c9a84c33',
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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