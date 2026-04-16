import { supabase } from './supabase'
import { getDevPremiumOverride } from './devMode'
import type {
  UserSettings,
  JournalEntry,
  ThreadMessage,
  ReadingData,
  Counselor,
  CabinetConversation,
  ConversationMessage,
  Belief,
} from './types'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function getUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// ----------------------------------------------------------------
// USER SETTINGS
// ----------------------------------------------------------------

export async function getUserSettings(): Promise<UserSettings | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('getUserSettings error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getUserSettings exception:', e)
    return null
  }
}

export async function upsertUserSettings(data: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { ...data, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('upsertUserSettings error:', error)
  } catch (e) {
    console.error('upsertUserSettings exception:', e)
  }
}

// ----------------------------------------------------------------
// CHECK-INS (check_ins table)
// ----------------------------------------------------------------

export async function getLatestCheckIn(type: 'morning' | 'evening'): Promise<{ cabinet_response: string; user_input: string; check_in_date: string } | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('cabinet_response, user_input, check_in_date')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('check_in_date', today())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      console.error('getLatestCheckIn error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getLatestCheckIn exception:', e)
    return null
  }
}

export async function hasCheckInToday(type: 'morning' | 'evening'): Promise<boolean> {
  const result = await getLatestCheckIn(type)
  return result !== null
}

export async function createCheckIn(type: 'morning' | 'evening', userInput: string, cabinetResponse: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('check_ins')
      .insert({
        user_id: userId,
        type,
        user_input: userInput,
        cabinet_response: cabinetResponse,
        check_in_date: today(),
      })
    if (error) console.error('createCheckIn error:', error)
  } catch (e) {
    console.error('createCheckIn exception:', e)
  }
}

// ----------------------------------------------------------------
// JOURNAL ENTRIES
// ----------------------------------------------------------------

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getJournalEntries error:', error)
      return []
    }
    return data ?? []
  } catch (e) {
    console.error('getJournalEntries exception:', e)
    return []
  }
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<JournalEntry | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ ...entry, user_id: userId })
      .select()
      .single()
    if (error) {
      console.error('createJournalEntry error:', error)
      return null
    }
    return data
  } catch (e) {
    console.error('createJournalEntry exception:', e)
    return null
  }
}

export async function updateJournalEntry(id: string, data: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('journal_entries')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('updateJournalEntry error:', error)
  } catch (e) {
    console.error('updateJournalEntry exception:', e)
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('deleteJournalEntry error:', error)
  } catch (e) {
    console.error('deleteJournalEntry exception:', e)
  }
}

// ----------------------------------------------------------------
// BELIEFS
// ----------------------------------------------------------------

export async function saveBelief(belief: {
  raw_input: string;
  dialogue_history: { role: 'user' | 'cabinet'; content: string; timestamp: number }[];
  encoded_belief: string;
  has_virtue_concern: boolean;
  virtue_concern?: string;
}) {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('beliefs')
    .insert({ ...belief, user_id: userId })
    .select()
    .single();
  if (error) console.error('saveBelief error:', error);
  return data;
}

export async function getLegacyBeliefs() {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', userId)
    .order('encoded_at', { ascending: false });
  if (error) console.error('getBeliefs error:', error);
  return data ?? [];
}

// ----------------------------------------------------------------
// CABINET CONVERSATIONS
// ----------------------------------------------------------------

export async function saveCabinetConversation(messages: ThreadMessage[]) {
  const userId = await getUserId();
  if (!userId) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('cabinet_conversations')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', today)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('cabinet_conversations')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) console.error('saveCabinetConversation error:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('cabinet_conversations')
      .insert({ user_id: userId, messages })
      .select()
      .single();
    if (error) console.error('saveCabinetConversation error:', error);
    return data;
  }
}

export async function getCabinetConversation() {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getCabinetConversation error:', error);
  return data;
}

// ----------------------------------------------------------------
// CABINET THREADS
// ----------------------------------------------------------------

export async function getThread(threadId: string): Promise<ThreadMessage[]> {
  if (threadId === 'cabinet') {
    const data = await getCabinetConversation();
    return (data?.messages ?? []) as ThreadMessage[];
  }
  return []
}

export async function upsertThread(threadId: string, messages: ThreadMessage[]): Promise<void> {
  if (threadId === 'cabinet') {
    await saveCabinetConversation(messages);
    return;
  }
  // no-op: other threads are stored locally, not in Supabase
}

// ----------------------------------------------------------------
// READING DATA (not stored in Supabase — stub)
// ----------------------------------------------------------------

