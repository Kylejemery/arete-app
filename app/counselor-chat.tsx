import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { sendMessageToCounselor, MessageLimitError } from '../services/claudeService';
import { ThreadMessage, appendMessages, clearThread, loadThread, normalizeCounselorId } from '../services/threadService';
import { getUserSettings, getDailyQuestionCache, getSubscriptionTier, FREE_COUNSELOR_SLUGS } from '@/lib/db';
import type { SubscriptionTier } from '@/lib/types';

const COUNSELOR_META: Record<string, { name: string; role: string }> = {
  marcus: { name: 'Marcus Aurelius', role: 'Emperor & Stoic — Chair' },
  epictetus: { name: 'Epictetus', role: 'Philosopher & Former Slave' },
  goggins: { name: 'David Goggins', role: 'Navy SEAL & Endurance Athlete' },
  roosevelt: { name: 'Theodore Roosevelt', role: '26th President & Adventurer' },
  futureSelf: { name: 'Future Self', role: 'Years From Now' },
};

export default function CounselorChatScreen() {
  const { id, initialMessage, name: nameParam, role: roleParam } = useLocalSearchParams<{
    id: string;
    initialMessage?: string;
    name?: string;
    role?: string;
  }>();
  const router = useRouter();
  const counselorId = normalizeCounselorId(id || 'marcus');

  const metaEntry = COUNSELOR_META[counselorId];
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [counselorName, setCounselorName] = useState(nameParam || metaEntry?.name || counselorId);
  const [counselorRole, setCounselorRole] = useState<string | undefined>(roleParam || metaEntry?.role);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasSentInitialRef = useRef(false);
  const [limitModal, setLimitModal] = useState<{ tier: SubscriptionTier; limit: number } | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);

  useEffect(() => {
    hasSentInitialRef.current = false;
    setMessages([]);
    if (counselorId === 'futureSelf') {
      setCounselorName('Future Self');
      setCounselorRole('Years From Now');
      getUserSettings().then((settings) => {
        if (settings?.user_name) setCounselorName(`${settings.user_name}'s Future Self`);
      });
    } else {
      const meta = COUNSELOR_META[counselorId];
      setCounselorName(nameParam || meta?.name || counselorId);
      setCounselorRole(roleParam || meta?.role);
    }
    // Free tier: block access to non-free counselors
    getSubscriptionTier().then(tier => {
      if (tier === 'free' && !(FREE_COUNSELOR_SLUGS as readonly string[]).includes(counselorId)) {
        setAccessBlocked(true);
      }
    });

    loadThread(counselorId).then(async (thread) => {
      setMessages(thread.messages);
      if (initialMessage && !hasSentInitialRef.current) {
        hasSentInitialRef.current = true;
        const userMessage: ThreadMessage = { role: 'user', content: initialMessage, timestamp: Date.now() };
        const updatedMessages = [...thread.messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        // Serve from daily question cache if this is a fresh thread (first visit today)
        let reply: string;
        const cachedQuestion = thread.messages.length === 0 ? await getDailyQuestionCache() : null;
        if (cachedQuestion && cachedQuestion.counselorSlug === counselorId) {
          reply = cachedQuestion.response;
        } else {
          reply = await sendMessageToCounselor(counselorId, updatedMessages);
        }
        const assistantMessage: ThreadMessage = { role: 'assistant', content: reply, timestamp: Date.now(), counselorId };
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        setIsLoading(false);
        await appendMessages(counselorId, [userMessage, assistantMessage]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
  }, [counselorId]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/(tabs)/cabinet' as any);
      return true;
    });
    return () => sub.remove();
  }, [router]);

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
      const reply = await sendMessageToCounselor(counselorId, updatedMessages);
      const assistantMessage: ThreadMessage = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        counselorId,
      };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await appendMessages(counselorId, [userMessage, assistantMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      if (e instanceof MessageLimitError) {
        setMessages(prev => prev.slice(0, -1));
        setLimitModal({ tier: e.tier, limit: e.limit });
      } else {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    if (messages.length === 0) return;
    Alert.alert(
      'New Session',
      `Clear this conversation with ${counselorName} and start fresh?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Session',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            clearThread(counselorId);
          },
        },
      ]
    );
  };

  const handleBringToCabinet = useCallback(() => {
    // Find the last user message and last assistant message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

    if (!lastUserMsg) return;

    const counselorDisplayName = counselorName || counselorId;
    const truncatedResponse = lastAssistantMsg
      ? lastAssistantMsg.content.slice(0, 200) + (lastAssistantMsg.content.length > 200 ? '...' : '')
      : null;

    const cabinetContext = JSON.stringify({
      counselorName: counselorDisplayName,
      topic: lastUserMsg.content,
      counselorLastResponse: truncatedResponse,
    });

    router.push({
      pathname: '/(tabs)/cabinet',
      params: { cabinetContext },
    });
  }, [messages, counselorId, counselorName, router]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/cabinet' as any)}
        >
          <Ionicons name="chevron-back" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{counselorName}</Text>
          {counselorRole && <Text style={styles.subtitle}>{counselorRole}</Text>}
        </View>
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
              <Ionicons name="person-outline" size={56} color="#c9a84c44" />
              <Text style={styles.emptyQuote}>
                &ldquo;Begin your private conversation with {counselorName}.&rdquo;
              </Text>
              {counselorRole && <Text style={styles.emptyRole}>{counselorRole}</Text>}
            </View>
          ) : (
            messages.map((msg, index) =>
              msg.role === 'user' ? (
                <View key={index} style={styles.userMessageRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText} selectable>{msg.content}</Text>
                  </View>
                </View>
              ) : (
                <View key={index} style={styles.counselorMessageRow}>
                  <View style={styles.counselorBubble}>
                    <Text style={styles.counselorLabel}>{counselorName}</Text>
                    <Text style={styles.counselorText} selectable>{msg.content}</Text>
                  </View>
                </View>
              )
            )
          )}

          {isLoading && (
            <View style={styles.counselorMessageRow}>
              <View style={styles.counselorBubble}>
                <Text style={styles.counselorLabel}>{counselorName}</Text>
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#c9a84c" />
                  <Text style={styles.loadingText}>Composing a response...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {messages.length >= 2 && (
          <TouchableOpacity
            style={styles.bringToCabinetButton}
            onPress={handleBringToCabinet}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={16} color="#c9a84c" />
            <Text style={styles.bringToCabinetText}>Bring to the Cabinet →</Text>
          </TouchableOpacity>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder={`Speak to ${counselorName}...`}
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

      {/* Access blocked overlay for free tier */}
      {accessBlocked && (
        <View style={styles.accessBlockedOverlay}>
          <View style={styles.accessBlockedPanel}>
            <Text style={styles.accessBlockedTitle}>Counselor Locked</Text>
            <Text style={styles.accessBlockedBody}>
              Free members have access to Marcus Aurelius, Epictetus, and David Goggins. Upgrade to Arete to unlock all 23 counselors.
            </Text>
            <TouchableOpacity
              style={styles.accessUpgradeButton}
              onPress={() => router.replace('/(tabs)/cabinet' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.accessUpgradeButtonText}>Upgrade to Arete — $9.99/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/cabinet' as any)}
              style={styles.accessDismissButton}
            >
              <Text style={styles.accessDismissText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Message Limit Modal */}
      <Modal
        visible={!!limitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitModal(null)}
      >
        <View style={styles.limitModalOverlay}>
          <View style={styles.limitModalPanel}>
            {limitModal?.tier === 'free' ? (
              <>
                <Text style={styles.limitModalTitle}>Daily Limit Reached</Text>
                <Text style={styles.limitModalBody}>
                  Free members get {limitModal.limit} counselor messages per day. Upgrade to Arete for 50 messages daily and all 23 counselors.
                </Text>
                <TouchableOpacity
                  style={styles.limitUpgradeButton}
                  onPress={() => setLimitModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.limitUpgradeButtonText}>Upgrade to Arete — $9.99/mo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLimitModal(null)} style={styles.limitDismissButton}>
                  <Text style={styles.limitDismissText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.limitModalTitle}>Daily Limit Reached</Text>
                <Text style={styles.limitModalBody}>
                  You've used all {limitModal?.limit} messages for today. Your limit resets at midnight. See you tomorrow.
                </Text>
                <TouchableOpacity
                  style={styles.limitUpgradeButton}
                  onPress={() => setLimitModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.limitUpgradeButtonText}>Upgrade to Arete Pro — Unlimited</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLimitModal(null)} style={styles.limitDismissButton}>
                  <Text style={styles.limitDismissText}>Got it</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
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
  emptyRole: {
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
  counselorMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  counselorBubble: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#c9a84c33',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: '85%',
  },
  counselorLabel: {
    color: '#c9a84c',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  counselorText: {
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
  bringToCabinetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
  },
  bringToCabinetText: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
  },
  accessBlockedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1a1a2eee',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessBlockedPanel: {
    backgroundColor: '#16213e',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#c9a84c44',
  },
  accessBlockedTitle: {
    color: '#c9a84c',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  accessBlockedBody: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  accessUpgradeButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  accessUpgradeButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
  },
  accessDismissButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  accessDismissText: {
    color: '#888',
    fontSize: 14,
  },
  limitModalOverlay: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  limitModalPanel: {
    backgroundColor: '#16213e',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#c9a84c44',
  },
  limitModalTitle: {
    color: '#c9a84c',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  limitModalBody: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  limitUpgradeButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  limitUpgradeButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
  },
  limitDismissButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  limitDismissText: {
    color: '#888',
    fontSize: 14,
  },
});
