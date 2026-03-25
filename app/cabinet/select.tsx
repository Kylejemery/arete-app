import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CabinetPreview from '@/components/CabinetPreview';
import CounselorCard from '@/components/CounselorCard';
import { FUTURE_SELF_SLUG, getCounselors, getIsPremium, getUserCabinet, saveCabinetSelection } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { Counselor } from '@/lib/types';

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Stoics', value: 'stoics' },
  { label: 'Warriors', value: 'warriors' },
  { label: 'Athletes', value: 'athletes' },
  { label: 'Builders', value: 'builders' },
  { label: 'Writers', value: 'writers' },
  { label: 'Spiritual', value: 'spiritual' },
];

export default function CabinetSelectScreen() {
  const router = useRouter();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.back();
          return;
        }

        const [allCounselors, cabinet, premium] = await Promise.all([
          getCounselors(),
          getUserCabinet(),
          getIsPremium(),
        ]);

        if (!active) return;

        setCounselors(allCounselors);
        setSelectedSlugs(cabinet.map(c => c.slug));

        if (!premium) {
          setShowPaywall(true);
        }

        setLoading(false);
      })();
      return () => { active = false; };
    }, [router])
  );

  const handleToggle = (slug: string) => {
    setSelectedSlugs(prev => {
      if (prev.includes(slug)) {
        return prev.filter(s => s !== slug);
      }
      if (prev.length >= 5) return prev;
      return [...prev, slug];
    });
  };

  const filteredCounselors = counselors.filter(c => {
    if (c.slug === FUTURE_SELF_SLUG) return false;
    if (activeCategory === 'all') return true;
    return c.category === activeCategory;
  });

  const futureSelfCounselor = counselors.find(c => c.slug === FUTURE_SELF_SLUG);

  const selectedCounselors = counselors.filter(
    c => selectedSlugs.includes(c.slug) && c.slug !== FUTURE_SELF_SLUG
  );

  const handleSave = async () => {
    if (selectedSlugs.length < 3) return;
    setSaving(true);
    try {
      await saveCabinetSelection(selectedSlugs);
      router.back();
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const futureSelfCard = futureSelfCounselor ? (
    <CounselorCard
      key={FUTURE_SELF_SLUG}
      counselor={futureSelfCounselor}
      isSelected
      isDisabled={false}
      isFutureSelf
      onToggle={() => {}}
    />
  ) : (
    <View style={styles.futureSelfPlaceholder}>
      <Text style={styles.futureSelfLabel}>Always Present</Text>
      <Text style={styles.futureSelfName}>Future Self</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/cabinet' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.title}>Counselor Library</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <>
          {/* Category filter bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filterTab, activeCategory === cat.value && styles.filterTabActive]}
                onPress={() => setActiveCategory(cat.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.filterTabText, activeCategory === cat.value && styles.filterTabTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Selection counter */}
          <View style={styles.counterRow}>
            <Text style={styles.counterText}>
              {selectedSlugs.length} of 5 selected
            </Text>
            {selectedSlugs.length < 3 && (
              <Text style={styles.counterHint}>Select at least 3</Text>
            )}
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Counselor list */}
          <FlatList
            data={filteredCounselors}
            keyExtractor={item => item.slug}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={futureSelfCard}
            renderItem={({ item }) => (
              <CounselorCard
                counselor={item}
                isSelected={selectedSlugs.includes(item.slug)}
                isDisabled={selectedSlugs.length >= 5 && !selectedSlugs.includes(item.slug)}
                onToggle={handleToggle}
              />
            )}
          />

          {/* Cabinet preview pinned at bottom */}
          <CabinetPreview
            selectedCounselors={selectedCounselors}
            onSave={handleSave}
            isSaving={saving}
            canSave={selectedSlugs.length >= 3}
          />
        </>
      )}

      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowPaywall(false); router.back(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>Custom Cabinet</Text>
            <Text style={styles.modalSubtitle}>Custom Cabinet is a Premium feature</Text>
            <Text style={styles.modalBody}>
              Choose from 23 counselors across 6 categories to build your ideal advisory board.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => setShowPaywall(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowPaywall(false); router.back(); }}
              style={styles.maybeLaterButton}
            >
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  backButton: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c9a84c',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterTab: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  filterTabActive: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  filterTabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#1a1a2e',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  counterText: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
  },
  counterHint: {
    color: '#888',
    fontSize: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  futureSelfPlaceholder: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#c9a84c',
    marginBottom: 10,
  },
  futureSelfLabel: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  futureSelfName: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Paywall modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalPanel: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  modalTitle: {
    color: '#c9a84c',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalBody: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
  },
  maybeLaterButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  maybeLaterText: {
    color: '#888',
    fontSize: 14,
  },
});
