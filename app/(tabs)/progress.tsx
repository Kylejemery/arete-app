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
import { getTodayCheckin, getJournalEntries, getReadingData, upsertReadingData, checkAndResetStreakIfMissed } from '@/lib/db';

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

  // Screen time
  const [screenTimeGoal, setScreenTimeGoal] = useState(2);
  const [screenTimeLog, setScreenTimeLog] = useState<any[]>([]);
  const [todayScreenTime, setTodayScreenTime] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    // Restore cached streak immediately to avoid flash of 0
    try {
      const cached = await AsyncStorage.getItem('arete:progress_streak');
      if (cached) setStreak(JSON.parse(cached).streak ?? 0);
    } catch {}

    try {
      const freshStreak = await checkAndResetStreakIfMissed();
      setStreak(freshStreak);
      try { await AsyncStorage.setItem('arete:progress_streak', JSON.stringify({ streak: freshStreak })); } catch {}

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

  const logScreenTime = async () => {
    const hours = parseFloat(todayScreenTime);
    if (!hours || hours < 0) { Alert.alert('Invalid', 'Please enter valid hours.'); return; }
    const today = new Date().toDateString();
    const existing = screenTimeLog.filter((l: any) => l.date !== today);
    const updated = [{
      date: today, hours,
      dateFormatted: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }, ...existing];
    setScreenTimeLog(updated);
    const status = hours <= screenTimeGoal ? '✅ Under goal!' : '⚠️ Over goal.';
    Alert.alert('Screen Time Logged!', `${hours}h logged. ${status}`);
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

  const todayScreenEntry = screenTimeLog.find(l => l.date === new Date().toDateString());

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
              <View style={styles.screenTimeRow}>
                <View style={styles.screenTimeStat}>
                  <Text style={styles.screenTimeHours}>
                    {todayScreenEntry ? `${todayScreenEntry.hours}h` : '—'}
                  </Text>
                  <Text style={styles.screenTimeLabel}>Today</Text>
                </View>
                <View style={styles.screenTimeDivider} />
                <View style={styles.screenTimeStat}>
                  <Text style={[
                    styles.screenTimeHours,
                    todayScreenEntry && todayScreenEntry.hours <= screenTimeGoal
                      ? styles.screenTimeGood : styles.screenTimeBad
                  ]}>
                    {screenTimeGoal}h
                  </Text>
                  <Text style={styles.screenTimeLabel}>Daily Goal</Text>
                </View>
              </View>
              <View style={styles.pagesInputRow}>
                <TextInput
                  style={styles.pagesInput}
                  placeholder="Log today's screen time (hrs)..."
                  placeholderTextColor="#555"
                  keyboardType="decimal-pad"
                  value={todayScreenTime}
                  onChangeText={setTodayScreenTime}
                />
                <TouchableOpacity style={styles.logButton} onPress={logScreenTime}>
                  <Text style={styles.logButtonText}>Log</Text>
                </TouchableOpacity>
              </View>
              {screenTimeLog.slice(0, 5).map((log, i) => (
                <View key={i} style={styles.pagesLogRow}>
                  <Text style={styles.pagesLogDate}>{log.dateFormatted}</Text>
                  <Text style={[
                    styles.pagesLogCount,
                    log.hours <= screenTimeGoal ? styles.screenTimeGood : styles.screenTimeBad
                  ]}>
                    {log.hours}h {log.hours <= screenTimeGoal ? '✅' : '⚠️'}
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
  screenTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 15 },
  screenTimeStat: { alignItems: 'center', gap: 4 },
  screenTimeHours: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  screenTimeLabel: { color: '#888', fontSize: 12 },
  screenTimeDivider: { width: 1, height: 40, backgroundColor: '#c9a84c33' },
  screenTimeGood: { color: '#4caf50' },
  screenTimeBad: { color: '#ff4444' },
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