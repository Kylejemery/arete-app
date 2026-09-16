import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ExhibitTemplate from '@/components/exhibits/ExhibitTemplate';
import { getExhibit, type Exhibit } from '@/lib/exhibits';

/**
 * One exhibit. Fetched by slug, so a workshop exhibit opens here for
 * testing while staying absent from the Garden index. Everything drawn on
 * this screen is drawn by the template.
 */
export default function ExhibitScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const [exhibit, setExhibit] = useState<Exhibit | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!slug) { setState('missing'); return; }
            try {
                const row = await getExhibit(slug);
                if (cancelled) return;
                if (!row) { setState('missing'); return; }
                setExhibit(row);
                setState('ready');
            } catch {
                if (!cancelled) setState('error');
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    if (state === 'ready' && exhibit) return <ExhibitTemplate exhibit={exhibit} />;

    return (
        <SafeAreaView style={s.container}>
            <View style={s.center}>
                {state === 'loading' ? (
                    <ActivityIndicator size="large" color="#c9a84c" />
                ) : (
                    <Text style={s.note}>
                        {state === 'missing'
                            ? 'Nothing is planted here.'
                            : 'This exhibit could not be reached.'}
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    note: { color: '#888', fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
});
