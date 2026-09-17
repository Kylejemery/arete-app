import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    BRANCHES, BRANCH_GLOSS, BRANCH_LABEL, FIELD_CITATION, FIELD_PASSAGE,
    GARDEN_SUBTITLE, GARDEN_TITLE,
    byBranch, listGalleryExhibits, thinkersOf, type Exhibit,
} from '@/lib/exhibits';

const GOLD = '#c9a84c';
const INK = '#1a1a2e';
const CARD = '#16213e';

/**
 * The Garden: every exhibit in the gallery, grouped by the branch of
 * philosophy it belongs to. The page is generated entirely from the
 * exhibits table. Nothing here knows the name of any exhibit.
 *
 * Reached from the Explore drawer. A thinker chip on an exhibit page links
 * back here with ?thinker=, which is why the filter reads the param.
 */
export default function GardenScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ thinker?: string }>();
    const [exhibits, setExhibits] = useState<Exhibit[]>([]);
    const [thinker, setThinker] = useState<string | null>(params.thinker ?? null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    const list = await listGalleryExhibits();
                    if (cancelled) return;
                    setExhibits(list);
                    setError(null);
                } catch {
                    if (!cancelled) setError('The Garden could not be reached.');
                } finally {
                    if (!cancelled) setLoading(false);
                }
            })();
            return () => { cancelled = true; };
        }, []),
    );

    const thinkers = useMemo(() => thinkersOf(exhibits), [exhibits]);
    const shown = useMemo(
        () => (thinker ? exhibits.filter(e => e.thinkers.includes(thinker)) : exhibits),
        [exhibits, thinker],
    );

    const open = (e: Exhibit) =>
        router.push({ pathname: '/garden/[slug]', params: { slug: e.slug } } as any);

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.headerButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={GOLD} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.headerTitle}>{GARDEN_TITLE}</Text>
                </View>
                <View style={s.headerButton} />
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>{GARDEN_TITLE}</Text>
                <Text style={s.subtitle}>{GARDEN_SUBTITLE}</Text>
                {/* The room's own source, in the treatment an exhibit gives
                    its own: gold rule, italic passage, gold citation. */}
                <View style={s.source}>
                    <Text style={s.passage}>{FIELD_PASSAGE}</Text>
                    <Text style={s.citation}>{FIELD_CITATION}</Text>
                </View>
                <Text style={s.note}>Every exhibit belongs to one of the three.</Text>

                {thinkers.length > 1 ? (
                    <View style={s.filter}>
                        <Text style={s.kicker}>By thinker</Text>
                        <View style={s.chips}>
                            <Chip label="All" active={!thinker} onPress={() => setThinker(null)} />
                            {thinkers.map(t => (
                                <Chip
                                    key={t}
                                    label={t}
                                    active={thinker === t}
                                    onPress={() => setThinker(thinker === t ? null : t)}
                                />
                            ))}
                        </View>
                    </View>
                ) : null}

                {loading ? (
                    <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
                ) : error ? (
                    <Text style={s.empty}>{error}</Text>
                ) : (
                    /* All three branches, always, whether or not anything is
                       planted in them. The field is the organizing idea of the
                       room, and a barren section says where the Garden has yet
                       to grow rather than hiding that there is ground there. */
                    BRANCHES.map(branch => {
                        const rows = byBranch(shown, branch);
                        return (
                            <View key={branch} style={s.branchSection}>
                                <Text style={s.branchTitle}>{BRANCH_LABEL[branch]}</Text>
                                <Text style={s.branchGloss}>{BRANCH_GLOSS[branch]}</Text>
                                {!rows.length ? (
                                    <Text style={s.branchEmpty}>
                                        {thinker
                                            ? `Nothing from ${thinker} here yet.`
                                            : 'Nothing planted here yet.'}
                                    </Text>
                                ) : null}
                                {rows.map(e => (
                                    <TouchableOpacity
                                        key={e.id}
                                        style={s.card}
                                        activeOpacity={0.85}
                                        onPress={() => open(e)}
                                    >
                                        <Text style={s.cardTitle}>{e.title}</Text>
                                        <Text style={s.cardSummary}>{e.summary}</Text>
                                        {e.thinkers.length ? (
                                            <Text style={s.cardThinkers}>{e.thinkers.join(' · ')}</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: INK },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ffffff0d',
    },
    headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#e0d5b5', fontSize: 15, fontWeight: '600' },
    scroll: { padding: 20, paddingBottom: 48 },

    title: { color: '#fff', fontSize: 28, fontWeight: '700' },
    subtitle: { color: '#e0e0e0', fontSize: 15, lineHeight: 23, marginTop: 8 },
    source: {
        borderLeftWidth: 3,
        borderLeftColor: GOLD,
        paddingLeft: 14,
        marginTop: 18,
    },
    passage: { color: '#e8e0d0', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
    citation: { color: GOLD, fontSize: 12, fontWeight: '600', marginTop: 8 },
    note: { color: '#888', fontSize: 13, lineHeight: 20, marginTop: 16, fontStyle: 'italic' },

    filter: { marginTop: 26 },
    kicker: {
        color: GOLD,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 2,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: '#c9a84c33',
    },
    chipActive: { backgroundColor: '#c9a84c1f', borderColor: '#c9a84c88' },
    chipText: { color: '#e0d5b5', fontSize: 13 },
    chipTextActive: { color: GOLD, fontWeight: '600' },

    branchSection: { marginTop: 32 },
    branchTitle: {
        color: GOLD,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2.4,
        textTransform: 'uppercase',
    },
    branchGloss: { color: '#555', fontSize: 12, fontStyle: 'italic', marginTop: 4, marginBottom: 14 },
    branchEmpty: { color: '#555', fontSize: 13, fontStyle: 'italic', lineHeight: 20, paddingVertical: 4 },

    card: {
        padding: 16,
        marginBottom: 10,
        borderRadius: 2,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: '#ffffff12',
    },
    cardTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
    cardSummary: { color: '#e0e0e0', fontSize: 14, lineHeight: 21, marginTop: 6 },
    cardThinkers: { color: '#888', fontSize: 12, marginTop: 10 },

    empty: {
        color: '#888',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 48,
        lineHeight: 22,
    },
});
