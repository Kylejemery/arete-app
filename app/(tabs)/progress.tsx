import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getTodayCheckin, getJournalEntries, getReadingData, upsertReadingData, checkAndResetStreakIfMissed, getLongitudinalPortrait, getUserCabinet } from '@/lib/db';
import type { LongitudinalPortrait } from '@/lib/types';
import { useSubscription } from '@/lib/useSubscription';
import {
  attendIsSupported,
  requestAttendAuthorization,
  enableAttend,
  disableAttend,
  getAttendTodayStatus,
  recordAttendDay,
  updateAttendGoal,
  attendIsEnabled,
  ensureAttendArmedForVersion,
  getManualScreenLog,
  markManualScreenDay,
  type AttendTodayStatus,
  type ManualScreenMark,
} from '@/lib/attend';

// Native FamilyActivityPicker sheet — present only in builds that include the
// device-activity module; older builds fall back to manual logging.
let AttendSelectionSheet: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AttendSelectionSheet = require('react-native-device-activity').DeviceActivitySelectionSheetView;
} catch { /* module absent in this build */ }

const MILESTONES = [
  { days: 7, label: '7 Day Streak', icon: '🔥' },
  { days: 30, label: '30 Day Streak', icon: '⚡' },
  { days: 60, label: '60 Day Streak', icon: '💎' },
  { days: 100, label: '100 Day Streak', icon: '👑' },
  { days: 365, label: '365 Day Streak', icon: '🏆' },
];

