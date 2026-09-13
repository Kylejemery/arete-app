import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    getAgoraViewer, listMyEssays, listPublishedEssays, listReviewQueue, shortDate,
    type AgoraEssaySummary, type AgoraViewer, type EssayStatus,
} from '@/lib/agora';
import { Chip, EssayRow, GOLD, Kicker } from '../../components/agora/AgoraUI';

type Filter = 'All' | 'Answered' | 'Editor' | 'Yours';

const STATUS_LABEL: Record<EssayStatus, string> = {
    draft: 'Draft',
    in_review: 'In review',
    published: 'Published',
    returned: 'Returned with notes',
};

/**
 * The Agora feed: essays by the editor and by readers, open to argument.
 * Reached from the side menu (the tab bar is full). Reading is free; the
 * write button sends a non-subscriber to the paywall.
 */
export default function AgoraScreen() {
    const router = useRouter();
    const [essays, setEssays] = useState<AgoraEssaySummary[]>([]);
    const [mine, setMine] = useState<AgoraEssaySummary[]>([]);
    const [viewer, setViewer] = useState<AgoraViewer | null>(null);
    const [queue, setQueue] = useState(0);
    const [filter, setFilter] = useState<Filter>('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    const [list, own, v] = await Promise.all([listPublishedEssays(), listMyEssays(), getAgoraViewer()]);
                    if (cancelled) return;
                    setEssays(list); setMine(own); setViewer(v); setError(null);
                    if (v?.isEditor) {
                        const q = await listReviewQueue();
                        if (!cancelled) setQueue(q.length);
                    }
                } catch {
                    if (!cancelled) setError('The Agora could not be reached.');
                } finally {
                    if (!cancelled) setLoading(false);
                }
            })();
            return () => { cancelled = true; };
        }, []),
    );

    const list = useMemo(() => {
        const base = filter === 'Yours' ? mine
            : filter === 'Answered' ? essays.filter(e => e.counselor_name)
            : filter === 'Editor' ? essays.filter(e => e.is_editorial)
            : essays;
        const q = search.trim().toLowerCase();
        if (!q) return base;
        return base.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.author_name.toLowerCase().includes(q) ||
            (e.excerpt ?? '').toLowerCase().includes(q) ||
            e.tags.some(t => t.toLowerCase().includes(q)));
    }, [essays, mine, filter, search]);

    const write = () => {
        if (viewer?.canWrite) router.push('/agora/compose' as any);
        else router.push({ pathname: '/paywall', params: { src: 'agora_submit' } } as any);
    };

    const open = (e: AgoraEssaySummary) => {
        if (e.status === 'published') router.push({ pathname: '/agora/[id]', params: { id: e.id } } as any);
        else router.push({ pathname: '/agora/compose', params: { id: e.id } } as any);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={GOLD} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>The Agora</Text>
                <TouchableOpacity onPress={write} style={styles.headerBtn} hitSlop={8}>
                    <Ionicons name="add" size={26} color={GOLD} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator color={GOLD} /></View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#c9a84c33" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.subtitle}>Essays by readers, open to argument</Text>

                    {viewer?.isEditor && (
                        <TouchableOpacity style={styles.reviewCard} onPress={() => router.push('/agora/review' as any)} activeOpacity={0.85}>
                            <Ionicons name="reader-outline" size={18} color={GOLD} />
                            <Text style={styles.reviewText}>
                                {queue === 0 ? 'The desk is clear' : queue === 1 ? 'One essay waiting for you' : `${queue} essays waiting for you`}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color="#555" />
                        </TouchableOpacity>
                    )}

                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={16} color="#666" />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search the Agora"
                            placeholderTextColor="#555"
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                    </View>

                    <View style={styles.chips}>
                        {(['All', 'Answered', 'Editor', 'Yours'] as Filter[]).map(c => (
                            <Chip key={c} label={c} active={c === filter} onPress={() => setFilter(c)} />
                        ))}
                    </View>

                    <Kicker dim style={{ marginBottom: 10 }}>{list.length === 1 ? '1 essay' : `${list.length} essays`}</Kicker>

                    <View style={{ gap: 12 }}>
                        {list.length === 0 ? (
                            <Text style={styles.empty}>
                                {filter === 'Yours'
                                    ? 'Nothing yet. Begin where the thought actually started.'
                                    : 'Nothing in the Agora yet. Submit the first essay.'}
                            </Text>
                        ) : list.map(e => (
                            <EssayRow
                                key={e.id}
                                kicker={filter === 'Yours' ? STATUS_LABEL[e.status] : e.is_editorial ? 'From the editor' : undefined}
                                title={e.title}
                                author={e.author_name}
                                meta={shortDate(e.published_at ?? e.submitted_at ?? e.updated_at)}
                                excerpt={e.excerpt}
                                tags={e.tags}
                                comments={e.status === 'published' ? e.comment_count : undefined}
                                counselor={e.counselor_name}
                                onPress={() => open(e)}
                            />
                        ))}
                    </View>

                    <Text style={styles.footnote}>Every essay is read by an editor before it appears.</Text>
                </ScrollView>
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
    content: { padding: 16, paddingBottom: 48 },
    subtitle: { color: '#888', fontSize: 13, marginBottom: 14 },
    reviewCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#c9a84c11', borderWidth: 1, borderColor: '#c9a84c44', borderRadius: 12,
        padding: 14, marginBottom: 14,
    },
    reviewText: { flex: 1, color: '#e0d5b5', fontSize: 14, fontWeight: '600' },
    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#16213e', borderWidth: 1, borderColor: '#c9a84c33', borderRadius: 10,
        paddingHorizontal: 12, height: 42, marginBottom: 12,
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 15 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    empty: { color: '#888', fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 24, lineHeight: 21 },
    footnote: { color: '#888', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
});
