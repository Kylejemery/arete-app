'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSettings, getUserCabinet, getOrCreateCabinetConversationId } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendMessageToCabinet, sendMessageToCounselor, API_BASE_URL, type CabinetReply } from '@/lib/claudeService';
import { loadThread, saveThread, clearThread } from '@/lib/threadService';
import { useSubscription } from '@/lib/useSubscription';
import type { ThreadMessage } from '@/lib/threadService';
import { COUNSELOR_LIST } from '@/lib/counselors';
import GlassCard from '@/components/GlassCard';

type Tab = 'cabinet' | 'shared' | 'counselors';

// Shared-thread message: adds 'system' for join/leave notices and a sender
// label for user bubbles. System rows never go to the model.
type SharedMessage = Omit<ThreadMessage, 'role'> & {
  role: 'user' | 'assistant' | 'system';
  senderName?: string;
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function parseBlocks(text: string): { type: 'quote' | 'para'; content: string }[] {
  return text
    .split(/\n\n+/)
    .map(block => {
      const t = block.trim();
      if ((t.startsWith('"') && t.endsWith('"')) || t.startsWith('> ')) {
        return { type: 'quote' as const, content: t.replace(/^> /, '').replace(/^"|"$/g, '') };
      }
      return { type: 'para' as const, content: t };
    })
    .filter(b => b.content.length > 0);
}

export default function CabinetPage() {
  const router = useRouter();
  const { isPremium, loading: subLoading } = useSubscription();
  const [tab, setTab] = useState<Tab>('cabinet');
  const [cabinetMessages, setCabinetMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);

  // Shared sessions (Arete for Couples) — same contract as the mobile app:
  // the cabinet_conversations row id doubles as the shared-session id.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'solo' | 'shared'>('solo');
  const [sessionPartners, setSessionPartners] = useState<{ userId: string; displayName: string }[]>([]);
  // The shared conversation lives in its own tab, backed by session_messages,
  // so both partners see one canonical thread and the solo Cabinet thread
  // stays private.
  const [sharedMessages, setSharedMessages] = useState<SharedMessage[]>([]);
  const [sharedInput, setSharedInput] = useState('');
  const [sharedLoading, setSharedLoading] = useState(false);
  const [userName, setUserName] = useState<string>('You');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteContact, setInviteContact] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteShare, setInviteShare] = useState<{ smsBody: string; joinUrl: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const [selectedCounselor, setSelectedCounselor] = useState<string | null>(null);
  const [counselorMessages, setCounselorMessages] = useState<ThreadMessage[]>([]);
  const [counselorInput, setCounselorInput] = useState('');
  const [counselorLoading, setCounselorLoading] = useState(false);
  const [activeMembers, setActiveMembers] = useState<string[]>([]);
  const [cabinetCounselors, setCabinetCounselors] = useState<{ id: string; name: string; role: string; description: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const counselorEndRef = useRef<HTMLDivElement>(null);
  const sharedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setInput(q);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }
      setUserName(settings.user_name);

      setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);

      const thread = await loadThread('cabinet');
      setCabinetMessages(thread.messages);

      if (Array.isArray(settings.cabinet_members) && settings.cabinet_members.length > 0) {
        setActiveMembers(settings.cabinet_members);
      } else {
        setActiveMembers(COUNSELOR_LIST.map(c => c.id));
      }

      const fetched = await getUserCabinet();
      if (fetched.length > 0) {
        setCabinetCounselors(fetched.map(c => ({
          id: c.slug, name: c.name, role: c.category ?? 'Counselor', description: c.description ?? '',
        })));
      } else {
        setCabinetCounselors(COUNSELOR_LIST.map(c => ({ id: c.id, name: c.name, role: c.role, description: c.description })));
      }
    }
    load();
  }, [router]);

  // Resolve user + conversation ids, then restore shared mode from
  // session_participants (inviter side: someone's active row on my
  // conversation; partner side: my active row on someone else's).
  useEffect(() => {
    (async () => {
      let userId: string | null = null;
      try {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
        setCurrentUserId(userId);
      } catch { /* unauthenticated — middleware will bounce */ }
      let ownConversationId: string | null = null;
      try {
        ownConversationId = await getOrCreateCabinetConversationId();
        setCurrentSessionId(ownConversationId);
      } catch (err) {
        console.warn('[Cabinet] Failed to resolve session id:', err);
      }
      if (!userId) return;
      try {
        if (ownConversationId) {
          const { data: partnerRows } = await supabase
            .from('session_participants')
            .select('user_id, display_name')
            .eq('session_id', ownConversationId)
            .eq('status', 'active')
            .neq('user_id', userId);
          if (partnerRows && partnerRows.length > 0) {
            setSessionType('shared');
            setSessionPartners(partnerRows.map(r => ({
              userId: r.user_id as string,
              displayName: (r.display_name as string) || 'Partner',
            })));
            return;
          }
        }
        const { data: myRows } = await supabase
          .from('session_participants')
          .select('session_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1);
        if (myRows && myRows.length > 0 && myRows[0].session_id !== ownConversationId) {
          setCurrentSessionId(myRows[0].session_id as string);
          setSessionType('shared');
          setSessionPartners([{ userId: 'partner', displayName: 'Partner' }]);
        }
      } catch (err) {
        console.warn('[Cabinet] Failed to restore shared session:', err);
      }
    })();
  }, []);

  // Resolves a sender's display name for shared-tab labels.
  const senderNameFor = useCallback((senderId: string | null) => {
    if (!senderId) return undefined;
    if (senderId === currentUserId) return userName;
    const partner = sessionPartners.find(p => p.userId === senderId);
    return partner?.displayName || 'Partner';
  }, [currentUserId, userName, sessionPartners]);

  // Load the shared conversation history from session_messages. Both sides
  // read the same rows (RLS: participants + conversation owner).
  useEffect(() => {
    if (sessionType !== 'shared' || !currentSessionId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('session_messages')
          .select('user_id, role, content, counselor_id, counselor_name, created_at')
          .eq('session_id', currentSessionId)
          .order('created_at', { ascending: true });
        if (data) {
          setSharedMessages(data.map(row => ({
            role: row.role as 'user' | 'assistant' | 'system',
            content: row.content as string,
            timestamp: new Date(row.created_at as string).getTime(),
            counselorId: (row.counselor_id as string) ?? undefined,
            counselorName: (row.counselor_name as string) ?? undefined,
            senderName: row.role === 'user' ? senderNameFor(row.user_id as string | null) : undefined,
          })));
        }
      } catch (err) {
        console.warn('[Cabinet] Failed to load shared history:', err);
      }
    })();
  }, [sessionType, currentSessionId, senderNameFor]);

  // Realtime sync for shared sessions: the server mirrors each shared turn
  // into session_messages; rows tagged with our own user_id are skipped
  // because they're already shown optimistically.
  useEffect(() => {
    if (sessionType !== 'shared' || !currentSessionId) return;

    const channel = supabase
      .channel(`cabinet-session-${currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${currentSessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id: string | null;
            role: 'user' | 'assistant' | 'system';
            content: string;
            counselor_id: string | null;
            counselor_name: string | null;
            created_at: string;
          };
          if (row.user_id && row.user_id === currentUserId) return;
          setSharedMessages(prev => [
            ...prev,
            {
              role: row.role,
              content: row.content,
              timestamp: new Date(row.created_at).getTime(),
              counselorId: row.counselor_id ?? undefined,
              counselorName: row.counselor_name ?? undefined,
              senderName: row.role === 'user' ? senderNameFor(row.user_id) : undefined,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionType, currentSessionId, currentUserId, senderNameFor]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [cabinetMessages]);
  useEffect(() => { counselorEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [counselorMessages]);
  useEffect(() => { sharedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sharedMessages]);

  const handleSendCabinet = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ThreadMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...cabinetMessages, userMsg];
    setCabinetMessages(newMessages);
    setInput('');
    setIsLoading(true);
    try {
      // The Cabinet tab is always the private solo thread; the shared
      // conversation lives in the Shared tab with its own send path.
      const replies: CabinetReply[] = await sendMessageToCabinet(newMessages);
      const assistantMsgs: ThreadMessage[] = replies.map(r => ({
        role: 'assistant',
        content: r.text,
        timestamp: Date.now(),
        counselorId: r.counselorId ?? undefined,
        counselorName: r.counselorName ?? undefined,
      }));
      const finalMessages = [...newMessages, ...assistantMsgs];
      setCabinetMessages(finalMessages);
      await saveThread({ id: 'cabinet', messages: finalMessages, lastUpdated: Date.now() });
    } catch {
      setCabinetMessages(prev => [...prev, { role: 'assistant', content: 'The Cabinet is temporarily unavailable. Please try again.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCabinet = async () => {
    if (!confirm('Clear the entire Cabinet conversation? This cannot be undone.')) return;
    await clearThread('cabinet');
    setCabinetMessages([]);
  };

  // Send into the shared session: optimistic append locally, the server
  // mirrors the turn into session_messages for the partner's realtime feed.
  const handleSendShared = async () => {
    if (!sharedInput.trim() || sharedLoading) return;
    const userMsg: SharedMessage = {
      role: 'user',
      content: sharedInput.trim(),
      timestamp: Date.now(),
      senderName: userName,
    };
    const newShared = [...sharedMessages, userMsg];
    setSharedMessages(newShared);
    setSharedInput('');
    setSharedLoading(true);
    try {
      // System notices (joined/left) stay out of the model's context.
      const replies: CabinetReply[] = await sendMessageToCabinet(newShared.filter(m => m.role !== 'system') as ThreadMessage[], {
        sessionType: 'shared',
        sessionId: currentSessionId ?? undefined,
        partnerIds: sessionPartners.map(p => p.userId),
      });
      const assistantMsgs: SharedMessage[] = replies.map(r => ({
        role: 'assistant',
        content: r.text,
        timestamp: Date.now(),
        counselorId: r.counselorId ?? undefined,
        counselorName: r.counselorName ?? undefined,
      }));
      setSharedMessages(prev => [...prev, ...assistantMsgs]);
    } catch {
      setSharedMessages(prev => prev.slice(0, -1));
    } finally {
      setSharedLoading(false);
    }
  };

  const handleSendInvite = async () => {
    const contact = inviteContact.trim();
    if (!contact || inviteLoading) return;
    if (!currentSessionId || !currentUserId) {
      setInviteError("Your session isn't ready yet. Try again in a moment.");
      return;
    }

    // Email invites are sent server-side via Resend. Phone invites return a
    // prewritten message the user copies into their own texting app (the web
    // can't reliably open Messages the way the mobile app can).
    const phoneCandidate = contact.replace(/[\s().-]/g, '');
    const isPhone = /^\+?\d{7,15}$/.test(phoneCandidate);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    if (!isPhone && !isEmail) {
      setInviteError('Enter a valid email address or phone number.');
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    try {
      // Backend derives the inviter from this Bearer token (JWT), not the body.
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/api/sessions/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          ...(isEmail ? { partnerEmail: contact } : { partnerPhone: phoneCandidate }),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success) {
        setSessionType('shared');
        setSessionPartners([{ userId: 'pending', displayName: contact }]);
        setTab('shared');
        setInviteContact('');
        if (isPhone && data?.smsBody) {
          // Keep the modal open showing the prewritten text to copy.
          setInviteShare({ smsBody: data.smsBody, joinUrl: data.joinUrl || '' });
        } else {
          setShowInviteModal(false);
        }
      } else {
        setInviteError(data?.error || 'Could not send the invite. Please try again.');
      }
    } catch (err) {
      console.error('Invite error:', err);
      setInviteError('Could not reach the server. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteShare) return;
    try {
      await navigator.clipboard.writeText(inviteShare.smsBody);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the text is visible to copy manually */
    }
  };

  const handleEndSharedSession = async () => {
    if (!confirm('End the shared session? Your Cabinet returns to a private solo session.')) return;
    // Delete the participant rows server-side too — shared mode is restored
    // from session_participants on load, so local state alone would resurrect
    // the session on next visit. RLS allows either side to leave. Best-effort.
    if (currentSessionId) {
      try {
        // Leave notice first (while still a participant, so RLS allows the
        // insert), then remove the participant rows.
        await supabase.from('session_messages').insert({
          session_id: currentSessionId,
          user_id: currentUserId,
          role: 'system',
          content: `${userName} left the session`,
        });
        await supabase.from('session_participants').delete().eq('session_id', currentSessionId);
      } catch (err) {
        console.warn('[Cabinet] Failed to delete participant rows:', err);
      }
    }
    setSessionType('solo');
    setSessionPartners([]);
    setSharedMessages([]);
    setTab('cabinet');
    try {
      const ownId = await getOrCreateCabinetConversationId();
      setCurrentSessionId(ownId);
    } catch { /* keep current id */ }
  };

  const handleSelectCounselor = async (id: string) => {
    setSelectedCounselor(id);
    const thread = await loadThread(id);
    setCounselorMessages(thread.messages);
  };

  const handleSendCounselor = async () => {
    if (!counselorInput.trim() || counselorLoading || !selectedCounselor) return;
    const userMsg: ThreadMessage = { role: 'user', content: counselorInput.trim(), timestamp: Date.now() };
    const newMessages = [...counselorMessages, userMsg];
    setCounselorMessages(newMessages);
    setCounselorInput('');
    setCounselorLoading(true);
    try {
      const response = await sendMessageToCounselor(selectedCounselor, newMessages);
      const assistantMsg: ThreadMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      const finalMessages = [...newMessages, assistantMsg];
      setCounselorMessages(finalMessages);
      await saveThread({ id: selectedCounselor, messages: finalMessages, lastUpdated: Date.now() });
    } catch {
      setCounselorMessages(prev => [...prev, { role: 'assistant', content: 'Your counselor is temporarily unavailable. Please try again.', timestamp: Date.now() }]);
    } finally {
      setCounselorLoading(false);
    }
  };

  const filteredMessages = searchQuery
    ? cabinetMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : cabinetMessages;

  const activeCounselors = cabinetCounselors.length > 0
    ? cabinetCounselors
    : COUNSELOR_LIST.filter(c => activeMembers.includes(c.id));
  const selectedCounselorMeta = activeCounselors.find(c => c.id === selectedCounselor);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0f1724' }}>

      {/* ── Glass header ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-5 pt-5 pb-4"
        style={{
          background: 'rgba(10,14,28,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          The Council Convenes
        </div>
        <h1
          className="text-[28px] font-medium leading-none tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Speak to the <em style={{ color: '#c9a84c' }}>Cabinet</em>
        </h1>

        {/* Overlapping counselor circles + Edit button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
          {activeCounselors.slice(0, 5).map((c, i) => (
            <div
              key={c.id}
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: 32, height: 32,
                background: 'rgba(201,168,76,0.15)',
                border: '2px solid rgba(10,14,28,0.8)',
                marginLeft: i === 0 ? 0 : -8,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 9, fontWeight: 700,
                color: '#c9a84c',
                zIndex: activeCounselors.length - i,
                position: 'relative',
              }}
            >
              {getInitials(c.name)}
            </div>
          ))}
          {activeCounselors.length > 5 && (
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0 text-[9px]"
              style={{
                width: 32, height: 32,
                background: 'rgba(201,168,76,0.08)',
                border: '2px solid rgba(10,14,28,0.8)',
                marginLeft: -8,
                color: '#9aa0a6',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              +{activeCounselors.length - 5}
            </div>
          )}
          <span
            className="text-[11px] ml-3"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            {activeCounselors.length} counselor{activeCounselors.length !== 1 ? 's' : ''} assembled
          </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                // Shared sessions are Premium: free tier routes to /upgrade.
                // While the subscription is still loading, open the modal and
                // let the server-side gate be the backstop.
                if (!subLoading && !isPremium) {
                  router.push('/upgrade');
                  return;
                }
                setShowInviteModal(true); setInviteError(null); setInviteShare(null);
              }}
              className="px-3 py-1 rounded-full text-[10px] tracking-[1.2px] uppercase transition-opacity hover:opacity-80"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.06)',
              }}
            >
              + Invite
            </button>
            <Link
              href="/cabinet/minds"
              className="px-3 py-1 rounded-full text-[10px] tracking-[1.2px] uppercase transition-opacity hover:opacity-80"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.06)',
              }}
            >
              Assign Minds
            </Link>
            <Link
              href="/cabinet/select"
              className="px-3 py-1 rounded-full text-[10px] tracking-[1.2px] uppercase transition-opacity hover:opacity-80"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.06)',
              }}
            >
              Edit Cabinet
            </Link>
          </div>
        </div>

        {/* Shared-session badge */}
        {sessionType === 'shared' && (
          <div
            className="flex items-center justify-between px-3 py-2 mb-3 rounded-xl"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <span
              className="text-[11px] truncate"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              👥 Shared Session · {sessionPartners.map(p => p.displayName).join(' & ')}
              {sessionPartners.some(p => p.userId === 'pending') && ' (invite pending)'}
            </span>
            <button
              onClick={handleEndSharedSession}
              className="text-[10px] tracking-[1px] uppercase ml-3 flex-shrink-0 transition-colors hover:text-red-400"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              End
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {((sessionType === 'shared' ? ['cabinet', 'shared', 'counselors'] : ['cabinet', 'counselors']) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase capitalize transition-all"
              style={
                tab === t
                  ? { background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }
                  : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Know Thyself nudge */}
      {knowThyselfIncomplete && (
        <div className="mx-4 mt-3 flex-shrink-0">
          <GlassCard>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-[13px]" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}>
                The Cabinet&apos;s responses are generic until you complete your profile.
              </p>
              <a
                href="/profile"
                className="text-[10px] tracking-[1px] uppercase ml-3 flex-shrink-0 hover:opacity-80"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                Complete →
              </a>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Cabinet tab ──────────────────────────────────────────── */}
      {tab === 'cabinet' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search + Clear */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-shrink-0">
            {showSearch ? (
              <input
                className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#e6eef8',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                }}
                placeholder="Search messages…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            ) : (
              <div className="flex-1" />
            )}
            <button
              onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}
              className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {showSearch ? '✕' : 'Search'}
            </button>
            <button
              onClick={handleClearCabinet}
              className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 rounded-lg transition-colors hover:text-red-400"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3.5">
            {filteredMessages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                <div className="text-[40px] mb-3 opacity-15">🏛️</div>
                <p
                  className="text-[15px] italic"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                >
                  Your Cabinet awaits.
                </p>
                <p
                  className="text-[11px] tracking-[1px] uppercase mt-1"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.5)' }}
                >
                  Ask them anything.
                </p>
              </div>
            )}

            {filteredMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div
                    className="max-w-[82%] px-4 py-3 text-[15px] leading-relaxed"
                    style={{
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '18px 18px 6px 18px',
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      color: '#e6eef8',
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] flex gap-3 items-start">
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                      style={{
                        width: 32, height: 32,
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 9, fontWeight: 700,
                        color: '#c9a84c',
                      }}
                    >
                      {msg.counselorName ? getInitials(msg.counselorName) : 'TC'}
                    </div>
                    <div
                      className="flex flex-col gap-2 px-4 py-3 flex-1"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '18px 18px 18px 6px',
                      }}
                    >
                      <div
                        className="text-[10px] tracking-[1.2px] uppercase"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                      >
                        {msg.counselorName || 'The Cabinet'}
                      </div>
                      {parseBlocks(msg.content).map((block, bi) =>
                        block.type === 'quote' ? (
                          <div
                            key={bi}
                            className="pl-3 py-1 italic text-[14px] leading-relaxed"
                            style={{
                              borderLeft: '3px solid rgba(201,168,76,0.5)',
                              fontFamily: 'var(--font-serif, Georgia, serif)',
                              color: '#c9a84c',
                            }}
                          >
                            &ldquo;{block.content}&rdquo;
                          </div>
                        ) : (
                          <p
                            key={bi}
                            className="text-[14px] leading-relaxed"
                            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                          >
                            {block.content}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 items-start">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                    style={{
                      width: 32, height: 32,
                      background: 'rgba(201,168,76,0.15)',
                      border: '1px solid rgba(201,168,76,0.3)',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: 9, fontWeight: 700,
                      color: '#c9a84c',
                    }}
                  >
                    TC
                  </div>
                  <div
                    className="px-4 py-3 italic text-[14px]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '18px 18px 18px 6px',
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      color: '#9aa0a6',
                    }}
                  >
                    The Cabinet deliberates…
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div
            className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(10,14,28,0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <textarea
              className="flex-1 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 22,
                color: '#e6eef8',
                fontFamily: 'var(--font-serif, Georgia, serif)',
              }}
              rows={2}
              placeholder="Speak to your Cabinet…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCabinet(); }
              }}
            />
            <button
              onClick={handleSendCabinet}
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* ── Shared session tab ───────────────────────────────────── */}
      {tab === 'shared' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Members of the group */}
          <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2 flex-shrink-0 items-center">
            {[
              { userId: currentUserId ?? 'me', displayName: userName, pending: false },
              ...sessionPartners.map(p => ({ userId: p.userId, displayName: p.displayName, pending: p.userId === 'pending' })),
            ].map((member, i) => (
              <div
                key={`${member.userId}-${i}`}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full"
                style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.3)',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 24, height: 24,
                    background: member.pending ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.2)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 8, fontWeight: 700,
                    color: member.pending ? '#9aa0a6' : '#c9a84c',
                  }}
                >
                  {getInitials(member.displayName)}
                </div>
                <span
                  className="text-[11px] truncate max-w-[140px]"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#e6eef8' }}
                >
                  {member.displayName}{member.pending ? ' · invited' : ''}
                </span>
              </div>
            ))}
          </div>

          {sessionPartners.some(p => p.userId === 'pending') && (
            <div className="mx-4 mb-1 flex-shrink-0">
              <p className="text-[12px]" style={{ color: '#9aa0a6' }}>
                Waiting for your partner to join — they can start talking as soon as they accept.
              </p>
            </div>
          )}

          {/* Guest upsell: free users in a shared session were invited (only
              Premium can invite), so they just experienced the feature. */}
          {!subLoading && !isPremium && (
            <div className="mx-4 mb-1 flex-shrink-0">
              <button
                onClick={() => router.push('/upgrade')}
                className="w-full text-left px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)' }}
              >
                <span className="text-[12px]" style={{ color: '#c9a84c' }}>
                  ✨ Enjoying this shared session? With Premium you can host your own. Upgrade →
                </span>
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3.5">
            {sharedMessages.length === 0 && !sharedLoading && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                <div className="text-[40px] mb-3 opacity-15">👥</div>
                <p
                  className="text-[15px] italic"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                >
                  This is your shared session.
                </p>
                <p
                  className="text-[11px] tracking-[1px] uppercase mt-1"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.5)' }}
                >
                  Your counselors speak to both of you together.
                </p>
              </div>
            )}

            {sharedMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'system' ? 'justify-center' : msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'system' ? (
                  <span
                    className="px-3 py-1 rounded-full text-[12px] italic"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#9aa0a6' }}
                  >
                    {msg.content}
                  </span>
                ) : msg.role === 'user' ? (
                  <div
                    className="max-w-[82%] px-4 py-3 text-[15px] leading-relaxed"
                    style={{
                      background: 'rgba(201,168,76,0.12)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '18px 18px 6px 18px',
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      color: '#e6eef8',
                    }}
                  >
                    {msg.senderName && (
                      <div
                        className="text-[10px] tracking-[1px] uppercase mb-1"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                      >
                        {msg.senderName}
                      </div>
                    )}
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] flex gap-3 items-start">
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                      style={{
                        width: 32, height: 32,
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 9, fontWeight: 700,
                        color: '#c9a84c',
                      }}
                    >
                      {msg.counselorName ? getInitials(msg.counselorName) : 'TC'}
                    </div>
                    <div
                      className="flex flex-col gap-2 px-4 py-3 flex-1"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '18px 18px 18px 6px',
                      }}
                    >
                      <div
                        className="text-[10px] tracking-[1.2px] uppercase"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                      >
                        {msg.counselorName || 'The Cabinet'}
                      </div>
                      {parseBlocks(msg.content).map((block, bi) =>
                        block.type === 'quote' ? (
                          <div
                            key={bi}
                            className="pl-3 py-1 italic text-[14px] leading-relaxed"
                            style={{
                              borderLeft: '3px solid rgba(201,168,76,0.5)',
                              fontFamily: 'var(--font-serif, Georgia, serif)',
                              color: '#c9a84c',
                            }}
                          >
                            &ldquo;{block.content}&rdquo;
                          </div>
                        ) : (
                          <p
                            key={bi}
                            className="text-[14px] leading-relaxed"
                            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                          >
                            {block.content}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {sharedLoading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 italic text-[14px]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '18px 18px 18px 6px',
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                    color: '#9aa0a6',
                  }}
                >
                  The Cabinet deliberates…
                </div>
              </div>
            )}
            <div ref={sharedEndRef} />
          </div>

          {/* Composer */}
          <div
            className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(10,14,28,0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <textarea
              className="flex-1 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 22,
                color: '#e6eef8',
                fontFamily: 'var(--font-serif, Georgia, serif)',
              }}
              rows={2}
              placeholder="Speak to the Cabinet together…"
              value={sharedInput}
              onChange={e => setSharedInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendShared(); }
              }}
            />
            <button
              onClick={handleSendShared}
              disabled={sharedLoading || !sharedInput.trim()}
              className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* ── Counselors tab ───────────────────────────────────────── */}
      {tab === 'counselors' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {!selectedCounselor ? (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p
                className="text-[11px] tracking-[1px] uppercase mb-4"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
              >
                Choose a counselor for a private session
              </p>
              <div className="flex flex-col gap-2.5">
                {activeCounselors.map(counselor => (
                  <button
                    key={counselor.id}
                    onClick={() => handleSelectCounselor(counselor.id)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl transition-opacity hover:opacity-80"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 40, height: 40,
                        background: 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 10, fontWeight: 700,
                        color: '#c9a84c',
                      }}
                    >
                      {getInitials(counselor.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[15px] font-medium"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {counselor.name}
                      </div>
                      <div
                        className="text-[10px] tracking-[1px] uppercase mt-0.5"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {counselor.role}
                      </div>
                    </div>
                    <span style={{ color: '#c9a84c', fontSize: 16 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Counselor header */}
              <div
                className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(10,14,28,0.4)',
                }}
              >
                <button
                  onClick={() => setSelectedCounselor(null)}
                  className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                >
                  ← Back
                </button>
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    width: 36, height: 36,
                    background: 'rgba(201,168,76,0.12)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 10, fontWeight: 700,
                    color: '#c9a84c',
                  }}
                >
                  {selectedCounselorMeta ? getInitials(selectedCounselorMeta.name) : '?'}
                </div>
                <div className="flex-1">
                  <div
                    className="text-[15px] font-medium"
                    style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                  >
                    {selectedCounselorMeta?.name}
                  </div>
                  <div
                    className="text-[10px] tracking-[1px] uppercase"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    {selectedCounselorMeta?.role}
                  </div>
                </div>
                <button
                  onClick={() => { clearThread(selectedCounselor).then(() => setCounselorMessages([])); }}
                  className="text-[10px] tracking-[1px] uppercase transition-colors hover:text-red-400"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                >
                  Clear
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-3.5">
                {counselorMessages.length === 0 && !counselorLoading && (
                  <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                    <div className="text-[40px] mb-3 opacity-15">🧠</div>
                    <p
                      className="text-[15px] italic"
                      style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                    >
                      {selectedCounselorMeta?.name} is listening.
                    </p>
                  </div>
                )}

                {counselorMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div
                        className="max-w-[82%] px-4 py-3 text-[15px] leading-relaxed"
                        style={{
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          borderRadius: '18px 18px 6px 18px',
                          fontFamily: 'var(--font-serif, Georgia, serif)',
                          color: '#e6eef8',
                        }}
                      >
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%] flex gap-3 items-start">
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                          style={{
                            width: 32, height: 32,
                            background: 'rgba(201,168,76,0.15)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 9, fontWeight: 700,
                            color: '#c9a84c',
                          }}
                        >
                          {selectedCounselorMeta ? getInitials(selectedCounselorMeta.name) : 'C'}
                        </div>
                        <div
                          className="flex flex-col gap-2 px-4 py-3 flex-1"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '18px 18px 18px 6px',
                          }}
                        >
                          {parseBlocks(msg.content).map((block, bi) =>
                            block.type === 'quote' ? (
                              <div
                                key={bi}
                                className="pl-3 py-1 italic text-[14px] leading-relaxed"
                                style={{
                                  borderLeft: '3px solid rgba(201,168,76,0.5)',
                                  fontFamily: 'var(--font-serif, Georgia, serif)',
                                  color: '#c9a84c',
                                }}
                              >
                                &ldquo;{block.content}&rdquo;
                              </div>
                            ) : (
                              <p
                                key={bi}
                                className="text-[14px] leading-relaxed"
                                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                              >
                                {block.content}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {counselorLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 items-start">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
                        style={{
                          width: 32, height: 32,
                          background: 'rgba(201,168,76,0.15)',
                          border: '1px solid rgba(201,168,76,0.3)',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 9, fontWeight: 700,
                          color: '#c9a84c',
                        }}
                      >
                        {selectedCounselorMeta ? getInitials(selectedCounselorMeta.name) : 'C'}
                      </div>
                      <div
                        className="px-4 py-3 italic text-[14px]"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '18px 18px 18px 6px',
                          fontFamily: 'var(--font-serif, Georgia, serif)',
                          color: '#9aa0a6',
                        }}
                      >
                        {selectedCounselorMeta?.name} is thinking…
                      </div>
                    </div>
                  </div>
                )}
                <div ref={counselorEndRef} />
              </div>

              {/* Composer */}
              <div
                className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(10,14,28,0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <textarea
                  className="flex-1 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 22,
                    color: '#e6eef8',
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                  }}
                  rows={2}
                  placeholder={`Speak to ${selectedCounselorMeta?.name}…`}
                  value={counselorInput}
                  onChange={e => setCounselorInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendCounselor(); }
                  }}
                />
                <button
                  onClick={handleSendCounselor}
                  disabled={counselorLoading || !counselorInput.trim()}
                  className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
                >
                  →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Invite a Partner modal ───────────────────────────────── */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!inviteLoading) { setShowInviteModal(false); setInviteContact(''); setInviteError(null); setInviteShare(null); } }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#131b2e', border: '1px solid rgba(201,168,76,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2
              className="text-[18px] font-medium mb-2"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              Start a Shared Session
            </h2>

            {inviteShare ? (
              <>
                <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#9aa0a6' }}>
                  Invite created. Copy this message and text it to your partner from your
                  own phone, or share the link any way you like:
                </p>
                <div
                  className="rounded-xl px-4 py-3 mb-4 text-[13px] leading-relaxed break-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: '#e6eef8' }}
                >
                  {inviteShare.smsBody}
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowInviteModal(false); setInviteShare(null); }}
                    className="px-4 py-2 rounded-xl text-[13px]"
                    style={{ color: '#9aa0a6', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Done
                  </button>
                  <button
                    onClick={handleCopyInvite}
                    className="px-4 py-2 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90"
                    style={{ background: '#c9a84c', color: '#0f1724' }}
                  >
                    {inviteCopied ? 'Copied ✓' : 'Copy Message'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#9aa0a6' }}>
                  Invite someone by email or phone number to join your Cabinet session. Both
                  of your Know Thyself profiles will be shared with your counselors.
                </p>
                <input
                  className="w-full px-4 py-3 rounded-xl text-[14px] outline-none mb-3"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: '#e6eef8',
                  }}
                  placeholder="Email or phone number"
                  value={inviteContact}
                  onChange={e => setInviteContact(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendInvite(); }}
                  autoFocus
                />
                {inviteError && (
                  <p className="text-[12px] mb-3" style={{ color: '#f87171' }}>{inviteError}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowInviteModal(false); setInviteContact(''); setInviteError(null); }}
                    disabled={inviteLoading}
                    className="px-4 py-2 rounded-xl text-[13px]"
                    style={{ color: '#9aa0a6', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={!inviteContact.trim() || inviteLoading}
                    className="px-4 py-2 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#c9a84c', color: '#0f1724' }}
                  >
                    {inviteLoading ? 'Sending…' : 'Send Invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
