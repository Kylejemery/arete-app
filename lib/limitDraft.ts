// The message a person was writing when a daily limit stopped them, kept per
// thread so it is waiting in the composer when they come back, including
// after upgrading on the web (activation plan, Part 7.1). The thread itself
// is already saved; this keeps the unsent words.
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (threadId: string) => `limit_draft:${threadId}`;

export async function saveLimitDraft(threadId: string, text: string): Promise<void> {
  try {
    if (text.trim()) await AsyncStorage.setItem(key(threadId), text);
  } catch { /* best effort */ }
}

export async function takeLimitDraft(threadId: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(key(threadId));
    if (v !== null) await AsyncStorage.removeItem(key(threadId));
    return v;
  } catch {
    return null;
  }
}
