import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_BASE_URL } from '../../services/claudeService';
import {
    ANCHOR_CHARS, CorpusGateError, HANDLE_RE, type LibComment, type Viewer,
    askCorpus, deleteComment, foldText, getViewer, loadComments, postComment, relativeTime, saveHandle, threadsFor,
} from '../../lib/libraryComments';

interface ReaderPage {
    author: string;
    work: string;
    title: string;
    era: string;
    translator: string | null;
    page: number;
    totalPages: number;
    totalPassages: number;
    body: string;
}

interface OutlineSection {
    label: string;
    page: number;
    level?: number;
    key?: string;
    marker?: string;
}

interface SearchHit {
    author: string;
    work: string;
    title: string;
    section: string | null;
    page: number;
    snippet: string;
}

// Where to land once a folio has loaded: a paragraph by index, by the heading
// it opens with, or by the words a search hit carried.
type Jump = { page: number; para?: number; marker?: string; query?: string; snippet?: string; open?: boolean };
type View_ = 'scroll' | 'book';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const VIEW_KEY = 'lib-reader-view';

// Standalone section headings from the server's reader pipeline ("CHAP. XV.",
// "OF SORROW", "Chapter IV."): short, and either all caps or a bare marker.
const isHeading = (p: string) =>
    p.length <= 72 && (!/[a-z]/.test(p) || /^(Chapter|Book|Letter|Part|Section)\s+[IVXLCDM0-9]+\.?$/.test(p));

