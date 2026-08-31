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
import { getUserCabinet, getIsPremium, getUserSettings, upsertUserSettings } from '@/lib/db';
import { COUNSELOR_MODEL_OPTIONS, DEFAULT_COUNSELOR_MODEL } from '@/lib/llmModels';
import { normalizeCounselorId } from '../../services/threadService';
import type { Counselor } from '@/lib/types';

// Server counselor id for a cabinet slug ('marcus-aurelius' → 'marcus',
// 'futureSelf' → 'future-self').
function modelKeyForSlug(slug: string): string {
  const id = normalizeCounselorId(slug);
  return id === 'futureSelf' ? 'future-self' : id;
}

export default function CabinetIndexScreen() {
  const router = useRouter();
  const [cabinet, setCabinet] = useState<Counselor[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [counselorModels, setCounselorModels] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const [members, premium, settings] = await Promise.all([
          getUserCabinet(),
          getIsPremium(),
          getUserSettings(),
        ]);
        if (active) {
          setCabinet(members);
          setIsPremium(premium);
          setCounselorModels(settings?.counselor_models ?? {});
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const handleModelSelect = (modelKey: string, modelId: string) => {
    const updated = { ...counselorModels, [modelKey]: modelId };
    setCounselorModels(updated);
    upsertUserSettings({ counselor_models: updated }).catch(e =>
      console.warn('[MyCabinet] failed to save counselor model:', e)
    );
  };

  const renderModelPicker = (modelKey: string) => {
    const current = counselorModels[modelKey] ?? DEFAULT_COUNSELOR_MODEL;
    return (
      <View style={styles.modelRow}>
        <Text style={styles.modelRowLabel}>Mind</Text>
        {COUNSELOR_MODEL_OPTIONS.map(option => {
          const selected = current === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.modelChip, selected && styles.modelChipSelected]}
              onPress={() => handleModelSelect(modelKey, option.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modelChipText, selected && styles.modelChipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const handleCustomize = () => {
    if (isPremium) {
      router.push('/my-cabinet/select' as any);
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
            {renderModelPicker('future-self')}
          </View>

          {/* Current cabinet members, each with their assigned mind (LLM)
              rendered inside the card to match the Future Self card */}
          {cabinet.map((counselor) => (
            <CounselorCard
              key={counselor.slug}
              counselor={counselor}
              isSelected
              isDisabled={false}
              onToggle={() => {}}
              footer={renderModelPicker(modelKeyForSlug(counselor.slug))}
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
              onPress={() => { setShowPaywall(false); router.push({ pathname: '/paywall', params: { src: 'custom_cabinet' } } as any); }}
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
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  modelRowLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginRight: 2,
  },
  modelChip: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  modelChipSelected: {
    backgroundColor: '#c9a84c18',
    borderColor: '#c9a84c',
  },
  modelChipText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  modelChipTextSelected: {
    color: '#c9a84c',
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
