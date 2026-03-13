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
        <Text style={styles.title}>Weekly Review</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Generate / Regenerate button */}
        <TouchableOpacity
          style={[
            currentReview ? styles.regenerateButtonTop : styles.generateButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={currentReview ? styles.regenerateButtonTopText : styles.generateButtonText}>
            {currentReview ? 'Regenerate' : "Generate This Week's Review"}
          </Text>
        </TouchableOpacity>

        {loading && (
          <Animated.Text style={[styles.loadingText, { opacity: pulseAnim }]}>
            The Cabinet is convening…
          </Animated.Text>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Error card */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleGenerate}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current review card */}
        {currentReview && !loading && (
          <View style={styles.reviewCard}>
            <Text style={styles.weekOfLabel}>WEEK OF</Text>
            <Text style={styles.reviewWeekEnding}>{currentReview.weekEnding}</Text>
            <Text style={styles.reviewSubtitle}>{subtitle}</Text>
            <View style={styles.divider} />
            <Text style={styles.reviewContent}>{currentReview.content}</Text>
            <Text style={styles.generatedAt}>
              Generated {new Date(currentReview.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}{' '}{new Date(currentReview.generatedAt).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Empty state */}
        {!currentReview && !loading && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>No review yet this week.</Text>
            <Text style={styles.emptySubtext}>
              The Cabinet reviews a week's worth of data — routines, journal entries, reading, and reflections — and gives you an honest assessment.
            </Text>
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
              <Text style={styles.generateButtonText}>Generate This Week's Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Past reviews archive */}
        {pastReviews.length > 1 && (
          <View style={styles.pastSection}>
            <Text style={styles.pastSectionTitle}>Past Reviews</Text>
            {/* Skip index 0 — that's the current review shown above */}
            {pastReviews.slice(1).map((review) => (
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
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingTop: 20, paddingHorizontal: 25, paddingBottom: 16 },
  backButton: { marginBottom: 10 },
  backText: { color: '#c9a84c', fontSize: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 16 },
  scrollView: { flex: 1 },
  content: { padding: 25, paddingTop: 10, paddingBottom: 40 },

  generateButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },

  regenerateButtonTop: {
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  regenerateButtonTopText: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: '600',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  loadingText: {
    color: '#c9a84c',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },

  errorCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff444433',
  },
  errorCardText: {
    color: '#ff6666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#ff6666',
    fontSize: 14,
    fontWeight: '600',
  },

  reviewCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
  },
  weekOfLabel: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewWeekEnding: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  reviewSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#c9a84c44',
    marginBottom: 16,
  },
  reviewContent: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 16,
  },
  generatedAt: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },

  emptyState: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
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
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 22,
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
  },
});
