import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { signedInUrl } from '@/lib/webHandoff';

/**
 * The Academy, inside the app: a WebView over academy.pursuearete.com with
 * native chrome. The Academy shares the app's Supabase project, so the first
 * load goes through a one-time sign-in link (lib/webHandoff) and the student
 * lands on the dashboard already signed in; sharedCookiesEnabled keeps that
 * web session across visits. In-page history gets its own back button.
 */
export default function AcademyScreen() {
    const router = useRouter();
    const webRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const [startUrl, setStartUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        signedInUrl('academy', '/dashboard').then(url => { if (!cancelled) setStartUrl(url); });
        return () => { cancelled = true; };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="close" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>Arete Academy</Text>
                </View>
                <TouchableOpacity
                    onPress={() => webRef.current?.goBack()}
                    style={[styles.headerButton, !canGoBack && { opacity: 0.3 }]}
                    disabled={!canGoBack}
                    hitSlop={8}
                >
                    <Ionicons name="arrow-back" size={20} color="#c9a84c" />
                </TouchableOpacity>
            </View>

            {startUrl ? (
            <WebView
                ref={webRef}
                source={{ uri: startUrl }}
                style={styles.web}
                sharedCookiesEnabled
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={nav => setCanGoBack(nav.canGoBack)}
                allowsBackForwardNavigationGestures
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#c9a84c" />
                        <Text style={styles.loadingText}>Entering the Academy…</Text>
                    </View>
                )}
            />
            ) : (
                <View style={[styles.web, styles.loadingOverlay]}>
                    <ActivityIndicator size="large" color="#c9a84c" />
                    <Text style={styles.loadingText}>Entering the Academy…</Text>
                </View>
            )}

            {loading && (
                <View style={styles.loadingBar}>
                    <ActivityIndicator size="small" color="#c9a84c" />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a3e',
        backgroundColor: '#1a1a2e',
    },
    headerButton: { padding: 6 },
    headerTitle: { color: '#e0d5b5', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    web: { flex: 1, backgroundColor: '#1a1a2e' },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
    loadingBar: {
        position: 'absolute',
        top: 60,
        right: 16,
    },
});
