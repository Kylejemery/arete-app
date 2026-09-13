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
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    deleteComment, GateDeclinedError, getAgoraViewer, getEssay, inviteCounselor, listAnswerCounselors, listComments,
    paragraphs, postComment, readingMinutes, relativeTime, removeCounselorAnswer, shortDate,
    type AgoraComment, type AgoraEssay, type AgoraViewer, type AnswerCounselor,
} from '@/lib/agora';
import { Chip, Comment, CommentComposer, GOLD, GoldButton, Kicker, SubmissionNotice } from '../../components/agora/AgoraUI';

/**
 * One essay in the Agora, with its comments. Reading is free; the composer
 * locks for non-subscribers and opens the paywall. A counselor's answer
 * sits between the essay and the comments in the voice treatment.
 */
export default function EssayScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [essay, setEssay] = useState<AgoraEssay | null>(null);
    const [comments, setComments] = useState<AgoraComment[]>([]);
    const [viewer, setViewer] = useState<AgoraViewer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [roster, setRoster] = useState<AnswerCounselor[]>([]);
    const [inviteSlug, setInviteSlug] = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [declined, setDeclined] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [e, c, v] = await Promise.all([getEssay(String(id)), listComments(String(id)), getAgoraViewer()]);
                if (cancelled) return;
                if (!e) { setError('This essay is not in the Agora.'); return; }
                setEssay(e); setComments(c); setViewer(v);
                if (v?.isEditor) {
                    listAnswerCounselors()
                        .then(r => { if (!cancelled) { setRoster(r); setInviteSlug(x => x || r[0]?.slug || ''); } })
                        .catch(() => {});
                }
            } catch {
                if (!cancelled) setError('The essay could not be loaded.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    const post = async () => {
        if (!essay || !draft.trim() || busy) return;
        setBusy(true);
        try {
            const c = await postComment(essay.id, draft);
            setComments(prev => [...prev, c]);
            setDraft('');
        } catch (err) {
            Alert.alert('Not posted', err instanceof Error ? err.message : 'The comment did not post.');
        } finally { setBusy(false); }
    };

    const remove = (cid: string) => {
        Alert.alert('Remove this comment?', undefined, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteComment(cid);
                        setComments(prev => prev.filter(c => c.id !== cid));
                    } catch (err) {
                        Alert.alert('Not removed', err instanceof Error ? err.message : 'Could not remove the comment.');
                    }
                },
            },
        ]);
    };

    const unlock = () => router.push({ pathname: '/paywall', params: { src: 'agora_comment' } } as any);

    const invite = async (opts: { force?: boolean; override?: boolean } = {}) => {
        if (!essay || !inviteSlug || inviting) return;
        setInviting(true); setDeclined(null);
        try {
            const updated = await inviteCounselor(essay.id, inviteSlug, opts);
            setEssay(updated); setShowInvite(false);
        } catch (err) {
            if (err instanceof GateDeclinedError) setDeclined(err.reason);
            else Alert.alert('No answer', err instanceof Error ? err.message : 'The counselor could not be reached.');
        } finally { setInviting(false); }
    };

    const removeAnswer = () => {
        if (!essay) return;
        Alert.alert(`Remove ${essay.counselor_name}'s answer?`, undefined, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    try { setEssay(await removeCounselorAnswer(essay.id)); }
                    catch (err) { Alert.alert('Not removed', err instanceof Error ? err.message : undefined); }
                },
            },
        ]);
    };

    const own = !!essay && viewer?.userId === essay.author_id;
    const published = essay?.status === 'published';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={GOLD} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>The Agora</Text>
                {(own || viewer?.isEditor) && essay ? (
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/agora/compose', params: { id: essay.id } } as any)}
                        style={styles.headerBtn} hitSlop={8}
                    >
                        <Ionicons name="create-outline" size={22} color={GOLD} />
                    </TouchableOpacity>
                ) : <View style={styles.headerBtn} />}
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator color={GOLD} /></View>
            ) : error || !essay ? (
                <View style={styles.centered}>
                    <Ionicons name="document-text-outline" size={48} color="#c9a84c33" />
                    <Text style={styles.errorText}>{error ?? 'This essay is not in the Agora.'}</Text>
                </View>
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {!published && (
                            <SubmissionNotice
                                state={essay.status}
                                note={essay.status === 'returned' ? essay.editor_note : null}
                                style={{ marginBottom: 20 }}
                            />
                        )}

                        <Kicker dim>{essay.tags.length ? essay.tags.join(' · ') : essay.is_editorial ? 'From the editor' : 'Essay'}</Kicker>
                        <Text style={styles.title}>{essay.title}</Text>
                        <Text style={styles.byline}>
                            {essay.author_name}
                            <Text style={styles.meta}> · {shortDate(essay.published_at ?? essay.created_at)} · {readingMinutes(essay.body)} min</Text>
                        </Text>

                        <View style={{ marginBottom: 28 }}>
                            {paragraphs(essay.body).map((p, i) => <Text key={i} style={styles.para}>{p}</Text>)}
                        </View>

                        {essay.counselor_name && essay.counselor_answer ? (
                            <View style={styles.answer}>
                                <Kicker>{essay.counselor_name} was invited to answer</Kicker>
                                <Text style={styles.answerText}>{essay.counselor_answer}</Text>
                                {essay.counselor_sources && essay.counselor_sources.length > 0 ? (
                                    <Text style={styles.answerSources}>
                                        Read with: {Array.from(new Set(essay.counselor_sources.map(src => `${src.author}, ${src.title}`))).join(' · ')}
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}

                        {viewer?.isEditor && published ? (
                            <View style={styles.editorTools}>
                                <TouchableOpacity onPress={() => { setShowInvite(v => !v); setDeclined(null); }} hitSlop={6}>
                                    <Text style={styles.editorLink}>
                                        {essay.counselor_answer ? `Ask ${essay.counselor_name} again` : 'Invite a counselor to answer'}
                                    </Text>
                                </TouchableOpacity>
                                {essay.counselor_answer ? (
                                    <TouchableOpacity onPress={removeAnswer} hitSlop={6}>
                                        <Text style={[styles.editorLink, { color: '#888' }]}>Remove answer</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : null}

                        {showInvite && viewer?.isEditor ? (
                            <View style={styles.inviteBox}>
                                <Kicker style={{ marginBottom: 8 }}>Invite a counselor</Kicker>
                                <Text style={styles.inviteNote}>
                                    The essay is screened, grounded in the Library, and answered in the counselor&apos;s voice.
                                </Text>
                                <View style={styles.inviteChips}>
                                    {roster.map(c => (
                                        <Chip key={c.slug} label={c.grounded ? `${c.name} ·` : c.name} active={c.slug === inviteSlug} onPress={() => setInviteSlug(c.slug)} />
                                    ))}
                                </View>
                                {declined ? (
                                    <>
                                        <Text style={styles.declined}>The safety gate declined this essay: {declined}</Text>
                                        <GoldButton label="Invite anyway" secondary disabled={inviting} onPress={() => invite({ force: true, override: true })} />
                                    </>
                                ) : (
                                    <>
                                        <GoldButton
                                            label={inviting ? `${roster.find(c => c.slug === inviteSlug)?.name ?? 'The counselor'} is considering...` : 'Ask for an answer'}
                                            disabled={inviting || !inviteSlug}
                                            onPress={() => invite({ force: true })}
                                        />
                                    </>
                                )}
                            </View>
                        ) : null}

                        {published && (
                            <>
                                <View style={styles.rule} />
                                <Kicker style={{ marginBottom: 16 }}>
                                    {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
                                </Kicker>
                                <View style={{ gap: 20, marginBottom: 22 }}>
                                    {comments.length === 0 && <Text style={styles.empty}>No one has answered yet.</Text>}
                                    {comments.map(c => (
                                        <Comment
                                            key={c.id}
                                            author={c.author_name}
                                            time={relativeTime(c.created_at)}
                                            counselor={c.is_counselor}
                                            body={c.body}
                                            onRemove={c.user_id === viewer?.userId || viewer?.isEditor ? () => remove(c.id) : undefined}
                                        />
                                    ))}
                                </View>
                                <CommentComposer
                                    locked={!viewer?.canWrite}
                                    onUnlock={unlock}
                                    value={draft}
                                    onChange={setDraft}
                                    onSubmit={post}
                                    busy={busy}
                                />
                            </>
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
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    errorText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 25, paddingBottom: 60 },
    title: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 32, marginTop: 8, marginBottom: 6 },
    byline: { color: GOLD, fontSize: 13, fontWeight: '600', marginBottom: 22 },
    meta: { color: '#888', fontWeight: '400' },
    para: { color: '#e0e0e0', fontSize: 16, lineHeight: 26, marginBottom: 18 },
    answer: {
        backgroundColor: '#16213e', borderWidth: 1, borderColor: '#c9a84c22', borderLeftWidth: 3, borderLeftColor: GOLD,
        borderRadius: 12, padding: 18, marginBottom: 28,
    },
    answerText: { color: '#e8e0d0', fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginTop: 8 },
    answerSources: { color: '#888', fontSize: 11, lineHeight: 16, marginTop: 12 },
    editorTools: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginBottom: 20 },
    editorLink: { color: GOLD, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
    inviteBox: {
        backgroundColor: '#16213e', borderWidth: 1, borderColor: '#c9a84c22', borderRadius: 12,
        padding: 16, marginBottom: 24, gap: 10,
    },
    inviteNote: { color: '#888', fontSize: 12, lineHeight: 17 },
    inviteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
    declined: { color: '#ccc', fontSize: 13, lineHeight: 20 },
    rule: { height: 1, backgroundColor: '#c9a84c22', marginBottom: 20 },
    empty: { color: '#888', fontSize: 14, fontStyle: 'italic' },
});
