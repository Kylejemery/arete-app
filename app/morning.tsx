import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
        // Reset tasks every morning
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

    if (allDone) {
      await updateStreak();
    }
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
      const newTaskObj = {
        id: Date.now().toString(),
        title: newTask.trim(),
        done: false,
      };
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <Text style={styles.title}>Morning Routine ☀️</Text>

      {/* Affirmation */}
      <View style={styles.affirmationContainer}>
        <Ionicons name="sunny-outline" size={20} color="#c9a84c" />
        <Text style={styles.affirmation}>"{affirmation}"</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Today's Progress</Text>
          <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
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
            >
              <Ionicons
                name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={task.done ? '#1a1a2e' : '#c9a84c'}
              />
              <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
                {task.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTask(task.id)}
            >
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
            placeholderTextColor="#888"
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
          <Ionicons name="add-circle-outline" size={24} color="#c9a84c" />
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      )}

      {/* All Done Message */}
      {completedCount === totalCount && totalCount > 0 && (
        <View style={styles.allDoneContainer}>
          <Text style={styles.allDoneText}>🎉 Morning Routine Complete!</Text>
          <Text style={styles.allDoneSubtext}>You're crushing it today!</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 25,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#c9a84c',
    marginBottom: 20,
  },
  affirmationContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
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
    marginBottom: 25,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressCount: {
    color: '#c9a84c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    height: 10,
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
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  taskCardDone: {
    backgroundColor: '#c9a84c',
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
  },
  inputContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c9a84c',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  inputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    padding: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#888',
    fontSize: 14,
  },
  addConfirmButton: {
    backgroundColor: '#c9a84c',
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#c9a84c',
    fontSize: 16,
  },
  allDoneContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c',
    marginBottom: 20,
  },
  allDoneText: {
    color: '#c9a84c',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  allDoneSubtext: {
    color: '#fff',
    fontSize: 14,
  },
});