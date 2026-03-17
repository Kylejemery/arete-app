'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { JournalEntry } from '@/lib/types';
import { sendBeliefJournalMessage } from '@/lib/claudeService';
import type { BeliefEntry, BeliefDialogueTurn } from '@/lib/claudeService';
import PageHeader from '@/components/PageHeader';

function dbToUnified(e: JournalEntry): UnifiedEntry {
  return {
    id: e.id,
    type: e.type,
    content: e.content,
    createdAt: new Date(e.created_at).getTime(),
    updatedAt: new Date(e.updated_at).getTime(),
    bookTitle: e.book_title,
    author: e.author,
    rawInput: e.raw_input,
    dialogueHistory: e.dialogue_history as UnifiedEntry['dialogueHistory'],
    encodedBelief: e.encoded_belief,
    virtueConcern: e.virtue_check?.concern,
    hasVirtueConcern: !!(e.virtue_check && !e.virtue_check.passed),
    beliefStage: e.belief_stage,
    refinedStatement: e.refined_statement,
    virtueCheck: e.virtue_check as UnifiedEntry['virtueCheck'],
    topic: e.topic,
  };
}

function unifiedToDbPayload(e: UnifiedEntry): Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    type: e.type,
    content: e.content,
    book_title: e.bookTitle,
    author: e.author,
    raw_input: e.rawInput,
    dialogue_history: e.dialogueHistory as JournalEntry['dialogue_history'],
    encoded_belief: e.encodedBelief,
    refined_statement: e.refinedStatement,
    virtue_check: e.virtueCheck as JournalEntry['virtue_check'],
    belief_stage: e.beliefStage,
    topic: e.topic,
  };
}

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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalizeVirtue(virtue: string | null | undefined): string {
  if (!virtue) return '';
  return virtue.charAt(0).toUpperCase() + virtue.slice(1) + ': ';
}

