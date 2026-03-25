import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CounselorCard from '@/components/CounselorCard';
import { getUserCabinet, getIsPremium } from '@/lib/db';
import type { Counselor } from '@/lib/types';

export default function CabinetIndexScreen() {
  const router = useRouter();
  const [cabinet, setCabinet] = useState<Counselor[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const [members, premium] = await Promise.all([getUserCabinet(), getIsPremium()]);
        if (active) {
          setCabinet(members);
          setIsPremium(premium);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const handleCustomize = () => {
    if (isPremium) {
      router.push('/cabinet/select' as any);
    } else {
      setShowPaywall(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/cabinet' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.title}>My Cabinet</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Future Self always at top */}
          <View style={styles.futureSelfCard}>
            <Text style={styles.futureSelfLabel}>Always Present</Text>
            <Text style={styles.futureSelfName}>Future Self</Text>
            <Text style={styles.futureSelfDesc}>Your ideal self, years from now, guiding you forward.</Text>
          </View>

          {/* Current cabinet members */}
          {cabinet.map((counselor) => (
            <CounselorCard
              key={counselor.slug}
              counselor={counselor}
              isSelected
              isDisabled={false}
              onToggle={() => {}}
            />
          ))}

          {cabinet.length === 0 && (
            <Text style={styles.emptyText}>No counselors selected yet.</Text>
          )}
        </ScrollView>
      )}

      {/* Customize button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.customizeButton} onPress={handleCustomize} activeOpacity={0.8}>
          <Text style={styles.customizeButtonText}>✦ Customize Cabinet</Text>
        </TouchableOpacity>
      </View>

      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaywall(false)}
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
            <TouchableOpacity onPress={() => setShowPaywall(false)} style={styles.maybeLaterButton}>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#c9a84c',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 0,
  },
  futureSelfCard: {
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
    marginBottom: 4,
  },
  futureSelfDesc: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
  },
  customizeButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    alignItems: 'center',
  },
  customizeButtonText: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: '700',
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