export async function getReadingData(): Promise<ReadingData | null> {
  console.warn('getReadingData: reading_data table does not exist in Supabase')
  return null
}

export async function upsertReadingData(_data: Partial<Omit<ReadingData, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  // no-op: reading_data table does not exist in Supabase
}

// ----------------------------------------------------------------
// CALENDAR DATA (not stored in Supabase — stub)
// ----------------------------------------------------------------

export async function getCalendarData(): Promise<Record<string, { morning: boolean; evening: boolean }>> {
  console.warn('getCalendarData: calendar_data table does not exist in Supabase')
  return {}
}

export async function upsertCalendarData(_data: Record<string, { morning: boolean; evening: boolean }>): Promise<void> {
  // no-op: calendar_data table does not exist in Supabase
}

// ----------------------------------------------------------------
// COUNSELORS
// ----------------------------------------------------------------

const FUTURE_SELF_SLUG = 'futureSelf';

// Default cabinet slugs — matches is_default=true counselors in the DB
const DEFAULT_CABINET_SLUGS = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt'];

// Fetch all counselors from the database
export async function getCounselors(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getCounselors error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Fetch counselors by category
export async function getCounselorsByCategory(category: string): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getCounselorsByCategory error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Fetch counselors by an array of slugs (the user's current cabinet)
export async function getCounselorsBySlugs(slugs: string[]): Promise<Counselor[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .in('slug', slugs);
  if (error) {
    console.error('getCounselorsBySlugs error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Fetch the user's current cabinet as full Counselor objects
// (Reads from user_settings.cabinet_members, filters out 'futureSelf' which is handled separately)
export async function getUserCabinet(): Promise<Counselor[]> {
  const settings = await getUserSettings();
  const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS;
  const counselorSlugs = members.filter(m => m !== FUTURE_SELF_SLUG);
  return getCounselorsBySlugs(counselorSlugs);
}

// Save the user's cabinet selection (writes slugs back to cabinet_members)
// futureSelf is always appended automatically
export async function saveCabinetSelection(slugs: string[]): Promise<void> {
  const members = [...slugs.filter(s => s !== FUTURE_SELF_SLUG), FUTURE_SELF_SLUG];
  await upsertUserSettings({ cabinet_members: members });
}

// Fetch the default cabinet (is_default = true counselors)
export async function getDefaultCabinet(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('is_default', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getDefaultCabinet error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Check if current user is premium
export async function getIsPremium(): Promise<boolean> {
  // Dev mode override
  const devOverride = getDevPremiumOverride();
  if (devOverride !== null) return devOverride;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single();
  if (error) return false;
  return data?.is_premium ?? false;
}

// ----------------------------------------------------------------
// CABINET CONVERSATIONS (new structured API)
// ----------------------------------------------------------------

export async function getConversations(userId: string): Promise<CabinetConversation[]> {
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getConversations error:', error);
    return [];
  }
  return (data ?? []) as CabinetConversation[];
}

export async function getConversation(id: string): Promise<CabinetConversation | null> {
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('getConversation error:', error);
    return null;
  }
  return data as CabinetConversation;
}

export async function createConversation(counselorSlugs: string[]): Promise<CabinetConversation> {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .insert({ user_id: userId, counselor_slugs: counselorSlugs, messages: [] })
    .select()
    .single();
  if (error) throw error;
  return data as CabinetConversation;
}

export async function appendMessage(conversationId: string, message: ConversationMessage): Promise<void> {
  // Fetch current messages, append, update
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  const updatedMessages = [...conversation.messages, message];
  const { error } = await supabase
    .from('cabinet_conversations')
    .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (error) throw error;
}

// ----------------------------------------------------------------
// BELIEFS
// ----------------------------------------------------------------

export async function getBeliefs(userId: string): Promise<Belief[]> {
  const { data, error } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getBeliefs error:', error);
    return [];
  }
  return (data ?? []) as Belief[];
}

export async function createBelief(content: string, category: string): Promise<Belief> {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('beliefs')
    .insert({ user_id: userId, content, category, encoded: false })
    .select()
    .single();
  if (error) throw error;
  return data as Belief;
}

export async function updateBelief(id: string, updates: Partial<Belief>): Promise<Belief> {
  const { data, error } = await supabase
    .from('beliefs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Belief;
}

export async function deleteBelief(id: string): Promise<void> {
  const { error } = await supabase
    .from('beliefs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function encodeBelief(id: string): Promise<Belief> {
  return updateBelief(id, { encoded: true });
}
