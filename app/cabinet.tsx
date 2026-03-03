import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { sendMessageToCabinet } from '../services/claudeService';
import {
  ThreadMessage,
  appendMessages,
  clearThread,
  getAllThreadSummaries,
  loadThread,
} from '../services/threadService';

const COUNSELOR_META: Record<string, { name: string; role: string }> = {
  marcus: { name: 'Marcus Aurelius', role: 'Emperor & Stoic — Chair' },
  epictetus: { name: 'Epictetus', role: 'Philosopher & Former Slave' },
  goggins: { name: 'David Goggins', role: 'Navy SEAL & Endurance Athlete' },
  roosevelt: { name: 'Theodore Roosevelt', role: '26th President & Adventurer' },
  futureSelf: { name: 'Future Self', role: 'Years From Now' },
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CabinetScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'cabinet' | 'counselors'>('cabinet');

  // --- Cabinet (Group) Tab State ---
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Counselors Tab State ---
  const [activeMembers, setActiveMembers] = useState<string[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<
    { id: string; messageCount: number; lastUpdated: number }[]
  >([]);

  // On mount: migrate old cabinetMessages → thread_cabinet, then load thread
  useEffect(() => {
    (async () => {
      // Migration: move old cabinetMessages to thread_cabinet if thread_cabinet is empty
      const oldRaw = await AsyncStorage.getItem('cabinetMessages');
      if (oldRaw) {
        const existingThread = await loadThread('cabinet');
        if (existingThread.messages.length === 0) {
          try {
            const oldMessages: { role: 'user' | 'assistant'; content: string }[] =
              JSON.parse(oldRaw);
            if (Array.isArray(oldMessages) && oldMessages.length > 0) {
              const now = Date.now();
              const migrated: ThreadMessage[] = oldMessages.map((m, i) => ({
                role: m.role,
                content: m.content,
                timestamp: now - (oldMessages.length - i) * 1000,
              }));
              await appendMessages('cabinet', migrated);
            }
          } catch { /* ignore corrupt data */ }
        }
        await AsyncStorage.removeItem('cabinetMessages');
      }

      // Load cabinet thread
      const thread = await loadThread('cabinet');
      setMessages(thread.messages);
    })();
  }, []);

  // Load counselors tab data when switching to it
  useEffect(() => {
    if (activeTab !== 'counselors') return;
    (async () => {
      const cabinetMembersRaw = await AsyncStorage.getItem('cabinetMembers');
      let members = ['marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf'];
      try {
        if (cabinetMembersRaw) {
          const parsed = JSON.parse(cabinetMembersRaw);
          if (Array.isArray(parsed) && parsed.length > 0) members = parsed;
        }
      } catch { /* use default */ }
      setActiveMembers(members);
      const summaries = await getAllThreadSummaries();
      setThreadSummaries(summaries);
    })();
  }, [activeTab]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage: ThreadMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    const reply = await sendMessageToCabinet(updatedMessages);

    const assistantMessage: ThreadMessage = {
      role: 'assistant',
      content: reply,
      timestamp: Date.now(),
    };
    const finalMessages = [...updatedMessages, assistantMessage];
    setMessages(finalMessages);
    setIsLoading(false);

    await appendMessages('cabinet', [userMessage, assistantMessage]);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleNewSession = () => {
    if (messages.length === 0) return;
    Alert.alert(
      'New Session',
      'Clear the conversation and start a new session with the Cabinet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Session',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            clearThread('cabinet');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>The Cabinet</Text>
          <Text style={styles.subtitle}>Your Council of Invisible Counselors</Text>
        </View>
        {activeTab === 'cabinet' && (
          <TouchableOpacity
            style={styles.newSessionButton}
            onPress={handleNewSession}
            disabled={messages.length === 0}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={messages.length === 0 ? '#555' : '#c9a84c'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cabinet' && styles.tabActive]}
          onPress={() => setActiveTab('cabinet')}
        >
          <Text style={[styles.tabText, activeTab === 'cabinet' && styles.tabTextActive]}>
            Cabinet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'counselors' && styles.tabActive]}
          onPress={() => setActiveTab('counselors')}
        >
          <Text style={[styles.tabText, activeTab === 'counselors' && styles.tabTextActive]}>
            Counselors
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'cabinet' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={56} color="#c9a84c44" />
                <Text style={styles.emptyQuote}>
                  &ldquo;Bring your questions, struggles, and victories to the Cabinet.&rdquo;
                </Text>
                <View style={styles.counselorList}>
                  <Text style={styles.counselorName}>Marcus Aurelius — Chair</Text>
                  <Text style={styles.counselorName}>Epictetus</Text>
                  <Text style={styles.counselorName}>David Goggins</Text>
                  <Text style={styles.counselorName}>Theodore Roosevelt</Text>
                  <Text style={styles.counselorName}>Future Kyle (Age 50)</Text>
                </View>
              </View>
            ) : (
              messages.map((msg, index) =>
                msg.role === 'user' ? (
                  <View key={index} style={styles.userMessageRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userText}>{msg.content}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={index} style={styles.cabinetMessageRow}>
                    <View style={styles.cabinetBubble}>
                      <Text style={styles.cabinetLabel}>The Cabinet</Text>
                      <Text style={styles.cabinetText}>{msg.content}</Text>
                    </View>
                  </View>
                )
              )
            )}

            {isLoading && (
              <View style={styles.cabinetMessageRow}>
                <View style={styles.cabinetBubble}>
                  <Text style={styles.cabinetLabel}>The Cabinet</Text>
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#c9a84c" />
                    <Text style={styles.loadingText}>The Cabinet is convening...</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Speak to the Cabinet..."
              placeholderTextColor="#555"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={18}
                color={!inputText.trim() || isLoading ? '#555' : '#1a1a2e'}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* Counselors Tab */
        <ScrollView style={styles.counselorsScroll} contentContainerStyle={styles.counselorsContent}>
          {activeMembers.map((memberId) => {
            const meta = COUNSELOR_META[memberId];
            if (!meta) return null;
            const summary = threadSummaries.find((s) => s.id === memberId);
            const hasMessages = summary && summary.messageCount > 0;
            return (
              <TouchableOpacity
                key={memberId}
                style={styles.counselorCard}
                onPress={() => router.push({ pathname: '/counselor-chat', params: { id: memberId } })}
              >
                <View style={styles.counselorCardIcon}>
                  <Ionicons name="person-outline" size={28} color="#c9a84c" />
                </View>
                <View style={styles.counselorCardInfo}>
                  <Text style={styles.counselorCardName}>{meta.name}</Text>
                  <Text style={styles.counselorCardRole}>{meta.role}</Text>
                  {hasMessages && summary && (
                    <Text style={styles.counselorCardActivity}>
                      Last active {timeAgo(summary.lastUpdated)}
                    </Text>
                  )}
                </View>
                {hasMessages && summary && (
                  <View style={styles.messageBadge}>
                    <Text style={styles.messageBadgeText}>{summary.messageCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#555" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#c9a84c',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  newSessionButton: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#c9a84c',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#c9a84c',
  },
  // Cabinet (group) tab
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyQuote: {
    color: '#888',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  counselorList: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  counselorName: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: '600',
  },
  userMessageRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 14,
    maxWidth: '80%',
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  cabinetMessageRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cabinetBubble: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#c9a84c33',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: '85%',
  },
  cabinetLabel: {
    color: '#c9a84c',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cabinetText: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 24,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 16,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  sendButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#555',
  },
  // Counselors tab
  counselorsScroll: {
    flex: 1,
  },
  counselorsContent: {
    padding: 16,
    gap: 12,
  },
  counselorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c9a84c22',
    padding: 16,
    gap: 12,
  },
  counselorCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  counselorCardInfo: {
    flex: 1,
    gap: 2,
  },
  counselorCardName: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '600',
  },
  counselorCardRole: {
    color: '#888',
    fontSize: 13,
  },
  counselorCardActivity: {
    color: '#c9a84c88',
    fontSize: 12,
    marginTop: 2,
  },
  messageBadge: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  messageBadgeText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
