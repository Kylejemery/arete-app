import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getUserSettings, getTodayCheckin, getGoals } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const dailyQuotes = [
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "He who fears death will never do anything worthy of a living man.", author: "Seneca" },
  { text: "You have power over your mind, not outside events. Realise this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labour does the body.", author: "Seneca" },
  { text: "First, say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "Excellence is not a gift, but a skill that takes practice.", author: "Plato" },
];

interface Resource {
  goal: string;
  title: string;
  url: string;
  type: 'article' | 'book' | 'research';
  summary: string;
}

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

  // Resource feed
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [activeGoalsCount, setActiveGoalsCount] = useState(0);
  const resourcesLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      setGreeting(getGreeting());
      setQuote(getDailyQuote());
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

    // Load resources only on first focus
    if (!resourcesLoadedRef.current) {
      fetchResources();
    }
  };

  const fetchResources = async (force = false) => {
    if (resourcesLoadedRef.current && !force) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const goals = await getGoals(user.id);
      const active = goals.filter(g => !g.completed);
      setActiveGoalsCount(active.length);
      if (active.length === 0) {
        resourcesLoadedRef.current = true;
        return;
      }
      setResourcesLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/resources/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: active }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResources(data.resources ?? []);
      resourcesLoadedRef.current = true;
    } catch (e) {
      console.error('fetchResources error:', e);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleRefresh = () => {
    resourcesLoadedRef.current = false;
    setResources([]);
    fetchResources(true);
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

  // Group resources by goal
  const groupedResources = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    const key = r.goal || 'Resources';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const typeBadgeStyle = (type: Resource['type']) => {
    if (type === 'book') return styles.badgeBook;
    if (type === 'research') return styles.badgeResearch;
    return styles.badgeArticle;
  };

  const typeBadgeTextStyle = (type: Resource['type']) => {
    if (type === 'book') return styles.badgeBookText;
    if (type === 'research') return styles.badgeResearchText;
    return styles.badgeArticleText;
  };

  const typeLabel = (type: Resource['type']) => {
    if (type === 'book') return 'Book';
    if (type === 'research') return 'Research';
    return 'Article';
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

      {/* Resource Feed */}
      <View style={styles.resourceFeedHeader}>
        <Text style={styles.sectionTitle}>Resources for Your Goals</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={resourcesLoading}>
          <Ionicons name="refresh-outline" size={15} color={resourcesLoading ? '#555' : '#c9a84c'} />
          <Text style={[styles.refreshText, resourcesLoading && styles.refreshTextDisabled]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {resourcesLoading && (
        <View style={styles.resourceLoadingCard}>
          <Ionicons name="search-outline" size={20} color="#c9a84c" />
          <Text style={styles.resourceLoadingText}>Finding resources for your goals...</Text>
        </View>
      )}

      {!resourcesLoading && activeGoalsCount === 0 && (
        <View style={styles.resourceEmptyCard}>
          <Text style={styles.resourceEmptyText}>Add goals to see curated resources here.</Text>
        </View>
      )}

      {!resourcesLoading && activeGoalsCount > 0 && resources.length === 0 && resourcesLoadedRef.current && (
        <View style={styles.resourceEmptyCard}>
          <Text style={styles.resourceEmptyText}>No resources found. Tap Refresh to try again.</Text>
        </View>
      )}

      {!resourcesLoading && Object.entries(groupedResources).map(([goal, items]) => (
        <View key={goal} style={styles.resourceGroup}>
          <Text style={styles.resourceGoalLabel}>{goal}</Text>
          {items.map((r, i) => (
            <View key={i} style={styles.resourceCard}>
              <View style={styles.resourceCardTop}>
                <View style={[styles.typeBadge, typeBadgeStyle(r.type)]}>
                  <Text style={[styles.typeBadgeText, typeBadgeTextStyle(r.type)]}>
                    {typeLabel(r.type)}
                  </Text>
                </View>
              </View>
              <Text style={styles.resourceTitle}>{r.title}</Text>
              {r.summary ? (
                <Text style={styles.resourceSummary}>{r.summary}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.viewLink}
                onPress={() => r.url && Linking.openURL(r.url)}
              >
                <Text style={styles.viewLinkText}>View →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

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
  // Resource Feed
  resourceFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  refreshText: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
  },
  refreshTextDisabled: {
    color: '#555',
  },
  resourceLoadingCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    marginBottom: 12,
  },
  resourceLoadingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  resourceEmptyCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    marginBottom: 12,
    alignItems: 'center',
  },
  resourceEmptyText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
  },
  resourceGroup: {
    marginBottom: 20,
  },
  resourceGoalLabel: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  resourceCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    gap: 8,
  },
  resourceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  badgeBook: {
    backgroundColor: '#c9a84c22',
    borderWidth: 1,
    borderColor: '#c9a84c55',
  },
  badgeArticle: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#4a90d944',
  },
  badgeResearch: {
    backgroundColor: '#1a3a2a',
    borderWidth: 1,
    borderColor: '#4caf5044',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badgeBookText: { color: '#c9a84c' },
  badgeArticleText: { color: '#4a90d9' },
  badgeResearchText: { color: '#4caf50' },
  resourceTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  resourceSummary: {
    color: '#888',
    fontSize: 13,
    lineHeight: 20,
  },
  viewLink: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  viewLinkText: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
  },
});
