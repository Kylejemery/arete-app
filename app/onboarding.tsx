import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { saveOnboardingProfile, type OnboardingProfile } from '@/lib/db';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedProfile extends OnboardingProfile {
  good_day?: string;
  daily_practice?: string;
  reading?: string;
  physical_practice?: string;
  dependents?: string;
  completeness_score?: number;
}

// Mirrors web/src/app/onboarding/page.tsx — same agent, same request shape,
// same save mapping. One onboarding agent, two clients.
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [futureYears, setFutureYears] = useState<number | undefined>();
  const [complete, setComplete] = useState(false);
  const [profile, setProfile] = useState<ExtractedProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Kick off with the initial greeting from Future Self
  useEffect(() => {
    sendToApi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToApi(msgs: Message[]) {
    setLoading(true);
    setError('');
    try {
      // Claude requires at least one message; inject a silent opener on the
      // very first call so Future Self generates the initial greeting.
      const apiMessages = msgs.length === 0
        ? [{ role: 'user', content: 'Hello.' }]
        : msgs.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_BASE_URL}/api/onboard-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, futureYears }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      if (data.complete) {
        setProfile(data.profile as ExtractedProfile);
        if (data.futureYears) setFutureYears(data.futureYears);
        setComplete(true);
      } else {
        const assistantMsg: Message = { role: 'assistant', content: data.message ?? '' };
        setMessages(prev => [...prev, assistantMsg]);

        // Detect future years from early messages if not yet set
        if (!futureYears && data.message) {
          const match = (data.message as string).match(/\b(\d+)\s+year/i);
          if (match) setFutureYears(parseInt(match[1], 10));
        }
      }
    } catch (err) {
      console.error('[onboarding] API error:', err);
      setError('Connection issue — please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || complete) return;
    setInput('');

    const newMsg: Message = { role: 'user', content: text };
    const updated = [...messages, newMsg];
    setMessages(updated);
    await sendToApi(updated);
  }

  async function handleSave() {
    if (!profile || saving || saved) return;
    setSaving(true);
    try {
      await saveOnboardingProfile(profile);
      setSaved(true);
      setTimeout(() => router.replace('/(tabs)/' as any), 2000);
    } catch (err) {
      console.error('[onboarding] save error:', err);
      setSaving(false);
      setError('Failed to save. Please try again.');
    }
  }

  // Progress: 12 areas; based on assistant turns so far
  const assistantCount = messages.filter(m => m.role === 'assistant').length;
  const progress = complete ? 100 : Math.min(Math.round((assistantCount / 12) * 100), 95);
  const remaining = Math.max(12 - assistantCount, 0);

  const summaryRows: { label: string; value: string | undefined }[] = profile
    ? [
        { label: 'Identity', value: profile.identity },
        { label: 'Goals', value: profile.goals },
        { label: 'Primary Obstacle', value: profile.obstacle },
        { label: 'Core Strengths', value: profile.virtues },
        { label: 'Work & Meaning', value: profile.work_meaning },
        { label: 'Future Vision', value: profile.future_vision },
      ].filter(r => r.value)
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.fsBadgeLarge}>
            <Text style={styles.fsBadgeLargeText}>FS</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerKicker}>
              {futureYears ? `${futureYears} Years From Now` : 'Future Self'}
            </Text>
            <Text style={styles.headerTitle}>Know Thyself</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.replace('/(tabs)/' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="#9aa0a6" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressCaption}>
          {complete
            ? 'Profile complete'
            : remaining > 0
            ? `${progress}% · ${remaining} area${remaining !== 1 ? 's' : ''} remaining`
            : `${progress}% · almost done`}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Messages ─────────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, i) =>
            msg.role === 'assistant' ? (
              <View key={i} style={styles.assistantRow}>
                <View style={styles.fsBadgeSmall}>
                  <Text style={styles.fsBadgeSmallText}>FS</Text>
                </View>
                <View style={styles.assistantBubble}>
                  <Text style={styles.assistantText} selectable>{msg.content}</Text>
                </View>
              </View>
            ) : (
              <View key={i} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText} selectable>{msg.content}</Text>
                </View>
              </View>
            )
          )}

          {loading && (
            <View style={styles.assistantRow}>
              <View style={styles.fsBadgeSmall}>
                <Text style={styles.fsBadgeSmallText}>FS</Text>
              </View>
              <View style={styles.assistantBubble}>
                <Text style={styles.loadingText}>Reaching back through time…</Text>
              </View>
            </View>
          )}

          {!!error && (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>{error}</Text>
              {!complete && (
                <TouchableOpacity onPress={() => sendToApi(messages)}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Review & Save (complete state) ─────────────────────── */}
          {complete && profile && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryKicker}>Your Profile Summary</Text>
              {summaryRows.map(row => (
                <View key={row.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
              ))}
              {saved ? (
                <Text style={styles.savedText}>✓ Saved. Returning home…</Text>
              ) : (
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#1a1a2e" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save to Know Thyself</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Composer (hidden once complete) ─────────────────────── */}
        {!complete && (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Speak freely…"
              placeholderTextColor="#555"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              <Ionicons
                name="arrow-forward"
                size={18}
                color={!input.trim() || loading ? '#9aa0a6' : '#1a1a2e'}
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 168, 76, 0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fsBadgeLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsBadgeLargeText: {
    color: '#c9a84c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerKicker: {
    color: '#c9a84c',
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerTitle: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#c9a84c',
  },
  progressCaption: {
    color: '#9aa0a6',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 4,
  },
  messagesContent: {
    padding: 16,
    gap: 14,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fsBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fsBadgeSmallText: {
    color: '#c9a84c',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: '84%',
  },
  assistantText: {
    color: '#e6eef8',
    fontSize: 15,
    lineHeight: 23,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: '78%',
  },
  userText: {
    color: '#e6eef8',
    fontSize: 15,
    lineHeight: 23,
  },
  loadingText: {
    color: '#9aa0a6',
    fontSize: 14,
    fontStyle: 'italic',
  },
  errorBlock: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 12,
  },
  retryText: {
    color: '#c9a84c',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textDecorationLine: 'underline',
  },
  summaryCard: {
    backgroundColor: 'rgba(201, 168, 76, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.25)',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  summaryKicker: {
    color: '#c9a84c',
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#9aa0a6',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    color: '#e6eef8',
    fontSize: 14,
    lineHeight: 20,
  },
  savedText: {
    color: '#c9a84c',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#1a1a2e',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e6eef8',
    fontSize: 15,
    maxHeight: 120,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
