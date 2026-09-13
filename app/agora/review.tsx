import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import {
    getAgoraViewer, listReviewQueue, paragraphs, publishEssay, readingMinutes, returnEssay, shortDate,
    type AgoraEssay,
} from '@/lib/agora';
import { GOLD, GoldButton, Kicker, s as ui } from '../../components/agora/AgoraUI';

/**
 * The editor's desk: essays waiting to be read, oldest first. Publish what
 * belongs in the Agora; return the rest with a note. Editor only.
 */
export default function ReviewQueueScreen() {
    const router = useRouter();
    const [queue, setQueue] = useState<AgoraEssay[]>([]);
    const [openId, setOpenId] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const v = await getAgoraViewer();
                if (!v?.isEditor) { router.replace('/agora' as any); return; }
                const q = await listReviewQueue();
                if (!cancelled) setQueue(q);
            } catch {
                if (!cancelled) Alert.alert('The desk could not be reached.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [router]);

    const act = async (fn: () => Promise<void>, id: string) => {
        if (busy) return;
        setBusy(true);
        try {
            await fn();
            setQueue(q => q.filter(e => e.id !== id));
            setOpenId(null); setNote('');
        } catch (err) {
            Alert.alert('That did not go through', err instanceof Error ? err.message : undefined);
        } finally { setBusy(false); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={GOLD} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>The review queue</Text>
                <View style={styles.headerBtn} />
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator color={GOLD} /></View>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.subtitle}>
                            {queue.length === 0 ? 'The desk is clear.' : queue.length === 1 ? 'One essay waiting.' : `${queue.length} essays waiting.`}
                        </Text>
                        <View style={{ gap: 12 }}>
                            {queue.map(e => {
                                const open = openId === e.id;
                                return (
                                    <View key={e.id} style={[styles.card, open && { borderColor: '#c9a84c88' }]}>
                                        <TouchableOpacity onPress={() => { setOpenId(open ? null : e.id); setNote(''); }} activeOpacity={0.85}>
                                            <Kicker style={{ marginBottom: 8 }}>
                                                Submitted {shortDate(e.submitted_at)} · {readingMinutes(e.body)} min
                                            </Kicker>
                                            <Text style={styles.cardTitle}>{e.title}</Text>
                                            <Text style={styles.cardAuthor}>
                                                {e.author_name}{e.tags.length ? <Text style={styles.cardMeta}> · {e.tags.join(' · ')}</Text> : null}
                                            </Text>
                                            {!open && e.excerpt ? <Text style={styles.cardExcerpt} numberOfLines={3}>{e.excerpt}</Text> : null}
                                        </TouchableOpacity>
                                        {open && (
                                            <>
                                                <View style={{ marginTop: 18 }}>
                                                    {paragraphs(e.body).map((p, i) => <Text key={i} style={styles.para}>{p}</Text>)}
                                                </View>
                                                <View style={styles.actions}>
                                                    <TextInput
                                                        value={note}
                                                        onChangeText={setNote}
                                                        placeholder="A note to the author, if you are returning it."
                                                        placeholderTextColor="#555"
                                                        multiline
                                                        style={[ui.input, { minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]}
                                                    />
                                                    <GoldButton label="Publish" onPress={() => act(() => publishEssay(e.id), e.id)} disabled={busy} />
                                                    <GoldButton
                                                        label="Return with note"
                                                        onPress={() => act(() => returnEssay(e.id, note), e.id)}
                                                        disabled={busy || !note.trim()}
                                                        secondary
                                                        style={{ marginTop: 10 }}
                                                    />
                                                </View>
                                            </>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
    },
    headerBtn: { padding: 4, width: 40, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 16, paddingBottom: 60 },
    subtitle: { color: '#888', fontSize: 13, fontStyle: 'italic', marginBottom: 14 },
    card: { backgroundColor: '#16213e', borderRadius: 12, borderWidth: 1, borderColor: '#c9a84c22', padding: 16 },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 4 },
    cardAuthor: { color: GOLD, fontSize: 12, fontWeight: '600' },
    cardMeta: { color: '#888', fontWeight: '400' },
    cardExcerpt: { color: '#ccc', fontSize: 14, lineHeight: 21, marginTop: 8 },
    para: { color: '#e0e0e0', fontSize: 15, lineHeight: 24, marginBottom: 16 },
    actions: { borderTopWidth: 1, borderTopColor: '#c9a84c22', paddingTop: 16 },
});
