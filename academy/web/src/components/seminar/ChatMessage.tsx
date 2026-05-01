import type { SeminarMessage } from '@/types';

interface ChatMessageProps {
  message: SeminarMessage;
  agentName: string;
}

export function ChatMessage({ message, agentName }: ChatMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-academy-border flex items-center justify-center text-xs text-academy-gold font-serif mr-3 mt-1">
          {agentName[0]}
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-academy-border text-academy-text'
            : 'bg-academy-card border border-academy-gold/30 text-academy-text'
        }`}
      >
        {!isUser && (
          <p className="text-academy-gold text-xs font-semibold uppercase tracking-wider mb-1.5">
            {agentName}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-academy-border flex items-center justify-center text-xs text-academy-gold font-serif mr-3">
        {agentName[0]}
      </div>
      <div className="bg-academy-card border border-academy-gold/30 rounded-lg px-4 py-3 text-academy-gold text-sm italic">
        {agentName} is formulating a question...
      </div>
    </div>
  );
}
