import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const SCALE_URL = 'https://academy.pursuearete.com/playground/happiness-scale';

/**
 * The Scale of Happiness, inside the app: a WebView over the Playground page
 * on the Academy. Unlike the Academy screen this needs no sign-in handoff —
 * the Playground is a public surface (see the middleware's PUBLIC_PREFIXES),
 * so the plain URL loads for signed-out users too and the scale stays a
 * single implementation on the web rather than a second copy here.
 */
export default function HappinessScaleScreen() {
    const router = useRouter();
    const webRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="close" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>The Scale of Happiness</Text>
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

            <WebView
                ref={webRef}
                source={{ uri: SCALE_URL }}
                style={styles.web}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onNavigationStateChange={nav => setCanGoBack(nav.canGoBack)}
                allowsBackForwardNavigationGestures
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#c9a84c" />
                        <Text style={styles.loadingText}>Measuring the distance…</Text>
                    </View>
                )}
            />

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
