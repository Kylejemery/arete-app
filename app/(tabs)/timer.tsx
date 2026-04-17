import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Alert, AppState, AppStateStatus, KeyboardAvoidingView, Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getReadingData, upsertReadingData } from '@/lib/db';

export default function TimerScreen() {
  const swipeHandlers = useSwipeNavigation('/timer');
  const [activeTab, setActiveTab] = useState<'timer' | 'history'>('timer');

  // Current books
  const [currentBooks, setCurrentBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookStartPage, setNewBookStartPage] = useState('');

  // Timer
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [startPage, setStartPage] = useState('');
  const [showStartPageModal, setShowStartPageModal] = useState(false);
  const [showEndPageModal, setShowEndPageModal] = useState(false);
  const [endPage, setEndPage] = useState('');
  const [sessionStartPage, setSessionStartPage] = useState(0);
  const intervalRef = useRef<any>(null);
  const sessionStartTime = useRef<number>(0);
  const backgroundTimeRef = useRef<number | null>(null);

  // History
  const [sessions, setSessions] = useState<any[]>([]);

  // Finish book modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishedBook, setFinishedBook] = useState<any>(null);

  // Pomodoro
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroSessions, setPomodoroSessions] = useState(0);
  const pomodoroRef = useRef<any>(null);

  useEffect(() => {
    loadData();
    return () => {
      clearInterval(intervalRef.current);
      if (pomodoroRef.current) clearInterval(pomodoroRef.current);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active' && backgroundTimeRef.current && isRunning) {
        const elapsed = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
        setSessionSeconds(prev => prev + elapsed);
        backgroundTimeRef.current = null;
      }
    });
    return () => subscription.remove();
  }, [isRunning]);

  useEffect(() => {
    if (pomodoroRunning) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroTimeLeft(t => {
          if (t <= 1) {
            clearInterval(pomodoroRef.current);
            setPomodoroRunning(false);
            if (pomodoroMode === 'work') {
              setPomodoroSessions(s => s + 1);
              setPomodoroMode('break');
              return 5 * 60;
            } else {
              setPomodoroMode('work');
              return 25 * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (pomodoroRef.current) clearInterval(pomodoroRef.current);
    }
    return () => { if (pomodoroRef.current) clearInterval(pomodoroRef.current); };
  }, [pomodoroRunning, pomodoroMode]);

  const loadData = async () => {
    try {
      const readingData = await getReadingData();
      if (readingData) {
        setCurrentBooks(readingData.current_books ?? []);
        setSessions(readingData.reading_sessions ?? []);
        const todayDate = new Date().toISOString().split('T')[0];
        if (readingData.today_reading_date === todayDate) {
          setTodaySeconds(readingData.today_reading_seconds ?? 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatTimeReadable = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const resetPomodoro = () => {
    setPomodoroRunning(false);
    setPomodoroTimeLeft(pomodoroMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const handleStartPress = () => {
    if (!selectedBook) {
      Alert.alert('Select a Book', 'Please select a book you are reading first.');
      return;
    }
    setShowStartPageModal(true);
  };

  const startTimer = () => {
    if (!startPage || parseInt(startPage) <= 0) {
      Alert.alert('Invalid', 'Please enter a valid starting page.');
      return;
    }
    setSessionStartPage(parseInt(startPage));
    setShowStartPageModal(false);
    setSessionSeconds(0);
    sessionStartTime.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
  };

  const handlePausePress = () => {
    clearInterval(intervalRef.current);
    setIsPaused(true);
  };

  const handleResumePress = () => {
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopPress = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setShowEndPageModal(true);
  };

  const stopTimer = async () => {
    const endPageNum = parseInt(endPage);
    if (!endPage || endPageNum <= 0) {
      Alert.alert('Invalid', 'Please enter a valid ending page.');
      return;
    }

    const pagesRead = Math.max(0, endPageNum - sessionStartPage);
    const duration = sessionSeconds;
    setShowEndPageModal(false);

    // Save session
    const session = {
      id: Date.now().toString(),
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      bookAuthor: selectedBook.author,
      startPage: sessionStartPage,
      endPage: endPageNum,
      pagesRead,
      duration,
      date: new Date().toDateString(),
      dateFormatted: new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      }),
    };

    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);

    // Update today's total
    const newTodaySeconds = todaySeconds + duration;
    setTodaySeconds(newTodaySeconds);

    // Update current book's current page
    const updatedBooks = currentBooks.map(b =>
      b.id === selectedBook.id ? { ...b, currentPage: endPageNum } : b
    );
    setCurrentBooks(updatedBooks);
    setSelectedBook({ ...selectedBook, currentPage: endPageNum });

    const todayDate = new Date().toISOString().split('T')[0];
    await upsertReadingData({
      current_books: updatedBooks,
      reading_sessions: updatedSessions,
      today_reading_seconds: newTodaySeconds,
      today_reading_date: todayDate,
    });

    setSessionSeconds(0);
    setEndPage('');
    setStartPage('');

    // Check if book is finished
    if (selectedBook.totalPages && endPageNum >= parseInt(selectedBook.totalPages)) {
      setFinishedBook({ ...selectedBook, currentPage: endPageNum });
      setShowFinishModal(true);
    } else {
      Alert.alert('Session Saved! 📖', `${pagesRead} pages • ${formatTimeReadable(duration)}`);
    }
  };

  const markBookFinished = async () => {
    if (!finishedBook) return;
    setShowFinishModal(false);

    const readingData = await getReadingData();
    const booksRead = readingData?.books_read ?? [];
    const newBook = {
      title: finishedBook.title,
      author: finishedBook.author,
      dateFinished: new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      }),
    };
    const updatedRead = [newBook, ...booksRead];
    const updatedCurrent = currentBooks.filter(b => b.id !== finishedBook.id);
    setCurrentBooks(updatedCurrent);
    await upsertReadingData({ books_read: updatedRead, current_books: updatedCurrent });
    if (selectedBook?.id === finishedBook.id) setSelectedBook(null);

    Alert.alert('🎉 Congratulations!', `"${finishedBook.title}" has been moved to your finished books!`);
    setFinishedBook(null);
  };

  const addBook = async () => {
    if (!newBookTitle.trim()) {
      Alert.alert('Required', 'Please enter a book title.');
      return;
    }
    const book = {
      id: Date.now().toString(),
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      startPage: parseInt(newBookStartPage) || 1,
      currentPage: parseInt(newBookStartPage) || 1,
      totalPages: '',
    };
    const updated = [...currentBooks, book];
    setCurrentBooks(updated);
    await upsertReadingData({ current_books: updated });
    setNewBookTitle('');
    setNewBookAuthor('');
    setNewBookStartPage('');
    setShowAddBookModal(false);
  };

  const deleteBook = (id: string) => {
    Alert.alert('Remove Book', 'Remove this book from currently reading?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = currentBooks.filter(b => b.id !== id);
          setCurrentBooks(updated);
          await upsertReadingData({ current_books: updated });
          if (selectedBook?.id === id) setSelectedBook(null);
        }
      }
    ]);
  };

  return (
    <View style={styles.container} {...swipeHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Focus ⏱️</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'timer' && styles.activeTab]}
            onPress={() => setActiveTab('timer')}
          >
            <Text style={[styles.tabText, activeTab === 'timer' && styles.activeTabText]}>Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* TIMER TAB */}
        {activeTab === 'timer' && (
          <>
            {/* Pomodoro Timer */}
            <View style={styles.pomodoroCard}>
              {/* Mode Toggle */}
              <View style={styles.pomodoroModes}>
                {(['work', 'break'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pomodoroModeBtn, pomodoroMode === m && styles.pomodoroModeBtnActive]}
                    onPress={() => {
                      setPomodoroMode(m);
                      setPomodoroTimeLeft(m === 'work' ? 25 * 60 : 5 * 60);
                      setPomodoroRunning(false);
                    }}
                  >
                    <Text style={[styles.pomodoroModeTxt, pomodoroMode === m && styles.pomodoroModeTxtActive]}>
                      {m === 'work' ? '25 min Work' : '5 min Break'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Countdown */}
              <Text style={styles.pomodoroDisplay}>{formatTime(pomodoroTimeLeft)}</Text>

              {/* Buttons */}
              <View style={styles.pomodoroButtons}>
                <TouchableOpacity
                  style={styles.pomodoroStartBtn}
                  onPress={() => setPomodoroRunning(r => !r)}
                >
                  <Text style={styles.pomodoroStartTxt}>{pomodoroRunning ? 'Pause' : 'Start'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pomodoroResetBtn} onPress={resetPomodoro}>
                  <Text style={styles.pomodoroResetTxt}>Reset</Text>
                </TouchableOpacity>
              </View>

              {/* Sessions */}
              <Text style={styles.pomodoroSessions}>
                Sessions completed today: <Text style={styles.pomodoroSessionsCount}>{pomodoroSessions}</Text>
              </Text>
            </View>

            {/* Today's Stats */}
            <View style={styles.todayCard}>
              <Ionicons name="time-outline" size={22} color="#c9a84c" />
              <View>
                <Text style={styles.todayLabel}>Today's Reading Time</Text>
                <Text style={styles.todayTime}>{formatTimeReadable(todaySeconds)}</Text>
              </View>
            </View>

            {/* Timer Display */}
            <View style={styles.timerCard}>
              <Text style={styles.timerDisplay}>{formatTime(sessionSeconds)}</Text>
              {selectedBook && (
                <Text style={styles.timerBookLabel}>
                  📖 {selectedBook.title}
                  {selectedBook.currentPage ? ` • p.${selectedBook.currentPage}` : ''}
                </Text>
              )}
              {!selectedBook && (
                <Text style={styles.timerBookLabel}>Select a book below to start</Text>
              )}
              {!isRunning && !isPaused ? (
                <TouchableOpacity style={styles.timerButton} onPress={handleStartPress}>
                  <Ionicons name="play" size={32} color="#1a1a2e" />
                  <Text style={styles.timerButtonText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timerButtonRow}>
                  <TouchableOpacity
                    style={[styles.timerButton, styles.timerButtonPause]}
                    onPress={isPaused ? handleResumePress : handlePausePress}
                  >
                    <Ionicons name={isPaused ? 'play' : 'pause'} size={28} color="#1a1a2e" />
                    <Text style={styles.timerButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timerButton, styles.timerButtonStop]}
                    onPress={handleStopPress}
                  >
                    <Ionicons name="stop" size={28} color="#1a1a2e" />
                    <Text style={styles.timerButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Currently Reading */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Currently Reading</Text>
                <TouchableOpacity
                  style={styles.addSmallButton}
                  onPress={() => setShowAddBookModal(true)}
                >
                  <Ionicons name="add" size={20} color="#1a1a2e" />
                </TouchableOpacity>
              </View>

              {currentBooks.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyBooks}
                  onPress={() => setShowAddBookModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#c9a84c" />
                  <Text style={styles.emptyBooksText}>Add a book you're reading!</Text>
                </TouchableOpacity>
              ) : (
                currentBooks.map(book => (
                  <TouchableOpacity
                    key={book.id}
                    style={[
                      styles.bookCard,
                      selectedBook?.id === book.id && styles.bookCardSelected
                    ]}
                    onPress={() => !isRunning && setSelectedBook(book)}
                  >
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      {book.author ? (
                        <Text style={styles.bookAuthor}>by {book.author}</Text>
                      ) : null}
                      <Text style={styles.bookPage}>Page {book.currentPage || book.startPage}</Text>
                    </View>
                    <View style={styles.bookActions}>
                      {selectedBook?.id === book.id && (
                        <Ionicons name="checkmark-circle" size={22} color="#c9a84c" />
                      )}
                      {!isRunning && (
                        <TouchableOpacity onPress={() => deleteBook(book.id)}>
                          <Ionicons name="trash-outline" size={18} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Session History</Text>
            {sessions.length === 0 ? (
              <View style={styles.emptyBooks}>
                <Ionicons name="time-outline" size={24} color="#c9a84c" />
                <Text style={styles.emptyBooksText}>No sessions yet. Start reading!</Text>
              </View>
            ) : (
              sessions.map((session, i) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionBook}>{session.bookTitle}</Text>
                    {session.bookAuthor ? (
                      <Text style={styles.sessionAuthor}>by {session.bookAuthor}</Text>
                    ) : null}
                    <Text style={styles.sessionDate}>{session.dateFormatted}</Text>
                    <Text style={styles.sessionPages}>
                      p.{session.startPage} → p.{session.endPage} • {session.pagesRead} pages
                    </Text>
                  </View>
                  <View style={styles.sessionRight}>
                    <Ionicons name="time-outline" size={16} color="#c9a84c" />
                    <Text style={styles.sessionTime}>{formatTimeReadable(session.duration)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>

      {/* Start Page Modal */}
      <Modal visible={showStartPageModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📖 Starting Page</Text>
            <Text style={styles.modalSubtitle}>{selectedBook?.title}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`Current page (${selectedBook?.currentPage || 1})`}
              placeholderTextColor="#888"
              keyboardType="number-pad"
              value={startPage}
              onChangeText={setStartPage}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowStartPageModal(false); setStartPage(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={startTimer}>
                <Text style={styles.modalSaveText}>Start ▶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* End Page Modal */}
      <Modal visible={showEndPageModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>✅ Session Complete!</Text>
            <Text style={styles.modalSubtitle}>
              {selectedBook?.title} • {formatTimeReadable(sessionSeconds)}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="What page did you stop on?"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              value={endPage}
              onChangeText={setEndPage}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowEndPageModal(false); setEndPage(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={stopTimer}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Book Modal */}
      <Modal visible={showAddBookModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>�� Add Book</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Book title *"
              placeholderTextColor="#888"
              value={newBookTitle}
              onChangeText={setNewBookTitle}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Author (optional)"
              placeholderTextColor="#888"
              value={newBookAuthor}
              onChangeText={setNewBookAuthor}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Starting page (default: 1)"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              value={newBookStartPage}
              onChangeText={setNewBookStartPage}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowAddBookModal(false);
                  setNewBookTitle('');
                  setNewBookAuthor('');
                  setNewBookStartPage('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addBook}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Finish Book Modal */}
      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.finishEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>Book Finished!</Text>
            <Text style={styles.modalSubtitle}>
              Did you finish "{finishedBook?.title}"?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowFinishModal(false); setFinishedBook(null); }}
              >
                <Text style={styles.modalCancelText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={markBookFinished}>
                <Text style={styles.modalSaveText}>Yes! 🎉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#c9a84c',
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#c9a84c',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 25,
    paddingTop: 15,
  },
  todayCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
  },
  todayLabel: {
    color: '#888',
    fontSize: 12,
  },
  todayTime: {
    color: '#c9a84c',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c',
    gap: 15,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#c9a84c',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  timerBookLabel: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  timerButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 50,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 5,
  },
  timerButtonRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 5,
  },
  timerButtonPause: {
    backgroundColor: '#c9a84c',
  },
  timerButtonStop: {
    backgroundColor: '#ff4444',
  },
  timerButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c22',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#c9a84c',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addSmallButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBooks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  emptyBooksText: {
    color: '#c9a84c',
    fontSize: 14,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  bookCardSelected: {
    borderColor: '#c9a84c',
    backgroundColor: '#c9a84c11',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookAuthor: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  bookPage: {
    color: '#c9a84c',
    fontSize: 11,
    marginTop: 3,
  },
  bookActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c11',
  },
  sessionLeft: {
    flex: 1,
  },
  sessionBook: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionAuthor: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  sessionDate: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  sessionPages: {
    color: '#c9a84c',
    fontSize: 11,
    marginTop: 3,
  },
  sessionRight: {
    alignItems: 'center',
    gap: 3,
  },
  sessionTime: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    gap: 15,
  },
  finishEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  modalTitle: {
    color: '#c9a84c',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  modalCancel: {
    padding: 12,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 15,
  },
  modalSave: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 25,
  },
  modalSaveText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 15,
  },
  pomodoroCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c9a84c',
    gap: 16,
  },
  pomodoroModes: {
    flexDirection: 'row',
    gap: 10,
  },
  pomodoroModeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c9a84c44',
  },
  pomodoroModeBtnActive: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  pomodoroModeTxt: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  pomodoroModeTxtActive: {
    color: '#1a1a2e',
  },
  pomodoroDisplay: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#c9a84c',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  pomodoroButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pomodoroStartBtn: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  pomodoroStartTxt: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pomodoroResetBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#c9a84c44',
  },
  pomodoroResetTxt: {
    color: '#888',
    fontSize: 15,
  },
  pomodoroSessions: {
    color: '#888',
    fontSize: 13,
  },
  pomodoroSessionsCount: {
    color: '#c9a84c',
    fontWeight: 'bold',
  },
});