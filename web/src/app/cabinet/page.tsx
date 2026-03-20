'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendMessageToCabinet, sendMessageToCounselor } from '@/lib/claudeService';
import { loadThread, saveThread, clearThread } from '@/lib/threadService';
import type { ThreadMessage } from '@/lib/threadService';
import { COUNSELOR_LIST } from '@/lib/counselors';
import PageHeader from '@/components/PageHeader';
import CabinetPreview from '@/components/CabinetPreview';

type Tab = 'cabinet' | 'counselors';

export default function CabinetPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cabinet');
  const [cabinetMessages, setCabinetMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);

  // Counselor tab
  const [selectedCounselor, setSelectedCounselor] = useState<string | null>(null);
  const [counselorMessages, setCounselorMessages] = useState<ThreadMessage[]>([]);
  const [counselorInput, setCounselorInput] = useState('');
  const [counselorLoading, setCounselorLoading] = useState(false);
  const [activeMembers, setActiveMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const counselorEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);

      // Load cabinet thread
      const thread = await loadThread('cabinet');
      setCabinetMessages(thread.messages);

      // Load active members
      if (Array.isArray(settings.cabinet_members) && settings.cabinet_members.length > 0) {
        setActiveMembers(settings.cabinet_members);
      } else {
        setActiveMembers(COUNSELOR_LIST.map(c => c.id));
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cabinetMessages]);

  useEffect(() => {
    counselorEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [counselorMessages]);

  const handleSendCabinet = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ThreadMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...cabinetMessages, userMsg];
    setCabinetMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToCabinet(newMessages);
      const assistantMsg: ThreadMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      const finalMessages = [...newMessages, assistantMsg];
      setCabinetMessages(finalMessages);
      await saveThread({ id: 'cabinet', messages: finalMessages, lastUpdated: Date.now() });
    } catch {
      const errMsg: ThreadMessage = { role: 'assistant', content: 'The Cabinet is temporarily unavailable. Please try again.', timestamp: Date.now() };
      setCabinetMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCabinet = async () => {
    if (!confirm('Clear the entire Cabinet conversation? This cannot be undone.')) return;
    await clearThread('cabinet');
    setCabinetMessages([]);
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
      const errMsg: ThreadMessage = { role: 'assistant', content: 'Your counselor is temporarily unavailable. Please try again.', timestamp: Date.now() };
      setCounselorMessages(prev => [...prev, errMsg]);
    } finally {
      setCounselorLoading(false);
    }
  };

  const filteredMessages = searchQuery
    ? cabinetMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : cabinetMessages;

  const activeCounselors = COUNSELOR_LIST.filter(c => activeMembers.includes(c.id));
  const selectedCounselorMeta = COUNSELOR_LIST.find(c => c.id === selectedCounselor);

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none flex-1 text-sm resize-none";

  return (
    <div className="min-h-screen bg-arete-bg flex flex-col" style={{ height: '100dvh' }}>
      <div className="p-6 md:p-8 pb-2">
        <PageHeader title="Cabinet" subtitle="Your Council of Invisible Counselors" />

        <div className="mb-4">
          <CabinetPreview />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-arete-border mb-4">
          {(['cabinet', 'counselors'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'text-arete-gold border-arete-gold' : 'text-arete-muted border-transparent hover:text-arete-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'cabinet' && (
        <div className="flex flex-col flex-1 px-6 md:px-8 overflow-hidden">
          {/* Know Thyself nudge */}
          {knowThyselfIncomplete && (
            <div className="bg-arete-surface rounded-lg border border-arete-gold p-4 mb-4 flex-shrink-0">
              <p className="text-arete-gold font-semibold text-sm">Complete Your Profile</p>
              <p className="text-arete-muted text-xs mt-1">The Cabinet&apos;s responses are generic until you fill in your Know Thyself profile.</p>
              <a href="/profile" className="text-arete-gold text-xs font-semibold hover:underline mt-1 block">Complete Now →</a>
            </div>
          )}

          {/* Search + Clear bar */}
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            {showSearch ? (
              <input
                className="bg-arete-bg border border-arete-border rounded-lg px-3 py-1.5 text-arete-text focus:border-arete-gold focus:outline-none flex-1 text-sm"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            ) : (
              <div className="flex-1" />
            )}
            <button onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }} className="text-arete-muted hover:text-arete-text text-sm px-2 py-1">
              {showSearch ? '✕' : '🔍'}
            </button>
            <button onClick={handleClearCabinet} className="text-arete-muted hover:text-red-400 text-xs px-2 py-1">
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {filteredMessages.length === 0 && !isLoading && (
              <div className="text-center text-arete-muted text-sm py-8">
                <p className="text-2xl mb-2">🏛️</p>
                <p>Your Cabinet awaits. Ask them anything.</p>
              </div>
            )}
            {filteredMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-arete-border text-arete-text'
                    : 'bg-arete-surface border border-arete-gold text-arete-gold'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-arete-surface border border-arete-gold rounded-lg px-4 py-3 text-arete-gold text-sm">
                  The Cabinet is deliberating...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-3 border-t border-arete-border pb-4 flex-shrink-0">
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Speak to your Cabinet..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendCabinet();
                }
              }}
            />
            <button
              onClick={handleSendCabinet}
              disabled={isLoading || !input.trim()}
              className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {tab === 'counselors' && (
        <div className="flex flex-col flex-1 px-6 md:px-8 overflow-y-auto">
          {!selectedCounselor ? (
            // Counselor list
            <div className="space-y-3">
              <p className="text-arete-muted text-sm mb-4">Choose a counselor for a private session.</p>
              {activeCounselors.map(counselor => (
                <button
                  key={counselor.id}
                  onClick={() => handleSelectCounselor(counselor.id)}
                  className="w-full text-left bg-arete-surface rounded-lg border border-arete-border p-4 hover:border-arete-gold transition-colors"
                >
                  <p className="text-arete-text font-semibold">{counselor.name}</p>
                  <p className="text-arete-muted text-xs mt-0.5">{counselor.role}</p>
                  <p className="text-arete-muted text-sm mt-1">{counselor.description}</p>
                </button>
              ))}
            </div>
          ) : (
            // Individual counselor chat
            <>
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <button onClick={() => setSelectedCounselor(null)} className="text-arete-muted hover:text-arete-text text-sm">← Back</button>
                <div>
                  <p className="text-arete-text font-semibold">{selectedCounselorMeta?.name}</p>
                  <p className="text-arete-muted text-xs">{selectedCounselorMeta?.role}</p>
                </div>
                <button
                onClick={() => { clearThread(selectedCounselor).then(() => setCounselorMessages([])); }}
                  className="ml-auto text-arete-muted hover:text-red-400 text-xs"
                >
                  Clear
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {counselorMessages.length === 0 && !counselorLoading && (
                  <div className="text-center text-arete-muted text-sm py-8">
                    <p className="text-2xl mb-2">🧠</p>
                    <p>{selectedCounselorMeta?.name} is listening.</p>
                  </div>
                )}
                {counselorMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-arete-border text-arete-text'
                        : 'bg-arete-surface border border-arete-gold text-arete-gold'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {counselorLoading && (
                  <div className="flex justify-start">
                    <div className="bg-arete-surface border border-arete-gold rounded-lg px-4 py-3 text-arete-gold text-sm">
                      {selectedCounselorMeta?.name} is thinking...
                    </div>
                  </div>
                )}
                <div ref={counselorEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 pt-3 border-t border-arete-border pb-4 flex-shrink-0">
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder={`Speak to ${selectedCounselorMeta?.name}...`}
                  value={counselorInput}
                  onChange={e => setCounselorInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendCounselor();
                    }
                  }}
                />
                <button
                  onClick={handleSendCounselor}
                  disabled={counselorLoading || !counselorInput.trim()}
                  className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed self-end"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
