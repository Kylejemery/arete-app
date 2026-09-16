import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { renderNative } from '@/exhibits/registry';
import { BRANCH_LABEL, type Exhibit } from '@/lib/exhibits';

export const GOLD = '#c9a84c';
export const INK = '#1a1a2e';
export const CARD = '#16213e';

/**
 * The exhibit frame. Every exhibit in the Garden is drawn by this screen,
 * in this order: title and branch, the one-line summary, the piece itself,
 * the source it comes from, the thinkers it belongs to, and the two ways
 * out (the Academy and the Agora).
 *
 * Nothing on this screen comes from anywhere but the exhibit's own row.
 * The row is checked by assertNoUserContent() before it gets here, and the
 * one place user-derived content is allowed is the `discussion` slot, which
 * renders below the frame and is visibly outside it. See the privacy note
 * in lib/exhibits.ts.
 *
 * Mirrored in the web app at web/src/components/exhibits/ExhibitTemplate.tsx.
 */
export default function ExhibitTemplate({
    exhibit,
    discussion,
}: {
    exhibit: Exhibit;
    discussion?: ReactNode;
}) {
    const router = useRouter();

    const writeAbout = () => {
        if (!exhibit.agora_prompt) return;
        router.push({ pathname: '/agora/compose', params: { prompt: exhibit.agora_prompt } } as any);
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.headerButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={GOLD} />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.headerTitle} numberOfLines={1}>{exhibit.title}</Text>
                </View>
                {/* Balances the arrow so the title stays centred. */}
                <View style={s.headerButton} />
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                {/* 1 and 2: title, branch, and the idea in one line. */}
                <View style={s.intro}>
                    <BranchBadge exhibit={exhibit} />
                    <Text style={s.title}>{exhibit.title}</Text>
                    <Text style={s.summary}>{exhibit.summary}</Text>
                </View>

                {/* 3: the piece. */}
                <ExhibitBody exhibit={exhibit} />

                {/* 4: where it comes from. */}
                {exhibit.source_passage || exhibit.source_citation ? (
                    <View style={s.source}>
                        {exhibit.source_passage ? (
                            <Text style={s.passage}>{exhibit.source_passage}</Text>
                        ) : null}
                        {exhibit.source_citation ? (
                            <Text style={s.citation}>{exhibit.source_citation}</Text>
                        ) : null}
                    </View>
                ) : null}

                {/* 5: the thinkers. Tappable, for the thinker pages to come. */}
                {exhibit.thinkers.length ? (
                    <View style={s.section}>
                        <Text style={s.kicker}>Thinkers</Text>
                        <View style={s.chips}>
                            {exhibit.thinkers.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    activeOpacity={0.8}
                                    style={s.chip}
                                    onPress={() => router.push({ pathname: '/garden', params: { thinker: t } } as any)}
                                >
                                    <Text style={s.chipText}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* 6 and 7: the ways out. */}
                {exhibit.academy_path ? (
                    <View style={s.section}>
                        <Text style={s.kicker}>Go deeper</Text>
                        <Text style={s.forthcoming}>
                            A session in the Academy takes this further. The Academy is forthcoming.
                        </Text>
                    </View>
                ) : null}

                {exhibit.agora_prompt ? (
                    <TouchableOpacity style={s.agoraButton} onPress={writeAbout} activeOpacity={0.85}>
                        <Ionicons name="create-outline" size={17} color={GOLD} />
                        <Text style={s.agoraButtonText}>Write about this</Text>
                    </TouchableOpacity>
                ) : null}

                {/* Outside the frame: the one place anything user-written may
                    appear on an exhibit page. Never part of the row above. */}
                {discussion ? <View style={s.discussion}>{discussion}</View> : null}
            </ScrollView>
        </SafeAreaView>
    );
}

function BranchBadge({ exhibit }: { exhibit: Exhibit }) {
    return (
        <View style={s.badge}>
            <Text style={s.badgeText}>{BRANCH_LABEL[exhibit.branch]}</Text>
        </View>
    );
}

/**
 * The piece itself, by kind. A native exhibit is looked up in the registry;
 * a web_embed loads in a WebView that cannot wander off the exhibit's own
 * URL; an external one opens in the in-app browser and leaves this screen
 * showing the frame.
 */
function ExhibitBody({ exhibit }: { exhibit: Exhibit }) {
    if (exhibit.kind === 'native') {
        const piece = renderNative(exhibit.component_key, { slug: exhibit.slug });
        if (!piece) {
            return (
                <Missing>
                    This exhibit is drawn in the app, and this build does not carry it. Update the
                    app, or open it on the web.
                </Missing>
            );
        }
        return <View style={s.piece}>{piece}</View>;
    }

    if (exhibit.kind === 'external') {
        return <ExternalPiece exhibit={exhibit} />;
    }

    if (!exhibit.embed_url) {
        return <Missing>This exhibit has no address to load.</Missing>;
    }

    const base = exhibit.embed_url;
    return (
        <View style={[s.piece, s.embed]}>
            <WebView
                source={{ uri: base }}
                style={s.web}
                onShouldStartLoadWithRequest={req => req.url.startsWith(base)}
                startInLoadingState
                renderLoading={() => (
                    <View style={s.loadingOverlay}>
                        <ActivityIndicator size="large" color={GOLD} />
                    </View>
                )}
            />
        </View>
    );
}

/** An external exhibit opens once, in the in-app browser. */
function ExternalPiece({ exhibit }: { exhibit: Exhibit }) {
    const url = exhibit.embed_url;
    // Opens once, on arrival. A ref rather than state: nothing on this
    // screen changes when the browser opens, so there is nothing to render.
    const openedOnce = useRef(false);

    const open = useCallback(() => {
        if (url) WebBrowser.openBrowserAsync(url);
    }, [url]);

    useEffect(() => {
        if (url && !openedOnce.current) {
            openedOnce.current = true;
            open();
        }
    }, [url, open]);

    if (!url) return <Missing>This exhibit has no address to load.</Missing>;

    return (
        <TouchableOpacity style={s.externalButton} onPress={open} activeOpacity={0.85}>
            <Ionicons name="open-outline" size={17} color={GOLD} />
            <Text style={s.externalButtonText}>Open the exhibit</Text>
        </TouchableOpacity>
    );
}

function Missing({ children }: { children: ReactNode }) {
    return (
        <View style={s.missing}>
            <Text style={s.missingText}>{children}</Text>
        </View>
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

    intro: { marginBottom: 22 },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 2,
        backgroundColor: '#c9a84c15',
        borderWidth: 1,
        borderColor: '#c9a84c33',
        marginBottom: 12,
    },
    badgeText: {
        color: GOLD,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
    },
    title: { color: '#fff', fontSize: 27, fontWeight: '700', lineHeight: 33 },
    summary: { color: '#e0e0e0', fontSize: 15, lineHeight: 23, marginTop: 10 },

    piece: { marginBottom: 24 },
    embed: { height: 540, borderRadius: 2, overflow: 'hidden', backgroundColor: CARD },
    web: { flex: 1, backgroundColor: CARD },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CARD,
    },

    source: {
        borderLeftWidth: 3,
        borderLeftColor: GOLD,
        paddingLeft: 14,
        marginBottom: 26,
    },
    passage: { color: '#e8e0d0', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
    citation: { color: GOLD, fontSize: 12, fontWeight: '600', marginTop: 8 },

    section: { marginBottom: 24 },
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
    chipText: { color: '#e0d5b5', fontSize: 13 },
    forthcoming: { color: '#888', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

    agoraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#c9a84c55',
        backgroundColor: '#c9a84c0d',
    },
    agoraButtonText: { color: GOLD, fontSize: 14, fontWeight: '600' },

    externalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        marginBottom: 24,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#c9a84c55',
        backgroundColor: '#c9a84c0d',
    },
    externalButtonText: { color: GOLD, fontSize: 14, fontWeight: '600' },

    missing: {
        padding: 18,
        marginBottom: 24,
        borderRadius: 2,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: '#ffffff12',
    },
    missingText: { color: '#888', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

    discussion: { marginTop: 34, borderTopWidth: 1, borderTopColor: '#ffffff0d', paddingTop: 24 },
});
