import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const defaultTasks = [
  { id: '1', title: 'Eat Breakfast 🍳', done: false },
  { id: '2', title: 'Meditate 🧘', done: false },
];

const affirmations = [
  "I am capable of amazing things.",
  "Today I choose to be my best self.",
  "I am strong, focused, and determined.",
  "Every day I am growing and improving.",
  "I have the power to create change.",
  "I am worthy of success and happiness.",
  "Today is full of possibilities.",
];

export default function MorningScreen() {
  const [tasks, setTasks] = useState(defaultTasks);
  const [newTask, setNewTask] = useState('');
  const [affirmation, setAffirmation] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadTasks();
    setAffirmation(getDailyAffirmation());
  }, []);

  const getDailyAffirmation = () => {
    const day = new Date().getDay();
    return affirmations[day];
  };

  const loadTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('morningTasks');
      const lastReset = await AsyncStorage.getItem('morningLastReset');
      const today = new Date().toDateString();
      if (lastReset !== today) {
        const resetTasks = savedTasks
          ? JSON.parse(savedTasks).map((t: any) => ({ ...t, done: false }))
          : defaultTasks;
        setTasks(resetTasks);
        await AsyncStorage.setItem('morningTasks', JSON.stringify(resetTasks));
        await AsyncStorage.setItem('morningLastReset', today);
        await AsyncStorage.setItem('morningDone', 'false');
      } else {
        if (savedTasks) setTasks(JSON.parse(savedTasks));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveTasks = async (updatedTasks: any[]) => {
    await AsyncStorage.setItem('morningTasks', JSON.stringify(updatedTasks));
    const allDone = updatedTasks.length > 0 && updatedTasks.every(t => t.done);
    await AsyncStorage.setItem('morningDone', allDone ? 'true' : 'false');
    if (allDone) await updateStreak();
  };

  const updateStreak = async () => {
    const lastStreak = await AsyncStorage.getItem('lastStreakDate');
    const today = new Date().toDateString();
    if (lastStreak !== today) {
      const streak = await AsyncStorage.getItem('streak');
      const newStreak = streak ? parseInt(streak) + 1 : 1;
      await AsyncStorage.setItem('streak', newStreak.toString());
      await AsyncStorage.setItem('lastStreakDate', today);
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
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Morning Routine ☀️</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>{completedCount}/{totalCount}</Text>
          </View>
        </View>

        {/* Affirmation */}
        <View style={styles.affirmationContainer}>
          <Ionicons name="sunny-outline" size={20} color="#c9a84c" />
          <Text style={styles.affirmation}>"{affirmation}"</Text>
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
              placeholder="Enter task name..."
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
            <Text style={styles.addButtonText}>Add Task</Text>
          </TouchableOpacity>
        )}

        {/* All Done */}
        {completedCount === totalCount && totalCount > 0 && (
          <View style={styles.allDoneContainer}>
            <Text style={styles.allDoneEmoji}>🎉</Text>
            <Text style={styles.allDoneText}>Morning Routine Complete!</Text>
            <Text style={styles.allDoneSubtext}>You're crushing it today!</Text>
          </View>
        )}

      </ScrollView>
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
  affirmationContainer: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 22,
    borderLeftWidth: 3,
    borderLeftColor: '#c9a84c',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  affirmation: {
    color: '#c9a84c',
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 22,
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
});