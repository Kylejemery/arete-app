import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_BASE_URL } from '../services/claudeService';

const WEB_OBSERVATORY_URL = 'https://academy.pursuearete.com/library';

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

/**
 * The Observatory, simplified for the phone: the substance of the web
 * Observatory (world observation, open tensions, open inquiries, dreams) as a
 * stack of cards from the four public /api/observatory/* endpoints — without
 * the live star map, which stays web-only. Links out to the full experience.
 */
export default function ObservatoryScreen() {
    const router = useRouter();
    const [world, setWorld] = useState<WorldObservation | null>(null);
    const [tensions, setTensions] = useState<Tension[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [dreams, setDreams] = useState<Dream[]>([]);
    const [loading, setLoading] = useState(true);

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
            const [w, t, i, d] = await Promise.all([
                get('/api/observatory/world'),
                get('/api/observatory/tensions'),
                get('/api/observatory/inquiries'),
                get('/api/observatory/dreams'),
            ]);
            setWorld(w?.world || null);
            setTensions(Array.isArray(t?.tensions) ? t.tensions : []);
            setInquiries(Array.isArray(i?.inquiries) ? i.inquiries : []);
            setDreams(Array.isArray(d?.dreams) ? d.dreams : []);
            setLoading(false);
        })();
    }, []);

    const empty = !world && tensions.length === 0 && inquiries.length === 0 && dreams.length === 0;

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
                        What the corpus is working through right now — its open questions,
                        unresolved tensions, and response to the week&apos;s world.
                    </Text>

                    {empty && (
                        <View style={styles.emptyBlock}>
                            <Ionicons name="telescope-outline" size={48} color="#c9a84c33" />
                            <Text style={styles.errorText}>
                                The sky is quiet tonight. Check back soon.
                            </Text>
                        </View>
                    )}

                    {world && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>This Week in the World</Text>
                            <View style={styles.card}>
                                <Text style={styles.cardBody}>{world.dominantSignal}</Text>
                                {!!world.tension && (
                                    <Text style={styles.cardAccent}>{world.tension}</Text>
                                )}
                                {world.authors.length > 0 && (
                                    <Text style={styles.cardFootnote}>
                                        The corpus answers through {world.authors.join(', ')}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {tensions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Open Tensions</Text>
                            {tensions.map(t => (
                                <View key={t.id} style={styles.card}>
                                    <Text style={styles.cardTitle}>{t.title}</Text>
                                    <Text style={styles.cardBody}>{t.firstSentence}</Text>
                                    {t.authors.length >= 2 && (
                                        <Text style={styles.cardFootnote}>
                                            {t.authors[0]} contra {t.authors[1]}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {inquiries.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Open Inquiries</Text>
                            {inquiries.map(q => (
                                <View key={q.id} style={styles.card}>
                                    <Text style={styles.cardBody}>{q.question}</Text>
                                    {q.authorCount > 0 && (
                                        <Text style={styles.cardFootnote}>
                                            Pursued across {q.authorCount} {q.authorCount === 1 ? 'author' : 'authors'} — still open
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {dreams.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>The Corpus Imagines</Text>
                            {dreams.map(d => (
                                <View key={d.id} style={styles.card}>
                                    <Text style={styles.dreamType}>{d.dreamType}</Text>
                                    <Text style={styles.cardTitle}>{d.title}</Text>
                                    <Text style={styles.cardBodyItalic}>
                                        {d.content || d.firstLine}
                                    </Text>
                                    {d.seedAuthors.length > 0 && (
                                        <Text style={styles.cardFootnote}>
                                            Dreamt from {d.seedAuthors.join(', ')}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
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
        textAlign: 'center', marginBottom: 20, paddingHorizontal: 12,
    },
    emptyBlock: { alignItems: 'center', gap: 14, paddingVertical: 40 },
    section: { marginBottom: 22 },
    sectionLabel: {
        color: '#c9a84c', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
    },
    card: {
        backgroundColor: '#16213e',
        borderRadius: 14,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#c9a84c22',
    },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 23, marginBottom: 8 },
    cardBody: { color: '#e8e8ee', fontSize: 14, lineHeight: 22 },
    cardBodyItalic: { color: '#e8e8ee', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
    cardAccent: { color: '#c9a84c', fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginTop: 10 },
    cardFootnote: { color: '#666', fontSize: 12, marginTop: 10 },
    dreamType: {
        color: '#c9a84c', fontSize: 10, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6,
    },
    webLink: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#c9a84c', borderRadius: 12, padding: 15, marginTop: 8,
    },
    webLinkText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },
    webLinkHint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});
