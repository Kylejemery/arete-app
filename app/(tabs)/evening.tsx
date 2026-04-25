import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { sendCheckInToCabinet } from '../../services/claudeService';
import {
  getTodayCheckin,
  upsertTodayCheckin,
  incrementStreak,
  getRoutineTemplates,
  addRoutineTemplate,
  deleteRoutineTemplate,
  type RoutineTemplate,
} from '@/lib/db';

const stoicPrompts = [
  "What could you have done better today? What would Epictetus say?",
  "Did you act in line with your values today? Would Marcus Aurelius approve?",
  "What obstacles did you face and how did you respond? Were you the master of your reactions?",
  "What emotions controlled you today? How can you cultivate greater equanimity?",
  "What would Marcus Aurelius say about your day — did you act for the common good?",
  "Where did you waste time or energy today? How will you reclaim it tomorrow?",
  "What are you grateful for that you usually take for granted? As Epictetus taught, count your blessings.",
];

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function templateToTask(t: RoutineTemplate) {
  return {
    id: t.id,
    title: t.emoji ? `${t.emoji} ${t.title}` : t.title,
    done: false,
  };
}

export default function EveningScreen() {
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/evening');
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [stoicPrompt, setStoicPrompt] = useState('');
  const [stoicAnswer, setStoicAnswer] = useState('');
  const [stoicSaved, setStoicSaved] = useState(false);
  const [checkinResponse, setCheckinResponse] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskEmoji, setNewTaskEmoji] = useState('');
  const [eveningStreakCounted, setEveningStreakCounted] = useState(false);
  const stoicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      loadPrompts();
      loadAnswers();
      return () => {
        if (stoicTimerRef.current) clearTimeout(stoicTimerRef.current);
      };
    }, [])
  );

  const loadPrompts = () => {
    const day = new Date().getDay();
    setStoicPrompt(stoicPrompts[day]);
  };

  const loadAnswers = async () => {
    const checkin = await getTodayCheckin();
    if (checkin?.stoic_answer) setStoicAnswer(checkin.stoic_answer);
    if (checkin?.cabinet_evening_response) setCheckinResponse(checkin.cabinet_evening_response);
  };

  const saveStoic = async (text: string) => {
    await upsertTodayCheckin({ stoic_answer: text });
    setStoicSaved(true);
    if (stoicTimerRef.current) clearTimeout(stoicTimerRef.current);
    stoicTimerRef.current = setTimeout(() => setStoicSaved(false), 2000);
  };

  const loadTasks = async () => {
    try {
      let tmpl = await getRoutineTemplates('evening');
      if (tmpl.length === 0) {
        await addRoutineTemplate('evening', 'Plan Tomorrow', '📜', 0);
        await addRoutineTemplate('evening', 'Reflect on Your Day', '👁️', 1);
        tmpl = await getRoutineTemplates('evening');
      }
      setTemplates(tmpl);

      const checkin = await getTodayCheckin();
      if (checkin?.evening_tasks && checkin.evening_tasks.length > 0) {
        if (checkin.check_in_date === localToday()) {
          setTasks(checkin.evening_tasks as any[]);
        } else {
          const freshTasks = tmpl.map(templateToTask);
          setTasks(freshTasks);
          await upsertTodayCheckin({ evening_tasks: freshTasks, evening_done: false });
        }
      } else {
        setTasks(tmpl.map(templateToTask));
      }

      // If evening was already marked done today, treat it as already counted
      setEveningStreakCounted(checkin?.check_in_date === localToday() && (checkin?.evening_done ?? false));
    } catch (e) {
      console.error(e);
    }
  };

  const saveTasks = async (updatedTasks: any[]) => {
    const allDone = updatedTasks.length > 0 && updatedTasks.every(t => t.done);
    await upsertTodayCheckin({ evening_tasks: updatedTasks, evening_done: allDone });
    if (allDone && !eveningStreakCounted) {
      setEveningStreakCounted(true);
      await incrementStreak();
    }
  };

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    await saveTasks(updated);
  };

  const addTask = async () => {
    if (newTask.trim()) {
      const newTaskObj = { id: Date.now().toString(), title: newTask.trim(), done: false };
      const updated = [...tasks, newTaskObj];
      setTasks(updated);
      await saveTasks(updated);
      setNewTask('');
      setShowInput(false);
    }
  };

  const deleteTask = (id: string) => {
    Alert.alert('Remove Discipline', 'Are you sure you want to remove this discipline?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = tasks.filter(t => t.id !== id);
          setTasks(updated);
          await saveTasks(updated);
        }
      },
    ]);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteRoutineTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleAddTemplate = async () => {
    if (!newTaskTitle.trim()) return;
    const added = await addRoutineTemplate('evening', newTaskTitle.trim(), newTaskEmoji.trim() || undefined, templates.length);
    if (added) {
      setTemplates(prev => [...prev, added]);
      setNewTaskTitle('');
      setNewTaskEmoji('');
    }
  };

  const renderRightActions = (taskId: string) => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      onPress={() => {
        swipeableRefs.current[taskId]?.close();
        deleteTask(taskId);
      }}
    >
      <Ionicons name="trash-outline" size={22} color="#c9a84cb3" />
    </TouchableOpacity>
  );

  const completedCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} {...swipeHandlers}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Evening Routine 🌙</Text>
            <View style={styles.headerRight}>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{completedCount}/{totalCount}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={18} color="#c9a84c88" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>Today's Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Tasks */}
          <View style={styles.tasksContainer}>
            {tasks.map(task => (
              <Swipeable
                key={task.id}
                ref={(ref) => { swipeableRefs.current[task.id] = ref; }}
                renderRightActions={() => renderRightActions(task.id)}
                overshootRight={false}
              >
                <TouchableOpacity
                  style={[styles.taskCard, task.done && styles.taskCardDone]}
                  onPress={() => toggleTask(task.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={task.done ? '#1a1a2e' : '#c9a84c'}
                  />
                  <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
                    {task.title}
                  </Text>
                </TouchableOpacity>
              </Swipeable>
            ))}
          </View>

          {/* Add Task */}
          {showInput ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Name your discipline..."
                placeholderTextColor="#555"
                value={newTask}
                onChangeText={setNewTask}
                autoFocus
              />
              <View style={styles.inputButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInput(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addConfirmButton} onPress={addTask}>
                  <Text style={styles.addConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowInput(true)}>
              <Ionicons name="add-circle-outline" size={22} color="#c9a84c" />
              <Text style={styles.addButtonText}>Add Discipline</Text>
            </TouchableOpacity>
          )}

          {/* Stoic Prompt */}
          <View style={styles.promptContainer}>
            <View style={styles.promptHeader}>
              <Ionicons name="library-outline" size={20} color="#c9a84c" />
              <Text style={styles.promptTitle}>Stoic Journal</Text>
            </View>
            <Text style={styles.promptQuestion}>{stoicPrompt}</Text>
            <TextInput
              style={styles.promptInput}
              placeholder="Write your thoughts..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              value={stoicAnswer}
              onChangeText={setStoicAnswer}
              onBlur={() => saveStoic(stoicAnswer)}
            />
            <TouchableOpacity style={styles.saveButton} onPress={() => saveStoic(stoicAnswer)}>
              <Text style={styles.saveButtonText}>{stoicSaved ? '✓ Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* All Done */}
          {completedCount === totalCount && totalCount > 0 && (
            <View style={styles.allDoneContainer}>
              <Text style={styles.allDoneEmoji}>🌿</Text>
              <Text style={styles.allDoneText}>Evening Complete</Text>
              <Text style={styles.allDoneSubtext}>Sleep sound. You have lived this day well.</Text>
            </View>
          )}

          {/* Cabinet Check-in */}
          {checkinLoading && (
            <View style={styles.checkinLoadingContainer}>
              <ActivityIndicator size="small" color="#c9a84c" />
              <Text style={styles.checkinLoadingText}>The Cabinet is responding…</Text>
            </View>
          )}
          {checkinResponse && !checkinLoading && (
            <View style={styles.checkinCard}>
              <Text style={styles.checkinLabel}>🌙 The Cabinet</Text>
              <Text style={styles.checkinResponse}>{checkinResponse}</Text>
              <TouchableOpacity style={styles.checkinLink} onPress={() => router.push('/(tabs)/cabinet' as any)}>
                <Text style={styles.checkinLinkText}>View in Cabinet →</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Edit Routine Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Evening Routine</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#c9a84c" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {templates.map(t => (
                <View key={t.id} style={styles.modalTemplateRow}>
                  <Text style={styles.modalTemplateText}>
                    {t.emoji ? `${t.emoji} ${t.title}` : t.title}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteTemplate(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={20} color="#c9a84c88" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalAddRow}>
              <TextInput
                style={styles.modalEmojiInput}
                placeholder="😊"
                placeholderTextColor="#555"
                value={newTaskEmoji}
                onChangeText={setNewTaskEmoji}
                maxLength={2}
              />
              <TextInput
                style={styles.modalTitleInput}
                placeholder="Task name..."
                placeholderTextColor="#555"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                onSubmitEditing={handleAddTemplate}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.modalAddButton} onPress={handleAddTemplate}>
                <Ionicons name="add" size={22} color="#1a1a2e" />
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
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
  content: {
    padding: 25,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#c9a84c',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeRow: {
    backgroundColor: '#c9a84c22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#c9a84c55',
  },
  badge: {
    color: '#c9a84c',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 22,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  progressPercent: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    backgroundColor: '#0d1526',
    borderRadius: 10,
    height: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#c9a84c',
    height: '100%',
    borderRadius: 10,
  },
  tasksContainer: {
    gap: 12,
    marginBottom: 20,
  },
  taskCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  taskCardDone: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  taskText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  taskTextDone: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    textDecorationLine: 'line-through',
  },
  swipeDeleteAction: {
    backgroundColor: '#1e2d4a',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginLeft: 8,
  },
  inputContainer: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c9a84c',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c33',
  },
  inputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    padding: 10,
    paddingHorizontal: 18,
  },
  cancelText: {
    color: '#888',
    fontSize: 14,
  },
  addConfirmButton: {
    backgroundColor: '#c9a84c',
    padding: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  addConfirmText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: '600',
  },
  promptContainer: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  promptTitle: {
    color: '#c9a84c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  promptQuestion: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  promptInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    lineHeight: 22,
  },
  saveButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#c9a84c',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 14,
  },
  allDoneContainer: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c',
    marginBottom: 20,
    gap: 6,
  },
  allDoneEmoji: {
    fontSize: 36,
  },
  allDoneText: {
    color: '#c9a84c',
    fontSize: 18,
    fontWeight: 'bold',
  },
  allDoneSubtext: {
    color: '#fff',
    fontSize: 14,
  },
  checkinLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  checkinLoadingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  checkinCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c55',
  },
  checkinLabel: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  checkinResponse: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 14,
  },
  checkinLink: {
    alignSelf: 'flex-end',
  },
  checkinLinkText: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: '600',
  },
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#c9a84c',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    flexGrow: 0,
    marginBottom: 16,
  },
  modalTemplateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  modalTemplateText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  modalAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  modalEmojiInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    width: 52,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  modalTitleInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  modalAddButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