// A drop cap opens a chapter: the first prose paragraph after a heading, or
// the first paragraph of the work. Never a folio's first paragraph when it
// merely continues a sentence from the previous folio.
const dropCap = (paras: string[], i: number, page: number) => {
    const p = paras[i];
    if (!p || isHeading(p) || !/^[“"']?[A-Z]/.test(p)) return false;
    if (i === 0) return page === 0;
    return isHeading(paras[i - 1]);
};

/**
 * The reader: one work from the Reading Room, paginated by the server
 * (/api/library/text, 30 passages per folio). Paragraph by paragraph, with a
 * linked outline, in-work search that lands on the line, a book (paper)
 * view, and marginalia: readers' notes on any paragraph, with replies, and
 * the corpus weighing in when asked.
 */
export default function LibraryReaderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ author: string; work: string; title?: string; page?: string; p?: string }>();
    const [pageData, setPageData] = useState<ReaderPage | null>(null);
    const [page, setPage] = useState(() => Math.max(0, parseInt(String(params.page ?? '0'), 10) || 0));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    const author = String(params.author || '');
    const work = String(params.work || '');
    const paras = useMemo(() => (pageData ? pageData.body.split(/\n\n+/).filter(Boolean) : []), [pageData]);

    // ---- view: scroll (dark) or book (paper) ----
    const [view, setView] = useState<View_>('scroll');
    useEffect(() => {
        AsyncStorage.getItem(VIEW_KEY).then(v => { if (v === 'book' || v === 'scroll') setView(v); }).catch(() => {});
    }, []);
    const toggleView = () => {
        const v: View_ = view === 'book' ? 'scroll' : 'book';
        setView(v);
        AsyncStorage.setItem(VIEW_KEY, v).catch(() => {});
    };
    const book = view === 'book';
    const T = book ? PAPER : INK;

    // ---- the folio ----
    const pendingJump = useRef<Jump | null>(
        params.p !== undefined && /^\d+$/.test(String(params.p)) ? { page, para: parseInt(String(params.p), 10) } : null
    );
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!author || !work) {
                setError('This text could not be found.');
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const url = `${API_BASE_URL}/api/library/text?author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}&page=${page}`;
                const res = await fetch(url);
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (!res.ok) {
                    setError(data?.error || 'The text could not be opened.');
                    return;
                }
                setError(null);
                setPageData(data);
                if (!pendingJump.current) scrollRef.current?.scrollTo({ y: 0, animated: false });
            } catch {
                if (!cancelled) setError('The text could not be opened.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [author, work, page]);

    // ---- landing on a paragraph ----
    const layoutY = useRef<Map<number, number>>(new Map());
    const [flashPara, setFlashPara] = useState<number | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollToPara = useCallback((i: number) => {
        const y = layoutY.current.get(i);
        if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
        setFlashPara(i);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlashPara(null), 2400);
    }, []);

    // Which paragraph on the open folio a jump means.
    const resolvePara = useCallback((j: Jump, ps: string[]): number | null => {
        if (typeof j.para === 'number') return j.para < ps.length ? j.para : null;
        if (j.marker) {
            const m = foldText(j.marker).replace(/\.$/, '');
            const i = ps.findIndex(p => { const f = foldText(p).replace(/\.$/, ''); return f === m || f.startsWith(m + ' ') || f.startsWith(m + '.'); });
            if (i >= 0) return i;
        }
        if (j.query) {
            const q = foldText(j.query);
            const cands = ps.map((p, i) => (foldText(p).includes(q) ? i : -1)).filter(i => i >= 0);
            if (cands.length === 1 || !j.snippet) return cands[0] ?? null;
            const snip = foldText(j.snippet);
            const windows: string[] = [];
            for (let k = 0; k + 14 <= snip.length; k += 7) windows.push(snip.slice(k, k + 14));
            let best = cands[0], bestScore = -1;
            for (const i of cands) {
                const f = foldText(ps[i]);
                const score = windows.filter(w => f.includes(w)).length;
                if (score > bestScore) { best = i; bestScore = score; }
            }
            return best;
        }
        return null;
    }, []);

    // Once the folio is in, turn the pending jump into a paragraph index; the
    // scroll itself happens when that paragraph reports its layout. Refs, not
    // state: native layout events can arrive before a re-render would.
    const jumpTarget = useRef<{ para: number; open: boolean } | null>(null);
    const takeJump = useCallback(() => {
        const j = pendingJump.current;
        if (!j || !pageData || pageData.page !== j.page) return;
        pendingJump.current = null;
        const i = resolvePara(j, paras);
        if (i !== null) jumpTarget.current = { para: i, open: !!j.open };
    }, [pageData, paras, resolvePara]);
    useEffect(() => { layoutY.current = new Map(); takeJump(); }, [pageData, view, takeJump]);
    const onParaLayout = (i: number, y: number) => {
        layoutY.current.set(i, y);
        takeJump();
        const t = jumpTarget.current;
        if (t && t.para === i) {
            jumpTarget.current = null;
            setTimeout(() => {
                scrollToPara(i);
                if (t.open) setSelectedPara(i);
            }, 60);
        }
    };

    const jumpTo = (j: Jump) => {
        setOutlineVisible(false);
        setSearchVisible(false);
        if (pageData && pageData.page === j.page && !loading) {
            const i = resolvePara(j, paras);
            if (i !== null) { scrollToPara(i); if (j.open) setSelectedPara(i); }
            return;
        }
        pendingJump.current = j;
        setPage(j.page);
    };

    // ---- outline ----
    const [outlineVisible, setOutlineVisible] = useState(false);
    const [outline, setOutline] = useState<OutlineSection[] | null>(null);
    const [outlineLoading, setOutlineLoading] = useState(false);
    const openOutline = async () => {
        setOutlineVisible(true);
        if (outline || outlineLoading) return;
        setOutlineLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/library/outline?author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}`);
            const data = await res.json().catch(() => ({}));
            setOutline(Array.isArray(data?.sections) ? data.sections : []);
        } catch {
            setOutline([]);
        } finally {
            setOutlineLoading(false);
        }
    };
    const currentSectionIndex = outline ? outline.reduce((acc, s, i) => (s.page <= page ? i : acc), -1) : -1;

    // ---- search into the whole work ----
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeQuery, setActiveQuery] = useState('');   // marked on the folio after a jump
    const runSearch = async () => {
        const q = searchQuery.trim();
        if (q.length < 3 || searchLoading) return;
        setSearchLoading(true);
        setSearchHits(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/library/search?q=${encodeURIComponent(q)}&author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}`);
            const data = await res.json().catch(() => ({}));
            setSearchHits(Array.isArray(data?.results) ? data.results : []);
        } catch {
            setSearchHits([]);
        } finally {
            setSearchLoading(false);
        }
    };
    const foldedQuery = foldText(activeQuery.trim());

    // ---- marginalia ----
    const [comments, setComments] = useState<LibComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const [selectedPara, setSelectedPara] = useState<number | null>(null);
    useEffect(() => { getViewer().then(setViewer).catch(() => {}); }, []);
    // Notes load per folio; bumping the version re-reads after a write.
    const [commentsVersion, setCommentsVersion] = useState(0);
    const reloadComments = useCallback(async () => { setCommentsVersion(v => v + 1); }, []);
    useEffect(() => {
        if (!author || !work) return;
        let cancelled = false;
        (async () => {
            setCommentsLoading(true);
            try {
                const rows = await loadComments(author, work, page);
                if (!cancelled) setComments(rows);
            } catch {
                if (!cancelled) setComments([]);
            } finally {
                if (!cancelled) setCommentsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [author, work, page, commentsVersion]);

    // Seat each note on its paragraph, checking the opening words it was
    // written on; if the folio was re-paragraphed, find those words again.
    const seated = useMemo(() => {
        if (!paras.length) return comments;
        const starts = paras.map(p => foldText(p.slice(0, ANCHOR_CHARS)));
        return comments.map(c => {
            const a = foldText(c.anchor_text || '');
            if (!a) return c;
            const here = starts[c.para_index];
            if (here && (here.startsWith(a.slice(0, 40)) || a.startsWith(here.slice(0, 40)))) return c;
            const moved = starts.findIndex(s => s.startsWith(a.slice(0, 40)));
            return moved >= 0 ? { ...c, para_index: moved } : c;
        });
    }, [comments, paras]);
    const countsByPara = useMemo(() => {
        const m = new Map<number, number>();
        for (const c of seated) m.set(c.para_index, (m.get(c.para_index) || 0) + 1);
        return m;
    }, [seated]);

    const title = pageData?.title || String(params.title || work);
    const totalPages = pageData?.totalPages || 1;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]}>
            <View style={[styles.header, { borderBottomColor: T.rule }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={T.gold} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: T.title }]} numberOfLines={1}>{title}</Text>
                <TouchableOpacity onPress={toggleView} style={styles.headerButton} hitSlop={8} accessibilityLabel={book ? 'Scroll view' : 'Book view'}>
                    <Ionicons name={book ? 'reader-outline' : 'book-outline'} size={20} color={T.gold} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="search-outline" size={20} color={T.gold} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openOutline} style={styles.headerButton} hitSlop={8}>
                    <Ionicons name="list-outline" size={22} color={T.gold} />
                </TouchableOpacity>
            </View>

            {totalPages > 1 && (
                <View style={[styles.progressTrack, { backgroundColor: T.track }]}>
                    <View style={[styles.progressFill, { width: `${((page + 1) / totalPages) * 100}%`, backgroundColor: T.gold }]} />
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={T.gold} />
                    <Text style={[styles.loadingText, { color: T.muted }]}>{book ? 'Turning the page…' : 'Pulling the text from the shelf…'}</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="book-outline" size={48} color="#c9a84c33" />
                    <Text style={[styles.errorText, { color: T.muted }]}>{error}</Text>
                </View>
            ) : pageData ? (
                <>
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={[styles.content, book && styles.contentBook]}
                        showsVerticalScrollIndicator={false}
                    >
                        {book ? (
                            <View style={styles.runningHead}>
                                <Text style={[styles.runningHeadText, { color: T.muted }]} numberOfLines={1}>{pageData.author}</Text>
                                <Text style={[styles.runningHeadText, { color: T.muted }]} numberOfLines={1}>{pageData.title}</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.author, { color: T.gold }]}>{pageData.author}</Text>
                                <Text style={[styles.title, { color: T.title }]}>{pageData.title}</Text>
                                <Text style={[styles.meta, { color: T.muted }]}>
                                    {pageData.era}
                                    {pageData.translator ? `  ·  trans. ${pageData.translator}` : ''}
                                </Text>
                                <View style={[styles.divider, { backgroundColor: T.rule }]} />
                            </>
                        )}

                        {paras.map((p, i) => (
                            <Paragraph
                                key={`${page}-${i}`}
                                i={i}
                                text={p}
                                q={foldedQuery}
                                count={countsByPara.get(i) || 0}
                                flash={flashPara === i}
                                book={book}
                                drop={book && dropCap(paras, i, page)}
                                theme={T}
                                onLayout={y => onParaLayout(i, y)}
                                onNote={() => setSelectedPara(i)}
                            />
                        ))}

                        {book && (
                            <Text style={[styles.folioFoot, { color: T.muted }]}>folio {page + 1} of {totalPages}</Text>
                        )}
                        {activeQuery ? (
                            <TouchableOpacity onPress={() => setActiveQuery('')} style={{ alignSelf: 'center', marginTop: 8 }}>
                                <Text style={[styles.clearMarks, { color: T.muted }]}>clear search marks</Text>
                            </TouchableOpacity>
                        ) : null}
                    </ScrollView>

                    {totalPages > 1 && (
                        <View style={[styles.pager, { borderTopColor: T.rule }]}>
                            <TouchableOpacity
                                style={[styles.pagerButton, page === 0 && styles.pagerButtonDisabled]}
                                disabled={page === 0}
                                onPress={() => setPage(p => Math.max(0, p - 1))}
                                hitSlop={8}
                            >
                                <Ionicons name="chevron-back" size={18} color={page === 0 ? T.disabled : T.gold} />
                                <Text style={[styles.pagerText, { color: page === 0 ? T.disabled : T.gold }]}>Prev</Text>
                            </TouchableOpacity>
                            <Text style={[styles.pagerLabel, { color: T.muted }]}>
                                Folio {page + 1} of {totalPages}{seated.length ? `  ·  ${seated.length} note${seated.length === 1 ? '' : 's'}` : ''}
                            </Text>
                            <TouchableOpacity
                                style={[styles.pagerButton, page >= totalPages - 1 && styles.pagerButtonDisabled]}
                                disabled={page >= totalPages - 1}
                                onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                hitSlop={8}
                            >
                                <Text style={[styles.pagerText, { color: page >= totalPages - 1 ? T.disabled : T.gold }]}>Next</Text>
                                <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? T.disabled : T.gold} />
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            ) : null}

            {/* ── Outline (linked table of contents) ─────────────────── */}
            <Modal visible={outlineVisible} transparent animationType="slide" onRequestClose={() => setOutlineVisible(false)}>
                <View style={styles.sheetBackdrop}>
                    <TouchableOpacity style={styles.sheetDismiss} onPress={() => setOutlineVisible(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Contents</Text>
                        {outlineLoading ? (
                            <ActivityIndicator color="#c9a84c" style={{ marginVertical: 24 }} />
                        ) : outline && outline.length > 0 ? (
                            <FlatList
                                data={outline}
                                keyExtractor={(item, i) => item.key || `${item.label}-${i}`}
                                initialNumToRender={30}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={[styles.outlineRow, index === currentSectionIndex && styles.outlineRowActive]}
                                        onPress={() => jumpTo({ page: item.page, marker: item.marker })}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.outlineLabel,
                                                (item.level || 1) > 1 && styles.outlineLabelSub,
                                                index === currentSectionIndex && styles.outlineLabelActive,
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {item.label}
                                        </Text>
                                        <Text style={styles.outlinePage}>{item.page + 1}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <Text style={styles.sheetEmpty}>
                                This text carries no section markers. Move by folio or search instead.
                            </Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── In-work search ─────────────────────────────────────── */}
            <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
                    <TouchableOpacity style={styles.sheetDismiss} onPress={() => setSearchVisible(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Search this text</Text>
                        <View style={styles.searchRow}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="A phrase, a theme, a word…"
                                placeholderTextColor="#555"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={runSearch}
                                returnKeyType="search"
                                autoFocus
                            />
                            <TouchableOpacity style={styles.searchButton} onPress={runSearch} disabled={searchQuery.trim().length < 3}>
                                <Ionicons name="search" size={18} color={searchQuery.trim().length < 3 ? '#555' : '#1a1a2e'} />
                            </TouchableOpacity>
                        </View>
                        {searchLoading ? (
                            <ActivityIndicator color="#c9a84c" style={{ marginVertical: 24 }} />
                        ) : searchHits ? (
                            searchHits.length > 0 ? (
                                <>
                                    <Text style={styles.sheetHint}>Tap a passage to go to it, then mark the paragraph to leave a note.</Text>
                                    <FlatList
                                        data={searchHits}
                                        keyExtractor={(_, i) => String(i)}
                                        keyboardShouldPersistTaps="handled"
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.hitRow}
                                                onPress={() => { setActiveQuery(searchQuery.trim()); jumpTo({ page: item.page, query: searchQuery.trim(), snippet: item.snippet }); }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.hitMeta}>
                                                    Folio {item.page + 1}{item.section ? ` · ${item.section}` : ''}
                                                </Text>
                                                <Text style={styles.hitSnippet} numberOfLines={3}>…{item.snippet}…</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </>
                            ) : (
                                <Text style={styles.sheetEmpty}>Nothing found for that in this text.</Text>
                            )
                        ) : null}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Marginalia: the thread on one paragraph ───────────── */}
            <Modal visible={selectedPara !== null} transparent animationType="slide" onRequestClose={() => setSelectedPara(null)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
                    <TouchableOpacity style={styles.sheetDismiss} onPress={() => setSelectedPara(null)} />
                    {selectedPara !== null && (
                        <ThreadSheet
                            paraIndex={selectedPara}
                            paraText={paras[selectedPara] || ''}
                            comments={seated}
                            loading={commentsLoading}
                            viewer={viewer}
                            setViewer={setViewer}
                            onClose={() => setSelectedPara(null)}
                            onPost={async (body, parentId) => {
                                if (!viewer?.handle) return;
                                await postComment({
                                    author, work, page, paraIndex: selectedPara,
                                    anchorText: (paras[selectedPara] || '').slice(0, ANCHOR_CHARS),
                                    quote: null, parentId, userId: viewer.userId, handle: viewer.handle, body,
                                });
                                await reloadComments();
                            }}
                            onDelete={async id => { await deleteComment(id); await reloadComments(); }}
                            onAskCorpus={async () => {
                                const r = await askCorpus({
                                    author, work, page, paraIndex: selectedPara,
                                    anchorText: (paras[selectedPara] || '').slice(0, ANCHOR_CHARS),
                                    passage: paras[selectedPara] || '', quote: null, parentId: null,
                                });
                                await reloadComments();
                                return !!r.existing;
                            }}
                            onUpgrade={() => { setSelectedPara(null); router.push({ pathname: '/paywall', params: { src: 'library_margin_note' } } as any); }}
                        />
                    )}
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------

type Theme = typeof INK;
const INK = {
    bg: '#1a1a2e', title: '#ffffff', text: '#e8e8ee', textFirst: '#f4ead5', muted: '#7d7f88', gold: '#c9a84c',
    heading: '#c9a84c', rule: '#c9a84c33', track: '#2a2a3e', disabled: '#555', mark: '#c9a84c55',
    flash: '#c9a84c2a', num: '#5a5c66', badgeBg: '#c9a84c1a', badgeBorder: '#c9a84c55',
};
const PAPER = {
    bg: '#f6efe0', title: '#2b2416', text: '#2b2416', textFirst: '#2b2416', muted: '#7a6a4a', gold: '#6b4e14',
    heading: '#6b4e14', rule: '#6b4e1433', track: '#e6dcc6', disabled: '#b5a88c', mark: '#c98c1e55',
    flash: '#c98c1e33', num: '#a89877', badgeBg: '#6b4e1414', badgeBorder: '#6b4e1455',
};

// Wrap each occurrence of the folded query in a marked span.
function highlight(text: string, q: string, markStyle: object): ReactNode {
    if (!q || q.length < 2) return text;
    const folded = foldText(text);
    if (folded.length !== text.length) return text;
    const out: ReactNode[] = [];
    let at = 0, k = 0;
    for (;;) {
        const i = folded.indexOf(q, at);
        if (i < 0) break;
        if (i > at) out.push(text.slice(at, i));
        out.push(<Text key={k++} style={markStyle}>{text.slice(i, i + q.length)}</Text>);
        at = i + q.length;
    }
    if (at < text.length) out.push(text.slice(at));
    return out;
}

function Paragraph(props: {
    i: number; text: string; q: string; count: number; flash: boolean; book: boolean; drop: boolean; theme: Theme;
    onLayout: (y: number) => void; onNote: () => void;
}) {
    const { i, text, q, count, flash, book, drop, theme: T, onLayout, onNote } = props;
    const heading = isHeading(text);
    const markStyle = { backgroundColor: T.mark };
    if (heading) {
        return (
            <View onLayout={e => onLayout(e.nativeEvent.layout.y)} style={[styles.headingWrap, flash && { backgroundColor: T.flash }]}>
                <Text style={[styles.heading, { color: T.heading }]}>{highlight(text, q, markStyle)}</Text>
            </View>
        );
    }
    const body = book ? styles.bodyBook : styles.body;
    const color = i === 0 && !book ? T.textFirst : T.text;
    return (
        <View onLayout={e => onLayout(e.nativeEvent.layout.y)} style={[styles.para, flash && { backgroundColor: T.flash }]}>
            <View style={styles.gutter}>
                <Text style={[styles.paraNum, { color: T.num }]}>{i + 1}</Text>
                <TouchableOpacity
                    onPress={onNote}
                    hitSlop={10}
                    style={[styles.noteBadge, count > 0 && { backgroundColor: T.badgeBg, borderColor: T.badgeBorder }]}
                    accessibilityLabel={count ? `${count} notes, open` : 'Leave a note on this paragraph'}
                >
                    {count > 0
                        ? <Text style={[styles.noteBadgeText, { color: T.gold }]}>✎ {count}</Text>
                        : <Ionicons name="add" size={14} color={T.num} />}
                </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[body, { color }]} selectable>
                    {drop ? (
                        <>
                            <Text style={[styles.dropCap, { color: T.heading }]}>{text.charAt(0)}</Text>
                            {highlight(text.slice(1), q, markStyle)}
                        </>
                    ) : highlight(text, q, markStyle)}
                </Text>
            </View>
        </View>
    );
}

function ThreadSheet(props: {
    paraIndex: number; paraText: string; comments: LibComment[]; loading: boolean;
    viewer: Viewer | null; setViewer: (v: Viewer) => void; onClose: () => void;
    onPost: (body: string, parentId: string | null) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAskCorpus: () => Promise<boolean>;
    onUpgrade: () => void;
}) {
    const { paraIndex, paraText, comments, loading, viewer, setViewer, onClose, onPost, onDelete, onAskCorpus, onUpgrade } = props;
    const threads = useMemo(() => threadsFor(comments, paraIndex), [comments, paraIndex]);
    const [draft, setDraft] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);
    const [posting, setPosting] = useState(false);
    const [asking, setAsking] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [gated, setGated] = useState(false);
    const [handleDraft, setHandleDraft] = useState('');

    const excerpt = paraText.length > 200 ? paraText.slice(0, 200).replace(/\s+\S*$/, '') + '…' : paraText;
    const canDelete = (c: LibComment) => !!viewer && (c.user_id === viewer.userId || (c.is_corpus && c.requested_by === viewer.userId));

    const submit = async () => {
        const b = draft.trim();
        if (!b || posting) return;
        setPosting(true); setErr(null);
        try { await onPost(b, replyTo?.id ?? null); setDraft(''); setReplyTo(null); }
        catch (e) { setErr(e instanceof Error ? e.message : 'Could not save your note.'); }
        finally { setPosting(false); }
    };
    const ask = async () => {
        if (asking) return;
        setAsking(true); setErr(null); setGated(false);
        try { const existed = await onAskCorpus(); if (existed) setErr('The corpus already wrote here.'); }
        catch (e) {
            if (e instanceof CorpusGateError) setGated(true);
            else setErr(e instanceof Error ? e.message : 'The corpus is silent just now.');
        }
        finally { setAsking(false); }
    };
    const chooseHandle = async () => {
        const h = handleDraft.trim();
        if (!viewer) return;
        if (!HANDLE_RE.test(h)) { setErr('A handle is 3 to 20 letters, numbers, or underscores.'); return; }
        setPosting(true); setErr(null);
        try { await saveHandle(viewer.userId, h); setViewer({ ...viewer, handle: h }); }
        catch { setErr('That handle could not be saved. It may already be taken.'); }
        finally { setPosting(false); }
    };
    const confirmDelete = (c: LibComment) => {
        Alert.alert('Remove this note?', c.parent_id ? undefined : 'Replies to it will be removed too.', [
            { text: 'Keep', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => { onDelete(c.id).catch(() => setErr('Could not remove the note.')); } },
        ]);
    };

    return (
        <View style={[styles.sheet, { maxHeight: '86%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeadRow}>
                <Text style={styles.sheetTitle}>Notes on ¶ {paraIndex + 1}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={20} color="#888" /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.passageBox}>
                    <Text style={styles.passageLabel}>The passage</Text>
                    <Text style={styles.passageText}>{excerpt}</Text>
                    <TouchableOpacity style={[styles.askCorpus, asking && { opacity: 0.6 }]} onPress={ask} disabled={asking}>
                        <Text style={styles.askCorpusText}>{asking ? '✶  The corpus is reading…' : '✶  Ask the corpus'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.askHint}>the whole tradition weighs in, citing its shelves</Text>
                    {gated && (
                        <TouchableOpacity onPress={onUpgrade} style={styles.gateRow}>
                            <Text style={styles.gateText}>Asking the corpus to write in the margin is an Arete Premium feature. Reading and commenting are always free.  <Text style={{ color: '#c9a84c', textDecorationLine: 'underline' }}>See Premium</Text></Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading && threads.length === 0 && <ActivityIndicator color="#c9a84c" style={{ marginVertical: 16 }} />}
                {!loading && threads.length === 0 && (
                    <Text style={styles.sheetEmpty}>No notes here yet. If this passage struck you, say why, for the next reader.</Text>
                )}
                {threads.map(t => (
                    <View key={t.root.id} style={styles.thread}>
                        <NoteRow c={t.root} mine={canDelete(t.root)} onReply={() => setReplyTo({ id: t.root.id, handle: t.root.handle })} onDelete={() => confirmDelete(t.root)} />
                        {t.replies.map(r => (
                            <NoteRow key={r.id} c={r} reply mine={canDelete(r)} onReply={() => { setReplyTo({ id: t.root.id, handle: r.handle }); setDraft(d => d || `@${r.handle} `); }} onDelete={() => confirmDelete(r)} />
                        ))}
                    </View>
                ))}
                <View style={{ height: 8 }} />
            </ScrollView>

            {/* composer */}
            <View style={styles.composer}>
                {viewer && !viewer.handle ? (
                    <>
                        <Text style={styles.composerHint}>Choose the handle other readers will see beside your notes.</Text>
                        <View style={styles.searchRow}>
                            <TextInput style={styles.searchInput} value={handleDraft} onChangeText={setHandleDraft} placeholder="your_handle" placeholderTextColor="#555" autoCapitalize="none" maxLength={20} onSubmitEditing={chooseHandle} />
                            <TouchableOpacity style={styles.searchButton} onPress={chooseHandle} disabled={posting}><Ionicons name="checkmark" size={18} color="#1a1a2e" /></TouchableOpacity>
                        </View>
                    </>
                ) : viewer ? (
                    <>
                        {replyTo && (
                            <View style={styles.replyingRow}>
                                <Text style={styles.replyingText}>Replying to {replyTo.handle}</Text>
                                <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={8}><Ionicons name="close" size={16} color="#888" /></TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.searchRow}>
                            <TextInput
                                style={[styles.searchInput, styles.composerInput]}
                                value={draft}
                                onChangeText={setDraft}
                                placeholder={replyTo ? 'Your reply…' : 'What does this say to you, and why does it matter?'}
                                placeholderTextColor="#555"
                                multiline
                            />
                            <TouchableOpacity style={[styles.searchButton, (!draft.trim() || posting) && { opacity: 0.4 }]} onPress={submit} disabled={!draft.trim() || posting}>
                                <Ionicons name="arrow-up" size={18} color="#1a1a2e" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.composerHint}>as {viewer.handle} · public</Text>
                    </>
                ) : (
                    <Text style={styles.composerHint}>Sign in to write in the margin.</Text>
                )}
                {err && <Text style={styles.errText}>{err}</Text>}
            </View>
        </View>
    );
}

function NoteRow({ c, reply, mine, onReply, onDelete }: { c: LibComment; reply?: boolean; mine: boolean; onReply: () => void; onDelete: () => void }) {
    const corpus = !!c.is_corpus;
    return (
        <View style={[styles.note, reply && styles.noteReply, corpus && styles.noteCorpus]}>
            <View style={styles.noteMeta}>
                <Text style={[styles.noteHandle, (corpus || mine) && { color: '#c9a84c' }]}>{corpus ? '✶ The Corpus' : c.handle}</Text>
                <Text style={styles.noteTime}>{relativeTime(c.created_at)}</Text>
            </View>
            {c.quote && !reply ? <Text style={styles.noteQuote}>“{c.quote}”</Text> : null}
            <Text style={[styles.noteBody, corpus && { color: '#f4ead5' }]}>{c.body}</Text>
            {corpus && c.sources && c.sources.length > 0 && (
                <Text style={styles.noteSources}>drawing on {c.sources.map(s => `${s.author}, ${s.title}`).join(' · ')}</Text>
            )}
            <View style={styles.noteActions}>
                <TouchableOpacity onPress={onReply} hitSlop={6}><Text style={styles.noteAction}>reply</Text></TouchableOpacity>
                {mine && <TouchableOpacity onPress={onDelete} hitSlop={6}><Text style={styles.noteAction}>remove</Text></TouchableOpacity>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 2,
    },
    headerButton: { padding: 4 },
    headerTitle: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center', paddingHorizontal: 4 },
    progressTrack: { height: 2 },
    progressFill: { height: 2 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    loadingText: { fontSize: 14, fontStyle: 'italic' },
    errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
    content: { padding: 24, paddingLeft: 14, paddingBottom: 40 },
    contentBook: { paddingTop: 12 },
    author: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 10 },
    title: { fontSize: 24, fontWeight: '600', textAlign: 'center', lineHeight: 32, fontFamily: SERIF },
    meta: { fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
    divider: { height: 1, marginVertical: 22, alignSelf: 'center', width: '40%' },
    runningHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 18, paddingLeft: 40 },
    runningHeadText: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', flexShrink: 1 },
    folioFoot: { fontFamily: MONO, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', textAlign: 'center', marginTop: 16 },
    clearMarks: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', textDecorationLine: 'underline' },

    para: { flexDirection: 'row', gap: 6, marginBottom: 18, borderRadius: 6, paddingVertical: 2 },
    gutter: { width: 34, alignItems: 'flex-end', paddingTop: 4, gap: 4 },
    paraNum: { fontFamily: MONO, fontSize: 9, letterSpacing: 0.5 },
    noteBadge: { minWidth: 26, height: 22, borderRadius: 7, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    noteBadgeText: { fontFamily: MONO, fontSize: 10, fontWeight: '700' },
    body: { fontSize: 17, lineHeight: 29, fontFamily: SERIF },
    bodyBook: { fontSize: 17, lineHeight: 27, fontFamily: SERIF, textAlign: 'justify' },
    dropCap: { fontSize: 40, lineHeight: 40, fontWeight: '600', fontFamily: SERIF },
    headingWrap: { marginTop: 22, marginBottom: 10, paddingLeft: 40, borderRadius: 6 },
    heading: { fontFamily: MONO, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase' },

    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1 },
    pagerButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
    pagerButtonDisabled: { opacity: 0.6 },
    pagerText: { fontSize: 14, fontWeight: '600' },
    pagerLabel: { fontSize: 12 },

    // Bottom sheets (outline, search, thread)
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheetDismiss: { flex: 1 },
    sheet: {
        backgroundColor: '#16213e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderColor: '#c9a84c33',
        paddingHorizontal: 18,
        paddingBottom: 28,
        maxHeight: '70%',
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3a3a4e', alignSelf: 'center', marginTop: 10, marginBottom: 12 },
    sheetHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetTitle: { color: '#c9a84c', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
    sheetHint: { color: '#777', fontSize: 12, fontStyle: 'italic', marginBottom: 6 },
    sheetEmpty: { color: '#888', fontSize: 14, lineHeight: 21, paddingVertical: 16, fontStyle: 'italic' },
    outlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#ffffff0a', gap: 12 },
    outlineRowActive: { backgroundColor: '#c9a84c11', marginHorizontal: -18, paddingHorizontal: 18 },
    outlineLabel: { color: '#e0d5b5', fontSize: 15, flex: 1, fontFamily: SERIF },
    outlineLabelSub: { paddingLeft: 16, fontSize: 13.5, color: '#9a9280' },
    outlineLabelActive: { color: '#c9a84c', fontWeight: '600' },
    outlinePage: { color: '#666', fontSize: 11, fontFamily: MONO },
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' },
    searchInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, borderWidth: 1, borderColor: '#c9a84c33', color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 10 },
    searchButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
    hitRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff0a' },
    hitMeta: { color: '#c9a84c', fontSize: 11, fontWeight: '700', marginBottom: 4 },
    hitSnippet: { color: '#bbb', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

    // Thread sheet
    passageBox: { borderLeftWidth: 2, borderLeftColor: '#c9a84c', backgroundColor: '#ffffff08', borderTopRightRadius: 10, borderBottomRightRadius: 10, padding: 12, marginBottom: 12 },
    passageLabel: { color: '#888', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
    passageText: { color: '#e8e4d6', fontSize: 14.5, lineHeight: 21, fontFamily: SERIF },
    askCorpus: { alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: '#c9a84c66', backgroundColor: '#c9a84c14', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    askCorpusText: { color: '#c9a84c', fontFamily: MONO, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
    askHint: { color: '#777', fontSize: 12, fontStyle: 'italic', marginTop: 5 },
    gateRow: { marginTop: 8 },
    gateText: { color: '#aaa', fontSize: 13, lineHeight: 19 },
    thread: { borderTopWidth: 1, borderTopColor: '#c9a84c1f', paddingTop: 10, marginBottom: 6 },
    note: { marginBottom: 8 },
    noteReply: { marginLeft: 14, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#c9a84c33' },
    noteCorpus: { backgroundColor: '#c9a84c12', borderWidth: 1, borderColor: '#c9a84c44', borderRadius: 10, padding: 10 },
    noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    noteHandle: { color: '#f4ead5', fontFamily: MONO, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
    noteTime: { color: '#777', fontFamily: MONO, fontSize: 9, letterSpacing: 0.5 },
    noteQuote: { color: '#c9a84c', fontStyle: 'italic', fontSize: 13.5, lineHeight: 19, marginBottom: 4, fontFamily: SERIF },
    noteBody: { color: '#e8e4d6', fontSize: 15, lineHeight: 22, fontFamily: SERIF },
    noteSources: { color: '#8a8b8e', fontFamily: MONO, fontSize: 9, letterSpacing: 0.6, marginTop: 6, lineHeight: 14 },
    noteActions: { flexDirection: 'row', gap: 14, marginTop: 4 },
    noteAction: { color: '#8a8b8e', fontFamily: MONO, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', textDecorationLine: 'underline' },
    composer: { borderTopWidth: 1, borderTopColor: '#c9a84c1f', paddingTop: 10 },
    composerInput: { minHeight: 44, maxHeight: 120, paddingTop: 12 },
    composerHint: { color: '#777', fontFamily: MONO, fontSize: 9, letterSpacing: 0.8, marginBottom: 6 },
    replyingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    replyingText: { color: '#c9a84c', fontFamily: MONO, fontSize: 10, letterSpacing: 1 },
    errText: { color: '#e08a7a', fontSize: 13, marginTop: 4 },
});
