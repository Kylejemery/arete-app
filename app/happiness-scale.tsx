import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const SCALE_URL = 'https://academy.pursuearete.com/playground/happiness-scale';

/**
 * The Scale of Happiness, inside the app: a WebView over the Playground page
 * on the Academy. Unlike the Academy screen this needs no sign-in handoff —
 * the scale is one of the released Playground pieces (see the middleware's
 * RELEASED_PLAYGROUND), so the plain URL loads for signed-out users too and
 * the scale stays a single implementation on the web rather than a second
 * copy here.
 *
 * This screen is the scale and nothing else. Any navigation away from it —
 * the page's own "← Back to Arete" link included — closes the WebView and
 * returns to the app, so there is no way to wander the web from inside it.
 */
export default function HappinessScaleScreen() {
    const router = useRouter();
    const webRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>The Scale of Happiness</Text>
                </View>
                {/* Balances the arrow so the title stays centred. */}
                <View style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={22} color="transparent" />
                </View>
            </View>

            <WebView
                ref={webRef}
                source={{ uri: SCALE_URL }}
                style={styles.web}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onShouldStartLoadWithRequest={req => {
                    if (req.url.startsWith(SCALE_URL)) return true;
                    // Leaving the scale means the user is done with it. Go
                    // back to the app rather than browsing the web in here.
                    router.back();
                    return false;
                }}
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
