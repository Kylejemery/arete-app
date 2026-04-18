import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    Alert,
    Animated,
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
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry, getGoals, upsertGoal, completeGoal } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { Goal } from '@/lib/types';

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

type FilterType = 'all' | 'reflection' | 'quote' | 'idea';

const TYPE_LABELS: Record<string, string> = {
    reflection: '📝 Reflection',
    quote: '📖 Quote',
    idea: '🧠 Idea',
};

export default function JournalScreen() {
    const router = useRouter();
    const swipeHandlers = useSwipeNavigation('/journal');

    // ── Tab ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'journal' | 'goals'>('journal');

    // ── Journal state ────────────────────────────────────────────────────────
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

    // ── Goals state ──────────────────────────────────────────────────────────
    const [goals, setGoals] = useState<Goal[]>([]);
    const [goalsLoading, setGoalsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newTargetDate, setNewTargetDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            loadEntries();
            loadGoals();
        }, [])
    );

    // ── Journal functions ────────────────────────────────────────────────────
    const loadEntries = async () => {
        try {
            const dbEntries = await getJournalEntries();
            const mapped: UnifiedEntry[] = dbEntries
                .filter(e => e.type !== 'belief')
                .map(e => ({
                    id: e.id,
                    type: e.type,
                    content: e.content,
                    createdAt: new Date(e.created_at).getTime(),
                    updatedAt: new Date(e.updated_at).getTime(),
                    bookTitle: e.book_title,
                    author: e.author,
                    rawInput: e.raw_input,
                    dialogueHistory: e.dialogue_history as any,
                    encodedBelief: e.encoded_belief,
                    virtueConcern: e.virtue_check?.concern ?? null,
                    hasVirtueConcern: e.virtue_check ? !e.virtue_check.passed : false,
                    beliefStage: e.belief_stage as any,
                    refinedStatement: e.refined_statement,
                    virtueCheck: e.virtue_check as any,
                    topic: e.topic,
                }));
            setEntries(mapped);
        } catch (e) { console.error(e); }
    };

    const filteredEntries = entries
        .filter(e => activeFilter === 'all' || e.type === activeFilter)
        .filter(e => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const text = [e.content, e.bookTitle, e.author, e.topic, e.rawInput]
                .filter(Boolean).join(' ').toLowerCase();
            return text.includes(q);
        })
        .sort((a, b) => b.createdAt - a.createdAt);

    const addEntry = async () => {
        if (inputType === 'quote') {
            if (!quoteText.trim() || !quoteBook.trim()) {
                Alert.alert('Required', 'Please enter a quote and book title.');
                return;
            }
            const created = await createJournalEntry({
                type: 'quote',
                content: quoteText.trim(),
                book_title: quoteBook.trim(),
                author: quoteAuthor.trim() || undefined,
            });
            if (created) {
                const entry: UnifiedEntry = {
                    id: created.id,
                    type: 'quote',
                    content: created.content,
                    bookTitle: created.book_title,
                    author: created.author,
                    createdAt: new Date(created.created_at).getTime(),
                    updatedAt: new Date(created.updated_at).getTime(),
                };
                setEntries([entry, ...entries]);
            }
            resetInputForm();
            return;
        }
        if (!textInput.trim()) return;
        const created = await createJournalEntry({
            type: inputType!,
            content: textInput.trim(),
        });
        if (created) {
            const entry: UnifiedEntry = {
                id: created.id,
                type: created.type,
                content: created.content,
                createdAt: new Date(created.created_at).getTime(),
                updatedAt: new Date(created.updated_at).getTime(),
            };
            setEntries([entry, ...entries]);
        }
        resetInputForm();
    };

    const updateEntry = async () => {
        if (!editingEntry) return;
        if (editingEntry.type === 'quote') {
            if (!quoteText.trim() || !quoteBook.trim()) {
                Alert.alert('Required', 'Please enter a quote and book title.');
                return;
            }
            await updateJournalEntry(editingEntry.id, {
                content: quoteText.trim(),
                book_title: quoteBook.trim(),
                author: quoteAuthor.trim() || undefined,
            });
            const updated: UnifiedEntry = {
                ...editingEntry,
                content: quoteText.trim(),
                bookTitle: quoteBook.trim(),
                author: quoteAuthor.trim() || undefined,
                updatedAt: Date.now(),
            };
            setEntries(entries.map(e => e.id === updated.id ? updated : e));
        } else {
            if (!textInput.trim()) return;
            await updateJournalEntry(editingEntry.id, { content: textInput.trim() });
            const updated: UnifiedEntry = { ...editingEntry, content: textInput.trim(), updatedAt: Date.now() };
            setEntries(entries.map(e => e.id === updated.id ? updated : e));
        }
        resetInputForm();
    };

    const deleteEntry = (id: string) => {
        Alert.alert('Delete this entry?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await deleteJournalEntry(id);
                    setEntries(entries.filter(e => e.id !== id));
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

    const selectType = (type: 'reflection' | 'quote' | 'idea') => {
        setShowTypeSelector(false);
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

    // ── Goals functions ──────────────────────────────────────────────────────

    /** Normalise partial date input to YYYY-MM-DD so Supabase doesn't reject it.
     *  "2027"       → "2027-01-01"
     *  "2027-06"    → "2027-06-01"
     *  "2027-06-15" → "2027-06-15"
     */
    const normalizeTargetDate = (raw: string): string | undefined => {
        const s = raw.trim();
        if (!s) return undefined;
        if (/^\d{4}$/.test(s)) return `${s}-01-01`;
        if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
        return s;
    };

    const loadGoals = async () => {
        setGoalsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            const data = await getGoals(user.id);
            setGoals(data);
        } catch (e) {
            console.error('loadGoals error:', e);
        } finally {
            setGoalsLoading(false);
        }
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setToastMessage(null));
    };

    const handleComplete = (goal: Goal) => {
        Alert.alert(
            'Mark this goal as complete?',
            `"${goal.title}"`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes', onPress: async () => {
                        try {
                            const updated = await completeGoal(goal.id);
                            setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
                            showToast('Goal achieved. 🏛️');
                        } catch (e) {
                            console.error('completeGoal error:', e);
                        }
                    },
                },
            ]
        );
    };

    const handleAdd = async () => {
        if (!newTitle.trim() || !userId) return;
        setSaving(true);
        try {
            const created = await upsertGoal({
                user_id: userId,
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                target_date: normalizeTargetDate(newTargetDate),
                source: 'user',
                completed: false,
            });
            setGoals(prev => [...prev, created]);
            setShowAddModal(false);
            setNewTitle('');
            setNewDescription('');
            setNewTargetDate('');
        } catch (e) {
            console.error('upsertGoal error:', e);
        } finally {
            setSaving(false);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewTargetDate('');
    };

    const formatTargetDate = (dateStr: string) => {
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const formatCompletedDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const activeGoals = goals.filter(g => !g.completed);
    const completedGoals = goals.filter(g => g.completed);

    // ── Sub-screen: Input Form ───────────────────────────────────────────────
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
                        contentContainerStyle={styles.formContent}
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

    // ── Main Render ──────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container} {...swipeHandlers}>
            {/* Header */}
            <View style={styles.header}>
                {/* Tab switcher */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'journal' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('journal')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'journal' && styles.tabButtonTextActive]}>
                            📓 Journal
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'goals' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('goals')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'goals' && styles.tabButtonTextActive]}>
                            🎯 Goals
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Journal-specific: search + filters */}
                {activeTab === 'journal' && (
                    <>
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
                            {(['all', 'reflection', 'quote', 'idea'] as FilterType[]).map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(prev => prev === f ? 'all' : f)}
                                >
                                    <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                                        {f === 'all' ? 'All'
                                            : f === 'reflection' ? '📝 Reflection'
                                            : f === 'quote' ? '📖 Quote'
                                            : '🧠 Idea'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Goals-specific: Add Goal button */}
                {activeTab === 'goals' && (
                    <View style={styles.goalsSubHeader}>
                        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                            <Ionicons name="add" size={18} color="#1a1a2e" />
                            <Text style={styles.addButtonText}>Add Goal</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Journal feed */}
            {activeTab === 'journal' && (
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
                        const displayText = entry.content;
                        const preview = displayText && displayText.length > 120
                            ? displayText.slice(0, 120) + '...'
                            : displayText;

                        return (
                            <TouchableOpacity
                                key={entry.id}
                                activeOpacity={0.85}
                                onPress={() => toggleExpand(entry.id)}
                                onLongPress={() => setLongPressEntry(entry)}
                                delayLongPress={500}
                            >
                                <View style={styles.entryCard}>
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
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* Goals feed */}
            {activeTab === 'goals' && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.goalsContent}
                    showsVerticalScrollIndicator={false}
                >
                    {!goalsLoading && goals.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="flag-outline" size={52} color="#c9a84c22" />
                            <Text style={styles.emptyText}>No goals yet.</Text>
                            <Text style={styles.emptySubtext}>
                                Your goals from onboarding will appear here. You can also add your own.
                            </Text>
                        </View>
                    )}

                    {activeGoals.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Active</Text>
                            {activeGoals.map(goal => (
                                <View key={goal.id} style={styles.goalCard}>
                                    <View style={styles.goalCardBody}>
                                        <Text style={styles.goalTitle}>{goal.title}</Text>
                                        {goal.description ? (
                                            <Text style={styles.goalDescription}>{goal.description}</Text>
                                        ) : null}
                                        {goal.target_date ? (
                                            <Text style={styles.goalDate}>By {formatTargetDate(goal.target_date)}</Text>
                                        ) : null}
                                    </View>
                                    <TouchableOpacity
                                        style={styles.checkButton}
                                        onPress={() => handleComplete(goal)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="checkmark-circle-outline" size={30} color="#c9a84c" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </>
                    )}

                    {completedGoals.length > 0 && (
                        <>
                            <TouchableOpacity
                                style={styles.completedToggle}
                                onPress={() => setShowCompleted(prev => !prev)}
                            >
                                <Text style={styles.completedToggleText}>
                                    {showCompleted ? 'Hide completed' : `Show completed (${completedGoals.length})`}
                                </Text>
                                <Ionicons
                                    name={showCompleted ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color="#888"
                                />
                            </TouchableOpacity>

                            {showCompleted && completedGoals.map(goal => (
                                <View key={goal.id} style={[styles.goalCard, styles.goalCardCompleted]}>
                                    <View style={styles.goalCardBody}>
                                        <Text style={[styles.goalTitle, styles.goalTitleCompleted]}>{goal.title}</Text>
                                        {goal.description ? (
                                            <Text style={styles.goalDescription}>{goal.description}</Text>
                                        ) : null}
                                        {goal.completed_at ? (
                                            <Text style={styles.goalCompletedDate}>
                                                Completed {formatCompletedDate(goal.completed_at)}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Ionicons name="checkmark-circle" size={28} color="#4caf5088" />
                                </View>
                            ))}
                        </>
                    )}
                </ScrollView>
            )}

            {/* FAB — journal tab only */}
            {activeTab === 'journal' && (
                <TouchableOpacity style={styles.fab} onPress={() => setShowTypeSelector(true)}>
                    <Text style={styles.fabIcon}>+</Text>
                </TouchableOpacity>
            )}

            {/* Goals toast */}
            {toastMessage ? (
                <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
                    <Text style={styles.toastText}>{toastMessage}</Text>
                </Animated.View>
            ) : null}

            {/* Type selector modal */}
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
                                {(['reflection', 'quote', 'idea'] as const).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={styles.typeSelectorOption}
                                        onPress={() => selectType(t)}
                                    >
                                        <Text style={styles.typeSelectorOptionText}>
                                            {t === 'reflection' ? '📝 Reflection'
                                                : t === 'quote' ? '📖 Quote'
                                                : '🧠 Idea'}
                                        </Text>
                                        <Text style={styles.typeSelectorOptionDesc}>
                                            {t === 'reflection' ? 'Daily thoughts, free writing'
                                                : t === 'quote' ? 'Passage from a book'
                                                : 'Seed for an essay or project'}
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

            {/* Long-press context menu */}
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
                                <TouchableOpacity
                                    style={styles.menuOption}
                                    onPress={() => longPressEntry && openEdit(longPressEntry)}
                                >
                                    <Ionicons name="pencil-outline" size={18} color="#c9a84c" />
                                    <Text style={styles.menuOptionText}>Edit</Text>
                                </TouchableOpacity>
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

            {/* Add Goal modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalSheet}>
                                    <Text style={styles.modalTitle}>Add Goal</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Title *"
                                        placeholderTextColor="#555"
                                        value={newTitle}
                                        onChangeText={setNewTitle}
                                        autoFocus
                                    />
                                    <TextInput
                                        style={[styles.modalInput, styles.modalInputMultiline]}
                                        placeholder="Description (optional)"
                                        placeholderTextColor="#555"
                                        value={newDescription}
                                        onChangeText={setNewDescription}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Target date: YYYY-MM-DD (optional)"
                                        placeholderTextColor="#555"
                                        value={newTargetDate}
                                        onChangeText={setNewTargetDate}
                                        keyboardType="numbers-and-punctuation"
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            (!newTitle.trim() || saving) && styles.saveButtonDisabled,
                                        ]}
                                        onPress={handleAdd}
                                        disabled={!newTitle.trim() || saving}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {saving ? 'Saving...' : 'Save Goal'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    scrollView: { flex: 1 },

    // ── Header ───────────────────────────────────────────────────────────────
    header: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 0 },

    // Tab switcher
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#16213e',
        borderWidth: 1,
        borderColor: '#c9a84c22',
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: '#c9a84c22',
        borderColor: '#c9a84c',
    },
    tabButtonText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '700',
    },
    tabButtonTextActive: {
        color: '#c9a84c',
    },

    // Journal header extras
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

    // Goals header extras
    goalsSubHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#c9a84c',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    addButtonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },

    // ── Journal feed ─────────────────────────────────────────────────────────
    feedContent: { padding: 16, paddingTop: 10, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyText: { color: '#888', fontSize: 18, fontWeight: '600' },
    emptySubtext: { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    entryCard: {
        backgroundColor: '#16213e', borderRadius: 14, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#c9a84c22',
    },
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

    // FAB
    fab: {
        position: 'absolute', bottom: 24, right: 24,
        backgroundColor: '#c9a84c', width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    },
    fabIcon: { color: '#1a1a2e', fontSize: 28, fontWeight: 'bold', lineHeight: 34 },

    // ── Goals feed ───────────────────────────────────────────────────────────
    goalsContent: { padding: 16, paddingBottom: 48 },
    sectionLabel: {
        color: '#c9a84c',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
        marginTop: 4,
    },
    goalCard: {
        backgroundColor: '#16213e',
        borderRadius: 14,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#c9a84c22',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    goalCardCompleted: {
        borderColor: '#4caf5022',
        opacity: 0.7,
    },
    goalCardBody: { flex: 1, gap: 4 },
    goalTitle: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 22 },
    goalTitleCompleted: { color: '#888', textDecorationLine: 'line-through' },
    goalDescription: { color: '#888', fontSize: 13, lineHeight: 20 },
    goalDate: { color: '#c9a84c', fontSize: 12, marginTop: 2 },
    goalCompletedDate: { color: '#555', fontSize: 12, marginTop: 2 },
    checkButton: { padding: 2 },
    completedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 4,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#c9a84c11',
    },
    completedToggleText: { color: '#888', fontSize: 14 },

    // Toast
    toast: {
        position: 'absolute',
        bottom: 36,
        alignSelf: 'center',
        backgroundColor: '#16213e',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderWidth: 1,
        borderColor: '#c9a84c44',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    toastText: { color: '#c9a84c', fontSize: 14, fontWeight: '600' },

    // ── Modals ───────────────────────────────────────────────────────────────
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
    modalSheet: {
        backgroundColor: '#16213e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        gap: 12,
    },
    modalTitle: { color: '#c9a84c', fontSize: 20, fontWeight: '700', marginBottom: 4 },
    modalInput: {
        backgroundColor: '#1a1a2e',
        color: '#fff',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#c9a84c33',
    },
    modalInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
    saveButton: {
        backgroundColor: '#c9a84c',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    saveButtonDisabled: { backgroundColor: '#c9a84c55' },
    saveButtonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },

    // ── Input form sub-screen ────────────────────────────────────────────────
    formHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
    },
    backButton: { padding: 4, width: 40 },
    formTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
    saveButtonHeader: {
        backgroundColor: '#c9a84c', borderRadius: 10,
        paddingVertical: 8, paddingHorizontal: 16,
    },
    saveButtonHeaderText: { color: '#1a1a2e', fontWeight: '700', fontSize: 14 },
    formContent: { padding: 20, paddingTop: 16, paddingBottom: 40 },
    largeInput: {
        backgroundColor: '#16213e', borderRadius: 14, padding: 16,
        color: '#fff', fontSize: 15, minHeight: 180, lineHeight: 24,
        borderWidth: 1, borderColor: '#c9a84c33', marginBottom: 12,
    },
    smallInput: {
        backgroundColor: '#16213e', borderRadius: 12, padding: 14,
        color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#c9a84c22', marginBottom: 10,
    },
});
