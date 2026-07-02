import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
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

/**
 * The reader — one work from the Reading Room, paginated by the server
 * (/api/library/text, 30 passages per page). Public endpoint, no auth.
 */
export default function LibraryReaderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ author: string; work: string; title?: string }>();
    const [pageData, setPageData] = useState<ReaderPage | null>(null);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);

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

    const title = pageData?.title || String(params.title || work);
    const totalPages = pageData?.totalPages || 1;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                <View style={styles.backButton} />
            </View>

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
                        <Text style={styles.body}>{pageData.body}</Text>
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
    backButton: { padding: 4, width: 40 },
    headerTitle: {
        color: '#fff', fontSize: 15, fontWeight: '700',
        flex: 1, textAlign: 'center', paddingHorizontal: 8,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    loadingText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
    errorText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 24, paddingBottom: 40 },
    author: {
        color: '#c9a84c', fontSize: 12, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 10,
    },
    title: {
        color: '#fff', fontSize: 22, fontWeight: '700',
        textAlign: 'center', lineHeight: 30,
    },
    meta: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 8 },
    divider: {
        height: 1, backgroundColor: '#c9a84c33',
        marginVertical: 22, alignSelf: 'center', width: '40%',
    },
    body: { color: '#e8e8ee', fontSize: 16, lineHeight: 27 },
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
});
