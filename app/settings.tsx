import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Day index 0 = Sunday … 6 = Saturday (matches Expo weekday - 1)
const MORNING_MESSAGES = [
  "The impediment to action advances action. What stands in the way becomes the way. Your morning awaits.",
  "Waste no more time arguing about what a good man should be. Be one. Begin your morning.",
  "You have power over your mind — not outside events. Realize this, and you will find strength. Open the Cabinet.",
  "It is not death that a man should fear, but he should fear never beginning to live. Start your morning.",
  "Begin at once to live, and count each separate day as a separate life. Your cabinet is waiting.",
  "The first rule is to keep an untroubled spirit. The second is to look things in the face. Morning check-in time.",
  "Do not indulge in dreams of what you have not, but count up the chief of the blessings you do have. Good morning.",
];

const EVENING_MESSAGES = [
  "Confine yourself to the present. The evening asks: did you live virtuously today?",
  "The day is ending. Give an account of it to your cabinet.",
  "Before you sleep: what progress did you make today toward the person you are trying to become?",
  "Evening review: did your actions today match your values? Your cabinet is ready to reflect.",
  "A day well-lived makes sleep easy. What was well-lived today?",
  "Marcus reminded himself every evening: what emotion did I let control me today? What will you answer?",
  "End the day with honesty. Your cabinet awaits your debrief.",
];

// Midday task reminder — counselor rotates by day (Sun–Sat)
const TASK_COUNSELORS = [
  'Theodore Roosevelt', // Sunday (0)
  'Marcus Aurelius',    // Monday (1)
  'David Goggins',      // Tuesday (2)
  'Epictetus',          // Wednesday (3)
  'Theodore Roosevelt', // Thursday (4)
  'David Goggins',      // Friday (5)
  'Future Kyle',        // Saturday (6)
];

const TASK_MESSAGES = [
  "Get action! Do things — be sane, don't fritter away your time. Check your task list.",
  "How are your tasks progressing? What remains undone is still within your power.",
  "Midday check. What's left on your list? Stop making excuses and get after it.",
  "What is within your control today that remains undone? Address it. Now.",
  "Get action! Do things — be sane, don't fritter away your time. Check your task list.",
  "Midday check. What's left on your list? Stop making excuses and get after it.",
  "Hey. It's afternoon. I know what's on your list. Do not let yourself down.",
];

const WORKOUT_MESSAGES = [
  "Sunday is not a rest day from becoming who you need to be. Get after it.",
  "Monday sets the tone for the whole week. Do not waste it. Get your workout in.",
  "You told yourself you'd train today. That conversation is over. Go.",
  "Midweek. Most people take their foot off the gas. That is exactly why you won't.",
  "Thursday. You've put in the work this week. Don't stop now.",
  "Friday. Some people are already coasting into the weekend. Not you. Train.",
  "Saturday. No meetings, no excuses. The best workout of the week is waiting for you.",
];

const READING_MESSAGES = [
  "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane. Read tonight.",
  "You have a book waiting. What excuse will you offer the man you are trying to become?",
  "Receive without pride, relinquish without struggle. But first — read.",
  "He who lives in harmony with himself lives in harmony with the universe. Have you read today?",
  "If it is not right, do not do it. If it is not true, do not say it. But reading — always reading.",
  "Never esteem anything as of advantage to you that will make you break your word — or lose your self-respect. Or miss your reading.",
  "The impediment to reading? There is none. Only the choice.",
];

const FUTURE_KYLE_MESSAGES = [
  "Is what you're doing right now something I would recognize? — Future Kyle",
  "I remember this week. What you do today matters more than you know. — Future Kyle",
  "The Arete app. The boxing. The reading. The family. You can do all of it. I'm proof. — Future Kyle",
  "Midweek. This is where most people give up. This is also where you separate yourself. — Future Kyle",
  "I didn't get here by accident. Neither will you. Keep going. — Future Kyle",
  "Friday Kyle is tired. I know. I remember. Do the one hard thing anyway. — Future Kyle",
  "Saturdays were sacred. Family, training, reading. Do not waste this one. — Future Kyle",
];


