import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_BASE_URL } from '../services/claudeService';

const WEB_OBSERVATORY_URL = 'https://academy.pursuearete.com/library';

// The corpus-concludes hue — a cool cyan, distinct from the greens/golds of the
// other kinds: a conclusion is arrived-at, not found.
const CONV = '#5ab0c9';

interface WorldObservation {
    dominantSignal: string;
    tension: string;
    authors: string[];
    week: string;
}
interface Tension {
    id: string;
    title: string;
    firstSentence: string;
    authors: string[];
}
interface Inquiry {
    id: string;
    question: string;
    confidence: string | null;
    authorCount: number;
}
interface Dream {
    id: string;
    dreamType: string;
    title: string;
    content: string | null;
    firstLine: string | null;
    seedAuthors: string[];
}
interface Convergence {
    id: string;
    title: string;
    conclusion: string;
    entailment: string | null;
    novelty: string | null;
    authors: string[];
    traditions: string[];
    spread: number | null;
    pursuit: string | null;
    breakpoint: string | null;
    starred: boolean;
}

type Kind = 'conclude' | 'inquiry' | 'tension' | 'imagines' | 'world';
type Filter = 'all' | Kind;

const KIND_LABEL: Record<Kind, string> = {
    conclude: 'Concludes', inquiry: 'Inquiries', tension: 'Tensions', imagines: 'Imagines', world: 'World',
};
const KIND_DOT: Record<Kind, string> = {
    conclude: CONV, inquiry: '#c9a84c', tension: '#d97a6a', imagines: '#9a7ad9', world: '#d99a6a',
};

interface FeedItem {
    kind: Kind;
    key: string;
    tag: string;
    line: string;
    meta: string;
    conv?: Convergence;
}

/**
 * The Observatory, simplified for the phone: the substance of the web
 * Observatory (open questions, tensions, convergences, dreams, world) as a
 * FILTERABLE FEED of compact cards from the public /api/observatory/* endpoints,
 * with the verbose convergence reasoning in a modal. The live star map stays
 * web-only; this links out to the full experience.
 */
