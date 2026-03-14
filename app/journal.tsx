import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
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
import { BeliefEntry, BeliefDialogueTurn, sendBeliefJournalMessage } from '../services/claudeService';

const journalPrompts = [
  "What is on your mind today?",
  "What are you grateful for right now?",
  "What is one thing you want to accomplish today?",
  "What has been challenging you lately?",
  "What are you looking forward to?",
  "What lesson did life teach you recently?",
  "What would your future self want you to know today?",
];

const MAX_BELIEF_CONTEXT_LENGTH = 200;

export default function JournalScreen() {
  const router = useRouter();
  const swipeHandlers = useSwipeNavigation('/journal');
  const [activeTab, setActiveTab] = useState<'journal' | 'commonplace' | 'beliefs'>('journal');
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

  // Beliefs tab state
  const [beliefEntries, setBeliefEntries] = useState<BeliefEntry[]>([]);
  const [activeBeliefEntry, setActiveBeliefEntry] = useState<BeliefEntry | null>(null);
  const [beliefSubTab, setBeliefSubTab] = useState<'workshop' | 'canon'>('workshop');
  const [rawThoughtInput, setRawThoughtInput] = useState('');
  const [showRawThoughtInput, setShowRawThoughtInput] = useState(false);
  const [dialogueInput, setDialogueInput] = useState('');
  const [beliefLoading, setBeliefLoading] = useState(false);
  const [beliefError, setBeliefError] = useState<string | null>(null);
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [expandedBeliefIds, setExpandedBeliefIds] = useState<Set<string>>(new Set());
  const dialogueScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadJournalEntries();
    loadQuotes();
    loadBeliefEntries();
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

  // ── Belief journal helpers ──────────────────────────────────────────────────

  const loadBeliefEntries = async () => {
    try {
      const saved = await AsyncStorage.getItem('beliefEntries');
      if (saved) setBeliefEntries(JSON.parse(saved));
    } catch (e) { console.error(e); }
  };

  const saveBeliefEntries = async (entries: BeliefEntry[]) => {
    setBeliefEntries(entries);
    await AsyncStorage.setItem('beliefEntries', JSON.stringify(entries));
  };

  const updateBeliefEntry = async (updated: BeliefEntry) => {
    // Read fresh from storage to avoid stale-closure bug
    const raw = await AsyncStorage.getItem('beliefEntries');
    const current: BeliefEntry[] = raw ? JSON.parse(raw) : [];
    const entries = current.map((e: BeliefEntry) => e.id === updated.id ? updated : e);
    await saveBeliefEntries(entries);
    if (activeBeliefEntry?.id === updated.id) setActiveBeliefEntry(updated);
  };

  const submitRawThought = async () => {
    if (!rawThoughtInput.trim()) return;
    const now = Date.now();
    const topic = rawThoughtInput.trim().substring(0, 60);
    const entry: BeliefEntry = {
      id: now.toString(),
      rawThought: rawThoughtInput.trim(),
      stage: 1,
      dialogue: [],
      refinedStatement: '',
      encodedBelief: '',
      virtueCheck: null,
      createdAt: now,
      updatedAt: now,
      topic,
    };
    const updated = [entry, ...beliefEntries];
    await saveBeliefEntries(updated);
    setRawThoughtInput('');
    setShowRawThoughtInput(false);
    setActiveBeliefEntry(entry);
    setBeliefError(null);
    // Immediately call the cabinet to begin Stage 2 (questions)
    await callCabinetForBelief(entry, 1);
  };

  const callCabinetForBelief = async (entry: BeliefEntry, stage: 1 | 2 | 3, extraUserTurn?: string) => {
    setBeliefLoading(true);
    setBeliefError(null);
    try {
      // If there's an extra user turn (typed response), add it to entry before calling
      let entryToSend = entry;
      if (extraUserTurn) {
        const userTurn: BeliefDialogueTurn = {
          role: 'user',
          content: extraUserTurn,
          timestamp: Date.now(),
        };
        entryToSend = {
          ...entry,
          dialogue: [...entry.dialogue, userTurn],
          updatedAt: Date.now(),
        };
        await updateBeliefEntry(entryToSend);
      }

      const result = await sendBeliefJournalMessage(entryToSend, stage);

      const cabinetTurn: BeliefDialogueTurn = {
        role: 'cabinet',
        content: result.response,
        timestamp: Date.now(),
      };

      const newStage: BeliefEntry['stage'] =
        stage === 2 ? 2 :
        stage === 3 ? 3 :
        entryToSend.stage;

      const finalEntry: BeliefEntry = {
        ...entryToSend,
        dialogue: [...entryToSend.dialogue, cabinetTurn],
        stage: newStage,
        refinedStatement: result.refinedStatement ?? entryToSend.refinedStatement,
        virtueCheck: result.virtueCheck ?? entryToSend.virtueCheck,
        updatedAt: Date.now(),
      };

      await updateBeliefEntry(finalEntry);
      setShowAdjustInput(false);
      setTimeout(() => dialogueScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setBeliefError((err as Error).message || 'The Cabinet is unavailable. Tap to retry.');
    } finally {
      setBeliefLoading(false);
    }
  };

  const sendDialogueResponse = async () => {
    if (!activeBeliefEntry || !dialogueInput.trim()) return;
    const text = dialogueInput.trim();
    setDialogueInput('');
    await callCabinetForBelief(activeBeliefEntry, 1, text);
  };

  const proposeRefinement = async () => {
    if (!activeBeliefEntry) return;
    await callCabinetForBelief(activeBeliefEntry, 2);
  };

  const sendPushback = async () => {
    if (!activeBeliefEntry || !dialogueInput.trim()) return;
    const text = dialogueInput.trim();
    setDialogueInput('');
    await callCabinetForBelief(activeBeliefEntry, 3, text);
  };

  const encodeBelief = async () => {
    if (!activeBeliefEntry) return;
    const encoded: BeliefEntry = {
      ...activeBeliefEntry,
      stage: 'encoded',
      encodedBelief: activeBeliefEntry.refinedStatement,
      updatedAt: Date.now(),
    };
    await updateBeliefEntry(encoded);
    setShowAdjustInput(false);
    setActiveBeliefEntry(null);
  };

  const pushHarder = async () => {
    if (!activeBeliefEntry || beliefLoading) return;
    const challenge = "I want you to push harder on this belief. Hold it against the four cardinal virtues more rigorously — Wisdom, Justice, Courage, Temperance. Where does it fail? Where is it self-serving? Where is it borrowed rather than lived?";
    await callCabinetForBelief(activeBeliefEntry, 3, challenge);
  };

  const deleteBeliefEntry = (id: string) => {
    Alert.alert('Delete Belief', 'Are you sure you want to delete this belief entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = beliefEntries.filter(e => e.id !== id);
          await saveBeliefEntries(updated);
          if (activeBeliefEntry?.id === id) {
            setShowAdjustInput(false);
            setActiveBeliefEntry(null);
          }
        }
      }
    ]);
  };

  const toggleExpandBelief = (id: string) => {
    setExpandedBeliefIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inProgressEntries = beliefEntries.filter(e => e.stage !== 'encoded');
  const encodedEntries = beliefEntries.filter(e => e.stage === 'encoded');
  const sortedEncodedEntries = [...encodedEntries].sort((a, b) => b.updatedAt - a.updatedAt);
  const canProposeRefinement = activeBeliefEntry
    ? activeBeliefEntry.stage === 1 && activeBeliefEntry.dialogue.filter(t => t.role === 'user').length >= 1
    : false;

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
            <TouchableOpacity
              style={[styles.tab, activeTab === 'beliefs' && styles.activeTab]}
              onPress={() => { setActiveTab('beliefs'); setActiveBeliefEntry(null); }}
            >
              <Text style={[styles.tabText, activeTab === 'beliefs' && styles.activeTabText]}>Beliefs</Text>
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

        {/* BELIEFS TAB */}
        {activeTab === 'beliefs' && (
          activeBeliefEntry ? (
            /* ── Dialogue View ── */
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.beliefDialogueHeader}>
                <TouchableOpacity onPress={() => setActiveBeliefEntry(null)} style={styles.beliefBackButton}>
                  <Ionicons name="arrow-back" size={20} color="#c9a84c" />
                  <Text style={styles.beliefBackText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.beliefDialogueTitle} numberOfLines={1}>{activeBeliefEntry.topic}</Text>
                <TouchableOpacity
                  style={styles.beliefBackButton}
                  onPress={() => router.push({
                    pathname: '/cabinet',
                    params: {
                      beliefContext: `[From Belief Journal] ${activeBeliefEntry.topic}: ${activeBeliefEntry.rawThought.slice(0, MAX_BELIEF_CONTEXT_LENGTH)}`,
                    },
                  } as any)}
                >
                  <Text style={styles.beliefBackText}>Ask Cabinet →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={dialogueScrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.beliefDialogueContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Raw thought */}
                <View style={styles.beliefRawThoughtCard}>
                  <Text style={styles.beliefRawThoughtLabel}>Raw Thought</Text>
                  <Text style={styles.beliefRawThoughtText}>{activeBeliefEntry.rawThought}</Text>
                </View>

                {/* Dialogue bubbles */}
                {activeBeliefEntry.dialogue.map((turn, i) => (
                  <View key={i} style={turn.role === 'cabinet' ? styles.cabinetBubble : styles.userBubble}>
                    {turn.role === 'cabinet' && (
                      <Text style={styles.bubbleRoleLabel}>The Cabinet</Text>
                    )}
                    <Text style={turn.role === 'cabinet' ? styles.cabinetBubbleText : styles.userBubbleText}>
                      {turn.content}
                    </Text>
                  </View>
                ))}

                {/* Refined statement card (stage 2 or 3) */}
                {(activeBeliefEntry.stage === 2 || activeBeliefEntry.stage === 3) && activeBeliefEntry.refinedStatement ? (
                  <View style={styles.refinedStatementCard}>
                    <Text style={styles.refinedStatementLabel}>Proposed Encoded Belief</Text>
                    <Text style={styles.refinedStatementText}>{activeBeliefEntry.refinedStatement}</Text>
                    {activeBeliefEntry.virtueCheck && !activeBeliefEntry.virtueCheck.passed && (
                      <View style={styles.virtueConcernBadge}>
                        <Ionicons name="warning-outline" size={16} color="#c9a84c" />
                        <Text style={styles.virtueConcernText}>
                          {activeBeliefEntry.virtueCheck.virtue ? activeBeliefEntry.virtueCheck.virtue.charAt(0).toUpperCase() + activeBeliefEntry.virtueCheck.virtue.slice(1) + ': ' : ''}
                          {activeBeliefEntry.virtueCheck.concern}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Loading / error */}
                {beliefLoading && (
                  <View style={styles.cabinetBubble}>
                    <ActivityIndicator color="#c9a84c" size="small" />
                  </View>
                )}
                {beliefError && !beliefLoading && (
                  <TouchableOpacity
                    style={styles.beliefErrorCard}
                    onPress={() => {
                      const stage: 1 | 2 | 3 =
                        activeBeliefEntry.stage === 2 ? 2 :
                        activeBeliefEntry.stage === 3 ? 3 : 1;
                      callCabinetForBelief(activeBeliefEntry, stage);
                    }}
                  >
                    <Ionicons name="warning-outline" size={16} color="#ff4444" />
                    <Text style={styles.beliefErrorText}>The Cabinet is unavailable. Tap to retry.</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Input area */}
              <View style={styles.beliefInputArea}>
                {/* Stage 1: questions phase */}
                {activeBeliefEntry.stage === 1 && (
                  <>
                    <View style={styles.beliefInputRow}>
                      <TextInput
                        style={styles.beliefTextInput}
                        placeholder="Respond to the Cabinet..."
                        placeholderTextColor="#555"
                        multiline
                        value={dialogueInput}
                        onChangeText={setDialogueInput}
                      />
                      <TouchableOpacity
                        style={[styles.beliefSendButton, (!dialogueInput.trim() || beliefLoading) && styles.beliefSendButtonDisabled]}
                        onPress={sendDialogueResponse}
                        disabled={!dialogueInput.trim() || beliefLoading}
                      >
                        <Ionicons name="send" size={18} color={!dialogueInput.trim() || beliefLoading ? '#555' : '#1a1a2e'} />
                      </TouchableOpacity>
                    </View>
                    {canProposeRefinement && !beliefLoading && (
                      <TouchableOpacity style={styles.proposeRefinementButton} onPress={proposeRefinement}>
                        <Ionicons name="sparkles-outline" size={16} color="#1a1a2e" />
                        <Text style={styles.proposeRefinementText}>Propose a refined version</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Stage 2 or 3: refinement/iteration phase */}
                {(activeBeliefEntry.stage === 2 || activeBeliefEntry.stage === 3) && !beliefLoading && (
                  <View style={styles.actionPanel}>
                    {activeBeliefEntry.refinedStatement ? (
                      <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={encodeBelief}>
                        <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>🔒  This lands — encode it</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowAdjustInput(prev => !prev)}>
                      <Text style={styles.actionButtonText}>✏️  Not quite — adjust it</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={pushHarder}>
                      <Text style={styles.actionButtonText}>⚔️  Push harder</Text>
                    </TouchableOpacity>
                    {showAdjustInput && (
                      <View style={styles.beliefInputRow}>
                        <TextInput
                          style={styles.beliefTextInput}
                          placeholder="Push back, adjust, or ask to iterate..."
                          placeholderTextColor="#555"
                          multiline
                          value={dialogueInput}
                          onChangeText={setDialogueInput}
                        />
                        <TouchableOpacity
                          style={[styles.beliefSendButton, (!dialogueInput.trim() || beliefLoading) && styles.beliefSendButtonDisabled]}
                          onPress={sendPushback}
                          disabled={!dialogueInput.trim() || beliefLoading}
                        >
                          <Ionicons name="send" size={18} color={!dialogueInput.trim() || beliefLoading ? '#555' : '#1a1a2e'} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          ) : (
            /* ── List View (Workshop + Canon) ── */
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

              {/* Sub-tab toggle */}
              <View style={styles.subTabRow}>
                <TouchableOpacity
                  style={[styles.subTab, beliefSubTab === 'workshop' && styles.activeSubTab]}
                  onPress={() => setBeliefSubTab('workshop')}
                >
                  <Text style={[styles.subTabText, beliefSubTab === 'workshop' && styles.activeSubTabText]}>Workshop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, beliefSubTab === 'canon' && styles.activeSubTab]}
                  onPress={() => setBeliefSubTab('canon')}
                >
                  <Text style={[styles.subTabText, beliefSubTab === 'canon' && styles.activeSubTabText]}>Canon</Text>
                </TouchableOpacity>
              </View>

              {/* ── WORKSHOP SUB-VIEW ── */}
              {beliefSubTab === 'workshop' && (
                <>
                  {/* New belief input */}
                  {showRawThoughtInput ? (
                    <View style={styles.inputCard}>
                      <Text style={styles.beliefInputTitle}>Articulate a belief</Text>
                      <TextInput
                        style={styles.beliefRawInput}
                        placeholder="Something you half-believe, assume, or value — write it raw. Unfiltered."
                        placeholderTextColor="#555"
                        multiline
                        autoFocus
                        value={rawThoughtInput}
                        onChangeText={setRawThoughtInput}
                      />
                      <View style={styles.inputButtons}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowRawThoughtInput(false); setRawThoughtInput(''); }}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={submitRawThought} disabled={!rawThoughtInput.trim()}>
                          <Text style={styles.saveText}>Submit to Cabinet</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.addButton} onPress={() => setShowRawThoughtInput(true)}>
                      <Ionicons name="add-circle-outline" size={22} color="#c9a84c" />
                      <Text style={styles.addButtonText}>Articulate a belief</Text>
                    </TouchableOpacity>
                  )}

                  {/* In Progress section */}
                  {inProgressEntries.length > 0 && (
                    <>
                      <Text style={styles.beliefSectionHeader}>In Progress</Text>
                      {inProgressEntries.map(entry => (
                        <View key={entry.id} style={styles.beliefInProgressCard}>
                          <View style={styles.beliefCardRow}>
                            <View style={[styles.stageDot, entry.stage === 1 ? styles.stageDot1 : entry.stage === 2 ? styles.stageDot2 : styles.stageDot3]} />
                            <Text style={styles.beliefTopicText} numberOfLines={1}>{entry.topic}</Text>
                            <TouchableOpacity onPress={() => deleteBeliefEntry(entry.id)} style={styles.beliefDeleteButton}>
                              <Ionicons name="trash-outline" size={16} color="#ff4444" />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.beliefRawSnippet} numberOfLines={2}>{entry.rawThought}</Text>
                          <Text style={styles.beliefStageLabel}>
                            {entry.stage === 1 ? 'Exploring questions' : entry.stage === 2 ? 'Refining belief' : 'Iterating'}
                          </Text>
                          <TouchableOpacity
                            style={styles.continueButton}
                            onPress={() => { setActiveBeliefEntry(entry); setBeliefError(null); }}
                          >
                            <Text style={styles.continueButtonText}>Continue</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Encoded beliefs section */}
                  {encodedEntries.length > 0 && (
                    <>
                      <Text style={styles.beliefSectionHeader}>Encoded Beliefs</Text>
                      {encodedEntries.map(entry => {
                        const isExpanded = expandedBeliefIds.has(entry.id);
                        const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;
                        return (
                          <View key={entry.id} style={styles.encodedBeliefCard}>
                            <TouchableOpacity onPress={() => toggleExpandBelief(entry.id)} activeOpacity={0.8}>
                              <View style={styles.beliefCardRow}>
                                <Text style={styles.encodedTopicText}>{entry.topic}</Text>
                                <View style={styles.beliefCardRowRight}>
                                  {virtueOk ? (
                                    <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                                  ) : (
                                    <Ionicons name="warning" size={18} color="#c9a84c" />
                                  )}
                                  <TouchableOpacity onPress={() => deleteBeliefEntry(entry.id)}>
                                    <Ionicons name="trash-outline" size={16} color="#ff4444" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <Text style={styles.encodedBeliefText}>{entry.encodedBelief}</Text>
                              <Text style={styles.beliefDateText}>
                                {new Date(entry.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </Text>

                              {/* Virtue concern */}
                              {!virtueOk && entry.virtueCheck && (
                                <View style={styles.virtueConcernBadge}>
                                  <Ionicons name="warning-outline" size={14} color="#c9a84c" />
                                  <Text style={styles.virtueConcernText}>
                                    {entry.virtueCheck.virtue ? entry.virtueCheck.virtue.charAt(0).toUpperCase() + entry.virtueCheck.virtue.slice(1) + ': ' : ''}
                                    {entry.virtueCheck.concern}
                                  </Text>
                                </View>
                              )}

                              {/* Expand/collapse dialogue history */}
                              {isExpanded && (
                                <View style={styles.dialogueHistoryContainer}>
                                  <Text style={styles.dialogueHistoryLabel}>Dialogue History</Text>
                                  <View style={styles.beliefRawThoughtCard}>
                                    <Text style={styles.beliefRawThoughtLabel}>Raw Thought</Text>
                                    <Text style={styles.beliefRawThoughtText}>{entry.rawThought}</Text>
                                  </View>
                                  {entry.dialogue.map((turn, i) => (
                                    <View key={i} style={turn.role === 'cabinet' ? styles.cabinetBubble : styles.userBubble}>
                                      {turn.role === 'cabinet' && (
                                        <Text style={styles.bubbleRoleLabel}>The Cabinet</Text>
                                      )}
                                      <Text style={turn.role === 'cabinet' ? styles.cabinetBubbleText : styles.userBubbleText}>
                                        {turn.content}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              <View style={styles.expandRow}>
                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
                                <Text style={styles.expandText}>{isExpanded ? 'Hide dialogue' : 'View dialogue'}</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </>
                  )}

                  {beliefEntries.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="bulb-outline" size={52} color="#c9a84c22" />
                      <Text style={styles.emptyText}>No beliefs yet.</Text>
                      <Text style={styles.emptySubtext}>Articulate a half-formed belief and let the Cabinet help you refine it.</Text>
                    </View>
                  )}
                </>
              )}

              {/* ── CANON SUB-VIEW ── */}
              {beliefSubTab === 'canon' && (
                <>
                  {/* Canon header */}
                  <View style={styles.canonHeader}>
                    <Text style={styles.canonTitle}>My Encoded Beliefs</Text>
                    <Text style={styles.canonSubtitle}>Beliefs you have examined and committed to</Text>
                  </View>

                  {sortedEncodedEntries.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="shield-checkmark-outline" size={52} color="#c9a84c22" />
                      <Text style={styles.emptyText}>No encoded beliefs yet.</Text>
                      <Text style={styles.emptySubtext}>Complete a belief dialogue in the Workshop to encode your first conviction.</Text>
                    </View>
                  ) : (
                    sortedEncodedEntries.map(entry => {
                      const isExpanded = expandedBeliefIds.has(entry.id);
                      const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;
                      return (
                        <View key={entry.id} style={styles.canonCard}>
                          {/* Status icon in top-right corner */}
                          <View style={styles.canonCardTopRow}>
                            <Text style={styles.canonTopicLabel}>{entry.topic}</Text>
                            {virtueOk ? (
                              <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                            ) : (
                              <Ionicons name="warning" size={18} color="#c9a84c" />
                            )}
                          </View>

                          {/* Belief text — prominent */}
                          <Text style={styles.canonBeliefText}>{entry.encodedBelief}</Text>

                          {/* Date encoded */}
                          <Text style={styles.canonDateText}>
                            {new Date(entry.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </Text>

                          {/* Virtue concern badge (only if failed) */}
                          {!virtueOk && entry.virtueCheck && (
                            <View style={styles.virtueConcernBadge}>
                              <Ionicons name="warning-outline" size={14} color="#c9a84c" />
                              <Text style={styles.virtueConcernText}>
                                {entry.virtueCheck.virtue ? entry.virtueCheck.virtue.charAt(0).toUpperCase() + entry.virtueCheck.virtue.slice(1) + ': ' : ''}
                                {entry.virtueCheck.concern}
                              </Text>
                            </View>
                          )}

                          {/* Dialogue expand/collapse */}
                          {isExpanded && (
                            <View style={styles.dialogueHistoryContainer}>
                              <Text style={styles.dialogueHistoryLabel}>Dialogue History</Text>
                              <View style={styles.beliefRawThoughtCard}>
                                <Text style={styles.beliefRawThoughtLabel}>Raw Thought</Text>
                                <Text style={styles.beliefRawThoughtText}>{entry.rawThought}</Text>
                              </View>
                              {entry.dialogue.map((turn, i) => (
                                <View key={i} style={turn.role === 'cabinet' ? styles.cabinetBubble : styles.userBubble}>
                                  {turn.role === 'cabinet' && (
                                    <Text style={styles.bubbleRoleLabel}>The Cabinet</Text>
                                  )}
                                  <Text style={turn.role === 'cabinet' ? styles.cabinetBubbleText : styles.userBubbleText}>
                                    {turn.content}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <TouchableOpacity style={styles.expandRow} onPress={() => toggleExpandBelief(entry.id)}>
                            <Text style={styles.expandText}>{isExpanded ? 'Hide dialogue ↑' : 'View dialogue →'}</Text>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-forward'} size={14} color="#888" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </ScrollView>
          )
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

  // ── Belief Journal Styles ──────────────────────────────────────────────────
  beliefInputTitle: { color: '#c9a84c', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  beliefRawInput: {
    color: '#fff', fontSize: 15, minHeight: 100,
    textAlignVertical: 'top', lineHeight: 24, marginBottom: 10,
  },
  beliefSectionHeader: {
    color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 8, marginBottom: 10,
  },
  beliefInProgressCard: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#c9a84c33',
  },
  beliefCardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  beliefCardRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageDot1: { backgroundColor: '#555' },
  stageDot2: { backgroundColor: '#c9a84c' },
  stageDot3: { backgroundColor: '#f0c040' },
  beliefTopicText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  beliefRawSnippet: { color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  beliefStageLabel: { color: '#555', fontSize: 11, marginBottom: 10 },
  beliefDeleteButton: { padding: 4 },
  continueButton: {
    backgroundColor: '#c9a84c22', borderRadius: 10, paddingVertical: 8,
    paddingHorizontal: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#c9a84c44',
  },
  continueButtonText: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
  encodedBeliefCard: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: '#c9a84c33',
    borderLeftWidth: 3, borderLeftColor: '#c9a84c',
  },
  encodedTopicText: {
    color: '#c9a84c', fontSize: 15, fontWeight: '700', flex: 1,
  },
  encodedBeliefText: { color: '#fff', fontSize: 15, lineHeight: 24, marginVertical: 10 },
  beliefDateText: { color: '#555', fontSize: 11, marginBottom: 8 },
  virtueConcernBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#c9a84c11', borderRadius: 8, padding: 10, marginTop: 8,
  },
  virtueConcernText: { color: '#c9a84c', fontSize: 12, lineHeight: 18, flex: 1 },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  expandText: { color: '#888', fontSize: 12 },
  dialogueHistoryContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#c9a84c22', paddingTop: 12 },
  dialogueHistoryLabel: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  // Dialogue view
  beliefDialogueHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
    gap: 12,
  },
  beliefBackButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  beliefBackText: { color: '#c9a84c', fontSize: 14, fontWeight: '600' },
  beliefDialogueTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  beliefDialogueContent: { padding: 20, paddingTop: 14, paddingBottom: 12 },
  beliefRawThoughtCard: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#555',
  },
  beliefRawThoughtLabel: { color: '#555', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  beliefRawThoughtText: { color: '#ccc', fontSize: 14, lineHeight: 22 },
  cabinetBubble: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#c9a84c',
    maxWidth: '90%', alignSelf: 'flex-start',
  },
  bubbleRoleLabel: { color: '#c9a84c', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  cabinetBubbleText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  userBubble: {
    backgroundColor: '#1e2a45', borderRadius: 12, padding: 14,
    marginBottom: 12, maxWidth: '90%', alignSelf: 'flex-end',
  },
  userBubbleText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  refinedStatementCard: {
    backgroundColor: '#1e2a45', borderRadius: 14, padding: 16,
    marginVertical: 12, borderWidth: 1, borderColor: '#c9a84c66',
  },
  refinedStatementLabel: { color: '#c9a84c', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  refinedStatementText: { color: '#fff', fontSize: 15, lineHeight: 24 },
  beliefErrorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ff444411', borderRadius: 10, padding: 12, marginVertical: 8,
    borderWidth: 1, borderColor: '#ff444433',
  },
  beliefErrorText: { color: '#ff4444', fontSize: 13, flex: 1 },
  beliefInputArea: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#c9a84c22',
    backgroundColor: '#1a1a2e',
  },
  beliefInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 },
  beliefTextInput: {
    flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 12,
    color: '#fff', fontSize: 14, maxHeight: 100, minHeight: 44,
    textAlignVertical: 'top', borderWidth: 1, borderColor: '#c9a84c33',
  },
  beliefSendButton: {
    backgroundColor: '#c9a84c', borderRadius: 10, padding: 12, justifyContent: 'center', alignItems: 'center',
  },
  beliefSendButtonDisabled: { backgroundColor: '#16213e' },
  proposeRefinementButton: {
    backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  proposeRefinementText: { color: '#1a1a2e', fontSize: 14, fontWeight: '700' },
  encodeButton: {
    backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  encodeButtonText: { color: '#1a1a2e', fontSize: 14, fontWeight: '700' },
  actionPanel: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#16213e', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#c9a84c33',
  },
  actionButtonPrimary: {
    backgroundColor: '#c9a84c', borderColor: '#c9a84c',
  },
  actionButtonText: {
    color: '#c9a84c', fontSize: 14, fontWeight: '600', flex: 1,
  },
  actionButtonTextPrimary: {
    color: '#1a1a2e',
  },

  // ── Sub-tab toggle (Workshop / Canon) ────────────────────────────────────
  subTabRow: {
    flexDirection: 'row', backgroundColor: '#16213e',
    borderRadius: 10, padding: 3, marginBottom: 18,
  },
  subTab: {
    flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8,
  },
  activeSubTab: { backgroundColor: '#c9a84c33' },
  subTabText: { color: '#555', fontSize: 13, fontWeight: '600' },
  activeSubTabText: { color: '#c9a84c' },

  // ── Canon view ────────────────────────────────────────────────────────────
  canonHeader: {
    alignItems: 'center', paddingVertical: 18, marginBottom: 8,
  },
  canonTitle: {
    color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6,
  },
  canonSubtitle: {
    color: '#888', fontSize: 13, fontStyle: 'italic',
  },
  canonCard: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#c9a84c33',
    borderLeftWidth: 3, borderLeftColor: '#c9a84c',
  },
  canonCardTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  canonTopicLabel: {
    color: '#c9a84c', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, flex: 1,
  },
  canonBeliefText: {
    color: '#fff', fontSize: 17, lineHeight: 28, fontWeight: '500',
    marginBottom: 10,
  },
  canonDateText: {
    color: '#555', fontSize: 11, marginBottom: 8,
  },
});