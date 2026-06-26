import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '../services/claudeService';

interface Dispatch {
    id: string;
    dispatch_date: string;
    title: string;
    body: string;
    teaser: string;
    practice: string;
    community_themes?: { theme: string; frequency: number }[];
    corpus_context?: {
        latestSynthesisTitle?: string | null;
        latestSynthesisConcept?: string | null;
        recentNewAuthors?: string[];
    };
}

/**
 * Full Daily Dispatch reader. Opened from the notification tap (with a
 * dispatch_id param) or from the journal-tab "Today's Dispatch" card (no param
 * → today's dispatch). Matches the Cabinet/journal aesthetic.
 */
export default function DispatchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ dispatch_id?: string }>();
    const [dispatch, setDispatch] = useState<Dispatch | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setError('Please sign in to read the dispatch.');
                    return;
                }
                const id = params.dispatch_id ? String(params.dispatch_id) : null;
                const url = id
                    ? `${API_BASE_URL}/api/dispatch/${id}`
                    : `${API_BASE_URL}/api/dispatch/today`;
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setError(data?.error || 'Could not load the dispatch.');
                    return;
                }
                if (!data?.dispatch) {
                    setError("Today's dispatch hasn't arrived yet. Check back this morning.");
                    return;
                }
                setDispatch(data.dispatch);
            } catch {
                setError('Could not load the dispatch.');
            } finally {
                setLoading(false);
            }
        })();
    }, [params.dispatch_id]);

    const formattedDate = dispatch?.dispatch_date
        ? new Date(dispatch.dispatch_date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
          })
        : '';

    const groundedIn = dispatch?.corpus_context?.recentNewAuthors?.filter(Boolean) || [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Dispatch</Text>
                <View style={styles.backButton} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color="#c9a84c" />
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="sunny-outline" size={48} color="#c9a84c33" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : dispatch ? (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.date}>{formattedDate}</Text>
                    <Text style={styles.title}>{dispatch.title}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.body}>{dispatch.body}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.practiceLabel}>Today&apos;s Practice</Text>
                    <Text style={styles.practice}>{dispatch.practice}</Text>

                    {groundedIn.length > 0 && (
                        <Text style={styles.footer}>Grounded in: {groundedIn.join(', ')}</Text>
                    )}
                </ScrollView>
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
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    errorText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 24, paddingBottom: 60 },
    date: {
        color: '#c9a84c', fontSize: 12, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 12,
    },
    title: {
        color: '#fff', fontSize: 24, fontWeight: '700',
        textAlign: 'center', lineHeight: 32,
    },
    divider: {
        height: 1, backgroundColor: '#c9a84c33',
        marginVertical: 22, alignSelf: 'center', width: '40%',
    },
    body: { color: '#e8e8ee', fontSize: 17, lineHeight: 28 },
    practiceLabel: {
        color: '#c9a84c', fontSize: 13, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    },
    practice: { color: '#fff', fontSize: 16, lineHeight: 26, fontStyle: 'italic' },
    footer: {
        color: '#666', fontSize: 12, marginTop: 36, textAlign: 'center', lineHeight: 18,
    },
});
