// The message a person was writing when the daily limit stopped them, and
// the conversation to return to after /upgrade (activation plan, Part 7.1).
// Web port of lib/limitDraft.ts; localStorage, per thread.
const draftKey = (threadId: string) => `arete_limit_draft:${threadId}`;
const RETURN_KEY = 'arete_limit_return';

export function saveLimitDraft(threadId: string, text: string, returnTo: string): void {
  try {
    if (text.trim()) localStorage.setItem(draftKey(threadId), text);
    localStorage.setItem(RETURN_KEY, returnTo);
  } catch { /* private mode */ }
}

export function takeLimitDraft(threadId: string): string | null {
  try {
    const v = localStorage.getItem(draftKey(threadId));
    if (v !== null) localStorage.removeItem(draftKey(threadId));
    return v;
  } catch {
    return null;
  }
}

export function takeLimitReturn(): string | null {
  try {
    const v = localStorage.getItem(RETURN_KEY);
    if (v !== null) localStorage.removeItem(RETURN_KEY);
    return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
  } catch {
    return null;
  }
}
