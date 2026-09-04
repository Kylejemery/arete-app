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

/**
 * Load a thread, throwing when the fetch fails. Anything that loads a thread
 * in order to write it back must use this: a failed fetch that looked like
 * an empty thread would be saved over the real history.
 */
export async function loadThreadStrict(threadId: string): Promise<Thread> {
  const messages = await getThread(threadId);
  return {
    id: threadId,
    messages: messages as unknown as ThreadMessage[],
    lastUpdated: Date.now(),
  };
}

/** Load a thread for display: a failed fetch reads as empty. Never save the result. */
export async function loadThread(threadId: string): Promise<Thread> {
  try {
    return await loadThreadStrict(threadId);
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
): Promise<Thread | null> {
  let thread: Thread;
  try {
    thread = await loadThreadStrict(threadId);
  } catch (e) {
    // Without the history there is nothing safe to append to.
    console.warn(`[threadService] append to ${threadId} skipped, load failed:`, (e as Error)?.message);
    return null;
  }
  const updated: Thread = {
    ...thread,
    messages: [...thread.messages, ...messages],
    lastUpdated: Date.now(),
  };
  await saveThread(updated);
  return updated;
}

const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * A counselor line (an assistant message signed with a counselorName, the
 * shape every notification-seeded line takes) duplicates another when the
 * same words landed on the same calendar day. Weekly reminders repeat their
 * wording across weeks and the Attend nudges repeat daily, so the day is
 * part of the identity; the sender is not, because the same delivery can be
 * signed by different counselors when it arrives through two paths.
 */
export function sameCounselorLine(a: ThreadMessage, b: ThreadMessage): boolean {
  return (
    a.role === 'assistant' &&
    b.role === 'assistant' &&
    !!a.counselorName &&
    !!b.counselorName &&
    a.content === b.content &&
    dayOf(a.timestamp) === dayOf(b.timestamp)
  );
}

/** Drop repeated counselor lines, keeping the first of each. */
export function dedupeCounselorLines(messages: ThreadMessage[]): { messages: ThreadMessage[]; removed: number } {
  const kept: ThreadMessage[] = [];
  const lines: ThreadMessage[] = [];
  for (const m of messages) {
    if (m.role === 'assistant' && m.counselorName) {
      if (lines.some(l => sameCounselorLine(l, m))) continue;
      lines.push(m);
    }
    kept.push(m);
  }
  return { messages: kept, removed: messages.length - kept.length };
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