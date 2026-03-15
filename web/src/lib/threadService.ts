import { getItem, setItem, removeItem } from './storage';

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix ms
  counselorId?: string; // which counselor replied (for group thread rendering)
}

export interface Thread {
  id: string; // 'marcus' | 'epictetus' | 'goggins' | 'roosevelt' | 'futureSelf' | 'cabinet'
  messages: ThreadMessage[];
  lastUpdated: number;
}

const MAX_STORED_MESSAGES = 200;
export const CONTEXT_WINDOW_SIZE = 30;

function storageKey(threadId: string): string {
  return `thread_${threadId}`;
}

export function loadThread(threadId: string): Thread {
  try {
    const raw = getItem(storageKey(threadId));
    if (raw) {
      const parsed = JSON.parse(raw) as Thread;
      if (parsed && Array.isArray(parsed.messages)) {
        return parsed;
      }
    }
  } catch { /* ignore corrupt data */ }
  return { id: threadId, messages: [], lastUpdated: Date.now() };
}

export function saveThread(thread: Thread): void {
  const capped: Thread = {
    ...thread,
    messages:
      thread.messages.length > MAX_STORED_MESSAGES
        ? thread.messages.slice(thread.messages.length - MAX_STORED_MESSAGES)
        : thread.messages,
    lastUpdated: Date.now(),
  };
  try {
    setItem(storageKey(thread.id), JSON.stringify(capped));
  } catch { /* ignore storage errors silently */ }
}

export function appendMessages(
  threadId: string,
  messages: ThreadMessage[]
): Thread {
  const thread = loadThread(threadId);
  const updated: Thread = {
    ...thread,
    messages: [...thread.messages, ...messages],
    lastUpdated: Date.now(),
  };
  saveThread(updated);
  return updated;
}

export function clearThread(threadId: string): void {
  try {
    removeItem(storageKey(threadId));
  } catch { /* ignore */ }
}

export function getAllThreadSummaries(): { id: string; messageCount: number; lastUpdated: number }[] {
  const threadIds = ['marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf', 'cabinet'];
  return threadIds.map((id) => {
    const thread = loadThread(id);
    return {
      id,
      messageCount: thread.messages.length,
      lastUpdated: thread.lastUpdated,
    };
  });
}

/**
 * Returns the messages to send to Claude — the last CONTEXT_WINDOW_SIZE messages —
 * and a context summary string to prepend if there is older history.
 */
export function getContextWindow(thread: Thread): {
  contextMessages: ThreadMessage[];
  summaryNote: string | null;
} {
  const { messages } = thread;
  if (messages.length <= CONTEXT_WINDOW_SIZE) {
    return { contextMessages: messages, summaryNote: null };
  }
  const contextMessages = messages.slice(messages.length - CONTEXT_WINDOW_SIZE);
  const earlierCount = messages.length - CONTEXT_WINDOW_SIZE;
  const summaryNote = `[Conversation context: This is an ongoing conversation. ${earlierCount} earlier messages exist. The most recent ${CONTEXT_WINDOW_SIZE} are included below.]`;
  return { contextMessages, summaryNote };
}
