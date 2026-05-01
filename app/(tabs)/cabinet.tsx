import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { sendMessageToCabinet, MessageLimitError } from '../../services/claudeService';
import { getUserSettings, getUserCabinet } from '@/lib/db';
import type { Counselor } from '@/lib/types';
import {
  ThreadMessage,
  appendMessages,
  clearThread,
  getAllThreadSummaries,
  loadThread,
  normalizeCounselorId,
} from '../../services/threadService';

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

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function CabinetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const swipeHandlers = useSwipeNavigation('/cabinet');
  const [activeTab, setActiveTab] = useState<'cabinet' | 'counselors'>('cabinet');
  const mountedRef = useRef(false);

  // --- Cabinet (Group) Tab State ---
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // --- Know Thyself nudge state ---
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [dismissedKtNudge, setDismissedKtNudge] = useState(false);

  // --- Counselors Tab State ---
  const [cabinetCounselors, setCabinetCounselors] = useState<Counselor[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<
    { id: string; messageCount: number; lastUpdated: number }[]
  >([]);

  // --- beliefContext deep-link param ---
  const params = useLocalSearchParams<{ beliefContext?: string; cabinetContext?: string; morningMessage?: string }>();
  const consumedBeliefContextRef = useRef(false);
  const consumedCabinetContextRef = useRef(false);
  const consumedMorningMessageRef = useRef(false);

  const loadInitialThread = async () => {
    setError(null);
    setInitialLoading(true);
    try {
      console.log('[Cabinet] Mount: loading initial thread...');
      const thread = await loadThread('cabinet');
      setMessages(thread.messages);
      console.log('[Cabinet] Thread loaded:', thread.messages.length, 'messages');
    } catch (err) {
      console.error('[Cabinet] Failed to load thread:', err);
      setError('Failed to load conversation. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };

  // On mount: load thread
  useEffect(() => {
    loadInitialThread();
  }, []);

  const loadCounselorsData = useCallback(async () => {
    try {
      const cabinet = await getUserCabinet();
      setCabinetCounselors(cabinet);
      const summaries = await getAllThreadSummaries();
      setThreadSummaries(summaries);
    } catch (err) {
      console.warn('[Cabinet] Failed to refresh counselors:', err);
    }
  }, []);

  // Load counselors tab data when switching to it
  useEffect(() => {
    if (activeTab !== 'counselors') return;
    loadCounselorsData();
  }, [activeTab, loadCounselorsData]);

  // Load Know Thyself completion status on focus; also refresh counselors data
  // Skip the very first focus (handled by mount useEffect above)
  useFocusEffect(
    useCallback(() => {
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      console.log('[Cabinet] useFocusEffect: refreshing data...');
      (async () => {
        try {
          const settings = await getUserSettings();
          setKnowThyselfIncomplete(!settings?.kt_goals || settings.kt_goals.trim().length === 0);
        } catch (err) {
          console.warn('[Cabinet] Failed to load KT settings:', err);
        }
        await loadCounselorsData();
        console.log('[Cabinet] Focus refresh complete');
      })();
    }, [loadCounselorsData])
  );

  // Consume beliefContext deep-link param
  useEffect(() => {
    const bc = params.beliefContext;
    if (bc && !consumedBeliefContextRef.current) {
      consumedBeliefContextRef.current = true;
      setActiveTab('cabinet');
      setInputText(String(bc));
      router.setParams({ beliefContext: undefined });
    }
  }, [params.beliefContext, router]);

  useEffect(() => {
    const cc = params.cabinetContext;
    if (cc && !consumedCabinetContextRef.current) {
      consumedCabinetContextRef.current = true;
      setActiveTab('cabinet');
      router.setParams({ cabinetContext: undefined });

      try {
        const { counselorName, topic, counselorLastResponse } = JSON.parse(String(cc));

        const handoffMessage = counselorLastResponse
          ? `[Escalated from private session with ${counselorName}]\n\nI was discussing with ${counselorName}: "${topic}"\n\n${counselorName}'s perspective so far: "${counselorLastResponse}"\n\nI'd like the full Cabinet to weigh in.`
          : `[Escalated from private session with ${counselorName}]\n\nI was discussing with ${counselorName}: "${topic}"\n\nI'd like the full Cabinet to weigh in.`;

        // Show the message then auto-send after a short delay
        setInputText(handoffMessage);
        setTimeout(() => {
          setInputText('');
          const userMessage: ThreadMessage = {
            role: 'user',
            content: handoffMessage,
            timestamp: Date.now(),
          };
          setMessages(prev => {
            const updated = [...prev, userMessage];
            setIsLoading(true);
            appendMessages('cabinet', [userMessage]);
            sendMessageToCabinet(updated).then(reply => {
              const assistantMessage: ThreadMessage = {
                role: 'assistant',
                content: reply,
                timestamp: Date.now(),
              };
              setMessages(u => [...u, assistantMessage]);
              setIsLoading(false);
              appendMessages('cabinet', [assistantMessage]);
            });
            return updated;
          });
        }, 600);
      } catch (e) {
        console.warn('Failed to parse cabinetContext:', e);
      }
    }
  }, [params.cabinetContext, router]);

  // Consume morningMessage param — renders the Cabinet's morning response as an assistant bubble
  // without re-sending to the API. Waits for initialLoading to finish so it appends after
  // existing history, not before.
  useEffect(() => {
    if (initialLoading) return;
    const mm = params.morningMessage;
    if (mm && !consumedMorningMessageRef.current) {
      consumedMorningMessageRef.current = true;
      setActiveTab('cabinet');
      router.setParams({ morningMessage: undefined });
      const assistantMessage: ThreadMessage = {
        role: 'assistant',
        content: String(mm),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      appendMessages('cabinet', [assistantMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [params.morningMessage, initialLoading, router]);

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

    try {
      const reply = await sendMessageToCabinet(updatedMessages);
      const assistantMessage: ThreadMessage = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await appendMessages('cabinet', [userMessage, assistantMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages(prev => prev.slice(0, -1));
      if (e instanceof MessageLimitError) {
        router.push('/paywall' as any);
      }
    } finally {
      setIsLoading(false);
    }
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
    <View style={[styles.container, { paddingTop: insets.top }]} {...swipeHandlers}>
      {/* Initial loading state — prevents blank screen on first mount */}
      {initialLoading ? (
        <View style={styles.centeredFill}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : error ? (
        <View style={styles.centeredFill}>
          <Ionicons name="alert-circle-outline" size={48} color="#c9a84c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadInitialThread}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>The Cabinet</Text>
          <Text style={styles.subtitle}>Your Council of Invisible Counselors</Text>
        </View>
        {activeTab === 'cabinet' && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.newSessionButton}
              onPress={() => {
                setShowSearch(prev => !prev);
                if (showSearch) setSearchQuery('');
              }}
            >
              <Ionicons
                name={showSearch ? 'close-outline' : 'search-outline'}
                size={20}
                color="#c9a84c"
              />
            </TouchableOpacity>
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
          </View>
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

      {/* Search Bar */}
      {activeTab === 'cabinet' && showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      )}

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
                {knowThyselfIncomplete && (
                  <TouchableOpacity
                    style={styles.ktEmptyBanner}
                    onPress={() => router.push('/know-thyself' as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ktEmptyBannerText}>
                      {"📖 Your counselors don't know you yet — complete your Know Thyself profile for more personal responses."}
                    </Text>
                    <Text style={styles.ktEmptyBannerLink}>Complete Now →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {knowThyselfIncomplete && !dismissedKtNudge && (
                  <View style={styles.ktNudgeBanner}>
                    <TouchableOpacity
                      style={styles.ktNudgeContent}
                      onPress={() => router.push('/know-thyself' as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.ktNudgeText}>
                        {'💡 Tip: Complete your Know Thyself profile so the Cabinet can give you more personal responses. →'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDismissedKtNudge(true)} style={styles.ktNudgeDismiss}>
                      <Ionicons name="close" size={16} color="#888" />
                    </TouchableOpacity>
                  </View>
                )}
                {(() => {
                  const filteredMessages = searchQuery.length > 0
                    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                    : messages;
                  return (
                    <>
                      {searchQuery.length > 0 && (
                        <Text style={styles.searchResultCount}>
                          {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} for &lsquo;{searchQuery}&rsquo;
                        </Text>
                      )}
                      {filteredMessages.map((msg, index) =>
                        msg.role === 'user' ? (
                          <View key={index} style={styles.userMessageRow}>
                            <View style={styles.userBubble}>
                              <Text style={styles.userText} selectable>{msg.content}</Text>
                            </View>
                          </View>
                        ) : (
                          <View key={index} style={styles.cabinetMessageRow}>
                            <View style={styles.cabinetBubble}>
                              <Text style={styles.cabinetLabel}>The Cabinet</Text>
                              <Text style={styles.cabinetText} selectable>{msg.content}</Text>
                            </View>
                          </View>
                        )
                      )}
                    </>
                  );
                })()}
              </>
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
          {/* Customize Cabinet button */}
          <TouchableOpacity
            style={styles.customizeCabinetButton}
            onPress={() => router.push('/my-cabinet' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.customizeCabinetText}>✦ Customize Cabinet</Text>
          </TouchableOpacity>

          {cabinetCounselors.map((counselor) => {
            const summary = threadSummaries.find((s) => s.id === normalizeCounselorId(counselor.slug));
            const hasMessages = summary && summary.messageCount > 0;
            return (
              <TouchableOpacity
                key={counselor.slug}
                style={styles.counselorCard}
                onPress={() => router.push({ pathname: '/counselor-chat', params: { id: counselor.slug, name: counselor.name, role: counselor.one_line } })}
              >
                <View style={styles.counselorCardIcon}>
                  <Text style={styles.counselorInitials}>{getInitials(counselor.name)}</Text>
                </View>
                <View style={styles.counselorCardInfo}>
                  <Text style={styles.counselorCardName}>{counselor.name}</Text>
                  <Text style={styles.counselorCardRole}>{counselor.category ?? 'Counselor'}</Text>
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

        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#1a1a2e',
  },
  errorText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#c9a84c22',
    borderWidth: 1,
    borderColor: '#c9a84c88',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryButtonText: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
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
    flexDirection: 'row',
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
  customizeCabinetButton: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c9a84c44',
    alignItems: 'center',
  },
  customizeCabinetText: {
    color: '#c9a84c',
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c33',
  },
  counselorInitials: {
    color: '#c9a84c',
    fontSize: 16,
    fontWeight: 'bold',
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
  sendToBeliefButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, alignSelf: 'flex-start',
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: '#c9a84c11', borderRadius: 8,
    borderWidth: 1, borderColor: '#c9a84c33',
  },
  sendToBeliefText: {
    color: '#c9a84c', fontSize: 12, fontWeight: '600',
  },
  beliefSeedModal: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000bb', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  beliefSeedCard: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 20,
    width: '100%', borderWidth: 1, borderColor: '#c9a84c44',
  },
  beliefSeedTitle: {
    color: '#c9a84c', fontSize: 16, fontWeight: '700', marginBottom: 8,
  },
  beliefSeedSubtitle: {
    color: '#888', fontSize: 13, marginBottom: 14, lineHeight: 20,
  },
  beliefSeedInput: {
    backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#c9a84c33', marginBottom: 16,
  },
  beliefSeedButtons: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10,
  },
  // Header buttons row
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 0,
  },
  searchResultCount: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  // Know Thyself banners
  ktEmptyBanner: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    width: '100%',
  },
  ktEmptyBannerText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  ktEmptyBannerLink: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: '600',
  },
  ktNudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    marginBottom: 14,
    overflow: 'hidden',
  },
  ktNudgeContent: {
    flex: 1,
    padding: 12,
  },
  ktNudgeText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
  },
  ktNudgeDismiss: {
    padding: 12,
  },
});
