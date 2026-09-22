// lib/reminders.ts
//
// Local reminder scheduling (morning and evening check-ins, task, workout,
// reading, and the opt-in Future Self line). Extracted from app/settings.tsx
// (retention plan R5) so the Daily Dispatch nudge can schedule the defaults
// the moment notification permission is granted; before this, the defaults
// read "on" in Settings but nothing was scheduled until the user opened
// Settings and pressed Save.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getUserCabinet, getUserSettings } from './db';
import { logEvent } from './events';

export const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';

export interface NotificationSettings {
  morningEnabled: boolean; morningHour: string; morningMinute: string;
  eveningEnabled: boolean; eveningHour: string; eveningMinute: string;
  taskReminderEnabled: boolean; taskReminderHour: string; taskReminderMinute: string;
  workoutReminderEnabled: boolean; workoutReminderHour: string; workoutReminderMinute: string;
  readingReminderEnabled: boolean; readingReminderHour: string; readingReminderMinute: string;
  futureKyleEnabled: boolean; futureKyleHour: string; futureKyleMinute: string;
}

// The same values the Settings screen shows when nothing is stored yet.
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  morningEnabled: true, morningHour: '7', morningMinute: '00',
  eveningEnabled: true, eveningHour: '20', eveningMinute: '00',
  taskReminderEnabled: true, taskReminderHour: '12', taskReminderMinute: '00',
  workoutReminderEnabled: true, workoutReminderHour: '6', workoutReminderMinute: '00',
  readingReminderEnabled: true, readingReminderHour: '21', readingReminderMinute: '00',
  futureKyleEnabled: false, futureKyleHour: '15', futureKyleMinute: '00',
};

export async function loadNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return raw ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

// One notification per weekday per enabled reminder.
export function countEnabledReminders(settings: NotificationSettings): number {
  return [
    settings.morningEnabled, settings.eveningEnabled, settings.taskReminderEnabled,
    settings.workoutReminderEnabled, settings.readingReminderEnabled, settings.futureKyleEnabled,
  ].filter(Boolean).length * 7;
}

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

// Reminder rescheduling runs strictly one at a time, and a newer request
// supersedes an older one still in flight. scheduleNotifications() cancels
// every scheduled notification and then re-creates 7 per enabled reminder,
// with network calls (cabinet, settings) in between. Two overlapping runs —
// the silent reschedule on mount racing a toggle, or a double-tap on Save —
// interleaved those steps: run B cancelled everything mid-way through run A,
// then both finished scheduling, and every reminder fired twice.
let rescheduleGeneration = 0;
let rescheduleChain: Promise<unknown> = Promise.resolve();

/**
 * Cancels every scheduled notification and re-creates 7 per enabled reminder.
 * Returns false when notification permission is not granted (nothing is
 * scheduled), true once the reschedule has run. Serialised: a newer call
 * supersedes one still in flight.
 */
export async function scheduleReminders(settings: NotificationSettings): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;

  const generation = ++rescheduleGeneration;
  const superseded = () => generation !== rescheduleGeneration;

  const run = async () => {
    // A newer reschedule is queued behind this one and will cancel + rebuild
    // everything itself, so this run has nothing left to do.
    if (superseded()) return;

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
        if (superseded()) return;
        const title = titleFn(day);
        const body = bodyFn(day);
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            // Reminders are messages FROM a counselor: badge the icon, and
            // carry the data the NotificationBridge needs to seed this line
            // into the Cabinet thread and open the chat on tap.
            badge: 1,
            data: {
              route: '/cabinet',
              counselorName: title.split(' — ')[0],
              seedMessage: body,
            },
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
  };


  // Queue behind any reschedule still in flight; a failure in an earlier
  // run must not block this one.
  const thisRun = rescheduleChain.then(run, run);
  rescheduleChain = thisRun.catch(() => {});
  await thisRun;
  return true;
}

/**
 * Called the moment notification permission is granted (nudge or Settings):
 * writes the defaults if nothing is stored yet and schedules whatever is
 * stored, so reminders that read "on" are actually on. Returns the number
 * of notifications scheduled, or null when permission is missing.
 */
export async function ensureRemindersScheduled(surface: 'nudge' | 'settings'): Promise<number | null> {
  let settings = await loadNotificationSettings();
  if (!settings) {
    settings = DEFAULT_NOTIFICATION_SETTINGS;
    try { await saveNotificationSettings(settings); } catch { /* still schedule */ }
  }
  const ok = await scheduleReminders(settings);
  if (!ok) return null;
  const count = countEnabledReminders(settings);
  logEvent('reminders_scheduled', { count, surface });
  return count;
}
