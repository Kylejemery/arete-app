import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { API_BASE_URL } from '../../services/claudeService';

interface LibText {
    id: string;
    author: string;
    work: string;
    title: string;
    era: string;
    textType: 'primary' | 'synthesis';
    tradition: 'stoic' | 'wider' | 'synthesis';
    passages: number;
    translator: string | null;
    excerpt: string;
}

/**
 * The Reading Room — the mobile face of the Library of Arete. Shelves come
 * from the public /api/library/texts endpoint (no auth); tapping a work opens
 * the paginated reader. Mirrors the web library's shelf grouping: the Stoics
 * first, the wider tradition beside them.
 */
export default function ReadingRoomScreen() {
    const router = useRouter();
    const [texts, setTexts] = useState<LibText[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/library/texts`);
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setError(data?.error || 'The shelves could not be reached.');
                    return;
                }
                setTexts(Array.isArray(data?.texts) ? data.texts : []);
            } catch {
                setError('The shelves could not be reached.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openText = (t: LibText) => {
        router.push({
            pathname: '/library/reader',
            params: { author: t.author, work: t.work, title: t.title },
        } as any);
    };

    // Global search across every work on the shelves.
    const [searchQuery, setSearchQuery] = useState('');
    const [searchHits, setSearchHits] = useState<
        { author: string; work: string; title: string; section: string | null; page: number; snippet: string }[] | null
    >(null);
    const [searching, setSearching] = useState(false);

    const runSearch = async () => {
        const q = searchQuery.trim();
        if (q.length < 3 || searching) return;
        setSearching(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/library/search?q=${encodeURIComponent(q)}`);
            const data = await res.json().catch(() => ({}));
            setSearchHits(Array.isArray(data?.results) ? data.results : []);
        } catch {
            setSearchHits([]);
        } finally {
            setSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchHits(null);
    };

    const byAuthor = (a: LibText, b: LibText) =>
        a.author.localeCompare(b.author) || a.title.localeCompare(b.title);
    const stoic = texts.filter(t => t.tradition === 'stoic').sort(byAuthor);
    const wider = texts.filter(t => t.tradition === 'wider').sort(byAuthor);
    const synthesis = texts.filter(t => t.tradition === 'synthesis').sort(byAuthor);

    const shelf = (label: string, items: LibText[]) =>
        items.length > 0 && (
            <View key={label}>
                <Text style={styles.shelfLabel}>{label}</Text>
                {items.map(t => (
                    <TouchableOpacity
                        key={t.id}
                        style={styles.card}
                        activeOpacity={0.85}
                        onPress={() => openText(t)}
                    >
                        <Text style={styles.cardAuthor}>{t.author}</Text>
                        <Text style={styles.cardTitle}>{t.title}</Text>
                        {!!t.excerpt && (
                            <Text style={styles.cardExcerpt} numberOfLines={2}>
                                {t.excerpt}
                            </Text>
                        )}
                        <View style={styles.cardFooter}>
                            <Text style={styles.cardMeta}>{t.era}</Text>
                            <Text style={styles.cardMeta}>{t.passages} passages</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>The Reading Room</Text>
                <View style={styles.backButton} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color="#c9a84c" />
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="library-outline" size={48} color="#c9a84c33" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={styles.intro}>
                        Every primary source, in full — the Stoics first, and the wider
                        tradition beside them.
                    </Text>

                    {/* Symposium door */}
                    <TouchableOpacity
                        style={styles.symposiumCard}
                        onPress={() => router.push('/library/symposium' as any)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.symposiumIcon}>
                            <Text style={styles.symposiumGlyph}>⟡</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.symposiumTitle}>The Symposium</Text>
                            <Text style={styles.symposiumSub}>
                                Sit with a master and put your question to the tradition.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#c9a84c" />
                    </TouchableOpacity>

                    {/* Observatory door */}
                    <TouchableOpacity
                        style={styles.symposiumCard}
                        onPress={() => router.push('/library/observatory' as any)}
                        activeOpacity={0.85}
                    >
                        <View style={styles.symposiumIcon}>
                            <Ionicons name="telescope-outline" size={20} color="#c9a84c" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.symposiumTitle}>The Observatory</Text>
                            <Text style={styles.symposiumSub}>
                                What the corpus is thinking — open questions, tensions, and where it converges.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#c9a84c" />
                    </TouchableOpacity>

                    {/* Search the shelves */}
                    <View style={styles.searchRow}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search every work on the shelves…"
                            placeholderTextColor="#555"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={runSearch}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity style={styles.searchClear} onPress={clearSearch} hitSlop={8}>
                                <Ionicons name="close-circle" size={18} color="#888" />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={runSearch}
                            disabled={searchQuery.trim().length < 3}
                        >
                            <Ionicons name="search" size={17} color={searchQuery.trim().length < 3 ? '#555' : '#1a1a2e'} />
                        </TouchableOpacity>
                    </View>

                    {searching && <ActivityIndicator color="#c9a84c" style={{ marginVertical: 16 }} />}

                    {searchHits !== null && !searching ? (
                        searchHits.length > 0 ? (
                            <View>
                                <Text style={styles.shelfLabel}>Found in the stacks</Text>
                                {searchHits.map((h, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.hitCard}
                                        activeOpacity={0.85}
                                        onPress={() => router.push({
                                            pathname: '/library/reader',
                                            params: { author: h.author, work: h.work, title: h.title, page: String(h.page) },
                                        } as any)}
                                    >
                                        <Text style={styles.hitTitle}>
                                            {h.author} · {h.title}
                                            {h.section ? ` · ${h.section}` : ''}
                                        </Text>
                                        <Text style={styles.hitSnippet} numberOfLines={3}>…{h.snippet}…</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noHits}>Nothing found for that on the shelves.</Text>
                        )
                    ) : null}

                    {shelf('The Stoic Shelf', stoic)}
                    {shelf('The Wider Tradition', wider)}
                    {shelf('Syntheses', synthesis)}
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
    backButton: { padding: 4, width: 40 },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    errorText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 16, paddingBottom: 40 },
    intro: {
        color: '#888', fontSize: 14, fontStyle: 'italic', lineHeight: 21,
        textAlign: 'center', marginBottom: 20, paddingHorizontal: 12,
    },
    shelfLabel: {
        color: '#c9a84c', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.5,
        marginTop: 10, marginBottom: 12,
    },
    card: {
        backgroundColor: '#16213e',
        borderRadius: 14,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#c9a84c22',
    },
    cardAuthor: {
        color: '#c9a84c', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
    },
    cardTitle: { color: '#fff', fontSize: 17, fontWeight: '600', lineHeight: 24, marginBottom: 8 },
    cardExcerpt: { color: '#8890a8', fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginBottom: 10 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardMeta: { color: '#555', fontSize: 11 },
    symposiumCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#c9a84c11',
        borderWidth: 1, borderColor: '#c9a84c44',
        borderRadius: 14, padding: 16, marginBottom: 16,
    },
    symposiumIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#c9a84c22',
        alignItems: 'center', justifyContent: 'center',
    },
    symposiumGlyph: { color: '#c9a84c', fontSize: 20 },
    symposiumTitle: { color: '#e0d5b5', fontSize: 16, fontWeight: '700' },
    symposiumSub: { color: '#888', fontSize: 12, lineHeight: 17, marginTop: 2 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    searchInput: {
        flex: 1, backgroundColor: '#16213e', borderRadius: 12,
        borderWidth: 1, borderColor: '#c9a84c33',
        color: '#fff', fontSize: 14, paddingHorizontal: 14, paddingVertical: 10,
    },
    searchClear: { position: 'absolute', right: 56 },
    searchButton: {
        width: 42, height: 42, borderRadius: 12, backgroundColor: '#c9a84c',
        alignItems: 'center', justifyContent: 'center',
    },
    hitCard: {
        backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#c9a84c22',
    },
    hitTitle: { color: '#c9a84c', fontSize: 12, fontWeight: '700', marginBottom: 5 },
    hitSnippet: { color: '#aab', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
    noHits: { color: '#888', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 },
});
