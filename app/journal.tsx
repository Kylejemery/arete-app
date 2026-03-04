import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const journalPrompts = [
  "What is on your mind today?",
  "What are you grateful for right now?",
  "What is one thing you want to accomplish today?",
  "What has been challenging you lately?",
  "What are you looking forward to?",
  "What lesson did life teach you recently?",
  "What would your future self want you to know today?",
];

export default function JournalScreen() {
  const swipeHandlers = useSwipeNavigation('/journal');
  const [activeTab, setActiveTab] = useState<'journal' | 'commonplace'>('journal');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [prompt, setPrompt] = useState('');
  const [showJournalInput, setShowJournalInput] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [newQuote, setNewQuote] = useState('');
  const [newBook, setNewBook] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadJournalEntries();
    loadQuotes();
    setPrompt(getDailyPrompt());
  }, []);

  const getDailyPrompt = () => {
    const day = new Date().getDay();
    return journalPrompts[day];
  };

  const loadJournalEntries = async () => {
    try {
      const saved = await AsyncStorage.getItem('journalEntries');
      if (saved) setJournalEntries(JSON.parse(saved));
    } catch (e) { console.error(e); }
  };

  const loadQuotes = async () => {
    try {
      const saved = await AsyncStorage.getItem('commonplaceQuotes');
      if (saved) setQuotes(JSON.parse(saved));
    } catch (e) { console.error(e); }
  };

  const addJournalEntry = async () => {
    if (newEntry.trim()) {
      const entry = {
        id: Date.now().toString(),
        text: newEntry.trim(),
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      };
      const updated = [entry, ...journalEntries];
      setJournalEntries(updated);
      await AsyncStorage.setItem('journalEntries', JSON.stringify(updated));
      setNewEntry('');
      setShowJournalInput(false);
    }
  };

  const deleteJournalEntry = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = journalEntries.filter(e => e.id !== id);
          setJournalEntries(updated);
          await AsyncStorage.setItem('journalEntries', JSON.stringify(updated));
        }
      }
    ]);
  };

  const addQuote = async () => {
    if (newQuote.trim() && newBook.trim()) {
      const quote = {
        id: Date.now().toString(),
        quote: newQuote.trim(),
        book: newBook.trim(),
        author: newAuthor.trim(),
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        timestamp: Date.now(),
      };
      const updated = [quote, ...quotes];
      setQuotes(updated);
      await AsyncStorage.setItem('commonplaceQuotes', JSON.stringify(updated));
      setNewQuote(''); setNewBook(''); setNewAuthor('');
      setShowQuoteInput(false);
    } else {
      Alert.alert('Required', 'Please enter a quote and book title.');
    }
  };

  const deleteQuote = (id: string) => {
    Alert.alert('Delete Quote', 'Are you sure you want to delete this quote?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = quotes.filter(q => q.id !== id);
          setQuotes(updated);
          await AsyncStorage.setItem('commonplaceQuotes', JSON.stringify(updated));
        }
      }
    ]);
  };

  const filteredQuotes = quotes.filter(q =>
    q.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.book.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} {...swipeHandlers}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Journal 📓</Text>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'journal' && styles.activeTab]}
              onPress={() => setActiveTab('journal')}
            >
              <Text style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'commonplace' && styles.activeTab]}
              onPress={() => setActiveTab('commonplace')}
            >
              <Text style={[styles.tabText, activeTab === 'commonplace' && styles.activeTabText]}>Commonplace</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* JOURNAL TAB */}
        {activeTab === 'journal' && (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.promptContainer}>
              <Ionicons name="bulb-outline" size={18} color="#c9a84c" />
              <Text style={styles.promptText}>"{prompt}"</Text>
            </View>

            {showJournalInput ? (
              <View style={styles.inputCard}>
                <Text style={styles.inputDate}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {' · '}
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <TextInput
                  style={styles.journalInput}
                  placeholder="Write your thoughts..."
                  placeholderTextColor="#555"
                  multiline
                  autoFocus
                  value={newEntry}
                  onChangeText={setNewEntry}
                />
                <View style={styles.inputButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowJournalInput(false); setNewEntry(''); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={addJournalEntry}>
                    <Text style={styles.saveText}>Save Entry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={() => setShowJournalInput(true)}>
                <Ionicons name="add-circle-outline" size={22} color="#c9a84c" />
                <Text style={styles.addButtonText}>New Journal Entry</Text>
              </TouchableOpacity>
            )}

            {journalEntries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={52} color="#c9a84c22" />
                <Text style={styles.emptyText}>No entries yet.</Text>
                <Text style={styles.emptySubtext}>Start writing your story!</Text>
              </View>
            ) : (
              journalEntries.map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View>
                      <Text style={styles.entryDate}>{entry.date}</Text>
                      <Text style={styles.entryTime}>{entry.time}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteJournalEntry(entry.id)}>
                      <Ionicons name="trash-outline" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.entryText}>{entry.text}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* COMMONPLACE TAB */}
        {activeTab === 'commonplace' && (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search quotes, books, authors..."
                placeholderTextColor="#555"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {showQuoteInput ? (
              <View style={styles.inputCard}>
                <TextInput
                  style={styles.quoteInput}
                  placeholder="Enter quote..."
                  placeholderTextColor="#555"
                  multiline
                  autoFocus
                  value={newQuote}
                  onChangeText={setNewQuote}
                />
                <TextInput
                  style={styles.smallInput}
                  placeholder="Book title *"
                  placeholderTextColor="#555"
                  value={newBook}
                  onChangeText={setNewBook}
                />
                <TextInput
                  style={styles.smallInput}
                  placeholder="Author (optional)"
                  placeholderTextColor="#555"
                  value={newAuthor}
                  onChangeText={setNewAuthor}
                />
                <View style={styles.inputButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowQuoteInput(false); setNewQuote(''); setNewBook(''); setNewAuthor(''); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={addQuote}>
                    <Text style={styles.saveText}>Save Quote</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={() => setShowQuoteInput(true)}>
                <Ionicons name="add-circle-outline" size={22} color="#c9a84c" />
                <Text style={styles.addButtonText}>Add Quote</Text>
              </TouchableOpacity>
            )}

            {quotes.length > 0 && (
              <Text style={styles.countText}>
                {filteredQuotes.length} {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
                {searchQuery ? ' found' : ' saved'}
              </Text>
            )}

            {filteredQuotes.length === 0 && quotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="library-outline" size={52} color="#c9a84c22" />
                <Text style={styles.emptyText}>No quotes yet.</Text>
                <Text style={styles.emptySubtext}>Start building your commonplace notebook!</Text>
              </View>
            ) : filteredQuotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={52} color="#c9a84c22" />
                <Text style={styles.emptyText}>No results found.</Text>
                <Text style={styles.emptySubtext}>Try a different search term.</Text>
              </View>
            ) : (
              filteredQuotes.map(quote => (
                <View key={quote.id} style={styles.quoteCard}>
                  <View style={styles.quoteHeader}>
                    <Ionicons name="chatbubble-outline" size={18} color="#c9a84c" />
                    <TouchableOpacity onPress={() => deleteQuote(quote.id)}>
                      <Ionicons name="trash-outline" size={18} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.quoteText}>"{quote.quote}"</Text>
                  <View style={styles.quoteFooter}>
                    <Text style={styles.quoteBook}>📖 {quote.book}</Text>
                    {quote.author ? <Text style={styles.quoteAuthor}>— {quote.author}</Text> : null}
                  </View>
                  <Text style={styles.quoteDate}>{quote.date}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingTop: 20, paddingHorizontal: 25, paddingBottom: 0 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c', marginBottom: 18 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#16213e',
    borderRadius: 12, padding: 4, marginBottom: 5,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#c9a84c' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#1a1a2e' },
  scrollView: { flex: 1 },
  content: { padding: 25, paddingTop: 15 },
  promptContainer: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16,
    marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, borderLeftWidth: 3, borderLeftColor: '#c9a84c',
  },
  promptText: { color: '#c9a84c', fontSize: 14, fontStyle: 'italic', flex: 1, lineHeight: 22 },
  inputCard: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16,
    marginBottom: 18, borderWidth: 1, borderColor: '#c9a84c',
  },
  inputDate: { color: '#c9a84c', fontSize: 12, marginBottom: 10 },
  journalInput: {
    color: '#fff', fontSize: 15, minHeight: 120,
    textAlignVertical: 'top', lineHeight: 24, marginBottom: 10,
  },
  quoteInput: {
    color: '#fff', fontSize: 15, minHeight: 80,
    textAlignVertical: 'top', lineHeight: 24, marginBottom: 10, fontStyle: 'italic',
  },
  smallInput: {
    color: '#fff', fontSize: 14, borderTopWidth: 1,
    borderTopColor: '#c9a84c22', paddingTop: 10, marginBottom: 8,
  },
  inputButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 5 },
  cancelButton: { padding: 10, paddingHorizontal: 18 },
  cancelText: { color: '#888', fontSize: 14 },
  saveButton: { backgroundColor: '#c9a84c', padding: 10, paddingHorizontal: 20, borderRadius: 10 },
  saveText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 14 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16,
    borderRadius: 14, borderWidth: 1, borderColor: '#c9a84c44',
    borderStyle: 'dashed', justifyContent: 'center', marginBottom: 18,
  },
  addButtonText: { color: '#c9a84c', fontSize: 15, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: '#888', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#555', fontSize: 14 },
  entryCard: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: '#c9a84c22',
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  entryDate: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  entryTime: { color: '#888', fontSize: 11, marginTop: 2 },
  entryText: { color: '#fff', fontSize: 15, lineHeight: 24 },
  searchContainer: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 18, borderWidth: 1, borderColor: '#c9a84c33',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  countText: { color: '#888', fontSize: 13, marginBottom: 14 },
  quoteCard: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: '#c9a84c22',
    borderLeftWidth: 3, borderLeftColor: '#c9a84c',
  },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  quoteText: { color: '#fff', fontSize: 15, lineHeight: 24, fontStyle: 'italic', marginBottom: 12 },
  quoteFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  quoteBook: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  quoteAuthor: { color: '#888', fontSize: 13 },
  quoteDate: { color: '#555', fontSize: 11 },
});