export default function ObservatoryScreen() {
    const router = useRouter();
    const [world, setWorld] = useState<WorldObservation | null>(null);
    const [tensions, setTensions] = useState<Tension[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [dreams, setDreams] = useState<Dream[]>([]);
    const [convergences, setConvergences] = useState<Convergence[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('all');
    const [activeConv, setActiveConv] = useState<Convergence | null>(null);

    useEffect(() => {
        (async () => {
            const get = async (path: string) => {
                try {
                    const res = await fetch(`${API_BASE_URL}${path}`);
                    return res.ok ? await res.json() : null;
                } catch {
                    return null;
                }
            };
            const [w, t, i, d, c] = await Promise.all([
                get('/api/observatory/world'),
                get('/api/observatory/tensions'),
                get('/api/observatory/inquiries'),
                get('/api/observatory/dreams'),
                get('/api/observatory/convergences'),
            ]);
            setWorld(w?.world || null);
            setTensions(Array.isArray(t?.tensions) ? t.tensions : []);
            setInquiries(Array.isArray(i?.inquiries) ? i.inquiries : []);
            setDreams(Array.isArray(d?.dreams) ? d.dreams : []);
            setConvergences(Array.isArray(c?.convergences) ? c.convergences : []);
            setLoading(false);
        })();
    }, []);

    // One unified feed, convergences first (new and highest-value), then the
    // open questions, tensions, dreams, and the world response.
    const items = useMemo<FeedItem[]>(() => {
        const out: FeedItem[] = [];
        for (const c of convergences) out.push({
            kind: 'conclude', key: 'c' + c.id, conv: c,
            tag: c.starred ? 'The corpus concludes · starred' : 'The corpus concludes',
            line: c.title,
            meta: `${c.authors.length} voices · spread ${typeof c.spread === 'number' ? c.spread.toFixed(2) : 'n/a'}`,
        });
        for (const q of inquiries) out.push({
            kind: 'inquiry', key: 'i' + q.id, tag: 'Open inquiry', line: q.question,
            meta: `Pursued across ${q.authorCount} ${q.authorCount === 1 ? 'author' : 'authors'}${q.confidence ? `, ${q.confidence}` : ''}`,
        });
        for (const t of tensions) out.push({
            kind: 'tension', key: 't' + t.id, tag: 'Open tension', line: t.title,
            meta: [t.firstSentence, (t.authors || []).join(', ')].filter(Boolean).join(' — '),
        });
        for (const d of dreams) out.push({
            kind: 'imagines', key: 'd' + d.id, tag: 'The corpus imagines',
            line: d.content || d.title || d.firstLine || 'A thought',
            meta: d.seedAuthors.length ? `Dreamed from ${d.seedAuthors.join(', ')}` : '',
        });
        if (world) out.push({
            kind: 'world', key: 'w', tag: 'The corpus is responding to', line: world.dominantSignal,
            meta: (world.authors || []).slice(0, 3).join(', '),
        });
        return out;
    }, [convergences, inquiries, tensions, dreams, world]);

    const order: Kind[] = ['conclude', 'inquiry', 'tension', 'imagines', 'world'];
    const present = order.filter(k => items.some(i => i.kind === k));
    const shown = items.filter(i => filter === 'all' || i.kind === filter);
    const empty = items.length === 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>The Observatory</Text>
                <View style={styles.backButton} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color="#c9a84c" />
                    <Text style={styles.loadingText}>Charting the sky…</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.intro}>
                        What the corpus is working through right now. Filter by kind, then open one to read it in full.
                    </Text>

                    {empty ? (
                        <View style={styles.emptyBlock}>
                            <Ionicons name="telescope-outline" size={48} color="#c9a84c33" />
                            <Text style={styles.errorText}>The sky is quiet tonight. Check back soon.</Text>
                        </View>
                    ) : (
                        <>
                            {/* filter chips — only kinds that have something to show */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                {(['all', ...present] as Filter[]).map(k => {
                                    const on = filter === k;
                                    const dot = k === 'all' ? '#c9a84c' : KIND_DOT[k];
                                    return (
                                        <TouchableOpacity
                                            key={k}
                                            onPress={() => setFilter(k)}
                                            activeOpacity={0.8}
                                            style={[styles.chip, on && styles.chipOn]}
                                        >
                                            <View style={[styles.chipDot, { backgroundColor: dot }]} />
                                            <Text style={[styles.chipText, on && styles.chipTextOn]}>
                                                {k === 'all' ? 'All' : KIND_LABEL[k]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* unified compact feed — the pane scans, the modal reads */}
                            {shown.map(it => {
                                const dot = KIND_DOT[it.kind];
                                const body = (
                                    <>
                                        <View style={styles.tagRow}>
                                            <View style={[styles.tagDot, { backgroundColor: dot }]} />
                                            <Text style={styles.tagText}>{it.tag.toUpperCase()}</Text>
                                        </View>
                                        <Text style={styles.feedLine} numberOfLines={3}>{it.line}</Text>
                                        {it.kind === 'conclude' && it.conv && (
                                            <View style={styles.pillRow}>
                                                {!!it.conv.entailment && (
                                                    <Text style={[styles.pill, styles.pillHot]}>{it.conv.entailment}</Text>
                                                )}
                                                {!!it.conv.novelty && (
                                                    <Text style={styles.pill}>{it.conv.novelty.replace('_', ' ')}</Text>
                                                )}
                                            </View>
                                        )}
                                        {!!it.meta && <Text style={styles.feedMeta} numberOfLines={2}>{it.meta}</Text>}
                                        {it.kind === 'conclude' && (
                                            <Text style={styles.feedCta}>READ THE REASONING →</Text>
                                        )}
                                    </>
                                );
                                return it.conv ? (
                                    <TouchableOpacity
                                        key={it.key}
                                        activeOpacity={0.85}
                                        onPress={() => setActiveConv(it.conv!)}
                                        style={[styles.feedCard, { borderLeftColor: dot }]}
                                    >
                                        {body}
                                    </TouchableOpacity>
                                ) : (
                                    <View key={it.key} style={[styles.feedCard, { borderLeftColor: dot }]}>
                                        {body}
                                    </View>
                                );
                            })}
                            {shown.length === 0 && (
                                <Text style={styles.quiet}>Nothing of this kind right now.</Text>
                            )}
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.webLink}
                        activeOpacity={0.85}
                        onPress={() => Linking.openURL(WEB_OBSERVATORY_URL).catch(() => {})}
                    >
                        <Ionicons name="planet-outline" size={18} color="#1a1a2e" />
                        <Text style={styles.webLinkText}>Explore the full Observatory</Text>
                        <Ionicons name="open-outline" size={16} color="#1a1a2e" />
                    </TouchableOpacity>
                    <Text style={styles.webLinkHint}>
                        The living star map of the corpus — on the web at academy.pursuearete.com
                    </Text>
                </ScrollView>
            )}

            {/* convergence detail — the reasoning the feed only teased */}
            <Modal
                visible={!!activeConv}
                transparent
                animationType="slide"
                onRequestClose={() => setActiveConv(null)}
            >
                <View style={styles.modalScrim}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHead}>
                            <View style={styles.tagRow}>
                                <View style={[styles.tagDot, { backgroundColor: CONV }]} />
                                <Text style={[styles.tagText, { color: CONV }]}>
                                    {activeConv?.starred ? 'THE CORPUS CONCLUDES · STARRED' : 'THE CORPUS CONCLUDES'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setActiveConv(null)} hitSlop={10}>
                                <Ionicons name="close" size={22} color="#888" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {!!activeConv?.title && <Text style={styles.modalTitle}>{activeConv.title}</Text>}
                            <Text style={styles.modalConclusion}>{activeConv?.conclusion}</Text>
                            <Text style={styles.modalDisclose}>
                                A conclusion the corpus assembled from passages that sit far apart in it, reviewed by a human before appearing here. It is not a source text, and not the claim of any single thinker.
                            </Text>
                            <View style={styles.pillRow}>
                                {!!activeConv?.entailment && (
                                    <Text style={[styles.pill, styles.pillHot]}>entailment · {activeConv.entailment}</Text>
                                )}
                                {!!activeConv?.novelty && (
                                    <Text style={styles.pill}>novelty · {activeConv.novelty.replace('_', ' ')}</Text>
                                )}
                                <Text style={styles.pill}>
                                    {activeConv?.authors.length} voices{activeConv && activeConv.traditions.length ? ` · ${activeConv.traditions.length} traditions` : ''}
                                </Text>
                            </View>
                            {!!activeConv?.breakpoint && (
                                <>
                                    <Text style={styles.modalLabel}>THE BREAKPOINT · REMOVE THIS AND IT COLLAPSES</Text>
                                    <View style={styles.breakBox}>
                                        <Text style={styles.breakText}>{activeConv.breakpoint}</Text>
                                    </View>
                                </>
                            )}
                            {!!activeConv?.pursuit && (
                                <>
                                    <Text style={styles.modalLabel}>THE PURSUIT</Text>
                                    <Text style={styles.pursuitText}>{activeConv.pursuit}</Text>
                                </>
                            )}
                            {!!activeConv?.authors.length && (
                                <>
                                    <Text style={styles.modalLabel}>ASSEMBLED FROM</Text>
                                    <Text style={styles.assembled}>{activeConv.authors.join(' · ')}</Text>
                                </>
                            )}
                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    loadingText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
    errorText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 16, paddingBottom: 48 },
    intro: {
        color: '#888', fontSize: 14, fontStyle: 'italic', lineHeight: 21,
        textAlign: 'center', marginBottom: 18, paddingHorizontal: 12,
    },
    emptyBlock: { alignItems: 'center', gap: 14, paddingVertical: 40 },

    // chips
    chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2, marginBottom: 14 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        borderWidth: 1, borderColor: '#c9a84c1a', backgroundColor: '#ffffff08',
    },
    chipOn: { borderColor: '#c9a84c73', backgroundColor: '#c9a84c17' },
    chipDot: { width: 7, height: 7, borderRadius: 4 },
    chipText: { color: '#888', fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
    chipTextOn: { color: '#f4ead5' },

    // feed
    feedCard: {
        backgroundColor: '#ffffff05',
        borderRadius: 12, padding: 14, marginBottom: 9,
        borderWidth: 1, borderColor: '#c9a84c1a', borderLeftWidth: 3,
    },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
    tagDot: { width: 6, height: 6, borderRadius: 3 },
    tagText: { color: '#c9a84c', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
    feedLine: { color: '#f4ead5', fontSize: 16, lineHeight: 22, fontWeight: '500' },
    feedMeta: { color: '#888', fontSize: 11, letterSpacing: 0.4, marginTop: 8, lineHeight: 16 },
    feedCta: { color: '#c9a84c', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 9 },
    quiet: { color: '#888', fontSize: 14, fontStyle: 'italic', paddingVertical: 6 },

    // pills
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    pill: {
        color: '#888', fontSize: 9, fontWeight: '700', letterSpacing: 0.6,
        textTransform: 'uppercase', overflow: 'hidden',
        borderWidth: 1, borderColor: '#c9a84c1f', borderRadius: 999,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    pillHot: { color: CONV, borderColor: '#5ab0c966' },

    // modal
    modalScrim: { flex: 1, backgroundColor: '#04081266', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#121b36', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderWidth: 1, borderColor: '#5ab0c966', padding: 22, maxHeight: '88%',
    },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    modalTitle: { color: '#f4ead5', fontSize: 22, fontWeight: '600', lineHeight: 28, marginBottom: 8 },
    modalConclusion: { color: '#f4ead5', fontSize: 16, lineHeight: 24, marginBottom: 14 },
    modalDisclose: {
        color: '#888', fontSize: 12, fontStyle: 'italic', lineHeight: 18,
        borderWidth: 1, borderColor: '#c9a84c1a', borderRadius: 8, padding: 10, marginBottom: 14,
    },
    modalLabel: { color: '#c9a84c', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 16, marginBottom: 7 },
    breakBox: { backgroundColor: '#5ab0c910', borderWidth: 1, borderColor: '#5ab0c93a', borderRadius: 10, padding: 13 },
    breakText: { color: '#e8e4d6', fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    pursuitText: { color: '#e8e4d6', fontSize: 15, lineHeight: 24 },
    assembled: { color: '#f4ead5', fontSize: 14, lineHeight: 22 },

    webLink: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#c9a84c', borderRadius: 12, padding: 15, marginTop: 14,
    },
    webLinkText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },
    webLinkHint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});
