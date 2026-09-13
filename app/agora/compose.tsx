import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AGORA_TOPICS, deleteEssay, getAgoraViewer, getEssay, publishEditorial, saveEssay, wordCount,
    type AgoraEssay, type AgoraViewer, type EssayStatus,
} from '@/lib/agora';
import { Chip, GOLD, GoldButton, Kicker, SubmissionNotice, s as ui } from '../../components/agora/AgoraUI';

/**
 * Write an essay for the Agora, or return to one. Readers save drafts and
 * submit for review; the editor can also publish directly, under any name.
 */
export default function ComposeEssayScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const editId = params.id ? String(params.id) : null;
    const [viewer, setViewer] = useState<AgoraViewer | null>(null);
    const [existing, setExisting] = useState<AgoraEssay | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [authorName, setAuthorName] = useState('');
    const [isEditorial, setIsEditorial] = useState(true);
    const [state, setState] = useState<EssayStatus>('draft');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const v = await getAgoraViewer();
                if (cancelled) return;
                setViewer(v);
                if (!v?.canWrite) {
                    router.replace({ pathname: '/paywall', params: { src: 'agora_submit' } } as any);
                    return;
                }
                if (editId) {
                    const e = await getEssay(editId);
                    if (cancelled) return;
                    if (e) {
                        setExisting(e); setTitle(e.title); setBody(e.body); setTags(e.tags);
                        setAuthorName(e.author_name); setIsEditorial(e.is_editorial); setState(e.status);
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [editId, router]);

    const words = wordCount(body);
    const ready = title.trim().length > 0 && words > 0;
    const locked = state === 'in_review' || state === 'published';
    const editable = !locked || !!viewer?.isEditor;

    const save = async (status: 'draft' | 'in_review') => {
        if (!ready || busy) return;
        setBusy(true);
        try {
            const e = await saveEssay({ title, body, tags }, status, existing?.id);
            setExisting(e); setState(e.status);
            if (status === 'in_review') router.back();
        } catch (err) {
            Alert.alert('Not saved', err instanceof Error ? err.message : 'The essay was not saved.');
        } finally { setBusy(false); }
    };

    const publishNow = async () => {
        if (!ready || busy) return;
        setBusy(true);
        try {
            const e = await publishEditorial({ title, body, tags, authorName, isEditorial }, existing?.id);
            router.replace({ pathname: '/agora/[id]', params: { id: e.id } } as any);
        } catch (err) {
            Alert.alert('Not published', err instanceof Error ? err.message : 'The essay was not published.');
            setBusy(false);
        }
    };

    const discard = () => {
        if (!existing) { router.back(); return; }
        Alert.alert('Discard this essay?', 'It cannot be recovered.', [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Discard', style: 'destructive',
                onPress: async () => {
                    try { await deleteEssay(existing.id); router.back(); }
                    catch (err) { Alert.alert('Not discarded', err instanceof Error ? err.message : 'Could not discard.'); }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={GOLD} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>The Agora</Text>
                <View style={styles.headerBtn} />
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator color={GOLD} /></View>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.title}>{existing ? 'Your essay' : 'Write an essay'}</Text>
                        <Text style={styles.subtitle}>Say the true thing plainly. An editor reads it before it appears.</Text>

                        <SubmissionNotice
                            state={state}
                            note={state === 'returned' ? existing?.editor_note : null}
                            style={{ marginBottom: 20 }}
                        />

                        <Kicker style={{ marginBottom: 8 }}>Title</Kicker>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="On being early to everything"
                            placeholderTextColor="#555"
                            editable={editable}
                            maxLength={200}
                            style={[ui.input, { marginBottom: 20 }]}
                        />

                        <Kicker style={{ marginBottom: 8 }}>Essay</Kicker>
                        <TextInput
                            value={body}
                            onChangeText={setBody}
                            placeholder="Begin where the thought actually started."
                            placeholderTextColor="#555"
                            editable={editable}
                            multiline
                            style={[ui.input, { minHeight: 240, textAlignVertical: 'top', marginBottom: 6 }]}
                        />
                        <Text style={styles.words}>{words} words</Text>

                        <Kicker style={{ marginBottom: 10 }}>Topics</Kicker>
                        <View style={styles.chips}>
                            {AGORA_TOPICS.map(t => (
                                <Chip
                                    key={t}
                                    label={t}
                                    active={tags.includes(t)}
                                    onPress={() => editable && setTags(x => x.includes(t) ? x.filter(y => y !== t) : x.length < 6 ? [...x, t] : x)}
                                />
                            ))}
                        </View>

                        {viewer?.isEditor && (
                            <View style={styles.editorBox}>
                                <Kicker style={{ marginBottom: 10 }}>Editor</Kicker>
                                <TextInput
                                    value={authorName}
                                    onChangeText={setAuthorName}
                                    placeholder="Author name as it should appear"
                                    placeholderTextColor="#555"
                                    style={[ui.input, { marginBottom: 12 }]}
                                />
                                <View style={styles.switchRow}>
                                    <Text style={styles.switchLabel}>From the editor</Text>
                                    <Switch value={isEditorial} onValueChange={setIsEditorial} trackColor={{ true: '#c9a84c88', false: '#333' }} thumbColor={isEditorial ? GOLD : '#888'} />
                                </View>
                                <GoldButton
                                    label={state === 'published' ? 'Save changes' : 'Publish now'}
                                    onPress={publishNow}
                                    disabled={!ready || busy}
                                    style={{ marginTop: 14 }}
                                />
                            </View>
                        )}

                        {!locked && (
                            <>
                                <GoldButton label={busy ? 'Sending' : 'Submit for review'} onPress={() => save('in_review')} disabled={!ready || busy} style={{ marginTop: 8 }} />
                                <GoldButton label="Save draft" onPress={() => save('draft')} disabled={!ready || busy} secondary style={{ marginTop: 10 }} />
                            </>
                        )}
                        {locked && !viewer?.isEditor && (
                            <Text style={styles.lockedNote}>
                                {state === 'in_review'
                                    ? 'This essay is with the editor. It comes back to you if anything needs changing.'
                                    : 'This essay is live. Ask the editor for changes.'}
                            </Text>
                        )}
                        {existing && (state === 'draft' || state === 'returned' || viewer?.isEditor) && (
                            <TouchableOpacity onPress={discard} style={{ marginTop: 18, alignItems: 'center' }}>
                                <Text style={styles.discard}>Discard</Text>
                            </TouchableOpacity>
                        )}
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
    content: { padding: 25, paddingBottom: 60 },
    title: { color: GOLD, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: '#888', fontSize: 12, marginBottom: 22 },
    words: { color: '#555', fontSize: 11, textAlign: 'right', marginBottom: 20 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    editorBox: {
        borderTopWidth: 1, borderTopColor: '#c9a84c22', paddingTop: 20, marginBottom: 20,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { color: '#e0d5b5', fontSize: 14 },
    lockedNote: { color: '#888', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20, marginTop: 8 },
    discard: { color: '#888', fontSize: 13 },
});
