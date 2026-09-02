import { getThread, upsertThread } from '../lib/db';

/**
 * Maps long DB counselor slugs → the canonical short thread IDs used throughout the app.
 * Every entry point that receives a counselor ID should call normalizeCounselorId()
 * before using it as a thread key, so there is always exactly one thread per counselor.
 */
const COUNSELOR_SLUG_TO_ID: Record<string, string> = {
  'marcus-aurelius': 'marcus',
  'david-goggins': 'goggins',
  'theodore-roosevelt': 'roosevelt',
  'future-self': 'futureSelf',
};

export function normalizeCounselorId(slug: string): string {
  return COUNSELOR_SLUG_TO_ID[slug] ?? slug;
}

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix ms
  counselorId?: string; // which counselor replied (for group thread rendering)
  counselorName?: string; // display name for the bubble label; absent = 'The Cabinet'
}

export interface Thread {
  id: string; // 'marcus' | 'epictetus' | 'goggins' | 'roosevelt' | 'futureSelf' | 'cabinet'
  messages: ThreadMessage[];
  lastUpdated: number;
}

const MAX_STORED_MESSAGES = 200;
export const CONTEXT_WINDOW_SIZE = 15;

// Some seeded counselor lines were stored with a timestamp in seconds (iOS
// reports a delivered notification's date that way). Read them back as ms.
function normalizeTimestamp(m: ThreadMessage): ThreadMessage {
  const t = Number(m.timestamp);
  if (Number.isFinite(t) && t > 0 && t < 1e12) return { ...m, timestamp: Math.round(t * 1000) };
  return m;
}

export async function loadThread(threadId: string): Promise<Thread> {
  try {
    const messages = await getThread(threadId);
    return {
      id: threadId,
      messages: (messages as unknown as ThreadMessage[]).map(normalizeTimestamp),
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
    await upsertThread(thread.id, capped.messages as any);
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

export async function getAllThreadSummaries(): Promise<
  { id: string; messageCount: number; lastUpdated: number }[]
> {
  const threadIds = ['marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf', 'cabinet'];
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