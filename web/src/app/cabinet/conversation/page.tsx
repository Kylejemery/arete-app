'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserCabinet, createConversation, appendMessage } from '@/lib/db';
import { sendMessageToCabinet } from '@/lib/claudeService';
import type { ThreadMessage } from '@/lib/threadService';
import PageHeader from '@/components/PageHeader';

export default function ConversationPage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      try {
        const cabinet = await getUserCabinet();
        const slugs = cabinet.map(c => c.slug);
        const conversation = await createConversation(slugs);
        setConversationId(conversation.id);
      } catch (e) {
        console.error('Failed to initialize conversation:', e);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !conversationId) return;

    // ThreadMessage (role: 'user'|'assistant', timestamp: number) is used for local chat state
    // and for sendMessageToCabinet(). ConversationMessage (timestamp: ISO string) is used for
    // Supabase persistence via appendMessage().
    const userMsg: ThreadMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Persist user message to Supabase
    await appendMessage(conversationId, {
      role: 'user',
      content: userMsg.content,
      timestamp: new Date().toISOString(),
    }).catch(e => console.error('appendMessage (user) error:', e));

    try {
      const response = await sendMessageToCabinet(newMessages);
      const assistantMsg: ThreadMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Persist assistant message to Supabase
      await appendMessage(conversationId, {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }).catch(e => console.error('appendMessage (assistant) error:', e));
    } catch {
      const errMsg: ThreadMessage = {
        role: 'assistant',
        content: 'The Cabinet is temporarily unavailable. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <p className="text-arete-muted text-sm">Starting conversation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arete-bg flex flex-col" style={{ height: '100dvh' }}>
      <div className="p-6 md:p-8 pb-2 flex-shrink-0">
        <a href="/cabinet" className="text-arete-muted hover:text-arete-text text-sm mb-4 inline-block">
          ← Back to Cabinet
        </a>
        <PageHeader title="Cabinet Conversation" subtitle="A new session with your council" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 space-y-4 pb-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-arete-muted text-sm py-8">
            <p className="text-2xl mb-2">🏛️</p>
            <p>Your Cabinet awaits. Ask them anything.</p>
          </div>
        )}
        {messages.map((msg, i) => (
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
      <div className="flex gap-2 px-6 md:px-8 pt-3 border-t border-arete-border pb-4 flex-shrink-0">
        <textarea
          className="bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none flex-1 text-sm resize-none"
          rows={2}
          placeholder="Speak to your Cabinet..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim() || !conversationId}
          className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed self-end"
        >
          Send
        </button>
      </div>
    </div>
  );
}
