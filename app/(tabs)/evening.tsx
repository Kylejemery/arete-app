import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { sendCheckInToCabinet } from '../../services/claudeService';
import { getTodayCheckin, upsertTodayCheckin } from '../lib/db';

const defaultTasks = [
  { id: '1', title: 'Plan Tomorrow 📜', done: false },
  { id: '2', title: 'Reflect on Your Day 👁️', done: false },
];

const reflectionPrompts = [
  "What was your biggest win today?",
  "What are you most grateful for today?",
  "What made you smile today?",
  "What challenge did you overcome today?",
  "Who did you positively impact today?",
  "What progress did you make towards your goals?",
  "What moment are you most proud of today?",
];

const stoicPrompts = [
  "What could you have done better today? What would Epictetus say?",
  "Did you act in line with your values today? Would Marcus Aurelius approve?",
  "What obstacles did you face and how did you respond? Were you the master of your reactions?",
  "What emotions controlled you today? How can you cultivate greater equanimity?",
  "What would Marcus Aurelius say about your day — did you act for the common good?",
  "Where did you waste time or energy today? How will you reclaim it tomorrow?",
  "What are you grateful for that you usually take for granted? As Epictetus taught, count your blessings.",
];

export default function EveningScreen() {
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/evening');
  const [tasks, setTasks] = useState(defaultTasks);
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [stoicPrompt, setStoicPrompt] = useState('');
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [stoicAnswer, setStoicAnswer] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [stoicSaved, setStoicSaved] = useState(false);
  const [checkinResponse, setCheckinResponse] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const reflectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
      loadPrompts();
      loadAnswers();
      return () => {
        if (reflectionTimerRef.current) clearTimeout(reflectionTimerRef.current);
        if (stoicTimerRef.current) clearTimeout(stoicTimerRef.current);
      };
    }, [])
  );

  const loadPrompts = () => {
    const day = new Date().getDay();
    setReflectionPrompt(reflectionPrompts[day]);
    setStoicPrompt(stoicPrompts[day]);
  };

  const loadAnswers = async () => {
    const checkin = await getTodayCheckin();
    if (checkin?.reflection_answer) setReflectionAnswer(checkin.reflection_answer);
    if (checkin?.stoic_answer) setStoicAnswer(checkin.stoic_answer);
    if (checkin?.cabinet_evening_response) setCheckinResponse(checkin.cabinet_evening_response);
  };

  const saveReflection = async (text: string) => {
    await upsertTodayCheckin({ reflection_answer: text });
    setReflectionSaved(true);
    if (reflectionTimerRef.current) clearTimeout(reflectionTimerRef.current);
    reflectionTimerRef.current = setTimeout(() => setReflectionSaved(false), 2000);
    const checkin = await getTodayCheckin();
    if (!checkin?.cabinet_evening_response) {
      setCheckinLoading(true);
      setCheckinResponse(null);
      const reply = await sendCheckInToCabinet('evening');
      setCheckinLoading(false);
      setCheckinResponse(reply);
      if (reply) {
        await upsertTodayCheckin({ cabinet_evening_response: reply });
      }
    }
  };

  const saveStoic = async (text: string) => {
    await upsertTodayCheckin({ stoic_answer: text });
    setStoicSaved(true);
    if (stoicTimerRef.current) clearTimeout(stoicTimerRef.current);
    stoicTimerRef.current = setTimeout(() => setStoicSaved(false), 2000);
  };

  const loadTasks = async () => {
    try {
      const checkin = await getTodayCheckin();
      if (checkin?.evening_tasks && checkin.evening_tasks.length > 0) {
        const todayDate = new Date().toISOString().split('T')[0];
        if (checkin.date === todayDate) {
          setTasks(checkin.evening_tasks as any[]);
        } else {
          const resetTasks = checkin.evening_tasks.map((t: any) => ({ ...t, done: false }));
          setTasks(resetTasks);
          await upsertTodayCheckin({ evening_tasks: resetTasks, evening_done: false });
        }
      } else {
        setTasks(defaultTasks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveTasks = async (updatedTasks: any[]) => {
    const allDone = updatedTasks.length > 0 && updatedTasks.every(t => t.done);
    await upsertTodayCheckin({ evening_tasks: updatedTasks, evening_done: allDone });
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
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{completedCount}/{totalCount}</Text>
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
              <View key={task.id} style={styles.taskRow}>
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
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTask(task.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
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

          {/* Reflection Prompt */}
          <View style={styles.promptContainer}>
            <View style={styles.promptHeader}>
              <Ionicons name="heart-outline" size={20} color="#c9a84c" />
              <Text style={styles.promptTitle}>Evening Reflection</Text>
            </View>
            <Text style={styles.promptQuestion}>{reflectionPrompt}</Text>
            <TextInput
              style={styles.promptInput}
              placeholder="Write your thoughts..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              value={reflectionAnswer}
              onChangeText={setReflectionAnswer}
              onBlur={() => saveReflection(reflectionAnswer)}
            />
            <TouchableOpacity style={styles.saveButton} onPress={() => saveReflection(reflectionAnswer)}>
              <Text style={styles.saveButtonText}>{reflectionSaved ? '✓ Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

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
              <TouchableOpacity style={styles.checkinLink} onPress={() => router.push('/cabinet')}>
                <Text style={styles.checkinLinkText}>View in Cabinet →</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: '#16213e',
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
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  deleteButton: {
    padding: 10,
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff444433',
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
});