function unifiedToBeliefEntry(e: UnifiedEntry): BeliefEntry {
  const vc = e.virtueCheck;
  const virtueCheck: BeliefEntry['virtueCheck'] = vc
    ? { passed: vc.passed, concern: vc.concern, virtue: (vc.virtue as 'wisdom' | 'justice' | 'courage' | 'temperance' | null) ?? null }
    : null;
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

export default function JournalPage() {
  const router = useRouter();

  // Main state
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);

  // View state
  const [showCanon, setShowCanon] = useState(false);
  const [canonExpandedIds, setCanonExpandedIds] = useState<Set<string>>(new Set());
  const [viewingBeliefEntry, setViewingBeliefEntry] = useState<UnifiedEntry | null>(null);

  // Type selector modal
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Input form state
  const [showInputForm, setShowInputForm] = useState(false);
  const [inputType, setInputType] = useState<'reflection' | 'quote' | 'idea' | null>(null);
  const [editingEntry, setEditingEntry] = useState<UnifiedEntry | null>(null);
  const [textInput, setTextInput] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quoteBook, setQuoteBook] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');

  // Belief journal state
  const [showBeliefJournal, setShowBeliefJournal] = useState(false);
  const [beliefEntry, setBeliefEntry] = useState<UnifiedEntry | null>(null);
  const [beliefStageNum, setBeliefStageNum] = useState<1 | 2 | 3>(1);
  const [rawInput, setRawInput] = useState('');
  const [dialogueInput, setDialogueInput] = useState('');
  const [beliefLoading, setBeliefLoading] = useState(false);
  const [beliefError, setBeliefError] = useState<string | null>(null);
  const beliefScrollRef = useRef<HTMLDivElement>(null);

  // Load entries
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }
      const dbEntries = await getJournalEntries();
      setEntries(dbEntries.map(dbToUnified));

      // Real-time subscription
      if (authUser) {
        channel = supabase.channel('journal-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter: `user_id=eq.${authUser.id}` }, async () => {
            const fresh = await getJournalEntries();
            setEntries(fresh.map(dbToUnified));
          })
          .subscribe();
      }
    }
    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  // Persistence helpers
  const upsertEntry = async (updated: UnifiedEntry): Promise<UnifiedEntry> => {
    const exists = entries.find(e => e.id === updated.id);
    if (!exists) {
      const created = await createJournalEntry(unifiedToDbPayload(updated));
      if (created) {
        const asUnified = dbToUnified(created);
        setEntries(prev => [asUnified, ...prev]);
        return asUnified;
      }
      setEntries(prev => [updated, ...prev]);
      return updated;
    } else {
      await updateJournalEntry(updated.id, unifiedToDbPayload(updated));
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
      return updated;
    }
  };

  // Computed
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

  // CRUD
  const addEntry = async () => {
    if (inputType === 'quote') {
      if (!quoteText.trim() || !quoteBook.trim()) {
        alert('Please enter a quote and book title.');
        return;
      }
      const payload: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
        type: 'quote',
        content: quoteText.trim(),
        book_title: quoteBook.trim(),
        author: quoteAuthor.trim() || undefined,
      };
      const created = await createJournalEntry(payload);
      if (created) setEntries(prev => [dbToUnified(created), ...prev]);
      resetInputForm();
      return;
    }
    if (!textInput.trim()) return;
    const payload: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      type: inputType!,
      content: textInput.trim(),
    };
    const created = await createJournalEntry(payload);
    if (created) setEntries(prev => [dbToUnified(created), ...prev]);
    resetInputForm();
  };

  const updateEntry = async () => {
    if (!editingEntry) return;
    let updated: UnifiedEntry;
    if (editingEntry.type === 'quote') {
      if (!quoteText.trim() || !quoteBook.trim()) {
        alert('Please enter a quote and book title.');
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
    await updateJournalEntry(updated.id, unifiedToDbPayload(updated));
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    resetInputForm();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    await deleteJournalEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setMenuEntryId(null);
    if (viewingBeliefEntry?.id === id) setViewingBeliefEntry(null);
  };

  const resetInputForm = () => {
    setShowInputForm(false);
    setEditingEntry(null);
    setTextInput('');
    setQuoteText(''); setQuoteBook(''); setQuoteAuthor('');
    setInputType(null);
  };

  const openEdit = (entry: UnifiedEntry) => {
    setMenuEntryId(null);
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

  const selectType = (type: 'reflection' | 'quote' | 'idea' | 'belief') => {
    setShowTypeSelector(false);
    if (type === 'belief') {
      setRawInput('');
      setBeliefEntry(null);
      setBeliefStageNum(1);
      setBeliefError(null);
      setShowBeliefJournal(true);
      return;
    }
    setInputType(type);
    setEditingEntry(null);
    setTextInput(''); setQuoteText(''); setQuoteBook(''); setQuoteAuthor('');
    setShowInputForm(true);
  };

  // Belief Journal
  const callCabinet = async (
    currentEntry: UnifiedEntry,
    callStage: 1 | 2 | 3,
    extraUserTurn?: string
  ) => {
    setBeliefLoading(true);
    setBeliefError(null);
    try {
      let entryToSend = currentEntry;
      if (extraUserTurn) {
        const userTurn: BeliefDialogueTurn = { role: 'user', content: extraUserTurn, timestamp: Date.now() };
        entryToSend = {
          ...currentEntry,
          dialogueHistory: [...(currentEntry.dialogueHistory || []), userTurn],
          updatedAt: Date.now(),
        };
        entryToSend = await upsertEntry(entryToSend);
        setBeliefEntry(entryToSend);
      }

      const result = await sendBeliefJournalMessage(unifiedToBeliefEntry(entryToSend), callStage);

      const cabinetTurn: BeliefDialogueTurn = { role: 'cabinet', content: result.response, timestamp: Date.now() };
      // Stage 2 and 3 calls are explicit; stage 1 calls keep the entry's current numeric stage
      const newStage: 1 | 2 | 3 = callStage === 2 ? 2 : callStage === 3 ? 3 : ((entryToSend.beliefStage as number) || 1) as 1 | 2 | 3;

      const finalEntry: UnifiedEntry = {
        ...entryToSend,
        dialogueHistory: [...(entryToSend.dialogueHistory || []), cabinetTurn],
        beliefStage: newStage,
        refinedStatement: result.refinedStatement ?? entryToSend.refinedStatement,
        virtueCheck: result.virtueCheck ?? entryToSend.virtueCheck,
        updatedAt: Date.now(),
      };

      const savedEntry = await upsertEntry(finalEntry);
      setBeliefStageNum(newStage);
      setBeliefEntry(savedEntry);
      setTimeout(() => beliefScrollRef.current?.scrollTo({ top: beliefScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) {
      setBeliefError(err instanceof Error ? err.message : 'The Cabinet is unavailable. Please try again.');
    } finally {
      setBeliefLoading(false);
    }
  };

  const submitRawThought = async () => {
    if (!rawInput.trim() || beliefLoading) return;
    const now = Date.now();
    const topic = rawInput.trim().substring(0, 60);
    const newEntry: UnifiedEntry = {
      id: now.toString(),
      type: 'belief',
      content: rawInput.trim(),
      rawInput: rawInput.trim(),
      dialogueHistory: [],
      beliefStage: 1,
      topic,
      createdAt: now,
      updatedAt: now,
    };
    setBeliefStageNum(1);
    const savedEntry = await upsertEntry(newEntry);
    setBeliefEntry(savedEntry);
    await callCabinet(savedEntry, 1);
  };

  const sendDialogueResponse = async () => {
    if (!beliefEntry || !dialogueInput.trim() || beliefLoading) return;
    const text = dialogueInput.trim();
    setDialogueInput('');
    await callCabinet(beliefEntry, 1, text);
  };

  const proposeRefinement = async () => {
    if (!beliefEntry || beliefLoading) return;
    await callCabinet(beliefEntry, 2);
  };

  const encodeBelief = async () => {
    if (!beliefEntry) return;
    const encodedText = beliefEntry.refinedStatement || beliefEntry.content;
    const finalEntry: UnifiedEntry = {
      ...beliefEntry,
      beliefStage: 'encoded',
      encodedBelief: encodedText,
      content: encodedText,
      hasVirtueConcern: !!(beliefEntry.virtueCheck && !beliefEntry.virtueCheck.passed),
      virtueConcern: beliefEntry.virtueCheck?.concern || null,
      updatedAt: Date.now(),
    };
    setBeliefEntry(finalEntry);
    await upsertEntry(finalEntry);
  };

  const openDraftBelief = (entry: UnifiedEntry) => {
    setBeliefEntry(entry);
    setRawInput(entry.rawInput || entry.content || '');
    setBeliefStageNum(typeof entry.beliefStage === 'number' ? entry.beliefStage as 1 | 2 | 3 : 1);
    setBeliefError(null);
    setShowBeliefJournal(true);
  };

  const canProposeRefinement = beliefEntry
    ? beliefStageNum === 1 && (beliefEntry.dialogueHistory || []).filter(t => t.role === 'user').length >= 1
    : false;

  // Canon view
  if (showCanon) {
    return (
      <div className="min-h-screen bg-arete-bg text-arete-text flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col flex-1">
          <div className="flex items-center mb-2">
            <button
              onClick={() => setShowCanon(false)}
              className="text-arete-gold mr-3 text-lg font-bold hover:opacity-80"
            >
              &larr;
            </button>
            <h1 className="text-xl font-bold text-arete-text flex-1">Canon 📜</h1>
          </div>
          <p className="text-arete-muted text-sm mb-6">Beliefs examined and encoded</p>

          {canonEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
              <div className="text-5xl mb-4" style={{ opacity: 0.15 }}>🛡</div>
              <p className="text-arete-muted">No encoded beliefs yet.</p>
              <p className="text-arete-muted text-sm mt-1">Complete a belief dialogue to encode your first conviction.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {canonEntries.map(entry => {
                const isExpanded = canonExpandedIds.has(entry.id);
                const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;
                return (
                  <div
                    key={entry.id}
                    className="rounded-lg p-4 bg-arete-surface"
                    style={{ borderLeft: '3px solid #c9a84c' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-arete-gold">
                        {entry.topic || 'Belief'}
                      </span>
                      {virtueOk
                        ? <span className="text-green-400 text-sm">✓</span>
                        : <span className="text-arete-gold text-sm">⚠</span>
                      }
                    </div>
                    <p className="text-arete-text text-sm leading-relaxed mb-2">
                      {entry.encodedBelief || entry.content}
                    </p>
                    <p className="text-arete-muted text-xs mb-2">{formatDate(entry.createdAt)}</p>
                    {!virtueOk && entry.virtueCheck?.concern && (
                      <div className="flex items-start gap-1 mb-2 px-2 py-1 rounded"
                        style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                        <span className="text-arete-gold text-xs mt-0.5">⚠</span>
                        <span className="text-arete-gold text-xs">
                          {entry.virtueCheck.virtue
                            ? capitalizeVirtue(entry.virtueCheck.virtue)
                            : ''}
                          {entry.virtueCheck.concern}
                        </span>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-3 flex flex-col gap-2">
                        <p className="text-arete-muted text-xs uppercase tracking-wider mb-1">Dialogue History</p>
                        {entry.rawInput && (
                          <div className="rounded p-3" style={{ borderLeft: '3px solid #555', background: 'rgba(255,255,255,0.03)' }}>
                            <p className="text-arete-muted text-xs mb-1">Raw Thought</p>
                            <p className="text-arete-text text-sm">{entry.rawInput}</p>
                          </div>
                        )}
                        {entry.dialogueHistory?.map((turn, i) => (
                          <div
                            key={i}
                            className={`flex ${turn.role === 'cabinet' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className="max-w-[85%]">
                              {turn.role === 'cabinet' && (
                                <p className="text-arete-gold text-xs mb-1 uppercase tracking-wider">The Cabinet</p>
                              )}
                              <div
                                className="rounded-lg p-3 text-sm"
                                style={
                                  turn.role === 'cabinet'
                                    ? { borderLeft: '3px solid #c9a84c', background: 'rgba(201,168,76,0.07)', color: '#e6eef8' }
                                    : { background: '#2a3a5c', color: '#e6eef8' }
                                }
                              >
                                {turn.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => toggleCanonExpand(entry.id)}
                      className="text-arete-muted text-xs mt-2 hover:text-arete-text"
                    >
                      {isExpanded ? 'Hide dialogue \u2191' : 'View dialogue \u2192'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Belief detail view (encoded belief from feed)
  if (viewingBeliefEntry) {
    const entry = viewingBeliefEntry;
    const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;
    return (
      <div className="min-h-screen bg-arete-bg text-arete-text flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col flex-1">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setViewingBeliefEntry(null)}
              className="text-arete-gold mr-3 text-lg font-bold hover:opacity-80"
            >
              &larr;
            </button>
            <h1 className="text-xl font-bold text-arete-text flex-1 truncate">{entry.topic || 'Belief'}</h1>
          </div>

          <div className="flex flex-col gap-3">
            {entry.rawInput && (
              <div className="rounded-lg p-4" style={{ borderLeft: '3px solid #555', background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-arete-muted text-xs mb-2">Raw Thought</p>
                <p className="text-arete-text text-sm leading-relaxed">{entry.rawInput}</p>
              </div>
            )}
            {entry.dialogueHistory?.map((turn, i) => (
              <div
                key={i}
                className={`flex ${turn.role === 'cabinet' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[85%]">
                  {turn.role === 'cabinet' && (
                    <p className="text-arete-gold text-xs mb-1 uppercase tracking-wider">The Cabinet</p>
                  )}
                  <div
                    className="rounded-lg p-3 text-sm leading-relaxed"
                    style={
                      turn.role === 'cabinet'
                        ? { borderLeft: '3px solid #c9a84c', background: 'rgba(201,168,76,0.07)', color: '#e6eef8' }
                        : { background: '#2a3a5c', color: '#e6eef8' }
                    }
                  >
                    {turn.content}
                  </div>
                </div>
              </div>
            ))}
            {entry.encodedBelief && (
              <div className="rounded-lg p-4" style={{ border: '1px solid #c9a84c', background: 'rgba(201,168,76,0.05)' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-arete-gold mb-2">Encoded Belief</p>
                <p className="text-arete-text text-sm leading-relaxed">{entry.encodedBelief}</p>
                {!virtueOk && entry.virtueCheck?.concern && (
                  <div className="flex items-start gap-1 mt-2 px-2 py-1 rounded"
                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                    <span className="text-arete-gold text-xs mt-0.5">⚠</span>
                    <span className="text-arete-gold text-xs">
                      {entry.virtueCheck.virtue
                        ? capitalizeVirtue(entry.virtueCheck.virtue)
                        : ''}
                      {entry.virtueCheck.concern}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Belief Journal (inline)
  if (showBeliefJournal) {
    const isEncoded = beliefEntry?.beliefStage === 'encoded';
    return (
      <div className="min-h-screen bg-arete-bg text-arete-text flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col flex-1">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setShowBeliefJournal(false)}
              className="text-arete-gold mr-3 text-lg font-bold hover:opacity-80"
            >
              &larr;
            </button>
            <h1 className="text-xl font-bold text-arete-text flex-1">💡 Belief</h1>
          </div>

          {/* Stage 1 — no entry yet */}
          {!beliefEntry && (
            <div className="flex flex-col flex-1">
              <textarea
                className="w-full flex-1 min-h-48 bg-arete-surface rounded-lg p-4 text-arete-text text-sm resize-none border border-arete-border focus:outline-none focus:border-arete-gold"
                placeholder="Write what you're thinking — messy is fine. The Cabinet will help you find what you actually mean."
                style={{ color: '#e6eef8' }}
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                autoFocus
              />
              {beliefError && <p className="text-red-400 text-sm mt-2">{beliefError}</p>}
              <button
                onClick={submitRawThought}
                disabled={!rawInput.trim() || beliefLoading}
                className="mt-4 py-3 px-6 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-40"
                style={{ background: '#c9a84c', color: '#1a1a2e' }}
              >
                {beliefLoading ? 'Sending to Cabinet\u2026' : 'Send to Cabinet \u2192'}
              </button>
            </div>
          )}

          {/* Dialogue view */}
          {beliefEntry && (
            <div className="flex flex-col flex-1 min-h-0">
              {isEncoded && (
                <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid #c9a84c' }}>
                  <span className="text-arete-gold">✓</span>
                  <span className="text-arete-gold text-sm font-semibold">Encoded as Canon Belief</span>
                </div>
              )}
              <div
                ref={beliefScrollRef}
                className="flex flex-col gap-3 overflow-y-auto flex-1 mb-4"
              >
                {beliefEntry.rawInput && (
                  <div className="rounded-lg p-3" style={{ borderLeft: '3px solid #555', background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-arete-muted text-xs mb-1">Raw Thought</p>
                    <p className="text-arete-text text-sm">{beliefEntry.rawInput}</p>
                  </div>
                )}
                {beliefEntry.dialogueHistory?.map((turn, i) => (
                  <div key={i} className={`flex ${turn.role === 'cabinet' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[85%]">
                      {turn.role === 'cabinet' && (
                        <p className="text-arete-gold text-xs mb-1 uppercase tracking-wider">The Cabinet</p>
                      )}
                      <div
                        className="rounded-lg p-3 text-sm leading-relaxed"
                        style={
                          turn.role === 'cabinet'
                            ? { borderLeft: '3px solid #c9a84c', background: 'rgba(201,168,76,0.07)', color: '#e6eef8' }
                            : { background: '#2a3a5c', color: '#e6eef8' }
                        }
                      >
                        {turn.content}
                      </div>
                    </div>
                  </div>
                ))}
                {beliefLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2 rounded-lg text-sm text-arete-muted"
                      style={{ background: 'rgba(201,168,76,0.07)', borderLeft: '3px solid #c9a84c' }}>
                      The Cabinet is deliberating\u2026
                    </div>
                  </div>
                )}
                {beliefError && <p className="text-red-400 text-sm">{beliefError}</p>}
                {beliefEntry.refinedStatement && (
                  <div className="rounded-lg p-4" style={{ border: '1px solid #c9a84c', background: 'rgba(201,168,76,0.05)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider text-arete-gold mb-2">Refined Belief:</p>
                    <p className="text-arete-text text-sm leading-relaxed">{beliefEntry.refinedStatement}</p>
                  </div>
                )}
                {beliefEntry.virtueCheck && !beliefEntry.virtueCheck.passed && beliefEntry.virtueCheck.concern && (
                  <div className="flex items-start gap-1 px-3 py-2 rounded"
                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                    <span className="text-arete-gold text-xs mt-0.5">⚠</span>
                    <span className="text-arete-gold text-xs">
                      {beliefEntry.virtueCheck.virtue
                        ? capitalizeVirtue(beliefEntry.virtueCheck.virtue)
                        : ''}
                      {beliefEntry.virtueCheck.concern}
                    </span>
                  </div>
                )}
              </div>

              {!isEncoded && (
                <div className="flex flex-col gap-2">
                  {canProposeRefinement && (
                    <button
                      onClick={proposeRefinement}
                      disabled={beliefLoading}
                      className="py-2 px-4 rounded-lg text-sm font-semibold border border-arete-gold text-arete-gold hover:bg-arete-gold hover:text-arete-surface transition-colors disabled:opacity-40"
                    >
                      Refine Belief
                    </button>
                  )}
                  {beliefEntry.refinedStatement && (
                    <button
                      onClick={encodeBelief}
                      disabled={beliefLoading}
                      className="py-2 px-4 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
                      style={{ background: '#c9a84c', color: '#1a1a2e' }}
                    >
                      Encode as Canon
                    </button>
                  )}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      className="flex-1 bg-arete-surface rounded-lg px-3 py-2 text-sm text-arete-text border border-arete-border focus:outline-none focus:border-arete-gold"
                      placeholder="Reply to the Cabinet\u2026"
                      value={dialogueInput}
                      onChange={e => setDialogueInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDialogueResponse(); } }}
                      disabled={beliefLoading}
                    />
                    <button
                      onClick={sendDialogueResponse}
                      disabled={!dialogueInput.trim() || beliefLoading}
                      className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
                      style={{ background: '#c9a84c', color: '#1a1a2e' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Input form
  if (showInputForm && inputType) {
    const isEditing = !!editingEntry;
    return (
      <div className="min-h-screen bg-arete-bg text-arete-text flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={resetInputForm}
              className="text-arete-gold text-lg font-bold hover:opacity-80"
            >
              &larr;
            </button>
            <h1 className="text-lg font-bold text-arete-text">
              {isEditing ? 'Edit' : 'New'} {TYPE_LABELS[inputType]}
            </h1>
            <button
              onClick={isEditing ? updateEntry : addEntry}
              className="text-arete-gold text-sm font-semibold hover:opacity-80"
            >
              Save
            </button>
          </div>

          {inputType === 'quote' ? (
            <div className="flex flex-col gap-3 flex-1">
              <textarea
                className="w-full min-h-40 bg-arete-surface rounded-lg p-4 text-arete-text text-sm resize-none border border-arete-border focus:outline-none focus:border-arete-gold italic"
                placeholder='"Enter quote..."'
                value={quoteText}
                onChange={e => setQuoteText(e.target.value)}
                autoFocus
              />
              <input
                type="text"
                className="w-full bg-arete-surface rounded-lg px-4 py-3 text-sm text-arete-text border border-arete-border focus:outline-none focus:border-arete-gold"
                placeholder="Book title *"
                value={quoteBook}
                onChange={e => setQuoteBook(e.target.value)}
              />
              <input
                type="text"
                className="w-full bg-arete-surface rounded-lg px-4 py-3 text-sm text-arete-text border border-arete-border focus:outline-none focus:border-arete-gold"
                placeholder="Author (optional)"
                value={quoteAuthor}
                onChange={e => setQuoteAuthor(e.target.value)}
              />
            </div>
          ) : (
            <textarea
              className="w-full flex-1 min-h-64 bg-arete-surface rounded-lg p-4 text-arete-text text-sm resize-none border border-arete-border focus:outline-none focus:border-arete-gold"
              placeholder={inputType === 'reflection' ? "What's on your mind?" : "What seed do you want to keep?"}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </div>
    );
  }

  // Main Feed
  return (
    <div className="min-h-screen bg-arete-bg text-arete-text">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-4">
          <PageHeader title="Journal 📓" />
          <button
            onClick={() => setShowCanon(true)}
            className="mt-1 text-sm font-semibold px-3 py-1.5 rounded-lg border border-arete-gold text-arete-gold hover:bg-arete-gold hover:text-arete-surface transition-colors flex-shrink-0"
          >
            Canon 📜
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-arete-surface rounded-lg px-3 py-2 mb-4 border border-arete-border">
          <span className="text-arete-muted text-sm">🔍</span>
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-arete-text focus:outline-none"
            placeholder="Search entries..."
            style={{ color: '#e6eef8' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-arete-muted hover:text-arete-text text-sm"
            >
              &#x2715;
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['all', 'reflection', 'quote', 'belief', 'idea'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(prev => prev === f ? 'all' : f)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={
                activeFilter === f
                  ? { background: '#c9a84c', borderColor: '#c9a84c', color: '#1a1a2e' }
                  : { background: 'transparent', borderColor: '#2a3a5c', color: '#9aa0a6' }
              }
            >
              {f === 'all' ? 'All'
                : f === 'reflection' ? '📝 Reflection'
                : f === 'quote' ? '📖 Quote'
                : f === 'belief' ? '💡 Belief'
                : '🧠 Idea'}
            </button>
          ))}
        </div>

        {/* Entry feed */}
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4" style={{ opacity: 0.15 }}>📓</div>
            <p className="text-arete-muted">No entries yet.</p>
            <p className="text-arete-muted text-sm mt-1">Tap + to add your first entry.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-24">
            {filteredEntries.map(entry => {
              const isExpanded = expandedIds.has(entry.id);
              const isDraft = entry.type === 'belief' && entry.beliefStage !== 'encoded';
              // For beliefs: show encodedBelief first, fall back to rawInput, then content
              const displayText = entry.type === 'belief'
                ? (entry.encodedBelief || entry.rawInput || entry.content)
                : entry.content;
              const preview = displayText && displayText.length > 120
                ? displayText.slice(0, 120) + '...'
                : displayText;
              const virtueOk = !entry.virtueCheck || entry.virtueCheck.passed;

              return (
                <div
                  key={entry.id}
                  className="relative rounded-lg p-4 cursor-pointer transition-opacity hover:opacity-90"
                  style={
                    isDraft
                      ? { border: '1px dashed rgba(201,168,76,0.5)', background: '#1a1a2e' }
                      : { border: '1px solid rgba(201,168,76,0.13)', background: '#1a1a2e' }
                  }
                  onClick={() => {
                    if (entry.type === 'belief') {
                      if (isDraft) {
                        openDraftBelief(entry);
                      } else {
                        setViewingBeliefEntry(entry);
                      }
                    } else {
                      toggleExpand(entry.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredId(entry.id)}
                  onMouseLeave={() => { setHoveredId(null); setMenuEntryId(null); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-arete-gold">{TYPE_LABELS[entry.type]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-arete-muted">{formatDate(entry.createdAt)}</span>
                      {hoveredId === entry.id && (
                        <div className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); setMenuEntryId(prev => prev === entry.id ? null : entry.id); }}
                            className="text-arete-muted hover:text-arete-text text-base leading-none px-1"
                          >
                            &#x22EF;
                          </button>
                          {menuEntryId === entry.id && (
                            <div
                              className="absolute right-0 top-6 rounded-lg shadow-lg z-10 py-1 min-w-[7rem]"
                              style={{ background: '#1a1a2e', border: '1px solid #2a3a5c' }}
                              onClick={e => e.stopPropagation()}
                            >
                              {entry.type !== 'belief' && (
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-arete-text hover:bg-arete-surface"
                                  onClick={() => openEdit(entry)}
                                >
                                  &#x270F; Edit
                                </button>
                              )}
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-arete-surface"
                                onClick={() => deleteEntry(entry.id)}
                              >
                                &#x1F5D1; Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {entry.type === 'quote' ? (
                    <>
                      <p className={`text-arete-text text-sm leading-relaxed italic ${!isExpanded ? 'line-clamp-3' : ''}`}>
                        &ldquo;{entry.content}&rdquo;
                      </p>
                      {entry.bookTitle && (
                        <p className="text-arete-gold text-xs mt-1">
                          📖 {entry.bookTitle}{entry.author && ` \u2014 ${entry.author}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-arete-text text-sm leading-relaxed">
                      {isExpanded ? displayText : preview}
                    </p>
                  )}

                  {isDraft && (
                    <div className="mt-2">
                      <span className="text-xs text-arete-gold">
                        Draft \u00B7 Stage {entry.beliefStage} \u00A0\u00B7\u00A0 Click to continue \u2192
                      </span>
                    </div>
                  )}

                  {entry.type === 'belief' && entry.beliefStage === 'encoded' && !virtueOk && entry.virtueCheck?.concern && (
                    <div className="flex items-start gap-1 mt-2 px-2 py-1 rounded text-xs"
                      style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <span className="text-arete-gold">⚠</span>
                      <span className="text-arete-gold">
                        {entry.virtueCheck.virtue
                          ? capitalizeVirtue(entry.virtueCheck.virtue)
                          : ''}
                        {entry.virtueCheck.concern}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowTypeSelector(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:opacity-90 transition-opacity z-40"
        style={{ background: '#c9a84c', color: '#1a1a2e' }}
      >
        +
      </button>

      {/* Type selector modal */}
      {showTypeSelector && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.67)' }}
          onClick={() => setShowTypeSelector(false)}
        >
          <div
            className="w-full max-w-lg mx-auto rounded-t-2xl p-6"
            style={{ background: '#1a1a2e', borderTop: '1px solid #2a3a5c' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-arete-text mb-4 text-center">What are you adding?</h2>
            {(['reflection', 'quote', 'idea', 'belief'] as const).map(t => (
              <button
                key={t}
                onClick={() => selectType(t)}
                className="w-full text-left px-4 py-3 rounded-lg mb-2 hover:bg-arete-surface transition-colors"
                style={{ border: '1px solid #2a3a5c' }}
              >
                <div className="font-semibold text-sm text-arete-text">
                  {t === 'reflection' ? '📝 Reflection'
                    : t === 'quote' ? '📖 Quote'
                    : t === 'idea' ? '🧠 Idea'
                    : '💡 Belief'}
                </div>
                <div className="text-xs text-arete-muted mt-0.5">
                  {t === 'reflection' ? 'Daily thoughts, free writing'
                    : t === 'quote' ? 'Passage from a book'
                    : t === 'idea' ? 'Seed for an essay or project'
                    : 'Refine a belief with the Cabinet'}
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowTypeSelector(false)}
              className="w-full py-3 rounded-lg text-sm text-arete-muted hover:text-arete-text transition-colors mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