export default function ProgressScreen() {
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/progress');
  const [activeTab, setActiveTab] = useState<'overview' | 'reading'>('overview');
  const [streak, setStreak] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<any>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [books, setBooks] = useState<any[]>([]);
  const [currentBooks, setCurrentBooks] = useState<any[]>([]);
  const [readingSessions, setReadingSessions] = useState<any[]>([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [totalReadingSeconds, setTotalReadingSeconds] = useState(0);
  const [todayReadingSeconds, setTodayReadingSeconds] = useState(0);
  const [readingStreak, setReadingStreak] = useState(0);
  const [portrait, setPortrait] = useState<LongitudinalPortrait | null>(null);

  // Screen time
  const [screenTimeGoal, setScreenTimeGoal] = useState(2);
  const [manualLog, setManualLog] = useState<Record<string, ManualScreenMark>>({});

  // Attend — iOS Screen Time monitoring (only in builds with the native module)
  const { tier } = useSubscription();
  const [attendStatus, setAttendStatus] = useState<AttendTodayStatus | null>(null);
  const [attendBusy, setAttendBusy] = useState(false);
  const [showAttendPicker, setShowAttendPicker] = useState(false);

  const refreshAttend = useCallback(async () => {
    if (!attendIsSupported()) return;
    try {
      await recordAttendDay();
      // After an app update, re-arm so the extension picks up new payloads
      // (snapshot above keeps today's crossings across the restart).
      try {
        const names = (await getUserCabinet()).map((c: any) => c.name).filter(Boolean);
        await ensureAttendArmedForVersion(names);
      } catch { /* re-arm is opportunistic */ }
      setAttendStatus(await getAttendTodayStatus());
    } catch { /* stays null */ }
  }, []);

  const connectAttend = async () => {
    if (attendBusy) return;
    setAttendBusy(true);
    try {
      const auth = await requestAttendAuthorization();
      if (auth === 'approved') {
        setShowAttendPicker(true);
      } else if (auth === 'denied') {
        Alert.alert(
          'Screen Time Access Needed',
          'Enable Screen Time access for Arete in iOS Settings > Screen Time > Apps with Screen Time Access.'
        );
      }
    } finally {
      setAttendBusy(false);
    }
  };

  const onAttendSelection = async (selection: string | null) => {
    setShowAttendPicker(false);
    if (!selection) return;
    setAttendBusy(true);
    try {
      let counselorNames: string[] = [];
      try {
        counselorNames = (await getUserCabinet()).map((c: any) => c.name).filter(Boolean);
      } catch { /* defaults inside enableAttend */ }
      const ok = await enableAttend(selection, Math.round(screenTimeGoal * 60), counselorNames);
      if (ok) {
        Alert.alert(
          'Attend is on',
          'Your counselors will notice when you cross your daily goal — even when Arete is closed.'
        );
        await refreshAttend();
      } else {
        Alert.alert('Could not start monitoring', 'Please try again.');
      }
    } finally {
      setAttendBusy(false);
    }
  };

  const editScreenTimeGoal = () => {
    Alert.prompt(
      'Daily Screen Time Goal',
      'Hours per day (e.g., 2 or 1.5)',
      async (value) => {
        const hours = parseFloat(value);
        if (!hours || hours < 0.25 || hours > 16) {
          Alert.alert('Invalid', 'Enter a goal between 0.25 and 16 hours.');
          return;
        }
        setScreenTimeGoal(hours);
        try { await AsyncStorage.setItem('screen_time_goal_hours', String(hours)); } catch {}
        // Re-arm the iOS monitor so notifications and status use the new goal.
        try {
          let counselorNames: string[] = [];
          try {
            counselorNames = (await getUserCabinet()).map((c: any) => c.name).filter(Boolean);
          } catch { /* defaults inside enableAttend */ }
          const rearmed = await updateAttendGoal(Math.round(hours * 60), counselorNames);
          if (rearmed) {
            await refreshAttend();
          } else if (await attendIsEnabled()) {
            // The goal saved, but the monitor could not re-arm with it —
            // surface it instead of silently tracking the old thresholds.
            Alert.alert(
              'Goal saved, monitor not updated',
              'Screen Time monitoring could not restart with the new goal. Disconnect and reconnect Screen Time on this card to fix it.'
            );
          }
        } catch { /* manual mode keeps working regardless */ }
      },
      'plain-text',
      String(screenTimeGoal)
    );
  };

  const disconnectAttend = () => {
    Alert.alert('Disconnect Screen Time?', 'Attend monitoring and goal notifications stop.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive',
        onPress: async () => {
          await disableAttend();
          setAttendStatus(null);
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      refreshAttend();
    }, [refreshAttend])
  );

  const loadAllData = async () => {
    // Restore cached streak immediately to avoid flash of 0
    try {
      const cached = await AsyncStorage.getItem('arete:progress_streak');
      if (cached) setStreak(JSON.parse(cached).streak ?? 0);
    } catch {}

    // Persisted screen-time goal (editable by tapping the Daily Goal stat)
    try {
      const g = await AsyncStorage.getItem('screen_time_goal_hours');
      const hours = g ? parseFloat(g) : NaN;
      if (Number.isFinite(hours) && hours > 0) setScreenTimeGoal(hours);
    } catch {}

    // Manual under/over marks (fallback when monitoring isn't connected)
    try { setManualLog(await getManualScreenLog()); } catch {}

    try {
      const freshStreak = await checkAndResetStreakIfMissed();
      setStreak(freshStreak);
      try { await AsyncStorage.setItem('arete:progress_streak', JSON.stringify({ streak: freshStreak })); } catch {}

      // Null until the weekly agent has enough history to build one; the card
      // below is simply absent in that case.
      getLongitudinalPortrait().then(setPortrait).catch(() => {});

      const journalEntries = await getJournalEntries();
      setJournalCount(journalEntries.filter(e => e.type === 'reflection').length);
      setQuoteCount(journalEntries.filter(e => e.type === 'quote').length);

      const calData = {};
      setCalendarData(calData);
      buildWeekData(calData);

      const readingData = await getReadingData();
      if (readingData) {
        setBooks(readingData.books_read ?? []);
        setCurrentBooks(readingData.current_books ?? []);
        const sessions = readingData.reading_sessions ?? [];
        setReadingSessions(sessions);
        setTotalReadingSeconds(sessions.reduce((sum: number, s: any) => sum + s.duration, 0));
        setTotalPages(sessions.reduce((sum: number, s: any) => sum + s.pagesRead, 0));

        // Calculate reading streak — sessions store date as Date.toDateString() (local time)
        const sessionDates = new Set(sessions.map((s: any) => s.date as string));
        let rStreak = 0;
        const cursor = new Date();
        cursor.setHours(12, 0, 0, 0); // noon avoids DST boundary when decrementing days
        // If today has no session yet, allow the streak to start from yesterday
        if (!sessionDates.has(cursor.toDateString())) {
          cursor.setDate(cursor.getDate() - 1);
        }
        while (sessionDates.has(cursor.toDateString())) {
          rStreak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        setReadingStreak(rStreak);

        // Today's reading time — same field the Focus tab writes to
        const d = new Date();
        const todayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (readingData.today_reading_date === todayDate) {
          setTodayReadingSeconds(readingData.today_reading_seconds ?? 0);
        } else {
          setTodayReadingSeconds(0);
        }
      }

      await updateTodayCalendar(calData);
    } catch (e) {
      console.error(e);
    }
  };

  const updateTodayCalendar = async (existingData: any) => {
    const todayDate = new Date().toISOString().split('T')[0];
    const checkin = await getTodayCheckin();
    const updated = {
      ...existingData,
      [todayDate]: { morning: checkin?.morning_done ?? false, evening: checkin?.evening_done ?? false }
    };
    setCalendarData(updated);
    buildWeekData(updated);
  };

  const buildWeekData = (calData: any) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      week.push({
        label: days[d.getDay()], date: d.getDate(), key,
        morning: calData[key]?.morning || false,
        evening: calData[key]?.evening || false,
        isToday: i === 0,
      });
    }
    setWeekData(week);
  };

  const formatReadingTime = (seconds: number) => {
    if (seconds < 60) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calCell} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const key = d.toDateString();
      const data = calendarData[key];
      const isToday = key === new Date().toDateString();
      cells.push(
        <View key={day} style={[styles.calCell, isToday && styles.calCellToday]}>
          <Text style={[styles.calDayNum, isToday && styles.calDayToday]}>{day}</Text>
          <View style={styles.calDots}>
            <View style={[styles.calDot, data?.morning && styles.calDotMorning]} />
            <View style={[styles.calDot, data?.evening && styles.calDotEvening]} />
          </View>
        </View>
      );
    }
    return cells;
  };

  // Manual mark — one honest bit per day, no hours: was today under or over
  // the goal? Only shown when automatic monitoring isn't connected.
  const markScreenDay = async (mark: ManualScreenMark) => {
    setManualLog(await markManualScreenDay(mark));
  };

  const addBook = async () => {
    if (!newBookTitle.trim()) { Alert.alert('Required', 'Please enter a book title.'); return; }
    const book = {
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      dateFinished: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
    const updated = [book, ...books];
    setBooks(updated);
    await upsertReadingData({ books_read: updated });
    setNewBookTitle(''); setNewBookAuthor('');
    setShowBookModal(false);
  };

  const deleteBook = (id: string) => {
    Alert.alert('Delete Book', 'Remove this book from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = books.filter((b: any) => b.id !== id);
          setBooks(updated);
          await upsertReadingData({ books_read: updated });
        }
      }
    ]);
  };

  const prevMonth = () => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); };
  const nextMonth = () => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); };
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const localDayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayMark: ManualScreenMark | null = manualLog[localDayKey()] ?? null;
  const recentMarks = Object.entries(manualLog).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);

  return (
    <SafeAreaView style={styles.container} {...swipeHandlers}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress 📊</Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, activeTab === 'overview' && styles.activeTab]} onPress={() => setActiveTab('overview')}>
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'reading' && styles.activeTab]} onPress={() => setActiveTab('reading')}>
            <Text style={[styles.tabText, activeTab === 'reading' && styles.activeTabText]}>Reading</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {activeTab === 'overview' && (
          <>
            {/* Portrait — the longitudinal model, if the weekly agent has built
                one. Deliberately the first thing on this screen: it is the only
                item here that says something about who you are rather than how
                often you showed up. */}
            {portrait?.philosophical_portrait && (
              <TouchableOpacity
                style={styles.portraitCard}
                onPress={() => router.push('/portrait' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.portraitHeader}>
                  <Text style={styles.portraitLabel}>Portrait</Text>
                  <Ionicons name="chevron-forward" size={16} color="#c9a84c" />
                </View>
                <Text style={styles.portraitTeaser} numberOfLines={3}>
                  {portrait.philosophical_portrait.trim()}
                </Text>
                <Text style={styles.portraitMeta}>
                  {portrait.weeks_analyzed ?? 0}{' '}
                  {portrait.weeks_analyzed === 1 ? 'week' : 'weeks'} of your own writing
                </Text>
              </TouchableOpacity>
            )}

            {/* Streak */}
            <View style={styles.streakCard}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="book-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{journalCount}</Text>
                <Text style={styles.statLabel}>Journal{'\n'}Entries</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="library-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{quoteCount}</Text>
                <Text style={styles.statLabel}>Quotes{'\n'}Saved</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="reader-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{books.length}</Text>
                <Text style={styles.statLabel}>Books{'\n'}Finished</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{formatReadingTime(todayReadingSeconds)}</Text>
                <Text style={styles.statLabel}>Read{'\n'}Today</Text>
              </View>
            </View>


            {/* Screen Time Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📱 Screen Time</Text>

              {/* Attend: live iOS Screen Time monitoring */}
              {attendIsSupported() && !attendStatus?.connected && (
                <TouchableOpacity
                  style={styles.attendConnectButton}
                  onPress={connectAttend}
                  disabled={attendBusy}
                  activeOpacity={0.8}
                >
                  <Ionicons name="hourglass-outline" size={16} color="#1a1a2e" />
                  <Text style={styles.attendConnectText}>
                    {attendBusy ? 'Connecting…' : 'Connect iOS Screen Time'}
                  </Text>
                </TouchableOpacity>
              )}
              {attendIsSupported() && !attendStatus?.connected && (
                <Text style={styles.attendCaption}>
                  Your counselors will notice when you cross your daily goal, even when Arete is
                  closed. Usage data never leaves your phone.
                </Text>
              )}
              {attendStatus?.connected && (
                <View style={styles.attendStatusRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attendStatusLine}>
                      {attendStatus.highestMinutes > 0
                        ? `Today: crossed ${attendStatus.highestMinutes >= 60
                            ? `${Math.floor(attendStatus.highestMinutes / 60)}h${attendStatus.highestMinutes % 60 ? ` ${attendStatus.highestMinutes % 60}m` : ''}`
                            : `${attendStatus.highestMinutes}m`}`
                        : 'Today: under every threshold so far'}
                      {'  '}
                      <Text style={attendStatus.overGoal ? styles.attendOver : styles.attendUnder}>
                        {attendStatus.overGoal ? '⚠ over goal' : '✓ under goal'}
                      </Text>
                    </Text>
                    <Text style={styles.attendMonitoredBy}>Monitored by iOS Screen Time</Text>
                  </View>
                  <TouchableOpacity onPress={disconnectAttend} hitSlop={8}>
                    <Text style={styles.attendDisconnect}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              )}
              {attendStatus?.connected && tier === 'free' && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/paywall', params: { src: 'attend_context_tease' } } as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.attendTease}>
                    ✨ Your counselors could see this and hold you to it. Unlock with Premium →
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.screenTimeRow}>
                <View style={styles.screenTimeStat}>
                  <Text style={[
                    styles.screenTimeHours,
                    attendStatus?.connected
                      ? (attendStatus.overGoal ? styles.screenTimeBad : styles.screenTimeGood)
                      : todayMark
                        ? (todayMark === 'over' ? styles.screenTimeBad : styles.screenTimeGood)
                        : null,
                  ]}>
                    {attendStatus?.connected
                      ? (attendStatus.overGoal ? 'Over' : 'Under')
                      : todayMark
                        ? (todayMark === 'over' ? 'Over' : 'Under')
                        : '—'}
                  </Text>
                  <Text style={styles.screenTimeLabel}>Today</Text>
                </View>
                <View style={styles.screenTimeDivider} />
                <TouchableOpacity style={styles.screenTimeStat} onPress={editScreenTimeGoal} activeOpacity={0.7}>
                  <Text style={styles.screenTimeHours}>{screenTimeGoal}h</Text>
                  <Text style={styles.screenTimeLabel}>Daily Goal ✎</Text>
                </TouchableOpacity>
              </View>
              {/* Manual mark — one honest bit per day, only when automatic
                  monitoring isn't answering the question already. */}
              {!attendStatus?.connected && (
                <View style={styles.markRow}>
                  <TouchableOpacity
                    style={[styles.markButton, todayMark === 'under' && styles.markButtonUnderActive]}
                    onPress={() => markScreenDay('under')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.markButtonText, todayMark === 'under' && styles.markButtonTextActive]}>
                      ✓ Under goal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.markButton, todayMark === 'over' && styles.markButtonOverActive]}
                    onPress={() => markScreenDay('over')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.markButtonText, todayMark === 'over' && styles.markButtonTextActive]}>
                      ⚠ Over goal
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {!attendStatus?.connected && recentMarks.map(([day, mark]) => (
                <View key={day} style={styles.pagesLogRow}>
                  <Text style={styles.pagesLogDate}>
                    {new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[
                    styles.pagesLogCount,
                    mark === 'under' ? styles.screenTimeGood : styles.screenTimeBad,
                  ]}>
                    {mark === 'under' ? 'Under goal ✅' : 'Over goal ⚠️'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Weekly View */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.weekRow}>
                {weekData.map((day, i) => (
                  <View key={i} style={styles.weekDay}>
                    <Text style={[styles.weekDayLabel, day.isToday && styles.weekDayToday]}>{day.label}</Text>
                    <Text style={[styles.weekDayNum, day.isToday && styles.weekDayToday]}>{day.date}</Text>
                    <View style={styles.weekDots}>
                      <View style={[styles.weekDot, day.morning && styles.weekDotMorning]} />
                      <View style={[styles.weekDot, day.evening && styles.weekDotEvening]} />
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#c9a84c' }]} />
                  <Text style={styles.legendText}>Morning ☀️</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4a6fa5' }]} />
                  <Text style={styles.legendText}>Evening 🌙</Text>
                </View>
              </View>
            </View>

            {/* Weekly Review */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Weekly Review 📋</Text>
              <Text style={styles.weeklyReviewDescription}>
                Convene the Cabinet for an honest assessment of your week — what went well, what fell short, and what matters next.
              </Text>
              <TouchableOpacity style={styles.weeklyReviewButton} onPress={() => router.push('/weekly-review')}>
                <Text style={styles.weeklyReviewButtonText}>View Weekly Review</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <View style={styles.sectionCard}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={prevMonth}>
                  <Ionicons name="chevron-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>{monthLabel}</Text>
                <TouchableOpacity onPress={nextMonth}>
                  <Ionicons name="chevron-forward" size={22} color="#c9a84c" />
                </TouchableOpacity>
              </View>
              <View style={styles.calDayLabels}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <Text key={d} style={styles.calDayLabelText}>{d}</Text>
                ))}
              </View>
              <View style={styles.calGrid}>{renderCalendar()}</View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#c9a84c' }]} />
                  <Text style={styles.legendText}>Morning ☀️</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4a6fa5' }]} />
                  <Text style={styles.legendText}>Evening 🌙</Text>
                </View>
              </View>
            </View>

            {/* Milestones */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Milestones</Text>
              <View style={styles.milestonesGrid}>
                {MILESTONES.map(m => (
                  <View key={m.days} style={[styles.milestoneCard, streak >= m.days && styles.milestoneCardEarned]}>
                    <Text style={styles.milestoneIcon}>{m.icon}</Text>
                    <Text style={[styles.milestoneLabel, streak >= m.days && styles.milestoneLabelEarned]}>{m.label}</Text>
                    {streak >= m.days && <Ionicons name="checkmark-circle" size={16} color="#c9a84c" />}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {activeTab === 'reading' && (
          <>
            {/* Books Finished Hero */}
            <View style={styles.booksHeroCard}>
              <Text style={styles.booksHeroEmoji}>📚</Text>
              <Text style={styles.booksHeroNumber}>{books.length}</Text>
              <Text style={styles.booksHeroLabel}>Books Finished</Text>
            </View>

            {/* Reading Streak */}
            <View style={styles.readingStreakCard}>
              <Text style={styles.readingStreakIcon}>📖🔥</Text>
              <Text style={styles.readingStreakNumber}>{readingStreak}</Text>
              <Text style={styles.readingStreakLabel}>Day Reading Streak</Text>
            </View>

            {/* Reading Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="document-text-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{totalPages}</Text>
                <Text style={styles.statLabel}>Total{'\n'}Pages</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{formatReadingTime(totalReadingSeconds)}</Text>
                <Text style={styles.statLabel}>Total{'\n'}Time</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="sunny-outline" size={22} color="#c9a84c" />
                <Text style={styles.statNumber}>{formatReadingTime(todayReadingSeconds)}</Text>
                <Text style={styles.statLabel}>Read{'\n'}Today</Text>
              </View>
            </View>

            {/* Currently Reading */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📖 Currently Reading</Text>
              {currentBooks.length === 0 ? (
                <Text style={styles.emptyText}>No books in progress. Start a session in the Timer!</Text>
              ) : (
                currentBooks.map((book, i) => (
                  <View key={book.title + (book.author || '')} style={styles.currentBookRow}>
                    <View style={styles.currentBookIcon}>
                      <Ionicons name="book-outline" size={18} color="#c9a84c" />
                    </View>
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      {book.author ? <Text style={styles.bookAuthor}>by {book.author}</Text> : null}
                      <Text style={styles.bookDate}>Page {book.currentPage}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Reading History */}
            {readingSessions.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📅 Reading History</Text>
                {readingSessions.slice(0, 10).map((session, i) => (
                  <View key={session.date + session.bookTitle + i} style={styles.sessionRow}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionBook}>{session.bookTitle}</Text>
                      <Text style={styles.sessionMeta}>{session.dateFormatted}</Text>
                    </View>
                    <View style={styles.sessionStats}>
                      <Text style={styles.sessionPages}>pp. {session.startPage}→{session.endPage}</Text>
                      <Text style={styles.sessionDuration}>{formatReadingTime(session.duration)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Books Finished */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Books Finished</Text>
                <TouchableOpacity style={styles.addSmallButton} onPress={() => setShowBookModal(true)}>
                  <Ionicons name="add" size={20} color="#1a1a2e" />
                </TouchableOpacity>
              </View>
              {books.length === 0 ? (
                <TouchableOpacity style={styles.emptyBooks} onPress={() => setShowBookModal(true)}>
                  <Ionicons name="add-circle-outline" size={22} color="#c9a84c" />
                  <Text style={styles.emptyBooksText}>Add your first finished book!</Text>
                </TouchableOpacity>
              ) : (
                books.map((book, i) => (
                  <View key={book.id} style={styles.bookCard}>
                    <View style={styles.bookNumber}>
                      <Text style={styles.bookNumberText}>{books.length - i}</Text>
                    </View>
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      {book.author ? <Text style={styles.bookAuthor}>by {book.author}</Text> : null}
                      <Text style={styles.bookDate}>Finished {book.dateFinished}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteBook(book.id)}>
                      <Ionicons name="trash-outline" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* Add Book Modal */}
      {/* Attend: native FamilyActivityPicker — choose what counts as screen time */}
      {showAttendPicker && AttendSelectionSheet && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowAttendPicker(false)}>
          <AttendSelectionSheet
            style={{ flex: 1 }}
            headerText="What counts toward your goal?"
            footerText="Pick the apps or categories your daily goal applies to. Choosing whole categories keeps future apps covered."
            onSelectionChange={(e: any) => {
              const sel = e?.nativeEvent?.familyActivitySelection ?? null;
              if (sel) onAttendSelection(sel);
            }}
            onDismissRequest={() => setShowAttendPicker(false)}
          />
        </Modal>
      )}

      <Modal visible={showBookModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📚 Book Finished!</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Book title *"
              placeholderTextColor="#555"
              value={newBookTitle}
              onChangeText={setNewBookTitle}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Author (optional)"
              placeholderTextColor="#555"
              value={newBookAuthor}
              onChangeText={setNewBookAuthor}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowBookModal(false); setNewBookTitle(''); setNewBookAuthor(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addBook}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingTop: 20, paddingHorizontal: 25 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c', marginBottom: 18 },
  tabs: { flexDirection: 'row', backgroundColor: '#16213e', borderRadius: 12, padding: 4, marginBottom: 5 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#c9a84c' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#1a1a2e' },
  scrollView: { flex: 1 },
  content: { padding: 25, paddingTop: 15 },
  portraitCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  portraitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portraitLabel: {
    color: '#c9a84c',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  portraitTeaser: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    color: '#d8d8e4',
    fontSize: 15,
    lineHeight: 25,
  },
  portraitMeta: { color: '#7a7a90', fontSize: 12, marginTop: 12 },
  streakCard: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 28,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#c9a84c',
  },
  streakIcon: { fontSize: 40, marginBottom: 5 },
  streakNumber: { fontSize: 64, fontWeight: 'bold', color: '#c9a84c', lineHeight: 70 },
  streakLabel: { color: '#fff', fontSize: 18, marginTop: 5 },
  booksHeroCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  booksHeroEmoji: { fontSize: 36, marginBottom: 4 },
  booksHeroNumber: { fontSize: 48, fontWeight: 'bold', color: '#c9a84c' },
  booksHeroLabel: { color: '#888', fontSize: 14, marginTop: 4 },
  readingStreakCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  readingStreakIcon: { fontSize: 36, marginBottom: 4 },
  readingStreakNumber: { fontSize: 48, fontWeight: 'bold', color: '#c9a84c' },
  readingStreakLabel: { color: '#888', fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#c9a84c22',
  },
  statNumber: { color: '#c9a84c', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  sectionCard: { backgroundColor: '#16213e', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#c9a84c22' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#c9a84c', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  attendConnectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 11, marginBottom: 8,
  },
  attendConnectText: { color: '#1a1a2e', fontSize: 14, fontWeight: '700' },
  attendCaption: { color: '#777', fontSize: 12, lineHeight: 17, marginBottom: 14 },
  attendStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#c9a84c11', borderWidth: 1, borderColor: '#c9a84c33',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  attendStatusLine: { color: '#e0d5b5', fontSize: 13, fontWeight: '600' },
  attendOver: { color: '#e08a4c' },
  attendUnder: { color: '#7cb87c' },
  attendMonitoredBy: { color: '#666', fontSize: 11, marginTop: 3 },
  attendDisconnect: { color: '#888', fontSize: 12, textDecorationLine: 'underline' },
  attendTease: { color: '#c9a84c', fontSize: 12, lineHeight: 17, marginTop: -6, marginBottom: 14 },
  screenTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 15 },
  screenTimeStat: { alignItems: 'center', gap: 4 },
  screenTimeHours: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  screenTimeLabel: { color: '#888', fontSize: 12 },
  screenTimeDivider: { width: 1, height: 40, backgroundColor: '#c9a84c33' },
  screenTimeGood: { color: '#4caf50' },
  screenTimeBad: { color: '#ff4444' },
  markRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  markButton: {
    flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#c9a84c33', backgroundColor: '#c9a84c0d',
  },
  markButtonUnderActive: { backgroundColor: '#4caf5022', borderColor: '#4caf50' },
  markButtonOverActive: { backgroundColor: '#ff444422', borderColor: '#ff4444' },
  markButtonText: { color: '#8A9BB0', fontSize: 14, fontWeight: '600' },
  markButtonTextActive: { color: '#fff' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDayLabel: { color: '#888', fontSize: 11 },
  weekDayNum: { color: '#fff', fontSize: 13, fontWeight: '600' },
  weekDayToday: { color: '#c9a84c', fontWeight: 'bold' },
  weekDots: { flexDirection: 'row', gap: 3 },
  weekDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  weekDotMorning: { backgroundColor: '#c9a84c' },
  weekDotEvening: { backgroundColor: '#4a6fa5' },
  legend: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#888', fontSize: 12 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  calDayLabels: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calDayLabelText: { color: '#888', fontSize: 11, width: 36, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  calCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4, marginBottom: 4 },
  calCellToday: { backgroundColor: '#1a1a2e', borderRadius: 8 },
  calDayNum: { color: '#fff', fontSize: 12, marginBottom: 3 },
  calDayToday: { color: '#c9a84c', fontWeight: 'bold' },
  calDots: { flexDirection: 'row', gap: 2 },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#333' },
  calDotMorning: { backgroundColor: '#c9a84c' },
  calDotEvening: { backgroundColor: '#4a6fa5' },
  milestonesGrid: { gap: 10 },
  milestoneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: '#1a1a2e', borderRadius: 12, borderWidth: 1, borderColor: '#333',
  },
  milestoneCardEarned: { borderColor: '#c9a84c', backgroundColor: '#c9a84c11' },
  milestoneIcon: { fontSize: 24 },
  milestoneLabel: { color: '#888', fontSize: 14, flex: 1 },
  milestoneLabelEarned: { color: '#fff', fontWeight: '600' },
  pagesInputRow: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  pagesInput: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#c9a84c33',
  },
  logButton: { backgroundColor: '#c9a84c', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  logButtonText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 15 },
  pagesLogRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#c9a84c11' },
  pagesLogDate: { color: '#888', fontSize: 13 },
  pagesLogCount: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  addSmallButton: { backgroundColor: '#c9a84c', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyBooks: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15,
    borderRadius: 12, borderWidth: 1, borderColor: '#c9a84c33',
    borderStyle: 'dashed', justifyContent: 'center',
  },
  emptyBooksText: { color: '#c9a84c', fontSize: 14 },
  bookCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#c9a84c11' },
  bookNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#c9a84c22', alignItems: 'center', justifyContent: 'center' },
  bookNumberText: { color: '#c9a84c', fontSize: 12, fontWeight: 'bold' },
  bookInfo: { flex: 1 },
  bookTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bookAuthor: { color: '#888', fontSize: 12, marginTop: 2 },
  bookDate: { color: '#555', fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, gap: 15 },
  modalTitle: { color: '#c9a84c', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalInput: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#c9a84c33' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 5 },
  modalCancel: { padding: 12, paddingHorizontal: 20 },
  modalCancelText: { color: '#888', fontSize: 15 },
  modalSave: { backgroundColor: '#c9a84c', borderRadius: 10, padding: 12, paddingHorizontal: 25 },
  modalSaveText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 15 },
  weeklyReviewDescription: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  weeklyReviewButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  weeklyReviewButtonText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 15 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  currentBookRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#c9a84c11' },
  currentBookIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#c9a84c22', alignItems: 'center', justifyContent: 'center' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#c9a84c11' },
  sessionInfo: { flex: 1, marginRight: 10 },
  sessionBook: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sessionMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  sessionStats: { alignItems: 'flex-end' },
  sessionPages: { color: '#c9a84c', fontSize: 12, fontWeight: '600' },
  sessionDuration: { color: '#888', fontSize: 11, marginTop: 2 },

});