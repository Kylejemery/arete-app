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
import { Ionicons } from '@expo/vector-icons';
import {
  sendOnboardingMessage,
  writeProfileToSupabase,
  type OnboardingMessage,
} from '@/lib/onboardingAgent';
import type { GeneratedProfile } from '@/types/onboarding';

const OPENING_MESSAGE =
  "Welcome to Arete. I'm here to get to know you — your story, your goals, what drives you, and what tends to get in your way. This isn't a form; it's a conversation.\n\nLet's start simply: tell me a bit about yourself. Where are you in life right now, and what brought you here?";

interface DisplayMessage {
  role: 'user' | 'guide';
  text: string;
}

export default function OnboardingAgentScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
    { role: 'guide', text: OPENING_MESSAGE },
  ]);
  const [apiMessages, setApiMessages] = useState<OnboardingMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [displayMessages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userDisplay: DisplayMessage = { role: 'user', text };
    setDisplayMessages((prev) => [...prev, userDisplay]);
    setInputText('');
    setIsLoading(true);

    const updatedApiMessages: OnboardingMessage[] = [
      ...apiMessages,
      { role: 'user', content: text },
    ];
    setApiMessages(updatedApiMessages);

    try {
      const result = await sendOnboardingMessage(updatedApiMessages);

      if (result.type === 'profile') {
        await handleProfileGenerated(result.data);
        return;
      }

      const guideDisplay: DisplayMessage = { role: 'guide', text: result.text };
      setDisplayMessages((prev) => [...prev, guideDisplay]);
      setApiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.text },
      ]);
    } catch (err) {
      console.error('[OnboardingAgent] Error:', err);
      Alert.alert(
        'Connection error',
        'Could not reach the guide. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileGenerated = async (profileData: GeneratedProfile) => {
    try {
      await writeProfileToSupabase(profileData);
      router.replace('/onboarding/confirm' as any);
    } catch (err) {
      console.error('[OnboardingAgent] Failed to write profile:', err);
      setIsLoading(false);
      Alert.alert(
        'Something went wrong',
        'We gathered your profile but could not save it. Please try again.',
        [{ text: 'Retry', onPress: () => handleProfileGenerated(profileData) }, { text: 'Cancel' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Arete</Text>
        <Text style={styles.subtitle}>Your onboarding guide</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {displayMessages.map((msg, index) =>
            msg.role === 'user' ? (
              <View key={index} style={styles.userMessageRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{msg.text}</Text>
                </View>
              </View>
            ) : (
              <View key={index} style={styles.guideMessageRow}>
                <View style={styles.guideBubble}>
                  <Text style={styles.guideLabel}>Guide</Text>
                  <Text style={styles.guideText}>{msg.text}</Text>
                </View>
              </View>
            )
          )}

          {isLoading && (
            <View style={styles.guideMessageRow}>
              <View style={styles.guideBubble}>
                <Text style={styles.guideLabel}>Guide</Text>
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#c9a84c" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Your response..."
            placeholderTextColor="#555"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#c9a84c22',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#c9a84c',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
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
  guideMessageRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guideBubble: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#c9a84c22',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    maxWidth: '85%',
    gap: 6,
  },
  guideLabel: {
    fontSize: 11,
    color: '#c9a84c',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guideText: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 23,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#16213e',
    color: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#333',
  },
});
