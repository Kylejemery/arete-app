import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WeeklyReview, generateWeeklyReview } from '../services/claudeService';

const WEEKLY_REVIEWS_KEY = 'weeklyReviews';
const MAX_SAVED_REVIEWS = 12;

function getWeekLabel(): { weekEnding: string; subtitle: string } {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);

  const weekEnding = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subtitle = `${startLabel} – ${endLabel}`;

  return { weekEnding, subtitle };
}

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentReview, setCurrentReview] = useState<WeeklyReview | null>(null);
  const [pastReviews, setPastReviews] = useState<WeeklyReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const { weekEnding, subtitle } = getWeekLabel();

  useEffect(() => {
    loadSavedReviews();
  }, []);

  useEffect(() => {
    if (loading) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const loadSavedReviews = async () => {
    try {
      const raw = await AsyncStorage.getItem(WEEKLY_REVIEWS_KEY);
      if (raw) {
        const reviews: WeeklyReview[] = JSON.parse(raw);
        setPastReviews(reviews);
        if (reviews.length > 0) {
          setCurrentReview(reviews[0]);
        }
      }
    } catch { /* skip */ }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await generateWeeklyReview();

      const review: WeeklyReview = {
        id: Date.now().toString(),
        weekEnding,
        content,
        generatedAt: new Date().toISOString(),
      };

      setCurrentReview(review);

      // Save: prepend and keep last 12
      const existing = pastReviews.filter((r) => r.id !== review.id);
      const updated = [review, ...existing].slice(0, MAX_SAVED_REVIEWS);
      setPastReviews(updated);
      await AsyncStorage.setItem(WEEKLY_REVIEWS_KEY, JSON.stringify(updated));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'An error occurred. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Weekly Review 📋</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Generate card */}
        <View style={styles.sectionCard}>
          {loading ? (
            <Animated.View style={[styles.loadingContainer, { opacity: pulseAnim }]}>
              <Text style={styles.loadingText}>The Cabinet is in session...</Text>
            </Animated.View>
          ) : (
            <>
              <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                <Text style={styles.generateButtonText}>Convene the Cabinet</Text>
              </TouchableOpacity>
              <Text style={styles.generateNote}>
                The Cabinet will review your week and deliver their honest assessment.
              </Text>
            </>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* Current review display */}
        {currentReview && !loading && (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewWeekLabel}>Week ending {currentReview.weekEnding}</Text>
            <Text style={styles.reviewContent}>{currentReview.content}</Text>
            <TouchableOpacity style={styles.regenerateButton} onPress={handleGenerate}>
              <Text style={styles.regenerateButtonText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Past reviews */}
        <View style={styles.pastSection}>
          <Text style={styles.pastSectionTitle}>Past Reviews</Text>

          {pastReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No past reviews yet. Convene the Cabinet at the end of your first week.
              </Text>
            </View>
          ) : (
            pastReviews.map((review) => (
              <View key={review.id} style={styles.pastReviewCard}>
                <TouchableOpacity
                  style={styles.pastReviewHeader}
                  onPress={() => toggleExpand(review.id)}
                >
                  <Text style={styles.pastReviewLabel}>Week ending {review.weekEnding}</Text>
                  <Text style={styles.pastReviewChevron}>
                    {expandedId === review.id ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {expandedId === review.id && (
                  <Text style={styles.pastReviewContent}>{review.content}</Text>
                )}
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingTop: 20, paddingHorizontal: 25, paddingBottom: 10 },
  backButton: { marginBottom: 10 },
  backText: { color: '#c9a84c', fontSize: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 5 },
  scrollView: { flex: 1 },
  content: { padding: 25, paddingTop: 10 },

  sectionCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
  },

  generateButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonText: {
    color: '#1a1a2e',
    fontSize: 17,
    fontWeight: 'bold',
  },
  generateNote: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#c9a84c',
    fontSize: 16,
    fontStyle: 'italic',
  },

  errorText: {
    color: '#ff4444',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },

  reviewCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
  },
  reviewWeekLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  regenerateButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  regenerateButtonText: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
  },

  pastSection: {
    marginBottom: 20,
  },
  pastSectionTitle: {
    color: '#c9a84c',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pastReviewCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    overflow: 'hidden',
  },
  pastReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  pastReviewLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  pastReviewChevron: {
    color: '#c9a84c',
    fontSize: 12,
    marginLeft: 8,
  },
  pastReviewContent: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
  },
});
