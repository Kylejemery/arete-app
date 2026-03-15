import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BeliefEntry, BeliefDialogueTurn, sendBeliefJournalMessage } from '../services/claudeService';
import { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from './lib/db';

interface UnifiedEntry {
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

function unifiedToBeliefEntry(e: UnifiedEntry): BeliefEntry {
    const vc = e.virtueCheck;
    const virtueCheck: BeliefEntry['virtueCheck'] = vc ? {
        passed: vc.passed,
        concern: vc.concern,
        virtue: (vc.virtue as 'wisdom' | 'justice' | 'courage' | 'temperance' | null) ?? null,
    } : null;
    return {
        id: e.id,
        rawThought: e.rawInput || e.content || '',
        stage: (e.beliefStage as BeliefEntry['stage']) || 1,
        dialogue: (e.dialogueHistory || []) as BeliefDialogueTurn[],
        refinedStatement: e.refinedStatement || '',
        encodedBelief: e.encodedBelief || '',
        virtueCheck,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        topic: e.topic || '',
    };
}

export default function BeliefJournalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ prefill?: string; entryId?: string }>();

    const [entry, setEntry] = useState<UnifiedEntry | null>(null);
    const [stage, setStage] = useState<1 | 2 | 3>(1);
    const [rawInput, setRawInput] = useState(params.prefill || '');
    const [dialogueInput, setDialogueInput] = useState('');
    const [adjustInput, setAdjustInput] = useState('');
    const [showAdjustInput, setShowAdjustInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        const loadAndResume = async () => {
            try {
                if (params.entryId) {
                    const entries = await getJournalEntries();
                    const draft = entries.find(e => e.id === params.entryId);
                    if (draft) {
                        const mapped: UnifiedEntry = {
                            id: draft.id,
                            type: draft.type,
                            content: draft.content,
                            rawInput: draft.raw_input,
                            dialogueHistory: draft.dialogue_history as any,
                            beliefStage: draft.belief_stage as any,
                            topic: draft.topic,
                            createdAt: new Date(draft.created_at).getTime(),
                            updatedAt: new Date(draft.updated_at).getTime(),
                            encodedBelief: draft.encoded_belief,
                            refinedStatement: draft.refined_statement,
                            virtueCheck: draft.virtue_check as any,
                        };
                        setEntry(mapped);
                        setHasStarted(true);
                        if (typeof draft.belief_stage === 'number') {
                            setStage(draft.belief_stage as 1 | 2 | 3);
                        }
                    }
                }
            } catch (e) { console.error(e); }
        };
        loadAndResume();
    }, [params.entryId]);

    const updateCurrentEntry = async (updated: UnifiedEntry) => {
        setEntry(updated);
        try {
            if (updated.id && !updated.id.startsWith('new_')) {
                await updateJournalEntry(updated.id, {
                    content: updated.content,
                    raw_input: updated.rawInput,
                    dialogue_history: updated.dialogueHistory as any,
                    encoded_belief: updated.encodedBelief,
                    refined_statement: updated.refinedStatement,
                    virtue_check: updated.virtueCheck as any,
                    belief_stage: updated.beliefStage as any,
                    topic: updated.topic,
                });
            }
        } catch (e) { console.error(e); }
    };

    // ── Stage 1: Submit raw thought ──────────────────────────────────────────

    const submitRawThought = async () => {
        if (!rawInput.trim() || loading) return;
        const now = Date.now();
        const topic = rawInput.trim().substring(0, 60);
        // Create in Supabase first to get a real UUID
        const created = await createJournalEntry({
            type: 'belief',
            content: rawInput.trim(),
            raw_input: rawInput.trim(),
            dialogue_history: [],
            belief_stage: 1 as any,
            topic,
        });
        if (!created) {
            setError('Could not save entry. Please try again.');
            return;
        }
        const newEntry: UnifiedEntry = {
            id: created.id,
            type: 'belief',
            content: rawInput.trim(),
            rawInput: rawInput.trim(),
            dialogueHistory: [],
            beliefStage: 1,
            topic,
            createdAt: now,
            updatedAt: now,
        };
        setHasStarted(true);
        setStage(1);
        setEntry(newEntry);
        await callCabinet(newEntry, 1);
    };

    // ── Call cabinet ─────────────────────────────────────────────────────────

    const callCabinet = async (
        currentEntry: UnifiedEntry,
        callStage: 1 | 2 | 3,
        extraUserTurn?: string
    ) => {
        setLoading(true);
        setError(null);
        try {
            let entryToSend = currentEntry;
            if (extraUserTurn) {
                const userTurn: BeliefDialogueTurn = {
                    role: 'user',
                    content: extraUserTurn,
                    timestamp: Date.now(),
                };
                entryToSend = {
                    ...currentEntry,
                    dialogueHistory: [...(currentEntry.dialogueHistory || []), userTurn],
                    updatedAt: Date.now(),
                };
                await updateCurrentEntry(entryToSend);
            }

            const beliefEntry = unifiedToBeliefEntry(entryToSend);
            const result = await sendBeliefJournalMessage(beliefEntry, callStage);

            const cabinetTurn: BeliefDialogueTurn = {
                role: 'cabinet',
                content: result.response,
                timestamp: Date.now(),
            };

            const newStage: 1 | 2 | 3 = callStage === 2 ? 2 : callStage === 3 ? 3 : ((entryToSend.beliefStage as number) || 1) as 1 | 2 | 3;

            const finalEntry: UnifiedEntry = {
                ...entryToSend,
                dialogueHistory: [...(entryToSend.dialogueHistory || []), cabinetTurn],
                beliefStage: newStage,
                refinedStatement: result.refinedStatement ?? entryToSend.refinedStatement,
                virtueCheck: result.virtueCheck ?? entryToSend.virtueCheck,
                updatedAt: Date.now(),
            };

            setStage(newStage);
            await updateCurrentEntry(finalEntry);
            setShowAdjustInput(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
            setError((err as Error).message || 'The Cabinet is unavailable. Tap to retry.');
        } finally {
            setLoading(false);
        }
    };

    const sendDialogueResponse = async () => {
        if (!entry || !dialogueInput.trim() || loading) return;
        const text = dialogueInput.trim();
        setDialogueInput('');
        await callCabinet(entry, 1, text);
    };

    const proposeRefinement = async () => {
        if (!entry || loading) return;
        await callCabinet(entry, 2);
    };

    const sendPushback = async () => {
        if (!entry || !adjustInput.trim() || loading) return;
        const text = adjustInput.trim();
        setAdjustInput('');
        await callCabinet(entry, 3, text);
    };

    const pushHarder = async () => {
        if (!entry || loading) return;
        const challenge = "I want you to push harder on this belief. Hold it against the four cardinal virtues more rigorously — Wisdom, Justice, Courage, Temperance. Where does it fail? Where is it self-serving? Where is it borrowed rather than lived?";
        await callCabinet(entry, 3, challenge);
    };

    const encodeBelief = async () => {
        if (!entry) return;
        const encodedText = entry.refinedStatement || entry.content;
        const finalEntry: UnifiedEntry = {
            ...entry,
            beliefStage: 'encoded',
            encodedBelief: encodedText,
            content: encodedText,
            hasVirtueConcern: !!(entry.virtueCheck && !entry.virtueCheck.passed),
            virtueConcern: entry.virtueCheck?.concern || null,
            updatedAt: Date.now(),
        };
        await updateCurrentEntry(finalEntry);
        router.replace('/journal' as any);
    };

    // ── Back navigation ───────────────────────────────────────────────────────

    const handleBack = () => {
        if (!hasStarted) {
            router.back();
            return;
        }

        Alert.alert(
            'Leave Belief Journal?',
            'Your progress in this dialogue will be saved as a draft. Continue later?',
            [
                {
                    text: 'Save Draft',
                    onPress: () => {
                        router.back();
                    },
                },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                        if (entry) {
                            try {
                                await deleteJournalEntry(entry.id);
                            } catch (e) { console.error(e); }
                        }
                        router.back();
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const canProposeRefinement = entry
        ? stage === 1 && (entry.dialogueHistory || []).filter(t => t.role === 'user').length >= 1
        : false;

    // ──────────────────────────────────────────────────────────────────────────
    // Stage 1: Raw input screen (no entry yet)
    // ──────────────────────────────────────────────────────────────────────────

    if (!entry) {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="close" size={24} color="#c9a84c" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Belief Journal</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.stage1Content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.stage1Headline}>What do you believe?</Text>
                        <Text style={styles.stage1SubHeadline}>
                            The Cabinet will help you find what you actually mean.
                        </Text>
                        <TextInput
                            style={styles.rawInput}
                            placeholder="Write what you're thinking — messy is fine. The Cabinet will help you find what you actually mean."
                            placeholderTextColor="#555"
                            multiline
                            autoFocus={!params.prefill}
                            value={rawInput}
                            onChangeText={setRawInput}
                            textAlignVertical="top"
                        />
                    </ScrollView>

                    <View style={styles.stage1Footer}>
                        <TouchableOpacity
                            style={[styles.sendToCabinetButton, (!rawInput.trim() || loading) && styles.sendToCabinetDisabled]}
                            onPress={submitRawThought}
                            disabled={!rawInput.trim() || loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#1a1a2e" size="small" />
                                : <Text style={styles.sendToCabinetText}>Send to Cabinet →</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Stage 2 & 3: Dialogue + encoding
    // ──────────────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

                {/* Header */}
                <View style={styles.dialogueHeader}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#c9a84c" />
                    </TouchableOpacity>
                    <Text style={styles.dialogueTitle} numberOfLines={1}>{entry.topic}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Dialogue scroll area */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.dialogueContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Raw thought */}
                    <View style={styles.rawThoughtCard}>
                        <Text style={styles.rawThoughtLabel}>Raw Thought</Text>
                        <Text style={styles.rawThoughtText}>{entry.rawInput}</Text>
                    </View>

                    {/* Dialogue bubbles */}
                    {entry.dialogueHistory?.map((turn, i) => (
                        <View key={i} style={turn.role === 'cabinet' ? styles.cabinetBubble : styles.userBubble}>
                            {turn.role === 'cabinet' && (
                                <Text style={styles.bubbleRoleLabel}>The Cabinet</Text>
                            )}
                            <Text style={turn.role === 'cabinet' ? styles.cabinetBubbleText : styles.userBubbleText}>
                                {turn.content}
                            </Text>
                        </View>
                    ))}

                    {/* Proposed encoded belief card (stages 2 & 3) */}
                    {(stage === 2 || stage === 3) && entry.refinedStatement ? (
                        <View style={styles.refinedCard}>
                            <Text style={styles.refinedLabel}>Proposed Encoded Belief</Text>
                            <Text style={styles.refinedText}>{entry.refinedStatement}</Text>
                            {entry.virtueCheck && !entry.virtueCheck.passed && (
                                <View style={styles.virtueConcernBadge}>
                                    <Ionicons name="warning-outline" size={16} color="#c9a84c" />
                                    <Text style={styles.virtueConcernText}>
                                        {entry.virtueCheck.virtue
                                            ? entry.virtueCheck.virtue.charAt(0).toUpperCase() + entry.virtueCheck.virtue.slice(1) + ': '
                                            : ''}
                                        {entry.virtueCheck.concern}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Loading */}
                    {loading && (
                        <View style={styles.cabinetBubble}>
                            <ActivityIndicator color="#c9a84c" size="small" />
                        </View>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <TouchableOpacity
                            style={styles.errorCard}
                            onPress={() => {
                                const s: 1 | 2 | 3 = stage === 2 ? 2 : stage === 3 ? 3 : 1;
                                callCabinet(entry, s);
                            }}
                        >
                            <Ionicons name="warning-outline" size={16} color="#ff4444" />
                            <Text style={styles.errorText}>The Cabinet is unavailable. Tap to retry.</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {/* Input area */}
                <View style={styles.inputArea}>
                    {/* Stage 1: questions phase */}
                    {stage === 1 && (
                        <>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Respond to the Cabinet..."
                                    placeholderTextColor="#555"
                                    multiline
                                    value={dialogueInput}
                                    onChangeText={setDialogueInput}
                                />
                                <TouchableOpacity
                                    style={[styles.sendButton, (!dialogueInput.trim() || loading) && styles.sendButtonDisabled]}
                                    onPress={sendDialogueResponse}
                                    disabled={!dialogueInput.trim() || loading}
                                >
                                    <Ionicons
                                        name="send"
                                        size={18}
                                        color={!dialogueInput.trim() || loading ? '#555' : '#1a1a2e'}
                                    />
                                </TouchableOpacity>
                            </View>
                            {canProposeRefinement && !loading && (
                                <TouchableOpacity style={styles.proposeButton} onPress={proposeRefinement}>
                                    <Ionicons name="sparkles-outline" size={16} color="#1a1a2e" />
                                    <Text style={styles.proposeButtonText}>Propose a refined version</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* Stage 2 & 3: encode / adjust / push harder */}
                    {(stage === 2 || stage === 3) && !loading && (
                        <View style={styles.actionPanel}>
                            {entry.refinedStatement ? (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.actionButtonPrimary]}
                                    onPress={encodeBelief}
                                >
                                    <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                                        🔒  This lands — encode it
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => setShowAdjustInput(prev => !prev)}
                            >
                                <Text style={styles.actionButtonText}>✏️  Not quite — adjust it</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={pushHarder}>
                                <Text style={styles.actionButtonText}>⚔️  Push harder</Text>
                            </TouchableOpacity>
                            {showAdjustInput && (
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Push back, adjust, or ask to iterate..."
                                        placeholderTextColor="#555"
                                        multiline
                                        value={adjustInput}
                                        onChangeText={setAdjustInput}
                                    />
                                    <TouchableOpacity
                                        style={[styles.sendButton, (!adjustInput.trim() || loading) && styles.sendButtonDisabled]}
                                        onPress={sendPushback}
                                        disabled={!adjustInput.trim() || loading}
                                    >
                                        <Ionicons
                                            name="send"
                                            size={18}
                                            color={!adjustInput.trim() || loading ? '#555' : '#1a1a2e'}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    scrollView: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#c9a84c22',
    },
    backButton: { padding: 4, width: 40 },
    headerTitle: { color: '#c9a84c', fontSize: 16, fontWeight: '700', textAlign: 'center', flex: 1 },

    // Stage 1
    stage1Content: { padding: 24, paddingTop: 32, paddingBottom: 40 },
    stage1Headline: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 10, lineHeight: 34 },
    stage1SubHeadline: { color: '#888', fontSize: 15, marginBottom: 28, lineHeight: 22 },
    rawInput: {
        backgroundColor: '#16213e', borderRadius: 16, padding: 18,
        color: '#fff', fontSize: 16, minHeight: 200,
        lineHeight: 26, borderWidth: 1, borderColor: '#c9a84c33',
    },
    stage1Footer: {
        paddingHorizontal: 24, paddingVertical: 16,
        borderTopWidth: 1, borderTopColor: '#c9a84c22', backgroundColor: '#1a1a2e',
    },
    sendToCabinetButton: {
        backgroundColor: '#c9a84c', borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    sendToCabinetDisabled: { backgroundColor: '#3a3a4e' },
    sendToCabinetText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },

    // Dialogue
    dialogueHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#c9a84c22', gap: 8,
    },
    dialogueTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
    dialogueContent: { padding: 16, paddingTop: 14, paddingBottom: 12 },

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

    refinedCard: {
        backgroundColor: '#1e2a45', borderRadius: 14, padding: 16,
        marginVertical: 12, borderWidth: 1, borderColor: '#c9a84c66',
    },
    refinedLabel: {
        color: '#c9a84c', fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
    },
    refinedText: { color: '#fff', fontSize: 15, lineHeight: 24 },

    virtueConcernBadge: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#c9a84c11', borderRadius: 8, padding: 10, marginTop: 10,
    },
    virtueConcernText: { color: '#c9a84c', fontSize: 12, lineHeight: 18, flex: 1 },

    errorCard: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#ff444411', borderRadius: 10, padding: 12, marginVertical: 8,
        borderWidth: 1, borderColor: '#ff444433',
    },
    errorText: { color: '#ff4444', fontSize: 13, flex: 1 },

    // Input area
    inputArea: {
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: '#c9a84c22',
        backgroundColor: '#1a1a2e',
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 8 },
    textInput: {
        flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 12,
        color: '#fff', fontSize: 14, maxHeight: 100, minHeight: 44,
        textAlignVertical: 'top', borderWidth: 1, borderColor: '#c9a84c33',
    },
    sendButton: {
        backgroundColor: '#c9a84c', borderRadius: 10,
        padding: 12, justifyContent: 'center', alignItems: 'center',
    },
    sendButtonDisabled: { backgroundColor: '#16213e' },

    proposeButton: {
        backgroundColor: '#c9a84c', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
    },
    proposeButtonText: { color: '#1a1a2e', fontSize: 14, fontWeight: '700' },

    actionPanel: { gap: 8 },
    actionButton: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#16213e', borderRadius: 12,
        paddingVertical: 12, paddingHorizontal: 16,
        borderWidth: 1, borderColor: '#c9a84c33',
    },
    actionButtonPrimary: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
    actionButtonText: { color: '#c9a84c', fontSize: 14, fontWeight: '600', flex: 1 },
    actionButtonTextPrimary: { color: '#1a1a2e' },
});
