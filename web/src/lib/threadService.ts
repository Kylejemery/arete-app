import { getThread, upsertThread } from './db';

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix ms
  counselorId?: string; // which counselor replied (for group thread rendering)
}

export interface Thread {
  id: string; // 'marcus-aurelius' | 'epictetus' | 'david-goggins' | 'theodore-roosevelt' | 'futureSelf' | 'cabinet'
  messages: ThreadMessage[];
  lastUpdated: number;
}

const MAX_STORED_MESSAGES = 200;
export const CONTEXT_WINDOW_SIZE = 30;

export async function loadThread(threadId: string): Promise<Thread> {
  try {
    const messages = await getThread(threadId);
    return {
      id: threadId,
      messages: messages as unknown as ThreadMessage[],
      lastUpdated: Date.now(),
    };
  } catch { /* ignore errors */ }
  return { id: threadId, messages: [], lastUpdated: Date.now() };
}

export async function saveThread(thread: Thread): Promise<void> {
  const capped: Thread = {
    ...thread,
    messages:
      thread.messages.length > MAX_STORED_MESSAGES
        ? thread.messages.slice(thread.messages.length - MAX_STORED_MESSAGES)
        : thread.messages,
    lastUpdated: Date.now(),
  };
  try {
    await upsertThread(thread.id, capped.messages as unknown as Parameters<typeof upsertThread>[1]);
  } catch { /* ignore storage errors silently */ }
}

export async function appendMessages(
  threadId: string,
  messages: ThreadMessage[]
): Promise<Thread> {
  const thread = await loadThread(threadId);
  const updated: Thread = {
    ...thread,
    messages: [...thread.messages, ...messages],
    lastUpdated: Date.now(),
  };
  await saveThread(updated);
  return updated;
}

export async function clearThread(threadId: string): Promise<void> {
  try {
    await upsertThread(threadId, []);
  } catch { /* ignore */ }
}

export async function getAllThreadSummaries(): Promise<{ id: string; messageCount: number; lastUpdated: number }[]> {
  const threadIds = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt', 'futureSelf', 'cabinet'];
  const results = await Promise.all(
    threadIds.map(async (id) => {
      const thread = await loadThread(id);
      return {
        id,
        messageCount: thread.messages.length,
        lastUpdated: thread.lastUpdated,
      };
    })
  );
  return results;
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
