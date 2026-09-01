import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
// Reinstated post-crash-resolution: the launch SIGABRT was never
// expo-notifications (see Builds 43-59 saga). NEVER call into this module at
// module scope — native calls before the TurboModule layer is ready was the
// original Build 44 crash. All calls here happen in effects/handlers.
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
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getUserCabinet } from '@/lib/db';
import { useSubscription } from '@/lib/useSubscription';
import { getDevPremiumOverride, setDevPremiumOverride } from '../lib/devMode';
import {
  attendIsSupported,
  requestAttendAuthorization,
  getShareScreenWithCabinet,
  setShareScreenWithCabinet,
  getShareRoutinesWithCabinet,
  setShareRoutinesWithCabinet,
  getFocusBlockEnabled,
  setFocusBlockEnabled,
  getFocusBlocklist,
  setFocusBlocklist,
  getWatchlists,
  addWatchlist,
  removeWatchlist,
  MAX_WATCHLISTS,
  type AttendWatchlist,
} from '@/lib/attend';

// Native FamilyActivityPicker sheet — only in builds with the module.
let AttendSelectionSheet: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AttendSelectionSheet = require('react-native-device-activity').DeviceActivitySelectionSheetView;
} catch { /* module absent in this build */ }


// Day index 0 = Sunday … 6 = Saturday (matches Expo weekday - 1)
// Reminder senders rotate through the user's ACTUAL cabinet (resolved at
// schedule time), so message bodies are voice-neutral: firm and stoic without
// impersonating any specific counselor.
const MORNING_MESSAGES = [
  "The day is unwritten. Decide who you will be in it, then begin.",
  "Before the world makes its demands, make yours. Open your morning practice.",
  "You do not need to feel ready. You need to begin. Your Cabinet is waiting.",
  "One deliberate morning changes the whole day. This is that morning.",
  "Begin at once: name the day's purpose and take the first step.",
  "An untroubled start is built, not found. Take five minutes with your Cabinet.",
  "Count your blessings, name your aims, and step into the day on purpose.",
];

const EVENING_MESSAGES = [
  "The day is ending. Give an account of it to your Cabinet.",
  "Before you sleep: what progress did you make toward the person you are becoming?",
  "Evening review: did your actions match your values today?",
  "A day well lived makes sleep easy. What was well lived today?",
  "What emotion ran the show today, and what will you do about it tomorrow?",
  "Close the day with honesty. Your Cabinet awaits the debrief.",
  "Confine yourself to the present, then review it. The evening asks for ten minutes.",
];

const TASK_MESSAGES = [
  "Midday check. What remains undone is still within your power.",
  "How are your tasks progressing? Address what is left. Now.",
  "Half the day is spent. Spend the rest on purpose. Check your list.",
  "What is within your control today that remains undone? Go do it.",
  "Stop negotiating with your list. Take back the afternoon.",
  "Midday check. No excuses, just the next task.",
  "It's afternoon. You know what's on the list. Do not let yourself down.",
];

const WORKOUT_MESSAGES = [
  "Your body is the one instrument you cannot replace. Train it today.",
  "You told yourself you'd train today. That conversation is over. Go.",
  "The workout you skip is the one you needed most. Get moving.",
  "Midweek. Most people ease off here. That is exactly why you won't.",
  "Discipline is a muscle too. Train both today.",
  "Some people are already coasting into the weekend. Not you. Train.",
  "No meetings, no excuses. The best workout of the week is waiting.",
];

const READING_MESSAGES = [
  "You have a book waiting. What excuse will you offer the person you are becoming?",
  "Ten pages tonight. Small deposits, compounding wisdom.",
  "The wisest minds left you their notes. Read them tonight.",
  "Have you read today? The impediment is only the choice.",
  "Trade the scroll for the page tonight. Your mind will thank you.",
  "A chapter before sleep beats an hour of noise. Read.",
  "Reading tonight is a conversation with the wise. Join them.",
];

