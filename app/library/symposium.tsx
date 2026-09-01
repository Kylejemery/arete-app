import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { API_BASE_URL } from '../../services/claudeService';

/**
 * The Symposium — sit with a master and converse with the corpus. The mobile
 * face of the web Library's Symposium "sit" mode: POST /oracle with the
 * chosen master's author filter and recent history; answers come grounded in
 * corpus passages, with the top source offered as a jump into the reader.
 * Public endpoint, IP rate-limited server-side (15/day).
 */

interface Master {
    id: string;
    name: string;
    voice: string;
    initial: string;
    oracleAuthor: string | null;
    greeting: string;
}

const MASTERS: Master[] = [
    { id: 'corpus', name: 'The Corpus', voice: 'Many minds, one counsel', initial: '✶', oracleAuthor: null,
        greeting: 'You stand inside the whole tradition at once. Ask, and many voices will answer as one.' },
    { id: 'socrates', name: 'Socrates', voice: 'Asks until you know', initial: 'Σ', oracleAuthor: null,
        greeting: 'I know nothing worth teaching, but I am very good at questions. Shall we find out together what you actually believe?' },
    { id: 'zeno', name: 'Zeno of Citium', voice: 'Founder of the Porch', initial: 'Z', oracleAuthor: null,
        greeting: 'I lost everything in a shipwreck and called it the most prosperous voyage I ever made. Tell me: what do you think you have lost?' },
    { id: 'epictetus', name: 'Epictetus', voice: 'Unsparing, exact', initial: 'E', oracleAuthor: 'Epictetus',
        greeting: 'Begin here: in this trouble of yours, what is actually yours to command? Name it plainly and we will start.' },
    { id: 'marcus', name: 'Marcus Aurelius', voice: 'Calm, reflective', initial: 'M', oracleAuthor: 'Marcus Aurelius',
        greeting: 'I keep this journal to steady myself, not to instruct anyone. But sit; let us try to see the thing clearly together.' },
    { id: 'seneca', name: 'Seneca', voice: 'Warm, worldly', initial: 'S', oracleAuthor: 'Seneca',
        greeting: 'Speak as you would to a friend who has time for you. What weighs on you tonight?' },
    { id: 'montaigne', name: 'Michel de Montaigne', voice: 'Curious, candid', initial: 'M', oracleAuthor: 'Michel de Montaigne',
        greeting: 'I have spent a lifetime studying the one subject I can observe up close, myself, and I am still routinely surprised. Come, let us examine yours.' },
];

interface SymMessage {
    role: 'user' | 'master';
    text: string;
    rec?: { author: string; work: string; title: string } | null;
}

