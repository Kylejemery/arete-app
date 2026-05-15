'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  author_id: string | null;
  handle: string;
  title: string;
  body: string;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

interface Reply {
  id: string;
  thread_id: string;
  author_id: string | null;
  handle: string;
  body: string;
  is_stoa: boolean;
  stoa_chunks: Chunk[] | null;
  created_at: string;
}

interface Chunk {
  content: string;
  source_author: string;
  source_title: string;
  text_type?: string;
  similarity?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  active,
  onClick,
}: {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-[#0F1E35] transition-colors ${
        active
          ? 'border-l-2 border-l-[#C9A84C] bg-[#0C1C30]'
          : 'border-l-2 border-l-transparent hover:bg-[#0C1C30]'
      }`}
    >
      <p className="font-serif text-[#E8E0D0] text-sm leading-snug mb-1 line-clamp-2">
        {thread.title}
      </p>
      <div className="flex items-center gap-2 text-[#6B7A99]" style={{ fontFamily: 'DM Mono, monospace' }}>
        <span className="text-xs">{thread.handle}</span>
        <span className="text-xs opacity-50">&middot;</span>
        <span className="text-xs">{timeAgo(thread.updated_at)}</span>
        {thread.reply_count > 0 && (
          <>
            <span className="text-xs opacity-50">&middot;</span>
            <span className="text-xs">{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
          </>
        )}
      </div>
    </button>
  );
}

function ReplyBubble({ reply }: { reply: Reply }) {
  if (reply.is_stoa) {
    return (
      <div className="border-l-2 border-[#C9A84C] pl-4 py-1 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[#C9A84C] text-xs uppercase tracking-widest"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            The Stoa
          </span>
          <span className="text-[#6B7A99] text-xs">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="text-[#E8E0D0] text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
      </div>
    );
  }
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[#6B7A99] text-xs"
          style={{ fontFamily: 'DM Mono, monospace' }}
        >
          {reply.handle}
        </span>
        <span className="text-[#6B7A99] text-xs opacity-50">{timeAgo(reply.created_at)}</span>
      </div>
      <p className="text-[#E8E0D0] text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: Chunk }) {
  return (
    <div
      className="border-l-2 border-[#C9A84C]/40 pl-3 py-2 mb-3 rounded-r"
      style={{ background: '#0C1420' }}
    >
      <p
        className="text-[#C9A84C] text-xs mb-1.5 truncate"
        style={{ fontFamily: 'DM Mono, monospace' }}
      >
        {chunk.source_author} — {chunk.source_title}
      </p>
      <p className="text-[#E8E0D0] text-xs leading-relaxed line-clamp-4">{chunk.content}</p>
    </div>
  );
}

function ChunkSkeleton() {
  return (
    <div className="border-l-2 border-[#C9A84C]/20 pl-3 py-2 mb-3 animate-pulse" style={{ background: '#0C1420' }}>
      <div className="h-3 bg-[#1a2a3a] rounded w-2/3 mb-2" />
      <div className="h-2 bg-[#1a2a3a] rounded w-full mb-1" />
      <div className="h-2 bg-[#1a2a3a] rounded w-4/5" />
    </div>
  );
}

function NewThreadModal({
  onClose,
  onPost,
}: {
  onClose: () => void;
  onPost: (title: string, body: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !body.trim() || posting) return;
    setPosting(true);
    await onPost(title.trim(), body.trim());
    setPosting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg bg-[#0A1628] border border-[#1a2a3a] rounded-xl shadow-2xl p-6">
        <h2 className="font-serif text-[#E8E0D0] text-xl mb-5">Start a Thread</h2>
        <input
          className="w-full bg-[#080E1A] border border-[#1a2a3a] rounded-lg px-4 py-3 text-[#E8E0D0] placeholder-[#6B7A99] text-sm mb-3 focus:border-[#C9A84C] focus:outline-none"
          placeholder="Title — a question, a claim, a passage"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={140}
        />
        <textarea
          className="w-full bg-[#080E1A] border border-[#1a2a3a] rounded-lg px-4 py-3 text-[#E8E0D0] placeholder-[#6B7A99] text-sm resize-none focus:border-[#C9A84C] focus:outline-none"
          rows={5}
          placeholder="Develop the question or argument. The Stoa and your fellow students will respond."
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <div className="flex items-center justify-between mt-4">
          <button onClick={onClose} className="text-[#6B7A99] text-sm hover:text-[#E8E0D0] transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim() || !body.trim() || posting}
            className="bg-[#C9A84C] text-[#080E1A] font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {posting ? 'Posting…' : 'Post to the Courtyard'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HandleModal({ onSave }: { onSave: (handle: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const h = value.trim().replace(/\s/g, '');
    if (!h || saving) return;
    setSaving(true);
    await onSave(h);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm bg-[#0A1628] border border-[#1a2a3a] rounded-xl shadow-2xl p-6">
        <h2 className="font-serif text-[#E8E0D0] text-xl mb-2">Choose your Courtyard handle</h2>
        <p className="text-[#6B7A99] text-sm mb-5">
          This is how you&apos;ll appear to other students. No spaces, max 24 characters.
        </p>
        <input
          className="w-full bg-[#080E1A] border border-[#1a2a3a] rounded-lg px-4 py-3 text-[#E8E0D0] placeholder-[#6B7A99] text-sm mb-4 focus:border-[#C9A84C] focus:outline-none"
          placeholder="e.g. Aurelius_student"
          value={value}
          onChange={e => setValue(e.target.value.replace(/\s/g, '').slice(0, 24))}
          onKeyDown={e => e.key === 'Enter' && submit()}
          maxLength={24}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || saving}
          className="w-full bg-[#C9A84C] text-[#080E1A] font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? 'Saving…' : 'Enter the Courtyard'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CourtyardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [handleModalOpen, setHandleModalOpen] = useState(false);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);

  const [ragChunks, setRagChunks] = useState<Chunk[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [stoaChunks, setStoaChunks] = useState<Chunk[] | null>(null);
  const [stoaLabel, setStoaLabel] = useState('');

  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const [loaded, setLoaded] = useState(false);

  const ragDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const threadSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const replySubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceCountIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const handleRef = useRef<string | null>(null);

  // ── Presence helpers ─────────────────────────────────────────────────────────

  const upsertPresence = useCallback(async (uid: string, h: string) => {
    await supabase.from('courtyard_presence').upsert(
      { user_id: uid, handle: h, last_seen: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }, []);

  const refreshPresenceCount = useCallback(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('courtyard_presence')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', fiveMinAgo);
    setPresenceCount(count ?? 0);
  }, []);

  // ── Mount: auth + threads + realtime ─────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);
      setToken(session.access_token);
      userIdRef.current = session.user.id;

      // Load handle
      const { data: profile } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', session.user.id)
        .single();

      if (profile?.handle) {
        setHandle(profile.handle);
        handleRef.current = profile.handle;
        await upsertPresence(session.user.id, profile.handle);
      } else {
        setHandleModalOpen(true);
      }

      // Load threads
      const { data: threadData } = await supabase
        .from('courtyard_threads')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
      setThreads(threadData ?? []);

      // Presence count
      await refreshPresenceCount();

      // Realtime: new threads — unique name avoids StrictMode channel-reuse error
      const threadSub = supabase
        .channel(`courtyard_thread_inserts_${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'courtyard_threads' },
          (payload) => {
            setThreads(prev => [payload.new as Thread, ...prev]);
          }
        )
        .subscribe();
      threadSubRef.current = threadSub;

      // Presence count refresh every 30s
      presenceCountIntervalRef.current = setInterval(refreshPresenceCount, 30_000);
    }

    init().finally(() => setLoaded(true));


    return () => {
      if (threadSubRef.current) supabase.removeChannel(threadSubRef.current);
      if (replySubRef.current) supabase.removeChannel(replySubRef.current);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (presenceCountIntervalRef.current) clearInterval(presenceCountIntervalRef.current);
    };
  }, [upsertPresence, refreshPresenceCount]);

  // ── Presence heartbeat when handle is set ────────────────────────────────────

  useEffect(() => {
    if (!userId || !handle) return;
    handleRef.current = handle;
    const interval = setInterval(() => {
      if (userIdRef.current && handleRef.current) {
        upsertPresence(userIdRef.current, handleRef.current);
      }
    }, 60_000);
    presenceIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [userId, handle, upsertPresence]);

  // ── Load replies + realtime when active thread changes ───────────────────────

  useEffect(() => {
    if (!activeThread) { setReplies([]); return; }

    supabase
      .from('courtyard_replies')
      .select('*')
      .eq('thread_id', activeThread.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        const replyList = (data ?? []) as Reply[];
        setReplies(replyList);
        // Surface stoa chunks from most recent stoa reply
        const lastStoa = [...replyList].reverse().find(r => r.is_stoa && r.stoa_chunks);
        if (lastStoa) {
          setStoaChunks(lastStoa.stoa_chunks);
          setStoaLabel('Referenced in The Stoa\'s last response');
        } else {
          setStoaChunks(null);
          setStoaLabel('');
        }
      });

    if (replySubRef.current) supabase.removeChannel(replySubRef.current);

    const replySub = supabase
      .channel(`replies_${activeThread.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'courtyard_replies',
          filter: `thread_id=eq.${activeThread.id}`,
        },
        (payload) => {
          const newReply = payload.new as Reply;
          setReplies(prev => {
            if (prev.find(r => r.id === newReply.id)) return prev;
            return [...prev, newReply];
          });
          if (newReply.is_stoa && newReply.stoa_chunks) {
            setStoaChunks(newReply.stoa_chunks as Chunk[]);
            setStoaLabel('Referenced in The Stoa\'s last response');
          }
        }
      )
      .subscribe();
    replySubRef.current = replySub;
  }, [activeThread?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll replies ───────────────────────────────────────────────────────

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  // ── RAG debounce on reply input ──────────────────────────────────────────────

  useEffect(() => {
    if (!replyInput.trim() || replyInput.length < 8) {
      if (ragDebounceRef.current) clearTimeout(ragDebounceRef.current);
      if (!stoaChunks) setRagChunks([]);
      setRagLoading(false);
      return;
    }

    if (ragDebounceRef.current) clearTimeout(ragDebounceRef.current);

    ragDebounceRef.current = setTimeout(async () => {
      setRagLoading(true);
      setStoaChunks(null);
      setStoaLabel('');
      try {
        const res = await fetch('/api/courtyard/rag-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query: replyInput }),
        });
        const data = await res.json();
        setRagChunks(data.chunks ?? []);
      } catch {}
      finally { setRagLoading(false); }
    }, 600);

    return () => { if (ragDebounceRef.current) clearTimeout(ragDebounceRef.current); };
  }, [replyInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleSaveHandle = async (h: string) => {
    if (!userId) return;
    await supabase.from('profiles').update({ handle: h }).eq('id', userId);
    setHandle(h);
    handleRef.current = h;
    setHandleModalOpen(false);
    await upsertPresence(userId, h);
  };

  const handleSelectThread = (thread: Thread) => {
    setActiveThread(thread);
    setReplyInput('');
    setRagChunks([]);
    setStoaChunks(null);
    setStoaLabel('');
    setMobileView('thread');
  };

  const handlePostThread = async (title: string, body: string) => {
    if (!userId || !handle) return;
    const { data, error } = await supabase
      .from('courtyard_threads')
      .insert({ author_id: userId, handle, title, body })
      .select()
      .single();
    if (!error && data) {
      setActiveThread(data as Thread);
      setMobileView('thread');
    }
    setNewThreadOpen(false);
  };

  const handleSubmitReply = async () => {
    if (!replyInput.trim() || !activeThread || !userId || !handle || submitting) return;

    const containsStoa = replyInput.includes('@TheStoa');
    const displayBody = containsStoa
      ? replyInput.replace('@TheStoa', '').trim() || replyInput
      : replyInput;

    setSubmitting(true);
    setReplyInput('');

    try {
      // Insert human reply
      await supabase.from('courtyard_replies').insert({
        thread_id: activeThread.id,
        author_id: userId,
        handle,
        body: displayBody,
        is_stoa: false,
      });

      if (containsStoa && token) {
        const threadReplies = replies.map(r => `${r.handle}: ${r.body}`).join('\n');
        // Backend inserts Stoa reply and returns chunks
        await fetch('/api/courtyard/stoa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            thread_id: activeThread.id,
            thread_title: activeThread.title,
            thread_body: activeThread.body,
            replies: threadReplies,
            query: displayBody || activeThread.title,
          }),
        });
        // Realtime subscription will pick up the inserted Stoa reply automatically
      }
    } catch (err) {
      console.error('submit reply error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const rightPanelContent = (() => {
    if (stoaChunks && stoaChunks.length > 0) {
      return { chunks: stoaChunks, label: stoaLabel, loading: false };
    }
    if (ragLoading) {
      return { chunks: [], label: '', loading: true };
    }
    if (ragChunks.length > 0) {
      return { chunks: ragChunks.slice(0, 5), label: 'Relevant passages', loading: false };
    }
    return null;
  })();

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#080E1A' }}>
        <p className="font-serif text-[#6B7A99] italic text-sm">Entering the Courtyard…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#080E1A' }}>

      {/* Modals */}
      {handleModalOpen && <HandleModal onSave={handleSaveHandle} />}
      {newThreadOpen && (
        <NewThreadModal
          onClose={() => setNewThreadOpen(false)}
          onPost={handlePostThread}
        />
      )}

      {/* ── HEADER ── */}
      <header
        className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b"
        style={{ borderColor: '#0F1E35', background: '#0A1628' }}
      >
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          {mobileView === 'thread' && (
            <button
              className="md:hidden text-[#6B7A99] hover:text-[#E8E0D0] text-sm mr-1"
              onClick={() => setMobileView('list')}
            >
              ← Threads
            </button>
          )}
          <span className="font-serif text-[#C9A84C] text-lg">The Courtyard</span>
          <span className="text-[#1a2a3a] text-xs select-none hidden md:inline">|</span>
          <span className="text-[#6B7A99] text-xs italic hidden md:inline">
            A shared space for the examined life
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Presence indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            {presenceCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A84C] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C9A84C]" />
              </span>
            )}
            <span className="text-[#6B7A99] text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
              {presenceCount} in the Courtyard
            </span>
          </div>
          {handle && (
            <button
              onClick={() => setNewThreadOpen(true)}
              className="bg-[#C9A84C] text-[#080E1A] font-semibold px-4 py-1.5 rounded-lg text-xs hover:opacity-90 transition-opacity"
            >
              + New Thread
            </button>
          )}
        </div>
      </header>

      {/* ── THREE COLUMNS ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Thread list */}
        <aside
          className={`w-full md:w-72 md:flex-shrink-0 flex flex-col border-r overflow-y-auto ${
            mobileView === 'thread' ? 'hidden md:flex' : 'flex'
          }`}
          style={{ borderColor: '#0F1E35', background: '#0A1628' }}
        >
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-6 text-center py-16">
              <p className="font-serif text-[#6B7A99] italic text-sm mb-2">
                No threads yet.
              </p>
              <p className="text-[#6B7A99] text-xs">
                Be the first to raise a question.
              </p>
            </div>
          ) : (
            threads.map(t => (
              <ThreadCard
                key={t.id}
                thread={t}
                active={activeThread?.id === t.id}
                onClick={() => handleSelectThread(t)}
              />
            ))
          )}
        </aside>

        {/* CENTER: Active thread */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <p className="font-serif text-[#E8E0D0] text-xl italic mb-3">
                &ldquo;The examined life begins with a question.&rdquo;
              </p>
              <p className="text-[#6B7A99] text-sm">
                Start a thread or select one to enter the discussion.
              </p>
            </div>
          ) : (
            <>
              {/* Thread header + body */}
              <div
                className="flex-shrink-0 px-6 py-5 border-b overflow-y-auto"
                style={{ borderColor: '#0F1E35', maxHeight: '45%' }}
              >
                <h2 className="font-serif text-[#E8E0D0] text-2xl leading-tight mb-2">
                  {activeThread.title}
                </h2>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-[#6B7A99] text-xs"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  >
                    {activeThread.handle}
                  </span>
                  <span className="text-[#6B7A99] text-xs opacity-50">&middot;</span>
                  <span
                    className="text-[#6B7A99] text-xs"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  >
                    {timeAgo(activeThread.created_at)}
                  </span>
                </div>
                <p className="text-[#E8E0D0] text-sm leading-relaxed whitespace-pre-wrap">
                  {activeThread.body}
                </p>
                <div className="mt-5 border-t border-[#C9A84C]/20" />
              </div>

              {/* Replies */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {replies.length === 0 ? (
                  <p className="text-[#6B7A99] text-sm italic text-center py-8">
                    No replies yet. Open the examination.
                  </p>
                ) : (
                  replies.map(r => <ReplyBubble key={r.id} reply={r} />)
                )}
                <div ref={repliesEndRef} />
              </div>

              {/* Reply composer */}
              {handle ? (
                <div
                  className="flex-shrink-0 border-t px-4 py-3"
                  style={{ borderColor: '#0F1E35', background: '#0A1628' }}
                >
                  <textarea
                    className="w-full rounded-lg px-4 py-3 text-sm text-[#E8E0D0] placeholder-[#6B7A99] resize-none focus:outline-none focus:border-[#C9A84C] border"
                    style={{ background: '#080E1A', borderColor: '#1a2a3a' }}
                    rows={2}
                    placeholder="Respond to the thread…"
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitReply();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setReplyInput(prev => prev + (prev.endsWith(' ') ? '' : ' ') + '@TheStoa')}
                      className="text-[#C9A84C] text-xs hover:opacity-80 transition-opacity border border-[#C9A84C]/30 px-3 py-1.5 rounded-full"
                      style={{ fontFamily: 'DM Mono, monospace' }}
                    >
                      @TheStoa
                    </button>
                    <button
                      onClick={handleSubmitReply}
                      disabled={!replyInput.trim() || submitting}
                      className="bg-[#C9A84C] text-[#080E1A] font-semibold px-4 py-1.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      {submitting ? 'Posting…' : 'Reply'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex-shrink-0 border-t px-6 py-4 text-center"
                  style={{ borderColor: '#0F1E35' }}
                >
                  <p className="text-[#6B7A99] text-sm italic">
                    Set your handle to join the discussion.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: The Stoa — corpus chunks */}
        <div
          className="hidden lg:flex flex-col w-72 flex-shrink-0 border-l overflow-y-auto"
          style={{ borderColor: '#0F1E35', background: '#0A1628' }}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-5 py-4 border-b" style={{ borderColor: '#0F1E35' }}>
            <p
              className="text-[#C9A84C] text-xs uppercase tracking-widest"
              style={{ fontFamily: 'DM Mono, monospace' }}
            >
              The Stoa
            </p>
            <p className="text-[#6B7A99] text-xs mt-0.5">Primary corpus</p>
          </div>

          {/* Content */}
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            {rightPanelContent === null ? (
              <p className="text-[#6B7A99] text-xs italic leading-relaxed">
                The tradition listens. Begin writing to surface relevant passages.
              </p>
            ) : rightPanelContent.loading ? (
              <>
                <ChunkSkeleton />
                <ChunkSkeleton />
                <ChunkSkeleton />
              </>
            ) : (
              <>
                {rightPanelContent.label && (
                  <p
                    className="text-[#6B7A99] text-xs mb-3"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  >
                    {rightPanelContent.label}
                  </p>
                )}
                {rightPanelContent.chunks.map((c, i) => (
                  <ChunkCard key={i} chunk={c} />
                ))}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
