'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem, setItem } from '@/lib/storage';
import { sendBeliefJournalMessage } from '@/lib/claudeService';
import type { BeliefEntry, BeliefDialogueTurn } from '@/lib/claudeService';
import { JOURNAL_PROMPTS, getDailyItem } from '@/lib/quotes';
import PageHeader from '@/components/PageHeader';

type Tab = 'journal' | 'commonplace' | 'beliefs';

interface JournalEntry {
  id: string;
  text: string;
  date: string;
  timestamp: number;
}

interface CommonplaceQuote {
  id: string;
  quote: string;
  book: string;
  author: string;
  timestamp: number;
}

export default function JournalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('journal');

  // Journal tab
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  // Commonplace tab
  const [quotes, setQuotes] = useState<CommonplaceQuote[]>([]);
  const [newQuote, setNewQuote] = useState('');
  const [newBook, setNewBook] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [showAddQuote, setShowAddQuote] = useState(false);

  // Beliefs tab
  const [beliefs, setBeliefs] = useState<BeliefEntry[]>([]);
  const [rawThought, setRawThought] = useState('');
  const [activeBeliefId, setActiveBeliefId] = useState<string | null>(null);
  const [beliefDialogueInput, setBeliefDialogueInput] = useState('');
  const [beliefLoading, setBeliefLoading] = useState(false);
  const [showNewBelief, setShowNewBelief] = useState(false);

  const dailyPrompt = getDailyItem(JOURNAL_PROMPTS);

  useEffect(() => {
    const name = getItem('userName');
    if (!name) { router.replace('/onboarding'); return; }

    const savedEntries = getItem('journalEntries');
    if (savedEntries) { try { setEntries(JSON.parse(savedEntries)); } catch {} }

    const savedQuotes = getItem('commonplaceQuotes');
    if (savedQuotes) { try { setQuotes(JSON.parse(savedQuotes)); } catch {} }

    const savedBeliefs = getItem('beliefEntries');
    if (savedBeliefs) { try { setBeliefs(JSON.parse(savedBeliefs)); } catch {} }
  }, [router]);

  // Journal
  const saveEntries = (updated: JournalEntry[]) => {
    setEntries(updated);
    setItem('journalEntries', JSON.stringify(updated));
  };

  const addEntry = () => {
    if (!newEntry.trim()) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      text: newEntry.trim(),
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      timestamp: Date.now(),
    };
    saveEntries([entry, ...entries]);
    setNewEntry('');
    setShowNewEntry(false);
  };

  const deleteEntry = (id: string) => {
    if (!confirm('Delete this entry?')) return;
    saveEntries(entries.filter(e => e.id !== id));
  };

  // Commonplace
  const saveQuotes = (updated: CommonplaceQuote[]) => {
    setQuotes(updated);
    setItem('commonplaceQuotes', JSON.stringify(updated));
  };

  const addQuote = () => {
    if (!newQuote.trim()) return;
    const quote: CommonplaceQuote = {
      id: Date.now().toString(),
      quote: newQuote.trim(),
      book: newBook.trim() || 'Unknown',
      author: newAuthor.trim() || 'Unknown',
      timestamp: Date.now(),
    };
    saveQuotes([quote, ...quotes]);
    setNewQuote(''); setNewBook(''); setNewAuthor('');
    setShowAddQuote(false);
  };

  const deleteQuote = (id: string) => {
    saveQuotes(quotes.filter(q => q.id !== id));
  };

  // Beliefs
  const saveBeliefs = (updated: BeliefEntry[]) => {
    setBeliefs(updated);
    setItem('beliefEntries', JSON.stringify(updated));
  };

  const startNewBelief = async () => {
    if (!rawThought.trim()) return;
    const entry: BeliefEntry = {
      id: Date.now().toString(),
      rawThought: rawThought.trim(),
      stage: 1,
      dialogue: [],
      refinedStatement: '',
      encodedBelief: '',
      virtueCheck: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      topic: rawThought.trim().slice(0, 50),
    };
    setBeliefLoading(true);
    try {
      const result = await sendBeliefJournalMessage(entry, 1);
      const withDialogue: BeliefEntry = {
        ...entry,
        dialogue: [{ role: 'cabinet', content: result.response, timestamp: Date.now() }],
      };
      const updated = [withDialogue, ...beliefs];
      saveBeliefs(updated);
      setActiveBeliefId(withDialogue.id);
      setRawThought('');
      setShowNewBelief(false);
    } catch {
      alert('The Cabinet is unavailable. Please try again.');
    } finally {
      setBeliefLoading(false);
    }
  };

  const sendBeliefMessage = async (beliefId: string) => {
    if (!beliefDialogueInput.trim()) return;
    const belief = beliefs.find(b => b.id === beliefId);
    if (!belief) return;

    const userTurn: BeliefDialogueTurn = { role: 'user', content: beliefDialogueInput.trim(), timestamp: Date.now() };
    const updatedBelief: BeliefEntry = {
      ...belief,
      dialogue: [...belief.dialogue, userTurn],
      updatedAt: Date.now(),
    };

    setBeliefDialogueInput('');
    setBeliefLoading(true);

    try {
      const stage = belief.stage === 1 ? 1 : belief.stage === 2 ? 2 : 3;
      const result = await sendBeliefJournalMessage(updatedBelief, stage as 1 | 2 | 3);
      const cabinetTurn: BeliefDialogueTurn = { role: 'cabinet', content: result.response, timestamp: Date.now() };
      const finalBelief: BeliefEntry = {
        ...updatedBelief,
        dialogue: [...updatedBelief.dialogue, cabinetTurn],
        refinedStatement: result.refinedStatement || belief.refinedStatement,
        virtueCheck: result.virtueCheck || belief.virtueCheck,
        updatedAt: Date.now(),
      };
      saveBeliefs(beliefs.map(b => b.id === beliefId ? finalBelief : b));
    } catch {
      alert('The Cabinet is unavailable. Please try again.');
    } finally {
      setBeliefLoading(false);
    }
  };

  const refineBelief = async (beliefId: string) => {
    const belief = beliefs.find(b => b.id === beliefId);
    if (!belief) return;
    setBeliefLoading(true);
    try {
      const result = await sendBeliefJournalMessage(belief, 2);
      const cabinetTurn: BeliefDialogueTurn = { role: 'cabinet', content: result.response, timestamp: Date.now() };
      const finalBelief: BeliefEntry = {
        ...belief,
        stage: 2,
        dialogue: [...belief.dialogue, cabinetTurn],
        refinedStatement: result.refinedStatement || belief.refinedStatement,
        virtueCheck: result.virtueCheck || belief.virtueCheck,
        updatedAt: Date.now(),
      };
      saveBeliefs(beliefs.map(b => b.id === beliefId ? finalBelief : b));
    } catch {
      alert('The Cabinet is unavailable. Please try again.');
    } finally {
      setBeliefLoading(false);
    }
  };

  const encodeBelief = (beliefId: string) => {
    const belief = beliefs.find(b => b.id === beliefId);
    if (!belief || !belief.refinedStatement) return;
    const encoded: BeliefEntry = {
      ...belief,
      stage: 'encoded',
      encodedBelief: belief.refinedStatement,
      updatedAt: Date.now(),
    };
    saveBeliefs(beliefs.map(b => b.id === beliefId ? encoded : b));
  };

  const filteredEntries = searchQuery
    ? entries.filter(e => e.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none w-full";

  const activeBelief = activeBeliefId ? beliefs.find(b => b.id === activeBeliefId) : null;

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Journal" subtitle="Examine. Record. Encode." />

      {/* Tabs */}
      <div className="flex border-b border-arete-border mb-6">
        {(['journal', 'commonplace', 'beliefs'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-arete-gold border-arete-gold' : 'text-arete-muted border-transparent hover:text-arete-text'
            }`}
          >
            {t === 'commonplace' ? 'Commonplace' : t === 'beliefs' ? 'Beliefs' : 'Journal'}
          </button>
        ))}
      </div>

      {/* Journal Tab */}
      {tab === 'journal' && (
        <div>
          {/* Daily Prompt */}
          <div className="bg-arete-surface rounded-lg border-l-4 border-arete-gold p-4 mb-4">
            <p className="text-arete-gold text-sm font-semibold mb-1">Today&apos;s Prompt</p>
            <p className="text-arete-text text-sm italic">{dailyPrompt}</p>
          </div>

          {/* Search + New Entry */}
          <div className="flex gap-2 mb-4">
            <input
              className="bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none flex-1 text-sm"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => setShowNewEntry(s => !s)}
              className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-3 py-2 hover:opacity-90 text-sm"
            >
              + New Entry
            </button>
          </div>

          {/* New Entry Form */}
          {showNewEntry && (
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4">
              <textarea
                className={`${inputClass} resize-none mb-3`}
                rows={6}
                placeholder="Write your entry..."
                value={newEntry}
                onChange={e => setNewEntry(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNewEntry(false); setNewEntry(''); }} className="text-arete-muted text-sm hover:text-arete-text">Cancel</button>
                <button onClick={addEntry} className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm">Save Entry</button>
              </div>
            </div>
          )}

          {/* Entry List */}
          <div className="space-y-3">
            {filteredEntries.length === 0 && (
              <p className="text-arete-muted text-sm text-center py-8">No entries yet. Start writing.</p>
            )}
            {filteredEntries.map(entry => (
              <div key={entry.id} className="bg-arete-surface rounded-lg border border-arete-border p-4">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-arete-muted text-xs">{entry.date}</p>
                  <button onClick={() => deleteEntry(entry.id)} className="text-arete-muted hover:text-red-400 text-xs">✕</button>
                </div>
                <div
                  className="mt-2 cursor-pointer"
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                >
                  {expandedEntry === entry.id ? (
                    <p className="text-arete-text text-sm leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                  ) : (
                    <p className="text-arete-text text-sm line-clamp-3">{entry.text}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commonplace Tab */}
      {tab === 'commonplace' && (
        <div>
          <button
            onClick={() => setShowAddQuote(s => !s)}
            className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm mb-4"
          >
            + Add Quote
          </button>

          {showAddQuote && (
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4 space-y-3">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Quote..."
                value={newQuote}
                onChange={e => setNewQuote(e.target.value)}
                autoFocus
              />
              <input className={inputClass} placeholder="Book title..." value={newBook} onChange={e => setNewBook(e.target.value)} />
              <input className={inputClass} placeholder="Author..." value={newAuthor} onChange={e => setNewAuthor(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddQuote(false)} className="text-arete-muted text-sm hover:text-arete-text">Cancel</button>
                <button onClick={addQuote} className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm">Save</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {quotes.length === 0 && (
              <p className="text-arete-muted text-sm text-center py-8">No quotes saved yet. Build your commonplace book.</p>
            )}
            {quotes.map(q => (
              <div key={q.id} className="bg-arete-surface rounded-lg border border-arete-border p-4">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-arete-gold italic text-sm leading-relaxed flex-1">&ldquo;{q.quote}&rdquo;</p>
                  <button onClick={() => deleteQuote(q.id)} className="text-arete-muted hover:text-red-400 text-xs flex-shrink-0">✕</button>
                </div>
                <p className="text-arete-muted text-xs mt-2">— {q.book} by {q.author}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Beliefs Tab */}
      {tab === 'beliefs' && (
        <div>
          {!activeBelief ? (
            <>
              <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4">
                <p className="text-arete-muted text-sm mb-1">The Belief Workshop examines your beliefs through Socratic dialogue. Only examined beliefs become encoded.</p>
              </div>

              <button
                onClick={() => setShowNewBelief(s => !s)}
                className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm mb-4"
              >
                + New Belief
              </button>

              {showNewBelief && (
                <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4 space-y-3">
                  <p className="text-arete-gold text-sm font-semibold">State your raw belief or assumption:</p>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={4}
                    placeholder="I believe that..."
                    value={rawThought}
                    onChange={e => setRawThought(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowNewBelief(false)} className="text-arete-muted text-sm hover:text-arete-text">Cancel</button>
                    <button
                      onClick={startNewBelief}
                      disabled={beliefLoading || !rawThought.trim()}
                      className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 text-sm disabled:opacity-60"
                    >
                      {beliefLoading ? 'Examining...' : 'Submit to Workshop'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {beliefs.length === 0 && (
                  <p className="text-arete-muted text-sm text-center py-8">No beliefs examined yet.</p>
                )}
                {beliefs.map(belief => (
                  <button
                    key={belief.id}
                    onClick={() => setActiveBeliefId(belief.id)}
                    className="w-full text-left bg-arete-surface rounded-lg border border-arete-border p-4 hover:border-arete-gold transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-arete-text text-sm font-medium line-clamp-2">{belief.rawThought.slice(0, 100)}{belief.rawThought.length > 100 ? '…' : ''}</p>
                      <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${belief.stage === 'encoded' ? 'bg-arete-gold text-arete-bg' : 'bg-arete-border text-arete-muted'}`}>
                        {belief.stage === 'encoded' ? 'Encoded' : `Stage ${belief.stage}`}
                      </span>
                    </div>
                    {belief.virtueCheck && !belief.virtueCheck.passed && (
                      <p className="text-red-400 text-xs mt-1">⚠️ Virtue concern: {belief.virtueCheck.concern}</p>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            // Active belief workshop
            <div>
              <button onClick={() => setActiveBeliefId(null)} className="text-arete-muted hover:text-arete-text text-sm mb-4">← Back to Beliefs</button>

              <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4">
                <p className="text-arete-muted text-xs mb-1">Raw belief:</p>
                <p className="text-arete-text text-sm italic">&ldquo;{activeBelief.rawThought}&rdquo;</p>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${activeBelief.stage === 'encoded' ? 'bg-arete-gold text-arete-bg' : 'bg-arete-border text-arete-muted'}`}>
                  {activeBelief.stage === 'encoded' ? 'Encoded Canon' : `Stage ${activeBelief.stage}`}
                </span>
              </div>

              {/* Dialogue */}
              <div className="space-y-3 mb-4">
                {activeBelief.dialogue.map((turn, i) => (
                  <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      turn.role === 'user'
                        ? 'bg-arete-border text-arete-text'
                        : 'bg-arete-surface border border-arete-gold text-arete-gold'
                    }`}>
                      <p className="whitespace-pre-wrap">{turn.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Refined Statement */}
              {activeBelief.refinedStatement && (
                <div className="bg-arete-surface rounded-lg border border-arete-gold p-4 mb-4">
                  <p className="text-arete-gold text-sm font-semibold mb-2">Refined Belief:</p>
                  <p className="text-arete-text text-sm leading-relaxed">{activeBelief.refinedStatement}</p>
                  {activeBelief.virtueCheck && !activeBelief.virtueCheck.passed && (
                    <p className="text-red-400 text-xs mt-2">⚠️ {activeBelief.virtueCheck.concern}</p>
                  )}
                </div>
              )}

              {activeBelief.stage !== 'encoded' && (
                <>
                  {/* Input */}
                  <div className="flex gap-2 mb-3">
                    <textarea
                      className={`${inputClass} resize-none flex-1`}
                      rows={2}
                      placeholder="Continue the dialogue..."
                      value={beliefDialogueInput}
                      onChange={e => setBeliefDialogueInput(e.target.value)}
                    />
                    <button
                      onClick={() => sendBeliefMessage(activeBelief.id)}
                      disabled={beliefLoading || !beliefDialogueInput.trim()}
                      className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-3 py-2 hover:opacity-90 disabled:opacity-40 self-end text-sm"
                    >
                      Send
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => refineBelief(activeBelief.id)}
                      disabled={beliefLoading}
                      className="flex-1 border border-arete-gold text-arete-gold rounded-lg px-4 py-2 hover:bg-arete-gold hover:text-arete-bg transition-colors text-sm font-semibold disabled:opacity-40"
                    >
                      Refine Belief
                    </button>
                    {activeBelief.refinedStatement && (
                      <button
                        onClick={() => encodeBelief(activeBelief.id)}
                        className="flex-1 bg-arete-gold text-arete-bg rounded-lg px-4 py-2 hover:opacity-90 text-sm font-semibold"
                      >
                        Encode as Canon
                      </button>
                    )}
                  </div>
                </>
              )}

              {activeBelief.stage === 'encoded' && (
                <div className="bg-arete-gold rounded-lg p-4 text-center">
                  <p className="text-arete-bg font-bold">✓ Encoded as Canon Belief</p>
                  <p className="text-arete-bg text-sm mt-1 opacity-80">This belief has been examined and committed to.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
