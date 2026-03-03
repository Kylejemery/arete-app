import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const dailyQuotes = [
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Don't stop when you're tired. Stop when you're done.",
];

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const router = useRouter();

  useEffect(() => {
    loadData();
    setGreeting(getGreeting());
    setQuote(getDailyQuote());
  }, []);

  const loadData = async () => {
    const name = await AsyncStorage.getItem('userName');
    if (!name) {
      router.replace('/setup');
      return;
    }
    setUserName(name);

    const morning = await AsyncStorage.getItem('morningDone');
    const evening = await AsyncStorage.getItem('eveningDone');
    const savedStreak = await AsyncStorage.getItem('streak');

    setMorningDone(morning === 'true');
    setEveningDone(evening === 'true');
    setStreak(savedStreak ? parseInt(savedStreak) : 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDailyQuote = () => {
    const day = new Date().getDay();
    return dailyQuotes[day];
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{userName} 💪</Text>
      </View>

      {/* Daily Quote */}
      <View style={styles.quoteContainer}>
        <Ionicons name="flame-outline" size={20} color="#c9a84c" />
        <Text style={styles.quote}>"{quote}"</Text>
      </View>

      {/* Streak */}
      <View style={styles.streakContainer}>
        <Ionicons name="trophy-outline" size={28} color="#c9a84c" />
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>Day Streak 🔥</Text>
      </View>

      {/* Today's Progress */}
      <Text style={styles.sectionTitle}>Today's Progress</Text>
      <View style={styles.progressContainer}>
        <View style={[styles.progressCard, morningDone && styles.progressCardDone]}>
          <Ionicons name="sunny-outline" size={24} color={morningDone ? '#1a1a2e' : '#c9a84c'} />
          <Text style={[styles.progressText, morningDone && styles.progressTextDone]}>
            Morning Routine
          </Text>
          {morningDone && <Ionicons name="checkmark-circle" size={20} color="#1a1a2e" />}
        </View>
        <View style={[styles.progressCard, eveningDone && styles.progressCardDone]}>
          <Ionicons name="moon-outline" size={24} color={eveningDone ? '#1a1a2e' : '#c9a84c'} />
          <Text style={[styles.progressText, eveningDone && styles.progressTextDone]}>
            Evening Routine
          </Text>
          {eveningDone && <Ionicons name="checkmark-circle" size={20} color="#1a1a2e" />}
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/morning')}>
          <Ionicons name="sunny-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Morning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/evening')}>
          <Ionicons name="moon-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Evening</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/journal')}>
          <Ionicons name="book-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/progress')}>
          <Ionicons name="bar-chart-outline" size={24} color="#c9a84c" />
          <Text style={styles.actionText}>Progress</Text>
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
  greetingContainer: {
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
    flex: 1,
    lineHeight: 22,
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
});