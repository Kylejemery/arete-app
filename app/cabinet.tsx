import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
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
import { Message, sendMessageToCabinet } from '../services/claudeService';

export default function CabinetScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    const reply = await sendMessageToCabinet(updatedMessages);

    const assistantMessage: Message = { role: 'assistant', content: reply };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);

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
          onPress: () => setMessages([]),
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
});
