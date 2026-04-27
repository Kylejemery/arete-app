import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getDevPremiumOverride, setDevPremiumOverride } from '../lib/devMode';

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

  const [simulatingFree, setSimulatingFree] = useState(false);
  const [activePicker, setActivePicker] = useState<{
    setHour: (v: string) => void;
    setMinute: (v: string) => void;
    hour: string;
    minute: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
    requestPermissions();
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c9a84c',
      });
    }
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
        scheduleNotifications(parsed, true).catch(() => {});
      }
      setSimulatingFree(getDevPremiumOverride() === false);
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
      const scheduled = await scheduleNotifications(settings);
      if (scheduled) {
        const enabledCount = [
          morningEnabled,
          eveningEnabled,
          taskReminderEnabled,
          workoutReminderEnabled,
          readingReminderEnabled,
          futureKyleEnabled,
        ].filter(Boolean).length;
        const scheduledCount = enabledCount * 7;
        Alert.alert('✅ Saved!', `Your notification settings have been updated. ${scheduledCount} reminder${scheduledCount !== 1 ? 's' : ''} scheduled.`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save settings.');
    }
  };

  const buildCurrentSettings = (overrides: Record<string, any> = {}) => ({
    morningEnabled, morningHour, morningMinute,
    eveningEnabled, eveningHour, eveningMinute,
    taskReminderEnabled, taskReminderHour, taskReminderMinute,
    workoutReminderEnabled, workoutReminderHour, workoutReminderMinute,
    readingReminderEnabled, readingReminderHour, readingReminderMinute,
    futureKyleEnabled, futureKyleHour, futureKyleMinute,
    ...overrides,
  });

  const persistAndReschedule = async (overrides: Record<string, any> = {}) => {
    const settings = buildCurrentSettings(overrides);
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      await scheduleNotifications(settings, true);
    } catch {}
  };

  const scheduleNotifications = async (settings: any, silent = false): Promise<boolean> => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (!silent) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your phone settings to schedule reminders.',
        );
      }
      return false;
    }

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

    // Morning check-in
    if (settings.morningEnabled) {
      await scheduleWeekly(
        () => 'Marcus Aurelius — Morning Check-In',
        (day) => MORNING_MESSAGES[day],
        parseInt(settings.morningHour),
        parseInt(settings.morningMinute),
      );
    }

    // Evening check-in
    if (settings.eveningEnabled) {
      await scheduleWeekly(
        () => 'Marcus Aurelius — Evening Check-In',
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
        () => 'David Goggins — Workout Reminder',
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

    return true;
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
  ) => (
    <TouchableOpacity
      style={styles.timePickerButton}
      onPress={() => setActivePicker({ setHour, setMinute, hour, minute })}
      activeOpacity={0.7}
    >
      <Text style={styles.previewText}>{formatDisplayTime(hour, minute)}</Text>
      <Ionicons name="chevron-down" size={18} color="#c9a84c" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Native time picker modal */}
      {activePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={!!activePicker}
          onRequestClose={() => setActivePicker(null)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => setActivePicker(null)}
          >
            <View style={styles.pickerSheet}>
              <View style={styles.pickerSheetHandle} />
              <DateTimePicker
                value={(() => {
                  const d = new Date();
                  d.setHours(parseInt(activePicker.hour) || 0, parseInt(activePicker.minute) || 0, 0, 0);
                  return d;
                })()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                textColor="#fff"
                onChange={(_event, date) => {
                  if (date) {
                    activePicker.setHour(String(date.getHours()));
                    activePicker.setMinute(String(date.getMinutes()).padStart(2, '0'));
                  }
                  if (Platform.OS === 'android') {
                    setActivePicker(null);
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setActivePicker(null)}
                >
                  <Text style={styles.pickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.title}>⚙️ Settings</Text>
      </View>

      <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/know-thyself' as any)}>
        <Text style={styles.profileButtonText}>📖 Edit Your Know Thyself Profile</Text>
      </TouchableOpacity>

      {/* Morning Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>☀️ Marcus Aurelius — Morning Check-In</Text>
          <Switch
            value={morningEnabled}
            onValueChange={(val) => { setMorningEnabled(val); persistAndReschedule({ morningEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {'"Begin at once to live, and count each separate day as a separate life."'}
        </Text>
        {morningEnabled && renderTimeInputs(morningHour, setMorningHour, morningMinute, setMorningMinute)}
      </View>

      {/* Evening Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🌙 Marcus Aurelius — Evening Check-In</Text>
          <Switch
            value={eveningEnabled}
            onValueChange={(val) => { setEveningEnabled(val); persistAndReschedule({ eveningEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>{'"Confine yourself to the present."'}</Text>
        {eveningEnabled && renderTimeInputs(eveningHour, setEveningHour, eveningMinute, setEveningMinute)}
      </View>

      {/* Midday Task Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📋 Midday Task Reminder</Text>
          <Switch
            value={taskReminderEnabled}
            onValueChange={(val) => { setTaskReminderEnabled(val); persistAndReschedule({ taskReminderEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {'"Your counselors rotate midday — keeping you on task."'}
        </Text>
        {taskReminderEnabled && renderTimeInputs(taskReminderHour, setTaskReminderHour, taskReminderMinute, setTaskReminderMinute)}
      </View>

      {/* Goggins — Workout Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>💪 David Goggins — Workout Reminder</Text>
          <Switch
            value={workoutReminderEnabled}
            onValueChange={(val) => { setWorkoutReminderEnabled(val); persistAndReschedule({ workoutReminderEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>{'"Stop making excuses and get after it."'}</Text>
        {workoutReminderEnabled && renderTimeInputs(workoutReminderHour, setWorkoutReminderHour, workoutReminderMinute, setWorkoutReminderMinute)}
      </View>

      {/* Marcus — Reading Reminder */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📖 Marcus Aurelius — Reading Reminder</Text>
          <Switch
            value={readingReminderEnabled}
            onValueChange={(val) => { setReadingReminderEnabled(val); persistAndReschedule({ readingReminderEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {'"The impediment to reading? There is none. Only the choice."'}
        </Text>
        {readingReminderEnabled && renderTimeInputs(readingReminderHour, setReadingReminderHour, readingReminderMinute, setReadingReminderMinute)}
      </View>

      {/* Future Kyle — Daily Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔮 Future Kyle — Daily Check-In</Text>
          <Switch
            value={futureKyleEnabled}
            onValueChange={(val) => { setFutureKyleEnabled(val); persistAndReschedule({ futureKyleEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {"\"Is what you're doing right now something I would recognize? — Future Kyle\""}{'\n'}
          <Text style={styles.hintInline}>Off by default — opt in when ready.</Text>
        </Text>
        {futureKyleEnabled && renderTimeInputs(futureKyleHour, setFutureKyleHour, futureKyleMinute, setFutureKyleMinute)}
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

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                await supabase.auth.signOut();
                router.replace('/(auth)/login' as any);
              },
            },
          ]);
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Note: Notifications work on physical devices. They may not appear in web/simulator.
      </Text>

      {/* DEV TOOLS — only visible when EXPO_PUBLIC_DEV_MODE=true */}
      {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>DEV ONLY</Text>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          <View style={styles.devRow}>
            <View style={styles.devTextGroup}>
              <Text style={styles.devRowTitle}>Simulate free tier</Text>
              <Text style={styles.devRowSubtitle}>Overrides isPremium in memory. Resets on restart.</Text>
            </View>
            <Switch
              value={simulatingFree}
              onValueChange={(val) => {
                setSimulatingFree(val);
                setDevPremiumOverride(val ? false : null);
              }}
              trackColor={{ false: '#2a3a5c', true: '#ef4444' }}
              thumbColor={simulatingFree ? '#ffffff' : '#9aa0a6'}
            />
          </View>
          {simulatingFree && (
            <Text style={styles.devWarning}>⚠ Premium overridden to FALSE. Restart app to reset.</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#c9a84c',
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
    textDecorationLine: 'underline',
    textDecorationColor: '#c9a84c66',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#c9a84c33',
  },
  pickerSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#c9a84c55',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 8,
  },
  pickerDoneButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  pickerDoneText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
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
  signOutButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ff444455',
  },
  signOutText: {
    color: '#ff6666',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  devSection: {
    marginTop: 32,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  devLabel: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  devTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  devRowTitle: {
    color: '#e6eef8',
    fontSize: 15,
    fontWeight: '500',
  },
  devRowSubtitle: {
    color: '#9aa0a6',
    fontSize: 12,
    marginTop: 2,
  },
  devWarning: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 10,
  },
});