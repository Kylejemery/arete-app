import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
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
export default function SettingsScreen() {
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState('7');
  const [morningMinute, setMorningMinute] = useState('00');
  const [eveningHour, setEveningHour] = useState('20');
  const [eveningMinute, setEveningMinute] = useState('00');

  const [screenTimeEnabled, setScreenTimeEnabled] = useState(true);
  const [screenTimeGoal, setScreenTimeGoal] = useState('2');
  const [screenTimeReminderHour, setScreenTimeReminderHour] = useState('21');
  const [screenTimeReminderMinute, setScreenTimeReminderMinute] = useState('00');

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
        setScreenTimeEnabled(parsed.screenTimeEnabled ?? true);
        setScreenTimeGoal(parsed.screenTimeGoal ?? '2');
        setScreenTimeReminderHour(parsed.screenTimeReminderHour ?? '21');
        setScreenTimeReminderMinute(parsed.screenTimeReminderMinute ?? '00');
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
        screenTimeEnabled,
        screenTimeGoal,
        screenTimeReminderHour,
        screenTimeReminderMinute,
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
    // Cancel all existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Morning notification
    if (settings.morningEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☀️ Good Morning!',
          body: 'Good morning, time to convene your board of counselors for the morning kickoff!',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parseInt(settings.morningHour),
          minute: parseInt(settings.morningMinute),
        },
      });
    }

    // Evening notification
    if (settings.eveningEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Evening Check-in',
          body: "It's evening, time to debrief with your board on the day's progress.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parseInt(settings.eveningHour),
          minute: parseInt(settings.eveningMinute),
        },
      });
    }

    // Screen time reminder
    if (settings.screenTimeEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📱 Screen Time Check',
          body: `Have you logged your screen time today? Your goal is ${settings.screenTimeGoal}h or less!`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parseInt(settings.screenTimeReminderHour),
          minute: parseInt(settings.screenTimeReminderMinute),
        },
      });
    }
  };

  const formatDisplayTime = (hour: string, minute: string) => {
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute.padStart(2, '0')} ${ampm}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚙️ Settings</Text>

      {/* Morning Notification */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>☀️ Morning Reminder</Text>
          <Switch
            value={morningEnabled}
            onValueChange={setMorningEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        {morningEnabled && (
          <>
            <Text style={styles.previewText}>
              {formatDisplayTime(morningHour, morningMinute)}
            </Text>
            <Text style={styles.label}>Hour (0–23)</Text>
            <TextInput
              style={styles.input}
              value={morningHour}
              onChangeText={setMorningHour}
              keyboardType="number-pad"
              placeholder="7"
              placeholderTextColor="#555"
            />
            <Text style={styles.label}>Minute</Text>
            <TextInput
              style={styles.input}
              value={morningMinute}
              onChangeText={setMorningMinute}
              keyboardType="number-pad"
              placeholder="00"
              placeholderTextColor="#555"
            />
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Message:</Text>
              <Text style={styles.messageText}>
                "Good morning, time to convene your board of counselors for the morning kickoff!"
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Evening Notification */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🌙 Evening Reminder</Text>
          <Switch
            value={eveningEnabled}
            onValueChange={setEveningEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        {eveningEnabled && (
          <>
            <Text style={styles.previewText}>
              {formatDisplayTime(eveningHour, eveningMinute)}
            </Text>
            <Text style={styles.label}>Hour (0–23)</Text>
            <TextInput
              style={styles.input}
              value={eveningHour}
              onChangeText={setEveningHour}
              keyboardType="number-pad"
              placeholder="20"
              placeholderTextColor="#555"
            />
            <Text style={styles.label}>Minute</Text>
            <TextInput
              style={styles.input}
              value={eveningMinute}
              onChangeText={setEveningMinute}
              keyboardType="number-pad"
              placeholder="00"
              placeholderTextColor="#555"
            />
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Message:</Text>
              <Text style={styles.messageText}>
                "It's evening, time to debrief with your board on the day's progress."
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Screen Time */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📱 Screen Time Reminder</Text>
          <Switch
            value={screenTimeEnabled}
            onValueChange={setScreenTimeEnabled}
            trackColor={{ false: '#333', true: '#c9a84c' }}
            thumbColor="#fff"
          />
        </View>
        {screenTimeEnabled && (
          <>
            <Text style={styles.previewText}>
              Reminder at {formatDisplayTime(screenTimeReminderHour, screenTimeReminderMinute)}
            </Text>
            <Text style={styles.label}>Daily Goal (hours)</Text>
            <TextInput
              style={styles.input}
              value={screenTimeGoal}
              onChangeText={setScreenTimeGoal}
              keyboardType="number-pad"
              placeholder="2"
              placeholderTextColor="#555"
            />
            <Text style={styles.label}>Reminder Hour (0–23)</Text>
            <TextInput
              style={styles.input}
              value={screenTimeReminderHour}
              onChangeText={setScreenTimeReminderHour}
              keyboardType="number-pad"
              placeholder="21"
              placeholderTextColor="#555"
            />
            <Text style={styles.label}>Reminder Minute</Text>
            <TextInput
              style={styles.input}
              value={screenTimeReminderMinute}
              onChangeText={setScreenTimeReminderMinute}
              keyboardType="number-pad"
              placeholder="00"
              placeholderTextColor="#555"
            />
            <Text style={styles.hint}>
              💡 Log your daily screen time in the Progress screen to track against your goal.
            </Text>
          </>
        )}
      </View>

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
  messageBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    marginTop: 5,
  },
  messageLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  messageText: {
    color: '#c9a84c',
    fontSize: 13,
    fontStyle: 'italic',
  },
  hint: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
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
});