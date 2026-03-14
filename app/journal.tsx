import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const STORAGE_KEY = 'unifiedJournalEntries';

export interface UnifiedEntry {
    id: string;
    type: 'reflection' | 'quote' | 'belief' | 'idea';
    content: string;
    createdAt: number;
    updatedAt: number;
    bookTitle?: string;
    author?: string;
    rawInput?: string;
    dialogueHistory?: { role: 'user' | 'cabinet'; content: string; timestamp: number }[];
    encodedBelief?: string;
    virtueConcern?: string | null;
    hasVirtueConcern?: boolean;
    beliefStage?: 1 | 2 | 3 | 'encoded';
    refinedStatement?: string;
    virtueCheck?: { passed: boolean; concern: string | null; virtue: string | null } | null;
    topic?: string;
}

type FilterType = 'all' | 'reflection' | 'quote' | 'belief' | 'idea';

const TYPE_LABELS: Record<string, string> = {
    reflection: '📝 Reflection',
    quote: '📖 Quote',
    belief: '💡 Belief',
    idea: '🧠 Idea',
};

export default function JournalScreen() {
    const router = useRouter();
    const swipeHandlers = useSwipeNavigation('/journal');

    const [entries, setEntries] = useState<UnifiedEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    const [showTypeSelector, setShowTypeSelector] = useState(false);

    const [showInputForm, setShowInputForm] = useState(false);
    const [inputType, setInputType] = useState<'reflection' | 'quote' | 'idea' | null>(null);
    const [editingEntry, setEditingEntry] = useState<UnifiedEntry | null>(null);
    const [textInput, setTextInput] = useState('');
    const [quoteText, setQuoteText] = useState('');
    const [quoteBook, setQuoteBook] = useState('');
    const [quoteAuthor, setQuoteAuthor] = useState('');

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [longPressEntry, setLongPressEntry] = useState<UnifiedEntry | null>(null);
    const [viewingBeliefEntry, setViewingBeliefEntry] = useState<UnifiedEntry | null>(null);
    const [showCanon, setShowCanon] = useState(false);
    const [canonExpandedIds, setCanonExpandedIds] = useState<Set<string>>(new Set());

    useFocusEffect(
        useCallback(() => {
            loadEntries();
        }, [])
    );

    const loadEntries = async () => {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) setEntries(JSON.parse(saved));
        } catch (e) { console.error(e); }
    };

    const saveEntries = async (updated: UnifiedEntry[]) => {
        setEntries(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const filteredEntries = entries
        .filter(e => activeFilter === 'all' || e.type === activeFilter)
        .filter(e => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const text = [e.content, e.bookTitle, e.author, e.topic, e.rawInput, e.encodedBelief]
                .filter(Boolean).join(' ').toLowerCase();
            return text.includes(q);
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    const canonEntries = entries
        .filter(e => e.type === 'belief' && e.beliefStage === 'encoded')
        .sort((a, b) => b.createdAt - a.createdAt);

    const addEntry = async () => {
        if (inputType === 'quote') {
            if (!quoteText.trim() || !quoteBook.trim()) {
                Alert.alert('Required', 'Please enter a quote and book title.');
                return;
            }
            const entry: UnifiedEntry = {
                id: Date.now().toString(),
                type: 'quote',
                content: quoteText.trim(),
                bookTitle: quoteBook.trim(),
                author: quoteAuthor.trim() || undefined,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            await saveEntries([entry, ...entries]);
            resetInputForm();
            return;
        }
        if (!textInput.trim()) return;
        const entry: UnifiedEntry = {
            id: Date.now().toString(),
            type: inputType!,
            content: textInput.trim(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await saveEntries([entry, ...entries]);
        resetInputForm();
    };

    const updateEntry = async () => {
        if (!editingEntry) return;
        let updated: UnifiedEntry;
        if (editingEntry.type === 'quote') {
            if (!quoteText.trim() || !quoteBook.trim()) {
                Alert.alert('Required', 'Please enter a quote and book title.');
                return;
            }
            updated = {
                ...editingEntry,
                content: quoteText.trim(),
                bookTitle: quoteBook.trim(),
                author: quoteAuthor.trim() || undefined,
                updatedAt: Date.now(),
            };
        } else {
            if (!textInput.trim()) return;
            updated = { ...editingEntry, content: textInput.trim(), updatedAt: Date.now() };
        }
        await saveEntries(entries.map(e => e.id === updated.id ? updated : e));
        resetInputForm();
    };

    const deleteEntry = (id: string) => {
        Alert.alert('Delete this entry?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await saveEntries(entries.filter(e => e.id !== id));
                    setLongPressEntry(null);
                }
            },
        ]);
    };

    const resetInputForm = () => {
        setShowInputForm(false);
        setEditingEntry(null);
        setTextInput('');
        setQuoteText(''); setQuoteBook(''); setQuoteAuthor('');
        setInputType(null);
    };

    const openEdit = (entry: UnifiedEntry) => {
        setLongPressEntry(null);
        setEditingEntry(entry);
        if (entry.type === 'quote') {
            setQuoteText(entry.content);
            setQuoteBook(entry.bookTitle || '');
            setQuoteAuthor(entry.author || '');
        } else {
            setTextInput(entry.content);
        }
        setInputType(entry.type as 'reflection' | 'quote' | 'idea');
        setShowInputForm(true);
    };

    const selectType = (type: 'reflection' | 'quote' | 'idea' | 'belief') => {
        setShowTypeSelector(false);
        if (type === 'belief') {
            router.push('/belief-journal' as any);
            return;
        }
        setInputType(type);
        setEditingEntry(null);
        setTextInput(''); setQuoteText(''); setQuoteBook(''); setQuoteAuthor('');
        setShowInputForm(true);
    };

    const formatDate = (ts: number) =>
        new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleCanonExpand = (id: string) => {
        setCanonExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    if (showCanon) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.subScreenHeader}>
                    <TouchableOpacity onPress={() => setShowCanon(false)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                    </TouchableOpacity>
                    <Text style={styles.subScreenTitle}>Canon 📜</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.canonSubtitle}>Beliefs examined and encoded</Text>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {canonEntries.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="shield-checkmark-outline" size={52} color="#c9a84c22" />
                            <Text style={styles.emptyText}>No encoded beliefs yet.</Text>
                            <Text style={styles.emptySubtext}>Complete a belief dialogue to encode your first conviction.</Text>
                        </View>
                    ) : canonEntries.map(entry => {
                        const isExpanded = canonExpandedIds.has(entry.id);
                        const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;
                        return (
                            <View key={entry.id} style={styles.canonCard}>
                                <View style={styles.canonCardTopRow}>
                                    <Text style={styles.canonTopicLabel}>{entry.topic || 'Belief'}</Text>
                                    {virtueOk
                                        ? <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                                        : <Ionicons name="warning" size={18} color="#c9a84c" />
                                    }
                                </View>
                                <Text style={styles.canonBeliefText}>{entry.encodedBelief || entry.content}</Text>
                                <Text style={styles.canonDateText}>{formatDate(entry.createdAt)}</Text>
                                {!virtueOk && entry.virtueCheck?.concern && (
                                    <View style={styles.virtueConcernBadge}>
                                        <Ionicons name="warning-outline" size={14} color="#c9a84c" />
                                        <Text style={styles.virtueConcernText}>
                                            {entry.virtueCheck.virtue
                                                ? entry.virtueCheck.virtue.charAt(0).toUpperCase() + entry.virtueCheck.virtue.slice(1) + ': '
                                                : ''}
                                            {entry.virtueCheck.concern}
                                        </Text>
                                    </View>
                                )}
                                {isExpanded && (
                                    <View style={styles.dialogueHistoryContainer}>
                                        <Text style={styles.dialogueHistoryLabel}>Dialogue History</Text>
                                        {entry.rawInput && (
                                            <View style={styles.rawThoughtCard}>
                                                <Text style={styles.rawThoughtLabel}>Raw Thought</Text>
                                                <Text style={styles.rawThoughtText}>{entry.rawInput}</Text>
                                            </View>
                                        )}
                                        {entry.dialogueHistory?.map((turn, i) => (
                                            <View key={i} style={turn.role === 'cabinet' ? styles.cabinetBubble : styles.userBubble}>
                                                {turn.role === 'cabinet' && <Text style={styles.bubbleRoleLabel}>The Cabinet</Text>}
                                                <Text style={turn.role === 'cabinet' ? styles.cabinetBubbleText : styles.userBubbleText}>
                                                    {turn.content}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <TouchableOpacity style={styles.expandRow} onPress={() => toggleCanonExpand(entry.id)}>
                                    <Text style={styles.expandText}>{isExpanded ? 'Hide dialogue' : 'View dialogue'}</Text>
                                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-forward'} size={14} color="#888" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (viewingBeliefEntry) {
        const entry = viewingBeliefEntry;
        const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.subScreenHeader}>
                    <TouchableOpacity onPress={() => setViewingBeliefEntry(null)} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                    </TouchableOpacity>
                    <Text style={styles.subScreenTitle} numberOfLines={1}>{entry.topic || 'Belief'}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.dialogueViewContent} showsVerticalScrollIndicator={false}>
                    {entry.rawInput && (
                        <View style={styles.rawThoughtCard}>
                            <Text style={styles.rawThoughtLabel}>Raw Thought</Text>
                            <Text style={styles.rawThoughtText}>{entry.rawInput}</Text>
                        </View>
                    )}
                    {entry.dialogueHistory?.map((turn, i) => (
                        <View key={i} style={turn.role === 'cabinet' ? styles.cabinetBubble : styles.userBubble}>
                            {turn.role === 'cabinet' && <Text style={styles.bubbleRoleLabel}>The Cabinet</Text>}
                            <Text style={turn.role === 'cabinet' ? styles.cabinetBubbleText : styles.userBubbleText}>
                                {turn.content}
                            </Text>
                        </View>
                    ))}
                    {entry.encodedBelief && (
                        <View style={styles.encodedBeliefCard}>
                            <Text style={styles.encodedBeliefLabel}>Encoded Belief</Text>
                            <Text style={styles.encodedBeliefText}>{entry.encodedBelief}</Text>
                            {!virtueOk && entry.virtueCheck?.concern && (
                                <View style={styles.virtueConcernBadge}>
                                    <Ionicons name="warning-outline" size={14} color="#c9a84c" />
                                    <Text style={styles.virtueConcernText}>
                                        {entry.virtueCheck.virtue
                                            ? entry.virtueCheck.virtue.charAt(0).toUpperCase() + entry.virtueCheck.virtue.slice(1) + ': '
                                            : ''}
                                        {entry.virtueCheck.concern}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (showInputForm && inputType) {
        const isEditing = !!editingEntry;
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.formHeader}>
                        <TouchableOpacity onPress={resetInputForm} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                        </TouchableOpacity>
                        <Text style={styles.formTitle}>
                            {isEditing ? 'Edit' : 'New'} {TYPE_LABELS[inputType]}
                        </Text>
                        <TouchableOpacity style={styles.saveButtonHeader} onPress={isEditing ? updateEntry : addEntry}>
                            <Text style={styles.saveButtonHeaderText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        {inputType === 'quote' ? (
                            <>
                                <TextInput
                                    style={styles.largeInput}
                                    placeholder='"Enter quote..."'
                                    placeholderTextColor="#555"
                                    multiline
                                    autoFocus
                                    value={quoteText}
                                    onChangeText={setQuoteText}
                                    textAlignVertical="top"
                                />
                                <TextInput
                                    style={styles.smallInput}
                                    placeholder="Book title *"
                                    placeholderTextColor="#555"
                                    value={quoteBook}
                                    onChangeText={setQuoteBook}
                                />
                                <TextInput
                                    style={styles.smallInput}
                                    placeholder="Author (optional)"
                                    placeholderTextColor="#555"
                                    value={quoteAuthor}
                                    onChangeText={setQuoteAuthor}
                                />
                            </>
                        ) : (
                            <TextInput
                                style={styles.largeInput}
                                placeholder={inputType === 'reflection' ? "What's on your mind?" : "What seed do you want to keep?"}
                                placeholderTextColor="#555"
                                multiline
                                autoFocus
                                value={textInput}
                                onChangeText={setTextInput}
                                textAlignVertical="top"
                            />
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} {...swipeHandlers}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Journal 📓</Text>
                    <TouchableOpacity onPress={() => setShowCanon(true)} style={styles.canonButton}>
                        <Text style={styles.canonButtonText}>Canon 📜</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={16} color="#888" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search entries..."
                        placeholderTextColor="#555"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color="#888" />
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterBar}
                    contentContainerStyle={styles.filterBarContent}
                >
                    {(['all', 'reflection', 'quote', 'belief', 'idea'] as FilterType[]).map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                            onPress={() => setActiveFilter(prev => prev === f ? 'all' : f)}
                        >
                            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                                {f === 'all' ? 'All'
                                    : f === 'reflection' ? '📝 Reflection'
                                    : f === 'quote' ? '📖 Quote'
                                    : f === 'belief' ? '💡 Belief'
                                    : '🧠 Idea'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.feedContent}
                showsVerticalScrollIndicator={false}
            >
                {filteredEntries.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="book-outline" size={52} color="#c9a84c22" />
                        <Text style={styles.emptyText}>No entries yet.</Text>
                        <Text style={styles.emptySubtext}>Tap + to add your first entry.</Text>
                    </View>
                ) : filteredEntries.map(entry => {
                    const isExpanded = expandedIds.has(entry.id);
                    const isDraft = entry.type === 'belief' && entry.beliefStage !== 'encoded';
                    const displayText = entry.type === 'belief'
                        ? (entry.encodedBelief || entry.rawInput || entry.content)
                        : entry.content;
                    const preview = displayText && displayText.length > 120
                        ? displayText.slice(0, 120) + '...'
                        : displayText;

                    return (
                        <TouchableOpacity
                            key={entry.id}
                            activeOpacity={0.85}
                            onPress={() => {
                                if (entry.type === 'belief') {
                                    if (isDraft) {
                                        router.push({ pathname: '/belief-journal', params: { entryId: entry.id } } as any);
                                    } else {
                                        setViewingBeliefEntry(entry);
                                    }
                                } else {
                                    toggleExpand(entry.id);
                                }
                            }}
                            onLongPress={() => setLongPressEntry(entry)}
                            delayLongPress={500}
                        >
                            <View style={[styles.entryCard, isDraft && styles.draftCard]}>
                                <View style={styles.entryMeta}>
                                    <Text style={styles.typeBadge}>{TYPE_LABELS[entry.type]}</Text>
                                    <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
                                </View>
                                {entry.type === 'quote' ? (
                                    <>
                                        <Text style={[styles.entryContent, isExpanded ? styles.entryContentFull : styles.entryContentPreview]}>
                                            &quot;{entry.content}&quot;
                                        </Text>
                                        {isExpanded ? (
                                            <View style={styles.quoteFooterRow}>
                                                {entry.bookTitle && <Text style={styles.quoteBook}>📖 {entry.bookTitle}</Text>}
                                                {entry.author && <Text style={styles.quoteAuthor}>— {entry.author}</Text>}
                                            </View>
                                        ) : (
                                            entry.bookTitle ? <Text style={styles.quoteBookPreview}>📖 {entry.bookTitle}</Text> : null
                                        )}
                                    </>
                                ) : (
                                    <Text style={[styles.entryContent, isExpanded ? styles.entryContentFull : styles.entryContentPreview]}>
                                        {isExpanded ? displayText : preview}
                                    </Text>
                                )}
                                {isDraft && (
                                    <View style={styles.draftBadge}>
                                        <Text style={styles.draftBadgeText}>Draft · Stage {entry.beliefStage}</Text>
                                        <Text style={styles.continueText}>Tap to continue →</Text>
                                    </View>
                                )}
                                {entry.type === 'belief' && entry.beliefStage === 'encoded'
                                    && entry.virtueCheck && !entry.virtueCheck.passed && (
                                    <View style={styles.virtueConcernBadge}>
                                        <Ionicons name="warning-outline" size={13} color="#c9a84c" />
                                        <Text style={styles.virtueConcernText} numberOfLines={2}>
                                            {entry.virtueCheck.virtue
                                                ? entry.virtueCheck.virtue.charAt(0).toUpperCase() + entry.virtueCheck.virtue.slice(1) + ': '
                                                : ''}
                                            {entry.virtueCheck.concern}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => setShowTypeSelector(true)}>
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>

            <Modal
                visible={showTypeSelector}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTypeSelector(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowTypeSelector(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.typeSelector}>
                                <Text style={styles.typeSelectorTitle}>What are you adding?</Text>
                                {(['reflection', 'quote', 'idea', 'belief'] as const).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={styles.typeSelectorOption}
                                        onPress={() => selectType(t)}
                                    >
                                        <Text style={styles.typeSelectorOptionText}>
                                            {t === 'reflection' ? '📝 Reflection'
                                                : t === 'quote' ? '📖 Quote'
                                                : t === 'idea' ? '🧠 Idea'
                                                : '💡 Belief'}
                                        </Text>
                                        <Text style={styles.typeSelectorOptionDesc}>
                                            {t === 'reflection' ? 'Daily thoughts, free writing'
                                                : t === 'quote' ? 'Passage from a book'
                                                : t === 'idea' ? 'Seed for an essay or project'
                                                : 'Refine a belief with the Cabinet'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTypeSelector(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal
                visible={!!longPressEntry}
                transparent
                animationType="fade"
                onRequestClose={() => setLongPressEntry(null)}
            >
                <TouchableWithoutFeedback onPress={() => setLongPressEntry(null)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.longPressMenu}>
                                <Text style={styles.longPressMenuTitle} numberOfLines={2}>
                                    {longPressEntry
                                        ? (longPressEntry.content.slice(0, 60) + (longPressEntry.content.length > 60 ? '...' : ''))
                                        : ''}
                                </Text>
                                {longPressEntry?.type !== 'belief' && (
                                    <TouchableOpacity
                                        style={styles.menuOption}
                                        onPress={() => longPressEntry && openEdit(longPressEntry)}
                                    >
                                        <Ionicons name="pencil-outline" size={18} color="#c9a84c" />
                                        <Text style={styles.menuOptionText}>Edit</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.menuOption, styles.menuOptionDestructive]}
                                    onPress={() => longPressEntry && deleteEntry(longPressEntry.id)}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                                    <Text style={[styles.menuOptionText, styles.menuOptionTextDestructive]}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setLongPressEntry(null)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    scrollView: { flex: 1 },
    header: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 0 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c' },
    canonButton: {
        backgroundColor: '#c9a84c22', borderRadius: 10,
        paddingVertical: 6, paddingHorizontal: 12,
        borderWidth: 1, borderColor: '#c9a84c44',
    },
    canonButtonText: { color: '#c9a84c', fontSize: 13, fontWeight: '600' },
    searchContainer: {
        backgroundColor: '#16213e', borderRadius: 12, padding: 10,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginBottom: 10, borderWidth: 1, borderColor: '#c9a84c22',
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 14 },
    filterBar: { marginBottom: 6 },
    filterBarContent: { paddingRight: 8, gap: 8, paddingBottom: 10 },
    filterChip: {
        paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
        backgroundColor: '#16213e', borderWidth: 1, borderColor: '#c9a84c22',
    },
    filterChipActive: { backgroundColor: '#c9a84c33', borderColor: '#c9a84c' },
    filterChipText: { color: '#888', fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: '#c9a84c' },
    feedContent: { padding: 16, paddingTop: 10, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: '#888', fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: '#555', fontSize: 14, textAlign: 'center' },
    entryCard: {
        backgroundColor: '#16213e', borderRadius: 14, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#c9a84c22',
    },
    draftCard: { borderColor: '#c9a84c44', borderStyle: 'dashed' },
    entryMeta: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 8,
    },
    typeBadge: { color: '#c9a84c', fontSize: 12, fontWeight: '700' },
    entryDate: { color: '#555', fontSize: 11 },
    entryContent: { fontSize: 14, lineHeight: 22 },
    entryContentPreview: { color: '#ccc' },
    entryContentFull: { color: '#fff' },
    quoteFooterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
    quoteBook: { color: '#c9a84c', fontSize: 12, fontWeight: '600' },
    quoteAuthor: { color: '#888', fontSize: 12 },
    quoteBookPreview: { color: '#c9a84c88', fontSize: 12, marginTop: 4 },
    draftBadge: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#c9a84c22',
    },
    draftBadgeText: { color: '#888', fontSize: 11 },
    continueText: { color: '#c9a84c', fontSize: 12, fontWeight: '600' },
    virtueConcernBadge: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#c9a84c11', borderRadius: 8, padding: 8, marginTop: 8,
    },
    virtueConcernText: { color: '#c9a84c', fontSize: 12, lineHeight: 18, flex: 1 },
    fab: {
        position: 'absolute', bottom: 24, right: 24,
        backgroundColor: '#c9a84c', width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    },
    fabIcon: { color: '#1a1a2e', fontSize: 28, fontWeight: 'bold', lineHeight: 34 },
    modalOverlay: {
        flex: 1, backgroundColor: '#000000aa',
        justifyContent: 'flex-end',
    },
    typeSelector: {
        backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, paddingBottom: 40, gap: 8,
    },
    typeSelectorTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    typeSelectorOption: {
        backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: '#c9a84c22',
    },
    typeSelectorOptionText: { color: '#c9a84c', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    typeSelectorOptionDesc: { color: '#888', fontSize: 13 },
    cancelButton: { padding: 14, alignItems: 'center', marginTop: 4 },
    cancelText: { color: '#888', fontSize: 15 },
    longPressMenu: {
        backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 40, gap: 4,
    },
    longPressMenuTitle: { color: '#888', fontSize: 13, marginBottom: 12, paddingHorizontal: 4 },
    menuOption: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 12, backgroundColor: '#1a1a2e',
    },
    menuOptionDestructive: { backgroundColor: '#ff444411' },
    menuOptionText: { color: '#c9a84c', fontSize: 15, fontWeight: '600' },
    menuOptionTextDestructive: { color: '#ff4444' },
    subScreenHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
    },
    backButton: { padding: 4, width: 40 },
    subScreenTitle: { color: '#c9a84c', fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
    canonSubtitle: { color: '#888', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
    formHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
    },
    formTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    saveButtonHeader: {
        backgroundColor: '#c9a84c', borderRadius: 10,
        paddingVertical: 8, paddingHorizontal: 16,
    },
    saveButtonHeaderText: { color: '#1a1a2e', fontWeight: '700', fontSize: 14 },
    content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
    largeInput: {
        backgroundColor: '#16213e', borderRadius: 14, padding: 16,
        color: '#fff', fontSize: 15, minHeight: 180, lineHeight: 24,
        borderWidth: 1, borderColor: '#c9a84c33', marginBottom: 12,
    },
    smallInput: {
        backgroundColor: '#16213e', borderRadius: 12, padding: 14,
        color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#c9a84c22', marginBottom: 10,
    },
    dialogueViewContent: { padding: 16, paddingBottom: 40 },
    rawThoughtCard: {
        backgroundColor: '#16213e', borderRadius: 12, padding: 14,
        marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#555',
    },
    rawThoughtLabel: {
        color: '#555', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
    },
    rawThoughtText: { color: '#ccc', fontSize: 14, lineHeight: 22 },
    cabinetBubble: {
        backgroundColor: '#16213e', borderRadius: 12, padding: 14,
        marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#c9a84c',
        maxWidth: '90%', alignSelf: 'flex-start',
    },
    bubbleRoleLabel: {
        color: '#c9a84c', fontSize: 10, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
    },
    cabinetBubbleText: { color: '#fff', fontSize: 14, lineHeight: 22 },
    userBubble: {
        backgroundColor: '#1e2a45', borderRadius: 12, padding: 14,
        marginBottom: 12, maxWidth: '90%', alignSelf: 'flex-end',
    },
    userBubbleText: { color: '#fff', fontSize: 14, lineHeight: 22 },
    encodedBeliefCard: {
        backgroundColor: '#1e2a45', borderRadius: 14, padding: 16,
        marginTop: 12, borderWidth: 1, borderColor: '#c9a84c66',
    },
    encodedBeliefLabel: {
        color: '#c9a84c', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    },
    encodedBeliefText: { color: '#fff', fontSize: 15, lineHeight: 24 },
    canonCard: {
        backgroundColor: '#16213e', borderRadius: 14, padding: 18,
        marginBottom: 16, borderWidth: 1, borderColor: '#c9a84c33',
        borderLeftWidth: 3, borderLeftColor: '#c9a84c',
    },
    canonCardTopRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
    },
    canonTopicLabel: {
        color: '#c9a84c', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, flex: 1,
    },
    canonBeliefText: { color: '#fff', fontSize: 17, lineHeight: 28, fontWeight: '500', marginBottom: 10 },
    canonDateText: { color: '#555', fontSize: 11, marginBottom: 8 },
    dialogueHistoryContainer: {
        marginTop: 12, borderTopWidth: 1, borderTopColor: '#c9a84c22', paddingTop: 12,
    },
    dialogueHistoryLabel: {
        color: '#888', fontSize: 11, fontWeight: '700',
        letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
    },
    expandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    expandText: { color: '#888', fontSize: 12 },
});