export default function SettingsScreen() {
  const router = useRouter();
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState('7');
  const [morningMinute, setMorningMinute] = useState('00');
  const [eveningHour, setEveningHour] = useState('20');
  const [eveningMinute, setEveningMinute] = useState('00');

  const [taskReminderEnabled, setTaskReminderEnabled] = useState(true);
  const [taskReminderHour, setTaskReminderHour] = useState('12');
  const [taskReminderMinute, setTaskReminderMinute] = useState('00');

  const [workoutReminderEnabled, setWorkoutReminderEnabled] = useState(true);
  const [workoutReminderHour, setWorkoutReminderHour] = useState('6');
  const [workoutReminderMinute, setWorkoutReminderMinute] = useState('00');

  const [readingReminderEnabled, setReadingReminderEnabled] = useState(true);
  const [readingReminderHour, setReadingReminderHour] = useState('21');
  const [readingReminderMinute, setReadingReminderMinute] = useState('00');

  const [futureKyleEnabled, setFutureKyleEnabled] = useState(false);
  const [futureKyleHour, setFutureKyleHour] = useState('15');
  const [futureKyleMinute, setFutureKyleMinute] = useState('00');

  useEffect(() => {
    loadSettings();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your phone settings to use reminders.'
      );
    }
  };

  const loadSettings = async () => {
    try {
      const s = await AsyncStorage.getItem('notificationSettings');
      if (s) {
        const parsed = JSON.parse(s);
        setMorningEnabled(parsed.morningEnabled ?? true);
        setEveningEnabled(parsed.eveningEnabled ?? true);
        setMorningHour(parsed.morningHour ?? '7');
        setMorningMinute(parsed.morningMinute ?? '00');
        setEveningHour(parsed.eveningHour ?? '20');
        setEveningMinute(parsed.eveningMinute ?? '00');
        setTaskReminderEnabled(parsed.taskReminderEnabled ?? true);
        setTaskReminderHour(parsed.taskReminderHour ?? '12');
        setTaskReminderMinute(parsed.taskReminderMinute ?? '00');
        setWorkoutReminderEnabled(parsed.workoutReminderEnabled ?? true);
        setWorkoutReminderHour(parsed.workoutReminderHour ?? '6');
        setWorkoutReminderMinute(parsed.workoutReminderMinute ?? '00');
        setReadingReminderEnabled(parsed.readingReminderEnabled ?? true);
        setReadingReminderHour(parsed.readingReminderHour ?? '21');
        setReadingReminderMinute(parsed.readingReminderMinute ?? '00');
        setFutureKyleEnabled(parsed.futureKyleEnabled ?? false);
        setFutureKyleHour(parsed.futureKyleHour ?? '15');
        setFutureKyleMinute(parsed.futureKyleMinute ?? '00');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        morningEnabled,
        eveningEnabled,
        morningHour,
        morningMinute,
        eveningHour,
        eveningMinute,
        taskReminderEnabled,
        taskReminderHour,
        taskReminderMinute,
        workoutReminderEnabled,
        workoutReminderHour,
        workoutReminderMinute,
        readingReminderEnabled,
        readingReminderHour,
        readingReminderMinute,
        futureKyleEnabled,
        futureKyleHour,
        futureKyleMinute,
      };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      await scheduleNotifications(settings);
      Alert.alert('✅ Saved!', 'Your notification settings have been updated.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save settings.');
    }
  };

  const scheduleNotifications = async (settings: any) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Helper: schedule 7 weekly notifications (one per day) for a rotating message set.
    // Expo CalendarTrigger weekday: 1=Sunday, 2=Monday, …, 7=Saturday
    const scheduleWeekly = async (
      titleFn: (day: number) => string,
      bodyFn: (day: number) => string,
      hour: number,
      minute: number,
    ) => {
      for (let day = 0; day < 7; day++) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: titleFn(day),
            body: bodyFn(day),
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: day + 1, // Expo: 1=Sunday … 7=Saturday
            hour,
            minute,
            repeats: true,
          },
        });
      }
    };

    // Morning check-in — Marcus Aurelius chairs every morning
    if (settings.morningEnabled) {
      await scheduleWeekly(
        () => 'Marcus Aurelius — Chair',
        (day) => MORNING_MESSAGES[day],
        parseInt(settings.morningHour),
        parseInt(settings.morningMinute),
      );
    }

    // Evening check-in — Marcus Aurelius
    if (settings.eveningEnabled) {
      await scheduleWeekly(
        () => 'Marcus Aurelius — Chair',
        (day) => EVENING_MESSAGES[day],
        parseInt(settings.eveningHour),
        parseInt(settings.eveningMinute),
      );
    }

    // Midday task reminder — rotating counselors
    if (settings.taskReminderEnabled) {
      await scheduleWeekly(
        (day) => TASK_COUNSELORS[day],
        (day) => TASK_MESSAGES[day],
        parseInt(settings.taskReminderHour),
        parseInt(settings.taskReminderMinute),
      );
    }

    // Goggins — workout reminder
    if (settings.workoutReminderEnabled) {
      await scheduleWeekly(
        () => 'David Goggins',
        (day) => WORKOUT_MESSAGES[day],
        parseInt(settings.workoutReminderHour),
        parseInt(settings.workoutReminderMinute),
      );
    }

    // Marcus — reading reminder
    if (settings.readingReminderEnabled) {
      await scheduleWeekly(
        () => 'Marcus Aurelius — Chair',
        (day) => READING_MESSAGES[day],
        parseInt(settings.readingReminderHour),
        parseInt(settings.readingReminderMinute),
      );
    }

    // Future Kyle — big picture check-in (opt-in)
    if (settings.futureKyleEnabled) {
      await scheduleWeekly(
        () => 'Future Kyle — Age 50',
        (day) => FUTURE_KYLE_MESSAGES[day],
        parseInt(settings.futureKyleHour),
        parseInt(settings.futureKyleMinute),
      );
    }
  };

  const formatDisplayTime = (hour: string, minute: string) => {
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  };

  const renderTimeInputs = (
    hour: string,
    setHour: (v: string) => void,
    minute: string,
    setMinute: (v: string) => void,
    hourPlaceholder: string,
  ) => (
    <>
      <Text style={styles.previewText}>{formatDisplayTime(hour, minute)}</Text>
      <Text style={styles.label}>Hour (0–23)</Text>
      <TextInput
        style={styles.input}
        value={hour}
        onChangeText={setHour}
        keyboardType="number-pad"
        placeholder={hourPlaceholder}
        placeholderTextColor="#555"
      />
      <Text style={styles.label}>Minute</Text>
      <TextInput
        style={styles.input}
        value={minute}
        onChangeText={setMinute}
        keyboardType="number-pad"
        placeholder="00"
        placeholderTextColor="#555"
      />
    </>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚙️ Settings</Text>

      <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/know-thyself' as any)}>
        <Text style={styles.profileButtonText}>📖 Edit Your Know Thyself Profile</Text>
      </TouchableOpacity>

      {/* Morning Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>☀️ Marcus Aurelius — Morning Check-In</Text>
          <Switch
            value={morningEnabled}
            onValueChange={setMorningEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {'"Begin at once to live, and count each separate day as a separate life."'}
        </Text>
        {morningEnabled && renderTimeInputs(morningHour, setMorningHour, morningMinute, setMorningMinute, '7')}
      </View>

      {/* Evening Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🌙 Marcus Aurelius — Evening Check-In</Text>
          <Switch
            value={eveningEnabled}
            onValueChange={setEveningEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>{'"Confine yourself to the present."'}</Text>
        {eveningEnabled && renderTimeInputs(eveningHour, setEveningHour, eveningMinute, setEveningMinute, '20')}
      </View>

      {/* Midday Task Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📋 Midday Task Reminder</Text>
          <Switch
            value={taskReminderEnabled}
            onValueChange={setTaskReminderEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {'"Your counselors rotate midday — keeping you on task."'}
        </Text>
        {taskReminderEnabled && renderTimeInputs(taskReminderHour, setTaskReminderHour, taskReminderMinute, setTaskReminderMinute, '12')}
      </View>

      {/* Goggins — Workout Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>💪 David Goggins — Workout Reminder</Text>
          <Switch
            value={workoutReminderEnabled}
            onValueChange={setWorkoutReminderEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>{'"Stop making excuses and get after it."'}</Text>
        {workoutReminderEnabled && renderTimeInputs(workoutReminderHour, setWorkoutReminderHour, workoutReminderMinute, setWorkoutReminderMinute, '6')}
      </View>

      {/* Marcus — Reading Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📖 Marcus Aurelius — Reading Reminder</Text>
          <Switch
            value={readingReminderEnabled}
            onValueChange={setReadingReminderEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {'"The impediment to reading? There is none. Only the choice."'}
        </Text>
        {readingReminderEnabled && renderTimeInputs(readingReminderHour, setReadingReminderHour, readingReminderMinute, setReadingReminderMinute, '21')}
      </View>

      {/* Future Kyle — Daily Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔮 Future Kyle — Daily Check-In</Text>
          <Switch
            value={futureKyleEnabled}
            onValueChange={setFutureKyleEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {"\"Is what you're doing right now something I would recognize? — Future Kyle\""}{'\n'}
          <Text style={styles.hintInline}>Off by default — opt in when ready.</Text>
        </Text>
        {futureKyleEnabled && renderTimeInputs(futureKyleHour, setFutureKyleHour, futureKyleMinute, setFutureKyleMinute, '15')}
      </View>

      {/* Privacy Policy */}
      <TouchableOpacity
        onPress={() => router.push('/privacy' as any)}
        accessibilityRole="button"
        accessibilityLabel="Open privacy policy"
        style={styles.privacyRow}
      >
        <Text style={styles.privacyText}>Privacy Policy</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save & Schedule Notifications</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Note: Notifications work on physical devices. They may not appear in web/simulator.
      </Text>
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
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  cardSubtitle: {
    color: '#c9a84c',
    fontSize: 12,
    fontStyle: 'italic',
  },
  previewText: {
    color: '#c9a84c',
    fontSize: 22,
    fontWeight: 'bold',
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  hint: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
  },
  hintInline: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
  },
  profileButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c44',
  },
  profileButtonText: {
    color: '#c9a84c',
    fontWeight: 'bold',
    fontSize: 15,
  },
  privacyRow: { paddingVertical: 12, paddingHorizontal: 8, marginTop: 12 },
  privacyText: { color: '#c9a84c', fontSize: 16 },
});