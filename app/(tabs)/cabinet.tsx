import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import { sendMessageToCabinet, CabinetReply, MessageLimitError, DailyLimitError, API_BASE_URL } from '../../services/claudeService';
import { getUserSettings, getUserCabinet, saveCabinetSelection, getOrCreateCabinetConversationId } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { Counselor } from '@/lib/types';
import { useTierLimits } from '../../hooks/useTierLimits';
import {
  ThreadMessage,
  appendMessages,
  clearThread,
  getAllThreadSummaries,
  loadThread,
  normalizeCounselorId,
} from '../../services/threadService';

function getTodayDateKey(): string {
  const d = new Date();
  return `daily_messages_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function repliesToMessages(replies: CabinetReply[]): ThreadMessage[] {
  return replies.map((r) => ({
    role: 'assistant' as const,
    content: r.text,
    timestamp: Date.now(),
    counselorId: r.counselorId ?? undefined,
    counselorName: r.counselorName ?? undefined,
  }));
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Shared-thread message: adds 'system' for join/leave notices and a sender
// label for user bubbles. System rows never go to the model.
type SharedMsg = Omit<ThreadMessage, 'role'> & {
  role: 'user' | 'assistant' | 'system';
  senderName?: string;
};

export default function CabinetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const swipeHandlers = useSwipeNavigation('/cabinet');
  const [activeTab, setActiveTab] = useState<'cabinet' | 'shared' | 'counselors'>('cabinet');
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

  // --- Shared session state (Arete for Couples) ---
  // The shared conversation lives in its own tab, backed by session_messages
  // (the server mirrors every shared turn there), so both partners see the
  // same history and the solo Cabinet thread stays private.
  const [sessionType, setSessionType] = useState<'solo' | 'shared'>('solo');
  const [sessionPartners, setSessionPartners] = useState<{ userId: string; displayName: string }[]>([]);
  const [sharedMessages, setSharedMessages] = useState<SharedMsg[]>([]);
  const [sharedInput, setSharedInput] = useState('');
  const [sharedLoading, setSharedLoading] = useState(false);
  const sharedScrollRef = useRef<ScrollView>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const consumedSharedSessionRef = useRef(false);

  // --- Know Thyself nudge state ---
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [dismissedKtNudge, setDismissedKtNudge] = useState(false);

  // --- Counselors Tab State ---
  const [cabinetCounselors, setCabinetCounselors] = useState<Counselor[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<
    { id: string; messageCount: number; lastUpdated: number }[]
  >([]);

  const { tier, maxMessages } = useTierLimits();
  const [messageCount, setMessageCount] = useState(0);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [userSettings, setUserSettings] = useState<{ user_name?: string; future_self_years?: number } | null>(null);

  // --- beliefContext deep-link param ---
  const params = useLocalSearchParams<{ beliefContext?: string; cabinetContext?: string; morningMessage?: string; sharedSessionId?: string; sharedPartnerName?: string }>();
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

  // On mount: load thread, counselors, and seed defaults for existing users with empty cabinet
  useEffect(() => {
    loadInitialThread();
    loadCounselorsData();
    getUserSettings().then(s => setUserSettings(s)).catch(() => {});
    (async () => {
      const seeded = await AsyncStorage.getItem('cabinet_defaults_seeded');
      if (!seeded) {
        const settings = await getUserSettings();
        if (!settings?.cabinet_members || settings.cabinet_members.length === 0) {
          await saveCabinetSelection(['marcus', 'roosevelt']);
        }
        await AsyncStorage.setItem('cabinet_defaults_seeded', 'true');
      }
    })();
  }, []);

  // Resolve the current user id and the group-cabinet conversation row id.
  // The conversation id doubles as the shared-session id when inviting.
  // Then restore shared mode: sessionType only lived in component state, so a
  // restart silently dropped both sides of a shared session back to solo.
  useEffect(() => {
    (async () => {
      let userId: string | null = null;
      try {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
        setCurrentUserId(userId);
      } catch { /* unauthenticated — leave null */ }
      let ownConversationId: string | null = null;
      try {
        ownConversationId = await getOrCreateCabinetConversationId();
        setCurrentSessionId(ownConversationId);
      } catch (err) {
        console.warn('[Cabinet] Failed to resolve session id:', err);
      }
      if (!userId) return;
      try {
        // Inviter side: an active participant row on my own conversation
        // (someone accepted my invite). Partner side: my own active row on
        // someone else's conversation (I accepted theirs).
        if (ownConversationId) {
          const { data: partnerRows } = await supabase
            .from('session_participants')
            .select('user_id, display_name')
            .eq('session_id', ownConversationId)
            .eq('status', 'active')
            .neq('user_id', userId);
          if (partnerRows && partnerRows.length > 0) {
            setSessionType('shared');
            setSessionPartners(partnerRows.map(r => ({
              userId: r.user_id as string,
              displayName: (r.display_name as string) || 'Partner',
            })));
            return;
          }
        }
        const { data: myRows } = await supabase
          .from('session_participants')
          .select('session_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1);
        if (myRows && myRows.length > 0 && myRows[0].session_id !== ownConversationId) {
          setCurrentSessionId(myRows[0].session_id as string);
          setSessionType('shared');
          setSessionPartners([{ userId: 'partner', displayName: 'Partner' }]);
        }
      } catch (err) {
        console.warn('[Cabinet] Failed to restore shared session:', err);
      }
    })();
  }, []);

  // Consume the sharedSessionId param handed back by the join-session screen
  // after a partner accepts an invite — flips this device into shared mode.
  useEffect(() => {
    const sid = params.sharedSessionId;
    if (sid && !consumedSharedSessionRef.current) {
      consumedSharedSessionRef.current = true;
      setActiveTab('shared');
      setSessionType('shared');
      setCurrentSessionId(String(sid));
      setSessionPartners([{ userId: 'partner', displayName: params.sharedPartnerName ? String(params.sharedPartnerName) : 'Partner' }]);
      router.setParams({ sharedSessionId: undefined, sharedPartnerName: undefined });
    }
  }, [params.sharedSessionId, params.sharedPartnerName, router]);

  // Resolves a sender's display name for shared-tab labels.
  const senderNameFor = useCallback((senderId: string | null) => {
    if (!senderId) return undefined;
    if (senderId === currentUserId) return userSettings?.user_name || 'You';
    const partner = sessionPartners.find(p => p.userId === senderId);
    return partner?.displayName || 'Partner';
  }, [currentUserId, userSettings?.user_name, sessionPartners]);

  // Load the shared conversation history from session_messages. Both sides
  // read the same rows (RLS: participants + conversation owner), so the
  // shared tab shows one canonical thread on every device.
  useEffect(() => {
    if (sessionType !== 'shared' || !currentSessionId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('session_messages')
          .select('user_id, role, content, counselor_id, counselor_name, created_at')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true });
        if (data) {
          setSharedMessages(data.map(row => ({
            role: row.role as 'user' | 'assistant' | 'system',
            content: row.content as string,
            timestamp: new Date(row.created_at as string).getTime(),
            counselorId: (row.counselor_id as string) ?? undefined,
            counselorName: (row.counselor_name as string) ?? undefined,
            senderName: row.role === 'user' ? senderNameFor(row.user_id as string | null) : undefined,
          })));
        }
      } catch (err) {
        console.warn('[Cabinet] Failed to load shared history:', err);
      }
    })();
    // senderNameFor changes when partners resolve; reload then to fix labels.
  }, [sessionType, currentSessionId, senderNameFor]);

  // Realtime sync for shared sessions. The server mirrors each shared turn
  // (user prompt + counselor replies) into session_messages; rows tagged with
  // our own user_id are skipped because they're already shown optimistically.
  useEffect(() => {
    if (sessionType !== 'shared' || !currentSessionId) return;

    const channel = supabase
      .channel(`cabinet-session-${currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${currentSessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id: string | null;
            role: 'user' | 'assistant' | 'system';
            content: string;
            counselor_id: string | null;
            counselor_name: string | null;
            created_at: string;
          };
          // Skip our own messages — they're already in state optimistically.
          if (row.user_id && row.user_id === currentUserId) return;
          setSharedMessages(prev => [
            ...prev,
            {
              role: row.role,
              content: row.content,
              timestamp: new Date(row.created_at).getTime(),
              counselorId: row.counselor_id ?? undefined,
              counselorName: row.counselor_name ?? undefined,
              senderName: row.role === 'user' ? senderNameFor(row.user_id) : undefined,
            },
          ]);
          setTimeout(() => sharedScrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionType, currentSessionId, currentUserId, senderNameFor]);

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
          setUserSettings(settings);
          setKnowThyselfIncomplete(!settings?.kt_goals || settings.kt_goals.trim().length === 0);
        } catch (err) {
          console.warn('[Cabinet] Failed to load KT settings:', err);
        }
        const stored = await AsyncStorage.getItem(getTodayDateKey());
        setMessageCount(stored !== null ? parseInt(stored, 10) : 0);
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
            sendMessageToCabinet(updated).then(replies => {
              const assistantMessages = repliesToMessages(replies);
              setMessages(u => [...u, ...assistantMessages]);
              setIsLoading(false);
              appendMessages('cabinet', assistantMessages);
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

    // Enforce daily message limit before sending
    const dateKey = getTodayDateKey();
    const stored = await AsyncStorage.getItem(dateKey);
    const count = stored !== null ? parseInt(stored, 10) : 0;
    console.log('[MessageLimit] count:', count, 'max:', maxMessages);
    if (maxMessages !== null && count >= maxMessages) {
      router.push('/paywall' as any);
      return;
    }

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
      // The Cabinet tab is always the private solo thread; the shared
      // conversation lives in the Shared tab with its own send path.
      const replies = await sendMessageToCabinet(updatedMessages);
      const assistantMessages = repliesToMessages(replies);
      const finalMessages = [...updatedMessages, ...assistantMessages];
      setMessages(finalMessages);
      const newCount = count + 1;
      await AsyncStorage.setItem(dateKey, String(newCount));
      setMessageCount(newCount);
      await appendMessages('cabinet', [userMessage, ...assistantMessages]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages(prev => prev.slice(0, -1));
      if (e instanceof DailyLimitError) {
        setDailyLimitReached(true);
      } else if (e instanceof MessageLimitError) {
        router.push('/paywall' as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Send into the shared session: optimistic append locally, the server
  // mirrors the turn into session_messages for the partner's realtime feed.
  const handleSendShared = async () => {
    const text = sharedInput.trim();
    if (!text || sharedLoading) return;

    const dateKey = getTodayDateKey();
    const stored = await AsyncStorage.getItem(dateKey);
    const count = stored !== null ? parseInt(stored, 10) : 0;
    if (maxMessages !== null && count >= maxMessages) {
      router.push('/paywall' as any);
      return;
    }

    const userMessage: SharedMsg = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      senderName: userSettings?.user_name || 'You',
    };
    const updatedShared = [...sharedMessages, userMessage];
    setSharedMessages(updatedShared);
    setSharedInput('');
    setSharedLoading(true);
    setTimeout(() => sharedScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // System notices (joined/left) stay out of the model's context.
      const replies = await sendMessageToCabinet(updatedShared.filter(m => m.role !== 'system') as ThreadMessage[], {
        sessionType: 'shared',
        sessionId: currentSessionId ?? undefined,
        partnerIds: sessionPartners.map(p => p.userId),
      });
      const assistantMessages = repliesToMessages(replies);
      setSharedMessages(prev => [...prev, ...assistantMessages]);
      const newCount = count + 1;
      await AsyncStorage.setItem(dateKey, String(newCount));
      setMessageCount(newCount);
      setTimeout(() => sharedScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setSharedMessages(prev => prev.slice(0, -1));
      if (e instanceof DailyLimitError) {
        setDailyLimitReached(true);
      } else if (e instanceof MessageLimitError) {
        router.push('/paywall' as any);
      }
    } finally {
      setSharedLoading(false);
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

  const handleSendInvite = async () => {
    const contact = inviteEmail.trim();
    if (!contact || inviteLoading) return;
    if (!currentSessionId || !currentUserId) {
      setInviteError("Your session isn't ready yet. Try again in a moment.");
      return;
    }

    // Email invites are sent server-side via Resend. Phone invites open the
    // inviter's own Messages composer with the join link, so no SMS provider
    // is needed and the text comes from a number the partner recognizes.
    const phoneCandidate = contact.replace(/[\s().-]/g, '');
    const isPhone = /^\+?\d{7,15}$/.test(phoneCandidate);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    if (!isPhone && !isEmail) {
      setInviteError('Enter a valid email address or phone number.');
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    try {
      // Backend derives the inviter from this Bearer token (JWT), not the body.
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/sessions/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          ...(isEmail ? { partnerEmail: contact } : { partnerPhone: phoneCandidate }),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        setSessionType('shared');
        setSessionPartners([{ userId: 'pending', displayName: contact }]);
        setShowInviteModal(false);
        setInviteEmail('');
        setActiveTab('shared');
        if (isPhone && data?.smsBody) {
          // iOS wants '&' before the body param in sms: URLs; Android wants '?'.
          const sep = Platform.OS === 'ios' ? '&' : '?';
          Linking.openURL(`sms:${phoneCandidate}${sep}body=${encodeURIComponent(data.smsBody)}`).catch(() => {
            Alert.alert(
              'Invite created',
              `Could not open Messages automatically. Share this link with your partner to let them join:\n\n${data.joinUrl || ''}`
            );
          });
        }
      } else {
        setInviteError(data?.error || 'Could not send the invite. Please try again.');
      }
    } catch (err) {
      console.error('Invite error:', err);
      setInviteError('Could not reach the server. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEndSharedSession = () => {
    // Delete the participant rows server-side too — shared mode is restored
    // from session_participants on mount, so local state alone would
    // resurrect the session on next launch. RLS allows either side to
    // delete ("Participants can leave sessions"). Best-effort.
    const sid = currentSessionId;
    if (sid) {
      // Leave notice first (while still a participant, so RLS allows the
      // insert), then remove the participant rows. Both best-effort.
      const leaveNotice = `${userSettings?.user_name || 'Your partner'} left the session`;
      supabase
        .from('session_messages')
        .insert({ session_id: sid, user_id: currentUserId, role: 'system', content: leaveNotice })
        .then(() => {
          supabase
            .from('session_participants')
            .delete()
            .eq('session_id', sid)
            .then(({ error }) => {
              if (error) console.warn('[Cabinet] Failed to end shared session:', error.message);
            });
        });
    }
    setSessionType('solo');
    setSessionPartners([]);
    setSharedMessages([]);
    setActiveTab('cabinet');
  };

  const futureName = userSettings?.user_name
    ? `Future ${userSettings.user_name}${userSettings.future_self_years ? ` (in ${userSettings.future_self_years} years)` : ''}`
    : 'Future Self';

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
          {cabinetCounselors.length > 0 && (
            <Text style={styles.memberNames} numberOfLines={1}>
              {[...cabinetCounselors.map(c => c.name), futureName].join(' · ')}
            </Text>
          )}
          {sessionType === 'shared' && (
            <>
              <Text style={styles.sharedSessionLabel} numberOfLines={1}>
                {`👥 Shared Session · ${[userSettings?.user_name || 'You', ...sessionPartners.map(p => p.displayName)].join(' & ')}`}
              </Text>
              {sessionPartners.some(p => p.userId !== 'pending') && (
                <Text style={styles.partnerPresence} numberOfLines={1}>
                  <Text style={styles.presenceDot}>● </Text>Partner connected
                </Text>
              )}
            </>
          )}
        </View>
        {activeTab === 'shared' && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.newSessionButton}
              onPress={handleEndSharedSession}
            >
              <Ionicons name="exit-outline" size={20} color="#c9a84c" />
            </TouchableOpacity>
          </View>
        )}
        {activeTab === 'cabinet' && (
          <View style={styles.headerButtons}>
            {sessionType === 'solo' && (
              <TouchableOpacity
                style={styles.newSessionButton}
                onPress={() => {
                  // Shared sessions are Premium: free tier routes to the paywall.
                  if (tier === 'free') {
                    router.push('/paywall' as any);
                  } else {
                    setShowInviteModal(true);
                  }
                }}
              >
                <Ionicons name="person-add-outline" size={20} color="#c9a84c" />
              </TouchableOpacity>
            )}
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
        {sessionType === 'shared' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shared' && styles.tabActive]}
            onPress={() => setActiveTab('shared')}
          >
            <Text style={[styles.tabText, activeTab === 'shared' && styles.tabTextActive]}>
              Shared
            </Text>
          </TouchableOpacity>
        )}
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
                  <Text style={styles.counselorName}>{futureName}</Text>
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
                              <Text style={styles.cabinetLabel}>{msg.counselorName || 'The Cabinet'}</Text>
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
          {dailyLimitReached ? (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#2a2a3e', backgroundColor: '#13131f' }}>
              <Text style={{ color: '#e0d5b5', fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>
                You've reached your 10 free messages for today.
              </Text>
              <Text style={{ color: '#888', textAlign: 'center', marginBottom: 12, fontSize: 13 }}>
                Upgrade to Premium for unlimited access.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#c9a84c', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => router.push('/paywall' as any)}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#1a1a2e', fontWeight: '700', fontSize: 15 }}>Upgrade to Premium →</Text>
              </TouchableOpacity>
              <Text style={{ color: '#555', textAlign: 'center', marginTop: 8, fontSize: 12 }}>Resets at midnight</Text>
            </View>
          ) : (
            <>
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
                  editable={!dailyLimitReached}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!inputText.trim() || isLoading || dailyLimitReached) && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading || dailyLimitReached}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={!inputText.trim() || isLoading || dailyLimitReached ? '#555' : '#1a1a2e'}
                  />
                </TouchableOpacity>
              </View>

              {tier === 'free' && maxMessages !== null && (
                <View style={styles.limitCounter}>
                  <Text style={styles.limitCounterText}>
                    {Math.max(0, maxMessages - messageCount)} messages remaining today
                  </Text>
                </View>
              )}
            </>
          )}
        </KeyboardAvoidingView>
      ) : activeTab === 'shared' ? (
        /* Shared Session Tab — one canonical thread both partners see */
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Members of the group */}
          <View style={styles.participantsRow}>
            {[
              { userId: currentUserId ?? 'me', displayName: userSettings?.user_name || 'You', pending: false },
              ...sessionPartners.map(p => ({ userId: p.userId, displayName: p.displayName, pending: p.userId === 'pending' })),
            ].map((member, i) => (
              <View key={`${member.userId}-${i}`} style={styles.participantChip}>
                <View style={[styles.participantAvatar, member.pending && styles.participantAvatarPending]}>
                  <Text style={styles.participantInitials}>{getInitials(member.displayName)}</Text>
                </View>
                <Text style={styles.participantName} numberOfLines={1}>
                  {member.displayName}{member.pending ? ' · invited' : ''}
                </Text>
              </View>
            ))}
          </View>

          {sessionPartners.some(p => p.userId === 'pending') && (
            <View style={styles.sharedBanner}>
              <Ionicons name="people-outline" size={16} color="#c9a84c" />
              <Text style={styles.sharedBannerText}>
                Waiting for your partner to join — they can start talking as soon as they accept.
              </Text>
            </View>
          )}

          <ScrollView
            ref={sharedScrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => sharedScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {sharedMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={56} color="#c9a84c44" />
                <Text style={styles.emptyQuote}>
                  &ldquo;This is your shared session. Your counselors will speak to both of you together.&rdquo;
                </Text>
              </View>
            ) : (
              sharedMessages.map((msg, index) =>
                msg.role === 'system' ? (
                  <View key={index} style={styles.systemNoticeRow}>
                    <Text style={styles.systemNoticeText}>{msg.content}</Text>
                  </View>
                ) : msg.role === 'user' ? (
                  <View key={index} style={styles.userMessageRow}>
                    <View style={styles.userBubble}>
                      {msg.senderName && (
                        <Text style={styles.sharedSenderLabel}>{msg.senderName}</Text>
                      )}
                      <Text style={styles.userText} selectable>{msg.content}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={index} style={styles.cabinetMessageRow}>
                    <View style={styles.cabinetBubble}>
                      <Text style={styles.cabinetLabel}>{msg.counselorName || 'The Cabinet'}</Text>
                      <Text style={styles.cabinetText} selectable>{msg.content}</Text>
                    </View>
                  </View>
                )
              )
            )}

            {sharedLoading && (
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

          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Speak to the Cabinet together..."
              placeholderTextColor="#555"
              value={sharedInput}
              onChangeText={setSharedInput}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSendShared}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!sharedInput.trim() || sharedLoading) && styles.sendButtonDisabled]}
              onPress={handleSendShared}
              disabled={!sharedInput.trim() || sharedLoading}
            >
              <Ionicons
                name="send"
                size={18}
                color={!sharedInput.trim() || sharedLoading ? '#555' : '#1a1a2e'}
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

      {/* Invite a Partner modal — scaffolding for the full invite system */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.beliefSeedModal}>
          <View style={styles.beliefSeedCard}>
            <Text style={styles.beliefSeedTitle}>Start a Shared Session</Text>
            <Text style={styles.beliefSeedSubtitle}>
              Invite someone by email or phone number to join your Cabinet session. Both of
              your Know Thyself profiles will be shared with your counselors.
            </Text>
            <TextInput
              style={styles.beliefSeedInput}
              placeholder="Email or phone number"
              placeholderTextColor="#555"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inviteError && <Text style={styles.inviteErrorText}>{inviteError}</Text>}
            <View style={styles.beliefSeedButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteError(null);
                }}
                disabled={inviteLoading}
                style={styles.inviteCancelButton}
              >
                <Text style={styles.inviteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendInvite}
                disabled={!inviteEmail.trim() || inviteLoading}
                style={[styles.inviteSendButton, (!inviteEmail.trim() || inviteLoading) && styles.inviteSendButtonDisabled]}
              >
                {inviteLoading ? (
                  <ActivityIndicator size="small" color="#1a1a2e" />
                ) : (
                  <Text style={styles.inviteSendText}>Send Invite</Text>
                )}
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
  memberNames: {
    fontSize: 11,
    color: '#c9a84c99',
    marginTop: 4,
    fontVariant: ['small-caps'],
    letterSpacing: 0.5,
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
  limitCounter: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#c9a84c11',
  },
  limitCounterText: {
    color: '#888',
    fontSize: 12,
  },
  // Shared session (Arete for Couples)
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c9a84c11',
    borderWidth: 1,
    borderColor: '#c9a84c44',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    maxWidth: 180,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c9a84c33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarPending: {
    backgroundColor: '#88888833',
  },
  participantInitials: {
    color: '#c9a84c',
    fontSize: 10,
    fontWeight: '700',
  },
  participantName: {
    color: '#e0d5b5',
    fontSize: 12,
    fontWeight: '600',
  },
  systemNoticeRow: {
    alignItems: 'center',
    marginVertical: 6,
  },
  systemNoticeText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    backgroundColor: '#ffffff0a',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  sharedSenderLabel: {
    color: '#1a1a2e',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 3,
  },
  sharedSessionLabel: {
    fontSize: 11,
    color: '#c9a84c',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  partnerPresence: {
    fontSize: 11,
    color: '#8fb98f',
    marginTop: 2,
    fontWeight: '500',
  },
  presenceDot: {
    color: '#4caf50',
  },
  sharedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c33',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sharedBannerText: {
    flex: 1,
    color: '#e0d5b5',
    fontSize: 13,
    fontWeight: '500',
  },
  inviteCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  inviteCancelText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  inviteSendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#c9a84c',
  },
  inviteSendButtonDisabled: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#555',
  },
  inviteSendText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteErrorText: {
    color: '#e07a5f',
    fontSize: 13,
    marginBottom: 12,
  },
});
