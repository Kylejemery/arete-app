import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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
import { API_BASE_URL } from '../../services/claudeService';

interface ReaderPage {
    author: string;
    work: string;
    title: string;
    era: string;
    translator: string | null;
    page: number;
    totalPages: number;
    totalPassages: number;
    body: string;
}

interface OutlineSection {
    label: string;
    page: number;
}

interface SearchHit {
    author: string;
    work: string;
    title: string;
    section: string | null;
    page: number;
    snippet: string;
}

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/**
 * The reader — one work from the Reading Room, paginated by the server
 * (/api/library/text, 30 passages per page). Public endpoint, no auth.
 * Carries a linked outline (/api/library/outline: section headings mapped to
 * pages) and in-work search (/api/library/search scoped to this work).
 */
export default function LibraryReaderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ author: string; work: string; title?: string; page?: string }>();
    const [pageData, setPageData] = useState<ReaderPage | null>(null);
    // Deep links from search results land on the hit's page directly.
    const [page, setPage] = useState(() => Math.max(0, parseInt(String(params.page ?? '0'), 10) || 0));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    // Outline: fetched once, on first open.
    const [outlineVisible, setOutlineVisible] = useState(false);
    const [outline, setOutline] = useState<OutlineSection[] | null>(null);
    const [outlineLoading, setOutlineLoading] = useState(false);

    // In-work search.
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const author = String(params.author || '');
    const work = String(params.work || '');

    useEffect(() => {
        if (!author || !work) {
            setError('This text could not be found.');
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const url = `${API_BASE_URL}/api/library/text?author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}&page=${page}`;
                const res = await fetch(url);
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (!res.ok) {
                    setError(data?.error || 'The text could not be opened.');
                    return;
                }
                setError(null);
                setPageData(data);
                scrollRef.current?.scrollTo({ y: 0, animated: false });
            } catch {
                if (!cancelled) setError('The text could not be opened.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [author, work, page]);

    const openOutline = async () => {
        setOutlineVisible(true);
        if (outline || outlineLoading) return;
        setOutlineLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/library/outline?author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}`);
            const data = await res.json().catch(() => ({}));
            setOutline(Array.isArray(data?.sections) ? data.sections : []);
        } catch {
            setOutline([]);
        } finally {
            setOutlineLoading(false);
        }
    };

    const runSearch = async () => {
        const q = searchQuery.trim();
        if (q.length < 3 || searchLoading) return;
        setSearchLoading(true);
        setSearchHits(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/library/search?q=${encodeURIComponent(q)}&author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}`);
            const data = await res.json().catch(() => ({}));
            setSearchHits(Array.isArray(data?.results) ? data.results : []);
        } catch {
            setSearchHits([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const jumpTo = (target: number) => {
        setOutlineVisible(false);
        setSearchVisible(false);
        if (target !== page) setPage(target);
    };

    // The section the current page falls in, for highlighting in the outline.
    const currentSectionIndex = outline
        ? outline.reduce((acc, s, i) => (s.page <= page ? i : acc), -1)
        : -1;

    const title = pageData?.title || String(params.title || work);
    const totalPages = pageData?.totalPages || 1;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                <TouchableOpacity onPress={() => { setSearchVisible(true); }} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="search-outline" size={20} color="#c9a84c" />
                </TouchableOpacity>
                <TouchableOpacity onPress={openOutline} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="list-outline" size={22} color="#c9a84c" />
                </TouchableOpacity>
            </View>

            {/* Reading progress */}
            {totalPages > 1 && (
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${((page + 1) / totalPages) * 100}%` }]} />
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color="#c9a84c" />
                    <Text style={styles.loadingText}>Pulling the text from the shelf…</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="book-outline" size={48} color="#c9a84c33" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : pageData ? (
                <>
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.author}>{pageData.author}</Text>
                        <Text style={styles.title}>{pageData.title}</Text>
                        <Text style={styles.meta}>
                            {pageData.era}
                            {pageData.translator ? `  ·  trans. ${pageData.translator}` : ''}
                        </Text>
                        <View style={styles.divider} />
                        <Text style={styles.body} selectable>{pageData.body}</Text>
                    </ScrollView>

                    {totalPages > 1 && (
                        <View style={styles.pager}>
                            <TouchableOpacity
                                style={[styles.pagerButton, page === 0 && styles.pagerButtonDisabled]}
                                disabled={page === 0}
                                onPress={() => setPage(p => Math.max(0, p - 1))}
                                hitSlop={8}
                            >
                                <Ionicons name="chevron-back" size={18} color={page === 0 ? '#555' : '#c9a84c'} />
                                <Text style={[styles.pagerText, page === 0 && styles.pagerTextDisabled]}>Prev</Text>
                            </TouchableOpacity>
                            <Text style={styles.pagerLabel}>
                                Page {page + 1} of {totalPages}
                            </Text>
                            <TouchableOpacity
                                style={[styles.pagerButton, page >= totalPages - 1 && styles.pagerButtonDisabled]}
                                disabled={page >= totalPages - 1}
                                onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                hitSlop={8}
                            >
                                <Text style={[styles.pagerText, page >= totalPages - 1 && styles.pagerTextDisabled]}>Next</Text>
                                <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? '#555' : '#c9a84c'} />
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            ) : null}

            {/* ── Outline (linked table of contents) ─────────────────── */}
            <Modal visible={outlineVisible} transparent animationType="slide" onRequestClose={() => setOutlineVisible(false)}>
                <View style={styles.sheetBackdrop}>
                    <TouchableOpacity style={styles.sheetDismiss} onPress={() => setOutlineVisible(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Contents</Text>
                        {outlineLoading ? (
                            <ActivityIndicator color="#c9a84c" style={{ marginVertical: 24 }} />
                        ) : outline && outline.length > 0 ? (
                            <FlatList
                                data={outline}
                                keyExtractor={(item, i) => `${item.label}-${i}`}
                                initialNumToRender={30}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={[styles.outlineRow, index === currentSectionIndex && styles.outlineRowActive]}
                                        onPress={() => jumpTo(item.page)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[styles.outlineLabel, index === currentSectionIndex && styles.outlineLabelActive]}
                                            numberOfLines={1}
                                        >
                                            {item.label}
                                        </Text>
                                        <Text style={styles.outlinePage}>p. {item.page + 1}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <Text style={styles.sheetEmpty}>
                                This work has no section headings — use search or the pager instead.
                            </Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── In-work search ─────────────────────────────────────── */}
            <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
                <View style={styles.sheetBackdrop}>
                    <TouchableOpacity style={styles.sheetDismiss} onPress={() => setSearchVisible(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Search this work</Text>
                        <View style={styles.searchRow}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="A phrase, a theme, a word…"
                                placeholderTextColor="#555"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={runSearch}
                                returnKeyType="search"
                                autoFocus
                            />
                            <TouchableOpacity style={styles.searchButton} onPress={runSearch} disabled={searchQuery.trim().length < 3}>
                                <Ionicons name="search" size={18} color={searchQuery.trim().length < 3 ? '#555' : '#1a1a2e'} />
                            </TouchableOpacity>
                        </View>
                        {searchLoading ? (
                            <ActivityIndicator color="#c9a84c" style={{ marginVertical: 24 }} />
                        ) : searchHits ? (
                            searchHits.length > 0 ? (
                                <FlatList
                                    data={searchHits}
                                    keyExtractor={(_, i) => String(i)}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={styles.hitRow} onPress={() => jumpTo(item.page)} activeOpacity={0.7}>
                                            <Text style={styles.hitMeta}>
                                                {item.section ? `${item.section} · ` : ''}p. {item.page + 1}
                                            </Text>
                                            <Text style={styles.hitSnippet} numberOfLines={3}>…{item.snippet}…</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            ) : (
                                <Text style={styles.sheetEmpty}>Nothing found for that in this work.</Text>
                            )
                        ) : null}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
        gap: 2,
    },
    headerButton: { padding: 4 },
    headerTitle: {
        color: '#fff', fontSize: 15, fontWeight: '700',
        flex: 1, textAlign: 'center', paddingHorizontal: 4,
    },
    progressTrack: { height: 2, backgroundColor: '#2a2a3e' },
    progressFill: { height: 2, backgroundColor: '#c9a84c' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    loadingText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
    errorText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 24, paddingBottom: 40 },
    author: {
        color: '#c9a84c', fontSize: 12, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 10,
    },
    title: {
        color: '#fff', fontSize: 24, fontWeight: '600',
        textAlign: 'center', lineHeight: 32, fontFamily: SERIF,
    },
    meta: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
    divider: {
        height: 1, backgroundColor: '#c9a84c33',
        marginVertical: 22, alignSelf: 'center', width: '40%',
    },
    body: { color: '#e8e8ee', fontSize: 17, lineHeight: 29, fontFamily: SERIF },
    pager: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: '#c9a84c22',
    },
    pagerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
    pagerButtonDisabled: { opacity: 0.6 },
    pagerText: { color: '#c9a84c', fontSize: 14, fontWeight: '600' },
    pagerTextDisabled: { color: '#555' },
    pagerLabel: { color: '#888', fontSize: 12 },
    // Bottom sheets (outline + search)
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheetDismiss: { flex: 1 },
    sheet: {
        backgroundColor: '#16213e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderColor: '#c9a84c33',
        paddingHorizontal: 18,
        paddingBottom: 28,
        maxHeight: '70%',
    },
    sheetHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#3a3a4e',
        alignSelf: 'center', marginTop: 10, marginBottom: 12,
    },
    sheetTitle: {
        color: '#c9a84c', fontSize: 12, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
    },
    sheetEmpty: { color: '#888', fontSize: 14, lineHeight: 21, paddingVertical: 16 },
    outlineRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff0a',
        gap: 12,
    },
    outlineRowActive: { backgroundColor: '#c9a84c11', marginHorizontal: -18, paddingHorizontal: 18 },
    outlineLabel: { color: '#e0d5b5', fontSize: 15, flex: 1, fontFamily: SERIF },
    outlineLabelActive: { color: '#c9a84c', fontWeight: '600' },
    outlinePage: { color: '#666', fontSize: 12 },
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    searchInput: {
        flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12,
        borderWidth: 1, borderColor: '#c9a84c33',
        color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 10,
    },
    searchButton: {
        width: 44, borderRadius: 12, backgroundColor: '#c9a84c',
        alignItems: 'center', justifyContent: 'center',
    },
    hitRow: {
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff0a',
    },
    hitMeta: { color: '#c9a84c', fontSize: 11, fontWeight: '700', marginBottom: 4 },
    hitSnippet: { color: '#bbb', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