// Messages are signed by the user's own Future Self — name resolved at
// schedule time from user_settings.user_name.
const futureSelfMessages = (name?: string) => {
  const signature = name ? `Future ${name}` : 'Future You';
  return [
    `Is what you're doing right now something I would recognize? — ${signature}`,
    `I remember this week. What you do today matters more than you know. — ${signature}`,
    `The app. The training. The reading. The family. You can do all of it. I'm proof. — ${signature}`,
    `Midweek. This is where most people give up. This is also where you separate yourself. — ${signature}`,
    `I didn't get here by accident. Neither will you. Keep going. — ${signature}`,
    `${name ? `Friday ${name} is tired` : 'Friday-you is tired'}. I know. I remember. Do the one hard thing anyway. — ${signature}`,
    `Saturdays were sacred. Family, training, reading. Do not waste this one. — ${signature}`,
  ];
};


export default function SettingsScreen() {
  const router = useRouter();
  const { tier } = useSubscription();
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Not signed in', 'Please sign in again and retry.');
        return;
      }
      const response = await fetch('https://app.pursuearete.com/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        Alert.alert('Deletion failed', data?.error || 'Something went wrong. Please try again or contact support@pursuearete.com.');
        return;
      }
      await supabase.auth.signOut().catch(() => {});
      Alert.alert('Account Deleted', 'Your account and all of your data have been permanently deleted.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login' as any) },
      ]);
    } catch {
      Alert.alert('Deletion failed', 'Could not reach the server. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  // Attend & Cabinet Privacy (iOS Screen Time builds only)
  const [shareScreen, setShareScreen] = useState(true);
  const [shareRoutines, setShareRoutines] = useState(true);
  const [focusBlockEnabled, setFocusBlockEnabledState] = useState(false);
  const [hasBlocklist, setHasBlocklist] = useState(false);
  const [showBlocklistPicker, setShowBlocklistPicker] = useState(false);
  const [watchlists, setWatchlists] = useState<AttendWatchlist[]>([]);
  const [pendingWatchLabel, setPendingWatchLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!attendIsSupported()) return;
    (async () => {
      setShareScreen(await getShareScreenWithCabinet());
      setShareRoutines(await getShareRoutinesWithCabinet());
      setFocusBlockEnabledState(await getFocusBlockEnabled());
      setHasBlocklist(!!(await getFocusBlocklist()));
      setWatchlists(await getWatchlists());
    })().catch(() => {});
  }, []);

  const promptAddWatchlist = async () => {
    if (tier === 'free') {
      router.push({ pathname: '/paywall', params: { src: 'attend_watchlists' } } as any);
      return;
    }
    if (watchlists.length >= MAX_WATCHLISTS) {
      Alert.alert('Watchlist limit', `iOS allows up to ${MAX_WATCHLISTS} watchlists.`);
      return;
    }
    const auth = await requestAttendAuthorization();
    if (auth !== 'approved') {
      if (auth === 'denied') Alert.alert('Screen Time Access Needed', 'Enable Screen Time access for Arete in iOS Settings.');
      return;
    }
    Alert.prompt(
      'Name this watchlist',
      'The Cabinet will refer to it by this name ("Instagram", "Games", "Doom scroll"...).',
      (label) => {
        const clean = (label || '').trim();
        if (clean) setPendingWatchLabel(clean);
      }
    );
  };

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
  // Display label for the user's Future Self ("Future Kyle", "Future Maria");
  // the futureKyle* state names below are kept for AsyncStorage compatibility.
  const [futureSelfLabel, setFutureSelfLabel] = useState('Future Self');
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
      getUserSettings()
        .then(us => {
          const first = us?.user_name ? us.user_name.trim().split(/\s+/)[0] : '';
          if (first) setFutureSelfLabel(`Future ${first}`);
        })
        .catch(() => {});
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

    // Resolve the user's Future Self name fresh at schedule time.
    let scheduleFirstName = '';
    try {
      const us = await getUserSettings();
      scheduleFirstName = us?.user_name ? us.user_name.trim().split(/\s+/)[0] : '';
    } catch { /* fall back to generic labels */ }
    const futureLabel = scheduleFirstName ? `Future ${scheduleFirstName}` : 'Future Self';
    const fsMessages = futureSelfMessages(scheduleFirstName || undefined);

    // Reminders are "sent" by the user's actual cabinet, resolved fresh at
    // schedule time so edits to the cabinet propagate on the next reschedule.
    // Defaults only cover the pre-customization case.
    let cabinetNames: string[] = [];
    try {
      const cab = await getUserCabinet();
      cabinetNames = cab.map(c => c.name).filter(Boolean);
    } catch { /* fall back to defaults */ }
    if (cabinetNames.length === 0) {
      cabinetNames = ['Marcus Aurelius', 'Epictetus', 'David Goggins', 'Theodore Roosevelt'];
    }
    const senders = [...cabinetNames, futureLabel];
    // Offset per reminder type so one day doesn't hear from the same
    // counselor across every reminder.
    const senderFor = (day: number, offset: number) => senders[(day + offset) % senders.length];

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
        (day) => `${senderFor(day, 0)} — Morning Check-In`,
        (day) => MORNING_MESSAGES[day],
        parseInt(settings.morningHour),
        parseInt(settings.morningMinute),
      );
    }

    // Evening check-in
    if (settings.eveningEnabled) {
      await scheduleWeekly(
        (day) => `${senderFor(day, 1)} — Evening Check-In`,
        (day) => EVENING_MESSAGES[day],
        parseInt(settings.eveningHour),
        parseInt(settings.eveningMinute),
      );
    }

    // Midday task reminder
    if (settings.taskReminderEnabled) {
      await scheduleWeekly(
        (day) => senderFor(day, 2),
        (day) => TASK_MESSAGES[day],
        parseInt(settings.taskReminderHour),
        parseInt(settings.taskReminderMinute),
      );
    }

    // Workout reminder
    if (settings.workoutReminderEnabled) {
      await scheduleWeekly(
        (day) => `${senderFor(day, 3)} — Workout Reminder`,
        (day) => WORKOUT_MESSAGES[day],
        parseInt(settings.workoutReminderHour),
        parseInt(settings.workoutReminderMinute),
      );
    }

    // Reading reminder
    if (settings.readingReminderEnabled) {
      await scheduleWeekly(
        (day) => `${senderFor(day, 4)} — Reading Reminder`,
        (day) => READING_MESSAGES[day],
        parseInt(settings.readingReminderHour),
        parseInt(settings.readingReminderMinute),
      );
    }

    // Future Self — big picture check-in (opt-in)
    if (settings.futureKyleEnabled) {
      await scheduleWeekly(
        () => futureLabel,
        (day) => fsMessages[day],
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
          <Text style={styles.cardTitle}>☀️ Morning Check-In</Text>
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
          <Text style={styles.cardTitle}>🌙 Evening Check-In</Text>
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
          <Text style={styles.cardTitle}>📖 Reading Reminder</Text>
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

      {/* Future Self — Daily Check-In */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔮 {futureSelfLabel} — Daily Check-In</Text>
          <Switch
            value={futureKyleEnabled}
            onValueChange={(val) => { setFutureKyleEnabled(val); persistAndReschedule({ futureKyleEnabled: val }); }}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.cardSubtitle}>
          {`"Is what you're doing right now something I would recognize? — ${futureSelfLabel}"`}{'\n'}
          <Text style={styles.hintInline}>Off by default — opt in when ready.</Text>
        </Text>
        {futureKyleEnabled && renderTimeInputs(futureKyleHour, setFutureKyleHour, futureKyleMinute, setFutureKyleMinute)}
      </View>

      {/* Attend & Cabinet Privacy — what the counselors see, and what the
          Focus timer may block. Only rendered on builds with the Screen Time
          native module. */}
      {attendIsSupported() && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛡️ Attend & Cabinet Privacy</Text>

          <View style={styles.cardHeader}>
            <Text style={styles.attendToggleLabel}>
              Cabinet sees Screen Time signals{tier === 'free' ? <Text style={styles.premiumTag}>  PREMIUM</Text> : null}
            </Text>
            <Switch
              value={tier === 'free' ? false : shareScreen}
              onValueChange={(val) => {
                if (tier === 'free') {
                  router.push({ pathname: '/paywall', params: { src: 'attend_cabinet_sight' } } as any);
                  return;
                }
                setShareScreen(val); setShareScreenWithCabinet(val);
              }}
              trackColor={{ false: '#333', true: '#c9a84c' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.attendToggleHint}>
            Goal crossings only — never exact usage, never raw data.
          </Text>

          <View style={styles.cardHeader}>
            <Text style={styles.attendToggleLabel}>Cabinet sees routine completion</Text>
            <Switch
              value={shareRoutines}
              onValueChange={(val) => { setShareRoutines(val); setShareRoutinesWithCabinet(val); }}
              trackColor={{ false: '#333', true: '#c9a84c' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.attendToggleHint}>
            Morning and evening checklists, done or not done.
          </Text>

          <View style={styles.cardHeader}>
            <Text style={styles.attendToggleLabel}>Block distractions during Focus</Text>
            <Switch
              value={focusBlockEnabled}
              onValueChange={async (val) => {
                if (val && tier === 'free') {
                  router.push({ pathname: '/paywall', params: { src: 'attend_focus_block' } } as any);
                  return;
                }
                setFocusBlockEnabledState(val);
                await setFocusBlockEnabled(val);
                if (val && !hasBlocklist) setShowBlocklistPicker(true);
              }}
              trackColor={{ false: '#333', true: '#c9a84c' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.attendToggleHint}>
            While a Focus or reading session runs, your chosen apps and websites are
            shielded — the Cabinet holds the door.
          </Text>

          <TouchableOpacity
            style={styles.attendBlocklistButton}
            onPress={async () => {
              const auth = await requestAttendAuthorization();
              if (auth === 'approved') setShowBlocklistPicker(true);
              else if (auth === 'denied') {
                Alert.alert('Screen Time Access Needed', 'Enable Screen Time access for Arete in iOS Settings.');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.attendBlocklistText}>
              {hasBlocklist ? 'Edit blocked apps & websites' : 'Choose apps & websites to block…'}
            </Text>
          </TouchableOpacity>

          {/* Watchlists — named app groups the Cabinet can call out by name */}
          <Text style={styles.attendWatchHeader}>Watchlists</Text>
          <Text style={styles.attendToggleHint}>
            Name a group of apps ("Instagram", "Games") and the Cabinet can call out when
            it crosses 30m, 1h, 2h and beyond. Names are yours; Apple never shows the app
            names to Arete.
          </Text>
          {watchlists.map((w) => (
            <View key={w.id} style={styles.attendWatchRow}>
              <Text style={styles.attendWatchLabel}>👁 {w.label}</Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Remove watchlist?', `Stop watching "${w.label}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove', style: 'destructive',
                      onPress: async () => {
                        await removeWatchlist(w.id);
                        setWatchlists(await getWatchlists());
                      },
                    },
                  ]);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle-outline" size={18} color="#888" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.attendBlocklistButton} onPress={promptAddWatchlist} activeOpacity={0.8}>
            <Text style={styles.attendBlocklistText}>Add a watchlist…</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Subscription — purchase and management both live on the web (no IAP
          in this app), so paid users manage/cancel through the Stripe
          Customer Portal reached from the web upgrade page. */}
      <TouchableOpacity
        onPress={() => {
          if (tier === 'free') {
            router.push({ pathname: '/paywall', params: { src: 'settings_upgrade' } } as any);
          } else {
            WebBrowser.openBrowserAsync('https://app.pursuearete.com/upgrade').catch(() => {});
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={tier === 'free' ? 'Upgrade to premium' : 'Manage subscription'}
        style={styles.privacyRow}
      >
        <Text style={styles.privacyText}>
          {tier === 'free' ? 'Upgrade to Premium' : 'Manage Subscription'}
        </Text>
      </TouchableOpacity>

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

      {/* Delete Account — required by App Review 5.1.1(v). Two confirmations
          (Apple permits these), then the web API cancels any live Stripe
          subscription, deletes all data, and removes the auth user. */}
      <TouchableOpacity
        style={styles.deleteAccountButton}
        disabled={deletingAccount}
        onPress={() => {
          Alert.alert(
            'Delete Account',
            'This permanently deletes your account and all of your data — conversations, journal entries, beliefs, progress, and subscription records. This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Continue',
                style: 'destructive',
                onPress: () => {
                  Alert.alert(
                    'Are you absolutely sure?',
                    'Your account and every trace of your data will be gone forever.',
                    [
                      { text: 'Keep My Account', style: 'cancel' },
                      { text: 'Delete Everything', style: 'destructive', onPress: handleDeleteAccount },
                    ]
                  );
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.deleteAccountText}>
          {deletingAccount ? 'Deleting Account…' : 'Delete Account'}
        </Text>
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

    {/* Attend: native picker for the Focus blocklist (apps + websites) */}
    {showBlocklistPicker && AttendSelectionSheet && (
      <Modal visible transparent animationType="slide" onRequestClose={() => setShowBlocklistPicker(false)}>
        <AttendSelectionSheet
          style={{ flex: 1 }}
          headerText="What should the Cabinet block during Focus?"
          footerText="These apps and websites are shielded while a Focus or reading session runs."
          onSelectionChange={(e: any) => {
            const sel = e?.nativeEvent?.familyActivitySelection ?? null;
            if (sel) {
              setFocusBlocklist(sel).then(() => setHasBlocklist(true)).catch(() => {});
            }
          }}
          onDismissRequest={() => setShowBlocklistPicker(false)}
        />
      </Modal>
    )}

    {/* Attend: native picker for a new watchlist's apps */}
    {pendingWatchLabel !== null && AttendSelectionSheet && (
      <Modal visible transparent animationType="slide" onRequestClose={() => setPendingWatchLabel(null)}>
        <AttendSelectionSheet
          style={{ flex: 1 }}
          headerText={`What counts as "${pendingWatchLabel}"?`}
          footerText="Pick the apps or categories this watchlist tracks."
          onSelectionChange={(e: any) => {
            const sel = e?.nativeEvent?.familyActivitySelection ?? null;
            if (sel && pendingWatchLabel) {
              const label = pendingWatchLabel;
              setPendingWatchLabel(null);
              addWatchlist(label, sel)
                .then(async (ok) => {
                  if (ok) setWatchlists(await getWatchlists());
                  else Alert.alert('Could not add watchlist', 'Please try again.');
                })
                .catch(() => {});
            }
          }}
          onDismissRequest={() => setPendingWatchLabel(null)}
        />
      </Modal>
    )}
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
  attendToggleLabel: {
    color: '#e0d5b5',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  attendToggleHint: {
    color: '#777',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  attendBlocklistButton: {
    borderWidth: 1,
    borderColor: '#c9a84c66',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  attendBlocklistText: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumTag: {
    color: '#c9a84c',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  attendWatchHeader: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 6,
  },
  attendWatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff0d',
  },
  attendWatchLabel: {
    color: '#e0d5b5',
    fontSize: 14,
    fontWeight: '600',
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
  deleteAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ff444433',
  },
  deleteAccountText: {
    color: '#ff4444',
    fontWeight: '600',
    fontSize: 13,
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