export default function SymposiumScreen() {
    const router = useRouter();
    const [masterId, setMasterId] = useState('corpus');
    const [messages, setMessages] = useState<SymMessage[]>([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    const master = MASTERS.find(m => m.id === masterId) || MASTERS[0];

    const pickMaster = (id: string) => {
        if (id === masterId) return;
        setMasterId(id);
        setMessages([]);
    };

    const send = async () => {
        const q = input.trim();
        if (!q || thinking) return;
        const history = messages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
        }));
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setInput('');
        setThinking(true);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        try {
            const res = await fetch(`${API_BASE_URL}/oracle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q, author: master.oracleAuthor, history }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 429) {
                setRemaining(0);
                setMessages(prev => [...prev, {
                    role: 'master',
                    text: data?.message || 'You have reached the free dialogues for today. Return tomorrow.',
                }]);
                return;
            }
            if (typeof data?.remaining === 'number') setRemaining(data.remaining);
            const src = (data?.sources || [])[0];
            const rec = src && src.textType !== 'paper_summary'
                ? { author: src.author, work: src.work, title: src.work }
                : null;
            setMessages(prev => [...prev, {
                role: 'master',
                text: data?.answer || 'The Oracle is silent.',
                rec,
            }]);
        } catch {
            setMessages(prev => [...prev, { role: 'master', text: 'The Oracle is unreachable. Please try again.' }]);
        } finally {
            setThinking(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const openSource = (rec: { author: string; work: string; title: string }) => {
        router.push({
            pathname: '/library/reader',
            params: { author: rec.author, work: rec.work, title: rec.title },
        } as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>The Symposium</Text>
                    <Text style={styles.headerSub}>Sit with a master of the tradition</Text>
                </View>
                {remaining !== null && (
                    <Text style={styles.remainingText}>{remaining} left today</Text>
                )}
            </View>

            {/* Master picker */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.masterRow}
                contentContainerStyle={styles.masterRowContent}
            >
                {MASTERS.map(m => (
                    <TouchableOpacity
                        key={m.id}
                        style={[styles.masterChip, m.id === masterId && styles.masterChipActive]}
                        onPress={() => pickMaster(m.id)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.masterAvatar, m.id === masterId && styles.masterAvatarActive]}>
                            <Text style={[styles.masterInitial, m.id === masterId && styles.masterInitialActive]}>
                                {m.initial}
                            </Text>
                        </View>
                        <Text style={[styles.masterName, m.id === masterId && styles.masterNameActive]} numberOfLines={1}>
                            {m.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollRef}
                    style={styles.thread}
                    contentContainerStyle={styles.threadContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Greeting bubble for the seated master */}
                    <View style={styles.masterBubbleRow}>
                        <View style={styles.masterBubble}>
                            <Text style={styles.masterLabel}>{master.name} · {master.voice}</Text>
                            <Text style={styles.masterText}>{master.greeting}</Text>
                        </View>
                    </View>

                    {messages.map((msg, i) =>
                        msg.role === 'user' ? (
                            <View key={i} style={styles.userBubbleRow}>
                                <View style={styles.userBubble}>
                                    <Text style={styles.userText} selectable>{msg.text}</Text>
                                </View>
                            </View>
                        ) : (
                            <View key={i} style={styles.masterBubbleRow}>
                                <View style={styles.masterBubble}>
                                    <Text style={styles.masterLabel}>{master.name}</Text>
                                    <Text style={styles.masterText} selectable>{msg.text}</Text>
                                    {msg.rec && (
                                        <TouchableOpacity style={styles.sourceCard} onPress={() => openSource(msg.rec!)} activeOpacity={0.8}>
                                            <Ionicons name="book-outline" size={14} color="#c9a84c" />
                                            <Text style={styles.sourceText} numberOfLines={1}>
                                                Read the source: {msg.rec.title}
                                            </Text>
                                            <Ionicons name="chevron-forward" size={13} color="#c9a84c" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )
                    )}

                    {thinking && (
                        <View style={styles.masterBubbleRow}>
                            <View style={styles.masterBubble}>
                                <View style={styles.thinkingRow}>
                                    <ActivityIndicator size="small" color="#c9a84c" />
                                    <Text style={styles.thinkingText}>{master.name} considers…</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.textInput}
                        placeholder={`Ask ${master.name}…`}
                        placeholderTextColor="#555"
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                        editable={remaining !== 0}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!input.trim() || thinking || remaining === 0) && styles.sendButtonDisabled]}
                        onPress={send}
                        disabled={!input.trim() || thinking || remaining === 0}
                    >
                        <Ionicons name="send" size={16} color={!input.trim() || thinking || remaining === 0 ? '#555' : '#1a1a2e'} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a3e',
    },
    backButton: { padding: 4 },
    headerTitle: { color: '#e0d5b5', fontSize: 18, fontWeight: '700' },
    headerSub: { color: '#888', fontSize: 12, marginTop: 1 },
    remainingText: { color: '#666', fontSize: 11 },
    masterRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
    masterRowContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    masterChip: {
        alignItems: 'center',
        width: 84,
        paddingVertical: 6,
        borderRadius: 12,
    },
    masterChipActive: { backgroundColor: '#c9a84c11' },
    masterAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#16213e',
        borderWidth: 1,
        borderColor: '#c9a84c33',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    masterAvatarActive: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
    masterInitial: { color: '#c9a84c', fontSize: 16, fontWeight: '700' },
    masterInitialActive: { color: '#1a1a2e' },
    masterName: { color: '#888', fontSize: 10, textAlign: 'center' },
    masterNameActive: { color: '#e0d5b5', fontWeight: '600' },
    thread: { flex: 1 },
    threadContent: { padding: 16, gap: 12 },
    userBubbleRow: { alignItems: 'flex-end' },
    userBubble: {
        backgroundColor: '#c9a84c',
        borderRadius: 16,
        borderBottomRightRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: '85%',
    },
    userText: { color: '#1a1a2e', fontSize: 15, lineHeight: 21 },
    masterBubbleRow: { alignItems: 'flex-start' },
    masterBubble: {
        backgroundColor: '#16213e',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#c9a84c22',
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: '90%',
    },
    masterLabel: {
        color: '#c9a84c',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    masterText: { color: '#e0d5b5', fontSize: 15, lineHeight: 22 },
    sourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#c9a84c11',
        borderWidth: 1,
        borderColor: '#c9a84c33',
    },
    sourceText: { color: '#c9a84c', fontSize: 12, fontWeight: '600', flex: 1 },
    thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    thinkingText: { color: '#888', fontSize: 13, fontStyle: 'italic' },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#2a2a3e',
        backgroundColor: '#13131f',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#16213e',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#c9a84c33',
        color: '#fff',
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxHeight: 110,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#c9a84c',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: { backgroundColor: '#2a2a3e' },
});
