'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { JournalEntry } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

interface DisplayEntry {
  id: string;
  type: 'reflection' | 'quote' | 'idea';
  content: string;
  createdAt: number;
  updatedAt: number;
  bookTitle?: string;
  author?: string;
}

type FilterType = 'all' | 'reflection' | 'quote' | 'idea';

const TYPE_LABELS: Record<string, string> = {
  reflection: '📝 Reflection',
  quote: '📖 Quote',
  idea: '🧠 Idea',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function dbToDisplay(e: JournalEntry): DisplayEntry | null {
  if (e.type === 'belief') return null; // belief is mobile-only
  return {
    id: e.id,
    type: e.type as 'reflection' | 'quote' | 'idea',
    content: e.content,
    createdAt: new Date(e.created_at).getTime(),
    updatedAt: new Date(e.updated_at).getTime(),
    bookTitle: e.book_title,
    author: e.author,
  };
}

export default function JournalPage() {
  const router = useRouter();

  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [inputType, setInputType] = useState<'reflection' | 'quote' | 'idea' | null>(null);
  const [editingEntry, setEditingEntry] = useState<DisplayEntry | null>(null);
  const [textInput, setTextInput] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quoteBook, setQuoteBook] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }
      const dbEntries = await getJournalEntries();
      setEntries(dbEntries.map(dbToDisplay).filter(Boolean) as DisplayEntry[]);

      channel = supabase.channel('journal-changes')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'journal_entries',
          filter: `user_id=eq.${authUser.id}`,
        }, async () => {
          const fresh = await getJournalEntries();
          setEntries(fresh.map(dbToDisplay).filter(Boolean) as DisplayEntry[]);
        })
        .subscribe();
    }
    load();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [router]);

  const filteredEntries = entries
    .filter(e => activeFilter === 'all' || e.type === activeFilter)
    .filter(e => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return [e.content, e.bookTitle, e.author].filter(Boolean).join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const addEntry = async () => {
    if (inputType === 'quote') {
      if (!quoteText.trim() || !quoteBook.trim()) { alert('Please enter a quote and book title.'); return; }
      const created = await createJournalEntry({
        type: 'quote', content: quoteText.trim(),
        book_title: quoteBook.trim(), author: quoteAuthor.trim() || undefined,
      });
      if (created) {
        const d = dbToDisplay(created);
        if (d) setEntries(prev => [d, ...prev]);
      }
      resetInputForm();
      return;
    }
    if (!textInput.trim()) return;
    const created = await createJournalEntry({ type: inputType!, content: textInput.trim() });
    if (created) {
      const d = dbToDisplay(created);
      if (d) setEntries(prev => [d, ...prev]);
    }
    resetInputForm();
  };

  const updateEntry = async () => {
    if (!editingEntry) return;
    if (editingEntry.type === 'quote') {
      if (!quoteText.trim() || !quoteBook.trim()) { alert('Please enter a quote and book title.'); return; }
      await updateJournalEntry(editingEntry.id, {
        content: quoteText.trim(), book_title: quoteBook.trim(),
        author: quoteAuthor.trim() || undefined,
      });
      setEntries(prev => prev.map(e => e.id === editingEntry.id
        ? { ...e, content: quoteText.trim(), bookTitle: quoteBook.trim(), author: quoteAuthor.trim() || undefined, updatedAt: Date.now() }
        : e));
    } else {
      if (!textInput.trim()) return;
      await updateJournalEntry(editingEntry.id, { content: textInput.trim() });
      setEntries(prev => prev.map(e => e.id === editingEntry.id
        ? { ...e, content: textInput.trim(), updatedAt: Date.now() }
        : e));
    }
    resetInputForm();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    await deleteJournalEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setMenuEntryId(null);
  };

  const resetInputForm = () => {
    setShowInputForm(false); setEditingEntry(null); setInputType(null);
    setTextInput(''); setQuoteText(''); setQuoteBook(''); setQuoteAuthor('');
  };

  const openEdit = (entry: DisplayEntry) => {
    setMenuEntryId(null);
    setEditingEntry(entry);
    if (entry.type === 'quote') {
      setQuoteText(entry.content); setQuoteBook(entry.bookTitle || ''); setQuoteAuthor(entry.author || '');
    } else {
      setTextInput(entry.content);
    }
    setInputType(entry.type);
    setShowInputForm(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectType = (type: 'reflection' | 'quote' | 'idea') => {
    setShowTypeSelector(false);
    setInputType(type); setEditingEntry(null);
    setTextInput(''); setQuoteText(''); setQuoteBook(''); setQuoteAuthor('');
    setShowInputForm(true);
  };

  // Input form
  if (showInputForm && inputType) {
    const isEditing = !!editingEntry;
    return (
      <div className="min-h-screen bg-arete-bg text-arete-text flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6">
            <button onClick={resetInputForm} className="text-arete-gold text-lg font-bold hover:opacity-80">&larr;</button>
            <h1 className="text-lg font-bold text-arete-text">
              {isEditing ? 'Edit' : 'New'} {TYPE_LABELS[inputType]}
            </h1>
            <button onClick={isEditing ? updateEntry : addEntry} className="text-arete-gold text-sm font-semibold hover:opacity-80">
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
              placeholder={inputType === 'reflection' ? "What's on your mind?" : 'What seed do you want to keep?'}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              autoFocus
            />
          )}
        </div>
      </div>
    );
  }

  // Main feed
  return (
    <div className="min-h-screen bg-arete-bg text-arete-text">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4">
          <PageHeader title="Journal 📓" />
        </div>

        {/* Search */}
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
            <button onClick={() => setSearchQuery('')} className="text-arete-muted hover:text-arete-text text-sm">&#x2715;</button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['all', 'reflection', 'quote', 'idea'] as FilterType[]).map(f => (
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
              {f === 'all' ? 'All' : f === 'reflection' ? '📝 Reflection' : f === 'quote' ? '📖 Quote' : '🧠 Idea'}
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
              const preview = entry.content.length > 120 ? entry.content.slice(0, 120) + '...' : entry.content;

              return (
                <div
                  key={entry.id}
                  className="relative rounded-lg p-4 cursor-pointer transition-opacity hover:opacity-90"
                  style={{ border: '1px solid rgba(201,168,76,0.13)', background: '#1a1a2e' }}
                  onClick={() => toggleExpand(entry.id)}
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
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-arete-text hover:bg-arete-surface"
                                onClick={() => openEdit(entry)}
                              >
                                &#x270F; Edit
                              </button>
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
                          📖 {entry.bookTitle}{entry.author && ` — ${entry.author}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-arete-text text-sm leading-relaxed">
                      {isExpanded ? entry.content : preview}
                    </p>
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
            {(['reflection', 'quote', 'idea'] as const).map(t => (
              <button
                key={t}
                onClick={() => selectType(t)}
                className="w-full text-left px-4 py-3 rounded-lg mb-2 hover:bg-arete-surface transition-colors"
                style={{ border: '1px solid #2a3a5c' }}
              >
                <div className="font-semibold text-sm text-arete-text">
                  {t === 'reflection' ? '📝 Reflection' : t === 'quote' ? '📖 Quote' : '🧠 Idea'}
                </div>
                <div className="text-xs text-arete-muted mt-0.5">
                  {t === 'reflection' ? 'Daily thoughts, free writing'
                    : t === 'quote' ? 'Passage from a book'
                    : 'Seed for an essay or project'}
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
