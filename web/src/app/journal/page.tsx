'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { JournalEntry } from '@/lib/types';
import ChapterRule from '@/components/ChapterRule';

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
  reflection: 'Reflection',
  quote: 'Quote',
  idea: 'Idea',
};

const TYPE_ICONS: Record<string, string> = {
  reflection: '📝',
  quote: '📖',
  idea: '🧠',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dbToDisplay(e: JournalEntry): DisplayEntry | null {
  if (e.type === 'belief') return null;
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

  // ── Input form (returns early) ────────────────────────────────
  if (showInputForm && inputType) {
    const isEditing = !!editingEntry;
    return (
      <div className="min-h-screen pb-8" style={{ background: '#0f1724' }}>
        <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col">
          {/* Form header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={resetInputForm}
              className="text-[10px] tracking-[1.2px] uppercase transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              ← Cancel
            </button>
            <div
              className="text-[11px] tracking-[1.8px] uppercase"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              {isEditing ? 'Edit' : 'New'} {TYPE_LABELS[inputType]}
            </div>
            <button
              onClick={isEditing ? updateEntry : addEntry}
              className="text-[10px] tracking-[1.2px] uppercase font-semibold transition-opacity hover:opacity-80"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              Save
            </button>
          </div>

          {inputType === 'quote' ? (
            <div className="flex flex-col gap-3">
              <textarea
                className="w-full min-h-40 px-4 py-3 text-[15px] italic leading-relaxed resize-none outline-none rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#e6eef8',
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                }}
                placeholder='"Enter quote…"'
                value={quoteText}
                onChange={e => setQuoteText(e.target.value)}
                autoFocus
              />
              <input
                type="text"
                className="w-full px-4 py-3 text-[14px] outline-none rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e6eef8',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                }}
                placeholder="Book title *"
                value={quoteBook}
                onChange={e => setQuoteBook(e.target.value)}
              />
              <input
                type="text"
                className="w-full px-4 py-3 text-[14px] outline-none rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e6eef8',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                }}
                placeholder="Author (optional)"
                value={quoteAuthor}
                onChange={e => setQuoteAuthor(e.target.value)}
              />
            </div>
          ) : (
            <textarea
              className="w-full min-h-64 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e6eef8',
                fontFamily: 'var(--font-serif, Georgia, serif)',
              }}
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

  // ── Main feed ────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Chapter IV · Examen
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          The examined<br />
          <em style={{ color: '#c9a84c' }}>life.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ color: '#9aa0a6', fontSize: 13 }}>⌕</span>
          <input
            type="text"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: '#e6eef8', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}
            placeholder="Search entries…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="transition-opacity hover:opacity-70"
              style={{ color: '#9aa0a6', fontSize: 13 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Filter chips ────────────────────────────────────────── */}
      <div className="px-4 pb-5 flex gap-2 overflow-x-auto">
        {(['all', 'reflection', 'quote', 'idea'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(prev => prev === f ? 'all' : f)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] transition-all"
            style={
              activeFilter === f
                ? {
                    background: '#c9a84c',
                    color: '#0f1724',
                    fontFamily: 'var(--font-mono, monospace)',
                    border: '1px solid #c9a84c',
                    fontWeight: 700,
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    color: '#9aa0a6',
                    fontFamily: 'var(--font-mono, monospace)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }
            }
          >
            {f === 'all' ? 'All' : `${TYPE_ICONS[f]} ${TYPE_LABELS[f]}`}
          </button>
        ))}
      </div>

      {/* ── Entry feed ──────────────────────────────────────────── */}
      <div className="px-4">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4" style={{ opacity: 0.12 }}>📓</div>
            <p
              className="text-[15px] italic"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
            >
              No entries yet.
            </p>
            <p
              className="text-[11px] tracking-[1px] uppercase mt-1"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.5)' }}
            >
              Tap + to begin.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredEntries.map(entry => {
              const isExpanded = expandedIds.has(entry.id);
              const preview = entry.content.length > 120 ? entry.content.slice(0, 120) + '…' : entry.content;

              return (
                <div
                  key={entry.id}
                  className="relative rounded-xl px-4 py-3.5 cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onClick={() => toggleExpand(entry.id)}
                  onMouseEnter={() => setHoveredId(entry.id)}
                  onMouseLeave={() => { setHoveredId(null); setMenuEntryId(null); }}
                >
                  {/* Entry header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13 }}>{TYPE_ICONS[entry.type]}</span>
                      <span
                        className="text-[10px] tracking-[1.4px] uppercase"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                      >
                        {TYPE_LABELS[entry.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {formatDate(entry.createdAt)}
                      </span>
                      {hoveredId === entry.id && (
                        <div className="relative">
                          <button
                            onClick={e => { e.stopPropagation(); setMenuEntryId(prev => prev === entry.id ? null : entry.id); }}
                            className="px-1 transition-opacity hover:opacity-70 text-base leading-none"
                            style={{ color: '#9aa0a6' }}
                          >
                            ⋯
                          </button>
                          {menuEntryId === entry.id && (
                            <div
                              className="absolute right-0 top-6 rounded-xl shadow-lg z-10 py-1 min-w-[6rem] overflow-hidden"
                              style={{
                                background: 'rgba(15,23,36,0.97)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(12px)',
                              }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                className="w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-white/5"
                                style={{ fontFamily: 'var(--font-sans, system-ui)', color: '#e6eef8' }}
                                onClick={() => openEdit(entry)}
                              >
                                Edit
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-white/5"
                                style={{ fontFamily: 'var(--font-sans, system-ui)', color: '#f87171' }}
                                onClick={() => deleteEntry(entry.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entry content */}
                  {entry.type === 'quote' ? (
                    <>
                      <p
                        className={`italic text-[15px] leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        &ldquo;{entry.content}&rdquo;
                      </p>
                      {entry.bookTitle && (
                        <p
                          className="text-[11px] tracking-[0.5px] mt-1.5"
                          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                        >
                          {entry.bookTitle}{entry.author && ` — ${entry.author}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p
                      className="text-[15px] leading-relaxed"
                      style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                    >
                      {isExpanded ? entry.content : preview}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setShowTypeSelector(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:opacity-90 transition-opacity z-40"
        style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
      >
        +
      </button>

      {/* ── Type selector modal ──────────────────────────────────── */}
      {showTypeSelector && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ background: 'rgba(0,0,0,0.67)' }}
          onClick={() => setShowTypeSelector(false)}
        >
          <div
            className="w-full max-w-lg mx-auto rounded-t-2xl p-6"
            style={{
              background: 'rgba(13,20,30,0.98)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="text-[10px] tracking-[1.8px] uppercase mb-4 text-center"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              What are you adding?
            </div>
            {(['reflection', 'quote', 'idea'] as const).map(t => (
              <button
                key={t}
                onClick={() => selectType(t)}
                className="w-full text-left px-4 py-3.5 rounded-xl mb-2 transition-opacity hover:opacity-80"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="text-[15px] font-medium"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </div>
                <div
                  className="text-[11px] mt-0.5"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                >
                  {t === 'reflection' ? 'Daily thoughts, free writing'
                    : t === 'quote' ? 'Passage from a book'
                    : 'Seed for an essay or project'}
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowTypeSelector(false)}
              className="w-full py-3 rounded-xl text-[12px] tracking-[1px] uppercase mt-1 transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
