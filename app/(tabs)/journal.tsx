import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
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
import { getGoals, upsertGoal, completeGoal } from '@/lib/db';
import type { Goal } from '@/lib/types';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

export default function GoalsScreen() {
  const swipeHandlers = useSwipeNavigation('/journal');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const data = await getGoals(user.id);
      setGoals(data);
    } catch (e) {
      console.error('loadGoals error:', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  const handleComplete = (goal: Goal) => {
    Alert.alert(
      'Mark this goal as complete?',
      `"${goal.title}"`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes', onPress: async () => {
            try {
              const updated = await completeGoal(goal.id);
              setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
              showToast('Goal achieved. 🏛️');
            } catch (e) {
              console.error('completeGoal error:', e);
            }
          },
        },
      ]
    );
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !userId) return;
    setSaving(true);
    try {
      const created = await upsertGoal({
        user_id: userId,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        target_date: newTargetDate.trim() || undefined,
        source: 'user',
        completed: false,
      });
      setGoals(prev => [...prev, created]);
      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewTargetDate('');
    } catch (e) {
      console.error('upsertGoal error:', e);
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewTargetDate('');
  };

  const formatTargetDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCompletedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <SafeAreaView style={styles.container} {...swipeHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Goals 🎯</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={18} color="#1a1a2e" />
          <Text style={styles.addButtonText}>Add Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty state */}
        {!loading && goals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="flag-outline" size={52} color="#c9a84c22" />
            <Text style={styles.emptyText}>No goals yet.</Text>
            <Text style={styles.emptySubtext}>
              Your goals from onboarding will appear here. You can also add your own.
            </Text>
          </View>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active</Text>
            {activeGoals.map(goal => (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalCardBody}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  {goal.description ? (
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  ) : null}
                  {goal.target_date ? (
                    <Text style={styles.goalDate}>By {formatTargetDate(goal.target_date)}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => handleComplete(goal)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="checkmark-circle-outline" size={30} color="#c9a84c" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.completedToggle}
              onPress={() => setShowCompleted(prev => !prev)}
            >
              <Text style={styles.completedToggleText}>
                {showCompleted ? 'Hide completed' : `Show completed (${completedGoals.length})`}
              </Text>
              <Ionicons
                name={showCompleted ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#888"
              />
            </TouchableOpacity>

            {showCompleted && completedGoals.map(goal => (
              <View key={goal.id} style={[styles.goalCard, styles.goalCardCompleted]}>
                <View style={styles.goalCardBody}>
                  <Text style={[styles.goalTitle, styles.goalTitleCompleted]}>{goal.title}</Text>
                  {goal.description ? (
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  ) : null}
                  {goal.completed_at ? (
                    <Text style={styles.goalCompletedDate}>
                      Completed {formatCompletedDate(goal.completed_at)}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="checkmark-circle" size={28} color="#4caf5088" />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Toast */}
      {toastMessage ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      {/* Add Goal Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                  <Text style={styles.modalTitle}>Add Goal</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Title *"
                    placeholderTextColor="#555"
                    value={newTitle}
                    onChangeText={setNewTitle}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.modalInput, styles.modalInputMultiline]}
                    placeholder="Description (optional)"
                    placeholderTextColor="#555"
                    value={newDescription}
                    onChangeText={setNewDescription}
                    multiline
                    textAlignVertical="top"
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Target date: YYYY-MM-DD (optional)"
                    placeholderTextColor="#555"
                    value={newTargetDate}
                    onChangeText={setNewTargetDate}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!newTitle.trim() || saving) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleAdd}
                    disabled={!newTitle.trim() || saving}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? 'Saving...' : 'Save Goal'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addButtonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  content: { padding: 16, paddingBottom: 48 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#888', fontSize: 18, fontWeight: '600' },
  emptySubtext: {
    color: '#555', fontSize: 14, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 20,
  },
  sectionLabel: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalCardCompleted: {
    borderColor: '#4caf5022',
    opacity: 0.7,
  },
  goalCardBody: { flex: 1, gap: 4 },
  goalTitle: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 22 },
  goalTitleCompleted: { color: '#888', textDecorationLine: 'line-through' },
  goalDescription: { color: '#888', fontSize: 13, lineHeight: 20 },
  goalDate: { color: '#c9a84c', fontSize: 12, marginTop: 2 },
  goalCompletedDate: { color: '#555', fontSize: 12, marginTop: 2 },
  checkButton: { padding: 2 },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c11',
  },
  completedToggleText: { color: '#888', fontSize: 14 },
  toast: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  toastText: { color: '#c9a84c', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: { color: '#c9a84c', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  modalInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: { backgroundColor: '#c9a84c55' },
  saveButtonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },
  cancelButton: { padding: 10, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 15 },
});
