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
  { id: '1', title: 'Plan Tomorrow 📋', done: false },
  { id: '2', title: 'Reflect on Your Day 🪞', done: false },
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
  "What could you have done better today?",
  "Did you act in line with your values today?",
  "What obstacles did you face and how did you respond?",
  "What emotions controlled you today? How can you improve?",
  "What would Marcus Aurelius say about your day?",
  "Where did you waste time or energy today?",
  "What are you grateful for that you usually take for granted?",
];

export default function EveningScreen() {
  const [tasks, setTasks] = useState(defaultTasks);
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [stoicPrompt, setStoicPrompt] = useState('');
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [stoicAnswer, setStoicAnswer] = useState('');

  useEffect(() => {
    loadTasks();
    loadPrompts();
    loadAnswers();
  }, []);

  const loadPrompts = () => {
    const day = new Date().getDay();
    setReflectionPrompt(reflectionPrompts[day]);
    setStoicPrompt(stoicPrompts[day]);
  };

  const loadAnswers = async () => {
    const today = new Date().toDateString();
    const savedDate = await AsyncStorage.getItem('eveningAnswerDate');
    if (savedDate === today) {
      const reflection = await AsyncStorage.getItem('reflectionAnswer');
      const stoic = await AsyncStorage.getItem('stoicAnswer');
      if (reflection) setReflectionAnswer(reflection);
      if (stoic) setStoicAnswer(stoic);
    }
  };

  const saveReflection = async (text: string) => {
    setReflectionAnswer(text);
    await AsyncStorage.setItem('reflectionAnswer', text);
    await AsyncStorage.setItem('eveningAnswerDate', new Date().toDateString());
  };

  const saveStoic = async (text: string) => {
    setStoicAnswer(text);
    await AsyncStorage.setItem('stoicAnswer', text);
    await AsyncStorage.setItem('eveningAnswerDate', new Date().toDateString());
  };

  const loadTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('eveningTasks');
      const lastReset = await AsyncStorage.getItem('eveningLastReset');
      const today = new Date().toDateString();

      if (lastReset !== today) {
        const resetTasks = savedTasks
          ? JSON.parse(savedTasks).map((t: any) => ({ ...t, done: false }))
          : defaultTasks;
        setTasks(resetTasks);
        await AsyncStorage.setItem('eveningTasks', JSON.stringify(resetTasks));
        await AsyncStorage.setItem('eveningLastReset', today);
        await AsyncStorage.setItem('eveningDone', 'false');
      } else {
        if (savedTasks) setTasks(JSON.parse(savedTasks));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveTasks = async (updatedTasks: any[]) => {
    await AsyncStorage.setItem('eveningTasks', JSON.stringify(updatedTasks));
    const allDone = updatedTasks.length > 0 && updatedTasks.every(t => t.done);
    await AsyncStorage.setItem('eveningDone', allDone ? 'true' : 'false');
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
      <Text style={styles.title}>Evening Routine 🌙</Text>

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
          placeholderTextColor="#888"
          multiline
          numberOfLines={4}
          value={reflectionAnswer}
          onChangeText={saveReflection}
        />
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
          placeholderTextColor="#888"
          multiline
          numberOfLines={4}
          value={stoicAnswer}
          onChangeText={saveStoic}
        />
      </View>

      {/* All Done Message */}
      {completedCount === totalCount && totalCount > 0 && (
        <View style={styles.allDoneContainer}>
          <Text style={styles.allDoneText}>🌙 Evening Routine Complete!</Text>
          <Text style={styles.allDoneSubtext}>Rest well, you earned it!</Text>
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
  promptContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
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
    marginBottom: 12,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  promptInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#c9a84c33',
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