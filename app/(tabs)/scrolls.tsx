import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { getUserScrolls, type Scroll } from '@/lib/scrolls';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const COUNSELOR_LABELS: Record<string, string> = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

export default function ScrollsTab() {
  const router = useRouter();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requesting, setRequesting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadScrolls();
    }, [])
  );

  const loadScrolls = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getUserScrolls(user.id);
      setScrolls(data);
    } catch (e) {
      console.error('loadScrolls error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!requestTopic.trim()) return;
    setRequesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/scrolls/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: requestTopic.trim(), requestType: 'requested' }),
      });

      if (!response.ok) throw new Error(`Generation failed: ${response.status}`);

      const { title, body, counselor } = await response.json();

      await supabase.from('scrolls').insert({
        user_id: user.id,
        title,
        body,
        counselor,
        goal_source: requestTopic.trim(),
        request_type: 'requested',
      });

      setShowModal(false);
      setRequestTopic('');
      await loadScrolls();
    } catch (e) {
      console.error('handleRequest error:', e);
    } finally {
      setRequesting(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Scrolls</Text>
        <TouchableOpacity style={styles.requestButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#1a1a2e" />
          <Text style={styles.requestButtonText}>Request a Scroll</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#c9a84c" size="large" />
        </View>
      ) : scrolls.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={56} color="#c9a84c22" />
            <Text style={styles.emptyText}>Your scrolls will appear here.</Text>
            <Text style={styles.emptySubtext}>
              Complete your Know Thyself profile to receive your first scroll, written for you by your Counselor.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {scrolls.map(scroll => (
            <TouchableOpacity
              key={scroll.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/scrolls/${scroll.id}` as any)}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.counselorLabel}>{COUNSELOR_LABELS[scroll.counselor]}</Text>
                {scroll.read_count != null && scroll.read_count > 0 && (
                  <View style={styles.readBadge}>
                    <Ionicons name="flame" size={13} color="#c9a84c" />
                    <Text style={styles.readBadgeText}>{scroll.read_count}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>{scroll.title}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>{formatDate(scroll.created_at)}</Text>
                {scroll.last_read_at && (
                  <Text style={styles.lastRead}>Last read {formatDate(scroll.last_read_at)}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Request a Scroll</Text>
                <Text style={styles.modalSubtitle}>What do you want to work on?</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. I want to stop procrastinating on hard decisions"
                  placeholderTextColor="#555"
                  multiline
                  value={requestTopic}
                  onChangeText={setRequestTopic}
                  autoFocus
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!requestTopic.trim() || requesting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleRequest}
                  disabled={!requestTopic.trim() || requesting}
                >
                  {requesting ? (
                    <View style={styles.submitRow}>
                      <ActivityIndicator size="small" color="#1a1a2e" />
                      <Text style={styles.submitButtonText}>Your scroll is being written...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Write My Scroll</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c' },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  requestButtonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyContainer: { alignItems: 'center', gap: 14 },
  emptyText: { color: '#888', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c9a84c22',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  counselorLabel: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#c9a84c11',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  readBadgeText: { color: '#c9a84c', fontSize: 12, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 24, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { color: '#555', fontSize: 11 },
  lastRead: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: { color: '#c9a84c', fontSize: 20, fontWeight: '700' },
  modalSubtitle: { color: '#888', fontSize: 14, marginTop: -4 },
  modalInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  submitButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#c9a84c55' },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitButtonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },
  cancelButton: { padding: 10, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 15 },
});
